import type { FloatingBallMathGameStats } from '@/types';
import type { PinkCupGameStats } from '@/lib/scoring/pinkcup';
import type { TubeSortRawStats } from '@/lib/scoring/tubeSort';
import type { MinerGameStats } from '@/lib/scoring/miner';
import type { ParkingJamLevelAttemptStats } from '@/games/game-21-parking-jam/types';
import {
  calculateUnifiedLevelScore,
  clamp01,
  mapDifficultyFromScale,
  mapLevelToDifficultyMultiplier,
} from '@/lib/scoring/engine/unifiedLevelScore';

const safeRate = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

export function calculateFloatingBallMathLevelScore(
  stats: FloatingBallMathGameStats,
  success: boolean,
): number {
  const requiredEquations = Math.max(
    1,
    Math.max(stats.totalEquations, stats.correctEquations + stats.wrongEquations),
  );
  const accuracy = clamp01(safeRate(stats.correctEquations, requiredEquations));

  const timeLimitMs =
    stats.timeLimitSeconds && stats.timeLimitSeconds > 0
      ? stats.timeLimitSeconds * 1000
      : stats.totalTimeMs;
  const overTimeMs = Math.max(0, stats.totalTimeMs - Math.max(1, timeLimitMs));
  const timeCore = clamp01(
    Math.max(1, timeLimitMs) /
      Math.max(1, Math.max(1, timeLimitMs) + overTimeMs),
  );

  const safetyCore = clamp01(1 - safeRate(stats.bombHits, requiredEquations));
  const rawCore = 0.45 * accuracy + 0.3 * timeCore + 0.25 * safetyCore;

  return calculateUnifiedLevelScore({
    rawCore,
    level: stats.levelPlayed,
    maxLevel: 50,
    difficultyMultiplier: stats.difficultyMultiplier,
    success,
  });
}

export function calculatePinkCupLevelScore(
  data: PinkCupGameStats,
  parTimeMs?: number,
): number {
  const { telemetry, success, level, difficultyMultiplier } = data;

  const totalProbes = telemetry.probes.length;
  const correctProbes = telemetry.probes.filter((probe) => probe.correct).length;
  const memoryAccuracy = totalProbes > 0 ? safeRate(correctProbes, totalProbes) : 1;

  const optimalMoves =
    Math.abs(telemetry.pinkStart.x - telemetry.targetCell.x) +
    Math.abs(telemetry.pinkStart.y - telemetry.targetCell.y);
  const detourMoves = Math.max(0, telemetry.moves.length - optimalMoves);
  const planningEfficiency = clamp01(
    safeRate(optimalMoves, optimalMoves + detourMoves),
  );

  const completionTimeMs = Math.max(0, telemetry.t_end - telemetry.t_start);
  const targetTimeMs = Math.max(1, parTimeMs ?? (completionTimeMs || 1));
  const overTimeMs = Math.max(0, completionTimeMs - targetTimeMs);
  const timeCore = clamp01(targetTimeMs / Math.max(targetTimeMs + overTimeMs, 1));

  const rawCore = 0.4 * memoryAccuracy + 0.35 * planningEfficiency + 0.25 * timeCore;

  return calculateUnifiedLevelScore({
    rawCore,
    level,
    maxLevel: 30,
    difficultyMultiplier,
    success,
  });
}

export function calculateTubeSortLevelScore(
  stats: TubeSortRawStats,
  success: boolean,
): number {
  const extraMoves = Math.max(0, stats.playerMoves - stats.optimalMoves);
  const moveEfficiency = clamp01(
    safeRate(stats.optimalMoves, stats.optimalMoves + extraMoves),
  );

  const overTimeMs = Math.max(0, stats.completionTimeMs - stats.targetTimeMs);
  const speedCore = clamp01(
    stats.targetTimeMs / Math.max(stats.targetTimeMs + overTimeMs, 1),
  );

  const accuracyCore = clamp01(
    safeRate(stats.correctPours, stats.correctPours + stats.incorrectPours),
  );

  const rawCore = 0.4 * moveEfficiency + 0.35 * speedCore + 0.25 * accuracyCore;

  return calculateUnifiedLevelScore({
    rawCore,
    level: stats.levelPlayed,
    maxLevel: 30,
    difficultyMultiplier: stats.difficultyMultiplier,
    success,
  });
}

export function calculateMinerLevelScore(
  stats: MinerGameStats,
  success: boolean,
): number {
  const goalProgress = clamp01(safeRate(stats.total_value, Math.max(1, stats.goal_amount)));
  const valuablePrecision = clamp01(
    safeRate(stats.valuable_grabs, Math.max(1, stats.success_grabs)),
  );

  const overDecisionMs = Math.max(
    0,
    stats.avg_decision_time_ms - stats.target_decision_time_ms,
  );
  const speedCore = clamp01(
    stats.target_decision_time_ms /
      Math.max(stats.target_decision_time_ms + overDecisionMs, 1),
  );

  const mistakeControl = clamp01(1 - safeRate(stats.mistakes, Math.max(1, stats.attempts)));
  const rawCore =
    0.4 * goalProgress +
    0.3 * valuablePrecision +
    0.2 * speedCore +
    0.1 * mistakeControl;

  return calculateUnifiedLevelScore({
    rawCore,
    level: stats.levelPlayed,
    maxLevel: 30,
    difficultyMultiplier: mapLevelToDifficultyMultiplier(stats.levelPlayed, 30),
    success,
  });
}

export interface PipePatchBreakdownForScore {
  mindChangeScore: number;
  accuracyScore: number;
  precisionScore: number;
  speedScore: number;
}

export function calculatePipePatchLevelScore(input: {
  level: number;
  difficultyWeight: number;
  success: boolean;
  breakdown: PipePatchBreakdownForScore;
}): number {
  const rawCore =
    0.3 * clamp01(input.breakdown.mindChangeScore / 100) +
    0.35 * clamp01(input.breakdown.accuracyScore / 100) +
    0.15 * clamp01(input.breakdown.precisionScore / 100) +
    0.2 * clamp01(input.breakdown.speedScore / 100);

  return calculateUnifiedLevelScore({
    rawCore,
    level: input.level,
    maxLevel: 30,
    difficultyMultiplier: mapDifficultyFromScale(input.difficultyWeight, 1, 10),
    success: input.success,
  });
}

export function calculateParkingJamLevelScore(input: {
  attempt: ParkingJamLevelAttemptStats;
  solved: boolean;
}): number {
  const { attempt } = input;

  const overMoves = Math.max(0, attempt.moveCount - Math.max(1, attempt.parMoves));
  const moveCore = clamp01(
    Math.max(1, attempt.parMoves) /
      Math.max(1, Math.max(1, attempt.parMoves) + overMoves),
  );

  const effectiveTime = Math.max(1, attempt.levelTimeMs - attempt.idleTimeMs);
  const overTimeMs = Math.max(0, effectiveTime - Math.max(1, attempt.parTimeMs));
  const timeCore = clamp01(
    Math.max(1, attempt.parTimeMs) /
      Math.max(1, Math.max(1, attempt.parTimeMs) + overTimeMs),
  );

  const errorActions =
    attempt.invalidMoveCount +
    attempt.blockedExitAttemptCount +
    attempt.repeatedErrorCount;
  const controlCore = clamp01(1 - safeRate(errorActions, attempt.moveCount + errorActions));
  const stabilityCore = clamp01(
    1 -
      safeRate(
        attempt.undoCount + attempt.restartCount,
        attempt.undoCount + attempt.restartCount + Math.max(1, attempt.parMoves),
      ),
  );

  const rawCore =
    0.35 * moveCore +
    0.3 * timeCore +
    0.2 * controlCore +
    0.15 * stabilityCore;

  return calculateUnifiedLevelScore({
    rawCore,
    level: attempt.levelId,
    maxLevel: 24,
    difficultyMultiplier: mapDifficultyFromScale(attempt.difficulty, 1, 10),
    success: input.solved,
  });
}
