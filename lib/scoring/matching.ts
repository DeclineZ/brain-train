export interface MatchingGameStats {
    levelPlayed: number;
    difficultyMultiplier: number;
    totalPairs: number;
    wrongFlips: number;
    consecutiveErrors: number;
    repeatedErrors: number;
    userTimeMs: number;
    parTimeMs: number;
    attempts: number;
}

export function calculateMatchingStats(data: MatchingGameStats) {
    const {
        levelPlayed,
        difficultyMultiplier,
        totalPairs,
        wrongFlips,
        consecutiveErrors,
        repeatedErrors,
        userTimeMs,
        parTimeMs,
        attempts
    } = data;

    const clamp = (val: number) => Math.max(0, Math.min(100, val));

    // 1. Memory (Remembering positions)
    const rawMemory = 100 - (wrongFlips * 5) - (consecutiveErrors * 2) - (repeatedErrors * 10);
    const stat_memory = clamp(rawMemory * difficultyMultiplier);

    // 2. Speed (Reaction time relative to par)
    // Faster than par = 100. Slower = penalize.
    const timeRatio = Math.max(0, (parTimeMs - userTimeMs) / parTimeMs); // 0 to 1 if faster? No.
    // Logic: If userTime < parTime -> Bonus. If userTime > parTime -> Penalty.
    // Simple linear: 
    let speedScore = 70; // Base
    if (userTimeMs <= parTimeMs) {
        speedScore += 30 * ((parTimeMs - userTimeMs) / parTimeMs);
    } else {
        speedScore -= 50 * ((userTimeMs - parTimeMs) / parTimeMs);
    }
    const stat_speed = clamp(speedScore * difficultyMultiplier);

    // 3. Focus (Avoiding mistakes over time)
    // Related to wrong flips but specifically accumulated error free streaks? 
    // Let's use accuracy: pairs / attempts.
    // Perfect = pairs/pairs = 1.0 -> 100.
    const accuracy = totalPairs / (attempts || 1);
    const stat_focus = clamp((accuracy * 100) * difficultyMultiplier);

    // 4. Visual (Not heavily tested here, but ability to distinguish cards)
    // Just map to Memory for now or slightly lower
    const stat_visual = clamp(stat_memory * 0.9);

    // 5. Planning (Not heavily used, maybe low)
    const stat_planning = clamp(50 * difficultyMultiplier);

    return {
        stat_memory: Math.round(stat_memory),
        stat_speed: Math.round(stat_speed),
        stat_focus: Math.round(stat_focus),
        stat_visual: Math.round(stat_visual),
        stat_planning: Math.round(stat_planning)
    };
}
