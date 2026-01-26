import * as Phaser from 'phaser';
import { MYSTERY_SOUND_LEVELS } from './levels';
import type { MysterySoundLevelConfig, MysterySoundQuestion, MysterySoundOption } from '@/types';

export class MysterySoundScene extends Phaser.Scene {
    private currentLevelConfig!: MysterySoundLevelConfig;
    private level: number = 1;

    // Game state
    private currentQuestionIndex: number = 0;
    private currentQuestion!: MysterySoundQuestion;
    private replaysRemaining: number = 1;
    private hasAnswered: boolean = false;
    private startTime: number = 0;
    private choicesVisible: boolean = false;
    private questionsCorrect: number = 0;
    private totalReplaysUsed: number = 0;

    // Multi-select state
    private selectedAnswers: string[] = [];
    private requiredSelections: number = 1;

    // UI Elements
    private optionButtons: Phaser.GameObjects.Container[] = [];
    private speakerContainer!: Phaser.GameObjects.Container;
    private speakerBody!: Phaser.GameObjects.Graphics;
    private speakerCone!: Phaser.GameObjects.Graphics;
    private waveContainer!: Phaser.GameObjects.Container;
    private titleContainer!: Phaser.GameObjects.Container;
    private titleText!: Phaser.GameObjects.Text;
    private questionIndicator!: Phaser.GameObjects.Text;
    private selectionHint!: Phaser.GameObjects.Text;
    private confirmButton!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'MysterySoundScene' });
    }

    init(data: { level: number }) {
        // Robust level detection: Data -> Registry -> URL Param -> Default
        const registryLevel = this.registry.get('level');
        const urlParams = new URLSearchParams(window.location.search);
        const urlLevel = parseInt(urlParams.get('level') || '0');

        this.level = data.level || registryLevel || (urlLevel > 0 ? urlLevel : 1);

        console.log(`MysterySound: Loading Level ${this.level} (Data: ${data.level}, Reg: ${registryLevel}, URL: ${urlLevel})`);

        this.currentLevelConfig = MYSTERY_SOUND_LEVELS[this.level] || MYSTERY_SOUND_LEVELS[1];
        this.replaysRemaining = this.currentLevelConfig.maxReplays;
        this.hasAnswered = false;
        this.currentQuestionIndex = 0;
        this.currentQuestion = this.currentLevelConfig.questions[0];
        this.optionButtons = [];
        this.choicesVisible = false;
        this.questionsCorrect = 0;
        this.totalReplaysUsed = 0;
        this.selectedAnswers = [];
        this.requiredSelections = this.currentQuestion.correctAnswers.length;
    }

    preload() {
        // Load all animal images that might be used
        const allOptions = this.currentLevelConfig.questions.flatMap(q => q.options);
        const uniqueIds = [...new Set(allOptions.map(opt => opt.id))];

        uniqueIds.forEach(id => {
            this.load.image(id, `/assets/game-08-mysterysound/image/${id}.webp`);
        });

        // Load all sounds
        const allSounds = this.currentLevelConfig.questions.flatMap(q => q.sounds);
        const uniqueSounds = [...new Set(allSounds)];

        uniqueSounds.forEach(soundId => {
            this.load.audio(`sound-${soundId}`, `/assets/game-08-mysterysound/sound/${soundId}.mp3`);
        });

        // Load UI sounds
        this.load.audio('correct', '/assets/sounds/global/correct.mp3');
        this.load.audio('wrong', '/assets/sounds/global/wrong.mp3');
        this.load.audio('click', '/assets/sounds/global/click.mp3');
    }

    create() {
        this.startTime = Date.now();

        // Create colorful gradient background
        this.createBackground();

        // Create title with background card
        this.createTitleCard();

        // Create question indicator
        this.createQuestionIndicator();

        // Create speaker icon
        this.createSpeakerIcon();

        // Play sound after a short delay, then show choices
        this.time.delayedCall(500, () => {
            this.playSoundWithAnimation();
            this.time.delayedCall(1500, () => {
                this.showChoices();
            });
        });

        // Handle resize
        this.scale.on('resize', this.handleResize, this);
    }

    // Fisher-Yates shuffle algorithm
    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
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

    private createTitleCard() {
        const { width } = this.scale;

        this.titleContainer = this.add.container(width / 2, 120);

        const titleBg = this.add.graphics();
        titleBg.fillStyle(0xffffff, 0.95);
        titleBg.fillRoundedRect(-160, -30, 320, 60, 30); // Increased height

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.1);
        shadow.fillRoundedRect(-158, -27, 320, 60, 30);
        shadow.setPosition(3, 3);

        this.titleText = this.add.text(0, 0, 'นี่คือเสียงอะไร?', {
            fontSize: '28px',
            fontFamily: 'Sarabun, sans-serif',
            color: '#5b21b6',
            fontStyle: 'bold',
            padding: { x: 10, y: 10 }, // Add padding to prevent clipping
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
        const totalQuestions = this.currentLevelConfig.questions.length;

        this.questionIndicator = this.add.text(width / 2, 165, `ข้อ ${this.currentQuestionIndex + 1}/${totalQuestions}`, {
            fontSize: '18px',
            fontFamily: 'Sarabun, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold',
            backgroundColor: '#8b5cf6',
            padding: { x: 15, y: 6 },
        }).setOrigin(0.5);

        // Add rounded corners effect via container
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

    private showChoices() {
        this.choicesVisible = true;
        this.createOptionButtons();
        this.createSelectionHint();

        // Show confirm button if multi-select
        if (this.requiredSelections > 1) {
            this.createConfirmButton();
        }
    }

    private createSelectionHint() {
        const { width, height } = this.scale;

        if (this.requiredSelections > 1) {
            this.selectionHint = this.add.text(width / 2, height * 0.42, `เลือก ${this.requiredSelections} ตัว`, {
                fontSize: '16px',
                fontFamily: 'Sarabun, sans-serif',
                color: '#fef3c7',
                fontStyle: 'bold',
                backgroundColor: '#d97706',
                padding: { x: 12, y: 5 },
            }).setOrigin(0.5);
        }
    }

    private createConfirmButton() {
        const { width, height } = this.scale;

        this.confirmButton = this.add.container(width / 2, height * 0.92);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x22c55e, 1);
        btnBg.fillRoundedRect(-80, -22, 160, 44, 22);

        const btnText = this.add.text(0, 0, 'ยืนยัน', {
            fontSize: '22px',
            fontFamily: 'Sarabun, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.confirmButton.add([btnBg, btnText]);
        this.confirmButton.setAlpha(0.5);

        const hitArea = new Phaser.Geom.Rectangle(-80, -22, 160, 44);
        this.confirmButton.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        this.confirmButton.on('pointerdown', () => {
            if (this.selectedAnswers.length === this.requiredSelections && !this.hasAnswered) {
                this.checkMultiSelectAnswer();
            }
        });

        this.confirmButton.on('pointerover', () => {
            if (this.selectedAnswers.length === this.requiredSelections && !this.hasAnswered) {
                this.game.canvas.style.cursor = 'pointer';
            }
        });

        this.confirmButton.on('pointerout', () => {
            this.game.canvas.style.cursor = 'default';
        });
    }

    private updateConfirmButton() {
        if (!this.confirmButton) return;

        if (this.selectedAnswers.length === this.requiredSelections) {
            this.confirmButton.setAlpha(1);
            this.tweens.add({
                targets: this.confirmButton,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 200,
                yoyo: true,
            });
        } else {
            this.confirmButton.setAlpha(0.5);
        }
    }

    private createOptionButtons() {
        const { width, height } = this.scale;

        // Shuffle options to randomize positions each game
        const options = this.shuffleArray([...this.currentQuestion.options]);

        const maxButtonSize = 110;
        const availableWidth = width - 50;
        const buttonSize = Math.min(maxButtonSize, availableWidth / 2.5);
        const gapX = 20;
        const gapY = 15;

        const gridWidth = buttonSize * 2 + gapX;
        const startX = width / 2 - gridWidth / 2 + buttonSize / 2;
        const startY = height * 0.48;

        options.forEach((opt: MysterySoundOption, index: number) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = startX + col * (buttonSize + gapX);
            const y = startY + row * (buttonSize + 45 + gapY);

            const button = this.createOptionButton(x, y, opt, buttonSize);
            this.optionButtons.push(button);

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

    private createOptionButton(x: number, y: number, option: MysterySoundOption, size: number): Phaser.GameObjects.Container {
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

        // Selection highlight (hidden initially)
        const selectionHighlight = this.add.graphics();
        selectionHighlight.lineStyle(5, 0x3b82f6, 1);
        selectionHighlight.strokeRoundedRect(-size / 2, -size / 2, size, size + 40, 14);
        selectionHighlight.setName('selection');
        selectionHighlight.setAlpha(0);

        const borderOverlay = this.add.graphics();
        borderOverlay.setName('border');
        borderOverlay.setAlpha(0);

        // Show label until Level 3 question 1, then hide from Level 3 question 2 onwards
        // This gradually increases difficulty
        const showLabel = this.level <= 2 || (this.level === 3 && this.currentQuestionIndex === 0);

        // Center image vertically when no label is shown
        const imageY = showLabel ? -5 : 15;

        let image: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
        if (this.textures.exists(id)) {
            image = this.add.image(0, imageY, id);
            image.setDisplaySize(size * 0.65, size * 0.65);
        } else {
            const emojis: Record<string, string> = {
                dog: '🐕', cat: '🐱', pig: '🐷', snake: '🐍',
                fly: '🪰', frog: '🐸', parrot: '🦜', bear: '🐻',
                chicken: '🐔', cow: '🐄',
                cat_parrot: '🐱🦜', dog_frog: '🐕🐸',
                pig_chicken: '🐷🐔', cow_bear: '🐄🐻',
            };
            image = this.add.text(0, imageY, emojis[id] || '❓', {
                fontSize: `${size * 0.4}px`,
            }).setOrigin(0.5);
        }

        const labelBg = this.add.graphics();
        labelBg.fillStyle(0xf3f4f6, 1);
        labelBg.fillRoundedRect(-size / 2 + 6, size / 2 - 8, size - 12, 32, 8);
        labelBg.setVisible(showLabel);

        const labelText = this.add.text(0, size / 2 + 8, label, {
            fontSize: '18px',
            fontFamily: 'Sarabun, sans-serif',
            color: '#374151',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        labelText.setVisible(showLabel);

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

        container.add([shadow, bg, selectionHighlight, image, labelBg, labelText, borderOverlay, checkmark, xmark]);
        container.setData('id', id);
        container.setData('size', size);
        container.setData('selected', false);

        const hitArea = new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size + 40);
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

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
        // Single select mode
        if (this.requiredSelections === 1) {
            this.selectedAnswers = [id];
            this.checkSingleSelectAnswer(button);
            return;
        }

        // Multi-select mode
        const isSelected = button.getData('selected');
        const selectionHighlight = button.getByName('selection') as Phaser.GameObjects.Graphics;

        if (isSelected) {
            // Deselect
            button.setData('selected', false);
            selectionHighlight.setAlpha(0);
            this.selectedAnswers = this.selectedAnswers.filter(a => a !== id);
        } else {
            // Select (if haven't reached max)
            if (this.selectedAnswers.length < this.requiredSelections) {
                button.setData('selected', true);
                selectionHighlight.setAlpha(1);
                this.selectedAnswers.push(id);

                // Play click sound
                try {
                    this.sound.play('click', { volume: 0.3 });
                } catch (e) { }
            }
        }

        this.updateConfirmButton();
    }

    private checkSingleSelectAnswer(button: Phaser.GameObjects.Container) {
        this.hasAnswered = true;
        const isCorrect = this.currentQuestion.correctAnswers.includes(this.selectedAnswers[0]);

        this.optionButtons.forEach(btn => btn.disableInteractive());
        this.speakerContainer.disableInteractive();
        this.game.canvas.style.cursor = 'default';

        if (isCorrect) {
            this.questionsCorrect++;
            this.showCorrectFeedback(button);
        } else {
            this.showWrongFeedback(button);
        }
    }

    private checkMultiSelectAnswer() {
        this.hasAnswered = true;

        // Check if all selected answers are correct
        const correctSet = new Set(this.currentQuestion.correctAnswers);
        const selectedSet = new Set(this.selectedAnswers);
        const isCorrect = this.selectedAnswers.every(a => correctSet.has(a)) &&
            this.selectedAnswers.length === this.currentQuestion.correctAnswers.length;

        this.optionButtons.forEach(btn => btn.disableInteractive());
        this.speakerContainer.disableInteractive();
        if (this.confirmButton) this.confirmButton.disableInteractive();
        this.game.canvas.style.cursor = 'default';

        if (isCorrect) {
            this.questionsCorrect++;
            // Show checkmarks on all selected buttons
            this.selectedAnswers.forEach(id => {
                const btn = this.optionButtons.find(b => b.getData('id') === id);
                if (btn) this.showCorrectFeedbackOnButton(btn);
            });
            this.time.delayedCall(1500, () => this.proceedToNextQuestion());
        } else {
            // Show X on wrong selections
            this.selectedAnswers.forEach(id => {
                const btn = this.optionButtons.find(b => b.getData('id') === id);
                if (btn) {
                    if (correctSet.has(id)) {
                        this.showCorrectFeedbackOnButton(btn);
                    } else {
                        this.showWrongFeedbackOnButton(btn);
                    }
                }
            });
            // Highlight correct answers that weren't selected
            this.currentQuestion.correctAnswers.forEach(id => {
                if (!selectedSet.has(id)) {
                    const btn = this.optionButtons.find(b => b.getData('id') === id);
                    if (btn) this.showCorrectFeedbackOnButton(btn);
                }
            });
            this.time.delayedCall(2000, () => this.proceedToNextQuestion());
        }
    }

    private showCorrectFeedbackOnButton(button: Phaser.GameObjects.Container) {
        const size = button.getData('size');

        const borderOverlay = button.getByName('border') as Phaser.GameObjects.Graphics;
        borderOverlay.clear();
        borderOverlay.lineStyle(5, 0x22c55e, 1);
        borderOverlay.strokeRoundedRect(-size / 2, -size / 2, size, size + 40, 14);
        borderOverlay.setAlpha(1);

        try {
            this.sound.play('correct', { volume: 0.5 });
        } catch (e) { }
    }

    private showWrongFeedbackOnButton(button: Phaser.GameObjects.Container) {
        const size = button.getData('size');

        const borderOverlay = button.getByName('border') as Phaser.GameObjects.Graphics;
        borderOverlay.clear();
        borderOverlay.lineStyle(5, 0xef4444, 1);
        borderOverlay.strokeRoundedRect(-size / 2, -size / 2, size, size + 40, 14);
        borderOverlay.setAlpha(1);

        const xmark = button.getByName('xmark') as Phaser.GameObjects.Text;
        xmark.setAlpha(1);

        try {
            this.sound.play('wrong', { volume: 0.4 });
        } catch (e) { }
    }

    private playSoundWithAnimation() {
        this.animateSoundWaves();

        // Play all sounds for this question
        this.currentQuestion.sounds.forEach((soundId, index) => {
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

    private replaySound() {
        if (this.replaysRemaining <= 0 || this.hasAnswered) return;

        this.replaysRemaining--;
        this.totalReplaysUsed++;

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

        this.tweens.add({
            targets: this.speakerContainer,
            alpha: 0.6,
            duration: 300,
        });
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

    private showWrongFeedback(button: Phaser.GameObjects.Container) {
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
        xmark.setScale(0.5);
        this.tweens.add({
            targets: xmark,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
        });

        const originalX = button.x;
        this.tweens.add({
            targets: button,
            x: originalX + 10,
            duration: 50,
            yoyo: true,
            repeat: 4,
            onComplete: () => button.setX(originalX),
        });

        // Show correct answer
        const correctId = this.currentQuestion.correctAnswers[0];
        const correctBtn = this.optionButtons.find(b => b.getData('id') === correctId);
        if (correctBtn && correctBtn !== button) {
            this.time.delayedCall(500, () => {
                const correctBorder = correctBtn.getByName('border') as Phaser.GameObjects.Graphics;
                const correctSize = correctBtn.getData('size');
                correctBorder.clear();
                correctBorder.lineStyle(5, 0x22c55e, 1);
                correctBorder.strokeRoundedRect(-correctSize / 2, -correctSize / 2, correctSize, correctSize + 40, 14);
                correctBorder.setAlpha(1);
            });
        }

        this.time.delayedCall(2000, () => {
            this.proceedToNextQuestion();
        });
    }

    private proceedToNextQuestion() {
        const totalQuestions = this.currentLevelConfig.questions.length;
        this.currentQuestionIndex++;

        if (this.currentQuestionIndex >= totalQuestions) {
            // All questions done
            this.endGame();
        } else {
            // Load next question
            this.loadNextQuestion();
        }
    }

    private loadNextQuestion() {
        // Reset state
        this.currentQuestion = this.currentLevelConfig.questions[this.currentQuestionIndex];
        this.requiredSelections = this.currentQuestion.correctAnswers.length;
        this.hasAnswered = false;
        this.selectedAnswers = [];
        this.replaysRemaining = this.currentLevelConfig.maxReplays;

        // Clear old UI
        this.optionButtons.forEach(btn => btn.destroy());
        this.optionButtons = [];
        if (this.selectionHint) this.selectionHint.destroy();
        if (this.confirmButton) this.confirmButton.destroy();

        // Update question indicator
        const totalQuestions = this.currentLevelConfig.questions.length;
        this.questionIndicator.setText(`ข้อ ${this.currentQuestionIndex + 1}/${totalQuestions}`);

        // Reset speaker
        this.drawSpeakerBody(0x6366f1);
        this.drawSpeakerCone(0x4f46e5);
        this.drawStaticWaves(0x4f46e5);
        this.speakerContainer.setAlpha(1);
        this.speakerContainer.setInteractive();

        // Play sound and show choices
        this.choicesVisible = false;
        this.playSoundWithAnimation();
        this.time.delayedCall(1500, () => {
            this.showChoices();
        });
    }

    private endGame() {
        const endTime = Date.now();
        const responseTimeMs = endTime - this.startTime;
        const totalQuestions = this.currentLevelConfig.questions.length;
        const timeLimitMs = this.currentLevelConfig.timeLimitSeconds * 1000;

        // Calculate Stars
        let stars = 0;
        if (this.questionsCorrect === totalQuestions) {
            if (this.totalReplaysUsed <= 1) {
                stars = 3;
            } else {
                stars = 2;
            }
        } else if (this.questionsCorrect >= Math.ceil(totalQuestions / 2)) {
            stars = 1;
        } else {
            stars = 0;
        }

        // Calculate Score
        const baseScore = this.questionsCorrect * 100;
        const timeBonus = stars > 0 ? Math.max(0, Math.floor((timeLimitMs - responseTimeMs) / 100)) : 0;
        const score = baseScore + timeBonus;

        // Calculate Stats (0-100)
        // Memory: Identifying sounds
        const stat_memory = 60 + (this.questionsCorrect / totalQuestions) * 40;
        // Focus: Distinguishing mixed sounds
        const stat_focus = 60 + (stars / 3) * 40;
        // Speed: Reaction time
        const speedRatio = Math.max(0, 1 - (responseTimeMs / timeLimitMs));
        const stat_speed = 50 + speedRatio * 50;

        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: stars > 0,
                level: this.level,
                stars: stars,
                score: score,
                stat_memory: Math.round(stat_memory),
                stat_focus: Math.round(stat_focus),
                stat_speed: Math.round(stat_speed),
                // Optional detailed stats for logging
                questionsCorrect: this.questionsCorrect,
                totalQuestions: totalQuestions,
                replaysUsed: this.totalReplaysUsed,
                responseTimeMs,
                starHint: stars < 3 ? 'พยายามฟังให้ดี\nแล้วใช้อุปกรณ์ช่วยให้น้อยลง!' : null
            });
        }
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        const { width, height } = gameSize;

        if (this.titleContainer) {
            this.titleContainer.setPosition(width / 2, 120);
        }

        if (this.questionIndicator) {
            this.questionIndicator.setPosition(width / 2, 165);
        }

        if (this.speakerContainer) {
            this.speakerContainer.setPosition(width / 2, height * 0.30);
        }

        if (this.selectionHint) {
            this.selectionHint.setPosition(width / 2, height * 0.42);
        }

        if (this.confirmButton) {
            this.confirmButton.setPosition(width / 2, height * 0.92);
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
