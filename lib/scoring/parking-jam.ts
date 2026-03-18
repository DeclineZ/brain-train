import type { ClinicalStats } from '@/types';
import type { ParkingJamGameStats } from '@/games/game-21-parking-jam/types';

const DIFFICULTY_MIN = 1;
const DIFFICULTY_SPAN = 9;
const DIFFICULTY_MAX_BONUS = 0.12;
const UNSOLVED_FACTOR = 0.35;

const weightedAverage = (items: Array<{ value: number; weight: number }>) => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return 0;
  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
};

const safeRate = (numerator: number, denominator: number) => (denominator > 0 ? numerator / denominator : 0);

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const toPercent = (core: number) => clamp(Math.round(100 * core));

const getAttemptMultiplier = (difficulty: number) =>
  1 + DIFFICULTY_MAX_BONUS * ((difficulty - DIFFICULTY_MIN) / DIFFICULTY_SPAN);

const getAttemptWeight = (difficulty: number) => 0.7 + 0.3 * (difficulty / 10);

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
    const parMoves = Math.max(1, attempt.parMoves);
    const overMoves = Math.max(0, attempt.moveCount - parMoves);
    const moveEfficiencyCore = parMoves / (parMoves + overMoves);
    const undoRate = safeRate(attempt.undoCount, attempt.undoCount + parMoves);
    const restartRate = safeRate(attempt.restartCount, attempt.restartCount + 1);
    const backtrackPenalty = 0.6 * undoRate + 0.4 * restartRate;
    const core = 0.75 * moveEfficiencyCore + 0.25 * (1 - backtrackPenalty);
    const scaled = core * getAttemptMultiplier(attempt.difficulty);
    const solvedContribution = attempt.solved ? scaled : scaled * UNSOLVED_FACTOR;

    return {
      value: solvedContribution,
      weight: getAttemptWeight(attempt.difficulty),
    };
  });

  const speedSamples = stats.levelAttempts.map((attempt) => {
    const effectiveTime = Math.max(1, attempt.levelTimeMs - attempt.idleTimeMs);
    const parTime = Math.max(1, attempt.parTimeMs);
    const overTime = Math.max(0, effectiveTime - parTime);
    const timeCore = parTime / (parTime + overTime);
    const overLatency = Math.max(0, attempt.firstActionLatencyMs - 2500);
    const latencyCore = 2500 / (2500 + overLatency);
    const core = 0.8 * timeCore + 0.2 * latencyCore;
    const scaled = core * getAttemptMultiplier(attempt.difficulty);
    const solvedContribution = attempt.solved ? scaled : scaled * UNSOLVED_FACTOR;

    return {
      value: solvedContribution,
      weight: getAttemptWeight(attempt.difficulty),
    };
  });

  const focusSamples = stats.levelAttempts.map((attempt) => {
    const errorActions = attempt.invalidMoveCount + attempt.blockedExitAttemptCount + attempt.repeatedErrorCount;
    const goodActions = Math.max(attempt.moveCount, 0);
    const actionQuality = goodActions / Math.max(goodActions + errorActions, 1);
    const hintRate = safeRate(attempt.hintUsedCount, attempt.hintUsedCount + 2);
    const core = 0.85 * actionQuality + 0.15 * (1 - hintRate);
    const scaled = core * getAttemptMultiplier(attempt.difficulty);
    const solvedContribution = attempt.solved ? scaled : scaled * UNSOLVED_FACTOR;

    return {
      value: solvedContribution,
      weight: getAttemptWeight(attempt.difficulty),
    };
  });

  const visualSamples = stats.levelAttempts.map((attempt) => {
    const movedCars = Object.entries(attempt.carMoveHistogram)
      .filter(([, count]) => count > 0)
      .map(([carId]) => carId);

    const relevantSet = new Set(attempt.relevantCarSet);
    const relevantMoved = movedCars.filter((carId) => relevantSet.has(carId)).length;
    const precision = relevantMoved / Math.max(1, movedCars.length);
    const coverage = relevantMoved / Math.max(1, relevantSet.size);
    const hintRate = safeRate(attempt.hintUsedCount, attempt.hintUsedCount + 2);
    const core = (0.65 * precision + 0.35 * coverage) * (1 - 0.2 * hintRate);
    const scaled = core * getAttemptMultiplier(attempt.difficulty);
    const solvedContribution = attempt.solved ? scaled : scaled * UNSOLVED_FACTOR;

    return {
      value: solvedContribution,
      weight: getAttemptWeight(attempt.difficulty),
    };
  });

  return {
    stat_memory: null,
    stat_emotion: null,
    stat_planning: toPercent(weightedAverage(planningSamples)),
    stat_speed: toPercent(weightedAverage(speedSamples)),
    stat_focus: toPercent(weightedAverage(focusSamples)),
    stat_visual: toPercent(weightedAverage(visualSamples)),
  };
}

export function calculateParkingJamOverallScore(clinicalStats: ClinicalStats): number | null {
  const weighted: Array<{ value: number; weight: number }> = [];

  if (clinicalStats.stat_planning !== null) weighted.push({ value: clinicalStats.stat_planning, weight: 0.4 });
  if (clinicalStats.stat_speed !== null) weighted.push({ value: clinicalStats.stat_speed, weight: 0.3 });
  if (clinicalStats.stat_focus !== null) weighted.push({ value: clinicalStats.stat_focus, weight: 0.2 });
  if (clinicalStats.stat_visual !== null) weighted.push({ value: clinicalStats.stat_visual, weight: 0.1 });

  if (weighted.length === 0) return null;
  return weightedAverage(weighted);
}
