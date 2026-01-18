import { DreamDirectGameScene } from './GameScene';

export const DreamDirectGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#1a1a2e', // Dark dreamy purple
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: 800,
        height: 600,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [DreamDirectGameScene]
};

// Game Constants
export const DreamDirectConstants = {
    // Timing Windows (milliseconds)
    TIMING: {
        PERFECT: 50,
        GREAT: 150,
        GOOD: 300,
    },

    // Scoring
    SCORE: {
        PERFECT: 100,
        GREAT: 70,
        GOOD: 30,
        MISS: 0,
    },

    // Star Thresholds (percentage of max score)
    STARS: {
        THREE: 85,
        TWO: 50,
    },

    // Visual Constants
    HIT_ZONE_Y: 0.70, // Raised to avoid overlap with buttons (was 0.85)
    SPAWN_Y: 0.1,     // Arrows spawn near top

    // Arrow Colors
    COLORS: {
        GHOST: 0xFFFFFF,      // White/hollow
        ANCHOR: 0xFF4444,      // Solid red
        WIGGLER: 0x44FF44,     // Green squiggly
        FADE: 0x8844FF,        // Purple transparent
        SPINNER: 0xFFAA00,     // Orange
        DOUBLE: 0x00AAFF,      // Blue
    },

    // Directions
    DIRECTIONS: ['up', 'down', 'left', 'right'] as const,
};

export type Direction = typeof DreamDirectConstants.DIRECTIONS[number];
export type ArrowType = 'ghost' | 'anchor' | 'wiggler' | 'fade' | 'spinner' | 'double';
