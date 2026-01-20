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

    // Game Settings
    private maxTimeLimit = 6500;
    private minTimeLimit = 2000;
    private speedupRate = 50;
    private timeLimitPerCard = this.maxTimeLimit;
    private tutorialDirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;

    // --- PHASE THRESHOLDS (UPDATED) ---
    private currentPhase = 1;
    private difficultyMultiplier = 1.0;
    private PHASE_2_THRESHOLD = 10000;  // Was 5000
    private PHASE_3_THRESHOLD = 20000;  // Was 15000
    private PHASE_4_THRESHOLD = 30000;  // NEW

    // --- NEW MECHANIC: NOT Operator ---
    private isNegated: boolean = false;
    private NOT_THRESHOLD = 15000; // Enable after 15k points
    private NOT_CHANCE = 0.25; // 25% chance when enabled
    private notBadge!: Phaser.GameObjects.Container | null;

    // --- NEW MECHANIC: Drifting ---
    private driftEnabled: boolean = false;
    private DRIFT_SPEED = 40; // pixels per second
    private arrowVelocity = { x: 0, y: 0 };
    private textVelocity = { x: 0, y: 0 };

    // --- NEW MECHANIC: Button Swap ---
    private buttonsSwapped: boolean = false;
    private SWAP_COMBO_TRIGGER = 5;

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
    private timerIcon!: Phaser.GameObjects.Graphics;
    private scoreText!: Phaser.GameObjects.Text;
    private streakText!: Phaser.GameObjects.Text;

    // Controls
    private noBg!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Graphics;
    private yesBg!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Graphics;
    // We now store Containers for general manipulation
    private noContainer!: Phaser.GameObjects.Container;
    private yesContainer!: Phaser.GameObjects.Container;
    // We store the Face Groups to reset animation/position
    private noFace!: Phaser.GameObjects.Container;
    private yesFace!: Phaser.GameObjects.Container;

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

    update(t: number, dt: number) {
        // Strict Visibility Control
        const shouldShowTimer = this.isPlaying && !this.isTutorialMode && !this.isInputLocked;

        if (this.timerBar) this.timerBar.setVisible(shouldShowTimer);
        if (this.timerIcon) this.timerIcon.setVisible(shouldShowTimer);

        // --- DRIFTING MECHANIC (Phase 4+) ---
        // Note: Runs even during tutorial so Phase 4 tutorial shows the feature!
        if (this.driftEnabled && this.arrowGraphics && this.labelText && this.isPlaying) {
            const dtSec = dt / 1000;

            // Move Arrow
            this.arrowGraphics.x += this.arrowVelocity.x * dtSec;
            this.arrowGraphics.y += this.arrowVelocity.y * dtSec;

            // Bounce Arrow (Card bounds: ±100 for X, ±120 for Y from center)
            if (Math.abs(this.arrowGraphics.x) > 100) {
                this.arrowVelocity.x *= -1;
                this.arrowGraphics.x = Phaser.Math.Clamp(this.arrowGraphics.x, -100, 100);
            }
            if (Math.abs(this.arrowGraphics.y + 80) > 100) { // Offset by -80 (default Y)
                this.arrowVelocity.y *= -1;
                this.arrowGraphics.y = Phaser.Math.Clamp(this.arrowGraphics.y, -180, 20);
            }

            // Move Text
            this.labelText.x += this.textVelocity.x * dtSec;
            this.labelText.y += this.textVelocity.y * dtSec;

            // Bounce Text (default Y = 80)
            if (Math.abs(this.labelText.x) > 80) {
                this.textVelocity.x *= -1;
                this.labelText.x = Phaser.Math.Clamp(this.labelText.x, -80, 80);
            }
            if (Math.abs(this.labelText.y - 80) > 80) {
                this.textVelocity.y *= -1;
                this.labelText.y = Phaser.Math.Clamp(this.labelText.y, 0, 160);
            }
        }

        if (!this.isPlaying || this.isInputLocked || this.isTutorialMode) {
            return;
        }

        const now = Date.now();
        const elapsed = now - this.cardStartTime;
        const pct = 1 - (elapsed / this.timeLimitPerCard);

        if (pct <= 0) {
            this.handleTimeout();
        } else {
            this.drawTimerBar(pct);
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
        }).setOrigin(1, 0.5).setDepth(100);

        // Streak Indicator (Center Top, initially hidden)
        // Streak Indicator (Center Top, initially hidden)
        this.streakText = this.add.text(width / 2, 80, "", {
            font: 'bold 48px "Mali"',
            color: '#ff7675',
            stroke: '#ffffff',
            strokeThickness: 6
        }).setOrigin(0.5).setPadding(40).setAlpha(0).setDepth(100);
    }

    createStimulusArea() {
        const { width, height } = this.scale;

        // 1. Permanent Timer (Below the card area)
        // Card center is height/2 - 100. Card height is 420.
        // Card bottom is approx (height/2 - 100) + 210 = height/2 + 110.
        // Let's put timer at height/2 + 160.

        const timerY = height / 2 + 160;

        this.timerBar = this.add.graphics();
        this.timerBar.setPosition(width / 2, timerY); // Center X
        this.add.existing(this.timerBar);

        // Timer Icon
        this.timerIcon = this.add.graphics();
        this.timerIcon.setPosition(width / 2, timerY);
        this.timerIcon.lineStyle(3, 0x636e72, 1); // Darker Grey for visibility
        this.timerIcon.strokeCircle(-140, 6, 12);
        this.timerIcon.beginPath();
        this.timerIcon.moveTo(-140, 6); this.timerIcon.lineTo(-140, 0);
        this.timerIcon.moveTo(-140, 6); this.timerIcon.lineTo(-134, 6);
        this.timerIcon.strokePath();
        this.add.existing(this.timerIcon);

        // 2. Create the initial card
        this.spawnCardContainer(width / 2, height / 2 - 100);
    }

    // Helper to create a fresh Card Container
    spawnCardContainer(x: number, y: number) {
        const container = this.add.container(x, y);
        // Start invisible/small for "Pop In" effect if needed, 
        // but nextCard handles the tween.

        // Card Dimensions (Unified Card Theme)
        const cardW = 340;
        const cardH = 420;
        const cornerRadius = 32;

        // 1. Soft Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillRoundedRect(-cardW / 2, -cardH / 2 + 10, cardW, cardH, cornerRadius);
        container.add(shadow);

        // 2. Card Body (White)
        const bgCard = this.add.graphics();
        bgCard.fillStyle(0xffffff, 1);
        bgCard.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, cornerRadius);
        container.add(bgCard);

        // 3. Arrow Graphics
        const arrowG = this.add.graphics();
        arrowG.y = -40; // Moved down to avoid NOT badge overlap
        container.add(arrowG);

        // 4. Label Text
        // Explicitly White/High Contrast if needed, or Dark Grey
        const labelT = this.add.text(0, 80, "", {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: "64px",
            fontStyle: "900",
            color: "#2d3436"
        }).setOrigin(0.5).setPadding(30); // Added Padding
        container.add(labelT);

        // 5. NOT Badge (Hidden by default) - TOP of card, clearly visible
        const badge = this.add.container(0, -160); // Back to top
        badge.setVisible(false);

        // Glow/Shadow effect - EVEN padding (8px on all sides)
        const badgeGlow = this.add.graphics();
        badgeGlow.fillStyle(0xFF0000, 0.25);
        badgeGlow.fillRoundedRect(-78, -30, 156, 60, 30); // 8px larger than badge on all sides
        badge.add(badgeGlow);

        // Main badge background - LARGER & BOLDER
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(0xD63031, 1); // Strong Red
        badgeBg.lineStyle(4, 0xFFFFFF, 1); // White border
        badgeBg.fillRoundedRect(-70, -22, 140, 44, 22);
        badgeBg.strokeRoundedRect(-70, -22, 140, 44, 22);
        badge.add(badgeBg);

        // Badge text with ❌ icon - BIGGER
        const badgeText = this.add.text(0, 0, "❌ ไม่ใช่!", {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: "28px",
            fontStyle: "900",
            color: "#FFFFFF"
        }).setOrigin(0.5);
        badge.add(badgeText);

        container.add(badge);
        this.notBadge = badge;

        // Update Class References to this NEW card
        this.arrowContainer = container;
        this.arrowGraphics = arrowG;
        this.labelText = labelT;
        // Timer is now global/static, not per-card
    }

    // Show NOT badge with attention-grabbing animation
    showNotBadge() {
        if (!this.notBadge) return;
        this.notBadge.setVisible(true);
        this.notBadge.setScale(0);
        this.notBadge.setAlpha(1);

        // Pop in
        this.tweens.add({
            targets: this.notBadge,
            scale: 1,
            duration: 300,
            ease: 'Back.out',
            onComplete: () => {
                // Continuous pulse to keep attention
                this.tweens.add({
                    targets: this.notBadge,
                    scale: 1.1,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.inOut'
                });
            }
        });
    }

    // Hide NOT badge
    hideNotBadge() {
        if (!this.notBadge) return;
        this.tweens.killTweensOf(this.notBadge); // Stop pulse
        this.notBadge.setVisible(false);
    }

    createControls() {
        const { width, height } = this.scale;

        const yPos = height - 100;
        const btnWidth = width / 2 - 40; // Full width - padding
        const btnHeight = 90;
        const lipDepth = 12; // Height of the 3D "Lip"

        // --- Helper to create 3D "Juicy" Button ---
        const create3DBtn = (x: number, label: string, color: number, lipColor: number, textColor: string, isYes: boolean) => {
            const container = this.add.container(x, yPos);

            // 1. The "Lip" (Bottom/Darker Layer)
            // It sits fixed.
            const lip = this.add.graphics();
            lip.fillStyle(lipColor, 1);
            lip.fillRoundedRect(-btnWidth / 2, -btnHeight / 2 + lipDepth, btnWidth, btnHeight, 16);
            container.add(lip);

            // 2. The "Face" (Top/Main Layer)
            // This is the part that moves up/down.
            const faceGroup = this.add.container(0, 0); // Group face + text
            container.add(faceGroup);

            const face = this.add.graphics();
            face.fillStyle(color, 1);
            face.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 16);
            faceGroup.add(face);

            // 3. Text (High Contrast White)
            const textSize = Math.min(btnWidth * 0.25, 45);
            const text = this.add.text(0, 0, label, {
                fontFamily: '"Mali", "Sarabun", sans-serif',
                fontSize: `${textSize}px`,
                fontStyle: '900', // Bold
                color: "#FFFFFF", // White for max contrast
                shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true, stroke: false }
            }).setOrigin(0.5).setPadding(5);
            faceGroup.add(text);

            // 4. Hit Area (Covers the whole potential area)
            const hitArea = this.add.rectangle(0, lipDepth / 2, btnWidth, btnHeight + lipDepth, 0x000000, 0)
                .setInteractive({ useHandCursor: true });
            container.add(hitArea);

            // 5. Interaction (Juicy "Press" Animation)
            // Move Face DOWN to cover the lip.
            hitArea.on('pointerdown', () => {
                this.tweens.add({
                    targets: faceGroup,
                    y: lipDepth, // Move down by lip depth
                    duration: 50,
                    ease: 'Quad.easeOut'
                });
                this.handleInput(isYes);
            });

            hitArea.on('pointerup', () => {
                this.tweens.add({
                    targets: faceGroup,
                    y: 0, // Reset to top
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

            // Store references for Spam Logic (Greying out)
            // We store the CONTAINER to tint the whole thing (face+lip+text)
            if (isYes) {
                this.yesBg = hitArea as any; // Interact
                this.yesContainer = container; // For Alpha
                this.yesFace = faceGroup; // For Resetting Y
            } else {
                this.noBg = hitArea as any;
                this.noContainer = container;
                this.noFace = faceGroup;
            }

            return container;
        };

        // Modern Palette: Coral/Rose (#FF6B6B) and Teal/Mint (#4ECDC4)
        // Lips: Darker shades (#E05656, #3EBFA6)
        // Text: High Contrast White
        create3DBtn(width * 0.25, "ไม่ตรง", 0xFF6B6B, 0xE05656, "#FFFFFF", false);
        create3DBtn(width * 0.75, "ตรง", 0x4ECDC4, 0x3EBFA6, "#FFFFFF", true);
    }

    layoutUI() {
        const { width, height } = this.scale;

        // Re-center container - match the createStimulusArea position
        if (this.arrowContainer) this.arrowContainer.setPosition(width / 2, height / 2 - 100);
    }

    // Button Swap Animation (triggers on 5-combo)
    swapButtons() {
        this.buttonsSwapped = !this.buttonsSwapped;
        const { width } = this.scale;

        // Target positions
        const leftPos = width * 0.25;
        const rightPos = width * 0.75;

        // Play swap sound (use existing beep with detune)
        this.soundBeep.play({ detune: -400 });

        // Animate both containers
        this.tweens.add({
            targets: this.noContainer,
            x: this.buttonsSwapped ? rightPos : leftPos,
            duration: 400,
            ease: 'Back.inOut'
        });
        this.tweens.add({
            targets: this.yesContainer,
            x: this.buttonsSwapped ? leftPos : rightPos,
            duration: 400,
            ease: 'Back.inOut'
        });
    }

    drawArrow(dir: string, color: number) {
        this.arrowGraphics.clear();

        // Premium Rounded Arrow - Sleek & Elegant
        this.arrowGraphics.fillStyle(color, 1);
        this.arrowGraphics.lineStyle(10, color, 1); // Reduced stroke slightly for elegance

        // Define points for a single continuous path (Pointing UP)
        // Center (0,0) is visual center

        const tipY = -55;
        const wingY = -5;
        const wingX = 35;
        const stemX = 12;
        const baseY = 50;

        this.arrowGraphics.beginPath();
        // 1. Tip
        this.arrowGraphics.moveTo(0, tipY);
        // 2. Right Wing Tip
        this.arrowGraphics.lineTo(wingX, wingY);
        // 3. Right Stem Axil
        this.arrowGraphics.lineTo(stemX, wingY);
        // 4. Right Stem Base
        this.arrowGraphics.lineTo(stemX, baseY);
        // 5. Left Stem Base
        this.arrowGraphics.lineTo(-stemX, baseY);
        // 6. Left Stem Axil
        this.arrowGraphics.lineTo(-stemX, wingY);
        // 7. Left Wing Tip
        this.arrowGraphics.lineTo(-wingX, wingY);

        this.arrowGraphics.closePath();
        this.arrowGraphics.fillPath();
        this.arrowGraphics.strokePath();

        // Rotation
        let angle = 0;
        switch (dir) {
            case 'UP': angle = 0; break;
            case 'DOWN': angle = 180; break;
            case 'LEFT': angle = 270; break;
            case 'RIGHT': angle = 90; break;
        }
        this.arrowGraphics.rotation = Phaser.Math.DegToRad(angle);
    }

    drawTimerBar(pct: number) {
        this.timerBar.clear();

        const barWidth = 240;
        const barHeight = 12;
        const yPos = 0;

        // Background Track containing
        this.timerBar.fillStyle(0xe5e5e5, 1);
        this.timerBar.fillRoundedRect(-barWidth / 2, 0, barWidth, barHeight, 6);

        // Fill
        // Use new Coral for danger color
        const color = pct < 0.3 ? 0xFF6B6B : 0x0984E3;
        this.timerBar.fillStyle(color, 1);

        const fillWidth = Math.max(0, barWidth * pct);
        this.timerBar.fillRoundedRect(-barWidth / 2, 0, fillWidth, barHeight, 6);

        // Ensure icon is visible when bar is updating
        if (this.timerIcon && !this.timerIcon.visible) {
            this.timerIcon.setVisible(true);
        }
    }

    // --- GAMEPLAY LOGIC ---

    startCountdown() {
        this.isCountdown = true;
        this.isPlaying = false;
        this.countdownValue = 3;

        const { width, height } = this.scale;

        // Ensure partial cleanup
        if (this.arrowContainer) this.arrowContainer.setVisible(false);
        if (this.timerBar) this.timerBar.clear(); // Hide bar
        if (this.timerIcon) this.timerIcon.setVisible(false); // Hide icon

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

        this.currentPhase = 1;
        this.isTutorialMode = false; // Reset
        this.nextCard(true);
    }

    nextCard(resetTimer: boolean = true) {
        const { width, height } = this.scale;

        // 1. Gentle Exit of OLD card (Fade Out + Subtle Scale Down)
        if (this.arrowContainer) {
            const oldContainer = this.arrowContainer;
            this.tweens.add({
                targets: oldContainer,
                alpha: 0,
                scale: 0.95,
                duration: 250,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    oldContainer.destroy();
                }
            });
        }

        // 2. Create NEW card at Center (Invisible/Scaled)
        this.spawnCardContainer(width / 2, height / 2 - 100);
        this.arrowContainer.setAlpha(0);
        this.arrowContainer.setScale(1.05); // Start slightly larger

        // 3. Setup Content on the NEW card
        if (this.currentPhase === 1) {
            this.setupPhase1();
        } else if (this.currentPhase === 2) {
            this.setupPhase2();
        } else {
            this.setupPhase3();
        }

        // 3b. Initialize Drift Velocities (Phase 4+)
        // Enable drift if score is high enough
        this.driftEnabled = (this.score >= this.PHASE_4_THRESHOLD);
        if (this.driftEnabled) {
            // Random direction, consistent speed
            const speed = this.DRIFT_SPEED;
            const randomAngle1 = Math.random() * Math.PI * 2;
            const randomAngle2 = Math.random() * Math.PI * 2;
            this.arrowVelocity = {
                x: Math.cos(randomAngle1) * speed,
                y: Math.sin(randomAngle1) * speed
            };
            this.textVelocity = {
                x: Math.cos(randomAngle2) * speed * 0.8, // Text slightly slower
                y: Math.sin(randomAngle2) * speed * 0.8
            };
        } else {
            this.arrowVelocity = { x: 0, y: 0 };
            this.textVelocity = { x: 0, y: 0 };
        }

        // 4. Gentle Entrance (Fade In + Scale to Normal)
        this.tweens.add({
            targets: this.arrowContainer,
            alpha: 1,
            scale: 1,
            duration: 250,
            ease: 'Quad.easeOut'
        });

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
        // Layout: Text bottom half
        this.labelText.setPosition(0, 80);
        this.labelText.setOrigin(0.5);

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

        // NOT Operator (after 15k points)
        this.isNegated = (this.score >= this.NOT_THRESHOLD && Math.random() < this.NOT_CHANCE);
        if (this.isNegated) {
            this.showNotBadge();
        } else {
            this.hideNotBadge();
        }
    }

    setupPhase2() {
        // Phase 2: Color Match (Text Color vs Text Meaning)
        // Arrow is HIDDEN. Center Text in Circle.
        this.arrowGraphics.setVisible(false);
        this.labelText.setPosition(0, 0); // Center in circle
        this.labelText.setOrigin(0.5);

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

        // NOT Operator (after 15k points)
        this.isNegated = (this.score >= this.NOT_THRESHOLD && Math.random() < this.NOT_CHANCE);
        if (this.isNegated) {
            this.showNotBadge();
        } else {
            this.hideNotBadge();
        }
    }

    setupPhase3() {
        // Phase 3: Combined (Direction Match AND Color Match)
        // Show Arrow and Text.
        // Arrow has Direction and Color.
        // Text has Direction Meaning and Ink Color.
        // Match = ArrowDir == TextMeaning AND ArrowColor == TextInkColor.

        this.arrowGraphics.setVisible(true);
        // Layout: Arrow above, Text below - balanced spacing
        this.arrowGraphics.y = -40; // Reset to default (adjusted for NOT badge)
        this.labelText.setPosition(0, 120); // Closer to arrow for balance
        this.labelText.setOrigin(0.5);

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

        // NOT Operator (after 15k points)
        this.isNegated = (this.score >= this.NOT_THRESHOLD && Math.random() < this.NOT_CHANCE);
        if (this.isNegated) {
            this.showNotBadge();
        } else {
            this.hideNotBadge();
        }
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

                // Show Warning - PERSISTENT
                this.tweens.killTweensOf(this.streakText); // Stop any fades
                this.streakText.setText("อย่ากดรัว!");
                this.streakText.setColor('#D63031');
                this.streakText.setAlpha(1);
                this.streakText.setScale(1);

                // Stop Button Animations (Reset "Pressed" state)
                this.tweens.killTweensOf(this.noFace);
                this.tweens.killTweensOf(this.yesFace);
                this.noFace.y = 0;
                this.yesFace.y = 0;

                // Grey out buttons (Alpha) & Disable Interactivity
                this.noContainer.setAlpha(0.5);
                this.yesContainer.setAlpha(0.5);

                this.noBg.disableInteractive();
                this.yesBg.disableInteractive();

                // Lockout for 3 seconds
                this.time.delayedCall(3000, () => {
                    this.isInputLocked = false;
                    this.inputHistory = []; // Reset history
                    this.streakText.setAlpha(0);

                    // Restore Button Colors & Interactivity
                    this.noContainer.setAlpha(1);
                    this.yesContainer.setAlpha(1);

                    this.noBg.setInteractive();
                    this.yesBg.setInteractive();
                });
                return; // Block this input
            }
        }

        const reactionTime = now - this.cardStartTime;
        this.totalReactionTime += reactionTime;
        this.reactionCount++;
        this.attempts++;

        // NOT Operator: Flip expected answer if negated
        const effectiveMatch = this.isNegated ? !this.isMatch : this.isMatch;
        let isCorrect = (saidMatch === effectiveMatch);

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

            // Button Swap on 5-combo
            if (this.currentStreak > 0 && this.currentStreak % this.SWAP_COMBO_TRIGGER === 0) {
                this.swapButtons();
            }

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
                this.timeLimitPerCard = Math.max(this.minTimeLimit, this.timeLimitPerCard * 0.96);
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
        }).setOrigin(0.5).setDepth(100);

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
        } else if (this.currentPhase === 3 && this.score >= this.PHASE_4_THRESHOLD) {
            this.showPhaseTransition(4);
        }
    }

    showPhaseTransition(nextPhase: number) {
        this.isPlaying = false; // Pause Game
        this.currentPhase = nextPhase;
        this.sound.stopAll();
        this.soundLevelPass.play();

        // 1. Fade OUT Game Elements
        // Include Timer (Bar + Icon)
        const targetsToFade = [this.arrowContainer, this.streakText, this.scoreText];
        if (this.timerBar) targetsToFade.push(this.timerBar as any);
        if (this.timerIcon) targetsToFade.push(this.timerIcon as any);

        this.tweens.add({
            targets: targetsToFade,
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
        } else if (nextPhase === 3) {
            title = "LEVEL 3";
            line1 = "รวมร่าง!";
            line2 = "(ต้องตรงกันทั้งทิศและสี)";
        } else if (nextPhase === 4) {
            title = "LEVEL 4";
            line1 = "เคลื่อนไหว!";
            line2 = "(ตัวอักษรจะลอยไปมา)";
        }

        const container = this.add.container(width / 2, height / 2).setAlpha(1).setDepth(200);

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
        // Don't show the old card! Destroy it.
        if (this.arrowContainer) this.arrowContainer.destroy();

        this.streakText.setAlpha(0); // Should be hidden initially
        this.scoreText.setAlpha(1);

        // Reset Timer Alpha (was faded out during transition)
        if (this.timerBar) this.timerBar.setAlpha(1);
        if (this.timerIcon) this.timerIcon.setAlpha(1);

        // Resume Music
        if (this.soundBgm) this.soundBgm.play();

        this.isPlaying = true;
        this.isTutorialMode = true; // First card of new phase is untimed tutorial
        this.cardStartTime = Date.now(); // Reset timer base just in case

        // Reset Visuals for new phase (important!)
        this.nextCard(true);
    }
}
