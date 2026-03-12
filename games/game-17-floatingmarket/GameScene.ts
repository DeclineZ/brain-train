import * as Phaser from 'phaser';
import { FLOATING_MARKET_LEVELS } from './levels';
import type { FloatingMarketLevelConfig, MarketItem, ItemCategory, GameMode, LevelRule } from './types';
import { AssetFactory } from './AssetFactory';

// ==================== ITEM DATABASE ====================

const ALL_ITEMS: MarketItem[] = [
    // Fruits
    { id: 'mango', nameThai: 'มะม่วง', category: 'fruit', color: 0xFFCC02, shape: 'oval' },
    { id: 'durian', nameThai: 'ทุเรียน', category: 'fruit', color: 0x6B8E23, shape: 'spiky', priceTag: 80 },
    { id: 'watermelon', nameThai: 'แตงโม', category: 'fruit', color: 0x2E8B57, shape: 'circle', priceTag: 35 },
    { id: 'apple', nameThai: 'แอปเปิ้ล', category: 'fruit', color: 0xDC143C, shape: 'circle', priceTag: 25 },
    { id: 'banana', nameThai: 'กล้วย', category: 'fruit', color: 0xFFE135, shape: 'curved', priceTag: 15 },
    { id: 'orange', nameThai: 'ส้ม', category: 'fruit', color: 0xFF8C00, shape: 'circle', priceTag: 20 },
    { id: 'papaya', nameThai: 'มะละกอ', category: 'fruit', color: 0xFFAE42, shape: 'oval', priceTag: 25 },
    { id: 'coconut', nameThai: 'มะพร้าว', category: 'fruit', color: 0x8B6914, shape: 'circle', priceTag: 20 },
    { id: 'guava', nameThai: 'ฝรั่ง', category: 'fruit', color: 0x90EE90, shape: 'circle', priceTag: 15 },
    { id: 'lime', nameThai: 'มะนาว', category: 'fruit', color: 0x32CD32, shape: 'circle', priceTag: 10 },
    { id: 'greenmango', nameThai: 'มะม่วงดิบ', category: 'fruit', color: 0x7CCD7C, shape: 'oval', priceTag: 20 },
    // Desserts
    { id: 'thongyod', nameThai: 'ทองหยอด', category: 'dessert', color: 0xFFD700, shape: 'drop', priceTag: 40 },
    { id: 'foithong', nameThai: 'ฝอยทอง', category: 'dessert', color: 0xFFC125, shape: 'rectangle', priceTag: 45 },
    { id: 'khanomchan', nameThai: 'ขนมชั้น', category: 'dessert', color: 0xFFE4B5, shape: 'rectangle', priceTag: 30 },
    // Vegetables
    { id: 'morningglory', nameThai: 'ผักบุ้ง', category: 'vegetable', color: 0x228B22, shape: 'oval', priceTag: 15 },
    { id: 'pumpkin', nameThai: 'ฟักทอง', category: 'vegetable', color: 0xFF7518, shape: 'circle', priceTag: 20 },
    { id: 'corn', nameThai: 'ข้าวโพด', category: 'vegetable', color: 0xFBEC5D, shape: 'oval', priceTag: 15 },
    // Fish
    { id: 'fish', nameThai: 'ปลา', category: 'fish', color: 0x4682B4, shape: 'oval', priceTag: 35 },
    { id: 'squid', nameThai: 'ปลาหมึก', category: 'fish', color: 0x9370DB, shape: 'drop', priceTag: 40 },
    { id: 'shrimp', nameThai: 'กุ้ง', category: 'fish', color: 0xFF6B6B, shape: 'curved', priceTag: 50 },
    // Noodle
    { id: 'noodle', nameThai: 'ก๋วยเตี๋ยว', category: 'noodle', color: 0xFAEBD7, shape: 'rectangle', priceTag: 35 },
    // Special
    { id: 'lotus', nameThai: 'ดอกบัว', category: 'lotus', color: 0xFF69B4, shape: 'circle' },
    { id: 'rock', nameThai: 'หิน', category: 'rock', color: 0x808080, shape: 'circle' },
];

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getItemsForLevel(config: FloatingMarketLevelConfig): MarketItem[] {
    const rule = config.rule;

    // In quantityMode, we want a broad pool of items (target + decoys from categories)
    if (config.mode === 'quantityMode') {
        return ALL_ITEMS.filter(item =>
            config.itemPoolCategories.includes(item.category) ||
            (rule.collectFilter as string[]).includes(item.id)
        );
    }

    if (rule.filterByItemId) {
        const allIds = new Set<string>([
            ...(rule.collectFilter as string[]),
            ...((rule.avoidFilter || []) as string[]),
        ]);
        return ALL_ITEMS.filter(item => allIds.has(item.id));
    }
    return ALL_ITEMS.filter(item =>
        config.itemPoolCategories.includes(item.category)
    );
}

// ==================== OBJECT TYPES ====================

interface ObstacleObj {
    sprite: Phaser.GameObjects.Container;
    body: Phaser.Physics.Arcade.Body;
    width: number;
    height: number;
    type: string;
}

interface CoinObj {
    sprite: Phaser.GameObjects.Container;
    body: Phaser.Physics.Arcade.Body;
    collected: boolean;
}

interface FloatingItem {
    sprite: Phaser.GameObjects.Container;
    body: Phaser.Physics.Arcade.Body;
    item: MarketItem;
    collected: boolean;
    driftSpeed?: number;
}

// ==================== MAIN SCENE ====================

export class FloatingMarketScene extends Phaser.Scene {
    private levelConfig!: FloatingMarketLevelConfig;
    private riverLeft = 0;
    private riverRight = 0;
    private riverWidth = 0;

    // Boat
    protected boat!: Phaser.GameObjects.Container;
    protected boatBody!: Phaser.Physics.Arcade.Body;
    protected boatWidth = 40;
    protected currentSpeedX = 0;
    protected maxSpeedX = 350;
    protected accelX = 800;
    protected dragX = 0.92;

    // Input
    protected useTilt = false;
    protected tiltGamma = 0;
    protected baseTiltGamma: number | null = null;
    protected touchLeft = false;
    protected touchRight = false;
    protected leftZone!: Phaser.GameObjects.Rectangle;
    protected rightZone!: Phaser.GameObjects.Rectangle;

    // Scrolling
    protected scrollSpeed = 0;
    protected scrollY = 0;
    protected riverBgTiles: Phaser.GameObjects.TileSprite[] = [];
    protected dockBgTiles: Phaser.GameObjects.TileSprite[] = [];
    protected marketStallsLeft: Phaser.GameObjects.Sprite[] = [];
    protected marketStallsRight: Phaser.GameObjects.Sprite[] = [];

    // Obstacles
    protected obstacles: ObstacleObj[] = [];
    protected obstacleTimer = 0;
    protected obstacleGroup!: Phaser.Physics.Arcade.Group;

    // Coins
    protected coins: CoinObj[] = [];
    protected coinTimer = 0;
    protected coinGroup!: Phaser.Physics.Arcade.Group;

    // Floating items (Memory game core)
    protected floatingItems: FloatingItem[] = [];
    protected itemTimer = 0;
    protected itemGroup!: Phaser.Physics.Arcade.Group;
    protected availableItems: MarketItem[] = [];
    protected itemSpawnQueue: MarketItem[] = [];
    protected totalItemsSpawned = 0;

    // Mode B: Hidden Basket
    protected basketItems: Set<string> = new Set();
    protected basketCount = 0;
    protected basketResetCount = 0;

    // Mode: Quantity
    protected targetQuantities: Record<string, number> = {};
    protected collectedQuantities: Record<string, number> = {};
    protected quantityUITexts: Record<string, Phaser.GameObjects.Text> = {};
    protected quantityUIContainer?: Phaser.GameObjects.Container;

    // Active rule (can change in hybrid mode)
    protected activeRule!: LevelRule;
    protected activeMode!: GameMode;
    protected hybridSwitched = false;

    // Health System
    protected playerHealth = 3;
    protected maxHealth = 3;
    protected healthHearts: Phaser.GameObjects.Text[] = [];

    // UI elements
    protected ruleBanner!: Phaser.GameObjects.Text;
    protected ruleBannerBg!: Phaser.GameObjects.Rectangle;
    protected sackIcon!: Phaser.GameObjects.Sprite;
    protected sackCountText!: Phaser.GameObjects.Text;
    protected progressBar!: Phaser.GameObjects.Graphics;
    protected coinCountText!: Phaser.GameObjects.Text;
    protected fogOverlay?: Phaser.GameObjects.Rectangle;

    // Stats
    protected reactionTimes: number[] = [];
    protected hesitationCount = 0;
    protected totalCollisions = 0;
    protected correctCollections = 0;
    protected incorrectCollections = 0;
    protected missedItems = 0;
    protected duplicatePickups = 0;
    protected bonusCoins = 0;

    // State
    protected gameStartTime = 0;
    protected gameOver = false;
    protected distanceTraveled = 0;
    protected totalDistanceNeeded = 0;
    protected collisionCooldown = 0;
    protected alertShown = false;
    protected gameStarted = false; // Add gameStarted flag

    // Water effects
    private waterParticleTimer = 0;
    private waterRipples: { sprite: Phaser.GameObjects.Sprite; age: number; maxAge: number }[] = [];

    // Encounter tracking for hesitation
    private lastItemContactTime = 0;
    private encounterFirstTiltDirection: number | null = null;

    // Cleanup tracking for window listeners & DOM elements
    private tiltHandlerRef: ((e: any) => void) | null = null;
    private tiltEventName: string | null = null;
    private tapOverlayEl: HTMLElement | null = null;
    private tapStyleEl: HTMLElement | null = null;

    constructor() {
        super({ key: 'FloatingMarketScene' });
    }

    init(data: { level: number }) {
        const regLevel = this.registry.get('level');
        const level = data.level || regLevel || 1;
        this.levelConfig = FLOATING_MARKET_LEVELS[level] || FLOATING_MARKET_LEVELS[1];

        this.obstacles = [];
        this.coins = [];
        this.floatingItems = [];
        this.reactionTimes = [];
        this.hesitationCount = 0;
        this.totalCollisions = 0;
        this.correctCollections = 0;
        this.incorrectCollections = 0;
        this.missedItems = 0;
        this.duplicatePickups = 0;
        this.bonusCoins = 0;
        this.gameOver = false;
        this.distanceTraveled = 0;
        this.obstacleTimer = 0;
        this.coinTimer = 0;
        this.itemTimer = 0;
        this.tiltGamma = 0;
        this.touchLeft = false;
        this.touchRight = false;
        this.collisionCooldown = 0;
        this.scrollY = 0;
        this.waterRipples = [];
        this.riverBgTiles = [];
        this.dockBgTiles = [];
        this.alertShown = false;
        this.basketItems = new Set();
        this.basketCount = 0;
        this.basketResetCount = 0;
        this.hybridSwitched = false;
        this.totalItemsSpawned = 0;
        this.encounterFirstTiltDirection = null;
        this.itemSpawnQueue = [];

        this.activeRule = { ...this.levelConfig.rule };
        this.activeMode = this.levelConfig.mode === 'hybrid' ? 'modeA' : this.levelConfig.mode;

        if (this.activeMode === 'quantityMode' && this.activeRule.targetQuantities) {
            this.targetQuantities = { ...this.activeRule.targetQuantities };
            this.collectedQuantities = {};
            for (const key of Object.keys(this.targetQuantities)) {
                this.collectedQuantities[key] = 0;
            }
        }
    }

    preload() {
        this.load.audio('coin-collect', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('collision', '/assets/sounds/cardmatch/match-fail.mp3');
        this.load.image('boat_player_img', '/assets/game-17-floatingmarket/longtail_boat.png');
        this.load.image('boat_npc_img', '/assets/game-17-floatingmarket/npc_boat.png');
        this.load.audio('correct', '/assets/sounds/cardmatch/match-success.mp3');
        this.load.audio('wrong', '/assets/sounds/cardmatch/match-fail.mp3');
        this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('level-fail', '/assets/sounds/global/level-fail.mp3');

        // Hand-drawn item sprites (88x88px)
        // Map item_id -> filename (handles typos in filenames)
        const itemSpriteMap: Record<string, string> = {
            apple: 'item_apple', banana: 'item_bannana', coconut: 'item_coconut',
            corn: 'item_corn', durian: 'item_durian', fish: 'item_fish',
            foithong: 'item_foithong', greenmango: 'item_greenmango',
            guava: 'item_guava', khanomchan: 'item_khanomchan', lime: 'item_lime',
            mango: 'item_mango', morningglory: 'item_morningglory',
            orange: 'item_orange', papaya: 'item_pappaya', pumpkin: 'item_pumpkin',
            shrimp: 'item_shrimp', squid: 'item_squid', thongyod: 'item_thongyod',
            watermelon: 'item_watermelon',
        };
        for (const [itemId, filename] of Object.entries(itemSpriteMap)) {
            this.load.image(`item_${itemId}`, `/assets/game-17-floatingmarket/${filename}.png`);
        }

        // Hand-drawn stall sprites (100x60px landscape)
        const stallColors = ['blue', 'green', 'purple', 'orange', 'red'];
        stallColors.forEach(c => {
            this.load.image(`stall_img_${c}`, `/assets/game-17-floatingmarket/stall_${c}.png`);
        });

        // Ambient and music
        this.load.audio('river-flow', '/assets/sounds/floatingmarket/river_flow.mp3');
        this.load.audio('bg-music', '/assets/sounds/pinkcup/bg-music.mp3');
    }

    create() {
        new AssetFactory(this).generateTextures();
        const { width, height } = this.scale;

        // Cap river width so large screens don't make the game trivially easy
        const maxRiverPx = 380;
        const rawRiverW = width * this.levelConfig.riverWidthRatio;
        this.riverWidth = Math.min(rawRiverW, maxRiverPx);
        this.riverLeft = (width - this.riverWidth) / 2;
        this.riverRight = this.riverLeft + this.riverWidth;

        // 1.4x speed multiplier for snappier pacing
        this.scrollSpeed = this.levelConfig.boatSpeed * 1.4;

        const totalTime = this.levelConfig.timeLimitSeconds;
        this.totalDistanceNeeded = this.scrollSpeed * (totalTime * 0.6);

        this.availableItems = getItemsForLevel(this.levelConfig);
        this.buildItemSpawnQueue();

        this.drawBackground(width, height);
        this.drawMarketStalls(width, height);
        this.createBoat(width, height);
        this.createUI(width, height);

        this.obstacleGroup = this.physics.add.group();
        this.coinGroup = this.physics.add.group();
        this.itemGroup = this.physics.add.group();

        if (this.levelConfig.lowVisibility) {
            this.fogOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);
            this.fogOverlay.setDepth(15);
        }

        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => this.handleResize(gameSize));

        // Ambient river flow sound
        try {
            this.sound.play('river-flow', { loop: true, volume: 0.25 });
            this.sound.play('bg-music', { loop: true, volume: 0.15 });
        } catch (e) { /* audio may not be available */ }

        // Show "Tap to Start" overlay to ensure valid user gesture for sensor permissions
        this.showTapToStart(width, height);

        // Cleanup on scene shutdown (navigating away, game destroy, etc.)
        this.events.on('shutdown', () => {
            // Remove device orientation window listener
            if (this.tiltHandlerRef && this.tiltEventName) {
                window.removeEventListener(this.tiltEventName, this.tiltHandlerRef);
                this.tiltHandlerRef = null;
                this.tiltEventName = null;
            }
            // Remove injected DOM elements
            if (this.tapOverlayEl && this.tapOverlayEl.parentNode) {
                this.tapOverlayEl.parentNode.removeChild(this.tapOverlayEl);
                this.tapOverlayEl = null;
            }
            if (this.tapStyleEl && this.tapStyleEl.parentNode) {
                this.tapStyleEl.parentNode.removeChild(this.tapStyleEl);
                this.tapStyleEl = null;
            }
            // Stop all sounds
            try { this.sound.stopAll(); } catch (e) { /* ignore */ }
        });
    }

    protected showTapToStart(width: number, height: number) {
        // Create a native HTML overlay to ensure iOS Safari recognizes the user gesture
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed'; // Use fixed to ensure it covers the whole screen regardless of scrolling
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw'; // Use vh/vw to guarantee viewport coverage
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; // Slightly darker to match previous Phaser overlay
        overlay.style.zIndex = '999999'; // Super high z-index to cover React UI headers
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.cursor = 'pointer';

        const text = document.createElement('div');
        text.innerText = 'แตะเพื่อเริ่มเกม';
        text.style.color = '#FFFFFF';
        text.style.fontFamily = "'Noto Sans Thai', sans-serif";
        text.style.fontSize = '32px';
        text.style.fontWeight = 'bold';
        text.style.textShadow = '2px 2px 4px #000000';

        // Simple CSS pulse animation
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pulseText {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
        text.style.animation = 'pulseText 1.6s infinite ease-in-out';

        overlay.appendChild(text);
        document.body.appendChild(overlay);

        // Store references for cleanup on scene shutdown
        this.tapOverlayEl = overlay;
        this.tapStyleEl = style;

        const startHandler = () => {
            overlay.removeEventListener('click', startHandler);
            overlay.removeEventListener('touchend', startHandler);

            // Clean up DOM elements
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
            // Clear instance refs so shutdown handler won't double-remove
            this.tapOverlayEl = null;
            this.tapStyleEl = null;

            // iOS 13+ requires requesting permission explicitly on user interaction
            if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
                const DeviceOrientationEventTyped = DeviceOrientationEvent as any;
                if (typeof DeviceOrientationEventTyped.requestPermission === 'function') {
                    DeviceOrientationEventTyped.requestPermission()
                        .then((state: string) => {
                            if (state === 'granted') {
                                this.enableTilt();
                            } else {
                                this.enableTouchFallback(width, height);
                            }
                        })
                        .catch(() => this.enableTouchFallback(width, height))
                        .finally(() => {
                            this.startGame();
                        });
                    return; // Return early, game starts after permission resolves
                }
            }

            // For other devices, proceed immediately
            this.startGame();
        };

        overlay.addEventListener('click', startHandler);
        overlay.addEventListener('touchend', startHandler);
    }

    public startGame() {
        this.gameStarted = true;
        this.gameStartTime = Date.now();
        const { width, height } = this.scale;

        this.setupInput(width, height);

        this.physics.add.overlap(this.boat, this.obstacleGroup, this.handleObstacleCollision, undefined, this);
        this.physics.add.overlap(this.boat, this.coinGroup, this.handleCoinCollect, undefined, this);
        this.physics.add.overlap(this.boat, this.itemGroup, this.handleItemCollect, undefined, this);
    }

    private buildItemSpawnQueue() {
        const items = this.availableItems;
        if (items.length === 0) return;

        const count = this.levelConfig.itemCount;
        const mode = this.activeMode;
        let queue: MarketItem[] = [];

        if (mode === 'modeB' || (this.levelConfig.mode === 'hybrid')) {
            const cap = this.levelConfig.memoryCapacity || 3;
            const uniquePool = shuffleArray([...items]).slice(0, Math.min(items.length, cap + 3));
            for (let i = 0; i < count; i++) {
                queue.push(pickRandom(uniquePool));
            }
        } else if (mode === 'quantityMode' && this.activeRule.targetQuantities) {
            // Ensure we spawn at least exactly the required quantities of the target items
            let remainingQuota = 0;
            const targetIds = Object.keys(this.activeRule.targetQuantities);

            for (const id of targetIds) {
                const targetCount = this.activeRule.targetQuantities[id];
                remainingQuota += targetCount;

                const matchedItem = items.find(imp => imp.id === id);
                if (matchedItem) {
                    // Spawn EXACTLY the quota amount
                    for (let i = 0; i < targetCount; i++) {
                        queue.push(matchedItem);
                    }
                }
            }

            // For the rest of the spawn count, pick randomly, but include non-target decoy items
            // with a 60% bias so players have to actively avoid them or risk filling up with garbage/over-collecting targets
            const nonTargetItems = items.filter(imp => !targetIds.includes(imp.id));
            const fillCount = Math.max(0, count - remainingQuota);

            for (let i = 0; i < fillCount; i++) {
                if (nonTargetItems.length > 0 && Math.random() < 0.9) {
                    queue.push(pickRandom(nonTargetItems));
                } else {
                    queue.push(pickRandom(items)); // This means targets might still spawn occasionally!
                }
            }
            queue = shuffleArray(queue);

        } else {
            const rule = this.activeRule;
            if (rule.avoidFilter && rule.avoidFilter.length > 0 && !rule.negativeRule) {
                const targetPool = items.filter(item =>
                    rule.filterByItemId
                        ? (rule.collectFilter as string[]).includes(item.id)
                        : (rule.collectFilter as string[]).includes(item.category)
                );
                const avoidPool = items.filter(item => !targetPool.includes(item));

                if (targetPool.length > 0 && avoidPool.length > 0) {
                    const targetCount = Math.ceil(count * 0.6);
                    for (let i = 0; i < targetCount; i++) {
                        queue.push(pickRandom(targetPool));
                    }
                    for (let i = targetCount; i < count; i++) {
                        queue.push(pickRandom(avoidPool));
                    }
                    queue = shuffleArray(queue);
                } else {
                    for (let i = 0; i < count; i++) {
                        queue.push(pickRandom(items));
                    }
                }
            } else {
                for (let i = 0; i < count; i++) {
                    queue.push(pickRandom(items));
                }
            }
        }
        this.itemSpawnQueue = queue;
    }

    // ==================== DRAWING ====================

    drawBackground(width: number, height: number) {
        // Layout per side: [grass]...[stall 120px][dock 40px][river]
        const dockW = 40;
        const stallW = 120;

        // === OUTER GRASS (only visible on wide screens beyond the stalls) ===
        const leftStallEdge = this.riverLeft - dockW - stallW;
        const rightStallEdge = this.riverRight + dockW + stallW;

        // Left grass
        if (leftStallEdge > 0) {
            const grassL = this.add.tileSprite(
                leftStallEdge / 2, height / 2, leftStallEdge, height, 'grass_tile'
            );
            grassL.setDepth(0);
            this.dockBgTiles.push(grassL);
        }
        // Right grass
        if (rightStallEdge < width) {
            const outerW = width - rightStallEdge;
            const grassR = this.add.tileSprite(
                rightStallEdge + outerW / 2, height / 2, outerW, height, 'grass_tile'
            );
            grassR.setDepth(0);
            this.dockBgTiles.push(grassR);
        }

        // === DOCK (wood planks under stalls and between stalls and river) ===
        const leftDockStart = Math.max(0, leftStallEdge);
        const leftDockW = this.riverLeft - leftDockStart;
        if (leftDockW > 0) {
            const leftDock = this.add.tileSprite(
                leftDockStart + leftDockW / 2, height / 2, leftDockW, height, 'dock_tile'
            );
            leftDock.setDepth(1);
            this.dockBgTiles.push(leftDock);
        }
        const rightDockEnd = Math.min(width, rightStallEdge);
        const rightDockW = rightDockEnd - this.riverRight;
        if (rightDockW > 0) {
            const rightDock = this.add.tileSprite(
                this.riverRight + rightDockW / 2, height / 2, rightDockW, height, 'dock_tile'
            );
            rightDock.setDepth(1);
            this.dockBgTiles.push(rightDock);
        }

        // === DOCK ↔ GRASS TRANSITION BORDER ===
        const transG = this.add.graphics();
        transG.setDepth(2);
        if (leftStallEdge > 0) {
            // Dark wood strip at grass→dock boundary
            transG.fillStyle(0x3E2723, 1);
            transG.fillRect(leftStallEdge - 3, 0, 6, height);
            transG.fillStyle(0x2C1E17, 1);
            transG.fillRect(leftStallEdge - 1, 0, 2, height);
        }
        if (rightStallEdge < width) {
            transG.fillStyle(0x3E2723, 1);
            transG.fillRect(rightStallEdge - 3, 0, 6, height);
            transG.fillStyle(0x2C1E17, 1);
            transG.fillRect(rightStallEdge - 1, 0, 2, height);
        }

        // === RIVER ===
        const waterTile = this.add.tileSprite(
            this.riverLeft + this.riverWidth / 2, height / 2,
            this.riverWidth, height, 'water_tile'
        );
        waterTile.setDepth(3);
        this.riverBgTiles.push(waterTile);

        // Dock edge — wooden border along river
        const edgeG = this.add.graphics();
        edgeG.setDepth(4);
        edgeG.fillStyle(0x5D4037, 1);
        edgeG.fillRect(this.riverLeft - 6, 0, 6, height);
        edgeG.fillRect(this.riverRight, 0, 6, height);
        edgeG.fillStyle(0x795548, 1);
        edgeG.fillRect(this.riverLeft - 4, 0, 2, height);
        edgeG.fillRect(this.riverRight + 2, 0, 2, height);
    }

    drawMarketStalls(_width: number, height: number) {
        // Stall sprites are 100x60 landscape, rotated 90° to display as portrait
        // Display sizes after rotation: width ~100, height ~166
        const stallDisplayW = 100;
        const stallDisplayH = 166;
        const dockW = 40;
        const gap = 28; // generous spacing between stalls
        const cellH = stallDisplayH + gap;
        const stallColors = ['blue', 'green', 'purple', 'orange', 'red'];

        const rowCount = Math.ceil(height / cellH) + 3;

        // Left stalls: right-aligned to dock edge
        const leftCx = this.riverLeft - dockW - stallDisplayW / 2;
        for (let row = -1; row < rowCount; row++) {
            const y = row * cellH + gap / 2;
            const color = stallColors[Phaser.Math.Between(0, stallColors.length - 1)];
            const stall = this.add.sprite(leftCx, y, `stall_img_${color}`);
            stall.setAngle(-90); // rotate to face river
            stall.displayWidth = stallDisplayH; // swapped because rotated
            stall.displayHeight = stallDisplayW;
            stall.setDepth(5);
            this.marketStallsLeft.push(stall);
        }

        // Right stalls: left-aligned to dock edge
        const rightCx = this.riverRight + dockW + stallDisplayW / 2;
        for (let row = -1; row < rowCount; row++) {
            const y = row * cellH + gap / 2;
            const color = stallColors[Phaser.Math.Between(0, stallColors.length - 1)];
            const stall = this.add.sprite(rightCx, y, `stall_img_${color}`);
            stall.setAngle(90); // mirror rotation for right side
            stall.displayWidth = stallDisplayH;
            stall.displayHeight = stallDisplayW;
            stall.setDepth(5);
            this.marketStallsRight.push(stall);
        }
    }

    createBoat(width: number, height: number) {
        const boatX = width / 2;
        const boatY = height - 160; // Moved up by 40px for breathing space
        this.boat = this.add.container(boatX, boatY);
        this.boat.setDepth(10);

        const boatSprite = this.add.sprite(0, 0, 'boat_player_img');
        const targetWidth = 60;
        boatSprite.displayWidth = targetWidth;
        boatSprite.scaleY = boatSprite.scaleX;
        this.boat.add(boatSprite);

        const bw = boatSprite.displayWidth;
        const bh = boatSprite.displayHeight;
        this.boat.setSize(bw, bh);

        this.physics.add.existing(this.boat);
        this.boatBody = this.boat.body as Phaser.Physics.Arcade.Body;
        this.boatBody.setCollideWorldBounds(false);
        // Hitbox: 60% of boat width, 50% of boat height, centered within container
        // Container body offset is relative to container's top-left corner (at -bw/2, -bh/2)
        const hitW = bw * 0.6;
        const hitH = bh * 0.5;
        this.boatBody.setSize(hitW, hitH);
        this.boatBody.setOffset((bw - hitW) / 2, (bh - hitH) / 2);
    }

    createUI(_width: number, _height: number) {
        const width = this.scale.width;
        const height = this.scale.height;

        // Progress bar removed to use React level pill instead

        // Rule banner — large & prominent so older players cannot miss it
        const bannerY = 150;
        this.ruleBannerBg = this.add.rectangle(width / 2, bannerY, width * 0.96, 56, 0x1A1A2E, 0.9);
        this.ruleBannerBg.setStrokeStyle(2, 0xFFD700, 0.8);
        this.ruleBannerBg.setDepth(99);
        this.ruleBanner = this.add.text(width / 2, bannerY, this.activeRule.instructionThai, {
            fontSize: '22px', fontFamily: "'Noto Sans Thai', sans-serif",
            color: '#FFD700', align: 'center', fontStyle: 'bold',
            wordWrap: { width: width * 0.88 }, padding: { x: 12, y: 6 },
            stroke: '#000000', strokeThickness: 2,
        });
        this.ruleBanner.setOrigin(0.5);
        this.ruleBanner.setDepth(100);

        // Pulse the banner for the first 4 seconds to draw attention
        this.tweens.add({
            targets: [this.ruleBannerBg],
            scaleX: 1.03, scaleY: 1.08,
            duration: 600, yoyo: true, repeat: 3,
            ease: 'Sine.easeInOut',
        });

        // Coin counter
        this.coinCountText = this.add.text(width - 20, 20, '🪙 0', {
            fontSize: '20px', fontFamily: "'Noto Sans Thai', sans-serif",
            color: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
        });
        this.coinCountText.setOrigin(1, 0);
        this.coinCountText.setDepth(100);

        // Health Bar UI (Bottom Center)
        const healthY = height - 40;
        const heartSpacing = 30;
        const startX = (width / 2) - heartSpacing; // Center 3 hearts

        for (let i = 0; i < this.maxHealth; i++) {
            const heart = this.add.text(startX + (i * heartSpacing), healthY, '❤️', {
                fontSize: '24px'
            });
            heart.setOrigin(0.5);
            heart.setDepth(100);
            this.healthHearts.push(heart);
        }

        // Mode B: Basket/Sack UI — bottom-right to avoid React top-bar overlap
        if (this.levelConfig.mode === 'modeB' || this.levelConfig.mode === 'hybrid') {
            const sackX = width - 60;
            const sackY = height - 60;
            this.sackIcon = this.add.sprite(sackX, sackY, 'ui_sack');
            this.sackIcon.setDisplaySize(44, 44);
            this.sackIcon.setDepth(100);
            this.sackIcon.setOrigin(0.5);

            this.sackCountText = this.add.text(sackX, sackY - 30, '0', {
                fontSize: '22px', fontFamily: "'Noto Sans Thai', sans-serif",
                color: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
            });
            this.sackCountText.setOrigin(0.5);
            this.sackCountText.setDepth(100);
        }

        // Quantity Mode UI
        if (this.levelConfig.mode === 'quantityMode' && this.activeRule.targetQuantities) {
            // Build visual counters below the rule banner
            this.quantityUIContainer = this.add.container(width / 2, bannerY + 65); // Moved down by an extra 20px
            this.quantityUIContainer.setDepth(100);

            const keys = Object.keys(this.targetQuantities);
            const spacing = 80;
            const startX = -((keys.length - 1) * spacing) / 2;

            // Map common items to emojis (fallback to label if not found)
            const emojiMap: Record<string, string> = {
                apple: '🍎', banana: '🍌', coconut: '🥥', corn: '🌽',
                mango: '🥭', orange: '🍊', papaya: '🍈', pumpkin: '🎃', watermelon: '🍉',
                fish: '🐟', shrimp: '🍤', squid: '🦑', lotus: '🪷',
                lime: '🍋', guava: '🍐'
            };

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const target = this.targetQuantities[key];
                const emoji = emojiMap[key] || '📦';

                const textObj = this.add.text(startX + (i * spacing), 0, `${emoji} 0/${target}`, {
                    fontSize: '20px', fontFamily: "'Noto Sans Thai', sans-serif",
                    color: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
                });
                textObj.setOrigin(0.5);
                this.quantityUITexts[key] = textObj;
                this.quantityUIContainer.add(textObj);
            }

            // Add a subtle background pill for the quantities
            const bgWidth = (keys.length * spacing) + 20;
            const bgPill = this.add.rectangle(0, 0, bgWidth, 36, 0x1A1A2E, 0.7);
            bgPill.setStrokeStyle(1.5, 0xFFD700, 0.5);
            this.quantityUIContainer.addAt(bgPill, 0); // Put bg behind texts
        }

        // Zones
        this.setupTouchZones(width, height);
    }

    // ==================== INPUT ====================

    setupInput(width: number, height: number) {
        if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
            const DeviceOrientationEventTyped = DeviceOrientationEvent as any;

            // Skip immediate setup for iOS 13+, as it requires user gesture in showTapToStart
            if (typeof DeviceOrientationEventTyped.requestPermission === 'function') {
                // Do nothing here, it's handled in showTapToStart
            } else {
                let tiltTestReceived = false;
                const testHandler = (e: DeviceOrientationEvent) => {
                    // Give real values, Android occasionally fires exactly 0 initially
                    if (e.gamma !== null && e.gamma !== undefined && Math.abs(e.gamma) > 0.01) {
                        tiltTestReceived = true;
                        window.removeEventListener('deviceorientation', testHandler);
                        this.enableTilt();
                    }
                };
                window.addEventListener('deviceorientation', testHandler);

                // Absolute fallback for some Android Chrome instances
                const testAbsoluteHandler = (e: DeviceOrientationEvent) => {
                    if (e.gamma !== null && e.gamma !== undefined && Math.abs(e.gamma) > 0.01) {
                        if (!tiltTestReceived) {
                            tiltTestReceived = true;
                            this.enableTilt(true);
                        }
                        window.removeEventListener('deviceorientationabsolute', testAbsoluteHandler);
                    }
                };
                window.addEventListener('deviceorientationabsolute', testAbsoluteHandler);

                this.time.delayedCall(2500, () => {
                    if (!tiltTestReceived) {
                        window.removeEventListener('deviceorientation', testHandler);
                        window.removeEventListener('deviceorientationabsolute', testAbsoluteHandler);
                        this.enableTouchFallback(width, height);
                    }
                });
                this.setupTouchZones(width, height);
            }
        } else {
            this.enableTouchFallback(width, height);
        }
    }

    enableTilt(isAbsolute: boolean = false) {
        this.useTilt = true;
        this.baseTiltGamma = null;

        const eventName = isAbsolute ? 'deviceorientationabsolute' : 'deviceorientation';

        // Store handler reference so it can be removed on shutdown
        const handler = (e: any) => {
            if (e.gamma !== null && e.beta !== null && e.gamma !== undefined && e.beta !== undefined) {
                let rawTilt = e.gamma;
                // Determine screen orientation to use correct axis
                let orientationStr = window.orientation;
                if (orientationStr === undefined) {
                    orientationStr = (screen.orientation || {}).angle;
                }
                const orientation = Number(orientationStr) || 0;

                if (Math.abs(orientation) === 90 || orientation === 270) {
                    rawTilt = (orientation === 90) ? e.beta : -e.beta;
                } else if (orientation === 180) {
                    rawTilt = -e.gamma;
                }

                // Calibrate zero-point on first valid reading
                if (this.baseTiltGamma === null) {
                    this.baseTiltGamma = rawTilt;
                }

                // To prevent massive flip-overs when rotating past vertical, we loosely clamp it.
                // Depending on axis, rawTilt might flip rapidly.
                let currentTilt = Phaser.Math.Clamp(rawTilt, -90, 90);

                // Calculate relative tilt safely
                const base = this.baseTiltGamma ?? 0;
                let relativeTilt = currentTilt - base;

                // Enforce a hard cap on relative tilt to prevent the "stuck on wall" bug
                relativeTilt = Phaser.Math.Clamp(relativeTilt, -60, 60);

                this.tiltGamma = relativeTilt;
            }
        };
        this.tiltHandlerRef = handler;
        this.tiltEventName = eventName;
        window.addEventListener(eventName, handler);
        this.setupTouchZones(this.scale.width, this.scale.height);
    }

    enableTouchFallback(width: number, height: number) {
        if (!this.alertShown) {
            this.alertShown = true;
            const isSecure = window.isSecureContext;
            const message = isSecure
                ? 'อุปกรณ์ไม่รองรับการเอียง\nกรุณากดค้างซ้าย-ขวาที่หน้าจอแทน'
                : 'ไม่สามารถใช้เซนเซอร์ได้เนื่องจากไม่ได้เชื่อมต่อผ่าน HTTPS\nกรุณากดค้างซ้าย-ขวาที่หน้าจอแทน';

            const alertBg = this.add.rectangle(width / 2, height / 2, width * 0.85, 120, 0x000000, 0.85);
            alertBg.setDepth(200);
            const alertText = this.add.text(width / 2, height / 2, message, {
                fontSize: '18px', fontFamily: "'Noto Sans Thai', sans-serif",
                color: '#FFFFFF', align: 'center',
            });
            alertText.setOrigin(0.5);
            alertText.setDepth(201);
            this.time.delayedCall(3000, () => {
                this.tweens.add({
                    targets: [alertBg, alertText], alpha: 0, duration: 500,
                    onComplete: () => { alertBg.destroy(); alertText.destroy(); }
                });
            });
        }
        this.setupTouchZones(width, height);
    }

    setupTouchZones(width: number, height: number) {
        if (this.leftZone) return;
        this.leftZone = this.add.rectangle(width / 4, height / 2, width / 2, height, 0x000000, 0);
        this.leftZone.setDepth(50);
        this.leftZone.setInteractive();
        this.leftZone.on('pointerdown', () => { this.touchLeft = true; });
        this.leftZone.on('pointerup', () => { this.touchLeft = false; });
        this.leftZone.on('pointerout', () => { this.touchLeft = false; });

        this.rightZone = this.add.rectangle(width * 3 / 4, height / 2, width / 2, height, 0x000000, 0);
        this.rightZone.setDepth(50);
        this.rightZone.setInteractive();
        this.rightZone.on('pointerdown', () => { this.touchRight = true; });
        this.rightZone.on('pointerup', () => { this.touchRight = false; });
        this.rightZone.on('pointerout', () => { this.touchRight = false; });

        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-LEFT', () => { this.touchLeft = true; });
            this.input.keyboard.on('keyup-LEFT', () => { this.touchLeft = false; });
            this.input.keyboard.on('keydown-RIGHT', () => { this.touchRight = true; });
            this.input.keyboard.on('keyup-RIGHT', () => { this.touchRight = false; });
        }
    }

    // ==================== UPDATE LOOP ====================

    update(_time: number, delta: number) {
        if (!this.gameStarted || this.gameOver) return;
        const dt = delta / 1000;

        this.moveBoat(dt);

        this.scrollY += this.scrollSpeed * dt;
        this.distanceTraveled += this.scrollSpeed * dt;

        // Spawn obstacles
        this.obstacleTimer += dt;
        if (this.obstacleTimer >= this.levelConfig.obstacleFrequency) {
            this.obstacleTimer = 0;
            this.spawnObstacle();
        }

        // Spawn coins
        if (this.levelConfig.coinFrequency > 0) {
            this.coinTimer += dt;
            if (this.coinTimer >= this.levelConfig.coinFrequency) {
                this.coinTimer = 0;
                this.spawnCoin();
            }
        }

        // Spawn floating items (memory game core)
        if (this.levelConfig.itemSpawnRate > 0 && this.totalItemsSpawned < this.levelConfig.itemCount) {
            this.itemTimer += dt;
            if (this.itemTimer >= this.levelConfig.itemSpawnRate) {
                this.itemTimer = 0;
                this.spawnFloatingItem();
            }
        }

        this.moveScrollables(dt);

        // Hybrid mode switch
        if (this.levelConfig.mode === 'hybrid' && !this.hybridSwitched && this.levelConfig.hybridSwitchAt) {
            const progress = this.distanceTraveled / this.totalDistanceNeeded;
            if (progress >= this.levelConfig.hybridSwitchAt) {
                this.hybridSwitched = true;
                this.switchToModeB();
            }
        }

        if (this.collisionCooldown > 0) this.collisionCooldown -= dt;

        this.updateWaterEffects(dt);
        this.drawProgress();

        // Check level complete
        const allItemsSpawned = this.totalItemsSpawned >= this.levelConfig.itemCount;
        const allItemsGone = this.floatingItems.length === 0;
        if (allItemsSpawned && allItemsGone && this.distanceTraveled >= this.totalDistanceNeeded * 0.5) {
            this.endGame(true);
        }
        // Bonus levels: just distance
        if (this.levelConfig.mode === 'bonus' && this.distanceTraveled >= this.totalDistanceNeeded) {
            this.endGame(true);
        }

        // Time limit
        const elapsed = (Date.now() - this.gameStartTime) / 1000;
        if (elapsed >= this.levelConfig.timeLimitSeconds) {
            this.endGame(this.levelConfig.noFailState || false);
        }
    }

    // ==================== HYBRID SWITCH ====================

    private switchToModeB() {
        this.activeMode = 'modeB';
        if (this.levelConfig.switchToRule) {
            this.activeRule = { ...this.levelConfig.switchToRule };
        }
        this.basketItems.clear();
        this.basketCount = 0;

        // Flash "CHANGE RULES!" banner
        const { width, height } = this.scale;
        const flash = this.add.text(width / 2, height / 2, '⚡ เปลี่ยนกฎ! ⚡', {
            fontSize: '36px', fontFamily: "'Noto Sans Thai', sans-serif",
            color: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 5,
        });
        flash.setOrigin(0.5);
        flash.setDepth(150);
        this.tweens.add({
            targets: flash, alpha: 0, y: height / 2 - 60, duration: 2000,
            onComplete: () => flash.destroy(),
        });

        // Update banner
        this.ruleBanner.setText(this.activeRule.instructionThai);
        const textBounds = this.ruleBanner.getBounds();
        this.ruleBannerBg.setSize(textBounds.width + 30, textBounds.height + 16);

        // Show sack if not already
        if (!this.sackIcon) {
            this.sackIcon = this.add.sprite(40, 20, 'ui_sack');
            this.sackIcon.setDisplaySize(36, 36);
            this.sackIcon.setDepth(100);
            this.sackIcon.setOrigin(0, 0);
            this.sackCountText = this.add.text(78, 28, '0', {
                fontSize: '20px', fontFamily: "'Noto Sans Thai', sans-serif",
                color: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
            });
            this.sackCountText.setOrigin(0, 0);
            this.sackCountText.setDepth(100);
        }

        this.buildItemSpawnQueue();
    }

    // ==================== BOAT MOVEMENT ====================

    moveBoat(dt: number) {
        let targetDirection = 0;
        if (this.useTilt && Math.abs(this.tiltGamma) > 3) {
            // Adjust sensitivity based on orientation.
            // In portrait (width < height), the river is narrow, so we need LESS sensitivity
            // to avoid instantly crashing into walls. In landscape, we want MORE sensitivity.
            const isPortrait = this.scale.width < this.scale.height;
            const sensitivityDivisor = isPortrait ? 35 : 25;

            let normalizedTilt = Phaser.Math.Clamp(this.tiltGamma / sensitivityDivisor, -1, 1);
            // Non-linear curve to make small tilts less sensitive, but large tilts snap fast
            targetDirection = Math.sign(normalizedTilt) * Math.pow(Math.abs(normalizedTilt), 1.3);
        }
        if (this.touchLeft) targetDirection = -1;
        if (this.touchRight) targetDirection = 1;

        if (targetDirection !== 0) {
            this.currentSpeedX += targetDirection * this.accelX * dt;
        } else {
            this.currentSpeedX *= Math.pow(this.dragX, dt * 60);
            if (Math.abs(this.currentSpeedX) < 10) this.currentSpeedX = 0;
        }

        this.currentSpeedX = Phaser.Math.Clamp(this.currentSpeedX, -this.maxSpeedX, this.maxSpeedX);
        const newX = this.boat.x + this.currentSpeedX * dt;
        const halfBoat = this.boatWidth / 2;

        if (newX <= this.riverLeft + halfBoat + 5 || newX >= this.riverRight - halfBoat - 5) {
            this.currentSpeedX *= -0.5;
            this.boat.x = Phaser.Math.Clamp(newX, this.riverLeft + halfBoat + 6, this.riverRight - halfBoat - 6);
            if (this.collisionCooldown <= 0 && Math.abs(this.currentSpeedX) > 50) {
                this.handleBankCollision();
            }
        } else {
            this.boat.x = newX;
        }

        const targetAngle = (this.currentSpeedX / this.maxSpeedX) * 15;
        this.boat.setAngle(targetAngle);
    }

    // ==================== SPAWNING ====================

    getSafeSpawnX(padding: number): number {
        const minX = this.riverLeft + padding;
        const maxX = this.riverRight - padding;

        // Settings for checking overlap
        const recentYThreshold = 250; // Anything above this Y (near the top) is considered recently spawned
        const minDistance = 90; // Minimum horizontal distance between objects

        for (let attempt = 0; attempt < 20; attempt++) {
            const testX = Phaser.Math.Between(minX, maxX);
            let isSafe = true;

            // Check obstacles
            for (const obs of this.obstacles) {
                if (obs.sprite && obs.sprite.y < recentYThreshold) {
                    if (Math.abs(obs.sprite.x - testX) < minDistance) {
                        isSafe = false;
                        break;
                    }
                }
            }
            if (!isSafe) continue;

            // Check coins
            for (const coin of this.coins) {
                if (coin.sprite && coin.sprite.y < recentYThreshold) {
                    if (Math.abs(coin.sprite.x - testX) < minDistance) {
                        isSafe = false;
                        break;
                    }
                }
            }
            if (!isSafe) continue;

            // Check items
            for (const item of this.floatingItems) {
                if (item.sprite && item.sprite.y < recentYThreshold) {
                    if (Math.abs(item.sprite.x - testX) < minDistance) {
                        isSafe = false;
                        break;
                    }
                }
            }
            if (isSafe) {
                return testX;
            }
        }

        // Fallback to random if we couldn't find a perfectly safe spot after 20 attempts
        return Phaser.Math.Between(minX, maxX);
    }

    spawnObstacle() {
        const padding = 30;
        const x = this.getSafeSpawnX(padding);
        const obstacleTypes = ['rock', 'log', 'boat'];
        const type = pickRandom(obstacleTypes);
        const container = this.add.container(x, -50);
        container.setDepth(5);

        let w = 40, h = 40;
        let sprite: Phaser.GameObjects.Sprite;

        if (type === 'rock') {
            sprite = this.add.sprite(0, 0, 'obs_rock');
            w = 50; h = 50;
            sprite.setDisplaySize(w, h);
            sprite.setAngle(Phaser.Math.Between(0, 360));
        } else if (type === 'log') {
            sprite = this.add.sprite(0, 0, 'obs_log');
            w = 80; h = 30;
            sprite.setDisplaySize(w, h);
            sprite.setAngle(Phaser.Math.Between(-20, 20));
        } else {
            sprite = this.add.sprite(0, 0, 'boat_npc_img');
            const targetW = 50;
            sprite.displayWidth = targetW;
            sprite.scaleY = sprite.scaleX;
            w = sprite.displayWidth;
            h = sprite.displayHeight;
            sprite.setAngle(180);
        }

        container.add(sprite);
        container.setSize(w, h);
        this.physics.add.existing(container);
        const body = container.body as Phaser.Physics.Arcade.Body;
        body.setSize(w * 0.8, h * 0.8);
        body.setImmovable(true);
        this.obstacleGroup.add(container);
        this.obstacles.push({ sprite: container, body, width: w, height: h, type });
    }

    spawnCoin() {
        const padding = 40;
        const x = this.getSafeSpawnX(padding);
        const container = this.add.container(x, -30);
        container.setDepth(6);

        const coinCircle = this.add.circle(0, 0, 12, 0xFFD700);
        coinCircle.setStrokeStyle(2, 0xDAA520);
        const coinText = this.add.text(0, 0, '฿', { fontSize: '12px', color: '#8B6914', fontStyle: 'bold' });
        coinText.setOrigin(0.5);
        container.add([coinCircle, coinText]);
        container.setSize(24, 24);

        this.physics.add.existing(container);
        const body = container.body as Phaser.Physics.Arcade.Body;
        body.setSize(20, 20);
        body.setImmovable(true);
        this.coinGroup.add(container);
        this.coins.push({ sprite: container, body, collected: false });
    }

    spawnFloatingItem() {
        if (this.itemSpawnQueue.length === 0) return;
        const item = this.itemSpawnQueue.shift()!;
        this.totalItemsSpawned++;

        const padding = 40;
        const x = this.getSafeSpawnX(padding);
        const container = this.add.container(x, -50);
        container.setDepth(7);

        // Item sprite — large and clear for older audience
        const textureKey = `item_${item.id}`;
        const itemSprite = this.add.sprite(0, 0, textureKey);
        itemSprite.setDisplaySize(60, 60);

        // Label underneath — big and readable
        const label = this.add.text(0, 38, item.nameThai, {
            fontSize: '16px', fontFamily: "'Noto Sans Thai', sans-serif",
            color: '#FFFFFF', stroke: '#000000', strokeThickness: 4,
            align: 'center',
        });
        label.setOrigin(0.5);

        // Price tag for level 26
        if (item.priceTag && this.levelConfig.level === 26) {
            const priceLabel = this.add.text(0, -36, `${item.priceTag}฿`, {
                fontSize: '14px', fontFamily: "'Noto Sans Thai', sans-serif",
                color: '#FFD700', stroke: '#000000', strokeThickness: 3,
            });
            priceLabel.setOrigin(0.5);
            container.add(priceLabel);
        }

        container.add([itemSprite, label]);
        container.setSize(64, 64);

        this.physics.add.existing(container);
        const body = container.body as Phaser.Physics.Arcade.Body;
        body.setSize(54, 54);
        body.setImmovable(true);
        this.itemGroup.add(container);

        const driftSpeed = this.levelConfig.itemDrift
            ? Phaser.Math.Between(-30, 30) : 0;

        this.floatingItems.push({ sprite: container, body, item, collected: false, driftSpeed });

        // Gentle bob animation — slightly more pronounced
        this.tweens.add({
            targets: itemSprite, y: -5, duration: 800, yoyo: true,
            repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    // ==================== SCROLLING ====================

    moveScrollables(dt: number) {
        const speed = this.scrollSpeed * dt;
        const { height } = this.scale;

        this.moveStalls(speed);
        this.riverBgTiles.forEach(tile => { tile.tilePositionY -= speed; });
        this.dockBgTiles.forEach(tile => { tile.tilePositionY -= speed; });

        // Move obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            // NPC boats move faster toward the player (extra velocity)
            const extraSpeed = obs.type === 'boat' ? 60 * dt : 0;
            obs.sprite.y += speed + extraSpeed;
            if (obs.sprite.y > height + 60) {
                obs.sprite.destroy();
                this.obstacles.splice(i, 1);
            }
        }

        // Move coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.sprite.y += speed;
            if (coin.sprite.y > height + 60) {
                coin.sprite.destroy();
                this.coins.splice(i, 1);
            }
        }

        // Move floating items
        for (let i = this.floatingItems.length - 1; i >= 0; i--) {
            const fi = this.floatingItems[i];
            fi.sprite.y += speed;
            if (fi.driftSpeed) {
                fi.sprite.x += fi.driftSpeed * dt;
                fi.sprite.x = Phaser.Math.Clamp(fi.sprite.x, this.riverLeft + 30, this.riverRight - 30);
            }
            if (fi.sprite.y > height + 60) {
                // Missed item — count if it was collectible
                if (!fi.collected && this.isCollectible(fi.item)) {
                    this.missedItems++;
                }
                fi.sprite.destroy();
                this.floatingItems.splice(i, 1);
            }
        }
    }

    private moveStalls(speed: number) {
        const { height } = this.scale;
        const cellH = 194; // stallDisplayH(166) + gap(28)
        const stallColors = ['blue', 'green', 'purple', 'orange', 'red'];
        const allStalls = [...this.marketStallsLeft, ...this.marketStallsRight];
        allStalls.forEach(stall => {
            stall.y += speed;
            if (stall.y > height + cellH) {
                stall.y -= (Math.ceil(height / cellH) + 3) * cellH;
                // Swap to a random stall color for variety
                const newColor = stallColors[Phaser.Math.Between(0, stallColors.length - 1)];
                (stall as Phaser.GameObjects.Sprite).setTexture(`stall_img_${newColor}`);
            }
        });
    }

    // ==================== ITEM COLLECTION LOGIC ====================

    private isCollectible(item: MarketItem): boolean {
        const rule = this.activeRule;
        if (rule.negativeRule) {
            // Collect everything EXCEPT avoidFilter
            if (rule.filterByItemId) {
                return !(rule.avoidFilter || []).includes(item.id);
            }
            return !(rule.avoidFilter || []).includes(item.category);
        }
        if (rule.filterByItemId) {
            return (rule.collectFilter as string[]).includes(item.id);
        }
        return (rule.collectFilter as string[]).includes(item.category);
    }

    private isAvoidable(item: MarketItem): boolean {
        const rule = this.activeRule;
        if (rule.negativeRule) {
            if (rule.filterByItemId) {
                return ((rule.avoidFilter || []) as string[]).includes(item.id);
            }
            return ((rule.avoidFilter || []) as string[]).includes(item.category);
        }
        if (!rule.avoidFilter) return false;
        if (rule.filterByItemId) {
            return (rule.avoidFilter as string[]).includes(item.id);
        }
        return (rule.avoidFilter as string[]).includes(item.category);
    }

    handleItemCollect(_boat: any, itemSprite: any) {
        const fi = this.floatingItems.find(f =>
            f.sprite === itemSprite || (f.body as any) === itemSprite.body
        );
        if (!fi || fi.collected) return;
        fi.collected = true;

        const item = fi.item;
        const reactionTime = Date.now() - this.lastItemContactTime;
        this.lastItemContactTime = Date.now();
        if (reactionTime < 10000) this.reactionTimes.push(reactionTime);

        if (this.activeMode === 'modeB') {
            this.handleModeBCollection(fi, item);
        } else if (this.activeMode === 'quantityMode') {
            this.handleQuantityModeCollection(fi, item);
        } else {
            this.handleModeACollection(fi, item);
        }
    }

    private handleQuantityModeCollection(fi: FloatingItem, item: MarketItem) {
        // Quantity mode checks against specific IDs
        const key = item.id;

        // Is it part of the request, and do we still need it?
        if (this.targetQuantities[key] !== undefined) {
            if (this.collectedQuantities[key] < this.targetQuantities[key]) {
                // Good collection
                this.collectedQuantities[key]++;
                this.correctCollections++;
                this.updateQuantityUI();
                this.showCollectFeedback(fi.sprite.x, fi.sprite.y, true);
                this.animateItemCollect(fi);

                // Check if all quotas are met
                let allMet = true;
                for (const k of Object.keys(this.targetQuantities)) {
                    if (this.collectedQuantities[k] < this.targetQuantities[k]) {
                        allMet = false;
                        break;
                    }
                }
                if (allMet) {
                    this.time.delayedCall(500, () => this.endGame(true));
                }
            } else {
                // Over-collected!
                this.incorrectCollections++;
                this.showCollectFeedback(fi.sprite.x, fi.sprite.y, false);
                this.cameras.main.shake(150, 0.008);
                this.animateItemReject(fi);

                // Show a brief 'full' warning
                const warnText = this.add.text(fi.sprite.x, fi.sprite.y - 30, `ครบแล้ว!`, {
                    fontSize: '16px', fontFamily: "'Noto Sans Thai', sans-serif",
                    color: '#FF6B6B', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
                });
                warnText.setOrigin(0.5);
                warnText.setDepth(120);
                this.tweens.add({
                    targets: warnText, y: fi.sprite.y - 70, alpha: 0, duration: 1000,
                    onComplete: () => warnText.destroy(),
                });
            }
        } else {
            // Collected a wrong item entirely
            this.incorrectCollections++;
            this.showCollectFeedback(fi.sprite.x, fi.sprite.y, false);
            this.cameras.main.shake(150, 0.008);
            this.animateItemReject(fi);
        }
    }

    private updateQuantityUI() {
        if (!this.quantityUIContainer) return;

        const emojiMap: Record<string, string> = {
            apple: '🍎', banana: '🍌', coconut: '🥥', corn: '🌽',
            mango: '🥭', orange: '🍊', papaya: '🍈', pumpkin: '🎃', watermelon: '🍉',
            fish: '🐟', shrimp: '🍤', squid: '🦑', lotus: '🪷',
            lime: '🍋', guava: '🍐'
        };

        for (const key of Object.keys(this.targetQuantities)) {
            const current = this.collectedQuantities[key];
            const target = this.targetQuantities[key];
            const textObj = this.quantityUITexts[key];

            if (textObj) {
                const emoji = emojiMap[key] || '📦';
                textObj.setText(`${emoji} ${current}/${target}`);

                // Highlight text green if quota met
                if (current >= target) {
                    textObj.setColor('#2ECC71');
                }
            }
        }

        // Bounce the whole container slightly
        this.tweens.add({
            targets: this.quantityUIContainer,
            scaleX: 1.1, scaleY: 1.1, duration: 100, yoyo: true
        });
    }

    private handleModeACollection(fi: FloatingItem, item: MarketItem) {
        const shouldCollect = this.isCollectible(item);
        const shouldAvoid = this.isAvoidable(item);

        if (shouldCollect) {
            this.correctCollections++;
            this.showCollectFeedback(fi.sprite.x, fi.sprite.y, true);
            this.animateItemCollect(fi);
        } else if (shouldAvoid || !shouldCollect) {
            this.incorrectCollections++;
            this.showCollectFeedback(fi.sprite.x, fi.sprite.y, false);
            this.cameras.main.shake(150, 0.008);
            this.animateItemReject(fi);
        }
    }

    private handleModeBCollection(fi: FloatingItem, item: MarketItem) {
        if (this.basketItems.has(item.id)) {
            // DUPLICATE! Player already has this
            this.duplicatePickups++;
            this.incorrectCollections++;
            this.showDuplicateWarning(fi.sprite.x, fi.sprite.y, item);
            this.shakeBasket();
            this.cameras.main.shake(150, 0.008);
            this.animateItemReject(fi);
        } else {
            // New item — collect it!
            this.basketItems.add(item.id);
            this.basketCount++;
            this.correctCollections++;
            this.updateBasketUI();
            this.showCollectFeedback(fi.sprite.x, fi.sprite.y, true);
            this.animateItemIntoSack(fi);

            // Check basket reset
            if (this.levelConfig.resetBasketAt && this.basketCount >= this.levelConfig.resetBasketAt) {
                this.basketResetCount++;
                if (this.basketResetCount < 2) {
                    this.time.delayedCall(1500, () => this.resetBasket());
                }
            }
        }
    }

    // ==================== VISUAL FEEDBACK ====================

    private showCollectFeedback(x: number, y: number, correct: boolean) {
        const text = correct ? '✓' : '✗';
        const color = correct ? '#2ECC71' : '#E74C3C';
        const fb = this.add.text(x, y, text, {
            fontSize: '32px', color, fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3,
        });
        fb.setOrigin(0.5);
        fb.setDepth(120);
        this.tweens.add({
            targets: fb, y: y - 40, alpha: 0, duration: 600,
            onComplete: () => fb.destroy(),
        });
        try {
            this.sound.play(correct ? 'correct' : 'wrong', { volume: 0.4 });
        } catch (e) { /* ignore */ }
    }

    private showDuplicateWarning(x: number, y: number, item: MarketItem) {
        const warnText = this.add.text(x, y - 30, `มีแล้ว! (${item.nameThai})`, {
            fontSize: '16px', fontFamily: "'Noto Sans Thai', sans-serif",
            color: '#FF6B6B', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3,
        });
        warnText.setOrigin(0.5);
        warnText.setDepth(120);
        this.tweens.add({
            targets: warnText, y: y - 70, alpha: 0, duration: 1200,
            onComplete: () => warnText.destroy(),
        });
    }

    private animateItemCollect(fi: FloatingItem) {
        this.tweens.add({
            targets: fi.sprite, y: fi.sprite.y - 30, alpha: 0,
            scaleX: 1.3, scaleY: 1.3, duration: 300,
            onComplete: () => {
                fi.sprite.destroy();
                const idx = this.floatingItems.indexOf(fi);
                if (idx >= 0) this.floatingItems.splice(idx, 1);
            },
        });
    }

    private animateItemReject(fi: FloatingItem) {
        this.tweens.add({
            targets: fi.sprite, alpha: 0.3, duration: 200, yoyo: true,
            repeat: 2,
            onComplete: () => {
                fi.sprite.destroy();
                const idx = this.floatingItems.indexOf(fi);
                if (idx >= 0) this.floatingItems.splice(idx, 1);
            },
        });
    }

    private animateItemIntoSack(fi: FloatingItem) {
        if (!this.sackIcon) {
            this.animateItemCollect(fi);
            return;
        }
        this.tweens.add({
            targets: fi.sprite,
            x: this.sackIcon.x + 18, y: this.sackIcon.y + 18,
            scaleX: 0.3, scaleY: 0.3, alpha: 0, duration: 400,
            onComplete: () => {
                fi.sprite.destroy();
                const idx = this.floatingItems.indexOf(fi);
                if (idx >= 0) this.floatingItems.splice(idx, 1);
                // Pulse sack
                if (this.sackIcon) {
                    this.tweens.add({
                        targets: this.sackIcon, scaleX: 1.3, scaleY: 1.3,
                        duration: 150, yoyo: true,
                    });
                }
            },
        });
    }

    private shakeBasket() {
        if (!this.sackIcon) return;
        this.tweens.add({
            targets: this.sackIcon, x: this.sackIcon.x - 5,
            duration: 50, yoyo: true, repeat: 4,
        });
    }

    private updateBasketUI() {
        if (this.sackCountText) {
            this.sackCountText.setText(`${this.basketCount}`);
        }
    }

    private resetBasket() {
        const { width, height } = this.scale;
        const flash = this.add.text(width / 2, height / 2, '🔄 ตะกร้าว่างแล้ว!', {
            fontSize: '28px', fontFamily: "'Noto Sans Thai', sans-serif",
            color: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
        });
        flash.setOrigin(0.5);
        flash.setDepth(150);
        this.tweens.add({
            targets: flash, alpha: 0, y: height / 2 - 50, duration: 2000,
            onComplete: () => flash.destroy(),
        });

        this.basketItems.clear();
        this.basketCount = 0;
        this.updateBasketUI();
    }

    updateHealthUI() {
        for (let i = 0; i < this.maxHealth; i++) {
            if (i < this.playerHealth) {
                this.healthHearts[i].setText('❤️');
                this.healthHearts[i].setAlpha(1);
            } else {
                this.healthHearts[i].setText('🖤');
                this.healthHearts[i].setAlpha(0.7);
            }
        }
    }

    // ==================== COLLISION HANDLERS ====================

    handleObstacleCollision(_boat: any, _obstacle: any) {
        if (this.collisionCooldown > 0) return;
        this.collisionCooldown = 1.0;
        this.totalCollisions++;
        this.incorrectCollections++; // Crash counts as an accuracy penalty

        this.playerHealth--;
        this.updateHealthUI();

        this.cameras.main.shake(200, 0.01);
        this.boat.setAlpha(0.5);
        this.createSplash(this.boat.x, this.boat.y);
        this.time.delayedCall(300, () => { if (this.boat) this.boat.setAlpha(1); });
        try { this.sound.play('collision', { volume: 0.5 }); } catch (e) { /* ignore */ }

        if (this.playerHealth <= 0) {
            this.endGame(false);
        }
    }

    handleBankCollision() {
        if (this.collisionCooldown > 0) return;
        this.collisionCooldown = 0.5;
        this.totalCollisions++;
        this.incorrectCollections++; // Bank crash counts as an accuracy penalty

        this.playerHealth--;
        this.updateHealthUI();

        this.cameras.main.shake(100, 0.005);
        this.boat.setAlpha(0.7);
        this.createSplash(this.boat.x, this.boat.y);
        this.time.delayedCall(200, () => { if (this.boat) this.boat.setAlpha(1); });

        if (this.playerHealth <= 0) {
            this.endGame(false);
        }
    }

    handleCoinCollect(_boat: any, coinSprite: any) {
        const coinIndex = this.coins.findIndex(c => c.sprite === coinSprite || c.body === coinSprite.body);
        if (coinIndex === -1) return;
        const coin = this.coins[coinIndex];
        if (coin.collected) return;
        coin.collected = true;
        this.bonusCoins++;
        this.coinCountText.setText(`🪙 ${this.bonusCoins}`);
        this.tweens.add({
            targets: coin.sprite, y: coin.sprite.y - 30, alpha: 0,
            scaleX: 1.5, scaleY: 1.5, duration: 300,
            onComplete: () => {
                coin.sprite.destroy();
                this.coins.splice(this.coins.indexOf(coin), 1);
            }
        });
        try { this.sound.play('coin-collect', { volume: 0.3, rate: 1.5 }); } catch (e) { /* ignore */ }
    }

    // ==================== WATER EFFECTS ====================

    updateWaterEffects(dt: number) {
        this.waterParticleTimer += dt;
        if (this.waterParticleTimer > 0.1) {
            this.waterParticleTimer = 0;

            // Player boat wake (behind the boat)
            const px = this.boat.x + Phaser.Math.Between(-10, 10);
            const py = this.boat.y + 60;
            const pSprite = this.add.sprite(px, py, 'particle_wake');
            pSprite.setDepth(6);
            pSprite.setAlpha(0.6);
            pSprite.setScale(0.5);
            this.waterRipples.push({ sprite: pSprite, age: 0, maxAge: 1.0 });

            // NPC boat wakes (in front of them since they face toward player)
            for (const obs of this.obstacles) {
                if (obs.type !== 'boat') continue;
                const nx = obs.sprite.x + Phaser.Math.Between(-8, 8);
                const ny = obs.sprite.y - 40; // wake in front (above, since they move down)
                const nSprite = this.add.sprite(nx, ny, 'particle_wake');
                nSprite.setDepth(6);
                nSprite.setAlpha(0.4);
                nSprite.setScale(0.4);
                this.waterRipples.push({ sprite: nSprite, age: 0, maxAge: 0.8 });
            }
        }

        for (let i = this.waterRipples.length - 1; i >= 0; i--) {
            const r = this.waterRipples[i];
            r.age += dt;
            r.sprite.y += this.scrollSpeed * dt * 0.8;
            if (r.age >= r.maxAge) {
                r.sprite.destroy();
                this.waterRipples.splice(i, 1);
                continue;
            }
            const progress = r.age / r.maxAge;
            r.sprite.setAlpha((1 - progress) * 0.6);
            r.sprite.setScale(0.5 + progress * 1.5);
        }
    }

    createSplash(x: number, y: number) {
        for (let i = 0; i < 5; i++) {
            const splash = this.add.sprite(x, y, 'particle_splash');
            splash.setDepth(11);
            const angle = Phaser.Math.Between(0, 360);
            const duration = Phaser.Math.Between(300, 500);
            this.tweens.add({
                targets: splash,
                x: x + Math.cos(angle) * 30, y: y + Math.sin(angle) * 30,
                alpha: 0, scale: 0.1, duration,
                onComplete: () => splash.destroy()
            });
        }
    }

    // ==================== PROGRESS & UI ====================

    drawProgress() {
        // Obsolete: Progress bar removed in favor of React Level UI badge.
    }

    // ==================== END GAME ====================

    endGame(success: boolean) {
        if (this.gameOver) return;
        this.gameOver = true;

        // Stop ambient sounds
        try { this.sound.stopByKey('river-flow'); } catch (e) { /* ignore */ }
        try { this.sound.stopByKey('bg-music'); } catch (e) { /* ignore */ }

        const totalTimeMs = Date.now() - this.gameStartTime;
        const stars = this.calculateStars();

        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                current_played: this.levelConfig.level,
                difficultyMultiplier: this.levelConfig.difficultyMultiplier,
                mode: this.levelConfig.mode,
                correctCollections: this.correctCollections,
                incorrectCollections: this.incorrectCollections,
                missedItems: this.missedItems,
                duplicatePickups: this.duplicatePickups,
                memoryCapacity: this.levelConfig.memoryCapacity,
                totalCollisions: this.totalCollisions,
                reactionTimes: this.reactionTimes,
                hesitationCount: this.hesitationCount,
                bonusCoins: this.bonusCoins,
                stars,
                success,
                totalTimeMs,
                totalItemsSpawned: this.totalItemsSpawned,
                totalItemsCollected: this.correctCollections,
                starHint: stars < 3 ? this.getStarHint() : null,
            });
            try {
                this.sound.play(success ? 'level-pass' : 'level-fail', { volume: 0.6 });
            } catch (e) { /* ignore */ }
        }
    }

    calculateStars(): number {
        const mode = this.levelConfig.mode;
        if (mode === 'bonus') return 3;

        const totalAttempted = this.correctCollections + this.incorrectCollections;
        const accuracy = totalAttempted > 0 ? this.correctCollections / totalAttempted : 0;

        // Collection ratio: how many items did the player actually collect vs how many spawned?
        const collectionRatio = this.levelConfig.itemCount > 0
            ? this.correctCollections / this.levelConfig.itemCount
            : 1;

        if (mode === 'modeB' || mode === 'hybrid') {
            // Memory game: accuracy + collection ratio + no duplicates
            if (accuracy >= 0.9 && collectionRatio >= 0.5 && this.duplicatePickups === 0 && this.totalCollisions <= 1) return 3;
            if (accuracy >= 0.7 && collectionRatio >= 0.3 && this.duplicatePickups <= 1 && this.totalCollisions <= 3) return 2;
            return 1;
        }

        if (mode === 'quantityMode') {
            let metQuota = true;
            if (this.activeRule.targetQuantities) {
                for (const k of Object.keys(this.activeRule.targetQuantities)) {
                    if (this.collectedQuantities[k] < this.activeRule.targetQuantities[k]) {
                        metQuota = false;
                        break;
                    }
                }
            }
            if (!metQuota) return 1; // Didn't finish the goals

            if (accuracy >= 0.9 && this.totalCollisions <= 1) return 3;
            if (accuracy >= 0.7 && this.totalCollisions <= 3) return 2;
            return 1;
        }

        // Mode A / tutorial
        if (accuracy >= 0.9 && collectionRatio >= 0.5 && this.totalCollisions <= 1) return 3;
        if (accuracy >= 0.7 && collectionRatio >= 0.3 && this.totalCollisions <= 3) return 2;
        return 1;
    }

    getStarHint(): string {
        const mode = this.levelConfig.mode;
        const totalAttempted = this.correctCollections + this.incorrectCollections;
        const accuracy = totalAttempted > 0 ? this.correctCollections / totalAttempted : 0;
        const collectionRatio = this.levelConfig.itemCount > 0
            ? this.correctCollections / this.levelConfig.itemCount : 1;

        if (mode === 'modeB' || mode === 'hybrid') {
            if (this.duplicatePickups > 0) return 'พยายามจำของที่เก็บแล้ว อย่าเก็บซ้ำ!';
            if (collectionRatio < 0.3) return 'เก็บของให้มากขึ้น อย่าข้ามของ!';
            if (accuracy < 0.7) return 'เก็บของให้ถูกชนิดมากขึ้น!';
        }
        if (collectionRatio < 0.3) return 'เก็บของให้มากขึ้น!';
        if (accuracy < 0.7) return 'ดูกฎให้ดี แล้วเก็บของให้ถูกชนิด!';
        if (this.totalCollisions > 3) return 'หลบสิ่งกีดขวางให้มากขึ้น!';
        return 'เก็บของให้ครบและหลบสิ่งกีดขวางให้ดี!';
    }

    // ==================== RESIZE HANDLER ====================

    handleResize(gameSize: Phaser.Structs.Size) {
        const { width, height } = gameSize;
        const maxRiverPx = 380;
        const rawRiverW = width * this.levelConfig.riverWidthRatio;
        this.riverWidth = Math.min(rawRiverW, maxRiverPx);
        this.riverLeft = (width - this.riverWidth) / 2;
        this.riverRight = this.riverLeft + this.riverWidth;

        this.boat.x = Phaser.Math.Clamp(this.boat.x,
            this.riverLeft + this.boatWidth / 2 + 5,
            this.riverRight - this.boatWidth / 2 - 5);
        this.boat.y = height - 160;

        this.ruleBannerBg.setPosition(width / 2, 75);
        this.ruleBanner.setPosition(width / 2, 75);
        this.coinCountText.setPosition(width - 20, 20);

        // Reposition sack to bottom-right
        if (this.sackIcon) {
            this.sackIcon.setPosition(width - 60, height - 60);
        }
        if (this.sackCountText) {
            this.sackCountText.setPosition(width - 60, height - 90);
        }

        // Reposition Health Bar UI
        if (this.healthHearts && this.healthHearts.length === 3) {
            const healthY = height - 40;
            const heartSpacing = 30;
            const startX = (width / 2) - heartSpacing;
            for (let i = 0; i < 3; i++) {
                this.healthHearts[i].setPosition(startX + (i * heartSpacing), healthY);
            }
        }

        // Reposition Quantity UI
        if (this.quantityUIContainer) {
            this.quantityUIContainer.setPosition(width / 2, 75 + 65);
        }

        if (this.leftZone) {
            this.leftZone.setPosition(width / 4, height / 2);
            this.leftZone.setSize(width / 2, height);
        }
        if (this.rightZone) {
            this.rightZone.setPosition(width * 3 / 4, height / 2);
            this.rightZone.setSize(width / 2, height);
        }
    }
}
