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

const DIFFICULTY_MIN = 0.8;
const DIFFICULTY_SPAN = 1.9;
const DIFFICULTY_MAX_BONUS = 0.12;

const applySoftBonus = (core: number, bonus: number) => core + (1 - core) * bonus;
const toPercent = (core: number) => Math.round(100 * core);

const difficultyBonus = (difficultyMultiplier: number) =>
  DIFFICULTY_MAX_BONUS * ((difficultyMultiplier - DIFFICULTY_MIN) / DIFFICULTY_SPAN);

export function calculateTubeSortStats(stats: TubeSortRawStats) {
  const bonus = difficultyBonus(stats.difficultyMultiplier);

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
    stat_planning: toPercent(applySoftBonus(planningCore, bonus)),
    stat_visual: toPercent(applySoftBonus(visualCore, bonus)),
    stat_focus: toPercent(applySoftBonus(focusCore, bonus)),
    stat_speed: toPercent(applySoftBonus(speedCore, bonus)),
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
