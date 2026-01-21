import type { MatchingLevelConfig } from '@/types';

// REBALANCED: 45 levels with gradual difficulty progression
// Pairs increase: 2→3→4→5→6→7→8 over the course of all levels
// Mini-tutorials at levels 7, 16, 27, 36

export const MATCHING_LEVELS: { [key: number]: MatchingLevelConfig } = {
    // --- PHASE 1: WARM UP (Basic Cards) --- Levels 0-6
    // Focus: Simple pattern recognition, increasing count slowly.
    0: { level: 0, gridCols: 3, totalPairs: 3, previewTimeMs: 999999, parTimeSeconds: 999, timeLimitSeconds: 999, difficultyMultiplier: 1.0, difficultyTier: 'easy' },
    1: { level: 1, gridCols: 2, totalPairs: 2, previewTimeMs: 10000, parTimeSeconds: 10, timeLimitSeconds: 60, difficultyMultiplier: 1.0, difficultyTier: 'easy' },
    2: { level: 2, gridCols: 2, totalPairs: 2, previewTimeMs: 8000, parTimeSeconds: 10, timeLimitSeconds: 50, difficultyMultiplier: 1.0, difficultyTier: 'easy' },
    3: { level: 3, gridCols: 3, totalPairs: 3, previewTimeMs: 8000, parTimeSeconds: 15, timeLimitSeconds: 50, difficultyMultiplier: 1.0, difficultyTier: 'easy' },
    4: { level: 4, gridCols: 3, totalPairs: 3, previewTimeMs: 7000, parTimeSeconds: 15, timeLimitSeconds: 45, difficultyMultiplier: 1.0, difficultyTier: 'easy' },
    5: { level: 5, gridCols: 4, totalPairs: 4, previewTimeMs: 8000, parTimeSeconds: 20, timeLimitSeconds: 50, difficultyMultiplier: 1.05, difficultyTier: 'easy' },
    6: { level: 6, gridCols: 4, totalPairs: 4, previewTimeMs: 7000, parTimeSeconds: 20, timeLimitSeconds: 45, difficultyMultiplier: 1.05, difficultyTier: 'easy' },

    // --- PHASE 2: DISCRIMINATION (Hard Variations) --- Levels 7-15
    // Focus: Visually similar cards (Quantity, Orientation). Tutorial at level 7.
    7: { level: 7, gridCols: 3, totalPairs: 3, previewTimeMs: 8000, parTimeSeconds: 20, timeLimitSeconds: 50, difficultyMultiplier: 1.1, useHardVariations: true, difficultyTier: 'easy' },
    8: { level: 8, gridCols: 3, totalPairs: 3, previewTimeMs: 7000, parTimeSeconds: 20, timeLimitSeconds: 45, difficultyMultiplier: 1.1, useHardVariations: true, difficultyTier: 'easy' },
    9: { level: 9, gridCols: 4, totalPairs: 4, previewTimeMs: 8000, parTimeSeconds: 25, timeLimitSeconds: 50, difficultyMultiplier: 1.15, useHardVariations: true, difficultyTier: 'normal' },
    10: { level: 10, gridCols: 4, totalPairs: 4, previewTimeMs: 7000, parTimeSeconds: 25, timeLimitSeconds: 45, difficultyMultiplier: 1.15, useHardVariations: true, difficultyTier: 'normal' },
    11: { level: 11, gridCols: 5, totalPairs: 5, previewTimeMs: 9000, parTimeSeconds: 30, timeLimitSeconds: 55, difficultyMultiplier: 1.2, useHardVariations: true, difficultyTier: 'normal' },
    12: { level: 12, gridCols: 5, totalPairs: 5, previewTimeMs: 8000, parTimeSeconds: 30, timeLimitSeconds: 50, difficultyMultiplier: 1.2, useHardVariations: true, difficultyTier: 'normal' },
    13: { level: 13, gridCols: 4, totalPairs: 6, previewTimeMs: 10000, parTimeSeconds: 35, timeLimitSeconds: 60, difficultyMultiplier: 1.25, useHardVariations: true, difficultyTier: 'normal' },
    14: { level: 14, gridCols: 4, totalPairs: 6, previewTimeMs: 9000, parTimeSeconds: 35, timeLimitSeconds: 55, difficultyMultiplier: 1.25, useHardVariations: true, difficultyTier: 'normal' },
    15: { level: 15, gridCols: 4, totalPairs: 6, previewTimeMs: 8000, parTimeSeconds: 35, timeLimitSeconds: 50, difficultyMultiplier: 1.3, useHardVariations: true, difficultyTier: 'normal' },

    // --- PHASE 3: DYNAMIC ATTENTION (Shuffling) --- Levels 16-26
    // Focus: Basic cards + shuffling after preview. Tutorial at level 16.
    16: { level: 16, gridCols: 4, totalPairs: 4, previewTimeMs: 10000, parTimeSeconds: 30, timeLimitSeconds: 60, difficultyMultiplier: 1.3, swapAfterPreviewCount: 2, difficultyTier: 'normal' },
    17: { level: 17, gridCols: 4, totalPairs: 4, previewTimeMs: 9000, parTimeSeconds: 30, timeLimitSeconds: 55, difficultyMultiplier: 1.35, swapAfterPreviewCount: 2, difficultyTier: 'normal' },
    18: { level: 18, gridCols: 5, totalPairs: 5, previewTimeMs: 11000, parTimeSeconds: 35, timeLimitSeconds: 65, difficultyMultiplier: 1.35, swapAfterPreviewCount: 2, difficultyTier: 'hard' },
    19: { level: 19, gridCols: 5, totalPairs: 5, previewTimeMs: 10000, parTimeSeconds: 35, timeLimitSeconds: 60, difficultyMultiplier: 1.4, swapAfterPreviewCount: 3, difficultyTier: 'hard' },
    20: { level: 20, gridCols: 4, totalPairs: 6, previewTimeMs: 12000, parTimeSeconds: 40, timeLimitSeconds: 70, difficultyMultiplier: 1.4, swapAfterPreviewCount: 3, difficultyTier: 'hard' },
    21: { level: 21, gridCols: 4, totalPairs: 6, previewTimeMs: 11000, parTimeSeconds: 40, timeLimitSeconds: 65, difficultyMultiplier: 1.45, swapAfterPreviewCount: 3, difficultyTier: 'hard' },
    22: { level: 22, gridCols: 4, totalPairs: 6, previewTimeMs: 10000, parTimeSeconds: 40, timeLimitSeconds: 60, difficultyMultiplier: 1.45, swapAfterPreviewCount: 4, difficultyTier: 'hard' },
    23: { level: 23, gridCols: 5, totalPairs: 7, previewTimeMs: 14000, parTimeSeconds: 50, timeLimitSeconds: 80, difficultyMultiplier: 1.5, swapAfterPreviewCount: 4, difficultyTier: 'hard' },
    24: { level: 24, gridCols: 5, totalPairs: 7, previewTimeMs: 13000, parTimeSeconds: 50, timeLimitSeconds: 75, difficultyMultiplier: 1.5, swapAfterPreviewCount: 4, difficultyTier: 'hard' },
    25: { level: 25, gridCols: 5, totalPairs: 7, previewTimeMs: 12000, parTimeSeconds: 50, timeLimitSeconds: 70, difficultyMultiplier: 1.55, swapAfterPreviewCount: 5, difficultyTier: 'hard' },
    26: { level: 26, gridCols: 5, totalPairs: 7, previewTimeMs: 11000, parTimeSeconds: 50, timeLimitSeconds: 70, difficultyMultiplier: 1.55, swapAfterPreviewCount: 5, difficultyTier: 'hard' },

    // --- PHASE 4: PERIODIC SWAPS (Swapping During Play) --- Levels 27-35
    // Focus: Cards also swap during gameplay. Tutorial at level 27.
    27: { level: 27, gridCols: 5, totalPairs: 5, previewTimeMs: 12000, parTimeSeconds: 40, timeLimitSeconds: 70, difficultyMultiplier: 1.6, swapAfterPreviewCount: 2, periodicSwapInterval: 4, periodicSwapPairs: 1, difficultyTier: 'hard' },
    28: { level: 28, gridCols: 5, totalPairs: 5, previewTimeMs: 11000, parTimeSeconds: 40, timeLimitSeconds: 65, difficultyMultiplier: 1.6, swapAfterPreviewCount: 3, periodicSwapInterval: 4, periodicSwapPairs: 1, difficultyTier: 'hard' },
    29: { level: 29, gridCols: 4, totalPairs: 6, previewTimeMs: 12000, parTimeSeconds: 45, timeLimitSeconds: 75, difficultyMultiplier: 1.65, swapAfterPreviewCount: 3, periodicSwapInterval: 4, periodicSwapPairs: 1, difficultyTier: 'hard' },
    30: { level: 30, gridCols: 4, totalPairs: 6, previewTimeMs: 11000, parTimeSeconds: 45, timeLimitSeconds: 70, difficultyMultiplier: 1.65, swapAfterPreviewCount: 3, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'hard' },
    31: { level: 31, gridCols: 4, totalPairs: 6, previewTimeMs: 10000, parTimeSeconds: 45, timeLimitSeconds: 65, difficultyMultiplier: 1.7, swapAfterPreviewCount: 4, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'hard' },
    32: { level: 32, gridCols: 5, totalPairs: 7, previewTimeMs: 14000, parTimeSeconds: 55, timeLimitSeconds: 85, difficultyMultiplier: 1.7, swapAfterPreviewCount: 4, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'hard' },
    33: { level: 33, gridCols: 5, totalPairs: 7, previewTimeMs: 13000, parTimeSeconds: 55, timeLimitSeconds: 80, difficultyMultiplier: 1.75, swapAfterPreviewCount: 4, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'hard' },
    34: { level: 34, gridCols: 5, totalPairs: 7, previewTimeMs: 12000, parTimeSeconds: 55, timeLimitSeconds: 75, difficultyMultiplier: 1.75, swapAfterPreviewCount: 5, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'hard' },
    35: { level: 35, gridCols: 5, totalPairs: 7, previewTimeMs: 11000, parTimeSeconds: 55, timeLimitSeconds: 75, difficultyMultiplier: 1.8, swapAfterPreviewCount: 5, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'hard' },

    // --- PHASE 5: MASTERY (Everything Together) --- Levels 36-45
    // Focus: Hard Variations + Shuffling + Periodic Swaps. Tutorial at level 36.
    36: { level: 36, gridCols: 5, totalPairs: 5, previewTimeMs: 12000, parTimeSeconds: 45, timeLimitSeconds: 70, difficultyMultiplier: 1.85, useHardVariations: true, swapAfterPreviewCount: 2, difficultyTier: 'nightmare' },
    37: { level: 37, gridCols: 5, totalPairs: 5, previewTimeMs: 11000, parTimeSeconds: 45, timeLimitSeconds: 65, difficultyMultiplier: 1.85, useHardVariations: true, swapAfterPreviewCount: 3, difficultyTier: 'nightmare' },
    38: { level: 38, gridCols: 4, totalPairs: 6, previewTimeMs: 13000, parTimeSeconds: 50, timeLimitSeconds: 75, difficultyMultiplier: 1.9, useHardVariations: true, swapAfterPreviewCount: 3, difficultyTier: 'nightmare' },
    39: { level: 39, gridCols: 4, totalPairs: 6, previewTimeMs: 12000, parTimeSeconds: 50, timeLimitSeconds: 70, difficultyMultiplier: 1.9, useHardVariations: true, swapAfterPreviewCount: 4, periodicSwapInterval: 4, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    40: { level: 40, gridCols: 4, totalPairs: 6, previewTimeMs: 11000, parTimeSeconds: 50, timeLimitSeconds: 65, difficultyMultiplier: 1.95, useHardVariations: true, swapAfterPreviewCount: 4, periodicSwapInterval: 4, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    41: { level: 41, gridCols: 5, totalPairs: 7, previewTimeMs: 15000, parTimeSeconds: 60, timeLimitSeconds: 90, difficultyMultiplier: 1.95, useHardVariations: true, swapAfterPreviewCount: 4, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    42: { level: 42, gridCols: 5, totalPairs: 7, previewTimeMs: 14000, parTimeSeconds: 60, timeLimitSeconds: 85, difficultyMultiplier: 2.0, useHardVariations: true, swapAfterPreviewCount: 5, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    43: { level: 43, gridCols: 4, totalPairs: 8, previewTimeMs: 18000, parTimeSeconds: 70, timeLimitSeconds: 100, difficultyMultiplier: 2.0, useHardVariations: true, swapAfterPreviewCount: 5, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    44: { level: 44, gridCols: 4, totalPairs: 8, previewTimeMs: 16000, parTimeSeconds: 70, timeLimitSeconds: 95, difficultyMultiplier: 2.1, useHardVariations: true, swapAfterPreviewCount: 6, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    45: { level: 45, gridCols: 4, totalPairs: 8, previewTimeMs: 15000, parTimeSeconds: 70, timeLimitSeconds: 90, difficultyMultiplier: 2.2, useHardVariations: true, swapAfterPreviewCount: 6, periodicSwapInterval: 2, periodicSwapPairs: 1, difficultyTier: 'nightmare' }
};
