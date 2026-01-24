import { LevelData } from './types';

/**
 * Level 1: Simple 3-segment bridge (connected chain)
 * 
 * Layout (ซ้าย -> ขวา):
 *   [Platform Left] -- seg1 -- seg2 -- seg3 -- [Platform Right]
 * 
 * Segments ต่อเนื่องกัน: ปลายของ segment ก่อนหน้า = ต้นของ segment ถัดไป
 * ใช้ relative positioning - จะคำนวณ actual position ใน GameScene
 */
export const POLYBRIDGE_LEVELS: Record<number, LevelData> = {
    1: {
        level: 1,
        // Platform positions will be calculated relative to screen in GameScene
        startPlatform: {
            x: 0,      // Will be calculated
            y: 0,
            width: 150,
            height: 120
        },
        endPlatform: {
            x: 0,      // Will be calculated
            y: 0,
            width: 150,
            height: 120
        },
        carStart: { x: 0, y: 0 },  // Will be calculated
        carEnd: { x: 0, y: 0 },    // Will be calculated
        // Segments defined by their CONNECTION points, not pivot
        // Each segment connects end-to-end
        segments: [
            {
                id: 1,
                x: 0,           // Will be calculated (start from platform edge)
                y: 0,
                length: 80,
                currentAngle: 45,   // Start wrong
                correctAngle: 0,    // Should be horizontal
                rotationStep: 45,
                type: 'straight'
            },
            {
                id: 2,
                x: 0,           // Connects to end of seg1
                y: 0,
                length: 80,
                currentAngle: 90,   // Start wrong
                correctAngle: 0,    // Should be horizontal
                rotationStep: 45,
                type: 'straight'
            },
            {
                id: 3,
                x: 0,           // Connects to end of seg2
                y: 0,
                length: 80,
                currentAngle: 135,  // Start wrong
                correctAngle: 0,    // Should be horizontal
                rotationStep: 45,
                type: 'straight'
            }
        ],
        timeLimit: 60
    }
};

// Helper to get level data
export function getLevelData(level: number): LevelData | null {
    return POLYBRIDGE_LEVELS[level] ?? null;
}

// Total levels available
export const TOTAL_LEVELS = Object.keys(POLYBRIDGE_LEVELS).length;
