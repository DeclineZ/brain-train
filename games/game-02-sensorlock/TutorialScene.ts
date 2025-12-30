import * as Phaser from 'phaser';

export class TutorialScene extends Phaser.Scene {
    // UI Elements
    private arrowContainer!: Phaser.GameObjects.Container;
    private arrowGraphics!: Phaser.GameObjects.Graphics;
    private labelText!: Phaser.GameObjects.Text;
    private messageText!: Phaser.GameObjects.Text;
    private handCursor!: Phaser.GameObjects.Image; // Simulated hand or just using tween highlights

    // Buttons
    private yesBtn!: Phaser.GameObjects.Container;
    private noBtn!: Phaser.GameObjects.Container;

    // State
    private step = 0;
    private isWaitingInput = false;

    constructor() { super({ key: 'TutorialScene' }); }

    preload() {
        // Reuse assets from main game
        this.load.audio('match-success', '/assets/sounds/match-success.mp3');
        this.load.audio('match-fail', '/assets/sounds/match-fail.mp3');
        this.load.audio('level-pass', '/assets/sounds/level-pass.mp3');
        this.load.audio('bgm', '/assets/sounds/game-02-sensorlock/sensorlock-bg.mp3');
    }

    create() {
        const { width, height } = this.scale;

        // 1. Background (Same as GameScene)
        this.createBackground();

        // 2. Stimulus Area (Center)
        this.createStimulusArea();

        // 3. Controls (Buttons)
        this.createControls();

        // 4. Tutorial Message Text (Top area)
        this.messageText = this.add.text(width / 2, height * 0.2, "ยินดีต้อนรับ!", {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '40px',
            fontStyle: 'bold',
            color: '#2d3436',
            align: 'center',
            stroke: '#ffffff',
            strokeThickness: 8,
            wordWrap: { width: width * 0.9 }
        }).setOrigin(0.5).setDepth(20).setPadding(20);

        // 5. Start Tutorial Flow
        this.startTutorial();
    }

    // --- VISUALS (Copied/Simplified from GameScene) ---

    createBackground() {
        const { width, height } = this.scale;
        // Simplified procedural background for tutorial context
        const sky = this.add.graphics();
        sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xE0F7FA, 0xE0F7FA, 1);
        sky.fillRect(0, 0, width, height);

        // Simple Hills
        const hills = this.add.graphics();
        hills.fillStyle(0x55efc4, 1);
        const frontHillPath = new Phaser.Curves.Path(0, height * 0.85);
        frontHillPath.splineTo([
            new Phaser.Math.Vector2(width * 0.4, height * 0.9),
            new Phaser.Math.Vector2(width * 0.7, height * 0.8),
            new Phaser.Math.Vector2(width, height * 0.9)
        ]);
        frontHillPath.lineTo(width, height);
        frontHillPath.lineTo(0, height);
        frontHillPath.closePath();
        hills.fillPoints(frontHillPath.getPoints(), true);
    }

    createStimulusArea() {
        const { width, height } = this.scale;
        this.arrowContainer = this.add.container(width / 2, height / 2 - 50);

        this.arrowGraphics = this.add.graphics();
        this.arrowContainer.add(this.arrowGraphics);

        // Label
        const labelSize = Math.min(width * 0.15, 80);
        this.labelText = this.add.text(0, 120, "", {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: `${labelSize}px`,
            fontStyle: '900',
            color: '#2d3436',
            stroke: '#ffffff',
            strokeThickness: 6
        }).setOrigin(0.5).setPadding(10);
        this.arrowContainer.add(this.labelText);

        // Hide initially
        this.arrowContainer.setVisible(false);
    }

    createControls() {
        const { width, height } = this.scale;
        const yPos = height - 100;
        const btnWidth = width / 2 - 40;

        // NO MATCH Button (Left, Red)
        this.noBtn = this.add.container(width / 4, yPos);
        const noBg = this.add.rectangle(0, 0, btnWidth, 80, 0xFF7675)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(4, 0xD63031);
        const noText = this.add.text(0, 0, "ไม่ตรง", {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '40px',
            fontStyle: 'bold',
            color: '#FFF',
            stroke: '#D63031',
            strokeThickness: 2
        }).setOrigin(0.5).setPadding(5);
        this.noBtn.add([noBg, noText]);
        this.noBtn.setVisible(false);

        noBg.on('pointerdown', () => this.handleInput(false));

        // MATCH Button (Right, Green)
        this.yesBtn = this.add.container(width * 0.75, yPos);
        const yesBg = this.add.rectangle(0, 0, btnWidth, 80, 0x55EFC4)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(4, 0x00B894);
        const yesText = this.add.text(0, 0, "ตรง", {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '40px',
            fontStyle: 'bold',
            color: '#FFF',
            stroke: '#00B894',
            strokeThickness: 2
        }).setOrigin(0.5).setPadding(5);
        this.yesBtn.add([yesBg, yesText]);
        this.yesBtn.setVisible(false);

        yesBg.on('pointerdown', () => this.handleInput(true));
    }

    drawArrow(dir: string, color: number) {
        this.arrowGraphics.clear();
        this.arrowGraphics.fillStyle(color, 1);
        const w = 20;
        const h = 60;
        const headW = 60;
        let angle = 0;
        switch (dir) {
            case 'UP': angle = 0; break;
            case 'DOWN': angle = 180; break;
            case 'LEFT': angle = 270; break;
            case 'RIGHT': angle = 90; break;
        }
        this.arrowGraphics.rotation = Phaser.Math.DegToRad(angle);
        this.arrowGraphics.fillRect(-w / 2, -h / 2 + 20, w, h);
        this.arrowGraphics.fillTriangle(0, -h / 2 - 20, -headW / 2, -h / 2 + 20, headW / 2, -h / 2 + 20);
    }

    // --- LOGIC ---

    startTutorial() {
        // Step 0: Intro
        this.time.delayedCall(1000, () => {
            this.messageText.setText("เปรียบเทียบ 'ทิศลูกศร'\nกับ 'คำที่เขียน'");
            this.time.delayedCall(5000, () => {
                this.startStep1();
            });
        });
    }

    startStep1() {
        // Step 1: MATCH Example
        this.step = 1;
        this.messageText.setText("ถ้าตรงกัน ให้กดปุ่ม 'ตรง'");

        // Show Controls
        this.noBtn.setVisible(true);
        this.yesBtn.setVisible(true);

        // Show Stimulus (Match)
        this.arrowContainer.setVisible(true);
        this.drawArrow('UP', 0x0984E3);
        this.labelText.setText('บน'); // MATCH

        // Highlight Green Button
        this.tweens.add({
            targets: this.yesBtn,
            scale: 1.1,
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        this.isWaitingInput = true;
    }

    startStep2() {
        // Step 2: MISMATCH Example
        this.step = 2;
        this.messageText.setText("ถ้าไม่ตรง ให้กดปุ่ม 'ไม่ตรง'");

        // Hide old stimulus momentarily
        this.arrowContainer.setVisible(false);
        this.time.delayedCall(500, () => {
            this.arrowContainer.setVisible(true);
            this.drawArrow('LEFT', 0x0984E3);
            this.labelText.setText('ขวา'); // MISMATCH (Left vs Right)

            // Highlight Red Button
            this.tweens.add({
                targets: this.noBtn,
                scale: 1.1,
                duration: 600,
                yoyo: true,
                repeat: -1
            });

            this.isWaitingInput = true;
        });
    }

    handleInput(saidMatch: boolean) {
        if (!this.isWaitingInput) return;

        // Validation based on step
        let correct = false;
        if (this.step === 1 && saidMatch) correct = true;   // Expect Match
        if (this.step === 2 && !saidMatch) correct = true;  // Expect Mismatch

        if (correct) {
            this.sound.play('match-success');
            this.isWaitingInput = false;

            // Stop highlights
            this.tweens.killTweensOf(this.yesBtn);
            this.tweens.killTweensOf(this.noBtn);
            this.yesBtn.setScale(1);
            this.noBtn.setScale(1);

            if (this.step === 1) {
                // Good job, next step
                this.messageText.setText("เยี่ยมมาก!");
                this.time.delayedCall(3000, () => {
                    this.startStep2();
                });
            } else if (this.step === 2) {
                // Done!
                this.messageText.setText("เก่งมาก! พร้อมเริ่มเกมแล้วนะ");
                this.arrowContainer.setVisible(false);
                this.time.delayedCall(4000, () => {
                    this.endTutorial();
                });
            }
        } else {
            // Wrong input during tutorial -> Shake and feedback
            this.sound.play('match-fail');
            this.cameras.main.shake(200, 0.01);
            this.messageText.setText("ลองใหม่อีกครั้งนะ");
            // Highlight remains
        }
    }

    endTutorial() {
        this.sound.play('level-pass');
        const onTutorialComplete = this.registry.get('onTutorialComplete');
        if (onTutorialComplete) {
            onTutorialComplete();
        }
    }
}
