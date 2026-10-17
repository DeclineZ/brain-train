import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isEventName, SERVER_ONLY_EVENTS } from "@/lib/analytics/events";
import { isRecord, UUID_PATTERN } from "@/lib/server/braintrian/protocol";
import {
  getOrCreateJourney,
  JOURNEY_COOKIE,
  setJourneyCookie,
  type Journey,
} from "@/lib/server/analytics/journey";
import packageJson from "@/package.json";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENTS = 50;
const MAX_PROPS_BYTES = 1024;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_MS = 5 * 60 * 1000;
const NO_STORE = { "Cache-Control": "no-store, private" };

function reply(status: number, body: Record<string, unknown> = {}) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

// sendBeacon fallbacks arrive as text/plain, so accept any content type.
async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_BODY_BYTES) throw new Error("Request too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isSameSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  return request.headers.get("origin") === new URL(request.url).origin;
}

const str = (v: unknown, max = 64) =>
  typeof v === "string" && v.length > 0 && v.length <= max ? v : null;
const int = (v: unknown) =>
  typeof v === "number" && Number.isInteger(v) && Math.abs(v) < 2 ** 31 ? v : null;
const uuid = (v: unknown) => (typeof v === "string" && UUID_PATTERN.test(v) ? v : null);

export async function POST(request: NextRequest) {
  if (!isSameSite(request)) return reply(403, { error: "forbidden" });

  let body: unknown;
  try {
    body = await readBody(request);
  } catch {
    return reply(400, { error: "invalid_request" });
  }
  if (!isRecord(body) || !Array.isArray(body.events) || body.events.length > MAX_EVENTS) {
    return reply(400, { error: "invalid_request" });
  }
  const sessionId = str(body.session_id, 64);
  if (!sessionId) return reply(400, { error: "invalid_request" });
  const device = isRecord(body.device) && JSON.stringify(body.device).length <= 512 ? body.device : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const now = Date.now();
  const rows = body.events.flatMap((raw) => {
    if (!isRecord(raw) || !isEventName(raw.event) || SERVER_ONLY_EVENTS.has(raw.event)) return [];
    const eventId = uuid(raw.event_id);
    const occurredAt = typeof raw.occurred_at === "string" ? Date.parse(raw.occurred_at) : NaN;
    if (!eventId || Number.isNaN(occurredAt)) return [];
    if (occurredAt < now - MAX_AGE_MS || occurredAt > now + MAX_FUTURE_MS) return [];
    // Created under a different signed-in user: never relabel it as this user.
    const stampedUid = uuid(raw.uid);
    if (stampedUid && stampedUid !== userId) return [];
    const props = isRecord(raw.props) ? raw.props : {};
    if (JSON.stringify(props).length > MAX_PROPS_BYTES) return [];
    return [
      {
        event_id: eventId,
        event: raw.event,
        occurred_at: new Date(occurredAt).toISOString(),
        step_id: str(raw.step_id),
        game_id: str(raw.game_id),
        level: int(raw.level),
        attempt_id: uuid(raw.attempt_id),
        seq: int(raw.seq),
        t_ms: int(raw.t_ms),
        props,
      },
    ];
  });
  if (rows.length === 0) return reply(200, { inserted: 0 });

  try {
    const admin = createAdminClient();
    let journey: Journey | null = null;
    if (userId) {
      journey = await getOrCreateJourney(
        admin,
        userId,
        request.cookies.get(JOURNEY_COOKIE)?.value,
        sessionId,
        user?.app_metadata?.identity_provider === "vitalmind" ? "other" : "direct",
      );
    }
    const { data, error } = await admin.rpc("analytics_insert_events", {
      p_rows: rows.map((row) => ({
        ...row,
        user_id: userId,
        participant_id: journey?.participantId ?? null,
        journey_id: journey?.journeyId ?? null,
        session_id: sessionId,
        app_version: packageJson.version,
        device,
      })),
    });
    if (error) throw error;
    const response = reply(200, { inserted: data ?? 0 });
    if (journey) setJourneyCookie(response, journey.journeyId);
    return response;
  } catch {
    console.error("[analytics] Insert failed");
    return reply(503, { error: "unavailable" });
  }
}
