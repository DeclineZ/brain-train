import * as Phaser from 'phaser';
import { TAXIDRIVER_LEVELS, TaxiDriverLevelConfig } from './levels';

// Direction types
type Direction = 'left' | 'right' | 'forward';
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
    private buildingContainers: Phaser.GameObjects.Rectangle[] = [];

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

    // Audio
    private engineSound: Phaser.Sound.BaseSound | null = null;

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
        this.add.rectangle(width / 2, height / 2, width, height, 0xE8E0D5);

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

        // Create message text
        this.messageText = this.add.text(width / 2, height * 0.12, '', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '28px',
            color: '#2B2115',
            stroke: '#FFFFFF',
            strokeThickness: 4,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(200);

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
        const availableHeight = height * 0.7;
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

        // Draw grid of roads
        const roadColor = 0x5D5D5D;
        const lineColor = 0xFFFFFF;

        for (let x = 0; x < this.GRID_SIZE; x++) {
            for (let y = 0; y < this.GRID_SIZE; y++) {
                const pos = this.gridToWorld(x, y);

                // Draw road tile
                this.roadGraphics.fillStyle(roadColor, 1);
                this.roadGraphics.fillRect(
                    pos.x - this.cellSize * 0.35,
                    pos.y - this.cellSize * 0.35,
                    this.cellSize * 0.7,
                    this.cellSize * 0.7
                );

                // Draw road connections based on position
                // Horizontal connections
                if (x < this.GRID_SIZE - 1) {
                    this.roadGraphics.fillRect(
                        pos.x + this.cellSize * 0.35,
                        pos.y - this.cellSize * 0.15,
                        this.cellSize * 0.3,
                        this.cellSize * 0.3
                    );
                }

                // Vertical connections  
                if (y < this.GRID_SIZE - 1) {
                    this.roadGraphics.fillRect(
                        pos.x - this.cellSize * 0.15,
                        pos.y + this.cellSize * 0.35,
                        this.cellSize * 0.3,
                        this.cellSize * 0.3
                    );
                }
            }
        }

        // Draw road markings (simple dashed lines)
        this.roadGraphics.lineStyle(2, lineColor, 0.5);
        for (let x = 0; x < this.GRID_SIZE; x++) {
            for (let y = 0; y < this.GRID_SIZE - 1; y++) {
                const pos = this.gridToWorld(x, y);
                // Vertical dashes
                for (let d = 0; d < 3; d++) {
                    const dashY = pos.y + this.cellSize * 0.4 + d * this.cellSize * 0.2;
                    this.roadGraphics.moveTo(pos.x, dashY);
                    this.roadGraphics.lineTo(pos.x, dashY + this.cellSize * 0.1);
                }
            }
        }
        this.roadGraphics.strokePath();
    }

    private createBuildings() {
        // Create decorative buildings between roads
        const buildingColors = [0x8B4513, 0xA0522D, 0xCD853F, 0xD2691E, 0xBC8F8F, 0x708090];

        // Clear existing buildings
        this.buildingContainers.forEach(b => b.destroy());
        this.buildingContainers = [];

        for (let x = 0; x < this.GRID_SIZE - 1; x++) {
            for (let y = 0; y < this.GRID_SIZE - 1; y++) {
                const pos1 = this.gridToWorld(x, y);
                const pos2 = this.gridToWorld(x + 1, y + 1);

                const centerX = (pos1.x + pos2.x) / 2;
                const centerY = (pos1.y + pos2.y) / 2;

                const buildingSize = this.cellSize * 0.4;
                const color = Phaser.Utils.Array.GetRandom(buildingColors);

                const building = this.add.rectangle(
                    centerX, centerY,
                    buildingSize, buildingSize,
                    color
                );
                building.setStrokeStyle(2, 0x333333);
                building.setDepth(5);

                this.buildingContainers.push(building);
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

        // Car body (TukTuk style - simple rectangle)
        const bodyWidth = this.cellSize * 0.5;
        const bodyHeight = this.cellSize * 0.6;

        const body = this.add.rectangle(0, 0, bodyWidth, bodyHeight, 0xFFD700);
        body.setStrokeStyle(3, 0xB8860B);

        // Roof
        const roof = this.add.rectangle(0, -bodyHeight * 0.15, bodyWidth * 0.8, bodyHeight * 0.4, 0xFFA500);
        roof.setStrokeStyle(2, 0xCC7000);

        // Direction arrow
        const arrowGraphics = this.add.graphics();
        arrowGraphics.fillStyle(0x4285F4, 1);
        arrowGraphics.beginPath();
        arrowGraphics.moveTo(0, -bodyHeight * 0.5);
        arrowGraphics.lineTo(-8, -bodyHeight * 0.3);
        arrowGraphics.lineTo(8, -bodyHeight * 0.3);
        arrowGraphics.closePath();
        arrowGraphics.fillPath();

        this.car.add([body, roof, arrowGraphics]);

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
        const panelY = height - 100;
        const buttonSize = 70;
        const spacing = 20;

        // Panel background
        const panelBg = this.add.rectangle(
            width / 2, panelY,
            buttonSize * 3 + spacing * 4, buttonSize + 40,
            0x2B2115, 0.9
        );
        panelBg.setStrokeStyle(4, 0xFFD700);
        panelBg.setDepth(150);

        // Left button
        this.leftButton = this.createDirectionButton(
            width / 2 - buttonSize - spacing, panelY,
            'left', '◀', buttonSize
        );

        // Forward button
        this.forwardButton = this.createDirectionButton(
            width / 2, panelY,
            'forward', '▲', buttonSize
        );

        // Right button
        this.rightButton = this.createDirectionButton(
            width / 2 + buttonSize + spacing, panelY,
            'right', '▶', buttonSize
        );
    }

    private createDirectionButton(x: number, y: number, direction: Direction, symbol: string, size: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        container.setDepth(160);

        // Button background
        const bg = this.add.rectangle(0, 0, size, size, 0x4285F4);
        bg.setStrokeStyle(3, 0xFFFFFF);

        // Button symbol
        const text = this.add.text(0, 0, symbol, {
            fontFamily: 'Arial',
            fontSize: `${size * 0.5}px`,
            color: '#FFFFFF'
        }).setOrigin(0.5);

        container.add([bg, text]);

        // Make interactive
        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerdown', () => {
            if (this.gameOver) return;


            // Handle brake stop with forward button
            if (this.isBrakeStopped && direction === 'forward') {
                // Visual feedback
                bg.setFillStyle(0x2962FF);
                this.tweens.add({
                    targets: container,
                    scaleX: 0.9,
                    scaleY: 0.9,
                    duration: 50,
                    yoyo: true
                });
                this.handleForwardPress();
                return;
            }

            // Allow input when approaching an intersection (not just waiting)
            if (!this.isApproachingIntersection && !this.isWaitingForInput) return;

            // Visual feedback
            bg.setFillStyle(0x2962FF);
            this.tweens.add({
                targets: container,
                scaleX: 0.9,
                scaleY: 0.9,
                duration: 50,
                yoyo: true
            });

            this.handleDirectionInput(direction);
        });

        bg.on('pointerup', () => {
            bg.setFillStyle(0x4285F4);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x4285F4);
        });

        return container;
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
            });
        });
    }

    private findNextIntersection() {
        // Find the next intersection after current position
        for (let i = this.currentPathIndex; i < this.path.length; i++) {
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

        // Show STOP message
        this.messageText.setText('หยุด!');
        this.messageText.setColor('#FF4444');
        this.messageText.setVisible(true);

        // Highlight forward button
        this.highlightForwardButton(true);

        // Play brake sound
        this.playSound('car-honk');

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

    private handleBrakeTimeout() {
        this.isBrakeStopped = false;
        this.messageText.setVisible(false);
        this.highlightForwardButton(false);
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

        const speed = this.currentLevelConfig.carSpeed;
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

        // Reset state
        this.queuedDirection = null;
        this.isApproachingIntersection = false;
        this.brakeStopsRemaining = 0;
        this.isBrakeStopped = false;
        this.brakeStopSegments = [];
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
        this.endGame('completed');
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
}
