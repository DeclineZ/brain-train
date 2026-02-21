import type { ClinicalStats } from '@/types';

export interface FloatingMarketGameStats {
    difficultyMultiplier: number;
    mode: string;
    correctCollections: number;
    incorrectCollections: number;
    missedItems: number;
    duplicatePickups: number;
    memoryCapacity: number;
    totalCollisions: number;
    reactionTimes: number[];
    hesitationCount: number;
    bonusCoins: number;
    totalTimeMs: number;
    totalItemsSpawned: number;
    totalItemsCollected: number;
}

/**
 * Calculate clinical stats from Floating Market memory game results.
 *
 * Stats tracked:
 * - stat_memory: Working memory (Mode B duplicate avoidance rate) — PRIMARY
 * - stat_speed: Processing speed (reaction time to item decisions)
 * - stat_visual: Visuospatial ability (obstacle avoidance & boat control)
 * - stat_focus: Inhibition / sustained attention (Mode A incorrect collections)
 *
 * stat_planning, stat_emotion = null (not measured)
 */
export function calculateFloatingMarketStats(data: FloatingMarketGameStats): ClinicalStats {
    const { difficultyMultiplier = 1.0 } = data;
    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

    // === STAT_SPEED: Processing Speed ===
    let stat_speed: number | null = null;
    if (data.reactionTimes && data.reactionTimes.length > 0) {
        const avgReaction = data.reactionTimes.reduce((a, b) => a + b, 0) / data.reactionTimes.length;
        const standardTimeMs = 3000;
        const rawSpeed = ((standardTimeMs - avgReaction) / standardTimeMs) * 100;
        const hesitationPenalty = (data.hesitationCount || 0) * 5;
        stat_speed = clamp((rawSpeed - hesitationPenalty) * difficultyMultiplier);
    }

    // === STAT_VISUAL: Visuospatial Ability ===
    const collisionPenalty = 10;
    const rawVisual = 100 - (data.totalCollisions * collisionPenalty);
    const stat_visual = clamp(rawVisual * difficultyMultiplier);

    // === STAT_MEMORY: Working Memory ===
    // Based on Mode B performance — duplicate avoidance and correct collection rate
    let stat_memory: number | null = null;
    if (data.mode === 'modeB' || data.mode === 'hybrid') {
        const totalAttempted = data.correctCollections + data.incorrectCollections;
        if (totalAttempted > 0) {
            const accuracy = data.correctCollections / totalAttempted;
            const duplicatePenalty = data.duplicatePickups * 15;
            const capacityBonus = Math.min(20, (data.memoryCapacity || 1) * 4);
            const rawMemory = (accuracy * 80) + capacityBonus - duplicatePenalty;
            stat_memory = clamp(rawMemory * difficultyMultiplier);
        }
    }

    // === STAT_FOCUS: Inhibition / Sustained Attention ===
    // Based on Mode A performance — avoiding incorrect collections
    let stat_focus: number | null = null;
    if (data.mode === 'modeA' || data.mode === 'hybrid' || data.mode === 'tutorial') {
        const totalAttempted = data.correctCollections + data.incorrectCollections;
        if (totalAttempted > 0) {
            const inhibitionRate = 1 - (data.incorrectCollections / totalAttempted);
            const rawFocus = inhibitionRate * 100;
            stat_focus = clamp(rawFocus * difficultyMultiplier);
        }
    }

    return {
        stat_speed,
        stat_visual,
        stat_memory,
        stat_focus,
        stat_planning: null,
        stat_emotion: null,
    };
}
