import test from "node:test";
import assert from "node:assert/strict";

import {
  isCompletedSession,
  isTutorialPayload,
  normalizeLevelPlayed,
  getLatestCompletedSession,
  resolveGameProgression,
} from "../lib/sessionProgression";
import { calculateMatchingStats } from "../lib/scoring/matching";
import { calculateSensorLockStats } from "../lib/scoring/sensorlock";

test("Batch 1 - Requirement 1: Failed/abandoned status without success", () => {
  // Explicit failure / non-completion statuses must not count as completed, even if success is undefined
  const nonCompletionStatuses = [
    "failed",
    "abandoned",
    "quit",
    "interrupted",
    "incomplete",
    "started",
  ];

  for (const status of nonCompletionStatuses) {
    // 1. Inside raw_data without success property
    assert.strictEqual(
      isCompletedSession({ raw_data: { status } }),
      false,
      `Session with status '${status}' and absent success must NOT count as completed`
    );

    // 2. Case insensitivity and whitespace handling
    assert.strictEqual(
      isCompletedSession({ raw_data: { status: `  ${status.toUpperCase()}  ` } }),
      false,
      `Session with status '${status}' (uppercase/padded) must NOT count as completed`
    );

    // 3. Top-level status on session record
    assert.strictEqual(
      isCompletedSession({ status, raw_data: {} } as any),
      false,
      `Top-level session status '${status}' must NOT count as completed`
    );
  }

  // Explicit success === false
  assert.strictEqual(
    isCompletedSession({ raw_data: { success: false } }),
    false,
    "Explicit success: false must NOT count as completed"
  );
  assert.strictEqual(
    isCompletedSession({ raw_data: { success: false, status: "completed" } }),
    false,
    "Explicit success: false must NOT count as completed even with completed status"
  );

  // Documented compatibility rule for old completion records without status
  assert.strictEqual(
    isCompletedSession({ raw_data: { score: 100 } }),
    true,
    "Legacy session with raw_data but no status field counts as completed"
  );
  assert.strictEqual(
    isCompletedSession({ raw_data: { success: true } }),
    true,
    "Session with success: true and no status field counts as completed"
  );
  assert.strictEqual(
    isCompletedSession({ id: "legacy-session-row" } as any),
    true,
    "Legacy session row without raw_data counts as completed"
  );

  // Null or undefined session
  assert.strictEqual(isCompletedSession(null), false, "null session is not completed");
  assert.strictEqual(isCompletedSession(undefined), false, "undefined session is not completed");
});

test("Batch 1 - Requirement 2: Completed tutorial followed by more than 20 unfinished attempts", async () => {
  // Construct a dataset of 25 sessions:
  // - 24 most recent sessions are unfinished attempts (abandoned/started)
  // - 1 oldest session is a genuinely completed tutorial (current_played: 0, success: true)
  const sessionsDatabase: any[] = [];

  for (let i = 0; i < 24; i++) {
    sessionsDatabase.push({
      id: `unfinished-${i}`,
      current_played: i % 2 === 0 ? 0 : 1,
      played_at: new Date(2026, 8, 20, 12, 0, 24 - i).toISOString(),
      raw_data: {
        status: i % 2 === 0 ? "abandoned" : "started",
        // success is intentionally omitted / undefined
      },
    });
  }

  // Oldest record (index 24) is the completed tutorial session
  sessionsDatabase.push({
    id: "completed-tutorial",
    current_played: 0,
    played_at: new Date(2026, 8, 1, 10, 0, 0).toISOString(),
    raw_data: {
      mode: "tutorial",
      success: true,
      stars: 3,
      score: 0,
    },
  });

  // Mock Supabase client supporting paginated .range(from, to)
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              range: async (from: number, to: number) => {
                const batch = sessionsDatabase.slice(from, to + 1);
                return { data: batch, error: null };
              },
            }),
          }),
        }),
      }),
    }),
  };

  // With a page size of 10, the query must paginate across 3 pages and find the completed tutorial
  const foundSession = await getLatestCompletedSession(
    mockSupabase,
    "test-user-id",
    "game-01-cardmatch",
    10
  );

  assert.ok(foundSession, "Must find the older completed tutorial across page boundaries");
  assert.strictEqual(foundSession.id, "completed-tutorial");
  assert.strictEqual(foundSession.current_played, 0);

  // Verify progression: Having completed tutorial (current_played: 0),
  // the player advances to Level 1, despite 24 subsequent unfinished attempts
  const progression = resolveGameProgression({
    gameId: "game-01-cardmatch",
    completedSession: foundSession,
    hasValidParamLevel: false,
    safeParamLevel: null,
  });

  assert.strictEqual(
    progression.nextLevel,
    1,
    "Next level after completed tutorial must be Level 1"
  );
  assert.strictEqual(
    progression.activeLevel,
    1,
    "Returning player who completed tutorial must start at Level 1"
  );

  // If user only has unfinished attempts and NO completed sessions:
  const allUnfinishedMock = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              range: async (from: number, to: number) => {
                const batch = sessionsDatabase.slice(0, 24).slice(from, to + 1);
                return { data: batch, error: null };
              },
            }),
          }),
        }),
      }),
    }),
  };

  const noCompleted = await getLatestCompletedSession(
    allUnfinishedMock,
    "test-user-id",
    "game-01-cardmatch",
    10
  );
  assert.strictEqual(noCompleted, null, "Must return null when no completed sessions exist");

  const uncompletedProgression = resolveGameProgression({
    gameId: "game-01-cardmatch",
    completedSession: noCompleted,
    hasValidParamLevel: false,
    safeParamLevel: null,
  });
  assert.strictEqual(
    uncompletedProgression.activeLevel,
    0,
    "User without completed sessions must start at tutorial (Level 0)"
  );
});

test("Batch 1 - Requirement 3: Explicit tutorial flag with a positive level & conflicting fields", () => {
  // Scenario: Client submits { isTutorial: true, level: 1 }
  const payloadWithPositiveLevel = {
    isTutorial: true,
    level: 1,
    score: 100,
  };

  assert.strictEqual(
    isTutorialPayload(payloadWithPositiveLevel),
    true,
    "Payload with isTutorial: true must be recognized as tutorial despite positive level"
  );

  const normalized = normalizeLevelPlayed(payloadWithPositiveLevel);

  assert.strictEqual(
    normalized.levelPlayed,
    0,
    "levelPlayed must be normalized to 0, preventing persistence as Level 1"
  );
  assert.strictEqual(normalized.isTutorial, true);
  assert.strictEqual(normalized.normalizedRawData.level, 0, "normalizedRawData.level must be 0");
  assert.strictEqual(
    normalized.normalizedRawData.current_played,
    0,
    "normalizedRawData.current_played must be 0"
  );

  // Verify progression consequence:
  // Completing this normalized session yields current_played: 0 in DB
  const progression = resolveGameProgression({
    gameId: "game-01-cardmatch",
    completedSession: { current_played: normalized.levelPlayed },
    hasValidParamLevel: false,
    safeParamLevel: null,
  });

  assert.strictEqual(
    progression.nextLevel,
    1,
    "Completing normalized tutorial must unlock Level 1 (NOT Level 2)"
  );
  assert.strictEqual(progression.activeLevel, 1);

  // Conflicting level fields:
  // 1. level: 0, levelPlayed: 1
  const conflict1 = { level: 0, levelPlayed: 1 };
  assert.strictEqual(isTutorialPayload(conflict1), true);
  const normConflict1 = normalizeLevelPlayed(conflict1);
  assert.strictEqual(normConflict1.levelPlayed, 0);
  assert.strictEqual(normConflict1.normalizedRawData.level, 0);
  assert.strictEqual(normConflict1.normalizedRawData.levelPlayed, 0);

  // 2. level: 2, current_played: 0
  const conflict2 = { level: 2, current_played: 0 };
  assert.strictEqual(isTutorialPayload(conflict2), true);
  const normConflict2 = normalizeLevelPlayed(conflict2);
  assert.strictEqual(normConflict2.levelPlayed, 0);

  // 3. mode: 'tutorial', level: 3
  const conflict3 = { mode: "tutorial", level: 3 };
  assert.strictEqual(isTutorialPayload(conflict3), true);
  const normConflict3 = normalizeLevelPlayed(conflict3);
  assert.strictEqual(normConflict3.levelPlayed, 0);

  // 4. status: 'tutorial', level: 2
  const conflict4 = { status: "tutorial", level: 2 };
  assert.strictEqual(isTutorialPayload(conflict4), true);
  const normConflict4 = normalizeLevelPlayed(conflict4);
  assert.strictEqual(normConflict4.levelPlayed, 0);
});

test("Batch 1 - Requirement 4: Normal gameplay remaining unchanged", () => {
  // 1. Normal Level 1 completion payload
  const normalLevel1Payload = {
    level: 1,
    score: 250,
    stars: 2,
    success: true,
  };

  assert.strictEqual(
    isTutorialPayload(normalLevel1Payload),
    false,
    "Normal gameplay payload must NOT be recognized as tutorial"
  );

  const normalizedNormal = normalizeLevelPlayed(normalLevel1Payload);
  assert.strictEqual(normalizedNormal.levelPlayed, 1);
  assert.strictEqual(normalizedNormal.isTutorial, false);
  assert.strictEqual(normalizedNormal.normalizedRawData.level, 1);

  // 2. Progression after Level 1 completion advances to Level 2
  const progLevel1 = resolveGameProgression({
    gameId: "game-01-cardmatch",
    completedSession: { current_played: 1 },
    hasValidParamLevel: false,
    safeParamLevel: null,
  });
  assert.strictEqual(progLevel1.nextLevel, 2, "Level 1 completion advances to Level 2");
  assert.strictEqual(progLevel1.activeLevel, 2, "Active level becomes Level 2");

  // 3. Progression respects level selection params (e.g. ?level=5)
  const progExplicitParam = resolveGameProgression({
    gameId: "game-01-cardmatch",
    completedSession: { current_played: 1 },
    hasValidParamLevel: true,
    safeParamLevel: 5,
  });
  assert.strictEqual(progExplicitParam.activeLevel, 5, "Explicit level param overrides activeLevel");
  assert.strictEqual(progExplicitParam.nextLevel, 2, "resumeLevel remains next unlocked level");

  // 4. Game-specific progression rules preserved:
  // Game 14 (wordrecognize): returning player always has nextLevel 1 and activeLevel 1
  const g14Returning = resolveGameProgression({
    gameId: "game-14-wordrecognize",
    completedSession: { current_played: 1 },
    hasValidParamLevel: false,
    safeParamLevel: null,
  });
  assert.strictEqual(g14Returning.nextLevel, 1);
  assert.strictEqual(g14Returning.activeLevel, 1);

  const g14New = resolveGameProgression({
    gameId: "game-14-wordrecognize",
    completedSession: null,
    hasValidParamLevel: false,
    safeParamLevel: null,
  });
  assert.strictEqual(g14New.nextLevel, 1);
  assert.strictEqual(g14New.activeLevel, 0);

  // Game 18 (runforyourlife): first time forced to 0
  const g18New = resolveGameProgression({
    gameId: "game-18-runforyourlife",
    completedSession: null,
    hasValidParamLevel: false,
    safeParamLevel: null,
  });
  assert.strictEqual(g18New.nextLevel, 0);
  assert.strictEqual(g18New.activeLevel, 0);

  // Game 17 (floatingmarket): returning player activeLevel is nextLevel
  const g17Returning = resolveGameProgression({
    gameId: "game-17-floatingmarket",
    completedSession: { current_played: 2 },
    hasValidParamLevel: false,
    safeParamLevel: null,
  });
  assert.strictEqual(g17Returning.activeLevel, 3);
  assert.strictEqual(g17Returning.nextLevel, 3);

  // Game 19 (cashier): returning player activeLevel is nextLevel
  const g19Returning = resolveGameProgression({
    gameId: "game-19-cashier",
    completedSession: { current_played: 2 },
    hasValidParamLevel: false,
    safeParamLevel: null,
  });
  assert.strictEqual(g19Returning.activeLevel, 3);
  assert.strictEqual(g19Returning.nextLevel, 3);

  // 5. Clinical scoring calculation functions remain fully intact for normal gameplay
  const cardMatchStats = calculateMatchingStats({
    totalPairs: 6,
    wrongFlips: 2,
    consecutiveErrors: 1,
    repeatedErrors: 0,
    userTimeMs: 25000,
    parTimeMs: 30000,
    difficultyMultiplier: 1.0,
    attempts: 8,
    levelPlayed: 1,
    continuedAfterTimeout: false,
  });

  assert.ok(
    cardMatchStats.stat_memory !== null && typeof cardMatchStats.stat_memory === "number",
    "Normal gameplay produces authentic non-null memory stat"
  );
  assert.ok(
    cardMatchStats.stat_speed !== null && typeof cardMatchStats.stat_speed === "number",
    "Normal gameplay produces authentic non-null speed stat"
  );
  assert.ok(cardMatchStats.stat_memory >= 0 && cardMatchStats.stat_memory <= 100);
  assert.ok(cardMatchStats.stat_speed >= 0 && cardMatchStats.stat_speed <= 100);

  const sensorStats = calculateSensorLockStats({
    level: 1,
    score: 100,
    success: true,
    userTimeMs: 15000,
  } as any);

  assert.ok(
    sensorStats.stat_focus !== null && typeof sensorStats.stat_focus === "number",
    "Sensor lock produces authentic non-null focus stat"
  );
});
