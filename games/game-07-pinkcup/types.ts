// Grid Configuration
export interface GridConfig {
  cols: number;
  rows: number;
  cellSize: number;
  gap: number;
}

// Memory Element Types (extensible)
export type MemoryElementType = 'number' | 'color' | 'shape' | 'pattern' | 'emoji';

export interface MemoryElement {
  type: MemoryElementType;
  value: any;
  displayConfig?: any;
}

// Cup Types (extensible)
export type CupType = 'normal' | 'pink' | 'obstacle' | 'teleporter' | 'mover';

export interface Cup {
  id: string;
  type: CupType;
  position: {x: number, y: number};
  memoryElement: MemoryElement;
  specialAbility?: any;
}

// Probe Types (extensible)
export type ProbeType = 'single_cell' | 'multiple_cells' | 'sequence' | 'position_change';

export interface MemoryProbe {
  type: ProbeType;
  cells: Array<{x: number, y: number}>;
  expectedAnswer: any;
  timeLimit?: number;
}

// Move Tracking
export interface MoveRecord {
  timestamp: number;
  from: {x: number, y: number};
  to: {x: number, y: number};
  valid: boolean;
  distanceToTarget: number;
  backtracked: boolean;
}

// Memory Probe Record
export interface ProbeRecord {
  cell: {x: number, y: number};
  probeTime: number;
  answerTime: number;
  correct: boolean;
  playerAnswer?: any;
  correctAnswer?: any;
}

// Game Modes (extensible)
export type GameMode = 'classic' | 'time_attack' | 'memory_focus' | 'planning_focus';

// Level Configuration (scalable)
export interface PinkCupLevelConfig {
  level: number;
  
  // Grid (scalable)
  gridCols: number;
  gridRows: number;

  // Numbered tiles (optional override)
  // If omitted, defaults to all tiles except one empty cell
  numberedTilesCount?: number;
  
  // Timing
  revealDurationMs: number;
  timeLimitSeconds: number;
  parTimeSeconds: number;
  
  // Memory (extensible)
  memoryType: MemoryElementType;
  probeType: ProbeType;
  probeCount: number;
  showProbeImmediately: boolean;
  
  // Difficulty
  difficultyMultiplier: number;
  
  // Mechanics (future)
  enableObstacles?: boolean;
  enableMovingTarget?: boolean;
  enableSpecialCups?: boolean;
  swapInterval?: number;
  swapCount?: number;
  
  // Game mode
  mode?: GameMode;
}

// Cup Data (internal use)
export interface CupData {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  shadow: Phaser.GameObjects.Arc;
  hitZone: Phaser.GameObjects.Arc;
  position: {x: number, y: number};
  memoryValue: number;
  isPink: boolean;
  baseScale: number;
}

// Tile Data (internal use)
export interface TileData {
  rectangle: Phaser.GameObjects.Rectangle;
  numberText: Phaser.GameObjects.Text | null;
  hasNumber: boolean;
  numberValue: number | null;
  position: {x: number, y: number};
}

// Round Telemetry (analytics-ready)
export interface RoundTelemetry {
  // Basic info
  level: number;
  mode: GameMode;
  
  // Initial state
  targetCell: {x: number, y: number};
  pinkStart: {x: number, y: number};
  
  // Timing
  t_start: number;
  t_end: number;
  
  // Full move history
  moves: MoveRecord[];
  
  // Memory reveal
  reveal: {
    start: number;
    end: number;
    elements: {[cell: string]: number};
  };
  
  // Probes
  probes: ProbeRecord[];
  
  // Calculated metrics
  metrics: {
    spatial: SpatialMetrics;
    memory: MemoryMetrics;
    speed: SpeedMetrics;
    planning: PlanningMetrics;
  };
}

// Spatial Metrics
export interface SpatialMetrics {
  goodMoveRate: number;
  pathDirectness: number;
  score: number;
}

// Memory Metrics
export interface MemoryMetrics {
  recallAccuracy: number;
  avgRecallRTMs: number;
  score: number;
}

// Speed Metrics
export interface SpeedMetrics {
  RT_firstMs: number;
  meanInterMoveRT: number;
  completionTimeMs: number;
  score: number;
}

// Planning Metrics
export interface PlanningMetrics {
  optimalMoves: number;
  movesTaken: number;
  detourMoves: number;
  backtrackCount: number;
  score: number;
}
