export type MatchingLevelConfig = {
    level: number;
    gridCols: number;
    gridRows: number;
    totalPairs: number;
    previewTimeMs: number;
    parTimeSeconds: number; // For speed stat calculation
    difficultyMultiplier: number; // For score scaling
};

export const MATCHING_LEVELS: Record<number, MatchingLevelConfig> = {
    1: {
        level: 1,
        gridCols: 3,
        gridRows: 2,
        totalPairs: 3,
        previewTimeMs: 3000,
        parTimeSeconds: 15,
        difficultyMultiplier: 1.0
    },
    2: {
        level: 2,
        gridCols: 4,
        gridRows: 2,
        totalPairs: 4,
        previewTimeMs: 4000,
        parTimeSeconds: 20,
        difficultyMultiplier: 1.2
    },
    3: {
        level: 3,
        gridCols: 5,
        gridRows: 2, // 5x2 = 10 cards = 5 pairs
        totalPairs: 5,
        previewTimeMs: 5000,
        parTimeSeconds: 25,
        difficultyMultiplier: 1.5
    },
};
