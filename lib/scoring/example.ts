import type { CardGameRawStats } from '@/types';

export function calculateClinicalStats(stats: CardGameRawStats) {
  // 1. MEMORY (ความจำ) [cite: 170]
  // Formula: (TotalPairs / (TotalPairs + Wrong)) * 100 * Multiplier
  const rawMemory = (stats.totalPairs / (stats.totalPairs + stats.wrongFlips)) * 100 * stats.difficultyMultiplier;

  // 2. SPEED / VISUAL PERCEPTION (ความเร็ว / การรับรู้) [cite: 174, 183]
  // Formula: (ParTime / UserTime) * 100 * Multiplier
  const safeTime = Math.max(stats.userTimeMs, 1000); // Prevent divide by zero
  const rawSpeed = (stats.parTimeMs / safeTime) * 100 * stats.difficultyMultiplier;

  // 3. FOCUS (สมาธิ) [cite: 179]
  // Formula: 100 - (Wrong * 5) - (Consecutive * 2)
  const rawFocus = 100 - (stats.wrongFlips * 5) - (stats.consecutiveErrors * 2);

  // 4. LOGIC (การวางแผน) [cite: 188]
  // Formula: 100 - (RepeatedErrors * 10)
  const rawLogic = 100 - (stats.repeatedErrors * 10);

  // Normalize all to max 100 
  return {
    stat_memory: Math.min(Math.round(rawMemory), 100),
    stat_speed: Math.min(Math.round(rawSpeed), 100),
    stat_visual: Math.min(Math.round(rawSpeed), 100),
    stat_focus: Math.min(Math.round(rawFocus), 100),
    stat_planning: Math.min(Math.round(rawLogic), 100),
    stat_emotion: null 
  };
}
