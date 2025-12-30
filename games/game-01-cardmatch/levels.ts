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
        previewTimeMs: 5000,
        parTimeSeconds: 10,
        timeLimitSeconds: 30, // Very generous
        difficultyMultiplier: 1.0
    },
    2: {
        level: 2,
        gridCols: 3, // 3x2
        totalPairs: 3,
        previewTimeMs: 4000,
        parTimeSeconds: 15,
        timeLimitSeconds: 25,
        difficultyMultiplier: 1.1
    },
    3: {
        level: 3,
        gridCols: 3, // 3x2
        totalPairs: 3,
        previewTimeMs: 3000,
        parTimeSeconds: 12,
        timeLimitSeconds: 20,
        difficultyMultiplier: 1.2
    },
    4: {
        level: 4,
        gridCols: 4, // 4x2
        totalPairs: 4,
        previewTimeMs: 3500, // Back to medium as complexity increases
        parTimeSeconds: 15,
        timeLimitSeconds: 20,
        difficultyMultiplier: 1.3
    },
    5: {
        level: 5,
        gridCols: 4, // 4x2
        totalPairs: 4,
        previewTimeMs: 2500,
        parTimeSeconds: 12,
        timeLimitSeconds: 15,
        difficultyMultiplier: 1.5
    },
    6: {
        level: 6,
        gridCols: 4, // 4x2
        totalPairs: 4,
        previewTimeMs: 1500,
        parTimeSeconds: 10,
        timeLimitSeconds: 10,
        difficultyMultiplier: 1.8
    },
    7: {
        level: 7,
        gridCols: 4, // 4x2
        totalPairs: 4,
        previewTimeMs: 1200, // Minimal
        parTimeSeconds: 8,
        timeLimitSeconds: 8, // Extremely tight
        difficultyMultiplier: 2.0
    }
};
