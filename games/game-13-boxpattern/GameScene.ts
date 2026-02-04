
import * as Phaser from 'phaser';

export class BoxPatternGameScene extends Phaser.Scene {
    // --- State ---
    protected score = 0;
    protected phase = 1;
    protected lives = 3;
    protected sequence: number[] = [];
    protected playerIndex = 0;
    protected isInputLocked = false;
    protected gridSize = 2;
    protected gameActive = false;
    protected roundsInPhase = 0;

    // --- Configuration ---
    // Rounds required per phase to advance
    protected readonly PHASE_ROUNDS = {
        PHASE_1: 5,
        PHASE_2: 8,
        PHASE_3: 12,
        PHASE_4: 16
    };

    // Points per round in each phase
    protected readonly PHASE_POINTS = {
        PHASE_1: 200,
        PHASE_2: 500,
        PHASE_3: 420,
        PHASE_4: 625,
        ENDLESS: 1000
    };

    // --- Visuals ---
    protected orbs: Phaser.GameObjects.Container[] = [];
    protected gridContainer!: Phaser.GameObjects.Container;
    protected scoreText!: Phaser.GameObjects.Text;
    protected phaseText!: Phaser.GameObjects.Text;
    protected heartsContainer!: Phaser.GameObjects.Container;
    protected messageContainer!: Phaser.GameObjects.Container;
    protected backgroundGraphics!: Phaser.GameObjects.Graphics;

    // --- Audio ---
    protected soundBeep!: Phaser.Sound.BaseSound;
    protected soundSuccess!: Phaser.Sound.BaseSound;
    protected soundFail!: Phaser.Sound.BaseSound;
    protected soundLevelUp!: Phaser.Sound.BaseSound;
    protected bgMusic!: Phaser.Sound.BaseSound;

    constructor(key: string = 'BoxPatternGameScene') {
        super({ key });
    }

    preload() {
        // Reuse assets from other games where possible to save space/time
        this.load.audio('beep', '/assets/sounds/sensorlock/beep.mp3');
        this.load.audio('match-success', '/assets/sounds/cardmatch/match-success.mp3');
        this.load.audio('match-fail', '/assets/sounds/cardmatch/match-fail.mp3');
        this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('bg-music', '/assets/game-13-boxpattern/boxpatternbgsong.mp3');
    }

    create() {
        // 1. Audio Setup
        this.soundBeep = this.sound.add('beep', { volume: 0.5 });
        this.soundSuccess = this.sound.add('match-success', { volume: 0.4 });
        this.soundFail = this.sound.add('match-fail', { volume: 0.6 });
        this.soundLevelUp = this.sound.add('level-pass', { volume: 0.5 });

        // Background Music
        this.bgMusic = this.sound.add('bg-music', { volume: 0.3, loop: true });
        this.bgMusic.play();

        // 2. Background (Fresh, Clean, Pastel Gradient)
        this.createBackground();

        // 3. UI Layer
        this.createUI();

        // 4. Grid Container (Centered)
        this.gridContainer = this.add.container(this.scale.width / 2, this.scale.height / 2 + 30);

        // 5. Handle Resize
        this.scale.on('resize', this.handleResize, this);

        // 6. Start Game
        this.startGame();
    }

    createBackground() {
        const { width, height } = this.scale;

        if (!this.backgroundGraphics) {
            this.backgroundGraphics = this.add.graphics();
            this.backgroundGraphics.setDepth(-100); // Ensure it's behind everything
        }

        this.backgroundGraphics.clear();

        // Soft gradient background
        this.backgroundGraphics.fillGradientStyle(0xe0f7fa, 0xe0f7fa, 0xb2ebf2, 0xb2ebf2, 1);
        this.backgroundGraphics.fillRect(0, 0, width, height);

        // Add some subtle static shapes strictly for decoration
        this.backgroundGraphics.fillStyle(0xFFFFFF, 0.3);
        this.backgroundGraphics.fillCircle(width * 0.1, height * 0.1, 100);
        this.backgroundGraphics.fillCircle(width * 0.9, height * 0.8, 150);

        // Grid pattern overlay (faint)
        this.backgroundGraphics.lineStyle(1, 0xFFFFFF, 0.2);
        for (let i = 0; i < width; i += 40) {
            this.backgroundGraphics.moveTo(i, 0);
            this.backgroundGraphics.lineTo(i, height);
        }
        for (let i = 0; i < height; i += 40) {
            this.backgroundGraphics.moveTo(0, i);
            this.backgroundGraphics.lineTo(width, i);
        }
        this.backgroundGraphics.strokePath();
    }

    handleResize(gameSize: Phaser.Structs.Size) {
        const { width, height } = gameSize;

        // 1. Background
        this.createBackground();

        // 2. UI Positions
        if (this.scoreText) {
            this.scoreText.setPosition(width - 20, 125);
        }

        if (this.heartsContainer) {
            this.heartsContainer.setPosition(40, 125);
        }

        // 3. Grid Container Scaling
        if (this.gridContainer) {
            // Reposition to center (shifted down further due to larger header space)
            const centerY = height / 2 + 50;
            this.gridContainer.setPosition(width / 2, centerY);

            // Safe Area Scaling
            // Header is effectively taller now (~120px safe zone)
            const safeHeight = height - 180;
            const safeWidth = width - 40;
            const contentSize = 500; // Virtual Base Size
            const scale = Math.min(safeWidth / contentSize, safeHeight / contentSize);
            this.gridContainer.setScale(scale);
        }
    }

    createUI() {
        const { width } = this.scale;

        // Score (Top Right - lowered to avoid header)
        this.scoreText = this.add.text(width - 20, 85, 'Score: 0', {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '28px',
            color: '#2d3436',
            fontStyle: 'bold'
        }).setOrigin(1, 0.5);

        // Hearts (Top Left - lowered to avoid header)
        this.heartsContainer = this.add.container(40, 85);
    }

    updateHeartsUI() {
        this.heartsContainer.removeAll(true);

        if (this.phase === 1) return;

        for (let i = 0; i < 3; i++) {
            const x = i * 40;
            const filled = i < this.lives;

            const heartText = this.add.text(x, 0, filled ? '❤️' : '🖤', {
                fontSize: '32px'
            }).setOrigin(0, 0.5);

            this.heartsContainer.add(heartText);
        }
    }

    startGame() {
        this.score = 0;
        this.phase = 1;
        this.sequence = [];
        this.lives = 3;
        this.gameActive = true;

        this.updateScoreUI();
        this.startPhase(1);
    }

    async startPhase(phase: number) {
        this.phase = phase;
        this.sequence = [];
        this.roundsInPhase = 0;

        // Determine Grid Size
        if (phase === 1) this.gridSize = 2;
        else if (phase === 2) this.gridSize = 3;
        else if (phase === 3) this.gridSize = 4;
        else this.gridSize = 5;

        // Reset Lives
        this.lives = 3;
        this.updateHeartsUI();

        // Clear existing grid
        this.gridContainer.removeAll(true);
        this.orbs = [];

        // Generate Grid
        this.generateGrid(this.gridSize);

        // Show Phase Message
        let title = `Level ${phase}`;
        let sub = `${this.gridSize}x${this.gridSize}`;
        if (phase === 2) {
            sub = `${this.gridSize}x${this.gridSize}\nสามารถผิดได้แค่ 3 ครั้ง`;
        } else if (phase === 5) {
            title = "Endless Mode";
            sub = "Show your skill!";
        }

        await this.showMessage(title, sub);

        // Start first round
        this.nextRound();
    }

    protected generateGrid(size: number) {
        // Build grid around (0,0) with a fixed "virtual" dimension
        const virtualDim = 500;
        const spacing = 20;

        const orbSize = (virtualDim - (spacing * (size - 1))) / size;
        const radius = orbSize / 2;

        const startX = -(virtualDim / 2) + radius;
        const startY = -(virtualDim / 2) + radius;

        let index = 0;
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = startX + (col * (orbSize + spacing));
                const y = startY + (row * (orbSize + spacing));

                const orb = this.createOrb(x, y, radius, index);
                this.gridContainer.add(orb);
                this.orbs.push(orb);
                index++;
            }
        }

        // Initial Scale call
        this.handleResize(this.scale.gameSize);
    }

    protected createOrb(x: number, y: number, radius: number, index: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);

        // Base color - Pastel Palette
        // 37 is prime, scatters colors well
        const hue = (index * 37) % 360;
        const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.8).color;

        // 1. Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillCircle(5, 5, radius);
        container.add(shadow);

        // 2. Main Orb (Glass/Marble look)
        const orb = this.add.graphics();
        orb.fillStyle(color, 1);
        orb.fillCircle(0, 0, radius);
        container.add(orb);

        // 3. Shine (Top Left)
        const shine = this.add.graphics();
        shine.fillStyle(0xFFFFFF, 0.4);
        shine.fillCircle(-radius * 0.3, -radius * 0.3, radius * 0.25);
        container.add(shine);

        // Interaction
        const hitArea = new Phaser.Geom.Circle(0, 0, radius);
        container.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

        container.on('pointerdown', () => {
            if (this.isInputLocked || !this.gameActive) return;
            this.handleInput(index);
        });

        // Store color for flashing logic
        container.setData('baseColor', color);
        container.setData('radius', radius);

        return container;
    }

    protected showMessage(title: string, sub: string): Promise<void> {
        return new Promise((resolve) => {
            const { width, height } = this.scale;

            const container = this.add.container(width / 2, height / 2);
            container.setDepth(100);

            const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.5);
            bg.setInteractive(); // Block input
            container.add(bg);

            const box = this.add.rectangle(0, 0, width * 0.8, 200, 0xFFFFFF, 1);
            box.setStrokeStyle(4, 0x6c5ce7);
            container.add(box);

            const titleText = this.add.text(0, -30, title, {
                fontFamily: '"Mali", sans-serif',
                fontSize: '48px',
                color: '#6c5ce7',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(titleText);

            const subText = this.add.text(0, 30, sub, {
                fontFamily: '"Sarabun", sans-serif',
                fontSize: '32px',
                color: '#2d3436'
            }).setOrigin(0.5);
            container.add(subText);

            // Pop in
            container.setScale(0);
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 400,
                ease: 'Back.out',
                onComplete: () => {
                    // Wait then dismiss
                    this.time.delayedCall(1500, () => {
                        this.tweens.add({
                            targets: container,
                            scale: 0,
                            duration: 300,
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

    protected nextRound() {
        if (!this.gameActive) return;

        // Message if needed? No, seamless sequence building usually.

        // Add one random step to sequence
        const totalOrbs = this.gridSize * this.gridSize;
        const nextStep = Phaser.Math.Between(0, totalOrbs - 1);
        this.sequence.push(nextStep);

        // Play sequence
        this.playSequence();
    }

    protected delay(ms: number): Promise<void> {
        return new Promise(resolve => {
            this.time.delayedCall(ms, resolve);
        });
    }

    protected async playSequence() {
        this.isInputLocked = true;
        this.playerIndex = 0;

        await this.delay(500); // Brief pause before starting

        // Calculate delay based on phase and sequence length
        // In Endless Mode (phase 5), speed up as sequence gets longer
        let gapDelay = 200;
        if (this.phase === 5) {
            // Start at 200ms, decrease by 10ms for each orb in sequence, minimum 80ms
            gapDelay = Math.max(80, 200 - (this.sequence.length * 10));
        }

        for (let i = 0; i < this.sequence.length; i++) {
            const orbIndex = this.sequence[i];
            await this.highlightOrb(orbIndex);
            await this.delay(gapDelay); // Gap between flashes
        }

        this.isInputLocked = false;
    }

    protected highlightOrb(index: number): Promise<void> {
        return new Promise((resolve) => {
            const orb = this.orbs[index];
            if (!orb) { resolve(); return; }

            // Visual Flash
            const baseScale = 1;
            this.soundBeep.play();

            // Brighten (overlay white)
            const flash = this.add.circle(0, 0, orb.getData('radius'), 0xFFFFFF, 0.8);
            orb.add(flash);

            // Scale up/down
            this.tweens.add({
                targets: orb,
                scale: 1.1,
                duration: 150,
                yoyo: true,
                onComplete: () => {
                    flash.destroy();
                    orb.setScale(baseScale);
                    resolve();
                }
            });
        });
    }

    protected async handleInput(index: number) {
        // Visual feedback for tap
        this.highlightOrb(index); // This plays sound and animates

        // Check Logic
        const expected = this.sequence[this.playerIndex];

        if (index === expected) {
            // Correct
            this.playerIndex++;
            if (this.playerIndex >= this.sequence.length) {
                // Round Complete
                this.handleRoundPass();
            }
        } else {
            // Incorrect
            this.handleMistake();
        }
    }

    protected handleRoundPass() {
        this.isInputLocked = true;
        this.roundsInPhase++; // Increment rounds completed

        // Add Score based on Phase
        let points = 0;
        if (this.phase === 1) points = this.PHASE_POINTS.PHASE_1;
        else if (this.phase === 2) points = this.PHASE_POINTS.PHASE_2;
        else if (this.phase === 3) points = this.PHASE_POINTS.PHASE_3;
        else if (this.phase === 4) points = this.PHASE_POINTS.PHASE_4;
        else points = this.PHASE_POINTS.ENDLESS;

        this.score += points;
        this.updateScoreUI();
        this.soundSuccess.play();

        // Check Phase Progression
        let nextPhase = this.phase;

        if (this.phase === 1 && this.roundsInPhase >= this.PHASE_ROUNDS.PHASE_1) nextPhase = 2;
        else if (this.phase === 2 && this.roundsInPhase >= this.PHASE_ROUNDS.PHASE_2) nextPhase = 3;
        else if (this.phase === 3 && this.roundsInPhase >= this.PHASE_ROUNDS.PHASE_3) nextPhase = 4;
        else if (this.phase === 4 && this.roundsInPhase >= this.PHASE_ROUNDS.PHASE_4) nextPhase = 5;

        if (nextPhase > this.phase) {
            this.soundLevelUp.play();
            this.time.delayedCall(500, () => this.startPhase(nextPhase));
        } else {
            this.time.delayedCall(800, () => this.nextRound());
        }
    }

    protected handleMistake() {
        this.soundFail.play();

        if (this.phase === 1) {
            // Instant Death
            this.onGameOver();
        } else {
            // Lose Life
            this.lives--;
            this.updateHeartsUI();

            if (this.lives <= 0) {
                this.onGameOver();
            } else {
                this.isInputLocked = true;

                // Shake effect
                this.cameras.main.shake(300, 0.01);

                // Logic: If sequence > 3, do NOT replay. Let user try again immediately.
                // Otherwise replay the sequence.
                const shouldReplay = this.sequence.length <= 3;

                this.time.delayedCall(shouldReplay ? 1000 : 500, () => {
                    this.playerIndex = 0; // Always reset input progress on mistake

                    if (shouldReplay) {
                        this.playSequence();
                    } else {
                        // Just unlock
                        this.isInputLocked = false;
                    }
                });
            }
        }
    }

    protected updateScoreUI() {
        this.scoreText.setText(`Score: ${this.score}`);
    }

    protected onGameOver() {
        this.gameActive = false;
        this.isInputLocked = true;

        // Stop background music
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.stop();
        }
        this.sound.stopAll();

        // Emit Game Over Event to React Wrapper (GameCanvas -> Page)
        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: true, // It's always a "completed session" in terms of saving stats? 
                // Wait, page.tsx logic: "if (rawData.success === false && !isEndless) ... setResult({ success: false })"
                // For Endless/Highscore games, usually we send success: true to show the Score Popup.
                // BoxPattern IS endless / highscore based.
                // So send success: true so `page.tsx` shows the Score/Highscore UI.
                score: this.score,
                stars: 0, // Not primarily used but prevents errors
                starHint: "",
                // Add specific stats if we tracked them (e.g. max combo?)
                // We can add "phase" or "rounds" if needed in metadata?
                // For now, simpler is better.
            });
        }
    }
}
