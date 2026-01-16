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

    // Spam Protection
    private inputHistory: number[] = [];
    private isInputLocked = false;
    private isTutorialMode = false;

    // Difficulty
    // Difficulty
    private timeLimitPerCard = 7000;    // Start at 7000ms (7s) for older/slower pace
    private maxTimeLimit = 7000;
    private minTimeLimit = 1500;        // Cap speed at 1.5s instead of 0.6s
    private difficultyMultiplier = 1.0;

    // Phases
    private currentPhase = 1;
    private readonly PHASE_2_THRESHOLD = 10000;
    private readonly PHASE_3_THRESHOLD = 20000;

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
    private noBg!: Phaser.GameObjects.Rectangle;
    private yesBg!: Phaser.GameObjects.Rectangle;

    // Audio Objects
    private soundMatchSuccess!: Phaser.Sound.BaseSound;
    private soundMatchFail!: Phaser.Sound.BaseSound;
    private soundLevelPass!: Phaser.Sound.BaseSound;
    private soundBeep!: Phaser.Sound.BaseSound;
    private soundBgm!: Phaser.Sound.BaseSound;

    constructor() { super({ key: 'SensorLockGameScene' }); }

    create() {
        const { width, height } = this.scale;

        // 1. Background
        this.createBackground();

        // 2. HUD Elements
        this.createHUD();

        // 3. Central Stimulus
        this.createStimulusArea();

        // 4. Controls
        this.createControls();

        // 5. Audio Setup (Pre-create for lower latency)
        this.soundMatchSuccess = this.sound.add('match-success');
        this.soundMatchFail = this.sound.add('match-fail');
        this.soundLevelPass = this.sound.add('level-pass');
        this.soundBeep = this.sound.add('beep');

        // BGM
        this.soundBgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
        this.sound.stopAll();
        // this.soundBgm.play(); // Played in startGame

        // 6. Input Keys
        this.input.keyboard?.on('keydown-LEFT', () => this.handleInput(true));

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
        this.load.audio('match-success', '/assets/sounds/cardmatch/match-success.mp3');
        this.load.audio('match-fail', '/assets/sounds/cardmatch/match-fail.mp3');
        this.load.audio('level-fail', '/assets/sounds/global/level-fail.mp3');

        // Placeholder for the background image - uncomment when image is ready
        // this.load.image('park-background', '/assets/images/park_background.png');

        // New Audio
        this.load.audio('beep', '/assets/sounds/sensorlock/beep.mp3');
        this.load.audio('bgm', '/assets/sounds/sensorlock/sensorlock-bg.mp3');
        this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
    }

    update(time: number, delta: number) {
        if (!this.isPlaying) return;

        // Tutorial Mode: Infinite Time
        if (this.isTutorialMode) {
            this.timerBar.clear(); // Hide timer bar
            return;
        }

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

    createBackground() {
        const { width, height } = this.scale;

        // Try to add image if loaded, else gradient/shapes
        if (this.textures.exists('park-background')) {
            const bg = this.add.image(width / 2, height / 2, 'park-background');
            const scaleX = width / bg.width;
            const scaleY = height / bg.height;
            const scale = Math.max(scaleX, scaleY);
            bg.setScale(scale).setScrollFactor(0);
        } else {
            // Enhanced Procedural Park Background

            // 1. Sky (Gradient via multiple rects for smoothness or just a nice solid)
            const sky = this.add.graphics();
            sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xE0F7FA, 0xE0F7FA, 1);
            sky.fillRect(0, 0, width, height);

            // 2. Sun with Rays
            const sunGroup = this.add.container(width * 0.85, height * 0.15);
            const sun = this.add.circle(0, 0, 50, 0xFDB813);
            sunGroup.add(sun);

            // Rays
            const rays = this.add.graphics();
            rays.lineStyle(4, 0xFDB813, 0.4);
            for (let i = 0; i < 12; i++) {
                const angle = i * 30;
                const rad = Phaser.Math.DegToRad(angle);
                rays.moveTo(Math.cos(rad) * 60, Math.sin(rad) * 60);
                rays.lineTo(Math.cos(rad) * 90, Math.sin(rad) * 90);
            }
            rays.strokePath();
            sunGroup.add(rays);

            // Animate Sun
            this.tweens.add({
                targets: sunGroup,
                angle: 360,
                duration: 20000,
                repeat: -1
            });

            // 3. Clouds (Fluffy)
            this.createCloud(width * 0.2, height * 0.2, 0.8);
            this.createCloud(width * 0.6, height * 0.15, 0.6);
            this.createCloud(width * 0.9, height * 0.3, 0.9);

            // 4. Hills (Smoother rolling hills)
            const hills = this.add.graphics();

            // Back Hill (Darker Green)
            hills.fillStyle(0x76c7c0, 1);
            const backHillPath = new Phaser.Curves.Path(0, height * 0.75);
            // Single smooth curve spanning the width
            backHillPath.splineTo([
                new Phaser.Math.Vector2(width * 0.3, height * 0.65),
                new Phaser.Math.Vector2(width * 0.7, height * 0.7),
                new Phaser.Math.Vector2(width, height * 0.6)
            ]);
            backHillPath.lineTo(width, height);
            backHillPath.lineTo(0, height);
            backHillPath.closePath();
            hills.fillPoints(backHillPath.getPoints(), true);

            // Front Hill (Lighter Green)
            hills.fillStyle(0x55efc4, 1);
            const frontHillPath = new Phaser.Curves.Path(0, height * 0.85);
            // Gentle rise and fall
            frontHillPath.splineTo([
                new Phaser.Math.Vector2(width * 0.4, height * 0.9),
                new Phaser.Math.Vector2(width * 0.7, height * 0.8),
                new Phaser.Math.Vector2(width, height * 0.9)
            ]);
            frontHillPath.lineTo(width, height);
            frontHillPath.lineTo(0, height);
            frontHillPath.closePath();
            hills.fillPoints(frontHillPath.getPoints(), true);

            // 5. Vector Trees
            this.createTree(width * 0.1, height * 0.85, 0.8);
            this.createTree(width * 0.25, height * 0.9, 1.0);
            this.createTree(width * 0.85, height * 0.82, 0.7);
            this.createTree(width * 0.95, height * 0.92, 0.9);
        }
    }

    createCloud(x: number, y: number, scale: number) {
        const cloud = this.add.container(x, y);
        cloud.setScale(scale);

        const g = this.add.graphics();
        g.fillStyle(0xFFFFFF, 0.9);
        g.fillCircle(0, 0, 30);
        g.fillCircle(25, -10, 35);
        g.fillCircle(50, 0, 30);

        cloud.add(g);

        // Floating animation
        this.tweens.add({
            targets: cloud,
            x: x + 20,
            duration: 4000 + Math.random() * 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createTree(x: number, y: number, scale: number) {
        const tree = this.add.container(x, y);
        tree.setScale(scale);

        const g = this.add.graphics();

        // Trunk
        g.fillStyle(0x8D6E63, 1); // Brown
        g.fillRect(-5, 0, 10, 40);

        // Leaves (Triangle or Circle depending on style - Triangle is cleaner vector)
        g.fillStyle(0x00b894, 1);
        g.fillTriangle(0, -60, -25, 0, 25, 0); // Top
        g.fillTriangle(0, -30, -30, 20, 30, 20); // Bottom

        tree.add(g);
    }

    createHUD() {
        const { width } = this.scale;

        // Score (Top Right, Stylized)
        // Score (Top Right, Stylized)
        const scoreSize = Math.max(32, Math.min(width * 0.08, 64)); // Responsive calculation
        this.scoreText = this.add.text(width - 20, 20 + (scoreSize / 2), "0", {
            fontFamily: '"Mali", "Sarabun", "Thai Sarabun New", Inter, sans-serif',
            fontSize: `${scoreSize}px`,
            fontStyle: 'bold',
            color: '#6c5ce7', // Purple/Blue text
            stroke: '#ffffff',
            strokeThickness: 5
        }).setOrigin(1, 0.5);

        // Streak Indicator (Center Top, initially hidden)
        // Streak Indicator (Center Top, initially hidden)
        this.streakText = this.add.text(width / 2, 80, "", {
            font: 'bold 48px "Mali"',
            color: '#ff7675',
            stroke: '#ffffff',
            strokeThickness: 6
        }).setOrigin(0.5).setPadding(40).setAlpha(0);
    }

    createStimulusArea() {
        const { width, height } = this.scale;
        this.arrowContainer = this.add.container(width / 2, height / 2 - 50);

        this.arrowGraphics = this.add.graphics();
        this.arrowContainer.add(this.arrowGraphics);

        // Label
        const labelSize = Math.min(width * 0.15, 80);
        this.labelText = this.add.text(0, 120, "UP", {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: `${labelSize}px`,
            fontStyle: '900',
            color: '#2d3436', // Dark Grey for contrast on light bg
            stroke: '#ffffff',
            strokeThickness: 6
        }).setOrigin(0.5).setPadding(40); // Generous padding for Thai accents
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
        this.noBg = this.add.rectangle(0, 0, btnWidth, 80, 0xFF7675)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(4, 0xD63031);
        const noTextSize = Math.min(btnWidth * 0.25, 50);
        const noText = this.add.text(0, 0, "ไม่ตรง", {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: `${noTextSize}px`,
            fontStyle: 'bold',
            color: '#FFF',
            stroke: '#D63031',
            strokeThickness: 2
        }).setOrigin(0.5).setPadding(5);
        noBtn.add([this.noBg, noText]);

        this.noBg.on('pointerdown', () => {
            this.tweens.add({ targets: noBtn, scale: 0.95, duration: 50, yoyo: true });
            this.handleInput(false);
        });

        // MATCH Button (Right, Green)
        const yesBtn = this.add.container(width * 0.75, yPos);
        this.yesBg = this.add.rectangle(0, 0, btnWidth, 80, 0x55EFC4)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(4, 0x00B894);
        const yesTextSize = Math.min(btnWidth * 0.25, 50);
        const yesText = this.add.text(0, 0, "ตรง", {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: `${yesTextSize}px`,
            fontStyle: 'bold',
            color: '#FFF',
            stroke: '#00B894',
            strokeThickness: 2
        }).setOrigin(0.5).setPadding(5);
        yesBtn.add([this.yesBg, yesText]);

        this.yesBg.on('pointerdown', () => {
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
        this.timerBar.fillStyle(0xb2bec3, 1);
        this.timerBar.fillRoundedRect(-150, 180, 300, 10, 5);

        const color = pct < 0.3 ? 0xff7675 : 0x0984e3;
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

        const countSize = Math.min(width * 0.3, 180); // Max 180, significantly smaller
        const countText = this.add.text(width / 2, height / 2, '3', {
            fontFamily: '"Mali", sans-serif',
            fontSize: `${countSize}px`,
            fontStyle: '900',
            color: '#6c5ce7', // Purple
            stroke: '#ffffff',
            strokeThickness: 10
        }).setOrigin(0.5).setPadding(60); // Generous padding for Thai accents

        this.time.addEvent({
            delay: 1000,
            repeat: 3,
            callback: () => {
                if (this.countdownValue > 0) {
                    countText.setText(String(this.countdownValue));
                    this.soundBeep.play();
                } else {
                    countText.setText('เริ่ม!');
                    this.soundBeep.play({ detune: 600 }); // Higher pitch for start
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

    // Helper to ensure 6-digit hex
    colorToHex(color: number): string {
        return '#' + color.toString(16).padStart(6, '0');
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

        // Start BGM
        this.sound.stopAll(); // clear previous
        if (this.soundBgm) this.soundBgm.play();

        if (this.soundBgm) this.soundBgm.play();

        this.currentPhase = 1;
        this.isTutorialMode = false; // Reset
        this.nextCard(true);
    }

    nextCard(resetTimer: boolean = true) {
        if (this.currentPhase === 1) {
            this.setupPhase1();
        } else if (this.currentPhase === 2) {
            this.setupPhase2();
        } else {
            this.setupPhase3();
        }

        if (this.arrowContainer) this.arrowContainer.setVisible(true);

        // Reset Timer ONLY if requested
        if (resetTimer) {
            this.cardStartTime = Date.now();
        }
    }

    setupPhase1() {
        // Phase 1: Direction Match (Arrow vs Text)
        const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;
        const startMatch = Math.random() > 0.5;

        this.currentArrowDir = dirs[Math.floor(Math.random() * dirs.length)];

        // Reset Visuals
        this.labelText.setColor('#2d3436'); // Default Grey
        this.arrowGraphics.setVisible(true);

        if (startMatch) {
            // @ts-ignore
            this.currentLabelText = this.getThaiLabel(this.currentArrowDir);
            this.isMatch = true;
        } else {
            let other = dirs[Math.floor(Math.random() * dirs.length)];
            while (other === this.currentArrowDir) {
                other = dirs[Math.floor(Math.random() * dirs.length)];
            }
            // @ts-ignore
            this.currentLabelText = this.getThaiLabel(other);
            this.isMatch = false;
        }

        this.drawArrow(this.currentArrowDir, 0x0984E3); // Default Blue
        this.labelText.setText(this.currentLabelText);
    }

    setupPhase2() {
        // Phase 2: Color Match (Text Color vs Text Meaning)
        // Arrow is HIDDEN.
        this.arrowGraphics.setVisible(false);

        const colors = [
            { key: 'RED', hex: 0xFF7675, label: 'แดง' },
            { key: 'GREEN', hex: 0x00B894, label: 'เขียว' },
            { key: 'BLUE', hex: 0x0984E3, label: 'น้ำเงิน' },
            { key: 'YELLOW', hex: 0xFDCB6E, label: 'เหลือง' }
        ];

        const startMatch = Math.random() > 0.5;
        const targetColor = colors[Math.floor(Math.random() * colors.length)]; // The Meaning

        if (startMatch) {
            // Ink matches Meaning
            // @ts-ignore
            this.currentLabelText = targetColor.label;
            this.labelText.setColor(this.colorToHex(targetColor.hex));
            this.isMatch = true;
        } else {
            // Ink mismatch
            let otherInk = colors[Math.floor(Math.random() * colors.length)];
            while (otherInk.key === targetColor.key) {
                otherInk = colors[Math.floor(Math.random() * colors.length)];
            }

            // @ts-ignore
            this.currentLabelText = targetColor.label; // Meaning says "Red"
            this.labelText.setColor(this.colorToHex(otherInk.hex)); // Ink is "Blue"

            // User matches "Ink Color" vs "Text Meaning"?
            // Wait, Standard Stroop: "Say the color of the word".
            // Here we want "Match Color with Name". 
            // If Text says "Red" and Ink is Red -> Match.
            // If Text says "Red" and Ink is Blue -> No Match.
            this.isMatch = false;
        }

        this.labelText.setText(this.currentLabelText);
    }

    setupPhase3() {
        // Phase 3: Combined (Direction Match AND Color Match)
        // Show Arrow and Text.
        // Arrow has Direction and Color.
        // Text has Direction Meaning and Ink Color.
        // Match = ArrowDir == TextMeaning AND ArrowColor == TextInkColor.

        this.arrowGraphics.setVisible(true);

        const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;
        const colors = [
            { key: 'RED', hex: 0xFF7675, label: 'แดง' },
            { key: 'GREEN', hex: 0x00B894, label: 'เขียว' },
            { key: 'BLUE', hex: 0x0984E3, label: 'น้ำเงิน' },
            { key: 'YELLOW', hex: 0xFDCB6E, label: 'เหลือง' } // Using simple Yellow
        ];

        const isFullMatch = Math.random() > 0.5;

        // 1. Setup Attributes
        const arrowDir = dirs[Math.floor(Math.random() * dirs.length)];
        const arrowColor = colors[Math.floor(Math.random() * colors.length)];

        // Store for drawing
        this.currentArrowDir = arrowDir;

        let textDir = arrowDir;
        let textInk = arrowColor;

        if (isFullMatch) {
            // EVERYTHING MATCHES
            this.isMatch = true;
        } else {
            // MISMATCH
            // Could be Dir mismatch, Color mismatch, or Both.
            // Let's randomize the type of mismatch
            const mismatchType = Math.random();

            if (mismatchType < 0.33) {
                // Dir Mismatch only
                let d = dirs[Math.floor(Math.random() * dirs.length)];
                while (d === arrowDir) d = dirs[Math.floor(Math.random() * dirs.length)];
                textDir = d;
            } else if (mismatchType < 0.66) {
                // Color Mismatch only
                let c = colors[Math.floor(Math.random() * colors.length)];
                while (c.key === arrowColor.key) c = colors[Math.floor(Math.random() * colors.length)];
                textInk = c;
            } else {
                // Both Mismatch
                let d = dirs[Math.floor(Math.random() * dirs.length)];
                while (d === arrowDir) d = dirs[Math.floor(Math.random() * dirs.length)];
                textDir = d;

                let c = colors[Math.floor(Math.random() * colors.length)];
                while (c.key === arrowColor.key) c = colors[Math.floor(Math.random() * colors.length)];
                textInk = c;
            }
            this.isMatch = false;
        }

        // Apply
        // @ts-ignore
        this.currentLabelText = this.getThaiLabel(textDir);
        this.labelText.setText(this.currentLabelText);
        this.labelText.setColor(this.colorToHex(textInk.hex));

        this.drawArrow(arrowDir, arrowColor.hex);
    }

    handleInput(saidMatch: boolean) {
        if (!this.isPlaying) return;
        if (this.isInputLocked) return;

        const now = Date.now();
        this.inputHistory.push(now);
        if (this.inputHistory.length > 5) this.inputHistory.shift();

        // Check for Spam (Rapid clicking)
        if (this.inputHistory.length >= 5) {
            let totalDiff = 0;
            for (let i = 1; i < this.inputHistory.length; i++) {
                totalDiff += (this.inputHistory[i] - this.inputHistory[i - 1]);
            }
            const avgDiff = totalDiff / (this.inputHistory.length - 1);

            // 180ms threshold (~5.5 clicks/sec) is very fast for this game type
            if (avgDiff < 180) {
                // SPAM DETECTED
                this.isInputLocked = true;
                this.soundMatchFail.play();
                this.cameras.main.shake(500, 0.05); // Heavy shake

                // Show Warning
                this.streakText.setText("อย่ากดรัว!");
                this.streakText.setColor('#D63031');
                this.streakText.setAlpha(1);
                this.streakText.setScale(1);

                // Grey out buttons & Disable Interactivity
                this.noBg.setFillStyle(0x95a5a6);     // Concrete Grey
                this.noBg.setStrokeStyle(4, 0x7f8c8d); // Darker Grey
                this.noBg.disableInteractive();

                this.yesBg.setFillStyle(0x95a5a6);
                this.yesBg.setStrokeStyle(4, 0x7f8c8d);
                this.yesBg.disableInteractive();

                // Lockout for 3 seconds
                this.time.delayedCall(3000, () => {
                    this.isInputLocked = false;
                    this.inputHistory = []; // Reset history
                    this.streakText.setAlpha(0);

                    // Restore Button Colors & Interactivity
                    this.noBg.setFillStyle(0xFF7675); // Red
                    this.noBg.setStrokeStyle(4, 0xD63031);
                    this.noBg.setInteractive();

                    this.yesBg.setFillStyle(0x55EFC4); // Green
                    this.yesBg.setStrokeStyle(4, 0x00B894);
                    this.yesBg.setInteractive();
                });
                return; // Block this input
            }
        }

        const reactionTime = now - this.cardStartTime;
        this.totalReactionTime += reactionTime;
        this.reactionCount++;
        this.attempts++;

        let isCorrect = (saidMatch === this.isMatch);

        // Tutorial Logic: Retry on fail, proceed on success
        if (this.isTutorialMode) {
            if (!isCorrect) {
                this.sound.play('match-fail');
                this.cameras.main.shake(100, 0.01);
                return; // Don't advance, don't penalize
            }
            // If correct, clear tutorial mode and proceed to scoring
            this.isTutorialMode = false;
            this.cardStartTime = Date.now(); // Reset timer for next card
        }

        // Tracking Mismatches specifically
        if (!this.isMatch) {
            this.mismatchAttempts++;
            if (isCorrect) this.mismatchCorrect++;
        }

        if (isCorrect) {
            // CORRECT
            this.correctCount++;
            this.currentStreak++;
            if (this.currentStreak > this.maxStreak) this.maxStreak = this.currentStreak;

            // Dynamic Pitch: Increases for streaks 2, 3, 4, max at 5 (detune +200 cents per step)
            // Streak 1: 0, Streak 2: 200, Streak 3: 400, Streak 4: 600, Streak 5+: 800
            const pitchStep = 200;
            const detune = Math.min(Math.max(0, this.currentStreak - 1), 4) * pitchStep;

            this.sound.play('match-success', { detune: detune });

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

            // Check Phase Progression
            this.checkPhaseProgression();

            // Streak Effect
            if (this.currentStreak > 1) {
                this.showStreakEffect();
            }

            this.scoreText.setText(`${this.score}`);

            if (this.isPlaying) {
                this.nextCard(true); // Reset Timer on success
            }
        } else {
            // WRONG
            this.sound.play('match-fail');
            this.currentStreak = 0;
            this.streakText.setAlpha(0); // Hide streak on fail

            // Penalty: Deduct 1000ms from remaining time.
            // Reduced from 2000ms to be fair to older players at higher speeds (1.5s limit).
            this.cardStartTime -= 1000;

            // Visual Feedback for Penalty? (Just shake)
            this.cameras.main.shake(100, 0.01);

            // Check if this penalty killed the timer immediately
            const elapsed = Date.now() - this.cardStartTime;
            if (elapsed >= this.timeLimitPerCard) {
                this.handleTimeout();
                return;
            }

            // Move to NEXT card (so they can't just click other button), but KEEP timer (resetTimer=false)
            this.nextCard(false);
        }
    }

    handleTimeout() {
        this.isPlaying = false;
        this.sound.stopAll(); // Stop BGM
        this.sound.play('level-pass'); // Positive feedback even on end

        // TIMEOUT IS A REACTION too (Just a very slow one)
        // If we don't count this, users who do nothing get 0 reaction time avg -> 100% speed score.
        // We add the full time limit as the "reaction time" for this failed attempt.
        this.totalReactionTime += this.timeLimitPerCard;
        this.reactionCount++;
        this.attempts++;
        // Note: We do NOT increment match/mismatch correct since it was a fail.

        // Emit Game Over
        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            // Calculate Difficulty Multiplier from final speed
            // Standard was: D = 2000 / CurrentTimeLimit. Now Base is 7000.
            // D = 7000 / CurrentTimeLimit
            const finalDifficulty = 7000 / this.timeLimitPerCard;

            onGameOver({
                success: true,
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
            const phrases = [
                "เยี่ยม!",      // Great!
                "สุดยอด!",     // Awesome!
                "เก่งมาก!",    // Very good!
                "แม่นยำ!",     // Precise!
                "ว้าว!",       // Wow!
                "ทำได้ดี!"     // Well done!
            ];
            text = Phaser.Utils.Array.GetRandom(phrases);
            color = '#e17055'; // Orange/Red
            scale = 1.2;

            // Extra flair for high streaks
            if (streak >= 10) {
                color = '#d63031';
                scale = 1.4;
            }
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

    checkPhaseProgression() {
        if (this.currentPhase === 1 && this.score >= this.PHASE_2_THRESHOLD) {
            this.showPhaseTransition(2);
        } else if (this.currentPhase === 2 && this.score >= this.PHASE_3_THRESHOLD) {
            this.showPhaseTransition(3);
        }
    }

    showPhaseTransition(nextPhase: number) {
        this.isPlaying = false; // Pause Game
        this.currentPhase = nextPhase;
        this.sound.stopAll();
        this.soundLevelPass.play();

        // 1. Fade OUT Game Elements
        this.tweens.add({
            targets: [this.arrowContainer, this.streakText, this.scoreText],
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.playTransitionSequence(nextPhase);
            }
        });
    }

    playTransitionSequence(nextPhase: number) {
        const { width, height } = this.scale;

        let title = "";
        let line1 = "";
        let line2 = "";

        if (nextPhase === 2) {
            title = "LEVEL 2";
            line1 = "จับคู่สี!";
            line2 = "(ตรงกัน = สีเหมือนชื่อสี)";
        } else {
            title = "LEVEL 3";
            line1 = "รวมร่าง!";
            line2 = "(ต้องตรงกันทั้งทิศและสี)";
        }

        const container = this.add.container(width / 2, height / 2).setAlpha(1);

        const titleText = this.add.text(0, -80, title, {
            fontFamily: '"Mali", sans-serif',
            fontSize: '80px',
            color: '#fdcb6e',
            stroke: '#ffffff',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setScale(0).setAlpha(0).setPadding(30);

        const text1 = this.add.text(0, 20, line1, {
            fontFamily: '"Mali", sans-serif',
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#2d3436',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5).setAlpha(0).setY(50).setPadding(20);

        const text2 = this.add.text(0, 90, line2, {
            fontFamily: '"Mali", sans-serif',
            fontSize: '32px',
            color: '#dfe6e9',
            stroke: '#2d3436',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5).setAlpha(0).setY(120).setPadding(20);

        container.add([titleText, text1, text2]);

        // Sequence
        this.tweens.chain({
            tweens: [
                {
                    targets: titleText,
                    scale: 1,
                    alpha: 1,
                    duration: 600,
                    ease: 'Back.out',
                    onComplete: () => { this.soundBeep.play({ detune: 200 }); }
                },
                {
                    targets: text1,
                    y: 20,
                    alpha: 1,
                    duration: 500,
                    ease: 'Power2.out'
                },
                {
                    targets: text2,
                    y: 90,
                    alpha: 1,
                    duration: 500,
                    ease: 'Power2.out'
                },
                {
                    targets: container,
                    alpha: 1, // Hold
                    duration: 2500
                },
                {
                    targets: container,
                    alpha: 0,
                    scale: 0.8,
                    duration: 400,
                    onComplete: () => {
                        container.destroy();
                        this.resumeGameAfterTransition();
                    }
                }
            ]
        });
    }

    resumeGameAfterTransition() {
        // Restore Visibility
        this.arrowContainer.setAlpha(1);
        this.streakText.setAlpha(0); // Should be hidden initially
        this.scoreText.setAlpha(1);

        // Resume Music
        if (this.soundBgm) this.soundBgm.play();

        this.isPlaying = true;
        this.isTutorialMode = true; // First card of new phase is untimed tutorial

        // Reset Visuals for new phase (important!)
        this.nextCard(true);
    }
}
