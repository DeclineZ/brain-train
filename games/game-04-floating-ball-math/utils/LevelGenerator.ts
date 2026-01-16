import { FloatingBallMathLevelConfig, Operation } from '../types';

export class LevelGenerator {
  /**
   * Generate level configuration for any level (1-50)
   */
  static generateLevel(level: number): FloatingBallMathLevelConfig {
    // Manual configurations for levels 1-10 (introductory)
    if (level <= 10) {
      return this.generateManualLevel(level);
    }

    // Procedural generation for levels 11-50
    return this.generateProceduralLevel(level);
  }

  /**
   * Manual level configurations for levels 1-10 (Introduction - Addition with subtraction)
   */
  private static generateManualLevel(level: number): FloatingBallMathLevelConfig {
    const baseConfig: FloatingBallMathLevelConfig = {
      level,
      targetRange: { min: 5, max: 10 },
      operandRange: { min: 1, max: 5 },
      startNumberRange: { min: 1, max: 5 },
      operations: ['+'],
      operationProbabilities: { '+': 0.6, '-': 0.4 },
      totalEquations: 3,
      timeLimitSeconds: 60,
      waterSpeed: 1.0,
      waveAmplitude: 10,
      difficultyMultiplier: 1.0,
      starRequirements: {
        threeStars: 8,
        twoStars: 10,
        oneStar: 12,
      },
    };

    // Scale difficulty for levels 1-10
    if (level <= 3) {
      return {
        ...baseConfig,
        targetRange: { min: 5, max: 10 },
        operandRange: { min: 1, max: 8 },
        startNumberRange: { min: 1, max: 5 },
        operations: ['+', '-'],
        operationProbabilities: { '+': 0.9, '-': 0.1 }, // 90% +, 10% -
        totalEquations: 1,  // Reduced from 5 for easier introduction
        timeLimitSeconds: 70,  // Increased from 60 to account for ball spawning time
        waterSpeed: 0.4,
        waveAmplitude: 5,
        difficultyMultiplier: 1.0,
        starRequirements: {
          threeStars: 23,  // 70s / 3 equations = ~23s per equation (very generous)
          twoStars: 20,
          oneStar: 15,
        },
      };
    } else if (level <= 6) {
      return {
        ...baseConfig,
        targetRange: { min: 8, max: 15 },
        operandRange: { min: 1, max: 7 },
        startNumberRange: { min: 2, max: 6 },
        operations: ['+', '-'],
        operationProbabilities: { '+': 0.9, '-': 0.1 }, // 90% +, 10% -
        totalEquations: 2,  // Reduced from 5 for gradual progression
        timeLimitSeconds: 70,  // Increased from 60 to account for ball spawning time
        waterSpeed: 0.5,
        waveAmplitude: 8,
        difficultyMultiplier: 1.1,
        starRequirements: {
          threeStars: 17,  // 70s / 4 equations = ~17.5s per equation
          twoStars: 15,
          oneStar: 12,
        },
      };
    } else {
      return {
        ...baseConfig,
        targetRange: { min: 10, max: 20 },
        operandRange: { min: 2, max: 9 },
        startNumberRange: { min: 2, max: 8 },
        operations: ['+', '-'],
        operationProbabilities: { '+': 0.9, '-': 0.1 }, // 90% +, 10% -
        totalEquations: 3,  // Full set for levels 7-10
        timeLimitSeconds: 70,  // Increased from 60 to account for ball spawning time
        waterSpeed: 0.6,
        waveAmplitude: 10,
        difficultyMultiplier: 1.2,
        starRequirements: {
          threeStars: 14,  // 70s / 5 equations = 14s per equation
          twoStars: 12,
          oneStar: 10,
        },
      };
    }
  }

  /**
   * Procedural level generation for levels 11-50
   */
  private static generateProceduralLevel(level: number): FloatingBallMathLevelConfig {
    const tier = Math.ceil((level - 10) / 10); // 1-4

    const tierConfig = this.getTierConfig(tier);
    const levelProgress = ((level - 1) % 10) / 10; // 0-0.9 within tier

    return {
      level,
      targetRange: this.lerpRange(
        tierConfig.targetRange.start,
        tierConfig.targetRange.end,
        levelProgress
      ),
      operandRange: this.lerpRange(
        tierConfig.operandRange.start,
        tierConfig.operandRange.end,
        levelProgress
      ),
      startNumberRange: this.lerpRange(
        tierConfig.startNumberRange.start,
        tierConfig.startNumberRange.end,
        levelProgress
      ),
      operations: tierConfig.operations,
      operationProbabilities: tierConfig.operationProbabilities,
      totalEquations: Math.round(this.lerp(
        tierConfig.totalEquations.start,
        tierConfig.totalEquations.end,
        levelProgress
      )),
      timeLimitSeconds: 70,  // Increased from 60 to account for ball spawning time
      waterSpeed: this.lerp(tierConfig.waterSpeed.start, tierConfig.waterSpeed.end, levelProgress),
      waveAmplitude: this.lerp(tierConfig.waveAmplitude.start, tierConfig.waveAmplitude.end, levelProgress),
      difficultyMultiplier: 1 + (level * 0.02),
      starRequirements: {
        threeStars: this.lerp(tierConfig.starTime.start + 2, tierConfig.starTime.end + 2, levelProgress),  // Add 2 seconds to account for increased timer
        twoStars: this.lerp((tierConfig.starTime.start + 2) * 1.25, (tierConfig.starTime.end + 2) * 1.25, levelProgress),  // Add 2 seconds to account for increased timer
        oneStar: 12,
      },
    };
  }

  /**
   * Get tier configuration
   */
  private static getTierConfig(tier: number) {
    const tiers: Record<number, {
      targetRange: { start: { min: number; max: number }; end: { min: number; max: number } };
      operandRange: { start: { min: number; max: number }; end: { min: number; max: number } };
      startNumberRange: { start: { min: number; max: number }; end: { min: number; max: number } };
      operations: Operation[];
      operationProbabilities: Partial<Record<Operation, number>>;
      waterSpeed: { start: number; end: number };
      waveAmplitude: { start: number; end: number };
      starTime: { start: number; end: number };
      totalEquations: { start: number; end: number };
    }> = {
      1: { // Levels 11-20: Addition and subtraction
        targetRange: { start: { min: 10, max: 20 }, end: { min: 15, max: 30 } },
        operandRange: { start: { min: 3, max: 12 }, end: { min: 5, max: 15 } },
        startNumberRange: { start: { min: 3, max: 10 }, end: { min: 5, max: 15 } },
        operations: ['+', '-'],
        operationProbabilities: { '+': 0.75, '-': 0.25 }, // 75% +, 25% -
        waterSpeed: { start: 0.6, end: 0.8 },
        waveAmplitude: { start: 10, end: 15 },
        starTime: { start: 9, end: 7 },
        totalEquations: { start: 3, end: 5 },
      },
      2: { // Levels 21-30: Three operations (+, -, *)
        targetRange: { start: { min: 10, max: 25 }, end: { min: 15, max: 35 } },
        operandRange: { start: { min: 5, max: 12 }, end: { min: 8, max: 15 } },
        startNumberRange: { start: { min: 5, max: 12 }, end: { min: 8, max: 15 } },
        operations: ['+', '-', '*'],
        operationProbabilities: { '+': 0.4, '-': 0.3, '*': 0.3 }, // 40% +, 30% -, 30% *
        waterSpeed: { start: 0.7, end: 0.9 },
        waveAmplitude: { start: 12, end: 18 },
        starTime: { start: 8, end: 6 },
        totalEquations: { start: 5, end: 6 },
      },
      3: { // Levels 31-40: All operations (+, -, *, /)
        targetRange: { start: { min: 15, max: 30 }, end: { min: 20, max: 40 } },
        operandRange: { start: { min: 8, max: 15 }, end: { min: 10, max: 18 } },
        startNumberRange: { start: { min: 8, max: 15 }, end: { min: 10, max: 20 } },
        operations: ['+', '-', '*', '/'] as Operation[],
        operationProbabilities: { '+': 0.3, '-': 0.25, '*': 0.25, '/': 0.2 }, // 30% +, 25% -, 25% *, 20% /
        waterSpeed: { start: 0.8, end: 1.0 },
        waveAmplitude: { start: 15, end: 22 },
        starTime: { start: 8, end: 6 },
        totalEquations: { start: 6, end: 7 },
      },
      4: { // Levels 41-50: Expert - All operations balanced
        targetRange: { start: { min: 20, max: 40 }, end: { min: 25, max: 50 } },
        operandRange: { start: { min: 10, max: 18 }, end: { min: 12, max: 20 } },
        startNumberRange: { start: { min: 10, max: 20 }, end: { min: 12, max: 25 } },
        operations: ['+', '-', '*', '/'] as Operation[],
        operationProbabilities: { '+': 0.25, '-': 0.25, '*': 0.25, '/': 0.25 }, // 25% each operation
        waterSpeed: { start: 0.9, end: 1.2 },
        waveAmplitude: { start: 18, end: 25 },
        starTime: { start: 7, end: 5 },
        totalEquations: { start: 7, end: 7 },
      },
    };

    return tiers[tier as keyof typeof tiers];
  }

  /**
   * Linear interpolation for numbers
   */
  private static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * Linear interpolation for range objects
   */
  private static lerpRange(
    start: { min: number; max: number },
    end: { min: number; max: number },
    t: number
  ): { min: number; max: number } {
    return {
      min: Math.round(this.lerp(start.min, end.min, t)),
      max: Math.round(this.lerp(start.max, end.max, t)),
    };
  }

  /**
   * Generate all 50 levels
   */
  static generateAllLevels(): Record<number, FloatingBallMathLevelConfig> {
    const levels: Record<number, FloatingBallMathLevelConfig> = {};
    
    for (let i = 1; i <= 50; i++) {
      levels[i] = this.generateLevel(i);
    }
    
    return levels;
  }
}
