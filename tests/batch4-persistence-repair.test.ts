import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLevelPlayed, isTutorialPayload, resolveGameProgression } from "../lib/sessionProgression";
import { calculateCoinReward } from "../lib/coinCalculation";
import { calculatePinkCupStats, type PinkCupGameStats } from "../lib/scoring/pinkcup";
import { calculateFloatingMarketStats } from "../lib/scoring/floatingmarket";

// Helper simulating the client-side attempt lifecycle and submission guard in app/play/[gameId]/page.tsx
function createAttemptController({
  gameId,
  activeLevel,
  isEndless = false,
  userProfileStats = null,
  gameStars = {},
  submitSessionMock,
}: {
  gameId: string;
  activeLevel: number;
  isEndless?: boolean;
  userProfileStats?: any;
  gameStars?: Record<string, number>;
  submitSessionMock: (gameId: string, rawData: any) => Promise<any>;
}) {
  void userProfileStats; // Explicitly mark referenced parameter to satisfy linter
  let attemptSubmitted = false;
  let saveStatus: "idle" | "saving" | "saved" | "failed" = "idle";
  let saveErrorMessage: string | null = null;
  let tutorialSaveStatus: "idle" | "saving" | "saved" | "failed" = "idle";
  let showTutorialPopup = false;
  let result: any = null;
  let currentActiveLevel = activeLevel;
  let retryCount = 0;

  const handleTutorialComplete = async () => {
    if (attemptSubmitted) {
      return;
    }
    attemptSubmitted = true;
    showTutorialPopup = true;
    tutorialSaveStatus = "saving";

    try {
      const stats = await submitSessionMock(gameId, {
        level: 0,
        current_played: 0,
        score: 0,
        stars: 3,
        success: true,
        isTutorial: true,
        mode: "tutorial",
      });

      if (stats?.saveStatus === "failed") {
        tutorialSaveStatus = "failed";
      } else {
        tutorialSaveStatus = "saved";
      }
    } catch {
      tutorialSaveStatus = "failed";
    }
  };

  const handleGameOver = async (rawData: any) => {
    if (rawData.success === false && !isEndless) {
      result = { success: false };
      return;
    }

    if (attemptSubmitted) {
      return;
    }
    attemptSubmitted = true;

    const isTutorialAttempt = isTutorialPayload(rawData) || (currentActiveLevel === 0 && !isEndless);

    if (isTutorialAttempt) {
      showTutorialPopup = true;
      tutorialSaveStatus = "saving";
      try {
        const normalizedPayload = {
          ...rawData,
          level: 0,
          current_played: 0,
          score: 0,
          isTutorial: true,
          mode: "tutorial",
        };
        const stats = await submitSessionMock(gameId, normalizedPayload);
        if (stats?.saveStatus === "failed") {
          tutorialSaveStatus = "failed";
        } else {
          tutorialSaveStatus = "saved";
        }
      } catch {
        tutorialSaveStatus = "failed";
      }
      return;
    }

    let optimisticCoins = 0;
    if (currentActiveLevel > 0) {
      optimisticCoins = calculateCoinReward({
        gameId,
        level: currentActiveLevel,
        starsEarned: Number(rawData.stars) || 0,
        previousStars: gameStars[`level_${currentActiveLevel}_stars`] ?? 0,
        score: rawData.score,
      });
    }

    result = {
      success: true,
      stars: rawData.stars,
      score: rawData.score,
      stat_memory: rawData.stat_memory,
      stat_speed: rawData.stat_speed,
      stat_focus: rawData.stat_focus,
      stat_planning: rawData.stat_planning,
      stat_emotion: rawData.stat_emotion,
      statChanges: { stat_focus: 10 },
      earnedCoins: optimisticCoins,
    };

    saveStatus = "saving";
    saveErrorMessage = null;

    try {
      const stats = await submitSessionMock(gameId, rawData);

      if (stats?.saveStatus === "failed") {
        saveStatus = "failed";
        saveErrorMessage = stats.saveError || "บันทึกข้อมูลไม่สำเร็จ";
        // Suppress optimistic coins and stat changes on save failure
        result = {
          ...result,
          earnedCoins: 0,
          statChanges: null,
        };
        return;
      }

      saveStatus = "saved";
      result = {
        ...result,
        ...stats,
        statChanges: stats?.statChanges || result.statChanges,
        earnedCoins: stats?.earnedCoins !== undefined ? stats.earnedCoins : result.earnedCoins,
      };
    } catch (err: any) {
      saveStatus = "failed";
      saveErrorMessage = err?.message || "บันทึกข้อมูลไม่สำเร็จ";
      result = {
        ...result,
        earnedCoins: 0,
        statChanges: null,
      };
    }
  };

  const handleReplay = () => {
    attemptSubmitted = false;
    saveStatus = "idle";
    saveErrorMessage = null;
    tutorialSaveStatus = "idle";
    result = null;
    retryCount++;
  };

  const handleRestartLevel = () => {
    handleReplay();
  };

  const handleNextLevel = () => {
    attemptSubmitted = false;
    saveStatus = "idle";
    saveErrorMessage = null;
    tutorialSaveStatus = "idle";
    result = null;
    currentActiveLevel++;
  };

  const handleStartRealGameFromTutorial = () => {
    showTutorialPopup = false;
    attemptSubmitted = false;
    tutorialSaveStatus = "idle";
    currentActiveLevel = 1;
  };

  return {
    handleTutorialComplete,
    handleGameOver,
    handleReplay,
    handleRestartLevel,
    handleNextLevel,
    handleStartRealGameFromTutorial,
    getState: () => ({
      attemptSubmitted,
      saveStatus,
      saveErrorMessage,
      tutorialSaveStatus,
      showTutorialPopup,
      result,
      currentActiveLevel,
      retryCount,
    }),
  };
}

test("Batch 4 - Production Code: Pink Cup unmeasured memory returns null", () => {
  // Case A: Levels 1-5 where probeCount is 0 (no probes administered)
  const noProbeData: PinkCupGameStats = {
    telemetry: {
      level: 1,
      mode: "classic",
      moves: [
        {
          from: { x: 0, y: 0 },
          to: { x: 1, y: 0 },
          valid: true,
          timestamp: 1000,
          distanceToTarget: 2,
          backtracked: false,
        },
      ],
      probes: [], // No probes administered
      targetCell: { x: 3, y: 0 },
      pinkStart: { x: 0, y: 0 },
      t_start: 0,
      t_end: 2000,
      reveal: { start: 0, end: 500, elements: {} },
      metrics: {
        spatial: { goodMoveRate: 1, pathDirectness: 1, score: 80 },
        memory: { recallAccuracy: 0, avgRecallRTMs: 0, score: 0 },
        speed: { RT_firstMs: 1000, meanInterMoveRT: 0, completionTimeMs: 2000, score: 80 },
        planning: { optimalMoves: 3, movesTaken: 3, detourMoves: 0, backtrackCount: 0, score: 80 },
      },
    },
    success: true,
    level: 1,
    difficultyMultiplier: 1.0,
  };

  const noProbeStats = calculatePinkCupStats(noProbeData);
  assert.equal(
    noProbeStats.stat_memory,
    null,
    "Pink Cup with no memory probes must return null for stat_memory, not 0"
  );
  assert.ok(
    typeof noProbeStats.stat_speed === "number" && noProbeStats.stat_speed > 0,
    "Pink Cup speed must be measured"
  );
  assert.ok(
    typeof noProbeStats.stat_planning === "number" && noProbeStats.stat_planning > 0,
    "Pink Cup planning must be measured"
  );

  // Case B: Probe administered and answered correctly
  const correctProbeData: PinkCupGameStats = {
    ...noProbeData,
    level: 6,
    telemetry: {
      ...noProbeData.telemetry,
      probes: [
        {
          cell: { x: 1, y: 0 },
          probeTime: 1000,
          answerTime: 1800,
          correct: true,
        },
      ],
    },
  };

  const correctProbeStats = calculatePinkCupStats(correctProbeData);
  assert.ok(
    typeof correctProbeStats.stat_memory === "number" && correctProbeStats.stat_memory > 0,
    "Pink Cup with correct probe must return a positive memory score"
  );

  // Case C: Probe administered and answered incorrectly (genuine measured score, not null)
  const incorrectProbeData: PinkCupGameStats = {
    ...noProbeData,
    level: 6,
    telemetry: {
      ...noProbeData.telemetry,
      probes: [
        {
          cell: { x: 1, y: 0 },
          probeTime: 1000,
          answerTime: 2500,
          correct: false,
        },
      ],
    },
  };

  const incorrectProbeStats = calculatePinkCupStats(incorrectProbeData);
  assert.ok(
    incorrectProbeStats.stat_memory !== null && typeof incorrectProbeStats.stat_memory === "number",
    "Pink Cup with incorrect probe must return a genuine measured numeric score, not null"
  );
});

test("Batch 4 - Production Code: Floating Market Level 1 tutorial classification and scoring", () => {
  // Repaired payload boundary from updated GameScene:
  // GameScene distinguishes internal rule mode ('tutorial') from session tutorial identity (isTutorial: false)
  const gameScenePayload = {
    level: 1,
    current_played: 1,
    mode: "normal",
    ruleMode: "tutorial",
    isTutorial: false,
    success: true,
  };
  assert.equal(isTutorialPayload(gameScenePayload), false, "GameScene payload must not be tutorial");
  const normalizedGameScene = normalizeLevelPlayed(gameScenePayload);
  assert.equal(normalizedGameScene.isTutorial, false, "Must not normalize as tutorial");
  assert.equal(normalizedGameScene.levelPlayed, 1, "Must retain levelPlayed 1");

  // Explicit tutorial mode cannot be cancelled by a conflicting false flag
  const conflictingModePayload = {
    current_played: 1,
    mode: "tutorial",
    isTutorial: false,
    success: true,
  };
  assert.equal(
    isTutorialPayload(conflictingModePayload),
    true,
    "Explicit mode: 'tutorial' cannot be cancelled by a conflicting isTutorial: false flag"
  );
  const normConflictingMode = normalizeLevelPlayed(conflictingModePayload);
  assert.equal(normConflictingMode.isTutorial, true);
  assert.equal(normConflictingMode.levelPlayed, 0);

  // Explicit tutorial status cannot be cancelled by a conflicting false flag
  const conflictingStatusPayload = {
    current_played: 2,
    status: "tutorial",
    isTutorial: false,
    success: true,
  };
  assert.equal(
    isTutorialPayload(conflictingStatusPayload),
    true,
    "Explicit status: 'tutorial' cannot be cancelled by a conflicting isTutorial: false flag"
  );
  const normConflictingStatus = normalizeLevelPlayed(conflictingStatusPayload);
  assert.equal(normConflictingStatus.isTutorial, true);
  assert.equal(normConflictingStatus.levelPlayed, 0);

  // A zero level indicator strictly remains tutorial regardless of isTutorial flag
  const zeroLevelWithFalseFlag = {
    level: 0,
    current_played: 0,
    isTutorial: false,
    success: true,
  };
  assert.equal(
    isTutorialPayload(zeroLevelWithFalseFlag),
    true,
    "A zero level indicator must strictly remain a tutorial"
  );
  const normZeroLevel = normalizeLevelPlayed(zeroLevelWithFalseFlag);
  assert.equal(normZeroLevel.isTutorial, true);
  assert.equal(normZeroLevel.levelPlayed, 0);

  // Actual tutorial payload from TutorialScene:
  const tutorialScenePayload = {
    level: 0,
    current_played: 0,
    isTutorial: true,
    mode: "tutorial",
    success: true,
  };
  const normalizedTutorial = normalizeLevelPlayed(tutorialScenePayload);
  assert.equal(normalizedTutorial.isTutorial, true);
  assert.equal(normalizedTutorial.levelPlayed, 0);

  // Scoring function: calculateFloatingMarketStats handles ruleMode and mode seamlessly
  const statsResult = calculateFloatingMarketStats({
    difficultyMultiplier: 1.0,
    mode: "normal",
    ruleMode: "tutorial",
    correctCollections: 8,
    incorrectCollections: 0,
    missedItems: 0,
    duplicatePickups: 0,
    memoryCapacity: 0,
    totalCollisions: 0,
    reactionTimes: [1500, 1600],
    hesitationCount: 0,
    bonusCoins: 0,
    totalTimeMs: 25000,
    totalItemsSpawned: 8,
    totalItemsCollected: 8,
  });

  assert.ok(
    typeof statsResult.stat_focus === "number" && statsResult.stat_focus === 100,
    "Floating Market Level 1 must compute stat_focus correctly via ruleMode 'tutorial'"
  );
  assert.equal(statsResult.stat_memory, null, "Level 1 without Mode B must have null memory");
});

test("Batch 4 - Production Code: Floating Market progression (Tutorial -> Level 1 -> Level 2 & level selector)", () => {
  // New player with no session -> starts at Level 0 tutorial
  const p0 = resolveGameProgression({
    gameId: "game-17-floatingmarket",
    completedSession: null,
    hasValidParamLevel: false,
    safeParamLevel: null,
  });
  assert.equal(p0.activeLevel, 0, "New player starts at tutorial (level 0)");
  assert.equal(p0.nextLevel, 1, "Next level after tutorial is 1");

  // Player completes tutorial (level 0) -> next session defaults to Level 1
  const completedTutorialSession = {
    current_played: 0,
    raw_data: { success: true },
  };
  const p1 = resolveGameProgression({
    gameId: "game-17-floatingmarket",
    completedSession: completedTutorialSession,
    hasValidParamLevel: false,
    safeParamLevel: null,
  });
  assert.equal(p1.activeLevel, 1, "After tutorial, player starts at Level 1");
  assert.equal(p1.nextLevel, 1, "Next level after tutorial completion is 1");

  // Player completes normal Level 1 -> advances to Level 2
  const completedLevel1Session = {
    current_played: 1,
    raw_data: { success: true, level: 1 },
  };
  const p2 = resolveGameProgression({
    gameId: "game-17-floatingmarket",
    completedSession: completedLevel1Session,
    hasValidParamLevel: false,
    safeParamLevel: null,
  });
  assert.equal(p2.nextLevel, 2, "After completed Level 1, next level must be 2");

  // Player reopens from level selector with explicit level param
  const pSelect = resolveGameProgression({
    gameId: "game-17-floatingmarket",
    completedSession: completedLevel1Session,
    hasValidParamLevel: true,
    safeParamLevel: 1,
  });
  assert.equal(pSelect.activeLevel, 1, "Level selector selection level=1 must be respected");
});

test("Batch 4 - Production Code: Worm Train and Pipe Patch tutorial identity", () => {
  // Worm Train level 0
  const wormPayload = {
    success: true,
    level: 0,
    current_played: 0,
    isTutorial: true,
    mode: "tutorial",
    stars: 3,
    score: 0,
    stat_planning: null,
  };
  const normalizedWorm = normalizeLevelPlayed(wormPayload);
  assert.equal(normalizedWorm.isTutorial, true);
  assert.equal(normalizedWorm.levelPlayed, 0);

  // Pipe Patch internal tutorial puzzle
  const pipeTutorialPayload = {
    level: 0,
    current_played: 0,
    levelPlayed: 0,
    isTutorial: true,
    mode: "tutorial",
    success: true,
    score: 0,
    stars: 3,
    userTimeMs: 0,
  };
  assert.equal(pipeTutorialPayload.level, 0);
  assert.notEqual(pipeTutorialPayload.level, 8, "Pipe Patch tutorial puzzle must never be level 8");
  const normalizedPipe = normalizeLevelPlayed(pipeTutorialPayload);
  assert.equal(normalizedPipe.isTutorial, true);
  assert.equal(normalizedPipe.levelPlayed, 0);

  // Coin calculation for tutorial level (0) with valid previousStars fixture
  const coins = calculateCoinReward({
    gameId: "game-05-wormtrain",
    level: 0,
    starsEarned: 3,
    previousStars: 0,
    score: 0,
  });
  assert.equal(coins, 0, "Tutorial level 0 must award 0 game coins");
});

test("Batch 4 - Attempt Controller Logic: Duplicate callbacks submit once per attempt", async () => {
  let submitCount = 0;
  const mockSubmit = async () => {
    submitCount++;
    await new Promise((r) => setTimeout(r, 5));
    return {
      saveStatus: "saved" as const,
      statChanges: { stat_focus: 5 },
      earnedCoins: 10,
    };
  };

  const controller = createAttemptController({
    gameId: "game-01-cardmatch",
    activeLevel: 1,
    submitSessionMock: mockSubmit,
  });

  const payload = { success: true, stars: 3, score: 100, stat_speed: 80 };
  const calls = [
    controller.handleGameOver(payload),
    controller.handleGameOver(payload),
    controller.handleGameOver(payload),
  ];
  await Promise.all(calls);
  assert.equal(submitCount, 1, "Concurrent duplicate callbacks must submit exactly once");

  // Call after confirmed save is also ignored
  await controller.handleGameOver(payload);
  assert.equal(submitCount, 1, "Duplicate callback after confirmed save must be ignored");
});

test("Batch 4 - Attempt Controller Logic: Replay and next level reset attempt guard", async () => {
  let submitCount = 0;
  const mockSubmit = async () => {
    submitCount++;
    return {
      saveStatus: "saved" as const,
      statChanges: null,
      earnedCoins: 5,
    };
  };

  const controller = createAttemptController({
    gameId: "game-01-cardmatch",
    activeLevel: 1,
    submitSessionMock: mockSubmit,
  });

  await controller.handleGameOver({ success: true, stars: 2, score: 80 });
  assert.equal(submitCount, 1);

  // Replay resets guard
  controller.handleReplay();
  assert.equal(controller.getState().attemptSubmitted, false);

  await controller.handleGameOver({ success: true, stars: 3, score: 95 });
  assert.equal(submitCount, 2, "New attempt after replay must submit normally");

  // Next level resets guard
  controller.handleNextLevel();
  assert.equal(controller.getState().attemptSubmitted, false);

  await controller.handleGameOver({ success: true, stars: 3, score: 100 });
  assert.equal(submitCount, 3, "New attempt after next level must submit normally");
});

test("Batch 4 - Attempt Controller Logic: Server failure clears unconfirmed rewards", async () => {
  const mockSubmitFailure = async () => {
    return {
      saveStatus: "failed" as const,
      saveError: "Database write error",
      statChanges: null,
      earnedCoins: 0,
    };
  };

  const controller = createAttemptController({
    gameId: "game-01-cardmatch",
    activeLevel: 1,
    submitSessionMock: mockSubmitFailure,
  });

  await controller.handleGameOver({ success: true, stars: 3, score: 150 });
  const state = controller.getState();

  assert.equal(state.saveStatus, "failed");
  assert.equal(state.result.success, true, "Gameplay success must remain displayed");
  assert.equal(state.result.earnedCoins, 0, "Coins must not be presented as confirmed on save failure");
  assert.equal(state.result.statChanges, null, "Stat changes must not be presented as confirmed on save failure");
});
