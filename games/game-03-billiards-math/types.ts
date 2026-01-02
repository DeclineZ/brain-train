export interface BilliardsLevelConfig {
  level: number;
  operations: '+' | '-' | 'mixed';
  numberRange: { min: number; max: number };
  equationComplexity: 'simple' | 'mixed' | 'complex';
  timeLimitSeconds: number;
  difficultyMultiplier: number;
  starRequirements: {
    threeStars: number;  // Time requirement in seconds
    twoStars: number;   // Time requirement in seconds
  };
}

export interface Equation {
  leftOperand1: number;
  operator: '+' | '-';
  leftOperand2: number;
  result: number;
  displayText: string;
}

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
