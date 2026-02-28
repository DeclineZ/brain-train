export const DIR = {
  UP: 1,
  RIGHT: 2,
  DOWN: 4,
  LEFT: 8,
} as const;

export type DirectionName = 'up' | 'right' | 'down' | 'left';
export type ConnectionMask = number;

export interface Coord {
  x: number;
  y: number;
}

export type PipePieceType =
  | 'straight_h'
  | 'straight_v'
  | 'elbow_ur'
  | 'elbow_rd'
  | 'elbow_dl'
  | 'elbow_lu'
  | 'tee_urd'
  | 'tee_rdl'
  | 'tee_dlu'
  | 'tee_lur'
  | 'cross'
  | 'crossover';

export interface PieceDefinition {
  type: PipePieceType;
  mask: ConnectionMask;
  label: string;
  isCrossover?: boolean;
}

export interface FixedPipeConfig {
  position: Coord;
  pieceType: PipePieceType;
}

export interface LockedPlaceholderConfig {
  position: Coord;
  expectedMask: ConnectionMask;
  acceptedPieceTypes?: PipePieceType[];
}

export interface OneWayGateConfig {
  id: string;
  position: Coord;
  entry: DirectionName;
  exit: DirectionName;
}

export interface RequiredPlacement {
  position: Coord;
  pieceType: PipePieceType;
}

export interface TrayPieceConfig {
  id: string;
  pieceType: PipePieceType;
  isDecoy: boolean;
}

export interface TutorialCues {
  showGhostGuides?: boolean;
  highlightSlots?: Coord[];
}

export interface PipePatchEndpoint {
  position: Coord;
  mask: ConnectionMask;
  colorId: string;
}

export interface PipePatchEndpointGroup {
  colorId: string;
  input: PipePatchEndpoint;
  outputs: PipePatchEndpoint[];
}

export interface ManualGridLevelConfig {
  id: number;
  gridSize: number;
  grid: string[];
  parTimeMs: number;
  hardTimeMs: number;
  difficultyWeight: number;
  tutorialGhost?: boolean;
  decoyPieceCount?: number;
}

export interface PipePatchLevelConfig {
  id: number;
  gridSize: number;
  layout: string[];
  source: Coord;
  sourceMask: ConnectionMask;
  targets: PipePatchEndpoint[];
  endpointGroups: PipePatchEndpointGroup[];
  /** @deprecated Prefer `targets[0].position` */
  target: Coord;
  /** @deprecated Prefer `targets[0].mask` */
  targetMask: ConnectionMask;
  fixedPipes: FixedPipeConfig[];
  blockedCells: Coord[];
  lockedPlaceholders: LockedPlaceholderConfig[];
  oneWayGates: OneWayGateConfig[];
  requiredPlacements: RequiredPlacement[];
  trayPieces: TrayPieceConfig[];
  requiredPieceCount: number;
  decoyPieceCount: number;
  parTimeMs: number;
  hardTimeMs: number;
  difficultyWeight: number;
  tutorialCues?: TutorialCues;
}

export interface PipePatchSolvedPlacement {
  key: string; // "x,y"
  pieceType: PipePieceType;
}

export interface PipePatchSolvedLevel {
  levelId: number;
  requiredCounts: Partial<Record<PipePieceType, number>>;
  placements: PipePatchSolvedPlacement[];
  pieceTotal: number;
  endpointPieceCount: number;
  objective: 'min_piece_count_including_endpoints';
  minimalByDecrement?: boolean;
  minimalityByPieceType?: Partial<Record<PipePieceType, boolean>>;
}

export interface PipePatchSolveSummary {
  generatedAt: string;
  objective: 'min_piece_count_including_endpoints';
  levelCount: number;
  levels: PipePatchSolvedLevel[];
}

export interface RuntimePlacedPiece {
  pieceId: string;
  pieceType: PipePieceType;
  fromTray: boolean;
  placedAtMs: number;
  colorId?: ColorId; // Color inherited from connected source
}

export type PipePatchTelemetryEvent = {
  type: string;
  atMs: number;
  payload?: Record<string, unknown>;
};

export type PipePatchCompletionStatus = 'solved' | 'timeout_skip';

export interface PipePatchPerLevelMetrics {
  levelId: number;
  difficultyWeight: number;
  parTimeMs: number;
  hardTimeMs: number;
  requiredPieceCount: number;
  decoyPieceCount: number;
  optimalPlacements: number;
  solveTimeMs: number;
  activeTimeMs: number;
  firstActionLatencyMs: number;
  totalDragAttempts: number;
  validPlacementsCount: number;
  correctPlacementsOnFirstTryCount: number;
  incorrectPlacementCount: number;
  rejectedDropCount: number;
  repeatedErrorCount: number;
  beneficialActionCount: number;
  nonBeneficialActionCount: number;
  undoCount: number;
  resetCount: number;
  hintUsedCount: number;
  obstacleRejectCount: number;
  lockedSlotMismatchCount: number;
  completionStatus: PipePatchCompletionStatus;
}

export interface PipePatchGameStats {
  sessionDurationMs: number;
  levelsAttempted: number;
  levelsSolved: number;
  levelTimeoutSkips: number;
  perLevelMetrics: PipePatchPerLevelMetrics[];
  telemetryEvents: PipePatchTelemetryEvent[];
}

export interface ClinicalStats {
  stat_memory: number | null;
  stat_speed: number | null;
  stat_visual: number | null;
  stat_focus: number | null;
  stat_planning: number | null;
  stat_emotion: number | null;
}

export const PIECE_DEFINITIONS: Record<PipePieceType, PieceDefinition> = {
  straight_h: { type: 'straight_h', mask: DIR.LEFT | DIR.RIGHT, label: '─' },
  straight_v: { type: 'straight_v', mask: DIR.UP | DIR.DOWN, label: '│' },
  elbow_ur: { type: 'elbow_ur', mask: DIR.UP | DIR.RIGHT, label: '└' },
  elbow_rd: { type: 'elbow_rd', mask: DIR.RIGHT | DIR.DOWN, label: '┌' },
  elbow_dl: { type: 'elbow_dl', mask: DIR.DOWN | DIR.LEFT, label: '┐' },
  elbow_lu: { type: 'elbow_lu', mask: DIR.LEFT | DIR.UP, label: '┘' },
  tee_urd: { type: 'tee_urd', mask: DIR.UP | DIR.RIGHT | DIR.DOWN, label: '├' },
  tee_rdl: { type: 'tee_rdl', mask: DIR.RIGHT | DIR.DOWN | DIR.LEFT, label: '┬' },
  tee_dlu: { type: 'tee_dlu', mask: DIR.DOWN | DIR.LEFT | DIR.UP, label: '┤' },
  tee_lur: { type: 'tee_lur', mask: DIR.LEFT | DIR.UP | DIR.RIGHT, label: '┴' },
  cross: { type: 'cross', mask: DIR.UP | DIR.RIGHT | DIR.DOWN | DIR.LEFT, label: '┼' },
  crossover: { type: 'crossover', mask: DIR.UP | DIR.RIGHT | DIR.DOWN | DIR.LEFT, label: 'X', isCrossover: true },
};

export const OPPOSITE_DIR: Record<number, number> = {
  [DIR.UP]: DIR.DOWN,
  [DIR.RIGHT]: DIR.LEFT,
  [DIR.DOWN]: DIR.UP,
  [DIR.LEFT]: DIR.RIGHT,
};

export const DIR_VECTORS: Record<number, Coord> = {
  [DIR.UP]: { x: 0, y: -1 },
  [DIR.RIGHT]: { x: 1, y: 0 },
  [DIR.DOWN]: { x: 0, y: 1 },
  [DIR.LEFT]: { x: -1, y: 0 },
};

export const NAME_TO_DIR: Record<DirectionName, number> = {
  up: DIR.UP,
  right: DIR.RIGHT,
  down: DIR.DOWN,
  left: DIR.LEFT,
};

export const COLOR_IDS = ['blue', 'red', 'green', 'yellow', 'purple'] as const;
export type ColorId = typeof COLOR_IDS[number];

export const COLOR_NAMES: Record<ColorId, string> = {
  blue: 'Blue',
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  purple: 'Purple',
};

export const COLOR_CODES: Record<ColorId, string> = {
  blue: 'B',
  red: 'R',
  green: 'G',
  yellow: 'Y',
  purple: 'P',
};

export const COLOR_HEX: Record<ColorId, number> = {
  blue: 0x3b82f6,
  red: 0xef4444,
  green: 0x22c55e,
  yellow: 0xeab308,
  purple: 0xa855f7,
};

export const ALL_TYPES: PipePieceType[] = [
  'straight_h',
  'straight_v',
  'elbow_ur',
  'elbow_rd',
  'elbow_dl',
  'elbow_lu',
  'tee_urd',
  'tee_rdl',
  'tee_dlu',
  'tee_lur',
  'cross',
  'crossover',
];

export const NON_CROSSOVER_TYPES: PipePieceType[] = ALL_TYPES.filter(t => t !== 'crossover');

export const LEVEL_SIZES = {
  '1-14': 5,
  '15-22': 5,
  '23-31': 6,
  '32-40': 7,
} as const;

export const LEVEL_GROUPS = {
  '1-14': 'single_color_foundation',
  '15-17': 'single_color_harder',
  '18-22': 'multi_color_intro',
  '23-31': 'xo_required',
  '32-40': 'advanced',
} as const;
