import * as Phaser from 'phaser';

export class WordRecognizeGameScene extends Phaser.Scene {
    // --- State ---
    private score = 0;
    private phase = 1;
    private lives = 3;
    private roundsInPhase = 0;
    private totalRoundsInPhase = 0;
    private gameActive = false;
    private isInputLocked = false;

    // Word/Number Memory
    private seenItems = new Set<string>();
    private currentItem = '';
    private isNewItem = true;
    private itemStartTime = 0;
    private timeLimit = 4000;
    private isShowingMessage = false; // New flag to pause game during messages

    // --- Configuration ---
    private readonly PHASE_ROUNDS = {
        PHASE_1: 15,
        PHASE_2: 15,
        PHASE_3: 15,
        ENDLESS: 999
    };

    private readonly PHASE_POINTS = {
        PHASE_1: 200,
        PHASE_2: 500,
        PHASE_3: 420,
        ENDLESS: 1000
    };

    // Word Lists
    private readonly SIMPLE_WORDS = ['วิ่ง', 'เดิน', 'กิน', 'นอน', 'เล่น', 'อ่าน', 'เขียน', 'ร้อง', 'หัวเราะ', 'ร้องไห้'];
    private readonly SIMILAR_WORDS = [
        'นักเดิน', 'นักวิ่ง', 'นักเขียน', 'นักอ่าน',
        'ขนมปัง', 'ขนมจีน', 'ขนมถ้วย', 'ขนมเค้ก',
        'น้ำใจ', 'น้ำตา', 'น้ำมัน', 'น้ำผึ้ง'
    ];

    // Phase Intro Messages
    private readonly PHASE_MESSAGES: Record<number, { title: string; sub: string }> = {
        1: { title: 'คำง่ายๆ', sub: 'จำคำสั้นๆ แล้วบอกว่าเคยเห็นรึยัง' },
        2: { title: 'จำตัวเลข', sub: 'ตัวเลข 4 หลัก! ระวังสับสนนะ' },
        3: { title: 'คำคล้ายกัน', sub: 'คำยาวๆ ที่คล้ายกัน ต้องจำให้ดี!' },
        5: { title: 'Endless Mode', sub: 'ทุกอย่างรวมกัน! แสดงฝีมือเลย' }
    };

    // --- Visuals ---
    private backgroundGraphics!: Phaser.GameObjects.Graphics;
    private cardContainer!: Phaser.GameObjects.Container;
    private itemText!: Phaser.GameObjects.Text;
    private timerBar!: Phaser.GameObjects.Graphics;
    private timerIcon!: Phaser.GameObjects.Graphics;
    private scoreText!: Phaser.GameObjects.Text;
    private heartsContainer!: Phaser.GameObjects.Container;

    // Buttons
    private seenButton!: Phaser.GameObjects.Container;
    private newButton!: Phaser.GameObjects.Container;
    private seenFace!: Phaser.GameObjects.Container;
    private newFace!: Phaser.GameObjects.Container;
    private seenHit!: Phaser.GameObjects.Rectangle;
    private newHit!: Phaser.GameObjects.Rectangle;

    // --- Audio ---
    private soundSuccess!: Phaser.Sound.BaseSound;
    private soundFail!: Phaser.Sound.BaseSound;
    private soundLevelUp!: Phaser.Sound.BaseSound;
    private bgMusic!: Phaser.Sound.BaseSound;

    constructor() {
        super({ key: 'WordRecognizeGameScene' });
    }

    preload() {
        this.load.audio('match-success', '/assets/sounds/cardmatch/match-success.mp3');
        this.load.audio('match-fail', '/assets/sounds/cardmatch/match-fail.mp3');
        this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
        // Use sensorlock bgm as placeholder
        this.load.audio('bgm', '/assets/sounds/sensorlock/sensorlock-bg.mp3');
    }

    create() {
        // 1. Audio Setup
        this.soundSuccess = this.sound.add('match-success', { volume: 0.4 });
        this.soundFail = this.sound.add('match-fail', { volume: 0.6 });
        this.soundLevelUp = this.sound.add('level-pass', { volume: 0.5 });
        this.bgMusic = this.sound.add('bgm', { volume: 0.3, loop: true });
        this.bgMusic.play();

        // 2. Background
        this.createBackground();

        // 3. UI
        this.createUI();
        this.createCard();
        this.createControls();

        // 4. Handle Resize
        this.scale.on('resize', this.handleResize, this);

        // 5. Start Game
        this.startGame();
    }

    update(time: number, delta: number) {
        // Don't update timer if showing message or game not active
        if (!this.gameActive || this.isInputLocked || this.isShowingMessage) return;
        if (this.itemStartTime === 0) return; // Not started yet

        const elapsed = Date.now() - this.itemStartTime;
        const pct = 1 - (elapsed / this.timeLimit);

        if (pct <= 0) {
            this.handleTimeout();
        } else {
            this.drawTimerBar(pct);
        }
    }

    // --- Background ---
    private createBackground() {
        const { width, height } = this.scale;

        if (!this.backgroundGraphics) {
            this.backgroundGraphics = this.add.graphics();
            this.backgroundGraphics.setDepth(-100);
        }

        this.backgroundGraphics.clear();

        // Gradient: Teal -> Purple -> Pink
        // Using multiple horizontal gradient bands
        const bands = 10;
        for (let i = 0; i < bands; i++) {
            const t = i / bands;
            const y = height * t;
            const h = height / bands + 2;

            // Interpolate colors
            const r = Math.round(78 + (236 - 78) * t);
            const g = Math.round(205 + (140 - 205) * t);
            const b = Math.round(196 + (195 - 196) * t);
            const color = (r << 16) | (g << 8) | b;

            this.backgroundGraphics.fillStyle(color, 1);
            this.backgroundGraphics.fillRect(0, y, width, h);
        }

        // Decorative circles
        this.backgroundGraphics.fillStyle(0xFFFFFF, 0.1);
        this.backgroundGraphics.fillCircle(width * 0.1, height * 0.15, 100);
        this.backgroundGraphics.fillCircle(width * 0.9, height * 0.85, 150);
        this.backgroundGraphics.fillCircle(width * 0.7, height * 0.1, 80);
    }

    // --- UI ---
    private createUI() {
        const { width } = this.scale;

        // Score (Top Right)
        const scoreSize = Math.max(28, Math.min(width * 0.07, 48));
        this.scoreText = this.add.text(width - 20, 85, '0', {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: `${scoreSize}px`,
            fontStyle: 'bold',
            color: '#6c5ce7',
            stroke: '#ffffff',
            strokeThickness: 4
        }).setOrigin(1, 0.5).setDepth(100);

        // Hearts Container (Top Left)
        this.heartsContainer = this.add.container(40, 85);
        this.heartsContainer.setDepth(100);
    }

    private updateHeartsUI() {
        this.heartsContainer.removeAll(true);

        if (this.phase === 1) return; // No hearts in phase 1

        for (let i = 0; i < 3; i++) {
            const x = i * 40;
            const filled = i < this.lives;
            const heartText = this.add.text(x, 0, filled ? '❤️' : '🖤', {
                fontSize: '32px'
            }).setOrigin(0, 0.5);
            this.heartsContainer.add(heartText);
        }
    }

    // --- Card ---
    private createCard() {
        const { width, height } = this.scale;

        const cardW = Math.min(width * 0.85, 400);
        const cardH = 250; // Increased height for Thai text

        // Center card truly in the middle of the screen
        this.cardContainer = this.add.container(width / 2, height / 2 - cardH / 2);
        this.cardContainer.setDepth(10);

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillRoundedRect(-cardW / 2 + 5, 5, cardW, cardH, 32);
        this.cardContainer.add(shadow);

        // Card Background (Glassmorphism)
        const cardBg = this.add.graphics();
        cardBg.fillStyle(0xFFFFFF, 0.95);
        cardBg.fillRoundedRect(-cardW / 2, 0, cardW, cardH, 32);
        cardBg.lineStyle(3, 0xFFFFFF, 0.5);
        cardBg.strokeRoundedRect(-cardW / 2, 0, cardW, cardH, 32);
        this.cardContainer.add(cardBg);

        // Item Text - centered properly with more padding
        // Card is drawn from y=0 to y=cardH, so center is at cardH/2
        this.itemText = this.add.text(0, cardH / 2 + 10, '', {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '64px',
            fontStyle: '900',
            color: '#6c5ce7'
        }).setOrigin(0.5, 0.5).setPadding(20, 30, 20, 30);
        this.cardContainer.add(this.itemText);

        // Timer Below Card
        const timerY = cardH + 20;

        this.timerBar = this.add.graphics();
        this.cardContainer.add(this.timerBar);

        this.timerIcon = this.add.graphics();
        this.timerIcon.setPosition(-cardW / 2, timerY);
        this.timerIcon.lineStyle(3, 0x636e72, 1);
        this.timerIcon.strokeCircle(0, 0, 12);
        this.timerIcon.beginPath();
        this.timerIcon.moveTo(0, 0);
        this.timerIcon.lineTo(0, -6);
        this.timerIcon.moveTo(0, 0);
        this.timerIcon.lineTo(4, 0);
        this.timerIcon.strokePath();
        this.cardContainer.add(this.timerIcon);
    }

    private drawTimerBar(pct: number) {
        const { width } = this.scale;
        const cardW = Math.min(width * 0.85, 400);
        const barW = cardW - 40;
        const barH = 12;
        const timerY = 270; // Adjusted for taller card

        this.timerBar.clear();

        // Background
        this.timerBar.fillStyle(0xdfe6e9, 1);
        this.timerBar.fillRoundedRect(-cardW / 2 + 30, timerY, barW, barH, 6);

        // Fill (Gradient from green to red)
        const fillColor = pct > 0.5 ? 0x00b894 : (pct > 0.25 ? 0xfdcb6e : 0xd63031);
        this.timerBar.fillStyle(fillColor, 1);
        this.timerBar.fillRoundedRect(-cardW / 2 + 30, timerY, barW * pct, barH, 6);
    }

    // --- Controls ---
    private createControls() {
        const { width, height } = this.scale;

        const yPos = height - 100;
        const btnWidth = width / 2 - 30;
        const btnHeight = 80;
        const lipDepth = 10;

        // "เคยเห็น" Button (Teal - Left)
        this.seenButton = this.create3DButton(
            width * 0.25, yPos, btnWidth, btnHeight, lipDepth,
            'เคยเห็น', 0x4ECDC4, 0x3EBFA6, true
        );

        // "ใหม่" Button (Coral - Right)
        this.newButton = this.create3DButton(
            width * 0.75, yPos, btnWidth, btnHeight, lipDepth,
            'ใหม่', 0xFF6B6B, 0xE05656, false
        );
    }

    private create3DButton(
        x: number, y: number,
        btnWidth: number, btnHeight: number, lipDepth: number,
        label: string, color: number, lipColor: number,
        isSeenBtn: boolean
    ): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        container.setDepth(50);

        // Lip (Bottom Layer)
        const lip = this.add.graphics();
        lip.fillStyle(lipColor, 1);
        lip.fillRoundedRect(-btnWidth / 2, -btnHeight / 2 + lipDepth, btnWidth, btnHeight, 16);
        container.add(lip);

        // Face (Top Layer)
        const faceGroup = this.add.container(0, 0);
        container.add(faceGroup);

        const face = this.add.graphics();
        face.fillStyle(color, 1);
        face.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 16);
        faceGroup.add(face);

        // Text
        const textSize = Math.min(btnWidth * 0.3, 36);
        const text = this.add.text(0, 0, label, {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: `${textSize}px`,
            fontStyle: '900',
            color: '#FFFFFF',
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true, stroke: false }
        }).setOrigin(0.5).setPadding(10, 14, 10, 18);
        faceGroup.add(text);

        // Hit Area
        const hitArea = this.add.rectangle(0, lipDepth / 2, btnWidth, btnHeight + lipDepth, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        container.add(hitArea);

        // Interaction
        hitArea.on('pointerdown', () => {
            this.tweens.add({
                targets: faceGroup,
                y: lipDepth,
                duration: 50,
                ease: 'Quad.easeOut'
            });
            this.handleInput(isSeenBtn);
        });

        hitArea.on('pointerup', () => {
            this.tweens.add({
                targets: faceGroup,
                y: 0,
                duration: 50,
                ease: 'Quad.easeOut'
            });
        });

        hitArea.on('pointerout', () => {
            this.tweens.add({
                targets: faceGroup,
                y: 0,
                duration: 50,
                ease: 'Quad.easeOut'
            });
        });

        // Store references
        if (isSeenBtn) {
            this.seenFace = faceGroup;
            this.seenHit = hitArea;
        } else {
            this.newFace = faceGroup;
            this.newHit = hitArea;
        }

        return container;
    }

    // --- Game Logic ---
    private startGame() {
        this.score = 0;
        this.phase = 1;
        this.lives = 3;
        this.gameActive = false; // Will be set true after message
        this.seenItems.clear();
        this.itemStartTime = 0; // Reset timer

        this.updateScoreUI();
        this.startPhase(1);
    }

    private async startPhase(phase: number) {
        this.phase = phase;
        this.seenItems.clear();
        this.roundsInPhase = 0;

        // Set total rounds for this phase
        if (phase === 1) this.totalRoundsInPhase = this.PHASE_ROUNDS.PHASE_1;
        else if (phase === 2) this.totalRoundsInPhase = this.PHASE_ROUNDS.PHASE_2;
        else if (phase === 3) this.totalRoundsInPhase = this.PHASE_ROUNDS.PHASE_3;
        else this.totalRoundsInPhase = this.PHASE_ROUNDS.ENDLESS;

        // Reset Lives (Phase 2+)
        if (phase >= 2) {
            this.lives = 3;
        }
        this.updateHeartsUI();

        // Show Phase Message
        const msg = this.PHASE_MESSAGES[phase] || { title: `Level ${phase}`, sub: '' };
        await this.showMessage(msg.title, msg.sub);

        // Now game can start
        this.gameActive = true;

        // Start first round
        this.nextRound();
    }

    private nextRound() {
        if (!this.gameActive) return;

        this.isInputLocked = false;

        // Generate item
        this.generateItem();

        // Calculate time limit based on item length
        const length = this.currentItem.length;
        this.timeLimit = 3000 + (length * 400);
        if (this.phase === 5) {
            // Endless mode: slightly faster
            this.timeLimit = Math.max(2000, this.timeLimit - 500);
        }

        // Update display
        this.itemText.setText(this.currentItem);
        this.itemStartTime = Date.now();

        // Animate card pop-in
        this.cardContainer.setScale(0.8);
        this.cardContainer.setAlpha(0);
        this.tweens.add({
            targets: this.cardContainer,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.out'
        });
    }

    private generateItem() {
        // Determine item type based on phase
        let items: string[] = [];

        if (this.phase === 1) {
            items = this.SIMPLE_WORDS;
        } else if (this.phase === 2) {
            // Generate numbers with 1-3 digits
            items = this.generateNumbers(1, 3);
        } else if (this.phase === 3) {
            items = this.SIMILAR_WORDS;
        } else {
            // Endless: Mix everything
            const mixType = Phaser.Math.Between(1, 3);
            if (mixType === 1) {
                items = this.SIMPLE_WORDS;
            } else if (mixType === 2) {
                // Generate numbers with 1-4 digits, 1 digit less frequent
                items = this.generateNumbers(1, 4, true);
            } else {
                items = this.SIMILAR_WORDS;
            }
        }

        // Surprise mechanism: 
        // - Early rounds: more new items
        // - Later rounds: 50/50 chance
        const seenCount = this.seenItems.size;
        const newItemChance = seenCount < 3 ? 0.8 : 0.5;

        // Sometimes force repeat (surprise!)
        const forceRepeat = seenCount >= 2 && Math.random() < 0.2;

        if (forceRepeat || Math.random() > newItemChance) {
            // Show a seen item
            const seenArray = Array.from(this.seenItems);
            if (seenArray.length > 0) {
                this.currentItem = seenArray[Phaser.Math.Between(0, seenArray.length - 1)];
                this.isNewItem = false;
            } else {
                // Fallback to new
                this.pickNewItem(items);
            }
        } else {
            this.pickNewItem(items);
        }
    }

    private pickNewItem(items: string[]) {
        // Filter out already seen items
        const available = items.filter(i => !this.seenItems.has(i));
        if (available.length === 0) {
            // All seen, pick random
            this.currentItem = items[Phaser.Math.Between(0, items.length - 1)];
            this.isNewItem = false;
        } else {
            this.currentItem = available[Phaser.Math.Between(0, available.length - 1)];
            this.seenItems.add(this.currentItem);
            this.isNewItem = true;
        }
    }

    private generateNumbers(minDigits: number, maxDigits: number, reduceSingleDigit: boolean = false): string[] {
        const nums: string[] = [];

        for (let i = 0; i < 10; i++) {
            // Pick random number of digits
            let digits = Phaser.Math.Between(minDigits, maxDigits);

            // Reduce single digit frequency if requested
            if (reduceSingleDigit && digits === 1 && Math.random() > 0.2) {
                digits = Phaser.Math.Between(2, maxDigits);
            }

            const min = digits === 1 ? 1 : Math.pow(10, digits - 1);
            const max = Math.pow(10, digits) - 1;
            nums.push(Phaser.Math.Between(min, max).toString());
        }
        return nums;
    }

    private handleInput(saidSeen: boolean) {
        if (this.isInputLocked || !this.gameActive) return;
        this.isInputLocked = true;

        // Check correctness
        // saidSeen = true means player said "เคยเห็น"
        // isNewItem = true means it's actually new
        const isCorrect = (saidSeen && !this.isNewItem) || (!saidSeen && this.isNewItem);

        if (isCorrect) {
            this.handleCorrect();
        } else {
            this.handleMistake();
        }
    }

    private handleCorrect() {
        this.roundsInPhase++;
        this.soundSuccess.play();

        // Add points
        let points = 0;
        if (this.phase === 1) points = this.PHASE_POINTS.PHASE_1;
        else if (this.phase === 2) points = this.PHASE_POINTS.PHASE_2;
        else if (this.phase === 3) points = this.PHASE_POINTS.PHASE_3;
        else points = this.PHASE_POINTS.ENDLESS;

        this.score += points;
        this.updateScoreUI();

        // Show point popup
        this.showPointPopup(points);

        // Check phase progression
        let nextPhase = this.phase;
        if (this.phase === 1 && this.roundsInPhase >= this.PHASE_ROUNDS.PHASE_1) nextPhase = 2;
        else if (this.phase === 2 && this.roundsInPhase >= this.PHASE_ROUNDS.PHASE_2) nextPhase = 3;
        else if (this.phase === 3 && this.roundsInPhase >= this.PHASE_ROUNDS.PHASE_3) nextPhase = 5; // Skip 4

        if (nextPhase > this.phase) {
            this.soundLevelUp.play();
            this.time.delayedCall(500, () => this.startPhase(nextPhase));
        } else {
            this.time.delayedCall(300, () => this.nextRound());
        }
    }

    private handleMistake() {
        this.soundFail.play();
        this.cameras.main.shake(200, 0.01);

        if (this.phase === 1) {
            // Instant death in phase 1
            this.onGameOver();
        } else {
            this.lives--;
            this.updateHeartsUI();

            if (this.lives <= 0) {
                this.onGameOver();
            } else {
                // Continue
                this.time.delayedCall(500, () => this.nextRound());
            }
        }
    }

    private handleTimeout() {
        this.soundFail.play();
        this.isInputLocked = true;

        if (this.phase === 1) {
            this.onGameOver();
        } else {
            this.lives--;
            this.updateHeartsUI();

            if (this.lives <= 0) {
                this.onGameOver();
            } else {
                this.time.delayedCall(500, () => this.nextRound());
            }
        }
    }

    private showPointPopup(points: number) {
        const { width, height } = this.scale;

        const popup = this.add.text(width / 2, height / 2 - 150, `+${points}`, {
            fontFamily: '"Mali", sans-serif',
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#00b894',
            stroke: '#ffffff',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: popup,
            y: popup.y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Quad.out',
            onComplete: () => popup.destroy()
        });
    }

    private updateScoreUI() {
        this.scoreText.setText(this.score.toString());
    }

    // --- Messages ---
    private showMessage(title: string, sub: string): Promise<void> {
        return new Promise((resolve) => {
            const { width, height } = this.scale;

            const container = this.add.container(width / 2, height / 2);
            container.setDepth(200);

            const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.5);
            bg.setInteractive();
            container.add(bg);

            const boxW = Math.min(width * 0.9, 400);
            const box = this.add.graphics();
            box.fillStyle(0xFFFFFF, 1);
            box.fillRoundedRect(-boxW / 2, -80, boxW, 160, 24);
            box.lineStyle(4, 0x6c5ce7, 1);
            box.strokeRoundedRect(-boxW / 2, -80, boxW, 160, 24);
            container.add(box);

            const titleText = this.add.text(0, -30, title, {
                fontFamily: '"Mali", sans-serif',
                fontSize: '42px',
                fontStyle: 'bold',
                color: '#6c5ce7'
            }).setOrigin(0.5).setPadding(10, 14, 10, 18);
            container.add(titleText);

            const subText = this.add.text(0, 25, sub, {
                fontFamily: '"Sarabun", sans-serif',
                fontSize: '24px',
                color: '#636e72'
            }).setOrigin(0.5).setPadding(10, 14, 10, 18);
            container.add(subText);

            // Animate in
            container.setScale(0);
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 300,
                ease: 'Back.out',
                onComplete: () => {
                    this.time.delayedCall(1500, () => {
                        this.tweens.add({
                            targets: container,
                            scale: 0,
                            alpha: 0,
                            duration: 200,
                            ease: 'Back.in',
                            onComplete: () => {
                                container.destroy();
                                resolve();
                            }
                        });
                    });
                }
            });
        });
    }

    // --- Game Over ---
    private onGameOver() {
        this.gameActive = false;
        this.isInputLocked = true;

        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.stop();
        }
        this.sound.stopAll();

        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: true,
                score: this.score,
                stars: 0,
                starHint: ''
            });
        }
    }

    // --- Resize ---
    private handleResize(gameSize: Phaser.Structs.Size) {
        const { width, height } = gameSize;

        // Background
        this.createBackground();

        // Score position
        if (this.scoreText) {
            this.scoreText.setPosition(width - 20, 85);
        }

        // Hearts position
        if (this.heartsContainer) {
            this.heartsContainer.setPosition(40, 85);
        }

        // Card position - truly center on screen
        if (this.cardContainer) {
            const cardH = 250;
            this.cardContainer.setPosition(width / 2, height / 2 - cardH / 2);
        }

        // Buttons need to be repositioned
        if (this.seenButton) {
            this.seenButton.setPosition(width * 0.25, height - 100);
        }
        if (this.newButton) {
            this.newButton.setPosition(width * 0.75, height - 100);
        }
    }
}
