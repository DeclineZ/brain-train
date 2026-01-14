export type BallColor = 'coral' | 'mint' | 'yellow' | 'lavender';
export type Operation = '+' | '-' | '*' | '/';

export interface FloatingBall {
  id: string;
  value: number;
  operator: '+' | '-' | '*' | '/';
  color: BallColor;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  wavePhase: number;
  isCollected: boolean;
  isBomb: boolean; // True if this is a bomb ball
  container: Phaser.GameObjects.Container | null;
  isDemo?: boolean; // Optional property for tutorial balls
}

export interface Floatboat {
  container: Phaser.GameObjects.Container;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface CompletedEquationStats {
  target: number;
  ballsCollected: number;
}

export interface WarningHand {
  container: Phaser.GameObjects.Container;
  targetBall: FloatingBall;
  isStealing: boolean;
  retreatDelay: number;
  defendButton: Phaser.GameObjects.Container;
}

export interface Equation {
  target: number;
  startingCurrent: number;
  operationBalls: FloatingBall[];
}

export interface FloatingBallMathLevelConfig {
  level: number;
  targetRange: { min: number; max: number };
  operandRange: { min: number; max: number };
  operations: Operation[];
  totalEquations: number;
  timeLimitSeconds: number;
  waterSpeed: number;
  waveAmplitude: number;
  difficultyMultiplier: number;
  starRequirements: {
    threeStars: number;
    twoStars: number;
    oneStar: number;
  };
}

export interface FloatingBallMathGameStats {
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
  averageReactionTime: number;
  mismatchCorrect: number;
  mismatchAttempts: number;
}
