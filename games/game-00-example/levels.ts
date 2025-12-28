import type { MemoryLevelConfig } from '@/types';

export const MEMORY_LEVELS: Record<number, MemoryLevelConfig> = {
  1: { level: 1, gridCols: 3, gridRows: 2, totalPairs: 3, timeLimitSeconds: 30, difficultyMultiplier: 1.0 },
  2: { level: 2, gridCols: 4, gridRows: 3, totalPairs: 6, timeLimitSeconds: 45, difficultyMultiplier: 1.2 },
  3: { level: 3, gridCols: 4, gridRows: 4, totalPairs: 8, timeLimitSeconds: 60, difficultyMultiplier: 1.5 },
};
