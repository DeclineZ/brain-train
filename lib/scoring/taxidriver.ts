import type { TaxiDriverGameStats, ClinicalStats } from '@/types';

/**
 * Calculate clinical stats from Taxi Driver game results.
 * 
 * Stats mapped based on game design spec:
 * - stat_visual: Mental rotation ability (South vs North facing accuracy)
 * - stat_focus: Sustained attention (Forward command accuracy)
 * - stat_memory: Working memory (Blind turn accuracy)
 * - stat_speed: Processing speed (Reaction time on sudden changes)
 * - stat_planning: Anticipation (Pre-turn distance measurement)
 */
export function calculateTaxiDriverStats(data: TaxiDriverGameStats): ClinicalStats {
    const { difficultyMultiplier = 1.0 } = data;
    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

    // === STAT_VISUAL: Mental Rotation ===
    // Compare South-facing vs North-facing accuracy
    // High score = good mental rotation (can handle reversed perspective)
    let stat_visual: number | null = null;

    const northTotal = data.northFacingAttempts || 0;
    const southTotal = data.southFacingAttempts || 0;
    const visualTotal = northTotal + southTotal;

    if (visualTotal > 0) {
        // Base accuracy across both headings
        const northCorrect = data.northFacingCorrect || 0;
        const southCorrect = data.southFacingCorrect || 0;

        const baseAccuracy = ((northCorrect + southCorrect) / visualTotal) * 100;

        // Bonus for maintaining accuracy when facing South (harder mentally)
        let southBonus = 0;
        if (southTotal > 0) {
            const southAccuracy = southCorrect / southTotal;
            const northAccuracy = northTotal > 0 ? northCorrect / northTotal : 1;

            // If south accuracy is close to north, that's good mental rotation
            // Max 20 point bonus if south accuracy >= north accuracy
            if (southAccuracy >= 0.9 * northAccuracy) {
                southBonus = 20 * southAccuracy;
            } else {
                southBonus = 10 * southAccuracy;
            }
        }

        const rawVisual = (baseAccuracy + southBonus) * difficultyMultiplier;
        stat_visual = clamp(rawVisual);
    }

    // === STAT_FOCUS: Sustained Attention ===
    // Performance on "Forward" (simple) commands
    // Missing these indicates zoning out / autopilot errors
    let stat_focus: number | null = null;

    const forwardTotal = data.forwardAttempts || 0;
    if (forwardTotal > 0) {
        const forwardCorrect = data.forwardCorrect || 0;
        const rawFocus = (forwardCorrect / forwardTotal) * 100 * difficultyMultiplier;
        stat_focus = clamp(rawFocus);
    } else {
        // No forward commands in this level = default good focus
        // Based on overall accuracy
        const totalTurns = data.totalTurns || 1;
        const correctTurns = data.correctTurns || 0;
        stat_focus = clamp((correctTurns / totalTurns) * 100 * difficultyMultiplier);
    }

    // === STAT_MEMORY: Working Memory ===
    // Accuracy on blind turns (when path was hidden)
    let stat_memory: number | null = null;

    const blindTotal = data.blindTurnAttempts || 0;
    if (blindTotal > 0) {
        const blindCorrect = data.blindTurnCorrect || 0;
        const rawMemory = (blindCorrect / blindTotal) * 100 * difficultyMultiplier;
        stat_memory = clamp(rawMemory);
    }
    // If no blind turns in this level, stat_memory stays null

    // === STAT_SPEED: Processing Speed ===
    // Reaction time on sudden changes (detours, rotations)
    // Lower reaction time = higher score (inverse scaling)
    let stat_speed: number | null = null;

    const reactionTimes = data.suddenChangeReactionTimes || [];
    if (reactionTimes.length > 0) {
        const avgReactionTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;

        // Inverse scale: 500ms = 100, 2000ms = 50, 4000ms = 0
        // Formula: 100 - (avgTime - 500) * (100 / 3500)
        const minTime = 500;   // Best possible
        const maxTime = 4000;  // Worst acceptable

        const normalized = Math.max(0, Math.min(1, (maxTime - avgReactionTime) / (maxTime - minTime)));
        const rawSpeed = normalized * 100 * difficultyMultiplier;
        stat_speed = clamp(rawSpeed);
    }
    // If no sudden changes in this level, stat_speed stays null

    // === STAT_PLANNING: Anticipation ===
    // How early does the player lock in their decision?
    // Higher distance = better planning
    let stat_planning: number | null = null;

    const preTurnDistances = data.preTurnDistances || [];
    if (preTurnDistances.length > 0) {
        const avgDistance = preTurnDistances.reduce((a, b) => a + b, 0) / preTurnDistances.length;

        // Scale: 0 = last second, 50 = 50 points, 100+ = max
        // Using pixels as rough measure, typical cell might be 80px
        const maxDistance = 100;  // Max meaningful distance

        const normalized = Math.min(1, avgDistance / maxDistance);
        const rawPlanning = normalized * 100 * difficultyMultiplier;
        stat_planning = clamp(rawPlanning);
    }
    // If no data, stat_planning stays null

    return {
        stat_memory,
        stat_speed,
        stat_visual,
        stat_focus,
        stat_planning,
        stat_emotion: null  // Not measured in this game
    };
}
