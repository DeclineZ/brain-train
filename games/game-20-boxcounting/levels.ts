// Box Counting Game — Level Configurations (Redesigned)
// 30 levels: L1-15 = 3D isometric, L16-30 = 2D orthographic views
// Each level has 2 puzzles

export interface Block3D {
    x: number;
    y: number;
    z: number;  // 0 = ground level
}

export interface Puzzle3D {
    blocks: Block3D[];
    answer: number;
}

export interface Puzzle2D {
    heightMap: number[][];
    answer: number;
}

export interface Level3DConfig {
    level: number;
    name: string;
    mode: '3d';
    gridSize: number;
    puzzles: [Puzzle3D, Puzzle3D];
    timeLimitSeconds: number;
}

export interface Level2DConfig {
    level: number;
    name: string;
    mode: '2d';
    puzzles: [Puzzle2D, Puzzle2D];
    timeLimitSeconds: number;
}

export type BoxCountingLevelConfig = Level3DConfig | Level2DConfig;

// Color palette for 3D cubes — assigned by height layer
export const CUBE_COLORS = [
    { top: 0x6EE788, left: 0x3CB850, right: 0x2D9A3E },  // z=0 green
    { top: 0xFF7DAA, left: 0xE8508A, right: 0xCC3D73 },  // z=1 pink/magenta
    { top: 0xFFE066, left: 0xE6C84D, right: 0xCCAA33 },  // z=2 yellow
    { top: 0x7DD8FB, left: 0x42B4E8, right: 0x2EA0D6 },  // z=3 blue
    { top: 0xC278E8, left: 0x9B45C9, right: 0x8739B4 },  // z=4 purple
];

// Helper: generate rectangle layer blocks
function rect(x0: number, y0: number, z: number, w: number, d: number): Block3D[] {
    const b: Block3D[] = [];
    for (let y = y0; y < y0 + d; y++)
        for (let x = x0; x < x0 + w; x++)
            b.push({ x, y, z });
    return b;
}

// ============ 30 LEVELS ============

export const BOXCOUNTING_LEVELS: Record<number, BoxCountingLevelConfig> = {

    // ═══ Phase 1: 3D Isometric (L1–15) ═══

    1: {
        level: 1, name: 'เริ่มต้น', mode: '3d',
        gridSize: 3, timeLimitSeconds: 30,
        puzzles: [
            { blocks: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }], answer: 3 },
            { blocks: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }], answer: 2 },
        ],
    },
    2: {
        level: 2, name: 'สี่เหลี่ยม', mode: '3d',
        gridSize: 3, timeLimitSeconds: 30,
        puzzles: [
            { blocks: [...rect(0, 0, 0, 2, 2)], answer: 4 },
            { blocks: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }], answer: 5 },
        ],
    },
    3: {
        level: 3, name: 'ตัวแอล', mode: '3d',
        gridSize: 3, timeLimitSeconds: 30,
        puzzles: [
            {
                blocks: [
                    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 },
                    { x: 0, y: 1, z: 0 }, { x: 0, y: 2, z: 0 },
                ], answer: 5
            },
            {
                blocks: [
                    { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 },
                ], answer: 4
            },
        ],
    },
    4: {
        level: 4, name: 'ซ้อนกัน!', mode: '3d',
        gridSize: 3, timeLimitSeconds: 28,
        puzzles: [
            {
                blocks: [
                    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 },
                    { x: 1, y: 0, z: 1 },
                ], answer: 4
            },
            {
                blocks: [
                    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 },
                    { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
                ], answer: 5
            },
        ],
    },
    5: {
        level: 5, name: 'มองให้ดี', mode: '3d',
        gridSize: 3, timeLimitSeconds: 28,
        puzzles: [
            {
                blocks: [
                    ...rect(0, 0, 0, 2, 2),
                    { x: 0, y: 0, z: 1 },
                ], answer: 5
            },
            {
                blocks: [
                    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 },
                    { x: 0, y: 1, z: 0 },
                    { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
                ], answer: 6
            },
        ],
    },
    6: {
        level: 6, name: 'กว้างขึ้น', mode: '3d',
        gridSize: 4, timeLimitSeconds: 28,
        puzzles: [
            { blocks: [...rect(0, 0, 0, 3, 2)], answer: 6 },
            {
                blocks: [
                    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 3, y: 0, z: 0 },
                    { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 },
                ], answer: 7
            },
        ],
    },
    7: {
        level: 7, name: 'ตัวแอลซ้อน', mode: '3d',
        gridSize: 4, timeLimitSeconds: 26,
        puzzles: [
            {
                blocks: [
                    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 },
                    { x: 0, y: 1, z: 0 },
                    { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
                    { x: 0, y: 1, z: 1 },
                ], answer: 7
            },
            {
                blocks: [
                    ...rect(0, 0, 0, 3, 2),
                    { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
                ], answer: 8
            },
        ],
    },
    8: {
        level: 8, name: 'บันได', mode: '3d',
        gridSize: 4, timeLimitSeconds: 26,
        puzzles: [
            {
                blocks: [
                    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 },
                    { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
                    { x: 0, y: 0, z: 2 },
                ], answer: 6
            },
            {
                blocks: [
                    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 3, y: 0, z: 0 },
                    { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
                    { x: 0, y: 0, z: 2 },
                ], answer: 7
            },
        ],
    },
    9: {
        level: 9, name: 'ฐานกว้าง', mode: '3d',
        gridSize: 4, timeLimitSeconds: 24,
        puzzles: [
            {
                blocks: [
                    ...rect(0, 0, 0, 3, 3),
                    { x: 1, y: 1, z: 1 },
                ], answer: 10
            },
            {
                blocks: [
                    ...rect(0, 0, 0, 3, 2),
                    ...rect(0, 0, 1, 2, 2),
                ], answer: 10
            },
        ],
    },
    10: {
        level: 10, name: 'ปิรามิดเล็ก', mode: '3d',
        gridSize: 4, timeLimitSeconds: 24,
        puzzles: [
            {
                blocks: [
                    ...rect(0, 0, 0, 3, 2),
                    { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }, { x: 0, y: 1, z: 1 },
                    { x: 0, y: 0, z: 2 },
                ], answer: 10
            },
            {
                blocks: [
                    ...rect(0, 0, 0, 3, 2),
                    { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
                    { x: 0, y: 0, z: 2 },
                ], answer: 9
            },
        ],
    },
    11: {
        level: 11, name: 'สองชั้น', mode: '3d',
        gridSize: 5, timeLimitSeconds: 22,
        puzzles: [
            {
                blocks: [
                    ...rect(0, 0, 0, 3, 3),
                    ...rect(0, 0, 1, 2, 2),
                ], answer: 13
            },
            {
                blocks: [
                    ...rect(0, 0, 0, 4, 2),
                    { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }, { x: 0, y: 1, z: 1 },
                ], answer: 11
            },
        ],
    },
    12: {
        level: 12, name: 'สามชั้น', mode: '3d',
        gridSize: 5, timeLimitSeconds: 22,
        puzzles: [
            {
                blocks: [
                    ...rect(0, 0, 0, 3, 2),
                    ...rect(0, 0, 1, 2, 2),
                    { x: 0, y: 0, z: 2 }, { x: 1, y: 0, z: 2 },
                ], answer: 12
            },
            {
                blocks: [
                    ...rect(0, 0, 0, 3, 2),
                    ...rect(0, 0, 1, 2, 2),
                    { x: 0, y: 0, z: 2 }, { x: 1, y: 0, z: 2 },
                    { x: 0, y: 1, z: 2 }, { x: 1, y: 1, z: 2 },
                ], answer: 14
            },
        ],
    },
    13: {
        level: 13, name: 'บันไดใหญ่', mode: '3d',
        gridSize: 5, timeLimitSeconds: 20,
        puzzles: [
            {
                blocks: [
                    { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 3, y: 0, z: 0 },
                    { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 1, z: 0 },
                    { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }, { x: 2, y: 0, z: 1 },
                    { x: 0, y: 1, z: 1 },
                    { x: 0, y: 0, z: 2 }, { x: 1, y: 0, z: 2 },
                    { x: 0, y: 0, z: 3 },
                ], answer: 14
            },
            {
                blocks: [
                    ...rect(0, 0, 0, 3, 3),
                    ...rect(0, 0, 1, 2, 2),
                    { x: 0, y: 0, z: 2 },
                ], answer: 14
            },
        ],
    },
    14: {
        level: 14, name: 'ตึกใหญ่', mode: '3d',
        gridSize: 5, timeLimitSeconds: 20,
        puzzles: [
            {
                blocks: [
                    ...rect(0, 0, 0, 3, 4),
                    ...rect(0, 0, 1, 2, 2),
                    { x: 0, y: 0, z: 2 },
                ], answer: 17
            },
            {
                blocks: [
                    ...rect(0, 0, 0, 3, 3),
                    ...rect(0, 0, 1, 2, 2),
                    { x: 0, y: 0, z: 2 }, { x: 1, y: 0, z: 2 },
                ], answer: 15
            },
        ],
    },
    15: {
        level: 15, name: 'ปิรามิด', mode: '3d',
        gridSize: 5, timeLimitSeconds: 18,
        puzzles: [
            {
                blocks: [
                    ...rect(0, 0, 0, 4, 4),   // 16
                    ...rect(0, 0, 1, 3, 3),   // 9
                    ...rect(0, 0, 2, 2, 2),   // 4
                    { x: 0, y: 0, z: 3 },     // 1
                ], answer: 30
            },
            {
                blocks: [
                    ...rect(0, 0, 0, 5, 3),   // 15
                    ...rect(0, 0, 1, 4, 2),   // 8
                    ...rect(0, 0, 2, 3, 1),   // 3
                    { x: 0, y: 0, z: 3 }, { x: 1, y: 0, z: 3 },  // 2
                ], answer: 28
            },
        ],
    },

    // ═══ Phase 2: 2D Orthographic Views (L16–30) ═══
    // heightMap[row][col] = number of blocks stacked at that position

    16: {
        level: 16, name: 'มุมมองใหม่', mode: '2d',
        timeLimitSeconds: 35,
        puzzles: [
            { heightMap: [[1, 1], [1, 0]], answer: 3 },
            { heightMap: [[1, 1], [1, 1]], answer: 4 },
        ],
    },
    17: {
        level: 17, name: 'เริ่มซ้อน', mode: '2d',
        timeLimitSeconds: 35,
        puzzles: [
            { heightMap: [[2, 0], [1, 1]], answer: 4 },
            { heightMap: [[1, 1], [2, 1]], answer: 5 },
        ],
    },
    18: {
        level: 18, name: 'นึกภาพ', mode: '2d',
        timeLimitSeconds: 32,
        puzzles: [
            { heightMap: [[2, 1], [1, 1]], answer: 5 },
            { heightMap: [[2, 0], [1, 1]], answer: 4 },
        ],
    },
    19: {
        level: 19, name: 'กริด 3 ช่อง', mode: '2d',
        timeLimitSeconds: 32,
        puzzles: [
            { heightMap: [[1, 1, 0], [0, 1, 1], [0, 0, 1]], answer: 5 },
            { heightMap: [[1, 1, 1], [0, 1, 0], [0, 0, 0]], answer: 4 },
        ],
    },
    20: {
        level: 20, name: 'ลึกขึ้น', mode: '2d',
        timeLimitSeconds: 30,
        puzzles: [
            { heightMap: [[2, 1, 0], [1, 1, 0], [0, 1, 1]], answer: 7 },
            { heightMap: [[1, 0, 1], [2, 1, 0], [0, 1, 0]], answer: 6 },
        ],
    },
    21: {
        level: 21, name: 'กระจาย', mode: '2d',
        timeLimitSeconds: 30,
        puzzles: [
            { heightMap: [[2, 1, 1], [1, 2, 0], [1, 0, 1]], answer: 9 },
            { heightMap: [[1, 2, 1], [0, 1, 1], [1, 1, 0]], answer: 8 },
        ],
    },
    22: {
        level: 22, name: 'สูงขึ้น', mode: '2d',
        timeLimitSeconds: 28,
        puzzles: [
            { heightMap: [[3, 1, 0], [2, 1, 1], [1, 1, 1]], answer: 11 },
            { heightMap: [[2, 0, 1], [1, 3, 0], [0, 1, 2]], answer: 10 },
        ],
    },
    23: {
        level: 23, name: 'ซับซ้อน', mode: '2d',
        timeLimitSeconds: 28,
        puzzles: [
            { heightMap: [[3, 2, 1], [2, 1, 0], [1, 2, 1]], answer: 13 },
            { heightMap: [[1, 2, 0], [2, 3, 1], [0, 1, 2]], answer: 12 },
        ],
    },
    24: {
        level: 24, name: 'กริดกว้าง', mode: '2d',
        timeLimitSeconds: 26,
        puzzles: [
            { heightMap: [[1, 1, 0, 0], [2, 1, 1, 0], [0, 1, 1, 0], [0, 0, 1, 1]], answer: 10 },
            { heightMap: [[2, 1, 0, 0], [1, 1, 0, 0], [0, 1, 1, 1], [0, 0, 1, 2]], answer: 11 },
        ],
    },
    25: {
        level: 25, name: 'แนวทแยง', mode: '2d',
        timeLimitSeconds: 26,
        puzzles: [
            { heightMap: [[2, 1, 0, 0], [1, 2, 1, 0], [0, 1, 1, 1], [0, 0, 1, 2]], answer: 13 },
            { heightMap: [[1, 1, 1, 0], [0, 2, 1, 0], [0, 1, 2, 1], [0, 0, 0, 2]], answer: 12 },
        ],
    },
    26: {
        level: 26, name: 'ท้าทาย', mode: '2d',
        timeLimitSeconds: 24,
        puzzles: [
            { heightMap: [[3, 1, 0, 0], [2, 2, 1, 0], [0, 1, 2, 1], [0, 0, 1, 2]], answer: 16 },
            { heightMap: [[2, 1, 1, 0], [1, 2, 1, 0], [0, 1, 2, 1], [0, 0, 1, 2]], answer: 15 },
        ],
    },
    27: {
        level: 27, name: 'ยากขึ้น', mode: '2d',
        timeLimitSeconds: 24,
        puzzles: [
            { heightMap: [[3, 2, 1, 0], [2, 2, 1, 1], [1, 1, 2, 1], [0, 1, 1, 0]], answer: 19 },
            { heightMap: [[2, 2, 0, 0], [2, 3, 1, 0], [0, 1, 2, 1], [0, 0, 1, 2]], answer: 17 },
        ],
    },
    28: {
        level: 28, name: 'กริดยักษ์', mode: '2d',
        timeLimitSeconds: 22,
        puzzles: [
            { heightMap: [[1, 1, 0, 0, 0], [1, 2, 1, 0, 0], [0, 1, 2, 1, 0], [0, 0, 1, 1, 1], [0, 0, 0, 1, 1]], answer: 15 },
            { heightMap: [[2, 1, 0, 0, 0], [1, 1, 1, 0, 0], [0, 1, 1, 1, 0], [0, 0, 1, 1, 1], [0, 0, 0, 1, 1]], answer: 14 },
        ],
    },
    29: {
        level: 29, name: 'ท้าสมาธิ', mode: '2d',
        timeLimitSeconds: 22,
        puzzles: [
            { heightMap: [[2, 1, 0, 0, 0], [1, 3, 1, 0, 0], [0, 2, 2, 1, 0], [0, 0, 1, 2, 1], [0, 0, 0, 1, 2]], answer: 20 },
            { heightMap: [[1, 1, 0, 0, 0], [2, 2, 1, 0, 0], [0, 2, 2, 1, 0], [0, 0, 1, 2, 1], [0, 0, 0, 1, 1]], answer: 18 },
        ],
    },
    30: {
        level: 30, name: 'ตำนาน', mode: '2d',
        timeLimitSeconds: 20,
        puzzles: [
            { heightMap: [[4, 3, 1, 0, 0], [3, 2, 2, 1, 0], [1, 2, 2, 1, 0], [0, 1, 1, 1, 1], [0, 0, 0, 1, 0]], answer: 27 },
            { heightMap: [[3, 2, 1, 0, 0], [2, 3, 2, 1, 0], [1, 2, 1, 0, 0], [0, 1, 1, 1, 1], [0, 0, 0, 1, 2]], answer: 25 },
        ],
    },
};
