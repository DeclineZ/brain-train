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
  // 13 Box Pattern
  "sequence_shown",
  "orb_tapped",
  "round_ended",
  "phase_changed",
  // 14 Word Recognize
  "item_shown",
  "response_given",
  "response_timeout",
  // 16 Door Guardian
  "visitor_shown",
  "decision_made",
  "decision_timeout",
  "reference_opened",
  "reference_closed",
  "reference_page_changed",
  // 20 Box Counting
  "question_shown",
  "answer_selected",
  "question_timeout",
  // 19 Cashier
  "item_tapped",
  "numpad_pressed",
  "tally_submitted",
  "currency_added",
  "change_submitted",
  "patience_penalty",
  // 21 Parking Jam
  "car_selected",
  "car_deselected",
  "move_attempted",
  "car_exited",
  "undo_pressed",
  "reset_pressed",
  "direction_guide_shown",
  "direction_guide_closed",
  // 15 Taxi Driver
  "intersection_approaching",
  "direction_pressed",
  "turn_resolved",
  "brake_stop_shown",
  "brake_resolved",
  "road_closed",
  "controls_swapped",
  "path_faded",
  "path_shown",
  "life_lost",
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
