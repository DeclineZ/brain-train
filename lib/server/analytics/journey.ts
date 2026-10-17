import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import { UUID_PATTERN } from "@/lib/server/braintrian/protocol";

// A journey is one RunJump visit (PRD §8.2, spec §8). A new journey starts on a
// new OA launch, when there is no journey cookie, when the cookie belongs to a
// different user, or after JOURNEY_IDLE_MS without events. See docs/analytics.md.

export const JOURNEY_COOKIE = "rj_journey";
export const JOURNEY_IDLE_MS = 30 * 60 * 1000;
const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

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

async function insertJourneyStarted(
  admin: SupabaseClient,
  journey: { journeyId: string; userId: string; participantId: string | null },
  entrySource: EntrySource,
  sessionId: string,
) {
  await admin.rpc("analytics_insert_events", {
    p_rows: [
      {
        event_id: crypto.randomUUID(),
        user_id: journey.userId,
        participant_id: journey.participantId,
        journey_id: journey.journeyId,
        session_id: sessionId,
        event: "journey_started",
        step_id: entrySource === "line_oa" ? "oa_entry" : null,
        props: { entry_source: entrySource },
        occurred_at: new Date().toISOString(),
      },
    ],
  });
}

async function createJourney(
  admin: SupabaseClient,
  userId: string,
  participantId: string | null,
  entrySource: EntrySource,
  sessionId: string,
): Promise<Journey> {
  const { data, error } = await admin
    .from("analytics_journeys")
    .insert({ user_id: userId, participant_id: participantId, entry_source: entrySource })
    .select("journey_id")
    .single();
  if (error || !data) throw new Error("Could not create journey");
  await insertJourneyStarted(
    admin,
    { journeyId: data.journey_id, userId, participantId },
    entrySource,
    sessionId,
  );
  return { journeyId: data.journey_id, participantId, isNew: true };
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
      .select("journey_id, user_id, participant_id, last_seen_at")
      .eq("journey_id", cookieJourneyId)
      .maybeSingle<JourneyRow>();
    if (
      data &&
      data.user_id === userId &&
      Date.now() - new Date(data.last_seen_at).getTime() < JOURNEY_IDLE_MS
    ) {
      await admin
        .from("analytics_journeys")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("journey_id", data.journey_id);
      return { journeyId: data.journey_id, participantId: data.participant_id, isNew: false };
    }
  }
  const participantId = await findParticipantId(admin, userId);
  return createJourney(admin, userId, participantId, entrySource, sessionId);
}

/**
 * Attach an OA launch to a journey. Idempotent per launch_id: a retried claim
 * returns the journey created by the first attempt (PRD AC-45).
 */
export async function attachLaunch(
  admin: SupabaseClient,
  input: { userId: string; participantId: string; launchId: string },
): Promise<Journey> {
  const existing = await admin
    .from("analytics_journey_launches")
    .select("journey_id")
    .eq("launch_id", input.launchId)
    .maybeSingle();
  if (existing.data) {
    return { journeyId: existing.data.journey_id, participantId: input.participantId, isNew: false };
  }
  const { data: journey, error } = await admin
    .from("analytics_journeys")
    .insert({ user_id: input.userId, participant_id: input.participantId, entry_source: "line_oa" })
    .select("journey_id")
    .single();
  if (error || !journey) throw new Error("Could not create journey");
  const { error: launchError } = await admin
    .from("analytics_journey_launches")
    .insert({ launch_id: input.launchId, journey_id: journey.journey_id });
  if (launchError) {
    // A concurrent claim for the same launch won the race; use its journey.
    await admin.from("analytics_journeys").delete().eq("journey_id", journey.journey_id);
    const { data: winner } = await admin
      .from("analytics_journey_launches")
      .select("journey_id")
      .eq("launch_id", input.launchId)
      .single();
    if (!winner) throw new Error("Could not attach launch");
    return { journeyId: winner.journey_id, participantId: input.participantId, isNew: false };
  }
  await insertJourneyStarted(
    admin,
    { journeyId: journey.journey_id, userId: input.userId, participantId: input.participantId },
    "line_oa",
    `oa:${input.launchId}`,
  );
  return { journeyId: journey.journey_id, participantId: input.participantId, isNew: true };
}
