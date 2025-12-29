import * as Phaser from 'phaser';

export class SensorLockGameScene extends Phaser.Scene {
    // Game State
    private isPlaying = false;
    private score = 0;
    private correctCount = 0;
    private attempts = 0;
    private mismatchCorrect = 0;
    private mismatchAttempts = 0;
    private currentStreak = 0;
    private maxStreak = 0;
    private totalReactionTime = 0; // Sum of reaction times
    private reactionCount = 0;     // Number of valid reactions tracked

    // Difficulty
    private timeLimitPerCard = 2000;
    private maxTimeLimit = 2000;
    private minTimeLimit = 600;
    private difficultyMultiplier = 1.0;

    // Current Round Data
    private currentArrowDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' = 'UP';
    private currentLabelText: 'บน' | 'ล่าง' | 'ซ้าย' | 'ขวา' = 'บน';
    private isMatch = true;
    private cardStartTime = 0;
    private isCountdown = false;
    private countdownValue = 3;

    // Visuals
    private arrowContainer!: Phaser.GameObjects.Container;
    private arrowGraphics!: Phaser.GameObjects.Graphics;
    private labelText!: Phaser.GameObjects.Text;
    private timerBar!: Phaser.GameObjects.Graphics;
    private scoreText!: Phaser.GameObjects.Text;
    private streakText!: Phaser.GameObjects.Text;

    // Timer
    private lastFrameTime = 0;
    private cardTimerEvent!: Phaser.Time.TimerEvent;

    constructor() { super({ key: 'SensorLockGameScene' }); }

    create() {
        const { width, height } = this.scale;

        // 1. Background (Cyberpunk Style)
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e); // Dark Blue-Black
        this.createCyberpunkGrid();

        // 2. HUD Elements
        this.createHUD();

        // 3. Central Stimulus
        this.createStimulusArea();

        // 4. Controls
        this.createControls();

        // 5. Audio
        // Reusing sounds from cardmatch
        this.load.audio('match-success', '/assets/sounds/match-success.mp3'); // Assuming loaded or needs loading
        this.load.audio('match-fail', '/assets/sounds/match-fail.mp3');
        this.load.audio('level-fail', '/assets/sounds/level-fail.mp3');

        // Note: In Phaser, if audio isn't preloaded in preload(), it won't play.
        // Assuming global preload or I should add one. 
        // existing game structure had preload in scene. logic says I should add it.

        this.input.keyboard?.on('keydown-LEFT', () => this.handleInput(true));  // Map Left to Match (Green)? No, specific keys maybe?
        // Let's stick to UI buttons for touch compatibility mainly, maybe keys later.

        // Let's stick to UI buttons for touch compatibility mainly, maybe keys later.

        // Start with Countdown
        this.startCountdown();

        // Handle Resize
        this.scale.on('resize', () => {
            this.layoutUI();
        });
    }

    preload() {
        // Reuse assets if possible, or load new ones
        // Sounds
        this.load.audio('match-success', '/assets/sounds/match-success.mp3');
        this.load.audio('match-fail', '/assets/sounds/match-fail.mp3');
        this.load.audio('level-fail', '/assets/sounds/level-fail.mp3'); // For timeout
    }

    update(time: number, delta: number) {
        if (!this.isPlaying) return;

        // Smooth Timer Bar
        const elapsed = Date.now() - this.cardStartTime;
        const remaining = Math.max(0, this.timeLimitPerCard - elapsed);
        const pct = remaining / this.timeLimitPerCard;

        this.drawTimerBar(pct);

        if (remaining <= 0) {
            this.handleTimeout();
        }
    }

    // --- SETUP & VISUALS ---

    createCyberpunkGrid() {
        const { width, height } = this.scale;

        // Dynamic Grid using a TileSprite usually better, but Graphics is fine for static background
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x00f3ff, 0.1); // Cyan, low opacity

        // Grid
        const gridSize = 40;
        for (let x = 0; x <= width; x += gridSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);
        }
        graphics.strokePath();

        // Vignette effect (Overlay)
        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0.3);
        vignette.fillCircle(width / 2, height / 2, width * 0.8);
        // Invert mask simpler: just big semi-transparent rects on sides or simple overlay image. 
        // Actually, just a simple dark overlay is fine.
    }

    createHUD() {
        const { width } = this.scale;

        // Score (Top Right, Stylized)
        const scoreSize = Math.max(32, Math.min(width * 0.08, 64)); // Responsive calculation
        this.scoreText = this.add.text(width - 20, 20 + (scoreSize / 2), "0", {
            fontFamily: '"Sarabun", "Thai Sarabun New", Inter, sans-serif',
            fontSize: `${scoreSize}px`,
            fontStyle: 'bold',
            color: '#00f3ff',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(1, 0.5);

        // Streak Indicator (Center Top, initially hidden)
        this.streakText = this.add.text(width / 2, 80, "", {
            font: 'bold 48px Inter',
            color: '#fdcb6e',
            stroke: '#d35400',
            strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0);
    }

    createStimulusArea() {
        const { width, height } = this.scale;
        this.arrowContainer = this.add.container(width / 2, height / 2 - 50);

        this.arrowGraphics = this.add.graphics();
        this.arrowContainer.add(this.arrowGraphics);

        // Label
        const labelSize = Math.min(width * 0.15, 80);
        this.labelText = this.add.text(0, 120, "UP", {
            fontFamily: 'Inter, "Sarabun", "Thai Sarabun New", sans-serif',
            fontSize: `${labelSize}px`,
            fontStyle: '900',
            color: '#ffffff' // White text for dark BG
        }).setOrigin(0.5);
        this.arrowContainer.add(this.labelText);

        // Timer Bar (Below Label)
        this.timerBar = this.add.graphics();
        this.arrowContainer.add(this.timerBar);
    }

    createControls() {
        const { width, height } = this.scale;

        const yPos = height - 100;
        const btnWidth = width / 2 - 40;

        // NO MATCH Button (Left, Red)
        // NO MATCH Button (Left, Red)
        const noBtn = this.add.container(width / 4, yPos);
        const noBg = this.add.rectangle(0, 0, btnWidth, 80, 0xFF6B6B)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(4, 0xEE5253);
        const noTextSize = Math.min(btnWidth * 0.35, 60);
        const noText = this.add.text(0, 0, "ไม่ตรง", {
            fontFamily: '"Sarabun", "Thai Sarabun New", Inter, sans-serif',
            fontSize: `${noTextSize}px`,
            fontStyle: 'bold',
            color: '#FFF'
        }).setOrigin(0.5);
        noBtn.add([noBg, noText]);

        noBg.on('pointerdown', () => {
            this.tweens.add({ targets: noBtn, scale: 0.95, duration: 50, yoyo: true });
            this.handleInput(false);
        });

        // MATCH Button (Right, Green)
        const yesBtn = this.add.container(width * 0.75, yPos);
        const yesBg = this.add.rectangle(0, 0, btnWidth, 80, 0x1DD1A1)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(4, 0x10AC84);
        const yesTextSize = Math.min(btnWidth * 0.35, 60);
        const yesText = this.add.text(0, 0, "ตรง", {
            fontFamily: '"Sarabun", "Thai Sarabun New", Inter, sans-serif',
            fontSize: `${yesTextSize}px`,
            fontStyle: 'bold',
            color: '#FFF'
        }).setOrigin(0.5);
        yesBtn.add([yesBg, yesText]);

        yesBg.on('pointerdown', () => {
            this.tweens.add({ targets: yesBtn, scale: 0.95, duration: 50, yoyo: true });
            this.handleInput(true);
        });
    }

    layoutUI() {
        const { width, height } = this.scale;

        // Re-center container
        if (this.arrowContainer) this.arrowContainer.setPosition(width / 2, height / 2 - 80);

        // Buttons
        // If buttons exist, destroy and recreate or just move? Destroy and recreate for simplicity in proto
        // ... (Optimization: Keep refs and move)
        // For this step, I'll assume they need to be created if missing.
        // Let's create them every time for now or check refs.
    }

    drawArrow(dir: string, color: number) {
        this.arrowGraphics.clear();
        this.arrowGraphics.fillStyle(color, 1);

        // Draw varied arrows based on direction
        // Simple shape: Triangle + Rect

        const w = 20;
        const h = 60;
        const headW = 60;
        const headH = 50;

        let angle = 0;
        switch (dir) {
            case 'UP': angle = 0; break;
            case 'DOWN': angle = 180; break;
            case 'LEFT': angle = 270; break;
            case 'RIGHT': angle = 90; break;
        }

        this.arrowGraphics.rotation = Phaser.Math.DegToRad(angle);

        // Draw pointing UP (0 deg) centered
        // Body
        this.arrowGraphics.fillRect(-w / 2, -h / 2 + 20, w, h);
        // Head
        this.arrowGraphics.fillTriangle(0, -h / 2 - 20, -headW / 2, -h / 2 + 20, headW / 2, -h / 2 + 20);
    }

    drawTimerBar(pct: number) {
        this.timerBar.clear();
        this.timerBar.fillStyle(0xE0E0E0, 1);
        this.timerBar.fillRoundedRect(-150, 180, 300, 10, 5);

        const color = pct < 0.3 ? 0xFF4444 : 0x00CEC9;
        this.timerBar.fillStyle(color, 1);
        this.timerBar.fillRoundedRect(-150, 180, 300 * pct, 10, 5);
    }

    // --- GAMEPLAY LOGIC ---

    startCountdown() {
        this.isCountdown = true;
        this.isPlaying = false;
        this.countdownValue = 3;

        const { width, height } = this.scale;

        // Ensure partial cleanup
        if (this.arrowContainer) this.arrowContainer.setVisible(false);

        const countSize = Math.min(width * 0.5, 300); // Max 300, but scale down for mobile
        const countText = this.add.text(width / 2, height / 2, '3', {
            fontFamily: 'Inter, "Sarabun", "Thai Sarabun New", sans-serif',
            fontSize: `${countSize}px`,
            fontStyle: '900',
            color: '#00f3ff', // Cyan
            stroke: '#ffffff',
            strokeThickness: 10
        }).setOrigin(0.5);

        this.time.addEvent({
            delay: 1000,
            repeat: 3,
            callback: () => {
                if (this.countdownValue > 0) {
                    countText.setText(String(this.countdownValue));
                    // this.sound.play('tick'); // if available
                } else {
                    countText.setText('เริ่ม!');
                    this.tweens.add({
                        targets: countText,
                        alpha: 0,
                        scale: 2,
                        duration: 500,
                        onComplete: () => {
                            countText.destroy();
                            this.isCountdown = false;
                            this.startGame(); // Actually Start
                        }
                    });
                }
                this.countdownValue--;
            }
        });
    }

    startGame() {
        this.isPlaying = true;
        this.score = 0;
        this.correctCount = 0;
        this.currentStreak = 0;
        this.maxStreak = 0;
        this.attempts = 0;
        this.reactionCount = 0;
        this.totalReactionTime = 0;
        this.mismatchCorrect = 0;
        this.mismatchAttempts = 0;
        this.timeLimitPerCard = this.maxTimeLimit;

        this.nextCard();
    }

    nextCard() {
        const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;

        // 50% Chance of Match
        const startMatch = Math.random() > 0.5;

        this.currentArrowDir = dirs[Math.floor(Math.random() * dirs.length)];

        if (startMatch) {
            // @ts-ignore
            this.currentLabelText = this.getThaiLabel(this.currentArrowDir);
            this.isMatch = true;
        } else {
            // Pick a different text
            let other = dirs[Math.floor(Math.random() * dirs.length)];
            while (other === this.currentArrowDir) {
                other = dirs[Math.floor(Math.random() * dirs.length)];
            }
            // @ts-ignore
            this.currentLabelText = this.getThaiLabel(other);
            this.isMatch = false;
        }

        if (this.arrowContainer) this.arrowContainer.setVisible(true);

        // Render
        this.drawArrow(this.currentArrowDir, 0x0984E3); // Blue-ish
        this.labelText.setText(this.currentLabelText);

        // Reset Timer
        this.cardStartTime = Date.now();
    }

    handleInput(saidMatch: boolean) {
        if (!this.isPlaying) return;

        const reactionTime = Date.now() - this.cardStartTime;
        this.totalReactionTime += reactionTime;
        this.reactionCount++;
        this.attempts++;

        let isCorrect = (saidMatch === this.isMatch);

        // Tracking Mismatches specifically
        if (!this.isMatch) {
            this.mismatchAttempts++;
            if (isCorrect) this.mismatchCorrect++;
        }

        if (isCorrect) {
            // CORRECT
            this.sound.play('match-success');
            this.correctCount++;
            this.currentStreak++;
            if (this.currentStreak > this.maxStreak) this.maxStreak = this.currentStreak;

            // Score Calculation: 
            // Base score + Speed Bonus (faster = more points)
            // Max time 2000. If 500ms used, 1500 saved. 
            const speedBonus = Math.floor(Math.max(0, (this.timeLimitPerCard - reactionTime) / 10));
            const points = 100 + speedBonus;
            this.score += points;

            // Visual Effect for EVERY match
            // Show popup at mouse/random position or center? Center is cleaner.
            this.showScorePopup(this.scale.width / 2, this.scale.height / 2 - 150, points);

            // Difficulty Scaling
            if (this.correctCount % 5 === 0) {
                this.timeLimitPerCard = Math.max(this.minTimeLimit, this.timeLimitPerCard * 0.95);
            }

            // Streak Effect
            if (this.currentStreak > 1) {
                this.showStreakEffect();
            }

            this.scoreText.setText(`${this.score}`);
            this.nextCard();
        } else {
            // WRONG
            this.sound.play('match-fail');
            this.currentStreak = 0;
            this.streakText.setAlpha(0); // Hide streak on fail

            // Penalty: Slow down slightly to help
            this.timeLimitPerCard = Math.min(this.maxTimeLimit, this.timeLimitPerCard * 1.10);

            // Shake effect?
            this.cameras.main.shake(100, 0.01);

            this.nextCard();
        }
    }

    handleTimeout() {
        this.isPlaying = false;
        this.sound.play('level-fail');

        // Emit Game Over
        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            // Calculate Difficulty Multiplier from final speed
            // Standard was: D = 2000 / CurrentTimeLimit
            const finalDifficulty = 2000 / this.timeLimitPerCard;

            onGameOver({
                success: true, // It's an endless game, so ending it is a "result", not a failure state in the wrapper sense
                score: this.score,
                maxStreak: this.maxStreak,
                totalCorrect: this.correctCount,
                totalAttempts: this.attempts,
                reactionTimeAvg: this.reactionCount > 0 ? this.totalReactionTime / this.reactionCount : 0,
                difficultyMultiplier: finalDifficulty,
                mismatchCorrect: this.mismatchCorrect,
                mismatchAttempts: this.mismatchAttempts,

                // Also pass stars=0 to prevent errors if wrapper expects it
                stars: 0
            });
        }
    }

    getThaiLabel(dir: string): string {
        switch (dir) {
            case 'UP': return 'บน';
            case 'DOWN': return 'ล่าง';
            case 'LEFT': return 'ซ้าย';
            case 'RIGHT': return 'ขวา';
            default: return '';
        }
    }

    showStreakEffect() {
        const streak = this.currentStreak;
        let text = `${streak} COMBO!`;
        let color = '#fdcb6e';
        let scale = 1.0;

        if (streak >= 5) {
            text = "SUPER HOT!";
            color = '#e17055';
            scale = 1.2;
        }
        if (streak >= 10) {
            text = "UNSTOPPABLE!";
            color = '#d63031';
            scale = 1.5;
        }

        this.streakText.setText(text);
        this.streakText.setColor(color);
        this.streakText.setAlpha(1);
        this.streakText.setScale(0.5);

        this.tweens.add({
            targets: this.streakText,
            scale: scale,
            duration: 200,
            yoyo: true,
            hold: 500,
            onComplete: () => {
                if (streak < 5) {
                    this.tweens.add({
                        targets: this.streakText,
                        alpha: 0,
                        duration: 300
                    });
                }
            }
        });
    }

    showScorePopup(x: number, y: number, points: number) {
        const popup = this.add.text(x, y, `+${points}`, {
            font: 'bold 40px Inter',
            color: '#00b894',
            stroke: '#ffffff',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.tweens.add({
            targets: popup,
            y: y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Power1',
            onComplete: () => {
                popup.destroy();
            }
        });
    }
}
