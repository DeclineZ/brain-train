import { LevelData } from './types/level';

// Helper to create simple points
const p = (x: number, y: number) => ({ x, y });

export const LEVELS: LevelData[] = [
  // ========================================
  // LEVEL 1: First Steps
  // - 3 colors, same size worms (M)
  // - Simple paths, 1 spawn, 1 junction
  // - No traps
  // ========================================
  {
    levelId: 1,
    metadata: { name: "First Steps", rating: 1 },
    colors: ["#ff914d", "#5170ff", "#58CC02"], // Orange, Blue, Green
    nodes: [
      { id: "start", type: "SPAWN", x: 100, y: 300 },
      { id: "j1", type: "JUNCTION", x: 400, y: 300 },
      { id: "hole_orange", type: "HOLE", x: 700, y: 150, color: "#ff914d" },
      { id: "hole_blue", type: "HOLE", x: 700, y: 300, color: "#5170ff" },
      { id: "hole_green", type: "HOLE", x: 700, y: 450, color: "#58CC02" }
    ],
    edges: [
      {
        id: "e1", from: "start", to: "j1",
        path: [p(100, 300), p(400, 300)],
        length: 300, widthClass: "normal"
      },
      {
        id: "e2", from: "j1", to: "hole_orange",
        path: [p(400, 300), p(550, 150), p(700, 150)],
        length: 320, widthClass: "normal"
      },
      {
        id: "e3", from: "j1", to: "hole_blue",
        path: [p(400, 300), p(700, 300)],
        length: 300, widthClass: "normal"
      },
      {
        id: "e4", from: "j1", to: "hole_green",
        path: [p(400, 300), p(550, 450), p(700, 450)],
        length: 320, widthClass: "normal"
      }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3", "e4"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "M", color: "#ff914d", spawnNodeId: "start", spawnTimeMs: 1000, speed: 100 },
      { id: "w2", size: "M", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 4000, speed: 100 },
      { id: "w3", size: "M", color: "#58CC02", spawnNodeId: "start", spawnTimeMs: 7000, speed: 100 }
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 3 },
    tunnelStyle: {
      innerColor: 0x2d5a27,
      outerColor: 0x4a8f42,
      innerAlpha: 1,
      outerAlpha: 1,
      widthMultiplier: 1.2
    }
  },

  // ========================================
  // LEVEL 2: Size Matters
  // - 5 colors, different worm sizes (S, M)
  // - 2 spawn points, narrow paths
  // - EARTHQUAKE trap with warning
  // ========================================
  {
    levelId: 2,
    metadata: { name: "Size Matters", rating: 2 },
    colors: ["#ff914d", "#5170ff", "#58CC02", "#FFD700", "#E91E63"], // Orange, Blue, Green, Yellow, Pink
    nodes: [
      // Spawn points
      { id: "spawn1", type: "SPAWN", x: 80, y: 200 },
      { id: "spawn2", type: "SPAWN", x: 80, y: 400 },
      // Junctions
      { id: "j1", type: "JUNCTION", x: 300, y: 200 },
      { id: "j2", type: "JUNCTION", x: 300, y: 400 },
      { id: "j3", type: "JUNCTION", x: 500, y: 300 },
      // Holes - different sizes
      { id: "hole_orange_M", type: "HOLE", x: 720, y: 100, color: "#ff914d", size: "M" },
      { id: "hole_blue_S", type: "HOLE", x: 720, y: 200, color: "#5170ff", size: "S" },
      { id: "hole_green_M", type: "HOLE", x: 720, y: 300, color: "#58CC02", size: "M" },
      { id: "hole_yellow_S", type: "HOLE", x: 720, y: 400, color: "#FFD700", size: "S" },
      { id: "hole_pink_M", type: "HOLE", x: 720, y: 500, color: "#E91E63", size: "M" }
    ],
    edges: [
      // Spawn to junction paths
      { id: "e1", from: "spawn1", to: "j1", path: [p(80, 200), p(300, 200)], length: 220, widthClass: "normal" },
      { id: "e2", from: "spawn2", to: "j2", path: [p(80, 400), p(300, 400)], length: 220, widthClass: "normal" },
      // Junction 1 paths
      { id: "e3", from: "j1", to: "hole_orange_M", path: [p(300, 200), p(500, 100), p(720, 100)], length: 350, widthClass: "normal" },
      { id: "e4", from: "j1", to: "j3", path: [p(300, 200), p(400, 250), p(500, 300)], length: 250, widthClass: "normal" },
      { id: "e5", from: "j1", to: "hole_blue_S", path: [p(300, 200), p(500, 200), p(720, 200)], length: 420, widthClass: "narrow" },
      // Junction 2 paths
      { id: "e6", from: "j2", to: "j3", path: [p(300, 400), p(400, 350), p(500, 300)], length: 250, widthClass: "normal" },
      { id: "e7", from: "j2", to: "hole_pink_M", path: [p(300, 400), p(500, 500), p(720, 500)], length: 350, widthClass: "normal" },
      { id: "e8", from: "j2", to: "hole_yellow_S", path: [p(300, 400), p(720, 400)], length: 420, widthClass: "narrow" },
      // Junction 3 paths (central hub)
      { id: "e9", from: "j3", to: "hole_green_M", path: [p(500, 300), p(720, 300)], length: 220, widthClass: "normal" },
      { id: "e10", from: "j3", to: "hole_blue_S", path: [p(500, 300), p(600, 250), p(720, 200)], length: 280, widthClass: "narrow" },
      { id: "e11", from: "j3", to: "hole_yellow_S", path: [p(500, 300), p(600, 350), p(720, 400)], length: 280, widthClass: "narrow" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e3", "e4", "e5"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e6", "e7", "e8"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e9", "e10", "e11"], defaultIndex: 0 }
    ],
    traps: [
      // EARTHQUAKE on junction 3 - switches every 8 seconds with 2 second warning
      { id: "trap1", type: "EARTHQUAKE", nodeId: "j3", intervalMs: 8000, initialDelayMs: 5000 }
    ],
    worms: [
      // From spawn1
      { id: "w1", size: "M", color: "#ff914d", spawnNodeId: "spawn1", spawnTimeMs: 1000, speed: 90 },
      { id: "w2", size: "S", color: "#5170ff", spawnNodeId: "spawn1", spawnTimeMs: 4000, speed: 110 },
      { id: "w3", size: "M", color: "#58CC02", spawnNodeId: "spawn1", spawnTimeMs: 7000, speed: 90 },
      // From spawn2
      { id: "w4", size: "S", color: "#FFD700", spawnNodeId: "spawn2", spawnTimeMs: 2500, speed: 110 },
      { id: "w5", size: "M", color: "#E91E63", spawnNodeId: "spawn2", spawnTimeMs: 5500, speed: 90 }
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 5 },
    tunnelStyle: {
      innerColor: 0x2d5a27,
      outerColor: 0x4a8f42,
      innerAlpha: 1,
      outerAlpha: 1,
      widthMultiplier: 1.2
    }
  },

  // ========================================
  // LEVEL 3: Chaos Control
  // - 6 colors, more worms, mixed sizes
  // - 3 spawn points, complex junctions
  // - Multiple EARTHQUAKE traps
  // ========================================
  {
    levelId: 3,
    metadata: { name: "Chaos Control", rating: 3 },
    colors: ["#ff914d", "#5170ff", "#58CC02", "#FFD700", "#E91E63", "#9C27B0"], // +Purple
    nodes: [
      // 3 Spawn points
      { id: "spawn1", type: "SPAWN", x: 60, y: 150 },
      { id: "spawn2", type: "SPAWN", x: 60, y: 300 },
      { id: "spawn3", type: "SPAWN", x: 60, y: 450 },
      // Junctions - more complex network
      { id: "j1", type: "JUNCTION", x: 220, y: 150 },
      { id: "j2", type: "JUNCTION", x: 220, y: 300 },
      { id: "j3", type: "JUNCTION", x: 220, y: 450 },
      { id: "j4", type: "JUNCTION", x: 450, y: 225 },
      { id: "j5", type: "JUNCTION", x: 450, y: 375 },
      { id: "j6", type: "JUNCTION", x: 600, y: 300 },
      // Holes - 6 colors, mixed sizes
      { id: "hole_orange_M", type: "HOLE", x: 740, y: 80, color: "#ff914d", size: "M" },
      { id: "hole_blue_S", type: "HOLE", x: 740, y: 160, color: "#5170ff", size: "S" },
      { id: "hole_green_M", type: "HOLE", x: 740, y: 240, color: "#58CC02", size: "M" },
      { id: "hole_yellow_S", type: "HOLE", x: 740, y: 320, color: "#FFD700", size: "S" },
      { id: "hole_pink_M", type: "HOLE", x: 740, y: 400, color: "#E91E63", size: "M" },
      { id: "hole_purple_S", type: "HOLE", x: 740, y: 480, color: "#9C27B0", size: "S" }
    ],
    edges: [
      // Spawn to first junction layer
      { id: "e1", from: "spawn1", to: "j1", path: [p(60, 150), p(220, 150)], length: 160, widthClass: "normal" },
      { id: "e2", from: "spawn2", to: "j2", path: [p(60, 300), p(220, 300)], length: 160, widthClass: "normal" },
      { id: "e3", from: "spawn3", to: "j3", path: [p(60, 450), p(220, 450)], length: 160, widthClass: "normal" },
      // J1 connections
      { id: "e4", from: "j1", to: "j4", path: [p(220, 150), p(350, 187), p(450, 225)], length: 250, widthClass: "normal" },
      { id: "e5", from: "j1", to: "hole_orange_M", path: [p(220, 150), p(480, 80), p(740, 80)], length: 520, widthClass: "normal" },
      { id: "e6", from: "j1", to: "hole_blue_S", path: [p(220, 150), p(480, 160), p(740, 160)], length: 520, widthClass: "narrow" },
      // J2 connections
      { id: "e7", from: "j2", to: "j4", path: [p(220, 300), p(335, 262), p(450, 225)], length: 250, widthClass: "normal" },
      { id: "e8", from: "j2", to: "j5", path: [p(220, 300), p(335, 337), p(450, 375)], length: 250, widthClass: "normal" },
      // J3 connections
      { id: "e9", from: "j3", to: "j5", path: [p(220, 450), p(350, 412), p(450, 375)], length: 250, widthClass: "normal" },
      { id: "e10", from: "j3", to: "hole_pink_M", path: [p(220, 450), p(480, 400), p(740, 400)], length: 520, widthClass: "normal" },
      { id: "e11", from: "j3", to: "hole_purple_S", path: [p(220, 450), p(480, 480), p(740, 480)], length: 520, widthClass: "narrow" },
      // J4 connections (upper mid)
      { id: "e12", from: "j4", to: "j6", path: [p(450, 225), p(525, 262), p(600, 300)], length: 180, widthClass: "normal" },
      { id: "e13", from: "j4", to: "hole_green_M", path: [p(450, 225), p(595, 232), p(740, 240)], length: 300, widthClass: "normal" },
      // J5 connections (lower mid)
      { id: "e14", from: "j5", to: "j6", path: [p(450, 375), p(525, 337), p(600, 300)], length: 180, widthClass: "normal" },
      { id: "e15", from: "j5", to: "hole_yellow_S", path: [p(450, 375), p(595, 347), p(740, 320)], length: 300, widthClass: "narrow" },
      // J6 connections (central final)
      { id: "e16", from: "j6", to: "hole_green_M", path: [p(600, 300), p(670, 270), p(740, 240)], length: 150, widthClass: "normal" },
      { id: "e17", from: "j6", to: "hole_yellow_S", path: [p(600, 300), p(670, 310), p(740, 320)], length: 150, widthClass: "narrow" }
    ],
    junctions: [
      { id: "j1", outEdges: ["e4", "e5", "e6"], defaultIndex: 0 },
      { id: "j2", outEdges: ["e7", "e8"], defaultIndex: 0 },
      { id: "j3", outEdges: ["e9", "e10", "e11"], defaultIndex: 0 },
      { id: "j4", outEdges: ["e12", "e13"], defaultIndex: 0 },
      { id: "j5", outEdges: ["e14", "e15"], defaultIndex: 0 },
      { id: "j6", outEdges: ["e16", "e17"], defaultIndex: 0 }
    ],
    traps: [
      { id: "trap1", type: "EARTHQUAKE", nodeId: "j4", intervalMs: 7000, initialDelayMs: 4000 },
      { id: "trap2", type: "EARTHQUAKE", nodeId: "j5", intervalMs: 6000, initialDelayMs: 6000 }
    ],
    worms: [
      // From spawn1 (top)
      { id: "w1", size: "M", color: "#ff914d", spawnNodeId: "spawn1", spawnTimeMs: 1000, speed: 85 },
      { id: "w2", size: "S", color: "#5170ff", spawnNodeId: "spawn1", spawnTimeMs: 4000, speed: 105 },
      // From spawn2 (middle)
      { id: "w3", size: "M", color: "#58CC02", spawnNodeId: "spawn2", spawnTimeMs: 2000, speed: 85 },
      { id: "w4", size: "S", color: "#FFD700", spawnNodeId: "spawn2", spawnTimeMs: 5000, speed: 105 },
      // From spawn3 (bottom)
      { id: "w5", size: "M", color: "#E91E63", spawnNodeId: "spawn3", spawnTimeMs: 3000, speed: 85 },
      { id: "w6", size: "S", color: "#9C27B0", spawnNodeId: "spawn3", spawnTimeMs: 6000, speed: 105 }
    ],
    rules: { blockLargeInNarrow: true, collisionFail: false },
    winCondition: { requiredCount: 6 },
    tunnelStyle: {
      innerColor: 0x2d5a27,
      outerColor: 0x4a8f42,
      innerAlpha: 1,
      outerAlpha: 1,
      widthMultiplier: 1.2
    }
  }
];

export default LEVELS;
