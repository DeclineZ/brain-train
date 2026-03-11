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
// SYMBOL LEGEND - Unified Numeric Endpoint System
// ============================================================================
// 1 = Blue endpoints (all endpoints with '1' must be connected together)
// 2 = Red endpoints
// 3 = Green endpoints
// 4 = Yellow endpoints
// 5 = Purple endpoints
// # = Blocked cell (wall - cannot place pipe)
// . = Empty cell (player can place pipe here)
// 
// Directional arrows: < > ^ v  (e.g., '1<' = color 1 endpoint facing left)
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

// Numeric code to color mapping
const NUMBER_TO_COLOR: Record<string, ColorId> = {
  '1': 'blue',
  '2': 'red',
  '3': 'green',
  '4': 'yellow',
  '5': 'purple',
};

interface SimpleLevelConfig {
  id: number;
  gridSize: number;
  grid: string[];
  requiredTrayPieces: { code: TrayPieceTypeCode; count: number }[];
  decoyTrayPieces?: { code: TrayPieceTypeCode; count: number }[];
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
  const endpointsByColor = new Map<ColorId, PipePatchEndpoint[]>();

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

    // Support either suffix or prefix arrow forms: `1>` or `>1`
    if (t.length === 2) {
      const a = t[0];
      const b = t[1];
      if (arrowToDir[b]) return { base: a, dir: arrowToDir[b] };
      if (arrowToDir[a]) return { base: b, dir: arrowToDir[a] };
    }

    return { base: t };
  };

  // Helper to determine the default direction for an endpoint based on position
  const getDefaultEndpointDir = (x: number, y: number, gridSize: number): number => {
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
      const coord: Coord = { x, y };

      if (symbol === '#') {
        blockedCells.push(coord);
        continue;
      }

      // Numeric endpoints (1-5)
      if (NUMBER_TO_COLOR[symbol]) {
        const colorId = NUMBER_TO_COLOR[symbol];
        if (!endpointsByColor.has(colorId)) {
          endpointsByColor.set(colorId, []);
        }
        const inDir = dir ?? getDefaultEndpointDir(x, y, size);
        endpointsByColor.get(colorId)!.push({
          position: coord,
          mask: inDir,
          colorId,
        });
      }
    }
  }

  // Build endpoint groups - all endpoints of same color are peers
  const endpointGroups: PipePatchEndpointGroup[] = [];
  endpointsByColor.forEach((endpoints, colorId) => {
    endpointGroups.push({
      colorId,
      endpoints,
    });
  });

  // Build layout string
  const layout = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const { base: symbol } = parseEndpointToken(grid[y][x]);
      if (symbol === '#') return '#';
      if (NUMBER_TO_COLOR[symbol]) return 'E';  // Mark as endpoint
      return '.';
    }).join('')
  );

  // For backwards compatibility, pick first endpoint as "source" and rest as "targets"
  const allEndpoints = Array.from(endpointsByColor.values()).flat();
  const firstEndpoint = allEndpoints[0];
  const restEndpoints = allEndpoints.slice(1);

  const requiredPieceCount = config.requiredTrayPieces.reduce((sum, p) => sum + p.count, 0);
  const decoyPieceCount = (config.decoyTrayPieces ?? []).reduce((sum, p) => sum + p.count, 0);

  const trayPieces: TrayPieceConfig[] = [];
  for (const { code, count } of config.requiredTrayPieces) {
    const pieceType = PIECE_CODE_MAP[code];
    for (let i = 0; i < count; i += 1) {
      trayPieces.push({
        id: `lv${config.id}-${code.toLowerCase()}-req-${i}`,
        pieceType,
        isDecoy: false,
      });
    }
  }
  for (const { code, count } of config.decoyTrayPieces ?? []) {
    const pieceType = PIECE_CODE_MAP[code];
    for (let i = 0; i < count; i += 1) {
      trayPieces.push({
        id: `lv${config.id}-${code.toLowerCase()}-decoy-${i}`,
        pieceType,
        isDecoy: true,
      });
    }
  }

  return {
    id: config.id,
    gridSize: size,
    layout,
    source: firstEndpoint?.position || { x: 0, y: 0 },
    sourceMask: firstEndpoint?.mask || DIR.RIGHT,
    targets: restEndpoints,
    endpointGroups,
    target: restEndpoints[0]?.position || { x: size - 1, y: 0 },
    targetMask: restEndpoints[0]?.mask || DIR.LEFT,
    fixedPipes: [],
    blockedCells,
    lockedPlaceholders: [],
    oneWayGates: [],
    requiredPlacements: [],
    trayPieces,
    requiredPieceCount,
    decoyPieceCount,
    parTimeMs: config.parTimeMs,
    hardTimeMs: config.hardTimeMs,
    difficultyWeight: config.difficultyWeight,
  };
};

// ============================================================================
// COMPLETE 30-LEVEL PROGRESSION - Unified Numeric Endpoints
// All endpoints with same number must be connected together
// ============================================================================
const level1: SimpleLevelConfig = {
  id: 1,
  gridSize: 5,
  grid: [
    '. . . . #',
    '. . . . .',
    '1> . . . .',
    '. . . . .',
    '. . 1^ . .',
  ],
  // Path: (0,2)->(1,2)->(2,2)->(2,3)->(2,4)
  requiredTrayPieces: [
    { code: 'H', count: 2 },  // includes endpoint '1>' + (1,2)
    { code: 'DL', count: 1 }, // (2,2) : Left + Down
    { code: 'V', count: 2 },  // (2,3) + endpoint '1^'
  ],
  decoyTrayPieces: [{ code: 'V', count: 1 }],
  parTimeMs: 11000,
  hardTimeMs: 17000,
  difficultyWeight: 1.0,
};

const level2: SimpleLevelConfig = {
  id: 2,
  gridSize: 5,
  grid: [
    '. 1v . . .',
    '. . . . .',
    '. . . . .',
    '. . . . 1<',
    '# . . . .',
  ],
  // Path: (1,0)->(1,1)->(1,2)->(2,2)->(3,2)->(4,2)->(4,3)
  requiredTrayPieces: [
    { code: 'DL', count: 1 }, // (4,2): Left + Down
    { code: 'H', count: 3 },  // (2,2),(3,2) + endpoint '1<'
    { code: 'UR', count: 1 }, // (1,2): Up + Right
    { code: 'V', count: 3 },  // endpoint '1v' + (1,1)
  ],
  decoyTrayPieces: [{ code: 'H', count: 1 }],
  parTimeMs: 12750,
  hardTimeMs: 19250,
  difficultyWeight: 1.3,
};

const level3: SimpleLevelConfig = {
  id: 3,
  gridSize: 5,
  grid: [
    '. . . . .',
    '1> . . . .',
    '. # . . .',
    '. . . . .',
    '. 1^ . . .',
  ],
  // Path: (0,1)->(1,1)->(2,1)->(2,2)->(2,3)->(1,3)->(1,4)
  requiredTrayPieces: [
    { code: 'DL', count: 1 }, // (2,1): Left + Down
    { code: 'H', count: 2 },  // endpoint '1>' + (1,1)
    { code: 'LU', count: 1 }, // (2,3): Left + Up
    { code: 'RD', count: 1 }, // (1,3): Right + Down
    { code: 'V', count: 2 },  // (2,2) + endpoint '1^'
  ],
  decoyTrayPieces: [{ code: 'V', count: 1 }],
  parTimeMs: 14500,
  hardTimeMs: 21500,
  difficultyWeight: 1.6,
};
const level4: SimpleLevelConfig = {
  id: 4,
  gridSize: 5,
  grid: [
    '. . . . .',
    '1> . . . .',
    '. . . . .',
    '. . . . .',
    '. . . 1^ .',
  ],
  // Path: (0,1)->(3,1)->(3,4)
  requiredTrayPieces: [
    { code: 'H', count: 3 },  // (0,1 endpoint) + (1,1) + (2,1)
    { code: 'DL', count: 1 }, // (3,1): Left + Down
    { code: 'V', count: 3 },  // (3,2) + (3,3) + (3,4 endpoint)
  ],
  decoyTrayPieces: [{ code: 'V', count: 1 }],
  parTimeMs: 14000,
  hardTimeMs: 21000,
  difficultyWeight: 1.7,
};

const level5: SimpleLevelConfig = {
  id: 5,
  gridSize: 5,
  grid: [
    '. . 1v . .',
    '. . . . .',
    '. . . . .',
    '. . . . 1<',
    '. . . . .',
  ],
  // Path: (2,0)->(2,3)->(4,3)
  requiredTrayPieces: [
    { code: 'V', count: 3 },  // (2,0 endpoint) + (2,1) + (2,2)
    { code: 'UR', count: 1 }, // (2,3): Up + Right
    { code: 'H', count: 2 },  // (3,3) + (4,3 endpoint)
  ],
  decoyTrayPieces: [{ code: 'H', count: 1 }],
  parTimeMs: 15750,
  hardTimeMs: 23250,
  difficultyWeight: 1.8,
};

const level6: SimpleLevelConfig = {
  id: 6,
  gridSize: 5,
  grid: [
    '. . . . .',
    '. . # . 1<',
    '1> . # # .',
    '. . . . .',
    '. . . . .',
  ],
  // Forced path via top row:
  // (0,2)->(1,2)->(1,1)->(1,0)->(4,0)->(4,1)
  requiredTrayPieces: [
    { code: 'H', count: 4 },  // (0,2 endpoint) + (2,0) + (3,0) + (4,1 endpoint)
    { code: 'LU', count: 1 }, // (1,2): Left + Up
    { code: 'V', count: 1 },  // (1,1)
    { code: 'RD', count: 1 }, // (1,0): Right + Down
    { code: 'DL', count: 1 }, // (4,0): Down + Left
    { code: 'UR', count: 1 }, // (4,0): Down + Left
  ],
  decoyTrayPieces: [{ code: 'V', count: 1 }],
  parTimeMs: 17750,
  hardTimeMs: 26250,
  difficultyWeight: 2.0,
};
const level7: SimpleLevelConfig = {
  id: 7,
  gridSize: 5,
  grid: [
    '. . 1v . .',
    '. # . # .',
    '. . . . .',
    '. # . . .',
    '1^ . . . .',
  ],
  // Path cells (including endpoints): (2,0)->(2,1)->(2,2)->(1,2)->(0,2)->(0,3)->(0,4)
  requiredTrayPieces: [
    { code: 'V', count: 4 },   // (2,0 endpoint), (2,1), (0,3), (0,4 endpoint)
    { code: 'LU', count: 1 },  // (2,2): Up + Left
    { code: 'H', count: 1 },   // (1,2)
    { code: 'RD', count: 1 },  // (0,2): Right + Down
  ],
  decoyTrayPieces: [{ code: 'H', count: 1 }],
  parTimeMs: 19000,
  hardTimeMs: 28000,
  difficultyWeight: 2.2,
};

const level8: SimpleLevelConfig = {
  id: 8,
  gridSize: 5,
  grid: [
    '. . . . .',
    '. . . . .',
    '1> . # . .',
    '. . # . .',
    '. . . 1^ .',
  ],
  // Path: (0,2)->(1,2)->(1,1)->(2,1)->(3,1)->(3,2)->(3,3)->(3,4)
  requiredTrayPieces: [
    { code: 'H', count: 2 },   // (0,2 endpoint), (2,1)
    { code: 'LU', count: 1 },  // (1,2): Left + Up
    { code: 'RD', count: 1 },  // (1,1): Right + Down
    { code: 'DL', count: 1 },  // (3,1): Down + Left
    { code: 'V', count: 3 },   // (3,2), (3,3), (3,4 endpoint)
  ],
  decoyTrayPieces: [{ code: 'V', count: 1 }],
  parTimeMs: 19750,
  hardTimeMs: 29250,
  difficultyWeight: 2.4,
};

const level9: SimpleLevelConfig = {
  id: 9,
  gridSize: 5,
  grid: [
    '. . 1v . .',
    '. . . # .',
    '. . # # .',
    '. . . . 1<',
    '. . . . .',
  ],
  // Forced detour (block at 2,2): (2,0)->(2,1)->(1,1)->(1,2)->(1,3)->(2,3)->(3,3)->(4,3)
  requiredTrayPieces: [
    { code: 'V', count: 2 },   // (2,0 endpoint), (1,2)
    { code: 'LU', count: 1 },  // (2,1): Up + Left
    { code: 'RD', count: 1 },  // (1,1): Right + Down
    { code: 'UR', count: 1 },  // (1,3): Up + Right
    { code: 'H', count: 3 },   // (2,3), (3,3), (4,3 endpoint)
  ],
  decoyTrayPieces: [{ code: 'H', count: 1 }],
  parTimeMs: 20500,
  hardTimeMs: 30500,
  difficultyWeight: 2.6,
};
const level10: SimpleLevelConfig = {
  id: 10,
  gridSize: 5,
  grid: [
    '. . . . .',
    '1> . # . .',
    '. . # . #',
    '. . . . .',
    '. . . 1^ .',
  ],
  // Solution path (incl. endpoints): (0,1)->(1,1)->(1,2)->(1,3)->(2,3)->(3,3)->(3,4)
  requiredTrayPieces: [
    { code: 'H', count: 2 },   // endpoint '1>' + (2,3)
    { code: 'DL', count: 2 },  // (1,1), (3,3)
    { code: 'UR', count: 1 },  // (1,3)
    { code: 'V', count: 2 },   // (1,2) + endpoint '1^'
  ],
  decoyTrayPieces: [{ code: 'H', count: 1 }],
  parTimeMs: 21000,
  hardTimeMs: 31000,
  difficultyWeight: 2.8,
};

const level11: SimpleLevelConfig = {
  id: 11,
  gridSize: 5,
  grid: [
    '. . . 2v .',
    '1> . # . .',
    '. . . . .',
    '. . . . 2<',
    '. 1^ # . .',
  ],
  // Color 1 path: (0,1)->(1,1)->(1,2)->(1,3)->(1,4)
  // Color 2 path: (3,0)->(3,1)->(3,2)->(3,3)->(4,3)
  requiredTrayPieces: [
    { code: 'DL', count: 1 },  // color1 (1,1)
    { code: 'H', count: 2 },   // endpoints '1>' and '2<'
    { code: 'UR', count: 1 },  // color2 (3,3)
    { code: 'V', count: 6 },   // color1: (1,2),(1,3),endpoint '1^' + color2: endpoint '2v',(3,1),(3,2)
  ],
  decoyTrayPieces: [{ code: 'V', count: 1 }],
  parTimeMs: 23000,
  hardTimeMs: 35000,
  difficultyWeight: 3.0,
};

const level12: SimpleLevelConfig = {
  id: 12,
  gridSize: 5,
  grid: [
    '. . . 2v #',
    '1> . . . .',
    '# . . # .',
    '. . . . 2<',
    '. 1^ . . .',
  ],
  // Color 1 path: (0,1)->(1,1)->(1,2)->(1,3)->(1,4)
  // Color 2 path (detour forced by # at (3,2)):
  // (3,0)->(3,1)->(2,1)->(2,2)->(2,3)->(3,3)->(4,3)
  requiredTrayPieces: [
    { code: 'DL', count: 1 },  // color1 (1,1)
    { code: 'H', count: 3 },   // endpoints '1>' + (3,3) + endpoint '2<'
    { code: 'LU', count: 1 },  // color2 (3,1)
    { code: 'RD', count: 1 },  // color2 (2,1)
    { code: 'UR', count: 1 },  // color2 (2,3)
    { code: 'V', count: 5 },   // color1: (1,2),(1,3),endpoint '1^' + color2: endpoint '2v',(2,2)
  ],
  decoyTrayPieces: [{ code: 'H', count: 1 }],
  parTimeMs: 24250,
  hardTimeMs: 36750,
  difficultyWeight: 3.2,
};
const level13: SimpleLevelConfig = {
  id: 13,
  gridSize: 5,
  grid: [
    '. 1v . 2v .',
    '# .  .  .  .',
    '. #  .  #  .',
    '. .  .  .  .',
    '. 1^ . 2^ .',
  ],
  // Color 1: forced detour (block at (1,2))
  // Path: (1,0)->(1,1)->(2,1)->(2,2)->(2,3)->(1,3)->(1,4)
  // Color 2: forced detour (block at (3,2))
  // Path: (3,0)->(3,1)->(4,1)->(4,2)->(4,3)->(3,3)->(3,4)
  requiredTrayPieces: [
    { code: 'V', count: 6 },
    { code: 'UR', count: 2 },
    { code: 'DL', count: 2 },
    { code: 'LU', count: 2 },
    { code: 'RD', count: 2 },
  ],
  decoyTrayPieces: [{ code: 'H', count: 1 }],
  parTimeMs: 25000,
  hardTimeMs: 38000,
  difficultyWeight: 3.4,
};

const level14: SimpleLevelConfig = {
  id: 14,
  gridSize: 5,
  grid: [
    '. . # . .',
    '1> . # . 1<',
    '. . . . .',
    '2> . . # 2<',
    '. . . . .',
  ],
  // Color 1 (block at (2,1)):
  // (0,1)->(1,1)->(1,2)->(2,2)->(3,2)->(3,1)->(4,1)
  // Color 2 (block at (3,3)):
  // (0,3)->(1,3)->(2,3)->(2,4)->(3,4)->(4,4)->(4,3)
  requiredTrayPieces: [
    { code: 'H', count: 7 },
    { code: 'DL', count: 2 },
    { code: 'UR', count: 2 },
    { code: 'LU', count: 2 },
    { code: 'RD', count: 2 },
  ],
  decoyTrayPieces: [{ code: 'V', count: 1 }],
  parTimeMs: 25750,
  hardTimeMs: 39250,
  difficultyWeight: 3.6,
};

const level15: SimpleLevelConfig = {
  id: 15,
  gridSize: 5,
  grid: [
    '. . 1v . 2v',
    '. . .  .  .',
    '. . #  .  #',
    '# . .  .  .',
    '. . 1^ . 2^',
  ],
  // Color 1 (block at (2,2)):
  // (2,0)->(2,1)->(1,1)->(1,2)->(1,3)->(2,3)->(2,4)
  // Color 2 (block at (4,2)):
  // (4,0)->(4,1)->(3,1)->(3,2)->(3,3)->(4,3)->(4,4)
  requiredTrayPieces: [
    { code: 'V', count: 6 },
    { code: 'LU', count: 2 },
    { code: 'RD', count: 2 },
    { code: 'UR', count: 2 },
    { code: 'DL', count: 2 },
  ],
  decoyTrayPieces: [{ code: 'H', count: 1 }],
  parTimeMs: 27000,
  hardTimeMs: 41000,
  difficultyWeight: 3.8,
};
const level16: SimpleLevelConfig = {
  id: 16,
  gridSize: 5,
  grid: [
    '. . 1v 2v .',
    '. # . . #',
    '1> . . . .',
    '. . . . #',
    '. # 1^ 2^ .',
  ],
  // Color 1: vertical lane at x=2 + extra endpoint from left at y=2 (forces a T at (2,2))
  // Color 2: vertical lane at x=3
  // required counts INCLUDE endpoint cells
  requiredTrayPieces: [
    { code: 'H', count: 2 },   // '1>' endpoint + (1,2)
    { code: 'TD', count: 1 },  // junction at (2,2): Up+Down+Left
    { code: 'V', count: 9 },   // color1: 4, color2: 5
  ],
  decoyTrayPieces: [{ code: 'V', count: 1 }],
  parTimeMs: 27750,
  hardTimeMs: 42250,
  difficultyWeight: 4.0,
};

const level17: SimpleLevelConfig = {
  id: 17,
  gridSize: 5,
  grid: [
    '. 1v 2v 3v .',
    '. . . . #',
    '1> . . . .',
    '. . . . #',
    '# 1^ 2^ 3^ .',
  ],
  // 3 colors, all vertical lanes; Color 1 has 3 endpoints (extra from left) without crossing others
  requiredTrayPieces: [
    { code: 'H', count: 1 },   // '1>' endpoint
    { code: 'TD', count: 1 },  // junction at (1,2): Up+Down+Left
    { code: 'V', count: 14 },  // color1: 4 (since one cell becomes TD), color2:5, color3:5
  ],
  decoyTrayPieces: [{ code: 'H', count: 1 }],
  parTimeMs: 29500,
  hardTimeMs: 44500,
  difficultyWeight: 4.2,
};

const level18: SimpleLevelConfig = {
  id: 18,
  gridSize: 5,
  grid: [
    '. 1v 2v 3v .',
    '# . . . .',
    '. . . . 3<',
    '# . . . #',
    '# 1^ 2^ 3^ .',
  ],
  // 3 colors, all vertical lanes; Color 3 has 3 endpoints (extra from right) (forces a T at (3,2))
  requiredTrayPieces: [
    { code: 'H', count: 1 },   // '3<' endpoint
    { code: 'TU', count: 1 },  // junction at (3,2): Up+Right+Down
    { code: 'V', count: 14 },  // color1:5, color2:5, color3:4 (since one cell becomes TU)
  ],
  decoyTrayPieces: [{ code: 'V', count: 1 }],
  parTimeMs: 31500,
  hardTimeMs: 47500,
  difficultyWeight: 4.4,
};
const level19: SimpleLevelConfig = {
  id: 19,
  gridSize: 5,
  grid: [
    '. . 2v . 1v',
    '# # . # .',
    '1> . . . .',
    '# # . # #',
    '. . 2^ # #',
  ],
  // Color 1: (0,2) -> across row2 -> up col4 -> (4,0)
  // Color 2: vertical col2 (2,0) -> (2,4)
  // Required XO at (2,2)
  requiredTrayPieces: [
    { code: 'H', count: 3 },
    { code: 'V', count: 6 },
    { code: 'LU', count: 1 },
    { code: 'XO', count: 1 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
  ],
  parTimeMs: 32000,
  hardTimeMs: 47000,
  difficultyWeight: 4.6,
};

const level20: SimpleLevelConfig = {
  id: 20,
  gridSize: 5,
  grid: [
    '. . 2v 3v 1v',
    '# # . . .',
    '1> . . . .',
    '# # . . #',
    '. . 2^ 3^ #',
  ],
  // Color 1: (0,2) -> row2 -> up col4 -> (4,0)
  // Color 2: vertical col2
  // Color 3: vertical col3
  // Required XO at (2,2) and (3,2)
  requiredTrayPieces: [
    { code: 'H', count: 2 },
    { code: 'V', count: 10 },
    { code: 'LU', count: 1 },
    { code: 'XO', count: 2 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
  ],
  parTimeMs: 33800,
  hardTimeMs: 49400,
  difficultyWeight: 4.9,
};

const level21: SimpleLevelConfig = {
  id: 21,
  gridSize: 6,
  grid: [
    '# . 1v 2v 3v #',
    '. # . . . .',
    '. . . . . .',
    '1> . . . . 1<',
    '. . . . . .',
    '# . . 2^ 3^ #',
  ],
  // Color 1: horizontal row3 (0,3)->(5,3) + extra endpoint (2,0) branching down to (2,3) => forces a T-piece
  // Color 2: vertical col3 crosses at (3,3) => XO
  // Color 3: vertical col4 crosses at (4,3) => XO
  requiredTrayPieces: [
    { code: 'H', count: 3 },
    { code: 'V', count: 13 },
    { code: 'TL', count: 1 },
    { code: 'XO', count: 2 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
    { code: 'XO', count: 1 },
  ],
  parTimeMs: 36400,
  hardTimeMs: 53200,
  difficultyWeight: 5.2,
};
const level22: SimpleLevelConfig = {
  id: 22,
  gridSize: 6,
  grid: [
    '. . 1v 2v . #',
    '1> . . . # .',
    '# . . . . .',
    '3> . . . . 3<',
    '. # . . . .',
    '# . 1^ 2^ # .',
  ],
  // Pieces (incl. endpoints):
  // H=6, V=9, TD=1, XO=2
  requiredTrayPieces: [
    { code: 'H', count: 6 },
    { code: 'V', count: 9 },
    { code: 'TD', count: 1 },
    { code: 'XO', count: 2 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
    { code: 'XO', count: 1 },
  ],
  parTimeMs: 37500,
  hardTimeMs: 54500,
  difficultyWeight: 5.4,
};

const level23: SimpleLevelConfig = {
  id: 23,
  gridSize: 6,
  grid: [
    '# . 2v . 3v #',
    '. # . . . #',
    '1> . . . . 1<',
    '# # . . . .',
    '. . . . . 2<',
    '# . 2^ . 3^ #',
  ],
  // Pieces (incl. endpoints):
  // H=6, V=8, TU=1, XO=3
  requiredTrayPieces: [
    { code: 'H', count: 6 },
    { code: 'V', count: 8 },
    { code: 'TU', count: 1 },
    { code: 'XO', count: 3 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
    { code: 'UR', count: 1 },
  ],
  parTimeMs: 39650,
  hardTimeMs: 57950,
  difficultyWeight: 5.6,
};

const level24: SimpleLevelConfig = {
  id: 24,
  gridSize: 6,
  grid: [
    '# 2v . 1v 3v #',
    '1> . . . . .',
    '. . # . . .',
    '. . # . . .',
    '. . # . . 1<',
    '# 2^ . 1^ 3^ #',
  ],
  // Pieces (incl. endpoints):
  // H=3, V=14, TD=1, TU=1, XO=2
  requiredTrayPieces: [
    { code: 'H', count: 3 },
    { code: 'V', count: 14 },
    { code: 'TD', count: 1 },
    { code: 'TU', count: 1 },
    { code: 'XO', count: 2 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
    { code: 'XO', count: 1 },
  ],
  parTimeMs: 41600,
  hardTimeMs: 60800,
  difficultyWeight: 5.8,
};
const level25: SimpleLevelConfig = {
  id: 25,
  gridSize: 6,
  grid: [
    '. . 2v 1v 3v .',
    '. # . . . .',
    '. # . . . #',
    '1> . . . . 1<',
    '# . . . . .',
    '. . 2^ . 3^ .',
  ],
  // Color1: row3 left↔right + branch from top (x=3) => TL at (3,3)
  // Color2: vertical col2 (XO at (2,3))
  // Color3: vertical col4 (XO at (4,3))
  requiredTrayPieces: [
    { code: 'H', count: 3 },
    { code: 'TL', count: 1 },
    { code: 'V', count: 13 },
    { code: 'XO', count: 2 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
  ],
  parTimeMs: 41600,
  hardTimeMs: 60800,
  difficultyWeight: 6.0,
};

const level26: SimpleLevelConfig = {
  id: 26,
  gridSize: 6,
  grid: [
    '. 2v . 3v 4v .',
    '# . # . . #',
    '. . . . . 2<',
    '1> . . . . 1<',
    '# . . . . .',
    '. 2^ . 3^ 4^ .',
  ],
  // Color1: row3 left↔right (XO at x=1,3,4)
  // Color2: vertical col1 + branch from right on row2 => TU at (1,2), XO at (3,2),(4,2)
  // Color3: vertical col3 (XO at (3,2),(3,3))
  // Color4: vertical col4 (XO at (4,2),(4,3))
  requiredTrayPieces: [
    { code: 'H', count: 5 },
    { code: 'TU', count: 1 },
    { code: 'V', count: 12 },
    { code: 'XO', count: 5 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
  ],
  parTimeMs: 44200,
  hardTimeMs: 64600,
  difficultyWeight: 6.2,
};

const level27: SimpleLevelConfig = {
  id: 27,
  gridSize: 6,
  grid: [
    '. . 3v # 4v .',
    '1> . . . . 1<',
    '3> . . . . #',
    '. # . . . .',
    '2> . . . . 2<',
    '. # 3^ # 4^ .',
  ],
  // Color1: row1 left↔right (XO at (2,1),(4,1))
  // Color2: row4 left↔right (XO at (2,4),(4,4))
  // Color3: vertical col2 + extra endpoint from left on row2 => TD at (2,2)
  // Color4: vertical col4
  requiredTrayPieces: [
    { code: 'H', count: 10 },
    { code: 'TD', count: 1 },
    { code: 'V', count: 7 },
    { code: 'XO', count: 4 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
    { code: 'XO', count: 1 },
  ],
  parTimeMs: 46800,
  hardTimeMs: 68400,
  difficultyWeight: 6.4,
};
const level28: SimpleLevelConfig = {
  id: 28,
  gridSize: 6,
  grid: [
    '# 2v 3v 1v 4v #',
    '. . . . . .',
    '1> . . . . 1<',
    '. . . . . .',
    '. . . # . .',
    '# 2^ 3^ . 4^ #',
  ],
  // Crossovers at (1,2), (2,2), (4,2)
  requiredTrayPieces: [
    { code: 'H', count: 2 },   // endpoints: 1> and 1<
    { code: 'TL', count: 1 },  // junction at (3,2): L+U+R
    { code: 'V', count: 17 },  // 1v branch + 3 vertical colors (excluding XO cells)
    { code: 'XO', count: 3 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
    { code: 'XO', count: 1 },
  ],
  parTimeMs: 46800,
  hardTimeMs: 68400,
  difficultyWeight: 6.6,
};

const level29: SimpleLevelConfig = {
  id: 29,
  gridSize: 6,
  grid: [
    '# . 3v . 4v #',
    '1> . . . . 1<',
    '. . . # . .',
    '3> . . . . .',
    '2> . . . . 2<',
    '# # 3^ . 4^ #',
  ],
  // Crossovers at (2,1), (4,1), (2,4), (4,4)
  // Color 3 has 3 endpoints (extra 3>) forcing a TD tee at (2,3)
  requiredTrayPieces: [
    { code: 'H', count: 10 },
    { code: 'TD', count: 1 },  // (2,3): U+D+L
    { code: 'V', count: 7 },
    { code: 'XO', count: 4 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
    { code: 'UR', count: 1 },
  ],
  parTimeMs: 50700,
  hardTimeMs: 74100,
  difficultyWeight: 7.0,
};

const level30: SimpleLevelConfig = {
  id: 30,
  gridSize: 6,
  grid: [
    '# 2v 3v # 4v #',
    '. . . . . .',
    '1> . . . . 1<',
    '. . . . . .',
    '1> . . . . 1<',
    '# 2^ 3^ # 4^ #',
  ],
  // Heavy XO: (1,2),(2,2),(4,2) and (1,4),(2,4),(4,4)
  // Color 1 uses two horizontal buses (y=2,y=4) connected by a vertical link at x=3,
  // creating a TR at (3,2) and TL at (3,4).
  requiredTrayPieces: [
    { code: 'H', count: 4 },   // four endpoints for color 1
    { code: 'TL', count: 1 },  // (3,4): U+L+R
    { code: 'TR', count: 1 },  // (3,2): L+R+D
    { code: 'V', count: 13 },
    { code: 'XO', count: 6 },
  ],
  decoyTrayPieces: [
    { code: 'H', count: 1 },
    { code: 'V', count: 1 },
    { code: 'XO', count: 1 },
  ],
  parTimeMs: 54600,
  hardTimeMs: 79800,
  difficultyWeight: 7.4,
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

// ============================================================================
// VALIDATORS
// ============================================================================

const validateGridShape = (level: SimpleLevelConfig) => {
  if (level.grid.length !== level.gridSize) {
    throw new Error(`Level ${level.id}: grid row count must equal gridSize (${level.gridSize})`);
  }
  const badRow = level.grid.find((row) => row.trim().split(/\s+/).length !== level.gridSize);
  if (badRow) {
    throw new Error(`Level ${level.id}: every grid row must contain ${level.gridSize} tokens`);
  }
};

const validateEndpointCount = (level: SimpleLevelConfig) => {
  const endpointCounts: Record<string, number> = {};
  
  level.grid.forEach((row) => {
    row.trim().split(/\s+/).forEach((token) => {
      const base = token.replace(/[<>^vV]/g, '');
      if (NUMBER_TO_COLOR[base]) {
        endpointCounts[base] = (endpointCounts[base] ?? 0) + 1;
      }
    });
  });

  Object.entries(endpointCounts).forEach(([num, count]) => {
    if (count < 2) {
      throw new Error(`Level ${level.id}: color ${num} has only ${count} endpoint(s), need at least 2`);
    }
  });
};

const validateEndpointTokens = (level: SimpleLevelConfig) => {
  const validSymbols = new Set(['1', '2', '3', '4', '5', '.', '#']);
  const endpointSymbols = new Set(['1', '2', '3', '4', '5']);
  const arrows = new Set(['<', '>', '^', 'v', 'V']);

  level.grid.forEach((row, rowIndex) => {
    row.trim().split(/\s+/).forEach((token, colIndex) => {
      if (token.length === 1) {
        if (!validSymbols.has(token)) {
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
  const endpointsByColor: Record<string, Coord[]> = {};

  for (let y = 0; y < level.gridSize; y += 1) {
    for (let x = 0; x < level.gridSize; x += 1) {
      const base = grid[y][x].replace(/[<>^vV]/g, '');
      if (base === '#') {
        blocked.add(`${x},${y}`);
        continue;
      }
      if (NUMBER_TO_COLOR[base]) {
        if (!endpointsByColor[base]) endpointsByColor[base] = [];
        endpointsByColor[base].push({ x, y });
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

  Object.entries(endpointsByColor).forEach(([color, endpoints]) => {
    // Check that all endpoints of same color can reach each other
    for (let i = 0; i < endpoints.length; i += 1) {
      for (let j = i + 1; j < endpoints.length; j += 1) {
        if (!canReach(endpoints[i], endpoints[j])) {
          throw new Error(`Level ${level.id}: color ${color} endpoints at (${endpoints[i].x},${endpoints[i].y}) and (${endpoints[j].x},${endpoints[j].y}) are not reachable from each other`);
        }
      }
    }
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
  validateEndpointTokens(level);
  validateEndpointCount(level);
  validateBasicReachability(level);
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