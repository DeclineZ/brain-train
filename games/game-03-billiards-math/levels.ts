import type { BilliardsLevelConfig } from './types';

export const BILLIARDS_LEVELS: { [key: number]: BilliardsLevelConfig } = {
  // Tutorial Level
  0: {
    level: 0,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 999,
    difficultyMultiplier: 1.0,
    totalEquations: 2,
    starRequirements: { threeStars: 999, twoStars: 999 },
    shotLimit: 99,
    perEquationTimeSeconds: 999
  },

  1: {
    level: 1,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.0,
    totalEquations: 1,
    starRequirements: { threeStars: 20, twoStars: 30 },
    shotLimit: 20,
    perEquationTimeSeconds: 999
  },
  2: {
    level: 2,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.1,
    totalEquations: 1,
    starRequirements: { threeStars: 20, twoStars: 30 },
    shotLimit: 20,
    perEquationTimeSeconds: 999,
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
    difficultyMultiplier: 1.2,
    totalEquations: 1,
    starRequirements: { threeStars: 18, twoStars: 28 },
    shotLimit: 20,
    perEquationTimeSeconds: 999
  },
  4: {
    level: 4,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.3,
    totalEquations: 2,
    starRequirements: { threeStars: 35, twoStars: 50 },
    shotLimit: 20,
    perEquationTimeSeconds: 999
  },
  5: {
    level: 5,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.4,
    totalEquations: 2,
    starRequirements: { threeStars: 32, twoStars: 48 },
    shotLimit: 18,
    perEquationTimeSeconds: 999
  },
  6: {
    level: 6,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.5,
    totalEquations: 2,
    starRequirements: { threeStars: 30, twoStars: 45 },
    shotLimit: 18,
    perEquationTimeSeconds: 999
  },
  7: {
    level: 7,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.6,
    totalEquations: 2,
    starRequirements: { threeStars: 28, twoStars: 42 },
    shotLimit: 18,
    perEquationTimeSeconds: 999
  },
  8: {
    level: 8,
    operations: '+',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.7,
    totalEquations: 2,
    starRequirements: { threeStars: 26, twoStars: 40 },
    shotLimit: 18,
    perEquationTimeSeconds: 999
  },

  // ============================================
  // PHASE 2: Foundation (Levels 9-16)
  // Addition & Subtraction, 2-3 equations, 16 shots
  // ============================================
  9: {
    level: 9,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.8,
    totalEquations: 2,
    starRequirements: { threeStars: 30, twoStars: 45 },
    shotLimit: 16,
    perEquationTimeSeconds: 999
  },
  10: {
    level: 10,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 1.9,
    totalEquations: 2,
    starRequirements: { threeStars: 28, twoStars: 42 },
    shotLimit: 16,
    perEquationTimeSeconds: 999
  },
  11: {
    level: 11,
    operations: '-',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.0,
    totalEquations: 3,
    starRequirements: { threeStars: 40, twoStars: 55 },
    shotLimit: 16,
    perEquationTimeSeconds: 999
  },
  12: {
    level: 12,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.1,
    totalEquations: 3,
    starRequirements: { threeStars: 38, twoStars: 52 },
    shotLimit: 16,
    perEquationTimeSeconds: 999
  },
  13: {
    level: 13,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'simple',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.2,
    totalEquations: 3,
    starRequirements: { threeStars: 36, twoStars: 50 },
    shotLimit: 16,
    perEquationTimeSeconds: 999
  },
  14: {
    level: 14,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.3,
    totalEquations: 3,
    starRequirements: { threeStars: 34, twoStars: 48 },
    shotLimit: 15,
    perEquationTimeSeconds: 999
  },
  15: {
    level: 15,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.4,
    totalEquations: 3,
    starRequirements: { threeStars: 32, twoStars: 46 },
    shotLimit: 15,
    perEquationTimeSeconds: 999
  },
  16: {
    level: 16,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 90,
    difficultyMultiplier: 2.5,
    totalEquations: 3,
    starRequirements: { threeStars: 30, twoStars: 44 },
    shotLimit: 15,
    perEquationTimeSeconds: 999
  },

  // ============================================
  // PHASE 3: Challenge (Levels 17-28)
  // Mixed operations, 3 equations, 14 shots
  // ============================================
  17: {
    level: 17,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 100,
    difficultyMultiplier: 2.6,
    totalEquations: 3,
    starRequirements: { threeStars: 35, twoStars: 50 },
    shotLimit: 14,
    perEquationTimeSeconds: 999
  },
  18: {
    level: 18,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'mixed',
    timeLimitSeconds: 100,
    difficultyMultiplier: 2.7,
    totalEquations: 3,
    starRequirements: { threeStars: 33, twoStars: 48 },
    shotLimit: 14,
    perEquationTimeSeconds: 999
  },
  19: {
    level: 19,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 2.8,
    totalEquations: 3,
    starRequirements: { threeStars: 32, twoStars: 46 },
    shotLimit: 14,
    perEquationTimeSeconds: 999
  },
  20: {
    level: 20,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 2.9,
    totalEquations: 3,
    starRequirements: { threeStars: 30, twoStars: 44 },
    shotLimit: 14,
    perEquationTimeSeconds: 999
  },
  21: {
    level: 21,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 3.0,
    totalEquations: 3,
    starRequirements: { threeStars: 28, twoStars: 42 },
    shotLimit: 14,
    perEquationTimeSeconds: 999
  },
  22: {
    level: 22,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 3.1,
    totalEquations: 3,
    starRequirements: { threeStars: 27, twoStars: 40 },
    shotLimit: 14,
    perEquationTimeSeconds: 999
  },
  23: {
    level: 23,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 3.2,
    totalEquations: 3,
    starRequirements: { threeStars: 26, twoStars: 38 },
    shotLimit: 14,
    perEquationTimeSeconds: 999
  },
  24: {
    level: 24,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 3.3,
    totalEquations: 3,
    starRequirements: { threeStars: 25, twoStars: 36 },
    shotLimit: 13,
    perEquationTimeSeconds: 999
  },
  25: {
    level: 25,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 3.4,
    totalEquations: 3,
    starRequirements: { threeStars: 24, twoStars: 35 },
    shotLimit: 13,
    perEquationTimeSeconds: 999
  },
  26: {
    level: 26,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 3.5,
    totalEquations: 3,
    starRequirements: { threeStars: 23, twoStars: 34 },
    shotLimit: 13,
    perEquationTimeSeconds: 999
  },
  27: {
    level: 27,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 3.6,
    totalEquations: 3,
    starRequirements: { threeStars: 22, twoStars: 33 },
    shotLimit: 13,
    perEquationTimeSeconds: 999
  },
  28: {
    level: 28,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 3.7,
    totalEquations: 3,
    starRequirements: { threeStars: 21, twoStars: 32 },
    shotLimit: 13,
    perEquationTimeSeconds: 999
  },

  // ============================================
  // PHASE 4: Mastery (Levels 29-40)
  // All operations, 3 equations, 12 shots
  // ============================================
  29: {
    level: 29,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 3.8,
    totalEquations: 3,
    starRequirements: { threeStars: 28, twoStars: 40 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  },
  30: {
    level: 30,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 3.9,
    totalEquations: 3,
    starRequirements: { threeStars: 27, twoStars: 38 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  },
  31: {
    level: 31,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 4.0,
    totalEquations: 3,
    starRequirements: { threeStars: 26, twoStars: 36 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  },
  32: {
    level: 32,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 4.1,
    totalEquations: 3,
    starRequirements: { threeStars: 25, twoStars: 35 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  },
  33: {
    level: 33,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 4.2,
    totalEquations: 3,
    starRequirements: { threeStars: 24, twoStars: 34 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  },
  34: {
    level: 34,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 4.3,
    totalEquations: 3,
    starRequirements: { threeStars: 23, twoStars: 33 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  },
  35: {
    level: 35,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 4.4,
    totalEquations: 3,
    starRequirements: { threeStars: 22, twoStars: 32 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  },
  36: {
    level: 36,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 4.5,
    totalEquations: 3,
    starRequirements: { threeStars: 21, twoStars: 31 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  },
  37: {
    level: 37,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 4.6,
    totalEquations: 3,
    starRequirements: { threeStars: 20, twoStars: 30 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  },
  38: {
    level: 38,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 4.7,
    totalEquations: 3,
    starRequirements: { threeStars: 19, twoStars: 29 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  },
  39: {
    level: 39,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 4.8,
    totalEquations: 3,
    starRequirements: { threeStars: 18, twoStars: 28 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  },
  40: {
    level: 40,
    operations: 'mixed',
    numberRange: { min: 1, max: 10 },
    equationComplexity: 'complex',
    timeLimitSeconds: 100,
    difficultyMultiplier: 5.0,
    totalEquations: 3,
    starRequirements: { threeStars: 17, twoStars: 27 },
    shotLimit: 12,
    perEquationTimeSeconds: 999
  }
};
