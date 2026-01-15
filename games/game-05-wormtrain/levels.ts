import { LevelData } from './types/level';

// Helper to create simple points
const p = (x: number, y: number) => ({ x, y });

export const LEVELS: LevelData[] = [
  {
    levelId: 1,
    metadata: { name: "First Steps", rating: 1 },
    colors: ["#ff914d", "#5170ff"], // Orange and Blue
    nodes: [
      { id: "start", type: "SPAWN", x: 100, y: 300 },
      { id: "j1", type: "JUNCTION", x: 400, y: 300 },
      { id: "end_orange", type: "HOLE", x: 700, y: 200, color: "#ff914d" },  // Orange hole
      { id: "end_blue", type: "HOLE", x: 700, y: 400, color: "#5170ff" }     // Blue hole
    ],
    edges: [
      {
        id: "e1", from: "start", to: "j1",
        path: [p(100, 300), p(400, 300)],
        length: 300, widthClass: "normal"
      },
      {
        id: "e2", from: "j1", to: "end_orange",
        path: [p(400, 300), p(550, 200), p(700, 200)],
        length: 320, widthClass: "normal"
      },
      {
        id: "e3", from: "j1", to: "end_blue",
        path: [p(400, 300), p(550, 400), p(700, 400)],
        length: 320, widthClass: "normal"
      }
    ],
    junctions: [
      { id: "j1", outEdges: ["e2", "e3"], defaultIndex: 0 }
    ],
    traps: [],
    worms: [
      { id: "w1", size: "M", color: "#ff914d", spawnNodeId: "start", spawnTimeMs: 1000, speed: 100 },  // Orange worm
      { id: "w2", size: "M", color: "#5170ff", spawnNodeId: "start", spawnTimeMs: 5000, speed: 100 }   // Blue worm
    ],
    rules: { blockLargeInNarrow: false, collisionFail: false },
    winCondition: { requiredCount: 2 },
    // Lumosity-style green organic tunnel look
    tunnelStyle: {
      innerColor: 0x2d5a27, // Dark green (tunnel floor)
      outerColor: 0x4a8f42, // Lighter green (border/depth)
      innerAlpha: 1,
      outerAlpha: 1,
      widthMultiplier: 1.2
    }
  }
];

export default LEVELS;
