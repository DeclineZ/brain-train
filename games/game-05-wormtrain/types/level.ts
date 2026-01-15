export type NodeType = 'SPAWN' | 'JUNCTION' | 'MERGE' | 'HOLE' | 'TRAP';
export type EdgeWidth = 'normal' | 'narrow';
export type WormSize = 'S' | 'M' | 'L';
export type TrapType = 'SPIDER' | 'COLLAPSING_HOLE' | 'EARTHQUAKE';

export interface Point {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  color?: string; // For HOLE (match worm color)
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  path: Point[]; // Polyline points (excluding start/end nodes if implied, or full path)
  length: number;
  widthClass: EdgeWidth;
}

export interface JunctionData {
  id: string; // Must match a Node ID of type JUNCTION
  outEdges: string[]; // List of Edge IDs
  defaultIndex: number;
}

export interface TunnelStyle {
  innerColor: number;
  outerColor: number;
  innerAlpha?: number;
  outerAlpha?: number;
  widthMultiplier?: number;
}

export interface RuleSet {
  blockLargeInNarrow: boolean; // If true, large worms jam in narrow tunnels
  collisionFail: boolean; // If true, worm collision = fail
  collapsingHoleBehavior?: 'JAM' | 'TURN_BACK'; // Default JAM
}

export interface TrapConfig {
  id: string;
  type: TrapType;
  nodeId?: string; // For SPIDER/EARTHQUAKE
  edgeId?: string; // For specialized edge traps (if any)
  intervalMs?: number; // For EARTHQUAKE (auto-switch interval)
  activeDurationMs?: number; // For COLLAPSING_HOLE or SPIDER block duration
  initialDelayMs?: number;
  mode?: 'BLOCK' | 'KILL'; // For SPIDER
  radius?: number; // For SPIDER detection
}

export interface WormConfig {
  id: string;
  size: WormSize;
  color: string;
  spawnNodeId: string;
  spawnTimeMs: number;
  speed: number;
}
export type WormSpawnConfig = WormConfig;

export interface WinCondition {
  requiredCount: number; // Number of worms that must arrive
}

export interface DifficultyMetadata {
  rating: number; // 1-5 representation
  name: string;
}

export interface AnimationHints {
  wiggleAmplitude?: number;
  wiggleSpeed?: number;
}

export interface LevelData {
  levelId: string | number;
  colors: string[]; // Available colors in this level
  nodes: Node[];
  edges: Edge[];
  junctions: JunctionData[];
  traps: TrapConfig[];
  worms: WormSpawnConfig[];
  rules: RuleSet;
  winCondition: WinCondition;
  metadata?: DifficultyMetadata;
  animation?: AnimationHints;
  tunnelStyle?: TunnelStyle; // Optional override per level
}
