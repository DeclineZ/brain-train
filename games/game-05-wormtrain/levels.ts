import { LevelData } from './types/level';

// Helper to create simple points
const p = (x: number, y: number) => ({ x, y });

/**
 * Re-designed LEVELS 1–15:
 * - Difficulty ramps properly (layout + timing + traps + size mechanic).
 * - Early: 2–3 colors, 1–2 junctions, no traps.
 * - Mid: 3–5 colors, more junctions, narrow paths + size routing, traps start.
 * - Late: 5–6 worms, dense networks, multiple traps (SPIDER + EARTHQUAKE), loops for dodging.
 * - NO 4-way junctions (max 3 outEdges per junction).
 */
export const LEVELS: LevelData[] = [
  // =========================================================================
  // TUTORIAL (0)
  // =========================================================================
  {
    levelId: 0,
    metadata: { name: 'Tutorial', rating: 1 },
    colors: ['#5170ff', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: 160 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 420 },
      { id: 'hB', type: 'HOLE', x: 280, y: 820, color: '#5170ff' },
      { id: 'hO', type: 'HOLE', x: 520, y: 820, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, 160), p(400, 420)], length: 260, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'hB', path: [p(400, 420), p(280, 620), p(280, 820)], length: 420, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hO', path: [p(400, 420), p(520, 620), p(520, 820)], length: 420, widthClass: 'normal' },
    ],
    junctions: [{ id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 }], // Default points to Orange (Right), first worm is Blue (Left)
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 70 }, // Increased speed
      { id: 'w2', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 9000, speed: 70 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 2 },
  },

  // =========================================================================
  // EASY (1-3) — learn routing, 2–3 colors, no traps
  // =========================================================================

  // LEVEL 1: Two Lanes (2 colors, 1 junction)
  {
    levelId: 1,
    metadata: { name: 'Two Lanes', rating: 1 },
    colors: ['#5170ff', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: 160 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 420 },
      { id: 'hB', type: 'HOLE', x: 280, y: 820, color: '#5170ff' },
      { id: 'hO', type: 'HOLE', x: 520, y: 820, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, 160), p(400, 420)], length: 260, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'hB', path: [p(400, 420), p(280, 620), p(280, 820)], length: 420, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hO', path: [p(400, 420), p(520, 620), p(520, 820)], length: 420, widthClass: 'normal' },
    ],
    junctions: [{ id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 0 }],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 60 },
      { id: 'w2', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 4200, speed: 60 },
      { id: 'w3', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 7400, speed: 60 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 3 },
  },

  // LEVEL 2: Gentle Zig (3 colors, 2 junctions)
  {
    levelId: 2,
    metadata: { name: 'Gentle Zig', rating: 1 },
    colors: ['#5170ff', '#58CC02', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 300, y: 160 },
      { id: 'j1', type: 'JUNCTION', x: 300, y: 420 },
      { id: 'j2', type: 'JUNCTION', x: 520, y: 600 },
      { id: 'hB', type: 'HOLE', x: 300, y: 860, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 520, y: 860, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 660, y: 860, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(300, 160), p(300, 420)], length: 260, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'hB', path: [p(300, 420), p(300, 860)], length: 440, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j2', path: [p(300, 420), p(410, 510), p(520, 600)], length: 300, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'hG', path: [p(520, 600), p(520, 860)], length: 260, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hO', path: [p(520, 600), p(660, 720), p(660, 860)], length: 340, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 1000, speed: 65 },
      { id: 'w2', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 3600, speed: 65 },
      { id: 'w3', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 6200, speed: 65 },
      { id: 'w4', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 8800, speed: 65 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 4 },
  },

  // LEVEL 3: Triple Gate (3-way split, still no traps)
  {
    levelId: 3,
    metadata: { name: 'Triple Gate', rating: 2 },
    colors: ['#5170ff', '#58CC02', '#FFD700'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: 150 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 380 },
      { id: 'hB', type: 'HOLE', x: 240, y: 820, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 400, y: 900, color: '#58CC02' },
      { id: 'hY', type: 'HOLE', x: 560, y: 820, color: '#FFD700' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, 150), p(400, 380)], length: 230, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'hB', path: [p(400, 380), p(300, 560), p(240, 820)], length: 470, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hG', path: [p(400, 380), p(400, 900)], length: 520, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'hY', path: [p(400, 380), p(500, 560), p(560, 820)], length: 470, widthClass: 'normal' },
    ],
    junctions: [{ id: 'j1', outEdges: ['e2', 'e3', 'e4'], defaultIndex: 1 }],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 65 },
      { id: 'w2', size: 'M', color: '#FFD700', spawnNodeId: 's', spawnTimeMs: 3500, speed: 65 },
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 6000, speed: 65 },
      { id: 'w4', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 8500, speed: 65 },
      { id: 'w5', size: 'M', color: '#FFD700', spawnNodeId: 's', spawnTimeMs: 11000, speed: 65 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // =========================================================================
  // MID (4-10) — size mechanic, narrow lanes, first traps, loops begin
  // =========================================================================

  // LEVEL 4: Size Lesson (3 colors + S/M routing)
  {
    levelId: 4,
    metadata: { name: 'Size Lesson', rating: 2 },
    colors: ['#5170ff', '#58CC02', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: 140 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 320 },

      { id: 'jL', type: 'JUNCTION', x: 240, y: 520 }, // size split
      { id: 'hBS', type: 'HOLE', x: 160, y: 820, color: '#5170ff', size: 'S' },
      { id: 'hBM', type: 'HOLE', x: 320, y: 820, color: '#5170ff', size: 'M' },

      { id: 'jR', type: 'JUNCTION', x: 560, y: 520 }, // color split
      { id: 'hG', type: 'HOLE', x: 500, y: 820, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 660, y: 820, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, 140), p(400, 320)], length: 180, widthClass: 'normal' },

      { id: 'e2', from: 'j1', to: 'jL', path: [p(400, 320), p(240, 320), p(240, 520)], length: 360, widthClass: 'normal' },
      { id: 'e3', from: 'jL', to: 'hBS', path: [p(240, 520), p(160, 670), p(160, 820)], length: 380, widthClass: 'narrow' },
      { id: 'e4', from: 'jL', to: 'hBM', path: [p(240, 520), p(320, 670), p(320, 820)], length: 300, widthClass: 'normal' },

      { id: 'e5', from: 'j1', to: 'jR', path: [p(400, 320), p(560, 320), p(560, 520)], length: 360, widthClass: 'normal' },
      { id: 'e6', from: 'jR', to: 'hG', path: [p(560, 520), p(500, 670), p(500, 820)], length: 320, widthClass: 'normal' },
      { id: 'e7', from: 'jR', to: 'hO', path: [p(560, 520), p(660, 670), p(660, 820)], length: 320, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e5'], defaultIndex: 0 },
      { id: 'jL', outEdges: ['e4', 'e3'], defaultIndex: 0 },
      { id: 'jR', outEdges: ['e6', 'e7'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'S', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 68 },
      { id: 'w2', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 3200, speed: 68 },
      { id: 'w3', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 5400, speed: 68 },
      { id: 'w4', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 7600, speed: 68 },
      { id: 'w5', size: 'S', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 9800, speed: 68 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // LEVEL 5: Switch Strip (3 colors, 5 junctions, first loop)
  {
    levelId: 5,
    metadata: { name: 'Switch Strip', rating: 3 },
    colors: ['#5170ff', '#58CC02', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: 110 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 260 },
      { id: 'j2', type: 'JUNCTION', x: 260, y: 420 },
      { id: 'j3', type: 'JUNCTION', x: 540, y: 420 },
      { id: 'j4', type: 'JUNCTION', x: 260, y: 620 },
      { id: 'j5', type: 'JUNCTION', x: 540, y: 620 },
      { id: 'hB', type: 'HOLE', x: 220, y: 860, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 400, y: 900, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 580, y: 860, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, 110), p(400, 260)], length: 150, widthClass: 'normal' },

      // j1 splits to left/right corridors
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 260), p(260, 260), p(260, 420)], length: 300, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 260), p(540, 260), p(540, 420)], length: 300, widthClass: 'normal' },

      // left column
      { id: 'e4', from: 'j2', to: 'j4', path: [p(260, 420), p(260, 620)], length: 200, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j3', path: [p(260, 420), p(400, 420), p(540, 420)], length: 280, widthClass: 'normal' }, // bridge

      // right column
      { id: 'e6', from: 'j3', to: 'j5', path: [p(540, 420), p(540, 620)], length: 200, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'j2', path: [p(540, 420), p(400, 420), p(260, 420)], length: 280, widthClass: 'normal' }, // bridge back (loop)

      // bottom choices (no 4-way)
      { id: 'e8', from: 'j4', to: 'hB', path: [p(260, 620), p(220, 740), p(220, 860)], length: 280, widthClass: 'normal' },
      { id: 'e9', from: 'j4', to: 'j5', path: [p(260, 620), p(400, 620), p(540, 620)], length: 280, widthClass: 'normal' },

      { id: 'e10', from: 'j5', to: 'hO', path: [p(540, 620), p(580, 740), p(580, 860)], length: 280, widthClass: 'normal' },
      { id: 'e11', from: 'j5', to: 'hG', path: [p(540, 620), p(400, 760), p(400, 900)], length: 360, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e6', 'e7'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e8', 'e9'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e10', 'e11'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 1000, speed: 55 },
      { id: 'w2', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 4000, speed: 55 },
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 7000, speed: 55 },
      { id: 'w4', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 10000, speed: 55 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 13000, speed: 55 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // LEVEL 6: First Quake (4 colors, earthquake at center - learns quake mechanic)
  {
    levelId: 6,
    metadata: { name: 'First Quake', rating: 3 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: 110 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 270 },
      { id: 'j2', type: 'JUNCTION', x: 260, y: 430 },
      { id: 'j3', type: 'JUNCTION', x: 540, y: 430 },
      { id: 'j4', type: 'JUNCTION', x: 400, y: 560 }, // earthquake here
      { id: 'hB', type: 'HOLE', x: 220, y: 860, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 340, y: 900, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 460, y: 900, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 580, y: 860, color: '#E91E63' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, 110), p(400, 270)], length: 160, widthClass: 'normal' },

      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 270), p(260, 270), p(260, 430)], length: 300, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 270), p(540, 270), p(540, 430)], length: 300, widthClass: 'normal' },

      // into center (and small loop around it)
      { id: 'e4', from: 'j2', to: 'j4', path: [p(260, 430), p(330, 500), p(400, 560)], length: 260, widthClass: 'normal' },
      { id: 'e5', from: 'j3', to: 'j4', path: [p(540, 430), p(470, 500), p(400, 560)], length: 260, widthClass: 'normal' },

      { id: 'e6', from: 'j4', to: 'j2', path: [p(400, 560), p(330, 500), p(260, 430)], length: 260, widthClass: 'normal' }, // loop
      { id: 'e7', from: 'j4', to: 'j3', path: [p(400, 560), p(470, 500), p(540, 430)], length: 260, widthClass: 'normal' }, // loop

      // exits to holes (split 3-way from center is OK)
      { id: 'e8', from: 'j2', to: 'hB', path: [p(260, 430), p(220, 640), p(220, 860)], length: 430, widthClass: 'normal' },
      { id: 'e9', from: 'j4', to: 'hG', path: [p(400, 560), p(340, 720), p(340, 900)], length: 360, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hO', path: [p(400, 560), p(460, 720), p(460, 900)], length: 360, widthClass: 'normal' },
      { id: 'e11', from: 'j3', to: 'hP', path: [p(540, 430), p(580, 640), p(580, 860)], length: 430, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4', 'e8'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e5', 'e11'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e9', 'e10', 'e6'], defaultIndex: 0 }, // 3-way (no 4-way)
    ],
    traps: [{ id: 't1', type: 'EARTHQUAKE', nodeId: 'j4', intervalMs: 5500, initialDelayMs: 3000 }],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 55 },
      { id: 'w2', size: 'M', color: '#E91E63', spawnNodeId: 's', spawnTimeMs: 4000, speed: 55 },
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 7000, speed: 55 },
      { id: 'w4', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 10000, speed: 55 },
      { id: 'w5', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 13000, speed: 55 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // LEVEL 7: Double Quake (3 colors, 2 earthquakes - learns to react faster)
  {
    levelId: 7,
    metadata: { name: 'Double Quake', rating: 3 },
    colors: ['#5170ff', '#58CC02', '#ff914d'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 260, y: 120 },
      { id: 's2', type: 'SPAWN', x: 540, y: 120 },

      { id: 'j1', type: 'JUNCTION', x: 260, y: 290 },
      { id: 'j2', type: 'JUNCTION', x: 540, y: 290 },
      { id: 'j3', type: 'JUNCTION', x: 400, y: 470 }, // quake 1
      { id: 'j4', type: 'JUNCTION', x: 260, y: 640 }, // quake 2
      { id: 'j5', type: 'JUNCTION', x: 540, y: 640 },

      { id: 'hB', type: 'HOLE', x: 220, y: 900, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 400, y: 920, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 580, y: 900, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(260, 120), p(260, 290)], length: 170, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(540, 120), p(540, 290)], length: 170, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'j3', path: [p(260, 290), p(330, 380), p(400, 470)], length: 260, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j3', path: [p(540, 290), p(470, 380), p(400, 470)], length: 260, widthClass: 'normal' },

      { id: 'e5', from: 'j3', to: 'j4', path: [p(400, 470), p(260, 560), p(260, 640)], length: 280, widthClass: 'normal' },
      { id: 'e6', from: 'j3', to: 'j5', path: [p(400, 470), p(540, 560), p(540, 640)], length: 280, widthClass: 'normal' },

      // bottom: small loop so player can re-route after quake
      { id: 'e7', from: 'j4', to: 'j5', path: [p(260, 640), p(400, 640), p(540, 640)], length: 280, widthClass: 'normal' },
      { id: 'e8', from: 'j5', to: 'j4', path: [p(540, 640), p(400, 640), p(260, 640)], length: 280, widthClass: 'normal' },

      { id: 'e9', from: 'j4', to: 'hB', path: [p(260, 640), p(220, 770), p(220, 900)], length: 260, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hG', path: [p(260, 640), p(330, 780), p(400, 920)], length: 360, widthClass: 'normal' },
      { id: 'e11', from: 'j5', to: 'hO', path: [p(540, 640), p(580, 770), p(580, 900)], length: 260, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3'], defaultIndex: 0 }, // single out is ok
      { id: 'j2', outEdges: ['e4'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e5', 'e6'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e9', 'e10', 'e7'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e11', 'e8'], defaultIndex: 0 },
    ],
    traps: [
      { id: 't1', type: 'EARTHQUAKE', nodeId: 'j3', intervalMs: 5000, initialDelayMs: 2500 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j4', intervalMs: 5500, initialDelayMs: 4500 },
    ],
    worms: [
      { id: 'w1', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 55 },
      { id: 'w2', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 4000, speed: 55 },
      { id: 'w3', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 7000, speed: 55 },
      { id: 'w4', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 10000, speed: 55 },
      { id: 'w5', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 13000, speed: 55 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // LEVEL 8: Narrow Choice (4 colors, size + narrow is mandatory)
  {
    levelId: 8,
    metadata: { name: 'Narrow Choice', rating: 4 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#FFD700'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: 110 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 270 },

      { id: 'j2', type: 'JUNCTION', x: 260, y: 450 }, // left (narrow) - for S worms
      { id: 'j3', type: 'JUNCTION', x: 540, y: 450 }, // right (normal) - for M worms

      // Left side: Blue S hole only (narrow path)
      { id: 'hBS', type: 'HOLE', x: 200, y: 860, color: '#5170ff', size: 'S' },

      // Right side: All M holes (normal path)
      { id: 'hYM', type: 'HOLE', x: 430, y: 900, color: '#FFD700' },
      { id: 'hG', type: 'HOLE', x: 540, y: 900, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 650, y: 860, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, 110), p(400, 270)], length: 160, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 270), p(260, 270), p(260, 450)], length: 320, widthClass: 'narrow' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 270), p(540, 270), p(540, 450)], length: 320, widthClass: 'normal' },

      // Left: only narrow to S hole
      { id: 'e4', from: 'j2', to: 'hBS', path: [p(260, 450), p(200, 650), p(200, 860)], length: 430, widthClass: 'narrow' },

      // Right: normal paths to M holes
      { id: 'e5', from: 'j3', to: 'hYM', path: [p(540, 450), p(430, 670), p(430, 900)], length: 480, widthClass: 'normal' },
      { id: 'e6', from: 'j3', to: 'hG', path: [p(540, 450), p(540, 670), p(540, 900)], length: 450, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'hO', path: [p(540, 450), p(650, 650), p(650, 860)], length: 430, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e5', 'e6', 'e7'], defaultIndex: 0 },
    ],
    traps: [{ id: 't1', type: 'EARTHQUAKE', nodeId: 'j3', intervalMs: 4800, initialDelayMs: 3000 }],
    worms: [
      { id: 'w1', size: 'S', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 55 },
      { id: 'w2', size: 'M', color: '#FFD700', spawnNodeId: 's', spawnTimeMs: 4000, speed: 55 },
      { id: 'w3', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 7000, speed: 55 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 10000, speed: 55 },
      { id: 'w5', size: 'S', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 13000, speed: 55 },
      { id: 'w6', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 16000, speed: 55 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 9: Mixed Hazards (4 colors, spider + quake, loop mandatory)
  {
    levelId: 9,
    metadata: { name: 'Mixed Hazards', rating: 4 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 240, y: 120 },
      { id: 's2', type: 'SPAWN', x: 560, y: 120 },

      { id: 'j1', type: 'JUNCTION', x: 240, y: 290 },
      { id: 'j2', type: 'JUNCTION', x: 560, y: 290 },

      { id: 'j3', type: 'JUNCTION', x: 400, y: 430 }, // spider
      { id: 'j4', type: 'JUNCTION', x: 240, y: 610 }, // quake
      { id: 'j5', type: 'JUNCTION', x: 560, y: 610 },

      { id: 'hB', type: 'HOLE', x: 200, y: 900, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 330, y: 930, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 470, y: 930, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 600, y: 900, color: '#E91E63' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(240, 120), p(240, 290)], length: 170, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(560, 120), p(560, 290)], length: 170, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'j3', path: [p(240, 290), p(320, 360), p(400, 430)], length: 260, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j3', path: [p(560, 290), p(480, 360), p(400, 430)], length: 260, widthClass: 'normal' },

      // from center to bottom (and back up = loop)
      { id: 'e5', from: 'j3', to: 'j4', path: [p(400, 430), p(240, 520), p(240, 610)], length: 320, widthClass: 'normal' },
      { id: 'e6', from: 'j3', to: 'j5', path: [p(400, 430), p(560, 520), p(560, 610)], length: 320, widthClass: 'normal' },

      { id: 'e7', from: 'j4', to: 'j3', path: [p(240, 610), p(320, 520), p(400, 430)], length: 320, widthClass: 'normal' }, // dodge back
      { id: 'e8', from: 'j5', to: 'j3', path: [p(560, 610), p(480, 520), p(400, 430)], length: 320, widthClass: 'normal' },

      // exits
      { id: 'e9', from: 'j4', to: 'hB', path: [p(240, 610), p(200, 760), p(200, 900)], length: 290, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hG', path: [p(240, 610), p(285, 770), p(330, 930)], length: 360, widthClass: 'normal' },

      { id: 'e11', from: 'j5', to: 'hO', path: [p(560, 610), p(515, 770), p(470, 930)], length: 360, widthClass: 'normal' },
      { id: 'e12', from: 'j5', to: 'hP', path: [p(560, 610), p(600, 760), p(600, 900)], length: 290, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e5', 'e6'], defaultIndex: 0 }, // keep center simple (trap node)
      { id: 'j4', outEdges: ['e9', 'e10', 'e7'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e12', 'e11', 'e8'], defaultIndex: 0 },
    ],
    traps: [
      { id: 't1', type: 'EARTHQUAKE', nodeId: 'j3', intervalMs: 4500, initialDelayMs: 2000 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j4', intervalMs: 4500, initialDelayMs: 3500 },
    ],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 55 },
      { id: 'w2', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 4000, speed: 55 },
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 7000, speed: 55 },
      { id: 'w4', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 10000, speed: 55 },
      { id: 'w5', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 13000, speed: 55 },
      { id: 'w6', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 16000, speed: 55 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 10: Web Maze (5 colors, dense, 2 spiders + 1 quake, multiple loops)
  {
    levelId: 10,
    metadata: { name: 'Web Maze', rating: 5 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 200, y: 110 },
      { id: 's2', type: 'SPAWN', x: 600, y: 110 },

      { id: 'j1', type: 'JUNCTION', x: 200, y: 260 },
      { id: 'j2', type: 'JUNCTION', x: 400, y: 260 },
      { id: 'j3', type: 'JUNCTION', x: 600, y: 260 },

      { id: 'j4', type: 'JUNCTION', x: 200, y: 440 }, // spider
      { id: 'j5', type: 'JUNCTION', x: 400, y: 440 }, // quake
      { id: 'j6', type: 'JUNCTION', x: 600, y: 440 }, // spider

      { id: 'j7', type: 'JUNCTION', x: 300, y: 620 },
      { id: 'j8', type: 'JUNCTION', x: 500, y: 620 },

      { id: 'hB', type: 'HOLE', x: 160, y: 900, color: '#5170ff' },
      { id: 'hBS', type: 'HOLE', x: 80, y: 850, color: '#5170ff', size: 'S' },
      { id: 'hG', type: 'HOLE', x: 320, y: 930, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 480, y: 930, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 640, y: 900, color: '#E91E63' },
      { id: 'hPS', type: 'HOLE', x: 720, y: 850, color: '#E91E63', size: 'S' },
      { id: 'hY', type: 'HOLE', x: 400, y: 780, color: '#FFD700' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(200, 110), p(200, 260)], length: 150, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j3', path: [p(600, 110), p(600, 260)], length: 150, widthClass: 'normal' },

      // top row (no 4-way; j2 only 2 outs)
      { id: 'e3', from: 'j1', to: 'j2', path: [p(200, 260), p(400, 260)], length: 200, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j3', path: [p(400, 260), p(600, 260)], length: 200, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j5', path: [p(400, 260), p(400, 440)], length: 180, widthClass: 'normal' },

      { id: 'e6', from: 'j1', to: 'j4', path: [p(200, 260), p(200, 440)], length: 180, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'j6', path: [p(600, 260), p(600, 440)], length: 180, widthClass: 'normal' },

      // mid row links (loops)
      { id: 'e8', from: 'j4', to: 'j5', path: [p(200, 440), p(400, 440)], length: 200, widthClass: 'normal' },
      { id: 'e9', from: 'j6', to: 'j5', path: [p(600, 440), p(400, 440)], length: 200, widthClass: 'normal' },
      { id: 'e10', from: 'j5', to: 'j4', path: [p(400, 440), p(200, 440)], length: 200, widthClass: 'normal' },
      { id: 'e11', from: 'j5', to: 'j6', path: [p(400, 440), p(600, 440)], length: 200, widthClass: 'normal' },

      // down to bottom switches
      { id: 'e12', from: 'j4', to: 'j7', path: [p(200, 440), p(260, 540), p(300, 620)], length: 240, widthClass: 'normal' },
      { id: 'e13', from: 'j6', to: 'j8', path: [p(600, 440), p(540, 540), p(500, 620)], length: 240, widthClass: 'normal' },
      { id: 'e14', from: 'j5', to: 'hY', path: [p(400, 440), p(400, 610), p(400, 780)], length: 340, widthClass: 'normal' },

      // bottom switches to holes
      { id: 'e15', from: 'j7', to: 'hB', path: [p(300, 620), p(160, 760), p(160, 900)], length: 360, widthClass: 'normal' },
      { id: 'e21', from: 'j7', to: 'hBS', path: [p(300, 620), p(120, 735), p(80, 850)], length: 340, widthClass: 'narrow' },
      { id: 'e16', from: 'j7', to: 'hG', path: [p(300, 620), p(320, 770), p(320, 930)], length: 320, widthClass: 'normal' },
      { id: 'e17', from: 'j7', to: 'j8', path: [p(300, 620), p(400, 620), p(500, 620)], length: 200, widthClass: 'normal' },

      { id: 'e18', from: 'j8', to: 'hP', path: [p(500, 620), p(640, 760), p(640, 900)], length: 360, widthClass: 'normal' },
      { id: 'e22', from: 'j8', to: 'hPS', path: [p(500, 620), p(680, 735), p(720, 850)], length: 340, widthClass: 'narrow' },
      { id: 'e19', from: 'j8', to: 'hO', path: [p(500, 620), p(480, 770), p(480, 930)], length: 320, widthClass: 'normal' },
      { id: 'e20', from: 'j8', to: 'j7', path: [p(500, 620), p(400, 620), p(300, 620)], length: 200, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e6', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e5', 'e4'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e7'], defaultIndex: 0 },

      { id: 'j4', outEdges: ['e8', 'e12'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e14', 'e11', 'e10'], defaultIndex: 0 }, // 3-way
      { id: 'j6', outEdges: ['e9', 'e13'], defaultIndex: 0 },

      { id: 'j7', outEdges: ['e15', 'e21', 'e16', 'e17'], defaultIndex: 0 },
      { id: 'j8', outEdges: ['e18', 'e22', 'e19', 'e20'], defaultIndex: 0 },
    ],
    traps: [
      { id: 't1', type: 'SPIDER', nodeId: 'j4', nodePool: ['j4', 'j6', 'j5'], intervalMs: 3000, activeDurationMs: 2500, initialDelayMs: 5000 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j5', nodePool: ['j5', 'j4', 'j6'], intervalMs: 5000, initialDelayMs: 3000 },
    ],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 50 },
      { id: 'w2', size: 'S', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 6000, speed: 50 },
      { id: 'w3', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 11000, speed: 50 },
      { id: 'w4', size: 'S', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 16000, speed: 50 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 21000, speed: 50 },
      { id: 'w6', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 26000, speed: 50 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // =========================================================================
  // HARD (11-15) — 5–6 worms, many paths, frequent traps, loops for dodging
  // =========================================================================

  // LEVEL 11: Size + Hazards (5 colors, narrow lanes + spider+quake)
  {
    levelId: 11,
    metadata: { name: 'Size + Hazards', rating: 5 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: 100 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 240 },

      { id: 'j2', type: 'JUNCTION', x: 240, y: 380 }, // narrow branch (size)
      { id: 'j3', type: 'JUNCTION', x: 560, y: 380 }, // hazard branch

      { id: 'j4', type: 'JUNCTION', x: 240, y: 560 },
      { id: 'j5', type: 'JUNCTION', x: 560, y: 560 }, // spider

      { id: 'j6', type: 'JUNCTION', x: 400, y: 660 }, // quake, merge + loop

      { id: 'hBS', type: 'HOLE', x: 150, y: 900, color: '#5170ff', size: 'S' },
      { id: 'hP', type: 'HOLE', x: 280, y: 930, color: '#E91E63' },
      { id: 'hG', type: 'HOLE', x: 400, y: 940, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 520, y: 930, color: '#ff914d' },
      { id: 'hY', type: 'HOLE', x: 650, y: 900, color: '#FFD700' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, 100), p(400, 240)], length: 140, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 240), p(240, 240), p(240, 380)], length: 300, widthClass: 'narrow' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 240), p(560, 240), p(560, 380)], length: 300, widthClass: 'normal' },

      { id: 'e4', from: 'j2', to: 'j4', path: [p(240, 380), p(240, 560)], length: 180, widthClass: 'narrow' },
      { id: 'e5', from: 'j3', to: 'j5', path: [p(560, 380), p(560, 560)], length: 180, widthClass: 'normal' },

      { id: 'e6', from: 'j4', to: 'j6', path: [p(240, 560), p(320, 610), p(400, 660)], length: 220, widthClass: 'narrow' },
      { id: 'e7', from: 'j5', to: 'j6', path: [p(560, 560), p(480, 610), p(400, 660)], length: 220, widthClass: 'normal' },

      // loop back up to dodge hazards
      { id: 'e8', from: 'j6', to: 'j4', path: [p(400, 660), p(320, 610), p(240, 560)], length: 220, widthClass: 'narrow' },
      { id: 'e9', from: 'j6', to: 'j5', path: [p(400, 660), p(480, 610), p(560, 560)], length: 220, widthClass: 'normal' },

      // exits (j6 3-way only)
      { id: 'e10', from: 'j4', to: 'hBS', path: [p(240, 560), p(150, 740), p(150, 900)], length: 420, widthClass: 'narrow' },
      { id: 'e11', from: 'j6', to: 'hG', path: [p(400, 660), p(400, 800), p(400, 940)], length: 280, widthClass: 'normal' },
      { id: 'e12', from: 'j6', to: 'hP', path: [p(400, 660), p(340, 800), p(280, 930)], length: 320, widthClass: 'normal' },
      { id: 'e13', from: 'j6', to: 'hO', path: [p(400, 660), p(460, 800), p(520, 930)], length: 320, widthClass: 'normal' },
      { id: 'e14', from: 'j5', to: 'hY', path: [p(560, 560), p(650, 740), p(650, 900)], length: 420, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e4'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e5'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e6', 'e10'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e7', 'e14'], defaultIndex: 0 },
      { id: 'j6', outEdges: ['e11', 'e12', 'e13', 'e9'], defaultIndex: 0 },
    ],
    traps: [
      { id: 't1', type: 'SPIDER', nodeId: 'j5', nodePool: ['j5', 'j4', 'j6'], intervalMs: 9000, activeDurationMs: 2500, initialDelayMs: 4000 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j6', nodePool: ['j6', 'j4', 'j5'], intervalMs: 3800, initialDelayMs: 2800 },
    ],
    worms: [
      { id: 'w1', size: 'S', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 50 },
      { id: 'w2', size: 'M', color: '#FFD700', spawnNodeId: 's', spawnTimeMs: 6000, speed: 50 },
      { id: 'w3', size: 'M', color: '#E91E63', spawnNodeId: 's', spawnTimeMs: 11000, speed: 50 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 16000, speed: 50 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 21000, speed: 50 },
      { id: 'w6', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 26000, speed: 50 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 12: Double Web (5 colors, 2 spawns, 2 spiders, bigger loops)
  {
    levelId: 12,
    metadata: { name: 'Double Web', rating: 5 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 'sL', type: 'SPAWN', x: 200, y: 110 },
      { id: 'sR', type: 'SPAWN', x: 600, y: 110 },

      { id: 'j1', type: 'JUNCTION', x: 200, y: 260 },
      { id: 'j2', type: 'JUNCTION', x: 400, y: 260 },
      { id: 'j3', type: 'JUNCTION', x: 600, y: 260 },

      { id: 'j4', type: 'JUNCTION', x: 260, y: 450 }, // spider
      { id: 'j5', type: 'JUNCTION', x: 540, y: 450 }, // spider

      { id: 'j6', type: 'JUNCTION', x: 400, y: 610 }, // merge + loop
      { id: 'j7', type: 'JUNCTION', x: 300, y: 740 },
      { id: 'j8', type: 'JUNCTION', x: 500, y: 740 },

      { id: 'hB', type: 'HOLE', x: 140, y: 930, color: '#5170ff', size: 'S' },
      { id: 'hG', type: 'HOLE', x: 280, y: 950, color: '#58CC02' },
      { id: 'hY', type: 'HOLE', x: 400, y: 970, color: '#FFD700' },
      { id: 'hO', type: 'HOLE', x: 520, y: 950, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 660, y: 930, color: '#E91E63', size: 'S' },
    ],
    edges: [
      { id: 'e1', from: 'sL', to: 'j1', path: [p(200, 110), p(200, 260)], length: 150, widthClass: 'normal' },
      { id: 'e2', from: 'sR', to: 'j3', path: [p(600, 110), p(600, 260)], length: 150, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'j2', path: [p(200, 260), p(400, 260)], length: 200, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j3', path: [p(400, 260), p(600, 260)], length: 200, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j4', path: [p(400, 260), p(320, 355), p(260, 450)], length: 240, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j5', path: [p(400, 260), p(480, 355), p(540, 450)], length: 240, widthClass: 'normal' },

      // trap layer to merge
      { id: 'e7', from: 'j4', to: 'j6', path: [p(260, 450), p(330, 530), p(400, 610)], length: 230, widthClass: 'normal' },
      { id: 'e8', from: 'j5', to: 'j6', path: [p(540, 450), p(470, 530), p(400, 610)], length: 230, widthClass: 'normal' },

      // loop back up around traps (dodge route)
      { id: 'e9', from: 'j6', to: 'j4', path: [p(400, 610), p(330, 530), p(260, 450)], length: 230, widthClass: 'normal' },
      { id: 'e10', from: 'j6', to: 'j5', path: [p(400, 610), p(470, 530), p(540, 450)], length: 230, widthClass: 'normal' },

      // down to final switches
      { id: 'e11', from: 'j6', to: 'j7', path: [p(400, 610), p(340, 675), p(300, 740)], length: 170, widthClass: 'normal' },
      { id: 'e12', from: 'j6', to: 'j8', path: [p(400, 610), p(460, 675), p(500, 740)], length: 170, widthClass: 'normal' },

      // final fan (no 4-way: j7/j8 are 3-way max)
      { id: 'e13', from: 'j7', to: 'hB', path: [p(300, 740), p(220, 835), p(140, 930)], length: 260, widthClass: 'narrow' },
      { id: 'e14', from: 'j7', to: 'hG', path: [p(300, 740), p(290, 845), p(280, 950)], length: 210, widthClass: 'normal' },
      { id: 'e15', from: 'j7', to: 'hY', path: [p(300, 740), p(350, 855), p(400, 970)], length: 270, widthClass: 'normal' },

      { id: 'e16', from: 'j8', to: 'hP', path: [p(500, 740), p(580, 835), p(660, 930)], length: 260, widthClass: 'narrow' },
      { id: 'e17', from: 'j8', to: 'hO', path: [p(500, 740), p(510, 845), p(520, 950)], length: 210, widthClass: 'normal' },
      { id: 'e18', from: 'j8', to: 'hY', path: [p(500, 740), p(450, 855), p(400, 970)], length: 270, widthClass: 'normal' },
      { id: 'e19', from: 'j3', to: 'j5', path: [p(600, 260), p(570, 355), p(540, 450)], length: 200, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4', 'e5', 'e6'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e19'], defaultIndex: 0 },

      { id: 'j4', outEdges: ['e7'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e8'], defaultIndex: 0 },

      { id: 'j6', outEdges: ['e11', 'e12', 'e9'], defaultIndex: 0 },
      { id: 'j7', outEdges: ['e13', 'e14', 'e15'], defaultIndex: 0 },
      { id: 'j8', outEdges: ['e16', 'e17', 'e18'], defaultIndex: 0 },
    ],
    traps: [
      { id: 't1', type: 'SPIDER', nodeId: 'j4', nodePool: ['j4', 'j6'], intervalMs: 8000, activeDurationMs: 2500, initialDelayMs: 3500 },
      { id: 't2', type: 'SPIDER', nodeId: 'j5', nodePool: ['j5', 'j4'], intervalMs: 8000, activeDurationMs: 2500, initialDelayMs: 6000 },
    ],
    worms: [
      { id: 'w1', size: 'M', color: '#FFD700', spawnNodeId: 'sL', spawnTimeMs: 1000, speed: 50 },
      { id: 'w2', size: 'S', color: '#5170ff', spawnNodeId: 'sR', spawnTimeMs: 6000, speed: 50 },
      { id: 'w3', size: 'S', color: '#E91E63', spawnNodeId: 'sL', spawnTimeMs: 11000, speed: 50 },
      { id: 'w4', size: 'S', color: '#58CC02', spawnNodeId: 'sR', spawnTimeMs: 16000, speed: 50 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 'sR', spawnTimeMs: 21000, speed: 50 },
      { id: 'w6', size: 'M', color: '#58CC02', spawnNodeId: 'sL', spawnTimeMs: 26000, speed: 50 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 13: Quake Spiral (5 colors, quake + spider, big loop spiral)
  {
    levelId: 13,
    metadata: { name: 'Quake Spiral', rating: 5 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: 100 },

      { id: 'j1', type: 'JUNCTION', x: 400, y: 240 },
      { id: 'j2', type: 'JUNCTION', x: 560, y: 360 }, // spider
      { id: 'j3', type: 'JUNCTION', x: 560, y: 540 },
      { id: 'j4', type: 'JUNCTION', x: 400, y: 660 }, // quake
      { id: 'j5', type: 'JUNCTION', x: 240, y: 540 },
      { id: 'j6', type: 'JUNCTION', x: 240, y: 360 },

      { id: 'hB', type: 'HOLE', x: 140, y: 920, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 280, y: 950, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 520, y: 950, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 660, y: 920, color: '#E91E63' },
      { id: 'hY', type: 'HOLE', x: 400, y: 970, color: '#FFD700' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, 100), p(400, 240)], length: 140, widthClass: 'normal' },

      // spiral clockwise
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 240), p(500, 300), p(560, 360)], length: 210, widthClass: 'normal' },
      { id: 'e3', from: 'j2', to: 'j3', path: [p(560, 360), p(560, 540)], length: 180, widthClass: 'normal' },
      { id: 'e4', from: 'j3', to: 'j4', path: [p(560, 540), p(480, 600), p(400, 660)], length: 210, widthClass: 'normal' },
      { id: 'e5', from: 'j4', to: 'j5', path: [p(400, 660), p(320, 600), p(240, 540)], length: 210, widthClass: 'normal' },
      { id: 'e6', from: 'j5', to: 'j6', path: [p(240, 540), p(240, 360)], length: 180, widthClass: 'normal' },
      { id: 'e7', from: 'j6', to: 'j1', path: [p(240, 360), p(320, 300), p(400, 240)], length: 210, widthClass: 'normal' }, // completes loop

      // exits to holes (use different spiral nodes so routing matters)
      { id: 'e8', from: 'j6', to: 'hB', path: [p(240, 360), p(170, 640), p(140, 920)], length: 620, widthClass: 'normal' },
      { id: 'e9', from: 'j5', to: 'hG', path: [p(240, 540), p(260, 745), p(280, 950)], length: 430, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hY', path: [p(400, 660), p(400, 815), p(400, 970)], length: 310, widthClass: 'normal' },
      { id: 'e11', from: 'j3', to: 'hO', path: [p(560, 540), p(540, 745), p(520, 950)], length: 430, widthClass: 'normal' },
      { id: 'e12', from: 'j2', to: 'hP', path: [p(560, 360), p(630, 640), p(660, 920)], length: 620, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e3', 'e12'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e4', 'e11'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e5', 'e10'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e6', 'e9'], defaultIndex: 0 },
      { id: 'j6', outEdges: ['e7', 'e8'], defaultIndex: 0 },
    ],
    traps: [
      { id: 't1', type: 'SPIDER', nodeId: 'j2', nodePool: ['j2', 'j3', 'j5'], intervalMs: 7000, activeDurationMs: 2500, initialDelayMs: 4000 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j4', nodePool: ['j4', 'j3', 'j6'], intervalMs: 3600, initialDelayMs: 2600 },
    ],
    worms: [
      { id: 'w1', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 1000, speed: 50 },
      { id: 'w2', size: 'S', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 6000, speed: 50 },
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 11000, speed: 50 },
      { id: 'w4', size: 'S', color: '#E91E63', spawnNodeId: 's', spawnTimeMs: 16000, speed: 50 },
      { id: 'w5', size: 'M', color: '#FFD700', spawnNodeId: 's', spawnTimeMs: 21000, speed: 50 },
      { id: 'w6', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 26000, speed: 50 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 14: Panic Router (6 colors, many worms, multiple traps, dodging loops)
  {
    levelId: 14,
    metadata: { name: 'Panic Router', rating: 5 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700', '#9C27B0'],
    nodes: [
      { id: 'sL', type: 'SPAWN', x: 230, y: 110 },
      { id: 'sR', type: 'SPAWN', x: 570, y: 110 },

      { id: 'j1', type: 'JUNCTION', x: 230, y: 260 },
      { id: 'j2', type: 'JUNCTION', x: 570, y: 260 },

      { id: 'j3', type: 'JUNCTION', x: 400, y: 360 }, // quake
      { id: 'j4', type: 'JUNCTION', x: 260, y: 500 }, // spider
      { id: 'j5', type: 'JUNCTION', x: 540, y: 500 }, // spider

      { id: 'j6', type: 'JUNCTION', x: 400, y: 620 }, // hub (3-way max)
      { id: 'j7', type: 'JUNCTION', x: 300, y: 760 },
      { id: 'j8', type: 'JUNCTION', x: 500, y: 760 },

      { id: 'hB', type: 'HOLE', x: 130, y: 930, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 250, y: 950, color: '#58CC02' },
      { id: 'hY', type: 'HOLE', x: 370, y: 970, color: '#FFD700' },
      { id: 'hO', type: 'HOLE', x: 430, y: 970, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 550, y: 950, color: '#E91E63' },
      { id: 'hV', type: 'HOLE', x: 670, y: 930, color: '#9C27B0' },
    ],
    edges: [
      { id: 'e1', from: 'sL', to: 'j1', path: [p(230, 110), p(230, 260)], length: 150, widthClass: 'normal' },
      { id: 'e2', from: 'sR', to: 'j2', path: [p(570, 110), p(570, 260)], length: 150, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'j3', path: [p(230, 260), p(315, 310), p(400, 360)], length: 220, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j3', path: [p(570, 260), p(485, 310), p(400, 360)], length: 220, widthClass: 'normal' },

      { id: 'e5', from: 'j3', to: 'j4', path: [p(400, 360), p(330, 430), p(260, 500)], length: 220, widthClass: 'normal' },
      { id: 'e6', from: 'j3', to: 'j5', path: [p(400, 360), p(470, 430), p(540, 500)], length: 220, widthClass: 'normal' },

      { id: 'e7', from: 'j4', to: 'j6', path: [p(260, 500), p(330, 560), p(400, 620)], length: 220, widthClass: 'normal' },
      { id: 'e8', from: 'j5', to: 'j6', path: [p(540, 500), p(470, 560), p(400, 620)], length: 220, widthClass: 'normal' },

      // dodge loops back to trap layer
      { id: 'e9', from: 'j6', to: 'j4', path: [p(400, 620), p(330, 560), p(260, 500)], length: 220, widthClass: 'normal' },
      { id: 'e10', from: 'j6', to: 'j5', path: [p(400, 620), p(470, 560), p(540, 500)], length: 220, widthClass: 'normal' },

      // final split
      { id: 'e11', from: 'j6', to: 'j7', path: [p(400, 620), p(350, 690), p(300, 760)], length: 190, widthClass: 'normal' },
      { id: 'e12', from: 'j6', to: 'j8', path: [p(400, 620), p(450, 690), p(500, 760)], length: 190, widthClass: 'normal' },

      // fan to holes (3-way max)
      { id: 'e13', from: 'j7', to: 'hB', path: [p(300, 760), p(215, 845), p(130, 930)], length: 260, widthClass: 'normal' },
      { id: 'e14', from: 'j7', to: 'hG', path: [p(300, 760), p(275, 855), p(250, 950)], length: 220, widthClass: 'normal' },
      { id: 'e15', from: 'j7', to: 'hY', path: [p(300, 760), p(335, 865), p(370, 970)], length: 240, widthClass: 'normal' },

      { id: 'e16', from: 'j8', to: 'hV', path: [p(500, 760), p(585, 845), p(670, 930)], length: 260, widthClass: 'normal' },
      { id: 'e17', from: 'j8', to: 'hP', path: [p(500, 760), p(525, 855), p(550, 950)], length: 220, widthClass: 'normal' },
      { id: 'e18', from: 'j8', to: 'hO', path: [p(500, 760), p(465, 865), p(430, 970)], length: 240, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e5', 'e6'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e7'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e8'], defaultIndex: 0 },
      { id: 'j6', outEdges: ['e11', 'e12', 'e9'], defaultIndex: 0 },
      { id: 'j7', outEdges: ['e13', 'e14', 'e15'], defaultIndex: 0 },
      { id: 'j8', outEdges: ['e16', 'e17', 'e18'], defaultIndex: 0 },
    ],
    traps: [
      { id: 't1', type: 'EARTHQUAKE', nodeId: 'j3', nodePool: ['j3', 'j4', 'j5'], intervalMs: 3400, initialDelayMs: 2200 },
      { id: 't2', type: 'SPIDER', nodeId: 'j4', nodePool: ['j4', 'j6'], intervalMs: 6500, activeDurationMs: 2000, initialDelayMs: 3000 },
      { id: 't3', type: 'SPIDER', nodeId: 'j5', nodePool: ['j5', 'j6'], intervalMs: 6500, activeDurationMs: 2000, initialDelayMs: 5500 },
    ],
    worms: [
      { id: 'w1', size: 'S', color: '#5170ff', spawnNodeId: 'sL', spawnTimeMs: 1000, speed: 50 },
      { id: 'w2', size: 'M', color: '#9C27B0', spawnNodeId: 'sR', spawnTimeMs: 6000, speed: 50 },
      { id: 'w3', size: 'S', color: '#FFD700', spawnNodeId: 'sL', spawnTimeMs: 11000, speed: 50 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 'sR', spawnTimeMs: 16000, speed: 50 },
      { id: 'w5', size: 'S', color: '#E91E63', spawnNodeId: 'sL', spawnTimeMs: 21000, speed: 50 },
      { id: 'w6', size: 'M', color: '#ff914d', spawnNodeId: 'sR', spawnTimeMs: 26000, speed: 50 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 15: Lumosity Finale (6 colors, 6+ worms, MANY paths, MANY traps, loops for dodging)
  {
    levelId: 15,
    metadata: { name: 'Lumosity Finale', rating: 5 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700', '#9C27B0'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 200, y: 110 },
      { id: 's2', type: 'SPAWN', x: 600, y: 110 },

      { id: 'j1', type: 'JUNCTION', x: 200, y: 250 },
      { id: 'j2', type: 'JUNCTION', x: 400, y: 250 },
      { id: 'j3', type: 'JUNCTION', x: 600, y: 250 },

      { id: 'j4', type: 'JUNCTION', x: 200, y: 420 }, // spider
      { id: 'j5', type: 'JUNCTION', x: 400, y: 420 }, // quake
      { id: 'j6', type: 'JUNCTION', x: 600, y: 420 }, // spider

      { id: 'j7', type: 'JUNCTION', x: 260, y: 600 },
      { id: 'j8', type: 'JUNCTION', x: 540, y: 600 },
      { id: 'j9', type: 'JUNCTION', x: 400, y: 700 }, // merge + loop

      { id: 'hB', type: 'HOLE', x: 120, y: 930, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 240, y: 950, color: '#58CC02' },
      { id: 'hY', type: 'HOLE', x: 360, y: 970, color: '#FFD700' },
      { id: 'hO', type: 'HOLE', x: 440, y: 970, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 560, y: 950, color: '#E91E63' },
      { id: 'hV', type: 'HOLE', x: 680, y: 930, color: '#9C27B0' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(200, 110), p(200, 250)], length: 140, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j3', path: [p(600, 110), p(600, 250)], length: 140, widthClass: 'normal' },

      // top routing (j2 only 2 outs, no 4-way)
      { id: 'e3', from: 'j1', to: 'j2', path: [p(200, 250), p(400, 250)], length: 200, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j3', path: [p(400, 250), p(600, 250)], length: 200, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j5', path: [p(400, 250), p(400, 420)], length: 170, widthClass: 'normal' },

      { id: 'e6', from: 'j1', to: 'j4', path: [p(200, 250), p(200, 420)], length: 170, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'j6', path: [p(600, 250), p(600, 420)], length: 170, widthClass: 'normal' },

      // mid links (multiple loops)
      { id: 'e8', from: 'j4', to: 'j5', path: [p(200, 420), p(400, 420)], length: 200, widthClass: 'normal' },
      { id: 'e9', from: 'j6', to: 'j5', path: [p(600, 420), p(400, 420)], length: 200, widthClass: 'normal' },
      { id: 'e10', from: 'j5', to: 'j4', path: [p(400, 420), p(200, 420)], length: 200, widthClass: 'normal' },
      { id: 'e11', from: 'j5', to: 'j6', path: [p(400, 420), p(600, 420)], length: 200, widthClass: 'normal' },

      // down layer
      { id: 'e12', from: 'j4', to: 'j7', path: [p(200, 420), p(230, 520), p(260, 600)], length: 190, widthClass: 'normal' },
      { id: 'e13', from: 'j6', to: 'j8', path: [p(600, 420), p(570, 520), p(540, 600)], length: 190, widthClass: 'normal' },
      { id: 'e14', from: 'j5', to: 'j9', path: [p(400, 420), p(400, 560), p(400, 700)], length: 280, widthClass: 'normal' },

      // merge / loop at j9 (3-way max)
      { id: 'e15', from: 'j7', to: 'j9', path: [p(260, 600), p(330, 650), p(400, 700)], length: 190, widthClass: 'normal' },
      { id: 'e16', from: 'j8', to: 'j9', path: [p(540, 600), p(470, 650), p(400, 700)], length: 190, widthClass: 'normal' },
      { id: 'e17', from: 'j9', to: 'j7', path: [p(400, 700), p(330, 650), p(260, 600)], length: 190, widthClass: 'normal' },
      { id: 'e18', from: 'j9', to: 'j8', path: [p(400, 700), p(470, 650), p(540, 600)], length: 190, widthClass: 'normal' },

      // final fan to 6 holes via j7/j8 (each 3-way max)
      { id: 'e19', from: 'j7', to: 'hB', path: [p(260, 600), p(190, 765), p(120, 930)], length: 420, widthClass: 'normal' },
      { id: 'e20', from: 'j7', to: 'hG', path: [p(260, 600), p(250, 775), p(240, 950)], length: 360, widthClass: 'normal' },
      { id: 'e21', from: 'j7', to: 'hY', path: [p(260, 600), p(310, 785), p(360, 970)], length: 420, widthClass: 'normal' },

      { id: 'e22', from: 'j8', to: 'hV', path: [p(540, 600), p(610, 765), p(680, 930)], length: 420, widthClass: 'normal' },
      { id: 'e23', from: 'j8', to: 'hP', path: [p(540, 600), p(550, 775), p(560, 950)], length: 360, widthClass: 'normal' },
      { id: 'e24', from: 'j8', to: 'hO', path: [p(540, 600), p(490, 785), p(440, 970)], length: 420, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e6', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e5', 'e4'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e7'], defaultIndex: 0 },

      { id: 'j4', outEdges: ['e8', 'e12'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e14', 'e11', 'e10'], defaultIndex: 0 },
      { id: 'j6', outEdges: ['e9', 'e13'], defaultIndex: 0 },

      { id: 'j7', outEdges: ['e19', 'e20', 'e21'], defaultIndex: 0 },
      { id: 'j8', outEdges: ['e22', 'e23', 'e24'], defaultIndex: 0 },
      { id: 'j9', outEdges: ['e17', 'e18'], defaultIndex: 0 },
    ],
    traps: [
      { id: 't1', type: 'SPIDER', nodeId: 'j4', nodePool: ['j4', 'j5'], intervalMs: 6000, activeDurationMs: 2000, initialDelayMs: 2500 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j5', nodePool: ['j5', 'j6'], intervalMs: 4000, initialDelayMs: 3000 },
      { id: 't3', type: 'SPIDER', nodeId: 'j6', nodePool: ['j6', 'j4'], intervalMs: 6000, activeDurationMs: 2000, initialDelayMs: 5500 },
    ],
    worms: [
      { id: 'w1', size: 'S', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 50 },
      { id: 'w2', size: 'M', color: '#9C27B0', spawnNodeId: 's2', spawnTimeMs: 6000, speed: 50 },
      { id: 'w3', size: 'S', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 11000, speed: 50 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 16000, speed: 50 },
      { id: 'w5', size: 'S', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 21000, speed: 50 },
      { id: 'w6', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 26000, speed: 50 },
      { id: 'w7', size: 'S', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 31000, speed: 50 },
      { id: 'w8', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 36000, speed: 50 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 8 },
  },
];

export default LEVELS;
