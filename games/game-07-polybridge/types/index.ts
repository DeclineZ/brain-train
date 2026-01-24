// Bridge Puzzle Game Types

export interface BridgeSegment {
    id: number;
    x: number;              // Pivot point X
    y: number;              // Pivot point Y
    length: number;         // Segment length in pixels
    currentAngle: number;   // Current rotation in degrees
    correctAngle: number;   // Target rotation that is "correct"
    rotationStep: number;   // Degrees per click (default 45)
    type: 'straight' | 'curved'; // Visual type
}

export interface PlatformData {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface LevelData {
    level: number;
    segments: BridgeSegment[];
    startPlatform: PlatformData;
    endPlatform: PlatformData;
    carStart: { x: number; y: number };
    carEnd: { x: number; y: number };
    timeLimit?: number; // Optional time limit in seconds
}

export interface GameState {
    isPlaying: boolean;
    carMoving: boolean;
    gameOver: boolean;
    success: boolean;
}
