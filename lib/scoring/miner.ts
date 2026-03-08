export type MinerGameStats = {
  levelPlayed: number;
  attempts: number;
  crack_attempts: number;
  success_grabs: number;
  valuable_grabs: number;
  mistakes: number;
  total_value: number;
  goal_amount: number;
  max_possible_value: number;
  avg_decision_time_ms: number;
  target_decision_time_ms: number;
};

const LEVEL_MIN = 1;
const LEVEL_SPAN = 29;
const DIFFICULTY_MAX_BONUS = 0.12;

const clamp = (value: number) => Math.min(100, Math.max(0, value));

const getEffectiveAttempts = (stats: MinerGameStats) => Math.max(1, stats.attempts - stats.crack_attempts);

const applySoftBonus = (core: number, bonus: number) => core + (1 - core) * bonus;

const levelDifficultyBonus = (levelPlayed: number) =>
  DIFFICULTY_MAX_BONUS * ((levelPlayed - LEVEL_MIN) / LEVEL_SPAN);

export function calculateMinerStats(stats: MinerGameStats) {
  const bonus = levelDifficultyBonus(stats.levelPlayed);

  const remainingGoal = Math.max(stats.goal_amount - stats.total_value, 0);
  const valueGoalCore = stats.total_value / Math.max(stats.total_value + remainingGoal, 1);

  const nonValuableGrabs = Math.max(stats.success_grabs - stats.valuable_grabs, 0) + stats.crack_attempts;
  const efficiencyCore = stats.valuable_grabs / Math.max(stats.valuable_grabs + nonValuableGrabs + stats.mistakes, 1);

  const planningCore = 0.65 * valueGoalCore + 0.35 * efficiencyCore;
  const focusCore = stats.success_grabs / Math.max(stats.success_grabs + stats.mistakes + stats.crack_attempts, 1);

  const overDecisionMs = Math.max(0, stats.avg_decision_time_ms - stats.target_decision_time_ms);
  const speedCore = stats.target_decision_time_ms / Math.max(stats.target_decision_time_ms + overDecisionMs, 1);

  return {
    stat_planning: Math.round(100 * applySoftBonus(planningCore, bonus)),
    stat_visual: Math.round(100 * applySoftBonus(efficiencyCore, bonus)),
    stat_focus: Math.round(100 * applySoftBonus(focusCore, bonus)),
    stat_speed: Math.round(100 * applySoftBonus(speedCore, bonus)),
    stat_memory: null,
    stat_emotion: null
  };
}

export function calculateMinerStars(stats: MinerGameStats) {
  const goalAmount = Math.max(stats.goal_amount, 1);
  const safeAttempts = getEffectiveAttempts(stats);
  const planning = clamp((stats.total_value / goalAmount) * (stats.valuable_grabs / safeAttempts) * 100);
  const focus = clamp((1 - stats.mistakes / safeAttempts) * 100);
  const speed = clamp((stats.target_decision_time_ms / Math.max(stats.avg_decision_time_ms, 1)) * 100);

  const weighted = planning * 0.6 + focus * 0.2 + speed * 0.2;

  if (weighted >= 85) return 3;
  if (weighted >= 65) return 2;
  if (weighted >= 45) return 1;
  return 0;
}
