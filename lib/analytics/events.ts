// Allowlist of analytics event names. app/api/analytics drops anything not listed here.
// Web journey events are documented in docs/analytics.md; in-game events in
// docs/gametrackinghandoff.md section 5. Add new names here in the same commit.

// Canonical PRD §8.4 events (exported through analytics_runjump_export).
export const CANONICAL_EVENTS = [
  "journey_started",
  "step_viewed",
  "activity_started",
  "activity_ended",
  "result_viewed",
  "error_occurred",
] as const;

// RunJump web journey events (raw table only).
export const WEB_EVENTS = [
  "login_method_selected",
  "login_succeeded",
  "login_failed",
  "signup_succeeded",
  "logged_out",
  "avatar_selected",
  "game_selected",
  "level_chosen",
  "tutorial_review_clicked",
  "game_page_viewed",
  "game_loaded",
  "intro_popup_shown",
  "intro_popup_closed",
  "tutorial_completed",
  "replay_clicked",
  "next_level_clicked",
  "previous_level_clicked",
  "mute_toggled",
  "timeout_popup_shown",
] as const;

// Shared in-game events from the handoff (sections 2.4, 3 and 6).
export const GAME_COMMON_EVENTS = [
  "input_raw",
  "level_started",
  "level_ended",
  "level_paused",
  "level_resumed",
  "time_warning",
  "time_up",
  "input_ignored",
  "tutorial_step_shown",
  "tutorial_step_done",
  "telemetry_misuse",
] as const;

// Per-game events (handoff section 5) go here.
export const GAME_EVENTS = [
  // Game 01 - Card Match
  "preview_started",
  "card_flipped",
  "pair_checked",
  "hint_shown",
  "hint_closed",

  // Game 02 - Sensor Lock
  "stimulus_shown",
  "response_given",
  "response_timeout",
  "buttons_swapped",
  "phase_changed",

  // Game 03 - Billiards Math
  "equation_shown",
  "aim_started",
  "ball_shot",
  "ball_slotted",
  "ball_ejected",
  "revert_pressed",
  "answer_checked",
  "equation_timed_out",
  "mine_hit",
  "obstacle_hit",
  "out_of_shots",

  // Game 04 - Floating Ball Math
  "lane_changed",
  "ball_collected",
  "bomb_hit",
  "equation_completed",
  "equation_overshot",
  "thief_appeared",
  "thief_decision",

  // Game 05 - Worm Train
  "junction_switched",
  "worm_spawned",
  "worm_arrived",
  "trap_hit",
  "mistake_registered",

  // Game 06 - Dream Direct
  "arrow_spawned",
  "arrow_hit",
  "arrow_missed",
  "hold_completed",
  "ingame_tutorial_shown",
  "ingame_tutorial_completed",

  // Game 07 - Pink Cup
  "cup_moved",
  "numbers_revealed",
  "numbers_hidden",
  "target_reached",
  "probe_shown",
  "probe_answered",

  // Game 08 - Mystery Sound
  "sound_played",
  "choices_shown",
  "sound_replayed",
  "option_toggled",
  "answer_submitted",

  // Game 09 - Tube Sort
  "tube_selected",
  "tube_deselected",
  "ball_poured",
  "pour_failed",
  "tube_completed",
  "balls_frozen",

  // Game 10 - Miner
  "hook_dropped",
  "hook_missed",
  "object_grabbed",
  "object_cracked",
  "item_collected",
  "hazard_triggered",
  "dynamic_event_triggered",
  "objective_completed",
] as const;

export const EVENT_NAMES = [
  ...CANONICAL_EVENTS,
  ...WEB_EVENTS,
  ...GAME_COMMON_EVENTS,
  ...GAME_EVENTS,
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

const EVENT_SET: ReadonlySet<string> = new Set(EVENT_NAMES);

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && EVENT_SET.has(value);
}

// Stable PRD step_id values for step_viewed.
export const STEP_IDS = [
  "oa_entry",
  "login",
  "signup",
  "onboarding_avatar",
  "onboarding_completed",
  "home",
  "game_catalog",
  "level_selection",
  "tutorial",
  "game_play",
  "results",
] as const;

export type StepId = (typeof STEP_IDS)[number];

export type LoginMethod =
  | "email"
  | "google"
  | "facebook"
  | "line"
  | "guest"
  | "line_oa"
  | "vitalmind";

export type ActivityOutcome = "completed" | "failed" | "exited" | "error";

export type ActivityEndReason =
  | "completed"
  | "passed"
  | "failed"
  | "time_limit"
  | "user_exit"
  | "app_error";

// Events that only the server may create.
export const SERVER_ONLY_EVENTS: ReadonlySet<string> = new Set(["journey_started"]);
