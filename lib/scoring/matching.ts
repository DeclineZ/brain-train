export type MatchingGameRawStats = {
    levelPlayed: number;
    difficultyMultiplier: number;
    totalPairs: number;
    wrongFlips: number;
    consecutiveErrors: number;
    repeatedErrors: number;
    userTimeMs: number;
    parTimeMs: number;
    attempts: number;
};

export function calculateMatchingStats(stats: MatchingGameRawStats) {
    // 1. MEMORY (ความจำ)
    // Formula: (totalPairs / (totalPairs + wrongFlips)) * 100 * difficultyMultiplier
    // If user makes 0 mistakes, they get > 100, we clamp it later.
    // Add small epsilon to prevent divide by zero if something weird happens (though totalCards > 0)
    const safeTotal = stats.totalPairs + stats.wrongFlips;
    const rawMemory = (stats.totalPairs / Math.max(1, safeTotal)) * 100 * stats.difficultyMultiplier;

    // 2. SPEED (ความเร็ว)
    // Formula: (ParTime / UserTime) * 100 * difficultyMultiplier
    const safeTime = Math.max(stats.userTimeMs, 1000);
    const rawSpeed = (stats.parTimeMs / safeTime) * 100 * stats.difficultyMultiplier;

    // 3. FOCUS (สมาธิ)
    // Formula: 100 - (wrongFlips * 5) - (consecutiveErrors * 2)
    const rawFocus = 100 - (stats.wrongFlips * 5) - (stats.consecutiveErrors * 2);

    // 4. VISUAL (การรับรู้) -> Same as Speed for now based on requirements
    const rawVisual = rawSpeed;

    // 5. PLANNING (การวางแผน / Logic)
    // Formula: 100 - (totalRepeatedErrors * 10)
    const rawPlanning = 100 - (stats.repeatedErrors * 10);

    // Helper to clamp 0-100
    const clamp = (val: number) => Math.min(Math.max(Math.round(val), 0), 100);

    return {
        stat_memory: clamp(rawMemory),
        stat_speed: clamp(rawSpeed),
        stat_visual: clamp(rawVisual),
        stat_focus: clamp(rawFocus),
        stat_planning: clamp(rawPlanning),
        stat_emotion: null // Not tracked in this game
    };
}
