import * as Phaser from 'phaser';

/**
 * Tutorial Scene for Taxi Driver
 * Teaches basic mechanics: path following, direction buttons, pre-selecting turns, brake stops
 * All text is in Thai with proper padding.
 */

type Direction = 'left' | 'right' | 'forward';
type Heading = 'N' | 'S' | 'E' | 'W';

interface RoadSegment {
    x: number;
    y: number;
    direction: Heading;
    isIntersection: boolean;
    turnRequired?: Direction;
}

// Same warm/cream palette as GameScene
const COLORS = {
    BACKGROUND: 0xEBE9E4,
    ROAD: 0xFAF9F6,
    ROAD_BORDER: 0xD6D6D6,
    UI_PANEL: 0xFAF9F6,
    UI_STROKE: 0xDDDDDD,
    TEXT_DARK: 0x2B2115,
};

export class TaxiDriverTutorialScene extends Phaser.Scene {
    // Grid settings (same as GameScene)
    private readonly GRID_SIZE = 7;
    private cellSize = 80;
    private gridOffsetX = 0;
    private gridOffsetY = 0;

    // Game objects
    private car!: Phaser.GameObjects.Container;
    private pathGraphics!: Phaser.GameObjects.Graphics;
    private roadGraphics!: Phaser.GameObjects.Graphics;
    private buildingContainers: Phaser.GameObjects.Container[] = [];
    private alertIndicator!: Phaser.GameObjects.Container;

    // Path data
    private path: RoadSegment[] = [];
    private currentPathIndex = 0;
    private targetPosition: { x: number; y: number } | null = null;

    // Car state
    private carHeading: Heading = 'N';
    private carGridX = 3;
    private carGridY = 6;
    private isMoving = false;

    // UI Elements
    private leftButton!: Phaser.GameObjects.Container;
    private rightButton!: Phaser.GameObjects.Container;
    private forwardButton!: Phaser.GameObjects.Container;

    // Tutorial flow
    private currentPhase = 0;
    private instructionOverlay!: Phaser.GameObjects.Container;
    private instructionText!: Phaser.GameObjects.Text;
    private instructionPanel!: Phaser.GameObjects.Graphics;
    private handIcon!: Phaser.GameObjects.Text;
    private gameStarted = false;
    private gameOver = false;

    // Real-time navigation (simplified for tutorial)
    private upcomingIntersectionIndex = -1;
    private queuedDirection: Direction | null = null;
    private isApproachingIntersection = false;
    private approachTimeMs = 3000; // Very generous for tutorial

    // Brake stop mechanic
    private isBrakeStopped = false;
    private brakeStopTimer: Phaser.Time.TimerEvent | null = null;
    private brakeStopSegments: number[] = [];
    private stopSignContainer: Phaser.GameObjects.Container | null = null;

    // Tutorial-specific
    private correctTurnsInPractice = 0;
    private totalTurnsInPractice = 0;
    private practiceHintShown = false;

    constructor() {
        super({ key: 'TaxiDriverTutorialScene' });
    }

    preload() {
        this.load.image('tuktuk-body', '/assets/game-15-taxidriver/tuktuk_asset.png');
        this.load.audio('engine-idle', '/assets/sounds/taxidriver/Engine_Idle.mp3');
        this.load.audio('correct-turn', '/assets/sounds/taxidriver/Turn_Swooosh.mp3');
        this.load.audio('wrong-turn', '/assets/sounds/global/error.mp3');
        this.load.audio('game-bgm', '/assets/sounds/taxidriver/taxidriver-bg.mp3');
        this.load.audio('car-horn', '/assets/sounds/taxidriver/horn.mp3');
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

        // Create buildings
        this.createBuildings();

        // Create path layer  
        this.pathGraphics = this.add.graphics();
        this.pathGraphics.setDepth(10);

        // Create car
        this.createCar();

        // Create alert indicator
        this.createAlertIndicator();

        // Create UI controls
        this.createUI();

        // Create particle textures
        this.createParticleTextures();

        // Create hand icon for pointing
        this.handIcon = this.add.text(0, 0, '👆', {
            fontSize: '48px'
        }).setOrigin(0.5).setVisible(false).setDepth(500);

        // Create instruction overlay
        this.createInstructionOverlay();

        // Audio Setup
        this.sound.stopAll();
        this.sound.play('game-bgm', { volume: 0.3, loop: true });

        // Handle resize
        this.scale.on('resize', () => {
            this.calculateGridDimensions();
            this.layoutGame();
        });

        // Start tutorial
        this.startPhase1();
    }

    update(_time: number, delta: number) {
        if (!this.gameStarted || this.gameOver) return;

        if (this.isMoving && this.targetPosition) {
            this.moveCarTowardsTarget(delta);
            this.checkApproachingIntersection();
            this.updateAlertIndicator();
        }
    }

    // ========================================================================
    // GRID & RENDERING (Simplified from GameScene)
    // ========================================================================

    private calculateGridDimensions() {
        const { width, height } = this.scale;
        const availableHeight = height * 0.55;
        const availableWidth = width * 0.95;

        this.cellSize = Math.min(
            availableWidth / this.GRID_SIZE,
            availableHeight / this.GRID_SIZE
        );
        this.cellSize = Math.min(this.cellSize, 100);

        const gridWidth = this.GRID_SIZE * this.cellSize;
        this.gridOffsetX = (width - gridWidth) / 2;
        this.gridOffsetY = height * 0.20;
    }

    private gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
        return {
            x: this.gridOffsetX + (gridX + 0.5) * this.cellSize,
            y: this.gridOffsetY + (gridY + 0.5) * this.cellSize
        };
    }

    private drawRoads() {
        this.roadGraphics.clear();
        const borderColor = 0xD6D6D6;
        const boarderWidth = this.cellSize * 0.8;
        const roadWidth = this.cellSize * 0.6;

        // Border layer
        this.roadGraphics.fillStyle(borderColor, 1);
        for (let x = 0; x < this.GRID_SIZE; x++) {
            for (let y = 0; y < this.GRID_SIZE; y++) {
                const pos = this.gridToWorld(x, y);
                this.roadGraphics.fillRoundedRect(pos.x - boarderWidth / 2, pos.y - boarderWidth / 2, boarderWidth, boarderWidth, 4);
                if (x < this.GRID_SIZE - 1) {
                    this.roadGraphics.fillRect(pos.x + boarderWidth / 2 - 2, pos.y - boarderWidth / 2, this.cellSize - boarderWidth + 4, boarderWidth);
                }
                if (y < this.GRID_SIZE - 1) {
                    this.roadGraphics.fillRect(pos.x - boarderWidth / 2, pos.y + boarderWidth / 2 - 2, boarderWidth, this.cellSize - boarderWidth + 4);
                }
            }
        }

        // Road inner layer
        this.roadGraphics.fillStyle(COLORS.ROAD, 1);
        for (let x = 0; x < this.GRID_SIZE; x++) {
            for (let y = 0; y < this.GRID_SIZE; y++) {
                const pos = this.gridToWorld(x, y);
                this.roadGraphics.fillRoundedRect(pos.x - roadWidth / 2, pos.y - roadWidth / 2, roadWidth, roadWidth, 2);
                if (x < this.GRID_SIZE - 1) {
                    this.roadGraphics.fillRect(pos.x + roadWidth / 2 - 2, pos.y - roadWidth / 2, this.cellSize - roadWidth + 4, roadWidth);
                }
                if (y < this.GRID_SIZE - 1) {
                    this.roadGraphics.fillRect(pos.x - roadWidth / 2, pos.y + roadWidth / 2 - 2, roadWidth, this.cellSize - roadWidth + 4);
                }
            }
        }
    }

    private createBuildings() {
        const buildingColors = [0xE5E5E5, 0xF2F2F2, 0xD9D9D9, 0xEBEBEB, 0xF5F5F0];
        const parkColor = 0xC1E1C1;
        const waterColor = 0xAADAFF;
        const shadowColor = 0xCCCCCC;

        this.buildingContainers.forEach(b => b.destroy());
        this.buildingContainers = [];

        for (let x = 0; x < this.GRID_SIZE - 1; x++) {
            for (let y = 0; y < this.GRID_SIZE - 1; y++) {
                const pos1 = this.gridToWorld(x, y);
                const pos2 = this.gridToWorld(x + 1, y + 1);
                const centerX = (pos1.x + pos2.x) / 2;
                const centerY = (pos1.y + pos2.y) / 2;
                const blockSize = this.cellSize * 0.8;

                const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5);
                let type = 'building';
                if (noise > 0.7) type = 'water';
                else if (noise < -0.6) type = 'park';

                const container = this.add.container(centerX, centerY);
                container.setDepth(5);
                this.buildingContainers.push(container);

                if (type === 'water') {
                    const water = this.add.rectangle(0, 0, blockSize, blockSize, waterColor);
                    const wave1 = this.add.text(-blockSize / 3, -blockSize / 4, '~', { color: '#88CCFF', fontSize: '20px' }).setOrigin(0.5);
                    const wave2 = this.add.text(blockSize / 4, blockSize / 5, '~', { color: '#88CCFF', fontSize: '20px' }).setOrigin(0.5);
                    container.add([water, wave1, wave2]);
                } else if (type === 'park') {
                    const park = this.add.rectangle(0, 0, blockSize, blockSize, parkColor);
                    const tree1 = this.add.circle(-blockSize / 4, -blockSize / 4, 6, 0x8FBC8F);
                    const tree2 = this.add.circle(blockSize / 3, blockSize / 5, 8, 0x8FBC8F);
                    const tree3 = this.add.circle(-blockSize / 5, blockSize / 3, 5, 0x8FBC8F);
                    container.add([park, tree1, tree2, tree3]);
                } else {
                    const color = Phaser.Utils.Array.GetRandom(buildingColors);
                    const shadow = this.add.rectangle(4, 4, blockSize, blockSize, shadowColor);
                    const b = this.add.rectangle(0, 0, blockSize, blockSize, color);
                    b.setStrokeStyle(1, 0xBBBBBB);
                    container.add([shadow, b]);
                }
            }
        }
    }

    private drawPath() {
        this.pathGraphics.clear();
        if (this.path.length < 2) return;

        this.pathGraphics.lineStyle(8, 0x4285F4, 0.9);
        const startPos = this.gridToWorld(this.path[0].x, this.path[0].y);
        this.pathGraphics.moveTo(startPos.x, startPos.y);

        for (let i = 1; i < this.path.length; i++) {
            const pos = this.gridToWorld(this.path[i].x, this.path[i].y);
            this.pathGraphics.lineTo(pos.x, pos.y);
        }
        this.pathGraphics.strokePath();

        // Destination marker
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

        const w = this.cellSize * 1.0;
        const l = this.cellSize * 1.3;

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillEllipse(0, 4, w * 0.7, l * 0.7);

        // Headlight beam
        const beamOriginY = -l / 2 + 10;
        const beam = this.add.graphics();
        beam.fillStyle(0xFFFFCC, 0.4);
        beam.beginPath();
        beam.moveTo(0, beamOriginY);
        beam.lineTo(-30, beamOriginY - 100);
        beam.lineTo(30, beamOriginY - 100);
        beam.closePath();
        beam.fillPath();

        // Tuktuk sprite
        const tuktuk = this.add.image(0, 0, 'tuktuk-body');
        tuktuk.setDisplaySize(w, l);
        tuktuk.setAngle(180);

        this.car.add([shadow, beam, tuktuk]);
        this.updateCarRotation();
    }

    private createAlertIndicator() {
        this.alertIndicator = this.add.container(0, 0);
        this.alertIndicator.setDepth(150);
        this.alertIndicator.setVisible(false);

        const bgCircle = this.add.circle(0, 0, 20, 0xFF4444);
        bgCircle.setStrokeStyle(3, 0xFFFFFF);

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
            this.alertIndicator.setPosition(this.car.x, this.car.y - 60);
            this.alertIndicator.setVisible(true);

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
        const rotations: Record<Heading, number> = { 'N': 0, 'E': 90, 'S': 180, 'W': 270 };
        this.car.setAngle(rotations[this.carHeading]);
    }

    // ========================================================================
    // UI CONTROLS
    // ========================================================================

    private createUI() {
        const { width, height } = this.scale;
        const buttonSize = Math.min(80, width * 0.2);
        const spacing = Math.min(30, width * 0.05);
        const panelY = height - (buttonSize + 40) - (height * 0.05);
        const panelWidth = buttonSize * 3 + spacing * 4;
        const panelHeight = buttonSize + 30;

        // Panel background
        const panelBg = this.add.graphics();
        panelBg.fillStyle(COLORS.UI_PANEL, 0.9);
        panelBg.fillRoundedRect(width / 2 - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20);
        panelBg.setDepth(150);

        const shadowG = this.add.graphics();
        shadowG.fillStyle(0x000000, 0.2);
        shadowG.fillRoundedRect(width / 2 - panelWidth / 2 + 4, panelY - panelHeight / 2 + 4, panelWidth, panelHeight, 20);
        shadowG.setDepth(149);

        this.leftButton = this.createDirectionButton(width / 2 - buttonSize - spacing, panelY, 'left', 'ซ้าย', buttonSize);
        this.forwardButton = this.createDirectionButton(width / 2, panelY, 'forward', 'START', buttonSize);
        this.rightButton = this.createDirectionButton(width / 2 + buttonSize + spacing, panelY, 'right', 'ขวา', buttonSize);

        // Dim buttons initially
        this.setButtonsEnabled(false);
    }

    private createDirectionButton(x: number, y: number, direction: Direction, symbol: string, size: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        container.setDepth(160);

        const bg = this.add.circle(0, 0, size / 2, COLORS.UI_PANEL);
        bg.setStrokeStyle(2, COLORS.UI_STROKE);

        const fontSize = symbol.length > 1 ? size * 0.25 : size * 0.4;
        const text = this.add.text(0, 0, symbol, {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: `${fontSize}px`,
            color: '#555555',
            fontStyle: 'bold',
            padding: { top: 5, bottom: 5, left: 5, right: 5 }
        }).setOrigin(0.5);

        container.add([bg, text]);

        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            bg.setFillStyle(0xFFFFFF);
            this.tweens.add({ targets: container, scale: 1.05, duration: 100 });
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0xF5F5F5);
            this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
        });

        bg.on('pointerdown', () => {
            if (this.gameOver) return;

            // Handle brake stop
            if (this.isBrakeStopped && direction === 'forward') {
                bg.setFillStyle(0x4285F4);
                text.setColor('#FFFFFF');
                this.tweens.add({
                    targets: container, scale: 0.9, duration: 50, yoyo: true,
                    onComplete: () => { bg.setFillStyle(0xF5F5F5); text.setColor('#555555'); }
                });
                this.handleForwardPress();
                return;
            }

            // Normal direction input
            this.handleDirectionInput(direction);

            bg.setFillStyle(0x4285F4);
            text.setColor('#FFFFFF');
            this.tweens.add({
                targets: container, scale: 0.9, duration: 50, yoyo: true,
                onComplete: () => {
                    this.time.delayedCall(100, () => {
                        bg.setFillStyle(0xF5F5F5);
                        text.setColor('#555555');
                    });
                }
            });
        });

        return container;
    }

    private setButtonsEnabled(enabled: boolean) {
        const alpha = enabled ? 1 : 0.4;
        [this.leftButton, this.rightButton, this.forwardButton].forEach(btn => {
            btn.setAlpha(alpha);
        });
    }

    private highlightButtons(highlight: boolean) {
        const alpha = highlight ? 1 : 0.5;
        [this.leftButton, this.forwardButton, this.rightButton].forEach(btn => {
            btn.setAlpha(alpha);
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

    // ========================================================================
    // INSTRUCTION OVERLAY
    // ========================================================================

    private createInstructionOverlay() {
        const { width, height } = this.scale;

        this.instructionOverlay = this.add.container(0, 0);
        this.instructionOverlay.setDepth(400);

        // Position panel between grid bottom and button panel
        const gridBottom = this.gridOffsetY + this.GRID_SIZE * this.cellSize;
        const buttonSize = Math.min(80, width * 0.2);
        const buttonPanelY = height - (buttonSize + 40) - (height * 0.05);
        const gapCenter = (gridBottom + buttonPanelY) / 2;

        const panelWidth = Math.min(width * 0.95, 500);
        const panelHeight = Math.min(120, (buttonPanelY - gridBottom) * 0.85);
        const panelX = width / 2 - panelWidth / 2;
        const panelY = gapCenter - panelHeight / 2;

        this.instructionPanel = this.add.graphics();
        this.instructionPanel.fillStyle(0x000000, 0.85);
        this.instructionPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);
        this.instructionPanel.lineStyle(3, 0x4285F4, 1);
        this.instructionPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);

        const fontSize = Math.min(22, Math.max(16, panelHeight * 0.16));
        this.instructionText = this.add.text(width / 2, panelY + panelHeight / 2, '', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: `${fontSize}px`,
            color: '#FFFFFF',
            align: 'center',
            wordWrap: { width: panelWidth - 40 },
            lineSpacing: 6,
            padding: { top: 8, bottom: 8, left: 8, right: 8 }
        }).setOrigin(0.5).setDepth(401);

        this.instructionOverlay.add([this.instructionPanel, this.instructionText]);
    }

    private showInstruction(text: string) {
        this.instructionText.setText(text);
        this.instructionOverlay.setVisible(true);
        this.instructionOverlay.setAlpha(0);
        this.tweens.add({
            targets: this.instructionOverlay,
            alpha: 1,
            duration: 300
        });
    }

    private hideInstruction() {
        this.tweens.add({
            targets: this.instructionOverlay,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                this.instructionOverlay.setVisible(false);
            }
        });
    }

    // ========================================================================
    // TUTORIAL PHASES
    // ========================================================================

    private startPhase1() {
        this.currentPhase = 1;

        // Generate and show a simple path for visual context
        this.generateTutorialPath([
            { x: 3, y: 6, dir: 'N', turn: false },
            { x: 3, y: 5, dir: 'N', turn: false },
            { x: 3, y: 4, dir: 'N', turn: true, turnDir: 'right' },
            { x: 4, y: 4, dir: 'E', turn: false },
            { x: 5, y: 4, dir: 'E', turn: true, turnDir: 'left' },
            { x: 5, y: 3, dir: 'N', turn: false },
            { x: 5, y: 2, dir: 'N', turn: false },
        ]);
        this.drawPath();

        this.showInstruction('ยินดีต้อนรับ!\nคุณคือคนขับตุ๊กตุ๊ก 🛺');

        this.time.delayedCall(3000, () => {
            this.showInstruction('ภารกิจคือ ขับตามเส้นทางสีน้ำเงิน\nไปยังจุดหมายปลายทาง (วงกลมแดง)');

            // Highlight the blue path by pulsing it
            this.tweens.add({
                targets: this.pathGraphics,
                alpha: { from: 1, to: 0.3 },
                duration: 600,
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    this.pathGraphics.setAlpha(1);
                }
            });

            this.time.delayedCall(4000, () => {
                this.startPhase2();
            });
        });
    }

    private startPhase2() {
        this.currentPhase = 2;

        this.showInstruction('ใช้ปุ่มด้านล่างเพื่อบังคับทิศทาง\nซ้าย  ·  START  ·  ขวา');

        // Highlight buttons one by one
        this.setButtonsEnabled(true);

        // Point at left, then forward, then right
        this.pointAtButton(this.leftButton, () => {
            this.time.delayedCall(800, () => {
                this.pointAtButton(this.forwardButton, () => {
                    this.time.delayedCall(800, () => {
                        this.pointAtButton(this.rightButton, () => {
                            this.time.delayedCall(1000, () => {
                                this.hideHandIcon();
                                this.startPhase3();
                            });
                        });
                    });
                });
            });
        });
    }

    private startPhase3() {
        this.currentPhase = 3;

        this.showInstruction('เมื่อเห็นเครื่องหมาย ❗ ปรากฏ\nให้กดทิศทางตามเส้นทาง ก่อนถึงทางแยก');

        this.time.delayedCall(3500, () => {
            this.showInstruction('ลองดูนะ! เส้นทางจะเลี้ยวขวา\nกดปุ่ม "ขวา" เมื่อเห็น ❗');

            // Setup a simple guided turn: car goes N, needs to turn right
            this.resetCar(3, 6, 'N');
            this.generateTutorialPath([
                { x: 3, y: 6, dir: 'N', turn: false },
                { x: 3, y: 5, dir: 'N', turn: false },
                { x: 3, y: 4, dir: 'N', turn: true, turnDir: 'right' },
                { x: 4, y: 4, dir: 'E', turn: false },
                { x: 5, y: 4, dir: 'E', turn: false },
            ]);
            this.drawPath();

            this.setButtonsEnabled(true);

            // Start the guided drive
            this.time.delayedCall(1500, () => {
                this.gameStarted = true;
                this.findNextIntersection();
                this.startContinuousMovement();
            });
        });
    }

    private startPhase4() {
        this.currentPhase = 4;
        this.gameStarted = false;
        this.isMoving = false;
        this.targetPosition = null;

        this.showInstruction('เก่งมาก! 🎉\nต่อไป: บางครั้งรถจะหยุดกะทันหัน\nต้องกดปุ่ม "START" เพื่อขับต่อ');

        this.time.delayedCall(4000, () => {
            this.showInstruction('ลองกดปุ่ม "START" เมื่อรถหยุด!');

            // Setup a short path with a forced brake stop
            this.resetCar(3, 6, 'N');
            this.generateTutorialPath([
                { x: 3, y: 6, dir: 'N', turn: false },
                { x: 3, y: 5, dir: 'N', turn: false },
                { x: 3, y: 4, dir: 'N', turn: false },
                { x: 3, y: 3, dir: 'N', turn: false },
            ]);
            this.drawPath();

            // Force a brake stop at segment 2
            this.brakeStopSegments = [2];
            this.setButtonsEnabled(true);

            this.time.delayedCall(1500, () => {
                this.gameStarted = true;
                this.findNextIntersection();
                this.startContinuousMovement();
            });
        });
    }

    private startPhase5() {
        this.currentPhase = 5;
        this.gameStarted = false;
        this.isMoving = false;
        this.targetPosition = null;
        this.correctTurnsInPractice = 0;
        this.totalTurnsInPractice = 0;
        this.practiceHintShown = false;

        this.showInstruction('เยี่ยม! 🚀\nลองฝึกขับอีกรอบ\nเลี้ยวตามเส้นทาง + หยุดเบรก');

        this.time.delayedCall(3000, () => {
            // Practice run: 3 turns + 1 brake stop
            this.resetCar(3, 6, 'N');
            this.generateTutorialPath([
                { x: 3, y: 6, dir: 'N', turn: false },
                { x: 3, y: 5, dir: 'N', turn: false },
                { x: 3, y: 4, dir: 'N', turn: true, turnDir: 'left' },
                { x: 2, y: 4, dir: 'W', turn: false },
                { x: 1, y: 4, dir: 'W', turn: true, turnDir: 'right' },
                { x: 1, y: 3, dir: 'N', turn: false },
                { x: 1, y: 2, dir: 'N', turn: true, turnDir: 'right' },
                { x: 2, y: 2, dir: 'E', turn: false },
                { x: 3, y: 2, dir: 'E', turn: false },
            ]);
            this.drawPath();

            // Add a brake stop at a non-intersection segment
            this.brakeStopSegments = [5];
            this.setButtonsEnabled(true);

            this.showInstruction('พร้อมแล้ว... ไปเลย! 🛺');

            this.time.delayedCall(2000, () => {
                this.hideInstruction();
                this.gameStarted = true;
                this.findNextIntersection();
                this.startContinuousMovement();
            });
        });
    }

    // ========================================================================
    // PATH GENERATION (Scripted for tutorial)
    // ========================================================================

    private generateTutorialPath(segments: Array<{ x: number; y: number; dir: Heading; turn: boolean; turnDir?: Direction }>) {
        this.path = [];
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            this.path.push({
                x: seg.x,
                y: seg.y,
                direction: seg.dir,
                isIntersection: seg.turn,
                turnRequired: seg.turnDir
            });
        }
    }

    // ========================================================================
    // CAR MOVEMENT (Simplified from GameScene)
    // ========================================================================

    private resetCar(gridX: number, gridY: number, heading: Heading) {
        this.carGridX = gridX;
        this.carGridY = gridY;
        this.carHeading = heading;
        this.currentPathIndex = 0;
        this.isMoving = false;
        this.targetPosition = null;
        this.queuedDirection = null;
        this.isApproachingIntersection = false;
        this.upcomingIntersectionIndex = -1;
        this.isBrakeStopped = false;
        this.brakeStopSegments = [];

        const pos = this.gridToWorld(gridX, gridY);
        this.car.setPosition(pos.x, pos.y);
        this.updateCarRotation();

        // Hide alert indicator
        this.alertIndicator.setVisible(false);
        this.tweens.killTweensOf(this.alertIndicator);
        this.alertIndicator.setScale(1);
    }

    private findNextIntersection() {
        for (let i = this.currentPathIndex + 1; i < this.path.length; i++) {
            if (this.path[i].isIntersection) {
                this.upcomingIntersectionIndex = i;
                return;
            }
        }
        this.upcomingIntersectionIndex = -1;
    }

    private startContinuousMovement() {
        if (this.currentPathIndex >= this.path.length - 1) {
            this.handlePracticeVictory();
            return;
        }
        this.moveToNextSegment();
    }

    private moveToNextSegment() {
        if (this.currentPathIndex >= this.path.length - 1) {
            this.handlePracticeVictory();
            return;
        }

        this.currentPathIndex++;
        const nextSeg = this.path[this.currentPathIndex];

        this.targetPosition = this.gridToWorld(nextSeg.x, nextSeg.y);
        this.carGridX = nextSeg.x;
        this.carGridY = nextSeg.y;
        this.carHeading = nextSeg.direction;
        this.updateCarRotation();

        // Check brake stop
        this.checkBrakeStop();
        if (this.isBrakeStopped) return;
        this.isMoving = true;
    }

    private moveCarTowardsTarget(delta: number) {
        if (!this.targetPosition) return;

        const speedScale = this.cellSize / 80;
        const speed = 50 * speedScale; // Slow speed for tutorial

        const dx = this.targetPosition.x - this.car.x;
        const dy = this.targetPosition.y - this.car.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            this.car.setPosition(this.targetPosition.x, this.targetPosition.y);

            const currentSeg = this.path[this.currentPathIndex];
            if (currentSeg.isIntersection) {
                if (this.queuedDirection) {
                    this.processQueuedDirection();
                } else {
                    // No input - in tutorial, give another chance
                    this.isMoving = false;
                    this.targetPosition = null;

                    if (this.currentPhase === 3) {
                        // Give hint for guided turn
                        this.showInstruction('หมดเวลา! ลองอีกครั้ง\nกดปุ่ม "ขวา" เมื่อเห็น ❗');
                        this.time.delayedCall(2000, () => {
                            this.resetCar(3, 6, 'N');
                            this.generateTutorialPath([
                                { x: 3, y: 6, dir: 'N', turn: false },
                                { x: 3, y: 5, dir: 'N', turn: false },
                                { x: 3, y: 4, dir: 'N', turn: true, turnDir: 'right' },
                                { x: 4, y: 4, dir: 'E', turn: false },
                                { x: 5, y: 4, dir: 'E', turn: false },
                            ]);
                            this.drawPath();
                            this.gameStarted = true;
                            this.findNextIntersection();
                            this.startContinuousMovement();
                        });
                    } else if (this.currentPhase === 5) {
                        // Practice mode: retry from same position
                        this.showInstruction('พลาด! ลองใหม่อีกครั้ง');
                        this.time.delayedCall(2000, () => {
                            this.startPhase5();
                        });
                    }
                    return;
                }
            }

            if (this.currentPathIndex >= this.path.length - 1) {
                this.isMoving = false;
                this.targetPosition = null;
                this.handlePracticeVictory();
            } else {
                this.moveToNextSegment();
            }
        } else {
            const moveDistance = speed * (delta / 1000);
            const ratio = Math.min(moveDistance / distance, 1);
            this.car.x += dx * ratio;
            this.car.y += dy * ratio;
        }
    }

    private checkApproachingIntersection() {
        if (this.upcomingIntersectionIndex < 0) return;
        if (this.gameOver) return;
        if (this.isApproachingIntersection) return;

        const intersection = this.path[this.upcomingIntersectionIndex];
        const intersectionPos = this.gridToWorld(intersection.x, intersection.y);

        const dx = intersectionPos.x - this.car.x;
        const dy = intersectionPos.y - this.car.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const speed = 50 * (this.cellSize / 80);
        const timeToIntersectionMs = (distance / speed) * 1000;

        if (timeToIntersectionMs <= this.approachTimeMs) {
            this.isApproachingIntersection = true;
            this.highlightButtons(true);

            // In phase 3, show hint for the correct direction
            if (this.currentPhase === 3) {
                this.showTurnHint('right');
            } else if (this.currentPhase === 5 && !this.practiceHintShown) {
                // Show hint for upcoming turn in practice
                const turnDir = intersection.turnRequired;
                if (turnDir) {
                    this.showPracticeHint(turnDir);
                }
            }
        }
    }

    private showTurnHint(direction: Direction) {
        const targetBtn = direction === 'left' ? this.leftButton :
            direction === 'right' ? this.rightButton : this.forwardButton;

        this.pointAtButton(targetBtn, () => {
            // Keep pointing until input received
        });
    }

    private showPracticeHint(direction: Direction) {
        // Brief hint text in the instruction area
        const dirText = direction === 'left' ? 'ซ้าย' :
            direction === 'right' ? 'ขวา' : 'START';
        this.showInstruction(`เลี้ยว${dirText}!`);

        this.time.delayedCall(1500, () => {
            if (this.currentPhase === 5) {
                this.hideInstruction();
            }
        });
    }

    // ========================================================================
    // DIRECTION INPUT & BRAKE
    // ========================================================================

    private handleDirectionInput(direction: Direction) {
        if (this.gameOver) return;
        if (!this.isApproachingIntersection) return;
        if (this.queuedDirection) return;

        this.queuedDirection = direction;
        this.showFeedback(direction === 'left' ? '◀' : direction === 'right' ? '▶' : '▲', 0x4285F4);

        this.alertIndicator.setVisible(false);
        this.tweens.killTweensOf(this.alertIndicator);
        this.highlightButtons(false);
        this.hideHandIcon();
    }

    private processQueuedDirection() {
        const currentSeg = this.path[this.currentPathIndex];
        const isCorrect = this.queuedDirection === currentSeg.turnRequired;

        this.queuedDirection = null;
        this.isApproachingIntersection = false;
        this.highlightButtons(false);
        this.findNextIntersection();

        if (isCorrect) {
            this.playSound('correct-turn');
            this.showFeedback('✓', 0x58CC02);

            if (this.currentPhase === 5) {
                this.correctTurnsInPractice++;
                this.totalTurnsInPractice++;
            }

            // Phase 3: guided turn success -> go to phase 4
            if (this.currentPhase === 3) {
                this.time.delayedCall(500, () => {
                    this.gameStarted = false;
                    this.isMoving = false;
                    this.targetPosition = null;
                    this.startPhase4();
                });
                return;
            }
        } else {
            this.playSound('wrong-turn');
            this.showFeedback('✗', 0xFF4444);

            if (this.currentPhase === 5) {
                this.totalTurnsInPractice++;
            }

            // In tutorial, don't end game - retry
            if (this.currentPhase === 3) {
                this.isMoving = false;
                this.targetPosition = null;
                this.showInstruction('ผิดทาง! ลองใหม่\nเส้นทางเลี้ยวขวา กดปุ่ม "ขวา"');
                this.time.delayedCall(2000, () => {
                    this.gameStarted = false;
                    this.startPhase3();
                });
                return;
            } else if (this.currentPhase === 5) {
                // Practice: retry from beginning
                this.isMoving = false;
                this.targetPosition = null;
                this.showInstruction('พลาด! ลองใหม่อีกครั้ง');
                this.time.delayedCall(2000, () => {
                    this.gameStarted = false;
                    this.startPhase5();
                });
                return;
            }
        }
    }

    // ========================================================================
    // BRAKE STOP (Simplified)
    // ========================================================================

    private checkBrakeStop() {
        if (this.isBrakeStopped) return;
        if (this.brakeStopSegments.length === 0) return;
        if (!this.brakeStopSegments.includes(this.currentPathIndex)) return;

        this.triggerBrakeStop();
    }

    private triggerBrakeStop() {
        this.isBrakeStopped = true;
        this.isMoving = false;

        // Snap car to current segment position so it doesn't float
        const pos = this.gridToWorld(this.carGridX, this.carGridY);
        this.car.setPosition(pos.x, pos.y);
        this.targetPosition = null;

        if (this.queuedDirection) {
            this.queuedDirection = null;
            this.isApproachingIntersection = false;
        }

        // Create stop sign
        this.createStopSign();

        // Show message
        this.showInstruction('รถหยุด! กดปุ่ม "START" เพื่อขับต่อ');

        // Highlight forward button
        this.highlightForwardButton(true);
        this.pointAtButton(this.forwardButton, () => { });

        // Smoke effect
        this.triggerSmokeEffect(this.car.x, this.car.y);

        // Timer (generous for tutorial)
        this.brakeStopTimer = this.time.delayedCall(6000, () => {
            if (this.isBrakeStopped) {
                // In tutorial, just retry
                this.isBrakeStopped = false;
                this.removeStopSign();
                this.highlightForwardButton(false);
                this.hideHandIcon();

                this.showInstruction('หมดเวลา! ลองอีกครั้ง\nกดปุ่ม "START" ให้เร็วขึ้น');
                this.time.delayedCall(2000, () => {
                    if (this.currentPhase === 4) {
                        this.gameStarted = false;
                        this.startPhase4();
                    } else if (this.currentPhase === 5) {
                        this.gameStarted = false;
                        this.startPhase5();
                    }
                });
            }
        });
    }

    private handleForwardPress() {
        if (!this.isBrakeStopped) return;

        if (this.brakeStopTimer) {
            this.brakeStopTimer.destroy();
            this.brakeStopTimer = null;
        }

        this.isBrakeStopped = false;
        this.brakeStopSegments = this.brakeStopSegments.filter(s => s !== this.currentPathIndex);

        // Remove stop sign
        this.removeStopSign();

        // Feedback
        this.showFeedback('✓', 0x58CC02);
        this.highlightForwardButton(false);
        this.hideHandIcon();

        // Phase 4: brake stop success -> go to phase 5
        if (this.currentPhase === 4) {
            this.showInstruction('เก่งมาก! 🎉');
            this.time.delayedCall(1500, () => {
                this.gameStarted = false;
                this.isMoving = false;
                this.targetPosition = null;
                this.startPhase5();
            });
            return;
        }

        // Continue moving
        this.time.delayedCall(500, () => {
            this.moveToNextSegment();
        });
    }

    private createStopSign() {
        let signX = this.car.x;
        let signY = this.car.y;
        const offset = this.cellSize * 0.8;

        switch (this.carHeading) {
            case 'N': signY -= offset; break;
            case 'S': signY += offset; break;
            case 'E': signX += offset; break;
            case 'W': signX -= offset; break;
        }

        this.stopSignContainer = this.add.container(signX, signY);
        this.stopSignContainer.setDepth(150);

        const poleHeight = 40;
        const pole = this.add.rectangle(0, 25, 6, poleHeight, 0x555555);
        pole.setStrokeStyle(1, 0x333333);

        const signRadius = 25;
        const octagon = this.add.graphics();
        octagon.fillStyle(0xCC0000, 1);
        octagon.lineStyle(3, COLORS.ROAD, 1);

        const points: Phaser.Geom.Point[] = [];
        for (let i = 0; i < 8; i++) {
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

        const stopText = this.add.text(0, 0, 'หยุด', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '18px',
            color: '#FFFFFF',
            fontStyle: 'bold',
            padding: { top: 2, bottom: 2, left: 2, right: 2 }
        }).setOrigin(0.5);

        this.stopSignContainer.add([pole, octagon, stopText]);

        // Entrance animation
        this.stopSignContainer.setScale(0);
        this.tweens.add({
            targets: this.stopSignContainer,
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
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

    // ========================================================================
    // VICTORY / TUTORIAL COMPLETE
    // ========================================================================

    private handlePracticeVictory() {
        this.gameStarted = false;
        this.isMoving = false;

        if (this.currentPhase === 4) {
            // Brake stop phase completion - car reached end of path
            // This means they passed through but startPhase5 is handled in handleForwardPress
            return;
        }

        if (this.currentPhase === 5) {
            // Practice complete!
            this.showInstruction('ยอดเยี่ยม! 🎊\nคุณพร้อมสำหรับของจริงแล้ว!');
            this.playSound('level-pass');
            this.triggerConfetti(this.car.x, this.car.y);

            this.time.delayedCall(3000, () => {
                this.completeTutorial();
            });
            return;
        }

        // Phase 3: guided turn - car finished path segment
        // This means the turn was successful and traversal completed
        if (this.currentPhase === 3) {
            this.gameStarted = false;
            this.isMoving = false;
            this.targetPosition = null;
            this.startPhase4();
        }
    }

    private completeTutorial() {
        // Stop sounds
        this.sound.stopAll();

        const onTutorialComplete = this.registry.get('onTutorialComplete');
        if (onTutorialComplete) {
            onTutorialComplete();
        } else {
            // Fallback
            this.scene.start('TaxiDriverGameScene');
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private pointAtButton(button: Phaser.GameObjects.Container, onComplete?: () => void) {
        this.handIcon.setPosition(button.x, button.y + 55);
        this.handIcon.setVisible(true);
        this.handIcon.setDepth(500);

        this.tweens.killTweensOf(this.handIcon);
        this.tweens.add({
            targets: this.handIcon,
            y: button.y + 50,
            duration: 400,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                if (onComplete) onComplete();
            }
        });
    }

    private hideHandIcon() {
        if (this.handIcon) {
            this.tweens.killTweensOf(this.handIcon);
            this.handIcon.setVisible(false);
        }
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

    private layoutGame() {
        this.drawRoads();
        this.drawPath();
        this.createBuildings();
        const pos = this.gridToWorld(this.carGridX, this.carGridY);
        this.car.setPosition(pos.x, pos.y);
    }

    private createParticleTextures() {
        if (!this.textures.exists('td-smoke')) {
            const graphics = this.make.graphics({ x: 0, y: 0 });

            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillCircle(16, 16, 14);
            graphics.generateTexture('td-smoke', 32, 32);
            graphics.clear();

            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillRect(0, 0, 16, 8);
            graphics.generateTexture('td-confetti', 16, 8);
            graphics.clear();

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

    private triggerConfetti(x: number, y: number) {
        this.createParticleTextures();

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
    }
}
