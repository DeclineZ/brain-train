export type Direction = 0 | 1 | 2 | 3; // 0=Up,1=Right,2=Down,3=Left

export type TileKind =
  | 'empty'
  | 'pipe_straight'
  | 'pipe_corner'
  | 'pipe_t'
  | 'wire_straight'
  | 'wire_corner'
  | 'hybrid_straight'
  | 'hybrid_corner'
  | 'dead_end_pipe'
  | 'source'
  | 'pump'
  | 'target';

export interface PowerPumpLevelConfig {
  level: number;
  gridW: number;
  gridH: number;
  wireEnabled: boolean;
  wireComplexity: number;
  targetsCount: number;
  pipeJunctionsEnabled: boolean;
  hybridTilesCount: number;
  deadEndTilesCount: number;
  parRotations: number;
  parWasteMs: number;
  targetTimeMs: number;
  seed: number;
  intro?: {
    title: string;
    description: string;
    imageKey?: string;
    oncePerSession?: boolean;
  };
}

export interface PowerPumpTile {
  id: number;
  x: number;
  y: number;
  kind: TileKind;
  rotation: Direction;
  solvedRotation: Direction;
  locked?: boolean;
}

export interface PowerPumpGameStats {
  levelId: number;
  levelStartTimeMs: number;
  levelEndTimeMs: number;
  totalTimeMs: number;
  targetTimeMs: number;
  overtimeMs: number;
  tapRotateCount: number;
  uniqueTilesRotatedCount: number;
  repeatedRotateSameTileCount: number;
  undoCount: number;
  resetCount: number;
  hintUsedCount: number;
  pumpOnTransitions: number;
  pumpOnMs: number;
  wasteMs: number;
  firstPumpOnTimeMs: number | null;
  targetsTotal: number;
  targetsFilledMax: number;
  targetsFilledAtPumpOn: number;
  leakEventCount: number;
  completionState: 'win' | 'in_progress' | 'abandon';
  starsEarned: number;
  parRotations: number;
  parWasteMs: number;
}
