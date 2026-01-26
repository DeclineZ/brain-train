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
};
