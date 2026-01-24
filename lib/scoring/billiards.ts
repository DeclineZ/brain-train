import type { BilliardsGameStats, ClinicalStats } from '@/types';

/**
 * Calculate clinical stats for Billiards Math Game
 * 
 * Stats measured:
 * - Focus: Accuracy (correct/total equations) with consecutive error penalty
 * - Speed: Time efficiency (par time / user time)
 * - Planning: Shot efficiency and equation resets penalty
 */
export function calculateBilliardsStats(data: BilliardsGameStats): ClinicalStats {
  const {
    totalEquations,
    correctEquations,
    wrongEquations,
    totalTimeMs,
    parTimeMs,
    consecutiveErrors,
    attempts,
    continuedAfterTimeout
  } = data;

  const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

  // Penalty factor if continued after timeout (30% reduction)
  const penaltyFactor = continuedAfterTimeout ? 0.7 : 1.0;

  // ============================================
  // 1. FOCUS (Accuracy & Concentration)
  // ============================================
  // Base: Correct equations / Total equations × 100
  // Penalty: Small reduction for consecutive errors (loss of concentration)
  const accuracy = totalEquations > 0 ? (correctEquations / totalEquations) * 100 : 0;
  const consecutiveErrorPenalty = consecutiveErrors * 5; // -5 per consecutive error
  const rawFocus = accuracy - consecutiveErrorPenalty;
  const stat_focus = clamp(rawFocus * penaltyFactor);

  // ============================================
  // 2. SPEED (Processing Speed)
  // ============================================
  // Formula: (ParTime / UserTime) × 100
  // Faster completion = higher score
  const safeUserTime = Math.max(totalTimeMs, 1000); // Min 1 second
  const timeRatio = parTimeMs / safeUserTime;
  const rawSpeed = timeRatio * 100;
  const stat_speed = clamp(rawSpeed * penaltyFactor);

  // ============================================
  // 3. PLANNING (Strategic Thinking / Shot Efficiency)
  // ============================================
  // Measures: Did player think before shooting?
  // 
  // Average shots per equation vs expected (fewer = better planning)
  // Expected ~8 shots per equation (realistic for physics-based billiards)
  const expectedShotsPerEquation = 8;
  const avgShotsPerEquation = totalEquations > 0 ? attempts / totalEquations : 0;

  // Shot efficiency: 100% if using expected or fewer, decreases as more shots used
  const shotEfficiency = avgShotsPerEquation <= expectedShotsPerEquation
    ? 100
    : Math.max(0, 100 - (avgShotsPerEquation - expectedShotsPerEquation) * 8);

  // Penalty for equation resets (ran out of shots or wrong answer)
  const resetPenalty = wrongEquations * 10;

  const rawPlanning = shotEfficiency - resetPenalty;
  const stat_planning = clamp(rawPlanning * penaltyFactor);

  return {
    stat_memory: null,      // Not tracked - no memorization
    stat_speed,
    stat_visual: null,      // Not tracked - no visual perception test
    stat_focus,
    stat_planning,
    stat_emotion: null      // Not tracked - no inhibitory control
  };
}

/**
 * Calculate star rating for level completion
 */
export function calculateStars(
  totalTimeMs: number,
  correctEquations: number,
  totalEquations: number,
  threeStarThreshold: number,
  twoStarThreshold: number,
  continuedAfterTimeout: boolean
): number {
  // Always max 1 star if continued after timeout
  if (continuedAfterTimeout) {
    return 1;
  }

  // Calculate average time per equation in seconds
  const avgTimePerEquation = (totalTimeMs / 1000) / Math.max(1, correctEquations);
  const accuracy = correctEquations / totalEquations;

  // 3 Stars: Fast + Perfect accuracy
  if (avgTimePerEquation <= threeStarThreshold && accuracy === 1) {
    return 3;
  }

  // 2 Stars: Reasonable time OR good accuracy
  if (avgTimePerEquation <= twoStarThreshold || accuracy >= 0.8) {
    return 2;
  }

  // 1 Star: Completed the level
  return 1;
}

/**
 * Generate improvement hint for player
 */
export function getStarHint(
  totalTimeMs: number,
  correctEquations: number,
  totalEquations: number,
  threeStarThreshold: number,
  continuedAfterTimeout: boolean
): string | null {
  if (continuedAfterTimeout) {
    return "จบเกมโดยไม่หมดเวลาเพื่อรับ 3 ดาว";
  }

  const avgTimePerEquation = (totalTimeMs / 1000) / Math.max(1, correctEquations);
  const accuracy = (correctEquations / totalEquations) * 100;

  const tooSlow = avgTimePerEquation > threeStarThreshold;
  const hasErrors = accuracy < 100;

  if (tooSlow && hasErrors) {
    return `ลองทำเวลาให้ดีกว่านี้\nและตอบถูกทุกข้อ`;
  }
  if (tooSlow) {
    return `ลองทำเวลาให้ดีกว่านี้\nเป้าหมาย: ${threeStarThreshold} วินาทีต่อสมการ`;
  }
  if (hasErrors) {
    return `ตอบถูกทุกข้อเพื่อรับ 3 ดาว\nปัจจุบัน: ${Math.round(accuracy)}%`;
  }

  return null;
}
