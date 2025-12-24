import * as Phaser from 'phaser';
import { MATCHING_LEVELS, MatchingLevelConfig } from './levels';

export class MatchingGameScene extends Phaser.Scene {
    private currentLevelConfig!: MatchingLevelConfig;

    // Game State
    private cards: any[] = [];
    private openedCards: any[] = [];
    private matchedPairs = 0;
    private totalPairs = 0;
    private isLocked = true; // Start locked for preview
    private startTime = 0;
    private timerEvent!: Phaser.Time.TimerEvent;

    // Stats Tracking
    private attempts = 0;
    private wrongFlips = 0;
    private consecutiveErrors = 0;
    private currentStreak = 0; // Correct matches in a row
    private maxStreak = 0;
    private repeatedErrors = 0;
    private seenCards = new Set<number>();

    // UI Elements
    private timerText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private messageText!: Phaser.GameObjects.Text;
    private streakText!: Phaser.GameObjects.Text;
    private uiContainer!: Phaser.GameObjects.Container;

    constructor() { super({ key: 'MatchingGameScene' }); }

    init(data: { level: number }) {
        const level = data.level || 1;
        this.currentLevelConfig = MATCHING_LEVELS[level] || MATCHING_LEVELS[1];
        this.totalPairs = this.currentLevelConfig.totalPairs;

        // Reset stats
        this.matchedPairs = 0;
        this.attempts = 0;
        this.wrongFlips = 0;
        this.consecutiveErrors = 0;
        this.currentStreak = 0;
        this.maxStreak = 0;
        this.repeatedErrors = 0;
        this.seenCards.clear();
        this.cards = [];
        this.openedCards = [];
        this.isLocked = true;
    }

    create() {
        const { width, height } = this.scale;

        // 1. Background (Warm Cream)
        this.add.rectangle(width / 2, height / 2, width, height, 0xFDF6E3);

        // Decorative Grid/Pattern (Subtle)
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xEBDCCB, 0.4);
        for (let i = 0; i < width; i += 40) graphics.moveTo(i, 0).lineTo(i, height);
        for (let i = 0; i < height; i += 40) graphics.moveTo(0, i).lineTo(width, i);
        graphics.strokePath();

        // 2. Setup Grid Cards
        this.setupGrid();

        // 3. UI Layer
        this.createUI();

        // 4. Start Sequence (Preview)
        this.startPreviewPhase();
    }

    // --- GAME FLOW ---

    setupGrid() {
        const { gridCols, totalPairs } = this.currentLevelConfig;
        // Prepare Emoji Deck
        const emojis = ["🐙", "⭐", "🦫", "🐤", "🐘", "🐌", "🐢", "🐳", "🦊", "🐼", "🦁", "🐸"];
        const selectedEmojis = emojis.slice(0, totalPairs);
        const deck = [...selectedEmojis, ...selectedEmojis];
        Phaser.Utils.Array.Shuffle(deck);

        // Emoji Color Map (Pastel/Hay Day vibes)
        const colorMap: { [key: string]: number } = {
            "🐙": 0xFFB3BA, // Pastel Red
            "⭐": 0xFFDFBA, // Pastel Orange
            "🦫": 0xD2B48C, // Tan
            "🐤": 0xFFFFBA, // Pastel Yellow
            "🐘": 0xBaffC9, // Pastel Green (Mint)
            "🐌": 0xEECBFF, // Lavender
            "🐢": 0x97C1A9, // Sage
            "🐳": 0xBAE1FF, // Pastel Blue
            "🦊": 0xFFCCB6, // Peach
            "🐼": 0xE0E0E0, // Light Gray
            "🦁": 0xFDFD96, // Light Yellow
            "🐸": 0xC1E1C1  // Tea Green
        };

        // Grid Metrics
        const cardW = 90;
        const cardH = 120;
        const gap = 15;

        const maxCols = gridCols;
        const rows = Math.ceil(deck.length / maxCols);

        const gridWidth = (maxCols * cardW) + ((maxCols - 1) * gap);
        const gridHeight = (rows * cardH) + ((rows - 1) * gap);

        const startX = (this.scale.width - gridWidth) / 2 + cardW / 2;
        const startY = (this.scale.height - gridHeight) / 2 + cardH / 2 + 20; // Slight offset for header

        deck.forEach((emoji, i) => {
            const col = i % maxCols;
            const row = Math.floor(i / maxCols);

            const x = startX + col * (cardW + gap);
            const y = startY + row * (cardH + gap);


            const bg = colorMap[emoji] || 0xFFFFFF;
            const card = this.createCard(x, y, cardW, cardH, emoji, i, bg);
            this.cards.push(card);
        });
    }

    startPreviewPhase() {
        // Show stats initially? No, just "Memorize!"
        this.messageText.setText("จำตำแหน่งให้ดีนะ...");
        this.messageText.setVisible(true);
        this.messageText.setScale(0);

        // Pop in text
        this.tweens.add({
            targets: this.messageText,
            scale: 1,
            duration: 500,
            ease: 'Back.out'
        });

        // Progress Bar for Preview
        const barW = 300;
        const barH = 10;
        const barX = this.scale.width / 2 - barW / 2;
        const barY = this.scale.height - 100;

        const barBg = this.add.rectangle(this.scale.width / 2, barY, barW, barH, 0x000000, 0.1).setOrigin(0.5);
        const barFill = this.add.rectangle(barX, barY - barH / 2, 0, barH, 0x58CC02, 1).setOrigin(0, 0); // Green

        this.tweens.add({
            targets: barFill,
            width: barW,
            duration: this.currentLevelConfig.previewTimeMs,
            ease: 'Linear',
            onComplete: () => {
                barBg.destroy();
                barFill.destroy();
                this.endPreview();
            }
        });

        // Ensure all cards are Face UP
        this.cards.forEach(c => {
            if (!c.isFlipped) this.flipCard(c, true);
        });
    }

    endPreview() {
        this.tweens.add({
            targets: this.messageText,
            scale: 0,
            duration: 300,
            onComplete: () => {
                this.messageText.setVisible(false);
            }
        });

        // Flip all cards down
        this.cards.forEach((card, index) => {
            this.time.delayedCall(index * 50, () => {
                this.flipCard(card, false);
            });
        });

        this.time.delayedCall(this.cards.length * 50 + 500, () => {
            this.isLocked = false;
            this.startTime = Date.now();
            this.startTimer();
        });
    }

    startTimer() {
        this.timerEvent = this.time.addEvent({
            delay: 100,
            callback: () => {
                const elapsed = Date.now() - this.startTime;
                const seconds = Math.floor(elapsed / 1000);
                this.timerText.setText(`${seconds}s`);
            },
            loop: true
        });
    }

    // --- CORE GAMEPLAY ---

    handleCardClick(card: any) {
        if (this.isLocked) return;
        if (card.isFlipped || card.isMatched) return;

        this.flipCard(card, true);
        this.openedCards.push(card);

        if (this.openedCards.length === 2) {
            this.attempts++;
            this.checkForMatch();
        }
    }

    checkForMatch() {
        this.isLocked = true;
        const [c1, c2] = this.openedCards;

        const match = c1.emoji === c2.emoji;

        if (match) {
            // MATCH
            this.matchedPairs++;
            this.currentStreak++;
            if (this.currentStreak > this.maxStreak) this.maxStreak = this.currentStreak;

            c1.isMatched = true;
            c2.isMatched = true;

            this.playMatchEffect(c1);
            this.playMatchEffect(c2);

            this.updateStreakUI(true);

            if (this.matchedPairs === this.totalPairs) {
                this.time.delayedCall(1000, () => this.endGame());
            } else {
                this.time.delayedCall(500, () => {
                    this.openedCards = [];
                    this.isLocked = false;
                });
            }

        } else {
            // WRONG
            this.wrongFlips++;
            this.currentStreak = 0;
            this.updateStreakUI(false);

            // Need MAX consecutive errors. 
            // But stat says "consecutiveErrors". I'll interpret it as a "negative streak" if needed, 
            // but usually for scoring, we just subtract per wrong.
            // However, the formula says: 100 - (wrongFlips * 5) - (consecutiveErrors * 2)
            // So I DO need to track max consecutive errors.
            // Wait, I need a separate `currentConsecutiveErrors` counter.
            // I'll add `currentConsecutiveErrors` property to class? 
            // Actually let's just use a local logical variable concept if I had it. 
            // I'll add it to the state. Since I'm overwriting the file, I can add it now.

            // I'll just hack it: use `consecutiveErrors` as the MAX, and add a property `currentErrorRun` to track current run.
            // I'll add `private currentErrorRun = 0;` to top.

            if (this.seenCards.has(c1.id) || this.seenCards.has(c2.id)) {
                this.repeatedErrors++;
            }

            this.playShakeEffect(c1);
            this.playShakeEffect(c2);

            this.time.delayedCall(800, () => {
                this.flipCard(c1, false);
                this.flipCard(c2, false);
                this.openedCards = [];
                this.isLocked = false;
            });
        }

        this.seenCards.add(c1.id);
        this.seenCards.add(c2.id);
    }

    // Helper for tracking error run
    // I'll implement the logic in checkForMatch actually properly with `currentErrorRun` if I could edit fields, 
    // but I can just do it here:
    /*
      if (match) {
          this.currentErrorRun = 0;
      } else {
          this.currentErrorRun++;
          this.consecutiveErrors = Math.max(this.consecutiveErrors, this.currentErrorRun);
      }
    */
    // Since I can't easily add a property without changing definitions too much, and I want to be safe,
    // I'll use `this.registry` or just add the property since I'm rewriting the whole file. 
    // I will add `private currentErrorRun = 0;` 

    endGame() {
        this.input.enabled = false; // Stop all input
        if (this.timerEvent) this.timerEvent.remove();
        const endTime = Date.now();
        const duration = endTime - this.startTime;

        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                levelPlayed: this.currentLevelConfig.level,
                difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
                totalPairs: this.totalPairs,
                wrongFlips: this.wrongFlips,
                consecutiveErrors: this.consecutiveErrors,
                repeatedErrors: this.repeatedErrors,
                userTimeMs: duration,
                parTimeMs: this.currentLevelConfig.parTimeSeconds * 1000,
                attempts: this.attempts,
                stars: this.calculateStars(duration)
            });
        }
    }

    calculateStars(duration: number): number {
        const parExceeded = duration > this.currentLevelConfig.parTimeSeconds * 1000;
        const manyMistakes = this.wrongFlips > 2;

        if (!parExceeded && this.wrongFlips <= 1) return 3;
        if (!parExceeded || this.wrongFlips <= 3) return 2;
        return 1;
    }

    // --- VISUALS & HELPERS ---

    createCard(x: number, y: number, w: number, h: number, emoji: string, id: number, color: number) {
        const container = this.add.container(x, y);

        // Shadow
        const shadow = this.add.rectangle(4, 4, w, h, 0x000000, 0.15).setOrigin(0.5);

        // Back (Brown/Orange theme like reference)
        const back = this.add.rectangle(0, 0, w, h, 0xE86A33).setOrigin(0.5); // Orange
        back.setStrokeStyle(4, 0xFFFFFF);

        // Face (White with Colored Border)
        const face = this.add.rectangle(0, 0, w, h, 0xFFFFFF).setOrigin(0.5);
        face.setStrokeStyle(8, color);
        face.visible = false;
        face.scaleX = 0;

        // Icon
        const icon = this.add.text(0, 0, emoji, { fontSize: '48px' }).setOrigin(0.5).setPadding(10, 14, 10, 18);
        icon.visible = false;
        icon.scaleX = 0;

        container.add([shadow, back, face, icon]);
        container.setSize(w, h);
        container.setInteractive({ useHandCursor: true });

        const cardObj = { container, back, face, icon, emoji, id, isFlipped: true, isMatched: false };

        // Initial state is Face UP (for preview)
        back.visible = false;
        face.visible = true;
        face.scaleX = 1;
        icon.visible = true;
        icon.scaleX = 1;

        container.on('pointerdown', () => this.handleCardClick(cardObj));

        return cardObj;
    }

    flipCard(card: any, toFace: boolean) {
        if (card.isFlipped === toFace) return;

        const duration = 150;

        this.tweens.add({
            targets: [card.back, card.face, card.icon],
            scaleX: 0,
            duration: duration,
            ease: 'Linear',
            onComplete: () => {
                card.isFlipped = toFace;
                if (toFace) {
                    card.back.visible = false;
                    card.face.visible = true;
                    card.icon.visible = true;
                } else {
                    card.back.visible = true;
                    card.face.visible = false;
                    card.icon.visible = false;
                }

                this.tweens.add({
                    targets: [card.back, card.face, card.icon],
                    scaleX: 1,
                    duration: duration,
                    ease: 'Linear'
                });
            }
        });
    }

    playMatchEffect(card: any) {
        this.tweens.add({
            targets: card.container,
            scale: 1.1,
            duration: 100,
            yoyo: true,
            ease: 'Back.out'
        });

        for (let i = 0; i < 8; i++) {
            const p = this.add.circle(card.container.x, card.container.y, 6, 0xFFD700, 1);
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const dist = Phaser.Math.FloatBetween(40, 60);

            this.tweens.add({
                targets: p,
                x: p.x + Math.cos(angle) * dist,
                y: p.y + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0,
                duration: 600,
                onComplete: () => p.destroy()
            });
        }
    }

    playShakeEffect(card: any) {
        this.tweens.add({
            targets: card.container,
            x: '+=10',
            duration: 50,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut'
        });
    }

    createUI() {
        const { width } = this.scale;

        this.levelText = this.add.text(20, 20, `LEVEL ${this.currentLevelConfig.level}`, {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '24px',
            color: '#8B4513',
            fontStyle: 'bold'
        });

        this.timerText = this.add.text(width - 20, 20, '0s', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '28px',
            color: '#E86A33',
            fontStyle: 'bold'
        }).setOrigin(1, 0).setPadding(10, 14, 10, 18);

        this.messageText = this.add.text(width / 2, this.scale.height / 2, '', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '40px',
            color: '#2B2115',
            stroke: '#FFFFFF',
            strokeThickness: 6,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100).setPadding(10, 14, 10, 18);

        this.streakText = this.add.text(width / 2, 100, '', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '32px',
            color: '#FFD700',
            stroke: '#8B4513',
            strokeThickness: 4,
            fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false).setPadding(10, 14, 10, 18);
    }

    updateStreakUI(isMatch: boolean) {
        // Logic for error run here
        if (isMatch) {
            this.currentErrorRun = 0;
            if (this.currentStreak > 1) {
                this.streakText.setText(`${this.currentStreak} COMBO!`);
                this.streakText.setVisible(true);
                this.streakText.setScale(0.5);
                this.streakText.alpha = 1;

                this.tweens.add({
                    targets: this.streakText,
                    scale: 1.2,
                    duration: 200,
                    ease: 'Back.out',
                    onComplete: () => {
                        this.tweens.add({
                            targets: this.streakText,
                            scale: 1,
                            alpha: 0,
                            delay: 500,
                            duration: 300
                        });
                    }
                });
            }
        } else {
            this.currentErrorRun++;
            if (this.currentErrorRun > this.consecutiveErrors) {
                this.consecutiveErrors = this.currentErrorRun;
            }
        }
    }

    // To fix 'currentErrorRun' not existing
    private currentErrorRun = 0;
}
