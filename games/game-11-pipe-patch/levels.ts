import {
  DIR,
  OPPOSITE_DIR,
  type Coord,
  type PipePieceType,
  type PipePatchLevelConfig,
  type TrayPieceConfig,
  type PipePatchEndpoint,
  type PipePatchEndpointGroup,
  type ColorId,
} from './types';

// ============================================================================
// SYMBOL LEGEND - Manual Grid Configuration System
// ============================================================================
// S = Source (flow start, single color level)
// T = Target (flow end, single color level)
// R,G,B,Y,P = Colored sources (red, green, blue, yellow, purple)
// r,g,b,y,p = Colored sinks (red, green, blue, yellow, purple)
// # = Blocked cell (wall - cannot place pipe)
// . = Empty cell (player can place pipe here)
// ============================================================================

// Pipe piece types for tray
type TrayPieceTypeCode = 'H' | 'V' | 'UR' | 'RD' | 'DL' | 'LU' | 'TU' | 'TR' | 'TD' | 'TL' | 'XO';

const PIECE_CODE_MAP: Record<TrayPieceTypeCode, PipePieceType> = {
  H: 'straight_h',
  V: 'straight_v',
  UR: 'elbow_ur',
  RD: 'elbow_rd',
  DL: 'elbow_dl',
  LU: 'elbow_lu',
  TU: 'tee_urd',
  TR: 'tee_rdl',
  TD: 'tee_dlu',
  TL: 'tee_lur',
  XO: 'crossover',
};

const getColorFromCode = (code: string): ColorId => {
  const mapping: Record<string, ColorId> = {
    R: 'red',
    G: 'green',
    B: 'blue',
    Y: 'yellow',
    P: 'purple',
  };
  return mapping[code] || 'blue';
};

interface SimpleLevelConfig {
  id: number;
  gridSize: number;
  grid: string[];
  trayPieces: { code: TrayPieceTypeCode; count: number }[];
  parTimeMs: number;
  hardTimeMs: number;
  difficultyWeight: number;
}

const parseSimpleGrid = (config: SimpleLevelConfig): PipePatchLevelConfig => {
  const size = config.gridSize;
  const grid = config.grid.map((line) => line.trim().split(/\s+/));

  if (grid.length !== size) {
    throw new Error(`Level ${config.id}: Grid has ${grid.length} rows, expected ${size}`);
  }
  if (grid.some((row) => row.length !== size)) {
    throw new Error(`Level ${config.id}: All rows must have ${size} columns`);
  }

  const blockedCells: Coord[] = [];
  const endpointGroupsMap = new Map<string, PipePatchEndpointGroup>();
  const sources = new Map<string, PipePatchEndpoint>();
  const targets = new Map<string, PipePatchEndpoint[]>();

  const parseEndpointToken = (token: string): { base: string; dir?: number } => {
    const t = token.trim();
    if (!t) return { base: '.' };
    if (t.length === 1) return { base: t };

    const arrowToDir: Record<string, number> = {
      '^': DIR.UP,
      '>': DIR.RIGHT,
      v: DIR.DOWN,
      V: DIR.DOWN,
      '<': DIR.LEFT,
    };

    // Support either suffix or prefix arrow forms: `S>` or `>S`
    if (t.length === 2) {
      const a = t[0];
      const b = t[1];
      if (arrowToDir[b]) return { base: a, dir: arrowToDir[b] };
      if (arrowToDir[a]) return { base: b, dir: arrowToDir[a] };
    }

    return { base: t };
  };

  // Helper to determine the output direction for a source based on position
  const getSourceDirection = (x: number, y: number, gridSize: number): number => {
    if (x === 0) return DIR.RIGHT;
    if (x === gridSize - 1) return DIR.LEFT;
    if (y === 0) return DIR.DOWN;
    if (y === gridSize - 1) return DIR.UP;

    const centerX = Math.floor(gridSize / 2);
    const centerY = Math.floor(gridSize / 2);
    if (x < centerX) return DIR.RIGHT;
    if (x > centerX) return DIR.LEFT;
    if (y < centerY) return DIR.DOWN;
    return DIR.UP;
  };

  // Helper to determine the input direction for a target based on position
  const getTargetDirection = (x: number, y: number, gridSize: number): number => {
    if (x === 0) return DIR.RIGHT;
    if (x === gridSize - 1) return DIR.LEFT;
    if (y === 0) return DIR.DOWN;
    if (y === gridSize - 1) return DIR.UP;

    const centerX = Math.floor(gridSize / 2);
    const centerY = Math.floor(gridSize / 2);
    if (x < centerX) return DIR.RIGHT;
    if (x > centerX) return DIR.LEFT;
    if (y < centerY) return DIR.DOWN;
    return DIR.UP;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const { base: symbol, dir } = parseEndpointToken(grid[y][x]);
      const isGenericSource = symbol === 'S' || symbol === 's';
      const isGenericTarget = symbol === 'T' || symbol === 't';
      const coord: Coord = { x, y };

      if (symbol === '#') {
        blockedCells.push(coord);
        continue;
      }

      if (isGenericSource) {
        const outDir = dir ?? getSourceDirection(x, y, size);
        sources.set('blue', {
          position: coord,
          // `mask` stores the *input* direction into the source cell.
          // The actual outgoing connection is `OPPOSITE_DIR[mask]`.
          mask: OPPOSITE_DIR[outDir],
          colorId: 'blue',
        });
        continue;
      }

      if (isGenericTarget) {
        if (!targets.has('blue')) {
          targets.set('blue', []);
        }
        const inDir = dir ?? getTargetDirection(x, y, size);
        targets.get('blue')!.push({
          position: coord,
          // `mask` stores the direction the pipe must connect from (into this target).
          mask: inDir,
          colorId: 'blue',
        });
        continue;
      }

      // Colored sources (R, G, B, Y, P)
      if (['R', 'G', 'B', 'Y', 'P'].includes(symbol)) {
        const colorId = getColorFromCode(symbol);
        const outDir = dir ?? getSourceDirection(x, y, size);
        sources.set(colorId, {
          position: coord,
          mask: OPPOSITE_DIR[outDir],
          colorId,
        });
        continue;
      }

      // Colored sinks (r, g, b, y, p)
      if (['r', 'g', 'b', 'y', 'p'].includes(symbol)) {
        const colorId = getColorFromCode(symbol.toUpperCase());
        if (!targets.has(colorId)) {
          targets.set(colorId, []);
        }
        const inDir = dir ?? getTargetDirection(x, y, size);
        targets.get(colorId)!.push({
          position: coord,
          mask: inDir,
          colorId,
        });
      }
    }
  }

  sources.forEach((source, colorId) => {
    const outputs = targets.get(colorId) || [];
    endpointGroupsMap.set(colorId, {
      colorId,
      input: source,
      outputs,
    });
  });

  const endpointGroups = Array.from(endpointGroupsMap.values());

  const layout = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const { base: symbol } = parseEndpointToken(grid[y][x]);
      const isGenericSource = symbol === 'S' || symbol === 's';
      const isGenericTarget = symbol === 'T' || symbol === 't';
      if (symbol === '#') return '#';
      if (isGenericSource) return 'S';
      if (isGenericTarget) return 'T';
      if (['R', 'G', 'B', 'Y', 'P'].includes(symbol)) return 'S';
      if (['r', 'g', 'b', 'y', 'p'].includes(symbol)) return 'T';
      return '.';
    }).join('')
  );

  const firstSource = sources.values().next().value;
  const firstTargetList = targets.values().next().value;
  const firstTarget = firstTargetList?.[0];

  const trayPieces: TrayPieceConfig[] = [];
  for (const { code, count } of config.trayPieces) {
    const pieceType = PIECE_CODE_MAP[code];
    for (let i = 0; i < count; i += 1) {
      trayPieces.push({
        id: `lv${config.id}-${code.toLowerCase()}-${i}`,
        pieceType,
        isDecoy: false,
      });
    }
  }

  return {
    id: config.id,
    gridSize: size,
    layout,
    source: firstSource?.position || { x: 0, y: 0 },
    sourceMask: firstSource?.mask || DIR.RIGHT,
    targets: Array.from(targets.values()).flat(),
    endpointGroups,
    target: firstTarget?.position || { x: size - 1, y: 0 },
    targetMask: firstTarget?.mask || DIR.LEFT,
    fixedPipes: [],
    blockedCells,
    lockedPlaceholders: [],
    oneWayGates: [],
    requiredPlacements: [],
    trayPieces,
    requiredPieceCount: trayPieces.length,
    decoyPieceCount: 0,
    parTimeMs: config.parTimeMs,
    hardTimeMs: config.hardTimeMs,
    difficultyWeight: config.difficultyWeight,
  };
};

// ============================================================================
// COMPLETE 40-LEVEL PROGRESSION (MANUAL ONLY)
// ============================================================================

// ============================================================================
// Lv1-Lv10 (5x5) - Single Color Foundation
// ============================================================================

const level1: SimpleLevelConfig = {
  id: 1,
  gridSize: 5,
  grid: [
    'S>  .  .  .  vT',
    '.   .  .  .   .',
    '.   .  .  .   .',
    '.   .  .  .   .',
    '.   .  .  .   .',
  ],
  trayPieces: [
    { code: 'H', count: 5 },
    { code: 'V', count: 2 },
    { code: 'UR', count: 1 },
    { code: 'RD', count: 1 },
    { code: 'DL', count: 1 },
    { code: 'LU', count: 1 },
  ],
  parTimeMs: 9000,
  hardTimeMs: 15000,
  difficultyWeight: 1.0,
};

const level2: SimpleLevelConfig = {
  id: 2,
  gridSize: 5,
  grid: [
    'S>  .  .  .  .',
    '.   .  .  .  .',
    '.   .  .  .  .',
    '.   .  .  .  .',
    '^T  .  .  .  .',
  ],
  trayPieces: [
    { code: 'H', count: 2 },
    { code: 'V', count: 6 },
    { code: 'UR', count: 1 },
    { code: 'RD', count: 1 },
    { code: 'DL', count: 1 },
    { code: 'LU', count: 1 },
  ],
  parTimeMs: 10000,
  hardTimeMs: 17000,
  difficultyWeight: 1.2,
};

const level3: SimpleLevelConfig = {
  id: 3,
  gridSize: 5,
  grid: [
    'S>  .  .  .  .',
    '.   .  .  .  .',
    '.   .  .  .  .',
    '.   .  .  .  .',
    '.   .  .  .  ^T',
  ],
  trayPieces: [
    { code: 'H', count: 4 },
    { code: 'V', count: 4 },
    { code: 'UR', count: 2 },
    { code: 'RD', count: 2 },
    { code: 'DL', count: 2 },
    { code: 'LU', count: 2 },
  ],
  parTimeMs: 11000,
  hardTimeMs: 18000,
  difficultyWeight: 1.4,
};

const level4: SimpleLevelConfig = {
  id: 4,
  gridSize: 5,
  grid: [
    '.   .  .  .  <S',
    '.   .  .  .   .',
    '.   .  .  .   .',
    '.   .  .  .   .',
    '^T  .  .  .   .',
  ],
  trayPieces: [
    { code: 'H', count: 4 },
    { code: 'V', count: 4 },
    { code: 'UR', count: 2 },
    { code: 'RD', count: 2 },
    { code: 'DL', count: 2 },
    { code: 'LU', count: 2 },
  ],
  parTimeMs: 11500,
  hardTimeMs: 18500,
  difficultyWeight: 1.6,
};

const level5: SimpleLevelConfig = {
  id: 5,
  gridSize: 5,
  grid: [
    'S>  .  #  .  <T',
    '.   .  .  .   .',
    '.   .  .  .   .',
    '.   .  .  .   .',
    '.   .  .  .   .',
  ],
  trayPieces: [
    { code: 'H', count: 5 },
    { code: 'V', count: 4 },
    { code: 'UR', count: 2 },
    { code: 'RD', count: 2 },
    { code: 'DL', count: 2 },
    { code: 'LU', count: 2 },
  ],
  parTimeMs: 12000,
  hardTimeMs: 19500,
  difficultyWeight: 1.8,
};

const level6: SimpleLevelConfig = {
  id: 6,
  gridSize: 5,
  grid: [
    'S>  .  .  .   .',
    '.   .  #  .   .',
    '.   .  .  .   .',
    '.   .  .  #   .',
    '.   .  .  .  ^T',
  ],
  trayPieces: [
    { code: 'H', count: 5 },
    { code: 'V', count: 5 },
    { code: 'UR', count: 2 },
    { code: 'RD', count: 2 },
    { code: 'DL', count: 2 },
    { code: 'LU', count: 2 },
  ],
  parTimeMs: 12500,
  hardTimeMs: 20500,
  difficultyWeight: 2.0,
};

const level7: SimpleLevelConfig = {
  id: 7,
  gridSize: 5,
  grid: [
    '.   S>  .  .  .',
    '.   .   .  #  .',
    '.   .   #  .  .',
    '.   .   .  .  .',
    '^T  .   .  .  .',
  ],
  trayPieces: [
    { code: 'H', count: 4 },
    { code: 'V', count: 6 },
    { code: 'UR', count: 2 },
    { code: 'RD', count: 2 },
    { code: 'DL', count: 2 },
    { code: 'LU', count: 2 },
  ],
  parTimeMs: 13000,
  hardTimeMs: 21500,
  difficultyWeight: 2.2,
};

const level8: SimpleLevelConfig = {
  id: 8,
  gridSize: 5,
  grid: [
    'S>  .  .  .  <T',
    '.   #  .  #   .',
    '.   .  .  .   .',
    '.   #  .  .   .',
    '.   .  .  .   .',
  ],
  trayPieces: [
    { code: 'H', count: 6 },
    { code: 'V', count: 5 },
    { code: 'UR', count: 2 },
    { code: 'RD', count: 2 },
    { code: 'DL', count: 2 },
    { code: 'LU', count: 2 },
  ],
  parTimeMs: 13500,
  hardTimeMs: 22000,
  difficultyWeight: 2.4,
};

const level9: SimpleLevelConfig = {
  id: 9,
  gridSize: 5,
  grid: [
    '.   .  .  .  <S',
    '.   #  .  .   .',
    '.   .  #  .   .',
    '.   .  .  .   .',
    '^T  .  .  .   .',
  ],
  trayPieces: [
    { code: 'H', count: 5 },
    { code: 'V', count: 6 },
    { code: 'UR', count: 3 },
    { code: 'RD', count: 3 },
    { code: 'DL', count: 3 },
    { code: 'LU', count: 3 },
  ],
  parTimeMs: 14500,
  hardTimeMs: 23000,
  difficultyWeight: 2.6,
};

const level10: SimpleLevelConfig = {
  id: 10,
  gridSize: 5,
  grid: [
    'S>  .  #  .  .',
    '.   .  .  .  .',
    '.   #  .  #  .',
    '.   .  .  .  .',
    '.   .  .  .  ^T',
  ],
  trayPieces: [
    { code: 'H', count: 6 },
    { code: 'V', count: 6 },
    { code: 'UR', count: 3 },
    { code: 'RD', count: 3 },
    { code: 'DL', count: 3 },
    { code: 'LU', count: 3 },
  ],
  parTimeMs: 15000,
  hardTimeMs: 24000,
  difficultyWeight: 2.8,
};

// ============================================================================
// Lv11-Lv17 (5x5) - Two Colors
// ============================================================================

const level11: SimpleLevelConfig = {
  id: 11,
  gridSize: 5,
  grid: [
    'R>  .  .  .  <r',
    '.   .  #  .   .',
    '.   .  .  .   .',
    '.   .  #  .   .',
    'G>  .  .  .  <g',
  ],
  trayPieces: [
    { code: 'H', count: 7 },
    { code: 'V', count: 6 },
    { code: 'UR', count: 3 },
    { code: 'RD', count: 3 },
    { code: 'DL', count: 3 },
    { code: 'LU', count: 3 },
  ],
  parTimeMs: 17000,
  hardTimeMs: 26000,
  difficultyWeight: 3.0,
};

const level12: SimpleLevelConfig = {
  id: 12,
  gridSize: 5,
  grid: [
    'R>  .  .  .  .',
    '.   .  #  .  .',
    '.   .  .  .  .',
    '.   .  #  .  .',
    '^r  .  G> . <g',
  ],
  trayPieces: [
    { code: 'H', count: 7 },
    { code: 'V', count: 7 },
    { code: 'UR', count: 3 },
    { code: 'RD', count: 3 },
    { code: 'DL', count: 3 },
    { code: 'LU', count: 3 },
  ],
  parTimeMs: 18000,
  hardTimeMs: 27500,
  difficultyWeight: 3.2,
};

const level13: SimpleLevelConfig = {
  id: 13,
  gridSize: 5,
  grid: [
    '.   .  .  .  <r',
    '.   .  #  .   .',
    'R>  .  .  .   .',
    '.   .  #  .   .',
    'G>  .  .  .  <g',
  ],
  trayPieces: [
    { code: 'H', count: 7 },
    { code: 'V', count: 7 },
    { code: 'UR', count: 4 },
    { code: 'RD', count: 4 },
    { code: 'DL', count: 4 },
    { code: 'LU', count: 4 },
  ],
  parTimeMs: 18500,
  hardTimeMs: 28500,
  difficultyWeight: 3.4,
};

const level14: SimpleLevelConfig = {
  id: 14,
  gridSize: 5,
  grid: [
    'R>  .  .  .  <g',
    '.   .  .  .   .',
    '.   #  #  #   .',
    '.   .  .  .   .',
    'G>  .  .  .  <r',
  ],
  trayPieces: [
    { code: 'H', count: 8 },
    { code: 'V', count: 7 },
    { code: 'UR', count: 4 },
    { code: 'RD', count: 4 },
    { code: 'DL', count: 4 },
    { code: 'LU', count: 4 },
  ],
  parTimeMs: 19500,
  hardTimeMs: 29500,
  difficultyWeight: 3.6,
};

const level15: SimpleLevelConfig = {
  id: 15,
  gridSize: 5,
  grid: [
    'R>  .  .  #  .',
    '.   .  .  .  .',
    '.   #  .  #  .',
    '.   .  .  .  .',
    '.  <r  G> . <g',
  ],
  trayPieces: [
    { code: 'H', count: 8 },
    { code: 'V', count: 8 },
    { code: 'UR', count: 4 },
    { code: 'RD', count: 4 },
    { code: 'DL', count: 4 },
    { code: 'LU', count: 4 },
  ],
  parTimeMs: 20000,
  hardTimeMs: 30500,
  difficultyWeight: 3.8,
};

const level16: SimpleLevelConfig = {
  id: 16,
  gridSize: 5,
  grid: [
    '.   .  .  .  <r',
    '.   #  .  #   .',
    'R>  .  .  .   .',
    '.   #  .  .   .',
    'G>  .  .  .  <g',
  ],
  trayPieces: [
    { code: 'H', count: 8 },
    { code: 'V', count: 8 },
    { code: 'TU', count: 1 },
    { code: 'TR', count: 1 },
    { code: 'TD', count: 1 },
    { code: 'TL', count: 1 },
    { code: 'UR', count: 4 },
    { code: 'RD', count: 4 },
    { code: 'DL', count: 4 },
    { code: 'LU', count: 4 },
  ],
  parTimeMs: 21000,
  hardTimeMs: 32000,
  difficultyWeight: 4.0,
};

const level17: SimpleLevelConfig = {
  id: 17,
  gridSize: 5,
  grid: [
    'R>  .  .  .  <r',
    '.   #  .  #   .',
    '.   .  .  .   .',
    '.   #  .  .   .',
    'G>  .  .  .  <g',
  ],
  trayPieces: [
    { code: 'H', count: 8 },
    { code: 'V', count: 8 },
    { code: 'TU', count: 1 },
    { code: 'TR', count: 1 },
    { code: 'TD', count: 1 },
    { code: 'TL', count: 1 },
    { code: 'UR', count: 5 },
    { code: 'RD', count: 5 },
    { code: 'DL', count: 5 },
    { code: 'LU', count: 5 },
  ],
  parTimeMs: 22000,
  hardTimeMs: 33000,
  difficultyWeight: 4.2,
};

// ============================================================================
// Lv18-Lv25 (5x5) - Three Colors
// ============================================================================

const level18: SimpleLevelConfig = {
  id: 18,
  gridSize: 5,
  grid: [
    'R>  .  .  .  <r',
    'vB  .  #  .   .',
    '.  .  .  .  <b',
    '.   .  #  .   .',
    '^G  .  .  .  <g',
  ],
  trayPieces: [
    { code: 'H', count: 10 },
    { code: 'V', count: 9 },
    { code: 'UR', count: 5 },
    { code: 'RD', count: 5 },
    { code: 'DL', count: 5 },
    { code: 'LU', count: 5 },
  ],
  parTimeMs: 23000,
  hardTimeMs: 34000,
  difficultyWeight: 4.4,
};

const level19: SimpleLevelConfig = {
  id: 19,
  gridSize: 5,
  grid: [
    '.  <g  vR  .  .',
    '.   #  .  .   .',
    '.  B>  .  .  <b',
    '.   .  .  #   .',
    '^G  .  .  .  <r',
  ],
  trayPieces: [
    { code: 'H', count: 10 },
    { code: 'V', count: 9 },
    { code: 'TU', count: 1 },
    { code: 'TR', count: 1 },
    { code: 'TD', count: 1 },
    { code: 'TL', count: 1 },
    { code: 'UR', count: 5 },
    { code: 'RD', count: 5 },
    { code: 'DL', count: 5 },
    { code: 'LU', count: 5 },
    { code: 'XO', count: 2 },
  ],
  parTimeMs: 24000,
  hardTimeMs: 35500,
  difficultyWeight: 4.6,
};

const level20: SimpleLevelConfig = {
  id: 20,
  gridSize: 5,
  grid: [
    'vR  .  .  .  <r',
    '.   .  #  .  <g',
    'B>  .  .  .  <b',
    '.   .  #  .   .',
    '^G  .  .  .  <g',
  ],
  trayPieces: [
    { code: 'H', count: 9 },
    { code: 'V', count: 9 },
    { code: 'XO', count: 1 },
    { code: 'TU', count: 1 },
    { code: 'TR', count: 1 },
    { code: 'TD', count: 1 },
    { code: 'TL', count: 1 },
    { code: 'UR', count: 5 },
    { code: 'RD', count: 5 },
    { code: 'DL', count: 5 },
    { code: 'LU', count: 5 },
  ],
  parTimeMs: 25000,
  hardTimeMs: 36500,
  difficultyWeight: 4.8,
};

const level21: SimpleLevelConfig = {
  id: 21,
  gridSize: 5,
  grid: [
    'R>  .  .  .  <g',
    '.   #  .  .   .',
    'B>  .  .  .  <b',
    '.   .  .  .   #',
    'G>  .  .  .  <r',
  ],
  trayPieces: [
    { code: 'H', count: 10 },
    { code: 'V', count: 9 },
    { code: 'XO', count: 3 },
    { code: 'TU', count: 1 },
    { code: 'TR', count: 1 },
    { code: 'TD', count: 1 },
    { code: 'TL', count: 1 },
    { code: 'UR', count: 5 },
    { code: 'RD', count: 5 },
    { code: 'DL', count: 5 },
    { code: 'LU', count: 5 },
  ],
  parTimeMs: 26000,
  hardTimeMs: 37500,
  difficultyWeight: 5.0,
};

const level22: SimpleLevelConfig = {
  id: 22,
  gridSize: 5,
  grid: [
    'vR  .  .  .  <r',
    '.   .  #  .   .',
    'B>  .  #  #  bv',
    '.   .  .  .   .',
    'G>  .  .  .  <g',
  ],
  trayPieces: [
    { code: 'H', count: 10 },
    { code: 'V', count: 10 },
    { code: 'XO', count: 1 },
    { code: 'TU', count: 1 },
    { code: 'TR', count: 1 },
    { code: 'TD', count: 1 },
    { code: 'TL', count: 1 },
    { code: 'UR', count: 6 },
    { code: 'RD', count: 6 },
    { code: 'DL', count: 6 },
    { code: 'LU', count: 6 },
  ],
  parTimeMs: 27000,
  hardTimeMs: 39000,
  difficultyWeight: 5.2,
};

const level23: SimpleLevelConfig = {
  id: 23,
  gridSize: 5,
  grid: [
    'R>  .  .  .  <r',
    '.   .  .  #   #',
    'B>  .  .  .  <b',
    '.   .  .  .   .',
    '^G  .  .  .  <g',
  ],
  trayPieces: [
    { code: 'H', count: 11 },
    { code: 'V', count: 10 },
    { code: 'XO', count: 2 },
    { code: 'TU', count: 1 },
    { code: 'TR', count: 1 },
    { code: 'TD', count: 1 },
    { code: 'TL', count: 1 },
    { code: 'UR', count: 6 },
    { code: 'RD', count: 6 },
    { code: 'DL', count: 6 },
    { code: 'LU', count: 6 },
  ],
  parTimeMs: 28000,
  hardTimeMs: 40000,
  difficultyWeight: 5.4,
};

const level24: SimpleLevelConfig = {
  id: 24,
  gridSize: 5,
  grid: [
    'vR  .  .  .  <b',
    '.   .  .  .   .',
    'B>  .  .  .  <r',
    '.   .  #  .   .',
    '^G  .  .  .  <g',
  ],
  trayPieces: [
    { code: 'H', count: 11 },
    { code: 'V', count: 11 },
    { code: 'XO', count: 2 },
    { code: 'TU', count: 2 },
    { code: 'TR', count: 2 },
    { code: 'TD', count: 2 },
    { code: 'TL', count: 2 },
    { code: 'UR', count: 6 },
    { code: 'RD', count: 6 },
    { code: 'DL', count: 6 },
    { code: 'LU', count: 6 },
  ],
  parTimeMs: 29000,
  hardTimeMs: 41000,
  difficultyWeight: 5.6,
};

const level25: SimpleLevelConfig = {
  id: 25,
  gridSize: 5,
  grid: [
    'vR  #  vB  #  vG',
    '.   #  .   #  .',
    '.   .  .   .  .',
    '.   .  .   .  .',
    '^r  #  ^b  ^r  ^g',
  ],
  trayPieces: [
    { code: 'H', count: 12 },
    { code: 'V', count: 11 },
    { code: 'XO', count: 2 },
    { code: 'TU', count: 2 },
    { code: 'TR', count: 2 },
    { code: 'TD', count: 2 },
    { code: 'TL', count: 2 },
    { code: 'UR', count: 6 },
    { code: 'RD', count: 6 },
    { code: 'DL', count: 6 },
    { code: 'LU', count: 6 },
  ],
  parTimeMs: 30000,
  hardTimeMs: 42500,
  difficultyWeight: 5.8,
};

// ============================================================================
// Lv26-Lv33 (6x6) - Four Colors
// ============================================================================

const level26: SimpleLevelConfig = {
  id: 26,
  gridSize: 6,
  grid: [
    'vR  #  vB  #  .  vY',
    '.   #  .   #  .  .',
    '.   >g  .   .  <G  .',
    '.   #  .   #  .  .',
    '.   .  .   .  .  .',
    '^r  #  ^b  #  ^r ^y',
  ],
  trayPieces: [
    { code: 'H', count: 14 },
    { code: 'V', count: 16 },
    { code: 'XO', count: 3 },
    { code: 'TU', count: 2 },
    { code: 'TR', count: 2 },
    { code: 'TD', count: 2 },
    { code: 'TL', count: 2 },
    { code: 'UR', count: 6 },
    { code: 'RD', count: 6 },
    { code: 'DL', count: 6 },
    { code: 'LU', count: 6 },
  ],
  parTimeMs: 32000,
  hardTimeMs: 44000,
  difficultyWeight: 6.0,
};

const level27: SimpleLevelConfig = {
  id: 27,
  gridSize: 6,
  grid: [
    'vR  #  vB  #  .  vY',
    '.   #  .   #  #  .',
    '.   .  .   .  <G  .',
    '.   .  .   #  .  .',
    '.   .  .   .  .  .',
    '^r  ^g  ^b  #  ^r ^y',
  ],
  trayPieces: [
    { code: 'H', count: 10 },
    { code: 'V', count: 8 },
    { code: 'XO', count: 4 },
    { code: 'TU', count: 2 },
    { code: 'TR', count: 2 },
    { code: 'TD', count: 2 },
    { code: 'TL', count: 2 },
    { code: 'UR', count: 6 },
    { code: 'RD', count: 6 },
    { code: 'DL', count: 6 },
    { code: 'LU', count: 6 },
  ],
  parTimeMs: 33000,
  hardTimeMs: 45000,
  difficultyWeight: 6.2,
};

const level28: SimpleLevelConfig = {
  id: 28,
  gridSize: 6,
  grid: [
    'vR  #  vB  #  .  vY',
    '.   #  .   #  .  .',
    '.   >g  .   .  .  <G',
    '.   #  .   .  .  .',
    '.   .  .   .  .  .',
    '^r  #  ^b  #  ^r ^y',
  ],
  trayPieces: [
    { code: 'H', count: 9 },
    { code: 'V', count: 9 },
    { code: 'XO', count: 5 },
    { code: 'TU', count: 2 },
    { code: 'TR', count: 2 },
    { code: 'TD', count: 2 },
    { code: 'TL', count: 2 },
    { code: 'UR', count: 6 },
    { code: 'RD', count: 6 },
    { code: 'DL', count: 6 },
    { code: 'LU', count: 6 },
  ],
  parTimeMs: 34000,
  hardTimeMs: 46500,
  difficultyWeight: 6.4,
};

const level29: SimpleLevelConfig = {
  id: 29,
  gridSize: 7,
  grid: [
    'vR  .  vB  .  vG  .  vY',
    '.   #  .   .  .  .   .',
    '.   .  .   .  .  .   .',
    '.   .  .   #  .  .   .',
    '.   .  .   .  .  .   .',
    '.   .  .   .  .  .   .',
    '^g  .  ^y  .  ^r  .  ^b',
  ],
  trayPieces: [
    { code: 'H', count: 16 },
    { code: 'V', count: 19 },
    { code: 'XO', count: 5 },
    { code: 'TU', count: 2 },
    { code: 'TR', count: 2 },
    { code: 'TD', count: 2 },
    { code: 'TL', count: 2 },
    { code: 'UR', count: 8 },
    { code: 'RD', count: 8 },
    { code: 'DL', count: 8 },
    { code: 'LU', count: 8 },
  ],
  parTimeMs: 37000,
  hardTimeMs: 50000,
  difficultyWeight: 6.6,
};

const level30: SimpleLevelConfig = {
  id: 30,
  gridSize: 7,
  grid: [
    'vR  .  vB  .  vG  .  vY',
    '.   #  .   .  .  .   .',
    '.   .  .   .  .  .   .',
    '.   .  #   .  .  .   .',
    '.   .  .   .  .  #   .',
    '.   .  .   .  .  .   .',
    '^g  .  ^y  .  ^r  .  ^b',
  ],
  trayPieces: [
    { code: 'H', count: 16 },
    { code: 'V', count: 20 },
    { code: 'XO', count: 4 },
    { code: 'TU', count: 2 },
    { code: 'TR', count: 2 },
    { code: 'TD', count: 2 },
    { code: 'TL', count: 2 },
    { code: 'UR', count: 8 },
    { code: 'RD', count: 8 },
    { code: 'DL', count: 8 },
    { code: 'LU', count: 8 },
  ],
  parTimeMs: 38000,
  hardTimeMs: 51500,
  difficultyWeight: 6.8,
};



// ============================================================================
// COLLECT ALL LEVELS
// ============================================================================

const allLevels: SimpleLevelConfig[] = [
  level1, level2, level3, level4, level5,
  level6, level7, level8, level9, level10,
  level11, level12, level13, level14, level15,
  level16, level17, level18, level19, level20,
  level21, level22, level23, level24, level25,
  level26, level27, level28, level29, level30,
];

const validateGridShape = (level: SimpleLevelConfig) => {
  if (level.grid.length !== level.gridSize) {
    throw new Error(`Level ${level.id}: grid row count must equal gridSize (${level.gridSize})`);
  }
  const badRow = level.grid.find((row) => row.trim().split(/\s+/).length !== level.gridSize);
  if (badRow) {
    throw new Error(`Level ${level.id}: every grid row must contain ${level.gridSize} tokens`);
  }
};

const validateColorPresence = (level: SimpleLevelConfig) => {
  const sourceMap: Record<string, number> = {};
  const targetMap: Record<string, number> = {};

  const sourceCodeToColor: Record<string, string> = { S: 'blue', R: 'red', G: 'green', B: 'blue', Y: 'yellow', P: 'purple' };
  const targetCodeToColor: Record<string, string> = { T: 'blue', r: 'red', g: 'green', b: 'blue', y: 'yellow', p: 'purple' };

  level.grid.forEach((row) => {
    row.trim().split(/\s+/).forEach((token) => {
      const base = token.replace(/[<>^vV]/g, '');
      const srcColor = sourceCodeToColor[base];
      if (srcColor) sourceMap[srcColor] = (sourceMap[srcColor] ?? 0) + 1;
      const tgtColor = targetCodeToColor[base];
      if (tgtColor) targetMap[tgtColor] = (targetMap[tgtColor] ?? 0) + 1;
    });
  });

  Object.keys(sourceMap).forEach((color) => {
    if (!targetMap[color]) {
      throw new Error(`Level ${level.id}: source color '${color}' has no target`);
    }
  });

  Object.keys(targetMap).forEach((color) => {
    if (!sourceMap[color]) {
      throw new Error(`Level ${level.id}: target color '${color}' has no source`);
    }
  });
};

const validateDirectionalEndpointTokens = (level: SimpleLevelConfig) => {
  const baseSymbols = new Set(['S', 'T', 'R', 'G', 'B', 'Y', 'P', 'r', 'g', 'b', 'y', 'p', '.', '#']);
  const endpointSymbols = new Set(['S', 'T', 'R', 'G', 'B', 'Y', 'P', 'r', 'g', 'b', 'y', 'p']);
  const arrows = new Set(['<', '>', '^', 'v', 'V']);

  level.grid.forEach((row, rowIndex) => {
    row.trim().split(/\s+/).forEach((token, colIndex) => {
      if (token.length === 1) {
        if (!baseSymbols.has(token)) {
          throw new Error(`Level ${level.id}: invalid token '${token}' at (${colIndex},${rowIndex})`);
        }
        return;
      }

      if (token.length !== 2) {
        throw new Error(`Level ${level.id}: invalid directional token '${token}' at (${colIndex},${rowIndex})`);
      }

      const a = token[0];
      const b = token[1];
      const prefixArrow = arrows.has(a) && endpointSymbols.has(b);
      const suffixArrow = endpointSymbols.has(a) && arrows.has(b);
      if (!prefixArrow && !suffixArrow) {
        throw new Error(`Level ${level.id}: malformed directional token '${token}' at (${colIndex},${rowIndex})`);
      }
    });
  });
};

const validateBasicReachability = (level: SimpleLevelConfig) => {
  const grid = level.grid.map((r) => r.trim().split(/\s+/));
  const blocked = new Set<string>();
  const sources: Record<string, Coord> = {};
  const targets: Record<string, Coord[]> = {};

  const sourceCodeToColor: Record<string, string> = { S: 'blue', R: 'red', G: 'green', B: 'blue', Y: 'yellow', P: 'purple' };
  const targetCodeToColor: Record<string, string> = { T: 'blue', r: 'red', g: 'green', b: 'blue', y: 'yellow', p: 'purple' };

  for (let y = 0; y < level.gridSize; y += 1) {
    for (let x = 0; x < level.gridSize; x += 1) {
      const base = grid[y][x].replace(/[<>^vV]/g, '');
      if (base === '#') {
        blocked.add(`${x},${y}`);
        continue;
      }
      const srcColor = sourceCodeToColor[base];
      if (srcColor) sources[srcColor] = { x, y };
      const tgtColor = targetCodeToColor[base];
      if (tgtColor) {
        if (!targets[tgtColor]) targets[tgtColor] = [];
        targets[tgtColor].push({ x, y });
      }
    }
  }

  const canReach = (start: Coord, end: Coord) => {
    const q: Coord[] = [start];
    const visited = new Set<string>([`${start.x},${start.y}`]);
    const dirs = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ];

    while (q.length > 0) {
      const c = q.shift()!;
      if (c.x === end.x && c.y === end.y) return true;
      for (const d of dirs) {
        const nx = c.x + d.x;
        const ny = c.y + d.y;
        const key = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= level.gridSize || ny >= level.gridSize) continue;
        if (blocked.has(key)) continue;
        if (visited.has(key)) continue;
        visited.add(key);
        q.push({ x: nx, y: ny });
      }
    }

    return false;
  };

  Object.entries(sources).forEach(([color, source]) => {
    (targets[color] || []).forEach((target) => {
      if (!canReach(source, target)) {
        throw new Error(`Level ${level.id}: no passable corridor from ${color} source to target at (${target.x},${target.y})`);
      }
    });
  });
};

const validateDirectionalConnectivity = (level: SimpleLevelConfig) => {
  const grid = level.grid.map((r) => r.trim().split(/\s+/));
  const blocked = new Set<string>();
  const sources: Record<string, { x: number; y: number; outDir: number }> = {};
  const targets: Record<string, Array<{ x: number; y: number; inDir: number }>> = {};

  const sourceCodeToColor: Record<string, string> = { S: 'blue', R: 'red', G: 'green', B: 'blue', Y: 'yellow', P: 'purple' };
  const targetCodeToColor: Record<string, string> = { T: 'blue', r: 'red', g: 'green', b: 'blue', y: 'yellow', p: 'purple' };
  const arrowToDir: Record<string, number> = { '^': DIR.UP, '>': DIR.RIGHT, v: DIR.DOWN, V: DIR.DOWN, '<': DIR.LEFT };

  const parseToken = (token: string): { base: string; dir?: number } => {
    const t = token.trim();
    if (!t) return { base: '.' };
    if (t.length === 1) return { base: t };
    if (t.length === 2) {
      const a = t[0];
      const b = t[1];
      if (arrowToDir[b]) return { base: a, dir: arrowToDir[b] };
      if (arrowToDir[a]) return { base: b, dir: arrowToDir[a] };
    }
    return { base: t };
  };

  const defaultSourceDir = (x: number, y: number, size: number) => {
    if (x === 0) return DIR.RIGHT;
    if (x === size - 1) return DIR.LEFT;
    if (y === 0) return DIR.DOWN;
    if (y === size - 1) return DIR.UP;
    const cx = Math.floor(size / 2);
    const cy = Math.floor(size / 2);
    if (x < cx) return DIR.RIGHT;
    if (x > cx) return DIR.LEFT;
    if (y < cy) return DIR.DOWN;
    return DIR.UP;
  };

  const defaultTargetDir = (x: number, y: number, size: number) => {
    if (x === 0) return DIR.RIGHT;
    if (x === size - 1) return DIR.LEFT;
    if (y === 0) return DIR.DOWN;
    if (y === size - 1) return DIR.UP;
    const cx = Math.floor(size / 2);
    const cy = Math.floor(size / 2);
    if (x < cx) return DIR.RIGHT;
    if (x > cx) return DIR.LEFT;
    if (y < cy) return DIR.DOWN;
    return DIR.UP;
  };

  for (let y = 0; y < level.gridSize; y += 1) {
    for (let x = 0; x < level.gridSize; x += 1) {
      const { base, dir } = parseToken(grid[y][x]);
      if (base === '#') {
        blocked.add(`${x},${y}`);
        continue;
      }

      const sourceColor = sourceCodeToColor[base];
      if (sourceColor) {
        sources[sourceColor] = {
          x,
          y,
          outDir: dir ?? defaultSourceDir(x, y, level.gridSize),
        };
      }

      const targetColor = targetCodeToColor[base];
      if (targetColor) {
        if (!targets[targetColor]) targets[targetColor] = [];
        targets[targetColor].push({
          x,
          y,
          inDir: dir ?? defaultTargetDir(x, y, level.gridSize),
        });
      }
    }
  }

  const dirs = [DIR.UP, DIR.RIGHT, DIR.DOWN, DIR.LEFT];
  const vec: Record<number, { x: number; y: number }> = {
    [DIR.UP]: { x: 0, y: -1 },
    [DIR.RIGHT]: { x: 1, y: 0 },
    [DIR.DOWN]: { x: 0, y: 1 },
    [DIR.LEFT]: { x: -1, y: 0 },
  };

  const canReachWithDirections = (
    source: { x: number; y: number; outDir: number },
    target: { x: number; y: number; inDir: number }
  ) => {
    const q: Array<{ x: number; y: number }> = [{ x: source.x, y: source.y }];
    const visited = new Set<string>([`${source.x},${source.y}`]);
    while (q.length > 0) {
      const c = q.shift()!;
      for (const d of dirs) {
        if (c.x === source.x && c.y === source.y && d !== source.outDir) continue;
        const nx = c.x + vec[d].x;
        const ny = c.y + vec[d].y;
        if (nx < 0 || ny < 0 || nx >= level.gridSize || ny >= level.gridSize) continue;
        if (blocked.has(`${nx},${ny}`)) continue;

        if (nx === target.x && ny === target.y) {
          if (OPPOSITE_DIR[d] === target.inDir) return true;
          continue;
        }

        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        visited.add(key);
        q.push({ x: nx, y: ny });
      }
    }
    return false;
  };

  Object.entries(sources).forEach(([color, source]) => {
    (targets[color] || []).forEach((target) => {
      if (!canReachWithDirections(source, target)) {
        throw new Error(`Level ${level.id}: color route invalid with endpoint directions (${color} ${source.x},${source.y} -> ${target.x},${target.y})`);
      }
    });
  });
};

const validateProgressionOrdering = (levels: SimpleLevelConfig[]) => {
  for (let i = 1; i < levels.length; i += 1) {
    const prev = levels[i - 1];
    const curr = levels[i];
    if (curr.id !== prev.id + 1) {
      throw new Error(`Levels must be consecutive: found ${prev.id} followed by ${curr.id}`);
    }
    if (curr.difficultyWeight < prev.difficultyWeight) {
      throw new Error(`Level ${curr.id}: difficultyWeight must be non-decreasing`);
    }
    if (curr.parTimeMs < prev.parTimeMs - 3000) {
      throw new Error(`Level ${curr.id}: parTimeMs drops too much vs level ${prev.id}`);
    }
  }
};

allLevels.forEach((level) => {
  validateGridShape(level);
  validateDirectionalEndpointTokens(level);
  validateColorPresence(level);
  validateBasicReachability(level);
  validateDirectionalConnectivity(level);
});
validateProgressionOrdering(allLevels);

export const PIPE_PATCH_LEVELS: PipePatchLevelConfig[] = allLevels.map(parseSimpleGrid);

export const PIPE_PATCH_LEVELS_BY_ID: Record<number, PipePatchLevelConfig> = PIPE_PATCH_LEVELS.reduce(
  (acc, level) => {
    acc[level.id] = level;
    return acc;
  },
  {} as Record<number, PipePatchLevelConfig>
);

export const getPipePatchLevel = (level: number): PipePatchLevelConfig => {
  const direct = PIPE_PATCH_LEVELS_BY_ID[level];
  if (direct) return direct;
  const idx = Math.max(0, Math.min(PIPE_PATCH_LEVELS.length - 1, level - 1));
  return PIPE_PATCH_LEVELS[idx];
};
