export type ParkingJamAxis = 'h' | 'v';

export type ParkingJamDirection = 'up' | 'down' | 'left' | 'right';

export type ParkingJamObjectiveType = 'clear_all' | 'exit_target';

export type ParkingJamGatingProfile = 'none' | 'partial' | 'full_one_way';

export type ParkingJamCarType = 'sedan' | 'suv' | 'taxi' | 'pickup' | 'van' | 'bus' | 'truck';

export interface ParkingJamGateSegment {
  edge: 'top' | 'right' | 'bottom' | 'left';
  index: number;
}

export interface ParkingJamCarConfig {
  id: string;
  axis: ParkingJamAxis;
  length: 2 | 3;
  row: number;
  col: number;
  color: number;
  carType: ParkingJamCarType;
  allowedExitDirections: ParkingJamDirection[];
}

export interface ParkingJamLevelConfig {
  level: number;
  gridSize: number;
  cars: ParkingJamCarConfig[];
  objectiveType: ParkingJamObjectiveType;
  targetCarId?: string;
  blockedGateSegments: ParkingJamGateSegment[];
  gatingProfile: ParkingJamGatingProfile;
  oneWayRatio: number;
  dependencyDepth: number;
  difficulty: number;
  parMoves: number;
  parTimeMs: number;
  relevantCarSet: string[];
  timeLimitMs?: number;
}

export interface ParkingJamCarRuntime {
  id: string;
  row: number;
  col: number;
  removed: boolean;
}

export interface ParkingJamMove {
  carId: string;
  direction: ParkingJamDirection;
  distance: number;
  exits: boolean;
}

export interface ParkingJamSolveResult {
  solvable: boolean;
  parMoves: number;
  parTimeMs: number;
  relevantCarSet: string[];
  firstMove: ParkingJamMove | null;
}

export interface ParkingJamLevelAttemptStats {
  levelId: number;
  levelStartMs: number;
  levelEndMs: number;
  levelTimeMs: number;
  solved: boolean;
  failedTimeout: boolean;
  skipped: boolean;
  moveCount: number;
  slideCellDistanceTotal: number;
  invalidMoveCount: number;
  blockedExitAttemptCount: number;
  undoCount: number;
  hintUsedCount: number;
  restartCount: number;
  distinctCarsMovedCount: number;
  carMoveHistogram: Record<string, number>;
  firstActionLatencyMs: number;
  repeatedErrorCount: number;
  idleTimeMs: number;
  parMoves: number;
  parTimeMs: number;
  difficulty: number;
  relevantCarSet: string[];
  objectiveType: ParkingJamObjectiveType;
  gatingProfile: ParkingJamGatingProfile;
}

export interface ParkingJamGameStats {
  sessionId: string;
  startTimeMs: number;
  endTimeMs: number;
  levelsAttemptedCount: number;
  levelsSolvedCount: number;
  levelsFailedCount: number;
  levelsSkippedCount: number;
  levelAttempts: ParkingJamLevelAttemptStats[];
}

export interface ParkingJamOnGameOverPayload extends ParkingJamGameStats {
  success: boolean;
  level: number;
  current_played: number;
  userTimeMs: number;
  score: number;
  stars: 0 | 1 | 2 | 3;
  starHint: string | null;
  objectiveType: ParkingJamObjectiveType;
  gatingProfile: ParkingJamGatingProfile;
  stat_memory: null;
  stat_emotion: null;
  stat_planning: number;
  stat_speed: number;
  stat_focus: number;
  stat_visual: number;
}

export interface ParkingJamRawLevelConfig {
  level: number;
  gridSize: number;
  cars: ParkingJamCarConfig[];
  objectiveType: ParkingJamObjectiveType;
  targetCarId?: string;
  blockedGateSegments: ParkingJamGateSegment[];
  gatingProfile: ParkingJamGatingProfile;
  oneWayRatio: number;
  dependencyDepth: number;
  difficulty: number;
  timeLimitMs?: number;
}

export const PARKING_JAM_TOTAL_LEVELS = 24;

export const PARKING_JAM_SESSION_MS = 90_000;

export const PARKING_JAM_HINT_LIMIT = 2;
