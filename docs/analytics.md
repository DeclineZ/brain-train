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

  It then adds `user_id`, `journey_id`, `participant_id` and `app_version` on the server.
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

Migration: `supabase/migrations/20261017090000_analytics_events.sql`.

| Table | Purpose |
|---|---|
| `analytics_journeys` | One RunJump visit: `journey_id`, `user_id`, `participant_id`, `entry_source`, `started_at`, `last_seen_at` |
| `analytics_journey_launches` | OA `launch_id` → `journey_id`. The primary key on `launch_id` makes claim retries reuse one journey. |
| `analytics_events` | Every event, web and in-game. `event_id` is unique. There is one `activity_started` and one `activity_ended` per attempt, and one `journey_started` per journey. |
| `analytics_runjump_export` (view) | PRD canonical columns. Contains only PRD event names. |

## participant_id and journeys

- `participant_id` is the Bot-issued UUID from `braintrian_participants`, looked up by the RunJump auth user. The browser never supplies it. It is set when a journey is created and copied onto each event. For users who did not come through the OA it is null.
- **Journey (visit) boundary.** A new `journey_id` starts when:
  1. an OA launch is claimed (`/auth/line-bot/claim` → `entry_source = line_oa`, with the launch attached);
  2. a batch arrives with no `rj_journey` cookie;
  3. the cookie's journey belongs to a different user (B after A on the same device);
  4. the journey has had no events for 30 minutes.

  Journeys from rules 2–4 get `entry_source = direct`, or `other` for VitalMind launches. A mapped participant returning without a new link keeps their `participant_id` but has no `launch_id`.
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

## Known gaps

- `activity_started` for games with an in-scene countdown or in-scene tutorial (for example Run For Your Life) fires when the scene is created, before the countdown. Use in-game `level_started` for the exact moment once it ships.
- A Google/Facebook login that fails at the provider and never comes back to `/auth/callback` logs only `login_method_selected`.
- If two first batches run at the same time (for example two tabs opened at once with no cookie), they can create two journeys.
- **Switching browser after opening an OA link.** The developer spec (§6–7) binds each link to the browser that claims it first. It does not say which browser that must be: LINE's in-app browser and the phone's default browser are both valid. If a participant opens the link in LINE and then picks "Open in default browser", the default browser has neither the claim cookie nor the session.
  - If it lands on `/auth/line-bot/continue`, the claim is rejected. That page logs `login_failed {method: 'line_oa', error_category: 'invalid_claim'}` with no user.
  - If it lands on another page, it is redirected to `/login`, which logs only an anonymous `step_viewed login`.

  Either way the visit stays in LINE's browser, and nothing is attributed to the wrong person. The analytics can't confirm a browser switch was the cause. Fixing this belongs to the OA entry flow, not analytics. One option is for the Bot to add LINE's `openExternalBrowser=1` parameter to the Start link (a Bot-side change; test on real devices). The other is a "please continue in this window" hint on the entry page.
- **Returning to RunJump outside LINE.** A participant's session lives in whichever browser claimed the link. Opening RunJump later in a different browser shows the login page. The rich menu is the intended entry each time.
