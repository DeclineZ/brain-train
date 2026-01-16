import type { MatchingLevelConfig } from '@/types';

// Level | Pairs | Preview Time | Countdown Time  | Focus
// 1     | 2     | Long         | Very generous   | Learning
// ...
// 30    | 10    | Generous     | Long            | Mastery

export const MATCHING_LEVELS: { [key: number]: MatchingLevelConfig } = {
    // --- PHASE 1: WARM UP (Basic Cards) ---
    // Focus: Simple pattern recognition, increasing count.
    0: { level: 0, gridCols: 3, totalPairs: 3, previewTimeMs: 999999, parTimeSeconds: 999, timeLimitSeconds: 999, difficultyMultiplier: 1.0, difficultyTier: 'easy' },
    1: { level: 1, gridCols: 2, totalPairs: 2, previewTimeMs: 8000, parTimeSeconds: 10, timeLimitSeconds: 60, difficultyMultiplier: 1.0, difficultyTier: 'easy' },
    2: { level: 2, gridCols: 3, totalPairs: 3, previewTimeMs: 6000, parTimeSeconds: 15, timeLimitSeconds: 45, difficultyMultiplier: 1.0, difficultyTier: 'easy' },
    3: { level: 3, gridCols: 3, totalPairs: 3, previewTimeMs: 5000, parTimeSeconds: 15, timeLimitSeconds: 40, difficultyMultiplier: 1.05, difficultyTier: 'easy' },
    4: { level: 4, gridCols: 4, totalPairs: 4, previewTimeMs: 6000, parTimeSeconds: 20, timeLimitSeconds: 40, difficultyMultiplier: 1.05, difficultyTier: 'easy' },

    // --- PHASE 2: DISCRIMINATION (Hard Variations) ---
    // Focus: Visually similar cards (Quantity, Orientation). Count fluctuates.
    5: { level: 5, gridCols: 4, totalPairs: 4, previewTimeMs: 7000, parTimeSeconds: 25, timeLimitSeconds: 45, difficultyMultiplier: 1.1, useHardVariations: true, difficultyTier: 'easy' },
    6: { level: 6, gridCols: 4, totalPairs: 4, previewTimeMs: 6000, parTimeSeconds: 25, timeLimitSeconds: 40, difficultyMultiplier: 1.1, useHardVariations: true, difficultyTier: 'normal' },
    7: { level: 7, gridCols: 3, totalPairs: 3, previewTimeMs: 5000, parTimeSeconds: 20, timeLimitSeconds: 35, difficultyMultiplier: 1.15, useHardVariations: true, difficultyTier: 'normal' }, // Drop count, harder cards
    8: { level: 8, gridCols: 3, totalPairs: 3, previewTimeMs: 4000, parTimeSeconds: 20, timeLimitSeconds: 30, difficultyMultiplier: 1.15, useHardVariations: true, difficultyTier: 'normal' },
    9: { level: 9, gridCols: 4, totalPairs: 4, previewTimeMs: 7000, parTimeSeconds: 30, timeLimitSeconds: 50, difficultyMultiplier: 1.2, useHardVariations: true, difficultyTier: 'normal' },
    10: { level: 10, gridCols: 5, totalPairs: 5, previewTimeMs: 8000, parTimeSeconds: 35, timeLimitSeconds: 60, difficultyMultiplier: 1.2, useHardVariations: true, difficultyTier: 'normal' }, // 5x2
    11: { level: 11, gridCols: 5, totalPairs: 5, previewTimeMs: 9000, parTimeSeconds: 40, timeLimitSeconds: 65, difficultyMultiplier: 1.25, useHardVariations: true, difficultyTier: 'normal' },

    // --- PHASE 3: DYNAMIC ATTENTION (Shuffling) ---
    // Focus: Basic cards matched with Movement (Pre-game & In-game shuffling).
    // REVERTED: Using swapAfterPreviewCount high values instead of full shuffle for animation quality
    // REDUCED: Lowered counts heavily per user request (too hard)
    12: { level: 12, gridCols: 4, totalPairs: 4, previewTimeMs: 10000, parTimeSeconds: 30, timeLimitSeconds: 60, difficultyMultiplier: 1.25, swapAfterPreviewCount: 2, difficultyTier: 'normal' },
    13: { level: 13, gridCols: 5, totalPairs: 5, previewTimeMs: 12000, parTimeSeconds: 40, timeLimitSeconds: 70, difficultyMultiplier: 1.3, swapAfterPreviewCount: 3, difficultyTier: 'hard' }, // 5x2
    14: { level: 14, gridCols: 4, totalPairs: 6, previewTimeMs: 14000, parTimeSeconds: 45, timeLimitSeconds: 80, difficultyMultiplier: 1.3, swapAfterPreviewCount: 3, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'hard' }, // 4x3
    15: { level: 15, gridCols: 4, totalPairs: 6, previewTimeMs: 12000, parTimeSeconds: 45, timeLimitSeconds: 80, difficultyMultiplier: 1.35, swapAfterPreviewCount: 4, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'hard' },
    16: { level: 16, gridCols: 4, totalPairs: 6, previewTimeMs: 10000, parTimeSeconds: 45, timeLimitSeconds: 75, difficultyMultiplier: 1.35, swapAfterPreviewCount: 4, periodicSwapInterval: 2, periodicSwapPairs: 1, difficultyTier: 'hard' },
    17: { level: 17, gridCols: 4, totalPairs: 8, previewTimeMs: 15000, parTimeSeconds: 60, timeLimitSeconds: 90, difficultyMultiplier: 1.4, swapAfterPreviewCount: 5, difficultyTier: 'hard' }, // 4x4
    18: { level: 18, gridCols: 4, totalPairs: 8, previewTimeMs: 14000, parTimeSeconds: 60, timeLimitSeconds: 90, difficultyMultiplier: 1.4, swapAfterPreviewCount: 5, periodicSwapInterval: 4, periodicSwapPairs: 1, difficultyTier: 'hard' },
    19: { level: 19, gridCols: 4, totalPairs: 8, previewTimeMs: 12000, parTimeSeconds: 60, timeLimitSeconds: 90, difficultyMultiplier: 1.45, swapAfterPreviewCount: 6, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'hard' },

    // --- PHASE 4: MASTERY (Everything Together) ---
    // Focus: Hard Variations + Shuffling + High Count.
    20: { level: 20, gridCols: 4, totalPairs: 4, previewTimeMs: 10000, parTimeSeconds: 40, timeLimitSeconds: 60, difficultyMultiplier: 1.5, useHardVariations: true, swapAfterPreviewCount: 2, difficultyTier: 'nightmare' },
    21: { level: 21, gridCols: 5, totalPairs: 5, previewTimeMs: 12000, parTimeSeconds: 50, timeLimitSeconds: 70, difficultyMultiplier: 1.55, useHardVariations: true, swapAfterPreviewCount: 3, difficultyTier: 'nightmare' },
    22: { level: 22, gridCols: 4, totalPairs: 6, previewTimeMs: 15000, parTimeSeconds: 60, timeLimitSeconds: 80, difficultyMultiplier: 1.6, useHardVariations: true, swapAfterPreviewCount: 4, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    23: { level: 23, gridCols: 4, totalPairs: 6, previewTimeMs: 12000, parTimeSeconds: 55, timeLimitSeconds: 75, difficultyMultiplier: 1.65, useHardVariations: true, swapAfterPreviewCount: 4, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    24: { level: 24, gridCols: 4, totalPairs: 8, previewTimeMs: 18000, parTimeSeconds: 70, timeLimitSeconds: 100, difficultyMultiplier: 1.7, useHardVariations: true, swapAfterPreviewCount: 5, difficultyTier: 'nightmare' }, // 4x4
    25: { level: 25, gridCols: 4, totalPairs: 8, previewTimeMs: 16000, parTimeSeconds: 70, timeLimitSeconds: 100, difficultyMultiplier: 1.75, useHardVariations: true, swapAfterPreviewCount: 6, periodicSwapInterval: 4, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    26: { level: 26, gridCols: 4, totalPairs: 8, previewTimeMs: 16000, parTimeSeconds: 70, timeLimitSeconds: 100, difficultyMultiplier: 1.8, useHardVariations: true, swapAfterPreviewCount: 6, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    27: { level: 27, gridCols: 5, totalPairs: 10, previewTimeMs: 20000, parTimeSeconds: 80, timeLimitSeconds: 120, difficultyMultiplier: 1.85, useHardVariations: true, swapAfterPreviewCount: 7, difficultyTier: 'nightmare' }, // 5x4
    28: { level: 28, gridCols: 5, totalPairs: 10, previewTimeMs: 18000, parTimeSeconds: 80, timeLimitSeconds: 120, difficultyMultiplier: 1.9, useHardVariations: true, swapAfterPreviewCount: 7, periodicSwapInterval: 4, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    29: { level: 29, gridCols: 5, totalPairs: 10, previewTimeMs: 16000, parTimeSeconds: 80, timeLimitSeconds: 115, difficultyMultiplier: 1.95, useHardVariations: true, swapAfterPreviewCount: 8, periodicSwapInterval: 3, periodicSwapPairs: 1, difficultyTier: 'nightmare' },
    30: { level: 30, gridCols: 5, totalPairs: 10, previewTimeMs: 15000, parTimeSeconds: 80, timeLimitSeconds: 110, difficultyMultiplier: 2.0, useHardVariations: true, swapAfterPreviewCount: 8, periodicSwapInterval: 2, periodicSwapPairs: 1, difficultyTier: 'nightmare' }
};
