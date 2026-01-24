// Game Constants - Separated to avoid circular dependency

export const PolybridgeGameConstants = {
    // Visual
    SEGMENT_WIDTH: 12,          // Bridge segment line width
    SEGMENT_COLOR: 0x222222,    // Dark gray/black for bridge
    PLATFORM_COLOR: 0xB5651D,   // Brown for brick platforms
    CAR_SPEED: 150,             // Pixels per second

    // Game Rules
    ANGLE_TOLERANCE: 5,         // Degrees of tolerance for "correct" angle

    // Z-Indices (Depth)
    DEPTH: {
        BACKGROUND: 0,
        WATER: 5,
        PLATFORM: 10,
        BRIDGE: 20,
        CAR: 30,
        UI: 50,
    },

    // Scoring - Simple for now
    STARS: {
        THREE_STAR_TIME_RATIO: 0.5,  // Complete within 50% of time limit
        TWO_STAR_TIME_RATIO: 0.75,   // Complete within 75% of time limit
    }
};
