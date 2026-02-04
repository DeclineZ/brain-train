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
    chordChance?: number;     // 0.0 to 1.0 probability of spawning a chord
}

// BGM Tracks
const BGM = {
    SLOW: { path: '/assets/sounds/dreamdirect/BGM_Slow_60BPM.mp3', bpm: 60 },
    MED: { path: '/assets/sounds/dreamdirect/BGM_Med_80BPM.mp3', bpm: 80 },
    FAST: { path: '/assets/sounds/dreamdirect/BGM_Fast_100BPM.mp3', bpm: 100 },
    SWING: { path: '/assets/sounds/dreamdirect/BGM_Swing.mp3', bpm: 100 },
};

export const DREAMDIRECT_LEVELS: { [key: number]: DreamDirectLevelConfig } = {
    // === TUTORIAL (Level 0) ===
    0: {
        level: 0,
        bpm: 60,
        bgmTrack: BGM.SLOW,
        arrowTypes: ['anchor'],
        arrowCount: 8,
        timingWindowMultiplier: 1.5,
        difficultyMultiplier: 1.0,
        chordChance: 0
    },

    // === CHAPTER 1: THE DRIFT (Basic Training) ===
    // Focus: Directional arrows, single lane feel
    1: { level: 1, bpm: 60, bgmTrack: BGM.SLOW, arrowTypes: ['anchor'], arrowCount: 12, timingWindowMultiplier: 1.3, difficultyMultiplier: 1.0, chordChance: 0 },
    2: { level: 2, bpm: 70, bgmTrack: BGM.SLOW, arrowTypes: ['anchor'], arrowCount: 16, timingWindowMultiplier: 1.2, difficultyMultiplier: 1.05, chordChance: 0 },
    3: { level: 3, bpm: 80, bgmTrack: BGM.MED, arrowTypes: ['anchor', 'ghost'], arrowCount: 16, timingWindowMultiplier: 1.1, difficultyMultiplier: 1.1, chordChance: 0 },
    4: { level: 4, bpm: 80, bgmTrack: BGM.MED, arrowTypes: ['anchor', 'ghost'], arrowCount: 20, timingWindowMultiplier: 1.0, difficultyMultiplier: 1.15, chordChance: 0.05 },
    5: { level: 5, bpm: 80, bgmTrack: BGM.MED, arrowTypes: ['anchor', 'ghost'], arrowCount: 24, timingWindowMultiplier: 1.0, difficultyMultiplier: 1.2, chordChance: 0.1 },

    // === CHAPTER 2: THE FOG (Introduction to Chords) ===
    // Focus: Simple Chords (2 arrows at once)
    6: { level: 6, bpm: 70, bgmTrack: BGM.SLOW, arrowTypes: ['ghost', 'fade'], arrowCount: 16, timingWindowMultiplier: 1.2, difficultyMultiplier: 1.2, chordChance: 0.1 },
    7: { level: 7, bpm: 80, bgmTrack: BGM.MED, arrowTypes: ['ghost', 'fade'], arrowCount: 20, timingWindowMultiplier: 1.1, difficultyMultiplier: 1.25, chordChance: 0.15 },
    8: { level: 8, bpm: 80, bgmTrack: BGM.MED, arrowTypes: ['ghost', 'anchor', 'fade'], arrowCount: 24, timingWindowMultiplier: 1.0, difficultyMultiplier: 1.3, chordChance: 0.15 },
    9: { level: 9, bpm: 80, bgmTrack: BGM.MED, arrowTypes: ['ghost', 'double'], arrowCount: 22, timingWindowMultiplier: 1.1, difficultyMultiplier: 1.3, chordChance: 0.2 },
    10: { level: 10, bpm: 80, bgmTrack: BGM.MED, arrowTypes: ['ghost', 'fade'], arrowCount: 28, timingWindowMultiplier: 1.0, difficultyMultiplier: 1.35, chordChance: 0.2 },

    // === CHAPTER 3: THE TURBULENCE (Impulse & Complexity) ===
    // Focus: Wiggler, Spinner, higher Chord density
    11: { level: 11, bpm: 80, bgmTrack: BGM.MED, arrowTypes: ['ghost', 'wiggler'], arrowCount: 20, timingWindowMultiplier: 1.1, difficultyMultiplier: 1.35, chordChance: 0.2 },
    12: { level: 12, bpm: 90, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'wiggler'], arrowCount: 26, timingWindowMultiplier: 1.0, difficultyMultiplier: 1.4, chordChance: 0.25 },
    13: { level: 13, bpm: 90, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'spinner'], arrowCount: 24, timingWindowMultiplier: 1.0, difficultyMultiplier: 1.45, chordChance: 0.25 },
    14: { level: 14, bpm: 90, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'wiggler', 'spinner'], arrowCount: 30, timingWindowMultiplier: 0.95, difficultyMultiplier: 1.5, chordChance: 0.3 },
    15: { level: 15, bpm: 100, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'wiggler', 'spinner'], arrowCount: 34, timingWindowMultiplier: 0.9, difficultyMultiplier: 1.55, chordChance: 0.3 },

    // === CHAPTER 4: THE STORM (Lane Switching) ===
    // Focus: Lateral thinking, visual noise
    16: { level: 16, bpm: 80, bgmTrack: BGM.MED, arrowTypes: ['ghost', 'anchor'], arrowCount: 28, timingWindowMultiplier: 1.0, difficultyMultiplier: 1.5, spawnFromSides: true, chordChance: 0.2 },
    17: { level: 17, bpm: 90, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'fade'], arrowCount: 32, timingWindowMultiplier: 0.95, difficultyMultiplier: 1.55, spawnFromSides: true, chordChance: 0.25 },
    18: { level: 18, bpm: 90, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'wiggler'], arrowCount: 34, timingWindowMultiplier: 0.9, difficultyMultiplier: 1.6, spawnFromSides: true, chordChance: 0.3 },
    19: { level: 19, bpm: 100, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'spinner'], arrowCount: 36, timingWindowMultiplier: 0.9, difficultyMultiplier: 1.65, spawnFromSides: true, chordChance: 0.3 },
    20: { level: 20, bpm: 100, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'fade', 'double'], arrowCount: 40, timingWindowMultiplier: 0.85, difficultyMultiplier: 1.7, spawnFromSides: true, chordChance: 0.35 },

    // === CHAPTER 5: LUCID DREAMING (Holds) ===
    // Focus: Hold Arrows appearing
    21: { level: 21, bpm: 100, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'hold_solid'], arrowCount: 36, timingWindowMultiplier: 0.9, difficultyMultiplier: 1.7, chordChance: 0.2 },
    22: { level: 22, bpm: 100, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'double', 'hold_solid'], arrowCount: 38, timingWindowMultiplier: 0.85, difficultyMultiplier: 1.75, chordChance: 0.2 },
    23: { level: 23, bpm: 110, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'fade', 'hold_solid'], arrowCount: 40, timingWindowMultiplier: 0.85, difficultyMultiplier: 1.8, chordChance: 0.25 },
    24: { level: 24, bpm: 110, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'spinner', 'double', 'hold_solid'], arrowCount: 42, timingWindowMultiplier: 0.8, difficultyMultiplier: 1.85, chordChance: 0.25 },
    25: { level: 25, bpm: 110, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade', 'hold_solid'], arrowCount: 46, timingWindowMultiplier: 0.8, difficultyMultiplier: 1.9, chordChance: 0.3 },

    // === CHAPTER 6: AWAKENING (Swing & Syncopation) ===
    // Focus: Complex Rhythms + Hollow Holds
    26: { level: 26, bpm: 90, bgmTrack: BGM.SWING, arrowTypes: ['ghost', 'anchor', 'hold_hollow'], arrowCount: 34, timingWindowMultiplier: 0.9, difficultyMultiplier: 1.85, swingRhythm: true, chordChance: 0.2 },
    27: { level: 27, bpm: 95, bgmTrack: BGM.SWING, arrowTypes: ['ghost', 'anchor', 'wiggler', 'hold_solid', 'hold_hollow'], arrowCount: 38, timingWindowMultiplier: 0.85, difficultyMultiplier: 1.9, swingRhythm: true, chordChance: 0.25 },
    28: { level: 28, bpm: 100, bgmTrack: BGM.SWING, arrowTypes: ['ghost', 'anchor', 'hold_solid', 'hold_hollow'], arrowCount: 42, timingWindowMultiplier: 0.8, difficultyMultiplier: 1.95, swingRhythm: true, chordChance: 0.3 },
    29: { level: 29, bpm: 100, bgmTrack: BGM.SWING, arrowTypes: ['ghost', 'double', 'hold_solid', 'hold_hollow'], arrowCount: 46, timingWindowMultiplier: 0.75, difficultyMultiplier: 2.0, swingRhythm: true, chordChance: 0.35 },
    30: { level: 30, bpm: 110, bgmTrack: BGM.SWING, arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade', 'spinner', 'hold_solid', 'hold_hollow'], arrowCount: 50, timingWindowMultiplier: 0.7, difficultyMultiplier: 2.0, swingRhythm: true, chordChance: 0.4 },

    // === CHAPTER 7: NIGHTMARE (Mastery) ===
    // Maximum Intensity, Polyrhythms, Endurance
    31: { level: 31, bpm: 120, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'hold_solid', 'hold_hollow'], arrowCount: 55, timingWindowMultiplier: 0.7, difficultyMultiplier: 2.1, chordChance: 0.3 },
    32: { level: 32, bpm: 120, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'wiggler', 'spinner', 'hold_solid', 'hold_hollow'], arrowCount: 60, timingWindowMultiplier: 0.7, difficultyMultiplier: 2.2, spawnFromSides: true, chordChance: 0.4 },
    33: { level: 33, bpm: 125, bgmTrack: BGM.SWING, arrowTypes: ['ghost', 'double', 'hold_solid', 'hold_hollow'], arrowCount: 65, timingWindowMultiplier: 0.65, difficultyMultiplier: 2.3, swingRhythm: true, chordChance: 0.45 },
    34: { level: 34, bpm: 130, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'fade', 'spinner', 'hold_solid', 'hold_hollow'], arrowCount: 70, timingWindowMultiplier: 0.65, difficultyMultiplier: 2.4, chordChance: 0.5 },
    35: { level: 35, bpm: 140, bgmTrack: BGM.FAST, arrowTypes: ['ghost', 'anchor', 'wiggler', 'fade', 'spinner', 'double', 'hold_solid', 'hold_hollow'], arrowCount: 80, timingWindowMultiplier: 0.6, difficultyMultiplier: 2.5, spawnFromSides: true, chordChance: 0.6 },
};
