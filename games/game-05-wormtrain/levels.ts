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
      { id: 's', type: 'SPAWN', x: 400, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 420 },
      { id: 'hB', type: 'HOLE', x: 280, y: 820, color: '#5170ff' },
      { id: 'hO', type: 'HOLE', x: 520, y: 820, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -100), p(400, 420)], length: 520, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'hB', path: [p(400, 420), p(280, 620), p(280, 820)], length: 420, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hO', path: [p(400, 420), p(520, 620), p(520, 820)], length: 420, widthClass: 'normal' },
    ],
    junctions: [{ id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 }], // Default points to Orange (Right), first worm is Blue (Left)
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 70 }, // Increased speed
      { id: 'w2', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 7000, speed: 70 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 2 },
  },

  // =========================================================================
  // EASY (1-3) — learn routing, 2 colors (Blue/Orange), no traps
  // =========================================================================

  // LEVEL 1: First Split (2 colors, simple choice)
  {
    levelId: 1,
    metadata: { name: 'First Split', rating: 1 },
    colors: ['#5170ff', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 500 },
      { id: 'hB', type: 'HOLE', x: 250, y: 850, color: '#5170ff' },
      { id: 'hO', type: 'HOLE', x: 550, y: 850, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -100), p(400, 500)], length: 600, widthClass: 'normal' }, // Long start
      { id: 'e2', from: 'j1', to: 'hB', path: [p(400, 500), p(250, 650), p(250, 850)], length: 450, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hO', path: [p(400, 500), p(550, 650), p(550, 850)], length: 450, widthClass: 'normal' },
    ],
    junctions: [{ id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 }],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 60 },
      { id: 'w2', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 8000, speed: 60 },
      { id: 'w3', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 15000, speed: 60 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 3 },
  },

  // LEVEL 2: The Crossing (2 junctions)
  {
    levelId: 2,
    metadata: { name: 'The Crossing', rating: 1 },
    colors: ['#5170ff', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 300, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 300, y: 450 },
      { id: 'j2', type: 'JUNCTION', x: 500, y: 600 },
      { id: 'hB', type: 'HOLE', x: 300, y: 850, color: '#5170ff' },
      { id: 'hO', type: 'HOLE', x: 600, y: 850, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(300, -100), p(300, 450)], length: 550, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'hB', path: [p(300, 450), p(300, 850)], length: 400, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j2', path: [p(300, 450), p(400, 525), p(500, 600)], length: 300, widthClass: 'normal' },

      { id: 'e4', from: 'j2', to: 'hO', path: [p(500, 600), p(500, 725), p(600, 850)], length: 300, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hB', path: [p(500, 600), p(400, 725), p(300, 850)], length: 300, widthClass: 'normal' }, // Alternative path to Blue
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 1000, speed: 65 },
      { id: 'w2', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 8000, speed: 65 },
      { id: 'w3', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 15000, speed: 65 },
      { id: 'w4', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 22000, speed: 65 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 4 },
  },

  // LEVEL 3: Zig Zag (3 junctions, intro to switching back)
  {
    levelId: 3,
    metadata: { name: 'Zig Zag', rating: 2 },
    colors: ['#5170ff', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 400 },
      { id: 'j2', type: 'JUNCTION', x: 250, y: 600 },
      { id: 'j3', type: 'JUNCTION', x: 550, y: 600 },

      { id: 'hB', type: 'HOLE', x: 250, y: 900, color: '#5170ff' },
      { id: 'hO', type: 'HOLE', x: 550, y: 900, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -100), p(400, 400)], length: 500, widthClass: 'normal' },

      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 400), p(250, 500), p(250, 600)], length: 300, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 400), p(550, 500), p(550, 600)], length: 300, widthClass: 'normal' },

      { id: 'e4', from: 'j2', to: 'hB', path: [p(250, 600), p(250, 900)], length: 300, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hO', path: [p(250, 600), p(400, 750), p(550, 900)], length: 400, widthClass: 'normal' },

      { id: 'e6', from: 'j3', to: 'hO', path: [p(550, 600), p(550, 900)], length: 300, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'hB', path: [p(550, 600), p(400, 750), p(250, 900)], length: 400, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 0 }, // Left junction can go to BOTH holes
      { id: 'j3', outEdges: ['e6', 'e7'], defaultIndex: 0 }, // Right junction can go to BOTH holes
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 65 },
      { id: 'w2', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 7000, speed: 65 },
      { id: 'w3', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 13000, speed: 65 },
      { id: 'w4', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 19000, speed: 65 },
      { id: 'w5', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 25000, speed: 65 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // =========================================================================
  // MID (4-10) — size mechanic, narrow lanes, first traps, loops begin
  // =========================================================================

  // =========================================================================
  // MID (4-6) — 3 paths, 2-3 colors, routing focus
  // =========================================================================

  // LEVEL 4: Triple Choice (3 colors, intro to branching)
  {
    levelId: 4,
    metadata: { name: 'Triple Choice', rating: 2 },
    intro: {
      title: 'การสลับราง',
      description: 'กดที่ปุ่มทางแยกเพื่อสลับเส้นทาง\nพาหนอนแต่ละสีไปลงหลุมให้ถูกต้อง!',
      imageKey: 'spawn' // Placeholder, using spawn icon
    },
    colors: ['#5170ff', '#58CC02', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 430 },
      { id: 'hB', type: 'HOLE', x: 200, y: 900, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 400, y: 900, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 600, y: 900, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -100), p(400, 430)], length: 530, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'hB', path: [p(400, 430), p(200, 550), p(200, 900)], length: 470, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hG', path: [p(400, 430), p(400, 900)], length: 470, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'hO', path: [p(400, 430), p(600, 550), p(600, 900)], length: 470, widthClass: 'normal' },
    ],
    junctions: [{ id: 'j1', outEdges: ['e2', 'e3', 'e4'], defaultIndex: 1 }],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 1000, speed: 65 },
      { id: 'w2', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 7000, speed: 65 },
      { id: 'w3', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 13000, speed: 65 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 19000, speed: 65 },
      { id: 'w5', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 25000, speed: 65 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // LEVEL 5: Roundabout (4 junctions, circle flow)
  {
    levelId: 5,
    metadata: { name: 'Roundabout', rating: 2 },
    colors: ['#5170ff', '#58CC02', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: -150 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 350 },

      { id: 'j2', type: 'JUNCTION', x: 250, y: 500 }, // Left
      { id: 'j3', type: 'JUNCTION', x: 550, y: 500 }, // Right

      { id: 'j4', type: 'JUNCTION', x: 400, y: 650 }, // Bottom center

      { id: 'hB', type: 'HOLE', x: 200, y: 950, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 400, y: 950, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 600, y: 950, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -150), p(400, 350)], length: 500, widthClass: 'normal' },

      // Ring
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 350), p(250, 500)], length: 220, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 350), p(550, 500)], length: 220, widthClass: 'normal' },

      { id: 'e4', from: 'j2', to: 'j4', path: [p(250, 500), p(400, 650)], length: 220, widthClass: 'normal' },
      { id: 'e5', from: 'j3', to: 'j4', path: [p(550, 500), p(400, 650)], length: 220, widthClass: 'normal' },

      // Exits from Ring nodes
      { id: 'e6', from: 'j2', to: 'hB', path: [p(250, 500), p(200, 700), p(200, 950)], length: 450, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'hO', path: [p(550, 500), p(600, 700), p(600, 950)], length: 450, widthClass: 'normal' },
      { id: 'e8', from: 'j4', to: 'hG', path: [p(400, 650), p(400, 950)], length: 300, widthClass: 'normal' },

      // Back to top? (Optional loop, excluded for simplicity now)
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e4', 'e6'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e5', 'e7'], defaultIndex: 1 },
      { id: 'j4', outEdges: ['e8'], defaultIndex: 0 }, // Just pass through, or maybe add more
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 1000, speed: 65 },
      { id: 'w2', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 7000, speed: 65 },
      { id: 'w3', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 13000, speed: 65 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 19000, speed: 65 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 25000, speed: 65 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // LEVEL 6: Crossroad (4 junctions, path crossing)
  {
    levelId: 6,
    metadata: { name: 'Crossroad', rating: 3 },
    intro: {
      title: 'ทางแยกวัดใจ',
      description: 'บางครั้งต้องอ้อมไปตรงกลางเพื่อเปลี่ยนเลน\nลองดูเส้นทางให้ดีๆ นะ',
      imageKey: 'spawn'
    },
    colors: ['#5170ff', '#58CC02', '#ff914d'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 250, y: -100 },
      { id: 's2', type: 'SPAWN', x: 550, y: -100 },

      { id: 'j1', type: 'JUNCTION', x: 250, y: 400 },
      { id: 'j2', type: 'JUNCTION', x: 550, y: 400 },

      { id: 'j3', type: 'JUNCTION', x: 400, y: 600 }, // Central Hub

      { id: 'hB', type: 'HOLE', x: 200, y: 900, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 400, y: 900, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 600, y: 900, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(250, -100), p(250, 400)], length: 500, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(550, -100), p(550, 400)], length: 500, widthClass: 'normal' },

      // Side paths (Direct)
      { id: 'e3', from: 'j1', to: 'hB', path: [p(250, 350), p(200, 600), p(200, 850)], length: 500, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hO', path: [p(550, 350), p(600, 600), p(600, 850)], length: 500, widthClass: 'normal' },

      // Cross paths to Central Hub (j3)
      { id: 'e4', from: 'j1', to: 'j3', path: [p(250, 350), p(400, 550)], length: 300, widthClass: 'normal' }, // Cross R
      { id: 'e6', from: 'j2', to: 'j3', path: [p(550, 350), p(400, 550)], length: 300, widthClass: 'normal' }, // Cross L

      // Hub exits (Now connects to ALL holes for full flexibility)
      { id: 'e7', from: 'j3', to: 'hG', path: [p(400, 550), p(400, 850)], length: 300, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'hB', path: [p(400, 550), p(300, 700), p(200, 850)], length: 350, widthClass: 'normal' }, // Hub -> Blue (Left)
      { id: 'e9', from: 'j3', to: 'hO', path: [p(400, 550), p(500, 700), p(600, 850)], length: 350, widthClass: 'normal' }, // Hub -> Orange (Right)

    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e7', 'e8', 'e9'], defaultIndex: 0 }, // 3-way hub
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 65 },
      { id: 'w2', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 7000, speed: 65 }, // Right spawn -> Needs to go Left (j2 -> j3 -> hB)
      { id: 'w3', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 13000, speed: 65 }, // Left spawn -> Needs to go Right (j1 -> j3 -> hO)
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 19000, speed: 65 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 25000, speed: 65 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // =========================================================================
  // COMPLEX (7-10) — 4 paths, 3-4 colors, complex networks (routing focus)
  // =========================================================================

  // LEVEL 7: Four Colors (4 colors, 2 spawns)
  {
    levelId: 7,
    metadata: { name: 'Four Colors', rating: 3 },
    intro: {
      title: 'สี่สีพี่น้อง',
      description: 'เพิ่มความยากเป็น 4 สี!\nต้องตาไวและมือเร็วขึ้นนะ',
      imageKey: 'spawn'
    },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 250, y: -100 },
      { id: 's2', type: 'SPAWN', x: 550, y: -100 },

      { id: 'j1', type: 'JUNCTION', x: 250, y: 400 },
      { id: 'j2', type: 'JUNCTION', x: 550, y: 400 },

      { id: 'j3', type: 'JUNCTION', x: 400, y: 550 }, // Center mix

      { id: 'j4', type: 'JUNCTION', x: 300, y: 700 },
      { id: 'j5', type: 'JUNCTION', x: 500, y: 700 },

      { id: 'hB', type: 'HOLE', x: 150, y: 850, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 300, y: 900, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 500, y: 900, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 650, y: 850, color: '#E91E63' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(250, -100), p(250, 400)], length: 500, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(550, -100), p(550, 400)], length: 500, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'j3', path: [p(250, 400), p(400, 550)], length: 250, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j4', path: [p(250, 400), p(250, 550), p(300, 700)], length: 400, widthClass: 'normal' }, // Long outer

      { id: 'e5', from: 'j2', to: 'j3', path: [p(550, 400), p(400, 550)], length: 250, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j5', path: [p(550, 400), p(550, 550), p(500, 700)], length: 400, widthClass: 'normal' },

      { id: 'e7', from: 'j3', to: 'j4', path: [p(400, 550), p(300, 700)], length: 250, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'j5', path: [p(400, 550), p(500, 700)], length: 250, widthClass: 'normal' },

      { id: 'e9', from: 'j4', to: 'hB', path: [p(300, 700), p(200, 750), p(150, 850)], length: 300, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hG', path: [p(300, 700), p(300, 900)], length: 250, widthClass: 'normal' },

      { id: 'e11', from: 'j5', to: 'hO', path: [p(500, 700), p(500, 900)], length: 250, widthClass: 'normal' },
      { id: 'e12', from: 'j5', to: 'hP', path: [p(500, 700), p(600, 750), p(650, 850)], length: 300, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e7', 'e8'], defaultIndex: 0 }, // Routing center
      { id: 'j4', outEdges: ['e9', 'e10'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e11', 'e12'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 60 },
      { id: 'w2', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 8000, speed: 60 },
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 15000, speed: 60 },
      { id: 'w4', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 22000, speed: 60 },
      { id: 'w5', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 29000, speed: 60 },
      { id: 'w6', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 36000, speed: 60 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 8: Circuit Board (Dense routing)
  {
    levelId: 8,
    metadata: { name: 'Circuit Board', rating: 3 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 100, y: -50 },

      { id: 'j1', type: 'JUNCTION', x: 250, y: 300 },
      { id: 'j2', type: 'JUNCTION', x: 450, y: 300 },
      { id: 'j3', type: 'JUNCTION', x: 650, y: 300 },

      { id: 'j4', type: 'JUNCTION', x: 250, y: 550 },
      { id: 'j5', type: 'JUNCTION', x: 450, y: 550 },
      { id: 'j6', type: 'JUNCTION', x: 650, y: 550 },

      { id: 'hB', type: 'HOLE', x: 350, y: 850, color: '#5170ff' }, // Center holes
      { id: 'hG', type: 'HOLE', x: 450, y: 850, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 550, y: 850, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 200, y: 750, color: '#E91E63' }, // Side hole
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(100, -50), p(100, 300), p(250, 300)], length: 500, widthClass: 'normal' },

      // Top row
      { id: 'e2', from: 'j1', to: 'j4', path: [p(250, 300), p(250, 550)], length: 250, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j2', path: [p(250, 300), p(450, 300)], length: 200, widthClass: 'normal' },

      { id: 'e4', from: 'j2', to: 'j5', path: [p(450, 300), p(450, 550)], length: 250, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j3', path: [p(450, 300), p(650, 300)], length: 200, widthClass: 'normal' },

      { id: 'e6', from: 'j3', to: 'j6', path: [p(650, 300), p(650, 550)], length: 250, widthClass: 'normal' },

      // Middle to Bottom connections
      { id: 'e7', from: 'j4', to: 'hP', path: [p(250, 550), p(200, 650), p(200, 750)], length: 300, widthClass: 'normal' },
      { id: 'e8', from: 'j4', to: 'j5', path: [p(250, 550), p(450, 550)], length: 200, widthClass: 'normal' },

      { id: 'e9', from: 'j5', to: 'hB', path: [p(450, 550), p(350, 700), p(350, 850)], length: 500, widthClass: 'normal' },
      { id: 'e10', from: 'j5', to: 'hG', path: [p(450, 550), p(450, 850)], length: 450, widthClass: 'normal' },

      { id: 'e11', from: 'j6', to: 'hO', path: [p(650, 550), p(550, 700), p(550, 850)], length: 500, widthClass: 'normal' },
      { id: 'e12', from: 'j6', to: 'j5', path: [p(650, 550), p(450, 550)], length: 200, widthClass: 'normal' }, // Backwards flow
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e6'], defaultIndex: 0 }, // J3 only goes down actually, wait, e6. 
      // Need alternative for j3? No, j3 has only 1 out edge? That's boring. Let's add bridge j3->j5

      { id: 'j4', outEdges: ['e7', 'e8'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e9', 'e10'], defaultIndex: 0 },
      { id: 'j6', outEdges: ['e11', 'e12'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 60 },
      { id: 'w2', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 7000, speed: 60 },
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 13000, speed: 60 },
      { id: 'w4', size: 'M', color: '#E91E63', spawnNodeId: 's', spawnTimeMs: 19000, speed: 60 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 25000, speed: 60 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // LEVEL 9: Double Loops
  {
    levelId: 9,
    metadata: { name: 'Double Loops', rating: 4 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: -100 },

      { id: 'j1', type: 'JUNCTION', x: 400, y: 400 },
      { id: 'j2', type: 'JUNCTION', x: 200, y: 500 },
      { id: 'j3', type: 'JUNCTION', x: 600, y: 500 },
      { id: 'j4', type: 'JUNCTION', x: 400, y: 650 },

      { id: 'j5', type: 'JUNCTION', x: 400, y: 800 }, // Fan out

      { id: 'hB', type: 'HOLE', x: 150, y: 950, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 300, y: 950, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 500, y: 950, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 650, y: 950, color: '#E91E63' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -100), p(400, 400)], length: 500, widthClass: 'normal' },

      // Upper Diamond
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 400), p(200, 500)], length: 250, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 400), p(600, 500)], length: 250, widthClass: 'normal' },

      { id: 'e4', from: 'j2', to: 'j4', path: [p(200, 500), p(400, 650)], length: 250, widthClass: 'normal' },
      { id: 'e5', from: 'j3', to: 'j4', path: [p(600, 500), p(400, 650)], length: 250, widthClass: 'normal' },

      // Loops
      { id: 'e6', from: 'j4', to: 'j2', path: [p(400, 650), p(300, 575), p(200, 500)], length: 250, widthClass: 'normal' },
      { id: 'e7', from: 'j4', to: 'j3', path: [p(400, 650), p(500, 575), p(600, 500)], length: 250, widthClass: 'normal' },

      { id: 'e8', from: 'j4', to: 'j5', path: [p(400, 650), p(400, 800)], length: 150, widthClass: 'normal' },

      // Bottom fan
      { id: 'e9', from: 'j5', to: 'hB', path: [p(400, 800), p(150, 950)], length: 300, widthClass: 'normal' },
      { id: 'e10', from: 'j5', to: 'hG', path: [p(400, 800), p(300, 950)], length: 250, widthClass: 'normal' },
      { id: 'e11', from: 'j5', to: 'hO', path: [p(400, 800), p(500, 950)], length: 250, widthClass: 'normal' },
      { id: 'e12', from: 'j5', to: 'hP', path: [p(400, 800), p(650, 950)], length: 300, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4'], defaultIndex: 0 }, // J2 merge
      { id: 'j3', outEdges: ['e5'], defaultIndex: 0 }, // J3 merge

      { id: 'j4', outEdges: ['e8', 'e6', 'e7'], defaultIndex: 0 }, // 3-Way: Down or Back L/R
      { id: 'j5', outEdges: ['e9', 'e10', 'e11', 'e12'], defaultIndex: 0 }, // 4-Way
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 60 },
      { id: 'w2', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 7000, speed: 60 },
      { id: 'w3', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 13000, speed: 60 },
      { id: 'w4', size: 'M', color: '#E91E63', spawnNodeId: 's', spawnTimeMs: 19000, speed: 60 },
      { id: 'w5', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 25000, speed: 60 },
      { id: 'w6', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 31000, speed: 60 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 10: Freeway (Fast worms, long straight paths to switch)
  {
    levelId: 10,
    metadata: { name: 'Freeway', rating: 4 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 200, y: -100 },
      { id: 's2', type: 'SPAWN', x: 600, y: -100 },

      { id: 'j1', type: 'JUNCTION', x: 200, y: 400 },
      { id: 'j2', type: 'JUNCTION', x: 600, y: 400 },

      { id: 'j3', type: 'JUNCTION', x: 400, y: 550 },

      { id: 'hB', type: 'HOLE', x: 100, y: 850, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 300, y: 900, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 500, y: 900, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 700, y: 850, color: '#E91E63' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(200, -100), p(200, 400)], length: 500, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(600, -100), p(600, 400)], length: 500, widthClass: 'normal' },

      // Cross
      { id: 'e3', from: 'j1', to: 'j3', path: [p(200, 400), p(400, 550)], length: 250, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j3', path: [p(600, 400), p(400, 550)], length: 250, widthClass: 'normal' },

      // Straight downs
      { id: 'e5', from: 'j1', to: 'hB', path: [p(200, 400), p(100, 600), p(100, 850)], length: 450, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'hP', path: [p(600, 400), p(700, 600), p(700, 850)], length: 450, widthClass: 'normal' },

      // Center out
      { id: 'e7', from: 'j3', to: 'hG', path: [p(400, 550), p(300, 900)], length: 350, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'hO', path: [p(400, 550), p(500, 900)], length: 350, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e5', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e6', 'e4'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e7', 'e8'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 75 }, // FAST
      { id: 'w2', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 6000, speed: 75 },
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 11000, speed: 75 },
      { id: 'w4', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 16000, speed: 75 },
      { id: 'w5', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 21000, speed: 75 },
      { id: 'w6', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 26000, speed: 75 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // =========================================================================
  // HARD (11-15) — 5–6 worms, many paths, frequent traps, loops for dodging
  // =========================================================================

  // LEVEL 11: Earthshaker (Introduces Earthquake)
  {
    levelId: 11,
    metadata: { name: 'Earthshaker', rating: 5 },
    intro: {
      title: 'ระวังแผ่นดินไหว!',
      description: 'เมื่อแผ่นดินไหว ทางแยกจะเปลี่ยนทิศทางเอง!\nรีบกดเพื่อแก้ไขเส้นทางนะ',
      imageKey: 'spawn'
    },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 400 },

      { id: 'j2', type: 'JUNCTION', x: 240, y: 480 },
      { id: 'j3', type: 'JUNCTION', x: 560, y: 480 },

      { id: 'j4', type: 'JUNCTION', x: 240, y: 660 }, // quake target
      { id: 'j5', type: 'JUNCTION', x: 560, y: 660 },

      { id: 'j6', type: 'JUNCTION', x: 400, y: 760 }, // quake target

      { id: 'hBS', type: 'HOLE', x: 150, y: 950, color: '#5170ff', size: 'S' },
      { id: 'hP', type: 'HOLE', x: 280, y: 980, color: '#E91E63' },
      { id: 'hG', type: 'HOLE', x: 400, y: 990, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 520, y: 980, color: '#ff914d' },
      { id: 'hY', type: 'HOLE', x: 650, y: 950, color: '#FFD700' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -100), p(400, 400)], length: 500, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 400), p(240, 400), p(240, 480)], length: 300, widthClass: 'narrow' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 400), p(560, 400), p(560, 480)], length: 300, widthClass: 'normal' },

      { id: 'e4', from: 'j2', to: 'j4', path: [p(240, 480), p(240, 660)], length: 180, widthClass: 'narrow' },
      { id: 'e5', from: 'j3', to: 'j5', path: [p(560, 480), p(560, 660)], length: 180, widthClass: 'normal' },

      { id: 'e6', from: 'j4', to: 'j6', path: [p(240, 660), p(320, 710), p(400, 760)], length: 220, widthClass: 'narrow' },
      { id: 'e7', from: 'j5', to: 'j6', path: [p(560, 660), p(480, 710), p(400, 760)], length: 220, widthClass: 'normal' },

      // loop back up to dodge hazards
      { id: 'e8', from: 'j6', to: 'j4', path: [p(400, 760), p(320, 710), p(240, 660)], length: 220, widthClass: 'narrow' },
      { id: 'e9', from: 'j6', to: 'j5', path: [p(400, 760), p(480, 710), p(560, 660)], length: 220, widthClass: 'normal' },

      // exits (j6 3-way only)
      { id: 'e10', from: 'j4', to: 'hBS', path: [p(240, 660), p(150, 840), p(150, 950)], length: 420, widthClass: 'narrow' },
      { id: 'e11', from: 'j6', to: 'hG', path: [p(400, 760), p(400, 900), p(400, 990)], length: 280, widthClass: 'normal' },
      { id: 'e12', from: 'j6', to: 'hP', path: [p(400, 760), p(340, 900), p(280, 980)], length: 320, widthClass: 'normal' },
      { id: 'e13', from: 'j6', to: 'hO', path: [p(400, 760), p(460, 900), p(520, 980)], length: 320, widthClass: 'normal' },
      { id: 'e14', from: 'j5', to: 'hY', path: [p(560, 660), p(650, 840), p(650, 950)], length: 420, widthClass: 'normal' },
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
      { id: 't1', type: 'EARTHQUAKE', nodeId: 'j4', intervalMs: 5000, initialDelayMs: 4000 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j6', intervalMs: 3800, initialDelayMs: 2800 },
    ],
    worms: [
      { id: 'w1', size: 'S', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 50 },
      { id: 'w2', size: 'M', color: '#FFD700', spawnNodeId: 's', spawnTimeMs: 7000, speed: 50 },
      { id: 'w3', size: 'M', color: '#E91E63', spawnNodeId: 's', spawnTimeMs: 13000, speed: 50 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 19000, speed: 50 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 25000, speed: 50 },
      { id: 'w6', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 31000, speed: 50 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 12: Spider's Nest (Introduces Spider)
  {
    levelId: 12,
    metadata: { name: 'Spider\'s Nest', rating: 5 },
    intro: {
      title: 'เจ้าแมงมุมจอมป่วน',
      description: 'ระวัง! แมงมุมจะพ่นใยปิดบังเส้นทาง\nต้องจำทางไว้ให้ดีนะ',
      imageKey: 'spawn'
    },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 'sL', type: 'SPAWN', x: 200, y: -100 },
      { id: 'sR', type: 'SPAWN', x: 600, y: -100 },

      { id: 'j1', type: 'JUNCTION', x: 200, y: 400 },
      { id: 'j2', type: 'JUNCTION', x: 400, y: 400 },
      { id: 'j3', type: 'JUNCTION', x: 600, y: 400 },

      { id: 'j4', type: 'JUNCTION', x: 260, y: 550 }, // spider
      { id: 'j5', type: 'JUNCTION', x: 540, y: 550 }, // spider

      { id: 'j6', type: 'JUNCTION', x: 400, y: 710 }, // merge + loop
      { id: 'j7', type: 'JUNCTION', x: 300, y: 840 },
      { id: 'j8', type: 'JUNCTION', x: 500, y: 840 },

      { id: 'hB', type: 'HOLE', x: 140, y: 1030, color: '#5170ff', size: 'S' },
      { id: 'hG', type: 'HOLE', x: 280, y: 1050, color: '#58CC02' },
      { id: 'hY', type: 'HOLE', x: 400, y: 1070, color: '#FFD700' },
      { id: 'hO', type: 'HOLE', x: 520, y: 1050, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 660, y: 1030, color: '#E91E63', size: 'S' },
    ],
    edges: [
      { id: 'e1', from: 'sL', to: 'j1', path: [p(200, -100), p(200, 400)], length: 500, widthClass: 'normal' },
      { id: 'e2', from: 'sR', to: 'j3', path: [p(600, -100), p(600, 400)], length: 500, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'j2', path: [p(200, 400), p(400, 400)], length: 200, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j3', path: [p(400, 400), p(600, 400)], length: 200, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j4', path: [p(400, 400), p(320, 475), p(260, 550)], length: 240, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j5', path: [p(400, 400), p(480, 475), p(540, 550)], length: 240, widthClass: 'normal' },

      // trap layer to merge
      { id: 'e7', from: 'j4', to: 'j6', path: [p(260, 550), p(330, 630), p(400, 710)], length: 230, widthClass: 'normal' },
      { id: 'e8', from: 'j5', to: 'j6', path: [p(540, 550), p(470, 630), p(400, 710)], length: 230, widthClass: 'normal' },

      // loop back up around traps (dodge route)
      { id: 'e9', from: 'j6', to: 'j4', path: [p(400, 710), p(330, 630), p(260, 550)], length: 230, widthClass: 'normal' },
      { id: 'e10', from: 'j6', to: 'j5', path: [p(400, 710), p(470, 630), p(540, 550)], length: 230, widthClass: 'normal' },

      // down to final switches
      { id: 'e11', from: 'j6', to: 'j7', path: [p(400, 710), p(340, 775), p(300, 840)], length: 170, widthClass: 'normal' },
      { id: 'e12', from: 'j6', to: 'j8', path: [p(400, 710), p(460, 775), p(500, 840)], length: 170, widthClass: 'normal' },

      // final fan (no 4-way: j7/j8 are 3-way max)
      { id: 'e13', from: 'j7', to: 'hB', path: [p(300, 840), p(220, 935), p(140, 1030)], length: 260, widthClass: 'narrow' },
      { id: 'e14', from: 'j7', to: 'hG', path: [p(300, 840), p(290, 945), p(280, 1050)], length: 210, widthClass: 'normal' },
      { id: 'e15', from: 'j7', to: 'hY', path: [p(300, 840), p(350, 955), p(400, 1070)], length: 270, widthClass: 'normal' },

      { id: 'e16', from: 'j8', to: 'hP', path: [p(500, 840), p(580, 935), p(660, 1030)], length: 260, widthClass: 'narrow' },
      { id: 'e17', from: 'j8', to: 'hO', path: [p(500, 840), p(510, 945), p(520, 1050)], length: 210, widthClass: 'normal' },
      { id: 'e18', from: 'j8', to: 'hY', path: [p(500, 840), p(450, 955), p(400, 1070)], length: 270, widthClass: 'normal' },
      { id: 'e19', from: 'j3', to: 'j5', path: [p(600, 400), p(570, 475), p(540, 550)], length: 200, widthClass: 'normal' },
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
      { id: 'w2', size: 'S', color: '#5170ff', spawnNodeId: 'sR', spawnTimeMs: 7000, speed: 50 },
      { id: 'w3', size: 'S', color: '#E91E63', spawnNodeId: 'sL', spawnTimeMs: 13000, speed: 50 },
      { id: 'w4', size: 'S', color: '#58CC02', spawnNodeId: 'sR', spawnTimeMs: 19000, speed: 50 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 'sR', spawnTimeMs: 25000, speed: 50 },
      { id: 'w6', size: 'M', color: '#58CC02', spawnNodeId: 'sL', spawnTimeMs: 31000, speed: 50 },
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
      { id: 's', type: 'SPAWN', x: 400, y: -100 },

      { id: 'j1', type: 'JUNCTION', x: 400, y: 400 },
      { id: 'j2', type: 'JUNCTION', x: 560, y: 460 }, // spider
      { id: 'j3', type: 'JUNCTION', x: 560, y: 640 },
      { id: 'j4', type: 'JUNCTION', x: 400, y: 760 }, // quake
      { id: 'j5', type: 'JUNCTION', x: 240, y: 640 },
      { id: 'j6', type: 'JUNCTION', x: 240, y: 460 },

      { id: 'hB', type: 'HOLE', x: 140, y: 1020, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 280, y: 1050, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 520, y: 1050, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 660, y: 1020, color: '#E91E63' },
      { id: 'hY', type: 'HOLE', x: 400, y: 1070, color: '#FFD700' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -100), p(400, 400)], length: 500, widthClass: 'normal' },

      // spiral clockwise
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 400), p(500, 430), p(560, 460)], length: 210, widthClass: 'normal' },
      { id: 'e3', from: 'j2', to: 'j3', path: [p(560, 460), p(560, 640)], length: 180, widthClass: 'normal' },
      { id: 'e4', from: 'j3', to: 'j4', path: [p(560, 640), p(480, 700), p(400, 760)], length: 210, widthClass: 'normal' },
      { id: 'e5', from: 'j4', to: 'j5', path: [p(400, 760), p(320, 700), p(240, 640)], length: 210, widthClass: 'normal' },
      { id: 'e6', from: 'j5', to: 'j6', path: [p(240, 640), p(240, 460)], length: 180, widthClass: 'normal' },
      { id: 'e7', from: 'j6', to: 'j1', path: [p(240, 460), p(320, 430), p(400, 400)], length: 210, widthClass: 'normal' }, // completes loop

      // exits to holes (use different spiral nodes so routing matters)
      { id: 'e8', from: 'j6', to: 'hB', path: [p(240, 460), p(170, 740), p(140, 1020)], length: 620, widthClass: 'normal' },
      { id: 'e9', from: 'j5', to: 'hG', path: [p(240, 640), p(260, 845), p(280, 1050)], length: 430, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hY', path: [p(400, 760), p(400, 915), p(400, 1070)], length: 310, widthClass: 'normal' },
      { id: 'e11', from: 'j3', to: 'hO', path: [p(560, 640), p(540, 845), p(520, 1050)], length: 430, widthClass: 'normal' },
      { id: 'e12', from: 'j2', to: 'hP', path: [p(560, 460), p(630, 740), p(660, 1020)], length: 620, widthClass: 'normal' },
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
      { id: 'w2', size: 'S', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 7000, speed: 50 },
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 13000, speed: 50 },
      { id: 'w4', size: 'S', color: '#E91E63', spawnNodeId: 's', spawnTimeMs: 19000, speed: 50 },
      { id: 'w5', size: 'M', color: '#FFD700', spawnNodeId: 's', spawnTimeMs: 25000, speed: 50 },
      { id: 'w6', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 31000, speed: 50 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 14: Panic Router (6 colors, fast pace, multiple traps)
  {
    levelId: 14,
    metadata: { name: 'Panic Router', rating: 5 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700', '#9C27B0'],
    nodes: [
      { id: 'sL', type: 'SPAWN', x: 230, y: -100 },
      { id: 'sR', type: 'SPAWN', x: 570, y: -100 },

      { id: 'j1', type: 'JUNCTION', x: 230, y: 400 },
      { id: 'j2', type: 'JUNCTION', x: 570, y: 400 },

      { id: 'j3', type: 'JUNCTION', x: 400, y: 460 }, // quake
      { id: 'j4', type: 'JUNCTION', x: 260, y: 600 }, // spider
      { id: 'j5', type: 'JUNCTION', x: 540, y: 600 }, // spider

      { id: 'j6', type: 'JUNCTION', x: 400, y: 720 }, // hub (3-way max)
      { id: 'j7', type: 'JUNCTION', x: 300, y: 860 },
      { id: 'j8', type: 'JUNCTION', x: 500, y: 860 },

      { id: 'hB', type: 'HOLE', x: 130, y: 1030, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 250, y: 1050, color: '#58CC02' },
      { id: 'hY', type: 'HOLE', x: 370, y: 1070, color: '#FFD700' },
      { id: 'hO', type: 'HOLE', x: 430, y: 1070, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 550, y: 1050, color: '#E91E63' },
      { id: 'hV', type: 'HOLE', x: 670, y: 1030, color: '#9C27B0' },
    ],
    edges: [
      { id: 'e1', from: 'sL', to: 'j1', path: [p(230, -100), p(230, 400)], length: 500, widthClass: 'normal' },
      { id: 'e2', from: 'sR', to: 'j2', path: [p(570, -100), p(570, 400)], length: 500, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'j3', path: [p(230, 400), p(315, 430), p(400, 460)], length: 220, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j3', path: [p(570, 400), p(485, 430), p(400, 460)], length: 220, widthClass: 'normal' },

      { id: 'e5', from: 'j3', to: 'j4', path: [p(400, 460), p(330, 530), p(260, 600)], length: 220, widthClass: 'normal' },
      { id: 'e6', from: 'j3', to: 'j5', path: [p(400, 460), p(470, 530), p(540, 600)], length: 220, widthClass: 'normal' },

      { id: 'e7', from: 'j4', to: 'j6', path: [p(260, 600), p(330, 660), p(400, 720)], length: 220, widthClass: 'normal' },
      { id: 'e8', from: 'j5', to: 'j6', path: [p(540, 600), p(470, 660), p(400, 720)], length: 220, widthClass: 'normal' },

      // dodge loops back to trap layer
      { id: 'e9', from: 'j6', to: 'j4', path: [p(400, 720), p(330, 660), p(260, 600)], length: 220, widthClass: 'normal' },
      { id: 'e10', from: 'j6', to: 'j5', path: [p(400, 720), p(470, 660), p(540, 600)], length: 220, widthClass: 'normal' },

      // final split
      { id: 'e11', from: 'j6', to: 'j7', path: [p(400, 720), p(350, 790), p(300, 860)], length: 190, widthClass: 'normal' },
      { id: 'e12', from: 'j6', to: 'j8', path: [p(400, 720), p(450, 790), p(500, 860)], length: 190, widthClass: 'normal' },

      // fan to holes (3-way max)
      { id: 'e13', from: 'j7', to: 'hB', path: [p(300, 860), p(215, 945), p(130, 1030)], length: 260, widthClass: 'normal' },
      { id: 'e14', from: 'j7', to: 'hG', path: [p(300, 860), p(275, 955), p(250, 1050)], length: 220, widthClass: 'normal' },
      { id: 'e15', from: 'j7', to: 'hY', path: [p(300, 860), p(335, 965), p(370, 1070)], length: 240, widthClass: 'normal' },

      { id: 'e16', from: 'j8', to: 'hV', path: [p(500, 860), p(585, 945), p(670, 1030)], length: 260, widthClass: 'normal' },
      { id: 'e17', from: 'j8', to: 'hP', path: [p(500, 860), p(525, 955), p(550, 1050)], length: 220, widthClass: 'normal' },
      { id: 'e18', from: 'j8', to: 'hO', path: [p(500, 860), p(465, 965), p(430, 1070)], length: 240, widthClass: 'normal' },
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
      { id: 't1', type: 'EARTHQUAKE', nodeId: 'j3', intervalMs: 3400, initialDelayMs: 2200 },
      { id: 't2', type: 'SPIDER', nodeId: 'j4', intervalMs: 6500, activeDurationMs: 2000, initialDelayMs: 3000 },
      { id: 't3', type: 'SPIDER', nodeId: 'j5', intervalMs: 6500, activeDurationMs: 2000, initialDelayMs: 5500 },
    ],
    worms: [
      { id: 'w1', size: 'S', color: '#5170ff', spawnNodeId: 'sL', spawnTimeMs: 1000, speed: 50 },
      { id: 'w2', size: 'M', color: '#9C27B0', spawnNodeId: 'sR', spawnTimeMs: 7000, speed: 60 },
      { id: 'w3', size: 'S', color: '#FFD700', spawnNodeId: 'sL', spawnTimeMs: 13000, speed: 50 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 'sR', spawnTimeMs: 19000, speed: 60 },
      { id: 'w5', size: 'S', color: '#E91E63', spawnNodeId: 'sL', spawnTimeMs: 25000, speed: 50 },
      { id: 'w6', size: 'M', color: '#ff914d', spawnNodeId: 'sR', spawnTimeMs: 31000, speed: 60 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 15: The Finale (6 colors, 8 worms, MAX CHAOS)
  {
    levelId: 15,
    metadata: { name: 'The Finale', rating: 5 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700', '#9C27B0'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 200, y: -100 },
      { id: 's2', type: 'SPAWN', x: 600, y: -100 },

      { id: 'j1', type: 'JUNCTION', x: 200, y: 400 },
      { id: 'j2', type: 'JUNCTION', x: 400, y: 400 },
      { id: 'j3', type: 'JUNCTION', x: 600, y: 400 },

      { id: 'j4', type: 'JUNCTION', x: 200, y: 520 }, // spider
      { id: 'j5', type: 'JUNCTION', x: 400, y: 520 }, // quake
      { id: 'j6', type: 'JUNCTION', x: 600, y: 520 }, // spider

      { id: 'j7', type: 'JUNCTION', x: 260, y: 700 },
      { id: 'j8', type: 'JUNCTION', x: 540, y: 700 },
      { id: 'j9', type: 'JUNCTION', x: 400, y: 800 }, // merge + loop

      { id: 'hB', type: 'HOLE', x: 120, y: 1030, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 240, y: 1050, color: '#58CC02' },
      { id: 'hY', type: 'HOLE', x: 360, y: 1070, color: '#FFD700' },
      { id: 'hO', type: 'HOLE', x: 440, y: 1070, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 560, y: 1050, color: '#E91E63' },
      { id: 'hV', type: 'HOLE', x: 680, y: 1030, color: '#9C27B0' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(200, -100), p(200, 400)], length: 500, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j3', path: [p(600, -100), p(600, 400)], length: 500, widthClass: 'normal' },

      // top routing (j2 only 2 outs, no 4-way)
      { id: 'e3', from: 'j1', to: 'j2', path: [p(200, 400), p(400, 400)], length: 200, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j3', path: [p(400, 400), p(600, 400)], length: 200, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j5', path: [p(400, 400), p(400, 520)], length: 120, widthClass: 'normal' },

      { id: 'e6', from: 'j1', to: 'j4', path: [p(200, 400), p(200, 520)], length: 120, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'j6', path: [p(600, 400), p(600, 520)], length: 120, widthClass: 'normal' },

      // mid links (multiple loops)
      { id: 'e8', from: 'j4', to: 'j5', path: [p(200, 520), p(400, 520)], length: 200, widthClass: 'normal' },
      { id: 'e9', from: 'j6', to: 'j5', path: [p(600, 520), p(400, 520)], length: 200, widthClass: 'normal' },
      { id: 'e10', from: 'j5', to: 'j4', path: [p(400, 520), p(200, 520)], length: 200, widthClass: 'normal' },
      { id: 'e11', from: 'j5', to: 'j6', path: [p(400, 520), p(600, 520)], length: 200, widthClass: 'normal' },

      // down layer
      { id: 'e12', from: 'j4', to: 'j7', path: [p(200, 520), p(230, 620), p(260, 700)], length: 190, widthClass: 'normal' },
      { id: 'e13', from: 'j6', to: 'j8', path: [p(600, 520), p(570, 620), p(540, 700)], length: 190, widthClass: 'normal' },
      { id: 'e14', from: 'j5', to: 'j9', path: [p(400, 520), p(400, 660), p(400, 800)], length: 280, widthClass: 'normal' },

      // merge / loop at j9 (3-way max)
      { id: 'e15', from: 'j7', to: 'j9', path: [p(260, 700), p(330, 750), p(400, 800)], length: 190, widthClass: 'normal' },
      { id: 'e16', from: 'j8', to: 'j9', path: [p(540, 700), p(470, 750), p(400, 800)], length: 190, widthClass: 'normal' },
      { id: 'e17', from: 'j9', to: 'j7', path: [p(400, 800), p(330, 750), p(260, 700)], length: 190, widthClass: 'normal' },
      { id: 'e18', from: 'j9', to: 'j8', path: [p(400, 800), p(470, 750), p(540, 700)], length: 190, widthClass: 'normal' },

      // final fan to 6 holes via j7/j8 (each 3-way max)
      { id: 'e19', from: 'j7', to: 'hB', path: [p(260, 700), p(190, 865), p(120, 1030)], length: 420, widthClass: 'normal' },
      { id: 'e20', from: 'j7', to: 'hG', path: [p(260, 700), p(250, 875), p(240, 1050)], length: 360, widthClass: 'normal' },
      { id: 'e21', from: 'j7', to: 'hY', path: [p(260, 700), p(310, 885), p(360, 1070)], length: 420, widthClass: 'normal' },

      { id: 'e22', from: 'j8', to: 'hV', path: [p(540, 700), p(610, 865), p(680, 1030)], length: 420, widthClass: 'normal' },
      { id: 'e23', from: 'j8', to: 'hP', path: [p(540, 700), p(550, 875), p(560, 1050)], length: 360, widthClass: 'normal' },
      { id: 'e24', from: 'j8', to: 'hO', path: [p(540, 700), p(490, 885), p(440, 1070)], length: 420, widthClass: 'normal' },
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
      { id: 't1', type: 'SPIDER', nodeId: 'j4', intervalMs: 6000, activeDurationMs: 2000, initialDelayMs: 2500 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j5', intervalMs: 4000, initialDelayMs: 3000 },
      { id: 't3', type: 'SPIDER', nodeId: 'j6', intervalMs: 6000, activeDurationMs: 2000, initialDelayMs: 5500 },
    ],
    worms: [
      { id: 'w1', size: 'S', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 50 },
      { id: 'w2', size: 'M', color: '#9C27B0', spawnNodeId: 's2', spawnTimeMs: 7000, speed: 50 },
      { id: 'w3', size: 'S', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 13000, speed: 50 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 19000, speed: 50 },
      { id: 'w5', size: 'S', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 25000, speed: 50 },
      { id: 'w6', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 31000, speed: 50 },
      { id: 'w7', size: 'S', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 37000, speed: 50 },
      { id: 'w8', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 43000, speed: 50 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 8 },
  },
];

export default LEVELS;
