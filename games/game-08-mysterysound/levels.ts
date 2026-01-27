import type { MysterySoundLevelConfig } from '@/types';

// Animal options for reuse
const ANIMALS = {
    cat: { id: 'cat', label: 'แมว' },
    dog: { id: 'dog', label: 'หมา' },
    pig: { id: 'pig', label: 'หมู' },
    snake: { id: 'snake', label: 'งู' },
    fly: { id: 'fly', label: 'แมลงวัน' },
    frog: { id: 'frog', label: 'กบ' },
    parrot: { id: 'parrot', label: 'นกแก้ว' },
    bear: { id: 'bear', label: 'หมี' },
    chicken: { id: 'chicken', label: 'ไก่' },
    cow: { id: 'cow', label: 'วัว' },
};

// Hybrid animals for Level 5
const HYBRIDS = {
    cat_parrot: { id: 'cat_parrot', label: 'แมว+นกแก้ว', isHybrid: true },
    dog_frog: { id: 'dog_frog', label: 'หมา+กบ', isHybrid: true },
    pig_chicken: { id: 'pig_chicken', label: 'หมู+ไก่', isHybrid: true },
    cow_bear: { id: 'cow_bear', label: 'วัว+หมี', isHybrid: true },
};

// Everyday sound options for Level 6-10
const EVERYDAY_SOUNDS = {
    boat: { id: 'boat', label: 'เรือ' },
    rain: { id: 'rain', label: 'ฝนตก' },
    train: { id: 'train', label: 'รถไฟ' },
    waterfall: { id: 'waterfall', label: 'น้ำตก' },
    door: { id: 'door', label: 'ปิดประตู' },
    bell: { id: 'bell', label: 'กระดิ่ง' },
    aircon: { id: 'aircon', label: 'แอร์' },
    nailclipper: { id: 'nailclipper', label: 'กรรไกรตัดเล็บ' },
    paper: { id: 'paper', label: 'ฉีกกระดาษ' },
    laugh: { id: 'laugh', label: 'หัวเราะ' },
};

// Hybrid everyday sounds for Level 10
const EVERYDAY_HYBRIDS = {
    boat_train: { id: 'boat_train', label: 'เรือ+รถไฟ', isHybrid: true },
    rain_waterfall: { id: 'rain_waterfall', label: 'ฝน+น้ำตก', isHybrid: true },
    bell_aircon: { id: 'bell_aircon', label: 'กระดิ่ง+แอร์', isHybrid: true },
    laugh_door: { id: 'laugh_door', label: 'หัวเราะ+ประตู', isHybrid: true },
};

// Level configurations for Mystery Sound game
// Each level has 2 questions
export const MYSTERY_SOUND_LEVELS: Record<number, MysterySoundLevelConfig> = {
    // Level 0: Tutorial (easy, unlimited time)
    0: {
        level: 0,
        questions: [
            {
                sounds: ['cat'],
                correctAnswers: ['cat'],
                options: [ANIMALS.cat, ANIMALS.dog, ANIMALS.pig, ANIMALS.snake],
            },
            {
                sounds: ['dog'],
                correctAnswers: ['dog'],
                options: [ANIMALS.dog, ANIMALS.frog, ANIMALS.parrot, ANIMALS.cow],
            },
        ],
        maxReplays: 3,
        timeLimitSeconds: 999,
        difficultyMultiplier: 1.0,
    },

    // Level 1: เรียนรู้เสียง (Single Sounds)
    1: {
        level: 1,
        questions: [
            {
                sounds: ['cat'],
                correctAnswers: ['cat'],
                options: [ANIMALS.cat, ANIMALS.dog, ANIMALS.pig, ANIMALS.snake],
            },
            {
                sounds: ['dog'],
                correctAnswers: ['dog'],
                options: [ANIMALS.dog, ANIMALS.frog, ANIMALS.parrot, ANIMALS.cow],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 30,
        difficultyMultiplier: 1.0,
    },

    // Level 2: เริ่มผสม (Q1=single, Q2=mixed)
    2: {
        level: 2,
        questions: [
            {
                sounds: ['pig'],
                correctAnswers: ['pig'],
                options: [ANIMALS.pig, ANIMALS.fly, ANIMALS.bear, ANIMALS.chicken],
            },
            {
                sounds: ['frog', 'parrot'],
                correctAnswers: ['frog', 'parrot'],
                options: [ANIMALS.frog, ANIMALS.parrot, ANIMALS.snake, ANIMALS.cow],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 30,
        difficultyMultiplier: 1.1,
    },

    // Level 3: ผสมเสียง (Both Mixed)
    3: {
        level: 3,
        questions: [
            {
                sounds: ['bear', 'chicken'],
                correctAnswers: ['bear', 'chicken'],
                options: [ANIMALS.bear, ANIMALS.chicken, ANIMALS.cat, ANIMALS.dog],
            },
            {
                sounds: ['cow', 'snake'],
                correctAnswers: ['cow', 'snake'],
                options: [ANIMALS.cow, ANIMALS.snake, ANIMALS.pig, ANIMALS.frog],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 35,
        difficultyMultiplier: 1.2,
    },

    // Level 4: ผสมยากขึ้น
    4: {
        level: 4,
        questions: [
            {
                sounds: ['fly', 'cat'],
                correctAnswers: ['fly', 'cat'],
                options: [ANIMALS.fly, ANIMALS.cat, ANIMALS.parrot, ANIMALS.bear],
            },
            {
                sounds: ['dog', 'pig'],
                correctAnswers: ['dog', 'pig'],
                options: [ANIMALS.dog, ANIMALS.pig, ANIMALS.chicken, ANIMALS.frog],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 35,
        difficultyMultiplier: 1.3,
    },

    // Level 5: Hybrid Images
    5: {
        level: 5,
        questions: [
            {
                sounds: ['cat', 'parrot'],
                correctAnswers: ['cat_parrot'],
                options: [HYBRIDS.cat_parrot, HYBRIDS.dog_frog, HYBRIDS.pig_chicken, HYBRIDS.cow_bear],
                isHybrid: true,
            },
            {
                sounds: ['cow', 'bear'],
                correctAnswers: ['cow_bear'],
                options: [HYBRIDS.cow_bear, HYBRIDS.cat_parrot, HYBRIDS.dog_frog, HYBRIDS.pig_chicken],
                isHybrid: true,
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 40,
        difficultyMultiplier: 1.4,
    },

    // ========== EVERYDAY SOUNDS (Level 6-10) ==========

    // Level 6: เรียนรู้เสียงใหม่ (Introduction - Single Sounds with labels)
    6: {
        level: 6,
        questions: [
            {
                sounds: ['boat'],
                correctAnswers: ['boat'],
                options: [EVERYDAY_SOUNDS.boat, EVERYDAY_SOUNDS.rain, EVERYDAY_SOUNDS.train, EVERYDAY_SOUNDS.waterfall],
            },
            {
                sounds: ['rain'],
                correctAnswers: ['rain'],
                options: [EVERYDAY_SOUNDS.rain, EVERYDAY_SOUNDS.boat, EVERYDAY_SOUNDS.train, EVERYDAY_SOUNDS.waterfall],
            },
        ],
        maxReplays: 3,
        timeLimitSeconds: 60,
        difficultyMultiplier: 1.0,
    },

    // Level 7: ทดสอบเสียงเดี่ยว + เริ่มผสม (Q1=single, Q2=mixed)
    7: {
        level: 7,
        questions: [
            {
                sounds: ['train'],
                correctAnswers: ['train'],
                options: [EVERYDAY_SOUNDS.train, EVERYDAY_SOUNDS.waterfall, EVERYDAY_SOUNDS.door, EVERYDAY_SOUNDS.bell],
            },
            {
                sounds: ['waterfall', 'door'],
                correctAnswers: ['waterfall', 'door'],
                options: [EVERYDAY_SOUNDS.waterfall, EVERYDAY_SOUNDS.door, EVERYDAY_SOUNDS.bell, EVERYDAY_SOUNDS.aircon],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 35,
        difficultyMultiplier: 1.5,
    },

    // Level 8: เสียงผสม (Both Mixed)
    8: {
        level: 8,
        questions: [
            {
                sounds: ['bell', 'aircon'],
                correctAnswers: ['bell', 'aircon'],
                options: [EVERYDAY_SOUNDS.bell, EVERYDAY_SOUNDS.aircon, EVERYDAY_SOUNDS.nailclipper, EVERYDAY_SOUNDS.paper],
            },
            {
                sounds: ['nailclipper', 'paper'],
                correctAnswers: ['nailclipper', 'paper'],
                options: [EVERYDAY_SOUNDS.nailclipper, EVERYDAY_SOUNDS.paper, EVERYDAY_SOUNDS.bell, EVERYDAY_SOUNDS.aircon],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 40,
        difficultyMultiplier: 1.6,
    },

    // Level 9: เสียงผสมยากขึ้น
    9: {
        level: 9,
        questions: [
            {
                sounds: ['laugh', 'rain'],
                correctAnswers: ['laugh', 'rain'],
                options: [EVERYDAY_SOUNDS.laugh, EVERYDAY_SOUNDS.rain, EVERYDAY_SOUNDS.boat, EVERYDAY_SOUNDS.train],
            },
            {
                sounds: ['boat', 'train'],
                correctAnswers: ['boat', 'train'],
                options: [EVERYDAY_SOUNDS.boat, EVERYDAY_SOUNDS.train, EVERYDAY_SOUNDS.laugh, EVERYDAY_SOUNDS.rain],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 40,
        difficultyMultiplier: 1.7,
    },

    // Level 10: Hybrid Images (Everyday Sounds)
    10: {
        level: 10,
        questions: [
            {
                sounds: ['boat', 'train'],
                correctAnswers: ['boat_train'],
                options: [EVERYDAY_HYBRIDS.boat_train, EVERYDAY_HYBRIDS.rain_waterfall, EVERYDAY_HYBRIDS.bell_aircon, EVERYDAY_HYBRIDS.laugh_door],
                isHybrid: true,
            },
            {
                sounds: ['rain', 'waterfall'],
                correctAnswers: ['rain_waterfall'],
                options: [EVERYDAY_HYBRIDS.rain_waterfall, EVERYDAY_HYBRIDS.boat_train, EVERYDAY_HYBRIDS.bell_aircon, EVERYDAY_HYBRIDS.laugh_door],
                isHybrid: true,
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 45,
        difficultyMultiplier: 1.8,
    },

    // ========== MIXED CATEGORY LEVELS (11-12) ==========
    // Q1 = Animal sound, Q2 = Everyday sound

    // Level 11: Mixed Category Introduction
    11: {
        level: 11,
        questions: [
            {
                sounds: ['bear'],
                correctAnswers: ['bear'],
                options: [ANIMALS.bear, ANIMALS.chicken, ANIMALS.frog, ANIMALS.parrot],
            },
            {
                sounds: ['bell'],
                correctAnswers: ['bell'],
                options: [EVERYDAY_SOUNDS.bell, EVERYDAY_SOUNDS.door, EVERYDAY_SOUNDS.aircon, EVERYDAY_SOUNDS.paper],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 45,
        difficultyMultiplier: 1.9,
    },

    // Level 12: Mixed Category Challenge
    12: {
        level: 12,
        questions: [
            {
                sounds: ['cow'],
                correctAnswers: ['cow'],
                options: [ANIMALS.cow, ANIMALS.snake, ANIMALS.pig, ANIMALS.fly],
            },
            {
                sounds: ['waterfall'],
                correctAnswers: ['waterfall'],
                options: [EVERYDAY_SOUNDS.waterfall, EVERYDAY_SOUNDS.rain, EVERYDAY_SOUNDS.boat, EVERYDAY_SOUNDS.train],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 45,
        difficultyMultiplier: 2.0,
    },

    // ========== DUAL HYBRID SOUND LEVELS (13-17) ==========
    // Each question plays 2 sounds (1 animal + 1 everyday), must answer both correctly

    // Level 13: Dual Hybrid Introduction
    13: {
        level: 13,
        questions: [
            {
                sounds: ['cat', 'rain'],
                correctAnswers: ['cat', 'rain'],
                options: [ANIMALS.cat, EVERYDAY_SOUNDS.rain, ANIMALS.dog, EVERYDAY_SOUNDS.boat, ANIMALS.frog, EVERYDAY_SOUNDS.bell],
            },
            {
                sounds: ['pig', 'train'],
                correctAnswers: ['pig', 'train'],
                options: [ANIMALS.pig, EVERYDAY_SOUNDS.train, ANIMALS.chicken, EVERYDAY_SOUNDS.waterfall, ANIMALS.bear, EVERYDAY_SOUNDS.door],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 50,
        difficultyMultiplier: 2.1,
    },

    // Level 14: Dual Hybrid
    14: {
        level: 14,
        questions: [
            {
                sounds: ['dog', 'door'],
                correctAnswers: ['dog', 'door'],
                options: [ANIMALS.dog, EVERYDAY_SOUNDS.door, ANIMALS.cat, EVERYDAY_SOUNDS.bell, ANIMALS.parrot, EVERYDAY_SOUNDS.aircon],
            },
            {
                sounds: ['frog', 'bell'],
                correctAnswers: ['frog', 'bell'],
                options: [ANIMALS.frog, EVERYDAY_SOUNDS.bell, ANIMALS.snake, EVERYDAY_SOUNDS.paper, ANIMALS.cow, EVERYDAY_SOUNDS.laugh],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 50,
        difficultyMultiplier: 2.2,
    },

    // Level 15: Dual Hybrid
    15: {
        level: 15,
        questions: [
            {
                sounds: ['parrot', 'aircon'],
                correctAnswers: ['parrot', 'aircon'],
                options: [ANIMALS.parrot, EVERYDAY_SOUNDS.aircon, ANIMALS.chicken, EVERYDAY_SOUNDS.nailclipper, ANIMALS.fly, EVERYDAY_SOUNDS.rain],
            },
            {
                sounds: ['chicken', 'paper'],
                correctAnswers: ['chicken', 'paper'],
                options: [ANIMALS.chicken, EVERYDAY_SOUNDS.paper, ANIMALS.bear, EVERYDAY_SOUNDS.door, ANIMALS.pig, EVERYDAY_SOUNDS.train],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 55,
        difficultyMultiplier: 2.3,
    },

    // Level 16: Dual Hybrid
    16: {
        level: 16,
        questions: [
            {
                sounds: ['cow', 'boat'],
                correctAnswers: ['cow', 'boat'],
                options: [ANIMALS.cow, EVERYDAY_SOUNDS.boat, ANIMALS.snake, EVERYDAY_SOUNDS.waterfall, ANIMALS.dog, EVERYDAY_SOUNDS.laugh],
            },
            {
                sounds: ['snake', 'laugh'],
                correctAnswers: ['snake', 'laugh'],
                options: [ANIMALS.snake, EVERYDAY_SOUNDS.laugh, ANIMALS.frog, EVERYDAY_SOUNDS.bell, ANIMALS.cat, EVERYDAY_SOUNDS.rain],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 55,
        difficultyMultiplier: 2.4,
    },

    // Level 17: Dual Hybrid Expert
    17: {
        level: 17,
        questions: [
            {
                sounds: ['bear', 'waterfall'],
                correctAnswers: ['bear', 'waterfall'],
                options: [ANIMALS.bear, EVERYDAY_SOUNDS.waterfall, ANIMALS.parrot, EVERYDAY_SOUNDS.boat, ANIMALS.cow, EVERYDAY_SOUNDS.train],
            },
            {
                sounds: ['fly', 'nailclipper'],
                correctAnswers: ['fly', 'nailclipper'],
                options: [ANIMALS.fly, EVERYDAY_SOUNDS.nailclipper, ANIMALS.chicken, EVERYDAY_SOUNDS.aircon, ANIMALS.pig, EVERYDAY_SOUNDS.paper],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 60,
        difficultyMultiplier: 2.5,
    },

    // ========== TRIPLE SOUND COMBINATION LEVELS (18-20) ==========
    // Each question plays 3 sounds (1 single + 2 mixed), must answer all 3

    // Level 18: Triple Sound Introduction
    18: {
        level: 18,
        questions: [
            {
                sounds: ['cat', 'boat', 'train'],
                correctAnswers: ['cat', 'boat', 'train'],
                options: [ANIMALS.cat, EVERYDAY_SOUNDS.boat, EVERYDAY_SOUNDS.train, ANIMALS.parrot, EVERYDAY_SOUNDS.rain, EVERYDAY_SOUNDS.door, ANIMALS.dog],
            },
            {
                sounds: ['dog', 'bell', 'aircon'],
                correctAnswers: ['dog', 'bell', 'aircon'],
                options: [ANIMALS.dog, EVERYDAY_SOUNDS.bell, EVERYDAY_SOUNDS.aircon, ANIMALS.cow, EVERYDAY_SOUNDS.paper, EVERYDAY_SOUNDS.laugh, ANIMALS.frog],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 65,
        difficultyMultiplier: 2.6,
    },

    // Level 19: Triple Sound Challenge
    19: {
        level: 19,
        questions: [
            {
                sounds: ['rain', 'pig', 'chicken'],
                correctAnswers: ['rain', 'pig', 'chicken'],
                options: [EVERYDAY_SOUNDS.rain, ANIMALS.pig, ANIMALS.chicken, EVERYDAY_SOUNDS.waterfall, ANIMALS.bear, EVERYDAY_SOUNDS.nailclipper, ANIMALS.snake],
            },
            {
                sounds: ['waterfall', 'frog', 'parrot'],
                correctAnswers: ['waterfall', 'frog', 'parrot'],
                options: [EVERYDAY_SOUNDS.waterfall, ANIMALS.frog, ANIMALS.parrot, EVERYDAY_SOUNDS.boat, ANIMALS.fly, EVERYDAY_SOUNDS.door, ANIMALS.cow],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 70,
        difficultyMultiplier: 2.8,
    },

    // Level 20: Triple Sound Master
    20: {
        level: 20,
        questions: [
            {
                sounds: ['laugh', 'bear', 'snake'],
                correctAnswers: ['laugh', 'bear', 'snake'],
                options: [EVERYDAY_SOUNDS.laugh, ANIMALS.bear, ANIMALS.snake, EVERYDAY_SOUNDS.train, ANIMALS.cow, EVERYDAY_SOUNDS.bell, ANIMALS.fly],
            },
            {
                sounds: ['door', 'cow', 'fly'],
                correctAnswers: ['door', 'cow', 'fly'],
                options: [EVERYDAY_SOUNDS.door, ANIMALS.cow, ANIMALS.fly, EVERYDAY_SOUNDS.paper, ANIMALS.chicken, EVERYDAY_SOUNDS.aircon, ANIMALS.parrot],
            },
        ],
        maxReplays: 1,
        timeLimitSeconds: 75,
        difficultyMultiplier: 3.0,
    },
};
