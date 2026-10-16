/* eslint-disable @typescript-eslint/no-require-imports -- Offline tests execute the real TypeScript handlers with in-memory service doubles. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
const { NextRequest } = require("next/server");
const root = path.resolve(__dirname, "..");
const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const codeA = "a".repeat(43);
const codeB = "b".repeat(43);
const bindingSecret = "c".repeat(43);
const key = "ab".repeat(32);
let db, users, links, botClaims, botCalls, edgeCalls, faults, delays;

function query(table) {
  let operation = "read",
    value,
    options;
  const filters = [];
  const q = {
    select() {
      return q;
    },
    eq(k, v) {
      filters.push((r) => r[k] === v);
      return q;
    },
    is(k, v) {
      filters.push((r) => r[k] === v);
      return q;
    },
    in(k, values) {
      filters.push((r) => values.includes(r[k]));
      return q;
    },
    gt(k, v) {
      filters.push((r) => r[k] > v);
      return q;
    },
    upsert(v, o) {
      operation = "upsert";
      value = v;
      options = o;
      return q;
    },
    update(v) {
      operation = "update";
      value = v;
      return q;
    },
    single() {
      return execute(true);
    },
    maybeSingle() {
      return execute(true);
    },
    then(resolve, reject) {
      return execute(false).then(resolve, reject);
    },
  };
  async function execute(single) {
    const rows = db[table];
    assert.ok(rows, `unexpected table ${table}`);
    if (operation === "upsert") {
      const keys = options.onConflict.split(",");
      if (!rows.some((r) => keys.every((k) => r[k] === value[k]))) {
        rows.push(
          table === "braintrian_auth_claims"
            ? {
                id: crypto.randomUUID(),
                redemption_id: crypto.randomUUID(),
                status: "pending",
                participant_id: null,
                launch_id: null,
                entry_source: null,
                last_error_code: null,
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                ...value,
              }
            : { auth_user_id: null, ...value },
        );
      }
      return { data: null, error: null };
    }
    const matches = rows.filter((r) => filters.every((f) => f(r)));
    if (operation === "update") {
      if (
        table === "braintrian_auth_claims" &&
        value.status === "redeemed" &&
        faults.contextSave
      ) {
        faults.contextSave = false;
        return { data: null, error: { code: "simulated_storage_failure" } };
      }
      for (const row of matches) Object.assign(row, value);
    }
    return {
      data: single
        ? structuredClone(matches[0] ?? null)
        : structuredClone(matches),
      error: null,
    };
  }
  return q;
}

const admin = {
  from: query,
  async rpc(name, args) {
    if (name === "find_braintrian_auth_user_by_email") {
      const found = users.find(
        (u) =>
          u.email === args.p_email &&
          u.app_metadata.identity_provider === "braintrian_bot" &&
          u.app_metadata.participant_id === args.p_participant_id,
      );
      return { data: found?.id ?? null, error: null };
    }
    assert.equal(name, "ensure_braintrian_profile");
    return {
      data: null,
      error: faults.profile ? { code: "profile_unavailable" } : null,
    };
  },
  auth: {
    admin: {
      async createUser(value) {
        if (users.some((u) => u.email === value.email))
          return { data: { user: null }, error: { code: "email_exists" } };
        const user = { id: crypto.randomUUID(), ...structuredClone(value) };
        users.push(user);
        if (faults.createResponseLoss) {
          faults.createResponseLoss = false;
          return { data: { user: null }, error: { code: "response_lost" } };
        }
        return { data: { user }, error: null };
      },
      async getUserById(id) {
        return {
          data: { user: users.find((u) => u.id === id) ?? null },
          error: null,
        };
      },
      async generateLink({ email }) {
        const user = users.find((u) => u.email === email);
        assert.ok(user);
        const hash = crypto.randomUUID();
        links.set(hash, user.id);
        return {
          data: { properties: { hashed_token: hash }, user },
          error: null,
        };
      },
    },
  },
};
const publicAuth = {
  auth: {
    async verifyOtp({ token_hash }) {
      if (faults.session)
        return { data: { session: null }, error: { code: "session_failed" } };
      const user = users.find((u) => u.id === links.get(token_hash));
      assert.ok(user);
      return {
        data: {
          user,
          session: { access_token: user.id, refresh_token: "private-refresh" },
        },
        error: null,
      };
    },
  },
};

const edgeEnv = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
  SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_server-test" }),
  SUPABASE_ANON_KEY: "public-test",
  BRAINTRIAN_CLAIM_ENCRYPTION_KEY: key,
  BRAINTRIAN_IDENTITY_PEPPER: "pepper-".repeat(8),
  OA_BOT_API_KEY: "runjump-secret-test",
};
const originalEdgeEnv = { ...edgeEnv };

function load(relative, mocks = {}, cache = new Map()) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  const mod = { exports: {} };
  cache.set(filename, mod.exports);
  const resolve = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith("@/")) return load(`${id.slice(2)}.ts`, mocks, cache);
    if (id.startsWith("."))
      return load(
        `${path.relative(root, path.resolve(path.dirname(filename), id))}.ts`,
        mocks,
        cache,
      );
    return require(id);
  };
  new Function(
    "require",
    "module",
    "exports",
    "Deno",
    "setTimeout",
    outputText,
  )(
    resolve,
    mod,
    mod.exports,
    { env: { get: (name) => edgeEnv[name] }, serve() {} },
    (fn, milliseconds) => {
      delays.push(milliseconds);
      fn();
    },
  );
  return mod.exports;
}

const protocol = load("lib/server/braintrian/protocol.ts");
const edge = load("supabase/functions/braintrian-bot/index.ts", {
  "https://esm.sh/@supabase/supabase-js@2.89.0": {
    createClient: (_url, credential) =>
      credential === "service-role-test" ? admin : publicAuth,
  },
});
const mocks = {
  "@/utils/supabase/admin": { createAdminClient: () => admin },
  "@supabase/ssr": {
    createServerClient(_url, _key, options) {
      return {
        auth: {
          async setSession({ access_token }) {
            const user = users.find((u) => u.id === access_token);
            options.cookies.setAll([
              {
                name: "sb-test-auth",
                value: access_token,
                options: { path: "/", sameSite: "lax" },
              },
            ]);
            return {
              data: { user },
              error: faults.attachSession ? { code: "failed" } : null,
            };
          },
        },
      };
    },
  },
};
const entry = load("app/auth/line-bot/route.ts", mocks);
const claimRoute = load("app/auth/line-bot/claim/route.ts", mocks);
const middleware = load("utils/supabase/middleware.ts", {
  "@supabase/ssr": {
    createServerClient() {
      throw new Error("OA middleware must not refresh the previous user");
    },
  },
});

const originalFetch = global.fetch;
const originalEnv = { ...process.env };
test.after(() => {
  global.fetch = originalFetch;
  process.env = originalEnv;
});
test.beforeEach(() => {
  for (const name of Object.keys(edgeEnv)) delete edgeEnv[name];
  Object.assign(edgeEnv, originalEdgeEnv);
  db = { braintrian_participants: [], braintrian_auth_claims: [] };
  users = [];
  links = new Map();
  botClaims = new Map();
  botCalls = [];
  edgeCalls = [];
  faults = {};
  delays = [];
  process.env.BRAINTRIAN_OA_TESTING = "true";
  process.env.BRAINTRIAN_CLAIM_ENCRYPTION_KEY = key;
  process.env.SUPABASE_SECRET_KEY = "sb_secret_server-test";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-test";
  global.fetch = async (url, options) => {
    if (url === "https://test.supabase.co/functions/v1/braintrian-bot") {
      assert.equal(
        options.headers.apikey,
        process.env.SUPABASE_SECRET_KEY ||
          process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.headers["x-braintrian-key"], undefined);
      edgeCalls.push(options);
      return edge.handleRequest(new Request(url, options));
    }
    assert.equal(
      url,
      "https://brain-training-line-bot.vercel.app/api/launch/redeem",
      "unexpected network request",
    );
    const body = JSON.parse(options.body);
    assert.equal(options.headers.Authorization, "Bearer runjump-secret-test");
    assert.equal(options.headers["X-App-Id"], "runjump");
    const redemptionId = options.headers["Idempotency-Key"];
    botCalls.push({ code: body.code, redemptionId });
    if (faults.bot503)
      return Response.json(
        { error: "TEMPORARILY_UNAVAILABLE" },
        { status: 503 },
      );
    if (faults.bot401)
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (faults.botError)
      return Response.json(
        { error: faults.botError.code },
        { status: faults.botError.status },
      );
    if (faults.botMalformed)
      return Response.json({ participant_id: P1, app_id: "thincq" });
    if (!botClaims.has(body.code))
      botClaims.set(body.code, {
        redemptionId,
        context: {
          participant_id: body.code === codeB ? P2 : P1,
          launch_id: crypto.randomUUID(),
          app_id: "runjump",
          entry_source: "line_oa",
        },
      });
    const previous = botClaims.get(body.code);
    if (previous.redemptionId !== redemptionId)
      return Response.json({ error: "ALREADY_REDEEMED" }, { status: 409 });
    if (faults.botResponseLoss) {
      faults.botResponseLoss = false;
      throw new Error("response lost after redemption");
    }
    return Response.json(previous.context);
  };
});

async function prepare(code = codeA, cookie = "") {
  const response = await entry.GET(
    new NextRequest(`https://app.test/auth/line-bot?code=${code}`, {
      headers: cookie ? { cookie } : {},
    }),
  );
  const location = new URL(response.headers.get("location"));
  return {
    response,
    id: location.searchParams.get("claim"),
    cookie: response.cookies.get("braintrian_browser")?.value
      ? `braintrian_browser=${response.cookies.get("braintrian_browser").value}`
      : cookie,
    location,
  };
}
async function signIn(prepared, options = {}) {
  return claimRoute.POST(
    new NextRequest("https://app.test/auth/line-bot/claim", {
      method: "POST",
      headers: {
        origin: "https://app.test",
        "content-type": "application/json",
        cookie: prepared.cookie,
        ...options.headers,
      },
      body: options.body ?? JSON.stringify({ claimId: prepared.id }),
    }),
  );
}
function directEdge(body, headers = {}) {
  return edge.handleRequest(
    new Request("https://test.supabase.co/functions/v1/braintrian-bot", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: "sb_secret_server-test",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

test("preview GET prepares encrypted state only; repeated GET preserves the redemption key", async () => {
  const first = await prepare();
  const retry = await prepare(codeA, first.cookie);
  assert.equal(first.response.status, 303);
  assert.equal(first.location.pathname, "/auth/line-bot/continue");
  assert.equal(first.id, retry.id);
  assert.equal(db.braintrian_auth_claims.length, 1);
  assert.equal(users.length, 0);
  assert.equal(botCalls.length, 0);
  assert.equal(first.location.searchParams.has("code"), false);
  assert.match(first.response.headers.get("cache-control"), /no-store/);
  assert.match(first.response.headers.get("set-cookie"), /HttpOnly/);
  const row = db.braintrian_auth_claims[0];
  assert.equal(row.encrypted_code.includes(codeA), false);
  assert.equal(row.code_hash, protocol.hash(codeA));
  assert.equal(await edge.decryptCode(row, key), codeA);
});

test("new participant receives onboarding session, then returning login reuses identity/status", async () => {
  const first = await prepare();
  const response = await signIn(first);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { next: "/onboarding" });
  assert.equal(response.cookies.get("sb-test-auth").value, users[0].id);
  assert.equal(db.braintrian_auth_claims[0].encrypted_code, null);
  assert.equal(db.braintrian_auth_claims[0].status, "attached");
  users[0].user_metadata.onboarding_complete = true;
  const next = await prepare("d".repeat(43), first.cookie);
  assert.deepEqual(await (await signIn(next)).json(), { next: "/" });
  assert.equal(users.length, 1);
  assert.equal(db.braintrian_participants.length, 1);
  assert.equal(db.braintrian_auth_claims.length, 2);
});

test("timeout after Bot consumption retries the same key and logs in", async () => {
  const prepared = await prepare();
  faults.botResponseLoss = true;
  assert.equal((await signIn(prepared)).status, 200);
  assert.equal(botCalls.length, 2);
  assert.equal(botCalls[0].redemptionId, botCalls[1].redemptionId);
  assert.deepEqual(delays, [1000]);
});

test("failed verified-context save can recover through the same Bot key", async () => {
  const prepared = await prepare();
  faults.contextSave = true;
  assert.equal((await signIn(prepared)).status, 503);
  assert.equal(db.braintrian_auth_claims[0].status, "pending");
  assert.equal((await signIn(prepared)).status, 200);
  assert.equal(botCalls[0].redemptionId, botCalls[1].redemptionId);
});

test("profile/session failures retain verified context without redeeming again", async () => {
  for (const fault of ["profile", "session", "attachSession"]) {
    const prepared = await prepare(
      crypto.randomBytes(32).toString("base64url"),
    );
    faults[fault] = true;
    const failed = await signIn(prepared);
    assert.equal(failed.status, 503, fault);
    assert.equal(failed.cookies.get("sb-test-auth"), undefined);
    const calls = botCalls.length;
    faults[fault] = false;
    assert.equal((await signIn(prepared)).status, 200, fault);
    assert.equal(botCalls.length, calls);
  }
  assert.equal(users.length, 1);
});

test("response loss after completed attachment can recover without another redemption", async () => {
  const prepared = await prepare();
  assert.equal((await signIn(prepared)).status, 200);
  assert.equal((await signIn(prepared)).status, 200);
  assert.equal(botCalls.length, 1);
  assert.equal(users.length, 1);
});

test("a second participant replaces the first identity instead of linking accounts", async () => {
  const a = await prepare();
  const responseA = await signIn(a);
  const b = await prepare(codeB, a.cookie);
  const responseB = await signIn(b);
  assert.equal(responseB.status, 200);
  assert.notEqual(
    responseA.cookies.get("sb-test-auth").value,
    responseB.cookies.get("sb-test-auth").value,
  );
  assert.equal(users.length, 2);
  assert.deepEqual(
    new Set(users.map((u) => u.app_metadata.participant_id)),
    new Set([P1, P2]),
  );
});

test("a different browser cannot recover another browser's claim or consumed code", async () => {
  const a = await prepare();
  assert.equal((await signIn(a)).status, 200);
  const b = await prepare();
  assert.notEqual(a.id, b.id);
  assert.equal((await signIn({ ...b, id: a.id })).status, 400);
  assert.equal((await signIn(b)).status, 400);
  assert.equal(db.braintrian_auth_claims[1].status, "rejected");
  assert.equal(users.length, 1);
});

test("concurrent duplicate claims and interrupted Auth creation reuse one identity", async () => {
  const prepared = await prepare();
  faults.createResponseLoss = true;
  const responses = await Promise.all([signIn(prepared), signIn(prepared)]);
  assert.ok(responses.every((r) => r.status === 200));
  assert.equal(users.length, 1);
  assert.equal(db.braintrian_participants.length, 1);
  assert.equal(new Set(botCalls.map((c) => c.redemptionId)).size, 1);
});

test("invalid Bot header credentials fail before fetch without retrying", async () => {
  for (const botKey of ["invalid\nkey", "คีย์ตัวอย่าง"]) {
    edgeEnv.OA_BOT_API_KEY = botKey;
    assert.equal((await signIn(await prepare())).status, 503);
    assert.equal(botCalls.length, 0);
    assert.equal(users.length, 0);
    assert.deepEqual(delays, []);
  }
});

test("transient retries are bounded; credential defects are not retried", async () => {
  const prepared = await prepare();
  faults.bot503 = true;
  let response = await signIn(prepared);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).retryable, true);
  assert.equal(botCalls.length, 3);
  assert.deepEqual(delays, [1000, 3000]);
  assert.equal(db.braintrian_auth_claims[0].status, "pending");
  faults.bot503 = false;
  faults.bot401 = true;
  response = await signIn(prepared);
  assert.equal(response.status, 503);
  assert.equal(botCalls.length, 4);
  assert.equal(users.length, 0);
});

test("terminal errors are persisted; malformed upstream context cannot create users", async () => {
  for (const [code, status] of [
    ["INVALID_CODE", 400],
    ["APP_MISMATCH", 403],
    ["EXPIRED_CODE", 410],
    ["ALREADY_REDEEMED", 409],
  ]) {
    const prepared = await prepare(
      crypto.randomBytes(32).toString("base64url"),
    );
    faults.botError = { code, status };
    const response = await signIn(prepared);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, code);
    const before = botCalls.length;
    assert.equal((await signIn(prepared)).status, 400);
    assert.equal(botCalls.length, before);
  }
  faults.botError = null;
  faults.botMalformed = true;
  const malformed = await prepare("x".repeat(43));
  assert.equal((await signIn(malformed)).status, 503);
  assert.equal(users.length, 0);
});

test("origin, body, cookie, feature flag and claim expiry failures fail closed", async () => {
  const prepared = await prepare();
  for (const headers of [
    { origin: "https://evil.test" },
    { origin: "null" },
    { "sec-fetch-site": "cross-site" },
  ]) {
    assert.equal((await signIn(prepared, { headers })).status, 403);
  }
  assert.equal((await signIn(prepared, { body: "{" })).status, 400);
  assert.equal(
    (
      await signIn(prepared, {
        body: JSON.stringify({ claimId: "bad", padding: "x".repeat(9000) }),
      })
    ).status,
    400,
  );
  assert.equal((await signIn({ ...prepared, cookie: "" })).status, 400);
  assert.equal(edgeCalls.length, 0);
  db.braintrian_auth_claims[0].expires_at = new Date(
    Date.now() - 1000,
  ).toISOString();
  assert.equal((await signIn(prepared)).status, 400);
  assert.equal(botCalls.length, 0);
  process.env.BRAINTRIAN_OA_TESTING = "false";
  assert.equal((await signIn(prepared)).status, 503);
  assert.equal(
    (await prepare()).location.searchParams.get("error"),
    "unavailable",
  );
});

test("Edge rejects browser and unauthenticated requests before database access", async () => {
  for (const apikey of [
    "",
    "wrong",
    "public-test",
    "sb_publishable_test",
    "eyJhbGciOiJIUzI1NiJ9.user-jwt.signature",
  ]) {
    assert.equal((await directEdge({}, { apikey })).status, 401);
  }
  assert.equal(
    (
      await directEdge(
        {},
        {
          apikey: "",
          Authorization: "Bearer service-role-test",
        },
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await directEdge(
        {},
        {
          apikey: "",
          "x-braintrian-key": "old-internal-key",
        },
      )
    ).status,
    401,
  );
  assert.equal(
    (await directEdge({}, { origin: "https://app.test" })).status,
    401,
  );
  assert.equal(
    (
      await edge.handleRequest(
        new Request("https://test.supabase.co", { method: "OPTIONS" }),
      )
    ).status,
    405,
  );
  assert.equal((await directEdge({})).status, 400);
  assert.equal(botCalls.length, 0);
  assert.equal(users.length, 0);
  assert.equal(db.braintrian_participants.length, 0);
});

test("server login supports legacy service_role without a custom internal key", async () => {
  delete process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = edgeEnv.SUPABASE_SERVICE_ROLE_KEY;
  delete edgeEnv.SUPABASE_SECRET_KEYS;
  assert.equal((await signIn(await prepare())).status, 200);
  assert.equal(edgeCalls[0].headers.apikey, "service-role-test");
});

test("Edge accepts configured named secret keys during rotation and rejects removed keys", async () => {
  edgeEnv.SUPABASE_SECRET_KEYS = JSON.stringify({
    default: "sb_secret_server-test",
    worker: "sb_secret_rotated-test",
  });
  assert.equal((await directEdge({})).status, 400);
  assert.equal(
    (await directEdge({}, { apikey: "sb_secret_rotated-test" })).status,
    400,
  );
  edgeEnv.SUPABASE_SECRET_KEYS = JSON.stringify({
    worker: "sb_secret_rotated-test",
  });
  assert.equal((await directEdge({})).status, 401);
  assert.equal(botCalls.length, 0);
});

test("missing server credentials or invalid Edge key configuration fail closed", async () => {
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(
    (await prepare()).location.searchParams.get("error"),
    "unavailable",
  );
  assert.equal(db.braintrian_auth_claims.length, 0);
  delete edgeEnv.SUPABASE_SERVICE_ROLE_KEY;
  for (const value of ["{", "[]", '{"default":null}', "{}"]) {
    edgeEnv.SUPABASE_SECRET_KEYS = value;
    const response = await directEdge({});
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "configuration");
  }
  assert.equal(botCalls.length, 0);
  assert.equal(users.length, 0);
});

test("encryption is bound to browser and code; synthetic email is stable and opaque", async () => {
  const prepared = await prepare(codeA, `braintrian_browser=${bindingSecret}`);
  assert.ok(prepared.id);
  const row = db.braintrian_auth_claims[0];
  await assert.rejects(
    edge.decryptCode({ ...row, browser_binding_hash: "0".repeat(64) }, key),
  );
  await assert.rejects(edge.decryptCode(row, "00".repeat(32)));
  const email = await edge.participantEmail(
    P1,
    edgeEnv.BRAINTRIAN_IDENTITY_PEPPER,
  );
  assert.equal(
    email,
    await edge.participantEmail(P1, edgeEnv.BRAINTRIAN_IDENTITY_PEPPER),
  );
  assert.notEqual(
    email,
    await edge.participantEmail(P2, edgeEnv.BRAINTRIAN_IDENTITY_PEPPER),
  );
  assert.match(email, /^braintrian-[0-9a-f]{64}@users\.invalid$/);
  assert.ok(!email.includes(P1));
});

test("OA middleware bypasses prior-user auth/onboarding redirects in both auth modes", async () => {
  for (const mode of ["dual", "vitalmind"]) {
    process.env.AUTH_MODE = mode;
    for (const pathname of [
      "/auth/line-bot?code=secret",
      "/auth/line-bot/continue?claim=id",
      "/auth/line-bot/claim",
    ]) {
      const response = await middleware.updateSession(
        new NextRequest(`https://app.test${pathname}`),
      );
      assert.equal(response.headers.get("location"), null);
      assert.match(response.headers.get("cache-control"), /no-store/);
    }
  }
});

test("self-contained Edge Function typechecks against the installed Supabase SDK", () => {
  const filename = path.join(
    root,
    "supabase/functions/braintrian-bot/index.ts",
  );
  const options = {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  host.readFile = (file) => {
    let source = read(file);
    if (file === filename)
      source =
        source.replace(
          "https://esm.sh/@supabase/supabase-js@2.89.0",
          "@supabase/supabase-js",
        ) +
        "\ndeclare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };";
    return source;
  };
  const program = ts.createProgram([filename], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (f) => f,
      getNewLine: () => "\n",
    }),
  );
});
