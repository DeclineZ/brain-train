// Exports RunJump journey events in the PRD canonical contract (PRD §8, spec §11).
//
//   npm run analytics:export -- --from 2026-10-15 --until 2026-10-16 [--oa-only]
//
// --from is inclusive, --until exclusive (UTC). Reads the analytics_runjump_export
// view and analytics_journey_launches with the service key and writes:
//   analytics/out/runjump-events-<from>_<until>.csv / .json
//   analytics/out/runjump-launches-<from>_<until>.csv
// Field meanings: docs/analytics.md. Needs NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SECRET_KEY in .env.local.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const H = { apikey: key, Authorization: `Bearer ${key}` };

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const toIso = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d.toISOString();
};
const until = toIso(arg("--until") ?? new Date().toISOString());
const from = toIso(arg("--from") ?? new Date(Date.parse(until) - 31 * 864e5).toISOString());
const oaOnly = args.includes("--oa-only");

async function all(table, query) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${url}/rest/v1/${table}?${query}`, {
      headers: { ...H, Range: `${offset}-${offset + 999}`, "Range-Unit": "items" },
    });
    if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
    const page = await r.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

function toCsv(rows) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}

const range = `occurred_at=gte.${encodeURIComponent(from)}&occurred_at=lt.${encodeURIComponent(until)}`;
const filter = oaOnly ? "&entry_source=eq.line_oa" : "";
const events = await all(
  "analytics_runjump_export",
  `select=*&${range}${filter}&order=occurred_at.asc,event_id.asc`
);

const journeyIds = new Set(events.map((e) => e.journey_id).filter(Boolean));
const launches = (await all("analytics_journey_launches", "select=launch_id,journey_id,created_at&order=created_at.asc"))
  .filter((l) => journeyIds.has(l.journey_id))
  .map((l) => ({ app_id: "runjump", ...l }));

const tag = `${from.slice(0, 10)}_${until.slice(0, 10)}`;
const outDir = path.join(here, "out");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `runjump-events-${tag}.csv`), toCsv(events));
fs.writeFileSync(path.join(outDir, `runjump-events-${tag}.json`), JSON.stringify(events, null, 2));
fs.writeFileSync(path.join(outDir, `runjump-launches-${tag}.csv`), toCsv(launches));

const participants = new Set(events.map((e) => e.participant_id).filter(Boolean));
const starts = events.filter((e) => e.event_name === "activity_started");
const ended = new Set(events.filter((e) => e.event_name === "activity_ended").map((e) => e.activity_attempt_id));
console.log(`Range ${from} → ${until}${oaOnly ? " (line_oa only)" : ""}`);
console.log(`Events ${events.length}, journeys ${journeyIds.size}, mapped participants ${participants.size}`);
console.log(`Attempts started ${starts.length}, with recorded end ${starts.filter((s) => ended.has(s.activity_attempt_id)).length}`);
console.log(`Wrote analytics/out/runjump-*-${tag}.*`);
