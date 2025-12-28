import type { MatchingGameStats } from '@/types';

export interface MatchingGameStats {
    current_played: number;
    difficultyMultiplier: number;
    totalPairs: number;
    wrongFlips: number;
    consecutiveErrors: number;
    repeatedErrors: number;
    userTimeMs: number;
    parTimeMs: number;
    attempts: number;
    continuedAfterTimeout: boolean;
}

export function calculateMatchingStats(data: MatchingGameStats) {
    const {
        difficultyMultiplier,
        totalPairs,
        wrongFlips,
        consecutiveErrors,
        repeatedErrors,
        userTimeMs,
        parTimeMs,
        attempts,
        continuedAfterTimeout
    } = data;

    const clamp = (val: number) => Math.max(0, Math.min(100, val));

    // Penalty Factor if Continued
    // Proposing -30% raw score penalty if continued
    const penaltyFactor = continuedAfterTimeout ? 0.7 : 1.0;

    // 1. Memory
    // Formula: (totalPairs / (totalPairs + wrongFlips)) * 100 * difficultyMultiplier
    const rawMemory = (totalPairs / (totalPairs + wrongFlips)) * 100 * difficultyMultiplier;
    const stat_memory = clamp(rawMemory * penaltyFactor);

    // 2. Speed (Reaction time relative to par)
    // Formula: (ParTime / UserTime) * 100 * difficultyMultiplier
    // Avoid division by zero
    const safeUserTime = Math.max(userTimeMs, 1000);
    const rawSpeed = (parTimeMs / safeUserTime) * 100 * difficultyMultiplier;
    const stat_speed = clamp(rawSpeed * penaltyFactor);

    // 3. Focus
    // Formula: 100 - (wrongFlips * 5) - (consecutiveErrors * 2)
    const rawFocus = 100 - (wrongFlips * 5) - (consecutiveErrors * 2);
    const stat_focus = clamp(rawFocus * penaltyFactor);

    // 4. Visual
    // Same as Speed for now, or could vary. 
    // Spec says "Same as Speed"
    const stat_visual = stat_speed;

    // 5. Planning
    // Formula: 100 - (totalRepeatedErrors * 10)
    const rawPlanning = 100 - (repeatedErrors * 10);
    const stat_planning = clamp(rawPlanning * penaltyFactor);

    return {
        stat_memory: Math.round(stat_memory),
        stat_speed: Math.round(stat_speed),
        stat_focus: Math.round(stat_focus),
        stat_visual: Math.round(stat_visual),
        stat_planning: Math.round(stat_planning)
    };
}
