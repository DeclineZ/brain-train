import type { FloatingBallMathGameStats, ClinicalStats } from '@/types';

const DIFFICULTY_MIN = 0.8;
const DIFFICULTY_SPAN = 1.9;
const DIFFICULTY_MAX_BONUS = 0.12;

const applySoftBonus = (core: number, bonus: number) => core + (1 - core) * bonus;

const toPercent = (core: number) => Math.round(100 * core);

const safeRate = (numerator: number, denominator: number) => (denominator > 0 ? numerator / denominator : 0);

const getDifficultyBonus = (difficultyMultiplier: number) =>
  DIFFICULTY_MAX_BONUS * ((difficultyMultiplier - DIFFICULTY_MIN) / DIFFICULTY_SPAN);

export function calculateFloatingBallMathStats(
  stats: FloatingBallMathGameStats
): ClinicalStats {
  const {
    difficultyMultiplier,
    penaltyFactor,
    thiefEvents,
    decisionFailCount,
    onTimeDecisionCount,
    lateDecisionCount,
    panicBlock,
    panicAdapt,
    bombHits,
    consecutiveErrors
  } = stats;

  const difficultyBonus = getDifficultyBonus(difficultyMultiplier);

  const focusCore = calculateFocusCore(
    thiefEvents,
    decisionFailCount,
    lateDecisionCount,
    consecutiveErrors,
  );

  const speedCore = calculateSpeedCore(
    thiefEvents,
    onTimeDecisionCount,
    lateDecisionCount,
    stats.timeLimitSeconds,
    stats.totalTimeMs
  );

  const emotionCore = calculateEmotionCore(
    thiefEvents,
    panicBlock,
    panicAdapt,
    bombHits,
    decisionFailCount,
  );

  const focusBoosted = applySoftBonus(focusCore * penaltyFactor, difficultyBonus);
  const speedBoosted = applySoftBonus(speedCore * penaltyFactor, difficultyBonus);
  const emotionBoosted = applySoftBonus(emotionCore * penaltyFactor, difficultyBonus);

  return {
    stat_memory: null,
    stat_speed: toPercent(speedBoosted),
    stat_visual: null,
    stat_focus: toPercent(focusBoosted),
    stat_planning: null,
    stat_emotion: toPercent(emotionBoosted),
  };
}

function calculateFocusCore(
  thiefEvents: number,
  decisionFailCount: number,
  lateDecisionCount: number,
  consecutiveErrors: number,
): number {
  if (thiefEvents <= 0) return 1;

  const failRate = safeRate(decisionFailCount, thiefEvents);
  const lateRate = safeRate(lateDecisionCount, thiefEvents);
  const streakRate = safeRate(consecutiveErrors, thiefEvents);
  return 1 - (0.5 * failRate + 0.3 * lateRate + 0.2 * streakRate);
}

function calculatePaceCore(timeLimitSeconds?: number, totalTimeMs?: number): number {
  if (!timeLimitSeconds || !totalTimeMs || timeLimitSeconds <= 0 || totalTimeMs <= 0) {
    return 1;
  }

  const timeLimitMs = timeLimitSeconds * 1000;
  const overTimeMs = Math.max(0, totalTimeMs - timeLimitMs);
  return timeLimitMs / (timeLimitMs + overTimeMs);
}

function calculateSpeedCore(
  thiefEvents: number,
  onTimeDecisionCount: number,
  lateDecisionCount: number,
  timeLimitSeconds?: number,
  totalTimeMs?: number
): number {
  const paceCore = calculatePaceCore(timeLimitSeconds, totalTimeMs);
  if (thiefEvents <= 0) return paceCore;

  const timelyDecisions = onTimeDecisionCount + lateDecisionCount;
  const reactionTimeliness = safeRate(onTimeDecisionCount, Math.max(thiefEvents, timelyDecisions));
  return 0.7 * reactionTimeliness + 0.3 * paceCore;
}

function calculateEmotionCore(
  thiefEvents: number,
  panicBlock: number,
  panicAdapt: number,
  bombHits: number,
  decisionFailCount: number,
): number {
  if (thiefEvents <= 0) return 1;

  const panicRate = safeRate(panicBlock + panicAdapt, thiefEvents * 2);
  const failRate = safeRate(decisionFailCount, thiefEvents);
  const bombRate = safeRate(bombHits, thiefEvents);
  return 1 - (0.4 * panicRate + 0.35 * failRate + 0.25 * bombRate);
}
