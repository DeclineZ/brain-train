import test from "node:test";
import assert from "node:assert/strict";
import { CardMatchTimer } from "../games/game-01-cardmatch/CardMatchTimer";
import { calculateMatchingStats } from "../lib/scoring/matching";

test("Batch 3 - Requirement 1: Normal uninterrupted play", () => {
  let currentTime = 1000;
  const timer = new CardMatchTimer(() => currentTime);

  // Round starts at t = 1000
  timer.start();
  assert.strictEqual(timer.getStartTime(), 1000);
  assert.strictEqual(timer.isPaused(), false);
  assert.strictEqual(timer.getTotalPausedMs(), 0);

  // Play actively for 15,000 ms without interruption
  currentTime = 16000;
  assert.strictEqual(timer.getUserTimeMs(), 15000, "Active time matches elapsed time when uninterrupted");

  // Round ends and duration is finalized
  const finalized = timer.finalize();
  assert.strictEqual(finalized, 15000);
  assert.strictEqual(timer.isFinalized(), true);
  assert.strictEqual(timer.getTotalPausedMs(), 0, "No paused time recorded for uninterrupted play");
});

test("Batch 3 - Requirement 2: A long timeout-modal wait followed by continuation", () => {
  let currentTime = 1000;
  const timer = new CardMatchTimer(() => currentTime);

  // 1. Game starts at t = 1000
  timer.start();

  // 2. Player plays actively for 30 seconds (30,000 ms) until timeout at t = 31000
  currentTime = 31000;
  assert.strictEqual(timer.getUserTimeMs(), 30000);

  // 3. Timeout occurs -> handleTimeout() pauses the timer
  timer.pause();
  assert.strictEqual(timer.isPaused(), true);

  // 4. Player waits on the timeout popup for 60 seconds (60,000 ms) while paused
  currentTime = 91000;

  // Active time must remain frozen at 30,000 ms during the entire modal wait
  assert.strictEqual(
    timer.getUserTimeMs(),
    30000,
    "userTimeMs must remain frozen while the timeout modal is open"
  );

  // 5. Player clicks 'เล่นต่อ' (Continue) -> resumeGame(true) resumes timer
  timer.resume();
  assert.strictEqual(timer.isPaused(), false);
  assert.strictEqual(timer.getTotalPausedMs(), 60000, "Full 60s modal wait recorded as paused time");

  // 6. Player takes 10 seconds (10,000 ms) of active play to match remaining cards
  currentTime = 101000;
  assert.strictEqual(
    timer.getUserTimeMs(),
    40000,
    "userTimeMs is exactly active time (30s before timeout + 10s after continuation = 40s)"
  );

  // 7. Round ends -> finalize()
  const duration = timer.finalize();
  assert.strictEqual(duration, 40000, "Finalized duration excludes the 60,000 ms timeout modal wait");

  // Uncorrected wall-clock time would have been (101000 - 1000) = 100,000 ms
  const wallClockTime = currentTime - timer.getStartTime();
  assert.strictEqual(wallClockTime, 100000);
  assert.notStrictEqual(duration, wallClockTime, "userTimeMs must NOT equal wall-clock time after pause");

  // 8. Verify scoring policy preservation:
  // With continuedAfterTimeout = true, speed score uses corrected 40,000 ms (not 100,000 ms),
  // but penalty policy ensures max 1 star.
  const stats = calculateMatchingStats({
    levelPlayed: 5,
    userTimeMs: duration,
    parTimeMs: 45000,
    wrongFlips: 1,
    consecutiveErrors: 0,
    repeatedErrors: 0,
    totalPairs: 6,
    attempts: 7,
    difficultyMultiplier: 1.0,
    continuedAfterTimeout: true,
  });

  assert.ok(stats.stat_speed > 0, "Speed stat is computed from active 40s, not penalizing for pause wait");
  // Penalty factor reduces raw score by 30% when continuedAfterTimeout is true
  const normalStats = calculateMatchingStats({
    levelPlayed: 5,
    userTimeMs: duration,
    parTimeMs: 45000,
    wrongFlips: 1,
    consecutiveErrors: 0,
    repeatedErrors: 0,
    totalPairs: 6,
    attempts: 7,
    difficultyMultiplier: 1.0,
    continuedAfterTimeout: false,
  });
  assert.strictEqual(
    normalStats.stat_speed,
    100,
    "Without penalty, 40s on 45s parTime produces full 100 speed stat"
  );
  assert.strictEqual(
    stats.stat_speed,
    79,
    "Preserves existing continuedAfterTimeout scoring penalty policy (112.5 * 0.7 = 79)"
  );

  const uncorrectedStats = calculateMatchingStats({
    levelPlayed: 5,
    userTimeMs: wallClockTime,
    parTimeMs: 45000,
    wrongFlips: 1,
    consecutiveErrors: 0,
    repeatedErrors: 0,
    totalPairs: 6,
    attempts: 7,
    difficultyMultiplier: 1.0,
    continuedAfterTimeout: true,
  });
  assert.ok(
    stats.stat_speed > uncorrectedStats.stat_speed,
    "Corrected active timing (40s) prevents artificial score drop from 60s timeout modal pause (79 vs 32)"
  );
});

test("Batch 3 - Requirement 3: Repeated or overlapping pause events without double-counting", () => {
  let currentTime = 1000;
  const timer = new CardMatchTimer(() => currentTime);

  timer.start();

  // Play actively from t = 1000 to t = 5000 (4,000 ms active)
  currentTime = 5000;

  // First pause at t = 5000
  timer.pause();
  assert.strictEqual(timer.isPaused(), true);

  // Repeated/overlapping pause calls at t = 6000 and t = 7000
  currentTime = 6000;
  timer.pause(); // Redundant pause
  currentTime = 7000;
  timer.pause(); // Another redundant pause

  // Active time is still frozen at 4,000 ms
  assert.strictEqual(timer.getUserTimeMs(), 4000);

  // Resume at t = 9000 (total paused: 4,000 ms)
  currentTime = 9000;
  timer.resume();
  assert.strictEqual(timer.isPaused(), false);
  assert.strictEqual(timer.getTotalPausedMs(), 4000);

  // Redundant resume call at t = 9500
  currentTime = 9500;
  timer.resume(); // Should be a no-op
  assert.strictEqual(timer.getTotalPausedMs(), 4000, "Redundant resume must not alter totalPausedMs");

  // Active play from t = 9000 to t = 12000 (3,000 ms active)
  currentTime = 12000;
  // Total active time: 4000 ms (before pause) + 3000 ms (after resume) = 7000 ms
  assert.strictEqual(timer.getUserTimeMs(), 7000);

  const finalDuration = timer.finalize();
  assert.strictEqual(finalDuration, 7000);
  assert.strictEqual(timer.getTotalPausedMs(), 4000);
});

test("Batch 3 - Requirement 4: Thinking time during active gameplay remaining included", () => {
  let currentTime = 1000;
  const timer = new CardMatchTimer(() => currentTime);

  timer.start();

  // Player flips first card at t = 2000 (1,000 ms thinking)
  currentTime = 2000;
  assert.strictEqual(timer.getUserTimeMs(), 1000);

  // Player stares at grid thinking for 8 seconds without any pause modal
  currentTime = 10000;

  // Since game is actively running, all thinking time must be included
  assert.strictEqual(
    timer.getUserTimeMs(),
    9000,
    "Active thinking time without pause is fully included in userTimeMs"
  );
  assert.strictEqual(timer.getTotalPausedMs(), 0);
});

test("Batch 3 - Requirement 5: Replay resetting the timer", () => {
  let currentTime = 1000;
  const timer = new CardMatchTimer(() => currentTime);

  // Round 1
  timer.start();
  currentTime = 20000;
  timer.pause();
  currentTime = 30000;
  timer.resume();
  currentTime = 40000;
  const round1Duration = timer.finalize();
  assert.strictEqual(round1Duration, 29000);
  assert.strictEqual(timer.isFinalized(), true);

  // Player clicks Replay -> reset()
  timer.reset();
  assert.strictEqual(timer.getStartTime(), 0);
  assert.strictEqual(timer.getUserTimeMs(), 0);
  assert.strictEqual(timer.getTotalPausedMs(), 0);
  assert.strictEqual(timer.isPaused(), false);
  assert.strictEqual(timer.isFinalized(), false);

  // Round 2 starts fresh at t = 50000
  currentTime = 50000;
  timer.start();
  assert.strictEqual(timer.getStartTime(), 50000);

  currentTime = 62000; // 12,000 ms active play
  assert.strictEqual(timer.getUserTimeMs(), 12000);

  const round2Duration = timer.finalize();
  assert.strictEqual(round2Duration, 12000, "Round 2 has fresh timing without residual state from Round 1");
});

test("Batch 3 - Requirement 6: No duration changes after completion", () => {
  let currentTime = 1000;
  const timer = new CardMatchTimer(() => currentTime);

  timer.start();
  currentTime = 16000; // 15,000 ms active play
  const finalDuration = timer.finalize();
  assert.strictEqual(finalDuration, 15000);

  // Later wall-clock times
  currentTime = 20000;
  assert.strictEqual(timer.getUserTimeMs(), 15000, "Duration does not advance after finalization");

  currentTime = 50000;
  assert.strictEqual(timer.getUserTimeMs(), 15000);
  assert.strictEqual(timer.finalize(), 15000);

  // Pause / resume calls after finalization must be no-ops
  timer.pause();
  assert.strictEqual(timer.isPaused(), false, "Cannot pause a finalized timer");
  timer.resume();
  assert.strictEqual(timer.getUserTimeMs(), 15000);
});

test("Batch 3 - Requirement 7: Background/blur time handling only when game actually pauses", () => {
  let currentTime = 1000;
  const timer = new CardMatchTimer(() => currentTime);

  timer.start();
  currentTime = 5000; // 4,000 ms active play

  // Case A: Game continues running in background (no pause event)
  // Elapsed time is NOT excluded
  currentTime = 10000;
  assert.strictEqual(
    timer.getUserTimeMs(),
    9000,
    "When game continues running without pause, time is not excluded"
  );

  // Case B: Game actually pauses on blur (pause event fired)
  timer.pause();
  currentTime = 20000;
  assert.strictEqual(
    timer.getUserTimeMs(),
    9000,
    "When game actually pauses, time is excluded"
  );
  timer.resume();
  assert.strictEqual(timer.getTotalPausedMs(), 10000);

  currentTime = 23000;
  assert.strictEqual(timer.getUserTimeMs(), 12000);
});
