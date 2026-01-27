import * as Phaser from 'phaser';

// Tutorial-specific questions (different from Level 1 which uses cat/dog)
const TUTORIAL_QUESTIONS = [
    {
        sounds: ['pig'],
        correctAnswers: ['pig'],
        options: [
            { id: 'pig', label: 'หมู' },
            { id: 'cow', label: 'วัว' },
            { id: 'chicken', label: 'ไก่' },
            { id: 'frog', label: 'กบ' },
        ],
    },
    {
        sounds: ['bear'],
        correctAnswers: ['bear'],
        options: [
            { id: 'bear', label: 'หมี' },
            { id: 'snake', label: 'งู' },
            { id: 'parrot', label: 'นกแก้ว' },
            { id: 'fly', label: 'แมลงวัน' },
        ],
    },
];

export class TutorialScene extends Phaser.Scene {
    // Game state
    private currentQuestionIndex: number = 0;
    private hasAnswered: boolean = false;
    private choicesVisible: boolean = false;
    private tutorialPhase: number = 0; // 0 = not started, 1 = first question, 2 = second question
    private hasReplayedInPhase2: boolean = false;

    // UI Elements
    private optionButtons: Phaser.GameObjects.Container[] = [];
    private speakerContainer!: Phaser.GameObjects.Container;
    private speakerBody!: Phaser.GameObjects.Graphics;
    private speakerCone!: Phaser.GameObjects.Graphics;
    private waveContainer!: Phaser.GameObjects.Container;
    private titleContainer!: Phaser.GameObjects.Container;
    private titleText!: Phaser.GameObjects.Text;
    private questionIndicator!: Phaser.GameObjects.Text;
    private centerMessage!: Phaser.GameObjects.Text;
    private replayHintContainer!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'TutorialScene' });
    }

    preload() {
        // Load all animal images for tutorial
        const allOptions = TUTORIAL_QUESTIONS.flatMap(q => q.options);
        const uniqueIds = Array.from(new Set(allOptions.map(opt => opt.id)));

        uniqueIds.forEach(id => {
            this.load.image(id, `/assets/game-08-mysterysound/image/${id}.webp`);
        });

        // Load all sounds
        const allSounds = TUTORIAL_QUESTIONS.flatMap(q => q.sounds);
        const uniqueSounds = Array.from(new Set(allSounds));

        uniqueSounds.forEach(soundId => {
            this.load.audio(`sound-${soundId}`, `/assets/game-08-mysterysound/sound/${soundId}.mp3`);
        });

        // Load UI sounds
        this.load.audio('correct', '/assets/sounds/cardmatch/match-success.mp3');
        this.load.audio('wrong', '/assets/sounds/cardmatch/match-fail.mp3');
        this.load.audio('level-complete', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('click', '/assets/sounds/global/click.mp3');
    }

    create() {
        // Create colorful gradient background
        this.createBackground();

        // Start Phase 1: Show center message first
        this.startPhase1();

        // Handle resize
        this.scale.on('resize', this.handleResize, this);
    }

    private createBackground() {
        const { width, height } = this.scale;

        const bg = this.add.graphics();
        bg.fillGradientStyle(0x667eea, 0x764ba2, 0x667eea, 0x764ba2, 1);
        bg.fillRect(0, 0, width, height);

        for (let i = 0; i < 8; i++) {
            const x = Phaser.Math.Between(50, width - 50);
            const y = Phaser.Math.Between(50, height - 50);
            const size = Phaser.Math.Between(30, 80);

            const circle = this.add.circle(x, y, size, 0xffffff, 0.08);

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

    private startPhase1() {
        this.tutorialPhase = 1;
        this.currentQuestionIndex = 0;

        const { width, height } = this.scale;

        // Show center message: "ฟังเสียงให้ดีๆนะ"
        this.centerMessage = this.add.text(width / 2, height / 2, 'ฟังเสียงให้ดีๆนะ', {
            fontSize: '36px',
            fontFamily: 'Sarabun, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#5b21b6',
            strokeThickness: 6,
            padding: { x: 20, y: 16 },
        }).setOrigin(0.5).setDepth(100);

        // Animate center message
        this.centerMessage.setScale(0);
        this.tweens.add({
            targets: this.centerMessage,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut',
        });

        // After 2 seconds, fade out message and show speaker
        this.time.delayedCall(2000, () => {
            this.tweens.add({
                targets: this.centerMessage,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    this.centerMessage.destroy();
                    this.setupQuestionUI();
                    this.playSoundWithAnimation();
                    this.time.delayedCall(1500, () => {
                        this.showChoices();
                    });
                }
            });
        });
    }

    private startPhase2() {
        this.tutorialPhase = 2;
        this.currentQuestionIndex = 1;
        this.hasReplayedInPhase2 = false;
        this.hasAnswered = false;

        // Clear old UI
        this.clearQuestionUI();

        // Setup new question UI without center message
        this.setupQuestionUI();

        // Play sound
        this.playSoundWithAnimation();

        // Show choices (but disabled) after a short delay, then show replay hint
        this.time.delayedCall(1500, () => {
            this.showChoicesDisabled();
            // Show replay hint after choices appear
            this.time.delayedCall(500, () => {
                this.showReplayHint();
            });
        });
    }

    private setupQuestionUI() {
        const { width, height } = this.scale;
        const currentQuestion = TUTORIAL_QUESTIONS[this.currentQuestionIndex];

        // Create title with background card
        this.createTitleCard();

        // Create question indicator
        this.createQuestionIndicator();

        // Create speaker icon
        this.createSpeakerIcon();
    }

    private createTitleCard() {
        const { width } = this.scale;

        this.titleContainer = this.add.container(width / 2, 120);

        const titleBg = this.add.graphics();
        titleBg.fillStyle(0xffffff, 0.95);
        titleBg.fillRoundedRect(-160, -30, 320, 60, 30);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.1);
        shadow.fillRoundedRect(-158, -27, 320, 60, 30);
        shadow.setPosition(3, 3);

        this.titleText = this.add.text(0, 0, 'นี่คือเสียงอะไร?', {
            fontSize: '28px',
            fontFamily: 'Sarabun, sans-serif',
            color: '#5b21b6',
            fontStyle: 'bold',
            padding: { x: 10, y: 14 },
        }).setOrigin(0.5);

        this.titleContainer.add([shadow, titleBg, this.titleText]);

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

    private createQuestionIndicator() {
        const { width } = this.scale;

        this.questionIndicator = this.add.text(width / 2, 165, `ข้อ ${this.currentQuestionIndex + 1}/2`, {
            fontSize: '18px',
            fontFamily: 'Sarabun, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold',
            backgroundColor: '#8b5cf6',
            padding: { x: 15, y: 8 },
        }).setOrigin(0.5);

        this.questionIndicator.setAlpha(0);
        this.tweens.add({
            targets: this.questionIndicator,
            alpha: 1,
            duration: 300,
            delay: 200,
        });
    }

    private createSpeakerIcon() {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height * 0.30;

        this.speakerContainer = this.add.container(centerX, centerY);

        const circleBg = this.add.circle(0, 0, 60, 0xffffff, 0.95);
        circleBg.setStrokeStyle(3, 0xe0e7ff);

        this.speakerBody = this.add.graphics();
        this.drawSpeakerBody(0x6366f1);

        this.speakerCone = this.add.graphics();
        this.drawSpeakerCone(0x4f46e5);

        this.waveContainer = this.add.container(0, 0);
        this.drawStaticWaves(0x4f46e5);

        this.speakerContainer.add([circleBg, this.speakerBody, this.speakerCone, this.waveContainer]);

        const hitArea = new Phaser.Geom.Circle(0, 0, 60);
        this.speakerContainer.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

        this.speakerContainer.on('pointerdown', () => {
            this.handleSpeakerClick();
        });

        this.speakerContainer.on('pointerover', () => {
            if (!this.hasAnswered) {
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
        this.speakerBody.fillRoundedRect(-30, -15, 22, 30, 3);
    }

    private drawSpeakerCone(color: number) {
        this.speakerCone.clear();
        this.speakerCone.fillStyle(color, 1);
        this.speakerCone.beginPath();
        this.speakerCone.moveTo(-10, -15);
        this.speakerCone.lineTo(22, -30);
        this.speakerCone.lineTo(22, 30);
        this.speakerCone.lineTo(-10, 15);
        this.speakerCone.closePath();
        this.speakerCone.fillPath();
    }

    private drawStaticWaves(color: number) {
        this.waveContainer.removeAll(true);

        for (let i = 0; i < 2; i++) {
            const wave = this.add.graphics();
            wave.lineStyle(3, color, 0.8 - i * 0.2);
            wave.beginPath();
            wave.arc(25, 0, 15 + i * 10, -0.5, 0.5, false);
            wave.strokePath();
            this.waveContainer.add(wave);
        }
    }

    private showReplayHint() {
        if (this.hasReplayedInPhase2 || this.tutorialPhase !== 2) return;

        const { width, height } = this.scale;

        // Create hint container with circle around speaker
        this.replayHintContainer = this.add.container(0, 0);

        // Create pulsing circle around speaker
        const hintCircle = this.add.graphics();
        hintCircle.lineStyle(4, 0xfbbf24, 1);
        hintCircle.strokeCircle(this.speakerContainer.x, this.speakerContainer.y, 80);

        // Create hint text below speaker
        const hintText = this.add.text(this.speakerContainer.x, this.speakerContainer.y + 110, 'กดเพื่อฟังอีกรอบ', {
            fontSize: '20px',
            fontFamily: 'Sarabun, sans-serif',
            color: '#fbbf24',
            fontStyle: 'bold',
            backgroundColor: '#1f2937',
            padding: { x: 16, y: 10 },
        }).setOrigin(0.5);

        // Arrow pointing up
        const arrow = this.add.text(this.speakerContainer.x, this.speakerContainer.y + 75, '↑', {
            fontSize: '32px',
            color: '#fbbf24',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.replayHintContainer.add([hintCircle, arrow, hintText]);

        // Animate hint
        this.tweens.add({
            targets: [hintCircle, arrow],
            alpha: 0.5,
            duration: 600,
            repeat: -1,
            yoyo: true,
        });
    }

    private hideReplayHint() {
        if (this.replayHintContainer) {
            this.tweens.add({
                targets: this.replayHintContainer,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    this.replayHintContainer?.destroy();
                }
            });
        }
    }

    private handleSpeakerClick() {
        if (this.hasAnswered) return;

        // Phase 2: Must replay before answering
        if (this.tutorialPhase === 2 && !this.hasReplayedInPhase2) {
            this.hasReplayedInPhase2 = true;
            this.hideReplayHint();

            try {
                this.sound.play('click', { volume: 0.3 });
            } catch (e) { }

            this.playSoundWithAnimation();

            // Enable choices after replay and make them fully visible
            this.time.delayedCall(500, () => {
                this.enableChoices();
                this.optionButtons.forEach(btn => {
                    this.tweens.add({
                        targets: btn,
                        alpha: 1,
                        duration: 300,
                    });
                });
            });
            return;
        }

        // Phase 1: Already showing choices, replay sound
        if (this.choicesVisible) {
            try {
                this.sound.play('click', { volume: 0.3 });
            } catch (e) { }
            this.playSoundWithAnimation();
        }
    }

    private playSoundWithAnimation() {
        this.animateSoundWaves();

        const currentQuestion = TUTORIAL_QUESTIONS[this.currentQuestionIndex];
        currentQuestion.sounds.forEach((soundId, index) => {
            try {
                if (this.cache.audio.exists(`sound-${soundId}`)) {
                    this.time.delayedCall(index * 100, () => {
                        this.sound.play(`sound-${soundId}`, { volume: 0.8 });
                    });
                }
            } catch (e) {
                console.warn('Could not play sound:', e);
            }
        });
    }

    private animateSoundWaves() {
        this.tweens.add({
            targets: this.speakerContainer,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 150,
            yoyo: true,
            repeat: 2,
        });

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

    private showChoices() {
        this.choicesVisible = true;
        this.createOptionButtons(true); // enabled
    }

    private showChoicesDisabled() {
        this.choicesVisible = true;
        this.createOptionButtons(false); // disabled until replay
    }

    private enableChoices() {
        // Enable all option buttons with their stored hit areas
        this.optionButtons.forEach(btn => {
            const hitArea = btn.getData('hitArea');
            if (hitArea) {
                btn.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
            } else {
                btn.setInteractive();
            }
        });
    }

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    private createOptionButtons(enabled: boolean = true) {
        const { width, height } = this.scale;
        const currentQuestion = TUTORIAL_QUESTIONS[this.currentQuestionIndex];

        const options = this.shuffleArray([...currentQuestion.options]);

        const maxButtonSize = 110;
        const availableWidth = width - 50;
        const buttonSize = Math.min(maxButtonSize, availableWidth / 2.5);
        const gapX = 20;
        const gapY = 15;

        const gridWidth = buttonSize * 2 + gapX;
        const startX = width / 2 - gridWidth / 2 + buttonSize / 2;
        const startY = height * 0.48;

        options.forEach((opt, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = startX + col * (buttonSize + gapX);
            const y = startY + row * (buttonSize + 45 + gapY);

            const button = this.createOptionButton(x, y, opt, buttonSize, enabled);
            this.optionButtons.push(button);

            button.setAlpha(0);
            button.setScale(0.7);
            this.tweens.add({
                targets: button,
                alpha: enabled ? 1 : 0.5, // Dimmed if disabled
                scaleX: 1,
                scaleY: 1,
                duration: 400,
                delay: 100 + index * 100,
                ease: 'Back.easeOut',
            });
        });
    }

    private createOptionButton(x: number, y: number, option: { id: string; label: string }, size: number, enabled: boolean = true): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        const id = option.id;
        const label = option.label;

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillRoundedRect(-size / 2 + 4, -size / 2 + 4, size, size + 40, 14);

        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(-size / 2, -size / 2, size, size + 40, 14);
        bg.setName('bg');

        const borderOverlay = this.add.graphics();
        borderOverlay.setName('border');
        borderOverlay.setAlpha(0);

        // Always show label in tutorial
        const imageY = -5;

        let image: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
        if (this.textures.exists(id)) {
            image = this.add.image(0, imageY, id);
            image.setDisplaySize(size * 0.65, size * 0.65);
        } else {
            const emojis: Record<string, string> = {
                pig: '🐷', cow: '🐄', chicken: '🐔', frog: '🐸',
                bear: '🐻', snake: '🐍', parrot: '🦜', fly: '🪰',
            };
            image = this.add.text(0, imageY, emojis[id] || '❓', {
                fontSize: `${size * 0.4}px`,
            }).setOrigin(0.5);
        }

        const labelBg = this.add.graphics();
        labelBg.fillStyle(0xf3f4f6, 1);
        labelBg.fillRoundedRect(-size / 2 + 6, size / 2 - 10, size - 12, 36, 8);

        const labelText = this.add.text(0, size / 2 + 6, label, {
            fontSize: '18px',
            fontFamily: 'Sarabun, sans-serif',
            color: '#374151',
            fontStyle: 'bold',
            padding: { x: 4, y: 8 },
        }).setOrigin(0.5);

        const checkmark = this.add.text(0, -5, '✓', {
            fontSize: '60px',
            color: '#16a34a',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setName('checkmark');

        const xmark = this.add.text(0, -5, '✕', {
            fontSize: '60px',
            color: '#dc2626',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setName('xmark');

        container.add([shadow, bg, image, labelBg, labelText, borderOverlay, checkmark, xmark]);
        container.setData('id', id);
        container.setData('size', size);

        const hitArea = new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size + 40);
        if (enabled) {
            container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        } else {
            // Store hit area for later enabling
            container.setData('hitArea', hitArea);
        }

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
                this.handleOptionClick(container, id);
            }
        });

        return container;
    }

    private handleOptionClick(button: Phaser.GameObjects.Container, id: string) {
        this.hasAnswered = true;
        const currentQuestion = TUTORIAL_QUESTIONS[this.currentQuestionIndex];
        const isCorrect = currentQuestion.correctAnswers.includes(id);

        this.optionButtons.forEach(btn => btn.disableInteractive());
        this.speakerContainer.disableInteractive();
        this.game.canvas.style.cursor = 'default';

        if (isCorrect) {
            this.showCorrectFeedback(button);
        } else {
            this.showWrongFeedback(button, currentQuestion.correctAnswers[0]);
        }
    }

    private showCorrectFeedback(button: Phaser.GameObjects.Container) {
        const size = button.getData('size');

        try {
            this.sound.play('correct', { volume: 0.7 });
        } catch (e) { }

        const borderOverlay = button.getByName('border') as Phaser.GameObjects.Graphics;
        borderOverlay.clear();
        borderOverlay.lineStyle(5, 0x22c55e, 1);
        borderOverlay.strokeRoundedRect(-size / 2, -size / 2, size, size + 40, 14);
        borderOverlay.setAlpha(1);

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

        this.tweens.add({
            targets: button,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 200,
            yoyo: true,
        });

        this.time.delayedCall(1500, () => {
            this.proceedToNextQuestion();
        });
    }

    private showWrongFeedback(button: Phaser.GameObjects.Container, correctId: string) {
        const size = button.getData('size');

        try {
            this.sound.play('wrong', { volume: 0.5 });
        } catch (e) { }

        const borderOverlay = button.getByName('border') as Phaser.GameObjects.Graphics;
        borderOverlay.clear();
        borderOverlay.lineStyle(5, 0xef4444, 1);
        borderOverlay.strokeRoundedRect(-size / 2, -size / 2, size, size + 40, 14);
        borderOverlay.setAlpha(1);

        const xmark = button.getByName('xmark') as Phaser.GameObjects.Text;
        xmark.setAlpha(1);

        // Shake effect
        this.tweens.add({
            targets: button,
            x: button.x + 10,
            duration: 50,
            yoyo: true,
            repeat: 3,
        });

        // Highlight correct answer
        const correctButton = this.optionButtons.find(btn => btn.getData('id') === correctId);
        if (correctButton) {
            const correctBorder = correctButton.getByName('border') as Phaser.GameObjects.Graphics;
            const correctSize = correctButton.getData('size');
            correctBorder.clear();
            correctBorder.lineStyle(5, 0x22c55e, 1);
            correctBorder.strokeRoundedRect(-correctSize / 2, -correctSize / 2, correctSize, correctSize + 40, 14);
            correctBorder.setAlpha(1);
        }

        this.time.delayedCall(2000, () => {
            this.proceedToNextQuestion();
        });
    }

    private clearQuestionUI() {
        this.optionButtons.forEach(btn => btn.destroy());
        this.optionButtons = [];
        if (this.titleContainer) this.titleContainer.destroy();
        if (this.questionIndicator) this.questionIndicator.destroy();
        if (this.speakerContainer) this.speakerContainer.destroy();
        this.choicesVisible = false;
    }

    private proceedToNextQuestion() {
        if (this.tutorialPhase === 1) {
            // Move to Phase 2
            this.startPhase2();
        } else {
            // Tutorial complete
            this.endTutorial();
        }
    }

    private endTutorial() {
        try {
            this.sound.play('level-complete', { volume: 0.7 });
        } catch (e) { }

        const onTutorialComplete = this.registry.get('onTutorialComplete');
        if (onTutorialComplete) {
            onTutorialComplete();
        }
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        const { width, height } = gameSize;

        if (this.centerMessage) {
            this.centerMessage.setPosition(width / 2, height / 2);
        }

        if (this.titleContainer) {
            this.titleContainer.setPosition(width / 2, 120);
        }

        if (this.questionIndicator) {
            this.questionIndicator.setPosition(width / 2, 165);
        }

        if (this.speakerContainer) {
            this.speakerContainer.setPosition(width / 2, height * 0.30);
        }

        if (this.replayHintContainer) {
            // Update replay hint positions
            this.replayHintContainer.list.forEach((child) => {
                if (child instanceof Phaser.GameObjects.Graphics) {
                    child.clear();
                    child.lineStyle(4, 0xfbbf24, 1);
                    child.strokeCircle(width / 2, height * 0.30, 80);
                } else if (child instanceof Phaser.GameObjects.Text) {
                    if (child.text === '↑') {
                        child.setPosition(width / 2, height * 0.30 + 75);
                    } else {
                        child.setPosition(width / 2, height * 0.30 + 110);
                    }
                }
            });
        }

        if (this.choicesVisible && this.optionButtons.length > 0) {
            const maxButtonSize = 110;
            const availableWidth = width - 50;
            const buttonSize = Math.min(maxButtonSize, availableWidth / 2.5);
            const gapX = 20;
            const gapY = 15;

            const gridWidth = buttonSize * 2 + gapX;
            const startX = width / 2 - gridWidth / 2 + buttonSize / 2;
            const startY = height * 0.48;

            this.optionButtons.forEach((button, index) => {
                const col = index % 2;
                const row = Math.floor(index / 2);
                const x = startX + col * (buttonSize + gapX);
                const y = startY + row * (buttonSize + 45 + gapY);
                button.setPosition(x, y);
            });
        }
    }
}
