import * as Phaser from 'phaser';
import { TAXIDRIVER_LEVELS, TaxiDriverLevelConfig } from './levels';

// Direction types
type Direction = 'left' | 'right' | 'forward';

// Color Palette (Warm/Cream Theme)
const COLORS = {
    BACKGROUND: 0xEBE9E4, // Warm Gray
    ROAD: 0xFAF9F6,       // Cream
    ROAD_BORDER: 0xD6D6D6,
    UI_PANEL: 0xFAF9F6,   // Cream
    UI_STROKE: 0xDDDDDD,
    TEXT_DARK: 0x2B2115,
};
type Heading = 'N' | 'S' | 'E' | 'W';

// Turn data for stats tracking
interface TurnData {
    carHeading: Heading;
    correctDirection: Direction;
    playerDirection: Direction | null;
    isBlindTurn: boolean;
    isSuddenChange: boolean;
    timeToInput: number;
    distanceToIntersection: number;
    wasCorrect: boolean;
}

// Road segment for path
interface RoadSegment {
    x: number;
    y: number;
    direction: Heading;
    isIntersection: boolean;
    turnRequired?: Direction;
}

export class TaxiDriverGameScene extends Phaser.Scene {
    private currentLevelConfig!: TaxiDriverLevelConfig;

    // Grid settings
    private readonly GRID_SIZE = 7;  // 7x7 grid
    private readonly ROAD_WIDTH = 60;
    private cellSize = 80;
    private gridOffsetX = 0;
    private gridOffsetY = 0;
    private controlPanelY = 0;  // Computed in createUI

    // Game objects
    private car!: Phaser.GameObjects.Container;
    private pathGraphics!: Phaser.GameObjects.Graphics;
    private roadGraphics!: Phaser.GameObjects.Graphics;
    private buildingContainers: Phaser.GameObjects.Container[] = [];


    // Path data
    private path: RoadSegment[] = [];
    private currentPathIndex = 0;
    private targetPosition: { x: number; y: number } | null = null;

    // Car state
    private carHeading: Heading = 'N';
    private carGridX = 3;
    private carGridY = 6;
    private isMoving = false;
    private isWaitingForInput = false;
    private decisionTimer: Phaser.Time.TimerEvent | null = null;

    // UI Elements
    private leftButton!: Phaser.GameObjects.Container;
    private rightButton!: Phaser.GameObjects.Container;
    private forwardButton!: Phaser.GameObjects.Container;
    private messageText!: Phaser.GameObjects.Text;
    private alertIndicator!: Phaser.GameObjects.Container;  // Exclamation mark above car

    // Game state
    private gameStarted = false;
    private gameOver = false;
    private startTime = 0;
    private isPaused = false;

    // Path visibility
    private isPathVisible = true;
    private pathFadeTimer: Phaser.Time.TimerEvent | null = null;

    // Stats tracking
    private turnData: TurnData[] = [];
    private currentTurnStartTime = 0;
    private currentTurnDistance = 0;
    private hasSuddenChangeOccurred = false;

    // Real-time navigation state
    private upcomingIntersectionIndex = -1;  // Index of next intersection in path
    private queuedDirection: Direction | null = null;  // Player's queued direction
    private isApproachingIntersection = false;
    private approachTimeMs = 1500;  // Time in ms before intersection to trigger alert (consistent across devices)

    // Brake stop mechanic state
    private brakeStopsRemaining = 0;
    private isBrakeStopped = false;
    private isSwapBrake = false;  // true when brake stop is from swap trigger
    private brakeStopTimer: Phaser.Time.TimerEvent | null = null;
    private brakeStopSegments: number[] = [];  // Indices of segments where brake stops will occur
    private stopSignContainer: Phaser.GameObjects.Container | null = null;

    // Road closure / obstacle reroute state
    private roadClosureSegments: number[] = [];  // Indices of segments where obstacles appear
    private roadClosureContainer: Phaser.GameObjects.Container | null = null;
    private isRoadClosed = false;
    private roadClosuresTriggered = 0;
    private isApproachingRoadClosure = false;

    // Pre-visible trap markers
    private stopSignMarkers: Phaser.GameObjects.Container[] = [];
    private barricadeMarkers: Phaser.GameObjects.Container[] = [];
    private swapMarker: Phaser.GameObjects.Container | null = null;
    private swapControlSegment: number = -1;  // Segment index for control swap trigger

    // Audio
    private engineSound: Phaser.Sound.BaseSound | null = null;

    // Objective system state
    private currentObjective = 1;
    private totalObjectives = 1;
    private objectiveProgressText!: Phaser.GameObjects.Text;
    private controlsSwapped = false;
    private controlSwapTimer: Phaser.Time.TimerEvent | null = null;
    private swapAlertPopup: Phaser.GameObjects.Container | null = null;

    // Life System
    private lives = 3;
    private livesContainer!: Phaser.GameObjects.Container;
    private lifeIcons: Phaser.GameObjects.Image[] = [];

    constructor() {
        super({ key: 'TaxiDriverGameScene' });
    }

    init(data: { level: number }) {
        const regLevel = this.registry.get('level');
        const level = data.level ?? regLevel ?? 1;
        this.currentLevelConfig = TAXIDRIVER_LEVELS[level] || TAXIDRIVER_LEVELS[1];

        // Reset all state
        this.lives = 3;
        this.path = [];
        this.currentPathIndex = 0;
        this.carHeading = 'N';
        this.carGridX = 3;
        this.carGridY = 6;
        this.isMoving = false;
        this.isWaitingForInput = false;
        this.gameStarted = false;
        this.gameOver = false;
        this.isPaused = false;
        this.isPathVisible = true;
        this.turnData = [];
        this.hasSuddenChangeOccurred = false;
        this.buildingContainers = [];
        this.upcomingIntersectionIndex = -1;
        this.queuedDirection = null;
        this.isApproachingIntersection = false;
        this.brakeStopsRemaining = 0;
        this.isBrakeStopped = false;
        this.brakeStopSegments = [];

        // Reset road closure state
        this.roadClosureSegments = [];
        this.isRoadClosed = false;
        this.roadClosuresTriggered = 0;
        this.isApproachingRoadClosure = false;

        // Reset trap markers
        this.stopSignMarkers = [];
        this.barricadeMarkers = [];
        this.swapMarker = null;
        this.swapControlSegment = -1;

        // Initialize objective tracking
        this.currentObjective = 1;
        this.totalObjectives = this.currentLevelConfig.objectiveCount || 1;
    }

    preload() {
        // Load assets
        this.load.image('tuktuk-body', '/assets/game-15-taxidriver/tuktuk_asset.png');
        this.load.image('barricade', '/assets/game-15-taxidriver/barricade.png');

        // Load sounds
        this.load.audio('engine-idle', '/assets/sounds/taxidriver/Engine_Idle.mp3');
        this.load.audio('correct-turn', '/assets/sounds/taxidriver/Turn_Swooosh.mp3');
        this.load.audio('wrong-turn', '/assets/sounds/global/error.mp3');
        this.load.audio('game-bgm', '/assets/sounds/taxidriver/taxidriver-bg.mp3');
        this.load.audio('car-horn', '/assets/sounds/taxidriver/horn.mp3'); // Added per user request
        this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('level-fail', '/assets/sounds/global/level-fail.mp3');
    }

    create() {
        const { width, height } = this.scale;

        // Calculate grid dimensions
        this.calculateGridDimensions();

        // Create background
        this.add.rectangle(width / 2, height / 2, width, height, COLORS.BACKGROUND);

        // Create road layer
        this.roadGraphics = this.add.graphics();
        this.drawRoads();

        // Create buildings (decorative)
        this.createBuildings();

        // Generate path
        this.generatePath();

        // Create path layer (blue line)
        this.pathGraphics = this.add.graphics();
        this.pathGraphics.setDepth(10);
        this.drawPath();

        // Create car
        this.createCar();

        // Create alert indicator (exclamation mark)
        this.createAlertIndicator();

        // Create UI controls
        this.createUI();

        // Create message text (Floating style)
        this.messageText = this.add.text(width / 2, height * 0.15, '', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '40px', // Much smaller than default (was probably huge by default elsewhere or relying on CSS)
            color: '#FFFFFF',
            stroke: '#2B2115',
            strokeThickness: 6,
            fontStyle: 'bold',
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, stroke: true, fill: true },
            padding: { x: 20, y: 20 }
        }).setOrigin(0.5).setDepth(200);

        // Stage progress indicator moved to createUI to ensure no overlap

        // Handle resize
        this.scale.on('resize', () => {
            this.calculateGridDimensions();
            this.layoutGame();
        });

        // Initialize particle textures
        this.createParticleTextures();

        // Audio Setup
        this.sound.stopAll();
        // BGM
        this.sound.play('game-bgm', { volume: 0.4, loop: true });
        // Engine
        this.engineSound = this.sound.add('engine-idle', { volume: 0.2, loop: true });
        this.engineSound.play();

        // Start game sequence
        this.startGame();

        // Listen for resume event
        this.game.events.on('resume-game', () => {
            this.resumeFromPause();
        });
    }

    update(time: number, delta: number) {
        if (!this.gameStarted || this.gameOver || this.isPaused) return;

        if (this.isMoving && this.targetPosition) {
            this.moveCarTowardsTarget(delta);
            this.checkApproachingIntersection();
            this.updateAlertIndicator();

            // Emit dust trail
            if (Math.random() < 0.1) { // 10% chance per frame (~6 times/sec at 60fps)
                // Emit from rear tires
                const angle = this.car.angle * Phaser.Math.DEG_TO_RAD;
                // Correct math for "behind" the car based on 0 deg = Up (-Y)
                // Forward vector relative to angle is (sin(a), -cos(a))
                // Backward vector is (-sin(a), cos(a))
                const offsetX = -Math.sin(angle) * 30;
                const offsetY = Math.cos(angle) * 30;
                this.emitDust(this.car.x + offsetX, this.car.y + offsetY);
            }
        }
    }

    private calculateGridDimensions() {
        const { width, height } = this.scale;

        // Dynamic layout: map sits between top UI (level header ~15%) and control panel bottom
        const buttonSize = Math.min(130, width * 0.28);
        const controlPanelHeight = buttonSize + 40;
        const topMargin = height * 0.14;  // Space for level header
        const bottomMargin = controlPanelHeight + 50;  // Space for control panel + gap

        const availableHeight = height - topMargin - bottomMargin;
        const availableWidth = width * 0.95;

        // Calculate cell size to fit grid
        this.cellSize = Math.min(
            availableWidth / this.GRID_SIZE,
            availableHeight / this.GRID_SIZE
        );

        // Limit max cell size
        this.cellSize = Math.min(this.cellSize, 120);

        // Calculate offsets to center grid
        const gridWidth = this.GRID_SIZE * this.cellSize;
        const gridHeight = this.GRID_SIZE * this.cellSize;

        this.gridOffsetX = (width - gridWidth) / 2;
        // Center the grid vertically in the available space
        this.gridOffsetY = topMargin + (availableHeight - gridHeight) / 2;
    }

    private gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
        return {
            x: this.gridOffsetX + (gridX + 0.5) * this.cellSize,
            y: this.gridOffsetY + (gridY + 0.5) * this.cellSize
        };
    }

    private drawRoads() {
        this.roadGraphics.clear();

        // Colors
        const roadColor = COLORS.ROAD;   // Cream roads
        const borderColor = 0xD6D6D6;    // Light gray border
        const boarderWidth = this.cellSize * 0.8; // Total width including borders
        const roadWidth = this.cellSize * 0.6;    // Inner road width

        // 1. Draw road borders (base layer)
        this.roadGraphics.fillStyle(borderColor, 1);
        for (let x = 0; x < this.GRID_SIZE; x++) {
            for (let y = 0; y < this.GRID_SIZE; y++) {
                const pos = this.gridToWorld(x, y);

                // Center junction
                this.roadGraphics.fillRoundedRect(
                    pos.x - boarderWidth / 2,
                    pos.y - boarderWidth / 2,
                    boarderWidth,
                    boarderWidth,
                    4
                );

                // Horizontal connections
                if (x < this.GRID_SIZE - 1) {
                    this.roadGraphics.fillRect(
                        pos.x + boarderWidth / 2 - 2,
                        pos.y - boarderWidth / 2,
                        this.cellSize - boarderWidth + 4,
                        boarderWidth
                    );
                }

                // Vertical connections  
                if (y < this.GRID_SIZE - 1) {
                    this.roadGraphics.fillRect(
                        pos.x - boarderWidth / 2,
                        pos.y + boarderWidth / 2 - 2,
                        boarderWidth,
                        this.cellSize - boarderWidth + 4
                    );
                }
            }
        }

        // 2. Draw inner roads (white layer)
        this.roadGraphics.fillStyle(roadColor, 1);
        for (let x = 0; x < this.GRID_SIZE; x++) {
            for (let y = 0; y < this.GRID_SIZE; y++) {
                const pos = this.gridToWorld(x, y);

                // Center junction
                this.roadGraphics.fillRoundedRect(
                    pos.x - roadWidth / 2,
                    pos.y - roadWidth / 2,
                    roadWidth,
                    roadWidth,
                    2
                );

                // Horizontal connections
                if (x < this.GRID_SIZE - 1) {
                    this.roadGraphics.fillRect(
                        pos.x + roadWidth / 2 - 2,
                        pos.y - roadWidth / 2,
                        this.cellSize - roadWidth + 4,
                        roadWidth
                    );
                }

                // Vertical connections  
                if (y < this.GRID_SIZE - 1) {
                    this.roadGraphics.fillRect(
                        pos.x - roadWidth / 2,
                        pos.y + roadWidth / 2 - 2,
                        roadWidth,
                        this.cellSize - roadWidth + 4
                    );
                }
            }
        }
    }

    private createBuildings() {
        // Create decorative map elements (buildings, parks, water) between roads
        // Enhanced Google Maps palette with varied building sizes
        const buildingColors = [
            0xE8E3DD, 0xF2EDE7, 0xDDD8D2, 0xEBE6E0, 0xF5F0EA,  // Warm grays
            0xD4C4B0, 0xE0D5C7, 0xC9BCA8,  // Warm tans
        ];
        const accentColors = [0xC4A882, 0xB8A48C, 0xA89478, 0x9E8A6E];
        const parkColor = 0xC1E1C1;
        const waterColor = 0xAADAFF;
        const shadowColor = 0xBBBBBB;

        // Clear existing buildings
        this.buildingContainers.forEach(b => b.destroy());
        this.buildingContainers = [];

        // Block claim grid: track which block cells are used by multi-cell buildings
        const blockCols = this.GRID_SIZE - 1;  // 6 columns of blocks
        const blockRows = this.GRID_SIZE - 1;  // 6 rows of blocks
        const claimed: boolean[][] = Array.from({ length: blockCols }, () => Array(blockRows).fill(false));

        // Determine block type by position (consistent per layout)
        const getBlockType = (bx: number, by: number): string => {
            const noise = Math.sin(bx * 0.5) * Math.cos(by * 0.5);
            if (noise > 0.7) return 'water';
            if (noise < -0.6) return 'park';
            return 'building';
        };

        // Helper: get center and size for a single block cell
        // Block (bx, by) sits between grid intersections (bx, by) and (bx+1, by+1)
        // Its center is at gridToWorld(bx + 0.5, by + 0.5)
        const getBlockCenter = (bx: number, by: number) => {
            return this.gridToWorld(bx + 0.5, by + 0.5);
        };
        const blockSize = this.cellSize * 0.75;  // Each block stays within its cell

        // Helper: render a single building block within a cell
        const renderBuildingCell = (container: Phaser.GameObjects.Container, offsetX: number, offsetY: number, color: number, sz: number) => {
            const s = this.add.rectangle(offsetX + 4, offsetY + 4, sz, sz, shadowColor);
            const b = this.add.rectangle(offsetX, offsetY, sz, sz, color).setStrokeStyle(1, 0xBBBBBB);
            container.add([s, b]);
        };

        // Pass 1: Try to place 2×2 building complexes (4 same-colored blocks)
        for (let bx = 0; bx < blockCols - 1; bx++) {
            for (let by = 0; by < blockRows - 1; by++) {
                if (claimed[bx][by] || claimed[bx + 1][by] || claimed[bx][by + 1] || claimed[bx + 1][by + 1]) continue;
                if (getBlockType(bx, by) !== 'building' || getBlockType(bx + 1, by + 1) !== 'building') continue;
                if (Math.random() > 0.18) continue;

                claimed[bx][by] = claimed[bx + 1][by] = claimed[bx][by + 1] = claimed[bx + 1][by + 1] = true;
                const color = Phaser.Utils.Array.GetRandom(buildingColors);
                const accent = Phaser.Utils.Array.GetRandom(accentColors);

                // Render each of the 4 cells individually
                const cells = [[bx, by], [bx + 1, by], [bx, by + 1], [bx + 1, by + 1]];
                cells.forEach(([cx, cy], idx) => {
                    const pos = getBlockCenter(cx, cy);
                    const container = this.add.container(pos.x, pos.y).setDepth(5);
                    this.buildingContainers.push(container);
                    const s = this.add.rectangle(4, 4, blockSize, blockSize, shadowColor);
                    const b = this.add.rectangle(0, 0, blockSize, blockSize, color).setStrokeStyle(1.5, 0xBBBBBB);
                    container.add([s, b]);
                    // Add accent detail to one cell (top-left gets AC, bottom-right gets accent stripe)
                    if (idx === 0) {
                        const ac = this.add.rectangle(blockSize * 0.2, -blockSize * 0.2, blockSize * 0.15, blockSize * 0.12, 0x999999).setStrokeStyle(1, 0x777777);
                        container.add([ac]);
                    } else if (idx === 3) {
                        const stripe = this.add.rectangle(0, -blockSize * 0.35, blockSize * 0.8, blockSize * 0.08, accent);
                        container.add([stripe]);
                    }
                });
            }
        }

        // Pass 2: Try to place 2×1 and 1×2 building pairs (2 same-colored blocks)
        for (let bx = 0; bx < blockCols; bx++) {
            for (let by = 0; by < blockRows; by++) {
                if (claimed[bx][by]) continue;
                if (getBlockType(bx, by) !== 'building') continue;

                // Try 2×1 (wide pair)
                if (bx + 1 < blockCols && !claimed[bx + 1][by] && getBlockType(bx + 1, by) === 'building' && Math.random() < 0.25) {
                    claimed[bx][by] = claimed[bx + 1][by] = true;
                    const color = Phaser.Utils.Array.GetRandom(buildingColors);

                    [[bx, by], [bx + 1, by]].forEach(([cx, cy], idx) => {
                        const pos = getBlockCenter(cx, cy);
                        const container = this.add.container(pos.x, pos.y).setDepth(5);
                        this.buildingContainers.push(container);
                        const s = this.add.rectangle(4, 4, blockSize, blockSize, shadowColor);
                        const b = this.add.rectangle(0, 0, blockSize, blockSize, color).setStrokeStyle(1.5, 0xBBBBBB);
                        container.add([s, b]);
                        // Add window dots to distinguish as wide building
                        for (let wi = -1; wi <= 1; wi++) {
                            const win = this.add.circle(wi * blockSize * 0.25, 0, blockSize * 0.06, 0xADD8E6).setStrokeStyle(0.5, 0x888888);
                            container.add([win]);
                        }
                    });
                    continue;
                }

                // Try 1×2 (tall pair)
                if (by + 1 < blockRows && !claimed[bx][by + 1] && getBlockType(bx, by + 1) === 'building' && Math.random() < 0.25) {
                    claimed[bx][by] = claimed[bx][by + 1] = true;
                    const color = Phaser.Utils.Array.GetRandom(buildingColors);
                    const accent = Phaser.Utils.Array.GetRandom(accentColors);

                    [[bx, by], [bx, by + 1]].forEach(([cx, cy], idx) => {
                        const pos = getBlockCenter(cx, cy);
                        const container = this.add.container(pos.x, pos.y).setDepth(5);
                        this.buildingContainers.push(container);
                        const s = this.add.rectangle(4, 4, blockSize, blockSize, shadowColor);
                        const b = this.add.rectangle(0, 0, blockSize, blockSize, color).setStrokeStyle(1.5, 0xBBBBBB);
                        container.add([s, b]);
                        // Add antenna to top cell
                        if (idx === 0) {
                            const antenna = this.add.rectangle(blockSize * 0.25, -blockSize / 2 - 4, 2, 10, 0x666666);
                            const dish = this.add.circle(blockSize * 0.25, -blockSize / 2 - 8, 3, accent);
                            container.add([antenna, dish]);
                        }
                    });
                    continue;
                }
            }
        }

        // Pass 3: Fill remaining 1×1 blocks
        for (let bx = 0; bx < blockCols; bx++) {
            for (let by = 0; by < blockRows; by++) {
                if (claimed[bx][by]) continue;
                claimed[bx][by] = true;

                const pos = getBlockCenter(bx, by);
                const type = getBlockType(bx, by);

                const container = this.add.container(pos.x, pos.y).setDepth(5);
                this.buildingContainers.push(container);

                if (type === 'water') {
                    const water = this.add.rectangle(0, 0, blockSize, blockSize, waterColor);
                    const wave1 = this.add.text(-blockSize / 3, -blockSize / 4, '~', { color: '#88CCFF', fontSize: `${blockSize * 0.3}px` }).setOrigin(0.5);
                    const wave2 = this.add.text(blockSize / 4, blockSize / 5, '~', { color: '#88CCFF', fontSize: `${blockSize * 0.3}px` }).setOrigin(0.5);
                    container.add([water, wave1, wave2]);
                } else if (type === 'park') {
                    const park = this.add.rectangle(0, 0, blockSize, blockSize, parkColor);
                    const treeRadius = blockSize * 0.08;
                    const t1 = this.add.circle(-blockSize * 0.25, -blockSize * 0.25, treeRadius, 0x8FBC8F);
                    const t2 = this.add.circle(blockSize * 0.3, blockSize * 0.2, treeRadius * 1.3, 0x8FBC8F);
                    const t3 = this.add.circle(-blockSize * 0.15, blockSize * 0.3, treeRadius * 0.9, 0x8FBC8F);
                    container.add([park, t1, t2, t3]);
                } else {
                    // 1×1 Building — varied shapes
                    const shapeType = Phaser.Math.Between(0, 4);
                    const color = Phaser.Utils.Array.GetRandom(buildingColors);

                    if (shapeType <= 1) {
                        // Full block
                        const s = this.add.rectangle(4, 4, blockSize, blockSize, shadowColor);
                        const b = this.add.rectangle(0, 0, blockSize, blockSize, color).setStrokeStyle(1, 0xBBBBBB);
                        container.add([s, b]);
                    } else if (shapeType === 2) {
                        // L-shape
                        const wh = blockSize * 0.4;
                        const s1 = this.add.rectangle(-blockSize / 2 + wh / 2 + 3, 3, wh, blockSize, shadowColor);
                        const s2 = this.add.rectangle(3, blockSize / 2 - wh / 2 + 3, blockSize, wh, shadowColor);
                        const b1 = this.add.rectangle(-blockSize / 2 + wh / 2, 0, wh, blockSize, color).setStrokeStyle(1, 0xBBBBBB);
                        const b2 = this.add.rectangle(0, blockSize / 2 - wh / 2, blockSize, wh, color).setStrokeStyle(1, 0xBBBBBB);
                        container.add([s1, s2, b1, b2]);
                    } else {
                        // Two small buildings
                        const sz = blockSize * 0.42;
                        const off = blockSize * 0.24;
                        const c1 = Phaser.Utils.Array.GetRandom(buildingColors);
                        const c2 = Phaser.Utils.Array.GetRandom(buildingColors);
                        const s1 = this.add.rectangle(-off + 3, -off + 3, sz, sz, shadowColor);
                        const b1 = this.add.rectangle(-off, -off, sz, sz, c1).setStrokeStyle(1, 0xBBBBBB);
                        const s2 = this.add.rectangle(off + 3, off + 3, sz, sz, shadowColor);
                        const b2 = this.add.rectangle(off, off, sz, sz, c2).setStrokeStyle(1, 0xBBBBBB);
                        container.add([s1, b1, s2, b2]);
                    }
                }
            }
        }
    }

    private generatePath(fromX?: number, fromY?: number, fromHeading?: Heading) {
        // Generate a random path from start to end
        const pathLength = this.currentLevelConfig.pathLength;

        let startX: number, startY: number;
        let heading: Heading;

        if (fromX !== undefined && fromY !== undefined && fromHeading !== undefined) {
            // Continue from a given position (subsequent objectives)
            startX = fromX;
            startY = fromY;
            heading = fromHeading;
        } else {
            // Default start based on map rotation (first objective)
            startX = 3; startY = 6; heading = 'N';
            switch (this.currentLevelConfig.mapRotation) {
                case 0:
                    startX = 3; startY = 6; heading = 'N';
                    break;
                case 90:
                    startX = 0; startY = 3; heading = 'E';
                    break;
                case 180:
                    startX = 3; startY = 0; heading = 'S';
                    break;
                case 270:
                    startX = 6; startY = 3; heading = 'W';
                    break;
            }
        }

        this.carGridX = startX;
        this.carGridY = startY;
        this.carHeading = heading;

        // Simple path generation
        this.path = [];
        let currentX = startX;
        let currentY = startY;
        let currentHeading = heading;
        let turnsRemaining = pathLength;

        // Add starting segment
        this.path.push({
            x: currentX,
            y: currentY,
            direction: currentHeading,
            isIntersection: false
        });

        // Generate path with turns
        while (turnsRemaining > 0 && this.path.length < 50) {
            // Determine possible moves
            const moves = this.getPossibleMoves(currentX, currentY, currentHeading);

            if (moves.length === 0) break;

            // Decide: turn or go straight?
            const shouldTurn = turnsRemaining > 0 && Math.random() < 0.6;
            let chosenMove;

            if (shouldTurn) {
                // Pick a turn
                const turns = moves.filter(m => m.direction !== 'forward');
                if (turns.length > 0) {
                    chosenMove = Phaser.Utils.Array.GetRandom(turns);
                    turnsRemaining--;
                } else {
                    chosenMove = moves.find(m => m.direction === 'forward') || moves[0];
                }
            } else {
                // Go straight if possible
                chosenMove = moves.find(m => m.direction === 'forward') || Phaser.Utils.Array.GetRandom(moves);
            }

            // Update position
            const { newX, newY, newHeading, direction } = chosenMove;

            // Mark previous segment as intersection if turning
            if (direction !== 'forward' && this.path.length > 0) {
                this.path[this.path.length - 1].isIntersection = true;
                this.path[this.path.length - 1].turnRequired = direction;
            }

            this.path.push({
                x: newX,
                y: newY,
                direction: newHeading,
                isIntersection: false
            });

            currentX = newX;
            currentY = newY;
            currentHeading = newHeading;

            // Check if we've reached an edge (end condition based on rotation)
            if (this.isAtDestination(currentX, currentY)) {
                break;
            }
        }
    }

    private isAtDestination(x: number, y: number): boolean {
        switch (this.currentLevelConfig.mapRotation) {
            case 0: return y <= 0;
            case 90: return x >= this.GRID_SIZE - 1;
            case 180: return y >= this.GRID_SIZE - 1;
            case 270: return x <= 0;
            default: return false;
        }
    }

    private getPossibleMoves(x: number, y: number, heading: Heading): Array<{
        newX: number;
        newY: number;
        newHeading: Heading;
        direction: Direction;
    }> {
        const moves: Array<{ newX: number; newY: number; newHeading: Heading; direction: Direction }> = [];

        const directions: Record<Heading, { dx: number; dy: number }> = {
            'N': { dx: 0, dy: -1 },
            'S': { dx: 0, dy: 1 },
            'E': { dx: 1, dy: 0 },
            'W': { dx: -1, dy: 0 }
        };

        const leftTurns: Record<Heading, Heading> = { 'N': 'W', 'W': 'S', 'S': 'E', 'E': 'N' };
        const rightTurns: Record<Heading, Heading> = { 'N': 'E', 'E': 'S', 'S': 'W', 'W': 'N' };

        // Forward
        const fwd = directions[heading];
        const fwdX = x + fwd.dx;
        const fwdY = y + fwd.dy;
        if (this.isValidCell(fwdX, fwdY) && !this.isInPath(fwdX, fwdY)) {
            moves.push({ newX: fwdX, newY: fwdY, newHeading: heading, direction: 'forward' });
        }

        // Left
        const leftHeading = leftTurns[heading];
        const left = directions[leftHeading];
        const leftX = x + left.dx;
        const leftY = y + left.dy;
        if (this.isValidCell(leftX, leftY) && !this.isInPath(leftX, leftY)) {
            moves.push({ newX: leftX, newY: leftY, newHeading: leftHeading, direction: 'left' });
        }

        // Right
        const rightHeading = rightTurns[heading];
        const right = directions[rightHeading];
        const rightX = x + right.dx;
        const rightY = y + right.dy;
        if (this.isValidCell(rightX, rightY) && !this.isInPath(rightX, rightY)) {
            moves.push({ newX: rightX, newY: rightY, newHeading: rightHeading, direction: 'right' });
        }

        return moves;
    }

    private isValidCell(x: number, y: number): boolean {
        return x >= 0 && x < this.GRID_SIZE && y >= 0 && y < this.GRID_SIZE;
    }

    private isInPath(x: number, y: number): boolean {
        return this.path.some(seg => seg.x === x && seg.y === y);
    }

    private drawPath() {
        this.pathGraphics.clear();

        if (!this.isPathVisible || this.path.length < 2) return;

        // Draw blue dotted line for path
        this.pathGraphics.lineStyle(8, 0x4285F4, 0.9);

        const startPos = this.gridToWorld(this.path[0].x, this.path[0].y);
        this.pathGraphics.moveTo(startPos.x, startPos.y);

        for (let i = 1; i < this.path.length; i++) {
            const pos = this.gridToWorld(this.path[i].x, this.path[i].y);
            this.pathGraphics.lineTo(pos.x, pos.y);
        }

        this.pathGraphics.strokePath();

        // Draw destination marker
        const endSeg = this.path[this.path.length - 1];
        const endPos = this.gridToWorld(endSeg.x, endSeg.y);

        this.pathGraphics.fillStyle(0xFF0000, 1);
        this.pathGraphics.fillCircle(endPos.x, endPos.y, 12);
        this.pathGraphics.fillStyle(0xFFFFFF, 1);
        this.pathGraphics.fillCircle(endPos.x, endPos.y, 6);
    }


    private createCar() {
        const pos = this.gridToWorld(this.carGridX, this.carGridY);

        this.car = this.add.container(pos.x, pos.y);
        this.car.setDepth(100);

        // Dimensions - Increased size based on user feedback
        const width = this.cellSize * 1.0;
        const length = this.cellSize * 1.3;

        // 1. Shadow (grounded feel) - Reduced size
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillEllipse(0, 4, width * 0.7, length * 0.7);

        // 2. Headlight Beams (Cone of light)
        // Beam should be strictly "In Front" relative to the car's local Up (-Y)

        const beamOriginY = -length / 2 + 10; // Front of car (Top in local space)

        const beam = this.add.graphics();
        beam.fillStyle(0xFFFFCC, 0.4);

        // Single central beam (Cone) pointing UP (-Y)
        beam.beginPath();
        beam.moveTo(0, beamOriginY); // Start at center front (X=0, Y=Front)
        beam.lineTo(-30, beamOriginY - 100); // Fan out Left-Up
        beam.lineTo(30, beamOriginY - 100);  // Fan out Right-Up
        beam.closePath();
        beam.fillPath();

        // 3. Tuktuk Sprite
        const tuktuk = this.add.image(0, 0, 'tuktuk-body');
        tuktuk.setDisplaySize(width, length);

        // Rotate 180 degrees (Facing Left)
        tuktuk.setAngle(180);

        // Add to container (Shadow bottom, Beam middle, Tuktuk top)
        this.car.add([shadow, beam, tuktuk]);

        // Set initial rotation based on heading
        this.updateCarRotation();
    }

    private createAlertIndicator() {
        // Create exclamation mark indicator that appears above the car
        this.alertIndicator = this.add.container(0, 0);
        this.alertIndicator.setDepth(150);
        this.alertIndicator.setVisible(false);

        // Background circle
        const bgCircle = this.add.circle(0, 0, 20, 0xFF4444);
        bgCircle.setStrokeStyle(3, 0xFFFFFF);

        // Exclamation mark
        const exclamation = this.add.text(0, 0, '!', {
            fontFamily: 'Arial',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.alertIndicator.add([bgCircle, exclamation]);
    }

    private updateAlertIndicator() {
        if (this.isApproachingIntersection && !this.queuedDirection) {
            // Show indicator above the car
            this.alertIndicator.setPosition(this.car.x, this.car.y - 60);
            this.alertIndicator.setVisible(true);

            // Pulsing animation
            if (!this.tweens.isTweening(this.alertIndicator)) {
                this.tweens.add({
                    targets: this.alertIndicator,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: 300,
                    yoyo: true,
                    repeat: -1
                });
            }
        } else {
            this.alertIndicator.setVisible(false);
            this.tweens.killTweensOf(this.alertIndicator);
            this.alertIndicator.setScale(1);
        }
    }

    private updateCarRotation() {
        const rotations: Record<Heading, number> = {
            'N': 0,
            'E': 90,
            'S': 180,
            'W': 270
        };
        this.car.setAngle(rotations[this.carHeading]);
    }

    private createUI() {
        const { width, height } = this.scale;

        // Control panel at bottom — larger buttons for accessibility
        const buttonSize = Math.min(130, width * 0.28);
        const spacing = Math.min(20, width * 0.035);

        // Fixed distance from bottom to prevent overlap
        const panelY = height - buttonSize * 0.75;
        this.controlPanelY = panelY;

        // Panel background (floating pill shape)
        const panelWidth = buttonSize * 3 + spacing * 4;
        const panelHeight = buttonSize + 30;

        // Create objective progress indicator (Floating Pill)
        if (this.totalObjectives > 1) {
            const pillW = 180;
            const pillH = 44;
            const pillX = width / 2 - pillW / 2;
            // Position between map bottom and control panel top
            const gridBottom = this.gridOffsetY + this.GRID_SIZE * this.cellSize;
            const panelTop = panelY - panelHeight / 2;
            const pillY = gridBottom + (panelTop - gridBottom - pillH) / 2;

            const pill = this.add.graphics();
            pill.fillStyle(COLORS.UI_PANEL, 0.9);
            pill.fillRoundedRect(pillX, pillY, pillW, pillH, 22);
            pill.lineStyle(2, COLORS.UI_STROKE);
            pill.strokeRoundedRect(pillX, pillY, pillW, pillH, 22);
            pill.setDepth(199);

            if (this.objectiveProgressText) this.objectiveProgressText.destroy();
            this.objectiveProgressText = this.add.text(width / 2, pillY + pillH / 2, `ด่าน ${this.currentObjective}/${this.totalObjectives}`, {
                fontFamily: 'Sarabun, sans-serif',
                fontSize: '22px',
                color: '#2B2115',
                fontStyle: 'bold',
                padding: { x: 10, y: 10 }
            }).setOrigin(0.5).setDepth(200);
        }

        const panelBg = this.add.graphics();
        panelBg.fillStyle(COLORS.UI_PANEL, 0.9);
        panelBg.fillRoundedRect(
            width / 2 - panelWidth / 2,
            panelY - panelHeight / 2,
            panelWidth,
            panelHeight,
            20
        );
        panelBg.setDepth(150);

        // Add subtle shadow to panel
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillRoundedRect(
            width / 2 - panelWidth / 2 + 4,
            panelY - panelHeight / 2 + 4,
            panelWidth,
            panelHeight,
            20
        );
        shadow.setDepth(149);

        // Left button (Thai: Left)
        this.leftButton = this.createDirectionButton(
            width / 2 - buttonSize - spacing, panelY,
            'left', 'ซ้าย', buttonSize
        );

        // Forward button (Start / Go)
        this.forwardButton = this.createDirectionButton(
            width / 2, panelY,
            'forward', 'START', buttonSize
        );

        // Right button (Thai: Right)
        this.rightButton = this.createDirectionButton(
            width / 2 + buttonSize + spacing, panelY,
            'right', 'ขวา', buttonSize
        );

        // Create Lives Display (Top Center)
        this.createLivesDisplay(width);
    }

    private createLivesDisplay(width: number) {
        this.livesContainer = this.add.container(width / 2, this.scale.height * 0.08);
        this.livesContainer.setDepth(200);

        // Background pill
        const bgWidth = 160;
        const bgHeight = 50;
        const bg = this.add.graphics();
        bg.fillStyle(COLORS.UI_PANEL, 0.9);
        bg.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 25);
        bg.lineStyle(2, COLORS.UI_STROKE);
        bg.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 25);
        this.livesContainer.add(bg);

        // 3 Life Icons (Tuktuks)
        this.lifeIcons = [];
        const startX = -40;
        const spacing = 40;
        
        for (let i = 0; i < 3; i++) {
            const icon = this.add.image(startX + (i * spacing), 0, 'tuktuk-body');
            icon.setDisplaySize(35, 45); // small tuktuk icon
            icon.setAngle(90); // facing right
            this.livesContainer.add(icon);
            this.lifeIcons.push(icon);
        }
    }

    private updateLivesDisplay() {
        for (let i = 0; i < this.lifeIcons.length; i++) {
            if (i < this.lives) {
                this.lifeIcons[i].setAlpha(1);
                this.lifeIcons[i].setTint(0xFFFFFF); // Normal
            } else {
                this.lifeIcons[i].setAlpha(0.3);
                this.lifeIcons[i].setTint(0x555555); // Grayed out
            }
        }
    }

    private deductLife(reason: 'timeout' | 'wrong_direction') {
        if (this.lives <= 0 || this.gameOver) return;

        this.lives--;
        this.updateLivesDisplay();

        // Immediately stop the car
        this.isMoving = false;
        this.targetPosition = null;

        // Kill any pending decision timer
        if (this.decisionTimer) {
            this.decisionTimer.destroy();
            this.decisionTimer = null;
        }
        
        // Audio & visual feedback
        this.playSound('wrong-turn');
        this.showFeedback('✗', 0xFF4444);
        this.messageText.setText('ผิดทาง!');
        this.messageText.setColor('#FF4444');
        this.messageText.setVisible(true);

        // Camera shake + lives container pulse
        this.cameras.main.shake(300, 0.008);
        this.tweens.add({
            targets: this.livesContainer,
            scale: 1.3,
            duration: 200,
            yoyo: true,
            ease: 'Cubic.easeOut'
        });

        // Animate the lost life icon fading out
        const lostIconIndex = this.lives; // this.lives is already decremented
        if (lostIconIndex < this.lifeIcons.length) {
            const lostIcon = this.lifeIcons[lostIconIndex];
            // Flash red then fade to gray — don't touch scale (setDisplaySize uses it internally)
            lostIcon.setTint(0xFF4444);
            this.tweens.add({
                targets: lostIcon,
                alpha: 0.25,
                duration: 500,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    lostIcon.setTint(0x555555);
                }
            });
        }

        if (this.lives <= 0) {
            // Out of lives — brief pause then end game
            this.time.delayedCall(1200, () => {
                this.endGame(reason);
            });
        } else {
            // Still have lives — auto-correct the car onto the right path and resume
            this.time.delayedCall(1800, () => {
                if (this.gameOver) return;

                this.messageText.setVisible(false);
                
                // The car is currently sitting at the intersection (currentPathIndex).
                // We need to point it in the correct direction and continue.
                const currentSeg = this.path[this.currentPathIndex];
                
                // Snap car to intersection position
                const pos = this.gridToWorld(currentSeg.x, currentSeg.y);
                this.car.setPosition(pos.x, pos.y);
                this.carGridX = currentSeg.x;
                this.carGridY = currentSeg.y;
                
                // Face the correct direction (next segment's heading)
                if (this.currentPathIndex + 1 < this.path.length) {
                    this.carHeading = this.path[this.currentPathIndex + 1].direction;
                }
                this.updateCarRotation();

                // Reset navigation state
                this.queuedDirection = null;
                this.isApproachingIntersection = false;
                this.upcomingIntersectionIndex = -1;
                
                // Find next intersection and resume movement
                this.findNextIntersection();
                this.highlightButtons(true);
                this.moveToNextSegment();
            });
        }
    }

    private createDirectionButton(x: number, y: number, direction: Direction, symbol: string, size: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        container.setDepth(160);

        // Button background (Circle)
        const bg = this.add.circle(0, 0, size / 2, COLORS.UI_PANEL);
        bg.setStrokeStyle(2, COLORS.UI_STROKE);

        // Icon
        // Adjust font size for longer text (START) vs symbols
        const fontSize = symbol.length > 1 ? size * 0.25 : size * 0.4;
        const text = this.add.text(0, 0, symbol, {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: `${fontSize}px`,
            color: '#555555',
            fontStyle: 'bold',
            padding: { top: 5, bottom: 5, left: 5, right: 5 }
        }).setOrigin(0.5);

        container.add([bg, text]);

        // Make interactive
        bg.setInteractive({ useHandCursor: true });

        // Hover effects
        bg.on('pointerover', () => {
            if (this.gameOver) return;
            bg.setFillStyle(0xFFFFFF);
            this.tweens.add({
                targets: container,
                scale: 1.05,
                duration: 100
            });
        });

        bg.on('pointerout', () => {
            if (this.gameOver) return;
            bg.setFillStyle(0xF5F5F5);
            this.tweens.add({
                targets: container,
                scale: 1.0,
                duration: 100
            });
        });

        bg.on('pointerdown', () => {
            if (this.gameOver) return;

            // Handle brake stop with forward button
            if (this.isBrakeStopped && direction === 'forward') {
                // Visual feedback
                bg.setFillStyle(0x4285F4);
                text.setColor('#FFFFFF');
                this.tweens.add({
                    targets: container,
                    scale: 0.9,
                    duration: 50,
                    yoyo: true,
                    onComplete: () => {
                        bg.setFillStyle(0xF5F5F5);
                        text.setColor('#555555');
                    }
                });
                this.handleForwardPress();
                return;
            }

            // Normal direction input
            this.handleDirectionInput(direction);

            // Visual feedback
            bg.setFillStyle(0x4285F4);
            text.setColor('#FFFFFF');

            this.tweens.add({
                targets: container,
                scale: 0.9,
                duration: 50,
                yoyo: true,
                onComplete: () => {
                    // Reset after delay or keep active if it's the selected choice?
                    // For now just quick flash
                    this.time.delayedCall(100, () => {
                        bg.setFillStyle(0xF5F5F5);
                        text.setColor('#555555');
                    });
                }
            });
        });

        return container;
    }

    private setupControlSwap() {
        // Segment-based: pick a non-intersection, non-trap segment with spacing
        const allTrapSegments = [...this.brakeStopSegments, ...this.roadClosureSegments];
        const validSegments: number[] = [];
        for (let i = 2; i < this.path.length - 2; i++) {
            if (this.path[i].isIntersection) continue;
            if (this.brakeStopSegments.includes(i)) continue;
            if (this.roadClosureSegments.includes(i)) continue;
            const tooClose = allTrapSegments.some(s => Math.abs(s - i) < 2);
            if (tooClose) continue;
            validSegments.push(i);
        }
        if (validSegments.length > 0) {
            this.swapControlSegment = Phaser.Utils.Array.GetRandom(validSegments);
        }
    }

    private triggerControlSwap() {
        if (this.gameOver || !this.gameStarted) return;

        // Remove the swap marker if it exists
        if (this.swapMarker) {
            this.tweens.add({
                targets: this.swapMarker,
                scale: 1.5,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.swapMarker?.destroy();
                    this.swapMarker = null;
                }
            });
        }

        // Brake stop — car must stop, user presses forward, THEN buttons swap
        this.isBrakeStopped = true;
        this.isSwapBrake = true;
        this.isMoving = false;
        this.targetPosition = null;

        // Clear any queued direction
        if (this.queuedDirection) {
            this.queuedDirection = null;
            this.isApproachingIntersection = false;
        }

        // Show swap warning message
        this.messageText.setText('ปุ่มสลับ!');
        this.messageText.setColor('#FF4444');
        this.messageText.setVisible(true);

        // Highlight forward button so user knows to press it
        this.highlightForwardButton(true);

        // Smoke effect
        this.triggerSmokeEffect(this.car.x, this.car.y);

        // Timer — if they don't press forward in time, auto-resume
        this.brakeStopTimer = this.time.delayedCall(
            Math.max(this.currentLevelConfig.brakeStopTimeMs, 4000),
            () => {
                if (this.isBrakeStopped) {
                    // Auto-resume: perform swap and continue
                    this.resumeAfterSwapBrake();
                }
            }
        );
    }

    private resumeAfterSwapBrake() {
        // Cancel timer if still active
        if (this.brakeStopTimer) {
            this.brakeStopTimer.destroy();
            this.brakeStopTimer = null;
        }

        this.isBrakeStopped = false;
        this.isSwapBrake = false;
        this.highlightForwardButton(false);

        // Now perform the actual button swap
        this.controlsSwapped = !this.controlsSwapped;

        const leftX = this.leftButton.x;
        const rightX = this.rightButton.x;

        this.tweens.add({
            targets: this.leftButton,
            x: rightX,
            duration: 600,
            ease: 'Cubic.easeInOut'
        });

        this.tweens.add({
            targets: this.rightButton,
            x: leftX,
            duration: 600,
            ease: 'Cubic.easeInOut'
        });

        this.messageText.setText('สลับแล้ว!');
        this.messageText.setColor('#FF4444');
        this.showFeedback('⇄', 0xFF4444);

        // Resume movement after brief delay
        this.time.delayedCall(800, () => {
            this.messageText.setVisible(false);
            this.moveToNextSegment();
        });
    }

    private createSwapAlertPopup() {
        const { width, height } = this.scale;

        this.swapAlertPopup = this.add.container(0, 0);
        this.swapAlertPopup.setDepth(300); // Above everything

        // Dim background
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
        bg.setOrigin(0);
        bg.setInteractive(); // Block clicks

        // Popup Box
        const boxW = Math.min(400, width * 0.85);
        const boxH = 250;
        const boxX = width / 2;
        const boxY = height / 2;

        const box = this.add.graphics();
        box.fillStyle(COLORS.UI_PANEL, 1);
        box.fillRoundedRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH, 20);
        box.lineStyle(4, 0xFF4444); // Red warning border
        box.strokeRoundedRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH, 20);

        // Warning Icon or Text
        const titleText = this.add.text(boxX, boxY - 60, 'ระวัง!', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '48px',
            color: '#FF4444',
            fontStyle: 'bold',
            padding: { top: 10, bottom: 10, left: 10, right: 10 }
        }).setOrigin(0.5);

        const msgText = this.add.text(boxX, boxY, 'ปุ่มกดกำลังจะสลับด้าน', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '28px',
            color: '#2B2115',
            align: 'center',
            wordWrap: { width: boxW - 40 },
            padding: { top: 5, bottom: 5, left: 5, right: 5 }
        }).setOrigin(0.5);

        // OK Button — created OUTSIDE the popup container so the bg overlay doesn't block it
        const btnW = 160;
        const btnH = 60;
        const btnY = boxY + 70;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x58CC02, 1); // Green
        btnBg.fillRoundedRect(boxX - btnW / 2, btnY - btnH / 2, btnW, btnH, 15);
        btnBg.setDepth(301);

        const btnText = this.add.text(boxX, btnY, 'ไปต่อ', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '28px',
            color: '#FFFFFF',
            fontStyle: 'bold',
            padding: { top: 5, bottom: 5, left: 5, right: 5 }
        }).setOrigin(0.5).setDepth(301);

        // Use a simple interactive zone for the button
        const btnZone = this.add.zone(boxX, btnY, btnW, btnH)
            .setInteractive({ useHandCursor: true })
            .setDepth(302);

        btnZone.on('pointerdown', () => {
            // Immediately perform the swap — no animation delay
            btnBg.destroy();
            btnText.destroy();
            btnZone.destroy();
            this.performControlSwap();
        });

        this.swapAlertPopup.add([bg, box, titleText, msgText]);
    }

    private performControlSwap() {
        if (this.swapAlertPopup) {
            this.swapAlertPopup.destroy();
            this.swapAlertPopup = null;
        }

        // Swap logic
        this.controlsSwapped = !this.controlsSwapped;

        // Animate buttons switching positions
        const leftX = this.leftButton.x;
        const rightX = this.rightButton.x;

        this.tweens.add({
            targets: this.leftButton,
            x: rightX,
            duration: 1000,
            ease: 'Cubic.easeInOut'
        });

        this.tweens.add({
            targets: this.rightButton,
            x: leftX,
            duration: 1000,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
                // Resume game after swap is done (or sufficiently underway)
                this.isPaused = false;
            }
        });
    }


    private startGame() {
        // Dim buttons during countdown
        this.highlightButtons(false);

        // 3-2-1-GO countdown
        const countdownNumbers = ['3', '2', '1', 'ไป!'];
        let step = 0;

        const showCountdownStep = () => {
            const text = countdownNumbers[step];
            const isGo = step === 3;

            this.messageText.setText(text);
            this.messageText.setStyle({
                fontFamily: 'Sarabun, sans-serif',
                fontSize: isGo ? '64px' : '80px',
                color: isGo ? '#58CC02' : '#FFFFFF',
                stroke: '#2B2115',
                strokeThickness: 8,
                fontStyle: 'bold',
                shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 6, stroke: true, fill: true },
                padding: { x: 20, y: 20 }
            });
            this.messageText.setVisible(true);
            this.messageText.setScale(1.5);
            this.messageText.setAlpha(1);

            // Scale-down + fade animation
            this.tweens.add({
                targets: this.messageText,
                scale: 1,
                alpha: isGo ? 1 : 0.3,
                duration: isGo ? 400 : 800,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    step++;
                    if (step < countdownNumbers.length) {
                        showCountdownStep();
                    } else {
                        // Countdown complete — start the game
                        this.time.delayedCall(300, () => {
                            this.messageText.setVisible(false);
                            this.messageText.setAlpha(1);
                            this.messageText.setScale(1);
                            // Reset font style from countdown (80px) to game size
                            this.messageText.setStyle({
                                fontFamily: 'Sarabun, sans-serif',
                                fontSize: '40px',
                                color: '#FFFFFF',
                                stroke: '#2B2115',
                                strokeThickness: 6,
                                fontStyle: 'bold',
                                align: 'center',
                                shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, stroke: true, fill: true },
                                padding: { x: 10, y: 10 }
                            });
                            this.launchGameAfterCountdown();
                        });
                    }
                }
            });
        };

        showCountdownStep();
    }

    private launchGameAfterCountdown() {
        this.gameStarted = true;
        this.startTime = Date.now();
        this.approachTimeMs = Math.max(2500, this.currentLevelConfig.decisionTimeMs);

        // Find first upcoming intersection
        this.findNextIntersection();

        // Setup path fade if enabled
        if (this.currentLevelConfig.pathFadeEnabled) {
            this.setupPathFade();
        }

        // Setup road closures FIRST (before brake stops, so they get priority)
        if (this.currentLevelConfig.roadClosureEnabled) {
            this.setupRoadClosures();
        }

        // Setup brake stops if enabled (avoids road closure segments)
        if (this.currentLevelConfig.brakeStopEnabled) {
            this.setupBrakeStops();
        }

        // Setup control swap if enabled (segment-based)
        if (this.currentLevelConfig.swapControls) {
            this.setupControlSwap();
        }

        // Place all trap markers on the map so the player can see them
        this.placeTrapMarkers();

        // Start moving continuously
        this.highlightButtons(true);
        this.startContinuousMovement();
    }

    private findNextIntersection() {
        // Find the next intersection AFTER the current position (start from next segment)
        for (let i = this.currentPathIndex + 1; i < this.path.length; i++) {
            if (this.path[i].isIntersection) {
                this.upcomingIntersectionIndex = i;
                return;
            }
        }
        this.upcomingIntersectionIndex = -1;  // No more intersections
    }

    private startContinuousMovement() {
        if (this.currentPathIndex >= this.path.length - 1) {
            this.handleVictory();
            return;
        }

        // Move to next segment immediately
        this.moveToNextSegment();
    }

    private checkApproachingIntersection() {
        if (this.upcomingIntersectionIndex < 0) return;
        if (this.gameOver) return;
        if (this.isApproachingIntersection) return;  // Already approaching

        // Get the intersection position
        const intersection = this.path[this.upcomingIntersectionIndex];
        const intersectionPos = this.gridToWorld(intersection.x, intersection.y);

        // Calculate distance from car to intersection
        const dx = intersectionPos.x - this.car.x;
        const dy = intersectionPos.y - this.car.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate how long it will take to reach the intersection at current speed
        const speed = this.currentLevelConfig.carSpeed;  // pixels per second
        const timeToIntersectionMs = (distance / speed) * 1000;

        // Check if we're within the approach time window
        if (timeToIntersectionMs <= this.approachTimeMs) {
            this.isApproachingIntersection = true;
            this.currentTurnStartTime = Date.now();
            this.currentTurnDistance = distance;
            this.highlightButtons(true);
        }
    }

    private setupPathFade() {
        const config = this.currentLevelConfig;

        this.pathFadeTimer = this.time.delayedCall(config.pathFadeDelayMs, () => {
            this.fadeOutPath();

            // Restore after duration
            this.time.delayedCall(config.pathFadeDurationMs, () => {
                this.fadeInPath();

                // Setup recurring fade if interval > 0
                if (config.pathFadeInterval > 0) {
                    this.pathFadeTimer = this.time.delayedCall(config.pathFadeInterval, () => {
                        this.setupPathFade();
                    });
                }
            });
        });
    }

    private fadeOutPath() {
        this.isPathVisible = false;
        this.pathGraphics.clear();

        // Show glitch effect
        this.messageText.setText('สัญญาณหาย!');
        this.messageText.setColor('#FF4444');
        this.messageText.setVisible(true);

        this.tweens.add({
            targets: this.messageText,
            alpha: { from: 1, to: 0.5 },
            duration: 300,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                this.messageText.setAlpha(1);
                this.messageText.setVisible(false);
            }
        });
    }

    private fadeInPath() {
        this.isPathVisible = true;
        this.drawPath();
    }

    private setupBrakeStops() {
        const config = this.currentLevelConfig;
        if (!config.brakeStopEnabled || config.brakeStopCount <= 0) return;

        // Get non-intersection segments, avoiding road closure AND swap segments
        // Also ensure minimum spacing of 4 segments between any traps
        const allTrapSegments = [...this.roadClosureSegments];
        if (this.swapControlSegment >= 0) allTrapSegments.push(this.swapControlSegment);

        const validSegments: number[] = [];
        for (let i = 2; i < this.path.length - 2; i++) {
            if (this.path[i].isIntersection) continue;
            if (this.roadClosureSegments.includes(i)) continue;
            // Ensure spacing from other traps
            const tooClose = allTrapSegments.some(s => Math.abs(s - i) < 4);
            if (tooClose) continue;
            validSegments.push(i);
        }

        // Pick with spacing between brake stops themselves
        const shuffled = Phaser.Utils.Array.Shuffle([...validSegments]);
        this.brakeStopSegments = [];
        for (const idx of shuffled) {
            if (this.brakeStopSegments.length >= config.brakeStopCount) break;
            const tooCloseToOther = this.brakeStopSegments.some(s => Math.abs(s - idx) < 4);
            if (!tooCloseToOther) {
                this.brakeStopSegments.push(idx);
            }
        }
        this.brakeStopsRemaining = this.brakeStopSegments.length;
    }

    private checkBrakeStop() {
        if (this.isBrakeStopped) return;
        if (this.brakeStopSegments.length === 0) return;
        if (!this.brakeStopSegments.includes(this.currentPathIndex)) return;

        // Trigger brake stop!
        this.triggerBrakeStop();
    }

    private triggerBrakeStop() {
        this.isBrakeStopped = true;
        this.isMoving = false;
        this.targetPosition = null;

        // IMPORTANT: Clear any queued direction - user must re-select after pressing forward
        if (this.queuedDirection) {
            this.queuedDirection = null;
            this.isApproachingIntersection = false;
        }

        // Pulse the existing stop sign marker to draw attention
        const markerIdx = this.brakeStopSegments.indexOf(this.currentPathIndex);
        if (markerIdx >= 0 && markerIdx < this.stopSignMarkers.length) {
            const marker = this.stopSignMarkers[markerIdx];
            this.tweens.killTweensOf(marker);
            marker.setDepth(150);
            this.tweens.add({
                targets: marker,
                scale: { from: 1.0, to: 1.4 },
                duration: 200,
                yoyo: true,
                repeat: 2,
                ease: 'Sine.easeInOut'
            });
        }

        // Show STOP message
        this.messageText.setText('หยุด!');
        this.messageText.setColor('#FF4444');
        this.messageText.setVisible(true);

        // Highlight forward button
        this.highlightForwardButton(true);

        // Trigger smoke effect
        this.triggerSmokeEffect(this.car.x, this.car.y);

        // Start timer - must press Forward within time limit
        this.brakeStopTimer = this.time.delayedCall(
            this.currentLevelConfig.brakeStopTimeMs,
            () => {
                if (this.isBrakeStopped) {
                    this.handleBrakeTimeout();
                }
            }
        );
    }

    private createStopSign() {
        // Position the stop sign ahead of the car based on heading
        let signX = this.car.x;
        let signY = this.car.y;
        const offset = this.cellSize * 0.8;

        switch (this.carHeading) {
            case 'N': signY -= offset; break;
            case 'S': signY += offset; break;
            case 'E': signX += offset; break;
            case 'W': signX -= offset; break;
        }

        // Create stop sign container
        this.stopSignContainer = this.add.container(signX, signY);
        this.stopSignContainer.setDepth(150); // Higher depth to be above cars/buildings

        // Sign pole
        const poleHeight = 40;
        const pole = this.add.rectangle(0, 25, 6, poleHeight, 0x555555);
        pole.setStrokeStyle(1, 0x333333);

        // Octagon shape (stop sign)
        const signRadius = 25;
        const octagon = this.add.graphics();
        octagon.fillStyle(0xCC0000, 1);
        octagon.lineStyle(3, COLORS.ROAD, 1);

        const points: Phaser.Geom.Point[] = [];
        for (let i = 0; i < 8; i++) {
            // Start from -22.5 degrees to align flat top
            const angle = (Math.PI / 8) + (i * Math.PI / 4) - (Math.PI / 8);
            const px = Math.cos(angle) * signRadius;
            const py = Math.sin(angle) * signRadius;
            points.push(new Phaser.Geom.Point(px, py));
        }

        octagon.beginPath();
        octagon.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            octagon.lineTo(points[i].x, points[i].y);
        }
        octagon.closePath();
        octagon.fillPath();
        octagon.strokePath();

        // "STOP" text on sign
        // In Thai, "หยุด" (Yud)
        const stopText = this.add.text(0, 0, 'หยุด', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '18px',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.stopSignContainer.add([pole, octagon, stopText]);

        // Entrance animation - pop in with shake
        this.stopSignContainer.setScale(0);
        this.tweens.add({
            targets: this.stopSignContainer,
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Shake animation to draw attention
                this.tweens.add({
                    targets: this.stopSignContainer,
                    x: signX - 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 4,
                    ease: 'Sine.easeInOut'
                });
            }
        });
    }

    private removeStopSign() {
        if (this.stopSignContainer) {
            this.tweens.add({
                targets: this.stopSignContainer,
                scale: 0,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.stopSignContainer?.destroy();
                    this.stopSignContainer = null;
                }
            });
        }
    }

    private handleBrakeTimeout() {
        this.isBrakeStopped = false;
        this.messageText.setVisible(false);
        this.highlightForwardButton(false);
        this.handleTimeout();
    }

    private handleForwardPress() {
        if (!this.isBrakeStopped || this.isPaused) return;

        // If this is a swap brake, route to swap resume instead
        if (this.isSwapBrake) {
            this.resumeAfterSwapBrake();
            return;
        }

        // Player pressed Forward - continue driving!
        if (this.brakeStopTimer) {
            this.brakeStopTimer.destroy();
            this.brakeStopTimer = null;
        }

        this.isBrakeStopped = false;
        this.brakeStopsRemaining--;

        // Remove this segment from brake stops
        this.brakeStopSegments = this.brakeStopSegments.filter(s => s !== this.currentPathIndex);

        // Fade out the corresponding stop sign marker
        const markerIdx = this.stopSignMarkers.findIndex(m => !m.scene);
        // Just fade all remaining markers for this segment
        this.stopSignMarkers.forEach(m => {
            if (m.scene && Math.abs(m.x - this.car.x) < this.cellSize && Math.abs(m.y - this.car.y) < this.cellSize) {
                this.tweens.add({
                    targets: m,
                    scale: 0,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => m.destroy()
                });
            }
        });

        // Visual feedback
        this.messageText.setText('ไปต่อ!');
        this.messageText.setColor('#58CC02');
        this.showFeedback('✓', 0x58CC02);
        this.highlightForwardButton(false);

        // Continue moving after brief delay
        this.time.delayedCall(500, () => {
            this.messageText.setVisible(false);
            this.moveToNextSegment();
        });
    }

    // ==========================================
    // Road Closure / Obstacle Reroute System
    // ==========================================

    private setupRoadClosures() {
        const closureCount = this.currentLevelConfig.roadClosureCount || 0;
        if (closureCount <= 0) return;

        this.roadClosureSegments = [];
        this.roadClosuresTriggered = 0;

        // Find valid segments for obstacles:
        // Not first 2 or last 2 segments, not intersections
        const validIndices: number[] = [];
        for (let i = 2; i < this.path.length - 2; i++) {
            const seg = this.path[i];
            if (seg.isIntersection) continue;
            validIndices.push(i);
        }



        // Pick closure segments with spacing (at least 5 segments apart)
        const shuffled = Phaser.Utils.Array.Shuffle([...validIndices]);
        for (const idx of shuffled) {
            if (this.roadClosureSegments.length >= closureCount) break;
            const tooClose = this.roadClosureSegments.some(s => Math.abs(s - idx) < 5);
            if (!tooClose) {
                this.roadClosureSegments.push(idx);
            }
        }

        // Sort so we encounter them in order
        this.roadClosureSegments.sort((a, b) => a - b);

    }

    private checkRoadClosure(): boolean {
        if (!this.currentLevelConfig.roadClosureEnabled) return false;
        if (this.roadClosureSegments.length === 0) return false;
        return this.roadClosureSegments.includes(this.currentPathIndex);
    }

    private triggerRoadClosure() {
        this.isRoadClosed = true;
        this.isMoving = false;
        this.targetPosition = null;
        this.roadClosuresTriggered++;
        this.hasSuddenChangeOccurred = true;

        // Play brake sound
        this.playSound('brake');

        // The barricade marker is already visible on the map — pulse it to draw attention
        this.barricadeMarkers.forEach(m => {
            if (m.scene) {
                const dx = Math.abs(m.x - this.car.x);
                const dy = Math.abs(m.y - this.car.y);
                if (dx < this.cellSize * 1.5 && dy < this.cellSize * 1.5) {
                    this.tweens.killTweensOf(m);
                    m.setDepth(155);
                    this.tweens.add({
                        targets: m,
                        scale: { from: 1.0, to: 1.3 },
                        duration: 200,
                        yoyo: true,
                        repeat: 2
                    });
                }
            }
        });

        // Show message
        this.messageText.setText('ทางปิด!');
        this.messageText.setColor('#FF6B35');
        this.messageText.setVisible(true);
        this.showFeedback('✗', 0xFF6B35);

        // Remove this from the closure segments list
        this.roadClosureSegments = this.roadClosureSegments.filter(s => s !== this.currentPathIndex);

        // Generate reroute after a brief pause
        this.time.delayedCall(1500, () => {
            this.generateAndApplyReroute();
        });
    }

    private createBarricade(x: number, y: number) {
        if (this.roadClosureContainer) {
            this.roadClosureContainer.destroy();
        }

        this.roadClosureContainer = this.add.container(x, y);
        this.roadClosureContainer.setDepth(155);

        // Barricade sprite
        const barricade = this.add.image(0, 0, 'barricade');
        barricade.setAngle(90);

        // Scale to fit approx 80% of cell width
        const targetWidth = this.cellSize * 0.8;
        const scale = targetWidth / barricade.width;
        barricade.setScale(scale);

        this.roadClosureContainer.add([barricade]);

        // Entrance animation
        this.roadClosureContainer.setScale(0);
        this.roadClosureContainer.setAlpha(0);
        this.tweens.add({
            targets: this.roadClosureContainer,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    private removeBarricade() {
        if (!this.roadClosureContainer) return;

        const container = this.roadClosureContainer;
        this.tweens.add({
            targets: container,
            scale: 0,
            alpha: 0,
            duration: 300,
            ease: 'Back.easeIn',
            onComplete: () => {
                container.destroy();
            }
        });
        this.roadClosureContainer = null;
    }

    private generateAndApplyReroute() {
        // Save the destination (last segment of the current path)
        const destination = this.path[this.path.length - 1];
        const destX = destination.x;
        const destY = destination.y;

        // Current car position
        const startX = this.carGridX;
        const startY = this.carGridY;
        const startHeading = this.carHeading;

        // Collect cells used by the OLD path from current position onwards (to avoid them)
        // The reroute should take a DIFFERENT route
        const blockedCells = new Set<string>();
        for (let i = this.currentPathIndex + 1; i < this.path.length - 1; i++) {
            blockedCells.add(`${this.path[i].x},${this.path[i].y}`);
        }

        // BFS to find a new path from current position to destination
        const newPath = this.bfsReroute(startX, startY, startHeading, destX, destY, blockedCells);

        if (newPath && newPath.length > 1) {
            this.resumeAfterReroute(newPath);
        } else {
            // Fallback: couldn't find reroute — generate a completely new path from current position
            // and consider it successful (the destination may change)
            this.resumeWithNewPath();
        }
    }

    private bfsReroute(
        startX: number, startY: number, startHeading: Heading,
        destX: number, destY: number,
        blockedCells: Set<string>
    ): RoadSegment[] | null {
        interface BFSNode {
            x: number;
            y: number;
            heading: Heading;
            path: RoadSegment[];
        }

        const directions: Record<Heading, { dx: number; dy: number }> = {
            'N': { dx: 0, dy: -1 },
            'S': { dx: 0, dy: 1 },
            'E': { dx: 1, dy: 0 },
            'W': { dx: -1, dy: 0 }
        };
        const leftTurns: Record<Heading, Heading> = { 'N': 'W', 'W': 'S', 'S': 'E', 'E': 'N' };
        const rightTurns: Record<Heading, Heading> = { 'N': 'E', 'E': 'S', 'S': 'W', 'W': 'N' };

        const visited = new Set<string>();
        const startSeg: RoadSegment = { x: startX, y: startY, direction: startHeading, isIntersection: false };
        const queue: BFSNode[] = [{ x: startX, y: startY, heading: startHeading, path: [startSeg] }];
        visited.add(`${startX},${startY},${startHeading}`);

        const maxPathLength = 40;

        while (queue.length > 0) {
            const node = queue.shift()!;

            if (node.path.length > maxPathLength) continue;

            // Try all three directions: forward, left, right
            const headings: { heading: Heading; direction: Direction }[] = [
                { heading: node.heading, direction: 'forward' },
                { heading: leftTurns[node.heading], direction: 'left' },
                { heading: rightTurns[node.heading], direction: 'right' }
            ];

            for (const { heading, direction } of headings) {
                const d = directions[heading];
                const nx = node.x + d.dx;
                const ny = node.y + d.dy;

                if (!this.isValidCell(nx, ny)) continue;

                const key = `${nx},${ny},${heading}`;
                if (visited.has(key)) continue;

                // Don't revisit cells already in our BFS path
                const inPath = node.path.some(seg => seg.x === nx && seg.y === ny);
                if (inPath) continue;

                // Allow destination cell even if blocked, but skip other blocked cells
                const isDestination = nx === destX && ny === destY;
                if (!isDestination && blockedCells.has(`${nx},${ny}`)) continue;

                visited.add(key);

                // Mark previous segment as intersection if turning
                const newPath = [...node.path];
                if (direction !== 'forward' && newPath.length > 0) {
                    newPath[newPath.length - 1] = {
                        ...newPath[newPath.length - 1],
                        isIntersection: true,
                        turnRequired: direction
                    };
                }

                const newSeg: RoadSegment = {
                    x: nx, y: ny,
                    direction: heading,
                    isIntersection: false
                };
                newPath.push(newSeg);

                // Reached destination!
                if (isDestination) {
                    return newPath;
                }

                queue.push({ x: nx, y: ny, heading: heading, path: newPath });
            }
        }

        return null; // No path found
    }

    private resumeAfterReroute(newPath: RoadSegment[]) {
        // Remove barricade
        this.removeBarricade();

        // Clear old path and set new one
        this.pathGraphics.clear();
        this.path = newPath;
        this.currentPathIndex = 0;
        this.isRoadClosed = false;

        // Sync car to current path start position
        const startSeg = this.path[0];
        const startPos = this.gridToWorld(startSeg.x, startSeg.y);
        this.car.setPosition(startPos.x, startPos.y);
        this.carGridX = startSeg.x;
        this.carGridY = startSeg.y;
        this.carHeading = startSeg.direction;
        this.updateCarRotation();

        // Reset navigation for new path
        this.upcomingIntersectionIndex = -1;
        this.queuedDirection = null;
        this.isApproachingIntersection = false;

        // Setup remaining road closures for the new path (BEFORE brake stops)
        this.roadClosureSegments = [];
        const remainingClosures = this.currentLevelConfig.roadClosureCount - this.roadClosuresTriggered;
        if (remainingClosures > 0) {
            const originalCount = this.currentLevelConfig.roadClosureCount;
            this.currentLevelConfig = { ...this.currentLevelConfig, roadClosureCount: remainingClosures };
            this.setupRoadClosures();
            this.currentLevelConfig = { ...this.currentLevelConfig, roadClosureCount: originalCount };
        }

        // Setup brake stops for the new path (avoids road closure segments)
        this.brakeStopSegments = [];
        this.brakeStopsRemaining = 0;
        if (this.currentLevelConfig.brakeStopEnabled) {
            this.setupBrakeStops();
        }

        // Redraw path
        this.drawPath();

        // Refresh trap markers for the new path
        this.placeTrapMarkers();

        // Show reroute message
        this.messageText.setText('ไปทางใหม่!');
        this.messageText.setColor('#4285F4');
        this.showFeedback('↻', 0x4285F4);

        // Brief pause then resume
        this.time.delayedCall(1000, () => {
            this.messageText.setVisible(false);
            this.findNextIntersection();
            this.isMoving = true;
            this.moveToNextSegment();
        });
    }

    private resumeWithNewPath() {
        // Fallback: generate entirely new path from current position
        this.removeBarricade();
        this.pathGraphics.clear();
        this.isRoadClosed = false;

        // Reset navigation
        this.upcomingIntersectionIndex = -1;
        this.queuedDirection = null;
        this.isApproachingIntersection = false;

        // Generate fresh path
        this.path = [];
        this.generatePath(this.carGridX, this.carGridY, this.carHeading);

        // Sync car position to path start
        const startSeg = this.path[0];
        const startPos = this.gridToWorld(startSeg.x, startSeg.y);
        this.car.setPosition(startPos.x, startPos.y);
        this.carGridX = startSeg.x;
        this.carGridY = startSeg.y;
        this.carHeading = startSeg.direction;
        this.updateCarRotation();

        this.drawPath();

        // Setup mechanics for new path (road closures first, then brake stops)
        this.roadClosureSegments = [];
        const remainingClosures = this.currentLevelConfig.roadClosureCount - this.roadClosuresTriggered;
        if (remainingClosures > 0) {
            const originalCount = this.currentLevelConfig.roadClosureCount;
            this.currentLevelConfig = { ...this.currentLevelConfig, roadClosureCount: remainingClosures };
            this.setupRoadClosures();
            this.currentLevelConfig = { ...this.currentLevelConfig, roadClosureCount: originalCount };
        }

        this.brakeStopSegments = [];
        this.brakeStopsRemaining = 0;
        if (this.currentLevelConfig.brakeStopEnabled) {
            this.setupBrakeStops();
        }

        // Refresh trap markers for the new path
        this.placeTrapMarkers();

        // Show reroute message
        this.messageText.setText('ไปทางใหม่!');
        this.messageText.setColor('#4285F4');
        this.showFeedback('↻', 0x4285F4);

        // Resume
        this.time.delayedCall(1000, () => {
            this.messageText.setVisible(false);
            this.findNextIntersection();
            this.isMoving = true;
            this.moveToNextSegment();
        });
    }

    // ==========================================
    // Trap Marker System — Pre-visible markers
    // ==========================================

    private placeTrapMarkers() {
        this.clearTrapMarkers();

        // Place stop sign markers on brake stop segments (offset to side of road)
        for (const segIdx of this.brakeStopSegments) {
            if (segIdx < 0 || segIdx >= this.path.length) continue;
            const seg = this.path[segIdx];
            const pos = this.gridToWorld(seg.x, seg.y);
            // Offset perpendicular to road direction (to the right side of travel)
            const offset = this.cellSize * 0.35;
            let offX = 0, offY = 0;
            switch (seg.direction) {
                case 'N': offX = offset; break;   // Right side when heading north
                case 'S': offX = -offset; break;  // Right side when heading south
                case 'E': offY = offset; break;   // Right side when heading east
                case 'W': offY = -offset; break;  // Right side when heading west
            }
            const marker = this.createStopSignMarker(pos.x + offX, pos.y + offY);
            this.stopSignMarkers.push(marker);
        }

        // Place barricade markers on road closure segments
        // Barricade sits on the NEXT segment (the blocked cell ahead)
        for (const segIdx of this.roadClosureSegments) {
            const nextIdx = segIdx + 1;
            if (nextIdx < 0 || nextIdx >= this.path.length) continue;
            const seg = this.path[nextIdx];
            const pos = this.gridToWorld(seg.x, seg.y);
            const marker = this.createBarricadeMarker(pos.x, pos.y);
            this.barricadeMarkers.push(marker);
        }

        // Place swap marker
        if (this.swapControlSegment >= 0 && this.swapControlSegment < this.path.length) {
            const seg = this.path[this.swapControlSegment];
            const pos = this.gridToWorld(seg.x, seg.y);
            this.swapMarker = this.createBumpMarker(pos.x, pos.y);
        }
    }

    private clearTrapMarkers() {
        this.stopSignMarkers.forEach(m => m.destroy());
        this.stopSignMarkers = [];
        this.barricadeMarkers.forEach(m => m.destroy());
        this.barricadeMarkers = [];
        if (this.swapMarker) {
            this.swapMarker.destroy();
            this.swapMarker = null;
        }
    }

    private createStopSignMarker(x: number, y: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        container.setDepth(15);  // Above path line
        const r = this.cellSize * 0.32;

        const gfx = this.add.graphics();

        // Pole / leg (below the octagon)
        const poleW = r * 0.15;
        const poleH = r * 1.0;
        gfx.fillStyle(0x666666, 1);
        gfx.fillRect(-poleW / 2, r * 0.5, poleW, poleH);
        gfx.lineStyle(1, 0x444444, 1);
        gfx.strokeRect(-poleW / 2, r * 0.5, poleW, poleH);

        // Octagonal stop sign
        gfx.fillStyle(0xCC0000, 0.9);
        gfx.lineStyle(2.5, 0xFFFFFF, 0.95);
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 8) + (i * Math.PI / 4);
            pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
        gfx.beginPath();
        gfx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < 8; i++) gfx.lineTo(pts[i].x, pts[i].y);
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();

        const text = this.add.text(0, 0, 'หยุด', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: `${r * 0.65}px`,
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([gfx, text]);

        // Subtle idle pulse
        this.tweens.add({
            targets: container,
            scale: { from: 0.9, to: 1.05 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return container;
    }

    private createBarricadeMarker(x: number, y: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        container.setDepth(15);
        const sz = this.cellSize * 0.85;

        // Use barricade sprite if loaded
        if (this.textures.exists('barricade')) {
            const img = this.add.image(0, 0, 'barricade');
            const scale = sz / img.width;
            img.setScale(scale);
            img.setAlpha(0.9);
            container.add([img]);
        } else {
            // Fallback: orange/white striped horizontal bar
            const gfx = this.add.graphics();
            const barW = sz;
            const barH = sz * 0.3;
            gfx.fillStyle(0xFF6B35, 0.9);
            gfx.fillRect(-barW / 2, -barH / 2, barW, barH);
            // White stripes (vertical across the horizontal bar)
            gfx.fillStyle(0xFFFFFF, 0.9);
            const stripeW = barW * 0.1;
            for (let i = 0; i < 4; i++) {
                gfx.fillRect(-barW / 2 + i * barW * 0.28, -barH / 2, stripeW, barH);
            }
            // Outline
            gfx.lineStyle(2, 0xCC4400, 1);
            gfx.strokeRect(-barW / 2, -barH / 2, barW, barH);
            container.add([gfx]);
        }

        // Subtle idle sway
        this.tweens.add({
            targets: container,
            angle: { from: -3, to: 3 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return container;
    }

    private createBumpMarker(x: number, y: number): Phaser.GameObjects.Container {
        // Programmer art: yellow diamond warning sign with a car bump icon
        const container = this.add.container(x, y);
        container.setDepth(15);
        const r = this.cellSize * 0.45;

        const gfx = this.add.graphics();

        // Yellow diamond background
        gfx.fillStyle(0xFFCC00, 0.9);
        gfx.lineStyle(2, 0x000000, 0.8);
        gfx.beginPath();
        gfx.moveTo(0, -r);          // Top
        gfx.lineTo(r, 0);           // Right
        gfx.lineTo(0, r);           // Bottom
        gfx.lineTo(-r, 0);          // Left
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();

        // Car bump icon: a small car silhouette with bump lines
        // Car body (rectangle)
        gfx.fillStyle(0x333333, 1);
        gfx.fillRect(-r * 0.3, -r * 0.15, r * 0.6, r * 0.3);
        // Car roof
        gfx.fillRect(-r * 0.15, -r * 0.35, r * 0.3, r * 0.2);
        // Bump lines (zigzag below car)
        gfx.lineStyle(2, 0x333333, 1);
        gfx.beginPath();
        gfx.moveTo(-r * 0.2, r * 0.25);
        gfx.lineTo(-r * 0.1, r * 0.4);
        gfx.lineTo(0, r * 0.25);
        gfx.lineTo(r * 0.1, r * 0.4);
        gfx.lineTo(r * 0.2, r * 0.25);
        gfx.strokePath();

        container.add([gfx]);

        // Subtle bounce animation
        this.tweens.add({
            targets: container,
            y: y - 3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return container;
    }

    // ==========================================
    // End Road Closure System
    // ==========================================

    private highlightForwardButton(highlight: boolean) {
        if (!this.forwardButton) return;

        if (highlight) {
            this.forwardButton.setAlpha(1);
            this.tweens.add({
                targets: this.forwardButton,
                scale: { from: 1, to: 1.1 },
                duration: 300,
                yoyo: true,
                repeat: -1
            });
        } else {
            this.tweens.killTweensOf(this.forwardButton);
            this.forwardButton.setScale(1);
        }
    }

    private startCarMovement() {
        // Legacy method - now using startContinuousMovement
        this.startContinuousMovement();
    }

    private moveToNextSegment() {
        if (this.currentPathIndex >= this.path.length - 1) {
            this.handleVictory();
            return;
        }

        this.currentPathIndex++;
        const nextSeg = this.path[this.currentPathIndex];

        this.targetPosition = this.gridToWorld(nextSeg.x, nextSeg.y);
        this.carGridX = nextSeg.x;
        this.carGridY = nextSeg.y;
        this.carHeading = nextSeg.direction;

        this.updateCarRotation();

        // Check road closure - if found, we drive TO it, then trigger the closure event
        if (this.checkRoadClosure()) {
            this.isApproachingRoadClosure = true;
        }

        // Check if this segment has a brake stop
        this.checkBrakeStop();
        if (this.isBrakeStopped) return;

        // Check if this segment triggers control swap
        if (this.swapControlSegment >= 0 && this.currentPathIndex === this.swapControlSegment) {
            this.swapControlSegment = -1;  // Consume the event
            this.triggerControlSwap();
            // Don't return — let movement continue, the pause will be handled by isPaused check
        }

        this.isMoving = true;
    }

    private moveCarTowardsTarget(delta: number) {
        if (!this.targetPosition) return;

        // Scale speed by cell size to ensure consistent gameplay speed across devices
        // Base cell size is 80. If cell size is smaller (mobile), speed reduces proportionally.
        const speedScale = this.cellSize / 80;
        const speed = this.currentLevelConfig.carSpeed * speedScale;

        const dx = this.targetPosition.x - this.car.x;
        const dy = this.targetPosition.y - this.car.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            // Reached target cell
            this.car.setPosition(this.targetPosition.x, this.targetPosition.y);

            if (this.isApproachingRoadClosure) {
                this.isApproachingRoadClosure = false;
                this.triggerRoadClosure();
                return;
            }

            // Check if we just reached an intersection
            const currentSeg = this.path[this.currentPathIndex];
            if (currentSeg.isIntersection) {
                // Check if player provided input
                if (this.queuedDirection) {
                    // Process the queued direction
                    this.processQueuedDirection();
                    // If wrong turn was detected, deductLife stopped the car — don't continue
                    if (!this.isMoving) return;
                } else {
                    // No input provided - FAIL
                    this.isMoving = false;
                    this.targetPosition = null;
                    this.handleTimeout();
                    return;
                }
            }

            // Continue to next segment
            if (this.currentPathIndex >= this.path.length - 1) {
                this.isMoving = false;
                this.targetPosition = null;
                this.handleVictory();
            } else {
                this.moveToNextSegment();
            }
        } else {
            // Move towards target
            const moveDistance = speed * (delta / 1000);
            const ratio = Math.min(moveDistance / distance, 1);

            this.car.x += dx * ratio;
            this.car.y += dy * ratio;
        }
    }

    private processQueuedDirection() {
        const currentSeg = this.path[this.currentPathIndex];
        const timeToInput = Date.now() - this.currentTurnStartTime;
        const isCorrect = this.queuedDirection === currentSeg.turnRequired;

        // Record turn data for stats
        const turnData: TurnData = {
            carHeading: this.carHeading,
            correctDirection: currentSeg.turnRequired || 'forward',
            playerDirection: this.queuedDirection,
            isBlindTurn: !this.isPathVisible,
            isSuddenChange: this.hasSuddenChangeOccurred,
            timeToInput,
            distanceToIntersection: this.currentTurnDistance,
            wasCorrect: isCorrect
        };
        this.turnData.push(turnData);
        this.hasSuddenChangeOccurred = false;

        // Reset intersection state (but keep brake stop state intact)
        this.queuedDirection = null;
        this.isApproachingIntersection = false;
        this.highlightButtons(false);

        // Find next intersection
        this.findNextIntersection();

        if (isCorrect) {
            this.playSound('correct-turn');
            this.showFeedback('✓', 0x58CC02);
        } else {
            // Wrong direction - game over
            this.isMoving = false;
            this.targetPosition = null;
            this.handleWrongDirection();
        }
    }

    private handleDirectionInput(direction: Direction) {
        if (this.gameOver || this.isPaused) return;

        // Only accept input when approaching an intersection
        if (!this.isApproachingIntersection) return;

        // If already queued, ignore (first input wins)
        if (this.queuedDirection) return;

        // Queue the direction
        this.queuedDirection = direction;

        // Visual feedback
        this.showFeedback(direction === 'left' ? '◀' : direction === 'right' ? '▶' : '▲', 0x4285F4);

        // Hide alert indicator since input received
        this.alertIndicator.setVisible(false);
        this.tweens.killTweensOf(this.alertIndicator);

        // Dim buttons to show input received
        this.highlightButtons(false);
    }

    private handleTimeout() {
        // Record failed turn data
        const currentSeg = this.path[this.currentPathIndex];
        this.turnData.push({
            carHeading: this.carHeading,
            correctDirection: currentSeg.turnRequired || 'forward',
            playerDirection: null,
            isBlindTurn: !this.isPathVisible,
            isSuddenChange: this.hasSuddenChangeOccurred,
            timeToInput: this.currentLevelConfig.decisionTimeMs,
            distanceToIntersection: 0,
            wasCorrect: false
        });
        this.hasSuddenChangeOccurred = false;

        // Clean up intersection state
        this.isApproachingIntersection = false;
        this.queuedDirection = null;
        this.highlightButtons(false);
        this.alertIndicator.setVisible(false);

        // Deduct a life (handles stopping, feedback, and auto-correct)
        this.deductLife('timeout');
    }

    private handleWrongDirection() {
        // Deduct a life (handles stopping, feedback, and auto-correct)
        this.deductLife('wrong_direction');
    }

    private handleVictory() {
        // Check if more objectives remain
        if (this.currentObjective < this.totalObjectives) {
            this.transitionToNextObjective();
        } else {
            this.endGame('completed');
        }
    }

    private transitionToNextObjective() {
        // Stop movement but stay in place (no teleport)
        this.isMoving = false;
        this.targetPosition = null;
        this.gameStarted = false;

        // Play success sound
        this.playSound('level-pass');

        // Show celebration at current position
        this.messageText.setText('ยอดเยี่ยม!');
        this.messageText.setColor('#58CC02');
        this.messageText.setVisible(true);
        this.showFeedback('✓', 0x58CC02);

        // Celebrate!
        this.triggerConfetti(this.car.x, this.car.y);
        this.emitSparkle(this.car.x, this.car.y);

        this.time.delayedCall(1200, () => {
            // Increment objective
            this.currentObjective++;

            // Update objective progress text
            if (this.objectiveProgressText) {
                this.objectiveProgressText.setText(`จุดหมาย ${this.currentObjective}/${this.totalObjectives}`);
            }

            this.messageText.setText('จุดหมายถัดไป!');
            this.messageText.setFontSize('40px'); // Explicitly scale it down
            this.messageText.setColor('#4285F4');

            // Setup next objective from current position (no reset!)
            this.setupNextObjective();

            this.time.delayedCall(800, () => {
                this.messageText.setVisible(false);
                // Restart game loop
                this.startGame();
            });
        });
    }

    private setupNextObjective() {
        // Clear old path graphics
        this.pathGraphics.clear();

        // Keep car at current position — DO NOT reset carGridX/carGridY/carHeading
        // Save current position for path generation
        const continueX = this.carGridX;
        const continueY = this.carGridY;
        const continueHeading = this.carHeading;

        // Reset navigation state
        this.currentPathIndex = 0;
        this.isMoving = false;
        this.isWaitingForInput = false;
        this.targetPosition = null;
        this.upcomingIntersectionIndex = -1;
        this.queuedDirection = null;
        this.isApproachingIntersection = false;

        // Reset per-objective brake stops
        this.brakeStopsRemaining = 0;
        this.isBrakeStopped = false;
        this.brakeStopSegments = [];
        if (this.brakeStopTimer) {
            this.brakeStopTimer.destroy();
            this.brakeStopTimer = null;
        }
        // Remove any visible stop sign
        if (this.stopSignContainer) {
            this.stopSignContainer.destroy();
            this.stopSignContainer = null;
        }

        // Reset per-objective road closures
        this.roadClosureSegments = [];
        this.isRoadClosed = false;
        this.roadClosuresTriggered = 0;
        this.isApproachingRoadClosure = false;
        if (this.roadClosureContainer) {
            this.roadClosureContainer.destroy();
            this.roadClosureContainer = null;
        }

        // Clear trap markers
        this.clearTrapMarkers();
        this.swapControlSegment = -1;

        // Reset path fade
        this.isPathVisible = true;
        if (this.pathFadeTimer) {
            this.pathFadeTimer.destroy();
            this.pathFadeTimer = null;
        }

        // Control swap timer resets but swapped state persists across objectives
        if (this.controlSwapTimer) {
            this.controlSwapTimer.destroy();
            this.controlSwapTimer = null;
        }
        if (this.swapAlertPopup) {
            this.swapAlertPopup.destroy();
            this.swapAlertPopup = null;
        }
        this.isPaused = false;

        // NOTE: turnData is NOT cleared — it accumulates across all objectives for final scoring

        // Generate new path from current car position
        this.path = [];
        this.generatePath(continueX, continueY, continueHeading);

        // Enforce minimum path length — if path is too short, regenerate
        let retries = 0;
        while (this.path.length < 5 && retries < 3) {
            this.path = [];
            this.generatePath(continueX, continueY, continueHeading);
            retries++;
        }

        this.drawPath();

        // Setup traps for the new path
        if (this.currentLevelConfig.roadClosureEnabled) {
            this.setupRoadClosures();
        }
        if (this.currentLevelConfig.brakeStopEnabled) {
            this.setupBrakeStops();
        }
        if (this.currentLevelConfig.swapControls) {
            this.setupControlSwap();
        }
        this.placeTrapMarkers();

        // Position car (should already be there, but ensure alignment)
        const pos = this.gridToWorld(this.carGridX, this.carGridY);
        this.car.setPosition(pos.x, pos.y);
        this.updateCarRotation();

        // Hide alert indicator
        this.alertIndicator.setVisible(false);
        this.tweens.killTweensOf(this.alertIndicator);
        this.alertIndicator.setScale(1);
    }

    private endGame(reason: 'timeout' | 'wrong_direction' | 'completed') {
        this.gameOver = true;
        this.isMoving = false;

        if (this.engineSound) {
            this.engineSound.stop();
        }

        // Stop all timers
        if (this.decisionTimer) {
            this.decisionTimer.destroy();
        }
        if (this.pathFadeTimer) {
            this.pathFadeTimer.destroy();
        }

        const totalTimeMs = Date.now() - this.startTime;

        // Calculate stars
        const stars = this.calculateStars(reason);

        // Calculate stats
        const stats = this.calculateGameStats(reason, totalTimeMs, stars);

        // Generate star hint
        const starHint = this.getStarHint(stars, reason);

        // Show end message
        if (reason === 'completed') {
            this.playSound('level-pass');
            this.messageText.setText('ถึงแล้ว!');
            this.messageText.setColor('#58CC02');
        } else {
            this.playSound('level-fail');
            this.messageText.setText('พลังชีวิตหมด!');
            this.messageText.setColor('#FF4444');
        }
        this.messageText.setVisible(true);

        // Call game over callback from registry
        this.time.delayedCall(1500, () => {
            const onGameOver = this.registry.get('onGameOver');
            if (onGameOver) {
                onGameOver({ ...stats, starHint });
            }
        });
    }

    private getStarHint(stars: number, reason: string): string | null {
        if (reason !== 'completed') return null;
        if (stars >= 3) return null;

        const livesLost = 3 - this.lives;
        if (livesLost === 1) {
            return 'เกือบสมบูรณ์แบบ! ระวังทางแยกให้มากขึ้นเพื่อ 3 ดาว';
        } else if (livesLost === 2) {
            return 'ลองสังเกตเส้นทางให้ดี\nกดทิศทางก่อนถึงทางแยกเพื่อรักษาพลังชีวิต';
        }
        return 'พยายามรักษาพลังชีวิตให้ได้มากที่สุด!';
    }

    private calculateStars(reason: 'timeout' | 'wrong_direction' | 'completed'): number {
        if (reason !== 'completed') return 0;

        // Based on life system: 3 lives = 3 stars, 2 lives = 2 stars, 1 life = 1 star
        if (this.lives >= 3) return 3;
        if (this.lives === 2) return 2;
        if (this.lives === 1) return 1;

        return 0; // Should not reach here if completed
    }

    private calculateGameStats(
        reason: 'timeout' | 'wrong_direction' | 'completed',
        totalTimeMs: number,
        stars: number
    ) {
        // Calculate stats based on turn data
        let northFacingCorrect = 0, northFacingAttempts = 0;
        let southFacingCorrect = 0, southFacingAttempts = 0;
        let forwardCorrect = 0, forwardAttempts = 0;
        let blindTurnCorrect = 0, blindTurnAttempts = 0;
        const suddenChangeReactionTimes: number[] = [];
        const preTurnDistances: number[] = [];

        this.turnData.forEach(turn => {
            // Track by heading
            if (turn.carHeading === 'N') {
                northFacingAttempts++;
                if (turn.wasCorrect) northFacingCorrect++;
            } else if (turn.carHeading === 'S') {
                southFacingAttempts++;
                if (turn.wasCorrect) southFacingCorrect++;
            }

            // Track forward commands
            if (turn.correctDirection === 'forward') {
                forwardAttempts++;
                if (turn.wasCorrect) forwardCorrect++;
            }

            // Track blind turns
            if (turn.isBlindTurn) {
                blindTurnAttempts++;
                if (turn.wasCorrect) blindTurnCorrect++;
            }

            // Track sudden change reaction times
            if (turn.isSuddenChange && turn.wasCorrect) {
                suddenChangeReactionTimes.push(turn.timeToInput);
            }

            // Track pre-turn distances
            if (turn.wasCorrect && turn.distanceToIntersection > 0) {
                preTurnDistances.push(turn.distanceToIntersection);
            }
        });

        return {
            level: this.currentLevelConfig.level,
            levelPlayed: this.currentLevelConfig.level,
            difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,

            northFacingCorrect,
            northFacingAttempts,
            southFacingCorrect,
            southFacingAttempts,

            forwardCorrect,
            forwardAttempts,

            blindTurnCorrect,
            blindTurnAttempts,

            suddenChangeReactionTimes,
            preTurnDistances,

            livesRemaining: this.lives,
            totalTurns: this.turnData.length,
            correctTurns: this.turnData.filter(t => t.wasCorrect).length,
            stars,
            gameOverReason: reason,
            totalTimeMs,
            success: reason === 'completed'
        };
    }

    private highlightButtons(highlight: boolean) {
        const alpha = highlight ? 1 : 0.5;
        [this.leftButton, this.forwardButton, this.rightButton].forEach(btn => {
            btn.setAlpha(alpha);
        });
    }

    private showFeedback(text: string, color: number) {
        const feedback = this.add.text(
            this.car.x, this.car.y - 50,
            text,
            {
                fontFamily: 'Arial',
                fontSize: '40px',
                color: `#${color.toString(16).padStart(6, '0')}`
            }
        ).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: feedback,
            y: feedback.y - 30,
            alpha: 0,
            duration: 600,
            onComplete: () => feedback.destroy()
        });
    }

    private playSound(key: string) {
        try {
            if (this.cache.audio.exists(key)) {
                this.sound.play(key, { volume: 0.5 });
            }
        } catch (e) {
            console.warn(`Sound ${key} failed to play`, e);
        }
    }

    private resumeFromPause() {
        this.isPaused = false;
    }

    private layoutGame() {
        // Recalculate and redraw on resize
        this.drawRoads();
        this.drawPath();
        this.createBuildings();

        // Reposition car
        const pos = this.gridToWorld(this.carGridX, this.carGridY);
        this.car.setPosition(pos.x, pos.y);
    }
    private createParticleTextures() {
        // Use unique keys to avoid conflicts with global texture cache
        if (!this.textures.exists('td-smoke')) {
            const graphics = this.make.graphics({ x: 0, y: 0 });

            // Smoke/Dust texture - Soft circle
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillCircle(16, 16, 14); // Slightly smaller than 32x32 to leave margin
            graphics.generateTexture('td-smoke', 32, 32);
            graphics.clear();

            // Confetti texture
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillRect(0, 0, 16, 8);
            graphics.generateTexture('td-confetti', 16, 8);
            graphics.clear();

            // Sparkle texture (Star)
            graphics.fillStyle(0xFFFFFF, 1);

            // Draw a star shape manually for better look
            graphics.beginPath();
            graphics.moveTo(16, 0);
            graphics.lineTo(20, 12);
            graphics.lineTo(32, 16);
            graphics.lineTo(20, 20);
            graphics.lineTo(16, 32);
            graphics.lineTo(12, 20);
            graphics.lineTo(0, 16);
            graphics.lineTo(12, 12);
            graphics.closePath();
            graphics.fillPath();

            graphics.generateTexture('td-sparkle', 32, 32);

            graphics.destroy();
        }
    }

    private triggerSmokeEffect(x: number, y: number) {
        const particles = this.add.particles(x, y, 'td-smoke', {
            speed: { min: 20, max: 50 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 800,
            quantity: 10,
            tint: 0xCCCCCC
        });
        particles.setDepth(150);
        this.time.delayedCall(1000, () => particles.destroy());
    }

    private emitDust(x: number, y: number) {
        const particles = this.add.particles(x, y, 'td-smoke', {
            speed: { min: 5, max: 20 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.3, end: 0 },
            lifespan: 600,
            quantity: 1,
            tint: 0xAAAAAA
        });
        particles.setDepth(90); // Below car
        this.time.delayedCall(600, () => particles.destroy());
    }

    private emitSparkle(x: number, y: number) {
        const particles = this.add.particles(x, y, 'td-sparkle', {
            speed: { min: 50, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            lifespan: 500,
            quantity: 8,
            blendMode: 'ADD',
            tint: 0xFFD700
        });
        particles.setDepth(200);
        this.time.delayedCall(500, () => particles.destroy());
    }

    private showSwapPopup() {
        this.isPaused = true;

        // Overlay
        const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7)
            .setOrigin(0)
            .setDepth(300)
            .setInteractive(); // Block clicks

        // Popup Container
        const popup = this.add.container(this.scale.width / 2, this.scale.height / 2).setDepth(301);

        // Background
        const bg = this.add.rectangle(0, 0, 300, 200, 0xFFFFFF)
            .setStrokeStyle(4, 0xFF4444);

        // Text
        const title = this.add.text(0, -40, 'ระวัง!', {
            fontFamily: 'Sarabun', fontSize: '48px', color: '#FF0000', fontStyle: 'bold'
        }).setOrigin(0.5);

        const subtitle = this.add.text(0, 20, 'ปุ่มกำลังจะสลับ...', {
            fontFamily: 'Sarabun', fontSize: '24px', color: '#333333'
        }).setOrigin(0.5);

        popup.add([bg, title, subtitle]);

        // Animate popup
        this.tweens.add({
            targets: popup,
            scale: { from: 0, to: 1 },
            duration: 300,
            ease: 'Back.out'
        });

        // Countdown and Swap
        this.time.delayedCall(2000, () => {
            // Perform swap visually behind popup
            this.controlsSwapped = !this.controlsSwapped;

            // Swap animation
            const leftX = this.leftButton.x;
            const rightX = this.rightButton.x;
            this.tweens.add({ targets: this.leftButton, x: rightX, duration: 1000, ease: 'Cubic.easeInOut' });
            this.tweens.add({ targets: this.rightButton, x: leftX, duration: 1000, ease: 'Cubic.easeInOut' });

            // Close popup
            this.tweens.add({
                targets: [popup, overlay],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    popup.destroy();
                    overlay.destroy();
                    this.isPaused = false;
                    this.showFeedback("สลับแล้ว!", 0x44FF44);
                }
            });
        });
    }


    private triggerConfetti(x: number, y: number) {
        this.createParticleTextures();

        const particles = this.add.particles(x, y, 'td-confetti', {
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 2000,
            gravityY: 200,
            rotate: { start: 0, end: 360 },
            emitting: false
        });

        // Set random colors for particles if supported or use tint
        // Phaser 3 particle tint is usually single value per emitter unless using callbacks
        // We'll create a few bursts with different tints

        const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF];

        colors.forEach(color => {
            const p = this.add.particles(x, y, 'td-confetti', {
                speed: { min: 100, max: 300 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.8, end: 0 },
                lifespan: 2000,
                gravityY: 200,
                rotate: { start: 0, end: 360 },
                tint: color,
                emitting: false
            });
            p.explode(10);
            this.time.delayedCall(2500, () => p.destroy());
        });

        particles.destroy(); // Destroy the base one since we used colored ones
    }
}
