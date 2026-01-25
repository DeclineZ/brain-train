import { ArrowType } from './config';

export interface DreamDirectLevelConfig {
    level: number;
    bpm: number;
    bgmTrack: { path: string; bpm: number }; // Path to BGM file and its native BPM
    arrowTypes: ArrowType[];
    arrowCount: number;
    timingWindowMultiplier: number; // 1.0 = normal windows, <1 = stricter
    difficultyMultiplier: number;
    spawnFromSides?: boolean; // For lanes mechanic
    swingRhythm?: boolean;    // For jazz beats
}

// BGM Tracks
const BGM = {
    SLOW: { path: '/assets/sounds/dreamdirect/BGM_Slow_60BPM.mp3', bpm: 60 },
    MED: { path: '/assets/sounds/dreamdirect/BGM_Med_80BPM.mp3', bpm: 80 },
    FAST: { path: '/assets/sounds/dreamdirect/BGM_Fast_100BPM.mp3', bpm: 100 },
    SWING: { path: '/assets/sounds/dreamdirect/BGM_Swing.mp3', bpm: 100 }, // Assuming 100 base for Swing
};

export const DREAMDIRECT_LEVELS: { [key: number]: DreamDirectLevelConfig } = {
    // === TUTORIAL (Level 0) ===
    0: {
        level: 0,
        bpm: 60,
        bgmTrack: BGM.SLOW,
        arrowTypes: ['ghost'],
        arrowCount: 8,
        timingWindowMultiplier: 1.5, // Very forgiving
        difficultyMultiplier: 1.0,
    },

    // === CHAPTER 1: THE DRIFT (Basic Training) ===
    // Focus: Ghost arrows (OPPOSITE rule), learn rhythm
    1: {
        level: 1,
        bpm: 60,
        bgmTrack: BGM.SLOW,
        arrowTypes: ['ghost'],
        arrowCount: 12,
        timingWindowMultiplier: 1.3,
        difficultyMultiplier: 1.0,
    },
    2: {
        level: 2,
        bpm: 70,
        bgmTrack: BGM.SLOW,
        arrowTypes: ['ghost'],
        arrowCount: 16,
        timingWindowMultiplier: 1.2,
        difficultyMultiplier: 1.05,
    },
    3: {
        level: 3,
        bpm: 80,
        bgmTrack: BGM.MED,
        arrowTypes: ['ghost', 'anchor'],
        arrowCount: 16,
        timingWindowMultiplier: 1.1,
        difficultyMultiplier: 1.1,
    },
    4: {
        level: 4,
        bpm: 80,
        bgmTrack: BGM.MED,
        arrowTypes: ['ghost', 'anchor'],
        arrowCount: 20,
        timingWindowMultiplier: 1.0,
        difficultyMultiplier: 1.15,
    },
    5: {
        level: 5,
        bpm: 80,
        bgmTrack: BGM.MED,
        arrowTypes: ['ghost', 'anchor'],
        arrowCount: 24,
        timingWindowMultiplier: 1.0,
        difficultyMultiplier: 1.2,
    },

    // === CHAPTER 2: THE FOG (Memory) ===
    // Introduce Fade and Double arrows
    6: {
        level: 6,
        bpm: 70,
        bgmTrack: BGM.SLOW,
        arrowTypes: ['ghost', 'fade'],
        arrowCount: 16,
        timingWindowMultiplier: 1.2,
        difficultyMultiplier: 1.2,
    },
    7: {
        level: 7,
        bpm: 80,
        bgmTrack: BGM.MED,
        arrowTypes: ['ghost', 'fade'],
        arrowCount: 20,
        timingWindowMultiplier: 1.1,
        difficultyMultiplier: 1.25,
    },
    8: {
        level: 8,
        bpm: 80,
        bgmTrack: BGM.MED,
        arrowTypes: ['ghost', 'anchor', 'fade'],
        arrowCount: 20,
        timingWindowMultiplier: 1.0,
        difficultyMultiplier: 1.3,
    },
    9: {
        level: 9,
        bpm: 80,
        bgmTrack: BGM.MED,
        arrowTypes: ['ghost', 'double'],
        arrowCount: 18,
        timingWindowMultiplier: 1.1,
        difficultyMultiplier: 1.3,
    },
    10: {
        level: 10,
        bpm: 80,
        bgmTrack: BGM.MED,
        arrowTypes: ['ghost', 'fade', 'fade', 'fade'], // Weighted more fade
        arrowCount: 24,
        timingWindowMultiplier: 1.0,
        difficultyMultiplier: 1.35,
    },

    // === CHAPTER 3: THE TURBULENCE (Impulse Control) ===
    // Introduce Wiggler and Spinner
    11: {
        level: 11,
        bpm: 80,
        bgmTrack: BGM.MED,
        arrowTypes: ['ghost', 'wiggler'],
        arrowCount: 18,
        timingWindowMultiplier: 1.1,
        difficultyMultiplier: 1.35,
    },
    12: {
        level: 12,
        bpm: 90,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'wiggler'],
        arrowCount: 22,
        timingWindowMultiplier: 1.0,
        difficultyMultiplier: 1.4,
    },
    13: {
        level: 13,
        bpm: 90,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'spinner'],
        arrowCount: 20,
        timingWindowMultiplier: 1.0,
        difficultyMultiplier: 1.45,
    },
    14: {
        level: 14,
        bpm: 90,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'anchor', 'wiggler', 'spinner'],
        arrowCount: 24,
        timingWindowMultiplier: 0.95,
        difficultyMultiplier: 1.5,
    },
    15: {
        level: 15,
        bpm: 100,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'anchor', 'wiggler', 'spinner'],
        arrowCount: 30,
        timingWindowMultiplier: 0.9,
        difficultyMultiplier: 1.55,
    },

    // === CHAPTER 4: THE STORM (Lane Switching) ===
    // Arrows come from different directions
    16: {
        level: 16,
        bpm: 80,
        bgmTrack: BGM.MED,
        arrowTypes: ['ghost', 'anchor'],
        arrowCount: 24,
        timingWindowMultiplier: 1.0,
        difficultyMultiplier: 1.5,
        spawnFromSides: true,
    },
    17: {
        level: 17,
        bpm: 90,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'anchor', 'fade'],
        arrowCount: 28,
        timingWindowMultiplier: 0.95,
        difficultyMultiplier: 1.55,
        spawnFromSides: true,
    },
    18: {
        level: 18,
        bpm: 90,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'anchor', 'wiggler'],
        arrowCount: 28,
        timingWindowMultiplier: 0.9,
        difficultyMultiplier: 1.6,
        spawnFromSides: true,
    },
    19: {
        level: 19,
        bpm: 100,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'anchor', 'spinner'],
        arrowCount: 30,
        timingWindowMultiplier: 0.9,
        difficultyMultiplier: 1.65,
        spawnFromSides: true,
    },
    20: {
        level: 20,
        bpm: 100,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'anchor', 'fade', 'double'],
        arrowCount: 32,
        timingWindowMultiplier: 0.85,
        difficultyMultiplier: 1.7,
        spawnFromSides: true,
    },

    // === CHAPTER 5: LUCID DREAMING (High Speed) ===
    // BPM increases, all arrow types active
    21: {
        level: 21,
        bpm: 100,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade', 'spinner'],
        arrowCount: 30,
        timingWindowMultiplier: 0.9,
        difficultyMultiplier: 1.7,
    },
    22: {
        level: 22,
        bpm: 100,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade', 'spinner', 'double'],
        arrowCount: 32,
        timingWindowMultiplier: 0.85,
        difficultyMultiplier: 1.75,
    },
    23: {
        level: 23,
        bpm: 110,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade', 'spinner'],
        arrowCount: 34,
        timingWindowMultiplier: 0.85,
        difficultyMultiplier: 1.8,
    },
    24: {
        level: 24,
        bpm: 110,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade', 'spinner', 'double'],
        arrowCount: 36,
        timingWindowMultiplier: 0.8,
        difficultyMultiplier: 1.85,
    },
    25: {
        level: 25,
        bpm: 110,
        bgmTrack: BGM.FAST,
        arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade', 'spinner', 'double'],
        arrowCount: 40,
        timingWindowMultiplier: 0.8,
        difficultyMultiplier: 1.9,
    },

    // === CHAPTER 6: AWAKENING (Mastery) ===
    // Jazz rhythms with swing feel
    26: {
        level: 26,
        bpm: 90,
        bgmTrack: BGM.SWING,
        arrowTypes: ['ghost', 'anchor', 'fade'],
        arrowCount: 30,
        timingWindowMultiplier: 0.9,
        difficultyMultiplier: 1.85,
        swingRhythm: true,
    },
    27: {
        level: 27,
        bpm: 95,
        bgmTrack: BGM.SWING,
        arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade'],
        arrowCount: 34,
        timingWindowMultiplier: 0.85,
        difficultyMultiplier: 1.9,
        swingRhythm: true,
    },
    28: {
        level: 28,
        bpm: 100,
        bgmTrack: BGM.SWING,
        arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade', 'spinner'],
        arrowCount: 36,
        timingWindowMultiplier: 0.8,
        difficultyMultiplier: 1.95,
        swingRhythm: true,
    },
    29: {
        level: 29,
        bpm: 100,
        bgmTrack: BGM.SWING,
        arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade', 'spinner', 'double'],
        arrowCount: 40,
        timingWindowMultiplier: 0.75,
        difficultyMultiplier: 2.0,
        swingRhythm: true,
    },
    30: {
        level: 30,
        bpm: 110,
        bgmTrack: BGM.SWING,
        arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade', 'spinner', 'double'],
        arrowCount: 45,
        timingWindowMultiplier: 0.7,
        difficultyMultiplier: 2.0,
        swingRhythm: true,
    },
};
