"use client";

// One execution of a game level (PRD activity_attempt_id). The play page creates
// one per GameCanvas mount and owns the activity_started / activity_ended
// boundaries. The id is shared with in-game telemetry through the Phaser
// registry key "attemptId" and saved as game_sessions.raw_data.attempt_id.

import type { ActivityEndReason, ActivityOutcome } from "./events";
import { newId, track, type TrackContext } from "./track";

// "intro": a tutorial that the scene turns into a real run in place (Run For Your
// Life level 0). Not an activity until the scene issues the run's attempt id.
export type AttemptMode = "normal" | "tutorial" | "intro";

export class GameAttempt {
  id = newId();
  private startedAt: number | null = null;
  private ended = false;

  constructor(
    readonly gameId: string,
    readonly level: number,
    public mode: AttemptMode,
  ) {}

  get isStarted() {
    return this.startedAt !== null;
  }

  get isOpen() {
    return this.startedAt !== null && !this.ended;
  }

  ctx(): TrackContext {
    return { gameId: this.gameId, level: this.level, attemptId: this.id };
  }

  /** Gameplay handed to the player. Tutorials are never an actual activity (PRD AC-15). */
  start(props: Record<string, unknown> = {}) {
    if (this.mode !== "normal" || this.startedAt !== null) return;
    this.startedAt = performance.now();
    track("activity_started", { ...props, phase: "actual", mode: this.mode }, this.ctx());
  }

  end(outcome: ActivityOutcome, endReason: ActivityEndReason, props: Record<string, unknown> = {}) {
    if (!this.isOpen) return;
    this.ended = true;
    track(
      "activity_ended",
      {
        ...props,
        phase: "actual",
        mode: this.mode,
        outcome,
        end_reason: endReason,
        elapsed_ms: Math.round(performance.now() - (this.startedAt ?? 0)),
      },
      this.ctx(),
    );
  }

  /**
   * The scene restarted itself and in-game telemetry issued a new id. Close the
   * previous attempt and continue under the new one.
   */
  rotate(nextId: string) {
    if (nextId === this.id) return;
    if (this.mode === "intro") {
      this.id = nextId;
      this.mode = "normal";
      this.start({ after_tutorial: true });
      return;
    }
    const wasStarted = this.isStarted;
    this.end("exited", "user_exit", { restarted: true });
    this.id = nextId;
    this.startedAt = null;
    this.ended = false;
    if (wasStarted) this.start({ restarted: true });
  }
}
