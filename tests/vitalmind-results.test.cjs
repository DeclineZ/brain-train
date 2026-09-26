/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS loader isolates the actual routes from Supabase in these offline tests. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Load the actual route with a database double; never load credentials or contact Supabase.
const root = path.resolve(__dirname, "..");
let rows;
let calls;
let mapping;
let mappingError;
let sessionError;
let pageCap;
let registrationError;
let keyCounter = 0;

function query(table) {
  const filters = [];
  const orders = [];
  let start = 0;
  let end = Infinity;
  let mutation = false;
  const chain = {
    select(columns) {
      calls.push({ table, operation: "select", columns });
      return chain;
    },
    eq(field, value) {
      filters.push([field, "eq", value]);
      return chain;
    },
    lte(field, value) {
      filters.push([field, "lte", value]);
      return chain;
    },
    gte(field, value) {
      filters.push([field, "gte", value]);
      return chain;
    },
    lt(field, value) {
      filters.push([field, "lt", value]);
      return chain;
    },
    order(field, options) {
      orders.push([field, options.ascending]);
      return chain;
    },
    range(from, to) {
      start = from;
      end = to;
      return chain;
    },
    update(value) {
      mutation = true;
      calls.push({ table, operation: "update", value });
      return chain;
    },
    upsert(value, options) {
      calls.push({ table, operation: "upsert", value, options });
      if (!registrationError && !mapping) mapping = { auth_user_id: null };
      return Promise.resolve({ error: registrationError });
    },
    in() {
      return chain;
    },
    maybeSingle() {
      calls.push({ table, operation: "mapping", filters });
      return Promise.resolve({ data: mapping, error: mappingError });
    },
    then(resolve, reject) {
      if (mutation)
        return Promise.resolve({ error: null }).then(resolve, reject);
      calls.push({ table, operation: "read", filters, start, end });
      let data = rows.filter((row) =>
        filters.every(([field, op, value]) => {
          if (op === "eq") return row[field] === value;
          if (op === "lte") return row[field] <= value;
          if (op === "gte") return row[field] >= value;
          return row[field] < value;
        }),
      );
      data.sort((a, b) => {
        for (const [field, ascending] of orders) {
          if (a[field] !== b[field])
            return (a[field] < b[field] ? -1 : 1) * (ascending ? 1 : -1);
        }
        return 0;
      });
      data = data.slice(start, Math.min(end + 1, start + pageCap));
      return Promise.resolve({
        data: sessionError ? null : data,
        error: sessionError,
      }).then(resolve, reject);
    },
  };
  return chain;
}

const originalLoad = Module._load;
const originalTs = require.extensions[".ts"];
Module._load = function (id, parent, isMain) {
  if (id === "@/utils/supabase/admin")
    return {
      createAdminClient: () => ({
        from: query,
        rpc(name, args) {
          calls.push({ operation: "rpc", name, args });
          return {
            maybeSingle: () =>
              Promise.resolve({ data: mapping, error: mappingError }),
          };
        },
        auth: {
          admin: {
            getUserById: async (id) => {
              calls.push({ operation: "auth-read", id });
              return {
                data: {
                  user: { user_metadata: { onboarding_complete: true } },
                },
                error: null,
              };
            },
            updateUserById: async (id, value) => {
              calls.push({ operation: "auth-update", id, value });
              return { error: null };
            },
          },
        },
      }),
    };
  return originalLoad.call(
    this,
    id.startsWith("@/") ? path.join(root, id.slice(2)) : id,
    parent,
    isMain,
  );
};
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const {
  GET,
} = require("../app/internal/patients/[patient_id]/results/route.ts");
const { POST } = require("../app/internal/patient-updated/route.ts");
Module._load = originalLoad;
if (originalTs) require.extensions[".ts"] = originalTs;
else delete require.extensions[".ts"];
const { NextRequest } = require("next/server");
const previousFetch = global.fetch;
global.fetch = () => {
  throw new Error("Network access is forbidden in route tests");
};
test.after(() => {
  global.fetch = previousFetch;
});

function row(overrides = {}) {
  return {
    id: "session-1",
    user_id: "auth-user-1",
    game_id: "game-01-cardmatch",
    current_played: 1,
    score: 0,
    duration_seconds: 10,
    played_at: "2025-09-26T18:30:00.000Z",
    raw_data: { success: true },
    ...overrides,
  };
}

test.beforeEach(() => {
  rows = [row()];
  calls = [];
  mapping = { auth_user_id: "auth-user-1" };
  mappingError = null;
  sessionError = null;
  registrationError = null;
  pageCap = 200;
  process.env.MODULE_API_KEY = `test-key-${++keyCounter}`;
  process.env.VITALMIND_RATE_LIMIT_PER_MINUTE = "60";
});

function request(
  search = "",
  headers = { "x-api-key": process.env.MODULE_API_KEY },
) {
  return GET(
    new NextRequest(
      `http://localhost/internal/patients/external-patient/results${search}`,
      { headers },
    ),
    { params: Promise.resolve({ patient_id: "external-patient" }) },
  );
}

test("maps external patient ID before selecting that patient’s sessions", async () => {
  rows.push(row({ id: "other", user_id: "someone-else", score: 999 }));
  const response = await request();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user_id, "external-patient");
  assert.equal(body.games.length, 1);
  assert.equal(body.games[0].score, 0);
  assert.deepEqual(calls.find((c) => c.operation === "mapping").filters, [
    ["patient_id", "eq", "external-patient"],
  ]);
  assert.ok(
    calls
      .filter((c) => c.operation === "read")
      .every((c) =>
        c.filters.some((f) => f[0] === "user_id" && f[2] === "auth-user-1"),
      ),
  );
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("rejects missing or incorrect credentials without database access", async () => {
  for (const headers of [{}, { "x-api-key": "wrong-key" }]) {
    const response = await request("", headers);
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
  assert.equal(calls.length, 0);
});

test("missing server authentication configuration returns 503", async () => {
  delete process.env.MODULE_API_KEY;
  assert.equal((await request("", {})).status, 503);
  assert.equal(calls.length, 0);
});

test("unknown or unlinked patients never fall back to a direct user-ID query", async () => {
  for (const value of [null, { auth_user_id: null }]) {
    mapping = value;
    assert.equal((await request()).status, 404);
  }
  assert.ok(calls.every((c) => c.table === "vitalmind_patients"));
});

test("database failures return 500 rather than an empty or partial success", async () => {
  mappingError = { code: "mapping-test-error" };
  assert.equal((await request()).status, 500);
  mappingError = null;
  sessionError = { code: "session-test-error" };
  assert.equal((await request()).status, 500);
});

test("excludes unfinished, failed and tutorial rows but retains legacy completion and zero scores", async () => {
  rows = [row(), row({ id: "legacy", current_played: null, raw_data: null })];
  const rejected = [
    { current_played: 0 },
    { raw_data: { isTutorial: true } },
    { raw_data: { level: 0 } },
    { raw_data: { mode: "tutorial" } },
    { raw_data: { success: false } },
    ...[
      "started",
      "incomplete",
      "interrupted",
      "quit",
      "abandoned",
      "failed",
    ].map((status) => ({ raw_data: { status } })),
  ];
  rows.push(
    ...rejected.map((overrides, index) =>
      row({ id: `excluded-${index}`, ...overrides }),
    ),
  );
  const body = await (await request()).json();
  assert.equal(body.games.length, 2);
  assert.ok(body.games.every((game) => game.score === 0));
});

test("latest day comes from eligible results beyond multiple capped pages", async () => {
  pageCap = 2;
  rows = Array.from({ length: 5 }, (_, index) =>
    row({
      id: `unfinished-${index}`,
      played_at: "2025-09-27T12:00:00.000Z",
      raw_data: { status: "started" },
    }),
  );
  rows.push(row());
  const body = await (await request()).json();
  assert.equal(body.session_date, "2025-09-26");
  assert.equal(body.games.length, 1);
});

test("date query is bounded in the database and returns all pages even below requested page size", async () => {
  pageCap = 2;
  rows = Array.from({ length: 5 }, (_, index) =>
    row({ id: `session-${index}` }),
  );
  rows.push(row({ id: "next-day", played_at: "2025-09-27T00:00:00.000Z" }));
  rows.push(row({ id: "previous-day", played_at: "2025-09-25T23:59:59.999Z" }));
  const body = await (await request("?date=2025-09-26")).json();
  assert.equal(body.games.length, 5);
  assert.ok(
    calls
      .filter((c) => c.operation === "read")
      .every(
        (c) =>
          c.filters.some(
            (f) => f[1] === "gte" && f[2] === "2025-09-26T00:00:00.000Z",
          ) &&
          c.filters.some(
            (f) => f[1] === "lt" && f[2] === "2025-09-27T00:00:00.000Z",
          ),
      ),
  );
});

test("rejects malformed dates, including impossible calendar days", async () => {
  for (const date of [
    "",
    "invalid",
    "2025-02-29",
    "2025-04-31",
    "2025-13-01",
    "2025-9-1",
  ]) {
    assert.equal((await request(`?date=${date}`)).status, 400, date);
  }
  assert.equal(calls.length, 0);
  assert.equal((await request("?date=2024-02-29")).status, 404);
});

test("only ineligible sessions or an empty day returns 404", async () => {
  rows = [row({ raw_data: { status: "started" } })];
  assert.equal((await request()).status, 404);
  assert.equal((await request("?date=2025-09-26")).status, 404);
});

test("configured limit is shared across forwarded IPs for the authenticated API key", async () => {
  process.env.VITALMIND_RATE_LIMIT_PER_MINUTE = "1";
  assert.equal(
    (
      await request("", {
        "x-api-key": process.env.MODULE_API_KEY,
        "x-forwarded-for": "192.0.2.1",
      })
    ).status,
    200,
  );
  const response = await request("", {
    "x-api-key": process.env.MODULE_API_KEY,
    "x-forwarded-for": "192.0.2.2",
  });
  assert.equal(response.status, 429);
  assert.ok(response.headers.get("retry-after"));
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("repeated results reads never write delivery flags, including legacy include_sent parameters", async () => {
  const first = await (await request()).json();
  for (const query of ["?include_sent=false", "?include_sent=true", ""]) {
    assert.deepEqual(await (await request(query)).json(), first);
  }
  assert.ok(
    calls.every((call) => !["update", "upsert"].includes(call.operation)),
  );
});

test("does not fabricate a score maximum or missing measurements", async () => {
  rows = [row({ score: 1200, duration_seconds: 0, raw_data: {} })];
  let game = (await (await request()).json()).games[0];
  assert.equal(game.score, 1200);
  assert.equal(game.max_score, null);
  assert.equal(game.duration_seconds, null);
  rows = [row({ score: 85, raw_data: { maxScore: 100 } })];
  game = (await (await request()).json()).games[0];
  assert.equal(game.max_score, 100);
  rows = [row({ score: null, raw_data: { maxScore: "", max_score: -1 } })];
  game = (await (await request()).json()).games[0];
  assert.equal(game.score, null);
  assert.equal(game.max_score, null);
});

test("recovers known elapsed fields without using targets, averages, or unrelated raw fields", async () => {
  const cases = [
    ["game-01-cardmatch", { userTimeMs: 60500 }, 60.5],
    ["game-04-floating-ball-math", { totalTimeMs: 90000 }, 90],
    ["game-09-tube-sort", { completionTimeMs: 80000 }, 80],
    ["game-15-taxidriver", { totalTimeMs: 50000 }, 50],
    ["game-17-floatingmarket", { totalTimeMs: 30000 }, 30],
    ["game-01-cardmatch", { userTimeMs: 0 }, 0],
    [
      "game-01-cardmatch",
      { totalTimeMs: 1000, parTimeMs: 5000, reactionTimeAvg: 50 },
      null,
    ],
    ["game-01-cardmatch", { userTimeMs: "NaN" }, null],
  ];
  for (const [game_id, raw_data, expected] of cases) {
    rows = [row({ game_id, raw_data, duration_seconds: 0 })];
    const game = (await (await request()).json()).games[0];
    assert.equal(game.duration_seconds, expected, game_id);
  }
  rows = [row({ duration_seconds: 20.5, raw_data: { userTimeMs: 99999 } })];
  assert.equal(
    (await (await request()).json()).games[0].duration_seconds,
    20.5,
  );
});

function updateRequest(
  current,
  headers = { "x-api-key": process.env.MODULE_API_KEY },
) {
  return POST(
    new NextRequest("http://localhost/internal/patient-updated", {
      method: "POST",
      headers,
      body: JSON.stringify({ patient_id: "external-patient", current }),
    }),
  );
}

test("registration notification creates an unlinked mapping without creating an Auth session", async () => {
  mapping = null;
  const response = await updateRequest({
    name: " New ",
    surname: " Patient ",
    user_type: "patient",
  });
  assert.equal(response.status, 200);
  const insert = calls.find((c) => c.operation === "upsert");
  assert.equal(insert.value.name, "New");
  assert.equal(insert.value.user_type, "patient");
  assert.equal(insert.options.ignoreDuplicates, true);
  assert.equal("auth_user_id" in insert.value, false);
  assert.ok(!calls.some((c) => c.operation.startsWith("auth-")));
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("registration retry preserves linked identity and existing Auth metadata", async () => {
  assert.equal(
    (
      await updateRequest({
        name: "New",
        surname: "Name",
        user_type: "patient",
      })
    ).status,
    200,
  );
  const authUpdate = calls.find((c) => c.operation === "auth-update");
  assert.equal(authUpdate.id, "auth-user-1");
  assert.deepEqual(authUpdate.value.user_metadata, {
    onboarding_complete: true,
    full_name: "New Name",
  });
});

test("name updates work without user_type and do not recreate mappings", async () => {
  assert.equal(
    (await updateRequest({ name: "New", surname: "Name" })).status,
    200,
  );
  assert.ok(!calls.some((c) => c.operation === "upsert"));
  mapping = null;
  assert.equal(
    (await updateRequest({ name: "New", surname: "Name" })).status,
    404,
  );
});

test("patient update rejects missing auth, invalid user_type, malformed JSON and registration errors", async () => {
  assert.equal(
    (await updateRequest({ name: "New", surname: "Name" }, {})).status,
    401,
  );
  assert.equal(
    (await updateRequest({ name: "New", surname: "Name", user_type: 12 }))
      .status,
    400,
  );
  assert.equal(
    (
      await POST(
        new NextRequest("http://localhost/internal/patient-updated", {
          method: "POST",
          headers: { "x-api-key": process.env.MODULE_API_KEY },
          body: "{",
        }),
      )
    ).status,
    400,
  );
  assert.equal(calls.length, 0);
  registrationError = { code: "registration-test-error" };
  assert.equal(
    (
      await updateRequest({
        name: "New",
        surname: "Name",
        user_type: "patient",
      })
    ).status,
    500,
  );
  assert.ok(!calls.some((c) => c.operation === "rpc"));
});
