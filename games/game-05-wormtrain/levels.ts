import { LevelData } from './types/level';

const p = (x: number, y: number) => ({ x, y });

/**
 * GRID REBRAND v2: Holes scattered across screen, no redundant paths, all orthogonal.
 */
export const LEVELS: LevelData[] = [
  // LEVEL 0: Tutorial
  {
    levelId: 0, metadata: { name: 'Tutorial', rating: 1 },
    colors: ['#5170ff', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 350 },
      { id: 'hB', type: 'HOLE', x: 150, y: 350, color: '#5170ff' },
      { id: 'hO', type: 'HOLE', x: 650, y: 350, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -100), p(400, 350)], length: 450, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'hB', path: [p(400, 350), p(150, 350)], length: 250, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hO', path: [p(400, 350), p(650, 350)], length: 250, widthClass: 'normal' },
    ],
    junctions: [{ id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 }],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 1000, speed: 70 },
      { id: 'w2', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 7000, speed: 70 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 2 },
  },

  // LEVEL 1: First Split — T-shape: spawn left, junction center, holes right & bottom
  {
    levelId: 1, metadata: { name: 'First Split', rating: 1 },
    colors: ['#5170ff', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 100, y: 400 },
      { id: 'j1', type: 'JUNCTION', x: 450, y: 400 },
      { id: 'hO', type: 'HOLE', x: 750, y: 400, color: '#ff914d', rotation: -90 },
      { id: 'hB', type: 'HOLE', x: 450, y: 700, color: '#5170ff' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(100, 400), p(450, 400)], length: 350, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'hO', path: [p(450, 400), p(750, 400)], length: 300, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hB', path: [p(450, 400), p(450, 700)], length: 300, widthClass: 'normal' },
    ],
    junctions: [{ id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 0 }],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 1000, speed: 40 },
      { id: 'w2', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 8000, speed: 40 },
      { id: 'w3', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 15000, speed: 40 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 3 },
  },

  // LEVEL 2: The Branching Path
  {
    levelId: 2, metadata: { name: 'Branching Path', rating: 2 },
    colors: ['#5170ff', '#ff914d', '#58CC02'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 100, y: 200 },
      { id: 'j1', type: 'JUNCTION', x: 800, y: 650 },
      { id: 'j2', type: 'JUNCTION', x: 550, y: 650 },
      { id: 'hG', type: 'HOLE', x: 800, y: 850, color: '#58CC02' }, // Bottom right
      { id: 'hO', type: 'HOLE', x: 550, y: 400, color: '#ff914d', rotation: 180 }, // Middle center
      { id: 'hB', type: 'HOLE', x: 300, y: 400, color: '#5170ff', rotation: 180 }, // Middle left
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(100, 200), p(800, 200), p(800, 650)], length: 1150, widthClass: 'normal' },

      { id: 'e2', from: 'j1', to: 'hG', path: [p(800, 650), p(800, 850)], length: 200, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j2', path: [p(800, 650), p(550, 650)], length: 250, widthClass: 'normal' },

      { id: 'e4', from: 'j2', to: 'hO', path: [p(550, 650), p(550, 400)], length: 250, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hB', path: [p(550, 650), p(300, 650), p(300, 400)], length: 500, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 1000, speed: 80 },
      { id: 'w2', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 5000, speed: 80 },
      { id: 'w3', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 9000, speed: 80 },
      { id: 'w4', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 13000, speed: 80 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 4 },
  },

  // LEVEL 3: The Crosswise Puzzle
  {
    levelId: 3, metadata: { name: 'Crosswise', rating: 3 },
    colors: ['#58CC02', '#5170ff', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 100, y: 950 },
      { id: 'j1', type: 'JUNCTION', x: 600, y: 950 },
      { id: 'j2', type: 'JUNCTION', x: 400, y: 400 },
      { id: 'hG', type: 'HOLE', x: 800, y: 150, color: '#58CC02', rotation: 180 }, // Top right
      { id: 'hB', type: 'HOLE', x: 150, y: 150, color: '#5170ff', rotation: 90 }, // Top left
      { id: 'hO', type: 'HOLE', x: 150, y: 650, color: '#ff914d', rotation: 90 }, // Bottom left
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(100, 950), p(600, 950)], length: 500, widthClass: 'normal' },

      { id: 'e2', from: 'j1', to: 'hG', path: [p(600, 950), p(800, 950), p(800, 150)], length: 1000, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j2', path: [p(600, 950), p(600, 400), p(400, 400)], length: 750, widthClass: 'normal' },

      { id: 'e4', from: 'j2', to: 'hB', path: [p(400, 400), p(400, 150), p(150, 150)], length: 500, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hO', path: [p(400, 400), p(400, 650), p(150, 650)], length: 500, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 1000, speed: 80 },
      { id: 'w2', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 6000, speed: 80 },
      { id: 'w3', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 11000, speed: 80 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 16000, speed: 80 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 21000, speed: 80 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // LEVEL 4: Four Corners (Left/Down Branching)
  {
    levelId: 4, metadata: { name: 'Four Corners', rating: 3 },
    intro: { title: 'เส้นทางคู่ขนาน', description: 'บริหารทางแยก 3 จุดให้ดี\nหนอนจะทยอยมา 4 สี!', imageKey: 'spawn' },
    colors: ['#E91E63', '#ff914d', '#58CC02', '#5170ff'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 800, y: 150, flipY: true, rotation: 90 }, // Rotate 90 to point DOWN, flipY to put rock on left instead of right
      { id: 'j1', type: 'JUNCTION', x: 800, y: 500 },
      { id: 'j2', type: 'JUNCTION', x: 550, y: 700 }, // Lower junction
      { id: 'j3', type: 'JUNCTION', x: 450, y: 500 }, // Middle junction
      { id: 'hP', type: 'HOLE', x: 150, y: 850, color: '#E91E63' }, // Far Bottom Left (Pink)
      { id: 'hO', type: 'HOLE', x: 350, y: 950, color: '#ff914d', rotation: 90 }, // Inner Bottom Left (Orange)
      { id: 'hG', type: 'HOLE', x: 50, y: 250, color: '#58CC02', rotation: 90 }, // Far Top Left (Green)
      { id: 'hB', type: 'HOLE', x: 300, y: 200, color: '#5170ff', rotation: 90 }, // Inner Top Left (Blue)
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(800, 150), p(800, 500)], length: 350, widthClass: 'normal' },

      // j1 splits
      { id: 'e2', from: 'j1', to: 'j2', path: [p(800, 500), p(800, 700), p(550, 700)], length: 450, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(800, 500), p(450, 500)], length: 350, widthClass: 'normal' },

      // j2 splits (Lower)
      { id: 'e4', from: 'j2', to: 'hP', path: [p(550, 700), p(150, 700), p(150, 850)], length: 550, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hO', path: [p(550, 700), p(550, 950), p(350, 950)], length: 450, widthClass: 'normal' },

      // j3 splits (Middle)
      { id: 'e6', from: 'j3', to: 'hG', path: [p(450, 500), p(150, 500), p(150, 250), p(50, 250)], length: 650, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'hB', path: [p(450, 500), p(450, 350), p(600, 350), p(600, 200), p(300, 200)], length: 750, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e6', 'e7'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 1000, speed: 80 },
      { id: 'w2', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 5000, speed: 80 },
      { id: 'w3', size: 'M', color: '#E91E63', spawnNodeId: 's', spawnTimeMs: 9000, speed: 80 },
      { id: 'w4', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 13000, speed: 80 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 17000, speed: 80 },
      { id: 'w6', size: 'M', color: '#E91E63', spawnNodeId: 's', spawnTimeMs: 21000, speed: 80 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 5: Vertical Cascade
  {
    levelId: 5, metadata: { name: 'Vertical Cascade', rating: 3 },
    intro: { title: 'ทิ้งดิ่งลงหลุม', description: 'เส้นทางแบบใหม่!\nบังคับทางแยกพาดิ่งลงหลุม!', imageKey: 'spawn' },
    colors: ['#ff914d', '#E91E63', '#5170ff', '#58CC02'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 150, y: -100, rotation: 90 }, // Faces DOWN, Grass on Right
      { id: 'j1', type: 'JUNCTION', x: 150, y: 600 },
      { id: 'j2', type: 'JUNCTION', x: 500, y: 600 },
      { id: 'j3', type: 'JUNCTION', x: 500, y: 400 },

      { id: 'h1', type: 'HOLE', x: 800, y: 850, color: '#ff914d', rotation: -90 }, // Far Bottom Right (Orange) -> Faces Left
      { id: 'h2', type: 'HOLE', x: 300, y: 750, color: '#E91E63', rotation: 90 }, // Inner Bottom Left (Pink) -> Faces Right
      { id: 'h3', type: 'HOLE', x: 500, y: -50, color: '#5170ff', rotation: 180 }, // Inner Top (Blue) -> Faces Down
      { id: 'h4', type: 'HOLE', x: 750, y: -50, color: '#58CC02', rotation: 180 }, // Outer Top Right (Green) -> Faces Down
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(150, -100), p(150, 600)], length: 700, widthClass: 'normal' },

      // j1 splits (DOWN and RIGHT)
      { id: 'e2', from: 'j1', to: 'h1', path: [p(150, 600), p(150, 850), p(800, 850)], length: 900, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j2', path: [p(150, 600), p(500, 600)], length: 350, widthClass: 'normal' },

      // j2 splits (DOWN and UP)
      { id: 'e4', from: 'j2', to: 'h2', path: [p(500, 600), p(500, 750), p(300, 750)], length: 350, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j3', path: [p(500, 600), p(500, 400)], length: 200, widthClass: 'normal' },

      // j3 splits (UP and RIGHT)
      { id: 'e6', from: 'j3', to: 'h3', path: [p(500, 400), p(500, -50)], length: 450, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'h4', path: [p(500, 400), p(750, 400), p(750, -50)], length: 700, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e6', 'e7'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 1000, speed: 80 },
      { id: 'w2', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 5000, speed: 80 },
      { id: 'w3', size: 'M', color: '#E91E63', spawnNodeId: 's', spawnTimeMs: 9000, speed: 80 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 's', spawnTimeMs: 13000, speed: 80 },
      { id: 'w5', size: 'M', color: '#5170ff', spawnNodeId: 's', spawnTimeMs: 17000, speed: 80 },
      { id: 'w6', size: 'M', color: '#E91E63', spawnNodeId: 's', spawnTimeMs: 21000, speed: 80 },
      { id: 'w7', size: 'M', color: '#ff914d', spawnNodeId: 's', spawnTimeMs: 25000, speed: 80 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 7 },
  },
  // LEVEL 6: Crossroad — 2 spawns, holes scattered: left-side, center, right-side
  {
    levelId: 6, metadata: { name: 'Symmetric Split', rating: 4 },
    intro: { title: 'สองฝั่งวุ่นวาย', description: 'จุดพีคแรก! 2 จุดเกิด 4 ทางแยกซ้ายขวา\nกวาดสายตาให้ทั่วล่ะ!', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 250, y: -400 },
      { id: 's2', type: 'SPAWN', x: 550, y: -400 },
      { id: 'j1', type: 'JUNCTION', x: 250, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 550, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 250, y: 500 },
      { id: 'j4', type: 'JUNCTION', x: 550, y: 500 },
      { id: 'hB', type: 'HOLE', x: 50, y: 200, color: '#5170ff', rotation: 90 },
      { id: 'hG', type: 'HOLE', x: 750, y: 200, color: '#58CC02', rotation: -90 },
      { id: 'hP', type: 'HOLE', x: 400, y: 600, color: '#E91E63' },
      { id: 'hO', type: 'HOLE', x: 400, y: 900, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(250, -400), p(250, 200)], length: 600, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(550, -400), p(550, 200)], length: 600, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hB', path: [p(250, 200), p(50, 200)], length: 200, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j3', path: [p(250, 200), p(250, 500)], length: 300, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hG', path: [p(550, 200), p(750, 200)], length: 200, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j4', path: [p(550, 200), p(550, 500)], length: 300, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'hP', path: [p(250, 500), p(400, 500), p(400, 600)], length: 250, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'hO', path: [p(250, 500), p(250, 800), p(400, 800), p(400, 900)], length: 550, widthClass: 'normal' },
      { id: 'e9', from: 'j4', to: 'hP', path: [p(550, 500), p(400, 500), p(400, 600)], length: 250, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hO', path: [p(550, 500), p(550, 800), p(400, 800), p(400, 900)], length: 550, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e7', 'e8'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e9', 'e10'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 60 },
      { id: 'w2', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 4000, speed: 60 },
      { id: 'w3', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 7000, speed: 60 },
      { id: 'w4', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 10000, speed: 60 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 13000, speed: 60 },
      { id: 'w6', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 16000, speed: 60 },
      { id: 'w7', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 19000, speed: 60 },
      { id: 'w8', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 22000, speed: 60 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 8 },
  },

  // LEVEL 7: Four Colors — holes scattered in 4 directions
  {
    levelId: 7, metadata: { name: 'Asymmetric Tree', rating: 4 },
    intro: { title: 'แนะนำสีที่ห้า', description: 'เปิดตัวสีเหลือง! แต่ละฝั่งมีทางแยกไม่เท่ากัน\nต้องจำทางให้ดีนะ', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 400, y: -300 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 200, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 600, y: 200 },
      { id: 'j4', type: 'JUNCTION', x: 200, y: 500 },
      { id: 'h1', type: 'HOLE', x: 50, y: 200, color: '#5170ff', rotation: 90 }, // Blue
      { id: 'h2', type: 'HOLE', x: 750, y: 200, color: '#58CC02', rotation: -90 }, // Green
      { id: 'h3', type: 'HOLE', x: 600, y: 800, color: '#ff914d' }, // Orange
      { id: 'h4', type: 'HOLE', x: 400, y: 500, color: '#E91E63', rotation: -90 }, // Pink
      { id: 'h5', type: 'HOLE', x: 200, y: 800, color: '#FFD700' }, // Yellow
    ],
    edges: [
      { id: 'e0', from: 's1', to: 'j1', path: [p(400, -300), p(400, 200)], length: 500, widthClass: 'normal' },

      { id: 'e1', from: 'j1', to: 'j2', path: [p(400, 200), p(200, 200)], length: 200, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'j3', path: [p(400, 200), p(600, 200)], length: 200, widthClass: 'normal' },

      { id: 'e3', from: 'j2', to: 'h1', path: [p(200, 200), p(50, 200)], length: 150, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j4', path: [p(200, 200), p(200, 500)], length: 300, widthClass: 'normal' },

      { id: 'e5', from: 'j3', to: 'h2', path: [p(600, 200), p(750, 200)], length: 150, widthClass: 'normal' },
      { id: 'e6', from: 'j3', to: 'h3', path: [p(600, 200), p(600, 800)], length: 600, widthClass: 'normal' },

      { id: 'e7', from: 'j4', to: 'h4', path: [p(200, 500), p(400, 500)], length: 200, widthClass: 'normal' },
      { id: 'e8', from: 'j4', to: 'h5', path: [p(200, 500), p(200, 800)], length: 300, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e1', 'e2'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e3', 'e4'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j4', outEdges: ['e7', 'e8'], defaultIndex: 1 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 65 },
      { id: 'w2', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 6000, speed: 65 },
      { id: 'w3', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 11000, speed: 65 },
      { id: 'w4', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 16000, speed: 65 },
      { id: 'w5', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 21000, speed: 65 },
      { id: 'w6', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 26000, speed: 65 },
      { id: 'w7', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 31000, speed: 65 },
      { id: 'w8', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 36000, speed: 65 },
      { id: 'w9', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 41000, speed: 65 },
      { id: 'w10', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 46000, speed: 65 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 10 },
  },

  // LEVEL 8: Circuit Board — grid with scattered holes
  {
    levelId: 8, metadata: { name: 'Circuit Mess', rating: 5 },
    intro: { title: 'จุดตัดรุงรัง', description: 'สายมั่วซั่วไปหมด!\nระวังการไขว้ทับซ้อนกันของเส้นทางนะ', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 250, y: -400 },
      { id: 's2', type: 'SPAWN', x: 550, y: -400 },
      { id: 'j1', type: 'JUNCTION', x: 250, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 550, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 250, y: 450 },
      { id: 'j4', type: 'JUNCTION', x: 550, y: 450 },
      { id: 'j5', type: 'JUNCTION', x: 400, y: 200 },
      { id: 'j6', type: 'JUNCTION', x: 400, y: 550 },
      { id: 'hB', type: 'HOLE', x: 400, y: 50, color: '#5170ff', rotation: 180 }, // Blue (Faces Down)
      { id: 'hG', type: 'HOLE', x: 50, y: 450, color: '#58CC02', rotation: 90 }, // Green (Faces Right)
      { id: 'hP', type: 'HOLE', x: 750, y: 450, color: '#E91E63', rotation: -90 }, // Pink (Faces Left)
      { id: 'hO', type: 'HOLE', x: 250, y: 700, color: '#ff914d', rotation: 0 }, // Orange (Faces Up)
      { id: 'hY', type: 'HOLE', x: 550, y: 700, color: '#FFD700', rotation: 0 }, // Yellow (Faces Up)
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(250, -400), p(250, 200)], length: 600, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(550, -400), p(550, 200)], length: 600, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'j3', path: [p(250, 200), p(250, 450)], length: 250, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j5', path: [p(250, 200), p(400, 200)], length: 150, widthClass: 'normal' },

      { id: 'e5', from: 'j2', to: 'j4', path: [p(550, 200), p(550, 450)], length: 250, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j5', path: [p(550, 200), p(400, 200)], length: 150, widthClass: 'normal' },

      { id: 'e7', from: 'j5', to: 'hB', path: [p(400, 200), p(400, 50)], length: 150, widthClass: 'normal' },
      { id: 'e8', from: 'j5', to: 'j6', path: [p(400, 200), p(400, 550)], length: 350, widthClass: 'normal' },

      { id: 'e9', from: 'j3', to: 'hG', path: [p(250, 450), p(50, 450)], length: 200, widthClass: 'normal' },
      { id: 'e10', from: 'j3', to: 'hO', path: [p(250, 450), p(250, 700)], length: 250, widthClass: 'normal' },

      { id: 'e11', from: 'j4', to: 'hP', path: [p(550, 450), p(750, 450)], length: 200, widthClass: 'normal' },
      { id: 'e12', from: 'j4', to: 'hY', path: [p(550, 450), p(550, 700)], length: 250, widthClass: 'normal' },

      { id: 'e13', from: 'j6', to: 'hO', path: [p(400, 550), p(250, 550), p(250, 700)], length: 300, widthClass: 'normal' },
      { id: 'e14', from: 'j6', to: 'hY', path: [p(400, 550), p(550, 550), p(550, 700)], length: 300, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e9', 'e10'], defaultIndex: 1 },
      { id: 'j4', outEdges: ['e11', 'e12'], defaultIndex: 1 },
      { id: 'j5', outEdges: ['e7', 'e8'], defaultIndex: 1 },
      { id: 'j6', outEdges: ['e13', 'e14'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 65 },  // Green
      { id: 'w2', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 5000, speed: 65 },  // Pink
      { id: 'w3', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 9000, speed: 65 },  // Yellow
      { id: 'w4', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 13000, speed: 65 }, // Blue
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 17000, speed: 65 }, // Orange
      { id: 'w6', size: 'M', color: '#FFD700', spawnNodeId: 's2', spawnTimeMs: 21000, speed: 65 }, // Yellow
      { id: 'w7', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 25000, speed: 65 }, // Blue
      { id: 'w8', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 29000, speed: 65 }, // Orange
      { id: 'w9', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 33000, speed: 65 },  // Green
      { id: 'w10', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 37000, speed: 65 }, // Pink
      { id: 'w11', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 41000, speed: 65 }, // Orange
      { id: 'w12', size: 'M', color: '#FFD700', spawnNodeId: 's2', spawnTimeMs: 45000, speed: 65 }, // Yellow
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 12 },
  },

  // LEVEL 9: Double Loops — holes at corners and sides
  {
    levelId: 9, metadata: { name: 'Speed Run', rating: 5 },
    intro: { title: 'หนอนซิ่งกระดูกสันหลัง', description: 'ทางลัดทางแยกเป็นก้างปลา หนอนจะมาเร็วมาก!\nสับรางให้ทันนะ!', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#E91E63', '#ff914d', '#FFD700'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 400, y: -400 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 150 },
      { id: 'j2', type: 'JUNCTION', x: 400, y: 350 },
      { id: 'j3', type: 'JUNCTION', x: 400, y: 550 },
      { id: 'j4', type: 'JUNCTION', x: 400, y: 750 },
      { id: 'hB', type: 'HOLE', x: 100, y: 150, color: '#5170ff', rotation: 90 },
      { id: 'hG', type: 'HOLE', x: 700, y: 350, color: '#58CC02', rotation: -90 },
      { id: 'hP', type: 'HOLE', x: 100, y: 550, color: '#E91E63', rotation: 90 },
      { id: 'hO', type: 'HOLE', x: 700, y: 750, color: '#ff914d', rotation: -90 },
      { id: 'hY', type: 'HOLE', x: 400, y: 950, color: '#FFD700' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(400, -400), p(400, 150)], length: 550, widthClass: 'normal' },

      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 150), p(400, 350)], length: 200, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hB', path: [p(400, 150), p(100, 150)], length: 300, widthClass: 'normal' },

      { id: 'e4', from: 'j2', to: 'j3', path: [p(400, 350), p(400, 550)], length: 200, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hG', path: [p(400, 350), p(700, 350)], length: 300, widthClass: 'normal' },

      { id: 'e6', from: 'j3', to: 'j4', path: [p(400, 550), p(400, 750)], length: 200, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'hP', path: [p(400, 550), p(100, 550)], length: 300, widthClass: 'normal' },

      { id: 'e8', from: 'j4', to: 'hY', path: [p(400, 750), p(400, 950)], length: 200, widthClass: 'normal' },
      { id: 'e9', from: 'j4', to: 'hO', path: [p(400, 750), p(700, 750)], length: 300, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e6', 'e7'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e8', 'e9'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 85 },
      { id: 'w2', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 3500, speed: 85 },
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 6000, speed: 85 },
      { id: 'w4', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 8500, speed: 85 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 11000, speed: 85 },
      { id: 'w6', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 13500, speed: 85 },
      { id: 'w7', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 16000, speed: 85 },
      { id: 'w8', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 18500, speed: 85 },
      { id: 'w9', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 21000, speed: 85 },
      { id: 'w10', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 23500, speed: 85 },
      { id: 'w11', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 26000, speed: 85 },
      { id: 'w12', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 28500, speed: 85 },
      { id: 'w13', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 31000, speed: 85 },
      { id: 'w14', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 33500, speed: 85 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 14 },
  },

  // LEVEL 10: Freeway — fast worms, holes at 4 corners
  {
    levelId: 10, metadata: { name: 'Fault Lines', rating: 5 },
    intro: { title: 'ระวังตีลังกา', description: 'แผ่นดินไหวจะทำให้ทางแยกสลับทิศทางเอง!\nต้องคอยดูและกดแก้ให้ทันนะ', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 250, y: -400 },
      { id: 's2', type: 'SPAWN', x: 550, y: -400 },
      { id: 'j1', type: 'JUNCTION', x: 250, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 550, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 250, y: 500 },
      { id: 'j4', type: 'JUNCTION', x: 550, y: 500 },
      { id: 'hB', type: 'HOLE', x: 50, y: 200, color: '#5170ff', rotation: 90 }, // Blue
      { id: 'hG', type: 'HOLE', x: 750, y: 200, color: '#58CC02', rotation: -90 }, // Green
      { id: 'hP', type: 'HOLE', x: 50, y: 500, color: '#E91E63', rotation: 90 },     // Pink
      { id: 'hO', type: 'HOLE', x: 750, y: 500, color: '#ff914d', rotation: -90 }, // Orange
      { id: 'hY', type: 'HOLE', x: 400, y: 800, color: '#FFD700' },                // Yellow
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(250, -400), p(250, 200)], length: 600, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(550, -400), p(550, 200)], length: 600, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'hB', path: [p(250, 200), p(50, 200)], length: 200, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j3', path: [p(250, 200), p(250, 500)], length: 300, widthClass: 'normal' },

      { id: 'e5', from: 'j2', to: 'hG', path: [p(550, 200), p(750, 200)], length: 200, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j4', path: [p(550, 200), p(550, 500)], length: 300, widthClass: 'normal' },

      { id: 'e7', from: 'j3', to: 'hP', path: [p(250, 500), p(50, 500)], length: 200, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'hY', path: [p(250, 500), p(400, 500), p(400, 800)], length: 450, widthClass: 'normal' },

      { id: 'e9', from: 'j4', to: 'hO', path: [p(550, 500), p(750, 500)], length: 200, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hY', path: [p(550, 500), p(400, 500), p(400, 800)], length: 450, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e7', 'e8'], defaultIndex: 1 },
      { id: 'j4', outEdges: ['e9', 'e10'], defaultIndex: 1 },
    ],
    traps: [
      { id: 't1', type: 'EARTHQUAKE', nodeId: 'j1', intervalMs: 6000, initialDelayMs: 4000 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j2', intervalMs: 7000, initialDelayMs: 5000 },
      { id: 't3', type: 'EARTHQUAKE', nodeId: 'j3', intervalMs: 5500, initialDelayMs: 6000 },
      { id: 't4', type: 'EARTHQUAKE', nodeId: 'j4', intervalMs: 6500, initialDelayMs: 7000 },
    ],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 65 },  // Blue
      { id: 'w2', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 4000, speed: 65 },  // Green
      { id: 'w3', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 7000, speed: 65 },  // Yellow
      { id: 'w4', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 10000, speed: 65 }, // Orange
      { id: 'w5', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 13000, speed: 65 }, // Pink
      { id: 'w6', size: 'M', color: '#FFD700', spawnNodeId: 's2', spawnTimeMs: 16000, speed: 65 }, // Yellow
      { id: 'w7', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 19000, speed: 65 }, // Blue
      { id: 'w8', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 22000, speed: 65 }, // Green
      { id: 'w9', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 25000, speed: 65 }, // Pink
      { id: 'w10', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 28000, speed: 65 }, // Orange
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 10 },
  },
  // LEVEL 11: Earthshaker — holes scattered at different heights
  {
    levelId: 11, metadata: { name: 'The Chandelier', rating: 5 },
    intro: { title: 'โคมระย้าหกสี', description: 'ความท้าทายระดับสูงสุด!\nเปิดตัวสีม่วงและทางแยกที่สมมาตรแสนสวยงาม', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700', '#9C27B0'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 400, y: -500 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 200, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 600, y: 200 },
      { id: 'j4', type: 'JUNCTION', x: 200, y: 500 },
      { id: 'j5', type: 'JUNCTION', x: 600, y: 500 },
      { id: 'hB', type: 'HOLE', x: 200, y: 50, color: '#5170ff', rotation: 180 },  // Blue
      { id: 'hG', type: 'HOLE', x: 600, y: 50, color: '#58CC02', rotation: 180 },  // Green
      { id: 'hP', type: 'HOLE', x: 50, y: 500, color: '#E91E63', rotation: 90 },   // Pink
      { id: 'hO', type: 'HOLE', x: 750, y: 500, color: '#ff914d', rotation: -90 }, // Orange
      { id: 'hY', type: 'HOLE', x: 200, y: 800, color: '#FFD700' },                // Yellow
      { id: 'hPu', type: 'HOLE', x: 600, y: 800, color: '#9C27B0' },               // Purple
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(400, -500), p(400, 200)], length: 700, widthClass: 'normal' },

      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 200), p(200, 200)], length: 200, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 200), p(600, 200)], length: 200, widthClass: 'normal' },

      { id: 'e4', from: 'j2', to: 'hB', path: [p(200, 200), p(200, 50)], length: 150, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j4', path: [p(200, 200), p(200, 500)], length: 300, widthClass: 'normal' },

      { id: 'e6', from: 'j3', to: 'hG', path: [p(600, 200), p(600, 50)], length: 150, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'j5', path: [p(600, 200), p(600, 500)], length: 300, widthClass: 'normal' },

      { id: 'e8', from: 'j4', to: 'hP', path: [p(200, 500), p(50, 500)], length: 150, widthClass: 'normal' },
      { id: 'e9', from: 'j4', to: 'hY', path: [p(200, 500), p(200, 800)], length: 300, widthClass: 'normal' },

      { id: 'e10', from: 'j5', to: 'hO', path: [p(600, 500), p(750, 500)], length: 150, widthClass: 'normal' },
      { id: 'e11', from: 'j5', to: 'hPu', path: [p(600, 500), p(600, 800)], length: 300, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e6', 'e7'], defaultIndex: 1 },
      { id: 'j4', outEdges: ['e8', 'e9'], defaultIndex: 1 },
      { id: 'j5', outEdges: ['e10', 'e11'], defaultIndex: 1 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 65 },  // Blue
      { id: 'w2', size: 'M', color: '#9C27B0', spawnNodeId: 's1', spawnTimeMs: 5000, speed: 65 },  // Purple
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 9000, speed: 65 },  // Green
      { id: 'w4', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 13000, speed: 65 }, // Yellow
      { id: 'w5', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 17000, speed: 65 }, // Pink
      { id: 'w6', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 21000, speed: 65 }, // Orange
      { id: 'w7', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 25000, speed: 65 }, // Green
      { id: 'w8', size: 'M', color: '#9C27B0', spawnNodeId: 's1', spawnTimeMs: 29000, speed: 65 }, // Purple
      { id: 'w9', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 33000, speed: 65 }, // Blue
      { id: 'w10', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 37000, speed: 65 },// Yellow
      { id: 'w11', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 41000, speed: 65 },// Orange
      { id: 'w12', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 45000, speed: 65 },// Pink
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 12 },
  },

  {
    levelId: 12, metadata: { name: 'Spider\'s Web', rating: 5 },
    intro: { title: 'เข้าสู่ศูนย์กลาง', description: 'ระวัง! แมงมุมจะพ่นใยปิดลูกศร\nจำทิศทางที่เล็งไว้ให้ดีนะ', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700', '#9C27B0'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 200, y: -500 },
      { id: 's2', type: 'SPAWN', x: 600, y: -500 },
      { id: 'j1', type: 'JUNCTION', x: 200, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 600, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 200, y: 500 },
      { id: 'j4', type: 'JUNCTION', x: 600, y: 500 },
      { id: 'j5', type: 'JUNCTION', x: 400, y: 500 },
      { id: 'hB', type: 'HOLE', x: 50, y: 200, color: '#5170ff', rotation: 90 },   // Blue
      { id: 'hG', type: 'HOLE', x: 750, y: 200, color: '#58CC02', rotation: -90 }, // Green
      { id: 'hP', type: 'HOLE', x: 50, y: 500, color: '#E91E63', rotation: 90 },   // Pink
      { id: 'hO', type: 'HOLE', x: 750, y: 500, color: '#ff914d', rotation: -90 }, // Orange
      { id: 'hY', type: 'HOLE', x: 400, y: 250, color: '#FFD700', rotation: 180 }, // Yellow (Faces Down)
      { id: 'hPu', type: 'HOLE', x: 400, y: 800, color: '#9C27B0' },               // Purple (Faces Up)
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(200, -500), p(200, 200)], length: 700, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(600, -500), p(600, 200)], length: 700, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'hB', path: [p(200, 200), p(50, 200)], length: 150, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j3', path: [p(200, 200), p(200, 500)], length: 300, widthClass: 'normal' },

      { id: 'e5', from: 'j2', to: 'hG', path: [p(600, 200), p(750, 200)], length: 150, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j4', path: [p(600, 200), p(600, 500)], length: 300, widthClass: 'normal' },

      { id: 'e7', from: 'j3', to: 'hP', path: [p(200, 500), p(50, 500)], length: 150, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'j5', path: [p(200, 500), p(400, 500)], length: 200, widthClass: 'normal' },

      { id: 'e9', from: 'j4', to: 'hO', path: [p(600, 500), p(750, 500)], length: 150, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'j5', path: [p(600, 500), p(400, 500)], length: 200, widthClass: 'normal' },

      { id: 'e11', from: 'j5', to: 'hY', path: [p(400, 500), p(400, 250)], length: 250, widthClass: 'normal' },
      { id: 'e12', from: 'j5', to: 'hPu', path: [p(400, 500), p(400, 800)], length: 300, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e7', 'e8'], defaultIndex: 1 },
      { id: 'j4', outEdges: ['e9', 'e10'], defaultIndex: 1 },
      { id: 'j5', outEdges: ['e11', 'e12'], defaultIndex: 1 },
    ],
    traps: [
      { id: 't1', type: 'SPIDER', nodeId: 'j1', nodePool: ['j1', 'j4'], intervalMs: 6500, activeDurationMs: 3000, initialDelayMs: 2000 },
      { id: 't2', type: 'SPIDER', nodeId: 'j5', nodePool: ['j2', 'j3', 'j5'], intervalMs: 5000, activeDurationMs: 2500, initialDelayMs: 4000 },
    ],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 65 },  // Blue
      { id: 'w2', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 4000, speed: 65 },  // Green
      { id: 'w3', size: 'M', color: '#9C27B0', spawnNodeId: 's1', spawnTimeMs: 7000, speed: 65 },  // Purple
      { id: 'w4', size: 'M', color: '#FFD700', spawnNodeId: 's2', spawnTimeMs: 10000, speed: 65 }, // Yellow
      { id: 'w5', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 13000, speed: 65 }, // Pink
      { id: 'w6', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 16000, speed: 65 }, // Orange
      { id: 'w7', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 19000, speed: 65 }, // Yellow
      { id: 'w8', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 22000, speed: 65 }, // Blue
      { id: 'w9', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 25000, speed: 65 }, // Orange
      { id: 'w10', size: 'M', color: '#9C27B0', spawnNodeId: 's2', spawnTimeMs: 28000, speed: 65 },// Purple
      { id: 'w11', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 31000, speed: 65 },// Green
      { id: 'w12', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 34000, speed: 65 },// Pink
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 12 },
  },

  // LEVEL 13: Quake Spiral — rectangular ring with exits at each side
  {
    levelId: 13, metadata: { name: 'Double Chaos', rating: 5 },
    intro: { title: 'ป่วนคูณสอง', description: 'ทั้งแผ่นดินไหวตรงกลาง และแมงมุมพ่นใยใส่ปีกซ้ายขวา!\nตั้งสติดีๆ นะ!', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700', '#9C27B0'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 200, y: -500 },
      { id: 's2', type: 'SPAWN', x: 600, y: -500 },
      { id: 'j1', type: 'JUNCTION', x: 200, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 600, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 400, y: 200 },
      { id: 'j4', type: 'JUNCTION', x: 400, y: 500 },
      { id: 'j5', type: 'JUNCTION', x: 200, y: 500 },
      { id: 'j6', type: 'JUNCTION', x: 600, y: 500 },
      { id: 'hB', type: 'HOLE', x: 50, y: 200, color: '#5170ff', rotation: 90 },   // Blue
      { id: 'hG', type: 'HOLE', x: 750, y: 200, color: '#58CC02', rotation: -90 }, // Green
      { id: 'hP', type: 'HOLE', x: 400, y: 50, color: '#E91E63', rotation: 180 },  // Pink
      { id: 'hO', type: 'HOLE', x: 50, y: 500, color: '#ff914d', rotation: 90 },   // Orange
      { id: 'hPu', type: 'HOLE', x: 750, y: 500, color: '#9C27B0', rotation: -90 },// Purple
      { id: 'hY', type: 'HOLE', x: 400, y: 800, color: '#FFD700' },                // Yellow
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(200, -500), p(200, 200)], length: 700, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(600, -500), p(600, 200)], length: 700, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'hB', path: [p(200, 200), p(50, 200)], length: 150, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j3', path: [p(200, 200), p(400, 200)], length: 200, widthClass: 'normal' },

      { id: 'e5', from: 'j2', to: 'hG', path: [p(600, 200), p(750, 200)], length: 150, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j3', path: [p(600, 200), p(400, 200)], length: 200, widthClass: 'normal' },

      { id: 'e7', from: 'j3', to: 'hP', path: [p(400, 200), p(400, 50)], length: 150, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'j4', path: [p(400, 200), p(400, 500)], length: 300, widthClass: 'normal' },

      { id: 'e9', from: 'j4', to: 'j5', path: [p(400, 500), p(200, 500)], length: 200, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'j6', path: [p(400, 500), p(600, 500)], length: 200, widthClass: 'normal' },

      { id: 'e11', from: 'j5', to: 'hO', path: [p(200, 500), p(50, 500)], length: 150, widthClass: 'normal' },
      { id: 'e12', from: 'j5', to: 'hY', path: [p(200, 500), p(200, 800), p(400, 800)], length: 500, widthClass: 'normal' },

      { id: 'e13', from: 'j6', to: 'hPu', path: [p(600, 500), p(750, 500)], length: 150, widthClass: 'normal' },
      { id: 'e14', from: 'j6', to: 'hY', path: [p(600, 500), p(600, 800), p(400, 800)], length: 500, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e7', 'e8'], defaultIndex: 1 },
      { id: 'j4', outEdges: ['e9', 'e10'], defaultIndex: 1 },
      { id: 'j5', outEdges: ['e11', 'e12'], defaultIndex: 1 },
      { id: 'j6', outEdges: ['e13', 'e14'], defaultIndex: 1 },
    ],
    traps: [
      { id: 't1', type: 'EARTHQUAKE', nodeId: 'j3', intervalMs: 6500, initialDelayMs: 5000 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j4', intervalMs: 5500, initialDelayMs: 6000 },
      { id: 't3', type: 'SPIDER', nodeId: 'j1', nodePool: ['j1', 'j2'], intervalMs: 7000, activeDurationMs: 3000, initialDelayMs: 2000 },
      { id: 't4', type: 'SPIDER', nodeId: 'j5', nodePool: ['j5', 'j6'], intervalMs: 6000, activeDurationMs: 2500, initialDelayMs: 4000 },
    ],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 65 },  // Blue
      { id: 'w2', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 4000, speed: 65 },  // Green
      { id: 'w3', size: 'M', color: '#9C27B0', spawnNodeId: 's1', spawnTimeMs: 7000, speed: 65 },  // Purple
      { id: 'w4', size: 'M', color: '#FFD700', spawnNodeId: 's2', spawnTimeMs: 10000, speed: 65 }, // Yellow
      { id: 'w5', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 13000, speed: 65 }, // Pink
      { id: 'w6', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 16000, speed: 65 }, // Orange
      { id: 'w7', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 19000, speed: 65 }, // Yellow
      { id: 'w8', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 22000, speed: 65 }, // Blue
      { id: 'w9', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 25000, speed: 65 }, // Orange
      { id: 'w10', size: 'M', color: '#9C27B0', spawnNodeId: 's2', spawnTimeMs: 28000, speed: 65 },// Purple
      { id: 'w11', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 31000, speed: 65 },// Green
      { id: 'w12', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 34000, speed: 65 },// Pink
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 12 },
  },

  // LEVEL 14: Panic Router — 6 colors, holes at various positions
  {
    levelId: 14, metadata: { name: 'Speedway Chaos', rating: 5 },
    intro: { title: 'นรกแตกของจริง', description: 'ทุกอย่างเหมือนด่านที่แล้วเป๊ะ\nแต่รถไฟวิ่งความเร็วสูงสุด 85!\nสับรางให้ทันล่ะ!', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700', '#9C27B0'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 200, y: -500 },
      { id: 's2', type: 'SPAWN', x: 600, y: -500 },
      { id: 'j1', type: 'JUNCTION', x: 200, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 600, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 400, y: 200 },
      { id: 'j4', type: 'JUNCTION', x: 400, y: 500 },
      { id: 'j5', type: 'JUNCTION', x: 200, y: 500 },
      { id: 'j6', type: 'JUNCTION', x: 600, y: 500 },
      { id: 'hB', type: 'HOLE', x: 50, y: 200, color: '#5170ff', rotation: 90 },   // Blue
      { id: 'hG', type: 'HOLE', x: 750, y: 200, color: '#58CC02', rotation: -90 }, // Green
      { id: 'hP', type: 'HOLE', x: 400, y: 50, color: '#E91E63', rotation: 180 },  // Pink
      { id: 'hO', type: 'HOLE', x: 50, y: 500, color: '#ff914d', rotation: 90 },   // Orange
      { id: 'hPu', type: 'HOLE', x: 750, y: 500, color: '#9C27B0', rotation: -90 },// Purple
      { id: 'hY', type: 'HOLE', x: 400, y: 800, color: '#FFD700' },                // Yellow
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(200, -500), p(200, 200)], length: 700, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(600, -500), p(600, 200)], length: 700, widthClass: 'normal' },

      { id: 'e3', from: 'j1', to: 'hB', path: [p(200, 200), p(50, 200)], length: 150, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j3', path: [p(200, 200), p(400, 200)], length: 200, widthClass: 'normal' },

      { id: 'e5', from: 'j2', to: 'hG', path: [p(600, 200), p(750, 200)], length: 150, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j3', path: [p(600, 200), p(400, 200)], length: 200, widthClass: 'normal' },

      { id: 'e7', from: 'j3', to: 'hP', path: [p(400, 200), p(400, 50)], length: 150, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'j4', path: [p(400, 200), p(400, 500)], length: 300, widthClass: 'normal' },

      { id: 'e9', from: 'j4', to: 'j5', path: [p(400, 500), p(200, 500)], length: 200, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'j6', path: [p(400, 500), p(600, 500)], length: 200, widthClass: 'normal' },

      { id: 'e11', from: 'j5', to: 'hO', path: [p(200, 500), p(50, 500)], length: 150, widthClass: 'normal' },
      { id: 'e12', from: 'j5', to: 'hY', path: [p(200, 500), p(200, 800), p(400, 800)], length: 500, widthClass: 'normal' },

      { id: 'e13', from: 'j6', to: 'hPu', path: [p(600, 500), p(750, 500)], length: 150, widthClass: 'normal' },
      { id: 'e14', from: 'j6', to: 'hY', path: [p(600, 500), p(600, 800), p(400, 800)], length: 500, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e7', 'e8'], defaultIndex: 1 },
      { id: 'j4', outEdges: ['e9', 'e10'], defaultIndex: 1 },
      { id: 'j5', outEdges: ['e11', 'e12'], defaultIndex: 1 },
      { id: 'j6', outEdges: ['e13', 'e14'], defaultIndex: 1 },
    ],
    traps: [
      { id: 't1', type: 'EARTHQUAKE', nodeId: 'j3', intervalMs: 6500, initialDelayMs: 5000 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j4', intervalMs: 5500, initialDelayMs: 6000 },
      { id: 't3', type: 'SPIDER', nodeId: 'j1', nodePool: ['j1', 'j2'], intervalMs: 7000, activeDurationMs: 3000, initialDelayMs: 2000 },
      { id: 't4', type: 'SPIDER', nodeId: 'j5', nodePool: ['j5', 'j6'], intervalMs: 6000, activeDurationMs: 2500, initialDelayMs: 4000 },
    ],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 85 },  // Blue
      { id: 'w2', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 3500, speed: 85 },  // Green
      { id: 'w3', size: 'M', color: '#9C27B0', spawnNodeId: 's1', spawnTimeMs: 6000, speed: 85 },  // Purple
      { id: 'w4', size: 'M', color: '#FFD700', spawnNodeId: 's2', spawnTimeMs: 8500, speed: 85 }, // Yellow
      { id: 'w5', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 11000, speed: 85 }, // Pink
      { id: 'w6', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 13500, speed: 85 }, // Orange
      { id: 'w7', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 16000, speed: 85 }, // Yellow
      { id: 'w8', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 18500, speed: 85 }, // Blue
      { id: 'w9', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 21000, speed: 85 }, // Orange
      { id: 'w10', size: 'M', color: '#9C27B0', spawnNodeId: 's2', spawnTimeMs: 23500, speed: 85 },// Purple
      { id: 'w11', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 26000, speed: 85 },// Green
      { id: 'w12', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 28500, speed: 85 },// Pink
      { id: 'w13', size: 'M', color: '#9C27B0', spawnNodeId: 's1', spawnTimeMs: 31000, speed: 85 },// Purple
      { id: 'w14', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 33500, speed: 85 },// Blue
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 14 },
  },

  // LEVEL 15: The Finale — 6 colors, 8 worms, max chaos
  {
    levelId: 15, metadata: { name: 'Railway Network', rating: 5 },
    intro: { title: 'ชุมทางสับรางวิบาก', description: 'นี่แหละรถไฟใต้ดินของแท้!\nรางไขว้มั่วซั่ว ไม่มีความสมมาตรให้จับทาง\nฝ่าไปให้ได้ล่ะ Train Conductor!', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700', '#9C27B0'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 600, y: -400 },
      { id: 's2', type: 'SPAWN', x: 400, y: -400 },
      { id: 'j1', type: 'JUNCTION', x: 250, y: 150 },
      { id: 'j2', type: 'JUNCTION', x: 400, y: 50 },
      { id: 'j3', type: 'JUNCTION', x: 600, y: 150 },
      { id: 'j4', type: 'JUNCTION', x: 250, y: 350 },
      { id: 'j5', type: 'JUNCTION', x: 600, y: 350 },
      { id: 'j6', type: 'JUNCTION', x: 400, y: 500 },
      { id: 'hB', type: 'HOLE', x: 50, y: 150, color: '#5170ff', rotation: 90 },   // Blue
      { id: 'hG', type: 'HOLE', x: 750, y: 150, color: '#58CC02', rotation: -90 }, // Green
      { id: 'hP', type: 'HOLE', x: 50, y: 350, color: '#E91E63', rotation: 90 },   // Pink
      { id: 'hO', type: 'HOLE', x: 750, y: 350, color: '#ff914d', rotation: -90 }, // Orange
      { id: 'hY', type: 'HOLE', x: 50, y: 650, color: '#FFD700', rotation: 90 },   // Yellow
      { id: 'hPu', type: 'HOLE', x: 550, y: 750, color: '#9C27B0', rotation: 0 },  // Purple
    ],
    edges: [
      { id: 'e1', from: 's2', to: 'j2', path: [p(400, -400), p(400, 50)], length: 450, widthClass: 'normal' },
      { id: 'e2', from: 'j2', to: 'j1', path: [p(400, 50), p(250, 50), p(250, 150)], length: 250, widthClass: 'normal' },
      { id: 'e3', from: 'j2', to: 'j3', path: [p(400, 50), p(600, 50), p(600, 150)], length: 300, widthClass: 'normal' },
      { id: 'e4', from: 's1', to: 'j3', path: [p(600, -400), p(600, 150)], length: 550, widthClass: 'normal' },

      { id: 'e5', from: 'j1', to: 'hB', path: [p(250, 150), p(50, 150)], length: 200, widthClass: 'normal' },
      { id: 'e6', from: 'j1', to: 'j4', path: [p(250, 150), p(250, 350)], length: 200, widthClass: 'normal' },

      { id: 'e7', from: 'j3', to: 'hG', path: [p(600, 150), p(750, 150)], length: 150, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'j5', path: [p(600, 150), p(600, 350)], length: 200, widthClass: 'normal' },

      { id: 'e9', from: 'j4', to: 'hP', path: [p(250, 350), p(50, 350)], length: 200, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'j6', path: [p(250, 350), p(400, 350), p(400, 500)], length: 300, widthClass: 'normal' },

      { id: 'e11', from: 'j5', to: 'hO', path: [p(600, 350), p(750, 350)], length: 150, widthClass: 'normal' },
      { id: 'e12', from: 'j5', to: 'j6', path: [p(600, 350), p(400, 350), p(400, 500)], length: 350, widthClass: 'normal' },

      { id: 'e13', from: 'j6', to: 'hY', path: [p(400, 500), p(250, 500), p(250, 650), p(50, 650)], length: 500, widthClass: 'normal' },
      { id: 'e14', from: 'j6', to: 'hPu', path: [p(400, 500), p(550, 500), p(550, 750)], length: 400, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e7', 'e8'], defaultIndex: 1 },
      { id: 'j4', outEdges: ['e9', 'e10'], defaultIndex: 1 },
      { id: 'j5', outEdges: ['e11', 'e12'], defaultIndex: 1 },
      { id: 'j6', outEdges: ['e13', 'e14'], defaultIndex: 0 },
    ],
    traps: [
      { id: 't1', type: 'EARTHQUAKE', nodeId: 'j6', intervalMs: 6500, initialDelayMs: 4000 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j1', intervalMs: 5000, initialDelayMs: 2500 },
      { id: 't3', type: 'EARTHQUAKE', nodeId: 'j5', intervalMs: 5000, initialDelayMs: 4500 },
      { id: 't4', type: 'SPIDER', nodeId: 'j4', nodePool: ['j4', 'j1', 'j2'], intervalMs: 7000, activeDurationMs: 3000, initialDelayMs: 2000 },
      { id: 't5', type: 'SPIDER', nodeId: 'j2', nodePool: ['j2', 'j3', 'j5'], intervalMs: 6500, activeDurationMs: 2500, initialDelayMs: 5000 },
    ],
    worms: [
      { id: 'w1', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 60 },  // Green
      { id: 'w2', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 4000, speed: 60 },  // Blue
      { id: 'w3', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 7000, speed: 60 },  // Orange
      { id: 'w4', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 10000, speed: 60 }, // Pink
      { id: 'w5', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 13000, speed: 60 }, // Yellow
      { id: 'w6', size: 'M', color: '#9C27B0', spawnNodeId: 's2', spawnTimeMs: 16000, speed: 60 }, // Purple
      { id: 'w7', size: 'M', color: '#9C27B0', spawnNodeId: 's1', spawnTimeMs: 19000, speed: 60 }, // Purple
      { id: 'w8', size: 'M', color: '#FFD700', spawnNodeId: 's2', spawnTimeMs: 22000, speed: 60 }, // Yellow
      { id: 'w9', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 25000, speed: 60 }, // Orange
      { id: 'w10', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 28000, speed: 60 },// Pink
      { id: 'w11', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 31000, speed: 60 },// Green
      { id: 'w12', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 34000, speed: 60 },// Blue
      { id: 'w13', size: 'M', color: '#FFD700', spawnNodeId: 's1', spawnTimeMs: 37000, speed: 60 },// Yellow
      { id: 'w14', size: 'M', color: '#9C27B0', spawnNodeId: 's2', spawnTimeMs: 40000, speed: 60 },// Purple
      { id: 'w15', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 43000, speed: 60 },// Green
      { id: 'w16', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 46000, speed: 60 },// Blue
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 16 },
  },
];

export default LEVELS;
