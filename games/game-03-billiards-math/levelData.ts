import type { StaticLevelConfig } from './types';

export const STATIC_LEVELS: { [key: number]: StaticLevelConfig } = {
    // PHASE 1: BASICS (Levels 1-10)
    // -------------------------------------------------------------------------
    // LEVEL 1: Introduction (Addition)
    1: {
        level: 1,
        equations: [{
            type: 'simple', leftOperand: 2, rightOperand: 3, operator: '+', result: 5, displayText: "2 + 3 = 5", difficulty: 1
        }],
        balls: [
            { value: 2, x: 0.3, y: 0.5 },
            { value: 3, x: 0.7, y: 0.5 },
            { value: 9, x: 0.2, y: 0.2, type: 'decoy' },
        ],
        obstacles: [],
        shotLimit: 10,
        timeLimitSeconds: 60,
        starRequirements: { threeStars: 30, twoStars: 60 }
    },
    // LEVEL 2: Simple Subtraction
    2: {
        level: 2,
        equations: [{
            type: 'simple', leftOperand: 5, rightOperand: 2, operator: '-', result: 3, displayText: "5 - 2 = 3", difficulty: 1
        }],
        balls: [
            { value: 5, x: 0.2, y: 0.3 },
            { value: 2, x: 0.8, y: 0.3 },
            { value: 7, x: 0.5, y: 0.7 }, // Decoy (5+2)
        ],
        obstacles: [],
        shotLimit: 10,
        timeLimitSeconds: 60,
        starRequirements: { threeStars: 30, twoStars: 60 }
    },
    // LEVEL 3: Multiplication Intro
    3: {
        level: 3,
        equations: [{
            type: 'simple', leftOperand: 3, rightOperand: 2, operator: '*', result: 6, displayText: "3 × 2 = 6", difficulty: 1
        }],
        balls: [
            { value: 3, x: 0.4, y: 0.4 },
            { value: 2, x: 0.6, y: 0.4 },
            { value: 5, x: 0.5, y: 0.8 }, // Decoy (3+2)
        ],
        obstacles: [],
        shotLimit: 10,
        timeLimitSeconds: 60,
        starRequirements: { threeStars: 30, twoStars: 60 }
    },
    // LEVEL 4: Division Intro
    4: {
        level: 4,
        equations: [{
            type: 'simple', leftOperand: 8, rightOperand: 2, operator: '/', result: 4, displayText: "8 ÷ 2 = 4", difficulty: 1
        }],
        balls: [
            { value: 8, x: 0.2, y: 0.5 },
            { value: 2, x: 0.8, y: 0.5 },
            { value: 6, x: 0.5, y: 0.2 }, // Decoy (8-2)
        ],
        obstacles: [
            { type: 'box', x: 0.5, y: 0.5, width: 40, height: 40 }
        ],
        shotLimit: 12,
        timeLimitSeconds: 70,
        starRequirements: { threeStars: 35, twoStars: 65 }
    },
    // LEVEL 5: Mixed Basic - Two Equations (Sequential)
    5: {
        level: 5,
        equations: [
            { type: 'simple', leftOperand: 4, rightOperand: 1, operator: '+', result: 5, displayText: "4 + 1 = 5", difficulty: 1 },
            { type: 'simple', leftOperand: 5, rightOperand: 2, operator: '-', result: 3, displayText: "5 - 2 = 3", difficulty: 1 }
        ],
        balls: [
            { value: 4, x: 0.2, y: 0.2 },
            { value: 1, x: 0.8, y: 0.2 },
            { value: 5, x: 0.5, y: 0.5 }, // Result of eq1, operand of eq2 (Users reuse balls?) No, usually consumed. Need duplicates?
            // Assuming balls are consumed:
            { value: 5, x: 0.2, y: 0.8 }, // For eq2
            { value: 2, x: 0.8, y: 0.8 }, // For eq2
            { value: 9, x: 0.5, y: 0.2 }, // Decoy
        ],
        obstacles: [],
        shotLimit: 14,
        timeLimitSeconds: 90,
        starRequirements: { threeStars: 45, twoStars: 80 }
    },
    // LEVEL 6: Obstacles & Bank Shots
    6: {
        level: 6,
        equations: [{
            type: 'simple', leftOperand: 6, rightOperand: 4, operator: '+', result: 10, displayText: "6 + 4 = 10", difficulty: 2
        }],
        balls: [
            { value: 6, x: 0.1, y: 0.1 },
            { value: 4, x: 0.9, y: 0.1 },
            { value: 2, x: 0.5, y: 0.8 },
        ],
        obstacles: [
            { type: 'wall_h', x: 0.5, y: 0.4, width: 200, height: 20 }
        ],
        shotLimit: 12,
        timeLimitSeconds: 80,
        starRequirements: { threeStars: 30, twoStars: 60 }
    },
    // LEVEL 7: Narrow Gap
    7: {
        level: 7,
        equations: [{
            type: 'simple', leftOperand: 7, rightOperand: 3, operator: '-', result: 4, displayText: "7 - 3 = 4", difficulty: 2
        }],
        balls: [
            { value: 7, x: 0.5, y: 0.1 },
            { value: 3, x: 0.5, y: 0.9 }, // Behind cue? No cue is at 0.9ish usually
            // Adjust:
            { value: 3, x: 0.1, y: 0.5 },
            { value: 9, x: 0.9, y: 0.5 }, // Decoy
            { value: 3, x: 0.5, y: 0.65 },
        ],
        obstacles: [
            { type: 'wall_v', x: 0.4, y: 0.5, width: 20, height: 200 },
            { type: 'wall_v', x: 0.6, y: 0.5, width: 20, height: 200 },
        ],
        shotLimit: 14,
        timeLimitSeconds: 90,
        starRequirements: { threeStars: 40, twoStars: 70 }
    },
    // LEVEL 8: First Hazard
    8: {
        level: 8,
        equations: [{
            type: 'simple', leftOperand: 5, rightOperand: 5, operator: '+', result: 10, displayText: "5 + 5 = 10", difficulty: 2
        }],
        balls: [
            { value: 5, x: 0.2, y: 0.2 },
            { value: 5, x: 0.8, y: 0.2 },
            { value: 0, x: 0.5, y: 0.5, isHazard: true },
        ],
        obstacles: [],
        shotLimit: 12,
        timeLimitSeconds: 60,
        starRequirements: { threeStars: 25, twoStars: 50 }
    },
    // LEVEL 9: Complex Equation Intro (3 terms)
    9: {
        level: 9,
        equations: [{
            type: 'complex', operands: [2, 3, 4], operators: ['+', '+'], result: 9, displayText: "2 + 3 + 4 = 9", difficulty: 3
        }],
        balls: [
            { value: 2, x: 0.2, y: 0.2 },
            { value: 3, x: 0.5, y: 0.2 },
            { value: 4, x: 0.8, y: 0.2 },
            { value: 5, x: 0.8, y: 0.5 }, // Decoy
        ],
        obstacles: [],
        shotLimit: 15,
        timeLimitSeconds: 90,
        starRequirements: { threeStars: 45, twoStars: 80 }
    },
    // LEVEL 10: Phase 1 Exam
    10: {
        level: 10,
        equations: [
            { type: 'simple', leftOperand: 9, rightOperand: 3, operator: '/', result: 3, displayText: "9 ÷ 3 = 3", difficulty: 2 },
            { type: 'simple', leftOperand: 3, rightOperand: 3, operator: '*', result: 9, displayText: "3 × 3 = 9", difficulty: 2 }
        ],
        balls: [
            { value: 9, x: 0.2, y: 0.2 },
            { value: 3, x: 0.8, y: 0.2 },
            { value: 3, x: 0.2, y: 0.8 },
            { value: 3, x: 0.8, y: 0.8 },
            { value: 99, x: 0.5, y: 0.65, isHazard: true },
        ],
        obstacles: [
            { type: 'wall_h', x: 0.5, y: 0.5, width: 100, height: 20 }
        ],
        shotLimit: 20,
        timeLimitSeconds: 120,
        starRequirements: { threeStars: 60, twoStars: 100 }
    },

    // PHASE 2: MIXED & OBSTACLES (Levels 11-20)
    // -------------------------------------------------------------------------
    11: {
        level: 11,
        equations: [{ type: 'complex', operands: [4, 2, 3], operators: ['*', '-'], result: 5, displayText: "4 × 2 - 3 = 5", difficulty: 3 }],
        balls: [
            { value: 4, x: 0.15, y: 0.3 }, { value: 2, x: 0.85, y: 0.3 }, { value: 3, x: 0.5, y: 0.7 },
            { value: 8, x: 0.5, y: 0.2 }, { value: 6, x: 0.2, y: 0.8 }
        ],
        obstacles: [{ type: 'box', x: 0.5, y: 0.5, width: 60, height: 60 }],
        shotLimit: 15, timeLimitSeconds: 100, starRequirements: { threeStars: 45, twoStars: 80 }
    },
    12: {
        level: 12, // Double Simple
        equations: [
            { type: 'simple', leftOperand: 6, rightOperand: 2, operator: '/', result: 3, displayText: "6 ÷ 2 = 3", difficulty: 2 },
            { type: 'simple', leftOperand: 3, rightOperand: 4, operator: '+', result: 7, displayText: "3 + 4 = 7", difficulty: 2 }
        ],
        balls: [
            { value: 6, x: 0.2, y: 0.2 }, { value: 2, x: 0.8, y: 0.2 },
            { value: 3, x: 0.2, y: 0.8 }, { value: 4, x: 0.8, y: 0.8 },
            { value: 1, x: 0.5, y: 0.5 }
        ],
        obstacles: [],
        shotLimit: 18, timeLimitSeconds: 110, starRequirements: { threeStars: 50, twoStars: 90 }
    },
    13: {
        level: 13, // Hazard Maze
        equations: [{ type: 'simple', leftOperand: 10, rightOperand: 5, operator: '-', result: 5, displayText: "10 - 5 = 5", difficulty: 3 }],
        balls: [
            { value: 10, x: 0.1, y: 0.1 }, { value: 5, x: 0.9, y: 0.1 },
            { value: 99, x: 0.3, y: 0.3, isHazard: true }, { value: 99, x: 0.7, y: 0.3, isHazard: true },
            { value: 99, x: 0.5, y: 0.6, isHazard: true }
        ],
        obstacles: [{ type: 'wall_h', x: 0.5, y: 0.4, width: 300, height: 10 }],
        shotLimit: 12, timeLimitSeconds: 90, starRequirements: { threeStars: 40, twoStars: 70 }
    },
    14: {
        level: 14, // Complex Order of Ops
        equations: [{ type: 'complex', operands: [5, 2, 3], operators: ['+', '*'], result: 11, displayText: "5 + 2 × 3 = 11", difficulty: 4 }],
        balls: [
            { value: 5, x: 0.2, y: 0.4 }, { value: 2, x: 0.5, y: 0.2 }, { value: 3, x: 0.8, y: 0.4 },
            { value: 6, x: 0.5, y: 0.8 }, { value: 9, x: 0.1, y: 0.8 }
        ],
        obstacles: [{ type: 'box', x: 0.3, y: 0.6, width: 40, height: 40 }, { type: 'box', x: 0.7, y: 0.6, width: 40, height: 40 }],
        shotLimit: 15, timeLimitSeconds: 120, starRequirements: { threeStars: 50, twoStars: 90 }
    },
    15: {
        level: 15,
        equations: [
            { type: 'simple', leftOperand: 2, rightOperand: 4, operator: '*', result: 8, displayText: "2 × 4 = 8", difficulty: 2 },
            { type: 'simple', leftOperand: 8, rightOperand: 2, operator: '-', result: 6, displayText: "8 - 2 = 6", difficulty: 2 }
        ],
        balls: [
            { value: 2, x: 0.15, y: 0.2 }, { value: 4, x: 0.85, y: 0.2 },
            { value: 8, x: 0.3, y: 0.7 }, { value: 2, x: 0.7, y: 0.7 },
            { value: 0, x: 0.5, y: 0.5, isHazard: true }
        ],
        obstacles: [{ type: 'wall_v', x: 0.5, y: 0.3, width: 10, height: 150 }],
        shotLimit: 15, timeLimitSeconds: 110, starRequirements: { threeStars: 50, twoStars: 90 }
    },
    16: {
        level: 16,
        equations: [{ type: 'complex', operands: [8, 4, 2], operators: ['/', '/'], result: 1, displayText: "8 ÷ 4 ÷ 2 = 1", difficulty: 3 }],
        balls: [
            { value: 8, x: 0.5, y: 0.1 }, { value: 4, x: 0.2, y: 0.4 }, { value: 2, x: 0.8, y: 0.4 },
            { value: 6, x: 0.5, y: 0.8 } // 16 -> 6
        ],
        obstacles: [],
        shotLimit: 12, timeLimitSeconds: 90, starRequirements: { threeStars: 35, twoStars: 65 }
    },
    17: {
        level: 17,
        equations: [
            { type: 'simple', leftOperand: 7, rightOperand: 7, operator: '+', result: 14, displayText: "7 + 7 = 14", difficulty: 2 },
            { type: 'simple', leftOperand: 9, rightOperand: 3, operator: '-', result: 6, displayText: "9 - 3 = 6", difficulty: 2 }
        ],
        balls: [
            { value: 7, x: 0.2, y: 0.2 }, { value: 7, x: 0.8, y: 0.2 },
            { value: 9, x: 0.5, y: 0.5 }, { value: 3, x: 0.5, y: 0.65 },
            { value: 99, x: 0.2, y: 0.5, isHazard: true }, { value: 99, x: 0.8, y: 0.5, isHazard: true }
        ],
        obstacles: [],
        shotLimit: 18, timeLimitSeconds: 120, starRequirements: { threeStars: 60, twoStars: 100 }
    },
    18: {
        level: 18,
        equations: [{ type: 'complex', operands: [3, 2, 4], operators: ['*', '+'], result: 10, displayText: "3 × 2 + 4 = 10", difficulty: 3 }],
        balls: [
            { value: 3, x: 0.1, y: 0.1 }, { value: 2, x: 0.9, y: 0.1 }, { value: 4, x: 0.5, y: 0.8 },
            { value: 6, x: 0.5, y: 0.4 }, { value: 5, x: 0.1, y: 0.8 }
        ],
        obstacles: [{ type: 'wall_h', x: 0.3, y: 0.3, width: 100, height: 10 }, { type: 'wall_h', x: 0.7, y: 0.3, width: 100, height: 10 }],
        shotLimit: 15, timeLimitSeconds: 110, starRequirements: { threeStars: 50, twoStars: 90 }
    },
    19: {
        level: 19,
        equations: [
            { type: 'simple', leftOperand: 10, rightOperand: 2, operator: '-', result: 8, displayText: "10 - 2 = 8", difficulty: 2 },
            { type: 'simple', leftOperand: 8, rightOperand: 4, operator: '/', result: 2, displayText: "8 ÷ 4 = 2", difficulty: 2 },
            { type: 'simple', leftOperand: 2, rightOperand: 1, operator: '+', result: 3, displayText: "2 + 1 = 3", difficulty: 1 }
        ],
        balls: [
            { value: 10, x: 0.2, y: 0.2 }, { value: 2, x: 0.8, y: 0.2 },
            { value: 8, x: 0.3, y: 0.5 }, { value: 4, x: 0.7, y: 0.5 },
            { value: 2, x: 0.4, y: 0.8 }, { value: 1, x: 0.6, y: 0.8 }
        ],
        obstacles: [],
        shotLimit: 22, timeLimitSeconds: 150, starRequirements: { threeStars: 80, twoStars: 130 }
    },
    20: {
        level: 20, // Exam 2
        equations: [
            { type: 'complex', operands: [5, 5, 2], operators: ['+', '*'], result: 15, displayText: "5 + 5 × 2 = 15", difficulty: 4 },
            { type: 'simple', leftOperand: 9, rightOperand: 6, operator: '-', result: 3, displayText: "9 - 6 = 3", difficulty: 2 }
        ],
        balls: [
            { value: 5, x: 0.15, y: 0.2 }, { value: 5, x: 0.85, y: 0.2 }, { value: 2, x: 0.35, y: 0.3 },
            { value: 9, x: 0.2, y: 0.7 }, { value: 6, x: 0.8, y: 0.7 },
            { value: 99, x: 0.5, y: 0.3, isHazard: true }
        ],
        obstacles: [{ type: 'box', x: 0.5, y: 0.5, width: 80, height: 80 }],
        shotLimit: 20, timeLimitSeconds: 140, starRequirements: { threeStars: 70, twoStars: 120 }
    },

    // PHASE 3: ADVANCED (Levels 21-30)
    // -------------------------------------------------------------------------
    21: {
        level: 21,
        equations: [{ type: 'complex', operands: [3, 3, 3], operators: ['*', '*'], result: 27, displayText: "3 × 3 × 3 = 27", difficulty: 4 }],
        balls: [
            { value: 3, x: 0.2, y: 0.2 }, { value: 3, x: 0.8, y: 0.2 }, { value: 3, x: 0.5, y: 0.5 },
            { value: 9, x: 0.2, y: 0.8 }, { value: 8, x: 0.8, y: 0.8 } // 18 -> 8
        ],
        obstacles: [],
        shotLimit: 12, timeLimitSeconds: 90, starRequirements: { threeStars: 40, twoStars: 75 }
    },
    22: {
        level: 22,
        equations: [
            { type: 'simple', leftOperand: 8, rightOperand: 4, operator: '-', result: 4, displayText: "8 - 4 = 4", difficulty: 2 },
            { type: 'complex', operands: [4, 4, 2], operators: ['+', '/'], result: 6, displayText: "4 + 4 ÷ 2 = 6", difficulty: 3 }
        ],
        balls: [
            { value: 8, x: 0.1, y: 0.5 }, { value: 4, x: 0.3, y: 0.5 },
            { value: 4, x: 0.7, y: 0.5 }, { value: 4, x: 0.9, y: 0.5 }, { value: 2, x: 0.5, y: 0.2 },
            { value: 99, x: 0.35, y: 0.65, isHazard: true }
        ],
        obstacles: [{ type: 'wall_v', x: 0.5, y: 0.5, width: 15, height: 250 }],
        shotLimit: 18, timeLimitSeconds: 130, starRequirements: { threeStars: 60, twoStars: 110 }
    },
    23: {
        level: 23,
        equations: [{ type: 'complex', operands: [9, 3, 1], operators: ['/', '-'], result: 2, displayText: "9 ÷ 3 - 1 = 2", difficulty: 3 }],
        balls: [
            { value: 9, x: 0.2, y: 0.15 }, { value: 3, x: 0.8, y: 0.15 }, { value: 1, x: 0.5, y: 0.7 },
            { value: 3, x: 0.5, y: 0.15 }, { value: 4, x: 0.2, y: 0.7 }
        ],
        obstacles: [{ type: 'box', x: 0.5, y: 0.4, width: 200, height: 50 }],
        shotLimit: 15, timeLimitSeconds: 100, starRequirements: { threeStars: 45, twoStars: 80 }
    },
    24: {
        level: 24,
        equations: [
            { type: 'simple', leftOperand: 2, rightOperand: 5, operator: '*', result: 10, displayText: "2 × 5 = 10", difficulty: 2 },
            { type: 'simple', leftOperand: 10, rightOperand: 2, operator: '-', result: 8, displayText: "10 - 2 = 8", difficulty: 2 },
            { type: 'simple', leftOperand: 8, rightOperand: 4, operator: '/', result: 2, displayText: "8 ÷ 4 = 2", difficulty: 2 }
        ],
        balls: [
            { value: 2, x: 0.2, y: 0.2 }, { value: 5, x: 0.8, y: 0.2 },
            { value: 10, x: 0.5, y: 0.5 }, { value: 2, x: 0.2, y: 0.8 },
            { value: 8, x: 0.8, y: 0.8 }, { value: 4, x: 0.5, y: 0.2 }
        ],
        obstacles: [],
        shotLimit: 25, timeLimitSeconds: 180, starRequirements: { threeStars: 90, twoStars: 150 }
    },
    25: {
        level: 25,
        equations: [{ type: 'complex', operands: [6, 2, 4], operators: ['*', '+'], result: 16, displayText: "6 × 2 + 4 = 16", difficulty: 4 }],
        balls: [
            { value: 6, x: 0.1, y: 0.5 }, { value: 2, x: 0.3, y: 0.5 }, { value: 4, x: 0.9, y: 0.5 },
            { value: 1, x: 0.6, y: 0.2 }, { value: 99, x: 0.5, y: 0.5, isHazard: true } // 12 -> 1
        ],
        obstacles: [{ type: 'wall_v', x: 0.4, y: 0.5, width: 20, height: 200 }, { type: 'wall_v', x: 0.6, y: 0.5, width: 20, height: 200 }],
        shotLimit: 15, timeLimitSeconds: 110, starRequirements: { threeStars: 50, twoStars: 90 }
    },
    26: {
        level: 26,
        equations: [
            { type: 'simple', leftOperand: 7, rightOperand: 6, operator: '+', result: 13, displayText: "7 + 6 = 13", difficulty: 2 },
            { type: 'simple', leftOperand: 9, rightOperand: 3, operator: '-', result: 6, displayText: "9 - 3 = 6", difficulty: 2 }
        ],
        balls: [
            { value: 7, x: 0.2, y: 0.2 }, { value: 6, x: 0.8, y: 0.2 },
            { value: 9, x: 0.5, y: 0.5 }, { value: 3, x: 0.2, y: 0.8 }, // 13/7 -> 9/3
            { value: 99, x: 0.1, y: 0.5, isHazard: true }, { value: 99, x: 0.9, y: 0.5, isHazard: true }
        ],
        obstacles: [],
        shotLimit: 18, timeLimitSeconds: 120, starRequirements: { threeStars: 60, twoStars: 100 }
    },
    27: {
        level: 27,
        equations: [{ type: 'complex', operands: [5, 5, 5], operators: ['+', '+'], result: 15, displayText: "5 + 5 + 5 = 15", difficulty: 3 }],
        balls: [
            { value: 5, x: 0.2, y: 0.3 }, { value: 5, x: 0.8, y: 0.3 }, { value: 5, x: 0.5, y: 0.1 },
            { value: 10, x: 0.5, y: 0.65 }
        ],
        obstacles: [{ type: 'box', x: 0.5, y: 0.5, width: 100, height: 20 }],
        shotLimit: 15, timeLimitSeconds: 100, starRequirements: { threeStars: 45, twoStars: 80 }
    },
    28: {
        level: 28,
        equations: [{ type: 'complex', operands: [1, 2, 3, 4], operators: ['+', '+', '+'], result: 10, displayText: "1 + 2 + 3 + 4 = 10", difficulty: 5 }],
        balls: [
            { value: 1, x: 0.2, y: 0.2 }, { value: 2, x: 0.8, y: 0.2 },
            { value: 3, x: 0.2, y: 0.8 }, { value: 4, x: 0.8, y: 0.8 },
            { value: 5, x: 0.5, y: 0.5 }
        ],
        obstacles: [],
        shotLimit: 20, timeLimitSeconds: 120, starRequirements: { threeStars: 55, twoStars: 95 }
    },
    29: {
        level: 29,
        equations: [
            { type: 'simple', leftOperand: 9, rightOperand: 9, operator: '+', result: 18, displayText: "9 + 9 = 18", difficulty: 2 },
            { type: 'complex', operands: [9, 3, 3], operators: ['-', '/'], result: 8, displayText: "9 - 3 ÷ 3 = 8", difficulty: 4 }
        ],
        balls: [
            { value: 9, x: 0.1, y: 0.1 }, { value: 9, x: 0.9, y: 0.1 },
            { value: 9, x: 0.5, y: 0.4 }, { value: 3, x: 0.3, y: 0.7 }, { value: 3, x: 0.7, y: 0.7 },
            { value: 99, x: 0.5, y: 0.65, isHazard: true }
        ],
        obstacles: [{ type: 'wall_h', x: 0.5, y: 0.5, width: 300, height: 10 }],
        shotLimit: 25, timeLimitSeconds: 140, starRequirements: { threeStars: 70, twoStars: 110 }
    },
    30: {
        level: 30, // Exam 3
        equations: [
            { type: 'complex', operands: [10, 2, 5], operators: ['/', '+'], result: 10, displayText: "10 ÷ 2 + 5 = 10", difficulty: 4 },
            { type: 'complex', operands: [4, 4, 4], operators: ['*', '/'], result: 4, displayText: "4 × 4 ÷ 4 = 4", difficulty: 4 }
        ],
        balls: [
            { value: 10, x: 0.2, y: 0.2 }, { value: 2, x: 0.5, y: 0.2 }, { value: 5, x: 0.8, y: 0.2 },
            { value: 4, x: 0.2, y: 0.7 }, { value: 4, x: 0.5, y: 0.7 }, { value: 4, x: 0.8, y: 0.7 },
            { value: 99, x: 0.35, y: 0.45, isHazard: true }, { value: 99, x: 0.65, y: 0.45, isHazard: true }
        ],
        obstacles: [{ type: 'box', x: 0.5, y: 0.5, width: 50, height: 50 }],
        shotLimit: 25, timeLimitSeconds: 160, starRequirements: { threeStars: 80, twoStars: 130 }
    },

    // PHASE 4: MASTERY (Levels 31-35)
    // -------------------------------------------------------------------------
    31: {
        level: 31,
        equations: [{ type: 'complex', operands: [8, 2, 4], operators: ['+', '*'], result: 16, displayText: "8 + 2 × 4 = 16", difficulty: 5 }],
        balls: [
            { value: 8, x: 0.1, y: 0.2 }, { value: 2, x: 0.9, y: 0.2 }, { value: 4, x: 0.5, y: 0.8 },
            { value: 99, x: 0.3, y: 0.5, isHazard: true }, { value: 99, x: 0.7, y: 0.5, isHazard: true }
        ],
        obstacles: [{ type: 'wall_v', x: 0.5, y: 0.3, width: 20, height: 150 }],
        shotLimit: 15, timeLimitSeconds: 110, starRequirements: { threeStars: 50, twoStars: 90 }
    },
    32: {
        level: 32,
        equations: [
            { type: 'simple', leftOperand: 6, rightOperand: 6, operator: '*', result: 36, displayText: "6 × 6 = 36", difficulty: 3 },
            { type: 'simple', leftOperand: 8, rightOperand: 2, operator: '-', result: 6, displayText: "8 - 2 = 6", difficulty: 3 }
        ],
        balls: [
            { value: 6, x: 0.2, y: 0.2 }, { value: 6, x: 0.8, y: 0.2 }, // 36/9 -> 8/2
            { value: 8, x: 0.5, y: 0.5 }, { value: 2, x: 0.5, y: 0.8 },
            { value: 99, x: 0.1, y: 0.5, isHazard: true }, { value: 99, x: 0.9, y: 0.5, isHazard: true }
        ],
        obstacles: [],
        shotLimit: 20, timeLimitSeconds: 130, starRequirements: { threeStars: 65, twoStars: 100 }
    },
    33: {
        level: 33,
        equations: [{ type: 'complex', operands: [5, 2, 4, 3], operators: ['+', '+', '-'], result: 8, displayText: "5 + 2 + 4 - 3 = 8", difficulty: 5 }],
        balls: [
            { value: 5, x: 0.15, y: 0.15 }, { value: 2, x: 0.85, y: 0.15 }, { value: 4, x: 0.5, y: 0.85 },
            { value: 3, x: 0.5, y: 0.4 }, { value: 99, x: 0.4, y: 0.6, isHazard: true }, { value: 99, x: 0.6, y: 0.6, isHazard: true }
        ],
        obstacles: [{ type: 'wall_h', x: 0.5, y: 0.5, width: 250, height: 20 }],
        shotLimit: 20, timeLimitSeconds: 120, starRequirements: { threeStars: 60, twoStars: 100 }
    },
    34: {
        level: 34,
        equations: [
            { type: 'complex', operands: [10, 4, 2, 8], operators: ['-', '/', '+'], result: 16, displayText: "10 - 4 ÷ 2 + 8 = 16", difficulty: 5 },
            { type: 'simple', leftOperand: 8, rightOperand: 8, operator: '+', result: 16, displayText: "8 + 8 = 16", difficulty: 3 }
        ],
        balls: [
            { value: 10, x: 0.1, y: 0.2 }, { value: 4, x: 0.5, y: 0.2 }, { value: 2, x: 0.9, y: 0.2 },
            { value: 8, x: 0.3, y: 0.8 }, { value: 8, x: 0.7, y: 0.8 },
            { value: 99, x: 0.5, y: 0.5, isHazard: true }
        ],
        obstacles: [{ type: 'box', x: 0.2, y: 0.5, width: 40, height: 40 }, { type: 'box', x: 0.8, y: 0.5, width: 40, height: 40 }],
        shotLimit: 30, timeLimitSeconds: 150, starRequirements: { threeStars: 80, twoStars: 130 }
    },
    35: {
        level: 35, // Grand Finale
        equations: [
            { type: 'complex', operands: [3, 3, 3, 1], operators: ['+', '+', '*'], result: 9, displayText: "3 + 3 + 3 × 1 = 9", difficulty: 4 },
            { type: 'complex', operands: [9, 9, 9, 1], operators: ['+', '+', '*'], result: 27, displayText: "9 + 9 + 9 × 1 = 27", difficulty: 5 },
            { type: 'complex', operands: [9, 3, 9, 1], operators: ['/', '+', '*'], result: 12, displayText: "9 ÷ 3 + 9 × 1 = 12", difficulty: 5 }
        ],
        balls: [
            { value: 3, x: 0.1, y: 0.1 }, { value: 3, x: 0.5, y: 0.1 }, { value: 3, x: 0.9, y: 0.1 }, { value: 1, x: 0.3, y: 0.3 },
            { value: 9, x: 0.1, y: 0.4 }, { value: 9, x: 0.5, y: 0.4 }, { value: 9, x: 0.9, y: 0.4 }, { value: 1, x: 0.7, y: 0.3 },
            { value: 9, x: 0.5, y: 0.7 }, { value: 1, x: 0.5, y: 0.85 },
            { value: 3, x: 0.2, y: 0.5 }, { value: 9, x: 0.8, y: 0.5 }, // Extra balls for consumption
            { value: 99, x: 0.2, y: 0.6, isHazard: true }, { value: 99, x: 0.8, y: 0.6, isHazard: true }
        ],
        obstacles: [{ type: 'wall_h', x: 0.5, y: 0.25, width: 400, height: 10 }, { type: 'wall_h', x: 0.5, y: 0.55, width: 400, height: 10 }],
        shotLimit: 40, timeLimitSeconds: 240, starRequirements: { threeStars: 150, twoStars: 200 }
    }
};
