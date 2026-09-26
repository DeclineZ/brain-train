import type { ClinicalStats, MysterySoundGameStats } from '@/types';

const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

/**
 * Calculates clinical stats for Mystery Sound (เกมเสียงอะไรเอ่ย).
 *
 * Core trained skill:
 * - stat_emotion: Language and Verbal Recall ("ภาษาและการนึกคำ")
 *   Measures auditory sound-to-word/concept identification and naming accuracy.
 *
 * Secondary skills:
 * - stat_focus: Auditory attention (distinguishing mixed sounds)
 * - stat_speed: Auditory processing speed / reaction time
 */
export function calculateMysterySoundStats(
  rawData: Partial<MysterySoundGameStats> & Record<string, any>
): ClinicalStats {
  if (!rawData) {
    return {
      stat_memory: null,
      stat_speed: null,
      stat_visual: null,
      stat_focus: null,
      stat_planning: null,
      stat_emotion: null,
    };
  }

  const {
    questionsCorrect,
    totalQuestions,
    stars,
    responseTimeMs,
    timeLimitMs,
    replaysUsed = 0,
    difficultyMultiplier = 1.0,
    stat_emotion: explicitEmotion,
    stat_focus: explicitFocus,
    stat_speed: explicitSpeed,
    stat_memory: legacyMemory,
  } = rawData;

  // 1. Language & Verbal Recall ("ภาษาและการนึกคำ")
  let stat_emotion: number | null = null;
  if (typeof explicitEmotion === 'number') {
    stat_emotion = clamp(explicitEmotion);
  } else if (
    typeof questionsCorrect === 'number' &&
    typeof totalQuestions === 'number' &&
    totalQuestions > 0
  ) {
    const accuracy = questionsCorrect / totalQuestions;
    const base = 60 + accuracy * 40;
    const replayPenalty = Math.max(0, replaysUsed - 1) * 5;
    stat_emotion = clamp((base - replayPenalty) * (difficultyMultiplier >= 1.0 ? 1.0 : difficultyMultiplier));
  } else if (typeof legacyMemory === 'number') {
    // Legacy recovery: previously emitted as stat_memory in older GameScene builds
    stat_emotion = clamp(legacyMemory);
  }

  // 2. Focus ("สมาธิและการจดจ่อ")
  let stat_focus: number | null = null;
  if (typeof explicitFocus === 'number') {
    stat_focus = clamp(explicitFocus);
  } else if (typeof stars === 'number') {
    stat_focus = clamp(60 + (stars / 3) * 40);
  }

  // 3. Processing Speed ("ความเร็วในการคิด")
  let stat_speed: number | null = null;
  if (typeof explicitSpeed === 'number') {
    stat_speed = clamp(explicitSpeed);
  } else if (
    typeof responseTimeMs === 'number' &&
    typeof timeLimitMs === 'number' &&
    timeLimitMs > 0
  ) {
    const speedRatio = Math.max(0, 1 - responseTimeMs / timeLimitMs);
    stat_speed = clamp(50 + speedRatio * 50);
  }

  return {
    stat_memory: null,
    stat_speed,
    stat_visual: null,
    stat_focus,
    stat_planning: null,
    stat_emotion,
  };
}
