export type TubeSortRawStats = {
  levelPlayed: number;
  difficultyMultiplier: number;
  optimalMoves: number;
  playerMoves: number;
  correctPours: number;
  incorrectPours: number;
  illegalPourAttempts: number;
  redundantMoves: number;
  totalActions: number;
  completionTimeMs: number;
  targetTimeMs: number;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const toPercentScaled = (core: number, difficultyMultiplier: number) =>
  clamp(Math.round(100 * core * difficultyMultiplier));

export function calculateTubeSortStats(stats: TubeSortRawStats) {
  const extraMoves = Math.max(0, stats.playerMoves - stats.optimalMoves);
  const moveEfficiency = stats.optimalMoves / Math.max(stats.optimalMoves + extraMoves, 1);
  const errorActions = stats.illegalPourAttempts + stats.redundantMoves;
  const totalActions = Math.max(stats.totalActions, errorActions);
  const errorRate = errorActions / Math.max(totalActions, 1);
  const planningCore = 0.7 * moveEfficiency + 0.3 * (1 - errorRate);

  const visualCore = stats.correctPours / Math.max(stats.correctPours + stats.incorrectPours, 1);
  const goodActions = Math.max(totalActions - errorActions, 0);
  const focusCore = goodActions / Math.max(goodActions + errorActions, 1);

  const overTimeMs = Math.max(0, stats.completionTimeMs - stats.targetTimeMs);
  const speedCore = stats.targetTimeMs / Math.max(stats.targetTimeMs + overTimeMs, 1);

  return {
    stat_planning: toPercentScaled(planningCore, stats.difficultyMultiplier),
    stat_visual: toPercentScaled(visualCore, stats.difficultyMultiplier),
    stat_focus: toPercentScaled(focusCore, stats.difficultyMultiplier),
    stat_speed: toPercentScaled(speedCore, stats.difficultyMultiplier),
    stat_memory: null,
    stat_emotion: null
  };
}

export function calculateTubeSortStars(stats: TubeSortRawStats) {
  const safeMoves = Math.max(stats.playerMoves, 1);
  const safeActions = Math.max(stats.totalActions, 1);
  const safeTime = Math.max(stats.completionTimeMs, 1000);

  const efficiencyRaw = (stats.optimalMoves / safeMoves) * 100;
  const speedRaw = (stats.targetTimeMs / safeTime) * 100;
  const accuracyRaw = (stats.correctPours / safeActions) * 100;

  const efficiencyScore = Math.min(100, efficiencyRaw);
  const speedScore = Math.min(100, speedRaw);
  const accuracyScore = Math.min(100, accuracyRaw);

  const weightedScore =
    efficiencyScore * 0.4 +
    speedScore * 0.35 +
    accuracyScore * 0.25;

  if (weightedScore >= 85) return 3;
  if (weightedScore >= 65) return 2;
  if (weightedScore >= 45) return 1;
  return 0;
}
