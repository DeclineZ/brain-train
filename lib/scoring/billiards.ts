import type { BilliardsGameStats, ClinicalStats } from '@/types';

export function calculateBilliardsStats(data: BilliardsGameStats): ClinicalStats {
  const {
    difficultyMultiplier,
    totalEquations,
    correctEquations,
    wrongEquations,
    totalTimeMs,
    parTimeMs,
    consecutiveErrors,
    repeatedErrors,
    continuedAfterTimeout
  } = data;

  const clamp = (val: number) => Math.max(0, Math.min(100, val));

  // Penalty Factor if Continued After Timeout
  const penaltyFactor = continuedAfterTimeout ? 0.7 : 1.0;

  // 1. Focus (Accuracy and Concentration)
  // Formula: (Correct / Total) * 100 * difficultyMultiplier
  const rawFocus = totalEquations > 0 ? (correctEquations / totalEquations) * 100 * difficultyMultiplier : 0;
  const stat_focus = clamp(rawFocus * penaltyFactor);

  // 2. Speed (Calculation Speed)
  // Formula: (ParTime / UserTime) * 100 * difficultyMultiplier
  // Lower time = higher score
  const safeUserTime = Math.max(totalTimeMs, 1000); // Minimum 1 second to avoid division issues
  const rawSpeed = (parTimeMs / safeUserTime) * 100 * difficultyMultiplier;
  const stat_speed = clamp(rawSpeed * penaltyFactor);

  // 3. Planning (Strategic Thinking)
  // Formula: Base score - (Wrong Equations * 5) - (Consecutive Errors * 3) - (Repeated Errors * 8)
  // Planning involves thinking through problems, so errors penalize this stat
  const rawPlanning = 100 - (wrongEquations * 5) - (consecutiveErrors * 3) - (repeatedErrors * 8);
  const stat_planning = clamp(rawPlanning * penaltyFactor);

  return {
    stat_memory: null,      // Not tracked in math game
    stat_speed,
    stat_visual: null,      // Not tracked in math game
    stat_focus,
    stat_planning,
    stat_emotion: null       // Not tracked in math game
  };
}

export function calculateStars(
  totalTimeMs: number,
  correctEquations: number,
  totalEquations: number,
  timeRequirementSeconds: number,
  continuedAfterTimeout: boolean
): number {
  // Always receive 1 star max if continued after timeout
  if (continuedAfterTimeout) {
    return 1;
  }

  const averageTimePerEquation = totalTimeMs / totalEquations;
  const averageTimeSeconds = averageTimePerEquation / 1000;

  // Perfect score: within time requirement and high accuracy
  if (averageTimeSeconds <= timeRequirementSeconds && correctEquations === totalEquations) {
    return 3;
  }

  // Good score: within time requirement or good accuracy
  if (averageTimeSeconds <= timeRequirementSeconds * 1.5 || correctEquations >= totalEquations * 0.8) {
    return 2;
  }

  // Complete the level = at least 1 star
  return 1;
}

export function getStarHint(
  totalTimeMs: number,
  correctEquations: number,
  totalEquations: number,
  timeRequirementSeconds: number,
  continuedAfterTimeout: boolean
): string | null {
  if (continuedAfterTimeout) {
    return "จบเกมโดยไม่หมดเวลาเพื่อรับ 3 ดาว";
  }

  const averageTimePerEquation = totalTimeMs / totalEquations;
  const averageTimeSeconds = averageTimePerEquation / 1000;
  const accuracy = (correctEquations / totalEquations) * 100;

  const tooSlow = averageTimeSeconds > timeRequirementSeconds;
  const lowAccuracy = accuracy < 80;

  if (tooSlow && lowAccuracy) {
    return `ลองทำเวลาให้ดีกว่านี้\nและตอบถูกให้มากกว่า 80%`;
  }
  if (tooSlow) {
    return `ลองทำเวลาให้ดีกว่านี้\nเป้าหมาย: ${timeRequirementSeconds} วินาทีต่อสมการ`;
  }
  if (lowAccuracy) {
    return `ลองตอบถูกให้มากกว่า 80%\nปัจจุบัน: ${Math.round(accuracy)}%`;
  }
  return null;
}
