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

    // Card Match and other games: Star bonuses + base points for newly achieved stars

    const validLevel = Math.max(1, level);
    const basePoint = Math.floor(validLevel * 0.1);

    // Star bonuses
    const starBonuses: Record<number, number> = {
        1: 5,
        2: 7,
        3: 10,
    };

    let totalReward = validStarsEarned === 0 ? 0 : 3 + basePoint;
    const prevStars = previousStars || 0;

    // Calculate reward for each newly achieved star level
    for (
        let starLevel = prevStars + 1;
        starLevel <= validStarsEarned;
        starLevel++
    ) {
        if (starBonuses[starLevel]) {
            totalReward += starBonuses[starLevel] + basePoint;
        }
    }

    // Edge case: Ensure minimum reward is 0 (no negative rewards)
    return Math.max(0, totalReward);
}
