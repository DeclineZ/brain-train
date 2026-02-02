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

export function calculateTubeSortStats(stats: TubeSortRawStats) {
  const planningRaw = (stats.optimalMoves / Math.max(stats.playerMoves, 1)) * 100;
  const spatialRaw = (stats.correctPours / Math.max(stats.correctPours + stats.incorrectPours, 1)) * 100;

  const errors = stats.illegalPourAttempts + stats.redundantMoves;
  const attentionRaw = (1 - errors / Math.max(stats.totalActions, 1)) * 100;

  const safeTime = Math.max(stats.completionTimeMs, 1000);
  const speedRaw = (stats.targetTimeMs / safeTime) * 100;

  return {
    stat_planning: Math.min(Math.round(planningRaw), 100),
    stat_visual: Math.min(Math.round(spatialRaw), 100),
    stat_focus: Math.min(Math.round(attentionRaw), 100),
    stat_speed: Math.min(Math.round(speedRaw), 100),
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

  const efficiencyScore = Math.min(100, efficiencyRaw * 1.25);
  const speedScore = Math.min(100, speedRaw * 1.2);
  const accuracyScore = Math.min(100, accuracyRaw * 1.15);

  const weightedScore =
    efficiencyScore * 0.4 +
    speedScore * 0.35 +
    accuracyScore * 0.25;

  if (weightedScore >= 75) return 3;
  if (weightedScore >= 55) return 2;
  if (weightedScore >= 35) return 1;
  return 0;
}