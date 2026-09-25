/**
 * Dedicated timing controller for Card Match (game-01-cardmatch).
 *
 * Responsibilities:
 * 1. Accurately measures active gameplay time (userTimeMs).
 * 2. Excludes confirmed paused intervals (e.g. timeout popup, scene pauses).
 * 3. Keeps player thinking time during active gameplay included.
 * 4. Handles repeated or overlapping pause/resume events without double-counting.
 * 5. Finalizes duration once when round ends (freezing final duration).
 * 6. Resets cleanly for new rounds or replays.
 */
export class CardMatchTimer {
  private startTime = 0;
  private totalPausedMs = 0;
  private pauseStartTime: number | null = null;
  private finalizedDuration: number | null = null;
  private nowFn: () => number;

  constructor(nowFn: () => number = Date.now) {
    this.nowFn = nowFn;
  }

  /**
   * Starts or restarts active timing.
   */
  start(timestamp?: number): void {
    this.startTime = timestamp ?? this.nowFn();
    this.totalPausedMs = 0;
    this.pauseStartTime = null;
    this.finalizedDuration = null;
  }

  /**
   * Pauses timing if running and not already paused.
   * Repeated or overlapping pause calls are safely ignored without double-counting.
   */
  pause(timestamp?: number): void {
    if (this.startTime === 0 || this.finalizedDuration !== null) return;
    if (this.pauseStartTime !== null) return; // Already paused
    this.pauseStartTime = timestamp ?? this.nowFn();
  }

  /**
   * Resumes timing if currently paused.
   * Repeated or redundant resume calls are safely ignored without double-counting.
   */
  resume(timestamp?: number): void {
    if (this.startTime === 0 || this.finalizedDuration !== null) return;
    if (this.pauseStartTime === null) return; // Not paused
    const now = timestamp ?? this.nowFn();
    const pausedDuration = Math.max(0, now - this.pauseStartTime);
    this.totalPausedMs += pausedDuration;
    this.pauseStartTime = null;
  }

  /**
   * Returns whether the timer is currently in a paused state.
   */
  isPaused(): boolean {
    return this.pauseStartTime !== null;
  }

  /**
   * Returns the current active play duration in milliseconds.
   * Excludes all completed and ongoing paused intervals.
   * If finalized, returns the exact finalized duration.
   */
  getUserTimeMs(timestamp?: number): number {
    if (this.startTime === 0) return 0;
    if (this.finalizedDuration !== null) return this.finalizedDuration;

    const now = timestamp ?? this.nowFn();
    if (this.pauseStartTime !== null) {
      // Currently paused: freeze active time at the moment pause began
      return Math.max(0, this.pauseStartTime - this.startTime - this.totalPausedMs);
    }
    return Math.max(0, now - this.startTime - this.totalPausedMs);
  }

  /**
   * Finalizes and locks the duration at round completion.
   * Subsequent time advancements or pause events will not alter the result.
   */
  finalize(timestamp?: number): number {
    if (this.finalizedDuration !== null) return this.finalizedDuration;
    if (this.startTime === 0) {
      this.finalizedDuration = 0;
      return 0;
    }
    const duration = this.getUserTimeMs(timestamp);
    this.finalizedDuration = duration;
    return duration;
  }

  /**
   * Resets all timing state for a new round or replay.
   */
  reset(): void {
    this.startTime = 0;
    this.totalPausedMs = 0;
    this.pauseStartTime = null;
    this.finalizedDuration = null;
  }

  getStartTime(): number {
    return this.startTime;
  }

  getTotalPausedMs(): number {
    return this.totalPausedMs;
  }

  isFinalized(): boolean {
    return this.finalizedDuration !== null;
  }
}
