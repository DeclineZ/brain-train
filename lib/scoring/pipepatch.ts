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

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const weightedAverage = (pairs: Array<{ value: number; weight: number }>): number => {
  const totalWeight = pairs.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight <= 0) return 0;
  return pairs.reduce((sum, p) => sum + p.value * p.weight, 0) / totalWeight;
};

export function calculatePipePatchStats(stats: PipePatchGameStats): ClinicalStats {
  const solved = stats.perLevelMetrics.filter((m) => m.completionStatus === 'solved');
  const attempted = stats.perLevelMetrics;

  // 1) stat_planning
  // planningLevel =
  // 100 * (0.55 * efficiency + 0.35 * benefitRate + 0.10 * (1 - reworkPenalty))
  let planning = 0;
  if (solved.length > 0) {
    const planningPairs = solved.map((m) => {
      const actualActions = Math.max(m.totalDragAttempts + m.undoCount + m.resetCount * 2, 1);
      const efficiency = m.optimalPlacements / actualActions;
      const benefitRate = m.beneficialActionCount / Math.max(m.beneficialActionCount + m.nonBeneficialActionCount, 1);
      const reworkPenalty = Math.min(1, (m.undoCount + m.resetCount * 2) / Math.max(m.optimalPlacements, 1));
      const levelScore = 100 * (0.55 * efficiency + 0.35 * benefitRate + 0.1 * (1 - reworkPenalty));
      return { value: levelScore, weight: Math.max(1, m.difficultyWeight) };
    });
    planning = clamp(weightedAverage(planningPairs));
  }

  // 2) stat_visual
  // visualLevel =
  // 100 * (0.65 * firstTryAccuracy + 0.35 * placementPrecision)
  let visual = 0;
  if (solved.length > 0) {
    const visualPairs = solved.map((m) => {
      const firstTryAccuracy = m.correctPlacementsOnFirstTryCount / Math.max(m.requiredPieceCount, 1);
      const placementPrecision = m.requiredPieceCount / Math.max(m.validPlacementsCount + m.rejectedDropCount, m.requiredPieceCount);
      const levelScore = 100 * (0.65 * firstTryAccuracy + 0.35 * placementPrecision);
      const weight = Math.max(1, m.difficultyWeight + m.decoyPieceCount * 0.25);
      return { value: levelScore, weight };
    });
    visual = clamp(weightedAverage(visualPairs));
  }

  // 3) stat_focus (all attempted)
  // focusPenalty = 45*rejectRate + 25*repeatRate + 20*driftRate + 5*hintRate + 10*timeoutRate
  const attempts = Math.max(attempted.reduce((sum, m) => sum + m.totalDragAttempts, 0), 1);
  const rejectRate = attempted.reduce((sum, m) => sum + m.rejectedDropCount, 0) / attempts;
  const repeatRate = attempted.reduce((sum, m) => sum + m.repeatedErrorCount, 0) / attempts;
  const driftRate = attempted.reduce((sum, m) => sum + m.nonBeneficialActionCount, 0) / attempts;
  const hintRate = attempted.reduce((sum, m) => sum + m.hintUsedCount, 0) / Math.max(stats.levelsAttempted, 1);
  const timeoutRate = attempted.filter((m) => m.completionStatus === 'timeout_skip').length / Math.max(stats.levelsAttempted, 1);
  const focusPenalty = 45 * rejectRate + 25 * repeatRate + 20 * driftRate + 5 * hintRate + 10 * timeoutRate;
  const focus = clamp(100 - focusPenalty * 100);

  // 4) stat_speed
  // speedLevel = 100 * (0.85 * timeNorm + 0.15 * latencyNorm)
  let speed = 0;
  if (solved.length > 0) {
    const speedPairs = solved.map((m) => {
      const timeNorm = clamp((m.hardTimeMs - m.solveTimeMs) / Math.max(m.hardTimeMs - m.parTimeMs, 1), 0, 1);
      const latencyNorm = clamp(1 - m.firstActionLatencyMs / 3000, 0, 1);
      const levelScore = 100 * (0.85 * timeNorm + 0.15 * latencyNorm);
      return { value: levelScore, weight: Math.max(1, m.difficultyWeight) };
    });
    const baseSpeed = weightedAverage(speedPairs);
    const completionFactor = clamp(stats.levelsSolved / Math.max(stats.levelsAttempted, 1), 0, 1);
    speed = clamp(baseSpeed * (0.8 + 0.2 * completionFactor));
  }

  return {
    stat_memory: null,
    stat_emotion: null,
    stat_planning: planning,
    stat_visual: visual,
    stat_focus: focus,
    stat_speed: speed,
  };
}

export function calculatePipePatchOverallScore(clinicalStats: ClinicalStats): number | null {
  const weightedPairs: Array<{ value: number; weight: number }> = [];
  if (clinicalStats.stat_planning !== null) weightedPairs.push({ value: clinicalStats.stat_planning, weight: 0.3 });
  if (clinicalStats.stat_visual !== null) weightedPairs.push({ value: clinicalStats.stat_visual, weight: 0.3 });
  if (clinicalStats.stat_focus !== null) weightedPairs.push({ value: clinicalStats.stat_focus, weight: 0.2 });
  if (clinicalStats.stat_speed !== null) weightedPairs.push({ value: clinicalStats.stat_speed, weight: 0.2 });
  if (weightedPairs.length === 0) return null;
  return clamp(weightedAverage(weightedPairs));
}
