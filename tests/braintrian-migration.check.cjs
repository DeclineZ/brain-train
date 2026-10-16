/* eslint-disable @typescript-eslint/no-require-imports -- Standalone optional PostgreSQL migration check. */
// Usage: node tests/braintrian-migration.check.cjs /path/to/@electric-sql/pglite
// The engine is installed separately; no production dependency or live DB needed.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require(process.argv[2] || "@electric-sql/pglite");
const p1 = "11111111-1111-4111-8111-111111111111";
const u1 = "22222222-2222-4222-8222-222222222222";
const u2 = "33333333-3333-4333-8333-333333333333";
const launch = "44444444-4444-4444-8444-444444444444";

async function main() {
  const db = new PGlite();
  try {
    // Minimal fixture, not a claim about the deployed project's profile schema.
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, email text unique, raw_app_meta_data jsonb);
      create table public.user_profiles (
        user_id uuid primary key references auth.users(id),
        friend_code text not null unique check (length(friend_code) = 4),
        last_updated timestamptz not null, full_name text
      );
      grant usage on schema public, auth to anon, authenticated, service_role;
    `);
    await db.exec(
      fs.readFileSync(
        path.join(
          __dirname,
          "../supabase/migrations/20261016071832_braintrian_auth.sql",
        ),
        "utf8",
      ),
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      for (const table of [
        "braintrian_auth_claims",
        "braintrian_participants",
      ]) {
        await assert.rejects(
          db.query(`select * from public.${table}`),
          (e) => e.code === "42501",
        );
      }
      await assert.rejects(
        db.query("select public.find_braintrian_auth_user_by_email($1, $2)", [
          "person@users.invalid",
          p1,
        ]),
        (e) => e.code === "42501",
      );
      await assert.rejects(
        db.query("select public.ensure_braintrian_profile($1)", [u1]),
        (e) => e.code === "42501",
      );
      await db.exec("reset role");
    }
    await db.query("insert into auth.users values ($1, $2, $3), ($4, $5, $6)", [
      u1,
      "braintrian-test@users.invalid",
      JSON.stringify({
        identity_provider: "braintrian_bot",
        participant_id: p1,
      }),
      u2,
      "unrelated@users.invalid",
      JSON.stringify({ identity_provider: "vitalmind", participant_id: p1 }),
    ]);
    await db.exec("set role service_role");
    assert.equal(
      (await db.query("select * from public.braintrian_auth_claims")).rows
        .length,
      0,
    );
    await db.query(
      "insert into public.braintrian_participants (participant_id, auth_user_id) values ($1, $2)",
      [p1, u1],
    );
    assert.equal(
      (
        await db.query(
          "select public.find_braintrian_auth_user_by_email($1, $2) as id",
          ["braintrian-test@users.invalid", p1],
        )
      ).rows[0].id,
      u1,
    );
    assert.equal(
      (
        await db.query(
          "select public.find_braintrian_auth_user_by_email($1, $2) as id",
          ["unrelated@users.invalid", p1],
        )
      ).rows[0].id,
      null,
    );
    assert.equal(
      (
        await db.query(
          "select public.find_braintrian_auth_user_by_email($1, $2) as id",
          ["braintrian-test@users.invalid", u2],
        )
      ).rows[0].id,
      null,
    );

    await db.query("select public.ensure_braintrian_profile($1)", [u1]);
    await db.exec("reset role");
    const profile = (
      await db.query("select * from public.user_profiles where user_id=$1", [
        u1,
      ])
    ).rows[0];
    assert.equal(profile.friend_code.length, 4);
    await db.query(
      "update public.user_profiles set full_name='Preserved existing name' where user_id=$1",
      [u1],
    );
    await db.exec("set role service_role");
    await db.query("select public.ensure_braintrian_profile($1)", [u1]);
    await assert.rejects(
      db.query("select public.ensure_braintrian_profile($1)", [u2]),
      /identity unavailable/,
    );
    await db.exec("reset role");
    assert.equal(
      (
        await db.query(
          "select full_name from public.user_profiles where user_id=$1",
          [u1],
        )
      ).rows[0].full_name,
      "Preserved existing name",
    );

    const insertClaim = `insert into public.braintrian_auth_claims (browser_binding_hash, code_hash, encrypted_code)
      values ($1, $2, $3) on conflict (app_id, browser_binding_hash, code_hash) do nothing returning *`;
    await db.exec("set role service_role");
    const args = ["a".repeat(64), "b".repeat(64), "v1.test.encrypted"];
    const claim = (await db.query(insertClaim, args)).rows[0];
    assert.equal(claim.redemption_id[14], "4");
    assert.equal(claim.status, "pending");
    assert.equal((await db.query(insertClaim, args)).rows.length, 0);
    assert.equal(
      (
        await db.query(
          "select redemption_id from public.braintrian_auth_claims where id=$1",
          [claim.id],
        )
      ).rows[0].redemption_id,
      claim.redemption_id,
    );
    await assert.rejects(
      db.query(insertClaim, ["invalid", "c".repeat(64), "encrypted"]),
      (e) => e.code === "23514",
    );
    await assert.rejects(
      db.query(insertClaim, ["a".repeat(64), "c".repeat(64), null]),
      (e) => e.code === "23514",
    );
    await assert.rejects(
      db.query(
        "update public.braintrian_auth_claims set status='redeemed' where id=$1",
        [claim.id],
      ),
      (e) => e.code === "23514",
    );
    await db.query(
      `update public.braintrian_auth_claims set status='redeemed', encrypted_code=null,
      participant_id=$2, launch_id=$3, entry_source='line_oa' where id=$1`,
      [claim.id, p1, launch],
    );
    await db.query(
      "update public.braintrian_auth_claims set status='attached' where id=$1",
      [claim.id],
    );
    const attached = (
      await db.query(
        "select * from public.braintrian_auth_claims where id=$1",
        [claim.id],
      )
    ).rows[0];
    assert.equal(attached.status, "attached");
    assert.equal(attached.encrypted_code, null);
    await db.query(
      "update public.braintrian_auth_claims set created_at=now()-interval '25 hours', expires_at=now()-interval '1 hour' where id=$1",
      [claim.id],
    );
    await db.exec(
      "delete from public.braintrian_auth_claims where expires_at <= now()",
    );
    assert.equal(
      (await db.query("select * from public.braintrian_auth_claims")).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.braintrian_participants")).rows
        .length,
      1,
    );
    console.log(
      "PostgreSQL migration checks passed: schema, constraints, service-only permissions, scoped identity lookup, profile fallback/preservation, and cleanup.",
    );
  } finally {
    await db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
