import Phaser from 'phaser';
import { getLevelData } from './levels';
import { BridgeSegment, LevelData, GameState } from './types';
import { PolybridgeGameConstants } from './constants';

const { SEGMENT_WIDTH, SEGMENT_COLOR, DEPTH } = PolybridgeGameConstants;

export class PolybridgeGameScene extends Phaser.Scene {
    // Level Data
    private levelData!: LevelData;
    private currentLevel: number = 1;

    // Game State
    private gameState: GameState = {
        isPlaying: false,
        carMoving: false,
        gameOver: false,
        success: false
    };

    // Visual Objects
    private bridgeSegments: { segment: BridgeSegment; graphics: Phaser.GameObjects.Graphics; hitZone: Phaser.GameObjects.Zone }[] = [];
    private car!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    private startButton!: Phaser.GameObjects.Container;
    private platformLeftImg!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    private platformRightImg!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

    // Responsive Layout
    private gameWidth: number = 800;
    private gameHeight: number = 600;
    private centerX: number = 400;
    private centerY: number = 300;
    private bridgeY: number = 250;  // Y level where bridge sits
    private platformWidth: number = 150;
    private platformHeight: number = 120;

    // Timer
    private startTime: number = 0;
    private elapsedTime: number = 0;

    constructor() {
        super({ key: 'PolybridgeGame' });
    }

    preload() {
        this.load.image('car', '/assets/game-07-polybridge/car.webp');
        this.load.image('ground', '/assets/game-07-polybridge/ground.webp');
    }

    create() {
        this.currentLevel = this.game.registry.get('level') ?? 1;

        const rawLevelData = getLevelData(this.currentLevel);
        if (!rawLevelData) {
            console.error('Level not found:', this.currentLevel);
            return;
        }

        // Clone level data to avoid mutating original
        this.levelData = JSON.parse(JSON.stringify(rawLevelData));

        // Reset state
        this.gameState = {
            isPlaying: true,
            carMoving: false,
            gameOver: false,
            success: false
        };
        this.startTime = Date.now();
        this.bridgeSegments = [];

        // Calculate responsive layout
        this.calculateLayout();

        // Draw scene
        this.createBackground();
        this.createPlatforms();
        this.createBridgeSegments();
        this.createCar();
        this.createUI();

        // Handle resize
        this.scale.on('resize', () => this.handleResize());
    }

    private calculateLayout() {
        const { width, height } = this.scale;
        this.gameWidth = width;
        this.gameHeight = height;
        this.centerX = width / 2;
        this.centerY = height / 2;

        // Detect portrait vs landscape
        const isPortrait = height > width;

        // Bridge sits more centered on screen
        // Leave space for header (~100px) and button (~80px)
        this.bridgeY = isPortrait ? height * 0.40 : height * 0.45;

        // Platform size - 20% smaller than before, responsive
        const basePlatformWidth = isPortrait ? 80 : 120;
        const basePlatformHeight = isPortrait ? 80 : 100;
        const scaleFactor = Math.min(width / 400, height / 600, 1.2); // Cap scaling
        this.platformWidth = basePlatformWidth * scaleFactor;
        this.platformHeight = basePlatformHeight * scaleFactor;

        // Bridge should span between platforms
        // Available width for bridge = total width - 2 * platform width - margins
        const margin = isPortrait ? 10 : 30;
        const availableForBridge = width - (2 * this.platformWidth) - (2 * margin);

        // Scale segment lengths to fill available space
        const numSegments = this.levelData.segments.length;
        const segmentLength = Math.floor(availableForBridge / numSegments);

        // Update segment lengths
        this.levelData.segments.forEach(s => {
            s.length = Math.max(60, segmentLength); // Minimum 60px per segment
        });

        // Recalculate total bridge length
        const totalBridgeLength = this.levelData.segments.reduce((sum, s) => sum + s.length, 0);

        // Platform positions - directly adjacent to bridge ends
        const leftPlatformCenterX = margin + this.platformWidth / 2;
        const rightPlatformCenterX = width - margin - this.platformWidth / 2;

        // Update level data with calculated positions
        this.levelData.startPlatform = {
            x: leftPlatformCenterX - this.platformWidth / 2,
            y: this.bridgeY,
            width: this.platformWidth,
            height: this.platformHeight
        };
        this.levelData.endPlatform = {
            x: rightPlatformCenterX - this.platformWidth / 2,
            y: this.bridgeY,
            width: this.platformWidth,
            height: this.platformHeight
        };

        // Car positions
        this.levelData.carStart = {
            x: leftPlatformCenterX,
            y: this.bridgeY
        };
        this.levelData.carEnd = {
            x: rightPlatformCenterX,
            y: this.bridgeY
        };

        // Bridge starts at right edge of left platform, ends at left edge of right platform
        const bridgeStartX = leftPlatformCenterX + this.platformWidth / 2;
        const bridgeEndX = rightPlatformCenterX - this.platformWidth / 2;
        const actualBridgeWidth = bridgeEndX - bridgeStartX;

        // Recalculate segment lengths to exactly fit
        const exactSegmentLength = actualBridgeWidth / numSegments;
        this.levelData.segments.forEach(s => {
            s.length = exactSegmentLength;
        });

        // Position segments as connected chain from left platform to right platform
        let currentX = bridgeStartX;
        this.levelData.segments.forEach((segment) => {
            segment.x = currentX + segment.length / 2; // Pivot at center
            segment.y = this.bridgeY;
            currentX += segment.length;
        });
    }

    private handleResize() {
        // Recalculate and redraw everything
        this.calculateLayout();

        // Clear and redraw
        this.children.removeAll();
        this.bridgeSegments = [];

        this.createBackground();
        this.createPlatforms();
        this.createBridgeSegments();
        this.createCar();
        this.createUI();
    }

    private createBackground() {
        const { width, height } = this.scale;

        // Sky background
        this.add.rectangle(width / 2, height / 2, width, height, 0x87CEEB).setDepth(DEPTH.BACKGROUND);

        // Water starts at bottom of platforms (bridgeY + platformHeight)
        const waterY = this.bridgeY + this.platformHeight;
        const water = this.add.graphics();
        water.fillStyle(0x4A90D9, 1);
        water.fillRect(0, waterY, width, height - waterY);
        water.setDepth(DEPTH.WATER);

        // Animated waves
        this.createAnimatedWaves(waterY, width);
    }

    private createAnimatedWaves(waterY: number, width: number) {
        // Create multiple wave lines that animate
        for (let i = 0; i < 3; i++) {
            const yBase = waterY + 10 + i * 20;

            // Create a container for the wave
            const waveContainer = this.add.container(0, 0);
            waveContainer.setDepth(DEPTH.WATER + 1);

            // Draw the wave using graphics
            const waveGraphics = this.add.graphics();
            waveGraphics.lineStyle(2, 0x6BB3F0, 0.6 - i * 0.15);
            waveGraphics.beginPath();

            // Draw longer wave so it can scroll
            for (let x = -100; x <= width + 100; x += 8) {
                const y = yBase + Math.sin(x * 0.025) * 5;
                if (x === -100) {
                    waveGraphics.moveTo(x, y);
                } else {
                    waveGraphics.lineTo(x, y);
                }
            }
            waveGraphics.strokePath();
            waveContainer.add(waveGraphics);

            // Animate the wave horizontally
            this.tweens.add({
                targets: waveContainer,
                x: { from: 0, to: -40 },
                duration: 2000 + i * 500,
                repeat: -1,
                ease: 'Linear'
            });
        }
    }

    private createPlatforms() {
        const { startPlatform, endPlatform } = this.levelData;

        const createPlatform = (p: typeof startPlatform) => {
            const centerX = p.x + p.width / 2;
            const centerY = p.y + p.height / 2;

            if (this.textures.exists('ground')) {
                const img = this.add.image(centerX, centerY, 'ground');
                img.setDisplaySize(p.width, p.height);
                img.setDepth(DEPTH.PLATFORM);
                return img;
            } else {
                // Fallback: brown rectangle with grass top
                const graphics = this.add.graphics();
                graphics.setDepth(DEPTH.PLATFORM);

                // Dirt
                graphics.fillStyle(0x8B4513, 1);
                graphics.fillRect(p.x, p.y, p.width, p.height);

                // Grass top
                graphics.fillStyle(0x228B22, 1);
                graphics.fillRect(p.x, p.y, p.width, 15);

                // Return a placeholder
                return this.add.rectangle(centerX, centerY, p.width, p.height, 0x8B4513, 0).setDepth(DEPTH.PLATFORM);
            }
        };

        this.platformLeftImg = createPlatform(startPlatform);
        this.platformRightImg = createPlatform(endPlatform);
    }

    private createBridgeSegments() {
        for (const segment of this.levelData.segments) {
            const graphics = this.add.graphics();
            graphics.setDepth(DEPTH.BRIDGE);

            // Create interactive zone for clicking
            const hitZone = this.add.zone(segment.x, segment.y, segment.length + 30, 50)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.rotateSegment(segment));
            hitZone.setDepth(DEPTH.BRIDGE + 1);

            this.bridgeSegments.push({ segment, graphics, hitZone });
            this.drawSegment(segment, graphics);
        }
    }

    private drawSegment(segment: BridgeSegment, graphics: Phaser.GameObjects.Graphics) {
        graphics.clear();

        const angleRad = Phaser.Math.DegToRad(segment.currentAngle);
        const halfLength = segment.length / 2;

        // Calculate endpoints
        const x1 = segment.x - Math.cos(angleRad) * halfLength;
        const y1 = segment.y - Math.sin(angleRad) * halfLength;
        const x2 = segment.x + Math.cos(angleRad) * halfLength;
        const y2 = segment.y + Math.sin(angleRad) * halfLength;

        // Draw bridge segment - ALWAYS BLACK, no hint colors
        graphics.lineStyle(SEGMENT_WIDTH, SEGMENT_COLOR, 1);
        graphics.beginPath();
        graphics.moveTo(x1, y1);
        graphics.lineTo(x2, y2);
        graphics.strokePath();

        // Draw small pivot indicator (subtle)
        graphics.fillStyle(0x444444, 1);
        graphics.fillCircle(segment.x, segment.y, 4);
    }

    private rotateSegment(segment: BridgeSegment) {
        if (this.gameState.carMoving || this.gameState.gameOver) return;

        // Rotate by step amount
        segment.currentAngle = (segment.currentAngle + segment.rotationStep) % 360;
        if (segment.currentAngle < 0) segment.currentAngle += 360;

        // Redraw
        const found = this.bridgeSegments.find(s => s.segment.id === segment.id);
        if (found) {
            this.drawSegment(segment, found.graphics);
        }
    }

    /**
     * Check if segment is at correct angle
     * Treats 0° and 180° as equivalent (symmetry for straight lines)
     */
    private isSegmentCorrect(segment: BridgeSegment): boolean {
        // Normalize to 0-180 range (because 0° and 180° are equivalent for lines)
        const normalize = (angle: number): number => {
            let a = angle % 360;
            if (a < 0) a += 360;
            if (a >= 180) a -= 180;
            return a;
        };

        const current = normalize(segment.currentAngle);
        const correct = normalize(segment.correctAngle);

        const tolerance = 5;
        const diff = Math.abs(current - correct);

        return diff <= tolerance || diff >= (180 - tolerance);
    }

    private areAllSegmentsCorrect(): boolean {
        return this.levelData.segments.every(seg => this.isSegmentCorrect(seg));
    }

    private createCar() {
        const { carStart } = this.levelData;
        const { width, height } = this.scale;
        const isPortrait = height > width;

        // Scale car based on screen size - smaller on mobile
        const carScale = isPortrait ? 0.055 : 0.07;

        if (this.textures.exists('car')) {
            this.car = this.add.image(carStart.x, carStart.y, 'car');
            this.car.setOrigin(0.5, 1);
            this.car.setScale(carScale);
            this.car.setDepth(DEPTH.CAR);
        } else {
            // Fallback placeholder - also smaller on mobile
            const carWidth = isPortrait ? 30 : 40;
            const carHeight = isPortrait ? 18 : 25;
            this.car = this.add.rectangle(carStart.x, carStart.y - carHeight / 2, carWidth, carHeight, 0xE74C3C);
            this.car.setDepth(DEPTH.CAR);
        }
    }

    private createUI() {
        const { width, height } = this.scale;

        // START button at bottom center
        const btnWidth = 120;
        const btnHeight = 45;
        const btnX = width / 2;
        const btnY = height - 50;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x58CC02, 1);
        btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        btnBg.lineStyle(3, 0x46A302, 1);
        btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

        const btnText = this.add.text(0, 0, 'Start', {
            fontSize: '24px',
            fontFamily: 'Sarabun, Arial, sans-serif',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.startButton = this.add.container(btnX, btnY, [btnBg, btnText]);
        this.startButton.setSize(btnWidth, btnHeight);
        this.startButton.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.onStartPressed())
            .on('pointerover', () => {
                btnBg.clear();
                btnBg.fillStyle(0x46A302, 1);
                btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
            })
            .on('pointerout', () => {
                btnBg.clear();
                btnBg.fillStyle(0x58CC02, 1);
                btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
                btnBg.lineStyle(3, 0x46A302, 1);
                btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
            });

        this.startButton.setDepth(DEPTH.UI);
    }

    private onStartPressed() {
        if (this.gameState.carMoving || this.gameState.gameOver) return;

        this.gameState.carMoving = true;
        this.startButton.setVisible(false);

        this.moveCarAlongBridge();
    }

    private moveCarAlongBridge() {
        const { carEnd } = this.levelData;
        const allCorrect = this.areAllSegmentsCorrect();

        if (allCorrect) {
            // SUCCESS: Car moves smoothly across
            this.tweens.add({
                targets: this.car,
                x: carEnd.x,
                y: carEnd.y,
                duration: 2000,
                ease: 'Sine.easeInOut',
                onComplete: () => this.onWin()
            });
        } else {
            // FAILURE: Find first wrong segment
            const wrongSegment = this.levelData.segments.find(seg => !this.isSegmentCorrect(seg));

            if (wrongSegment) {
                this.tweens.add({
                    targets: this.car,
                    x: wrongSegment.x,
                    y: wrongSegment.y - 15,
                    duration: 800,
                    ease: 'Sine.easeIn',
                    onComplete: () => this.onCrash()
                });
            }
        }
    }

    private onCrash() {
        // Shake the car
        this.tweens.add({
            targets: this.car,
            x: { value: this.car.x + 8, yoyo: true, repeat: 4, duration: 40 },
            y: { value: this.car.y + 4, yoyo: true, repeat: 4, duration: 40 },
            onComplete: () => this.onLose()
        });

        this.cameras.main.flash(250, 255, 100, 100);
    }

    private onWin() {
        this.elapsedTime = (Date.now() - this.startTime) / 1000;
        this.gameState.gameOver = true;
        this.gameState.success = true;

        const timeLimit = this.levelData.timeLimit ?? 60;
        const timeRatio = this.elapsedTime / timeLimit;

        let stars = 1;
        if (timeRatio <= 0.5) {
            stars = 3;
        } else if (timeRatio <= 0.75) {
            stars = 2;
        }

        const onGameOver = this.game.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: true,
                level: this.currentLevel,
                stars,
                score: Math.round(1000 / timeRatio),
                stat_planning: 80 + stars * 5,
                stat_visual: 75 + stars * 5,
                stat_focus: 70 + stars * 5,
                starHint: stars < 3 ? 'ลองทำให้เร็วขึ้น\nเพื่อได้ 3 ดาว!' : null
            });
        }
    }

    private onLose() {
        this.gameState.gameOver = true;
        this.gameState.success = false;

        const onGameOver = this.game.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: false,
                level: this.currentLevel,
                stars: 0,
                score: 0
            });
        }
    }

    update(time: number, delta: number) {
        if (this.gameState.gameOver) return;

        if (this.gameState.isPlaying && !this.gameState.carMoving) {
            this.elapsedTime = (Date.now() - this.startTime) / 1000;
        }
    }
}
