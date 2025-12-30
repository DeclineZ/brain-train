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
    // Formula: (7000 - Avg Reaction Time) / (7000 - 500) * 100
    // Adjusted for 7s max time.
    const minTime = 500; // 0.5s is very fast for older audience
    const maxTime = 7000;
    const rawSpeed = ((maxTime - Math.max(minTime, reactionTimeAvg)) / (maxTime - minTime)) * 100;
    const stat_speed = clamp(rawSpeed);

    // C. Emotional/Inhibitory Control
    // Formula: (Mismatch Correct / Mismatch Attempts) * 100
    // Removed difficulty multiplier to treat it as pure "Inhibitory Control" accuracy.
    // If you can stop yourself, you have good control, regardless of speed.
    const mismatchAccuracy = mismatchAttempts > 0 ? (mismatchCorrect / mismatchAttempts) : 0;

    // We remove the diffFactor penalty.
    const rawEmotion = mismatchAccuracy * 100;
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
