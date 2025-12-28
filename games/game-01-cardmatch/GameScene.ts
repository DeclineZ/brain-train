//latest update 1
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
    private customTimerBar!: Phaser.GameObjects.Graphics;
    private lastTimerPct: number = 100; // Store for redraw handling

    // Asset Mapping
    private emojiToAsset: { [key: string]: string } = {
        "🐙": "octopus",
        "⭐": "star",
        "🦫": "beaver",
        "🐤": "bird",
        "🐘": "elephant",
        "🐌": "snail",
        "🐢": "turtle",
        "🐳": "whale",
        "🦊": "fox",
        "🐼": "panda",
        "🦁": "lion",
        "🐸": "frog"
    };

    // Stats Tracking
    private attempts = 0;
    private wrongFlips = 0;
    private consecutiveErrors = 0;
    private currentErrorRun = 0;
    private currentStreak = 0; // Correct matches in a row
    private maxStreak = 0;
    private repeatedErrors = 0;
    private seenCards = new Set<number>();

    // New status flags
    private continuedAfterTimeout = false;
    private isPaused = false;

    // UI Elements
    private messageText!: any; // Phaser.GameObjects.Text
    private streakText!: any; // Phaser.GameObjects.Text

    constructor() { super({ key: 'MatchingGameScene' }); }

    init(data: { level: number }) {
        // Priority: Data Passed > Registry > Default
        const regLevel = this.registry.get('level');
        console.log(`[MatchingGameScene] init data=${JSON.stringify(data)} registry=${regLevel}`);
        const level = data.level || regLevel || 1;
        this.currentLevelConfig = MATCHING_LEVELS[level] || MATCHING_LEVELS[1];
        this.totalPairs = this.currentLevelConfig.totalPairs;

        // Reset stats
        this.matchedPairs = 0;
        this.attempts = 0;
        this.wrongFlips = 0;
        this.consecutiveErrors = 0;
        this.currentErrorRun = 0;
        this.currentStreak = 0;
        this.maxStreak = 0;
        this.repeatedErrors = 0;
        this.seenCards.clear();
        this.cards = [];
        this.openedCards = [];
        this.isLocked = true;
    }

    preload() {
        // Load Assets
        // Expects files in /public/assets/images/cardmatch/
        // e.g. octopus.png, star.png
        Object.values(this.emojiToAsset).forEach(assetName => {
            this.load.image(assetName, `/assets/images/cardmatch/${assetName}.png`);
        });
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
        this.createCards();

        // 3. Initial Layout
        this.layoutGrid();

        // 4. UI Layer
        this.createUI();
        this.customTimerBar = this.add.graphics();
        this.customTimerBar.setVisible(false); // Hide initially

        // 5. Start Sequence (Preview)
        this.startPreviewPhase();

        // 6. Handle Resize
        this.scale.on('resize', () => {
            this.layoutGrid();
            this.layoutUI(); // We'll add this helper too
            if (this.customTimerBar.visible) {
                this.drawTimerBar(this.lastTimerPct);
            }
        });

        // Listen for Resume Event from React
        this.game.events.on('resume-game', (data: { penalty: boolean }) => {
            this.resumeGame(data.penalty);
        });
    }

    // --- GAME FLOW ---

    createCards() {
        const { totalPairs } = this.currentLevelConfig;
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

        deck.forEach((emoji, i) => {
            const color = colorMap[emoji] || 0xFFFFFF;
            // Create off-screen initially
            const card = this.createCard(-1000, -1000, 100, 100, emoji, i, color);
            this.cards.push(card);
        });
    }

    layoutGrid() {
        const { width, height } = this.scale;
        const isPortrait = height > width;

        // Determine Columns based on orientation
        let cols = this.currentLevelConfig.gridCols;
        if (isPortrait) {
            // In portrait, we usually want fewer columns (e.g. 2 or 3)
            // For small levels (6 cards), 2 cols is good.
            // For larger levels (10 cards), 2 cols is still safely readable on phones.
            cols = 2;
        }

        const totalCards = this.cards.length;
        const rows = Math.ceil(totalCards / cols);

        // Grid Metrics - Responsive
        const maxCardW = 140;
        const maxCardH = 180;
        const baseGap = 15;

        // Allow 90% of screen width and 75% height
        const availableW = width * 0.95;
        const availableH = height * 0.75;

        // Calculate scaled dimensions
        let cardW = Math.min(maxCardW, (availableW - (cols - 1) * baseGap) / cols);
        let cardH = (cardW / maxCardW) * maxCardH; // Maintain aspect ratio
        let gap = baseGap * (cardW / maxCardW);

        // Re-check vertical fit
        const totalH = rows * cardH + (rows - 1) * gap;
        if (totalH > availableH) {
            const scale = availableH / totalH;
            cardW *= scale;
            cardH *= scale;
            gap *= scale;
        }

        const gridWidth = (cols * cardW) + ((cols - 1) * gap);
        const gridHeight = (rows * cardH) + ((rows - 1) * gap);

        const startX = (width - gridWidth) / 2 + cardW / 2;
        const startY = (height - gridHeight) / 2 + cardH / 2 + 30; // Small offset

        // Position Cards
        this.cards.forEach((cardObj, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);

            const x = startX + col * (cardW + gap);
            const y = startY + row * (cardH + gap);

            // Update container position
            cardObj.container.setPosition(x, y);

            // Children Logic
            const shadow = cardObj.container.list[0] as Phaser.GameObjects.Rectangle;
            shadow.setSize(cardW, cardH);
            const back = cardObj.container.list[1] as Phaser.GameObjects.Rectangle;
            back.setSize(cardW, cardH);
            const face = cardObj.container.list[2] as Phaser.GameObjects.Rectangle;
            face.setSize(cardW, cardH);
            const icon = cardObj.container.list[3];

            if (icon instanceof Phaser.GameObjects.Image) {
                const realW = icon.frame.width;
                const realH = icon.frame.height;
                const maxIconW = cardW * 0.75;
                const maxIconH = cardH * 0.75;
                if (realW > 0 && realH > 0) {
                    const scaleX = maxIconW / realW;
                    const scaleY = maxIconH / realH;
                    const scale = Math.min(scaleX, scaleY);
                    icon.setScale(scale);
                } else {
                    icon.setDisplaySize(maxIconW, maxIconH);
                }
            } else if (icon instanceof Phaser.GameObjects.Text) {
                const fontSize = Math.floor(Math.min(cardW, cardH) * 0.5);
                icon.setFontSize(fontSize);
            }
            cardObj.container.setSize(cardW, cardH);
            const hitZone = cardObj.container.list[4] as Phaser.GameObjects.Rectangle;
            if (hitZone && hitZone instanceof Phaser.GameObjects.Rectangle) {
                hitZone.setSize(cardW, cardH);
                if (hitZone.input) {
                    const hitArea = hitZone.input.hitArea as Phaser.Geom.Rectangle;
                    hitArea.setSize(cardW, cardH);
                } else {
                    hitZone.setInteractive({ useHandCursor: true });
                }
            }
            cardObj.baseScale = icon.scaleX;
        });

        // Re-center background
        const bg = this.children.list.find(c => c instanceof Phaser.GameObjects.Rectangle && c.fillColor === 0xFDF6E3) as Phaser.GameObjects.Rectangle;
        if (bg) {
            bg.setPosition(width / 2, height / 2);
            bg.setSize(width, height);
        }
    }

    startPreviewPhase() {
        this.messageText.setText("จำตำแหน่งให้ดีนะ...");
        this.messageText.setVisible(true);
        this.messageText.setScale(0);

        this.tweens.add({
            targets: this.messageText,
            scale: 1,
            y: this.scale.height * 0.15,
            duration: 500,
            ease: 'Back.out'
        });

        const barW = 300;
        const barH = 10;
        const barX = this.scale.width / 2 - barW / 2;
        const barY = this.scale.height - 100;

        const barBg = this.add.rectangle(this.scale.width / 2, barY, barW, barH, 0x000000, 0.1).setOrigin(0.5);
        const barFill = this.add.rectangle(barX, barY - barH / 2, 0, barH, 0x58CC02, 1).setOrigin(0, 0);

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
        this.customTimerBar.setVisible(true);
        this.drawTimerBar(100);

        this.timerEvent = this.time.addEvent({
            delay: 100,
            callback: () => {
                if (this.isPaused) return;

                const elapsed = Date.now() - this.startTime;
                const limitMs = this.currentLevelConfig.timeLimitSeconds * 1000;

                // If we continued, we might want to handle "extra time" or "no time limit"
                // Req: "Either grant extra time Or remove timer entirely"
                // Let's remove timer visual logic if continued, OR just add a huge buffer.
                // Simpler: If continued, we stop enforcing the limit event, but maybe keep tracking time?
                // Actually, let's just STOP the timer enforcement if we continue.
                if (this.continuedAfterTimeout) {
                    this.customTimerBar.setVisible(false);
                    return;
                }

                const remainingMs = Math.max(0, limitMs - elapsed);
                const remainingSeconds = Math.ceil(remainingMs / 1000);
                const pct = Math.max(0, (remainingMs / limitMs) * 100);
                this.lastTimerPct = pct;

                this.drawTimerBar(pct);

                this.game.events.emit('timer-update', {
                    remaining: remainingSeconds,
                    total: this.currentLevelConfig.timeLimitSeconds
                });

                if (remainingMs <= 0) {
                    this.handleTimeout();
                }
            },
            loop: true
        });
    }

    drawTimerBar(pct: number) {
        if (!this.customTimerBar) return;
        this.customTimerBar.clear();

        const { width, height } = this.scale;

        // Dynamic Positioning: Use the last calculated grid metrics or fallback
        // Since we don't store grid bounds globally in a clean way, let's estimate based on center.
        // Or better: Call layoutGrid() to get the bounds? No, that's heavy.
        // Let's rely on valid "Below Grid" placement.
        // Safe bet: Bottom 10-15% of screen, or below center + half grid.
        // Given 'layoutGrid' centers the grid, let's assume the grid takes ~75% H max.
        // So putting it at 90% Height is safe, OR we can make logic more robust later.
        // User asked "Below Card".

        const barW = Math.min(width * 0.8, 400);
        const barH = 16;
        const x = (width - barW) / 2;
        const y = height * 0.9; // Position at 90% height

        // Bg
        this.customTimerBar.fillStyle(0x8B4513, 0.2);
        this.customTimerBar.fillRoundedRect(x, y, barW, barH, 8);
        this.customTimerBar.lineStyle(2, 0x8B4513, 1);
        this.customTimerBar.strokeRoundedRect(x, y, barW, barH, 8);

        // Fill
        const isWarning = pct < 25;
        const color = isWarning ? 0xFF4444 : 0x76D13D;

        this.customTimerBar.fillStyle(color, 1);
        if (pct > 0) {
            this.customTimerBar.fillRoundedRect(x, y, barW * (pct / 100), barH, 8);
        }
    }

    handleTimeout() {
        this.isPaused = true;
        this.input.enabled = false;
        if (this.timerEvent) this.timerEvent.paused = true; // Pause the tick

        // Signal React to show the timeout popup
        this.game.events.emit('game-timeout', {
            level: this.currentLevelConfig.level
        });
    }

    resumeGame(applyPenalty: boolean) {
        this.isPaused = false;
        this.input.enabled = true;

        if (applyPenalty) {
            this.continuedAfterTimeout = true;
        }

        // Option 1: Grant extra time? 
        // Option 2: Remove timer? Reference says "Either grant extra time Or remove timer entirely".
        // Let's remove the timer constraint for the rest of this run.
        if (this.customTimerBar) {
            this.customTimerBar.setVisible(false);
        }

        // We do NOT resume the timerEvent loop for checking limits
        // But we DO want to keep tracking total time for stats if we wanted.
        // For now, just unpause logic.

        if (this.timerEvent) {
            // actually, if we "remove timer entirely", we just stop the event check.
            this.timerEvent.remove();
        }
    }

    failLevel() {
        // Legacy fail helper, mostly unused now handled by timeout popup choices
        // But if we wanted a hard fail condition (e.g. anti-cheat), keep it.
        this.input.enabled = false;
        if (this.timerEvent) this.timerEvent.remove();
        if (this.customTimerBar) {
            this.customTimerBar.setVisible(false);
        }

        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: false,
                level: this.currentLevelConfig.level
            });
        }
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
                stars: this.calculateStars(duration),
                success: true,
                continuedAfterTimeout: this.continuedAfterTimeout
            });
        }
    }

    calculateStars(duration: number): number {
        const parExceeded = duration > this.currentLevelConfig.parTimeSeconds * 1000;

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

        // Icon - Responsive Image
        const assetName = this.emojiToAsset[emoji];
        let icon: any;

        // Safety check: if image loaded, use it. Else text.
        // Safety check: if image loaded, use it. Else text.
        if (this.textures.exists(assetName)) {
            icon = this.add.image(0, 0, assetName).setOrigin(0.5);

            // 1. Get REAL dimensions from Texture Manager (safer than GameObject)
            const texture = this.textures.get(assetName);
            const frame = texture.get();
            const realW = frame.width || 0;
            const realH = frame.height || 0;

            const maxW = w * 0.75; // 75% of card width
            const maxH = h * 0.75; // 75% of card height

            if (realW > 0 && realH > 0) {
                // Valid texture found
                const scaleX = maxW / realW;
                const scaleY = maxH / realH;
                const scale = Math.min(scaleX, scaleY);
                icon.setScale(scale);
            } else {
                // Fallback: Texture valid key but 0 dimensions? Force visual size.
                // This prevents the "Giant Image" bug if dimensions are missing.
                icon.setDisplaySize(maxW, maxH);
            }
        } else {
            // Fallback to text if missing
            const fontSize = Math.floor(Math.min(w, h) * 0.5);
            icon = this.add.text(0, 0, emoji, { fontSize: `${fontSize}px` }).setOrigin(0.5);
        }

        // HITZONE: Transparent Interactive Layer
        const hitZone = this.add.rectangle(0, 0, w, h, 0x000000, 0).setOrigin(0.5);
        hitZone.setInteractive({ useHandCursor: true });

        container.add([shadow, back, face, icon, hitZone]);
        container.setSize(w, h); // Size for layout calc, not interaction

        const cardObj = { container, back, face, icon, hitZone, emoji, id, isFlipped: true, isMatched: false, baseScale: icon.scale };

        // Initial state is Face UP (for preview)
        back.visible = false;
        face.visible = true;
        face.scaleX = 1;
        icon.visible = true;

        // Initial scale must be set correctly
        icon.scaleX = cardObj.baseScale;

        // Listen on HitZone, not Container
        hitZone.on('pointerdown', () => this.handleCardClick(cardObj));

        return cardObj;
    }

    flipCard(card: any, toFace: boolean) {
        if (card.isFlipped === toFace) return;

        const duration = 150;

        // Tween 1: Scale to 0 (Flip halfway)
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

                // Tween 2: Scale back up (Finish flip)

                // We need separate tweens because icon has different target scale than back/face
                this.tweens.add({
                    targets: [card.back, card.face],
                    scaleX: 1,
                    duration: duration,
                    ease: 'Linear'
                });

                this.tweens.add({
                    targets: [card.icon],
                    scaleX: card.baseScale, // Restore to correct scale
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


        this.messageText = this.add.text(0, 0, '', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '40px',
            color: '#2B2115',
            stroke: '#FFFFFF',
            strokeThickness: 6,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100).setPadding(10, 14, 10, 18);

        this.streakText = this.add.text(0, 250, '', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '32px',
            color: '#FFD700',
            stroke: '#8B4513',
            strokeThickness: 4,
            fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false).setPadding(10, 14, 10, 18);

        this.layoutUI();
    }

    layoutUI() {
        const { width, height } = this.scale;

        // Position UI elements relative to new size
        this.messageText.setPosition(width / 2, height / 2);

        // Responsive Streak Text (e.g., 20% from top)
        this.streakText.setPosition(width / 2, height * 0.15);

        // Center alignment adjustments if screen is very narrow

    }

    updateStreakUI(isMatch: boolean) {
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
}
