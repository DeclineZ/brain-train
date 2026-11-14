/* eslint-disable @typescript-eslint/no-require-imports -- Offline tests run the real TypeScript route and journey code against in-memory doubles. */
// Dashboard API v1: GET /api/dashboard/v1/events and the app_opened / journey changes.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { NextRequest } = require("next/server");

const root = path.resolve(__dirname, "..");
const KEY = "k".repeat(40);
const BASE = "http://localhost/api/dashboard/v1/events";
const EVENT_KEYS = [
  "app_id", "event_id", "event_seq", "occurred_at", "event_name", "entry_source",
  "participant_id", "launch_id", "journey_id", "step_id", "consent_status", "activity_type",
  "activity_id", "activity_attempt_id", "phase", "level_id", "outcome", "end_reason",
  "error_code", "duration_ms", "progress", "app_version", "content_version",
];

function load(relative, mocks = {}, cache = new Map()) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  const mod = { exports: {} };
  cache.set(filename, mod.exports);
  const resolve = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith("@/")) return load(`${id.slice(2)}.ts`, mocks, cache);
    return require(id);
  };
  new Function("require", "module", "exports", outputText)(resolve, mod, mod.exports);
  return mod.exports;
}

// ---- In-memory Supabase double (only the calls this code makes) ----
const tables = {};
const rpcCalls = [];
let failView = false;
let maxRows = 1000;

function query(table) {
  const filters = [];
  const orders = [];
  let op = "select";
  let payload;
  let limit = Infinity;
  const ts = (v) => new Date(v).getTime();
  const q = {
    select() { return q; },
    insert(v) { op = "insert"; payload = v; return q; },
    update(v) { op = "update"; payload = v; return q; },
    delete() { op = "delete"; return q; },
    eq(k, v) { filters.push((r) => (k === "occurred_at" ? ts(r[k]) === ts(v) : r[k] === v)); return q; },
    gte(k, v) { filters.push((r) => (k === "occurred_at" ? ts(r[k]) >= ts(v) : r[k] >= v)); return q; },
    lt(k, v) { filters.push((r) => ts(r[k]) < ts(v)); return q; },
    or(expr) {
      // occurred_at.gt."T",and(occurred_at.eq."T",event_seq.gt.N)
      const m = /^occurred_at\.gt\."([^"]+)",and\(occurred_at\.eq\."([^"]+)",event_seq\.gt\.(\d+)\)$/.exec(expr);
      assert.ok(m, `unexpected or(): ${expr}`);
      const t = ts(m[1]);
      const seq = Number(m[3]);
      filters.push((r) => ts(r.occurred_at) > t || (ts(r.occurred_at) === t && r.event_seq > seq));
      return q;
    },
    order(k, { ascending }) { orders.push([k, ascending ? 1 : -1]); return q; },
    limit(n) { limit = n; return q; },
    single() { return run(true, false); },
    maybeSingle() { return run(true, true); },
    then(resolve, reject) { return run(false).then(resolve, reject); },
  };
  async function run(single, maybe) {
    if (table === "analytics_dashboard_events_v1" && failView) return { data: null, error: { message: "boom" } };
    const rows = (tables[table] ??= []);
    if (op === "insert") {
      const row = { ...payload };
      if (table === "analytics_journeys") {
        row.journey_id ??= crypto.randomUUID();
        row.started_at ??= new Date().toISOString();
        row.last_seen_at ??= row.started_at;
      }
      if (table === "analytics_journey_launches") {
        if (rows.some((r) => r.launch_id === row.launch_id)) return { data: null, error: { code: "23505" } };
        row.created_at ??= new Date().toISOString();
      }
      rows.push(row);
      return { data: single ? row : [row], error: null };
    }
    let matched = rows.filter((r) => filters.every((f) => f(r)));
    if (op === "update") { matched.forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
    if (op === "delete") { tables[table] = rows.filter((r) => !matched.includes(r)); return { data: null, error: null }; }
    matched = [...matched].sort((a, b) => {
      for (const [k, dir] of orders) {
        const av = k === "occurred_at" || k.endsWith("_at") ? ts(a[k]) : a[k];
        const bv = k === "occurred_at" || k.endsWith("_at") ? ts(b[k]) : b[k];
        if (av < bv) return -dir;
        if (av > bv) return dir;
      }
      return 0;
    });
    matched = matched.slice(0, Math.min(limit, maxRows));
    if (single) {
      if (matched.length === 0) return { data: null, error: maybe ? null : { code: "PGRST116" } };
      return { data: matched[0], error: null };
    }
    return { data: matched, error: null };
  }
  return q;
}

const admin = {
  from: (table) => query(table),
  async rpc(name, args) {
    assert.equal(name, "analytics_insert_events");
    rpcCalls.push(args.p_rows);
    const rows = (tables.analytics_events ??= []);
    let inserted = 0;
    for (const r of args.p_rows) {
      const dup =
        rows.some((x) => x.event_id === r.event_id) ||
        (r.event === "app_opened" && rows.some((x) => x.event === "app_opened" && x.launch_id === r.launch_id)) ||
        (r.event === "journey_started" && rows.some((x) => x.event === "journey_started" && x.journey_id === r.journey_id));
      if (dup) continue;
      rows.push({ id: rows.length + 1, ...r });
      inserted++;
    }
    return { data: inserted, error: null };
  },
};

const mocks = {
  "@/utils/supabase/admin": { createAdminClient: () => admin },
  "@/package.json": { version: "9.9.9" },
};
const route = load("app/api/dashboard/v1/events/route.ts", mocks);
const lib = load("lib/server/dashboard/events.ts", mocks);
const journey = load("lib/server/analytics/journey.ts", mocks);
const events = load("lib/analytics/events.ts", mocks);

// ---- View fixture ----
function viewRow(seq, occurredAt, extra = {}) {
  const row = Object.fromEntries(EVENT_KEYS.map((k) => [k, null]));
  return Object.assign(row, {
    app_id: "runjump",
    event_id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    event_seq: seq,
    occurred_at: occurredAt,
    event_name: "step_viewed",
    entry_source: "direct",
    journey_id: "11111111-1111-4111-8111-111111111111",
    step_id: "home",
    app_version: "0.1.1",
    content_version: "games-2026.11",
  }, extra);
}

function seedView() {
  // Stored as PostgREST returns timestamptz; several rows share one millisecond.
  tables.analytics_dashboard_events_v1 = [
    viewRow(5, "2026-11-16T01:00:00.123+00:00"),
    viewRow(3, "2026-11-16T01:00:00.123+00:00"),
    viewRow(4, "2026-11-16T01:00:00.123+00:00"),
    viewRow(1, "2026-11-15T23:59:59.999+00:00"),
    viewRow(2, "2026-11-16T00:00:00+00:00", { event_name: "app_opened", journey_id: null, step_id: null, entry_source: "line_oa" }),
    viewRow(6, "2026-11-16T02:00:00.5+00:00", {
      event_name: "activity_ended", activity_type: "game", activity_id: "game-01-cardmatch",
      activity_attempt_id: "22222222-2222-4222-8222-222222222222", phase: "actual", level_id: "3",
      outcome: "completed", end_reason: "passed", duration_ms: "45000", progress: "120.5",
    }),
    viewRow(7, "2026-11-17T00:00:00+00:00"),
  ];
}

async function get(qs, { key = KEY, auth } = {}) {
  const headers = {};
  if (auth !== undefined) headers.authorization = auth;
  else if (key) headers.authorization = `Bearer ${key}`;
  const res = await route.GET(new NextRequest(`${BASE}?${qs}`, { headers }));
  return { status: res.status, body: await res.json(), headers: res.headers };
}

const DAY = "from=2026-11-16T00:00:00.000Z&until=2026-11-17T00:00:00.000Z";

test.beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  rpcCalls.length = 0;
  failView = false;
  maxRows = 1000;
  process.env.DASHBOARD_API_KEY = KEY;
  seedView();
});

test("401 without key, with wrong key, with non-Bearer scheme, or when the env key is unset", async () => {
  for (const opts of [{ key: null }, { key: "x".repeat(40) }, { auth: `Basic ${KEY}` }, { key: KEY.slice(0, -1) }]) {
    const r = await get(DAY, opts);
    assert.equal(r.status, 401);
    assert.deepEqual(r.body, { error: { code: "unauthorized", message: r.body.error.message } });
  }
  delete process.env.DASHBOARD_API_KEY;
  assert.equal((await get(DAY)).status, 401);
  assert.equal((await get(DAY, { key: "" })).status, 401);
});

test("401 is checked before parameters", async () => {
  assert.equal((await get("from=not-a-date", { key: null })).status, 401);
});

test("400 invalid_parameter for bad from/until/limit/cursor", async () => {
  const bad = [
    "", "from=not-a-date", "from=2026-11-16", "from=2026-11-16T00:00:00", "from=2026-02-30T00:00:00Z",
    "from=2026-11-16T25:00:00Z", `${DAY}&limit=0`, `${DAY}&limit=1001`, `${DAY}&limit=abc`, `${DAY}&limit=1.5`,
    `${DAY}&limit=-1`, `${DAY}&cursor=***`, `${DAY}&cursor=${Buffer.from("[1,2]").toString("base64url")}`,
    `${DAY}&cursor=${Buffer.from('["2026-11-16T00:00:00Z",-1]').toString("base64url")}`,
    "from=2026-11-17T00:00:00Z&until=2026-11-16T00:00:00Z", "from=2026-11-16T00:00:00Z&until=2026-11-16T00:00:00Z",
    `${DAY}&from=2026-11-15T00:00:00Z`,
  ];
  for (const qs of bad) {
    const r = await get(qs);
    assert.equal(r.status, 400, qs);
    assert.equal(r.body.error.code, "invalid_parameter", qs);
    assert.equal(typeof r.body.error.message, "string");
    assert.deepEqual(Object.keys(r.body), ["error"]);
  }
});

test("200: exactly events + next_cursor, 23 keys, range [from, until), UTC milliseconds, ordering", async () => {
  const r = await get(DAY);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store, private");
  assert.deepEqual(Object.keys(r.body), ["events", "next_cursor"]);
  assert.equal(r.body.next_cursor, null);
  assert.deepEqual(r.body.events.map((e) => e.event_seq), [2, 3, 4, 5, 6]);
  for (const e of r.body.events) {
    assert.deepEqual(Object.keys(e), EVENT_KEYS);
    assert.match(e.occurred_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    for (const v of Object.values(e)) assert.notEqual(v, "");
  }
  const ended = r.body.events.find((e) => e.event_name === "activity_ended");
  assert.equal(ended.occurred_at, "2026-11-16T02:00:00.500Z");
  assert.strictEqual(ended.duration_ms, 45000);
  assert.strictEqual(ended.progress, 120.5);
  const opened = r.body.events.find((e) => e.event_name === "app_opened");
  assert.equal(opened.journey_id, null);
});

test("until defaults to now; offsets are accepted", async () => {
  const now = Date.now();
  tables.analytics_dashboard_events_v1 = [
    viewRow(1, new Date(now - 2 * 3600e3).toISOString()),
    viewRow(2, new Date(now - 60e3).toISOString()),
    viewRow(3, new Date(now + 3600e3).toISOString()),
  ];
  // from = 3 hours ago, written in +07:00 (the "+" must be URL-encoded as %2B).
  const from = new Date(now - 3 * 3600e3 + 7 * 3600e3).toISOString().replace("Z", "+07:00");
  const r = await get(`from=${encodeURIComponent(from)}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.events.map((e) => e.event_seq), [1, 2]);
});

test("cursor round-trip pages through ties without gaps or repeats", async () => {
  for (const limit of [1, 2, 3, 4, 5]) {
    const seen = [];
    let cursor = null;
    let pages = 0;
    do {
      const r = await get(`${DAY}&limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`);
      assert.equal(r.status, 200);
      assert.ok(r.body.events.length <= limit);
      seen.push(...r.body.events.map((e) => e.event_seq));
      cursor = r.body.next_cursor;
      assert.ok(++pages < 20);
    } while (cursor);
    assert.deepEqual(seen, [2, 3, 4, 5, 6], `limit=${limit}`);
    assert.equal(pages, Math.ceil(5 / limit), `no empty trailing page for limit=${limit}`);
  }
});

test("next_cursor is null on the last full page (probe), even when max-rows equals the limit", async () => {
  maxRows = 5;
  const r = await get(`${DAY}&limit=5`);
  assert.equal(r.body.events.length, 5);
  assert.equal(r.body.next_cursor, null);
});

test("default limit is 1000", async () => {
  const t0 = Date.parse("2026-11-16T03:00:00Z");
  for (let i = 0; i < 1001; i++) tables.analytics_dashboard_events_v1.push(viewRow(100 + i, new Date(t0 + i).toISOString()));
  const r = await get(DAY);
  assert.equal(r.body.events.length, 1000);
  assert.ok(r.body.next_cursor);
  const r2 = await get(`${DAY}&cursor=${r.body.next_cursor}`);
  assert.equal(r2.body.events.length, 6);
  assert.equal(r2.body.next_cursor, null);
});

test("500 internal without details when the query fails", async () => {
  failView = true;
  const origError = console.error;
  console.error = () => {};
  try {
    const r = await get(DAY);
    assert.equal(r.status, 500);
    assert.deepEqual(r.body, { error: { code: "internal", message: "Internal error" } });
  } finally {
    console.error = origError;
  }
});

test("toEvent maps exactly the 23 keys and turns empty strings into null", () => {
  const e = lib.toEvent({ ...viewRow(9, "2026-11-16T00:00:00+00:00"), step_id: "", extra: "x", runjump_user_id: "u" });
  assert.deepEqual(Object.keys(e), EVENT_KEYS);
  assert.equal(e.step_id, null);
  assert.equal(e.occurred_at, "2026-11-16T00:00:00.000Z");
});

test("isAuthorized is strict", () => {
  assert.equal(lib.isAuthorized(`Bearer ${KEY}`, KEY), true);
  assert.equal(lib.isAuthorized(`bearer ${KEY}`, KEY), true);
  assert.equal(lib.isAuthorized(`Bearer ${KEY} extra`, KEY), false);
  assert.equal(lib.isAuthorized(null, KEY), false);
  assert.equal(lib.isAuthorized("Bearer ", ""), false);
  assert.equal(lib.isAuthorized(`Bearer ${KEY}`, undefined), false);
});

// ---- app_opened and journeys ----
const U = "33333333-3333-4333-8333-333333333333";
const P = "44444444-4444-4444-8444-444444444444";
const L1 = "55555555-5555-4555-8555-555555555555";

test("app_opened is a server-only canonical event", () => {
  assert.ok(events.CANONICAL_EVENTS.includes("app_opened"));
  assert.ok(events.SERVER_ONLY_EVENTS.has("app_opened"));
  assert.ok(events.SERVER_ONLY_EVENTS.has("journey_started"));
});

test("attachLaunch records one app_opened (journey_id null) before journey_started, with versions", async () => {
  const first = await journey.attachLaunch(admin, { userId: U, participantId: P, launchId: L1 });
  const again = await journey.attachLaunch(admin, { userId: U, participantId: P, launchId: L1 });
  assert.equal(again.journeyId, first.journeyId);
  assert.equal(again.isNew, false);
  const rows = tables.analytics_events;
  const opened = rows.filter((r) => r.event === "app_opened");
  assert.equal(opened.length, 1);
  assert.equal(opened[0].journey_id, null);
  assert.equal(opened[0].launch_id, L1);
  assert.equal(opened[0].participant_id, P);
  const started = rows.filter((r) => r.event === "journey_started");
  assert.equal(started.length, 1);
  assert.ok(opened[0].id < started[0].id, "app_opened gets the lower event_seq");
  assert.ok(opened[0].occurred_at <= started[0].occurred_at);
  for (const r of [opened[0], started[0]]) {
    assert.equal(r.app_version, "9.9.9");
    assert.equal(r.content_version, "games-2026.11");
  }
  assert.equal(tables.analytics_journeys[0].launch_id, L1);
  assert.equal(tables.analytics_journeys[0].entry_source, "line_oa");
});

test("a line_oa journey is not split after 30 idle minutes; a direct one is", async () => {
  const { journeyId } = await journey.attachLaunch(admin, { userId: U, participantId: P, launchId: L1 });
  const j = tables.analytics_journeys.find((x) => x.journey_id === journeyId);
  j.last_seen_at = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const kept = await journey.getOrCreateJourney(admin, U, journeyId, "s1");
  assert.equal(kept.journeyId, journeyId);
  assert.equal(kept.isNew, false);

  j.last_seen_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const after = await journey.getOrCreateJourney(admin, U, journeyId, "s1");
  assert.notEqual(after.journeyId, journeyId);

  tables.braintrian_participants = [];
  const direct = await journey.getOrCreateJourney(admin, "66666666-6666-4666-8666-666666666666", undefined, "s2");
  const dj = tables.analytics_journeys.find((x) => x.journey_id === direct.journeyId);
  dj.last_seen_at = new Date(Date.now() - 31 * 60 * 1000).toISOString();
  const split = await journey.getOrCreateJourney(admin, "66666666-6666-4666-8666-666666666666", direct.journeyId, "s2");
  assert.notEqual(split.journeyId, direct.journeyId);
});

test("lost cookie: a LINE participant's new journey inherits line_oa and the recent launch", async () => {
  tables.braintrian_participants = [{ participant_id: P, auth_user_id: U }];
  await journey.attachLaunch(admin, { userId: U, participantId: P, launchId: L1 });
  const j = await journey.getOrCreateJourney(admin, U, undefined, "chrome-session");
  const row = tables.analytics_journeys.find((x) => x.journey_id === j.journeyId);
  assert.equal(row.entry_source, "line_oa");
  assert.equal(row.launch_id, L1);
  assert.equal(row.participant_id, P);
  const started = tables.analytics_events.find((r) => r.event === "journey_started" && r.journey_id === j.journeyId);
  assert.equal(started.step_id, null);
  assert.equal(started.props.inherited_launch, true);
  assert.equal(started.app_version, "9.9.9");
  assert.equal(tables.analytics_events.filter((r) => r.event === "app_opened").length, 1, "no extra app_opened");
});

test("lost cookie after the launch is older than 24 h: direct journey with participant", async () => {
  tables.braintrian_participants = [{ participant_id: P, auth_user_id: U }];
  await journey.attachLaunch(admin, { userId: U, participantId: P, launchId: L1 });
  tables.analytics_journey_launches[0].created_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const j = await journey.getOrCreateJourney(admin, U, undefined, "s");
  const row = tables.analytics_journeys.find((x) => x.journey_id === j.journeyId);
  assert.equal(row.entry_source, "direct");
  assert.equal(row.launch_id, null);
  assert.equal(row.participant_id, P);
});

test("an inherited journey does not keep an old launch alive", async () => {
  tables.braintrian_participants = [{ participant_id: P, auth_user_id: U }];
  await journey.attachLaunch(admin, { userId: U, participantId: P, launchId: L1 });
  const inherited = await journey.getOrCreateJourney(admin, U, undefined, "s");
  assert.equal(tables.analytics_journeys.find((x) => x.journey_id === inherited.journeyId).launch_id, L1);
  tables.analytics_journey_launches[0].created_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const next = await journey.getOrCreateJourney(admin, U, undefined, "s");
  assert.equal(tables.analytics_journeys.find((x) => x.journey_id === next.journeyId).entry_source, "direct");
});

test("old journeys without launch_id resolve the launch through analytics_journey_launches", async () => {
  tables.braintrian_participants = [{ participant_id: P, auth_user_id: U }];
  const old = { journey_id: crypto.randomUUID(), user_id: U, participant_id: P, entry_source: "line_oa", launch_id: null,
    started_at: new Date().toISOString(), last_seen_at: new Date().toISOString() };
  tables.analytics_journeys = [old];
  tables.analytics_journey_launches = [{ launch_id: L1, journey_id: old.journey_id, created_at: new Date().toISOString() }];
  assert.equal(await journey.findRecentLaunch(admin, P), L1);
});
