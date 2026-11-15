import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import { UUID_PATTERN } from "@/lib/server/braintrian/protocol";
import { APP_VERSION, CONTENT_VERSION } from "@/lib/analytics/version";

// A journey is one RunJump visit (PRD §8.2, spec §8). A new journey starts on a
// new OA launch, when there is no journey cookie, when the cookie belongs to a
// different user, or after JOURNEY_IDLE_MS without events. A LINE (line_oa)
// journey is kept for as long as its cookie lives (LINE_JOURNEY_IDLE_MS), so a
// LINE visit keeps its journey_id and launch_id (Dashboard API Spec v1, RunJump).
// See docs/analytics.md.

export const JOURNEY_COOKIE = "rj_journey";
export const JOURNEY_IDLE_MS = 30 * 60 * 1000;
const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;
/** The cookie is refreshed on every batch, so it expires 24 h after the last event. */
export const LINE_JOURNEY_IDLE_MS = COOKIE_MAX_AGE_SECONDS * 1000;
/**
 * A journey recreated for a LINE participant (cookie lost, other browser) inherits
 * the participant's latest launch only if that launch is this recent.
 */
export const LAUNCH_INHERIT_MS = COOKIE_MAX_AGE_SECONDS * 1000;

export type EntrySource = "line_oa" | "direct" | "other";

export type Journey = {
  journeyId: string;
  participantId: string | null;
  isNew: boolean;
};

type JourneyRow = {
  journey_id: string;
  user_id: string;
  participant_id: string | null;
  entry_source: EntrySource;
  last_seen_at: string;
};

export function setJourneyCookie(response: NextResponse, journeyId: string) {
  response.cookies.set(JOURNEY_COOKIE, journeyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function findParticipantId(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("braintrian_participants")
    .select("participant_id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  return data?.participant_id ?? null;
}

/**
 * The participant's most recent OA launch, if the launch itself (not a later
 * inherited journey) is recent enough to treat a new journey as the same LINE
 * visit. Every launch has a row in analytics_journey_launches (attachLaunch).
 */
export async function findRecentLaunch(
  admin: SupabaseClient,
  participantId: string,
  now = Date.now(),
): Promise<string | null> {
  const { data: journeys } = await admin
    .from("analytics_journeys")
    .select("journey_id, launch_id")
    .eq("participant_id", participantId)
    .eq("entry_source", "line_oa")
    .order("started_at", { ascending: false })
    .limit(1);
  const latest = journeys?.[0] as
    | { journey_id: string; launch_id: string | null }
    | undefined;
  if (!latest) return null;
  const launches = admin
    .from("analytics_journey_launches")
    .select("launch_id, created_at");
  const { data } = await (
    latest.launch_id
      ? launches.eq("launch_id", latest.launch_id)
      : launches.eq("journey_id", latest.journey_id)
  )
    .order("created_at", { ascending: false })
    .limit(1);
  const launch = data?.[0] as
    | { launch_id: string; created_at: string }
    | undefined;
  if (
    !launch ||
    now - new Date(launch.created_at).getTime() >= LAUNCH_INHERIT_MS
  )
    return null;
  return launch.launch_id;
}

function journeyStartedRow(
  journey: { journeyId: string; userId: string; participantId: string | null },
  entrySource: EntrySource,
  sessionId: string,
  occurredAt: string,
  extraProps: Record<string, unknown> = {},
) {
  return {
    event_id: crypto.randomUUID(),
    user_id: journey.userId,
    participant_id: journey.participantId,
    journey_id: journey.journeyId,
    session_id: sessionId,
    event: "journey_started",
    step_id:
      entrySource === "line_oa" && !extraProps.inherited_launch
        ? "oa_entry"
        : null,
    props: { entry_source: entrySource, ...extraProps },
    occurred_at: occurredAt,
    app_version: APP_VERSION,
    content_version: CONTENT_VERSION,
  };
}

async function createJourney(
  admin: SupabaseClient,
  input: {
    userId: string;
    participantId: string | null;
    entrySource: EntrySource;
    launchId: string | null;
    sessionId: string;
  },
): Promise<Journey> {
  const { data, error } = await admin
    .from("analytics_journeys")
    .insert({
      user_id: input.userId,
      participant_id: input.participantId,
      entry_source: input.entrySource,
      launch_id: input.launchId,
    })
    .select("journey_id")
    .single();
  if (error || !data) throw new Error("Could not create journey");
  await admin.rpc("analytics_insert_events", {
    p_rows: [
      journeyStartedRow(
        {
          journeyId: data.journey_id,
          userId: input.userId,
          participantId: input.participantId,
        },
        input.entrySource,
        input.sessionId,
        new Date().toISOString(),
        input.launchId ? { inherited_launch: true } : {},
      ),
    ],
  });
  return {
    journeyId: data.journey_id,
    participantId: input.participantId,
    isNew: true,
  };
}

/**
 * Resolve the current visit for an event batch, creating one when the cookie is
 * missing, stale, or belongs to someone else. participant_id always comes from
 * braintrian_participants, never from the browser.
 */
export async function getOrCreateJourney(
  admin: SupabaseClient,
  userId: string,
  cookieJourneyId: string | undefined,
  sessionId: string,
  entrySource: EntrySource = "direct",
): Promise<Journey> {
  if (cookieJourneyId && UUID_PATTERN.test(cookieJourneyId)) {
    const { data } = await admin
      .from("analytics_journeys")
      .select("journey_id, user_id, participant_id, entry_source, last_seen_at")
      .eq("journey_id", cookieJourneyId)
      .maybeSingle<JourneyRow>();
    const idleLimit =
      data?.entry_source === "line_oa" ? LINE_JOURNEY_IDLE_MS : JOURNEY_IDLE_MS;
    if (
      data &&
      data.user_id === userId &&
      Date.now() - new Date(data.last_seen_at).getTime() < idleLimit
    ) {
      await admin
        .from("analytics_journeys")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("journey_id", data.journey_id);
      return {
        journeyId: data.journey_id,
        participantId: data.participant_id,
        isNew: false,
      };
    }
  }
  const participantId = await findParticipantId(admin, userId);
  // A LINE participant without a usable cookie (other browser, cleared cookie) is
  // still on the LINE visit when the launch is recent: keep line_oa and its launch.
  const launchId = participantId
    ? await findRecentLaunch(admin, participantId)
    : null;
  return createJourney(admin, {
    userId,
    participantId,
    entrySource: launchId ? "line_oa" : entrySource,
    launchId,
    sessionId,
  });
}

/**
 * One app_opened per launch (PRD 8.4): the redeemed OA link is attached to this
 * browser session. journey_id is null. The unique index on (launch_id) where
 * event = 'app_opened' makes repeats a no-op.
 */
async function recordAppOpened(
  admin: SupabaseClient,
  input: { userId: string; participantId: string; launchId: string },
  occurredAt: string,
) {
  const { error } = await admin.rpc("analytics_insert_events", {
    p_rows: [
      {
        event_id: crypto.randomUUID(),
        user_id: input.userId,
        participant_id: input.participantId,
        journey_id: null,
        launch_id: input.launchId,
        session_id: `oa:${input.launchId}`,
        event: "app_opened",
        props: {},
        occurred_at: occurredAt,
        app_version: APP_VERSION,
        content_version: CONTENT_VERSION,
      },
    ],
  });
  if (error) console.error("[analytics] app_opened insert failed");
}

/**
 * Attach an OA launch to a journey. Idempotent per launch_id: a retried claim
 * returns the journey created by the first attempt (PRD AC-45). Records
 * app_opened first, so it exists even if creating the journey fails.
 */
export async function attachLaunch(
  admin: SupabaseClient,
  input: { userId: string; participantId: string; launchId: string },
): Promise<Journey> {
  const openedAt = new Date().toISOString();
  await recordAppOpened(admin, input, openedAt);
  const existing = await admin
    .from("analytics_journey_launches")
    .select("journey_id")
    .eq("launch_id", input.launchId)
    .maybeSingle();
  if (existing.data) {
    return {
      journeyId: existing.data.journey_id,
      participantId: input.participantId,
      isNew: false,
    };
  }
  const { data: journey, error } = await admin
    .from("analytics_journeys")
    .insert({
      user_id: input.userId,
      participant_id: input.participantId,
      entry_source: "line_oa",
      launch_id: input.launchId,
    })
    .select("journey_id")
    .single();
  if (error || !journey) throw new Error("Could not create journey");
  const { error: launchError } = await admin
    .from("analytics_journey_launches")
    .insert({ launch_id: input.launchId, journey_id: journey.journey_id });
  if (launchError) {
    // A concurrent claim for the same launch won the race; use its journey.
    await admin
      .from("analytics_journeys")
      .delete()
      .eq("journey_id", journey.journey_id);
    const { data: winner } = await admin
      .from("analytics_journey_launches")
      .select("journey_id")
      .eq("launch_id", input.launchId)
      .single();
    if (!winner) throw new Error("Could not attach launch");
    return {
      journeyId: winner.journey_id,
      participantId: input.participantId,
      isNew: false,
    };
  }
  await admin.rpc("analytics_insert_events", {
    p_rows: [
      journeyStartedRow(
        {
          journeyId: journey.journey_id,
          userId: input.userId,
          participantId: input.participantId,
        },
        "line_oa",
        `oa:${input.launchId}`,
        new Date().toISOString(),
      ),
    ],
  });
  return {
    journeyId: journey.journey_id,
    participantId: input.participantId,
    isNew: true,
  };
}
