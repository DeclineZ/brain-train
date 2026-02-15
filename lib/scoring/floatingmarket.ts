import type { ClinicalStats } from '@/types';

export interface FloatingMarketGameStats {
    difficultyMultiplier: number;
    reactionTimes: number[];
    hesitationCount: number;
    totalCollisions: number;
    correctAnswers: number;
    totalEncounters: number;
    changeQuestionCorrect: number;
    changeQuestionTotal: number;
    bonusCoins: number;
    totalTimeMs: number;
}

/**
 * Calculate clinical stats from Floating Market game results.
 * 
 * Stats tracked:
 * - stat_speed: Processing speed (reaction time to math questions)
 * - stat_visual: Visuospatial ability (obstacle avoidance & boat control)
 * - stat_memory: Working memory (change/multi-step question accuracy, level 11+)
 * 
 * stat_focus, stat_planning, stat_emotion = null (not measured)
 */
export function calculateFloatingMarketStats(data: FloatingMarketGameStats): ClinicalStats {
    const { difficultyMultiplier = 1.0 } = data;
    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

    // === STAT_SPEED: Processing Speed ===
    // Based on reaction time from question appearing to first tilt toward answer
    // + Penalty for hesitation (changing direction)
    let stat_speed: number | null = null;

    if (data.reactionTimes.length > 0) {
        const avgReaction = data.reactionTimes.reduce((a, b) => a + b, 0) / data.reactionTimes.length;
        const standardTimeMs = 3000; // 3 seconds is the "par" reaction time

        // Score = (standardTime - avgReaction) / standardTime * 100
        // Fast reactions score higher
        const rawSpeed = ((standardTimeMs - avgReaction) / standardTimeMs) * 100;

        // Hesitation penalty: -5 points per hesitation
        const hesitationPenalty = data.hesitationCount * 5;

        stat_speed = clamp((rawSpeed - hesitationPenalty) * difficultyMultiplier);
    }

    // === STAT_VISUAL: Visuospatial Ability ===
    // Based on collision count — fewer collisions = better spatial awareness
    let stat_visual: number | null = null;

    // Always calculated (even obstacle-only levels contribute)
    const collisionPenalty = 10; // points lost per collision
    const rawVisual = 100 - (data.totalCollisions * collisionPenalty);
    stat_visual = clamp(rawVisual * difficultyMultiplier);

    // === STAT_MEMORY: Working Memory ===
    // Only calculated for change/subtraction questions (level 11+)
    // These require holding multiple numbers in working memory while steering
    let stat_memory: number | null = null;

    if (data.changeQuestionTotal > 0) {
        const rawMemory = (data.changeQuestionCorrect / data.changeQuestionTotal) * 100;
        stat_memory = clamp(rawMemory * difficultyMultiplier);
    }

    return {
        stat_speed,
        stat_visual,
        stat_memory,
        stat_focus: null,
        stat_planning: null,
        stat_emotion: null,
    };
}
