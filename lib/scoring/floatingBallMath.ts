import type { FloatingBallMathGameStats, ClinicalStats } from '@/types';

/**
 * Calculate all stats for Floating Ball Math (Block or Adapt) game
 * Returns ClinicalStats format matching the database schema
 * 
 * This game measures:
 * - Focus (สมาธิ): Decision accuracy and consistency
 * - Speed (ความเร็ว): Response time to thief events
 * - Emotional/Inhibitory Control (การควบคุมอารมณ์): Impulse control and panic avoidance
 * 
 * Stat definitions (for development/analysis team):
 * - Focus: "ติดตามการเปลี่ยนเลนและตัดสินใจถูกอย่างต่อเนื่อง"
 * - Speed: "ตัดสินใจทันในช่วงเวลาที่กำหนด"
 * - Emotion: "ไม่หุนหัน ไม่ตื่นตกใจ ไม่ทำแบบเดิมซ้ำๆ"
 */
export function calculateFloatingBallMathStats(
  stats: FloatingBallMathGameStats
): ClinicalStats {
  const {
    difficultyMultiplier,
    penaltyFactor,
    thiefEvents,
    blockSuccessCount,
    adaptSuccessCount,
    decisionFailCount,
    onTimeDecisionCount,
    lateDecisionCount,
    panicBlock,
    panicAdapt,
    bombHits,
    consecutiveErrors
  } = stats;

  // 1. Focus (สมาธิ)
  // Measures: Decision accuracy and consistency
  const stat_focus = calculateFocusScore(
    thiefEvents,
    blockSuccessCount,
    adaptSuccessCount,
    decisionFailCount,
    consecutiveErrors,
    difficultyMultiplier,
    penaltyFactor
  );

  // 2. Speed (ความเร็ว)
  // Measures: Response time to thief events AND level completion speed
  const stat_speed = calculateSpeedScore(
    thiefEvents,
    onTimeDecisionCount,
    lateDecisionCount,
    difficultyMultiplier,
    penaltyFactor,
    stats.timeLimitSeconds,
    stats.totalTimeMs
  );

  // 3. Emotion/Inhibitory Control (การควบคุมอารมณ์)
  // Measures: Impulse control and panic avoidance
  const stat_emotion = calculateEmotionScore(
    panicBlock,
    panicAdapt,
    bombHits,
    decisionFailCount,
    difficultyMultiplier,
    penaltyFactor
  );

  return {
    stat_memory: null,    // Not applicable to this game
    stat_speed: Math.round(stat_speed),
    stat_visual: null,   // Not applicable to this game
    stat_focus: Math.round(stat_focus),
    stat_planning: null, // Not applicable to this game
    stat_emotion: Math.round(stat_emotion),
  };
}

/**
 * Calculate Focus Score (สมาธิ)
 * Measures decision accuracy and consistency
 * 
 * Formula:
 * 1. If no thief events, return 100 (perfect - no errors possible)
 * 2. Start with 100 points
 * 3. Calculate proportional penalties:
 *    - Decision fails: (decisionFailCount / thiefEvents) × 50 points (up to 50 penalty)
 *    - Consecutive errors: (consecutiveErrors / thiefEvents) × 30 points (up to 30 penalty)
 * 4. Raw Focus = 100 - (failPenalty + errorPenalty)
 * 5. Final Focus = Raw Focus × difficultyMultiplier × penaltyFactor
 * 6. Clamp to 0-100
 */
function calculateFocusScore(
  thiefEvents: number,
  blockSuccessCount: number,
  adaptSuccessCount: number,
  decisionFailCount: number,
  consecutiveErrors: number,
  difficultyMultiplier: number,
  penaltyFactor: number
): number {
  // If no thief events, return perfect score (100) since no errors possible
  if (thiefEvents === 0) return 100;
  
  // Start with 100 points
  const baseScore = 100;
  
  // Calculate proportional penalties
  const failPenalty = (decisionFailCount / thiefEvents) * 50;  // Up to 50 points penalty
  const errorPenalty = (consecutiveErrors / thiefEvents) * 30; // Up to 30 points penalty
  const totalPenalty = failPenalty + errorPenalty;
  
  // Subtract penalties from base score
  const rawFocus = baseScore - totalPenalty;
  
  // Apply difficulty multiplier and penalty factor
  const adjustedFocus = rawFocus * difficultyMultiplier * penaltyFactor;
  
  // Debug logging
  console.log('[FloatingBallMath] Focus Score Calculation:', {
    thiefEvents,
    blockSuccessCount,
    adaptSuccessCount,
    decisionFailCount,
    consecutiveErrors,
    baseScore,
    failPenalty,
    errorPenalty,
    totalPenalty,
    rawFocus,
    difficultyMultiplier,
    penaltyFactor,
    adjustedFocus,
    finalScore: Math.max(0, Math.min(100, adjustedFocus))
  });
  
  return Math.max(0, Math.min(100, adjustedFocus));
}

/**
 * Calculate Speed Score (ความเร็ว)
 * Measures response time to thief events AND overall level completion speed
 * 
 * Formula:
 * 1. If no thief events, return 100 (perfect - no errors possible)
 * 2. Start with 100 points
 * 3. Calculate proportional penalties:
 *    - Late decisions: (lateDecisionCount / thiefEvents) × 50 points (up to 50 penalty)
 *    - Completion time: Based on time used vs time limit (up to 20 penalty)
 * 4. Raw Speed = 100 - (latePenalty + timePenalty)
 * 5. Final Speed = Raw Speed × difficultyMultiplier × penaltyFactor
 * 6. Clamp to 0-100
 */
function calculateSpeedScore(
  thiefEvents: number,
  onTimeDecisionCount: number,
  lateDecisionCount: number,
  difficultyMultiplier: number,
  penaltyFactor: number,
  timeLimitSeconds?: number,
  totalTimeMs?: number
): number {
  // If no thief events, return perfect score (100) since no errors possible
  if (thiefEvents === 0) return 100;
  
  // Start with 100 points
  const baseScore = 100;
  
  // Calculate proportional penalty for late decisions
  const latePenalty = (lateDecisionCount / thiefEvents) * 50; // Up to 50 points penalty
  
  // Calculate time penalty based on completion speed
  let timePenalty = 0;
  if (timeLimitSeconds && totalTimeMs) {
    const timeUsedSeconds = totalTimeMs / 1000;
    const timeUsedRatio = timeUsedSeconds / timeLimitSeconds;
    
    // Time penalty structure:
    // - Finished in < 50% of time: 0 penalty (excellent speed)
    // - Finished in 50-100% of time: Up to 20 points penalty based on progress
    // - Finished > 100% of time: Full 20 points penalty (overtime)
    if (timeUsedRatio < 0.5) {
      timePenalty = 0; // Excellent speed - no penalty
    } else if (timeUsedRatio <= 1.0) {
      timePenalty = timeUsedRatio * 20; // Up to 20 points for 50-100% time usage
    } else {
      timePenalty = 20; // Full penalty for overtime
    }
  }
  
  // Subtract penalties from base score
  const rawSpeed = baseScore - latePenalty - timePenalty;
  
  // Apply difficulty multiplier and penalty factor
  const adjustedSpeed = rawSpeed * difficultyMultiplier * penaltyFactor;
  
 
  
  return Math.max(0, Math.min(100, adjustedSpeed));
}

/**
 * Calculate Emotional/Inhibitory Control Score (การควบคุมอารมณ์)
 * Measures impulse control and panic avoidance
 * 
 * Formula:
 * 1. Calculate emotion penalties:
 *    - Panic block streaks: panicBlock × 8 points
 *    - Panic adapt streaks: panicAdapt × 8 points
 *    - Bomb hits: bombHits × 20 points
 *    - Decision fails: decisionFailCount × 10 points
 * 2. Raw Emotion = 100 - emotionPenalty
 * 3. Final Emotion = Raw Emotion × difficultyMultiplier × penaltyFactor
 * 4. Clamp to 0-100
 */
function calculateEmotionScore(
  panicBlock: number,
  panicAdapt: number,
  bombHits: number,
  decisionFailCount: number,
  difficultyMultiplier: number,
  penaltyFactor: number
): number {
  // Calculate emotion penalties
  const emotionPenalty = 
    (panicBlock * 8) + 
    (panicAdapt * 8) + 
    (bombHits * 20) + 
    (decisionFailCount * 10);
  
  // Raw emotion score (start from 100)
  const rawEmotion = 100 - emotionPenalty;
  
  // Apply difficulty multiplier and penalty factor
  const adjustedEmotion = rawEmotion * difficultyMultiplier * penaltyFactor;
  
  // Debug logging
  // console.log('[FloatingBallMath] Emotion Score Calculation:', {
  //   panicBlock,
  //   panicAdapt,
  //   bombHits,
  //   decisionFailCount,
  //   emotionPenalty,
  //   rawEmotion,
  //   difficultyMultiplier,
  //   penaltyFactor,
  //   adjustedEmotion,
  //   finalScore: Math.max(0, Math.min(100, adjustedEmotion))
  // });
  
  return Math.max(0, Math.min(100, adjustedEmotion));
}
