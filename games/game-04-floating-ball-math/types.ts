export type BallColor = 'coral' | 'mint' | 'yellow' | 'lavender';
export type Operation = '+' | '-' | '*' | '/';

export interface FloatingBall {
  id: string;
  value: number;
  color: BallColor;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  wavePhase: number;
  isSelected: boolean;
  container: Phaser.GameObjects.Container | null;
  isDemo?: boolean; // Optional property for tutorial balls
}

export interface Equation {
  target: number;
  operation: Operation;
  correctPair: [number, number];
  allNumbers: number[];
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
