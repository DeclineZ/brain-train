import { createHash, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET /api/dashboard/v1/events (Dashboard API Spec v1, openapi.yaml). Field names and
// values follow PRD v0.5 section 8; rows come from analytics_dashboard_events_v1.

export const DASHBOARD_VIEW = "analytics_dashboard_events_v1";
export const MAX_LIMIT = 1000;

/** The 23 keys of the openapi Event schema, in its order. Nothing else is returned. */
export const EVENT_KEYS = [
  "app_id",
  "event_id",
  "event_seq",
  "occurred_at",
  "event_name",
  "entry_source",
  "participant_id",
  "launch_id",
  "journey_id",
  "step_id",
  "consent_status",
  "activity_type",
  "activity_id",
  "activity_attempt_id",
  "phase",
  "level_id",
  "outcome",
  "end_reason",
  "error_code",
  "duration_ms",
  "progress",
  "app_version",
  "content_version",
] as const;

export type EventKey = (typeof EVENT_KEYS)[number];
export type DashboardEvent = Record<EventKey, string | number | null>;
export type ErrorCode = "invalid_parameter" | "unauthorized" | "internal";

export class ParamError extends Error {}

const digest = (value: string) =>
  createHash("sha256").update(value, "utf8").digest();

/** Constant-time check of "Authorization: Bearer <key>". An unset key rejects everything. */
export function isAuthorized(
  header: string | null,
  expected: string | undefined,
): boolean {
  if (!expected) return false;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "");
  // Compare fixed-length digests so neither length nor content leaks through timing.
  const ok = timingSafeEqual(digest(match?.[1] ?? ""), digest(expected));
  return ok && match !== null;
}

// RFC 3339 date-time (openapi format: date-time), with Z or an explicit offset.
const DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/i;

function parseDateTime(name: string, value: string): Date {
  const m = DATE_TIME.exec(value);
  const date = new Date(value);
  if (!m || Number.isNaN(date.getTime())) {
    throw new ParamError(
      `${name} must be ISO 8601, e.g. 2026-11-16T00:00:00.000Z`,
    );
  }
  // Reject calendar overflow such as 2026-02-30, which Date silently rolls over.
  const [, y, mo, d, h, mi, s] = m.map(Number);
  const probe = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== mo - 1 ||
    probe.getUTCDate() !== d ||
    h > 23 ||
    mi > 59 ||
    s > 59
  ) {
    throw new ParamError(`${name} is not a valid date`);
  }
  return date;
}

export type Cursor = { occurredAt: string; seq: number };

/** Opaque cursor: base64url of [occurred_at as stored, event_seq] of the last row sent. */
export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(
    JSON.stringify([cursor.occurredAt, cursor.seq]),
    "utf8",
  ).toString("base64url");
}

export function decodeCursor(value: string): Cursor {
  const invalid = () =>
    new ParamError("cursor is invalid; send next_cursor unchanged");
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(value)) throw invalid();
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw invalid();
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 2 ||
    typeof parsed[0] !== "string" ||
    !/^[0-9T:.+\- Z]{10,40}$/i.test(parsed[0]) ||
    Number.isNaN(Date.parse(parsed[0])) ||
    !Number.isSafeInteger(parsed[1]) ||
    parsed[1] < 0
  ) {
    throw invalid();
  }
  return { occurredAt: parsed[0], seq: parsed[1] };
}

export type PageParams = {
  from: Date;
  until: Date;
  limit: number;
  cursor: Cursor | null;
};

export function parseParams(
  search: URLSearchParams,
  now = new Date(),
): PageParams {
  for (const name of ["from", "until", "limit", "cursor"]) {
    if (search.getAll(name).length > 1)
      throw new ParamError(`${name} must be given once`);
  }
  const fromRaw = search.get("from");
  if (!fromRaw) throw new ParamError("from is required");
  const from = parseDateTime("from", fromRaw);
  const untilRaw = search.get("until");
  const until = untilRaw === null ? now : parseDateTime("until", untilRaw);
  if (until.getTime() <= from.getTime())
    throw new ParamError("until must be later than from");

  const limitRaw = search.get("limit");
  let limit = MAX_LIMIT;
  if (limitRaw !== null) {
    if (!/^\d{1,4}$/.test(limitRaw))
      throw new ParamError("limit must be an integer 1-1000");
    limit = Number(limitRaw);
    if (limit < 1 || limit > MAX_LIMIT)
      throw new ParamError("limit must be an integer 1-1000");
  }

  const cursorRaw = search.get("cursor");
  const cursor = cursorRaw === null ? null : decodeCursor(cursorRaw);
  return { from, until, limit, cursor };
}

type ViewRow = Record<string, unknown>;

/** View row -> API event: exactly EVENT_KEYS, UTC milliseconds, null instead of "". */
export function toEvent(row: ViewRow): DashboardEvent {
  const event = {} as DashboardEvent;
  for (const key of EVENT_KEYS) {
    const value = row[key];
    if (key === "occurred_at") {
      event[key] = new Date(String(value)).toISOString();
    } else if (
      key === "event_seq" ||
      key === "duration_ms" ||
      key === "progress"
    ) {
      event[key] =
        value === null || value === undefined || value === ""
          ? null
          : Number(value);
    } else {
      event[key] =
        value === undefined || value === "" ? null : (value as string | null);
    }
  }
  return event;
}

const quote = (value: string) => `"${value.replace(/["\\]/g, "")}"`;

function pageQuery(
  admin: SupabaseClient,
  columns: string,
  params: PageParams,
  after: Cursor | null,
  limit: number,
) {
  let query = admin
    .from(DASHBOARD_VIEW)
    .select(columns)
    .gte("occurred_at", params.from.toISOString())
    .lt("occurred_at", params.until.toISOString());
  if (after) {
    const at = quote(after.occurredAt);
    query = query.or(
      `occurred_at.gt.${at},and(occurred_at.eq.${at},event_seq.gt.${after.seq})`,
    );
  }
  return query
    .order("occurred_at", { ascending: true })
    .order("event_seq", { ascending: true })
    .order("event_id", { ascending: true })
    .limit(limit);
}

/**
 * One page ordered by occurred_at, event_seq, event_id (event_seq is unique, so
 * event_id never decides). A full page is followed by a one-row probe so that
 * next_cursor is null exactly when no data is left. limit + 1 is not used because
 * PostgREST caps responses at its max-rows setting (1000 by default on Supabase).
 */
export async function fetchEventsPage(
  admin: SupabaseClient,
  params: PageParams,
): Promise<{ events: DashboardEvent[]; next_cursor: string | null }> {
  const { data, error } = await pageQuery(
    admin,
    EVENT_KEYS.join(","),
    params,
    params.cursor,
    params.limit,
  );
  if (error) throw new Error("Dashboard events query failed");
  const rows = (data ?? []) as unknown as ViewRow[];
  if (rows.length > params.limit)
    throw new Error("Dashboard events query ignored the limit");
  const last = rows[rows.length - 1];
  let next_cursor: string | null = null;
  if (last && rows.length === params.limit) {
    const after = {
      occurredAt: String(last.occurred_at),
      seq: Number(last.event_seq),
    };
    const probe = await pageQuery(admin, "event_seq", params, after, 1);
    if (probe.error) throw new Error("Dashboard events query failed");
    if ((probe.data ?? []).length > 0) next_cursor = encodeCursor(after);
  }
  return { events: rows.map(toEvent), next_cursor };
}
