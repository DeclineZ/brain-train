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

  // LEVEL 5: Roundabout — holes at left-bottom, top-right, center
  {
    levelId: 5, metadata: { name: 'Roundabout', rating: 2 },
    colors: ['#5170ff', '#58CC02', '#ff914d'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: -150 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 100, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 700, y: 200 },
      { id: 'hB', type: 'HOLE', x: 100, y: 500, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 400, y: 400, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 700, y: 50, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -150), p(400, 200)], length: 350, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 200), p(100, 200)], length: 300, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 200), p(700, 200)], length: 300, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'hB', path: [p(100, 200), p(100, 500)], length: 300, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hG', path: [p(100, 200), p(100, 400), p(400, 400)], length: 500, widthClass: 'normal' },
      { id: 'e6', from: 'j3', to: 'hO', path: [p(700, 200), p(700, 50)], length: 150, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'hG', path: [p(700, 200), p(700, 400), p(400, 400)], length: 500, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e6', 'e7'], defaultIndex: 1 },
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
  // LEVEL 6: Crossroad — 2 spawns, holes scattered: left-side, center, right-side
  {
    levelId: 6, metadata: { name: 'Crossroad', rating: 3 },
    intro: { title: 'ทางแยกวัดใจ', description: 'บางครั้งต้องอ้อมไปตรงกลางเพื่อเปลี่ยนเลน\nลองดูเส้นทางให้ดีๆ นะ', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 150, y: -100 },
      { id: 's2', type: 'SPAWN', x: 650, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 150, y: 300 },
      { id: 'j2', type: 'JUNCTION', x: 650, y: 300 },
      { id: 'j3', type: 'JUNCTION', x: 400, y: 300 },
      { id: 'hB', type: 'HOLE', x: 150, y: 600, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 400, y: 600, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 650, y: 600, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(150, -100), p(150, 300)], length: 400, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(650, -100), p(650, 300)], length: 400, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hB', path: [p(150, 300), p(150, 600)], length: 300, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j3', path: [p(150, 300), p(400, 300)], length: 250, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hO', path: [p(650, 300), p(650, 600)], length: 300, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j3', path: [p(650, 300), p(400, 300)], length: 250, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'hG', path: [p(400, 300), p(400, 600)], length: 300, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'hB', path: [p(400, 300), p(150, 300), p(150, 600)], length: 550, widthClass: 'normal' },
      { id: 'e9', from: 'j3', to: 'hO', path: [p(400, 300), p(650, 300), p(650, 600)], length: 550, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e7', 'e8', 'e9'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 65 },
      { id: 'w2', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 7000, speed: 65 },
      { id: 'w3', size: 'M', color: '#ff914d', spawnNodeId: 's1', spawnTimeMs: 13000, speed: 65 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 's2', spawnTimeMs: 19000, speed: 65 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 25000, speed: 65 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 },
  },

  // LEVEL 7: Four Colors — holes scattered in 4 directions
  {
    levelId: 7, metadata: { name: 'Four Colors', rating: 3 },
    intro: { title: 'สี่สีพี่น้อง', description: 'เพิ่มความยากเป็น 4 สี!\nต้องตาไวและมือเร็วขึ้นนะ', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 250, y: -100 },
      { id: 's2', type: 'SPAWN', x: 550, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 250, y: 300 },
      { id: 'j2', type: 'JUNCTION', x: 550, y: 300 },
      { id: 'j3', type: 'JUNCTION', x: 250, y: 550 },
      { id: 'j4', type: 'JUNCTION', x: 550, y: 550 },
      { id: 'hB', type: 'HOLE', x: 100, y: 300, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 250, y: 750, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 550, y: 750, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 700, y: 300, color: '#E91E63' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(250, -100), p(250, 300)], length: 400, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(550, -100), p(550, 300)], length: 400, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hB', path: [p(250, 300), p(100, 300)], length: 150, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j3', path: [p(250, 300), p(250, 550)], length: 250, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hP', path: [p(550, 300), p(700, 300)], length: 150, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j4', path: [p(550, 300), p(550, 550)], length: 250, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'hG', path: [p(250, 550), p(250, 750)], length: 200, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'j4', path: [p(250, 550), p(550, 550)], length: 300, widthClass: 'normal' },
      { id: 'e9', from: 'j4', to: 'hO', path: [p(550, 550), p(550, 750)], length: 200, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'j3', path: [p(550, 550), p(250, 550)], length: 300, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e7', 'e8'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e9', 'e10'], defaultIndex: 0 },
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

  // LEVEL 8: Circuit Board — grid with scattered holes
  {
    levelId: 8, metadata: { name: 'Circuit Board', rating: 3 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 100, y: -50 },
      { id: 'j1', type: 'JUNCTION', x: 100, y: 250 },
      { id: 'j2', type: 'JUNCTION', x: 400, y: 250 },
      { id: 'j3', type: 'JUNCTION', x: 700, y: 250 },
      { id: 'j4', type: 'JUNCTION', x: 400, y: 500 },
      { id: 'hP', type: 'HOLE', x: 100, y: 550, color: '#E91E63' },
      { id: 'hB', type: 'HOLE', x: 700, y: 550, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 250, y: 500, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 550, y: 500, color: '#ff914d' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(100, -50), p(100, 250)], length: 300, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'hP', path: [p(100, 250), p(100, 550)], length: 300, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j2', path: [p(100, 250), p(400, 250)], length: 300, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'j4', path: [p(400, 250), p(400, 500)], length: 250, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j3', path: [p(400, 250), p(700, 250)], length: 300, widthClass: 'normal' },
      { id: 'e6', from: 'j3', to: 'hB', path: [p(700, 250), p(700, 550)], length: 300, widthClass: 'normal' },
      { id: 'e7', from: 'j4', to: 'hG', path: [p(400, 500), p(250, 500)], length: 150, widthClass: 'normal' },
      { id: 'e8', from: 'j4', to: 'hO', path: [p(400, 500), p(550, 500)], length: 150, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 1 },
      { id: 'j3', outEdges: ['e6'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e7', 'e8'], defaultIndex: 0 },
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

  // LEVEL 9: Double Loops — holes at corners and sides
  {
    levelId: 9, metadata: { name: 'Double Loops', rating: 4 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 100, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 700, y: 200 },
      { id: 'j4', type: 'JUNCTION', x: 400, y: 450 },
      { id: 'hB', type: 'HOLE', x: 100, y: 450, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 250, y: 650, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 550, y: 650, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 700, y: 450, color: '#E91E63' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -100), p(400, 200)], length: 300, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 200), p(100, 200)], length: 300, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 200), p(700, 200)], length: 300, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'hB', path: [p(100, 200), p(100, 450)], length: 250, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j4', path: [p(100, 200), p(100, 450), p(400, 450)], length: 550, widthClass: 'normal' },
      { id: 'e6', from: 'j3', to: 'hP', path: [p(700, 200), p(700, 450)], length: 250, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'j4', path: [p(700, 200), p(700, 450), p(400, 450)], length: 550, widthClass: 'normal' },
      { id: 'e8', from: 'j4', to: 'hG', path: [p(400, 450), p(250, 450), p(250, 650)], length: 350, widthClass: 'normal' },
      { id: 'e9', from: 'j4', to: 'hO', path: [p(400, 450), p(550, 450), p(550, 650)], length: 350, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e6', 'e7'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e8', 'e9'], defaultIndex: 0 },
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

  // LEVEL 10: Freeway — fast worms, holes at 4 corners
  {
    levelId: 10, metadata: { name: 'Freeway', rating: 4 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 150, y: -100 },
      { id: 's2', type: 'SPAWN', x: 650, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 150, y: 300 },
      { id: 'j2', type: 'JUNCTION', x: 650, y: 300 },
      { id: 'j3', type: 'JUNCTION', x: 400, y: 300 },
      { id: 'hB', type: 'HOLE', x: 150, y: 550, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 400, y: 100, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 400, y: 550, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 650, y: 550, color: '#E91E63' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(150, -100), p(150, 300)], length: 400, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j2', path: [p(650, -100), p(650, 300)], length: 400, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hB', path: [p(150, 300), p(150, 550)], length: 250, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j3', path: [p(150, 300), p(400, 300)], length: 250, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'hP', path: [p(650, 300), p(650, 550)], length: 250, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j3', path: [p(650, 300), p(400, 300)], length: 250, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'hG', path: [p(400, 300), p(400, 100)], length: 200, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'hO', path: [p(400, 300), p(400, 550)], length: 250, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e7', 'e8'], defaultIndex: 0 },
    ],
    traps: [],
    worms: [
      { id: 'w1', size: 'M', color: '#5170ff', spawnNodeId: 's1', spawnTimeMs: 1000, speed: 75 },
      { id: 'w2', size: 'M', color: '#E91E63', spawnNodeId: 's2', spawnTimeMs: 6000, speed: 75 },
      { id: 'w3', size: 'M', color: '#58CC02', spawnNodeId: 's1', spawnTimeMs: 11000, speed: 75 },
      { id: 'w4', size: 'M', color: '#ff914d', spawnNodeId: 's2', spawnTimeMs: 16000, speed: 75 },
      { id: 'w5', size: 'M', color: '#5170ff', spawnNodeId: 's2', spawnTimeMs: 21000, speed: 75 },
      { id: 'w6', size: 'M', color: '#E91E63', spawnNodeId: 's1', spawnTimeMs: 26000, speed: 75 },
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },
  // LEVEL 11: Earthshaker — holes scattered at different heights
  {
    levelId: 11, metadata: { name: 'Earthshaker', rating: 5 },
    intro: { title: 'ระวังแผ่นดินไหว!', description: 'เมื่อแผ่นดินไหว ทางแยกจะเปลี่ยนทิศทางเอง!\nรีบกดเพื่อแก้ไขเส้นทางนะ', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 100, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 700, y: 200 },
      { id: 'j4', type: 'JUNCTION', x: 100, y: 450 },
      { id: 'j5', type: 'JUNCTION', x: 700, y: 450 },
      { id: 'hBS', type: 'HOLE', x: 100, y: 50, color: '#5170ff', size: 'S' },
      { id: 'hP', type: 'HOLE', x: 100, y: 650, color: '#E91E63' },
      { id: 'hG', type: 'HOLE', x: 400, y: 450, color: '#58CC02' },
      { id: 'hO', type: 'HOLE', x: 700, y: 650, color: '#ff914d' },
      { id: 'hY', type: 'HOLE', x: 700, y: 50, color: '#FFD700' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -100), p(400, 200)], length: 300, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 200), p(100, 200)], length: 300, widthClass: 'narrow' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(400, 200), p(700, 200)], length: 300, widthClass: 'normal' },
      { id: 'e4', from: 'j2', to: 'hBS', path: [p(100, 200), p(100, 50)], length: 150, widthClass: 'narrow' },
      { id: 'e5', from: 'j2', to: 'j4', path: [p(100, 200), p(100, 450)], length: 250, widthClass: 'normal' },
      { id: 'e6', from: 'j3', to: 'hY', path: [p(700, 200), p(700, 50)], length: 150, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'j5', path: [p(700, 200), p(700, 450)], length: 250, widthClass: 'normal' },
      { id: 'e8', from: 'j4', to: 'hP', path: [p(100, 450), p(100, 650)], length: 200, widthClass: 'normal' },
      { id: 'e9', from: 'j4', to: 'hG', path: [p(100, 450), p(400, 450)], length: 300, widthClass: 'normal' },
      { id: 'e10', from: 'j5', to: 'hO', path: [p(700, 450), p(700, 650)], length: 200, widthClass: 'normal' },
      { id: 'e11', from: 'j5', to: 'hG', path: [p(700, 450), p(400, 450)], length: 300, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e2', 'e3'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e4', 'e5'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e6', 'e7'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e8', 'e9'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e10', 'e11'], defaultIndex: 0 },
    ],
    traps: [
      { id: 't1', type: 'EARTHQUAKE', nodeId: 'j4', intervalMs: 5000, initialDelayMs: 4000 },
      { id: 't2', type: 'EARTHQUAKE', nodeId: 'j5', intervalMs: 3800, initialDelayMs: 2800 },
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

  // LEVEL 12: Spider's Nest — holes scattered across grid
  {
    levelId: 12, metadata: { name: 'Spider\'s Nest', rating: 5 },
    intro: { title: 'เจ้าแมงมุมจอมป่วน', description: 'ระวัง! แมงมุมจะพ่นใยปิดบังเส้นทาง\nต้องจำทางไว้ให้ดีนะ', imageKey: 'spawn' },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 'sL', type: 'SPAWN', x: 200, y: -100 },
      { id: 'sR', type: 'SPAWN', x: 600, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 200, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 400, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 600, y: 200 },
      { id: 'j4', type: 'JUNCTION', x: 200, y: 500 },
      { id: 'j5', type: 'JUNCTION', x: 600, y: 500 },
      { id: 'hBS', type: 'HOLE', x: 100, y: 200, color: '#5170ff', size: 'S' },
      { id: 'hG', type: 'HOLE', x: 200, y: 700, color: '#58CC02' },
      { id: 'hY', type: 'HOLE', x: 400, y: 500, color: '#FFD700' },
      { id: 'hO', type: 'HOLE', x: 600, y: 700, color: '#ff914d' },
      { id: 'hPS', type: 'HOLE', x: 700, y: 200, color: '#E91E63', size: 'S' },
    ],
    edges: [
      { id: 'e1', from: 'sL', to: 'j1', path: [p(200, -100), p(200, 200)], length: 300, widthClass: 'normal' },
      { id: 'e2', from: 'sR', to: 'j3', path: [p(600, -100), p(600, 200)], length: 300, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hBS', path: [p(200, 200), p(100, 200)], length: 100, widthClass: 'narrow' },
      { id: 'e4', from: 'j1', to: 'j2', path: [p(200, 200), p(400, 200)], length: 200, widthClass: 'normal' },
      { id: 'e5', from: 'j3', to: 'hPS', path: [p(600, 200), p(700, 200)], length: 100, widthClass: 'narrow' },
      { id: 'e6', from: 'j3', to: 'j2', path: [p(600, 200), p(400, 200)], length: 200, widthClass: 'normal' },
      { id: 'e7', from: 'j2', to: 'j4', path: [p(400, 200), p(200, 200), p(200, 500)], length: 500, widthClass: 'normal' },
      { id: 'e8', from: 'j2', to: 'j5', path: [p(400, 200), p(600, 200), p(600, 500)], length: 500, widthClass: 'normal' },
      { id: 'e9', from: 'j2', to: 'hY', path: [p(400, 200), p(400, 500)], length: 300, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hG', path: [p(200, 500), p(200, 700)], length: 200, widthClass: 'normal' },
      { id: 'e11', from: 'j4', to: 'hY', path: [p(200, 500), p(400, 500)], length: 200, widthClass: 'normal' },
      { id: 'e12', from: 'j5', to: 'hO', path: [p(600, 500), p(600, 700)], length: 200, widthClass: 'normal' },
      { id: 'e13', from: 'j5', to: 'hY', path: [p(600, 500), p(400, 500)], length: 200, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e7', 'e8', 'e9'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j4', outEdges: ['e10', 'e11'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e12', 'e13'], defaultIndex: 0 },
    ],
    traps: [
      { id: 't1', type: 'SPIDER', nodeId: 'j4', nodePool: ['j4', 'j2'], intervalMs: 8000, activeDurationMs: 2500, initialDelayMs: 3500 },
      { id: 't2', type: 'SPIDER', nodeId: 'j5', nodePool: ['j5', 'j4'], intervalMs: 8000, activeDurationMs: 2500, initialDelayMs: 6000 },
    ],
    worms: [
      { id: 'w1', size: 'M', color: '#FFD700', spawnNodeId: 'sL', spawnTimeMs: 1000, speed: 50 },
      { id: 'w2', size: 'S', color: '#5170ff', spawnNodeId: 'sR', spawnTimeMs: 7000, speed: 50 },
      { id: 'w3', size: 'S', color: '#E91E63', spawnNodeId: 'sL', spawnTimeMs: 13000, speed: 50 },
      { id: 'w4', size: 'M', color: '#58CC02', spawnNodeId: 'sR', spawnTimeMs: 19000, speed: 50 },
      { id: 'w5', size: 'M', color: '#ff914d', spawnNodeId: 'sR', spawnTimeMs: 25000, speed: 50 },
      { id: 'w6', size: 'M', color: '#58CC02', spawnNodeId: 'sL', spawnTimeMs: 31000, speed: 50 },
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 },
  },

  // LEVEL 13: Quake Spiral — rectangular ring with exits at each side
  {
    levelId: 13, metadata: { name: 'Quake Spiral', rating: 5 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700'],
    nodes: [
      { id: 's', type: 'SPAWN', x: 400, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 400, y: 150 },
      { id: 'j2', type: 'JUNCTION', x: 700, y: 150 },
      { id: 'j3', type: 'JUNCTION', x: 700, y: 500 },
      { id: 'j4', type: 'JUNCTION', x: 400, y: 500 },
      { id: 'j5', type: 'JUNCTION', x: 100, y: 500 },
      { id: 'j6', type: 'JUNCTION', x: 100, y: 150 },
      { id: 'hB', type: 'HOLE', x: 100, y: 700, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 250, y: 700, color: '#58CC02' },
      { id: 'hY', type: 'HOLE', x: 400, y: 700, color: '#FFD700' },
      { id: 'hO', type: 'HOLE', x: 550, y: 700, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 700, y: 700, color: '#E91E63' },
    ],
    edges: [
      { id: 'e1', from: 's', to: 'j1', path: [p(400, -100), p(400, 150)], length: 250, widthClass: 'normal' },
      { id: 'e2', from: 'j1', to: 'j2', path: [p(400, 150), p(700, 150)], length: 300, widthClass: 'normal' },
      { id: 'e3', from: 'j2', to: 'j3', path: [p(700, 150), p(700, 500)], length: 350, widthClass: 'normal' },
      { id: 'e4', from: 'j3', to: 'j4', path: [p(700, 500), p(400, 500)], length: 300, widthClass: 'normal' },
      { id: 'e5', from: 'j4', to: 'j5', path: [p(400, 500), p(100, 500)], length: 300, widthClass: 'normal' },
      { id: 'e6', from: 'j5', to: 'j6', path: [p(100, 500), p(100, 150)], length: 350, widthClass: 'normal' },
      { id: 'e7', from: 'j6', to: 'j1', path: [p(100, 150), p(400, 150)], length: 300, widthClass: 'normal' },
      { id: 'e8', from: 'j6', to: 'hB', path: [p(100, 150), p(100, 700)], length: 550, widthClass: 'normal' },
      { id: 'e9', from: 'j5', to: 'hG', path: [p(100, 500), p(250, 500), p(250, 700)], length: 350, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hY', path: [p(400, 500), p(400, 700)], length: 200, widthClass: 'normal' },
      { id: 'e11', from: 'j3', to: 'hO', path: [p(700, 500), p(550, 500), p(550, 700)], length: 350, widthClass: 'normal' },
      { id: 'e12', from: 'j2', to: 'hP', path: [p(700, 150), p(700, 700)], length: 550, widthClass: 'normal' },
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

  // LEVEL 14: Panic Router — 6 colors, holes at various positions
  {
    levelId: 14, metadata: { name: 'Panic Router', rating: 5 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700', '#9C27B0'],
    nodes: [
      { id: 'sL', type: 'SPAWN', x: 200, y: -100 },
      { id: 'sR', type: 'SPAWN', x: 600, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 200, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 600, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 400, y: 200 },
      { id: 'j4', type: 'JUNCTION', x: 200, y: 500 },
      { id: 'j5', type: 'JUNCTION', x: 600, y: 500 },
      { id: 'hB', type: 'HOLE', x: 100, y: 500, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 200, y: 700, color: '#58CC02' },
      { id: 'hY', type: 'HOLE', x: 400, y: 500, color: '#FFD700' },
      { id: 'hO', type: 'HOLE', x: 400, y: 700, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 600, y: 700, color: '#E91E63' },
      { id: 'hV', type: 'HOLE', x: 700, y: 500, color: '#9C27B0' },
    ],
    edges: [
      { id: 'e1', from: 'sL', to: 'j1', path: [p(200, -100), p(200, 200)], length: 300, widthClass: 'normal' },
      { id: 'e2', from: 'sR', to: 'j2', path: [p(600, -100), p(600, 200)], length: 300, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'j3', path: [p(200, 200), p(400, 200)], length: 200, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j4', path: [p(200, 200), p(200, 500)], length: 300, widthClass: 'normal' },
      { id: 'e5', from: 'j2', to: 'j3', path: [p(600, 200), p(400, 200)], length: 200, widthClass: 'normal' },
      { id: 'e6', from: 'j2', to: 'j5', path: [p(600, 200), p(600, 500)], length: 300, widthClass: 'normal' },
      { id: 'e7', from: 'j3', to: 'hY', path: [p(400, 200), p(400, 500)], length: 300, widthClass: 'normal' },
      { id: 'e8', from: 'j3', to: 'hO', path: [p(400, 200), p(400, 700)], length: 500, widthClass: 'normal' },
      { id: 'e9', from: 'j4', to: 'hB', path: [p(200, 500), p(100, 500)], length: 100, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hG', path: [p(200, 500), p(200, 700)], length: 200, widthClass: 'normal' },
      { id: 'e11', from: 'j5', to: 'hV', path: [p(600, 500), p(700, 500)], length: 100, widthClass: 'normal' },
      { id: 'e12', from: 'j5', to: 'hP', path: [p(600, 500), p(600, 700)], length: 200, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 0 },
      { id: 'j2', outEdges: ['e5', 'e6'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e7', 'e8'], defaultIndex: 0 },
      { id: 'j4', outEdges: ['e9', 'e10'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e11', 'e12'], defaultIndex: 0 },
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

  // LEVEL 15: The Finale — 6 colors, 8 worms, max chaos
  {
    levelId: 15, metadata: { name: 'The Finale', rating: 5 },
    colors: ['#5170ff', '#58CC02', '#ff914d', '#E91E63', '#FFD700', '#9C27B0'],
    nodes: [
      { id: 's1', type: 'SPAWN', x: 200, y: -100 },
      { id: 's2', type: 'SPAWN', x: 600, y: -100 },
      { id: 'j1', type: 'JUNCTION', x: 200, y: 200 },
      { id: 'j2', type: 'JUNCTION', x: 400, y: 200 },
      { id: 'j3', type: 'JUNCTION', x: 600, y: 200 },
      { id: 'j4', type: 'JUNCTION', x: 200, y: 500 },
      { id: 'j5', type: 'JUNCTION', x: 400, y: 500 },
      { id: 'j6', type: 'JUNCTION', x: 600, y: 500 },
      { id: 'hB', type: 'HOLE', x: 100, y: 200, color: '#5170ff' },
      { id: 'hG', type: 'HOLE', x: 200, y: 700, color: '#58CC02' },
      { id: 'hY', type: 'HOLE', x: 400, y: 700, color: '#FFD700' },
      { id: 'hO', type: 'HOLE', x: 100, y: 500, color: '#ff914d' },
      { id: 'hP', type: 'HOLE', x: 600, y: 700, color: '#E91E63' },
      { id: 'hV', type: 'HOLE', x: 700, y: 200, color: '#9C27B0' },
    ],
    edges: [
      { id: 'e1', from: 's1', to: 'j1', path: [p(200, -100), p(200, 200)], length: 300, widthClass: 'normal' },
      { id: 'e2', from: 's2', to: 'j3', path: [p(600, -100), p(600, 200)], length: 300, widthClass: 'normal' },
      { id: 'e3', from: 'j1', to: 'hB', path: [p(200, 200), p(100, 200)], length: 100, widthClass: 'normal' },
      { id: 'e4', from: 'j1', to: 'j2', path: [p(200, 200), p(400, 200)], length: 200, widthClass: 'normal' },
      { id: 'e5', from: 'j3', to: 'hV', path: [p(600, 200), p(700, 200)], length: 100, widthClass: 'normal' },
      { id: 'e6', from: 'j3', to: 'j2', path: [p(600, 200), p(400, 200)], length: 200, widthClass: 'normal' },
      { id: 'e7', from: 'j2', to: 'j4', path: [p(400, 200), p(200, 200), p(200, 500)], length: 500, widthClass: 'normal' },
      { id: 'e8', from: 'j2', to: 'j5', path: [p(400, 200), p(400, 500)], length: 300, widthClass: 'normal' },
      { id: 'e9', from: 'j2', to: 'j6', path: [p(400, 200), p(600, 200), p(600, 500)], length: 500, widthClass: 'normal' },
      { id: 'e10', from: 'j4', to: 'hO', path: [p(200, 500), p(100, 500)], length: 100, widthClass: 'normal' },
      { id: 'e11', from: 'j4', to: 'hG', path: [p(200, 500), p(200, 700)], length: 200, widthClass: 'normal' },
      { id: 'e12', from: 'j5', to: 'hY', path: [p(400, 500), p(400, 700)], length: 200, widthClass: 'normal' },
      { id: 'e13', from: 'j5', to: 'j4', path: [p(400, 500), p(200, 500)], length: 200, widthClass: 'normal' },
      { id: 'e14', from: 'j6', to: 'hP', path: [p(600, 500), p(600, 700)], length: 200, widthClass: 'normal' },
      { id: 'e15', from: 'j6', to: 'j5', path: [p(600, 500), p(400, 500)], length: 200, widthClass: 'normal' },
    ],
    junctions: [
      { id: 'j1', outEdges: ['e3', 'e4'], defaultIndex: 1 },
      { id: 'j2', outEdges: ['e7', 'e8', 'e9'], defaultIndex: 0 },
      { id: 'j3', outEdges: ['e5', 'e6'], defaultIndex: 1 },
      { id: 'j4', outEdges: ['e10', 'e11'], defaultIndex: 0 },
      { id: 'j5', outEdges: ['e12', 'e13'], defaultIndex: 0 },
      { id: 'j6', outEdges: ['e14', 'e15'], defaultIndex: 0 },
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
