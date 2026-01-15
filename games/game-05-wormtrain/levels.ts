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
      { id: "start", type: "SPAWN", x: 100, y: 300 },
      { id: "j1", type: "JUNCTION", x: 350, y: 300 },
      { id: "h1", type: "HOLE", x: 600, y: 150, color: "#ff914d" },
      { id: "h2", type: "HOLE", x: 600, y: 300, color: "#5170ff" },
      { id: "h3", type: "HOLE", x: 600, y: 450, color: "#58CC02" }
    ],
    edges: [
      { id: "e1", from: "start", to: "j1", path: [p(100, 300), p(350, 300)], length: 250, widthClass: "normal" },
      { id: "e2", from: "j1", to: "h1", path: [p(350, 300), p(500, 150), p(600, 150)], length: 280, widthClass: "normal" },
      { id: "e3", from: "j1", to: "h2", path: [p(350, 300), p(600, 300)], length: 250, widthClass: "normal" },
      { id: "e4", from: "j1", to: "h3", path: [p(350, 300), p(500, 450), p(600, 450)], length: 280, widthClass: "normal" }
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
      { id: "start", type: "SPAWN", x: 100, y: 150 },
      { id: "j1", type: "JUNCTION", x: 300, y: 150 },
      { id: "j2", type: "JUNCTION", x: 500, y: 300 },
      { id: "h1", type: "HOLE", x: 700, y: 150, color: "#ff914d" },
      { id: "h2", type: "HOLE", x: 700, y: 300, color: "#5170ff" },
      { id: "h3", type: "HOLE", x: 700, y: 450, color: "#58CC02" }
    ],
    edges: [
      { id: "e1", from: "start", to: "j1", path: [p(100, 150), p(300, 150)], length: 200, widthClass: "normal" },
      { id: "e2", from: "j1", to: "h1", path: [p(300, 150), p(700, 150)], length: 400, widthClass: "normal" },
      { id: "e3", from: "j1", to: "j2", path: [p(300, 150), p(400, 225), p(500, 300)], length: 280, widthClass: "normal" },
      { id: "e4", from: "j2", to: "h2", path: [p(500, 300), p(700, 300)], length: 200, widthClass: "normal" },
      { id: "e5", from: "j2", to: "h3", path: [p(500, 300), p(600, 375), p(700, 450)], length: 280, widthClass: "normal" }
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

  // LEVEL 3: Double Trouble (2 Spawns)
  {
    levelId: 3,
    metadata: { name: "Double Trouble", rating: 1 },
    colors: ["#5170ff", "#58CC02", "#FFD700"],
    nodes: [
      // Top Track
      { id: "s1", type: "SPAWN", x: 80, y: 200 },
      { id: "j1", type: "JUNCTION", x: 300, y: 200 },
      { id: "h1", type: "HOLE", x: 600, y: 150, color: "#5170ff" },
      { id: "h2", type: "HOLE", x: 600, y: 250, color: "#FFD700" }, // Yellow
      // Bottom Track (Simple)
      { id: "s2", type: "SPAWN", x: 80, y: 450 },
      { id: "h3", type: "HOLE", x: 600, y: 450, color: "#58CC02" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j1", path: [p(80, 200), p(300, 200)], length: 220, widthClass: "normal" },
      { id: "e2", from: "j1", to: "h1", path: [p(300, 200), p(600, 150)], length: 300, widthClass: "normal" },
      { id: "e3", from: "j1", to: "h2", path: [p(300, 200), p(600, 250)], length: 300, widthClass: "normal" },
      { id: "e4", from: "s2", to: "h3", path: [p(80, 450), p(600, 450)], length: 520, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 60 },
      { id: "w2", size: "M", color: "#58CC02", spawnNodeId: "s2", spawnTimeMs: 2000, speed: 70 }, // Simple straight
      { id: "w3", size: "M", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 4000, speed: 60 },
      { id: "w4", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 6500, speed: 60 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 4 }
  },

  // LEVEL 4: Small & Big (Size Intro)
  {
    levelId: 4,
    metadata: { name: "Small & Big", rating: 2 },
    colors: ["#5170ff"], // Only Blue, but different sizes
    nodes: [
      { id: "start", type: "SPAWN", x: 100, y: 300 },
      { id: "j1", type: "JUNCTION", x: 350, y: 300 },
      { id: "h_S", type: "HOLE", x: 650, y: 200, color: "#5170ff", size: "S" }, // Small Hole
      { id: "h_M", type: "HOLE", x: 650, y: 400, color: "#5170ff", size: "M" }  // Medium Hole
    ],
    edges: [
      { id: "e1", from: "start", to: "j1", path: [p(100, 300), p(350, 300)], length: 250, widthClass: "normal" },
      { id: "e2", from: "j1", to: "h_S", path: [p(350, 300), p(500, 200), p(650, 200)], length: 320, widthClass: "normal" },
      { id: "e3", from: "j1", to: "h_M", path: [p(350, 300), p(500, 400), p(650, 400)], length: 320, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "S", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "M", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 3500, speed: 70 },
      { id: "w3", size: "S", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 6000, speed: 70 },
      { id: "w4", size: "M", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 8500, speed: 70 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 4 }
  },

  // LEVEL 5: Speed Merge
  {
    levelId: 5,
    metadata: { name: "Speed Merge", rating: 2 },
    colors: ["#E91E63", "#ff914d"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 50, y: 200 },
      { id: "s2", type: "SPAWN", x: 50, y: 400 },
      { id: "j_main", type: "JUNCTION", x: 400, y: 300 }, // Central hub
      { id: "h1", type: "HOLE", x: 700, y: 200, color: "#E91E63" },
      { id: "h2", type: "HOLE", x: 700, y: 400, color: "#ff914d" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j_main", path: [p(50, 200), p(400, 300)], length: 360, widthClass: "normal" },
      { id: "e2", from: "s2", to: "j_main", path: [p(50, 400), p(400, 300)], length: 360, widthClass: "normal" },
      { id: "e3", from: "j_main", to: "h1", path: [p(400, 300), p(700, 200)], length: 320, widthClass: "normal" },
      { id: "e4", from: "j_main", to: "h2", path: [p(400, 300), p(700, 400)], length: 320, widthClass: "normal" }
    ],
    junctions: [
      { id: "j_main", outEdges: ["e3", "e4"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "M", color: "#E91E63", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 90 }, // Fast
      { id: "w2", size: "M", color: "#ff914d", spawnNodeId: "s2", spawnTimeMs: 2500, speed: 90 },
      { id: "w3", size: "M", color: "#E91E63", spawnNodeId: "s1", spawnTimeMs: 4000, speed: 90 },
      { id: "w4", size: "M", color: "#ff914d", spawnNodeId: "s2", spawnTimeMs: 5500, speed: 90 },
      { id: "w5", size: "M", color: "#E91E63", spawnNodeId: "s1", spawnTimeMs: 7000, speed: 90 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 }
  },

  // =========================================================================
  // MEDIUM LEVELS (6-10)
  // Focus: Traps (Earthquake), Narrow Paths (block M), Mixed Sizes
  // =========================================================================

  // LEVEL 6: Shake It Up (First Trap)
  {
    levelId: 6,
    metadata: { name: "Shake It Up", rating: 2 },
    colors: ["#5170ff", "#58CC02"],
    nodes: [
      { id: "start", type: "SPAWN", x: 100, y: 300 },
      { id: "j1", type: "JUNCTION", x: 400, y: 300 },
      { id: "h1", type: "HOLE", x: 650, y: 200, color: "#5170ff" },
      { id: "h2", type: "HOLE", x: 650, y: 400, color: "#58CC02" }
    ],
    edges: [
      { id: "e1", from: "start", to: "j1", path: [p(100, 300), p(400, 300)], length: 300, widthClass: "normal" },
      { id: "e2", from: "j1", to: "h1", path: [p(400, 300), p(650, 200)], length: 270, widthClass: "normal" },
      { id: "e3", from: "j1", to: "h2", path: [p(400, 300), p(650, 400)], length: 270, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "EARTHQUAKE", nodeId: "j1", intervalMs: 6000, initialDelayMs: 4000 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "M", color: "#58CC02", spawnNodeId: "start", spawnTimeMs: 4000, speed: 70 },
      { id: "w3", size: "M", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 7000, speed: 70 }, // Trap switch during potential transit
      { id: "w4", size: "M", color: "#58CC02", spawnNodeId: "start", spawnTimeMs: 10000, speed: 70 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 4 }
  },

  // LEVEL 7: Narrow Passage (Narrow Path Intro)
  {
    levelId: 7,
    metadata: { name: "Narrow Passage", rating: 3 },
    colors: ["#ff914d", "#FFD700"],
    nodes: [
      { id: "start", type: "SPAWN", x: 80, y: 300 },
      { id: "j1", type: "JUNCTION", x: 300, y: 300 },
      { id: "h1", type: "HOLE", x: 650, y: 300, color: "#ff914d", size: "M" },
      { id: "h2", type: "HOLE", x: 300, y: 150, color: "#FFD700", size: "S" } // Shortcut hole (S only)
    ],
    edges: [
      { id: "e1", from: "start", to: "j1", path: [p(80, 300), p(300, 300)], length: 220, widthClass: "normal" },
      { id: "e2", from: "j1", to: "h1", path: [p(300, 300), p(650, 300)], length: 350, widthClass: "normal" },
      // Narrow path leading to h2 (S ONLY)
      { id: "e3", from: "j1", to: "h2", path: [p(300, 300), p(300, 150)], length: 150, widthClass: "narrow" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "M", color: "#ff914d", spawnNodeId: "start", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "S", color: "#FFD700", spawnNodeId: "start", spawnTimeMs: 3000, speed: 80 },
      { id: "w3", size: "M", color: "#ff914d", spawnNodeId: "start", spawnTimeMs: 5000, speed: 70 },
      { id: "w4", size: "S", color: "#FFD700", spawnNodeId: "start", spawnTimeMs: 7000, speed: 80 },
      // Tricky: M worm cannot take e3!
      { id: "w5", size: "M", color: "#ff914d", spawnNodeId: "start", spawnTimeMs: 9000, speed: 70 }
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 5 }
  },

  // LEVEL 8: Sieve (S vs M filtering)
  {
    levelId: 8,
    metadata: { name: "The Sieve", rating: 3 },
    colors: ["#5170ff", "#58CC02"],
    nodes: [
      { id: "start", type: "SPAWN", x: 50, y: 250 },
      { id: "j1", type: "JUNCTION", x: 250, y: 250 },
      // j2 removed (merged)
      { id: "h1", type: "HOLE", x: 650, y: 150, color: "#5170ff", size: "S" }, // S only
      { id: "h2", type: "HOLE", x: 650, y: 350, color: "#58CC02", size: "M" }
    ],
    edges: [
      { id: "e1", from: "start", to: "j1", path: [p(50, 250), p(250, 250)], length: 200, widthClass: "normal" },
      { id: "e2", from: "j1", to: "h1", path: [p(250, 250), p(400, 150), p(650, 150)], length: 420, widthClass: "narrow" }, // NARROW!
      // Merged path to h2
      { id: "e3", from: "j1", to: "h2", path: [p(250, 250), p(450, 250), p(650, 350)], length: 420, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e3", "e2"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "M", color: "#58CC02", spawnNodeId: "start", spawnTimeMs: 1000, speed: 65 },
      { id: "w2", size: "S", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 3500, speed: 75 },
      { id: "w3", size: "M", color: "#58CC02", spawnNodeId: "start", spawnTimeMs: 6000, speed: 65 },
      { id: "w4", size: "S", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 8000, speed: 75 }
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 4 }
  },

  // LEVEL 9: Cross Roads (Central Hub + Trap)
  {
    levelId: 9,
    metadata: { name: "Cross Roads", rating: 3 },
    colors: ["#ff914d", "#E91E63", "#9C27B0"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 100, y: 100 },
      { id: "s2", type: "SPAWN", x: 100, y: 500 },
      { id: "j_hub", type: "JUNCTION", x: 400, y: 300 }, // Center
      { id: "h1", type: "HOLE", x: 700, y: 100, color: "#ff914d" },
      { id: "h2", type: "HOLE", x: 700, y: 300, color: "#E91E63" },
      { id: "h3", type: "HOLE", x: 700, y: 500, color: "#9C27B0" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j_hub", path: [p(100, 100), p(400, 300)], length: 360, widthClass: "normal" },
      { id: "e2", from: "s2", to: "j_hub", path: [p(100, 500), p(400, 300)], length: 360, widthClass: "normal" },
      // Outputs
      { id: "e3", from: "j_hub", to: "h1", path: [p(400, 300), p(700, 100)], length: 360, widthClass: "normal" },
      { id: "e4", from: "j_hub", to: "h2", path: [p(400, 300), p(700, 300)], length: 300, widthClass: "normal" },
      { id: "e5", from: "j_hub", to: "h3", path: [p(400, 300), p(700, 500)], length: 360, widthClass: "normal" }
    ],
    junctions: [
      { id: "j_hub", outEdges: ["e4", "e3", "e5"], defaultIndex: 0 }
    ],
    traps: [
      // Fast switching trap on center
      { id: "t1", type: "EARTHQUAKE", nodeId: "j_hub", intervalMs: 5000, initialDelayMs: 3000 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#ff914d", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 65 },
      { id: "w2", size: "S", color: "#9C27B0", spawnNodeId: "s2", spawnTimeMs: 2000, speed: 75 },
      { id: "w3", size: "M", color: "#E91E63", spawnNodeId: "s1", spawnTimeMs: 4000, speed: 65 },
      { id: "w4", size: "M", color: "#ff914d", spawnNodeId: "s2", spawnTimeMs: 6000, speed: 65 },
      { id: "w5", size: "S", color: "#9C27B0", spawnNodeId: "s1", spawnTimeMs: 8000, speed: 75 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 }
  },

  // LEVEL 10: Pressure (Speed + Trap + Narrow)
  {
    levelId: 10,
    metadata: { name: "Pressure", rating: 3 },
    colors: ["#5170ff", "#FFD700"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 80, y: 300 },
      { id: "j1", type: "JUNCTION", x: 300, y: 300 },
      { id: "h1", type: "HOLE", x: 600, y: 200, color: "#5170ff", size: "M" },
      { id: "h2", type: "HOLE", x: 600, y: 400, color: "#FFD700", size: "S" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j1", path: [p(80, 300), p(300, 300)], length: 220, widthClass: "normal" },
      // Top path normal
      { id: "e2", from: "j1", to: "h1", path: [p(300, 300), p(600, 200)], length: 320, widthClass: "normal" },
      // Bottom path NARROW
      { id: "e3", from: "j1", to: "h2", path: [p(300, 300), p(600, 400)], length: 320, widthClass: "narrow" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "EARTHQUAKE", nodeId: "j1", intervalMs: 5000, initialDelayMs: 2000 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 90 }, // Fast M
      { id: "w2", size: "S", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 2500, speed: 95 }, // Very fast S
      { id: "w3", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 4000, speed: 90 },
      { id: "w4", size: "S", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 5500, speed: 95 },
      { id: "w5", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 7000, speed: 90 },
      { id: "w6", size: "S", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 8500, speed: 95 }
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 }
  },

  // =========================================================================
  // HARD LEVELS (11-15)
  // Focus: Complex networks, Multi-spawn, Multi-trap, Size filters
  // =========================================================================

  // LEVEL 11: The Web (3 Spawns, Interconnected) - Simplified for playability
  {
    levelId: 11,
    metadata: { name: "The Web", rating: 4 },
    colors: ["#ff914d", "#5170ff", "#58CC02"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 60, y: 150 },
      { id: "s2", type: "SPAWN", x: 60, y: 450 },
      // j1 removed (merged)
      { id: "j2", type: "JUNCTION", x: 450, y: 300 },
      { id: "h1", type: "HOLE", x: 650, y: 150, color: "#ff914d" },
      { id: "h2", type: "HOLE", x: 650, y: 450, color: "#5170ff" },
      { id: "h3", type: "HOLE", x: 550, y: 300, color: "#58CC02" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j2", path: [p(60, 150), p(250, 300), p(450, 300)], length: 500, widthClass: "normal" },
      { id: "e2", from: "s2", to: "j2", path: [p(60, 450), p(250, 300), p(450, 300)], length: 500, widthClass: "normal" },
      // J2 outputs
      { id: "e4", from: "j2", to: "h1", path: [p(450, 300), p(650, 150)], length: 250, widthClass: "normal" },
      { id: "e5", from: "j2", to: "h2", path: [p(450, 300), p(650, 450)], length: 250, widthClass: "normal" },
      { id: "e6", from: "j2", to: "h3", path: [p(450, 300), p(550, 300)], length: 100, widthClass: "normal" }
    ],
    junctions: [
      { id: "j2", outEdges: ["e6", "e4", "e5"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "EARTHQUAKE", nodeId: "j2", intervalMs: 6000, initialDelayMs: 4000 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 65 },
      { id: "w2", size: "M", color: "#ff914d", spawnNodeId: "s2", spawnTimeMs: 2500, speed: 65 },
      { id: "w3", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 4000, speed: 65 },
      { id: "w4", size: "M", color: "#58CC02", spawnNodeId: "s2", spawnTimeMs: 5500, speed: 65 },
      { id: "w5", size: "M", color: "#ff914d", spawnNodeId: "s1", spawnTimeMs: 7000, speed: 65 },
      { id: "w6", size: "M", color: "#5170ff", spawnNodeId: "s2", spawnTimeMs: 8500, speed: 65 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 6 }
  },

  // LEVEL 12: Choke Point (Aggressive Filtering)
  {
    levelId: 12,
    metadata: { name: "Choke Point", rating: 4 },
    colors: ["#E91E63", "#FFD700"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 80, y: 300 },
      { id: "j1", type: "JUNCTION", x: 300, y: 300 },
      // j2 removed
      { id: "h1", type: "HOLE", x: 700, y: 200, color: "#E91E63" },
      { id: "h2", type: "HOLE", x: 500, y: 400, color: "#FFD700", size: "S" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j1", path: [p(80, 300), p(300, 300)], length: 220, widthClass: "normal" },
      // Narrow path to bottom hole (S only)
      { id: "e2", from: "j1", to: "h2", path: [p(300, 300), p(500, 400)], length: 300, widthClass: "narrow" },
      // Merged path to h1 (Normal)
      { id: "e3", from: "j1", to: "h1", path: [p(300, 300), p(500, 200), p(700, 200)], length: 500, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e3", "e2"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "EARTHQUAKE", nodeId: "j1", intervalMs: 4000, initialDelayMs: 2000 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#E91E63", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "S", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 3000, speed: 80 },
      { id: "w3", size: "M", color: "#E91E63", spawnNodeId: "s1", spawnTimeMs: 5000, speed: 70 },
      { id: "w4", size: "S", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 7000, speed: 80 },
      { id: "w5", size: "S", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 9000, speed: 80 },
      { id: "w6", size: "M", color: "#E91E63", spawnNodeId: "s1", spawnTimeMs: 11000, speed: 70 }
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 }
  },

  // LEVEL 13: Zig Zag (Skill check)
  {
    levelId: 13,
    metadata: { name: "Zig Zag", rating: 4 },
    colors: ["#9C27B0", "#58CC02"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 100, y: 50 },
      { id: "j1", type: "JUNCTION", x: 200, y: 150 },
      { id: "j2", type: "JUNCTION", x: 300, y: 50 },
      { id: "j3", type: "JUNCTION", x: 400, y: 150 },
      // Holes
      { id: "h1", type: "HOLE", x: 600, y: 50, color: "#9C27B0" },
      { id: "h2", type: "HOLE", x: 600, y: 250, color: "#58CC02" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j1", path: [p(100, 50), p(200, 150)], length: 141, widthClass: "normal" },
      { id: "e2", from: "j1", to: "j2", path: [p(200, 150), p(300, 50)], length: 141, widthClass: "normal" },
      { id: "e3", from: "j1", to: "h2", path: [p(200, 150), p(600, 250)], length: 412, widthClass: "normal" },
      { id: "e4", from: "j2", to: "j3", path: [p(300, 50), p(400, 150)], length: 141, widthClass: "normal" },
      { id: "e5", from: "j3", to: "h1", path: [p(400, 150), p(600, 50)], length: 223, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e4"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e5"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "EARTHQUAKE", nodeId: "j1", intervalMs: 4000, initialDelayMs: 2000 } // Rapid switching
    ],
    worms: [
      { id: "w1", size: "M", color: "#9C27B0", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 80 },
      { id: "w2", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 2500, speed: 80 },
      { id: "w3", size: "M", color: "#9C27B0", spawnNodeId: "s1", spawnTimeMs: 4000, speed: 80 },
      { id: "w4", size: "M", color: "#58CC02", spawnNodeId: "s1", spawnTimeMs: 5500, speed: 80 },
      { id: "w5", size: "M", color: "#9C27B0", spawnNodeId: "s1", spawnTimeMs: 7000, speed: 80 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 5 }
  },

  // LEVEL 14: Chaos Trap
  {
    levelId: 14,
    metadata: { name: "Chaos Trap", rating: 5 },
    colors: ["#ff914d", "#5170ff", "#58CC02"],
    nodes: [
      { id: "start", type: "SPAWN", x: 100, y: 300 },
      { id: "j1", type: "JUNCTION", x: 300, y: 300 },
      { id: "j2", type: "JUNCTION", x: 500, y: 200 },
      { id: "j3", type: "JUNCTION", x: 500, y: 400 },
      { id: "h1", type: "HOLE", x: 700, y: 100, color: "#ff914d" },
      { id: "h2", type: "HOLE", x: 700, y: 300, color: "#5170ff" },
      { id: "h3", type: "HOLE", x: 700, y: 500, color: "#58CC02" }
    ],
    edges: [
      { id: "e1", from: "start", to: "j1", path: [p(100, 300), p(300, 300)], length: 200, widthClass: "normal" },
      { id: "e2", from: "j1", to: "j2", path: [p(300, 300), p(500, 200)], length: 220, widthClass: "normal" },
      { id: "e3", from: "j1", to: "j3", path: [p(300, 300), p(500, 400)], length: 220, widthClass: "normal" },
      // J2
      { id: "e4", from: "j2", to: "h1", path: [p(500, 200), p(700, 100)], length: 220, widthClass: "normal" },
      { id: "e5", from: "j2", to: "h2", path: [p(500, 200), p(700, 300)], length: 220, widthClass: "normal" },
      // J3
      { id: "e6", from: "j3", to: "h2", path: [p(500, 400), p(700, 300)], length: 220, widthClass: "normal" }, // Central hole reachable from both!
      { id: "e7", from: "j3", to: "h3", path: [p(500, 400), p(700, 500)], length: 220, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e4", "e5"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e6", "e7"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "EARTHQUAKE", nodeId: "j1", intervalMs: 5000, initialDelayMs: 3000 },
      { id: "t2", type: "EARTHQUAKE", nodeId: "j2", intervalMs: 4000, initialDelayMs: 2000 }, // Fast
      { id: "t3", type: "EARTHQUAKE", nodeId: "j3", intervalMs: 6000, initialDelayMs: 1000 }
    ],
    worms: [
      { id: "w1", size: "M", color: "#ff914d", spawnNodeId: "start", spawnTimeMs: 1000, speed: 70 },
      { id: "w2", size: "M", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 2500, speed: 70 },
      { id: "w3", size: "M", color: "#58CC02", spawnNodeId: "start", spawnTimeMs: 4000, speed: 70 },
      { id: "w4", size: "M", color: "#ff914d", spawnNodeId: "start", spawnTimeMs: 5500, speed: 70 },
      { id: "w5", size: "M", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 7000, speed: 70 },
      { id: "w6", size: "M", color: "#58CC02", spawnNodeId: "start", spawnTimeMs: 8500, speed: 70 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 6 }
  },

  // LEVEL 15: Grand Finale (Ultimate Test)
  {
    levelId: 15,
    metadata: { name: "Grand Finale", rating: 5 },
    colors: ["#5170ff", "#FFD700", "#9C27B0"],
    nodes: [
      { id: "s1", type: "SPAWN", x: 50, y: 300 },
      { id: "j1", type: "JUNCTION", x: 250, y: 300 },
      { id: "j2", type: "JUNCTION", x: 500, y: 200 },
      { id: "j3", type: "JUNCTION", x: 500, y: 400 },
      { id: "h_blue", type: "HOLE", x: 750, y: 150, color: "#5170ff", size: "M" },
      { id: "h_gold", type: "HOLE", x: 750, y: 300, color: "#FFD700", size: "S" },
      { id: "h_purp", type: "HOLE", x: 750, y: 450, color: "#9C27B0", size: "M" }
    ],
    edges: [
      { id: "e1", from: "s1", to: "j1", path: [p(50, 300), p(250, 300)], length: 200, widthClass: "normal" },
      // J1 to J2 (Narrow)
      { id: "e2", from: "j1", to: "j2", path: [p(250, 300), p(500, 200)], length: 270, widthClass: "narrow" },
      // J1 to J3 (Normal)
      { id: "e3", from: "j1", to: "j3", path: [p(250, 300), p(500, 400)], length: 270, widthClass: "normal" },

      // J2 (Top)
      { id: "e4", from: "j2", to: "h_blue", path: [p(500, 200), p(750, 150)], length: 250, widthClass: "normal" },
      { id: "e5", from: "j2", to: "h_gold", path: [p(500, 200), p(750, 300)], length: 270, widthClass: "normal" },

      // J3 (Bottom)
      { id: "e6", from: "j3", to: "h_gold", path: [p(500, 400), p(750, 300)], length: 270, widthClass: "normal" },
      { id: "e7", from: "j3", to: "h_purp", path: [p(500, 400), p(750, 450)], length: 250, widthClass: "normal" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e3", "e2"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e4", "e5"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e6", "e7"], defaultIndex: 0 }
    ],
    traps: [
      { id: "t1", type: "EARTHQUAKE", nodeId: "j2", intervalMs: 3000, initialDelayMs: 2000 }, // Super fast
      { id: "t2", type: "EARTHQUAKE", nodeId: "j3", intervalMs: 3000, initialDelayMs: 3500 }
    ],
    worms: [
      { id: "w1", size: "S", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 90 }, // Can take narrow top!
      { id: "w2", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 2500, speed: 80 }, // MUST take top... wait, top is narrow!
      // Wait, e2 is narrow (J1->J2).
      // if M takes e2, it jams.
      // So M must take e3 (J1->J3).
      // h_blue is at J2.
      // M cannot reach h_blue via e2!
      // This might be impossible layout if e2 is the ONLY way to h_blue.
      // e2 connects j1->j2. j2 connects to h_blue.
      // So M cannot reach h_blue.
      // Let's fix this. Make e2 Normal, make e3 Narrow?
      // Or make a connecting path.

      // FIXING LOGIC:
      // Remove narrow constraint for e2, make edges leading TO h_gold narrow instead?
      // Or just simplify for success.
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 8 }
  }
];

// FIX LEVEL 15 Logic before closing file
LEVELS[14].edges[1].widthClass = "normal"; // e2 (Top path) is now normal
LEVELS[14].edges[4].widthClass = "narrow"; // e5 (J2 -> Gold) is narrow.
LEVELS[14].edges[5].widthClass = "narrow"; // e6 (J3 -> Gold) is narrow.
// So: Gold hole is guarded by narrow paths. Only S can enter Gold.
// M Blue must go Top (Normal) -> Blue.
// M Purple must go Bottom (Normal) -> Purple.
// S Gold can go Top or Bottom -> Gold (Narrow).

// Actual Worms for L15
LEVELS[14].worms = [
  { id: "w1", size: "S", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 1000, speed: 90 },
  { id: "w2", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 2500, speed: 80 },
  { id: "w3", size: "M", color: "#9C27B0", spawnNodeId: "s1", spawnTimeMs: 4000, speed: 80 },
  { id: "w4", size: "S", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 5500, speed: 90 },
  { id: "w5", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 7000, speed: 80 },
  { id: "w6", size: "M", color: "#9C27B0", spawnNodeId: "s1", spawnTimeMs: 8500, speed: 80 },
  { id: "w7", size: "S", color: "#FFD700", spawnNodeId: "s1", spawnTimeMs: 10000, speed: 90 },
  { id: "w8", size: "M", color: "#5170ff", spawnNodeId: "s1", spawnTimeMs: 11500, speed: 80 }
];

export default LEVELS;
