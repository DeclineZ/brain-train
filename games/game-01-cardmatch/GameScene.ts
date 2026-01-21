//latest update 1
import * as Phaser from 'phaser';
import { MATCHING_LEVELS } from './levels';
import type { MatchingLevelConfig } from '@/types';

export class MatchingGameScene extends Phaser.Scene {
    private currentLevelConfig!: MatchingLevelConfig;

    // Audio Settings
    private bgMusic!: Phaser.Sound.BaseSound;
    private bgMusicVolume = 0.5; // Adjustable volume


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
    private turnsTaken = 0; // Track turns for periodic swaps

    // Grid Metrics for swapping calculations
    private gridMetrics: {
        cardW: number;
        cardH: number;
        gap: number;
        startX: number;
        startY: number;
        cols: number;
    } | null = null;

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
    private hasPlayedLowTimeWarning = false;

    // UI Elements
    private messageText!: any; // Phaser.GameObjects.Text
    private streakText!: any; // Phaser.GameObjects.Text

    // Level Hints - shown at key transition levels to explain new mechanics
    private readonly levelHints: { [key: number]: string } = {
        7: "⚠️ ตั้งใจดูภาพให้ดี!\nบางการ์ดอาจหันซ้าย/ขวา หรือมีจำนวนต่างกัน",
        16: "⚠️ ไพ่จะสลับตำแหน่ง!\nหลังจากดูไพ่ ไพ่บางใบจะสลับที่กัน จงจำให้ดี",
        27: "⚠️ ระหว่างเล่นไพ่จะสลับ!\nไพ่จะสลับที่ระหว่างที่คุณเล่นด้วย",
        36: "⚠️ ด่านท้าทาย!\nรวมทุกความยาก: ภาพซ้าย/ขวา + สลับตำแหน่ง"
    };

    constructor() { super({ key: 'MatchingGameScene' }); }

    init(data: { level: number }) {
        // Priority: Data Passed > Registry > Default
        const regLevel = this.registry.get('level');
        console.log(`[MatchingGameScene] init data=${JSON.stringify(data)} registry=${regLevel}`);
        const level = data.level || regLevel || 1;
        this.currentLevelConfig = MATCHING_LEVELS[level] || MATCHING_LEVELS[1];
        this.totalPairs = this.currentLevelConfig.totalPairs;

        // Reset Sound Flags
        this.hasPlayedLowTimeWarning = false;
        this.stopWarningSound();
        this.sound.getAll('bg-music').forEach(s => s.stop());

        // Reset stats
        this.matchedPairs = 0;
        this.attempts = 0;
        this.wrongFlips = 0;
        this.consecutiveErrors = 0;
        this.currentErrorRun = 0;
        this.currentStreak = 0;
        this.turnsTaken = 0;
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

        // Load Audio
        this.load.audio('card-flip', '/assets/sounds/cardmatch/card-flip.mp3');
        this.load.audio('match-success', '/assets/sounds/cardmatch/match-success.mp3');
        this.load.audio('match-fail', '/assets/sounds/cardmatch/match-fail.mp3');
        this.load.audio('timer-warning', '/assets/sounds/global/timer-warning.mp3');
        this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('level-fail', '/assets/sounds/global/level-fail.mp3');
        this.load.audio('bg-music', '/assets/sounds/cardmatch/bg-music.mp3');
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
        this.customTimerBar.setDepth(150); // Ensure it's above cards (depth 100 during swap)
        this.customTimerBar.setVisible(false); // Hide initially

        // 5. Start Sequence (Check for Level Hint first, then Preview)
        const hintMessage = this.levelHints[this.currentLevelConfig.level];
        if (hintMessage) {
            this.showLevelHint(hintMessage);
        } else {
            this.startPreviewPhase();
        }

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

        // 7. Start BG Music
        try {
            this.bgMusic = this.sound.add('bg-music', {
                volume: this.bgMusicVolume,
                loop: true
            });
            this.bgMusic.play();
        } catch (e) {
            console.warn("Audio 'bg-music' failed to play", e);
        }
    }

    update() {
        if (!this.customTimerBar || !this.customTimerBar.visible || this.isPaused || this.continuedAfterTimeout || this.startTime === 0) return;

        const limitMs = this.currentLevelConfig.timeLimitSeconds * 1000;
        const elapsed = Date.now() - this.startTime;
        const remainingMs = Math.max(0, limitMs - elapsed);
        const pct = Math.max(0, (remainingMs / limitMs) * 100);

        this.drawTimerBar(pct);
    }

    // --- GAME FLOW ---

    createCards() {
        const { totalPairs, useHardVariations } = this.currentLevelConfig;

        // Prepare Emoji Deck
        // We need a stable list of assets
        const assets = ["octopus", "beaver", "bird", "elephant", "snail", "turtle", "whale", "fox", "panda", "lion"];

        // Color Map for Backgrounds (Pastel)
        const assetColors: { [key: string]: number } = {
            "octopus": 0xFFB3BA, "beaver": 0xD2B48C, "bird": 0xFFFFBA,
            "elephant": 0xBaffC9, "snail": 0xEECBFF, "turtle": 0x97C1A9, "whale": 0xBAE1FF,
            "fox": 0xFFCCB6, "panda": 0xE0E0E0, "lion": 0xFDFD96
        };

        this.cards = [];
        let deck: any[] = [];

        if (useHardVariations) {
            // HARD MODE: Create "Confusing Pairs"
            // We need groups of 2 pairs that look similar.
            // e.g. if totalPairs = 4, we want 2 "Concepts" (e.g. Octopus, Star)
            // Concept 1 (Octopus): Pair A (Normal), Pair B (Variation)

            const conceptsNeeded = Math.floor(totalPairs / 2);
            const leftovers = totalPairs % 2;

            // Shuffle assets to pick random concepts
            Phaser.Utils.Array.Shuffle(assets);
            const selectedAssets = assets.slice(0, conceptsNeeded + leftovers);

            let assetHighIndex = 0;

            // 1. Generate Confusing Sets
            for (let i = 0; i < conceptsNeeded; i++) {
                const asset = selectedAssets[assetHighIndex++];
                const color = assetColors[asset] || 0xFFFFFF;

                // Pick a variation type for this set
                // Removed 'gray' as per user feedback
                const varType = Phaser.Math.RND.pick(['quantity', 'orientation']);

                // Pair 1: Base
                deck.push({ asset, id: i * 4, color, variation: 'normal', matchId: `${asset}_normal` });
                deck.push({ asset, id: i * 4 + 1, color, variation: 'normal', matchId: `${asset}_normal` });

                // Pair 2: Modified
                deck.push({ asset, id: i * 4 + 2, color, variation: varType, matchId: `${asset}_${varType}` });
                deck.push({ asset, id: i * 4 + 3, color, variation: varType, matchId: `${asset}_${varType}` });
            }

            // 2. Handle Leftovers (Simple Pairs)
            if (leftovers > 0) {
                const asset = selectedAssets[assetHighIndex];
                const color = assetColors[asset] || 0xFFFFFF;
                deck.push({ asset, id: 900, color, variation: 'normal', matchId: `${asset}_normal` });
                deck.push({ asset, id: 901, color, variation: 'normal', matchId: `${asset}_normal` });
            }

        } else {
            // BASIC MODE: Distinct Assets
            Phaser.Utils.Array.Shuffle(assets);
            const selected = assets.slice(0, totalPairs);

            selected.forEach((asset, i) => {
                const color = assetColors[asset] || 0xFFFFFF;
                // Add Pair
                deck.push({ asset, id: i * 2, color, variation: 'normal', matchId: asset });
                deck.push({ asset, id: i * 2 + 1, color, variation: 'normal', matchId: asset });
            });
        }

        // Shuffle Deck Positions
        Phaser.Utils.Array.Shuffle(deck);

        // Instantiate
        deck.forEach((data, i) => {
            // Create off-screen
            const card = this.createCard(-1000, -1000, 100, 100, data, i);
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
            // But for 12+ cards, 2 cols becomes too tall (2x6). Switch to 3 or 4 cols.
            const totalCards = this.cards.length;
            if (totalCards >= 16) {
                cols = 4; // 4x4
            } else if (totalCards >= 12) {
                cols = 3; // 3x4
            } else {
                cols = 2; // 2x2, 2x3, 2x4, 2x5
            }
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

        this.gridMetrics = { cardW, cardH, gap, startX, startY, cols };

        // Position Cards

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

            // iconContainer is a Container, handle nested images
            if (icon instanceof Phaser.GameObjects.Container) {
                icon.list.forEach((child: any) => {
                    if (child instanceof Phaser.GameObjects.Image) {
                        const realW = child.frame.width;
                        const realH = child.frame.height;
                        const maxIconW = cardW * 0.75;
                        const maxIconH = cardH * 0.75;
                        if (realW > 0 && realH > 0) {
                            const scale = Math.min(maxIconW / realW, maxIconH / realH);
                            child.setScale(scale);
                        }
                    } else if (child instanceof Phaser.GameObjects.Text) {
                        const fontSize = Math.floor(Math.min(cardW, cardH) * 0.5);
                        child.setFontSize(fontSize);
                    }
                });
            } else if (icon instanceof Phaser.GameObjects.Image) {
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

    performCardSwap(count: number, callback: () => void, onlyUnopened: boolean = false) {
        if (!this.gridMetrics || this.cards.length < 2) {
            callback();
            return;
        }

        // Identify cards to swap
        let eligibleIndices = this.cards.map((_, i) => i);
        if (onlyUnopened) {
            eligibleIndices = eligibleIndices.filter(i => {
                const c = this.cards[i];
                return !c.isMatched && !c.face.visible;
            });
        }

        if (eligibleIndices.length < 2) {
            callback();
            return;
        }

        // Shuffle eligible indices to pick which ones to swap
        Phaser.Utils.Array.Shuffle(eligibleIndices);

        // We want to swap 'count' PAIRS, meaning 'count * 2' cards, but simpler:
        // The input 'count' to this function usually meant "Total Cards to swap" in previous logic?
        // Let's check call sites: 
        // In periodic swap: "const count = pairsToSwap * 2;" -> So it receives Total Cards.
        // In startPreviewPhase: "const count = ...swapAfterPreviewCount" -> Receives Total Cards.

        // Let's determine how many PAIRS we can form
        const pairsToForm = Math.floor(Math.min(count, eligibleIndices.length) / 2);

        if (pairsToForm < 1) {
            callback();
            return;
        }

        // Create a sequence of swaps
        const swapPairs: [number, number][] = [];
        for (let i = 0; i < pairsToForm; i++) {
            swapPairs.push([eligibleIndices[2 * i], eligibleIndices[2 * i + 1]]);
        }

        // Recursive function to execute swaps one by one
        const executeNextSwap = (index: number) => {
            if (index >= swapPairs.length) {
                // All swaps done
                callback();
                return;
            }

            const [idx1, idx2] = swapPairs[index];
            const card1 = this.cards[idx1];
            const card2 = this.cards[idx2];

            // Swap in array
            this.cards[idx1] = card2;
            this.cards[idx2] = card1;

            // Calculate new positions
            // We need to fetch Layout metrics again or just calculate target for these specific slots
            // But wait, the 'cards' array index determines the grid slot.
            // So card1 is now at slot idx2, and card2 is at slot idx1.

            // We can reuse animateGridReorder BUT that reorders everyone.
            // Efficient way: Just animate these two specific cards to their new slots.

            this.animatePairSwap(card1, card2, idx2, idx1, () => {
                // Wait a tiny bit then next
                this.time.delayedCall(200, () => {
                    executeNextSwap(index + 1);
                });
            });
        };

        executeNextSwap(0);
    }

    animatePairSwap(card1: any, card2: any, slot1: number, slot2: number, onComplete: () => void) {
        if (!this.gridMetrics) { onComplete(); return; }
        const { cardW, cardH, gap, startX, startY, cols } = this.gridMetrics;

        const getPos = (i: number) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            return {
                x: startX + col * (cardW + gap),
                y: startY + row * (cardH + gap)
            };
        };

        const target1 = getPos(slot1);
        const target2 = getPos(slot2);

        // Bring to top
        card1.container.setDepth(100);
        card2.container.setDepth(100);

        // Safe visual reference for highlighting (Back of card)
        const back1 = card1.container.list[1] as Phaser.GameObjects.Rectangle;
        const back2 = card2.container.list[1] as Phaser.GameObjects.Rectangle;
        const originalColor = 0xE86A33; // Default orange

        // --- PHASE 1: HIGHLIGHT & LIFT ---
        // Flash Gold
        if (back1.fillColor === originalColor) back1.setFillStyle(0xFFD700);
        if (back2.fillColor === originalColor) back2.setFillStyle(0xFFD700);

        this.tweens.add({
            targets: [card1.container, card2.container],
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 350,
            ease: 'Back.out',
            onComplete: () => {
                // --- PHASE 2: MOVE ---
                // Play "swish"
                this.sound.play('card-flip', { volume: 0.6, rate: 1.2 });

                this.tweens.add({
                    targets: card1.container,
                    x: target1.x,
                    y: target1.y,
                    duration: 700, // Slower for readability
                    ease: 'Cubic.inOut'
                });

                this.tweens.add({
                    targets: card2.container,
                    x: target2.x,
                    y: target2.y,
                    duration: 700,
                    ease: 'Cubic.inOut',
                    onComplete: () => {
                        // --- PHASE 3: DROP ---
                        // Play "thump"
                        this.sound.play('card-flip', { volume: 0.4, rate: 0.8 });

                        this.tweens.add({
                            targets: [card1.container, card2.container],
                            scaleX: 1.0,
                            scaleY: 1.0,
                            duration: 250,
                            ease: 'Back.in',
                            onComplete: () => {
                                // Restore visuals
                                back1.setFillStyle(originalColor);
                                back2.setFillStyle(originalColor);
                                card1.container.setDepth(0);
                                card2.container.setDepth(0);

                                onComplete();
                            }
                        });
                    }
                });
            }
        });
    }

    // Keep animateGridReorder for full shuffles if needed, but it's less used now
    animateGridReorder(callback: () => void) {
        if (!this.gridMetrics) { callback(); return; }
        const { cardW, cardH, gap, startX, startY, cols } = this.gridMetrics;

        this.cards.forEach((cardObj, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const targetX = startX + col * (cardW + gap);
            const targetY = startY + row * (cardH + gap);

            this.tweens.add({
                targets: cardObj.container,
                x: targetX,
                y: targetY,
                duration: 600,
                ease: 'Cubic.out'
            });
        });

        this.time.delayedCall(650, callback);
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
                this.flipCard(card, false, false); // Silent flip back
            });
        });

        this.time.delayedCall(this.cards.length * 50 + 500, () => {
            // Check for Post-Preview Swap Logic
            const swapCount = this.currentLevelConfig.swapAfterPreviewCount || 0;

            if (swapCount > 0) {
                // Perform "Nice" Shuffle 1-by-1
                this.performCardSwap(swapCount, () => {
                    this.isLocked = false;
                    this.startTime = Date.now();
                    this.startTimer();
                });
            } else {
                this.isLocked = false;
                this.startTime = Date.now();
                this.startTimer();
            }
        });
    }

    startTimer() {
        if (this.continuedAfterTimeout) return; // Should not happen given logic, but safe guard

        this.customTimerBar.setVisible(true);
        this.drawTimerBar(100);

        this.timerEvent = this.time.addEvent({
            delay: 100,
            callback: () => {
                if (this.isPaused) return;

                const elapsed = Date.now() - this.startTime;
                const limitMs = this.currentLevelConfig.timeLimitSeconds * 1000;

                // If we are in "continued" mode, we shouldn't be here (timerEvent should be removed), 
                // but if we somehow are, exit.
                if (this.continuedAfterTimeout) {
                    this.customTimerBar.setVisible(false);
                    return;
                }

                const remainingMs = Math.max(0, limitMs - elapsed);
                const remainingSeconds = Math.ceil(remainingMs / 1000);
                const pct = Math.max(0, (remainingMs / limitMs) * 100);
                this.lastTimerPct = pct;

                // Drawing handled in update() for smoothness

                this.game.events.emit('timer-update', {
                    remaining: remainingSeconds,
                    total: this.currentLevelConfig.timeLimitSeconds
                });

                // Low Time Warning
                if (pct <= 25 && !this.hasPlayedLowTimeWarning && !this.continuedAfterTimeout) {
                    this.hasPlayedLowTimeWarning = true;
                    // Play looped warning or single warning? 
                    // Requirement: "Play when countdown timer is close to ending"
                    // Let's play it once or loop? Looping might be annoying if they recover.
                    // For now, play once when crossing 25%.
                    this.sound.play('timer-warning');
                }

                // if (remainingMs <= 0) {
                //     this.handleTimeout();
                // }
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
        // Fill
        const isWarning = pct < 25;
        const color = isWarning ? 0xFF4444 : 0x76D13D;

        let alpha = 1;
        if (isWarning) {
            // Flash effect: oscillate alpha between 0.3 and 1
            alpha = 0.65 + 0.35 * Math.sin(this.time.now / 150);
        }

        this.customTimerBar.fillStyle(color, alpha);
        if (pct > 0) {
            this.customTimerBar.fillRoundedRect(x, y, barW * (pct / 100), barH, 8);
        }
    }

    handleTimeout() {
        this.isPaused = true;
        this.input.enabled = false;
        if (this.timerEvent) this.timerEvent.paused = true;

        if (this.timerEvent) this.timerEvent.paused = true;

        this.stopWarningSound();
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.pause();
        }

        // Show Time's Up Text
        this.messageText.setText("หมดเวลา!");
        this.messageText.setColor('#ff4444'); // Red letters
        this.messageText.setVisible(true);
        this.messageText.setScale(0);
        this.messageText.setPosition(this.scale.width / 2, this.scale.height / 2);

        this.tweens.add({
            targets: this.messageText,
            scale: 1.5,
            duration: 500,
            ease: 'Back.out'
        });

        this.sound.play('level-fail');

        // Wait 2.5 seconds before showing popup
        this.time.delayedCall(2500, () => {
            // Signal React to show the timeout popup
            this.game.events.emit('game-timeout', {
                level: this.currentLevelConfig.level
            });

            this.messageText.setVisible(false);
        });
    }

    resumeGame(applyPenalty: boolean) {
        this.isPaused = false;
        this.input.enabled = true;

        if (applyPenalty) {
            this.continuedAfterTimeout = true;

            // PENALTY & FREE PLAY MODE
            // 1. Remove visual timer bar
            if (this.customTimerBar) {
                this.customTimerBar.setVisible(false);
            }
            // Stop warning sound if playing
            this.stopWarningSound();

            // 2. Stop the timer event completely (No more ticks)
            if (this.timerEvent) {
                this.timerEvent.remove();
            }

            // 3. Emit a "Safe" timer update to React to clear any red flash/warnings
            // Sending matching remaining/total implies 100% or just safe state.
            this.game.events.emit('timer-update', {
                remaining: this.currentLevelConfig.timeLimitSeconds,
                total: this.currentLevelConfig.timeLimitSeconds
            });
        } else {
            // If we were just paused for some reason without penalty (rare in this spec but safe to handle)
            if (this.timerEvent) this.timerEvent.paused = false;
        }

        // Resume BG Music
        if (this.bgMusic && this.bgMusic.isPaused) {
            this.bgMusic.resume();
        }
    }

    failLevel() {
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
            this.stopWarningSound();
            if (this.bgMusic && this.bgMusic.isPlaying) {
                this.bgMusic.pause();
            }
            this.sound.play('level-fail');
        }
    }

    // --- CORE GAMEPLAY ---

    handleCardClick(card: any) {
        if (this.isLocked) return;
        if (card.isFlipped || card.isMatched) return;

        // Logic: Only play 'card-flip' for the first card.
        // For the second card, we suppress 'card-flip' because 'match-success' or 'match-fail' 
        // will be played in checkForMatch immediately after.
        const openedCount = this.openedCards.length;
        const isFirstCard = openedCount === 0;
        const shouldPlayFlipSound = isFirstCard;

        this.flipCard(card, true, shouldPlayFlipSound);

        this.openedCards.push(card);

        if (this.openedCards.length === 2) {
            this.attempts++;
            this.checkForMatch();
        }
    }

    checkForMatch() {
        this.isLocked = true;
        const [c1, c2] = this.openedCards;

        // Strict match on matchId (handles Hard Variations)
        const match = c1.matchId === c2.matchId;

        // Callback to run after feedback animations
        const finalizeTurn = () => {
            this.openedCards = [];

            // Check Periodic Swap
            const interval = this.currentLevelConfig.periodicSwapInterval || 0;
            if (interval > 0 && this.attempts > 0 && this.attempts % interval === 0) {
                // Trigger swap
                const pairsToSwap = this.currentLevelConfig.periodicSwapPairs || 1;
                const count = pairsToSwap * 2;

                this.performCardSwap(count, () => {
                    this.isLocked = false;
                }, true); // true = only unopened cards
                return;
            }

            this.isLocked = false;
        };

        if (match) {
            // MATCH
            this.sound.play('match-success');
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
                    finalizeTurn();
                });
            }

        } else {
            // WRONG
            this.sound.play('match-fail');
            this.wrongFlips++;
            this.currentStreak = 0;
            this.updateStreakUI(false);

            if (this.seenCards.has(c1.id) || this.seenCards.has(c2.id)) {
                this.repeatedErrors++;
            }

            this.playShakeEffect(c1);
            this.playShakeEffect(c2);

            this.time.delayedCall(800, () => {
                this.flipCard(c1, false, false);
                this.flipCard(c2, false, false);
                finalizeTurn();
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
                current_played: this.currentLevelConfig.level,
                difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
                totalPairs: this.totalPairs,
                wrongFlips: this.wrongFlips,
                consecutiveErrors: this.consecutiveErrors,
                repeatedErrors: this.repeatedErrors,
                userTimeMs: duration,
                parTimeMs: this.currentLevelConfig.parTimeSeconds * 1000,
                attempts: this.attempts,
                stars: this.calculateStars(duration),
                starHint: this.calculateStars(duration) < 3 ? this.getStarHint(duration) : null,
                success: true,
                continuedAfterTimeout: this.continuedAfterTimeout
            });
            this.stopWarningSound();
            if (this.bgMusic && this.bgMusic.isPlaying) {
                this.bgMusic.pause();
            }
            this.sound.play('level-pass');
        }
    }

    calculateStars(duration: number): number {
        // PERMANENT PENALTY: specific requirement "Always receive worse rewards"
        // If they continued after timeout, Max Stars = 1
        if (this.continuedAfterTimeout) {
            return 1;
        }

        const parExceeded = duration > this.currentLevelConfig.parTimeSeconds * 1000;

        // Dynamic mistake allowance based on level - Generous for older audience
        let allowedMistakes = 2;
        if (this.currentLevelConfig.level >= 19) allowedMistakes = 7;
        else if (this.currentLevelConfig.level >= 13) allowedMistakes = 5;
        else if (this.currentLevelConfig.level >= 6) allowedMistakes = 3;

        if (!parExceeded && this.wrongFlips <= allowedMistakes) return 3;
        if (!parExceeded || this.wrongFlips <= allowedMistakes + 2) return 2;
        return 1;
    }

    getStarHint(duration: number): string | null {
        if (this.continuedAfterTimeout) {
            return "จบเกมโดยไม่หมดเวลาเพื่อรับ 3 ดาว";
        }

        const parExceeded = duration > this.currentLevelConfig.parTimeSeconds * 1000;

        // Same dynamic logic matches calculateStars
        // Dynamic mistake allowance based on level - Generous for older audience
        let allowedMistakes = 2;
        if (this.currentLevelConfig.level >= 19) allowedMistakes = 7;
        else if (this.currentLevelConfig.level >= 13) allowedMistakes = 5;
        else if (this.currentLevelConfig.level >= 6) allowedMistakes = 3;

        const tooManyMistakes = this.wrongFlips > allowedMistakes;

        if (parExceeded && tooManyMistakes) {
            return `ลองทำเวลาให้ดีกว่านี้\nและผิดไม่เกิน ${allowedMistakes} ครั้ง`;
        }
        if (parExceeded) {
            return `ลองทำเวลาให้ดีกว่านี้`;
        }
        if (tooManyMistakes) {
            return `ลองจับคู่ผิดให้ไม่เกิน ${allowedMistakes} ครั้ง`;
        }
        return null;
    }

    // --- SOUND HELPERS ---

    stopWarningSound() {
        this.sound.getAll('timer-warning').forEach(sound => sound.stop());
    }

    // --- VISUALS & HELPERS ---

    createCard(x: number, y: number, w: number, h: number, data: any, index: number) {
        const { asset, emoji, color, variation, variationValue, matchId, id } = data;

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

        // Icon Container (For managing multiple icons/variations)
        const iconContainer = this.add.container(0, 0);

        // Helper to Create One Icon
        const createIcon = (ox: number, oy: number, scaleMult: number = 1.0) => {
            // Asset Name from data usually, but fallback to emojiToAsset if using old path
            const textureKey = asset || this.emojiToAsset[emoji];
            let img: any;

            if (this.textures.exists(textureKey)) {
                img = this.add.image(ox, oy, textureKey).setOrigin(0.5);
                const texture = this.textures.get(textureKey);
                const frame = texture.get();
                const realW = frame.width || 100;
                const realH = frame.height || 100;

                const maxW = w * 0.90 * scaleMult; // Increased to 90% for larger icons
                const maxH = h * 0.90 * scaleMult;

                const scale = Math.min(maxW / realW, maxH / realH);
                img.setScale(scale);
            } else {
                // Text fallback
                const fs = Math.floor(Math.min(w, h) * 0.5 * scaleMult);
                img = this.add.text(ox, oy, emoji || "?", { fontSize: `${fs}px` }).setOrigin(0.5);
            }
            return img;
        };

        // --- APPLY VARIATIONS ---
        if (variation === 'quantity') {
            // Render 2 smaller icons - reduced size and tighter positioning for small displays
            const i1 = createIcon(-w * 0.15, -h * 0.15, 0.45);
            const i2 = createIcon(w * 0.15, h * 0.15, 0.45);
            iconContainer.add([i1, i2]);
        } else {
            // Normal, Orientation, Gray
            const icon = createIcon(0, 0, 1.0);

            if (variation === 'orientation') {
                if (icon.setFlipX) icon.setFlipX(true);
            }
            // Gray variation removed

            iconContainer.add(icon);
        }

        // HITZONE: Transparent Interactive Layer
        const hitZone = this.add.rectangle(0, 0, w, h, 0x000000, 0).setOrigin(0.5);
        hitZone.setInteractive({ useHandCursor: true });

        container.add([shadow, back, face, iconContainer, hitZone]);
        container.setSize(w, h);

        // Store Logic Data
        const cardObj = {
            container, back, face, icon: iconContainer, hitZone,
            id, matchId, emoji, // matchId is key now
            isFlipped: true, isMatched: false, baseScale: iconContainer.scaleX
        };

        // Initial state is Face UP (for preview)
        back.visible = false;
        face.visible = true;
        face.scaleX = 1;
        iconContainer.visible = true;

        // Listen on HitZone
        hitZone.on('pointerdown', () => this.handleCardClick(cardObj));

        return cardObj;
    }

    flipCard(card: any, toFace: boolean, playSound: boolean = true) {
        if (card.isFlipped === toFace) return;

        if (playSound === true) {
            this.sound.play('card-flip');
        }

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
        }).setOrigin(0.5).setDepth(200).setPadding(10, 14, 10, 18);

        this.streakText = this.add.text(0, 250, '', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '32px',
            color: '#FFD700',
            stroke: '#8B4513',
            strokeThickness: 4,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(200).setVisible(false).setPadding(10, 14, 10, 18);

        this.layoutUI();
    }

    showLevelHint(message: string) {
        const { width, height } = this.scale;

        // Semi-transparent overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setDepth(300)
            .setInteractive();

        // Hint container - wider to fit Thai text
        const hintBg = this.add.rectangle(width / 2, height / 2, width * 0.95, 180, 0xFFFFFF, 0.95)
            .setDepth(301)
            .setStrokeStyle(4, 0xE86A33);

        // Hint text - responsive font size
        const fontSize = Math.min(24, width * 0.055);
        const hintText = this.add.text(width / 2, height / 2 - 15, message, {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: `${fontSize}px`,
            color: '#2B2115',
            align: 'center',
            wordWrap: { width: width * 0.88 }
        }).setOrigin(0.5).setDepth(302).setPadding(10, 14, 10, 18);

        // Tap to continue text
        const tapText = this.add.text(width / 2, height / 2 + 60, '👆 แตะเพื่อเริ่มเล่น', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '20px',
            color: '#888888',
            fontStyle: 'italic'
        }).setOrigin(0.5).setDepth(302).setPadding(10, 14, 10, 18);

        // Pulsing animation on tap text
        this.tweens.add({
            targets: tapText,
            alpha: 0.5,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Entrance animation
        hintBg.setScale(0);
        hintText.setScale(0);
        tapText.setAlpha(0);

        this.tweens.add({
            targets: [hintBg, hintText],
            scale: 1,
            duration: 300,
            ease: 'Back.out'
        });

        this.tweens.add({
            targets: tapText,
            alpha: 1,
            delay: 300,
            duration: 300
        });

        // Tap to dismiss
        overlay.on('pointerdown', () => {
            // Exit animation - simple fade
            this.tweens.add({
                targets: [overlay, hintBg, hintText, tapText],
                alpha: 0,
                duration: 250,
                onComplete: () => {
                    overlay.destroy();
                    hintBg.destroy();
                    hintText.destroy();
                    tapText.destroy();
                    this.startPreviewPhase();
                }
            });
        });
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
