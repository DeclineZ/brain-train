# RunJump Analytics: Web Journey

Covers the website journey (entry → login → onboarding → home/catalog → level select → play → results) and the shared pipeline that in-game telemetry also uses. In-game per-action events are specified in [gametrackinghandoff.md](gametrackinghandoff.md). Requirements come from the LINE OA PRD v0.3 §7–8 and the developer spec §7–11.

Supabase is the only store. Nothing is sent to a third-party analytics service.

## Pipeline

```
track() ──batch──▶ POST /api/analytics ──▶ analytics_insert_events() ──▶ analytics_events
lib/analytics/track.ts   app/api/analytics/route.ts   (service role)
```

- `track(event, props, ctx)` queues events in memory. It flushes every 5 s, when 50 events are queued, when the tab is hidden, and on `pagehide` (`fetch` keepalive, with `sendBeacon` as fallback). It never throws. Setting `localStorage.analytics_opt_out = "1"` disables it. In development it logs `[analytics] <event>` to the console.
- The route checks:
  - the request is same-origin;
  - the body is at most 64 KB, with at most 50 events;
  - each name is on the allowlist (`lib/analytics/events.ts`);
  - `props` is at most 1 KB;
  - `occurred_at` is no more than 24 h in the past and no more than 5 min in the future.

  It then adds `user_id`, `journey_id`, `participant_id`, `app_version` and `content_version` on the server (`lib/analytics/version.ts`).
- Every event carries the `uid` it was created under. The server drops events whose `uid` doesn't match the current session, so events queued by participant A are never stored under participant B. Login, logout and the OA claim page call `flush()` before the session changes.
- Clients have no access to the analytics tables. Only the route writes, using the service role.

Server-only helpers live in `lib/server/analytics/journey.ts`. Client helpers:

| Helper | Use |
|---|---|
| `track`, `trackStep`, `flush` | `lib/analytics/track.ts` |
| `<TrackStep stepId=… />` | logs a step from a server component |
| `<TrackedLink event=… />` | a `next/link` that tracks its click |
| `GameAttempt` | `lib/analytics/attempt.ts`: activity boundaries for one level run |

## Tables

Migrations: `supabase/migrations/20261017090000_analytics_events.sql`, `20261116090000_dashboard_api_v1.sql` (Dashboard API). Prod migration history does not match this folder: apply new files in the Supabase SQL editor, never with `supabase db push`.

| Table | Purpose |
|---|---|
| `analytics_journeys` | One RunJump visit: `journey_id`, `user_id`, `participant_id`, `entry_source`, `launch_id` (origin launch, null before 16 Nov 2026), `started_at`, `last_seen_at` |
| `analytics_journey_launches` | OA `launch_id` → `journey_id`. The primary key on `launch_id` makes claim retries reuse one journey. |
| `analytics_events` | Every event, web and in-game. `event_id` is unique. There is one `activity_started` and one `activity_ended` per attempt, one `journey_started` per journey and one `app_opened` per `launch_id`. `id` is the Dashboard `event_seq`. |
| `analytics_runjump_export` (view) | CSV export (`npm run analytics:export`). PRD canonical columns, PRD event names except `app_opened`. Unchanged. |
| `analytics_dashboard_events_v1` (view) | Dashboard API rows: exactly the 23 openapi `Event` keys. See [Dashboard API](#dashboard-api-v1). |

## participant_id and journeys

- `participant_id` is the Bot-issued UUID from `braintrian_participants`, looked up by the RunJump auth user. The browser never supplies it. It is set when a journey is created and copied onto each event. For users who did not come through the OA it is null.
- **Journey (visit) boundary.** A new `journey_id` starts when:
  1. an OA launch is claimed (`/auth/line-bot/claim` → `entry_source = line_oa`, with the launch attached);
  2. a batch arrives with no `rj_journey` cookie;
  3. the cookie's journey belongs to a different user (B after A on the same device);
  4. the journey has had no events for 30 minutes. A `line_oa` journey is exempt: it lasts as long as its cookie (24 h after the last event), so a LINE visit keeps its `journey_id` and `launch_id` (Dashboard API Spec v1, RunJump).

  Journeys from rules 2–4 get `entry_source = direct`, or `other` for VitalMind launches, with one exception: when the user is a mapped participant whose latest OA launch is less than 24 h old (cookie lost, link opened in another browser), the new journey gets `entry_source = line_oa` and that launch in `analytics_journeys.launch_id`; its `journey_started` has `props.inherited_launch = true` and no `oa_entry` step. A mapped participant returning later without a new link keeps their `participant_id` but has no `launch_id`.
- **`app_opened`.** `attachLaunch()` records one `app_opened` per launch when the claim attaches the redeemed link to the session (PRD 8.4, 13 Nov 2026): `launch_id`, `participant_id`, time, no `journey_id`. It is written before the journey and its `journey_started`. A unique index makes retries a no-op. There is no deletion rule for RunJump and no backfill of launches before this change.
- A retried claim for the same launch returns the existing journey and does not log a second `journey_started`.

## Steps (`step_viewed.step_id`)

| step_id | Where |
|---|---|
| `oa_entry` | On the `journey_started` of an OA journey (server) |
| `login` / `signup` | `/login`, `/signup` |
| `onboarding_avatar` | `/onboarding` shown |
| `onboarding_completed` | Avatar saved and onboarding flag set |
| `home` | `/` |
| `game_catalog` | `/allgames` |
| `level_selection` | `/levels/[gameId]`. `activity_id` is the game; endless games have `props.endless = true` |
| `tutorial` | Play page in tutorial mode (`phase = instruction`) |
| `game_play` | Play page for an actual level (`phase = actual`) |
| `results` | Used as `step_id` on `result_viewed` |

## Events

### Canonical (exported)

| event | Trigger | Key fields |
|---|---|---|
| `app_opened` | OA launch attached to the session (server only, `journey_id` null) | `launch_id` |
| `journey_started` | New journey (server only) | `props.entry_source` |
| `step_viewed` | Step reached | `step_id`, sometimes `game_id` |
| `activity_started` | Gameplay passes to the player: when the intro popup is closed, or when the first scene is created if the game has no intro. Never in tutorial mode. | `game_id`, `level`, `attempt_id`, `props.phase = actual`, `props.mode` |
| `activity_ended` | Known end of a started attempt | `props.outcome`, `props.end_reason`, `props.score`, `props.stars`, `props.elapsed_ms` |
| `result_viewed` | Result popup shown | `step_id = results`, score and stars |
| `error_occurred` | `result_save_failed` (play page), `avatar_save_failed` (onboarding) | `props.error_code` |

### RunJump-specific (raw table only)

| event | props |
|---|---|
| `login_method_selected` | `method`: `email`, `google`, `facebook`, `line`, `guest`, `line_oa` or `vitalmind` |
| `login_succeeded` | `method`. Redirect logins (OAuth, LINE, LINE OA) are logged on the first page after the redirect. |
| `login_failed` | `method`, `error_category` (an error code only, never a message or an email) |
| `signup_succeeded`, `logged_out` | — |
| `avatar_selected` | `avatar_id` |
| `game_selected` | `source`: `daily_mission`, `mission_start` or `catalog`. Catalog clicks also send `action`: `play_now`, `select_level` or `tutorial`. |
| `level_chosen` | `level`, `unlocked`, `first_time_tutorial` |
| `tutorial_review_clicked` | — |
| `game_page_viewed` | `from`, `tutorial_mode` |
| `game_loaded` | `load_ms` (mount → first scene created), `has_intro` |
| `intro_popup_shown` / `intro_popup_closed` | `shown_ms` |
| `tutorial_completed` | `tutorial_mode` |
| `replay_clicked`, `next_level_clicked`, `previous_level_clicked` | — |
| `mute_toggled` | `muted` |
| `timeout_popup_shown` | — (the popup auto-continues with a penalty) |

## Attempts and outcomes

- **`attempt_id`** is the PRD `activity_attempt_id`. The play page creates one for each `GameCanvas` mount, so replay, next level and previous level each get a new one. It goes to the game as Phaser registry key `attemptId` and is saved as `game_sessions.raw_data.attempt_id`. If a scene restarts itself and in-game telemetry writes a new `attemptId` to the registry, the old attempt is closed as `exited`/`user_exit` with `props.restarted = true`, and the new one starts.
- **Outcome mapping for `activity_ended`:**

  | Situation | outcome | end_reason |
  |---|---|---|
  | Level game finished with ≥ 1 star | `completed` | `passed` |
  | Level game finished with 0 stars | `completed` | `completed` |
  | Level game hard fail (`success = false`) | `failed` | `failed` |
  | Endless game over | `completed` | `completed` |
  | Home button mid-level | `exited` | `user_exit` (`via = home_button`) |
  | In-app navigation away mid-level | `exited` | `user_exit` (`via = navigation`) |

  Time limits in RunJump level games give a penalty and continue; they do not end the attempt.
- **Missing end.** If the tab closes or the device sleeps, no end event is created. The attempt stays unfinished/unknown as of the reporting cutoff, and its last observed step and time are its last event (PRD AC-19). Do not count it as abandonment.
- **Elapsed time.** `elapsed_ms` and end `occurred_at` minus start `occurred_at` are both elapsed durations. They include pauses, countdowns and the timeout popup, so they are not active play time. Precise in-game boundaries are the `level_started` / `level_ended` events from in-game telemetry.

## Conventions

- `occurred_at` is client time, exported as UTC ISO 8601 with milliseconds (`2026-10-15T06:05:12.345Z`). `received_at` is server time.
- Durations are in milliseconds with the `_ms` suffix.
- Deduplicate on `(app_id, event_id)`. `event_id` stays the same across delivery retries.
- No names, emails, friend codes or free text are stored in props.
- Bot events (`oa_activity_requested`, `oa_link_issued`, `oa_link_redeemed`, `oa_launch_failed`) come from the Bot's `/api/events` export. Join them to RunJump on `(app_id, launch_id)`, and across products on `participant_id`.

## Export

```bash
npm run analytics:export -- --from 2026-10-15 --until 2026-10-16 --oa-only
```

This writes `analytics/out/runjump-events-*.csv|json` (canonical columns) and `runjump-launches-*.csv` (every launch for each journey). The view adds two RunJump columns: `game_mode` (`normal` / `tutorial`) and `runjump_user_id`. The PRD columns that don't apply to RunJump (`consent_status`, `playback_position_ms`, `content_duration_ms`) are always null.

## Dashboard API v1

`GET /api/dashboard/v1/events` (`app/api/dashboard/v1/events/route.ts`, helpers in `lib/server/dashboard/events.ts`) lets the project Dashboard pull events. Contract: Dashboard API Spec v1 (13 Nov 2026) and its `openapi.yaml`; field names follow PRD v0.5 §8. RunJump implements `/events` only.

- **Auth:** `Authorization: Bearer <DASHBOARD_API_KEY>` (server env, random, ≥ 32 characters, not the Bot or module key). Compared in constant time. Missing or wrong key, or an unset env var → `401 unauthorized`.
- **Parameters:** `from` (required, ISO 8601 date-time with `Z` or an offset; encode `+` as `%2B`), `until` (optional, default now, must be later than `from`), `limit` (1–1000, default 1000), `cursor` (the previous `next_cursor`, sent with the same `from`/`until`). Anything else malformed → `400 invalid_parameter`. Windows longer than 31 days are not rejected: the spec only says the Dashboard won't ask for them.
- **Response:** `{ "events": [...], "next_cursor": string | null }`, ordered by `occurred_at`, `event_seq`, `event_id`. Keyset pagination on (`occurred_at`, `event_seq`); `next_cursor` is null exactly when nothing is left (a full page is followed by a one-row probe, because PostgREST caps responses at its max-rows setting). Errors are `{ "error": { "code", "message" } }`; `500 internal` never includes details. Responses are `Cache-Control: no-store`; no CORS.
- **Source:** view `analytics_dashboard_events_v1`, read with the service role. It contains `app_opened` and the canonical events whose `journey_id` is set. Signed-out events (for example `step_viewed login` before login) and raw web/in-game events are not returned, so compare the acceptance count with `count(*)` of this view, not of `analytics_events`.
- **Acceptance:** `BASE_URL=https://<host> API_KEY=<key> node verify-dashboard-api.mjs runjump <YYYY-MM-DD>` (script from the spec). Test offline with `npm run test:dashboard`.

### Field mapping (23 keys)

| Key | Source | Null when |
|---|---|---|
| `app_id` | constant `runjump` | never |
| `event_id` | `analytics_events.event_id` | never |
| `event_seq` | `analytics_events.id` (identity) | never |
| `occurred_at` | `analytics_events.occurred_at`, sent as UTC with milliseconds | never |
| `event_name` | `analytics_events.event` | never |
| `entry_source` | `line_oa` when a launch is known, else `analytics_journeys.entry_source` | never |
| `participant_id` | event, else journey | not a mapped participant |
| `launch_id` | event (`app_opened`), else `analytics_journeys.launch_id`, else the journey's first `analytics_journey_launches` row | not an OA journey |
| `journey_id` | `analytics_events.journey_id` | `app_opened` only |
| `step_id` | `analytics_events.step_id` | events without a step |
| `consent_status` | — | always: RunJump has no consent step |
| `activity_type` | `game` on activity start/end and on errors with an attempt | other events |
| `activity_id` | `analytics_events.game_id` | events outside a game |
| `activity_attempt_id` | `analytics_events.attempt_id` | events outside an attempt |
| `phase` | `props.phase` (`instruction` / `practice` / `actual`) | not set |
| `level_id` | `analytics_events.level` as text | events without a level |
| `outcome`, `end_reason` | `props.outcome`, `props.end_reason` on `activity_ended` | every other event |
| `error_code` | `props.error_code` | events other than `error_occurred` |
| `duration_ms` | `props.duration_ms` of the same attempt's in-game `level_ended`, on `activity_ended` | no `level_ended` for the attempt (games without telemetry, exits before the level ended) and all other events |
| `progress` | `props.score` (game score) on `activity_ended` | no numeric score (exits, some endless/level games) and all other events |
| `app_version` | `analytics_events.app_version` (`package.json` version) | never; old server rows without it report `0.1.1` |
| `content_version` | `analytics_events.content_version` (`CONTENT_VERSION` in `lib/analytics/version.ts`) | never; rows before 16 Nov 2026 report `games-2026.11` |

`duration_ms` is the game's own timer (from `levelStarted()` to `levelEnded()`, pauses included unless the game reports active time). The Dashboard derives elapsed time from `occurred_at` itself.

## Known gaps

- `activity_started` for games with an in-scene countdown fires when the scene is created, before the countdown. Use in-game `level_started` for the exact moment.
- Run For Your Life level 0 opens with a short in-scene tutorial that turns into the real endless run. The tutorial part is not an activity: `activity_started` fires when the run begins (`props.after_tutorial = true`), under the run's own `attempt_id`.
- A Google/Facebook login that fails at the provider and never comes back to `/auth/callback` logs only `login_method_selected`.
- If two first batches run at the same time (for example two tabs opened at once with no cookie), they can create two journeys.
- **Switching browser after opening an OA link.** The developer spec (§6–7) binds each link to the browser that claims it first. It does not say which browser that must be: LINE's in-app browser and the phone's default browser are both valid. If a participant opens the link in LINE and then picks "Open in default browser", the default browser has neither the claim cookie nor the session.
  - If it lands on `/auth/line-bot/continue`, the claim is rejected. That page logs `login_failed {method: 'line_oa', error_category: 'invalid_claim'}` with no user.
  - If it lands on another page, it is redirected to `/login`, which logs only an anonymous `step_viewed login`.

  Either way the visit stays in LINE's browser, and nothing is attributed to the wrong person. The analytics can't confirm a browser switch was the cause. Fixing this belongs to the OA entry flow, not analytics. One option is for the Bot to add LINE's `openExternalBrowser=1` parameter to the Start link (a Bot-side change; test on real devices). The other is a "please continue in this window" hint on the entry page.
- **Returning to RunJump outside LINE.** A participant's session lives in whichever browser claimed the link. Opening RunJump later in a different browser shows the login page. The rich menu is the intended entry each time.
