import * as Phaser from "phaser";
import type { Equation, ComplexEquation, Ball } from "./types";

/**
 * Tutorial Scene - Based on GameScene architecture for robust performance
 * Optimized for learning with guided tutorial steps and no timer pressure
 */
export class TutorialScene extends Phaser.Scene {
    // Tutorial State
    private tutorialStep = 0;
    private balls: Ball[] = [];
    private currentEquation!: Equation | ComplexEquation;
    private placedBalls: number[] = [];
    private isLocked = true;
    private completedEquationResults: number[] = []; // Track results of completed equations

    // Tutorial Equations (fixed for consistent learning experience)
    private tutorialEquations: (Equation | ComplexEquation)[] = [
        {
            type: 'simple',
            leftOperand: 2,
            rightOperand: 3,
            operator: '+',
            result: 5,
            displayText: "2 + 3 = _",
            difficulty: 1,
            // Legacy compatibility
            leftOperand1: 2,
            leftOperand2: 3
        },
        {
            type: 'complex',
            operands: [2, 3, 1],
            operators: ['*','-'],
            result: 5,
            displayText: "2 × 3 - 1 = _",
            difficulty: 2
        }
    ];

    // UI Elements
    private messageText!: Phaser.GameObjects.Text;
    private equationContainer!: Phaser.GameObjects.Container;
    private equationBalls: { [key: string]: Phaser.GameObjects.Container } = {};
    private operatorTexts: { [key: string]: string } = {};
    private goalBall!: Phaser.GameObjects.Container;
    private poolTable!: Phaser.GameObjects.Container;
    private shadowBallContainer!: Phaser.GameObjects.Container;
    private shadowBalls: Phaser.GameObjects.Container[] = [];

    // Visual hints
    private currentHighlightTween: Phaser.Tweens.Tween | null = null;

    // Audio
    private bgMusic!: Phaser.Sound.BaseSound;
    private soundBallDrop!: Phaser.Sound.BaseSound;
    private soundBallRattle!: Phaser.Sound.BaseSound;
    private soundSuccess!: Phaser.Sound.BaseSound;
    private soundBallClick!: Phaser.Sound.BaseSound;

    constructor() {
        super({ key: "TutorialScene" });
    }

    init() {
        // Reset tutorial state
        this.resetTutorialState();
    }

    resetTutorialState() {
        this.cleanupBalls();
        this.cleanupShadowBalls();

        this.balls = [];
        this.currentEquation = {} as Equation;
        this.placedBalls = [];
        this.tutorialStep = 0;
        this.isLocked = true;
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
    }

    create() {
        const { width, height } = this.scale;

        // Create background
        this.createPoolTable();

        // Create UI elements
        this.createUI();

        // Start tutorial
        this.startTutorial();

        // Handle resize
        this.scale.on("resize", () => {
            this.layoutGame();
        });

        // Initialize sound effects
        try {
            this.soundBallClick = this.sound.add("ball-click", { volume: 0.5 });
            this.soundBallDrop = this.sound.add("ball-drop", { volume: 0.6 });
            this.soundBallRattle = this.sound.add("ball-rattle", { volume: 0.7 });
            this.soundSuccess = this.sound.add("success", { volume: 0.8 });
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
                fontSize: `${Math.min(24, width * 0.045)}px`,
                color: "#2B2115",
                stroke: "#FFFFFF",
                strokeThickness: 3,
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setVisible(false);

        // Create shadow ball progress tracker
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

        // Position above bottom of screen
        const totalBalls = 2; // Tutorial always has 2 steps
        const ballSpacing = Math.min(45, width * 0.08);
        const x = width / 2;
        const y = height - Math.min(80, height * 0.12);

        // Create container for shadow balls
        this.shadowBallContainer = this.add.container(x, y);
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

    // Create operator text (+, -, ×, ÷, =) - Tutorial sized
    private createOperatorText(
        operator: string,
        position: string
    ): Phaser.GameObjects.Text {
        const { width } = this.scale;
        const fontSize = Math.min(48, width * 0.09); // Tutorial sized

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

    startTutorial() {
        this.tutorialStep = 0;
        this.showTutorialStep();
    }

    showTutorialStep() {
        const { width, height } = this.scale;

        // Clear existing elements using proper cleanup
        this.cleanupBalls();
        
        this.placedBalls = [];
        this.equationContainer.removeAll(true);
        this.equationBalls = {};
        this.operatorTexts = {};

        // Get current equation
        this.currentEquation = this.tutorialEquations[this.tutorialStep];

        // Update goal ball with target number
        this.updateGoalBall(this.currentEquation.result);

        // Update message based on step
        this.updateTutorialMessage(width, height);

        // Update equation display
        this.updateEquationDisplay();

        // Create balls for this equation
        this.createTutorialBalls();

        // Show hints for specific steps
        this.showStepHints();

        // Emit event to show next button
        this.game.events.emit('tutorial-show-next-btn', true);

        this.isLocked = false;
    }

    updateTutorialMessage(width: number, height: number): void {
        let message = "";
        
        if (this.tutorialStep === 0) {
            message = "ยินดีต้อนรับ! ลากบอลหมายเลข 2 และ 3";
        } else if (this.tutorialStep === 1) {
            // Dynamic messages for step 2 based on progress
            const nextNeededBall = this.getNextNeededBall();
            if (nextNeededBall === 2) {
                message = "คลิกบอลหมายเลข 2 ก่อน";
            } else if (nextNeededBall === 3) {
                message = "ดีมาก! ตอนนี้คลิกบอลหมายเลข 3";
            } else if (nextNeededBall === 1) {
                message = "สุดท้ายคลิกบอลหมายเลข 1";
            } else {
                message = "ดีมาก! ลองทำสมการนี้: 2 × 3 - 1 = ?";
            }
        }

        this.messageText.setText(message);
        this.messageText.setVisible(true);
        this.messageText.setPosition(width / 2, height * 0.15);
    }

    createTutorialBalls(
        exclusionRadius: number = 180,
        padding: number = 5,
        maxAttempts: number = 50
    ) {
        // Clear existing balls using proper cleanup
        this.cleanupBalls();

        const requiredNumbers = this.getRequiredBallsForEquation(this.currentEquation);
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

        // Responsive sizing - Tutorial sized
        const ballRadius = Math.min(35, width * 0.08);
        const fontSize = Math.min(22, width * 0.04);
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
        const isComplex = this.isComplexEquation(this.currentEquation);
        const maxBalls = isComplex ? 
            (this.currentEquation as ComplexEquation).operators.length + 1 : 2;

        // Check if we have empty slots
        if (this.placedBalls.length >= maxBalls) return;

        // For step 2, enforce correct sequence
        if (this.tutorialStep === 1) {
            const nextNeededBall = this.getNextNeededBall();
            if (nextNeededBall !== null && value !== nextNeededBall) {
                // Wrong ball for this position - play error and reject
                if (this.soundBallRattle) {
                    this.soundBallRattle.play();
                }
                // Show visual feedback for wrong selection
                this.showWrongSelectionFeedback(value);
                return; // Don't place the ball
            }
        }

        // Check if this ball is needed (for other steps)
        let isNeeded = false;
        if (isComplex) {
            const complexEq = this.currentEquation as ComplexEquation;
            isNeeded = complexEq.operands.includes(value);
        } else {
            const simpleEq = this.currentEquation as any;
            const leftOperand = simpleEq.leftOperand || simpleEq.leftOperand1;
            const rightOperand = simpleEq.rightOperand || simpleEq.leftOperand2;
            isNeeded = value === leftOperand || value === rightOperand;
        }

        if (!isNeeded) {
            return; // Not the right ball for this equation
        }

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
        const ballIndex = this.balls.findIndex((b) => b.value === value && !b.isPlaced);
        if (ballIndex !== -1) {
            const ball = this.balls[ballIndex];
            if (ball && ball.container) {
                ball.container.setVisible(false);
                ball.isPlaced = true;
            }
        }

        // Update hints for next needed ball
        if (this.tutorialStep === 1) {
            const nextNeededBall = this.getNextNeededBall();
            if (nextNeededBall !== null) {
                this.highlightBalls([nextNeededBall]);
            } else {
                this.highlightBalls([]);
            }
        }

        // Check if equation is complete
        if (this.placedBalls.length === maxBalls) {
            this.checkAnswer();
        }
    }

    showWrongSelectionFeedback(value: number) {
        // Find the ball that was wrongly clicked and shake it
        const wrongBallIndex = this.balls.findIndex((b) => b.value === value && !b.isPlaced);
        if (wrongBallIndex !== -1) {
            const wrongBall = this.balls[wrongBallIndex];
            if (wrongBall && wrongBall.container) {
                // Shake the wrong ball
                this.tweens.add({
                    targets: wrongBall.container,
                    x: "+=5",
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                    ease: "Power2.easeInOut",
                });
            }
        }
    }

    updateEquationDisplay() {
        const { width, height } = this.scale;

        // Clear existing equation display
        this.equationContainer.removeAll(true);
        this.equationBalls = {};
        this.operatorTexts = {};

        // Check if this is a complex equation
        const isComplex = this.isComplexEquation(this.currentEquation);

        if (isComplex) {
            this.updateComplexEquationDisplay();
        } else {
            this.updateSimpleEquationDisplay();
        }
    }

    private updateSimpleEquationDisplay() {
        const equation = this.currentEquation as any; // Use any for backward compatibility
        const { width } = this.scale;

        // Calculate responsive spacing based on screen width
        const baseSpacing = Math.min(120, width * 0.08);
        const startX = -baseSpacing * 1.5; // Center equation

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

        // Position goal ball at result location
        this.positionGoalBallAtResult(baseSpacing * 2.5);

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
        const baseSpacing = Math.min(80, width * 0.10);

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

        // Position goal ball at result location
        this.positionGoalBallAtResult(currentX + baseSpacing);

        // Animate entrance
        this.equationContainer.setAlpha(0);
        this.tweens.add({
            targets: this.equationContainer,
            alpha: 1,
            duration: 300,
            ease: "Linear",
        });
    }

    positionGoalBallAtResult(equalsX: number) {
        const { width, height } = this.scale;

        // Position goal ball at the result location (after equals)
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

        // Check if this is a complex equation
        const isComplex = this.isComplexEquation(this.currentEquation);
        let isCorrect: boolean;

        if (isComplex) {
            const complexEquation = this.currentEquation as ComplexEquation;
            
            // For step 2, also validate the sequence is correct
            if (this.tutorialStep === 1) {
                const requiredSequence = [2, 3, 1]; // Step 2 requires this exact sequence
                const isSequenceCorrect = this.placedBalls.length === requiredSequence.length &&
                    this.placedBalls.every((ball, index) => ball === requiredSequence[index]);
                
                if (!isSequenceCorrect) {
                    isCorrect = false;
                } else {
                    // Sequence is correct, now check mathematical result
                    let result = complexEquation.operands[0];
                    
                    for (let i = 0; i < complexEquation.operators.length; i++) {
                        const operator = complexEquation.operators[i];
                        const operand = complexEquation.operands[i + 1];
                        
                        switch (operator) {
                            case '+':
                                result += operand;
                                break;
                            case '-':
                                result -= operand;
                                break;
                            case '*':
                                result *= operand;
                                break;
                            case '/':
                                result /= operand;
                                break;
                        }
                    }
                    
                    isCorrect = Math.abs(result - complexEquation.result) < 0.001; // Allow for floating point precision
                }
            } else {
                // For other complex equations, just check mathematical result
                let result = complexEquation.operands[0];
                
                for (let i = 0; i < complexEquation.operators.length; i++) {
                    const operator = complexEquation.operators[i];
                    const operand = complexEquation.operands[i + 1];
                    
                    switch (operator) {
                        case '+':
                            result += operand;
                            break;
                        case '-':
                            result -= operand;
                            break;
                        case '*':
                            result *= operand;
                            break;
                        case '/':
                            result /= operand;
                            break;
                    }
                }
                
                isCorrect = Math.abs(result - complexEquation.result) < 0.001; // Allow for floating point precision
            }
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
        if (this.soundSuccess) {
            this.soundSuccess.play();
        }

        // Track completed equation
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
            this.nextTutorialStep();
        });
    }

    handleWrongAnswer() {
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

        // Find ball that was clicked
        const ballIndex = this.balls.findIndex((b) => b.value === value && !b.isPlaced);
        if (ballIndex === -1) return;

        const ball = this.balls[ballIndex];
        if (!ball || !ball.container) return;

        // Calculate target position in equation
        const equationX = width / 2;
        const isComplex = this.isComplexEquation(this.currentEquation);
        
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

    nextTutorialStep() {
        this.tutorialStep++;
        
        if (this.tutorialStep >= this.tutorialEquations.length) {
            this.completeTutorial();
        } else {
            this.showTutorialStep();
        }
    }

    completeTutorial() {
        this.messageText.setText("ยอดเยี่ยม! ตอนนี้คุณพร้อมเล่นเกมจริงแล้ว");
        
        // Hide next button
        this.game.events.emit('tutorial-show-next-btn', false);

        this.time.delayedCall(2000, () => {
            const onTutorialComplete = this.registry.get('onTutorialComplete');
            if (onTutorialComplete) {
                onTutorialComplete();
            }
        });
    }

    showStepHints(): void {
        try {
            if (this.tutorialStep === 0) {
                this.highlightBalls([2, 3]);
            } else if (this.tutorialStep === 1) {
                // For complex equation, highlight only next needed ball in sequence
                const nextNeededBall = this.getNextNeededBall();
                if (nextNeededBall !== null) {
                    this.highlightBalls([nextNeededBall]);
                }
            }
        } catch (error) {
            console.error("Error showing step hints:", error);
        }
    }

    getNextNeededBall(): number | null {
        if (this.tutorialStep === 1) {
            // Step 2 requires sequence: 2, 3, 1
            const sequence = [2, 3, 1];
            if (this.placedBalls.length < sequence.length) {
                return sequence[this.placedBalls.length];
            }
        }
        return null;
    }

    highlightBalls(values: number[]): void {
        try {
            // Clear previous highlights
            this.clearHighlights();

            // Highlight new balls
            const ballsToHighlight = this.balls.filter(ball => values.includes(ball.value));
            if (ballsToHighlight.length > 0) {
                this.currentHighlightTween = this.tweens.add({
                    targets: ballsToHighlight.map(b => b.container),
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });

                ballsToHighlight.forEach(ball => {
                    this.applyBallHighlight(ball);
                });
            }
        } catch (error) {
            console.error("Error highlighting balls:", error);
        }
    }

    applyBallHighlight(ball: Ball): void {
        if (!ball.container) return;
        
        const firstChild = ball.container.getAt(0);
        if (firstChild instanceof Phaser.GameObjects.Image) {
            // PNG ball - apply gold tint
            firstChild.setTint(0xFFD700);
        } else if (firstChild instanceof Phaser.GameObjects.Arc) {
            // Generated circle - apply gold stroke
            firstChild.setStrokeStyle(4, 0xFFD700);
        }
    }

    clearHighlights(): void {
        try {
            if (this.currentHighlightTween) {
                this.currentHighlightTween.stop();
                this.currentHighlightTween = null;
            }

            this.balls.forEach(ball => {
                if (!ball.container) return;
                
                const firstChild = ball.container.getAt(0);
                if (firstChild instanceof Phaser.GameObjects.Image) {
                    firstChild.setTint(0xffffff);
                } else if (firstChild instanceof Phaser.GameObjects.Arc) {
                    firstChild.setStrokeStyle(2, 0x000000);
                }
                
                ball.container.setScale(1);
            });
        } catch (error) {
            console.error("Error clearing highlights:", error);
        }
    }

    isComplexEquation(equation: any): equation is ComplexEquation {
        return equation.type === 'complex';
    }

    getRequiredBallsForEquation(equation: Equation | ComplexEquation): number[] {
        if (this.isComplexEquation(equation)) {
            const complexEq = equation as ComplexEquation;
            return [...complexEq.operands];
        } else {
            const simpleEq = equation as any;
            return [
                simpleEq.leftOperand || simpleEq.leftOperand1,
                simpleEq.rightOperand || simpleEq.leftOperand2
            ];
        }
    }

    nextPhase(): void {
        this.nextTutorialStep();
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
            this.messageText.setPosition(width / 2, height * 0.15);
        }

        // Reposition shadow ball tracker
        if (this.shadowBallContainer) {
            const y = height - Math.min(80, height * 0.12);
            this.shadowBallContainer.setPosition(width / 2, y);
        }
    }

    shutdown(): void {
        try {
            // Clean up all resources
            this.cleanupBalls();
            this.cleanupShadowBalls();
            
            // Clear highlights
            this.clearHighlights();
            
            // Stop background music
            if (this.bgMusic && this.bgMusic.isPlaying) {
                this.bgMusic.stop();
            }
            
            console.log('TutorialScene shutdown completed');
        } catch (error) {
            console.error('Error in TutorialScene shutdown:', error);
        }
    }
}
