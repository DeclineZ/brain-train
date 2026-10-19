// Builds the PM analytics dashboard with live numbers.
//
//   node analytics/snapshot.mjs
//
// Read-only. Selects only non-identifying columns (no names, emails, DOB, gender,
// patient records), aggregates in memory and writes aggregates only:
//   analytics/out/snapshot.json
//   analytics/out/brain-train-analytics.html
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.
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
const key = env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const H = { apikey: key, Authorization: `Bearer ${key}` };

async function all(table, cols) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${url}/rest/v1/${table}?select=${cols}`, {
      headers: { ...H, Range: `${from}-${from + 999}`, "Range-Unit": "items" },
    });
    if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
    const page = await r.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function authUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const r = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: H });
    if (!r.ok) return users;
    const batch = (await r.json()).users || [];
    for (const u of batch) {
      users.push({
        id: u.id,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        provider: u.is_anonymous ? "anonymous" : u.app_metadata?.provider || "unknown",
      });
    }
    if (batch.length < 1000) return users;
  }
}

const [sessions, profiles, stars, missions, checkins, coinTx, inventory, items, badges, freq, friendships, games, users] =
  await Promise.all([
    all("game_sessions", "user_id,game_id,played_at,duration_seconds,current_played,raw_data"),
    all("user_profiles", "user_id,created_at,global_memory,global_speed,global_visual,global_focus,global_planning,global_emotion"),
    all("user_game_stars", "star"),
    all("daily_missions", "user_id,date,slot_index,completed"),
    all("checkin_summary", "current_streak,longest_streak,total_checkins"),
    all("coin_transactions", "user_id,delta,action_key"),
    all("player_inventory", "player_id,item_id"),
    all("items", "id,name,type,price"),
    all("user_badges", "badge_id"),
    all("friend_requests", "status"),
    all("friendships", "user_id_1,user_id_2"),
    all("games", "game_id,title,category"),
    authUsers(),
  ]);

// Users are in Thailand; bucket days and hours in local time.
const TZ = 7 * 3600e3;
const local = (d) => new Date(new Date(d).getTime() + TZ);
const day = (d) => local(d).toISOString().slice(0, 10);
const inc = (o, k, n = 1) => (o[k] = (o[k] || 0) + n);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const bucket = (n, edges) => edges.find(([max]) => n <= max)[1];
const isTutorial = (s) => s.current_played === 0 || s.raw_data?.isTutorial === true;
const now = Date.now();

const S = { generated_at: new Date().toISOString() };
const levelSessions = sessions.filter((s) => !isTutorial(s));

const byUser = {};
for (const s of sessions) (byUser[s.user_id] ??= []).push(s);
const players = Object.keys(byUser);
const activeDays = (u) => new Set((byUser[u] || []).map((s) => day(s.played_at)));

const signup = Object.fromEntries(users.map((u) => [u.id, u.created_at]));
for (const p of profiles) signup[p.user_id] ??= p.created_at;
const signedUp = Object.keys(signup);

const weekOf = (d) => {
  const t = local(d);
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
};
const wau = {};
for (const s of sessions) (wau[weekOf(s.played_at)] ??= new Set()).add(s.user_id);
const weeks = Object.keys(wau).sort();

S.range = {
  first_session: sessions.map((s) => s.played_at).sort()[0] ?? null,
  last_session: sessions.map((s) => s.played_at).sort().at(-1) ?? null,
};

S.totals = {
  accounts: signedUp.length,
  players: players.length,
  sessions: sessions.length,
  level_sessions: levelSessions.length,
  tutorial_sessions: sessions.length - levelSessions.length,
  latest_wau: weeks.length ? wau[weeks.at(-1)].size : 0,
  sessions_per_player_median: median(players.map((u) => byUser[u].length)),
  minutes_played: Math.round(levelSessions.reduce((t, s) => t + (s.duration_seconds > 0 && s.duration_seconds < 3600 ? s.duration_seconds : 0), 0) / 60),
};

S.providers = {};
for (const u of users) inc(S.providers, u.provider);

const daily = {};
const touch = (d) => (daily[d] ??= { sessions: 0, users: new Set(), signups: 0 });
for (const s of sessions) {
  const d = touch(day(s.played_at));
  d.sessions++;
  d.users.add(s.user_id);
}
for (const u of signedUp) touch(day(signup[u])).signups++;
S.daily = Object.keys(daily)
  .sort()
  .map((d) => ({ date: d, sessions: daily[d].sessions, players: daily[d].users.size, signups: daily[d].signups }));
S.weekly = weeks.map((w) => ({ week: w, players: wau[w].size }));

S.hour = Array(24).fill(0);
S.weekday = Array(7).fill(0);
for (const s of sessions) {
  const t = local(s.played_at);
  S.hour[t.getUTCHours()]++;
  S.weekday[(t.getUTCDay() + 6) % 7]++; // Monday first
}

S.sessions_per_player = {};
S.days_per_player = {};
for (const u of players) {
  inc(S.sessions_per_player, bucket(byUser[u].length, [[1, "1"], [3, "2–3"], [10, "4–10"], [30, "11–30"], [100, "31–100"], [Infinity, "100+"]]));
  inc(S.days_per_player, bucket(activeDays(u).size, [[1, "1"], [3, "2–3"], [7, "4–7"], [14, "8–14"], [30, "15–30"], [Infinity, "30+"]]));
}

const has = (u, f) => (byUser[u] || []).some(f);
S.funnel = [
  ["Created an account", signedUp.length],
  ["Played anything (incl. tutorial)", signedUp.filter((u) => byUser[u]).length],
  ["Finished a real level", signedUp.filter((u) => has(u, (s) => !isTutorial(s))).length],
  ["Tried 2+ different games", signedUp.filter((u) => new Set((byUser[u] || []).map((s) => s.game_id)).size >= 2).length],
  ["Came back on a 2nd day", signedUp.filter((u) => activeDays(u).size >= 2).length],
  ["Played on 7+ days", signedUp.filter((u) => activeDays(u).size >= 7).length],
];

// "Returned after day N": played at least once N or more days after signing up.
const returned = (n) => {
  const eligible = signedUp.filter((u) => now - new Date(signup[u]).getTime() > n * 864e5);
  const kept = eligible.filter((u) => {
    const t0 = new Date(signup[u]).getTime();
    return has(u, (s) => (new Date(s.played_at).getTime() - t0) / 864e5 >= n);
  });
  return { eligible: eligible.length, returned: kept.length };
};
S.retention = { d1: returned(1), d7: returned(7), d30: returned(30) };

S.last_played = {};
for (const u of players) {
  const days = (now - Math.max(...byUser[u].map((s) => new Date(s.played_at).getTime()))) / 864e5;
  inc(S.last_played, bucket(days, [[7, "This week"], [30, "7–30 days ago"], [90, "1–3 months ago"], [Infinity, "3+ months ago"]]));
}

const title = Object.fromEntries(games.map((g) => [g.game_id, g.title]));
const perGame = {};
for (const s of sessions) {
  const g = (perGame[s.game_id] ??= { game_id: s.game_id, title: title[s.game_id] || s.game_id, plays: 0, tutorials: 0, players: new Set(), tutPlayers: new Set(), lvlPlayers: new Set(), durations: [], stars: [0, 0, 0, 0], max_level: 0, continued: 0 });
  g.players.add(s.user_id);
  if (isTutorial(s)) {
    g.tutorials++;
    g.tutPlayers.add(s.user_id);
    continue;
  }
  g.plays++;
  g.lvlPlayers.add(s.user_id);
  if (s.duration_seconds > 0 && s.duration_seconds < 3600) g.durations.push(s.duration_seconds);
  if (s.raw_data?.stars != null) g.stars[Math.max(0, Math.min(3, Math.floor(+s.raw_data.stars || 0)))]++;
  g.max_level = Math.max(g.max_level, s.current_played || 0);
  if (s.raw_data?.continuedAfterTimeout) g.continued++;
}
S.games = Object.values(perGame)
  .map((g) => {
    const rated = g.stars.reduce((a, b) => a + b, 0);
    return {
      game_id: g.game_id,
      title: g.title,
      plays: g.plays,
      tutorials: g.tutorials,
      players: g.players.size,
      median_seconds: median(g.durations),
      three_star: rated ? g.stars[3] / rated : null,
      zero_star: rated ? g.stars[0] / rated : null,
      max_level: g.max_level,
      continued_after_timeout: g.continued,
      tutorial_to_level: g.tutPlayers.size ? [...g.tutPlayers].filter((u) => g.lvlPlayers.has(u)).length / g.tutPlayers.size : null,
    };
  })
  .sort((a, b) => b.plays - a.plays);

const attempts = {};
for (const s of levelSessions) inc(attempts, `${s.user_id}|${s.game_id}|${s.current_played}`);
const attemptCounts = Object.values(attempts);
S.replays = {
  levels_played: attemptCounts.length,
  replayed: attemptCounts.filter((n) => n > 1).length,
  avg_attempts: mean(attemptCounts),
};

S.stars = [0, 0, 0, 0];
for (const s of stars) S.stars[Math.max(0, Math.min(3, s.star || 0))]++;

S.domains = ["memory", "speed", "visual", "focus", "planning", "emotion"].map((d) => {
  const v = profiles.map((p) => p[`global_${d}`]).filter((x) => x != null);
  return { domain: d, measured: v.length, avg: mean(v) };
});

const missionDays = {};
S.missions_by_slot = {};
for (const m of missions) {
  const o = (S.missions_by_slot[m.slot_index] ??= { total: 0, done: 0 });
  o.total++;
  if (m.completed) o.done++;
  const k = `${m.user_id}|${m.date}`;
  missionDays[k] = (missionDays[k] || 0) + (m.completed ? 1 : 0);
}
S.missions = {
  total: missions.length,
  done: missions.filter((m) => m.completed).length,
  player_days: Object.keys(missionDays).length,
  all_three: Object.values(missionDays).filter((n) => n >= 3).length,
};

S.streaks = {
  players: checkins.length,
  on_streak_now: checkins.filter((c) => (c.current_streak || 0) > 0).length,
  best: Math.max(0, ...checkins.map((c) => c.longest_streak || 0)),
  avg_checkins: mean(checkins.map((c) => c.total_checkins || 0)),
  longest: {},
};
for (const c of checkins) inc(S.streaks.longest, bucket(c.longest_streak || 0, [[1, "1 day"], [3, "2–3"], [7, "4–7"], [14, "8–14"], [30, "15–30"], [Infinity, "30+"]]));

S.coins = { by_action: {}, earned: 0, spent: 0, spenders: new Set(coinTx.filter((t) => t.delta < 0).map((t) => t.user_id)).size };
for (const t of coinTx) {
  const o = (S.coins.by_action[t.action_key || "unknown"] ??= { count: 0, sum: 0 });
  o.count++;
  o.sum += t.delta || 0;
  if (t.delta > 0) S.coins.earned += t.delta;
  else S.coins.spent -= t.delta || 0;
}

const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
const owned = {};
for (const r of inventory) {
  const it = itemById[r.item_id];
  inc(owned, it ? `${it.name}` : String(r.item_id));
}
S.shop = {
  catalog: items.length,
  owners: new Set(inventory.map((r) => r.player_id)).size,
  top_items: Object.entries(owned).sort((a, b) => b[1] - a[1]).slice(0, 8),
};

S.badges = Object.entries(badges.reduce((o, b) => (inc(o, b.badge_id), o), {})).sort((a, b) => b[1] - a[1]);
S.friend_requests = freq.reduce((o, f) => (inc(o, f.status || "unknown"), o), {});
const friendly = new Set(friendships.flatMap((f) => [f.user_id_1, f.user_id_2]));
S.social = { friendships: friendships.length, players_with_friends: friendly.size };

const outDir = path.join(here, "out");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "snapshot.json"), JSON.stringify(S, null, 1));
const template = fs.readFileSync(path.join(here, "dashboard.html"), "utf8");
const marker = '<script id="snapshot" type="application/json">null</script>';
if (!template.includes(marker)) throw new Error("Snapshot marker missing from dashboard.html");
const json = JSON.stringify(S).replace(/</g, "\\u003c");
fs.writeFileSync(
  path.join(outDir, "brain-train-analytics.html"),
  template.replace(marker, `<script id="snapshot" type="application/json">${json}</script>`)
);
console.log(`Snapshot: ${S.totals.accounts} accounts, ${S.totals.players} players, ${S.totals.sessions} sessions`);
console.log(`Wrote ${path.relative(root, path.join(outDir, "brain-train-analytics.html"))}`);
