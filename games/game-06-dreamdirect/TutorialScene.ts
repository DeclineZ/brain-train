import * as Phaser from 'phaser';
import { DreamDirectConstants, Direction } from './config';

/**
 * Tutorial Scene for Dream Direct
 * Teaches the basic Ghost arrow mechanic (OPPOSITE direction)
 */
export class TutorialScene extends Phaser.Scene {
    private currentPhase: number = 0;
    private instructionText!: Phaser.GameObjects.Text;
    private demoArrow!: Phaser.GameObjects.Container;
    private buttons: Map<Direction, Phaser.GameObjects.Container> = new Map();
    private hitZoneY: number = 0;
    private safeZoneY: number = 0;
    private spawnY: number = 0;
    private correctInputsNeeded: number = 3;
    private correctInputs: number = 0;

    // Visuals
    private hitZone!: Phaser.GameObjects.Graphics;
    private laneGraphics!: Phaser.GameObjects.Graphics;
    private targetGraphics!: Phaser.GameObjects.Graphics;
    private glowGraphics!: Phaser.GameObjects.Graphics;
    private particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    private readonly LANE_OFFSET: number = 50;

    constructor() {
        super({ key: 'TutorialScene' });
    }

    preload() {
        // Reuse audio from main scene
        this.load.audio('sfx-correct', '/assets/sounds/dreamdirect/SFX_Tap_Correct.mp3');
        this.load.audio('sfx-wrong', '/assets/sounds/dreamdirect/SFX_Tap_Wrong.mp3');

        // Ensure particle texture exists (create it if not) - same as GameScene
        if (!this.textures.exists('particle_star')) {
            const graphics = this.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle_star', 8, 8);
        }
    }

    create() {
        const { width, height } = this.scale;

        // Consistent layout with GameScene (Safe Zone)
        const buttonTopEdge = height - 220;
        this.safeZoneY = buttonTopEdge - 50;

        // Use the lesser of the config percentage OR the safe limit
        this.hitZoneY = Math.min(height * DreamDirectConstants.HIT_ZONE_Y, this.safeZoneY);
        this.spawnY = height * DreamDirectConstants.SPAWN_Y;

        // 1. Background (Gradient + Stars)
        this.createBackground();

        // 2. Hit Zone & Lanes
        this.createHitZone();

        // 3. Particles
        this.createParticles();

        // 4. Input Buttons
        this.createInputButtons();

        // 5. Keyboard Input
        this.setupKeyboardInput();

        // Start Tutorial Flow
        this.startPhase1(); // Welcome
    }

    createBackground() {
        const { width, height } = this.scale;

        // Dark gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        bg.fillRect(0, 0, width, height);

        // Subtle stars/particles
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const size = Phaser.Math.FloatBetween(1, 3);
            const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.1, 0.4));

            // Twinkle animation
            this.tweens.add({
                targets: star,
                alpha: { from: star.alpha, to: star.alpha * 0.3 },
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createHitZone() {
        this.hitZone = this.add.graphics();
        this.laneGraphics = this.add.graphics();
        this.targetGraphics = this.add.graphics();
        this.glowGraphics = this.add.graphics();

        this.drawHitZone();
    }

    drawHitZone() {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const l1x = centerX - this.LANE_OFFSET;
        const l2x = centerX + this.LANE_OFFSET;

        // Clear all
        this.hitZone.clear();
        this.laneGraphics.clear();
        this.targetGraphics.clear();
        this.glowGraphics.clear();

        // 1. Horizontal Hit Line
        this.hitZone.lineStyle(4, 0xffffff, 0.6);
        this.hitZone.moveTo(0, this.hitZoneY);
        this.hitZone.lineTo(width, this.hitZoneY);
        this.hitZone.strokePath();

        // 2. Vertical Lanes
        this.laneGraphics.lineStyle(2, 0xffffff, 0.1);

        // Left Lane
        this.laneGraphics.moveTo(l1x, 0);
        this.laneGraphics.lineTo(l1x, height);

        // Right Lane
        this.laneGraphics.moveTo(l2x, 0);
        this.laneGraphics.lineTo(l2x, height);

        this.laneGraphics.strokePath();

        // 3. Target Circles (Timing Guides)
        this.targetGraphics.lineStyle(4, 0xffffff, 0.4); // Subtle white
        const targetRadius = 30;

        this.targetGraphics.strokeCircle(l1x, this.hitZoneY, targetRadius);
        this.targetGraphics.strokeCircle(l2x, this.hitZoneY, targetRadius);

        // 4. Glow effect
        this.glowGraphics.lineStyle(12, 0x8844ff, 0.2);
        this.glowGraphics.moveTo(0, this.hitZoneY);
        this.glowGraphics.lineTo(width, this.hitZoneY);
        this.glowGraphics.strokePath();
    }

    createParticles() {
        this.particleEmitter = this.add.particles(0, 0, 'particle_star', {
            speed: { min: 100, max: 300 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            emitting: false,
            quantity: 15
        });
    }

    emitParticles(x: number, y: number, color: number) {
        this.particleEmitter.setPosition(x, y);
        this.particleEmitter.setParticleTint(color);
        this.particleEmitter.explode(15);
    }

    createInputButtons() {
        const { width, height } = this.scale;
        const buttonSize = 80;
        const spacing = 100;
        const bottomPadding = 40;
        const centerX = width / 2;
        const bottomY = height - bottomPadding - buttonSize / 2;

        const directions: { dir: Direction; x: number; y: number }[] = [
            { dir: 'up', x: centerX, y: bottomY - spacing },
            { dir: 'down', x: centerX, y: bottomY },
            { dir: 'left', x: centerX - spacing, y: bottomY },
            { dir: 'right', x: centerX + spacing, y: bottomY },
        ];

        directions.forEach(({ dir, x, y }) => {
            const container = this.add.container(x, y);

            // Button Background
            const bg = this.add.circle(0, 0, buttonSize / 2, 0x4a4a6e, 1);
            bg.setStrokeStyle(3, 0x8844ff);

            // Draw Ghost Arrow Icon instead of Text
            const arrowGraphic = this.add.graphics();
            arrowGraphic.lineStyle(4, 0xffffff, 1);

            const size = 40;
            const half = size / 2;
            const ax = 0;
            const ay = 0;

            const points: { x: number, y: number }[] = [];

            // Define shape based on direction
            switch (dir) {
                case 'up':
                    points.push(
                        { x: ax, y: ay - half },              // Top Tip
                        { x: ax - half, y: ay + half * 0.5 }, // Left Wing
                        { x: ax, y: ay },                     // Center
                        { x: ax + half, y: ay + half * 0.5 }  // Right Wing
                    );
                    break;
                case 'down':
                    points.push(
                        { x: ax, y: ay + half },              // Bottom Tip
                        { x: ax - half, y: ay - half * 0.5 }, // Left Wing
                        { x: ax, y: ay },                     // Center
                        { x: ax + half, y: ay - half * 0.5 }  // Right Wing
                    );
                    break;
                case 'left':
                    points.push(
                        { x: ax - half, y: ay },              // Left Tip
                        { x: ax + half * 0.5, y: ay - half }, // Top Wing
                        { x: ax, y: ay },                     // Center
                        { x: ax + half * 0.5, y: ay + half }  // Bottom Wing
                    );
                    break;
                case 'right':
                    points.push(
                        { x: ax + half, y: ay },              // Right Tip
                        { x: ax - half * 0.5, y: ay - half }, // Top Wing
                        { x: ax, y: ay },                     // Center
                        { x: ax - half * 0.5, y: ay + half }  // Bottom Wing
                    );
                    break;
            }

            arrowGraphic.strokePoints(points, true, true);

            container.add([bg, arrowGraphic]);
            container.setSize(buttonSize, buttonSize);
            container.setDepth(200);

            // Make interactive
            bg.setInteractive({ useHandCursor: true });
            bg.on('pointerdown', () => this.handleInput(dir));
            // Add slight feedback on click
            bg.on('pointerdown', () => {
                this.tweens.add({
                    targets: container,
                    scale: 0.9,
                    duration: 50,
                    yoyo: true
                });
            });

            this.buttons.set(dir, container);
        });
    }

    setupKeyboardInput() {
        this.input.keyboard?.on('keydown-UP', () => this.handleInput('up'));
        this.input.keyboard?.on('keydown-DOWN', () => this.handleInput('down'));
        this.input.keyboard?.on('keydown-LEFT', () => this.handleInput('left'));
        this.input.keyboard?.on('keydown-RIGHT', () => this.handleInput('right'));
        this.input.keyboard?.on('keydown-W', () => this.handleInput('up'));
        this.input.keyboard?.on('keydown-S', () => this.handleInput('down'));
        this.input.keyboard?.on('keydown-A', () => this.handleInput('left'));
        this.input.keyboard?.on('keydown-D', () => this.handleInput('right'));
    }

    // --- LOGIC PHASES ---

    startPhase1() {
        this.currentPhase = 1;
        const { width, height } = this.scale;

        // Dark panel for text
        const panelWidth = Math.min(width * 0.95, 600);
        const panelHeight = 250;
        const panelY = height * 0.35;

        // Cleanup previous if any
        if (this.instructionText) this.instructionText.destroy();

        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.85);
        panel.fillRoundedRect((width - panelWidth) / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20);
        panel.lineStyle(2, 0x8844ff, 1);
        panel.strokeRoundedRect((width - panelWidth) / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20);
        panel.setDepth(90);

        // Instruction Text
        this.instructionText = this.add.text(width / 2, panelY, 'ยินดีต้อนรับสู่ Dream Direct!', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '32px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: panelWidth - 40 },
            stroke: '#000000',
            strokeThickness: 3,
            padding: { top: 15, bottom: 15, left: 10, right: 10 }
        }).setOrigin(0.5).setDepth(100);

        // Phase 1 -> Phase 2
        this.time.delayedCall(3000, () => {
            this.instructionText.setText('ในเกมนี้ จะมีลูกศรลอยลงมา\nให้ดูที่ "เส้นแนวตั้ง" 2 เส้นนี้');

            // Highlight Lanes
            this.tweens.add({
                targets: this.laneGraphics,
                alpha: { from: 1, to: 0.2 },
                duration: 600,
                yoyo: true,
                repeat: 3
            });

            this.time.delayedCall(4000, () => {
                this.startPhase2();
            });
        });
    }

    startPhase2() {
        this.currentPhase = 2;
        this.instructionText.setText('ลูกศรสีขาว "โปร่งใส" (Ghost)');

        // Show demo arrow
        this.createDemoArrow('up'); // Spawn UP, so correct is DOWN

        this.time.delayedCall(3500, () => {
            this.instructionText.setText('มันคือตัวหลอก!\n\nถ้าเห็น "ขึ้น" ... ให้กด "ลง"!');

            this.time.delayedCall(4000, () => {
                this.instructionText.setText('ลองกด "ลง" ดูสิ!');
                // Enable Input Check
                this.currentPhase = 3; // Input Phase
            });
        });
    }

    createDemoArrow(direction: Direction) {
        const { width } = this.scale;
        const centerX = width / 2;
        const laneX = centerX - this.LANE_OFFSET; // Use Left Lane for demo

        if (this.demoArrow) this.demoArrow.destroy();

        this.demoArrow = this.add.container(laneX, this.spawnY);
        const size = 60;
        const arrowGraphic = this.add.graphics();

        // Exact Ghost Arrow visual style
        arrowGraphic.lineStyle(4, 0xffffff, 1);

        const half = size / 2;
        const x = 0;
        const y = 0;

        // Draw UP arrow shape
        if (direction === 'up') {
            const points = [
                { x: x, y: y - half },              // Tip
                { x: x - half, y: y + half * 0.5 }, // Left Wing
                { x: x, y: y },                     // Center Indent
                { x: x + half, y: y + half * 0.5 }  // Right Wing
            ];
            arrowGraphic.strokePoints(points, true, true);
        }

        this.demoArrow.add(arrowGraphic);
        this.demoArrow.setDepth(200);

        // Animate Falling to HitZone
        this.tweens.add({
            targets: this.demoArrow,
            y: this.hitZoneY,
            duration: 4000,
            ease: 'Linear',
            onComplete: () => {
                // Pulse at HitZone
                this.tweens.add({
                    targets: this.demoArrow,
                    scale: 1.2,
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });
            }
        });
    }

    handleInput(inputDirection: Direction) {
        if (this.currentPhase !== 3) return;

        // Demo was UP -> Expect DOWN
        const expectedDirection: Direction = 'down';

        if (inputDirection === expectedDirection) {
            this.sound.play('sfx-correct', { volume: 0.5 });
            this.correctInputs++;

            // Visual Feedback
            this.showFeedback('ถูกต้อง!', '#44ff44');
            this.emitParticles(this.demoArrow.x, this.demoArrow.y, 0x44ff44);

            // Hide Arrow
            this.demoArrow.setVisible(false);

            if (this.correctInputs >= 1) { // Just 1 for initial demo
                this.completeTutorial();
            }
        } else {
            this.sound.play('sfx-wrong', { volume: 0.5 });
            this.showFeedback('ผิด! ต้องกด "ตรงข้าม"', '#ff4444');

            // Flash red on arrow
            this.tweens.add({
                targets: this.demoArrow,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: 3
            });
        }
    }

    showFeedback(text: string, color: string) {
        const { width } = this.scale;
        const feedback = this.add.text(width / 2, this.hitZoneY - 100, text, {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '48px',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 6,
            padding: { top: 10, bottom: 10 }
        }).setOrigin(0.5).setDepth(300);

        this.tweens.add({
            targets: feedback,
            y: this.hitZoneY - 150,
            alpha: 0,
            scale: 1.5,
            duration: 1000,
            onComplete: () => feedback.destroy()
        });
    }

    completeTutorial() {
        this.currentPhase = 4;
        this.instructionText.setText('เก่งมาก!\nจำไว้ว่า "ขาวโปร่ง" = "ตรงข้าม"');

        // Notify tutorial complete
        const onTutorialComplete = this.registry.get('onTutorialComplete');

        this.time.delayedCall(3000, () => {
            if (onTutorialComplete) {
                onTutorialComplete();
            } else {
                // Return to menu logic if standalone
                this.scene.start('DreamDirectGameScene');
            }
        });
    }
}
