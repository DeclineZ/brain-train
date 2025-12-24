export interface MatchingLevelConfig {
    level: number;
    gridCols: number;
    totalPairs: number; // 3, 4, 5
    previewTimeMs: number;
    parTimeSeconds: number; // For star calculation
    difficultyMultiplier: number;
}

export const MATCHING_LEVELS: { [key: number]: MatchingLevelConfig } = {
    1: {
        level: 1,
        gridCols: 3, // 3x2 grid
        totalPairs: 3,
        previewTimeMs: 3000,
        parTimeSeconds: 15,
        difficultyMultiplier: 1.0
    },
    2: {
        level: 2,
        gridCols: 4, // 4x2 grid
        totalPairs: 4,
        previewTimeMs: 4000,
        parTimeSeconds: 20,
        difficultyMultiplier: 1.2
    },
    3: {
        level: 3,
        gridCols: 5, // 5x2 grid = 10 cards. Symmetrical.
        totalPairs: 5,
        previewTimeMs: 5000,
        parTimeSeconds: 25,
        difficultyMultiplier: 1.5
    }
};
