import type { SensorLockGameStats, ClinicalStats } from '@/types';

export function calculateSensorLockStats(data: SensorLockGameStats): ClinicalStats {
    const {
        score,
        totalCorrect,
        totalAttempts,
        reactionTimeAvg,
        difficultyMultiplier,
        mismatchCorrect,
        mismatchAttempts
    } = data;

    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

    // A. Focus & Attention
    // Formula: (Total Correct / Total Attempts) * 100
    // Simple accuracy.
    const rawFocus = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
    const stat_focus = clamp(rawFocus);

    // B. Processing Speed
    // Formula: (1500 - Avg Reaction Time) / (1500 - 250) * 100
    // 250ms = 100 score, 1500ms = 0 score.
    const minTime = 250;
    const maxTime = 1500;
    const rawSpeed = ((maxTime - Math.max(minTime, reactionTimeAvg)) / (maxTime - minTime)) * 100;
    const stat_speed = clamp(rawSpeed);

    // C. Emotional/Inhibitory Control
    // Formula: (Mismatch Correct / Mismatch Attempts) * 100 * (Difficulty / 3.33)
    // Difficulty ranges from 1.0 (2000ms) to ~3.33 (600ms).
    const mismatchAccuracy = mismatchAttempts > 0 ? (mismatchCorrect / mismatchAttempts) : 0;

    // Normalize difficulty: Max diff is 3.33 (2000/600).
    const maxDiff = 3.33;
    const diffFactor = Math.min(1, difficultyMultiplier / maxDiff);

    // We want 100% accuracy at max speed to be 100.
    // 100% accuracy at low speed (multiplier 1) -> 1/3.33 = ~30.
    const rawEmotion = (mismatchAccuracy * 100) * diffFactor;
    const stat_emotion = clamp(rawEmotion);

    return {
        stat_memory: null,   // Not tracked
        stat_speed,
        stat_visual: null,   // Not tracked
        stat_focus,
        stat_planning: null, // Not tracked
        stat_emotion
    };
}
