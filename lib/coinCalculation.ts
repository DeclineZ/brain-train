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
  if (starsEarned === undefined || starsEarned === null || isNaN(starsEarned) || starsEarned < 0) {
    return 0;
  }

  // Edge case: Clamp stars earned to valid range (0-3)
  const validStarsEarned = Math.max(0, Math.min(3, starsEarned));

  // Sensor Lock game: Dynamic reward based on score
  if (gameId === "game-02-sensorlock") {
    const validScore = Math.max(0, score || 0);
    return Math.max(1, Math.floor(validScore / 1500));
  }

  // Card Match and other games: Level-based scaling + star quality + replay penalty
  
  // 1. Base Multiplier based on Level
  // Level 1: 1.0 -> 20 coins
  // Level 2: 1.1 -> 22 coins
  // Level 10: 1.9 -> 38 coins
  const validLevel = Math.max(1, level); // Ensure minimum level is 1 for calculation
  const levelMultiplier = 1 + (validLevel - 1) * 0.1;
  let calculatedReward = Math.floor(20 * levelMultiplier);

  // 2. Star Quality Multiplier
  // 3 Stars: 100%
  // 2 Stars: 70%
  // 1 Star: 50%
  // 0 Stars: 0%
  let starMultiplier = 1.0;
  if (validStarsEarned === 2) starMultiplier = 0.7;
  if (validStarsEarned === 1) starMultiplier = 0.5;
  if (validStarsEarned === 0) starMultiplier = 0.0;

  calculatedReward = Math.floor(calculatedReward * starMultiplier);

  // 3. Star Improvement Penalty
  // Apply 20% penalty only if same or fewer stars than before
  // Only apply if previousStars is a valid number
  if (previousStars !== null && previousStars !== undefined && !isNaN(previousStars) && validStarsEarned <= previousStars) {
    calculatedReward = Math.floor(calculatedReward * 0.2);
  }

  // Edge case: Ensure minimum reward is 0 (no negative rewards)
  return Math.max(0, calculatedReward);
}
