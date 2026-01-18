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
    private correctInputsNeeded: number = 3;
    private correctInputs: number = 0;

    constructor() {
        super({ key: 'TutorialScene' });
    }

    preload() {
        // Reuse audio from main scene
        this.load.audio('sfx-correct', '/assets/sounds/dreamdirect/SFX_Tap_Correct.mp3');
        this.load.audio('sfx-wrong', '/assets/sounds/dreamdirect/SFX_Tap_Wrong.mp3');
    }

    create() {
        const { width, height } = this.scale;

        // Consistent layout with GameScene (Safe Zone)
        const buttonTopEdge = height - 220;
        const safeZoneY = buttonTopEdge - 50;
        this.hitZoneY = Math.min(height * 0.7, safeZoneY);

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Hit Zone Line
        const hitZone = this.add.graphics();
        hitZone.lineStyle(4, 0xffffff, 0.5);
        hitZone.moveTo(0, this.hitZoneY);
        hitZone.lineTo(width, this.hitZoneY);
        hitZone.strokePath();

        // Create Buttons
        this.createInputButtons();

        // Keyboard Input
        this.setupKeyboardInput();

        // Start Tutorial
        this.startPhase1();
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
            const bg = this.add.circle(0, 0, buttonSize / 2, 0x4a4a6e, 1);
            bg.setStrokeStyle(3, 0x8844ff);

            // Draw Ghost Arrow Icon
            const arrowGraphic = this.add.graphics();
            arrowGraphic.lineStyle(4, 0xffffff, 1);

            const size = 40;
            const half = size / 2;
            const ax = 0;
            const ay = 0;

            const points: { x: number, y: number }[] = [];

            switch (dir) {
                case 'up':
                    points.push(
                        { x: ax, y: ay - half },
                        { x: ax - half, y: ay + half * 0.5 },
                        { x: ax, y: ay },
                        { x: ax + half, y: ay + half * 0.5 }
                    );
                    break;
                case 'down':
                    points.push(
                        { x: ax, y: ay + half },
                        { x: ax - half, y: ay - half * 0.5 },
                        { x: ax, y: ay },
                        { x: ax + half, y: ay - half * 0.5 }
                    );
                    break;
                case 'left':
                    points.push(
                        { x: ax - half, y: ay },
                        { x: ax + half * 0.5, y: ay - half },
                        { x: ax, y: ay },
                        { x: ax + half * 0.5, y: ay + half }
                    );
                    break;
                case 'right':
                    points.push(
                        { x: ax + half, y: ay },
                        { x: ax - half * 0.5, y: ay - half },
                        { x: ax, y: ay },
                        { x: ax - half * 0.5, y: ay + half }
                    );
                    break;
            }

            arrowGraphic.strokePoints(points, true, true);

            container.add([bg, arrowGraphic]);
            container.setSize(buttonSize, buttonSize);
            container.setDepth(200);
            bg.setInteractive({ useHandCursor: true });
            bg.on('pointerdown', () => this.handleInput(dir));
            this.buttons.set(dir, container);
        });
    }

    setupKeyboardInput() {
        this.input.keyboard?.on('keydown-UP', () => this.handleInput('up'));
        this.input.keyboard?.on('keydown-DOWN', () => this.handleInput('down'));
        this.input.keyboard?.on('keydown-LEFT', () => this.handleInput('left'));
        this.input.keyboard?.on('keydown-RIGHT', () => this.handleInput('right'));
    }

    startPhase1() {
        this.currentPhase = 1;
        const { width, height } = this.scale;

        // Dark panel for text - Positioned lower to avoid Top Header
        const panelWidth = width * 0.9;
        const panelHeight = 220; // Slightly taller for padding
        const panelY = height * 0.35; // Lower down (was 0.25)

        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.8);
        panel.fillRoundedRect((width - panelWidth) / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 20);
        panel.setDepth(90);

        // Instruction Text - Added Padding logic via wordWrap width
        this.instructionText = this.add.text(width / 2, panelY, 'ยินดีต้อนรับสู่ Dream Direct!', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '28px', // Slightly smaller for better fit
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: panelWidth - 60 }, // Increased horizontal padding
            stroke: '#000000',
            strokeThickness: 3,
            padding: { top: 10, bottom: 10, left: 10, right: 10 } // Prevents cutting off Thai vowels
        }).setOrigin(0.5).setDepth(100);

        // Wait, then show next instruction
        this.time.delayedCall(2000, () => {
            this.instructionText.setText('ในเกมนี้ คุณจะเห็น Arrow ลอยลงมา\n\nArrow เส้นขาว (Ghost) = กดทิศตรงข้าม!');

            // Show demo arrow
            this.createDemoArrow('up');

            this.time.delayedCall(3000, () => {
                this.instructionText.setText('Arrow ชี้ขึ้น → คุณต้องกด ลง\n\nลองกดดูสิ!');
                this.currentPhase = 2;
            });
        });
    }

    createDemoArrow(direction: Direction) {
        const { width } = this.scale;

        if (this.demoArrow) this.demoArrow.destroy();

        // Position ON the hit zone line as requested
        this.demoArrow = this.add.container(width / 2, this.hitZoneY);
        const size = 60;
        const arrowGraphic = this.add.graphics();

        // Exact Ghost Arrow visual style
        arrowGraphic.lineStyle(4, 0xffffff, 1);

        const half = size / 2;
        const x = 0;
        const y = 0; // Centered on container

        // Draw UP arrow shape cleanly (Chevron)
        // Points: Tip(Top), LeftWing(BottomLeft), Center(Indented), RightWing(BottomRight)
        if (direction === 'up') {
            const points = [
                { x: x, y: y - half },              // Tip
                { x: x - half, y: y + half * 0.5 }, // Left Wing
                { x: x, y: y },                     // Center Indent
                { x: x + half, y: y + half * 0.5 }  // Right Wing
            ];
            arrowGraphic.strokePoints(points, true, true); // true = close path, true = plot
        }

        this.demoArrow.add(arrowGraphic);
        this.demoArrow.setDepth(200); // Higher depth to be above everything

        // Pulse animation
        this.tweens.add({
            targets: this.demoArrow,
            scale: { from: 1, to: 1.1 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    handleInput(inputDirection: Direction) {
        if (this.currentPhase !== 2) return;

        // Expected: opposite of demo arrow (which is 'up', so expect 'down')
        const expectedDirection: Direction = 'down';

        if (inputDirection === expectedDirection) {
            this.sound.play('sfx-correct', { volume: 0.5 });
            this.correctInputs++;
            this.showFeedback('PERFECT!', '#44ff44');

            if (this.correctInputs >= this.correctInputsNeeded) {
                this.completeTutorial();
            } else {
                this.instructionText.setText(`เก่งมาก! อีก ${this.correctInputsNeeded - this.correctInputs} ครั้ง`);
            }
        } else {
            this.sound.play('sfx-wrong', { volume: 0.5 });
            this.showFeedback('ลองอีกครั้ง!', '#ff4444');
            this.instructionText.setText('ตรงข้าม! Arrow ชี้ขึ้น = กด ลง\n\nลองใหม่!');
        }

        // Flash button
        const button = this.buttons.get(inputDirection);
        if (button) {
            const bg = button.list[0] as Phaser.GameObjects.Arc;
            bg.setFillStyle(inputDirection === expectedDirection ? 0x44ff44 : 0xff4444);
            this.time.delayedCall(100, () => bg.setFillStyle(0x4a4a6e));
        }
    }

    showFeedback(text: string, color: string) {
        const { width } = this.scale;
        const feedback = this.add.text(width / 2, this.hitZoneY - 120, text, {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '36px',
            color,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: feedback,
            y: this.hitZoneY - 180,
            alpha: 0,
            duration: 800,
            onComplete: () => feedback.destroy()
        });
    }

    completeTutorial() {
        this.currentPhase = 3;

        if (this.demoArrow) {
            this.tweens.add({
                targets: this.demoArrow,
                scale: 0,
                duration: 300
            });
        }

        this.instructionText.setText('สุดยอด! คุณพร้อมแล้ว!\n\nจำไว้: Arrow ขาว = กดตรงข้าม');

        // Notify tutorial complete
        const onTutorialComplete = this.registry.get('onTutorialComplete');
        if (onTutorialComplete) {
            this.time.delayedCall(2000, () => {
                onTutorialComplete();
            });
        }
    }

    // Called by React when "Next" button is pressed
    nextPhase() {
        // For this simple tutorial, just proceed to completion
        this.completeTutorial();
    }
}
