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
  isSolvable: boolean; // True if this ball helps solve the current equation
  container: Phaser.GameObjects.Container | null;
  isDemo?: boolean; // Optional property for tutorial balls
  lane: 0 | 1 | 2; // Lane: 0=Left, 1=Center, 2=Right
  originalLane: 0 | 1 | 2; // Original lane before thief
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
  thiefPopup?: Phaser.GameObjects.Container; // Optional thief popup
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
  startNumberRange: { min: number; max: number };
  operations: Operation[];
  operationProbabilities: Partial<Record<Operation, number>>;
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
  penaltyFactor: number; // 0.7 if continuedAfterTimeout, else 1.0
  
  // Thief event tracking
  thiefEvents: number;         // Total thief appearances
  blockSuccessCount: number;   // Blocked correctly
  adaptSuccessCount: number;   // Adapted correctly
  decisionFailCount: number;    // Wrong decisions
  
  // Timing tracking
  onTimeDecisionCount: number; // Decisions in time window
  lateDecisionCount: number;   // Decisions too slow
  
  // Panic behavior tracking
  panicBlock: number;          // 3+ bad blocks in a row
  panicAdapt: number;         // 3+ bad adapts in a row
  
  // Ball interception tracking
  bombHits: number;           // Total bombs intercepted
  consecutiveErrors: number;    // Max errors in a row
  
  // Legacy fields (kept for compatibility)
  totalEquations: number;
  correctEquations: number;
  wrongEquations: number;
  totalTimeMs: number;
  attempts: number;
  continuedAfterTimeout: boolean;
}

// Track per-ball zone entry for mismatch telemetry
export interface BallZoneTracking {
  ballId: string;
  isInZone: boolean;
  isBomb: boolean;
  isBadBall: boolean;
}
