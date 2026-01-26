export interface BilliardsLevelConfig {
  level: number;
  operations: '+' | '-' | '*' | '/' | 'mixed';
  numberRange: { min: number; max: number };
  equationComplexity: 'simple' | 'mixed' | 'complex';
  timeLimitSeconds: number; // Legacy - kept for backwards compatibility
  difficultyMultiplier: number;
  totalEquations: number;
  starRequirements: {
    threeStars: number;  // Time requirement in seconds
    twoStars: number;   // Time requirement in seconds
  };
  // New pressure mechanics (older-player friendly)
  shotLimit: number;              // Max shots per equation (generous: 8-15)
  perEquationTimeSeconds: number; // Timer per equation (generous: 30-60s)
  layoutConfig?: {
    hazardCount: { min: number; max: number };
    obstacleCount: { min: number; max: number };
    decoyCount: number;
  };
}

export type ObstacleType = 'wall_h' | 'wall_v' | 'box';

export interface LayoutObstacle {
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutBall {
  value: number;
  x: number;
  y: number;
  isHazard?: boolean;
}

export interface GeneratedLayout {
  balls: LayoutBall[];
  obstacles: LayoutObstacle[];
}

// Enhanced equation types
export type Operation = '+' | '-' | '*' | '/';
export type EquationType = 'simple' | 'complex';
export type QuestionType = 'fill-in-the-blanks' | 'multiple-choice' | 'input';

export interface BaseEquation {
  type: EquationType;
  result: number;
  displayText: string;
  difficulty: number;
}

export interface SimpleEquation extends BaseEquation {
  type: 'simple';
  leftOperand: number;
  rightOperand: number;
  operator: Operation; // Changed from '+' | '-' to Operation to include all operations
  // Legacy compatibility properties
  leftOperand1?: number; // Maps to leftOperand
  leftOperand2?: number; // Maps to rightOperand
}

export interface ComplexEquation extends BaseEquation {
  type: 'complex';
  operands: number[];
  operators: Operation[];
  // Legacy compatibility properties
  requiredOperands?: number[]; // Maps to subset of operands
}

// Unified equation type for easier handling
export type Equation = SimpleEquation | ComplexEquation;

// Question system types
export interface Question {
  id: string;
  equation: Equation;
  type: QuestionType;
  options?: number[]; // For multiple choice
  requiredBalls: number[];
  maxSlots: number;
  hint?: string;
}

export interface QuestionValidation {
  isCorrect: boolean;
  feedback: string;
  expectedAnswer?: number[];
  userAnswer?: number[];
}

// Enhanced ball interface
export interface Ball {
  id: number;
  value: number;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  isDragging: boolean;
  isPlaced: boolean;
  container: Phaser.GameObjects.Container;
}

// Game statistics
export interface BilliardsGameStats {
  levelPlayed: number;
  difficultyMultiplier: number;
  totalEquations: number;
  correctEquations: number;
  wrongEquations: number;
  totalTimeMs: number;
  parTimeMs: number;
  consecutiveErrors: number;
  repeatedErrors: number;
  attempts: number;
  continuedAfterTimeout: boolean;
}

// Equation generation configuration
export interface EquationGenerationConfig {
  operations: Operation[];
  numberRange: { min: number; max: number };
  complexity: 'simple' | 'mixed' | 'complex';
  allowNegativeResults: boolean;
  allowLargeResults: boolean;
  maxResult: number;
  minResult: number;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedResult?: number;
}

// Legacy compatibility types (deprecated)
export interface LegacyComplexEquation {
  operands: number[];
  operators: ('+' | '-' | '*' | '/')[];
  result: number;
  displayText: string;
  requiredOperands: number[];
}

export interface LegacyEquation {
  leftOperand1: number;
  operator: '+' | '-';
  leftOperand2: number;
  result: number;
  displayText: string;
}
