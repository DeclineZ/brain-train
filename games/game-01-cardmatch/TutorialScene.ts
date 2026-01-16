
import * as Phaser from 'phaser';

export class TutorialScene extends Phaser.Scene {
    // Assets
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

    // State
    private cards: any[] = [];
    private openedCards: any[] = [];
    private matchedPairs = 0;
    private totalPairs = 3;
    private isLocked = true;
    private tutorialStep = 0;

    // UI
    private messageText!: Phaser.GameObjects.Text;
    private tutorialBtn: Phaser.GameObjects.Container | null = null;
    private currentFlashTween: Phaser.Tweens.Tween | null = null;

    constructor() { super({ key: 'TutorialScene' }); }

    preload() {
        // Load same assets as main game
        Object.values(this.emojiToAsset).forEach(assetName => {
            this.load.image(assetName, `/assets/images/cardmatch/${assetName}.png`);
        });
        this.load.audio('card-flip', '/assets/sounds/cardmatch/card-flip.mp3');
        this.load.audio('match-success', '/assets/sounds/cardmatch/match-success.mp3');
        this.load.audio('match-fail', '/assets/sounds/cardmatch/match-fail.mp3');
        this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('bg-music', '/assets/sounds/global/bg-music.mp3');
    }

    create() {
        const { width, height } = this.scale;

        // 1. Background
        this.add.rectangle(width / 2, height / 2, width, height, 0xFDF6E3);
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xEBDCCB, 0.4);
        for (let i = 0; i < width; i += 40) graphics.moveTo(i, 0).lineTo(i, height);
        for (let i = 0; i < height; i += 40) graphics.moveTo(0, i).lineTo(width, i);
        graphics.strokePath();

        // 2. UI Layer
        // 2. UI Layer
        this.messageText = this.add.text(0, 0, "จำตำแหน่งให้ดีนะ...", {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '40px',
            color: '#2B2115',
            stroke: '#FFFFFF',
            strokeThickness: 6,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100).setPadding(10, 14, 10, 18).setVisible(false);

        // 3. Setup Cards
        this.createCards();

        // 4. Initial Layout
        this.layoutGrid();
        this.layoutUI();

        // 5. Handle Resize
        this.scale.on('resize', () => {
            this.layoutGrid();
            this.layoutUI();
        });

        // 6. Start
        this.startMemorizationPhase();

        // 7. Background Music
        try {
            const music = this.sound.add('bg-music', {
                volume: 0.5,
                loop: true
            });
            music.play();
        } catch (e) {
            console.warn("Failed to play bg-music", e);
        }
    }

    layoutUI() {
        const { width, height } = this.scale;

        // Match GameScene positioning logic
        // GameScene: this.messageText.setPosition(width / 2, height / 2); <-- wait, GameScene puts it in center?
        // Ah, GameScene uses messageText for 'Ready?' 'Go!', which is typically centered.
        // But for tutorial instruction "Remember positions...", top area is better.
        // Let's stick to height * 0.15 but keep the Styling match.

        this.messageText.setPosition(width / 2, height * 0.15);
    }

    createCards() {
        // Fixed set for tutorial: Octopus, Star, Frog
        const emojis = ["🐙", "⭐", "🐸"];
        const deck = [...emojis, ...emojis];
        // Fixed Shuffle or Random? Random is fine as long as logic adapts.
        // Actually, for a tutorial, random is better so they don't just memorize "Top Left is Ocotpus".
        Phaser.Utils.Array.Shuffle(deck);

        const colorMap: { [key: string]: number } = {
            "🐙": 0xFFB3BA, "⭐": 0xFFDFBA, "🐸": 0xC1E1C1
        };

        deck.forEach((emoji, i) => {
            const color = colorMap[emoji] || 0xFFFFFF;
            const card = this.createCard(-1000, -1000, 100, 100, emoji, i, color);
            this.cards.push(card);
        });
    }

    startMemorizationPhase() {
        this.messageText.setText("จำตำแหน่งให้ดีนะ...");
        this.messageText.setVisible(true);
        this.messageText.setScale(0);

        this.tweens.add({
            targets: this.messageText,
            scale: 1,
            duration: 500,
            ease: 'Back.out'
        });

        // Flip all up
        this.cards.forEach(c => {
            this.flipCard(c, true, false);
        });

        // Emit Event for React to show Button
        this.game.events.emit('tutorial-show-next-btn', true);
    }

    // Called by React via Event/Reference
    nextPhase() {
        this.startMatchingPhase();
    }

    // createTutorialButton removed - handled by React

    startMatchingPhase() {
        // Change text
        this.messageText.setText("จับคู่การ์ดให้ถูกต้อง");

        // Flip all down
        this.cards.forEach((card, index) => {
            this.time.delayedCall(index * 50, () => {
                this.flipCard(card, false, false);
            });
        });

        this.time.delayedCall(this.cards.length * 50 + 500, () => {
            this.isLocked = false;
            this.tutorialStep = 1;
            this.flashTutorialStep();
        });
    }

    flashTutorialStep() {
        if (this.currentFlashTween) {
            this.currentFlashTween.stop();
            this.cards.forEach(c => c.container.setScale(1));
            this.currentFlashTween = null;
        }

        // Step 1 & 2: Flash hint. Step 3: No hint.
        if (this.tutorialStep > 2) return;

        const unmatched = this.cards.filter(c => !c.isMatched);
        if (unmatched.length === 0) return;

        // Hint logic: Find a pair
        const first = unmatched[0];
        const pair = unmatched.filter(c => c.emoji === first.emoji);

        if (pair.length > 0) {
            this.currentFlashTween = this.tweens.add({
                targets: pair.map(c => c.container),
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    handleCardClick(card: any) {
        if (this.isLocked) return;
        if (card.isFlipped || card.isMatched) return;

        // Flip
        this.flipCard(card, true, true);
        this.openedCards.push(card);

        if (this.openedCards.length === 2) {
            this.isLocked = true;
            this.checkForMatch();
        }
    }

    checkForMatch() {
        const [c1, c2] = this.openedCards;
        const match = c1.emoji === c2.emoji;

        if (match) {
            this.sound.play('match-success');
            this.matchedPairs++;
            c1.isMatched = true;
            c2.isMatched = true;

            // Tutorial Step Progress
            this.tutorialStep++;
            this.flashTutorialStep();

            if (this.matchedPairs === this.totalPairs) {
                this.time.delayedCall(1000, () => this.endTutorial());
            } else {
                this.time.delayedCall(500, () => {
                    this.openedCards = [];
                    this.isLocked = false;
                });
            }
        } else {
            this.sound.play('match-fail');
            // Shake effect
            this.tweens.add({
                targets: [c1.container, c2.container],
                x: '+=10',
                duration: 50,
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    this.time.delayedCall(500, () => {
                        this.flipCard(c1, false, false);
                        this.flipCard(c2, false, false);
                        this.openedCards = [];
                        this.isLocked = false;
                    });
                }
            });
        }
    }

    endTutorial() {
        this.sound.play('level-pass');
        const onTutorialComplete = this.registry.get('onTutorialComplete');
        if (onTutorialComplete) {
            onTutorialComplete();
        }
    }

    // --- VISUAL HELPERS (Duplicated/Simplified from GameScene) ---

    layoutGrid() {
        const { width, height } = this.scale;
        const isPortrait = height > width;

        // Tutorial is fixed 6 cards (3 pairs)
        // In GameScene, cols = 2 for portrait.
        let cols = 3;
        if (isPortrait) {
            cols = 2;
        }

        const totalCards = this.cards.length;
        const rows = Math.ceil(totalCards / cols);

        // Grid Metrics - Responsive (Copied from GameScene)
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
        const startY = (height - gridHeight) / 2 + cardH / 2 + 30;

        this.cards.forEach((cardObj, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (cardW + gap);
            const y = startY + row * (cardH + gap);
            cardObj.container.setPosition(x, y);

            // Children Logic
            const shadow = cardObj.container.list[0] as Phaser.GameObjects.Rectangle;
            shadow.setSize(cardW, cardH);
            const back = cardObj.container.list[1] as Phaser.GameObjects.Rectangle;
            back.setSize(cardW, cardH);
            const face = cardObj.container.list[2] as Phaser.GameObjects.Rectangle;
            face.setSize(cardW, cardH);
            const icon = cardObj.icon;

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
            } else {
                const fontSize = Math.floor(Math.min(cardW, cardH) * 0.5);
                icon.setFontSize(fontSize);
            }

            // HitZone
            // HitZone
            const hitZone = cardObj.container.list[4] as Phaser.GameObjects.Rectangle;
            if (hitZone) {
                hitZone.setSize(cardW, cardH);
                if (hitZone.input) {
                    const hitArea = hitZone.input.hitArea as Phaser.Geom.Rectangle;
                    if (hitArea) hitArea.setSize(cardW, cardH);
                } else {
                    hitZone.setInteractive({ useHandCursor: true });
                }
            }
            // Store calculated scale so flip animation knows what to restore to
            cardObj.baseScale = icon.scaleX;
        });
    }

    createCard(x: number, y: number, w: number, h: number, emoji: string, id: number, color: number) {
        const container = this.add.container(x, y);

        // Shadow
        const shadow = this.add.rectangle(4, 4, w, h, 0x000000, 0.15).setOrigin(0.5);
        // Back
        const back = this.add.rectangle(0, 0, w, h, 0xE86A33).setOrigin(0.5);
        back.setStrokeStyle(4, 0xFFFFFF);
        // Face
        const face = this.add.rectangle(0, 0, w, h, 0xFFFFFF).setOrigin(0.5);
        face.setStrokeStyle(8, color);
        face.visible = false;
        face.scaleX = 0;

        // Icon
        const assetName = this.emojiToAsset[emoji];
        let icon: any;
        if (this.textures.exists(assetName)) {
            icon = this.add.image(0, 0, assetName).setOrigin(0.5);
        } else {
            icon = this.add.text(0, 0, emoji, { fontSize: '40px' }).setOrigin(0.5);
        }
        icon.visible = false;
        icon.scaleX = 0; // Starts zero width for flip

        const hitZone = this.add.rectangle(0, 0, w, h, 0x000000, 0).setOrigin(0.5).setInteractive({ useHandCursor: true });

        container.add([shadow, back, face, icon, hitZone]);

        const cardObj = { container, back, face, icon, hitZone, emoji, id, isFlipped: false, isMatched: false, baseScale: 1 };

        hitZone.on('pointerdown', () => this.handleCardClick(cardObj));
        return cardObj;
    }

    flipCard(card: any, toFace: boolean, playSound: boolean) {
        if (card.isFlipped === toFace) return;

        if (playSound) this.sound.play('card-flip');

        this.tweens.add({
            targets: [card.back, card.face, card.icon],
            scaleX: 0,
            duration: 150,
            onComplete: () => {
                card.isFlipped = toFace;
                card.back.visible = !toFace;
                card.face.visible = toFace;
                card.icon.visible = toFace;

                // Tween 2: Scale back up (Finish flip)
                // Separate tweens for Back/Face (Always 1) and Icon (BaseScale)
                this.tweens.add({
                    targets: [card.back, card.face],
                    scaleX: 1,
                    duration: 150
                });

                this.tweens.add({
                    targets: [card.icon],
                    scaleX: card.baseScale,
                    duration: 150
                });
            }
        });
    }
}
