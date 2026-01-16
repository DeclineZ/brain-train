import { LevelGenerator } from './utils/LevelGenerator';
import { FloatingBallMathLevelConfig } from './types';

// Generate all 50 levels
export const FLOATING_BALL_MATH_LEVELS: Record<number, FloatingBallMathLevelConfig> =
  LevelGenerator.generateAllLevels();