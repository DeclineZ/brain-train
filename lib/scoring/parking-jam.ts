import type { ClinicalStats } from '@/types';
import type { ParkingJamGameStats } from '@/games/game-21-parking-jam/types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const weightedAverage = (items: Array<{ value: number; weight: number }>) => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return 0;
  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
};

export function calculateParkingJamStats(stats: ParkingJamGameStats): ClinicalStats {
  if (!stats.levelAttempts || stats.levelAttempts.length === 0) {
    return {
      stat_memory: null,
      stat_emotion: null,
      stat_planning: 0,
      stat_speed: 0,
      stat_focus: 0,
      stat_visual: 0,
    };
  }

  const planningSamples = stats.levelAttempts.map((attempt) => {
    if (!attempt.solved) {
      return {
        value: 0,
        weight: 0.7 + 0.3 * (attempt.difficulty / 10),
      };
    }

    const over = Math.max(0, attempt.moveCount - Math.max(1, attempt.parMoves));
    const overRatio = over / Math.max(1, attempt.parMoves);
    const undoPenalty = Math.min(1, attempt.undoCount / 6);
    const restartPenalty = Math.min(1, attempt.restartCount / 2);

    const efficiencyScore = 100 * (1 - Math.min(1, overRatio / 1.5));
    const backtrackPenalty = 20 * undoPenalty + 20 * restartPenalty;

    return {
      value: clamp(efficiencyScore - backtrackPenalty),
      weight: 0.7 + 0.3 * (attempt.difficulty / 10),
    };
  });

  const speedSamples = stats.levelAttempts.map((attempt) => {
    const effectiveTime = Math.max(1, attempt.levelTimeMs - attempt.idleTimeMs);

    if (!attempt.solved) {
      return {
        value: 0,
        weight: 0.7 + 0.3 * (attempt.difficulty / 10),
      };
    }

    const ratio = effectiveTime / Math.max(1, attempt.parTimeMs);
    const levelSpeed = 100 * (1 - Math.min(1, (ratio - 0.6) / 1.4));

    return {
      value: clamp(levelSpeed),
      weight: 0.7 + 0.3 * (attempt.difficulty / 10),
    };
  });

  const focusSamples = stats.levelAttempts.map((attempt) => {
    const totalActions = Math.max(1, attempt.moveCount + attempt.invalidMoveCount + attempt.blockedExitAttemptCount);
    const errorRate = (
      attempt.invalidMoveCount +
      attempt.blockedExitAttemptCount +
      attempt.repeatedErrorCount
    ) / totalActions;

    const hintPenalty = Math.min(1, attempt.hintUsedCount / 3);
    const base = 100 * (1 - Math.min(1, errorRate / 0.45));
    const levelFocus = clamp(base - 15 * hintPenalty);

    return {
      value: levelFocus,
      weight: totalActions < 5 ? Math.min(1, totalActions / 10) : 1,
    };
  });

  const visualSamples = stats.levelAttempts.map((attempt) => {
    if (!attempt.solved) {
      return {
        value: 0,
        weight: 0.7 + 0.3 * (attempt.difficulty / 10),
      };
    }

    const movedCars = Object.entries(attempt.carMoveHistogram)
      .filter(([, count]) => count > 0)
      .map(([carId]) => carId);

    const relevantSet = new Set(attempt.relevantCarSet);
    const relevantMoved = movedCars.filter((carId) => relevantSet.has(carId)).length;
    const precision = relevantMoved / Math.max(1, movedCars.length);
    const hintPenalty = 10 * Math.min(1, attempt.hintUsedCount / 2);

    return {
      value: clamp(100 * precision - hintPenalty),
      weight: 0.7 + 0.3 * (attempt.difficulty / 10),
    };
  });

  return {
    stat_memory: null,
    stat_emotion: null,
    stat_planning: clamp(weightedAverage(planningSamples)),
    stat_speed: clamp(weightedAverage(speedSamples)),
    stat_focus: clamp(weightedAverage(focusSamples)),
    stat_visual: clamp(weightedAverage(visualSamples)),
  };
}

export function calculateParkingJamOverallScore(clinicalStats: ClinicalStats): number | null {
  const weighted: Array<{ value: number; weight: number }> = [];

  if (clinicalStats.stat_planning !== null) weighted.push({ value: clinicalStats.stat_planning, weight: 0.4 });
  if (clinicalStats.stat_speed !== null) weighted.push({ value: clinicalStats.stat_speed, weight: 0.3 });
  if (clinicalStats.stat_focus !== null) weighted.push({ value: clinicalStats.stat_focus, weight: 0.2 });
  if (clinicalStats.stat_visual !== null) weighted.push({ value: clinicalStats.stat_visual, weight: 0.1 });

  if (weighted.length === 0) return null;
  return clamp(weightedAverage(weighted));
}
