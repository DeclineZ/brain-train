import type { BilliardsLevelConfig } from './types';

// 60 progressive levels for Billiards Math Game
// Levels 1-10: Introduction to Addition
// Levels 11-20: Addition Mastery  
// Levels 21-30: Subtraction Introduction
// Levels 31-40: Mixed Operations
// Levels 41-50: Advanced Operations
// Levels 51-60: Mastery Challenge

export const BILLIARDS_LEVELS: { [key: number]: BilliardsLevelConfig } = {
  // Tutorial Level
  0: {
    level: 0,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 999,
    difficultyMultiplier: 1.0,
    totalEquations: 3,
    starRequirements: { threeStars: 999, twoStars: 999 }
  },

  // Levels 1-10: Introduction to Addition
  1: {
    level: 1,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.0,
    totalEquations: 1,
    starRequirements: { threeStars: 20, twoStars: 25 }
  },
  2: {
    level: 2,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.0,
    totalEquations: 1,
    starRequirements: { threeStars: 20, twoStars: 25 },
    layoutConfig: {
      hazardCount: { min: 0, max: 0 },
      obstacleCount: { min: 1, max: 2 },
      decoyCount: 3
    }
  },
  3: {
    level: 3,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.1,
    totalEquations: 1,
    starRequirements: { threeStars: 18, twoStars: 22 }
  },
  4: {
    level: 4,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.1,
    totalEquations: 1,
    starRequirements: { threeStars: 18, twoStars: 22 }
  },
  5: {
    level: 5,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.2,
    totalEquations: 1,
    starRequirements: { threeStars: 17, twoStars: 21 }
  },
  6: {
    level: 6,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.2,
    totalEquations: 1,
    starRequirements: { threeStars: 17, twoStars: 21 }
  },
  7: {
    level: 7,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.3,
    totalEquations: 1,
    starRequirements: { threeStars: 16, twoStars: 20 }
  },
  8: {
    level: 8,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.3,
    totalEquations: 1,
    starRequirements: { threeStars: 16, twoStars: 20 }
  },
  9: {
    level: 9,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.4,
    totalEquations: 1,
    starRequirements: { threeStars: 15, twoStars: 19 }
  },
  10: {
    level: 10,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.4,
    totalEquations: 1,
    starRequirements: { threeStars: 15, twoStars: 19 }
  },

  // Levels 11-20: Addition Mastery
  11: {
    level: 11,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.5,
    totalEquations: 2,
    starRequirements: { threeStars: 18, twoStars: 22 }
  },
  12: {
    level: 12,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.5,
    totalEquations: 2,
    starRequirements: { threeStars: 18, twoStars: 22 }
  },
  13: {
    level: 13,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.6,
    totalEquations: 2,
    starRequirements: { threeStars: 17, twoStars: 21 }
  },
  14: {
    level: 14,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.6,
    totalEquations: 2,
    starRequirements: { threeStars: 17, twoStars: 21 }
  },
  15: {
    level: 15,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.7,
    totalEquations: 2,
    starRequirements: { threeStars: 16, twoStars: 20 }
  },
  16: {
    level: 16,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.7,
    totalEquations: 2,
    starRequirements: { threeStars: 16, twoStars: 20 }
  },
  17: {
    level: 17,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.8,
    totalEquations: 2,
    starRequirements: { threeStars: 15, twoStars: 19 }
  },
  18: {
    level: 18,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.8,
    totalEquations: 2,
    starRequirements: { threeStars: 15, twoStars: 19 }
  },
  19: {
    level: 19,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.9,
    totalEquations: 2,
    starRequirements: { threeStars: 14, twoStars: 18 }
  },
  20: {
    level: 20,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.9,
    totalEquations: 2,
    starRequirements: { threeStars: 14, twoStars: 18 }
  },

  // Levels 21-30: Subtraction Introduction
  21: {
    level: 21,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.0,
    totalEquations: 3,
    starRequirements: { threeStars: 18, twoStars: 22 }
  },
  22: {
    level: 22,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.0,
    totalEquations: 3,
    starRequirements: { threeStars: 18, twoStars: 22 }
  },
  23: {
    level: 23,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.1,
    totalEquations: 3,
    starRequirements: { threeStars: 17, twoStars: 21 }
  },
  24: {
    level: 24,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.1,
    totalEquations: 3,
    starRequirements: { threeStars: 17, twoStars: 21 }
  },
  25: {
    level: 25,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.2,
    totalEquations: 3,
    starRequirements: { threeStars: 16, twoStars: 20 }
  },
  26: {
    level: 26,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.2,
    totalEquations: 3,
    starRequirements: { threeStars: 16, twoStars: 20 }
  },
  27: {
    level: 27,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.3,
    totalEquations: 3,
    starRequirements: { threeStars: 15, twoStars: 19 }
  },
  28: {
    level: 28,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.3,
    totalEquations: 3,
    starRequirements: { threeStars: 15, twoStars: 19 }
  },
  29: {
    level: 29,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.4,
    totalEquations: 3,
    starRequirements: { threeStars: 14, twoStars: 18 }
  },
  30: {
    level: 30,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.4,
    totalEquations: 3,
    starRequirements: { threeStars: 14, twoStars: 18 }
  },

  // Levels 31-40: Mixed Operations
  31: {
    level: 31,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.5,
    totalEquations: 3,
    starRequirements: { threeStars: 16, twoStars: 20 }
  },
  32: {
    level: 32,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.5,
    totalEquations: 3,
    starRequirements: { threeStars: 16, twoStars: 20 }
  },
  33: {
    level: 33,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.6,
    totalEquations: 3,
    starRequirements: { threeStars: 15, twoStars: 19 }
  },
  34: {
    level: 34,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.6,
    totalEquations: 3,
    starRequirements: { threeStars: 15, twoStars: 19 }
  },
  35: {
    level: 35,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.7,
    totalEquations: 4,
    starRequirements: { threeStars: 14, twoStars: 18 }
  },
  36: {
    level: 36,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.7,
    totalEquations: 4,
    starRequirements: { threeStars: 14, twoStars: 18 }
  },
  37: {
    level: 37,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.8,
    totalEquations: 4,
    starRequirements: { threeStars: 13, twoStars: 17 }
  },
  38: {
    level: 38,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.8,
    totalEquations: 4,
    starRequirements: { threeStars: 13, twoStars: 17 }
  },
  39: {
    level: 39,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.9,
    totalEquations: 4,
    starRequirements: { threeStars: 12, twoStars: 16 }
  },
  40: {
    level: 40,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.9,
    totalEquations: 4,
    starRequirements: { threeStars: 12, twoStars: 16 }
  },

  // Levels 41-50: Advanced Operations (include * and /)
  41: {
    level: 41,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.0,
    totalEquations: 4,
    starRequirements: { threeStars: 14, twoStars: 18 }
  },
  42: {
    level: 42,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.0,
    totalEquations: 4,
    starRequirements: { threeStars: 14, twoStars: 18 }
  },
  43: {
    level: 43,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.1,
    totalEquations: 4,
    starRequirements: { threeStars: 13, twoStars: 17 }
  },
  44: {
    level: 44,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.1,
    totalEquations: 4,
    starRequirements: { threeStars: 13, twoStars: 17 }
  },
  45: {
    level: 45,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.2,
    totalEquations: 4,
    starRequirements: { threeStars: 12, twoStars: 16 }
  },
  46: {
    level: 46,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.2,
    totalEquations: 4,
    starRequirements: { threeStars: 12, twoStars: 16 }
  },
  47: {
    level: 47,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.3,
    totalEquations: 4,
    starRequirements: { threeStars: 11, twoStars: 15 }
  },
  48: {
    level: 48,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.3,
    totalEquations: 4,
    starRequirements: { threeStars: 11, twoStars: 15 }
  },
  49: {
    level: 49,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.4,
    totalEquations: 4,
    starRequirements: { threeStars: 10, twoStars: 14 }
  },
  50: {
    level: 50,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.4,
    totalEquations: 4,
    starRequirements: { threeStars: 10, twoStars: 14 }
  },

  // Levels 51-60: Mastery Challenge
  51: {
    level: 51,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.5,
    totalEquations: 5,
    starRequirements: { threeStars: 12, twoStars: 16 }
  },
  52: {
    level: 52,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.5,
    totalEquations: 5,
    starRequirements: { threeStars: 12, twoStars: 16 }
  },
  53: {
    level: 53,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.6,
    totalEquations: 5,
    starRequirements: { threeStars: 11, twoStars: 15 }
  },
  54: {
    level: 54,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.6,
    totalEquations: 5,
    starRequirements: { threeStars: 11, twoStars: 15 }
  },
  55: {
    level: 55,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.7,
    totalEquations: 5,
    starRequirements: { threeStars: 10, twoStars: 14 }
  },
  56: {
    level: 56,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.7,
    totalEquations: 5,
    starRequirements: { threeStars: 10, twoStars: 14 }
  },
  57: {
    level: 57,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.8,
    totalEquations: 5,
    starRequirements: { threeStars: 9, twoStars: 13 }
  },
  58: {
    level: 58,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.8,
    totalEquations: 5,
    starRequirements: { threeStars: 9, twoStars: 13 }
  },
  59: {
    level: 59,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.9,
    totalEquations: 5,
    starRequirements: { threeStars: 8, twoStars: 12 }
  },
  60: {
    level: 60,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 90,
    difficultyMultiplier: 3.9,
    totalEquations: 5,
    starRequirements: { threeStars: 8, twoStars: 12 }
  }
};
