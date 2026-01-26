import * as Phaser from 'phaser';
import { MYSTERY_SOUND_LEVELS } from './levels';
import type { MysterySoundLevelConfig } from '@/types';

export class MysterySoundScene extends Phaser.Scene {
    private currentLevelConfig!: MysterySoundLevelConfig;
    private level: number = 1;

    // Game state
    private replaysRemaining: number = 1;
    private hasAnswered: boolean = false;
    private startTime: number = 0;
    private correctAnswer: string = '';
    private choicesVisible: boolean = false;

    // UI Elements
    private optionButtons: Phaser.GameObjects.Container[] = [];
    private speakerContainer!: Phaser.GameObjects.Container;
    private speakerBody!: Phaser.GameObjects.Graphics;
    private speakerCone!: Phaser.GameObjects.Graphics;
    private waveContainer!: Phaser.GameObjects.Container;
    private titleContainer!: Phaser.GameObjects.Container;
    private titleText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'MysterySoundScene' });
    }

    init(data: { level: number }) {
        this.level = data.level || 1;
        this.currentLevelConfig = MYSTERY_SOUND_LEVELS[this.level] || MYSTERY_SOUND_LEVELS[1];
        this.replaysRemaining = this.currentLevelConfig.maxReplays;
        this.hasAnswered = false;
        this.correctAnswer = this.currentLevelConfig.correctSound;
        this.optionButtons = [];
        this.choicesVisible = false;
    }

    preload() {
        // Load option images
        const options = this.currentLevelConfig.options;
        options.forEach(opt => {
            this.load.image(opt.id, `/assets/game-08-mysterysound/image/${opt.id}.webp`);
        });

        // Load sound
        this.load.audio('mystery-sound', `/assets/game-08-mysterysound/sound/${this.correctAnswer}.mp3`);

        // Load UI sounds
        this.load.audio('correct', '/assets/sounds/global/correct.mp3');
        this.load.audio('wrong', '/assets/sounds/global/wrong.mp3');
        this.load.audio('click', '/assets/sounds/global/click.mp3');
    }

    create() {
        this.startTime = Date.now();

        const { width, height } = this.scale;

        // Create colorful gradient background
        this.createBackground();

        // Create title with background card
        this.createTitleCard();

        // Create speaker icon
        this.createSpeakerIcon();

        // Play sound after a short delay, then show choices
        this.time.delayedCall(500, () => {
            this.playSoundWithAnimation();
            // Show choices after sound finishes
            this.time.delayedCall(1500, () => {
                this.showChoices();
            });
        });

        // Handle resize
        this.scale.on('resize', this.handleResize, this);
    }

    private createBackground() {
        const { width, height } = this.scale;

        // Gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x667eea, 0x764ba2, 0x667eea, 0x764ba2, 1);
        bg.fillRect(0, 0, width, height);

        // Add floating decorative circles
        for (let i = 0; i < 8; i++) {
            const x = Phaser.Math.Between(50, width - 50);
            const y = Phaser.Math.Between(50, height - 50);
            const size = Phaser.Math.Between(30, 80);

            const circle = this.add.circle(x, y, size, 0xffffff, 0.08);

            // Gentle floating animation
            this.tweens.add({
                targets: circle,
                y: y - 20,
                duration: Phaser.Math.Between(2000, 4000),
                repeat: -1,
                yoyo: true,
                ease: 'Sine.easeInOut',
                delay: Phaser.Math.Between(0, 1000),
            });
        }
    }

    private createTitleCard() {
        const { width } = this.scale;

        this.titleContainer = this.add.container(width / 2, 55);

        // Title background card
        const titleBg = this.add.graphics();
        titleBg.fillStyle(0xffffff, 0.95);
        titleBg.fillRoundedRect(-160, -28, 320, 56, 28);

        // Add subtle shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.1);
        shadow.fillRoundedRect(-158, -25, 320, 56, 28);
        shadow.setPosition(3, 3);

        // Title text
        this.titleText = this.add.text(0, 0, 'นี่คือเสียงอะไร?', {
            fontSize: '28px',
            fontFamily: 'Sarabun, sans-serif',
            color: '#5b21b6',
            fontStyle: 'bold',
            padding: { x: 20, y: 10 },
        }).setOrigin(0.5);

        this.titleContainer.add([shadow, titleBg, this.titleText]);

        // Entrance animation
        this.titleContainer.setScale(0.8);
        this.titleContainer.setAlpha(0);
        this.tweens.add({
            targets: this.titleContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 400,
            ease: 'Back.easeOut',
        });
    }

    private createSpeakerIcon() {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height * 0.32;

        this.speakerContainer = this.add.container(centerX, centerY);

        // White circle background for speaker
        const circleBg = this.add.circle(0, 0, 70, 0xffffff, 0.95);
        circleBg.setStrokeStyle(4, 0xe0e7ff);

        // Speaker body (rectangle part)
        this.speakerBody = this.add.graphics();
        this.drawSpeakerBody(0x6366f1);

        // Speaker cone (triangle part)
        this.speakerCone = this.add.graphics();
        this.drawSpeakerCone(0x4f46e5);

        // Wave container
        this.waveContainer = this.add.container(0, 0);
        this.drawStaticWaves(0x4f46e5);

        this.speakerContainer.add([circleBg, this.speakerBody, this.speakerCone, this.waveContainer]);

        // Make clickable for replay
        const hitArea = new Phaser.Geom.Circle(0, 0, 70);
        this.speakerContainer.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

        this.speakerContainer.on('pointerdown', () => {
            if (this.replaysRemaining > 0 && !this.hasAnswered && this.choicesVisible) {
                this.replaySound();
            }
        });

        this.speakerContainer.on('pointerover', () => {
            if (this.replaysRemaining > 0 && !this.hasAnswered && this.choicesVisible) {
                this.tweens.add({
                    targets: this.speakerContainer,
                    scaleX: 1.08,
                    scaleY: 1.08,
                    duration: 150,
                });
                this.game.canvas.style.cursor = 'pointer';
            }
        });

        this.speakerContainer.on('pointerout', () => {
            this.tweens.add({
                targets: this.speakerContainer,
                scaleX: 1,
                scaleY: 1,
                duration: 150,
            });
            this.game.canvas.style.cursor = 'default';
        });

        // Gentle pulse animation
        this.tweens.add({
            targets: circleBg,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 1200,
            repeat: -1,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });
    }

    private drawSpeakerBody(color: number) {
        this.speakerBody.clear();
        this.speakerBody.fillStyle(color, 1);
        this.speakerBody.fillRoundedRect(-35, -18, 25, 36, 4);
    }

    private drawSpeakerCone(color: number) {
        this.speakerCone.clear();
        this.speakerCone.fillStyle(color, 1);
        this.speakerCone.beginPath();
        this.speakerCone.moveTo(-12, -18);
        this.speakerCone.lineTo(25, -35);
        this.speakerCone.lineTo(25, 35);
        this.speakerCone.lineTo(-12, 18);
        this.speakerCone.closePath();
        this.speakerCone.fillPath();
    }

    private drawStaticWaves(color: number) {
        this.waveContainer.removeAll(true);

        for (let i = 0; i < 2; i++) {
            const wave = this.add.graphics();
            wave.lineStyle(3, color, 0.8 - i * 0.2);
            wave.beginPath();
            wave.arc(30, 0, 18 + i * 12, -0.5, 0.5, false);
            wave.strokePath();
            this.waveContainer.add(wave);
        }
    }

    private showChoices() {
        this.choicesVisible = true;
        this.createOptionButtons();
    }

    private createOptionButtons() {
        const { width, height } = this.scale;
        const options = this.currentLevelConfig.options;

        // Calculate button size based on screen
        const maxButtonSize = 120;
        const availableWidth = width - 60;
        const buttonSize = Math.min(maxButtonSize, availableWidth / 2.5);
        const gapX = 25;
        const gapY = 20; // Vertical gap between rows

        const gridWidth = buttonSize * 2 + gapX;
        const startX = width / 2 - gridWidth / 2 + buttonSize / 2;
        const startY = height * 0.52;

        options.forEach((opt, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = startX + col * (buttonSize + gapX);
            const y = startY + row * (buttonSize + 50 + gapY); // Card height + 50 for label + gapY

            const button = this.createOptionButton(x, y, opt.id, opt.label, buttonSize);
            this.optionButtons.push(button);

            // Entrance animation
            button.setAlpha(0);
            button.setScale(0.7);
            this.tweens.add({
                targets: button,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 400,
                delay: 100 + index * 100,
                ease: 'Back.easeOut',
            });
        });
    }

    private createOptionButton(x: number, y: number, id: string, label: string, size: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);

        // Card shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillRoundedRect(-size / 2 + 4, -size / 2 + 4, size, size + 45, 16);

        // Main card background (white)
        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(-size / 2, -size / 2, size, size + 45, 16);
        bg.setName('bg');

        // Border overlay for correct/wrong (hidden initially)
        const borderOverlay = this.add.graphics();
        borderOverlay.setName('border');
        borderOverlay.setAlpha(0);

        // Image (no background, transparent)
        let image: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
        if (this.textures.exists(id)) {
            image = this.add.image(0, -8, id);
            image.setDisplaySize(size * 0.7, size * 0.7);
        } else {
            const emojis: Record<string, string> = {
                dog: '🐕', cat: '🐱', bird: '🐦', chicken: '🐔',
            };
            image = this.add.text(0, -8, emojis[id] || '❓', {
                fontSize: `${size * 0.5}px`,
            }).setOrigin(0.5);
        }

        // Label below image with background
        const labelBg = this.add.graphics();
        labelBg.fillStyle(0xf3f4f6, 1);
        labelBg.fillRoundedRect(-size / 2 + 8, size / 2 - 5, size - 16, 35, 8);

        const labelText = this.add.text(0, size / 2 + 12, label, {
            fontSize: '22px',
            fontFamily: 'Sarabun, sans-serif',
            color: '#374151',
            fontStyle: 'bold',
            padding: { x: 15, y: 8 },
        }).setOrigin(0.5);

        // Check/X overlay (hidden initially)
        const checkmark = this.add.text(0, -5, '✓', {
            fontSize: '70px',
            color: '#16a34a',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setName('checkmark');

        const xmark = this.add.text(0, -5, '✕', {
            fontSize: '70px',
            color: '#dc2626',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setName('xmark');

        container.add([shadow, bg, image, labelBg, labelText, borderOverlay, checkmark, xmark]);
        container.setData('id', id);
        container.setData('size', size);

        // Hit area
        const hitArea = new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size + 45);
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        // Hover effects
        container.on('pointerover', () => {
            if (!this.hasAnswered) {
                this.tweens.add({
                    targets: container,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 150,
                    ease: 'Power2',
                });
                this.game.canvas.style.cursor = 'pointer';
            }
        });

        container.on('pointerout', () => {
            if (!this.hasAnswered) {
                this.tweens.add({
                    targets: container,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                });
                this.game.canvas.style.cursor = 'default';
            }
        });

        container.on('pointerdown', () => {
            if (!this.hasAnswered) {
                this.handleAnswer(id);
            }
        });

        return container;
    }

    private playSoundWithAnimation() {
        this.animateSoundWaves();

        try {
            if (this.cache.audio.exists('mystery-sound')) {
                this.sound.play('mystery-sound', { volume: 0.8 });
            }
        } catch (e) {
            console.warn('Could not play sound:', e);
        }
    }

    private animateSoundWaves() {
        // Pulse the speaker
        this.tweens.add({
            targets: this.speakerContainer,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 150,
            yoyo: true,
            repeat: 2,
        });

        // Animate waves
        this.waveContainer.list.forEach((wave, i) => {
            if (wave instanceof Phaser.GameObjects.Graphics) {
                this.tweens.add({
                    targets: wave,
                    alpha: 0.3,
                    duration: 200,
                    delay: i * 100,
                    yoyo: true,
                    repeat: 2,
                });
            }
        });
    }

    private replaySound() {
        if (this.replaysRemaining <= 0 || this.hasAnswered) return;

        this.replaysRemaining--;

        try {
            this.sound.play('click', { volume: 0.5 });
        } catch (e) { }

        this.tweens.add({
            targets: this.speakerContainer,
            scaleX: 0.92,
            scaleY: 0.92,
            duration: 100,
            yoyo: true,
        });

        this.playSoundWithAnimation();

        if (this.replaysRemaining <= 0) {
            this.greySpeaker();
        }
    }

    private greySpeaker() {
        this.drawSpeakerBody(0xd1d5db);
        this.drawSpeakerCone(0xd1d5db);
        this.drawStaticWaves(0xd1d5db);

        this.speakerContainer.disableInteractive();
        this.game.canvas.style.cursor = 'default';

        // Fade the container slightly
        this.tweens.add({
            targets: this.speakerContainer,
            alpha: 0.6,
            duration: 300,
        });
    }

    private handleAnswer(selectedId: string) {
        this.hasAnswered = true;
        const isCorrect = selectedId === this.correctAnswer;

        this.optionButtons.forEach(btn => btn.disableInteractive());
        this.speakerContainer.disableInteractive();
        this.game.canvas.style.cursor = 'default';

        const selectedButton = this.optionButtons.find(btn => btn.getData('id') === selectedId);

        if (isCorrect) {
            this.showCorrectFeedback(selectedButton!);
        } else {
            this.showWrongFeedback(selectedButton!);
        }
    }

    private showCorrectFeedback(button: Phaser.GameObjects.Container) {
        const size = button.getData('size');

        try {
            this.sound.play('correct', { volume: 0.7 });
        } catch (e) { }

        // Draw thick green border
        const borderOverlay = button.getByName('border') as Phaser.GameObjects.Graphics;
        borderOverlay.clear();
        borderOverlay.lineStyle(6, 0x22c55e, 1);
        borderOverlay.strokeRoundedRect(-size / 2, -size / 2, size, size + 45, 16);
        borderOverlay.setAlpha(1);

        // Show checkmark with bounce
        const checkmark = button.getByName('checkmark') as Phaser.GameObjects.Text;
        checkmark.setAlpha(1);
        checkmark.setScale(0.5);
        this.tweens.add({
            targets: checkmark,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
        });

        // Scale button
        this.tweens.add({
            targets: button,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 200,
            yoyo: true,
        });

        this.time.delayedCall(1500, () => {
            this.endGame(true);
        });
    }

    private showWrongFeedback(button: Phaser.GameObjects.Container) {
        const size = button.getData('size');

        try {
            this.sound.play('wrong', { volume: 0.5 });
        } catch (e) { }

        // Draw thick red border
        const borderOverlay = button.getByName('border') as Phaser.GameObjects.Graphics;
        borderOverlay.clear();
        borderOverlay.lineStyle(6, 0xef4444, 1);
        borderOverlay.strokeRoundedRect(-size / 2, -size / 2, size, size + 45, 16);
        borderOverlay.setAlpha(1);

        // Show X mark
        const xmark = button.getByName('xmark') as Phaser.GameObjects.Text;
        xmark.setAlpha(1);
        xmark.setScale(0.5);
        this.tweens.add({
            targets: xmark,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
        });

        // Shake animation
        const originalX = button.x;
        this.tweens.add({
            targets: button,
            x: originalX + 10,
            duration: 50,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                button.setX(originalX);
            },
        });

        this.time.delayedCall(1500, () => {
            this.endGame(false);
        });
    }

    private endGame(correct: boolean) {
        const endTime = Date.now();
        const responseTimeMs = endTime - this.startTime;

        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                levelPlayed: this.level,
                difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
                correct,
                replaysUsed: this.currentLevelConfig.maxReplays - this.replaysRemaining,
                responseTimeMs,
                timeLimitMs: this.currentLevelConfig.timeLimitSeconds * 1000,
            });
        }
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        const { width, height } = gameSize;

        if (this.titleContainer) {
            this.titleContainer.setPosition(width / 2, 55);
        }

        if (this.speakerContainer) {
            this.speakerContainer.setPosition(width / 2, height * 0.32);
        }

        if (this.choicesVisible && this.optionButtons.length > 0) {
            const maxButtonSize = 120;
            const availableWidth = width - 60;
            const buttonSize = Math.min(maxButtonSize, availableWidth / 2.5);
            const gapX = 25;
            const gapY = 20;

            const gridWidth = buttonSize * 2 + gapX;
            const startX = width / 2 - gridWidth / 2 + buttonSize / 2;
            const startY = height * 0.52;

            this.optionButtons.forEach((button, index) => {
                const col = index % 2;
                const row = Math.floor(index / 2);
                const x = startX + col * (buttonSize + gapX);
                const y = startY + row * (buttonSize + 50 + gapY);
                button.setPosition(x, y);
            });
        }
    }
}
