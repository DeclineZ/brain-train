import type { MatchingLevelConfig } from '@/types';

// Level | Pairs | Preview Time | Countdown Time  | Focus
// 1     | 2     | Long         | Very generous   | Learning
// 2     | 3     | Medium       | Generous        | Memory
// 3     | 3     | Short        | Medium          | Speed
// 4     | 4     | Medium       | Medium          | Complexity
// 5     | 4     | Short        | Short           | Pressure
// 6     | 4     | Very short   | Very short      | High pressure
// 7     | 4     | Minimal      | Extremely tight | Mastery

export const MATCHING_LEVELS: { [key: number]: MatchingLevelConfig } = {
    0: {
        level: 0,
        gridCols: 3, // 3x2 (Landscape) or 2x3 (Portrait)
        totalPairs: 3, // 6 Cards total
        previewTimeMs: 999999, // Infinite (Manual)
        parTimeSeconds: 999,
        timeLimitSeconds: 999,
        difficultyMultiplier: 1.0
    },
    1: {
        level: 1,
        gridCols: 2, // 2x2
        totalPairs: 2,
        previewTimeMs: 8000,
        parTimeSeconds: 10,
        timeLimitSeconds: 60, // Very generous
        difficultyMultiplier: 1.0
    },
    2: {
        level: 2,
        gridCols: 3, // 3x2
        totalPairs: 3,
        previewTimeMs: 6000,
        parTimeSeconds: 15,
        timeLimitSeconds: 45,
        difficultyMultiplier: 1.0
    },
    3: {
        level: 3,
        gridCols: 3, // 3x2
        totalPairs: 3,
        previewTimeMs: 5000,
        parTimeSeconds: 15,
        timeLimitSeconds: 40,
        difficultyMultiplier: 1.05
    },
    4: {
        level: 4,
        gridCols: 4, // 4x2
        totalPairs: 4,
        previewTimeMs: 6000, // Back to medium as complexity increases
        parTimeSeconds: 20,
        timeLimitSeconds: 40,
        difficultyMultiplier: 1.05
    },
    5: {
        level: 5,
        gridCols: 4, // 4x2
        totalPairs: 4,
        previewTimeMs: 5000,
        parTimeSeconds: 20,
        timeLimitSeconds: 35,
        difficultyMultiplier: 1.1
    },
    6: {
        level: 6,
        gridCols: 4, // 4x2
        totalPairs: 4,
        previewTimeMs: 4000,
        parTimeSeconds: 15,
        timeLimitSeconds: 30, // Relaxed from 10s
        difficultyMultiplier: 1.1,
        swapAfterPreviewCount: 2 // Intro to swaps
    },
    7: {
        level: 7,
        gridCols: 4, // 4x2
        totalPairs: 4,
        previewTimeMs: 3500, // Relaxed from 1200ms
        parTimeSeconds: 15,
        timeLimitSeconds: 25, // Relaxed from 8s
        difficultyMultiplier: 1.15,
        swapAfterPreviewCount: 2
    },
    8: {
        level: 8,
        gridCols: 3, // 3x2
        totalPairs: 3,
        previewTimeMs: 6000,
        parTimeSeconds: 20,
        timeLimitSeconds: 40,
        difficultyMultiplier: 1.15,
        swapAfterPreviewCount: 2 // Swap 1 pair
    },
    9: {
        level: 9,
        gridCols: 4, // 4x2
        totalPairs: 4,
        previewTimeMs: 7000,
        parTimeSeconds: 25,
        timeLimitSeconds: 50,
        difficultyMultiplier: 1.2,
        swapAfterPreviewCount: 2
    },
    10: {
        level: 10,
        gridCols: 4, // 4x2
        totalPairs: 4,
        previewTimeMs: 7000,
        parTimeSeconds: 25,
        timeLimitSeconds: 50,
        difficultyMultiplier: 1.2,
        swapAfterPreviewCount: 4 // Swap 2 pairs
    },
    11: {
        level: 11,
        gridCols: 5, // 5x2
        totalPairs: 5,
        previewTimeMs: 8000,
        parTimeSeconds: 30,
        timeLimitSeconds: 60,
        difficultyMultiplier: 1.25,
        swapAfterPreviewCount: 4
    },
    12: {
        level: 12,
        gridCols: 4, // 4x3
        totalPairs: 6,
        previewTimeMs: 10000,
        parTimeSeconds: 40,
        timeLimitSeconds: 80,
        difficultyMultiplier: 1.25,
        swapAfterPreviewCount: 6 // Chaos
    },
    // --- PHASE 3: MASTERING CONFUSION (Levels 13-18) ---
    // Focus: Reduced pairs (5) to accommodate the introduction of Periodic Swaps.
    13: {
        level: 13,
        gridCols: 5, // 5x2 (10 Cards)
        totalPairs: 5,
        previewTimeMs: 10000,
        parTimeSeconds: 40,
        timeLimitSeconds: 80,
        difficultyMultiplier: 1.3,
        swapAfterPreviewCount: 4,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    14: {
        level: 14,
        gridCols: 5,
        totalPairs: 5,
        previewTimeMs: 11000,
        parTimeSeconds: 40,
        timeLimitSeconds: 85,
        difficultyMultiplier: 1.3,
        swapAfterPreviewCount: 4,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    15: {
        level: 15,
        gridCols: 5,
        totalPairs: 5,
        previewTimeMs: 11000,
        parTimeSeconds: 40,
        timeLimitSeconds: 85,
        difficultyMultiplier: 1.35,
        swapAfterPreviewCount: 6,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    16: {
        level: 16,
        gridCols: 5,
        totalPairs: 5,
        previewTimeMs: 12000,
        parTimeSeconds: 45,
        timeLimitSeconds: 90,
        difficultyMultiplier: 1.35,
        swapAfterPreviewCount: 6, // Intense initial swap
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    17: {
        level: 17,
        gridCols: 5,
        totalPairs: 5,
        previewTimeMs: 12000,
        parTimeSeconds: 45,
        timeLimitSeconds: 90,
        difficultyMultiplier: 1.4,
        swapAfterPreviewCount: 8,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    18: {
        level: 18,
        gridCols: 5,
        totalPairs: 5,
        previewTimeMs: 12000,
        parTimeSeconds: 45,
        timeLimitSeconds: 90,
        difficultyMultiplier: 1.4,
        swapAfterPreviewCount: 8, // Almost full shuffle
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    // --- PHASE 4: DOUBLE TROUBLE (Levels 19-24) ---
    // Focus: Balanced Challenge. Removed the "2 pair" periodic swap to keep it easier.
    19: {
        level: 19,
        gridCols: 4, // 4x3
        totalPairs: 6,
        previewTimeMs: 13000,
        parTimeSeconds: 50,
        timeLimitSeconds: 100,
        difficultyMultiplier: 1.45,
        swapAfterPreviewCount: 6,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1 // Kept at 1
    },
    20: {
        level: 20,
        gridCols: 4,
        totalPairs: 6,
        previewTimeMs: 13000,
        parTimeSeconds: 50,
        timeLimitSeconds: 100,
        difficultyMultiplier: 1.5,
        swapAfterPreviewCount: 6,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    21: {
        level: 21,
        gridCols: 4,
        totalPairs: 6,
        previewTimeMs: 13000,
        parTimeSeconds: 50,
        timeLimitSeconds: 100,
        difficultyMultiplier: 1.55,
        swapAfterPreviewCount: 8,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    22: {
        level: 22,
        gridCols: 4,
        totalPairs: 6,
        previewTimeMs: 14000,
        parTimeSeconds: 55,
        timeLimitSeconds: 110,
        difficultyMultiplier: 1.6,
        swapAfterPreviewCount: 8,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    23: {
        level: 23,
        gridCols: 4,
        totalPairs: 6,
        previewTimeMs: 14000,
        parTimeSeconds: 55,
        timeLimitSeconds: 110,
        difficultyMultiplier: 1.65,
        swapAfterPreviewCount: 10,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    24: {
        level: 24,
        gridCols: 4,
        totalPairs: 6,
        previewTimeMs: 14000,
        parTimeSeconds: 55,
        timeLimitSeconds: 110,
        difficultyMultiplier: 1.7,
        swapAfterPreviewCount: 12, // Full shuffle
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    // --- PHASE 5: GRANDMASTER (Levels 25-30) ---
    // Focus: 8 Pairs (4x4 Grid). Maximum cognitive load but single pair swaps.
    25: {
        level: 25,
        gridCols: 4, // 4x4 (16 Cards)
        totalPairs: 8,
        previewTimeMs: 15000,
        parTimeSeconds: 60,
        timeLimitSeconds: 120,
        difficultyMultiplier: 1.75,
        swapAfterPreviewCount: 8,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1 // Back to 1 pair drift to compensate for grid size
    },
    26: {
        level: 26,
        gridCols: 4,
        totalPairs: 8,
        previewTimeMs: 15000,
        parTimeSeconds: 60,
        timeLimitSeconds: 120,
        difficultyMultiplier: 1.8,
        swapAfterPreviewCount: 10,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    27: {
        level: 27,
        gridCols: 4,
        totalPairs: 8,
        previewTimeMs: 16000,
        parTimeSeconds: 65,
        timeLimitSeconds: 130,
        difficultyMultiplier: 1.85,
        swapAfterPreviewCount: 12,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    28: {
        level: 28,
        gridCols: 4,
        totalPairs: 8,
        previewTimeMs: 16000,
        parTimeSeconds: 65,
        timeLimitSeconds: 130,
        difficultyMultiplier: 1.9,
        swapAfterPreviewCount: 16, // Full shuffle
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    29: {
        level: 29,
        gridCols: 4,
        totalPairs: 8,
        previewTimeMs: 18000,
        parTimeSeconds: 70,
        timeLimitSeconds: 140,
        difficultyMultiplier: 1.95,
        swapAfterPreviewCount: 16,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    },
    30: {
        level: 30,
        gridCols: 4,
        totalPairs: 8,
        previewTimeMs: 20000, // Very generous final boss
        parTimeSeconds: 70,
        timeLimitSeconds: 140,
        difficultyMultiplier: 2.0,
        swapAfterPreviewCount: 16,
        periodicSwapInterval: 3,
        periodicSwapPairs: 1
    }
};
