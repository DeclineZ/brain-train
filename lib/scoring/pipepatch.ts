import type { ClinicalStats } from '@/types';

export interface PipePatchPerLevelMetrics {
  levelId: number;
  difficultyWeight: number;
  parTimeMs: number;
  hardTimeMs: number;
  requiredPieceCount: number;
  decoyPieceCount: number;
  optimalPlacements: number;
  solveTimeMs: number;
  activeTimeMs: number;
  firstActionLatencyMs: number;
  totalDragAttempts: number;
  validPlacementsCount: number;
  correctPlacementsOnFirstTryCount: number;
  incorrectPlacementCount: number;
  rejectedDropCount: number;
  repeatedErrorCount: number;
  beneficialActionCount: number;
  nonBeneficialActionCount: number;
  undoCount: number;
  resetCount: number;
  hintUsedCount: number;
  obstacleRejectCount: number;
  lockedSlotMismatchCount: number;
  completionStatus: 'solved' | 'timeout_skip';
}

export interface PipePatchGameStats {
  sessionDurationMs: number;
  levelsAttempted: number;
  levelsSolved: number;
  levelTimeoutSkips: number;
  perLevelMetrics: PipePatchPerLevelMetrics[];
}

const DIFFICULTY_MIN = 1;
const DIFFICULTY_SPAN = 6.4;
const DIFFICULTY_MAX_BONUS = 0.12;

const weightedAverage = (pairs: Array<{ value: number; weight: number }>): number => {
  const totalWeight = pairs.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight <= 0) return 0;
  return pairs.reduce((sum, p) => sum + p.value * p.weight, 0) / totalWeight;
};

const safeRate = (numerator: number, denominator: number) => (denominator > 0 ? numerator / denominator : 0);

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const toPercent = (core: number) => clamp(Math.round(100 * core));

const getDifficultyMultiplier = (attempted: PipePatchPerLevelMetrics[]) => {
  if (attempted.length === 0) return 1;
  const averageDifficulty = attempted.reduce((sum, m) => sum + m.difficultyWeight, 0) / attempted.length;
  return 1 + DIFFICULTY_MAX_BONUS * ((averageDifficulty - DIFFICULTY_MIN) / DIFFICULTY_SPAN);
};

export function calculatePipePatchStats(stats: PipePatchGameStats): ClinicalStats {
  const attempted = stats.perLevelMetrics;
  const solved = attempted.filter((m) => m.completionStatus === 'solved');
  const difficultyMultiplier = getDifficultyMultiplier(attempted);

  let planningCore = 0;
  if (solved.length > 0) {
    const planningPairs = solved.map((m) => {
      const actualActions = Math.max(m.totalDragAttempts + m.undoCount + m.resetCount * 1.5, 1);
      const wastedActions = Math.max(actualActions - m.optimalPlacements, 0);
      const efficiency = safeRate(m.optimalPlacements, m.optimalPlacements + wastedActions);
      const benefitRate = m.beneficialActionCount / Math.max(m.beneficialActionCount + m.nonBeneficialActionCount, 1);
      const reworkLoad = m.undoCount + m.resetCount * 1.5;
      const reworkRate = safeRate(reworkLoad, reworkLoad + m.optimalPlacements);
      const levelCore = 0.5 * efficiency + 0.35 * benefitRate + 0.15 * (1 - reworkRate);
      return { value: levelCore, weight: Math.max(1, m.difficultyWeight) };
    });
    planningCore = weightedAverage(planningPairs);
  }

  let visualCore = 0;
  if (solved.length > 0) {
    const visualPairs = solved.map((m) => {
      const required = Math.max(m.requiredPieceCount, 1);
      const firstTryAccuracy = m.correctPlacementsOnFirstTryCount / required;
      const placementErrors = m.rejectedDropCount + m.incorrectPlacementCount + m.lockedSlotMismatchCount + m.obstacleRejectCount;
      const placementPrecision = required / (required + 0.8 * placementErrors);
      const levelCore = 0.6 * firstTryAccuracy + 0.4 * placementPrecision;
      const weight = Math.max(1, m.difficultyWeight + m.decoyPieceCount * 0.25);
      return { value: levelCore, weight };
    });
    visualCore = weightedAverage(visualPairs);
  }

  const sessionActions = Math.max(attempted.reduce((sum, m) => sum + m.totalDragAttempts + m.undoCount + m.resetCount * 2, 0), 1);
  const rejectRate = attempted.reduce((sum, m) => sum + m.rejectedDropCount, 0) / sessionActions;
  const repeatRate = attempted.reduce((sum, m) => sum + m.repeatedErrorCount, 0) / sessionActions;
  const beneficialTotal = attempted.reduce((sum, m) => sum + m.beneficialActionCount, 0);
  const nonBeneficialTotal = attempted.reduce((sum, m) => sum + m.nonBeneficialActionCount, 0);
  const driftRate = safeRate(nonBeneficialTotal, beneficialTotal + nonBeneficialTotal);
  const hintsTotal = attempted.reduce((sum, m) => sum + m.hintUsedCount, 0);
  const hintRate = safeRate(hintsTotal, hintsTotal + Math.max(stats.levelsAttempted, 1));
  const timeoutRate = attempted.filter((m) => m.completionStatus === 'timeout_skip').length / Math.max(stats.levelsAttempted, 1);
  const focusPenalty = 0.25 * rejectRate + 0.15 * repeatRate + 0.15 * driftRate + 0.08 * hintRate + 0.12 * timeoutRate;
  const focusCore = Math.max(0, 1 - focusPenalty);

  let baseSpeedCore = 0;
  if (solved.length > 0) {
    const speedPairs = solved.map((m) => {
      const overTime = Math.max(0, m.solveTimeMs - m.parTimeMs);
      const timeCore = m.parTimeMs / Math.max(m.parTimeMs + overTime, 1);
      const overLatency = Math.max(0, m.firstActionLatencyMs - 4000);
      const latencyCore = 4000 / (4000 + overLatency);
      const levelCore = 0.9 * timeCore + 0.1 * latencyCore;
      return { value: levelCore, weight: Math.max(1, m.difficultyWeight) };
    });
    baseSpeedCore = weightedAverage(speedPairs);
  }
  const completionRate = stats.levelsSolved / Math.max(stats.levelsAttempted, 1);
  const speedCore = 0.9 * baseSpeedCore + 0.1 * completionRate;

  return {
    stat_memory: null,
    stat_emotion: null,
    stat_planning: toPercent(planningCore * difficultyMultiplier),
    stat_visual: toPercent(visualCore * difficultyMultiplier),
    stat_focus: toPercent(focusCore * difficultyMultiplier),
    stat_speed: toPercent(speedCore * difficultyMultiplier),
  };
}

export function calculatePipePatchOverallScore(clinicalStats: ClinicalStats): number | null {
  const weightedPairs: Array<{ value: number; weight: number }> = [];
  if (clinicalStats.stat_planning !== null) weightedPairs.push({ value: clinicalStats.stat_planning, weight: 0.3 });
  if (clinicalStats.stat_visual !== null) weightedPairs.push({ value: clinicalStats.stat_visual, weight: 0.3 });
  if (clinicalStats.stat_focus !== null) weightedPairs.push({ value: clinicalStats.stat_focus, weight: 0.2 });
  if (clinicalStats.stat_speed !== null) weightedPairs.push({ value: clinicalStats.stat_speed, weight: 0.2 });
  if (weightedPairs.length === 0) return null;
  return weightedAverage(weightedPairs);
}
