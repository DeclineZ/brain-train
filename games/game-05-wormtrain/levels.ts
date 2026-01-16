import { LevelData } from './types/level';

// Helper to create simple points
const p = (x: number, y: number) => ({ x, y });

export const LEVELS: LevelData[] = [
  // =========================================================================
  // EASY LEVELS (1-5)
  // Focus: Basic controls, speed increase, size mechanic intro (S/M), no traps
  // =========================================================================

  // LEVEL 1: First Steps (Simple Y-Split)
  {
    levelId: 1,
    metadata: { name: "First Steps", rating: 1 },
    colors: ["#ff914d", "#5170ff", "#58CC02"],
    nodes: [
      { id: "start", type: "SPAWN", x: 400, y: 195 },
      { id: "j1", type: "JUNCTION", x: 400, y: 482 },
      { id: "h1", type: "HOLE", x: 302, y: 770, color: "#ff914d" },
      { id: "h2", type: "HOLE", x: 400, y: 770, color: "#5170ff" },
      { id: "h3", type: "HOLE", x: 497, y: 770, color: "#58CC02" }
    ],
    edges: [
      { id: "e1", from: "start", to: "j1", path: [p(400, 195), p(400, 482)], length: 250, widthClass: "normal" },
      { id: "e2", from: "j1", to: "h1", path: [p(400, 482), p(302, 655), p(302, 770)], length: 280, widthClass: "normal" },
      { id: "e3", from: "j1", to: "h2", path: [p(400, 482), p(400, 770)], length: 250, widthClass: "normal" },
      { id: "e4", from: "j1", to: "h3", path: [p(400, 482), p(497, 655), p(497, 770)], length: 280, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3", "e4"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "M", color: "#ff914d", spawnNodeId: "start", spawnTimeMs: 1000, speed: 60 },
      { id: "w2", size: "M", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 4000, speed: 60 },
      { id: "w3", size: "M", color: "#58CC02", spawnNodeId: "start", spawnTimeMs: 7000, speed: 60 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 3 }
  },

  // LEVEL 2: The Fork (Vertical Fan)
  {
    levelId: 2,
    metadata: { name: "The Fork", rating: 1 },
    colors: ["#ff914d", "#5170ff", "#58CC02"],
    nodes: [
      { id: "start", type: "SPAWN", x: 302, y: 195 },
      { id: "j1", type: "JUNCTION", x: 302, y: 425 },
      { id: "j2", type: "JUNCTION", x: 400, y: 655 },
      { id: "h1", type: "HOLE", x: 302, y: 884, color: "#ff914d" },
      { id: "h2", type: "HOLE", x: 400, y: 884, color: "#5170ff" },
      { id: "h3", type: "HOLE", x: 497, y: 884, color: "#58CC02" }
    ],
    edges: [
      { id: "e1", from: "start", to: "j1", path: [p(302, 195), p(302, 425)], length: 200, widthClass: "normal" },
      { id: "e2", from: "j1", to: "h1", path: [p(302, 425), p(302, 884)], length: 400, widthClass: "normal" },
      { id: "e3", from: "j1", to: "j2", path: [p(302, 425), p(351, 540), p(400, 655)], length: 280, widthClass: "normal" },
      { id: "e4", from: "j2", to: "h2", path: [p(400, 655), p(400, 884)], length: 200, widthClass: "normal" },
      { id: "e5", from: "j2", to: "h3", path: [p(400, 655), p(448, 770), p(497, 884)], length: 280, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3"], defaultIndex: 1 },
      { id: "j2", outEdges: ["e4", "e5"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "M", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "M", color: "#ff914d", spawnNodeId: "start", spawnTimeMs: 3500, speed: 70 },
      { id: "w3", size: "M", color: "#58CC02", spawnNodeId: "start", spawnTimeMs: 6000, speed: 70 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 3 }
  },

  // LEVEL 3: Triple Split (Connected)
  {
    levelId: 3,
    metadata: { name: "Triple Split", rating: 1 },
    colors: ["#5170ff", "#58CC02", "#FFD700"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 400, y: 195 },
      { id: "j1", type: "JUNCTION", x: 400, y: 425 },
      { id: "h_blue", type: "HOLE", x: 302, y: 770, color: "#5170ff" },
      { id: "j2", type: "JUNCTION", x: 465, y: 655 },
      { id: "h_green", type: "HOLE", x: 400, y: 942, color: "#58CC02" },
      { id: "h_yellow", type: "HOLE", x: 530, y: 942, color: "#FFD700" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j1", path: [p(400, 195), p(400, 425)], length: 200, widthClass: "normal" },
      { id: "e2", from: "j1", to: "h_blue", path: [p(400, 425), p(302, 770)], length: 340, widthClass: "normal" },
      { id: "e3", from: "j1", to: "j2", path: [p(400, 425), p(465, 655)], length: 220, widthClass: "normal" },
      { id: "e4", from: "j2", to: "h_green", path: [p(465, 655), p(400, 942)], length: 270, widthClass: "normal" },
      { id: "e5", from: "j2", to: "h_yellow", path: [p(465, 655), p(530, 942)], length: 270, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3"], defaultIndex: 1 }, // Default to lower branch
      { id: "j2", outEdges: ["e4", "e5"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 60 },
      { id: "w2", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 4500, speed: 60 }, // Slower spacing
      { id: "w3", size: "M", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 8000, speed: 60 },
      { id: "w4", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 11500, speed: 60 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 4 }
  },

  // LEVEL 4: Small & Big (3 Colors)
  {
    levelId: 4,
    metadata: { name: "Small & Big", rating: 2 },
    colors: ["#5170ff", "#58CC02", "#ff914d"],
    nodes: [
      { id: "start", type: "SPAWN", x: 400, y: 150 },
      { id: "j1", type: "JUNCTION", x: 400, y: 350 },
      // Blue Branch (Size Split)
      { id: "j2", type: "JUNCTION", x: 250, y: 550 },
      { id: "h_blue_s", type: "HOLE", x: 150, y: 750, color: "#5170ff", size: "S" },
      { id: "h_blue_m", type: "HOLE", x: 300, y: 750, color: "#5170ff", size: "M" },
      // Color Branch
      { id: "j3", type: "JUNCTION", x: 550, y: 550 },
      { id: "h_green", type: "HOLE", x: 500, y: 750, color: "#58CC02" },
      { id: "h_orange", type: "HOLE", x: 650, y: 750, color: "#ff914d" }
    ],
    edges: [
      { id: "e1", from: "start", to: "j1", path: [p(400, 150), p(400, 350)], length: 200, widthClass: "normal" },
      // Left to Blue Size Split (L-Shape)
      { id: "e2", from: "j1", to: "j2", path: [p(400, 350), p(250, 350), p(250, 550)], length: 350, widthClass: "normal" },
      { id: "e3", from: "j2", to: "h_blue_s", path: [p(250, 550), p(150, 550), p(150, 750)], length: 300, widthClass: "narrow" }, // Narrow L
      { id: "e4", from: "j2", to: "h_blue_m", path: [p(250, 550), p(300, 550), p(300, 750)], length: 250, widthClass: "normal" },
      // Right to Colors (L-Shape)
      { id: "e5", from: "j1", to: "j3", path: [p(400, 350), p(550, 350), p(550, 550)], length: 350, widthClass: "normal" },
      { id: "e6", from: "j3", to: "h_green", path: [p(550, 550), p(500, 550), p(500, 750)], length: 250, widthClass: "normal" },
      { id: "e7", from: "j3", to: "h_orange", path: [p(550, 550), p(650, 550), p(650, 750)], length: 250, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e5"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e4", "e3"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e6", "e7"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "S", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "M", color: "#58CC02", spawnNodeId: "start", spawnTimeMs: 3500, speed: 70 },
      { id: "w3", size: "M", color: "#ff914d", spawnNodeId: "start", spawnTimeMs: 6000, speed: 70 },
      { id: "w4", size: "M", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 8500, speed: 70 },
      { id: "w5", size: "S", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 11000, speed: 70 }
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 5 }
  },

  // LEVEL 5: The Grid (3x2 Junction Grid)
  // Layout like Track of Thought: interconnected grid of switches
  {
    levelId: 5,
    metadata: { name: "The Grid", rating: 2 },
    colors: ["#E91E63", "#ff914d", "#FFD700"],
    nodes: [
      // Spawns (Top Row)
      { id: "s1", type: "SPAWN", x: 200, y: 100 },
      { id: "s2", type: "SPAWN", x: 600, y: 100 },

      // Row 1 Junctions (y=280)
      { id: "j1", type: "JUNCTION", x: 200, y: 280 },
      { id: "j2", type: "JUNCTION", x: 400, y: 280 },
      { id: "j3", type: "JUNCTION", x: 600, y: 280 },

      // Row 2 Junctions (y=480)
      { id: "j4", type: "JUNCTION", x: 200, y: 480 },
      { id: "j5", type: "JUNCTION", x: 400, y: 480 },
      { id: "j6", type: "JUNCTION", x: 600, y: 480 },

      // Holes (Bottom Row y=700)
      { id: "h1", type: "HOLE", x: 200, y: 700, color: "#E91E63" },
      { id: "h2", type: "HOLE", x: 400, y: 700, color: "#ff914d" },
      { id: "h3", type: "HOLE", x: 600, y: 700, color: "#FFD700" }
    ],
    edges: [
      // Spawns to Row 1
      { id: "e1", from: "s1", to: "j1", path: [p(200, 100), p(200, 280)], length: 180, widthClass: "normal" },
      { id: "e2", from: "s2", to: "j3", path: [p(600, 100), p(600, 280)], length: 180, widthClass: "normal" },

      // Row 1: J1 -> Down(J4) or Right(J2)
      { id: "e3", from: "j1", to: "j4", path: [p(200, 280), p(200, 480)], length: 200, widthClass: "normal" },
      { id: "e4", from: "j1", to: "j2", path: [p(200, 280), p(400, 280)], length: 200, widthClass: "normal" },

      // Row 1: J2 -> Down(J5) or Right(J3)
      { id: "e5", from: "j2", to: "j5", path: [p(400, 280), p(400, 480)], length: 200, widthClass: "normal" },
      { id: "e6", from: "j2", to: "j3", path: [p(400, 280), p(600, 280)], length: 200, widthClass: "normal" },

      // Row 1: J3 -> Down(J6) or Left(J2)
      { id: "e7", from: "j3", to: "j6", path: [p(600, 280), p(600, 480)], length: 200, widthClass: "normal" },
      { id: "e8", from: "j3", to: "j2", path: [p(600, 280), p(400, 280)], length: 200, widthClass: "normal" },

      // Row 2: J4 -> Down(H1) or Right(J5)
      { id: "e9", from: "j4", to: "h1", path: [p(200, 480), p(200, 700)], length: 220, widthClass: "normal" },
      { id: "e10", from: "j4", to: "j5", path: [p(200, 480), p(400, 480)], length: 200, widthClass: "normal" },

      // Row 2: J5 -> Down(H2) or Right(J6)
      { id: "e11", from: "j5", to: "h2", path: [p(400, 480), p(400, 700)], length: 220, widthClass: "normal" },
      { id: "e12", from: "j5", to: "j6", path: [p(400, 480), p(600, 480)], length: 200, widthClass: "normal" },

      // Row 2: J6 -> Down(H3) or Left(J5)
      { id: "e13", from: "j6", to: "h3", path: [p(600, 480), p(600, 700)], length: 220, widthClass: "normal" },
      { id: "e14", from: "j6", to: "j5", path: [p(600, 480), p(400, 480)], length: 200, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e3", "e4"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e5", "e6"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e7", "e8"], defaultIndex: 0 },
      { id: "j4", outEdges: ["e9", "e10"], defaultIndex: 0 },
      { id: "j5", outEdges: ["e11", "e12"], defaultIndex: 0 },
      { id: "j6", outEdges: ["e13", "e14"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "M", color: "#E91E63", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 65 },
      { id: "w2", size: "M", color: "#FFD700", spawnNodeId: "s2", spawnTimeMs: 2000, speed: 65 },
      { id: "w3", size: "M", color: "#ff914d", spawnNodeId: "s1", spawnTimeMs: 4000, speed: 65 },
      { id: "w4", size: "M", color: "#ff914d", spawnNodeId: "s2", spawnTimeMs: 6000, speed: 65 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 4 }
  },

  // LEVEL 6: The Ladder (2x3 Tall Grid + Earthquake)
  {
    levelId: 6,
    metadata: { name: "The Ladder", rating: 2 },
    colors: ["#5170ff", "#E91E63"],
    nodes: [
      // Spawns (2 at top)
      { id: "s1", type: "SPAWN", x: 250, y: 80 },
      { id: "s2", type: "SPAWN", x: 550, y: 80 },

      // Row 1 (y=200)
      { id: "j1", type: "JUNCTION", x: 250, y: 200 },
      { id: "j2", type: "JUNCTION", x: 550, y: 200 },

      // Row 2 (y=380)
      { id: "j3", type: "JUNCTION", x: 250, y: 380 },
      { id: "j4", type: "JUNCTION", x: 550, y: 380 },

      // Row 3 (y=560)
      { id: "j5", type: "JUNCTION", x: 250, y: 560 },
      { id: "j6", type: "JUNCTION", x: 550, y: 560 },

      // Holes directly under J5 and J6
      { id: "h1", type: "HOLE", x: 250, y: 750, color: "#5170ff" },
      { id: "h2", type: "HOLE", x: 550, y: 750, color: "#E91E63" }
    ],
    edges: [
      // Spawns to Row 1
      { id: "e1", from: "s1", to: "j1", path: [p(250, 80), p(250, 200)], length: 120, widthClass: "normal" },
      { id: "e2", from: "s2", to: "j2", path: [p(550, 80), p(550, 200)], length: 120, widthClass: "normal" },

      // Row 1: J1 -> Down(J3) or Right(J2)
      { id: "e3", from: "j1", to: "j3", path: [p(250, 200), p(250, 380)], length: 180, widthClass: "normal" },
      { id: "e4", from: "j1", to: "j2", path: [p(250, 200), p(550, 200)], length: 300, widthClass: "normal" },

      // Row 1: J2 -> Down(J4) or Left(J1)
      { id: "e5", from: "j2", to: "j4", path: [p(550, 200), p(550, 380)], length: 180, widthClass: "normal" },
      { id: "e6", from: "j2", to: "j1", path: [p(550, 200), p(250, 200)], length: 300, widthClass: "normal" },

      // Row 2: J3 -> Down(J5) or Right(J4)
      { id: "e7", from: "j3", to: "j5", path: [p(250, 380), p(250, 560)], length: 180, widthClass: "normal" },
      { id: "e8", from: "j3", to: "j4", path: [p(250, 380), p(550, 380)], length: 300, widthClass: "normal" },

      // Row 2: J4 -> Down(J6) or Left(J3)
      { id: "e9", from: "j4", to: "j6", path: [p(550, 380), p(550, 560)], length: 180, widthClass: "normal" },
      { id: "e10", from: "j4", to: "j3", path: [p(550, 380), p(250, 380)], length: 300, widthClass: "normal" },

      // Row 3: J5 -> Down(H1) or Right(J6)
      { id: "e11", from: "j5", to: "h1", path: [p(250, 560), p(250, 750)], length: 190, widthClass: "normal" },
      { id: "e12", from: "j5", to: "j6", path: [p(250, 560), p(550, 560)], length: 300, widthClass: "normal" },

      // Row 3: J6 -> Down(H2) or Left(J5)
      { id: "e13", from: "j6", to: "h2", path: [p(550, 560), p(550, 750)], length: 190, widthClass: "normal" },
      { id: "e14", from: "j6", to: "j5", path: [p(550, 560), p(250, 560)], length: 300, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e3", "e4"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e5", "e6"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e7", "e8"], defaultIndex: 0 },
      { id: "j4", outEdges: ["e9", "e10"], defaultIndex: 0 },
      { id: "j5", outEdges: ["e11", "e12"], defaultIndex: 0 },
      { id: "j6", outEdges: ["e13", "e14"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "EARTHQUAKE", nodeId: "j4", intervalMs: 5000, initialDelayMs: 3000 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "M", color: "#E91E63", spawnNodeId: "s2", spawnTimeMs: 2500, speed: 70 },
      { id: "w3", size: "M", color: "#5170ff", spawnNodeId: "s2", spawnTimeMs: 4500, speed: 70 },
      { id: "w4", size: "M", color: "#E91E63", spawnNodeId: "s1", spawnTimeMs: 6500, speed: 70 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 4 }
  },

  // LEVEL 7: The Wide Web (4x2 Wide Grid with Spider)
  {
    levelId: 7,
    metadata: { name: "The Wide Web", rating: 3 },
    colors: ["#ff914d", "#FFD700", "#9C27B0", "#58CC02"],
    nodes: [
      // Spawns (at edges)
      { id: "s1", type: "SPAWN", x: 100, y: 100 },
      { id: "s2", type: "SPAWN", x: 700, y: 100 },

      // Row 1: 4 Junctions (y=280)
      { id: "j1", type: "JUNCTION", x: 100, y: 280 },
      { id: "j2", type: "JUNCTION", x: 300, y: 280 },
      { id: "j3", type: "JUNCTION", x: 500, y: 280 },
      { id: "j4", type: "JUNCTION", x: 700, y: 280 },

      // Row 2: 4 Junctions (y=480)
      { id: "j5", type: "JUNCTION", x: 100, y: 480 },
      { id: "j6", type: "JUNCTION", x: 300, y: 480 },
      { id: "j7", type: "JUNCTION", x: 500, y: 480 },
      { id: "j8", type: "JUNCTION", x: 700, y: 480 },

      // Holes (4 holes for 4 colors)
      { id: "h1", type: "HOLE", x: 100, y: 700, color: "#FFD700" },
      { id: "h2", type: "HOLE", x: 300, y: 700, color: "#ff914d" },
      { id: "h3", type: "HOLE", x: 500, y: 700, color: "#58CC02" },
      { id: "h4", type: "HOLE", x: 700, y: 700, color: "#9C27B0" }
    ],
    edges: [
      // Spawns to Row 1
      { id: "e1", from: "s1", to: "j1", path: [p(100, 100), p(100, 280)], length: 180, widthClass: "normal" },
      { id: "e2", from: "s2", to: "j4", path: [p(700, 100), p(700, 280)], length: 180, widthClass: "normal" },

      // Row 1: J1 -> Down(J5) or Right(J2)
      { id: "e3", from: "j1", to: "j5", path: [p(100, 280), p(100, 480)], length: 200, widthClass: "normal" },
      { id: "e4", from: "j1", to: "j2", path: [p(100, 280), p(300, 280)], length: 200, widthClass: "normal" },

      // Row 1: J2 -> Down(J6) or Right(J3)
      { id: "e5", from: "j2", to: "j6", path: [p(300, 280), p(300, 480)], length: 200, widthClass: "normal" },
      { id: "e6", from: "j2", to: "j3", path: [p(300, 280), p(500, 280)], length: 200, widthClass: "normal" },

      // Row 1: J3 -> Down(J7) or Right(J4)
      { id: "e7", from: "j3", to: "j7", path: [p(500, 280), p(500, 480)], length: 200, widthClass: "normal" },
      { id: "e8", from: "j3", to: "j4", path: [p(500, 280), p(700, 280)], length: 200, widthClass: "normal" },

      // Row 1: J4 -> Down(J8) or Left(J3)
      { id: "e9", from: "j4", to: "j8", path: [p(700, 280), p(700, 480)], length: 200, widthClass: "normal" },
      { id: "e10", from: "j4", to: "j3", path: [p(700, 280), p(500, 280)], length: 200, widthClass: "normal" },

      // Row 2: J5 -> Down(H1) or Right(J6)
      { id: "e11", from: "j5", to: "h1", path: [p(100, 480), p(100, 700)], length: 220, widthClass: "normal" },
      { id: "e12", from: "j5", to: "j6", path: [p(100, 480), p(300, 480)], length: 200, widthClass: "normal" },

      // Row 2: J6 -> Down(H2) or Right(J7)
      { id: "e13", from: "j6", to: "h2", path: [p(300, 480), p(300, 700)], length: 220, widthClass: "normal" },
      { id: "e14", from: "j6", to: "j7", path: [p(300, 480), p(500, 480)], length: 200, widthClass: "normal" },

      // Row 2: J7 -> Down(H3) or Right(J8)
      { id: "e15", from: "j7", to: "h3", path: [p(500, 480), p(500, 700)], length: 220, widthClass: "normal" },
      { id: "e16", from: "j7", to: "j8", path: [p(500, 480), p(700, 480)], length: 200, widthClass: "normal" },

      // Row 2: J8 -> Down(H4) or Left(J7)
      { id: "e17", from: "j8", to: "h4", path: [p(700, 480), p(700, 700)], length: 220, widthClass: "normal" },
      { id: "e18", from: "j8", to: "j7", path: [p(700, 480), p(500, 480)], length: 200, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e3", "e4"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e5", "e6"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e7", "e8"], defaultIndex: 0 },
      { id: "j4", outEdges: ["e9", "e10"], defaultIndex: 0 },
      { id: "j5", outEdges: ["e11", "e12"], defaultIndex: 0 },
      { id: "j6", outEdges: ["e13", "e14"], defaultIndex: 0 },
      { id: "j7", outEdges: ["e15", "e16"], defaultIndex: 0 },
      { id: "j8", outEdges: ["e17", "e18"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "SPIDER", nodeId: "j3", intervalMs: 5000, initialDelayMs: 2500 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "M", color: "#9C27B0", spawnNodeId: "s2", spawnTimeMs: 2000, speed: 70 },
      { id: "w3", size: "M", color: "#ff914d", spawnNodeId: "s1", spawnTimeMs: 3500, speed: 70 },
      { id: "w4", size: "M", color: "#58CC02", spawnNodeId: "s2", spawnTimeMs: 5000, speed: 70 },
      { id: "w5", size: "M", color: "#ff914d", spawnNodeId: "s2", spawnTimeMs: 6500, speed: 70 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 }
  },

  // LEVEL 8: Double Trouble (3x2 Grid + BOTH Traps)
  {
    levelId: 8,
    metadata: { name: "Double Trouble", rating: 3 },
    colors: ["#5170ff", "#58CC02", "#ff914d"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 200, y: 100 },
      { id: "s2", type: "SPAWN", x: 600, y: 100 },

      // Row 1 Junctions
      { id: "j1", type: "JUNCTION", x: 200, y: 280 },
      { id: "j2", type: "JUNCTION", x: 400, y: 280 },
      { id: "j3", type: "JUNCTION", x: 600, y: 280 },

      // Row 2 Junctions  
      { id: "j4", type: "JUNCTION", x: 200, y: 480 },
      { id: "j5", type: "JUNCTION", x: 400, y: 480 },
      { id: "j6", type: "JUNCTION", x: 600, y: 480 },

      // Holes
      { id: "h1", type: "HOLE", x: 200, y: 700, color: "#5170ff" },
      { id: "h2", type: "HOLE", x: 400, y: 700, color: "#58CC02" },
      { id: "h3", type: "HOLE", x: 600, y: 700, color: "#ff914d" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j1", path: [p(200, 100), p(200, 280)], length: 180, widthClass: "normal" },
      { id: "e2", from: "s2", to: "j3", path: [p(600, 100), p(600, 280)], length: 180, widthClass: "normal" },

      { id: "e3", from: "j1", to: "j4", path: [p(200, 280), p(200, 480)], length: 200, widthClass: "normal" },
      { id: "e4", from: "j1", to: "j2", path: [p(200, 280), p(400, 280)], length: 200, widthClass: "normal" },

      { id: "e5", from: "j2", to: "j5", path: [p(400, 280), p(400, 480)], length: 200, widthClass: "normal" },
      { id: "e6", from: "j2", to: "j3", path: [p(400, 280), p(600, 280)], length: 200, widthClass: "normal" },

      { id: "e7", from: "j3", to: "j6", path: [p(600, 280), p(600, 480)], length: 200, widthClass: "normal" },
      { id: "e8", from: "j3", to: "j2", path: [p(600, 280), p(400, 280)], length: 200, widthClass: "normal" },

      { id: "e9", from: "j4", to: "h1", path: [p(200, 480), p(200, 700)], length: 220, widthClass: "normal" },
      { id: "e10", from: "j4", to: "j5", path: [p(200, 480), p(400, 480)], length: 200, widthClass: "normal" },

      { id: "e11", from: "j5", to: "h2", path: [p(400, 480), p(400, 700)], length: 220, widthClass: "normal" },
      { id: "e12", from: "j5", to: "j6", path: [p(400, 480), p(600, 480)], length: 200, widthClass: "normal" },

      { id: "e13", from: "j6", to: "h3", path: [p(600, 480), p(600, 700)], length: 220, widthClass: "normal" },
      { id: "e14", from: "j6", to: "j5", path: [p(600, 480), p(400, 480)], length: 200, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e3", "e4"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e5", "e6"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e7", "e8"], defaultIndex: 0 },
      { id: "j4", outEdges: ["e9", "e10"], defaultIndex: 0 },
      { id: "j5", outEdges: ["e11", "e12"], defaultIndex: 0 },
      { id: "j6", outEdges: ["e13", "e14"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "SPIDER", nodeId: "j2", intervalMs: 5000, initialDelayMs: 2000 },
      { id: "t2", type: "EARTHQUAKE", nodeId: "j5", intervalMs: 4000, initialDelayMs: 3500 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 65 },
      { id: "w2", size: "M", color: "#ff914d", spawnNodeId: "s2", spawnTimeMs: 2500, speed: 65 },
      { id: "w3", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 4500, speed: 65 },
      { id: "w4", size: "M", color: "#58CC02", spawnNodeId: "s2", spawnTimeMs: 6500, speed: 65 },
      { id: "w5", size: "M", color: "#5170ff", spawnNodeId: "s2", spawnTimeMs: 8500, speed: 65 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 }
  },

  // LEVEL 9: The Gauntlet (4x2 Grid + Both Traps)
  {
    levelId: 9,
    metadata: { name: "The Gauntlet", rating: 4 },
    colors: ["#5170ff", "#58CC02", "#ff914d", "#E91E63"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 100, y: 100 },
      { id: "s2", type: "SPAWN", x: 700, y: 100 },

      // Row 1: 4 Junctions
      { id: "j1", type: "JUNCTION", x: 100, y: 280 },
      { id: "j2", type: "JUNCTION", x: 300, y: 280 },
      { id: "j3", type: "JUNCTION", x: 500, y: 280 },
      { id: "j4", type: "JUNCTION", x: 700, y: 280 },

      // Row 2: 4 Junctions
      { id: "j5", type: "JUNCTION", x: 100, y: 480 },
      { id: "j6", type: "JUNCTION", x: 300, y: 480 },
      { id: "j7", type: "JUNCTION", x: 500, y: 480 },
      { id: "j8", type: "JUNCTION", x: 700, y: 480 },

      // Holes
      { id: "h1", type: "HOLE", x: 100, y: 700, color: "#5170ff" },
      { id: "h2", type: "HOLE", x: 300, y: 700, color: "#58CC02" },
      { id: "h3", type: "HOLE", x: 500, y: 700, color: "#ff914d" },
      { id: "h4", type: "HOLE", x: 700, y: 700, color: "#E91E63" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j1", path: [p(100, 100), p(100, 280)], length: 180, widthClass: "normal" },
      { id: "e2", from: "s2", to: "j4", path: [p(700, 100), p(700, 280)], length: 180, widthClass: "normal" },

      { id: "e3", from: "j1", to: "j5", path: [p(100, 280), p(100, 480)], length: 200, widthClass: "normal" },
      { id: "e4", from: "j1", to: "j2", path: [p(100, 280), p(300, 280)], length: 200, widthClass: "normal" },

      { id: "e5", from: "j2", to: "j6", path: [p(300, 280), p(300, 480)], length: 200, widthClass: "normal" },
      { id: "e6", from: "j2", to: "j3", path: [p(300, 280), p(500, 280)], length: 200, widthClass: "normal" },

      { id: "e7", from: "j3", to: "j7", path: [p(500, 280), p(500, 480)], length: 200, widthClass: "normal" },
      { id: "e8", from: "j3", to: "j4", path: [p(500, 280), p(700, 280)], length: 200, widthClass: "normal" },

      { id: "e9", from: "j4", to: "j8", path: [p(700, 280), p(700, 480)], length: 200, widthClass: "normal" },
      { id: "e10", from: "j4", to: "j3", path: [p(700, 280), p(500, 280)], length: 200, widthClass: "normal" },

      { id: "e11", from: "j5", to: "h1", path: [p(100, 480), p(100, 700)], length: 220, widthClass: "normal" },
      { id: "e12", from: "j5", to: "j6", path: [p(100, 480), p(300, 480)], length: 200, widthClass: "normal" },

      { id: "e13", from: "j6", to: "h2", path: [p(300, 480), p(300, 700)], length: 220, widthClass: "normal" },
      { id: "e14", from: "j6", to: "j7", path: [p(300, 480), p(500, 480)], length: 200, widthClass: "normal" },

      { id: "e15", from: "j7", to: "h3", path: [p(500, 480), p(500, 700)], length: 220, widthClass: "normal" },
      { id: "e16", from: "j7", to: "j8", path: [p(500, 480), p(700, 480)], length: 200, widthClass: "normal" },

      { id: "e17", from: "j8", to: "h4", path: [p(700, 480), p(700, 700)], length: 220, widthClass: "normal" },
      { id: "e18", from: "j8", to: "j7", path: [p(700, 480), p(500, 480)], length: 200, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e3", "e4"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e5", "e6"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e7", "e8"], defaultIndex: 0 },
      { id: "j4", outEdges: ["e9", "e10"], defaultIndex: 0 },
      { id: "j5", outEdges: ["e11", "e12"], defaultIndex: 0 },
      { id: "j6", outEdges: ["e13", "e14"], defaultIndex: 0 },
      { id: "j7", outEdges: ["e15", "e16"], defaultIndex: 0 },
      { id: "j8", outEdges: ["e17", "e18"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "SPIDER", nodeId: "j2", intervalMs: 5000, initialDelayMs: 2000 },
      { id: "t2", type: "SPIDER", nodeId: "j7", intervalMs: 5000, initialDelayMs: 4000 },
      { id: "t3", type: "EARTHQUAKE", nodeId: "j6", intervalMs: 4000, initialDelayMs: 3000 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "M", color: "#E91E63", spawnNodeId: "s2", spawnTimeMs: 2500, speed: 70 },
      { id: "w3", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 4500, speed: 70 },
      { id: "w4", size: "M", color: "#ff914d", spawnNodeId: "s2", spawnTimeMs: 6500, speed: 70 },
      { id: "w5", size: "M", color: "#58CC02", spawnNodeId: "s2", spawnTimeMs: 8500, speed: 70 },
      { id: "w6", size: "M", color: "#5170ff", spawnNodeId: "s2", spawnTimeMs: 10500, speed: 70 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 6 }
  },

  // LEVEL 10: Spider's Nest (3x3 Grid + Multiple Traps)
  {
    levelId: 10,
    metadata: { name: "Spider's Nest", rating: 4 },
    colors: ["#5170ff", "#58CC02", "#ff914d", "#FFD700"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 200, y: 80 },
      { id: "s2", type: "SPAWN", x: 400, y: 80 },
      { id: "s3", type: "SPAWN", x: 600, y: 80 },

      // Row 1
      { id: "j1", type: "JUNCTION", x: 200, y: 230 },
      { id: "j2", type: "JUNCTION", x: 400, y: 230 },
      { id: "j3", type: "JUNCTION", x: 600, y: 230 },

      // Row 2
      { id: "j4", type: "JUNCTION", x: 200, y: 420 },
      { id: "j5", type: "JUNCTION", x: 400, y: 420 },
      { id: "j6", type: "JUNCTION", x: 600, y: 420 },

      // Row 3
      { id: "j7", type: "JUNCTION", x: 200, y: 610 },
      { id: "j8", type: "JUNCTION", x: 400, y: 610 },
      { id: "j9", type: "JUNCTION", x: 600, y: 610 },

      // Holes
      { id: "h1", type: "HOLE", x: 200, y: 780, color: "#5170ff" },
      { id: "h2", type: "HOLE", x: 400, y: 780, color: "#58CC02" },
      { id: "h3", type: "HOLE", x: 600, y: 780, color: "#ff914d" },
      { id: "h4", type: "HOLE", x: 400, y: 530, color: "#FFD700" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j1", path: [p(200, 80), p(200, 230)], length: 150, widthClass: "normal" },
      { id: "e2", from: "s2", to: "j2", path: [p(400, 80), p(400, 230)], length: 150, widthClass: "normal" },
      { id: "e3", from: "s3", to: "j3", path: [p(600, 80), p(600, 230)], length: 150, widthClass: "normal" },

      // Row 1 connections
      { id: "e4", from: "j1", to: "j4", path: [p(200, 230), p(200, 420)], length: 190, widthClass: "normal" },
      { id: "e5", from: "j1", to: "j2", path: [p(200, 230), p(400, 230)], length: 200, widthClass: "normal" },

      { id: "e6", from: "j2", to: "j5", path: [p(400, 230), p(400, 420)], length: 190, widthClass: "normal" },
      { id: "e7", from: "j2", to: "j3", path: [p(400, 230), p(600, 230)], length: 200, widthClass: "normal" },

      { id: "e8", from: "j3", to: "j6", path: [p(600, 230), p(600, 420)], length: 190, widthClass: "normal" },
      { id: "e9", from: "j3", to: "j2", path: [p(600, 230), p(400, 230)], length: 200, widthClass: "normal" },

      // Row 2 connections
      { id: "e10", from: "j4", to: "j7", path: [p(200, 420), p(200, 610)], length: 190, widthClass: "normal" },
      { id: "e11", from: "j4", to: "j5", path: [p(200, 420), p(400, 420)], length: 200, widthClass: "normal" },

      { id: "e12", from: "j5", to: "h4", path: [p(400, 420), p(400, 530)], length: 110, widthClass: "normal" },
      { id: "e13", from: "j5", to: "j6", path: [p(400, 420), p(600, 420)], length: 200, widthClass: "normal" },

      { id: "e14", from: "j6", to: "j9", path: [p(600, 420), p(600, 610)], length: 190, widthClass: "normal" },
      { id: "e15", from: "j6", to: "j5", path: [p(600, 420), p(400, 420)], length: 200, widthClass: "normal" },

      // Row 3 connections
      { id: "e16", from: "j7", to: "h1", path: [p(200, 610), p(200, 780)], length: 170, widthClass: "normal" },
      { id: "e17", from: "j7", to: "j8", path: [p(200, 610), p(400, 610)], length: 200, widthClass: "normal" },

      { id: "e18", from: "j8", to: "h2", path: [p(400, 610), p(400, 780)], length: 170, widthClass: "normal" },
      { id: "e19", from: "j8", to: "j9", path: [p(400, 610), p(600, 610)], length: 200, widthClass: "normal" },

      { id: "e20", from: "j9", to: "h3", path: [p(600, 610), p(600, 780)], length: 170, widthClass: "normal" },
      { id: "e21", from: "j9", to: "j8", path: [p(600, 610), p(400, 610)], length: 200, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e4", "e5"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e6", "e7"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e8", "e9"], defaultIndex: 0 },
      { id: "j4", outEdges: ["e10", "e11"], defaultIndex: 0 },
      { id: "j5", outEdges: ["e12", "e13"], defaultIndex: 0 },
      { id: "j6", outEdges: ["e14", "e15"], defaultIndex: 0 },
      { id: "j7", outEdges: ["e16", "e17"], defaultIndex: 0 },
      { id: "j8", outEdges: ["e18", "e19"], defaultIndex: 0 },
      { id: "j9", outEdges: ["e20", "e21"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "SPIDER", nodeId: "j5", intervalMs: 5000, initialDelayMs: 2000 },
      { id: "t2", type: "EARTHQUAKE", nodeId: "j2", intervalMs: 4500, initialDelayMs: 3500 },
      { id: "t3", type: "EARTHQUAKE", nodeId: "j8", intervalMs: 4000, initialDelayMs: 5000 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "M", color: "#ff914d", spawnNodeId: "s3", spawnTimeMs: 2500, speed: 70 },
      { id: "w3", size: "M", color: "#FFD700", spawnNodeId: "s2", spawnTimeMs: 4500, speed: 70 },
      { id: "w4", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 6500, speed: 70 },
      { id: "w5", size: "M", color: "#58CC02", spawnNodeId: "s3", spawnTimeMs: 8500, speed: 70 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 }
  },

  // LEVEL 11: Switchboard (3x2 Grid + 4 Colors)
  {
    levelId: 11,
    metadata: { name: "Switchboard", rating: 4 },
    colors: ["#5170ff", "#58CC02", "#ff914d", "#E91E63"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 200, y: 100 },
      { id: "s2", type: "SPAWN", x: 600, y: 100 },
      { id: "j1", type: "JUNCTION", x: 200, y: 280 },
      { id: "j2", type: "JUNCTION", x: 400, y: 280 },
      { id: "j3", type: "JUNCTION", x: 600, y: 280 },
      { id: "j4", type: "JUNCTION", x: 200, y: 480 },
      { id: "j5", type: "JUNCTION", x: 400, y: 480 },
      { id: "j6", type: "JUNCTION", x: 600, y: 480 },
      { id: "h1", type: "HOLE", x: 200, y: 700, color: "#5170ff" },
      { id: "h2", type: "HOLE", x: 400, y: 700, color: "#58CC02" },
      { id: "h3", type: "HOLE", x: 600, y: 700, color: "#ff914d" },
      { id: "h4", type: "HOLE", x: 400, y: 380, color: "#E91E63" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j1", path: [p(200, 100), p(200, 280)], length: 180, widthClass: "normal" },
      { id: "e2", from: "s2", to: "j3", path: [p(600, 100), p(600, 280)], length: 180, widthClass: "normal" },
      { id: "e3", from: "j1", to: "j4", path: [p(200, 280), p(200, 480)], length: 200, widthClass: "normal" },
      { id: "e4", from: "j1", to: "j2", path: [p(200, 280), p(400, 280)], length: 200, widthClass: "normal" },
      { id: "e5", from: "j2", to: "h4", path: [p(400, 280), p(400, 380)], length: 100, widthClass: "normal" },
      { id: "e6", from: "j2", to: "j3", path: [p(400, 280), p(600, 280)], length: 200, widthClass: "normal" },
      { id: "e7", from: "j3", to: "j6", path: [p(600, 280), p(600, 480)], length: 200, widthClass: "normal" },
      { id: "e8", from: "j3", to: "j2", path: [p(600, 280), p(400, 280)], length: 200, widthClass: "normal" },
      { id: "e9", from: "j4", to: "h1", path: [p(200, 480), p(200, 700)], length: 220, widthClass: "normal" },
      { id: "e10", from: "j4", to: "j5", path: [p(200, 480), p(400, 480)], length: 200, widthClass: "normal" },
      { id: "e11", from: "j5", to: "h2", path: [p(400, 480), p(400, 700)], length: 220, widthClass: "normal" },
      { id: "e12", from: "j5", to: "j6", path: [p(400, 480), p(600, 480)], length: 200, widthClass: "normal" },
      { id: "e13", from: "j6", to: "h3", path: [p(600, 480), p(600, 700)], length: 220, widthClass: "normal" },
      { id: "e14", from: "j6", to: "j5", path: [p(600, 480), p(400, 480)], length: 200, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e3", "e4"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e5", "e6"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e7", "e8"], defaultIndex: 0 },
      { id: "j4", outEdges: ["e9", "e10"], defaultIndex: 0 },
      { id: "j5", outEdges: ["e11", "e12"], defaultIndex: 0 },
      { id: "j6", outEdges: ["e13", "e14"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "SPIDER", nodeId: "j2", intervalMs: 5000, initialDelayMs: 2000 },
      { id: "t2", type: "EARTHQUAKE", nodeId: "j5", intervalMs: 4000, initialDelayMs: 3000 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "M", color: "#ff914d", spawnNodeId: "s2", spawnTimeMs: 2500, speed: 70 },
      { id: "w3", size: "M", color: "#E91E63", spawnNodeId: "s1", spawnTimeMs: 4500, speed: 70 },
      { id: "w4", size: "M", color: "#58CC02", spawnNodeId: "s2", spawnTimeMs: 6500, speed: 70 },
      { id: "w5", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 8500, speed: 70 },
      { id: "w6", size: "M", color: "#5170ff", spawnNodeId: "s2", spawnTimeMs: 10500, speed: 70 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 6 }
  },

  // LEVEL 12-15: Simplified grid levels
  { levelId: 12, metadata: { name: "Double", rating: 5 }, colors: ["#5170ff", "#58CC02"], nodes: [{ id: "s1", type: "SPAWN", x: 400, y: 100 }, { id: "j1", type: "JUNCTION", x: 400, y: 300 }, { id: "h1", type: "HOLE", x: 300, y: 500, color: "#5170ff" }, { id: "h2", type: "HOLE", x: 500, y: 500, color: "#58CC02" }], edges: [{ id: "e1", from: "s1", to: "j1", path: [p(400, 100), p(400, 300)], length: 200, widthClass: "normal" }, { id: "e2", from: "j1", to: "h1", path: [p(400, 300), p(300, 500)], length: 220, widthClass: "normal" }, { id: "e3", from: "j1", to: "h2", path: [p(400, 300), p(500, 500)], length: 220, widthClass: "normal" }], junctions: [{ id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 }], traps: [], worms: [{ id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 75 }, { id: "w2", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 3000, speed: 75 }], rules: { blockLargeInNarrow: false, collisionFail: false }, winCondition: { requiredCount: 2 } },
  { levelId: 13, metadata: { name: "Matrix", rating: 5 }, colors: ["#5170ff", "#58CC02"], nodes: [{ id: "s1", type: "SPAWN", x: 400, y: 100 }, { id: "j1", type: "JUNCTION", x: 400, y: 300 }, { id: "h1", type: "HOLE", x: 300, y: 500, color: "#5170ff" }, { id: "h2", type: "HOLE", x: 500, y: 500, color: "#58CC02" }], edges: [{ id: "e1", from: "s1", to: "j1", path: [p(400, 100), p(400, 300)], length: 200, widthClass: "normal" }, { id: "e2", from: "j1", to: "h1", path: [p(400, 300), p(300, 500)], length: 220, widthClass: "normal" }, { id: "e3", from: "j1", to: "h2", path: [p(400, 300), p(500, 500)], length: 220, widthClass: "normal" }], junctions: [{ id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 }], traps: [{ id: "t1", type: "SPIDER", nodeId: "j1", intervalMs: 5000, initialDelayMs: 2000 }], worms: [{ id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 80 }, { id: "w2", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 3000, speed: 80 }], rules: { blockLargeInNarrow: false, collisionFail: false }, winCondition: { requiredCount: 2 } },
  { levelId: 14, metadata: { name: "Minefield", rating: 5 }, colors: ["#5170ff", "#58CC02"], nodes: [{ id: "s1", type: "SPAWN", x: 400, y: 100 }, { id: "j1", type: "JUNCTION", x: 400, y: 300 }, { id: "h1", type: "HOLE", x: 300, y: 500, color: "#5170ff" }, { id: "h2", type: "HOLE", x: 500, y: 500, color: "#58CC02" }], edges: [{ id: "e1", from: "s1", to: "j1", path: [p(400, 100), p(400, 300)], length: 200, widthClass: "normal" }, { id: "e2", from: "j1", to: "h1", path: [p(400, 300), p(300, 500)], length: 220, widthClass: "normal" }, { id: "e3", from: "j1", to: "h2", path: [p(400, 300), p(500, 500)], length: 220, widthClass: "normal" }], junctions: [{ id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 }], traps: [{ id: "t1", type: "EARTHQUAKE", nodeId: "j1", intervalMs: 4000, initialDelayMs: 1500 }], worms: [{ id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 85 }, { id: "w2", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 3000, speed: 85 }], rules: { blockLargeInNarrow: false, collisionFail: false }, winCondition: { requiredCount: 2 } },
  { levelId: 15, metadata: { name: "Grand Terminal", rating: 5 }, colors: ["#5170ff", "#58CC02"], nodes: [{ id: "s1", type: "SPAWN", x: 400, y: 100 }, { id: "j1", type: "JUNCTION", x: 400, y: 300 }, { id: "h1", type: "HOLE", x: 300, y: 500, color: "#5170ff" }, { id: "h2", type: "HOLE", x: 500, y: 500, color: "#58CC02" }], edges: [{ id: "e1", from: "s1", to: "j1", path: [p(400, 100), p(400, 300)], length: 200, widthClass: "normal" }, { id: "e2", from: "j1", to: "h1", path: [p(400, 300), p(300, 500)], length: 220, widthClass: "normal" }, { id: "e3", from: "j1", to: "h2", path: [p(400, 300), p(500, 500)], length: 220, widthClass: "normal" }], junctions: [{ id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 }], traps: [{ id: "t1", type: "SPIDER", nodeId: "j1", intervalMs: 4000, initialDelayMs: 1500 }, { id: "t2", type: "EARTHQUAKE", nodeId: "j1", intervalMs: 3500, initialDelayMs: 3000 }], worms: [{ id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 90 }, { id: "w2", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 2500, speed: 90 }, { id: "w3", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 4000, speed: 90 }], rules: { blockLargeInNarrow: false, collisionFail: false }, winCondition: { requiredCount: 3 } }
];




export default LEVELS;
