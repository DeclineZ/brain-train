import * as Phaser from "phaser";
import { BILLIARDS_LEVELS } from "./levels";
import { EquationGenerator } from "./equationGenerator";
import type { BilliardsLevelConfig, Equation, ComplexEquation, Ball } from "./types";
import type { BilliardsGameStats } from "@/types";
import { calculateStars, getStarHint } from "@/lib/scoring/billiards";

export class BilliardsGameScene extends Phaser.Scene {
    private currentLevelConfig!: BilliardsLevelConfig;
    private equationGenerator!: EquationGenerator;

    // Game State
    private balls: Ball[] = [];
    private currentEquation!: Equation | ComplexEquation;
    private placedBalls: number[] = [];
    private startTime = 0;
    private levelStartTime = 0;
    private totalEquations = 0;
    private correctEquations = 0;
    private wrongEquations = 0;
    private consecutiveErrors = 0;
    private currentErrorRun = 0;
    private repeatedErrors = 0;
    private attempts = 0;
    private isLocked = true;
    private continuedAfterTimeout = false;
    private isPaused = false;
    private completedEquationResults: number[] = []; // Track results of completed equations

    // Timer
    private timerEvent!: Phaser.Time.TimerEvent;
    private customTimerBar!: Phaser.GameObjects.Graphics;
    private lastTimerPct: number = 100;

    // UI Elements
    private messageText!: Phaser.GameObjects.Text;
    private equationContainer!: Phaser.GameObjects.Container;
    private equationBalls: { [key: string]: Phaser.GameObjects.Container } = {};
    private operatorTexts: { [key: string]: string } = {};
    private goalBall!: Phaser.GameObjects.Container;
    private poolTable!: Phaser.GameObjects.Container;
    private shadowBallContainer!: Phaser.GameObjects.Container; // Container for shadow ball progress tracker
    private shadowBalls: Phaser.GameObjects.Container[] = []; // Individual shadow balls

    // Audio
    private bgMusic!: Phaser.Sound.BaseSound;
    private soundBallDrop!: Phaser.Sound.BaseSound;
    private soundBallRattle!: Phaser.Sound.BaseSound;
    private soundSuccess!: Phaser.Sound.BaseSound;
    private soundBallClick!: Phaser.Sound.BaseSound;
    private soundLevelPass!: Phaser.Sound.BaseSound;
    private soundLevelFail!: Phaser.Sound.BaseSound;

    constructor() {
        super({ key: "BilliardsGameScene" });
    }

    init(data: { level: number }) {
        // Get level from registry (set by GameCanvas)
        const level = this.registry.get("level");
        console.log(`[BilliardsGameScene] init called with level:`, {
            dataLevel: data.level,
            registryLevel: this.registry.get("level"),
            finalLevel: level,
        });

        this.currentLevelConfig =
            BILLIARDS_LEVELS[level] || BILLIARDS_LEVELS[1];
        this.equationGenerator = new EquationGenerator(this.currentLevelConfig);

        // Reset game state
        this.resetGameState();
    }

    resetGameState() {
        this.cleanupBalls();
        this.cleanupShadowBalls();

        this.balls = [];
        this.currentEquation = {} as Equation;
        this.placedBalls = [];
        this.totalEquations = 0;
        this.correctEquations = 0;
        this.wrongEquations = 0;
        this.consecutiveErrors = 0;
        this.currentErrorRun = 0;
        this.repeatedErrors = 0;
        this.attempts = 0;
        this.isLocked = true;
        this.continuedAfterTimeout = false;
        this.isPaused = false;
        this.completedEquationResults = [];
        this.shadowBalls = [];
    }

    cleanupBalls() {
        // Properly cleanup all ball containers and their event listeners
        this.balls.forEach((ball) => {
            if (ball && ball.container) {
                // Remove all event listeners before destroying
                ball.container.removeAllListeners();
                ball.container.destroy();
            }
        });
        this.balls = [];
    }

    cleanupShadowBalls() {
        // Properly cleanup all shadow ball containers and their event listeners
        this.shadowBalls.forEach((shadowBall) => {
            if (shadowBall) {
                // Remove all event listeners before destroying
                shadowBall.removeAllListeners();
                shadowBall.destroy();
            }
        });
        this.shadowBalls = [];

        if (this.shadowBallContainer) {
            this.shadowBallContainer.removeAllListeners();
            this.shadowBallContainer.destroy();
            this.shadowBallContainer = null as any;
        }
    }

    preload() {
        // Load pool ball assets (1-10)
        for (let i = 1; i <= 10; i++) {
            this.load.image(
                `ball-${i}`,
                `/assets/images/billiards/ball-${i}.png`
            );
        }
        this.load.image("goal-ball", "/assets/images/billiards/goal-ball.png");

        // Load sounds
        this.load.audio("ball-drop", "/assets/sounds/billiards/ball-drop.mp3");
        this.load.audio(
            "ball-rattle",
            "/assets/sounds/billiards/ball-rattle.mp3"
        );
        this.load.audio("success", "/assets/sounds/billiards/success.mp3");
        this.load.audio("bg-music", "/assets/sounds/billiards/bg-music.mp3");
        this.load.audio("ball-click", "/assets/sounds/billiards/ball-rattle.mp3"); // Use ball-rattle for click
        this.load.audio("level-pass", "/assets/sounds/level-pass.mp3");
        this.load.audio("level-fail", "/assets/sounds/level-fail.mp3");
    }

    create() {
        const { width, height } = this.scale;

        // Create background
        this.createPoolTable();

        // Create UI elements
        this.createUI();

        // Start the game
        this.startLevel();

        // Handle resize
        this.scale.on("resize", () => {
            this.layoutGame();
        });

        // Listen for resume event
        this.game.events.on("resume-game", (data: { penalty: boolean }) => {
            this.resumeGame(data.penalty);
        });

        // Initialize sound effects
        try {
            this.soundBallClick = this.sound.add("ball-click", { volume: 0.5 });
            this.soundBallDrop = this.sound.add("ball-drop", { volume: 0.6 });
            this.soundBallRattle = this.sound.add("ball-rattle", { volume: 0.7 });
            this.soundSuccess = this.sound.add("success", { volume: 0.8 });
            this.soundLevelPass = this.sound.add("level-pass", { volume: 0.8 });
            this.soundLevelFail = this.sound.add("level-fail", { volume: 0.8 });
        } catch (e) {
            console.warn("Sound effects failed to initialize", e);
        }

        // Start background music
        try {
            this.bgMusic = this.sound.add("bg-music", {
                volume: 0.3,
                loop: true,
            });
            this.bgMusic.play();
        } catch (e) {
            console.warn("Background music failed to play", e);
        }
    }

    update() {
        if (
            !this.customTimerBar ||
            !this.customTimerBar.visible ||
            this.isPaused ||
            this.continuedAfterTimeout ||
            this.startTime === 0
        )
            return;

        const limitMs = this.currentLevelConfig.timeLimitSeconds * 1000;
        const elapsed = Date.now() - this.startTime;
        const remainingMs = Math.max(0, limitMs - elapsed);
        const pct = Math.max(0, (remainingMs / limitMs) * 100);

        this.drawTimerBar(pct);
    }

    createPoolTable() {
        const { width, height } = this.scale;

        // Create pool table container
        this.poolTable = this.add.container(width / 2, height / 2);

        // Table dimensions - responsive for phone and desktop
        const tableWidth = width * 0.8;
        const tableHeight = height * 0.7;
        const cornerRadius = Math.min(20, width * 0.03);

        // Create table border (wooden frame)
        const borderWidth = Math.min(15, width * 0.05);
        const borderBg = this.add.graphics();
        borderBg.fillStyle(0x8b4513); // Saddle brown for wooden frame
        borderBg.fillRoundedRect(
            -tableWidth / 2 - borderWidth,
            -tableHeight / 2 - borderWidth,
            tableWidth + borderWidth * 2,
            tableHeight + borderWidth * 2,
            cornerRadius + borderWidth
        );
        this.poolTable.add(borderBg);

        // Create table background (brown felt)
        const tableBg = this.add.graphics();
        tableBg.fillStyle(0x0d5d3d); // Dark green felt color
        tableBg.fillRoundedRect(-tableWidth / 2, -tableHeight / 2, tableWidth, tableHeight, cornerRadius);
        this.poolTable.add(tableBg);

        // Add table pockets (6 pockets - 4 corners + 2 middle)
        const pocketRadius = Math.min(25, width * 0.04);
        const pocketColor = 0x000000; // Black pockets

        // Corner pockets
        const createPocket = (x: number, y: number) => {
            const pocket = this.add.circle(x, y, pocketRadius, pocketColor);
            this.poolTable.add(pocket);
        };

        // Top-left pocket
        createPocket(-tableWidth / 2 + cornerRadius, -tableHeight / 2 + cornerRadius);
        // Top-right pocket
        createPocket(tableWidth / 2 - cornerRadius, -tableHeight / 2 + cornerRadius);
        // Bottom-left pocket
        createPocket(-tableWidth / 2 + cornerRadius, tableHeight / 2 - cornerRadius);
        // Bottom-right pocket
        createPocket(tableWidth / 2 - cornerRadius, tableHeight / 2 - cornerRadius);
        // Middle-left pocket
        createPocket(-tableWidth / 2 + cornerRadius, 0);
        // Middle-right pocket
        createPocket(tableWidth / 2 - cornerRadius, 0);

        // Add table markings (head string and center spot)
        const centerSpot = this.add.circle(0, 0, Math.min(8, width * 0.015), 0xffffff, 0.5);
        this.poolTable.add(centerSpot);
    }

    createUI() {
        const { width, height } = this.scale;

        // Create equation container for visual components (center of pool table)
        this.equationContainer = this.add.container(width / 2, height * 0.5);

        // Goal ball positioned after "=" (in equation area, center of pool table)
        this.goalBall = this.add.container(width / 2, height * 0.5);
        const goalBallRadius = Math.min(35, width * 0.06);
        const goalBallBg = this.add.image(0, 0, "goal-ball");
        goalBallBg.setDisplaySize(goalBallRadius * 2.2, goalBallRadius * 2.2); // Slightly larger for visibility
        
        // Add text overlay for result number
        const goalText = this.add.text(0, 0, "0", {
            fontFamily: "Arial, sans-serif",
            fontSize: `${Math.min(20, width * 0.04)}px`,
            color: "#ffffff",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 2,
        }).setOrigin(0.5);
       
        this.goalBall.add([goalBallBg, goalText]);

        // Message text
        this.messageText = this.add
            .text(0, 0, "", {
                fontFamily: "Sarabun, sans-serif",
                fontSize: `${Math.min(32, width * 0.05)}px`,
                color: "#2B2115",
                stroke: "#FFFFFF",
                strokeThickness: 3,
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setVisible(false);

        // Timer bar
        this.customTimerBar = this.add.graphics();
        this.customTimerBar.setVisible(false);

        // Create shadow ball progress tracker above timer bar
        this.createShadowBallTracker();
    }

    updateGoalBall(result: number) {
        const goalText = this.goalBall.getAt(1) as Phaser.GameObjects.Text;
        goalText.setText(result.toString());

        // Add pulse animation when result updates
        this.tweens.add({
            targets: this.goalBall,
            scale: { from: 1, to: 1.2 },
            duration: 200,
            yoyo: true,
            ease: "Sine.easeInOut",
        });
    }

    createShadowBallTracker() {
        const { width, height } = this.scale;

        // Position above timer bar
        const barW = Math.min(width * 0.8, 400);
        const barH = Math.min(12, height * 0.02);
        const x = (width - barW) / 2;
        const y = height - Math.min(80, height * 0.12); // Above timer bar

        // Create container for shadow balls
        this.shadowBallContainer = this.add.container(width / 2, y);

        // Create shadow balls based on total equations required
        const totalBalls = this.currentLevelConfig.totalEquations;
        const ballSpacing = Math.min(45, width * 0.08);
        const startX = (-(totalBalls - 1) * ballSpacing) / 2;

        for (let i = 0; i < totalBalls; i++) {
            const shadowBall = this.createShadowBall(i);
            shadowBall.setPosition(startX + i * ballSpacing, 0);
            this.shadowBalls.push(shadowBall);
            this.shadowBallContainer.add(shadowBall);
        }

        // Initialize with all balls showing "?" (incomplete)
        this.updateShadowBallDisplay();
    }

    createShadowBall(index: number): Phaser.GameObjects.Container {
        const container = this.add.container(0, 0);
        const { width } = this.scale;

        // Make shadow balls bigger and more prominent
        const ballRadius = Math.min(25, width * 0.05);
        const shadowOffset = ballRadius * 0.1;

        // Shadow
        const shadow = this.add
            .circle(shadowOffset, shadowOffset, ballRadius, 0x000000, 0.3)
            .setOrigin(0.5);

        // Use generated circle for shadow balls (no PNG for unknown values)
        const ball = this.add
            .circle(0, 0, ballRadius, 0xcccccc)
            .setStrokeStyle(2, 0x666666);

        // Text (shows "?" or result number) - overlay on top of ball image
        const text = this.add
            .text(0, 0, "?", {
                fontFamily: "Arial, sans-serif",
                fontSize: `${Math.min(16, width * 0.03)}px`,
                color: "#ffffff",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(0.5);

        container.add([shadow, ball, text]);

        // Set explicit size for proper hit area
        container.setSize(ballRadius * 2, ballRadius * 2);

        // Add interactive with explicit hit area to prevent hitAreaCallback error
        container.setInteractive({
            useHandCursor: true,
            hitArea: new Phaser.Geom.Circle(0, 0, ballRadius),
            hitAreaCallback: Phaser.Geom.Circle.Contains,
        });

        container.on("pointerover", () => {
            this.tweens.add({
                targets: container,
                scale: 1.1,
                duration: 150,
                ease: "Sine.easeOut",
            });
        });

        container.on("pointerout", () => {
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 150,
                ease: "Sine.easeOut",
            });
        });

        return container;
    }

    updateShadowBallDisplay() {
        // Update all shadow balls based on completed equations
        this.shadowBalls.forEach((shadowBall, index) => {
            const text = shadowBall.getAt(2) as Phaser.GameObjects.Text;
            const ball = shadowBall.getAt(1) as Phaser.GameObjects.Arc;

            if (index < this.completedEquationResults.length) {
                // Show completed result - replace with bigger goal-ball.png, no shadow
                const result = this.completedEquationResults[index];

                // Remove existing ball and shadow
                shadowBall.removeAll(true);

                // Add bigger goal-ball.png with result number, no shadow effect
                const { width } = this.scale;
                const ballRadius = Math.min(35, width * 0.08); // Much bigger

                // Goal ball PNG - bigger size
                const goalBall = this.add.image(0, 0, "goal-ball");
                goalBall.setDisplaySize(ballRadius * 2.8, ballRadius * 2.8); // Much bigger

                // Result number text (bigger, clean, no background)
                const resultText = this.add
                    .text(0, 0, result.toString(), {
                        fontFamily: "Arial, sans-serif",
                        fontSize: `${Math.min(24, width * 0.05)}px`, // Much bigger text
                        color: "#ffffff",
                        fontStyle: "bold",
                    })
                    .setOrigin(0.5);

                shadowBall.add([goalBall, resultText]); // No shadow circle

                // Add completion animation
                this.tweens.add({
                    targets: shadowBall,
                    scale: { from: 0.8, to: 1 },
                    duration: 300,
                    ease: "Back.easeOut",
                });
            } else {
                // Show incomplete - keep existing gray circle
                text.setText("?");
                text.setColor("#ffffff");
                ball.setFillStyle(0xcccccc); // Gray fill for incomplete
            }
        });
    }

    trackCompletedEquation(result: number) {
        this.completedEquationResults.push(result);
        this.updateShadowBallDisplay();
    }

    // Create a miniature pool ball for equation display
    private createEquationBall(
        value: number | null,
        position: string
    ): Phaser.GameObjects.Container {
        const container = this.add.container(0, 0);
        const { width } = this.scale;

        // Responsive sizing
        const ballRadius = Math.min(30, width * 0.05);
        const fontSize = Math.min(22, width * 0.035);
        const shadowOffset = ballRadius * 0.1;

        if (value === null) {
            // Create empty slot placeholder
            const shadow = this.add
                .circle(shadowOffset, shadowOffset, ballRadius, 0x000000, 0.2)
                .setOrigin(0.5);
            const ball = this.add
                .circle(0, 0, ballRadius, 0xe8e8e8)
                .setStrokeStyle(3, 0xcccccc);
            const placeholder = this.add
                .text(0, 0, "?", {
                    fontFamily: "Arial, sans-serif",
                    fontSize: `${Math.min(24, width * 0.04)}px`,
                    color: "#999999",
                    fontStyle: "bold",
                })
                .setOrigin(0.5);
            container.add([shadow, ball, placeholder]);

            // Add subtle idle animation for empty slots
            this.tweens.add({
                targets: container,
                scale: { from: 1, to: 1.05 },
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
            });
        } else {
            // Conditional ball creation: PNG only for known values (1-9), generated circle for unknown
            let ball;
            if (value >= 1 && value <= 10) {
                // Use PNG with bigger display size for known values - NO text overlay since PNG has numbers
                const shadow = this.add
                    .circle(shadowOffset, shadowOffset, ballRadius, 0x000000, 0.4)
                    .setOrigin(0.5);
                ball = this.add.image(0, 0, `ball-${value}`);
                ball.setDisplaySize(ballRadius * 2.5, ballRadius * 2.5); // 25% bigger
                container.add([shadow, ball]);
            } else {
                // Use generated circle for unknown values
                const shadow = this.add
                    .circle(shadowOffset, shadowOffset, ballRadius, 0x000000, 0.4)
                    .setOrigin(0.5);
                ball = this.add
                    .circle(0, 0, ballRadius, 0xffffff)
                    .setStrokeStyle(3, 0x000000);
                const text = this.add
                    .text(0, 0, value.toString(), {
                        fontFamily: "Arial, sans-serif",
                        fontSize: `${fontSize}px`,
                        color: "#000000",
                        fontStyle: "bold",
                    })
                    .setOrigin(0.5);
                container.add([shadow, ball, text]);
            }

            // Add entrance animation
            container.setScale(0);
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 300,
                ease: "Back.easeOut",
            });
        }

        // Store reference
        this.equationBalls[position] = container;
        return container;
    }

    // Create operator text (+ or -) - Much bigger for elderly play
    private createOperatorText(
        operator: string,
        position: string
    ): Phaser.GameObjects.Text {
        const { width } = this.scale;
        const fontSize = Math.min(64, width * 0.12); // Much bigger for elderly play

        const text = this.add
            .text(0, 0, operator, {
                fontFamily: "Sarabun, sans-serif",
                fontSize: `${fontSize}px`,
                color: "#2B2115",
                stroke: "#FFFFFF",
                strokeThickness: 3,
                fontStyle: "bold",
            })
            .setOrigin(0.5);

        this.operatorTexts[position] = operator;
        return text;
    }

    startLevel() {
        this.levelStartTime = Date.now();
        this.generateNewEquation();
        this.isLocked = false;
        this.startTime = Date.now();
        this.startTimer();
    }

    generateNewEquation() {
        this.currentEquation =
            this.equationGenerator.generateFillInTheBlanksEquation();

        // Update goal ball with target number using separate function
        this.updateGoalBall(this.currentEquation.result);

        // Update equation display with visual pool balls

        // Create pool balls
        this.createBalls();
        this.updateEquationDisplay();
    }

    createBalls(
        exclusionRadius: number = 180,
        padding: number = 5,
        maxAttempts: number = 50
    ) {
        // Clear existing balls using proper cleanup
        this.cleanupBalls();

        const requiredNumbers =
            this.equationGenerator.getRequiredBallsForEquation(
                this.currentEquation
            );
        const { width, height } = this.scale;

        const centerX = width / 2;
        const centerY = height / 2;

        // Calculate pool table boundaries to ensure balls spawn inside
        const tableWidth = width * 0.8;
        const tableHeight = height * 0.7;
        const tableLeft = centerX - tableWidth / 2;
        const tableRight = centerX + tableWidth / 2;
        const tableTop = centerY - tableHeight / 2;
        const tableBottom = centerY + tableHeight / 2;

        // We'll store placed positions + radii to prevent overlap
        const placed: { x: number; y: number; r: number }[] = [];

        const clamp = (v: number, min: number, max: number) =>
            Math.max(min, Math.min(max, v));

        const isOverlapping = (x: number, y: number, r: number) => {
            for (const p of placed) {
                const dx = x - p.x;
                const dy = y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < r + p.r + padding) return true;
            }
            return false;
        };

        const pushOutsideCenterCircle = (x: number, y: number, r: number) => {
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.hypot(dx, dy);

            // keep ball fully outside exclusion circle
            const minDist = exclusionRadius + r;

            if (dist < minDist) {
                const angle =
                    dist === 0
                        ? Math.random() * Math.PI * 2
                        : Math.atan2(dy, dx);
                const extra = 6 + Math.random() * 14; // small jitter outside circle
                const rr = minDist + extra;
                x = centerX + Math.cos(angle) * rr;
                y = centerY + Math.sin(angle) * rr;
            }
            return { x, y };
        };

        // Create a grid of candidate positions within pool table bounds
        const cols = 3;
        const rows = Math.ceil(requiredNumbers.length / cols);

        // Use pool table margins instead of screen margins
        const marginX = Math.min(50, width * 0.05);
        const marginY = Math.min(50, height * 0.05);

        const cellWidth = (tableWidth - marginX * 2) / cols;
        const cellHeight = (tableHeight - marginY * 2) / rows;

        const candidates: { x: number; y: number }[] = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (candidates.length >= requiredNumbers.length) break;

                const x =
                    tableLeft + marginX +
                    col * cellWidth +
                    cellWidth / 2 +
                    (Math.random() - 0.5) * cellWidth * 0.35;

                const y =
                    tableTop + marginY +
                    row * cellHeight +
                    cellHeight / 2 +
                    (Math.random() - 0.5) * cellHeight * 0.35;

                candidates.push({ x, y });
            }
        }

        // Shuffle candidates
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        const nextCandidate = () => {
            // Use grid candidates first, then fallback to random within table bounds
            if (candidates.length) return candidates.pop()!;
            return {
                x: tableLeft + marginX + Math.random() * (tableWidth - marginX * 2),
                y: tableTop + marginY + Math.random() * (tableHeight - marginY * 2),
            };
        };

        // Create and place balls with overlap-avoidance
        requiredNumbers.forEach((num) => {
            const ball = this.createBall(num);

            // Determine this ball's radius from bounds (fallback if something is missing)
            let r = Math.min(40, width * 0.08);
            if (ball.container) {
                const b = ball.container.getBounds();
                r = Math.max(b.width, b.height) / 2;
                if (!Number.isFinite(r) || r <= 0)
                    r = Math.min(40, width * 0.08);
            }

            // Use table boundaries for clamping, not screen boundaries
            const ballMarginX = r + marginX;
            const ballMarginY = r + marginY;

            let placedPos: { x: number; y: number } | null = null;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                // Start from a candidate (grid-ish), then add small jitter on retries
                const base = nextCandidate();

                let x =
                    base.x +
                    (Math.random() - 0.5) * 18 * Math.min(1, attempt / 10);
                let y =
                    base.y +
                    (Math.random() - 0.5) * 18 * Math.min(1, attempt / 10);

                // Keep within pool table bounds (not screen bounds)
                x = clamp(x, tableLeft + ballMarginX, tableRight - ballMarginX);
                y = clamp(y, tableTop + ballMarginY, tableBottom - ballMarginY);

                // Enforce center exclusion circle (ball fully outside)
                const pushed = pushOutsideCenterCircle(x, y, r);
                x = clamp(pushed.x, tableLeft + ballMarginX, tableRight - ballMarginX);
                y = clamp(pushed.y, tableTop + ballMarginY, tableBottom - ballMarginY);

                // Check overlaps
                if (!isOverlapping(x, y, r)) {
                    placedPos = { x, y };
                    break;
                }
            }

            // If we somehow failed, place it anyway at a safe spot within table bounds (last resort)
            if (!placedPos) {
                let x = clamp(
                    centerX + (Math.random() - 0.5) * (tableWidth * 0.7),
                    tableLeft + ballMarginX,
                    tableRight - ballMarginX
                );
                let y = clamp(
                    centerY + (Math.random() - 0.5) * (tableHeight * 0.7),
                    tableTop + ballMarginY,
                    tableBottom - ballMarginY
                );
                const pushed = pushOutsideCenterCircle(x, y, r);
                placedPos = {
                    x: clamp(pushed.x, tableLeft + ballMarginX, tableRight - ballMarginX),
                    y: clamp(pushed.y, tableTop + ballMarginY, tableBottom - ballMarginY),
                };
            }

            if (ball.container && placedPos) {
                ball.container.setPosition(placedPos.x, placedPos.y);
                ball.x = placedPos.x;
                ball.y = placedPos.y;
                ball.originalX = placedPos.x;
                ball.originalY = placedPos.y;
            }

            placed.push({ x: placedPos.x, y: placedPos.y, r });
            this.balls.push(ball);
        });
    }

    createBall(value: number): Ball {
        const container = this.add.container(0, 0);
        const { width } = this.scale;

        // Responsive sizing - Much bigger for elderly play
        const ballRadius = Math.min(35, width * 0.08); // Much bigger
        const fontSize = Math.min(22, width * 0.04); // Much bigger text
        const shadowOffset = ballRadius * 0.12;

        // Conditional ball creation: PNG only for known values (1-9), generated circle for unknown
        let ball;
        if (value >= 1 && value <= 10) {
            // Use PNG with bigger display size for known values
            ball = this.add.image(0, 0, `ball-${value}`);
            ball.setDisplaySize(ballRadius * 2.5, ballRadius * 2.5); // 25% bigger

            container.add([ball]);
        } else {
            // Use generated circle for unknown values
            ball = this.add
                .circle(0, 0, ballRadius, 0xffffff)
                .setStrokeStyle(2, 0x000000);
            // Ball shadow
            const shadow = this.add
                .circle(shadowOffset, shadowOffset, ballRadius, 0x000000, 0.3)
                .setOrigin(0.5);
            // Ball number (overlay on top of ball image for better visibility)
            const text = this.add
                .text(0, 0, value.toString(), {
                    fontFamily: "Arial, sans-serif",
                    fontSize: `${fontSize}px`,
                    color: "#ffffff", // White text for better contrast on ball image
                    fontStyle: "bold",
                    stroke: "#000000",
                    strokeThickness: 1,
                })
                .setOrigin(0.5);
            container.add([shadow, ball, text]);
        }

        container.setSize(ballRadius * 2, ballRadius * 2);

        // Make container itself interactive with sound effects
        container.setInteractive({ useHandCursor: true });

        // Add hover effect (no sound)
        container.on("pointerover", () => {
            this.tweens.add({
                targets: container,
                scale: 1.05,
                duration: 150,
                ease: "Sine.easeOut",
            });
        });

        container.on("pointerout", () => {
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 150,
                ease: "Sine.easeOut",
            });
        });

        container.on("pointerdown", () => {
            if (this.soundBallClick) {
                this.soundBallClick.play();
            }
            this.handleBallClick(value);
        });

        return {
            id: value,
            value,
            x: 0,
            y: 0,
            originalX: 0, // Store original position
            originalY: 0, // Store original position
            isDragging: false,
            isPlaced: false,
            container,
        };
    }

    handleBallClick(value: number) {
        if (this.isLocked) return;

        // Check if this is a complex equation
        const isComplex = this.equationGenerator.isComplexEquation(this.currentEquation);
        const maxBalls = isComplex ? 
            (this.currentEquation as ComplexEquation).operators.length + 1 : 2;

        // Check if we have empty slots
        if (this.placedBalls.length >= maxBalls) return;

        // Place ball
        this.placedBalls.push(value);
        this.updateEquationDisplay();

        // Play drop sound when ball is placed
        if (this.soundBallDrop) {
            this.soundBallDrop.play();
        }

        // Animate ball to blank position
        this.animateBallToBlank(value, this.placedBalls.length - 1);

        // Remove ball from available balls
        const ballIndex = this.balls.findIndex((b) => b.value === value);
        if (ballIndex !== -1) {
            const ball = this.balls[ballIndex];
            if (ball && ball.container) {
                ball.container.setVisible(false);
                ball.isPlaced = true;
            }
        }

        // Check if equation is complete
        if (this.placedBalls.length === maxBalls) {
            this.checkAnswer();
        }
    }

    updateEquationDisplay() {
        const { width, height } = this.scale;

        // Clear existing equation display
        this.equationContainer.removeAll(true);
        this.equationBalls = {};
        this.operatorTexts = {};

        // Check if this is a complex equation
        const isComplex = this.equationGenerator.isComplexEquation(this.currentEquation);

        if (isComplex) {
            this.updateComplexEquationDisplay();
        } else {
            this.updateSimpleEquationDisplay();
        }
    }

    private updateSimpleEquationDisplay() {
        const equation = this.currentEquation as any; // Use any for backward compatibility
        const { width } = this.scale;

        // Calculate responsive spacing based on screen width (increased padding)
        const baseSpacing = Math.min(140, width * 0.15);
        const startX = -baseSpacing * 1.5; // Center the equation

        // Get operator with backward compatibility
        const operator = equation.operator || equation.leftOperand1 ? '+' : equation.leftOperand;

        // Create first ball (placed or empty)
        const firstValue =
            this.placedBalls[0] !== undefined ? this.placedBalls[0] : null;
        const firstBall = this.createEquationBall(firstValue, "first");
        firstBall.setPosition(startX, 0);

        // Create operator text
        const operatorText = this.createOperatorText(operator, "operator");
        operatorText.setPosition(startX + baseSpacing, 0);

        // Create second ball (placed or empty)
        const secondValue =
            this.placedBalls[1] !== undefined ? this.placedBalls[1] : null;
        const secondBall = this.createEquationBall(secondValue, "second");
        secondBall.setPosition(startX + baseSpacing * 2, 0);

        // Create equals sign
        const equalsText = this.createOperatorText("=", "equals");
        equalsText.setPosition(startX + baseSpacing * 3, 0);

        // Add all elements to equation container
        this.equationContainer.add([
            firstBall,
            operatorText,
            secondBall,
            equalsText,
        ]);

        // Position gold ball at result location
        this.positionGoldBallAtResult(baseSpacing * 2.5);

        // Animate entrance
        this.equationContainer.setAlpha(0);
        this.tweens.add({
            targets: this.equationContainer,
            alpha: 1,
            duration: 300,
            ease: "Linear",
        });
    }

    private updateComplexEquationDisplay() {
        const equation = this.currentEquation as ComplexEquation;
        const { width } = this.scale;

        // Show first 3 operands with operators for complex equations
        const maxDisplayOperands = Math.min(3, equation.operands.length);
        const baseSpacing = Math.min(80, width * 0.10); // Increased spacing for complex equations

        const totalWidth = baseSpacing * (maxDisplayOperands * 2);
        const startX = -totalWidth / 2;

        let currentX = startX;

        // Create equation elements without parentheses (following proper order of operations)
        for (let i = 0; i < maxDisplayOperands; i++) {
            // Create ball for operand
            const ballValue = i < this.placedBalls.length ? this.placedBalls[i] : null;
            const ball = this.createEquationBall(ballValue, `operand-${i}`);
            ball.setPosition(currentX, 0);
            this.equationContainer.add(ball);

            currentX += baseSpacing;

            // Add operator (except after last operand)
            if (i < maxDisplayOperands - 1 && i < equation.operators.length) {
                // Convert operator to proper display symbol
                let displayOp: string = equation.operators[i];
                if (equation.operators[i] === '*') displayOp = '×';
                if (equation.operators[i] === '/') displayOp = '÷';

                const operatorText = this.createOperatorText(displayOp, `operator-${i}`);
                operatorText.setPosition(currentX, 0);
                this.equationContainer.add(operatorText);
                currentX += baseSpacing;
            }
        }

        // Add equals sign
        const equalsText = this.createOperatorText("=", "equals");
        equalsText.setPosition(currentX, 0);
        this.equationContainer.add(equalsText);

        // Position gold ball at result location
        this.positionGoldBallAtResult(currentX + baseSpacing);

        // Animate entrance
        this.equationContainer.setAlpha(0);
        this.tweens.add({
            targets: this.equationContainer,
            alpha: 1,
            duration: 300,
            ease: "Linear",
        });
    }

    positionGoldBallAtResult(equalsX: number) {
        const { width, height } = this.scale;

        // Position gold ball at the result location (after equals)
        const equationX = width / 2;
        this.goalBall.setPosition(equationX + equalsX, height * 0.5);

        // Add pulsing animation to goal ball
        this.tweens.add({
            targets: this.goalBall,
            scale: { from: 1, to: 1.1 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
        });
    }

    checkAnswer() {
        this.isLocked = true;
        this.attempts++;

        // Check if this is a complex equation
        const isComplex = this.equationGenerator.isComplexEquation(this.currentEquation);
        let isCorrect: boolean;

        if (isComplex) {
            const complexEquation = this.currentEquation as ComplexEquation;
            // For complex equations, validate using the equation generator
            isCorrect = this.equationGenerator.validateEquation(complexEquation, this.placedBalls);
        } else {
            const simpleEquation = this.currentEquation as any; // Use any for backward compatibility
            // For simple equations, use the original logic
            const leftOperand = simpleEquation.leftOperand || simpleEquation.leftOperand1;
            const rightOperand = simpleEquation.rightOperand || simpleEquation.leftOperand2;
            const userAnswer = this.placedBalls[0] + this.placedBalls[1];
            isCorrect = userAnswer === simpleEquation.result;
        }

        if (isCorrect) {
            this.handleCorrectAnswer();
        } else {
            this.handleWrongAnswer();
        }
    }

    handleCorrectAnswer() {
        this.correctEquations++;
        this.totalEquations++;
        this.currentErrorRun = 0;
        if (this.soundBallDrop) {
            this.soundBallDrop.play();
        }

        // Track completed equation result for shadow ball display
        this.trackCompletedEquation(this.currentEquation.result);

        // Add success animation to equation balls
        Object.values(this.equationBalls).forEach((ball) => {
            this.tweens.add({
                targets: ball,
                scale: 1.2,
                duration: 200,
                yoyo: true,
                ease: "Back.easeOut",
            });
        });

        this.time.delayedCall(1500, () => {
            this.nextEquation();
        });
    }

    handleWrongAnswer() {
        this.wrongEquations++;
        this.totalEquations++;
        this.currentErrorRun++;
        if (this.currentErrorRun > this.consecutiveErrors) {
            this.consecutiveErrors = this.currentErrorRun;
        }
        this.repeatedErrors++;
        if (this.soundBallRattle) {
            this.soundBallRattle.play();
        }

        // Add shake animation to indicate error
        this.equationContainer.scene.tweens.add({
            targets: this.equationContainer,
            x: "+=10",
            duration: 50,
            yoyo: true,
            repeat: 5,
            ease: "Power2.easeInOut",
        });

        this.time.delayedCall(1500, () => {
            this.resetPlacedBalls();
        });
    }

    animateBallToBlank(value: number, blankIndex: number) {
        const { width, height } = this.scale;

        // Find the ball that was clicked
        const ballIndex = this.balls.findIndex((b) => b.value === value);
        if (ballIndex === -1) return;

        const ball = this.balls[ballIndex];
        if (!ball || !ball.container) return;

        // Calculate target position in equation
        const equationX = width / 2;
        const isComplex = this.equationGenerator.isComplexEquation(this.currentEquation);
        
        let baseSpacing: number;
        let targetX: number;
        
        if (isComplex) {
            // For complex equations, use smaller spacing
            baseSpacing = Math.min(60, width * 0.06);
            const startX = -baseSpacing * 2; // Adjust for complex equation layout
            targetX = equationX + startX + (blankIndex * baseSpacing * 2);
        } else {
            // For simple equations
            baseSpacing = Math.min(120, width * 0.08);
            const startX = -baseSpacing * 1.5;
            targetX = equationX + (blankIndex === 0 ? startX : startX + baseSpacing * 2);
        }
        
        const targetY = height * 0.5;

        // Animate ball to blank position
        this.tweens.add({
            targets: ball.container,
            x: targetX,
            y: targetY,
            scale: 1.2, // Slightly larger when in equation
            duration: 400,
            ease: "Back.easeOut",
            onComplete: () => {
                // Add bounce effect
                this.tweens.add({
                    targets: ball.container,
                    scale: 1.2,
                    duration: 200,
                    ease: "Bounce.easeOut",
                });
            },
        });
    }

    resetPlacedBalls() {
        // Reset placed balls
        this.placedBalls = [];

        // Make balls visible again and animate back to original positions
        this.balls.forEach((ball) => {
            if (ball.isPlaced && ball.container) {
                ball.container.setVisible(true);
                ball.isPlaced = false;

                // Animate ball back to original position
                this.tweens.add({
                    targets: ball.container,
                    x: ball.originalX,
                    y: ball.originalY,
                    scale: 1,
                    duration: 600,
                    ease: "Back.easeOut",
                });
            }
        });

        this.updateEquationDisplay();
        this.isLocked = false;
    }

    nextEquation() {
        // Check if level is complete using configurable total equations
        console.log(
            `nextEquation: totalEquations=${this.totalEquations}, correctEquations=${this.correctEquations}, required=${this.currentLevelConfig.totalEquations}`
        );

        // Reset placed balls for next equation
        this.placedBalls = [];
        this.updateEquationDisplay();

        if (this.totalEquations >= this.currentLevelConfig.totalEquations) {
            console.log("Level complete, ending level");
            this.endLevel();
        } else {
            console.log("Generating next equation");
            this.generateNewEquation();
            this.isLocked = false;
        }
    }

    startTimer() {
        if (this.continuedAfterTimeout) return;

        this.customTimerBar.setVisible(true);
        this.drawTimerBar(100);

        this.timerEvent = this.time.addEvent({
            delay: 100,
            callback: () => {
                if (this.isPaused) return;

                const elapsed = Date.now() - this.startTime;
                const limitMs = this.currentLevelConfig.timeLimitSeconds * 1000;
                const remainingMs = Math.max(0, limitMs - elapsed);
                const pct = Math.max(0, (remainingMs / limitMs) * 100);
                this.lastTimerPct = pct;

                this.game.events.emit("timer-update", {
                    remaining: Math.ceil(remainingMs / 1000),
                    total: this.currentLevelConfig.timeLimitSeconds,
                });
            },
            loop: true,
        });
    }

    drawTimerBar(pct: number) {
        if (!this.customTimerBar) return;
        this.customTimerBar.clear();

        const { width, height } = this.scale;
        const barW = Math.min(width * 0.8, 400);
        const barH = Math.min(12, height * 0.02);
        const x = (width - barW) / 2;
        const y = height - Math.min(50, height * 0.08);

        // Background
        this.customTimerBar.fillStyle(0x8b4513, 0.2);
        this.customTimerBar.fillRoundedRect(x, y, barW, barH, 6);

        // Fill
        const isWarning = pct < 25;
        const color = isWarning ? 0xff4444 : 0x76d13d;

        let alpha = 1;
        if (isWarning) {
            alpha = 0.65 + 0.35 * Math.sin(this.time.now / 150);
        }

        this.customTimerBar.fillStyle(color, alpha);
        if (pct > 0) {
            this.customTimerBar.fillRoundedRect(
                x,
                y,
                barW * (pct / 100),
                barH,
                6
            );
        }
    }

    endLevel() {
        this.input.enabled = false;
        if (this.timerEvent) this.timerEvent.remove();
        if (this.customTimerBar) {
            this.customTimerBar.setVisible(false);
        }

        const endTime = Date.now();
        const totalTime = endTime - this.levelStartTime;

        const stars = calculateStars(
            totalTime,
            this.correctEquations,
            this.totalEquations,
            this.currentLevelConfig.starRequirements.threeStars,
            this.continuedAfterTimeout
        );

        const starHint = getStarHint(
            totalTime,
            this.correctEquations,
            this.totalEquations,
            this.currentLevelConfig.starRequirements.threeStars,
            this.continuedAfterTimeout
        );

        // Add comprehensive logging for debugging
        console.log("[BilliardsGameScene] endLevel called", {
            level: this.currentLevelConfig.level,
            stars,
            totalTime,
            correctEquations: this.correctEquations,
            totalEquations: this.totalEquations,
            continuedAfterTimeout: this.continuedAfterTimeout,
        });

        const onGameOver = this.registry.get("onGameOver");
        console.log(
            "[BilliardsGameScene] onGameOver callback from registry:",
            !!onGameOver
        );

        if (onGameOver) {
            const gameStats: BilliardsGameStats = {
                levelPlayed: this.currentLevelConfig.level,
                difficultyMultiplier:
                    this.currentLevelConfig.difficultyMultiplier,
                totalEquations: this.totalEquations,
                correctEquations: this.correctEquations,
                wrongEquations: this.wrongEquations,
                totalTimeMs: totalTime,
                parTimeMs:
                    this.currentLevelConfig.starRequirements.threeStars * 1000,
                consecutiveErrors: this.consecutiveErrors,
                repeatedErrors: this.repeatedErrors,
                attempts: this.attempts,
                continuedAfterTimeout: this.continuedAfterTimeout,
            };

            // Create the final data object with additional properties for compatibility
            const finalData = {
                success: true,
                stars,
                starHint,
                ...gameStats,
                userTimeMs: totalTime, // Add for compatibility with server expectations
                level: this.currentLevelConfig.level, // Add for compatibility with server expectations
            };

            console.log(
                "[BilliardsGameScene] Calling onGameOver with final data:",
                finalData
            );

            try {
                onGameOver(finalData);
                console.log(
                    "[BilliardsGameScene] onGameOver callback executed successfully"
                );
            } catch (error) {
                console.error(
                    "[BilliardsGameScene] Error in onGameOver callback:",
                    error
                );
            }
        } else {
            console.error(
                "[BilliardsGameScene] CRITICAL: onGameOver callback not found in registry!"
            );
            // Try to emit event as fallback
            this.game.events.emit("game-over", {
                level: this.currentLevelConfig.level,
                stars,
                success: true,
                error: "Registry callback not found",
            });
        }

        // Play appropriate end game sound effect based on star rating
        if (stars >= 1) {
            // Play level-pass sound for successful completion (1+ stars)
            if (this.soundLevelPass) {
                this.soundLevelPass.play();
            }
        } else {
            // Play level-fail sound for failed completion (0 stars)
            if (this.soundLevelFail) {
                this.soundLevelFail.play();
            }
        }

        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.pause();
        }
    }

    resumeGame(applyPenalty: boolean) {
        this.isPaused = false;
        this.input.enabled = true;

        if (applyPenalty) {
            this.continuedAfterTimeout = true;

            // Remove visual timer
            if (this.customTimerBar) {
                this.customTimerBar.setVisible(false);
            }

            // Stop timer event
            if (this.timerEvent) {
                this.timerEvent.remove();
            }

            // Emit safe timer update
            this.game.events.emit("timer-update", {
                remaining: this.currentLevelConfig.timeLimitSeconds,
                total: this.currentLevelConfig.timeLimitSeconds,
            });
        }
    }

    layoutGame() {
        const { width, height } = this.scale;

        // Reposition pool table
        if (this.poolTable) {
            this.poolTable.setPosition(width / 2, height / 2);
        }

        // Reposition equation container (center of pool table)
        if (this.equationContainer) {
            this.equationContainer.setPosition(width / 2, height * 0.5);
        }

        if (this.goalBall) {
            this.goalBall.setPosition(width / 2, height * 0.5);
        }

        if (this.messageText) {
            this.messageText.setPosition(width / 2, height / 2);
        }

        // Reposition shadow ball tracker above timer bar
        if (this.shadowBallContainer) {
            const y = height - Math.min(80, height * 0.12);
            this.shadowBallContainer.setPosition(width / 2, y);
        }

        // Redraw timer bar if visible
        if (this.customTimerBar && this.customTimerBar.visible) {
            this.drawTimerBar(this.lastTimerPct);
        }
    }
}
