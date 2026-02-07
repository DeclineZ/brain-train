export type MinerGameStats = {
  levelPlayed: number;
  attempts: number;
  success_grabs: number;
  valuable_grabs: number;
  mistakes: number;
  total_value: number;
  goal_amount: number;
  max_possible_value: number;
  avg_decision_time_ms: number;
  target_decision_time_ms: number;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export function calculateMinerStats(stats: MinerGameStats) {
  const goalAmount = Math.max(stats.goal_amount, 1);
  const safeAttempts = Math.max(stats.attempts, 1);
  const valueRatio = stats.total_value / goalAmount;
  const efficiency = stats.valuable_grabs / safeAttempts;

  const planningRaw = valueRatio * efficiency * 100;
  const spatialRaw = efficiency * 100;
  const attentionRaw = (1 - stats.mistakes / safeAttempts) * 100;
  const speedRaw = (stats.target_decision_time_ms / Math.max(stats.avg_decision_time_ms, 1)) * 100;

  return {
    stat_planning: Math.round(clamp(planningRaw)),
    stat_visual: Math.round(clamp(spatialRaw)),
    stat_focus: Math.round(clamp(attentionRaw)),
    stat_speed: Math.round(clamp(speedRaw)),
    stat_memory: null,
    stat_emotion: null
  };
}

export function calculateMinerStars(stats: MinerGameStats) {
  const goalAmount = Math.max(stats.goal_amount, 1);
  const safeAttempts = Math.max(stats.attempts, 1);
  const planning = clamp((stats.total_value / goalAmount) * (stats.valuable_grabs / safeAttempts) * 100);
  const focus = clamp((1 - stats.mistakes / safeAttempts) * 100);
  const speed = clamp((stats.target_decision_time_ms / Math.max(stats.avg_decision_time_ms, 1)) * 100);

  const weighted = planning * 0.6 + focus * 0.2 + speed * 0.2;

  if (weighted >= 85) return 3;
  if (weighted >= 65) return 2;
  if (weighted >= 45) return 1;
  return 0;
}