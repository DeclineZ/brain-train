// Box Counting Game — Level Configurations
// 40 levels progressing from simple boxes to mixed shapes with multiple colors

export type ShapeType = 'box' | 'triangle' | 'mixed';
export type AskType = 'count_all' | 'count_shape' | 'count_color' | 'count_shape_color';

export interface BoxCountingLevelConfig {
    level: number;
    name: string;
    gridSize: number;          // 4, 5, 6, or 7
    shapeTypes: ShapeType;     // what shapes can appear
    minShapes: number;
    maxShapes: number;
    maxStack: number;          // max stacking height
    colorCount: number;        // 1 = single color, 2+ = multi-color
    askType: AskType;          // what the question asks
    timeLimitSeconds: number;
    description: string;
}

// Color palette for shapes
export const SHAPE_COLORS = {
    green: { name: 'สีเขียว', hex: 0x4CD964, top: 0x6EE788, left: 0x3CB850, right: 0x2D9A3E },
    blue: { name: 'สีน้ำเงิน', hex: 0x5AC8FA, top: 0x7DD8FB, left: 0x42B4E8, right: 0x2EA0D6 },
    orange: { name: 'สีส้ม', hex: 0xFF9500, top: 0xFFAD33, left: 0xE68500, right: 0xCC7600 },
    pink: { name: 'สีชมพู', hex: 0xFF2D55, top: 0xFF5C7A, left: 0xE6264C, right: 0xCC2043 },
    purple: { name: 'สีม่วง', hex: 0xAF52DE, top: 0xC278E8, left: 0x9B45C9, right: 0x8739B4 },
    yellow: { name: 'สีเหลือง', hex: 0xFFCC00, top: 0xFFD633, left: 0xE6B800, right: 0xCCA300 },
} as const;

export type ColorKey = keyof typeof SHAPE_COLORS;

export const COLOR_KEYS: ColorKey[] = ['green', 'blue', 'orange', 'pink', 'purple', 'yellow'];

// ============ 40 LEVELS ============
// askType guide:
//   count_all         = นับทั้งหมด
//   count_color       = นับเฉพาะสีที่ถาม (ไม่สนรูปทรง)
//   count_shape       = นับเฉพาะรูปทรงที่ถาม (ไม่สนสี) — ใช้กับ mixed + multi-color เพื่อหลอก
//   count_shape_color = นับเฉพาะรูปทรง+สีที่ถาม (เช่น สี่เหลี่ยมสีม่วง)

export const BOXCOUNTING_LEVELS: Record<number, BoxCountingLevelConfig> = {

    // ═══ Phase 1: Simple Boxes 4×4 (L1-5) ═══
    1: {
        level: 1, name: 'เริ่มต้น',
        gridSize: 4, shapeTypes: 'box',
        minShapes: 2, maxShapes: 3, maxStack: 1,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 30,
        description: 'นับกล่องง่ายๆ',
    },
    2: {
        level: 2, name: 'อุ่นเครื่อง',
        gridSize: 4, shapeTypes: 'box',
        minShapes: 3, maxShapes: 4, maxStack: 1,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 30,
        description: 'กล่องเพิ่มอีกนิด',
    },
    3: {
        level: 3, name: 'เริ่มคุ้นเคย',
        gridSize: 4, shapeTypes: 'box',
        minShapes: 4, maxShapes: 5, maxStack: 1,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 28,
        description: 'กล่องเริ่มเยอะขึ้น',
    },
    4: {
        level: 4, name: 'ซ้อนกัน!',
        gridSize: 4, shapeTypes: 'box',
        minShapes: 4, maxShapes: 6, maxStack: 2,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 28,
        description: 'กล่องเริ่มซ้อนกัน',
    },
    5: {
        level: 5, name: 'สังเกตดีๆ',
        gridSize: 4, shapeTypes: 'box',
        minShapes: 5, maxShapes: 7, maxStack: 2,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 26,
        description: 'นับทุกชิ้นนะ!',
    },

    // ═══ Phase 2: Box + bigger grid + stacking (L6-10) ═══
    6: {
        level: 6, name: 'กว้างขึ้น',
        gridSize: 5, shapeTypes: 'box',
        minShapes: 5, maxShapes: 8, maxStack: 2,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 26,
        description: 'กริดใหญ่ขึ้น!',
    },
    7: {
        level: 7, name: 'มากขึ้นเรื่อยๆ',
        gridSize: 5, shapeTypes: 'box',
        minShapes: 6, maxShapes: 9, maxStack: 2,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 24,
        description: 'กล่องเยอะขึ้นอีก',
    },
    8: {
        level: 8, name: 'สูงขึ้น',
        gridSize: 5, shapeTypes: 'box',
        minShapes: 7, maxShapes: 10, maxStack: 3,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 24,
        description: 'ซ้อน 3 ชั้นแล้ว!',
    },
    9: {
        level: 9, name: 'สีสัน',
        gridSize: 5, shapeTypes: 'box',
        minShapes: 8, maxShapes: 11, maxStack: 3,
        colorCount: 2, askType: 'count_color',
        timeLimitSeconds: 22,
        description: 'มี 2 สี! นับเฉพาะสีที่ถาม',
    },
    10: {
        level: 10, name: 'จำสีให้ดี',
        gridSize: 5, shapeTypes: 'box',
        minShapes: 9, maxShapes: 12, maxStack: 3,
        colorCount: 2, askType: 'count_color',
        timeLimitSeconds: 22,
        description: 'จำแนกสีแล้วนับ',
    },

    // ═══ Phase 3: Box on 6×6 (L11-15) ═══
    11: {
        level: 11, name: 'กริดใหญ่',
        gridSize: 6, shapeTypes: 'box',
        minShapes: 8, maxShapes: 12, maxStack: 3,
        colorCount: 2, askType: 'count_color',
        timeLimitSeconds: 22,
        description: 'กริด 6×6 แล้ว!',
    },
    12: {
        level: 12, name: 'ท้าทาย',
        gridSize: 6, shapeTypes: 'box',
        minShapes: 10, maxShapes: 14, maxStack: 3,
        colorCount: 2, askType: 'count_color',
        timeLimitSeconds: 20,
        description: 'กล่องเยอะมาก!',
    },
    13: {
        level: 13, name: 'สับสน',
        gridSize: 6, shapeTypes: 'box',
        minShapes: 10, maxShapes: 14, maxStack: 3,
        colorCount: 2, askType: 'count_color',
        timeLimitSeconds: 20,
        description: 'สังเกตสีให้ดี',
    },
    14: {
        level: 14, name: 'เต็มกริด',
        gridSize: 6, shapeTypes: 'box',
        minShapes: 12, maxShapes: 16, maxStack: 3,
        colorCount: 2, askType: 'count_color',
        timeLimitSeconds: 18,
        description: 'เยอะจนเต็มกริด!',
    },
    15: {
        level: 15, name: 'ตึกสูง',
        gridSize: 6, shapeTypes: 'box',
        minShapes: 12, maxShapes: 16, maxStack: 4,
        colorCount: 2, askType: 'count_color',
        timeLimitSeconds: 18,
        description: 'ซ้อน 4 ชั้น!',
    },

    // ═══ Phase 4: Triangles (L16-20) ═══
    16: {
        level: 16, name: 'สามเหลี่ยม!',
        gridSize: 5, shapeTypes: 'triangle',
        minShapes: 3, maxShapes: 5, maxStack: 1,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 26,
        description: 'รูปทรงใหม่! สามเหลี่ยม',
    },
    17: {
        level: 17, name: 'สามเหลี่ยมเพิ่ม',
        gridSize: 5, shapeTypes: 'triangle',
        minShapes: 4, maxShapes: 7, maxStack: 1,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 24,
        description: 'สามเหลี่ยมเยอะขึ้น',
    },
    18: {
        level: 18, name: 'ซ้อนสามเหลี่ยม',
        gridSize: 5, shapeTypes: 'triangle',
        minShapes: 5, maxShapes: 8, maxStack: 2,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 22,
        description: 'สามเหลี่ยมซ้อนกัน!',
    },
    19: {
        level: 19, name: 'กว้างกว่าเดิม',
        gridSize: 6, shapeTypes: 'triangle',
        minShapes: 6, maxShapes: 10, maxStack: 2,
        colorCount: 1, askType: 'count_all',
        timeLimitSeconds: 22,
        description: 'กริดใหญ่ + สามเหลี่ยม',
    },
    20: {
        level: 20, name: 'สามเหลี่ยมสี',
        gridSize: 6, shapeTypes: 'triangle',
        minShapes: 7, maxShapes: 11, maxStack: 2,
        colorCount: 2, askType: 'count_color',
        timeLimitSeconds: 20,
        description: 'สามเหลี่ยม 2 สี!',
    },

    // ═══ Phase 5: Mixed shapes, count by shape (L21-25) ═══
    21: {
        level: 21, name: 'ผสมกัน!',
        gridSize: 5, shapeTypes: 'mixed',
        minShapes: 4, maxShapes: 7, maxStack: 1,
        colorCount: 1, askType: 'count_shape',
        timeLimitSeconds: 24,
        description: 'นับเฉพาะรูปทรงที่ถาม',
    },
    22: {
        level: 22, name: 'แยกแยะ',
        gridSize: 5, shapeTypes: 'mixed',
        minShapes: 5, maxShapes: 8, maxStack: 1,
        colorCount: 1, askType: 'count_shape',
        timeLimitSeconds: 22,
        description: 'สังเกตรูปทรงให้ดี',
    },
    23: {
        level: 23, name: 'ผสมกริดใหญ่',
        gridSize: 6, shapeTypes: 'mixed',
        minShapes: 6, maxShapes: 10, maxStack: 2,
        colorCount: 1, askType: 'count_shape',
        timeLimitSeconds: 22,
        description: 'กริด 6×6 ผสมรูปทรง',
    },
    24: {
        level: 24, name: 'ซับซ้อน',
        gridSize: 6, shapeTypes: 'mixed',
        minShapes: 7, maxShapes: 11, maxStack: 2,
        colorCount: 1, askType: 'count_shape',
        timeLimitSeconds: 20,
        description: 'ซ้อน + ผสม',
    },
    25: {
        level: 25, name: 'หลายสีผสม',
        gridSize: 5, shapeTypes: 'mixed',
        minShapes: 6, maxShapes: 9, maxStack: 1,
        colorCount: 2, askType: 'count_shape',
        timeLimitSeconds: 22,
        description: 'ผสม 2 สี นับเฉพาะรูปทรง!',
    },

    // ═══ Phase 6: Mixed + multi-color count shape (L26-30) ═══
    26: {
        level: 26, name: 'หลอกตา',
        gridSize: 5, shapeTypes: 'mixed',
        minShapes: 7, maxShapes: 10, maxStack: 2,
        colorCount: 2, askType: 'count_shape',
        timeLimitSeconds: 20,
        description: 'หลายสี นับเฉพาะรูปทรง!',
    },
    27: {
        level: 27, name: 'เจาะจง!',
        gridSize: 5, shapeTypes: 'mixed',
        minShapes: 6, maxShapes: 9, maxStack: 2,
        colorCount: 2, askType: 'count_shape_color',
        timeLimitSeconds: 22,
        description: 'นับเฉพาะรูปทรง+สีที่ถาม!',
    },
    28: {
        level: 28, name: 'สี่เหลี่ยมสีไหน',
        gridSize: 6, shapeTypes: 'mixed',
        minShapes: 8, maxShapes: 12, maxStack: 2,
        colorCount: 2, askType: 'count_shape_color',
        timeLimitSeconds: 20,
        description: 'กริดใหญ่ + เจาะจงสี+ทรง',
    },
    29: {
        level: 29, name: 'ท้าสมาธิ',
        gridSize: 6, shapeTypes: 'mixed',
        minShapes: 8, maxShapes: 12, maxStack: 3,
        colorCount: 2, askType: 'count_shape_color',
        timeLimitSeconds: 20,
        description: 'ซ้อน 3 ชั้น + เจาะจง',
    },
    30: {
        level: 30, name: 'กริดใหญ่เจาะจง',
        gridSize: 6, shapeTypes: 'mixed',
        minShapes: 10, maxShapes: 14, maxStack: 3,
        colorCount: 2, askType: 'count_shape_color',
        timeLimitSeconds: 18,
        description: 'เยอะ + เจาะจง!',
    },

    // ═══ Phase 7: 7×7 mixed + multi-color (L31-35) ═══
    31: {
        level: 31, name: 'กริดยักษ์',
        gridSize: 7, shapeTypes: 'mixed',
        minShapes: 8, maxShapes: 13, maxStack: 2,
        colorCount: 2, askType: 'count_shape',
        timeLimitSeconds: 20,
        description: 'กริด 7×7 นับรูปทรง!',
    },
    32: {
        level: 32, name: 'ยักษ์เจาะจง',
        gridSize: 7, shapeTypes: 'mixed',
        minShapes: 10, maxShapes: 15, maxStack: 3,
        colorCount: 2, askType: 'count_shape_color',
        timeLimitSeconds: 18,
        description: '7×7 เจาะจงสี+ทรง!',
    },
    33: {
        level: 33, name: '3 สี!',
        gridSize: 6, shapeTypes: 'mixed',
        minShapes: 10, maxShapes: 14, maxStack: 3,
        colorCount: 3, askType: 'count_shape',
        timeLimitSeconds: 18,
        description: '3 สี! นับรูปทรง',
    },
    34: {
        level: 34, name: '3 สีเจาะจง',
        gridSize: 6, shapeTypes: 'mixed',
        minShapes: 10, maxShapes: 14, maxStack: 3,
        colorCount: 3, askType: 'count_shape_color',
        timeLimitSeconds: 18,
        description: '3 สี! เจาะจงสี+ทรง',
    },
    35: {
        level: 35, name: 'ซ้อนสูง',
        gridSize: 7, shapeTypes: 'mixed',
        minShapes: 10, maxShapes: 16, maxStack: 4,
        colorCount: 2, askType: 'count_shape_color',
        timeLimitSeconds: 16,
        description: 'ซ้อน 4 ชั้น + เจาะจง!',
    },

    // ═══ Phase 8: Final challenge (L36-40) ═══
    36: {
        level: 36, name: 'ท้าทายสุด',
        gridSize: 7, shapeTypes: 'mixed',
        minShapes: 12, maxShapes: 16, maxStack: 3,
        colorCount: 3, askType: 'count_shape',
        timeLimitSeconds: 16,
        description: '7×7 + 3 สี นับรูปทรง!',
    },
    37: {
        level: 37, name: 'มืออาชีพ',
        gridSize: 7, shapeTypes: 'mixed',
        minShapes: 12, maxShapes: 18, maxStack: 3,
        colorCount: 3, askType: 'count_shape_color',
        timeLimitSeconds: 16,
        description: '7×7 + 3 สี เจาะจง!',
    },
    38: {
        level: 38, name: 'สุดยอด',
        gridSize: 7, shapeTypes: 'mixed',
        minShapes: 14, maxShapes: 18, maxStack: 4,
        colorCount: 3, askType: 'count_shape_color',
        timeLimitSeconds: 14,
        description: 'ซ้อน 4 + 3 สี เจาะจง!',
    },
    39: {
        level: 39, name: 'แชมป์',
        gridSize: 7, shapeTypes: 'mixed',
        minShapes: 14, maxShapes: 20, maxStack: 4,
        colorCount: 3, askType: 'count_shape_color',
        timeLimitSeconds: 14,
        description: 'เต็มกริด! 3 สี เจาะจง!',
    },
    40: {
        level: 40, name: 'ตำนาน',
        gridSize: 7, shapeTypes: 'mixed',
        minShapes: 16, maxShapes: 22, maxStack: 4,
        colorCount: 3, askType: 'count_shape_color',
        timeLimitSeconds: 12,
        description: 'ด่านสุดท้าย! ท้าทายที่สุด!',
    },
};
