// Floating Market Memory Game Types — "Runjum: Talad Kwam Jum"

// ==================== GAME MODES ====================

export type GameMode = 'tutorial' | 'modeA' | 'modeB' | 'hybrid' | 'bonus';

// ==================== ITEM SYSTEM ====================

export type ItemCategory = 'fruit' | 'dessert' | 'vegetable' | 'fish' | 'noodle' | 'drink' | 'rock' | 'lotus';

export interface MarketItem {
    id: string;
    nameThai: string;
    category: ItemCategory;
    color: number;          // Primary color for procedural texture
    secondaryColor?: number;
    shape: 'circle' | 'oval' | 'drop' | 'rectangle' | 'curved' | 'spiky';
    priceTag?: number;      // Used for Level 26 math hunt variant
}

// ==================== RULES ====================

/** What the player should collect / avoid */
export interface LevelRule {
    /** Thai text for the instruction banner */
    instructionThai: string;
    /** The categories or item IDs to COLLECT */
    collectFilter: ItemCategory[] | string[];  // categories OR specific item IDs
    /** The categories or item IDs to AVOID (hitting these = penalty) */
    avoidFilter?: ItemCategory[] | string[];
    /** If true, filters are item IDs not categories */
    filterByItemId?: boolean;
    /** Negative rule: "collect NOT X" — collect everything EXCEPT avoidFilter */
    negativeRule?: boolean;
}

// ==================== LEVEL CONFIG ====================

export interface FloatingMarketLevelConfig {
    level: number;
    mode: GameMode;
    boatSpeed: number;
    riverWidthRatio: number;
    obstacleFrequency: number;
    itemSpawnRate: number;       // seconds between floating item spawns
    itemPoolCategories: ItemCategory[];  // which categories can appear
    rule: LevelRule;
    memoryCapacity: number;      // Mode B: max unique items before level ends or resets
    coinFrequency: number;
    difficultyMultiplier: number;
    parTimeSeconds: number;
    timeLimitSeconds: number;
    itemCount: number;           // total items to spawn before level can end
    // Special flags
    itemDrift?: boolean;         // items drift left/right in water
    distractions?: boolean;      // birds/distractions fly across
    hybridSwitchAt?: number;     // fraction (0-1) of level to switch modes (hybrid only)
    switchToRule?: LevelRule;    // rule after hybrid switch
    lowVisibility?: boolean;     // night/fog mode
    noFailState?: boolean;       // finale celebration mode
    similarItems?: boolean;      // all items look similar (same color family)
    resetBasketAt?: number;      // Mode B: reset basket after this many items (Level 17 mechanic)
}

// ==================== STATS ====================

export interface FloatingMarketRawStats {
    current_played: number;
    difficultyMultiplier: number;
    mode: GameMode;
    // Memory metrics
    correctCollections: number;
    incorrectCollections: number;   // collected avoid-category items (Mode A) or duplicates (Mode B)
    missedItems: number;            // items that passed without being collected
    duplicatePickups: number;       // Mode B specific
    memoryCapacity: number;         // Mode B: how many items were being tracked
    // Steering / spatial
    totalCollisions: number;
    // Timing
    reactionTimes: number[];
    hesitationCount: number;
    // Scoring
    bonusCoins: number;
    stars: number;
    success: boolean;
    totalTimeMs: number;
    totalItemsSpawned: number;
    totalItemsCollected: number;
}
