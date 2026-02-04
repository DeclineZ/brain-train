import type { GridHunterGameStats, ClinicalStats } from '@/types';

export function calculateGridHunterStats(data: GridHunterGameStats): ClinicalStats {
    const {
        score,
        maxCombo,
        totalCorrect,
        totalAttempts,
        reactionTimeAvg,
        trapAvoided,
        trapHit,
        phaseReached
    } = data;

    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

    // A. Visual Search (stat_visual)
    // Based on how far they progressed (phase) and combo performance
    // Higher phases mean better visual scanning ability
    // There are 7 phases total, so scale accordingly (phase 1 = baseline)
    const phaseBonus = (Math.min(phaseReached, 6) / 6) * 50; // Max 50 from phases
    const comboBonus = Math.min(maxCombo, 20) * 2.5; // Max 50 from combo
    const stat_visual = clamp(phaseBonus + comboBonus);

    // B. Focus/Accuracy (stat_focus)
    // Accuracy percentage: correct / attempts
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
    const stat_focus = clamp(accuracy);

    // C. Processing Speed (stat_speed)
    // Based on average reaction time
    // Fast: <500ms = 100, Slow: >3000ms = 0
    // No taps = 0 speed (avoid false positive from reactionTimeAvg=0)
    let stat_speed = 0;
    if (reactionTimeAvg > 0) {
        const minTime = 400;
        const maxTime = 3000;
        const rawSpeed = ((maxTime - Math.max(minTime, reactionTimeAvg)) / (maxTime - minTime)) * 100;
        stat_speed = clamp(rawSpeed);
    }

    return {
        stat_memory: null,    // Not tracked in this game
        stat_speed,
        stat_visual,
        stat_focus,
        stat_planning: null,  // Not tracked in this game
        stat_emotion: null    // Not tracked (trap avoidance could be added here if needed)
    };
}
