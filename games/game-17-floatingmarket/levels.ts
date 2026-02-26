import type { FloatingMarketLevelConfig } from './types';

/**
 * 30 Levels — "Runjum: Talad Kwam Jum" (The Market of Memory)
 *
 * Phase 1: Morning Calm  (1-10)  — Teach steering, basic Mode A, intro Mode B
 * Phase 2: Afternoon Rush (11-20) — Ramping cognitive load, similarity, negative rules
 * Phase 3: Evening Festival (21-30) — Hybrid, max capacity, advanced variants, finale
 */
export const FLOATING_MARKET_LEVELS: Record<number, FloatingMarketLevelConfig> = {

    // ========== PHASE 1: THE MORNING CALM (Levels 1-10) ==========

    // Level 1: Tutorial — Collect Lotuses, Avoid Rocks
    1: {
        level: 1,
        mode: 'tutorial',
        boatSpeed: 75,
        riverWidthRatio: 0.78,
        obstacleFrequency: 5.0,
        itemSpawnRate: 2.5,
        itemPoolCategories: ['lotus'], // Removed redundant standalone rock item
        rule: {
            instructionThai: 'เก็บดอกบัว! หลีกเลี่ยงสิ่งกีดขวาง!',
            collectFilter: ['lotus'],
            avoidFilter: ['rock'], // Technically obsolete but leaving in case
        },
        memoryCapacity: 0,
        coinFrequency: 0,
        difficultyMultiplier: 0.5,
        parTimeSeconds: 35,
        timeLimitSeconds: 70,
        itemCount: 8,
    },

    // Level 2: Mode A — Collect Fruits, Avoid Rocks
    2: {
        level: 2,
        mode: 'modeA',
        boatSpeed: 80,
        riverWidthRatio: 0.75,
        obstacleFrequency: 4.5,
        itemSpawnRate: 2.2,
        itemPoolCategories: ['fruit', 'rock'],
        rule: {
            instructionThai: 'เก็บเฉพาะผลไม้เท่านั้น!',
            collectFilter: ['fruit'],
            avoidFilter: ['rock'],
        },
        memoryCapacity: 0,
        coinFrequency: 5,
        difficultyMultiplier: 0.6,
        parTimeSeconds: 40,
        timeLimitSeconds: 80,
        itemCount: 10,
    },

    // Level 3: Mode A — Collect Desserts, Avoid Fruits
    3: {
        level: 3,
        mode: 'modeA',
        boatSpeed: 82,
        riverWidthRatio: 0.75,
        obstacleFrequency: 4.0,
        itemSpawnRate: 2.0,
        itemPoolCategories: ['dessert', 'fruit'],
        rule: {
            instructionThai: 'เก็บเฉพาะขนมเท่านั้น!',
            collectFilter: ['dessert'],
            avoidFilter: ['fruit'],
        },
        memoryCapacity: 0,
        coinFrequency: 5,
        difficultyMultiplier: 0.65,
        parTimeSeconds: 45,
        timeLimitSeconds: 85,
        itemCount: 10,
    },

    // Level 4: Mode A — Collect Vegetables, Avoid Fish (faster)
    4: {
        level: 4,
        mode: 'modeA',
        boatSpeed: 88,
        riverWidthRatio: 0.73,
        obstacleFrequency: 3.8,
        itemSpawnRate: 2.0,
        itemPoolCategories: ['vegetable', 'fish'],
        rule: {
            instructionThai: 'เก็บเฉพาะผักเท่านั้น!',
            collectFilter: ['vegetable'],
            avoidFilter: ['fish'],
        },
        memoryCapacity: 0,
        coinFrequency: 4.5,
        difficultyMultiplier: 0.7,
        parTimeSeconds: 45,
        timeLimitSeconds: 85,
        itemCount: 12,
    },

    // Level 5: Mode A — Attribute switch: Collect Red Things, Avoid Green
    // (Uses specific item IDs for color-based filtering)
    5: {
        level: 5,
        mode: 'modeA',
        boatSpeed: 90,
        riverWidthRatio: 0.72,
        obstacleFrequency: 3.5,
        itemSpawnRate: 2.0,
        itemPoolCategories: ['fruit', 'vegetable'],
        rule: {
            instructionThai: 'เก็บเฉพาะของสีแดงเท่านั้น!',
            collectFilter: ['apple', 'shrimp', 'thongyod'],
            avoidFilter: ['guava', 'morningglory', 'greenmango', 'lime'],
            filterByItemId: true,
        },
        memoryCapacity: 0,
        coinFrequency: 4.5,
        difficultyMultiplier: 0.75,
        parTimeSeconds: 50,
        timeLimitSeconds: 90,
        itemCount: 12,
    },

    // Level 6: Mode B — Intro to Hidden Basket (Memory Load: 1)
    6: {
        level: 6,
        mode: 'modeB',
        boatSpeed: 78,
        riverWidthRatio: 0.75,
        obstacleFrequency: 5.0,
        itemSpawnRate: 3.0,
        itemPoolCategories: ['fruit'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ!',
            collectFilter: ['fruit'],
        },
        memoryCapacity: 1,
        coinFrequency: 0,
        difficultyMultiplier: 0.7,
        parTimeSeconds: 40,
        timeLimitSeconds: 80,
        itemCount: 6,
    },

    // Level 7: Mode B — Memory Load: 2
    7: {
        level: 7,
        mode: 'modeB',
        boatSpeed: 80,
        riverWidthRatio: 0.75,
        obstacleFrequency: 4.5,
        itemSpawnRate: 2.8,
        itemPoolCategories: ['fruit'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ!',
            collectFilter: ['fruit'],
        },
        memoryCapacity: 2,
        coinFrequency: 0,
        difficultyMultiplier: 0.75,
        parTimeSeconds: 45,
        timeLimitSeconds: 85,
        itemCount: 8,
    },

    // Level 8: Mode B — Memory Load: 2, long gap between duplicates
    8: {
        level: 8,
        mode: 'modeB',
        boatSpeed: 82,
        riverWidthRatio: 0.73,
        obstacleFrequency: 4.0,
        itemSpawnRate: 3.5,
        itemPoolCategories: ['fruit', 'dessert'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ!',
            collectFilter: ['fruit', 'dessert'],
        },
        memoryCapacity: 2,
        coinFrequency: 0,
        difficultyMultiplier: 0.8,
        parTimeSeconds: 50,
        timeLimitSeconds: 90,
        itemCount: 10,
    },

    // Level 9: Mode A — Specific hunt: "Collect ONLY Mangos"
    9: {
        level: 9,
        mode: 'modeA',
        boatSpeed: 88,
        riverWidthRatio: 0.72,
        obstacleFrequency: 3.5,
        itemSpawnRate: 1.8,
        itemPoolCategories: ['fruit'],
        rule: {
            instructionThai: 'เก็บเฉพาะมะม่วง!',
            collectFilter: ['mango'],
            avoidFilter: ['apple', 'durian', 'watermelon', 'banana', 'orange', 'papaya'],
            filterByItemId: true,
        },
        memoryCapacity: 0,
        coinFrequency: 4,
        difficultyMultiplier: 0.85,
        parTimeSeconds: 50,
        timeLimitSeconds: 90,
        itemCount: 14,
    },

    // Level 10: Bonus — Coin Rush
    10: {
        level: 10,
        mode: 'bonus',
        boatSpeed: 140,
        riverWidthRatio: 0.70,
        obstacleFrequency: 3.0,
        itemSpawnRate: 0,
        itemPoolCategories: [],
        rule: {
            instructionThai: '🪙 เก็บเหรียญให้มากที่สุด! 🪙',
            collectFilter: ['coin'],
        },
        memoryCapacity: 0,
        coinFrequency: 0.8,
        difficultyMultiplier: 0.9,
        parTimeSeconds: 25,
        timeLimitSeconds: 45,
        itemCount: 0,
        noFailState: true,
    },

    // ========== PHASE 2: NEW QUANTITY MODE (Levels 11-15) ==========

    // Level 11: Quantity Mode — 1 Target
    11: {
        level: 11,
        mode: 'quantityMode',
        boatSpeed: 80,
        riverWidthRatio: 0.75,
        obstacleFrequency: 3.5,
        itemSpawnRate: 2.5,
        itemPoolCategories: ['fruit'],
        rule: {
            instructionThai: 'เก็บแอปเปิล 3 ผล',
            collectFilter: ['apple'],
            filterByItemId: true,
            targetQuantities: { 'apple': 3 }
        },
        memoryCapacity: 0,
        coinFrequency: 4,
        difficultyMultiplier: 0.9,
        parTimeSeconds: 40,
        timeLimitSeconds: 80,
        itemCount: 10,
    },

    // Level 12: Quantity Mode — 2 Targets (Low count)
    12: {
        level: 12,
        mode: 'quantityMode',
        boatSpeed: 85,
        riverWidthRatio: 0.74,
        obstacleFrequency: 4.0,
        itemSpawnRate: 2.2,
        itemPoolCategories: ['fruit', 'dessert'],
        rule: {
            instructionThai: 'เก็บกล้วย 2 ผล และส้ม 2 ผล',
            collectFilter: ['banana', 'orange'],
            filterByItemId: true,
            targetQuantities: { 'banana': 2, 'orange': 2 }
        },
        memoryCapacity: 0,
        coinFrequency: 4,
        difficultyMultiplier: 0.95,
        parTimeSeconds: 40,
        timeLimitSeconds: 80,
        itemCount: 12,
    },

    // Level 13: Quantity Mode — 2 Targets (Different counts)
    13: {
        level: 13,
        mode: 'quantityMode',
        boatSpeed: 88,
        riverWidthRatio: 0.73,
        obstacleFrequency: 4.5,
        itemSpawnRate: 2.0,
        itemPoolCategories: ['fruit', 'vegetable'],
        rule: {
            instructionThai: 'เก็บมะม่วง 4 ผล และฟักทอง 1 ผล',
            collectFilter: ['mango', 'pumpkin'],
            filterByItemId: true,
            targetQuantities: { 'mango': 4, 'pumpkin': 1 }
        },
        memoryCapacity: 0,
        coinFrequency: 3,
        difficultyMultiplier: 1.0,
        parTimeSeconds: 45,
        timeLimitSeconds: 85,
        itemCount: 14,
    },

    // Level 14: Quantity Mode — 3 Targets
    14: {
        level: 14,
        mode: 'quantityMode',
        boatSpeed: 90,
        riverWidthRatio: 0.72,
        obstacleFrequency: 5.0,
        itemSpawnRate: 1.8,
        itemPoolCategories: ['fruit', 'dessert', 'fish'],
        rule: {
            instructionThai: 'เก็บปลา 1 ตัว สับปะรด 2 ผล และแตงโม 2 ผล',
            collectFilter: ['fish', 'pineapple', 'watermelon'],
            filterByItemId: true,
            targetQuantities: { 'fish': 1, 'pineapple': 2, 'watermelon': 2 }
        },
        memoryCapacity: 0,
        coinFrequency: 3,
        difficultyMultiplier: 1.05,
        parTimeSeconds: 50,
        timeLimitSeconds: 90,
        itemCount: 15,
    },

    // Level 15: Quantity Mode — High Count
    15: {
        level: 15,
        mode: 'quantityMode',
        boatSpeed: 95,
        riverWidthRatio: 0.70,
        obstacleFrequency: 5.5,
        itemSpawnRate: 1.5,
        itemPoolCategories: ['fruit', 'vegetable', 'drink'],
        rule: {
            instructionThai: 'เก็บมะพร้าว 5 ผล',
            collectFilter: ['coconut'],
            filterByItemId: true,
            targetQuantities: { 'coconut': 5 }
        },
        memoryCapacity: 0,
        coinFrequency: 2,
        difficultyMultiplier: 1.1,
        parTimeSeconds: 55,
        timeLimitSeconds: 100,
        itemCount: 16,
    },

    // ========== PHASE 3: THE AFTERNOON RUSH (Levels 16-25) ==========

    // Level 16: Mode B — Memory Load: 3
    16: {
        level: 16,
        mode: 'modeB',
        boatSpeed: 85,
        riverWidthRatio: 0.72,
        obstacleFrequency: 4.0,
        itemSpawnRate: 2.5,
        itemPoolCategories: ['fruit', 'dessert'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ!',
            collectFilter: ['fruit', 'dessert'],
        },
        memoryCapacity: 3,
        coinFrequency: 0,
        difficultyMultiplier: 1.0,
        parTimeSeconds: 55,
        timeLimitSeconds: 100,
        itemCount: 12,
    },

    // Level 17: Mode A — Round vs Long Fruits (visual discrimination)
    17: {
        level: 17,
        mode: 'modeA',
        boatSpeed: 90,
        riverWidthRatio: 0.70,
        obstacleFrequency: 3.5,
        itemSpawnRate: 1.8,
        itemPoolCategories: ['fruit'],
        rule: {
            instructionThai: 'เก็บเฉพาะผลไม้กลมเท่านั้น!',
            collectFilter: ['apple', 'orange', 'coconut', 'watermelon'],
            avoidFilter: ['banana', 'mango', 'papaya'],
            filterByItemId: true,
        },
        memoryCapacity: 0,
        coinFrequency: 4,
        difficultyMultiplier: 1.0,
        parTimeSeconds: 55,
        timeLimitSeconds: 100,
        itemCount: 14,
    },

    // Level 18: Mode B — 3 items, all similar (Green items)
    18: {
        level: 18,
        mode: 'modeB',
        boatSpeed: 85,
        riverWidthRatio: 0.72,
        obstacleFrequency: 4.0,
        itemSpawnRate: 2.5,
        itemPoolCategories: ['fruit', 'vegetable'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! (ของสีเขียว) อย่าเก็บซ้ำ!',
            collectFilter: ['guava', 'greenmango', 'lime', 'morningglory'],
            filterByItemId: true,
        },
        memoryCapacity: 3,
        coinFrequency: 0,
        difficultyMultiplier: 1.05,
        parTimeSeconds: 55,
        timeLimitSeconds: 100,
        itemCount: 12,
        similarItems: true,
    },

    // Level 19: Mode B — 3 items, Desserts (Golden items)
    19: {
        level: 19,
        mode: 'modeB',
        boatSpeed: 88,
        riverWidthRatio: 0.70,
        obstacleFrequency: 3.8,
        itemSpawnRate: 2.5,
        itemPoolCategories: ['dessert'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! (ขนมทอง) อย่าเก็บซ้ำ!',
            collectFilter: ['dessert'],
        },
        memoryCapacity: 3,
        coinFrequency: 0,
        difficultyMultiplier: 1.1,
        parTimeSeconds: 55,
        timeLimitSeconds: 100,
        itemCount: 12,
        similarItems: true,
    },

    // Level 20: Mode A — Negative Rule: "Collect NOT Durian"
    20: {
        level: 20,
        mode: 'modeA',
        boatSpeed: 90,
        riverWidthRatio: 0.70,
        obstacleFrequency: 3.5,
        itemSpawnRate: 1.8,
        itemPoolCategories: ['fruit'],
        rule: {
            instructionThai: 'เก็บทุกอย่าง ยกเว้นทุเรียน!',
            collectFilter: ['fruit'],
            avoidFilter: ['durian'],
            filterByItemId: true,
            negativeRule: true,
        },
        memoryCapacity: 0,
        coinFrequency: 4,
        difficultyMultiplier: 1.1,
        parTimeSeconds: 55,
        timeLimitSeconds: 100,
        itemCount: 16,
    },

    // Level 21: Mode B — Memory Load: 4
    21: {
        level: 21,
        mode: 'modeB',
        boatSpeed: 90,
        riverWidthRatio: 0.70,
        obstacleFrequency: 3.5,
        itemSpawnRate: 2.2,
        itemPoolCategories: ['fruit', 'dessert', 'vegetable'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ!',
            collectFilter: ['fruit', 'dessert', 'vegetable'],
        },
        memoryCapacity: 4,
        coinFrequency: 0,
        difficultyMultiplier: 1.15,
        parTimeSeconds: 60,
        timeLimitSeconds: 110,
        itemCount: 16,
    },

    // Level 22: Mode B — The Reset (basket empties mid-level)
    22: {
        level: 22,
        mode: 'modeB',
        boatSpeed: 88,
        riverWidthRatio: 0.70,
        obstacleFrequency: 3.8,
        itemSpawnRate: 2.2,
        itemPoolCategories: ['fruit', 'dessert'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ!',
            collectFilter: ['fruit', 'dessert'],
        },
        memoryCapacity: 3,
        coinFrequency: 0,
        difficultyMultiplier: 1.15,
        parTimeSeconds: 65,
        timeLimitSeconds: 115,
        itemCount: 18,
        resetBasketAt: 3,
    },

    // Level 23: Mode A — Moving Targets (items drift)
    23: {
        level: 23,
        mode: 'modeA',
        boatSpeed: 95,
        riverWidthRatio: 0.68,
        obstacleFrequency: 3.2,
        itemSpawnRate: 1.8,
        itemPoolCategories: ['fruit', 'vegetable'],
        rule: {
            instructionThai: 'เก็บเฉพาะผลไม้เท่านั้น!',
            collectFilter: ['fruit'],
            avoidFilter: ['vegetable'],
        },
        memoryCapacity: 0,
        coinFrequency: 4,
        difficultyMultiplier: 1.2,
        parTimeSeconds: 55,
        timeLimitSeconds: 100,
        itemCount: 14,
        itemDrift: true,
    },

    // Level 24: Mode B — 4 items, with distractions
    24: {
        level: 24,
        mode: 'modeB',
        boatSpeed: 90,
        riverWidthRatio: 0.68,
        obstacleFrequency: 3.5,
        itemSpawnRate: 2.0,
        itemPoolCategories: ['fruit', 'dessert', 'fish'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ!',
            collectFilter: ['fruit', 'dessert', 'fish'],
        },
        memoryCapacity: 4,
        coinFrequency: 0,
        difficultyMultiplier: 1.2,
        parTimeSeconds: 60,
        timeLimitSeconds: 110,
        itemCount: 16,
        distractions: true,
    },

    // Level 25: Boss — Rapid Fire (fast item spawns, quick decisions)
    25: {
        level: 25,
        mode: 'modeA',
        boatSpeed: 110,
        riverWidthRatio: 0.65,
        obstacleFrequency: 2.0,
        itemSpawnRate: 1.2,
        itemPoolCategories: ['fruit', 'dessert', 'vegetable', 'fish'],
        rule: {
            instructionThai: 'เก็บผลไม้และขนม! หลีกเลี่ยงผักและปลา!',
            collectFilter: ['fruit', 'dessert'],
            avoidFilter: ['vegetable', 'fish'],
        },
        memoryCapacity: 0,
        coinFrequency: 3,
        difficultyMultiplier: 1.25,
        parTimeSeconds: 45,
        timeLimitSeconds: 80,
        itemCount: 20,
    },

    // ========== PHASE 3: THE EVENING FESTIVAL (Levels 21-30) ==========

    // Level 26: Hybrid — Mode A → Mode B mid-level
    26: {
        level: 26,
        mode: 'hybrid',
        boatSpeed: 90,
        riverWidthRatio: 0.70,
        obstacleFrequency: 3.5,
        itemSpawnRate: 2.0,
        itemPoolCategories: ['fruit', 'dessert'],
        rule: {
            instructionThai: 'เก็บเฉพาะผลไม้เท่านั้น!',
            collectFilter: ['fruit'],
            avoidFilter: ['dessert'],
        },
        memoryCapacity: 3,
        coinFrequency: 0,
        difficultyMultiplier: 1.2,
        parTimeSeconds: 70,
        timeLimitSeconds: 120,
        itemCount: 18,
        hybridSwitchAt: 0.5,
        switchToRule: {
            instructionThai: '⚡ เปลี่ยนกฎ! เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ!',
            collectFilter: ['fruit', 'dessert'],
        },
    },

    // Level 27: Mode B — Memory Load: 5 (max capacity)
    27: {
        level: 27,
        mode: 'modeB',
        boatSpeed: 88,
        riverWidthRatio: 0.70,
        obstacleFrequency: 3.5,
        itemSpawnRate: 2.0,
        itemPoolCategories: ['fruit', 'dessert', 'vegetable'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ!',
            collectFilter: ['fruit', 'dessert', 'vegetable'],
        },
        memoryCapacity: 5,
        coinFrequency: 0,
        difficultyMultiplier: 1.25,
        parTimeSeconds: 70,
        timeLimitSeconds: 120,
        itemCount: 20,
    },

    // Level 28: Mode A — Sequence: collect in order (Noodle → Fish → Vegetable)
    // Implemented as strict category order Mode A variant
    28: {
        level: 28,
        mode: 'modeA',
        boatSpeed: 85,
        riverWidthRatio: 0.70,
        obstacleFrequency: 4.0,
        itemSpawnRate: 1.8,
        itemPoolCategories: ['noodle', 'fish', 'vegetable'],
        rule: {
            instructionThai: 'เก็บตามลำดับ: ก๋วยเตี๋ยว → ปลา → ผัก!',
            collectFilter: ['noodle', 'fish', 'vegetable'],
        },
        memoryCapacity: 0,
        coinFrequency: 0,
        difficultyMultiplier: 1.25,
        parTimeSeconds: 75,
        timeLimitSeconds: 130,
        itemCount: 18,
    },

    // Level 29: Mode B — 5 items, all similar (green items)
    29: {
        level: 29,
        mode: 'modeB',
        boatSpeed: 90,
        riverWidthRatio: 0.68,
        obstacleFrequency: 3.5,
        itemSpawnRate: 2.0,
        itemPoolCategories: ['fruit', 'vegetable'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! (ของสีเขียว) อย่าเก็บซ้ำ!',
            collectFilter: ['guava', 'greenmango', 'lime', 'morningglory', 'corn'],
            filterByItemId: true,
        },
        memoryCapacity: 5,
        coinFrequency: 0,
        difficultyMultiplier: 1.3,
        parTimeSeconds: 70,
        timeLimitSeconds: 120,
        itemCount: 20,
        similarItems: true,
    },

    // Level 30: Hybrid — Stroop-like (text one color, collect the other)
    30: {
        level: 30,
        mode: 'hybrid',
        boatSpeed: 92,
        riverWidthRatio: 0.68,
        obstacleFrequency: 3.2,
        itemSpawnRate: 1.8,
        itemPoolCategories: ['fruit', 'dessert', 'vegetable'],
        rule: {
            instructionThai: 'เก็บเฉพาะผักเท่านั้น!',
            collectFilter: ['vegetable'],
            avoidFilter: ['fruit'],
        },
        memoryCapacity: 3,
        coinFrequency: 0,
        difficultyMultiplier: 1.3,
        parTimeSeconds: 65,
        timeLimitSeconds: 110,
        itemCount: 16,
        hybridSwitchAt: 0.5,
        switchToRule: {
            instructionThai: '⚡ เปลี่ยนกฎ! เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ!',
            collectFilter: ['fruit', 'dessert', 'vegetable'],
        },
    },

    // Level 31: Mode A — Price hunt: collect items < 50 Baht
    31: {
        level: 31,
        mode: 'modeA',
        boatSpeed: 95,
        riverWidthRatio: 0.66,
        obstacleFrequency: 3.0,
        itemSpawnRate: 1.6,
        itemPoolCategories: ['fruit', 'dessert', 'noodle'],
        rule: {
            instructionThai: 'เก็บของที่ราคาต่ำกว่า 30 บาท!',
            collectFilter: ['fruit', 'dessert', 'noodle'],
        },
        memoryCapacity: 0,
        coinFrequency: 3.5,
        difficultyMultiplier: 1.35,
        parTimeSeconds: 60,
        timeLimitSeconds: 105,
        itemCount: 16,
    },

    // Level 32: Mode B — The Fake-Out (sack shakes but isn't full)
    32: {
        level: 32,
        mode: 'modeB',
        boatSpeed: 92,
        riverWidthRatio: 0.66,
        obstacleFrequency: 3.2,
        itemSpawnRate: 2.0,
        itemPoolCategories: ['fruit', 'dessert', 'vegetable', 'fish'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ!',
            collectFilter: ['fruit', 'dessert', 'vegetable', 'fish'],
        },
        memoryCapacity: 5,
        coinFrequency: 0,
        difficultyMultiplier: 1.35,
        parTimeSeconds: 70,
        timeLimitSeconds: 120,
        itemCount: 20,
        distractions: true,
    },

    // Level 33: Mode A — Low visibility (fog/rain)
    33: {
        level: 33,
        mode: 'modeA',
        boatSpeed: 85,
        riverWidthRatio: 0.66,
        obstacleFrequency: 3.0,
        itemSpawnRate: 2.0,
        itemPoolCategories: ['fruit', 'dessert', 'fish'],
        rule: {
            instructionThai: '🌧️ ฝนตก! เก็บเฉพาะผลไม้เท่านั้น!',
            collectFilter: ['fruit'],
            avoidFilter: ['fish'],
        },
        memoryCapacity: 0,
        coinFrequency: 4,
        difficultyMultiplier: 1.4,
        parTimeSeconds: 60,
        timeLimitSeconds: 100,
        itemCount: 14,
        lowVisibility: true,
    },

    // Level 34: Mode B — Total Recall (5 items, high difficulty)
    34: {
        level: 34,
        mode: 'modeB',
        boatSpeed: 95,
        riverWidthRatio: 0.64,
        obstacleFrequency: 3.0,
        itemSpawnRate: 1.8,
        itemPoolCategories: ['fruit', 'dessert', 'vegetable', 'fish', 'noodle'],
        rule: {
            instructionThai: 'เก็บของใหม่เท่านั้น! อย่าเก็บซ้ำ! (ยากสุด!)',
            collectFilter: ['fruit', 'dessert', 'vegetable', 'fish', 'noodle'],
        },
        memoryCapacity: 5,
        coinFrequency: 0,
        difficultyMultiplier: 1.45,
        parTimeSeconds: 75,
        timeLimitSeconds: 125,
        itemCount: 22,
        similarItems: true,
    },

    // Level 35: Finale — The Festival (celebration, no fail state)
    35: {
        level: 35,
        mode: 'bonus',
        boatSpeed: 120,
        riverWidthRatio: 0.60,
        obstacleFrequency: 4.0,
        itemSpawnRate: 1.0,
        itemPoolCategories: ['fruit', 'dessert', 'vegetable', 'fish', 'noodle'],
        rule: {
            instructionThai: '🎆 เทศกาล! เก็บทุกอย่าง! 🎆',
            collectFilter: ['fruit', 'dessert', 'vegetable', 'fish', 'noodle', 'coin'],
        },
        memoryCapacity: 0,
        coinFrequency: 0.5,
        difficultyMultiplier: 1.5,
        parTimeSeconds: 30,
        timeLimitSeconds: 50,
        itemCount: 30,
        noFailState: true,
    },
};
