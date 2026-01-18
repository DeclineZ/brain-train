/**
 * Shared coin calculation utility for consistent reward calculation
 * between client-side optimistic display and server-side final calculation
 */

export interface CoinCalculationParams {
    gameId: string;
    level: number;
    starsEarned: number;
    previousStars: number;
    score?: number;
}

export function calculateCoinReward(params: CoinCalculationParams): number {
    const { gameId, level, starsEarned, previousStars, score } = params;

    // Edge case: Invalid level (negative or tutorial)
    if (!level || level <= 0 || isNaN(level)) {
        return 0;
    }

    // Edge case: Invalid stars earned
    if (
        starsEarned === undefined ||
        starsEarned === null ||
        isNaN(starsEarned) ||
        starsEarned < 0
    ) {
        return 0;
    }

    // Edge case: Clamp stars earned to valid range (0-3)
    const validStarsEarned = Math.max(0, Math.min(3, starsEarned));

    // Sensor Lock game: Dynamic reward based on score (unchanged)
    if (gameId === "game-02-sensorlock") {
        const validScore = Math.max(0, score || 0);
        return Math.max(1, Math.floor(validScore / 1500));
    }

    // ===========================================================
    // Level-based coin reward system:
    // - Base: 30 coins
    // - Level scaling: +2 coins per level (harder levels = more coins)
    // - Star bonuses: 1★ = +5, 2★ = +8, 3★ = +12
    // - Replay penalty: If already played this level, divide total by 4
    // ===========================================================

    const validLevel = Math.max(1, level);

    // Base reward: 30 coins + level difficulty bonus (2 coins per level)
    const baseReward = 30 + (validLevel - 1) * 2;

    // Star bonuses (additive based on stars earned this play)
    const starBonuses: Record<number, number> = {
        1: 5,   // 1 star = +5
        2: 8,   // 2 stars = +8  (total)
        3: 12,  // 3 stars = +12 (total)
    };

    // Calculate total reward
    let totalReward = baseReward;

    // Add star bonus for current performance
    if (validStarsEarned > 0 && starBonuses[validStarsEarned]) {
        totalReward += starBonuses[validStarsEarned];
    }

    // If 0 stars earned, give reduced base reward (25% of base, minimum 5)
    if (validStarsEarned === 0) {
        totalReward = Math.max(5, Math.floor(baseReward * 0.25));
    }

    // Replay penalty: If this level was already played (previousStars > 0),
    // divide the reward by 4
    const isReplay = (previousStars || 0) > 0;
    if (isReplay) {
        totalReward = Math.floor(totalReward / 4);
    }

    // Edge case: Ensure minimum reward is 1 for any valid play
    return Math.max(1, totalReward);
}
