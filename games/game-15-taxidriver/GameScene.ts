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
    private brakeStopTimer: Phaser.Time.TimerEvent | null = null;
    private brakeStopSegments: number[] = [];  // Indices of segments where brake stops will occur
    private stopSignContainer: Phaser.GameObjects.Container | null = null;

    // Audio
    private engineSound: Phaser.Sound.BaseSound | null = null;

    // Stage/Portal system state
    private currentStage = 1;
    private totalStages = 1;
    private stageProgressText!: Phaser.GameObjects.Text;
    private controlsSwapped = false;
    private controlSwapTimer: Phaser.Time.TimerEvent | null = null;

    constructor() {
        super({ key: 'TaxiDriverGameScene' });
    }

    init(data: { level: number }) {
        const regLevel = this.registry.get('level');
        const level = data.level ?? regLevel ?? 1;
        this.currentLevelConfig = TAXIDRIVER_LEVELS[level] || TAXIDRIVER_LEVELS[1];

        // Reset all state
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

        // Initialize stage tracking
        this.currentStage = 1;
        this.totalStages = this.currentLevelConfig.stageCount || 1;
    }

    preload() {
        // Load sounds
        this.load.audio('car-honk', '/assets/sounds/taxidriver/car-honk.mp3');
        this.load.audio('correct-turn', '/assets/sounds/taxidriver/correct-turn.mp3');
        this.load.audio('wrong-turn', '/assets/sounds/taxidriver/wrong-turn.mp3');
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
            fontSize: '32px',
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
        }
    }

    private calculateGridDimensions() {
        const { width, height } = this.scale;

        // Reserve space for UI at bottom
        // Reduced from 0.7 to 0.65 to ensure grid doesn't overlap with the taller mobile UI
        const availableHeight = height * 0.65;
        const availableWidth = width * 0.95;

        // Calculate cell size to fit grid
        this.cellSize = Math.min(
            availableWidth / this.GRID_SIZE,
            availableHeight / this.GRID_SIZE
        );

        // Limit max cell size
        this.cellSize = Math.min(this.cellSize, 100);

        // Calculate offsets to center grid
        const gridWidth = this.GRID_SIZE * this.cellSize;
        const gridHeight = this.GRID_SIZE * this.cellSize;

        this.gridOffsetX = (width - gridWidth) / 2;
        this.gridOffsetY = height * 0.08;
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
        // Google Maps palette
        const buildingColors = [0xE5E5E5, 0xF2F2F2, 0xD9D9D9, 0xEBEBEB, 0xF5F5F0];
        const parkColor = 0xC1E1C1; // Soft green
        const waterColor = 0xAADAFF; // Soft blue
        const shadowColor = 0xCCCCCC;

        // Clear existing buildings
        this.buildingContainers.forEach(b => b.destroy());
        this.buildingContainers = [];

        // Grid cells between roads
        for (let x = 0; x < this.GRID_SIZE - 1; x++) {
            for (let y = 0; y < this.GRID_SIZE - 1; y++) {
                const pos1 = this.gridToWorld(x, y);
                const pos2 = this.gridToWorld(x + 1, y + 1);

                const centerX = (pos1.x + pos2.x) / 2;
                const centerY = (pos1.y + pos2.y) / 2;
                const blockSize = this.cellSize * 0.8;

                // Determine block type based on Perlin-like pseudo-randomness or simple probability
                // Use coordinates to create "clusters" of similar types
                const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5);

                let type = 'building';
                if (noise > 0.7) type = 'water';
                else if (noise < -0.6) type = 'park';

                const container = this.add.container(centerX, centerY);
                container.setDepth(5);
                this.buildingContainers.push(container);

                if (type === 'water') {
                    // Water block
                    const water = this.add.rectangle(0, 0, blockSize, blockSize, waterColor);
                    // Add simple wave effect lines
                    const wave1 = this.add.text(-blockSize / 3, -blockSize / 4, '~', { color: '#88CCFF', fontSize: '20px' }).setOrigin(0.5);
                    const wave2 = this.add.text(blockSize / 4, blockSize / 5, '~', { color: '#88CCFF', fontSize: '20px' }).setOrigin(0.5);
                    container.add([water, wave1, wave2]);
                } else if (type === 'park') {
                    // Park block
                    const park = this.add.rectangle(0, 0, blockSize, blockSize, parkColor);
                    // Add simple trees (green dots)
                    const tree1 = this.add.circle(-blockSize / 4, -blockSize / 4, 6, 0x8FBC8F);
                    const tree2 = this.add.circle(blockSize / 3, blockSize / 5, 8, 0x8FBC8F);
                    const tree3 = this.add.circle(-blockSize / 5, blockSize / 3, 5, 0x8FBC8F);
                    container.add([park, tree1, tree2, tree3]);
                } else {
                    // Building block - Varied shapes
                    // 0: Full block, 1: L-shape, 2: Two small buildings
                    const shapeType = Phaser.Math.Between(0, 3);
                    const color = Phaser.Utils.Array.GetRandom(buildingColors);

                    if (shapeType === 0) {
                        // Full block
                        const shadow = this.add.rectangle(4, 4, blockSize, blockSize, shadowColor);
                        const b = this.add.rectangle(0, 0, blockSize, blockSize, color);
                        b.setStrokeStyle(1, 0xBBBBBB);
                        container.add([shadow, b]);
                    } else if (shapeType === 1) {
                        // L-shape (composed of two rectangles)
                        const w1 = blockSize * 0.4;
                        const h1 = blockSize;
                        const w2 = blockSize;
                        const h2 = blockSize * 0.4;

                        // Shadow
                        const s1 = this.add.rectangle(-blockSize / 2 + w1 / 2 + 4, 4, w1, h1, shadowColor);
                        const s2 = this.add.rectangle(4, blockSize / 2 - h2 / 2 + 4, w2, h2, shadowColor);

                        // Main parts
                        const b1 = this.add.rectangle(-blockSize / 2 + w1 / 2, 0, w1, h1, color);
                        const b2 = this.add.rectangle(0, blockSize / 2 - h2 / 2, w2, h2, color);

                        b1.setStrokeStyle(1, 0xBBBBBB);
                        b2.setStrokeStyle(1, 0xBBBBBB);

                        container.add([s1, s2, b1, b2]);
                    } else {
                        // Multiple small buildings
                        const size = blockSize * 0.45;
                        const offset = blockSize * 0.25;

                        const c1 = Phaser.Utils.Array.GetRandom(buildingColors);
                        const c2 = Phaser.Utils.Array.GetRandom(buildingColors);

                        const s1 = this.add.rectangle(-offset + 3, -offset + 3, size, size, shadowColor);
                        const b1 = this.add.rectangle(-offset, -offset, size, size, c1);

                        const s2 = this.add.rectangle(offset + 3, offset + 3, size, size, shadowColor);
                        const b2 = this.add.rectangle(offset, offset, size, size, c2);

                        b1.setStrokeStyle(1, 0xBBBBBB);
                        b2.setStrokeStyle(1, 0xBBBBBB);

                        container.add([s1, b1, s2, b2]);
                    }
                }
            }
        }
    }

    private generatePath() {
        // Generate a random path from start to end
        const pathLength = this.currentLevelConfig.pathLength;

        // Adjust starting position based on map rotation
        let startX = 3, startY = 6;
        let endY = 0;
        let heading: Heading = 'N';

        switch (this.currentLevelConfig.mapRotation) {
            case 0:
                startX = 3; startY = 6; heading = 'N'; endY = 0;
                break;
            case 90:
                startX = 0; startY = 3; heading = 'E'; endY = 3; // End is right side
                break;
            case 180:
                startX = 3; startY = 0; heading = 'S'; endY = 6;
                break;
            case 270:
                startX = 6; startY = 3; heading = 'W'; endY = 3; // End is left side
                break;
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

        // Dimensions
        const width = this.cellSize * 0.5;
        const length = this.cellSize * 0.7;

        // 1. Shadow (grounded feel)
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillRoundedRect(-width / 2, -length / 2 + 4, width, length, 8);

        // 2. Chassis (Main body)
        // Yellow Taxi Color
        const chassisColor = 0xFFD700;
        const chassis = this.add.graphics();
        chassis.fillStyle(chassisColor, 1);
        chassis.lineStyle(1, 0xDAA520); // Golden Rod border
        // Draw centered rounded rect
        chassis.fillRoundedRect(-width / 2, -length / 2, width, length, 6);
        chassis.strokeRoundedRect(-width / 2, -length / 2, width, length, 6);

        // 3. Roof (Top)
        const roofWidth = width * 0.85;
        const roofLength = length * 0.55;
        const roof = this.add.rectangle(0, 0, roofWidth, roofLength, 0xFFCC00); // Slightly lighter
        roof.setStrokeStyle(1, 0xC68E17);

        // 4. Windshield (Front) & Rear Window
        // Front is "Up" in local space (-y)
        const windshield = this.add.rectangle(0, -length * 0.15, roofWidth * 0.9, length * 0.15, 0x87CEEB); // Sky blue
        const rearWindow = this.add.rectangle(0, length * 0.2, roofWidth * 0.9, length * 0.1, 0x444444); // Dark gray

        // 5. Headlights (Front)
        const lightY = -length / 2 + 2;
        const lightX = width / 2 - 6;
        const headlightLeft = this.add.circle(-lightX, lightY, 3, 0xFFFFFF);
        const headlightRight = this.add.circle(lightX, lightY, 3, 0xFFFFFF);

        // 6. Brake Lights (Rear)
        const brakeY = length / 2 - 2;
        const brakeLeft = this.add.rectangle(-lightX, brakeY, 5, 3, 0xFF0000);
        const brakeRight = this.add.rectangle(lightX, brakeY, 5, 3, 0xFF0000);

        // 7. Headlight Beams (Cone of light)
        const beam = this.add.graphics();
        beam.fillStyle(0xFFFFCC, 0.3);
        // Left beam
        beam.beginPath();
        beam.moveTo(-lightX, lightY);
        beam.lineTo(-lightX - 15, lightY - 60);
        beam.lineTo(-lightX + 10, lightY - 60);
        beam.closePath();
        // Right beam
        beam.beginPath();
        beam.moveTo(lightX, lightY);
        beam.lineTo(lightX - 10, lightY - 60);
        beam.lineTo(lightX + 15, lightY - 60);
        beam.closePath();
        beam.fillPath();

        this.car.add([shadow, beam, chassis, brakeLeft, brakeRight, windshield, rearWindow, roof, headlightLeft, headlightRight]);

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

        // Control panel at bottom
        // Responsive button size for mobile
        const buttonSize = Math.min(80, width * 0.2);
        const spacing = Math.min(30, width * 0.05);

        const panelY = height - (buttonSize + 40); // Dynamic Y based on button size

        // Panel background (floating pill shape)
        const panelWidth = buttonSize * 3 + spacing * 4;
        const panelHeight = buttonSize + 30;

        // Create stage progress indicator (Floating Pill) - Positioned ABOVE control panel
        if (this.totalStages > 1) {
            const pillW = 140;
            const pillH = 40;
            const pillX = 20;
            // Position strictly above Key Panel: Top of Panel - Pill Height - Padding
            const pillY = (panelY - panelHeight / 2) - pillH - 10;

            const pill = this.add.graphics();
            pill.fillStyle(COLORS.UI_PANEL, 0.9);
            pill.fillRoundedRect(pillX, pillY, pillW, pillH, 20);
            pill.lineStyle(2, COLORS.UI_STROKE);
            pill.strokeRoundedRect(pillX, pillY, pillW, pillH, 20);
            pill.setDepth(199);

            if (this.stageProgressText) this.stageProgressText.destroy();
            this.stageProgressText = this.add.text(pillX + pillW / 2, pillY + pillH / 2, `ด่าน ${this.currentStage}/${this.totalStages}`, {
                fontFamily: 'Sarabun, sans-serif',
                fontSize: '20px',
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
            fontStyle: 'bold'
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
        const delay = Phaser.Math.Between(3000, 6000);
        this.controlSwapTimer = this.time.delayedCall(delay, () => {
            this.triggerControlSwap();
        });
    }

    private triggerControlSwap() {
        if (this.gameOver || !this.gameStarted) return;

        // Visual alert
        this.showFeedback("สลับปุ่ม!", 0xFF0000); // Swap!

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
            ease: 'Cubic.easeInOut'
        });
    }


    private startGame() {
        this.messageText.setText('เตรียมพร้อม...');
        this.messageText.setVisible(true);

        // Countdown then start
        this.time.delayedCall(1000, () => {
            this.messageText.setText('ไป!');

            this.time.delayedCall(500, () => {
                this.messageText.setVisible(false);
                this.gameStarted = true;
                this.startTime = Date.now();
                // approachTimeMs is time-based so it's consistent on all screen sizes
                // Use at least 1.2 seconds or the configured decision time
                this.approachTimeMs = Math.max(2500, this.currentLevelConfig.decisionTimeMs);

                // Find first upcoming intersection
                this.findNextIntersection();

                // Start moving continuously
                this.startContinuousMovement();

                // Setup path fade if enabled
                if (this.currentLevelConfig.pathFadeEnabled) {
                    this.setupPathFade();
                }

                // Setup brake stops if enabled
                if (this.currentLevelConfig.brakeStopEnabled) {
                    this.setupBrakeStops();
                }

                // Setup control swap if enabled
                if (this.currentLevelConfig.swapControls) {
                    this.setupControlSwap();
                }
            });
        });
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

        // Get non-intersection segments for brake stops
        const validSegments: number[] = [];
        for (let i = 1; i < this.path.length - 1; i++) {
            if (!this.path[i].isIntersection) {
                validSegments.push(i);
            }
        }

        // Randomly select segments for brake stops
        const shuffled = validSegments.sort(() => Math.random() - 0.5);
        this.brakeStopSegments = shuffled.slice(0, Math.min(config.brakeStopCount, shuffled.length));
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

        // Create elegant stop sign visual ahead of the car
        this.createStopSign();

        // Show STOP message
        this.messageText.setText('หยุด!');
        this.messageText.setColor('#FF4444');
        this.messageText.setVisible(true);

        // Highlight forward button
        this.highlightForwardButton(true);

        // Play brake sound
        this.playSound('car-honk');

        // Trigger smoke effect
        this.triggerSmokeEffect(this.car.x, this.car.y);

        // Start timer - must press Forward within time limit
        this.brakeStopTimer = this.time.delayedCall(
            this.currentLevelConfig.brakeStopTimeMs,
            () => {
                if (this.isBrakeStopped) {
                    // Player didn't press Forward in time
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
        this.removeStopSign();
        this.handleTimeout();
    }

    private handleForwardPress() {
        if (!this.isBrakeStopped) return;

        // Player pressed Forward - continue driving!
        if (this.brakeStopTimer) {
            this.brakeStopTimer.destroy();
            this.brakeStopTimer = null;
        }

        this.isBrakeStopped = false;
        this.brakeStopsRemaining--;

        // Remove this segment from brake stops
        this.brakeStopSegments = this.brakeStopSegments.filter(s => s !== this.currentPathIndex);

        // Remove stop sign with animation
        this.removeStopSign();

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

        // Check if this segment has a brake stop
        this.checkBrakeStop();
        if (this.isBrakeStopped) return;
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

            // Check if we just reached an intersection
            const currentSeg = this.path[this.currentPathIndex];
            if (currentSeg.isIntersection) {
                // Check if player provided input
                if (this.queuedDirection) {
                    // Process the queued direction
                    this.processQueuedDirection();
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
        if (this.gameOver) return;

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
        this.isApproachingIntersection = false;
        this.brakeStopsRemaining = 0;
        this.isBrakeStopped = false;
        this.brakeStopSegments = [];
        this.queuedDirection = null;
        this.highlightButtons(false);
        this.alertIndicator.setVisible(false);

        // Record failed turn
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

        // Play honk and fail
        this.playSound('car-honk');
        this.time.delayedCall(500, () => {
            this.endGame('timeout');
        });
    }

    private handleWrongDirection() {
        this.playSound('wrong-turn');
        this.showFeedback('✗', 0xFF4444);

        this.time.delayedCall(500, () => {
            this.playSound('car-honk');
            this.time.delayedCall(500, () => {
                this.endGame('wrong_direction');
            });
        });
    }

    private handleVictory() {
        // Check if more stages remain
        if (this.currentStage < this.totalStages) {
            this.triggerPortalTransition();
        } else {
            this.endGame('completed');
        }
    }

    private triggerPortalTransition() {
        // Stop movement and show celebration
        this.isMoving = false;
        this.targetPosition = null;
        this.gameStarted = false;

        // Play success sound
        this.playSound('correct-turn');

        // Show portal transition message
        this.messageText.setText('ยอดเยี่ยม!');
        this.messageText.setColor('#58CC02');
        this.messageText.setVisible(true);
        this.showFeedback('✓', 0x58CC02);

        // Celebrate!
        this.triggerConfetti(this.car.x, this.car.y);

        // Fade out the game area
        const { width, height } = this.scale;
        const fadeOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
        fadeOverlay.setDepth(180);

        this.tweens.add({
            targets: fadeOverlay,
            alpha: 0.7,
            duration: 500,
            onComplete: () => {
                // Show "Next stage" message
                this.messageText.setText(`ไปด่านถัดไป!`);
                this.messageText.setColor('#FFFFFF');

                this.time.delayedCall(1000, () => {
                    // Increment stage
                    this.currentStage++;

                    // Update stage progress text
                    if (this.stageProgressText) {
                        this.stageProgressText.setText(`ด่าน ${this.currentStage}/${this.totalStages}`);
                    }

                    // Reset for next stage
                    this.resetForNextStage();

                    // Fade back in
                    this.tweens.add({
                        targets: fadeOverlay,
                        alpha: 0,
                        duration: 400,
                        onComplete: () => {
                            fadeOverlay.destroy();
                            this.messageText.setVisible(false);

                            // Restart game
                            this.startGame();
                        }
                    });
                });
            }
        });
    }

    private resetForNextStage() {
        // Clear old path graphics
        this.pathGraphics.clear();

        // Reset car state
        this.carGridX = 3;
        this.carGridY = 6;
        this.carHeading = 'N';
        this.currentPathIndex = 0;
        this.isMoving = false;
        this.isWaitingForInput = false;
        this.targetPosition = null;

        // Reset navigation state
        this.upcomingIntersectionIndex = -1;
        this.queuedDirection = null;
        this.isApproachingIntersection = false;

        // Reset brake stops
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

        // Reset path fade
        this.isPathVisible = true;
        if (this.pathFadeTimer) {
            this.pathFadeTimer.destroy();
            this.pathFadeTimer = null;
        }

        // Clear path and generate new one
        this.path = [];
        this.generatePath();
        this.drawPath();

        // Reset car position
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

        // Show end message
        if (reason === 'completed') {
            this.playSound('level-pass');
            this.messageText.setText('ถึงแล้ว!');
            this.messageText.setColor('#58CC02');
        } else {
            this.playSound('level-fail');
            this.messageText.setText(reason === 'timeout' ? 'หมดเวลา!' : 'ผิดทาง!');
            this.messageText.setColor('#FF4444');
        }
        this.messageText.setVisible(true);

        // Call game over callback from registry
        this.time.delayedCall(1500, () => {
            const onGameOver = this.registry.get('onGameOver');
            if (onGameOver) {
                onGameOver(stats);
            }
        });
    }

    private calculateStars(reason: 'timeout' | 'wrong_direction' | 'completed'): number {
        if (reason !== 'completed') return 0;

        const correctTurns = this.turnData.filter(t => t.wasCorrect).length;
        const totalTurns = this.turnData.length;

        if (totalTurns === 0) return 3;

        const accuracy = correctTurns / totalTurns;

        if (accuracy >= 1.0) return 3;
        if (accuracy >= 0.8) return 2;
        return 1;
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
        if (this.textures.exists('smoke')) return;

        const graphics = this.make.graphics({ x: 0, y: 0 });

        // Smoke texture
        graphics.fillStyle(COLORS.ROAD, 1);
        graphics.fillCircle(16, 16, 16);
        graphics.generateTexture('smoke', 32, 32);
        graphics.clear();

        // Confetti texture
        graphics.fillStyle(COLORS.ROAD, 1);
        graphics.fillRect(0, 0, 16, 8);
        graphics.generateTexture('confetti', 16, 8);

        graphics.destroy();
    }

    private triggerSmokeEffect(x: number, y: number) {
        this.createParticleTextures();

        const particles = this.add.particles(x, y, 'smoke', {
            speed: { min: 20, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.3, end: 0 },
            lifespan: { min: 500, max: 1000 },
            gravityY: -20,
            emitting: false
        });

        particles.explode(15);

        this.time.delayedCall(1500, () => {
            particles.destroy();
        });
    }

    private triggerConfetti(x: number, y: number) {
        this.createParticleTextures();

        const particles = this.add.particles(x, y, 'confetti', {
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
            const p = this.add.particles(x, y, 'confetti', {
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
