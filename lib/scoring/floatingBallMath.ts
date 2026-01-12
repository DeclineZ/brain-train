import type { FloatingBallMathGameStats } from "@/types";

/**
 * Calculate Focus & Attention score
 * Measures accuracy in selecting the right pool balls
 */
export function calculateFocusScore(stats: FloatingBallMathGameStats): number {
  if (stats.totalEquations === 0) return 0;

  // Focus = (Correct Equations / Total Attempts) * 100
  // Total attempts include wrong answers + correct answers
  const totalAttempts = stats.correctEquations + stats.wrongEquations;
  
  const focusScore = (stats.correctEquations / totalAttempts) * 100;
  
  return Math.min(100, Math.max(0, Math.round(focusScore)));
}

/**
 * Calculate Processing Speed score
 * Measures how quickly the player selects the correct pair
 */
export function calculateSpeedScore(stats: FloatingBallMathGameStats): number {
  const MIN_MS = 250; // Perfect reaction time
  const MAX_MS = 1500; // Slow reaction time
  
  // If no reaction time data, return default score
  if (!stats.averageReactionTime || stats.averageReactionTime === 0) {
    return 50;
  }

  // Speed = ((MAX_MS - AvgReactionTime) / (MAX_MS - MIN_MS)) * 100
  const speedScore = ((MAX_MS - stats.averageReactionTime) / (MAX_MS - MIN_MS)) * 100;
  
  return Math.min(100, Math.max(0, Math.round(speedScore)));
}

/**
 * Calculate Emotional/Inhibitory Control score
 * Measures ability to suppress impulsive reactions under pressure
 */
export function calculateEmotionalControlScore(stats: FloatingBallMathGameStats): number {
  // D_avg is the difficulty multiplier
  const D_avg = stats.difficultyMultiplier || 1;
  
  // Calculate mismatch accuracy
  // Mismatch accuracy = (Mismatch Correct / Mismatch Attempts) * 100
  let mismatchAccuracy = 0;
  if (stats.mismatchAttempts > 0) {
    mismatchAccuracy = (stats.mismatchCorrect / stats.mismatchAttempts) * 100;
  }
  
  // Normalize difficulty multiplier to 1-3 range for calculation
  const normalizedDifficulty = Math.min(3, Math.max(1, D_avg));
  
  // Emotional Control = MismatchAccuracy * (D_avg / 3.33)
  // We use 3.33 as the baseline to normalize the multiplier
  const emotionalControlScore = mismatchAccuracy * (normalizedDifficulty / 3.33);
  
  return Math.min(100, Math.max(0, Math.round(emotionalControlScore)));
}

/**
 * Calculate all three stats for Floating Ball Math
 * Returns ClinicalStats format matching the database schema
 */
export function calculateFloatingBallMathStats(
  stats: FloatingBallMathGameStats
): any {
  const focus = calculateFocusScore(stats);
  const speed = calculateSpeedScore(stats);
  const emotion = calculateEmotionalControlScore(stats);

  return {
    stat_memory: null, // Not applicable to this game
    stat_speed: speed,
    stat_visual: null, // Not applicable to this game
    stat_focus: focus,
    stat_planning: null, // Not applicable to this game
    stat_emotion: emotion,
  };
}
