import * as Phaser from "phaser";
import { BILLIARDS_LEVELS } from "./levels";
import { EquationGenerator } from "./equationGenerator";
import { LayoutGenerator } from "./LayoutGenerator"; // NEW
import type { BilliardsLevelConfig, Equation, ComplexEquation, Ball, LayoutObstacle } from "./types";
import type { BilliardsGameStats } from "@/types";
import { calculateStars, getStarHint } from "@/lib/scoring/billiards";

// Physics constants for realistic billiards feel
const PHYSICS_CONFIG = {
    friction: 0.985, // Velocity multiplier per frame (0.98 = 2% slowdown)
    minVelocity: 0.5, // Stop ball when below this speed
    maxShootPower: 800, // Max velocity on shoot
    aimLineLength: 120, // Length of aim trajectory line
    wallBounce: 0.7, // Bounce coefficient off walls
    ballCollisionBounce: 0.9, // Energy transfer on ball-to-ball collision
    ballRadius: 25, // Standard ball radius for collision detection
};

interface PhysicsBall extends Ball {
    sprite: Phaser.Physics.Arcade.Sprite | null;
    velocityX: number;
    velocityY: number;
    isMoving: boolean;
    isHazard?: boolean;
}

interface SlotZone {
    x: number;
    y: number;
    radius: number;
    index: number;
    filled: boolean;
    filledValue: number | null;
    occupiedBall: PhysicsBall | null;
    graphics: Phaser.GameObjects.Container;
    checkmark: Phaser.GameObjects.Text | null;
}

export class BilliardsGameScene extends Phaser.Scene {
    private currentLevelConfig!: BilliardsLevelConfig;
    private equationGenerator!: EquationGenerator;

    // Game State
    private layoutGenerator!: LayoutGenerator;
    private balls: PhysicsBall[] = [];
    private slots: SlotZone[] = [];
    private obstacles: { list: Phaser.GameObjects.Rectangle[], bodies: Phaser.Geom.Rectangle[] } = { list: [], bodies: [] };
    private lastMineExplosionTime: number = 0; // NEW
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
    private completedEquationResults: number[] = [];

    // Shot limit tracking
    private shotsRemaining: number = 0;
    private shotsTakenThisEquation: number = 0;
    private equationTimeRemaining: number = 0;
    private equationStartTime: number = 0;
    private equationTimerEvent!: Phaser.Time.TimerEvent;

    // Aiming state
    private aimingBall: PhysicsBall | null = null;
    private aimStartPoint: Phaser.Math.Vector2 | null = null;
    private aimLine: Phaser.GameObjects.Graphics | null = null;
    private powerIndicator: Phaser.GameObjects.Graphics | null = null;

    // Table bounds
    private tableBounds!: { left: number; right: number; top: number; bottom: number };

    // Timer
    private timerEvent!: Phaser.Time.TimerEvent;
    private customTimerBar!: Phaser.GameObjects.Graphics;
    private lastTimerPct: number = 100;

    // UI Elements
    private equationText!: Phaser.GameObjects.Text;
    private operatorText!: Phaser.GameObjects.Text; // Operator between slots
    private targetText!: Phaser.GameObjects.Text; // Target number (= X)
    private poolTable!: Phaser.GameObjects.Container;
    private shadowBallContainer!: Phaser.GameObjects.Container;
    private shadowBalls: Phaser.GameObjects.Container[] = [];

    // Shot counter UI
    private shotCounterText!: Phaser.GameObjects.Text;
    private equationTimerText!: Phaser.GameObjects.Text;

    // Cue ball (white ball)
    private cueBall: PhysicsBall | null = null;

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
        const level = this.registry.get("level");
        console.log(`[BilliardsGameScene] init called with level:`, {
            dataLevel: data.level,
            registryLevel: this.registry.get("level"),
            finalLevel: level,
        });

        this.currentLevelConfig = BILLIARDS_LEVELS[level] || BILLIARDS_LEVELS[1];
        this.equationGenerator = new EquationGenerator(this.currentLevelConfig);

        this.resetGameState();
    }

    resetGameState() {
        this.cleanupBalls();
        this.cleanupSlots();
        this.cleanupShadowBalls();
        this.cleanupObstacles();

        this.balls = [];
        this.slots = [];
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
        this.aimingBall = null;
        this.aimStartPoint = null;
        // Reset shot tracking
        this.shotsRemaining = 0;
        this.shotsTakenThisEquation = 0;
        this.equationTimeRemaining = 0;
    }

    cleanupBalls() {
        this.balls.forEach((ball) => {
            if (ball && ball.container) {
                ball.container.removeAllListeners();
                ball.container.destroy();
            }
        });
        this.balls = [];

        if (this.cueBall && this.cueBall.container) {
            this.cueBall.container.removeAllListeners();
            this.cueBall.container.destroy();
            this.cueBall = null;
        }
    }

    cleanupSlots() {
        this.slots.forEach((slot) => {
            if (slot.graphics) {
                slot.graphics.destroy();
            }
        });
        this.slots = [];
    }

    cleanupShadowBalls() {
        this.shadowBalls.forEach((shadowBall) => {
            if (shadowBall) {
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

    cleanupObstacles() {
        if (this.obstacles && this.obstacles.list) {
            this.obstacles.list.forEach(obs => obs.destroy());
        }
        this.obstacles = { list: [], bodies: [] };
    }

    preload() {
        // Load pool ball assets (1-10)
        for (let i = 1; i <= 10; i++) {
            this.load.image(`ball-${i}`, `/assets/images/billiards/ball-${i}.png`);
        }
        this.load.image("goal-ball", "/assets/images/billiards/goal-ball.png");

        // Load sounds
        this.load.audio("ball-drop", "/assets/sounds/billiards/ball-drop.mp3");
        this.load.audio("ball-rattle", "/assets/sounds/billiards/ball-rattle.mp3");
        this.load.audio("success", "/assets/sounds/billiards/success.mp3");
        this.load.audio("bg-music", "/assets/sounds/billiards/bg-music.mp3");
        this.load.audio("ball-click", "/assets/sounds/billiards/ball-rattle.mp3");
        this.load.audio("level-pass", "/assets/sounds/global/level-pass.mp3");
        this.load.audio("level-fail", "/assets/sounds/global/level-fail.mp3");
    }

    create() {
        const { width, height } = this.scale;

        console.log("[BilliardsGameScene] create() called", { width, height });

        // Create pool table visuals FIRST
        this.createPoolTable();

        // Create UI
        this.createUI();

        // Create graphics for aiming AFTER table so they're on top
        this.aimLine = this.add.graphics();
        this.aimLine.setDepth(100);
        this.powerIndicator = this.add.graphics();
        this.powerIndicator.setDepth(100);

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
            this.bgMusic = this.sound.add("bg-music", { volume: 0.3, loop: true });
            this.bgMusic.play();
        } catch (e) {
            console.warn("Background music failed to play", e);
        }

        // Setup pointer events for aiming
        this.setupAimingControls();

        console.log("[BilliardsGameScene] create() completed");
    }

    update(time: number, delta: number) {
        // Update timer bar
        if (
            this.customTimerBar &&
            this.customTimerBar.visible &&
            !this.isPaused &&
            !this.continuedAfterTimeout &&
            this.startTime !== 0
        ) {
            const limitMs = this.currentLevelConfig.timeLimitSeconds * 1000;
            const elapsed = Date.now() - this.startTime;
            const remainingMs = Math.max(0, limitMs - elapsed);
            const pct = Math.max(0, (remainingMs / limitMs) * 100);
            this.drawTimerBar(pct);
        }

        // Update ball physics (manual friction)
        this.updateBallPhysics(delta);

        // Update aim line if aiming
        if (this.aimingBall && this.aimStartPoint) {
            this.updateAimLine();
        }
    }

    updateBallPhysics(delta: number) {
        const dt = delta / 16.67; // Normalize to ~60fps

        // Update all balls including cue ball
        const allBalls = this.cueBall ? [this.cueBall, ...this.balls] : this.balls;

        allBalls.forEach((ball) => {
            if (!ball.container || ball.isPlaced) return;

            // Apply friction
            ball.velocityX *= Math.pow(PHYSICS_CONFIG.friction, dt);
            ball.velocityY *= Math.pow(PHYSICS_CONFIG.friction, dt);

            // Check if ball has stopped
            const speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
            if (speed < PHYSICS_CONFIG.minVelocity) {
                ball.velocityX = 0;
                ball.velocityY = 0;
                if (ball.isMoving) {
                    ball.isMoving = false;
                    // Check if ball landed in a slot
                    this.checkBallInSlot(ball);
                }
                return;
            }

            ball.isMoving = true;

            // Move ball
            let newX = ball.container.x + ball.velocityX * dt;
            let newY = ball.container.y + ball.velocityY * dt;

            // Wall collision
            const ballRadius = 25;
            if (newX - ballRadius < this.tableBounds.left) {
                newX = this.tableBounds.left + ballRadius;
                ball.velocityX = -ball.velocityX * PHYSICS_CONFIG.wallBounce;
                if (this.soundBallRattle) this.soundBallRattle.play();
            }
            if (newX + ballRadius > this.tableBounds.right) {
                newX = this.tableBounds.right - ballRadius;
                ball.velocityX = -ball.velocityX * PHYSICS_CONFIG.wallBounce;
                if (this.soundBallRattle) this.soundBallRattle.play();
            }
            if (newY - ballRadius < this.tableBounds.top) {
                newY = this.tableBounds.top + ballRadius;
                ball.velocityY = -ball.velocityY * PHYSICS_CONFIG.wallBounce;
                if (this.soundBallRattle) this.soundBallRattle.play();
            }
            if (newY + ballRadius > this.tableBounds.bottom) {
                newY = this.tableBounds.bottom - ballRadius;
                ball.velocityY = -ball.velocityY * PHYSICS_CONFIG.wallBounce;
                if (this.soundBallRattle) this.soundBallRattle.play();
            }

            ball.container.setPosition(newX, newY);
            ball.x = newX;
            ball.y = newY;

            // Obstacle collision
            this.checkObstacleCollision(ball);
        });

        // Ball-to-ball collision detection
        this.checkBallCollisions();
    }

    checkObstacleCollision(ball: PhysicsBall) {
        // Simple Circle-AABB collision resolution
        const radius = PHYSICS_CONFIG.ballRadius;

        for (const body of this.obstacles.bodies) {
            // Find closest point on rect to circle center
            const closestX = Phaser.Math.Clamp(ball.x, body.x, body.x + body.width);
            const closestY = Phaser.Math.Clamp(ball.y, body.y, body.y + body.height);

            const dx = ball.x - closestX;
            const dy = ball.y - closestY;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < radius * radius && distanceSq > 0) {
                // Collision!
                const distance = Math.sqrt(distanceSq);
                const overlap = radius - distance;

                // Normal
                const nx = dx / distance;
                const ny = dy / distance;

                // Push out
                ball.x += nx * overlap;
                ball.y += ny * overlap;
                if (ball.container) ball.container.setPosition(ball.x, ball.y);

                // Reflect velocity
                // v' = v - 2 * (v . n) * n
                const dot = ball.velocityX * nx + ball.velocityY * ny;

                // Only bounce if moving towards the obstacle
                if (dot < 0) {
                    ball.velocityX = (ball.velocityX - 2 * dot * nx) * PHYSICS_CONFIG.wallBounce;
                    ball.velocityY = (ball.velocityY - 2 * dot * ny) * PHYSICS_CONFIG.wallBounce;

                    if (this.soundBallRattle) this.soundBallRattle.play();
                }
            }
        }
    }

    checkBallCollisions() {
        // Get all balls including cue ball
        const allBalls = this.cueBall ? [this.cueBall, ...this.balls] : this.balls;
        const ballRadius = PHYSICS_CONFIG.ballRadius;

        for (let i = 0; i < allBalls.length; i++) {
            const ballA = allBalls[i];
            if (!ballA.container || ballA.isPlaced) continue;

            for (let j = i + 1; j < allBalls.length; j++) {
                const ballB = allBalls[j];
                if (!ballB.container || ballB.isPlaced) continue;

                const dx = ballB.x - ballA.x;
                const dy = ballB.y - ballA.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = ballRadius * 2;

                if (dist < minDist && dist > 0) {
                    // Check for Mine Collision
                    if (ballA.isHazard || ballB.isHazard) {
                        const now = Date.now();
                        if (now - this.lastMineExplosionTime > 3000) { // 3s Cooldown
                            this.lastMineExplosionTime = now;
                            this.handleMineExplosion();
                        }
                        return; // Stop processing frame to chaos
                    }

                    // Normal Collision Logic
                    // Normalize collision vector
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Relative velocity
                    const dvx = ballA.velocityX - ballB.velocityX;
                    const dvy = ballA.velocityY - ballB.velocityY;

                    // Relative velocity along collision normal
                    const dvn = dvx * nx + dvy * ny;

                    // Only resolve if balls are moving towards each other
                    if (dvn > 0) {
                        // Impulse scalar (assuming equal mass)
                        const impulse = dvn * PHYSICS_CONFIG.ballCollisionBounce;

                        // Apply impulse
                        ballA.velocityX -= impulse * nx;
                        ballA.velocityY -= impulse * ny;
                        ballB.velocityX += impulse * nx;
                        ballB.velocityY += impulse * ny;

                        // Separate balls to prevent overlap
                        const overlap = minDist - dist;
                        const separationX = (overlap / 2) * nx;
                        const separationY = (overlap / 2) * ny;

                        ballA.x -= separationX;
                        ballA.y -= separationY;
                        ballB.x += separationX;
                        ballB.y += separationY;

                        if (ballA.container) ballA.container.setPosition(ballA.x, ballA.y);
                        if (ballB.container) ballB.container.setPosition(ballB.x, ballB.y);

                        // Mark both as moving
                        ballA.isMoving = true;
                        ballB.isMoving = true;

                        // Play collision sound
                        if (this.soundBallClick) this.soundBallClick.play();
                    }
                }
            }
        }
    }

    handleMineExplosion() {
        console.log("BOOM! Mine Hit!");
        this.cameras.main.shake(500, 0.02);
        this.cameras.main.flash(500, 0xff0000);
        if (this.soundLevelFail) this.soundLevelFail.play();

        // Eject all balls from slots (Reset Equation)
        this.slots.forEach(slot => {
            if (slot.filled && slot.occupiedBall) {
                const b = slot.occupiedBall;
                if (b.container) this.tweens.killTweensOf(b.container);
                b.isPlaced = false;
                b.isMoving = true;
                slot.filled = false;
                slot.filledValue = null;
                slot.occupiedBall = null;
                // Reset visuals
                if (slot.checkmark) slot.checkmark.setVisible(false);
                const ph = slot.graphics.getAt(2) as Phaser.GameObjects.Text;
                if (ph) ph.setVisible(true);
            }
        });
        this.placedBalls = [];
        this.updateEquationText();

        // Fling ALL balls with reduced power for smoother appearance
        const allBalls = this.cueBall ? [this.cueBall, ...this.balls] : this.balls;
        allBalls.forEach(ball => {
            if (ball.container) {
                ball.velocityX = Phaser.Math.Between(-200, 200);
                ball.velocityY = Phaser.Math.Between(-200, 200);
                ball.isMoving = true;
            }
        });
    }

    createPoolTable() {
        const { width, height } = this.scale;

        this.poolTable = this.add.container(width / 2, height / 2);

        const tableWidth = width * 0.85;
        const tableHeight = height * 0.55;
        const cornerRadius = Math.min(20, width * 0.03);

        // Store table bounds for physics
        this.tableBounds = {
            left: width / 2 - tableWidth / 2,
            right: width / 2 + tableWidth / 2,
            top: height / 2 - tableHeight / 2,
            bottom: height / 2 + tableHeight / 2,
        };

        // Wooden frame
        const borderWidth = Math.min(15, width * 0.05);
        const borderBg = this.add.graphics();
        borderBg.fillStyle(0x8b4513);
        borderBg.fillRoundedRect(
            -tableWidth / 2 - borderWidth,
            -tableHeight / 2 - borderWidth,
            tableWidth + borderWidth * 2,
            tableHeight + borderWidth * 2,
            cornerRadius + borderWidth
        );
        this.poolTable.add(borderBg);

        // Green felt
        const tableBg = this.add.graphics();
        tableBg.fillStyle(0x0d5d3d);
        tableBg.fillRoundedRect(-tableWidth / 2, -tableHeight / 2, tableWidth, tableHeight, cornerRadius);
        this.poolTable.add(tableBg);

        // Center spot
        const centerSpot = this.add.circle(0, 0, Math.min(8, width * 0.015), 0xffffff, 0.5);
        this.poolTable.add(centerSpot);

        console.log("[BilliardsGameScene] Pool table created", { tableBounds: this.tableBounds });

        this.layoutGenerator = new LayoutGenerator(this.tableBounds);
    }

    createUI() {
        const { width, height } = this.scale;

        // Equation text - position it inside the table area at the top
        // Since level indicator blocks top, we'll show equation result near the slots instead
        this.equationText = this.add
            .text(width / 2, this.tableBounds.top + 25, "", {
                fontFamily: "Arial, sans-serif",
                fontSize: `${Math.min(28, width * 0.05)}px`,
                color: "#FFFFFF",
                stroke: "#000000",
                strokeThickness: 3,
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setDepth(50);

        // Timer bar
        this.customTimerBar = this.add.graphics();
        this.customTimerBar.setVisible(false);

        // Shot counter - will be positioned in header card in createSlotZones
        this.shotCounterText = this.add
            .text(0, 0, "", {
                fontFamily: "'Segoe UI', Arial, sans-serif",
                fontSize: `${Math.min(22, width * 0.042)}px`,
                color: "#FFFFFF",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setDepth(15)
            .setVisible(false);

        // Shadow ball progress tracker
        this.createShadowBallTracker();

        console.log("[BilliardsGameScene] UI created");
    }

    createSlotZones() {
        const { width, height } = this.scale;

        // Clean existing slots
        this.cleanupSlots();

        // Determine slot count based on equation type
        const isComplex = this.equationGenerator.isComplexEquation(this.currentEquation);
        const slotCount = isComplex ? (this.currentEquation as ComplexEquation).operators.length + 1 : 2;

        // Position slots INSIDE the table, near the top of the green felt
        // Position slots INSIDE the table, near the top of the green felt
        const slotSpacing = Math.min(120, width * 0.2); // Increased spacing
        const slotY = this.tableBounds.top + 80; // Inside table, near top
        const startX = width / 2 - ((slotCount - 1) * slotSpacing) / 2;
        const slotRadius = Math.min(32, width * 0.055);

        console.log("[BilliardsGameScene] Creating slots", { slotCount, slotY, startX, tableBoundsTop: this.tableBounds.top });

        for (let i = 0; i < slotCount; i++) {
            const slotX = startX + i * slotSpacing;

            // Create slot visuals
            const slotContainer = this.add.container(slotX, slotY);
            slotContainer.setDepth(10);

            // Glowing circle background
            const glowCircle = this.add.circle(0, 0, slotRadius + 8, 0x00ffff, 0.25);
            const slotCircle = this.add.circle(0, 0, slotRadius, 0x1a1a2e, 0.9);
            slotCircle.setStrokeStyle(4, 0x00ffff);

            // Question mark placeholder
            const placeholder = this.add
                .text(0, 0, "?", {
                    fontFamily: "Arial, sans-serif",
                    fontSize: `${Math.min(26, width * 0.045)}px`,
                    color: "#00ffff",
                    fontStyle: "bold",
                })
                .setOrigin(0.5);

            // Checkmark (hidden initially)
            const checkmark = this.add
                .text(0, -slotRadius - 20, "✓", {
                    fontFamily: "Arial, sans-serif",
                    fontSize: `${Math.min(28, width * 0.05)}px`,
                    color: "#00ff00",
                    fontStyle: "bold",
                    stroke: "#000000",
                    strokeThickness: 2,
                })
                .setOrigin(0.5)
                .setVisible(false);

            slotContainer.add([glowCircle, slotCircle, placeholder, checkmark]);

            // Pulsing animation for empty slots
            this.tweens.add({
                targets: glowCircle,
                alpha: { from: 0.25, to: 0.5 },
                scale: { from: 1, to: 1.1 },
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
            });

            const slot: SlotZone = {
                x: slotX,
                y: slotY,
                radius: slotRadius,
                index: i,
                filled: false,
                filledValue: null,
                occupiedBall: null,
                graphics: slotContainer,
                checkmark,
            };

            // Make slot interactive for ejection
            const hitArea = new Phaser.Geom.Circle(0, 0, slotRadius);
            slotContainer.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
            slotContainer.on('pointerdown', () => {
                this.ejectBallFromSlot(slot);
            });

            this.slots.push(slot);

            // Operator between slots
            if (i < slotCount - 1) {
                let opSymbol = "+";
                if (isComplex) {
                    const ce = this.currentEquation as ComplexEquation;
                    opSymbol = ce.operators[i] || "+";
                } else {
                    const se = this.currentEquation as any;
                    opSymbol = se.operator || "+";
                }
                if (opSymbol === "*") opSymbol = "×";
                if (opSymbol === "/") opSymbol = "÷";

                const opText = this.add.text(slotSpacing / 2, 0, opSymbol, {
                    fontFamily: "Arial, sans-serif",
                    fontSize: `${Math.min(32, width * 0.055)}px`,
                    color: "#FFFFFF",
                    fontStyle: "bold",
                    stroke: "#000000",
                    strokeThickness: 4
                }).setOrigin(0.5);
                slotContainer.add(opText);
            }
        }

        // Add target number (= X) ABOVE the table with a clean card design
        if (this.targetText) this.targetText.destroy();

        // Create a header container for clean UI
        const headerY = this.tableBounds.top - 45;

        // Background card for header
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x2B2115, 0.9);
        headerBg.fillRoundedRect(width / 2 - 160, headerY - 22, 320, 44, 12);
        headerBg.lineStyle(2, 0x8B7355, 1);
        headerBg.strokeRoundedRect(width / 2 - 160, headerY - 22, 320, 44, 12);
        headerBg.setDepth(14);

        // Target value - centered in left half with Thai text
        this.targetText = this.add
            .text(width / 2 - 80, headerY, `เป้าหมาย: ${this.currentEquation.result}`, {
                fontFamily: "'Segoe UI', Arial, sans-serif",
                fontSize: `${Math.min(24, width * 0.045)}px`,
                color: "#FFFFFF",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setDepth(15);

        // Divider line
        const divider = this.add.graphics();
        divider.lineStyle(2, 0x8B7355, 0.5);
        divider.lineBetween(width / 2, headerY - 15, width / 2, headerY + 15);
        divider.setDepth(15);

        // Shot counter - centered in right half
        if (this.shotCounterText) {
            this.shotCounterText.setPosition(width / 2 + 80, headerY);
            this.shotCounterText.setVisible(true);
        }

        // Hide the old equation text since we now show it visually
        if (this.equationText) this.equationText.setVisible(false);
    }



    updateEquationText() {
        const { width } = this.scale;
        const isComplex = this.equationGenerator.isComplexEquation(this.currentEquation);

        let displayText = "";
        if (isComplex) {
            const eq = this.currentEquation as ComplexEquation;
            for (let i = 0; i < eq.operands.length; i++) {
                const slotValue = this.slots[i]?.filled ? this.slots[i].filledValue : "?";
                displayText += slotValue;
                if (i < eq.operators.length) {
                    let op: string = eq.operators[i];
                    if (op === "*") op = "×";
                    if (op === "/") op = "÷";
                    displayText += ` ${op} `;
                }
            }
        } else {
            const eq = this.currentEquation as any;
            const op = eq.operator || "+";
            const slot1 = this.slots[0]?.filled ? this.slots[0].filledValue : "?";
            const slot2 = this.slots[1]?.filled ? this.slots[1].filledValue : "?";
            displayText = `${slot1} ${op} ${slot2}`;
        }

        displayText += ` = ${this.currentEquation.result}`;

        this.equationText.setText(displayText);
        this.equationText.setPosition(width / 2, this.scale.height * 0.06);
    }

    setupAimingControls() {
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (this.isLocked) return;

            // Only allow aiming the cue ball (not numbered balls)
            if (!this.cueBall || !this.cueBall.container) return;
            if (this.cueBall.isMoving) return; // Can't aim while cue ball is moving

            // Check if any balls are still moving
            const anyBallsMoving = this.balls.some(b => b.isMoving);
            if (anyBallsMoving) return;

            // Check if clicking on the cue ball
            const dist = Phaser.Math.Distance.Between(
                pointer.x, pointer.y,
                this.cueBall.container.x, this.cueBall.container.y
            );

            if (dist < 45) {
                this.aimingBall = this.cueBall;
                this.aimStartPoint = new Phaser.Math.Vector2(pointer.x, pointer.y);
                if (this.soundBallClick) this.soundBallClick.play();

                // Highlight the cue ball
                this.tweens.add({
                    targets: this.cueBall.container,
                    scale: 1.15,
                    duration: 100,
                });
            }
        });

        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            // Aim line is updated in update() loop
        });

        this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
            if (this.aimingBall && this.aimStartPoint) {
                this.shootBall(pointer);

                // Reset ball scale
                this.tweens.add({
                    targets: this.aimingBall.container,
                    scale: 1,
                    duration: 100,
                });
            }
            this.aimingBall = null;
            this.aimStartPoint = null;
            this.clearAimLine();
        });

        console.log("[BilliardsGameScene] Aiming controls set up");
    }

    getBallAtPosition(x: number, y: number): PhysicsBall | null {
        for (const ball of this.balls) {
            if (!ball.container || ball.isPlaced) continue;
            const dist = Phaser.Math.Distance.Between(x, y, ball.container.x, ball.container.y);
            if (dist < 40) {
                return ball;
            }
        }
        return null;
    }

    updateAimLine() {
        if (!this.aimLine || !this.aimingBall || !this.aimStartPoint || !this.aimingBall.container) return;

        const pointer = this.input.activePointer;
        const ballX = this.aimingBall.container.x;
        const ballY = this.aimingBall.container.y;

        // Direction is opposite of drag
        const dragX = this.aimStartPoint.x - pointer.x;
        const dragY = this.aimStartPoint.y - pointer.y;
        const dragLength = Math.sqrt(dragX * dragX + dragY * dragY);

        if (dragLength < 10) {
            this.clearAimLine();
            return;
        }

        const power = Math.min(dragLength / 150, 1);
        const aimLength = PHYSICS_CONFIG.aimLineLength * power;

        // Normalize direction
        const dirX = dragX / dragLength;
        const dirY = dragY / dragLength;

        // Draw aim line
        this.aimLine.clear();
        this.aimLine.lineStyle(4, 0xffffff, 0.9);

        // Dotted line effect
        const segments = 8;
        for (let i = 0; i < segments; i++) {
            const startDist = (i / segments) * aimLength + 20;
            const endDist = ((i + 0.6) / segments) * aimLength + 20;

            const startX = ballX + dirX * startDist;
            const startY = ballY + dirY * startDist;
            const endX = ballX + dirX * endDist;
            const endY = ballY + dirY * endDist;

            this.aimLine.moveTo(startX, startY);
            this.aimLine.lineTo(endX, endY);
        }

        this.aimLine.strokePath();

        // Power indicator ring around ball
        if (this.powerIndicator) {
            this.powerIndicator.clear();

            // Color from green to red based on power
            const r = Math.floor(255 * power);
            const g = Math.floor(255 * (1 - power));
            const hexColor = (r << 16) | (g << 8) | 0;

            this.powerIndicator.lineStyle(5, hexColor, 0.8);
            this.powerIndicator.strokeCircle(ballX, ballY, 35 + power * 20);
        }
    }

    clearAimLine() {
        if (this.aimLine) this.aimLine.clear();
        if (this.powerIndicator) this.powerIndicator.clear();
    }

    shootBall(pointer: Phaser.Input.Pointer) {
        if (!this.aimingBall || !this.aimStartPoint) return;
        if (this.isLocked) return;

        // Check if shots remaining
        if (this.shotsRemaining <= 0) {
            console.log("[BilliardsGameScene] No shots remaining!");
            return;
        }

        const dragX = this.aimStartPoint.x - pointer.x;
        const dragY = this.aimStartPoint.y - pointer.y;
        const dragLength = Math.sqrt(dragX * dragX + dragY * dragY);

        if (dragLength < 15) return; // Minimum drag threshold

        const power = Math.min(dragLength / 150, 1);

        // Normalize and apply power
        const dirX = dragX / dragLength;
        const dirY = dragY / dragLength;

        this.aimingBall.velocityX = dirX * power * PHYSICS_CONFIG.maxShootPower / 60;
        this.aimingBall.velocityY = dirY * power * PHYSICS_CONFIG.maxShootPower / 60;
        this.aimingBall.isMoving = true;

        // Track shot
        this.shotsRemaining--;
        this.shotsTakenThisEquation++;
        this.updateShotCounter();

        if (this.soundBallDrop) this.soundBallDrop.play();

        console.log("[BilliardsGameScene] Ball shot", {
            power,
            vx: this.aimingBall.velocityX,
            vy: this.aimingBall.velocityY,
            shotsRemaining: this.shotsRemaining
        });

        // Check if out of shots after a short delay (let ball settle)
        this.time.delayedCall(2000, () => {
            if (this.shotsRemaining <= 0 && !this.slots.every(s => s.filled)) {
                this.handleOutOfShots();
            }
        });
    }

    handleOutOfShots() {
        console.log("[BilliardsGameScene] Out of shots - resetting equation");

        // Lock input during reset to prevent teleportation bugs
        this.isLocked = true;

        // Flash warning
        if (this.shotCounterText) {
            this.tweens.add({
                targets: this.shotCounterText,
                alpha: { from: 1, to: 0.2 },
                duration: 150,
                yoyo: true,
                repeat: 3,
            });
        }

        // Soft penalty - reset the current equation (not the whole level)
        this.wrongEquations++;
        this.totalEquations++;
        this.currentErrorRun++;
        if (this.currentErrorRun > this.consecutiveErrors) {
            this.consecutiveErrors = this.currentErrorRun;
        }

        if (this.soundBallRattle) this.soundBallRattle.play();
        this.cameras.main.shake(200, 0.008);

        this.time.delayedCall(1200, () => this.resetCurrentEquation());
    }

    updateShotCounter() {
        // Update visible shot counter text in header card
        if (this.shotCounterText) {
            const maxShots = this.currentLevelConfig.shotLimit;
            const isLow = this.shotsRemaining <= 3;
            // Thai text: "ยิง" means "shots"
            this.shotCounterText.setText(`ยิง: ${this.shotsRemaining}/${maxShots}`);
            this.shotCounterText.setColor(isLow ? "#FF6B6B" : "#FFFFFF");

            // Pulse animation when low
            if (isLow && !this.shotCounterText.getData('pulsing')) {
                this.shotCounterText.setData('pulsing', true);
                this.tweens.add({
                    targets: this.shotCounterText,
                    scale: { from: 1, to: 1.1 },
                    duration: 400,
                    yoyo: true,
                    repeat: -1,
                });
            } else if (!isLow && this.shotCounterText.getData('pulsing')) {
                this.tweens.killTweensOf(this.shotCounterText);
                this.shotCounterText.setData('pulsing', false);
                this.shotCounterText.setScale(1);
            }
        }
    }

    checkBallInSlot(ball: PhysicsBall) {
        if (ball.isPlaced || !ball.container) return;

        // Cue ball cannot fill a slot
        if (ball === this.cueBall) return;

        // Hazard/bomb balls cannot fill a slot - they should just bounce off
        if (ball.isHazard) return;

        for (const slot of this.slots) {
            if (slot.filled) continue;

            const dist = Phaser.Math.Distance.Between(
                ball.container.x,
                ball.container.y,
                slot.x,
                slot.y
            );

            if (dist < slot.radius * 1.5) { // Increased from 0.8 for easier entry
                // Ball is in slot!
                this.fillSlot(slot, ball);
                return;
            }
        }
    }

    fillSlot(slot: SlotZone, ball: PhysicsBall) {
        slot.filled = true;
        slot.filledValue = ball.value;
        slot.occupiedBall = ball;
        ball.isPlaced = true;

        console.log("[BilliardsGameScene] Slot filled", { slot: slot.index, value: ball.value });

        // Animate ball snapping to slot center
        if (ball.container) {
            this.tweens.add({
                targets: ball.container,
                x: slot.x,
                y: slot.y,
                scale: 0.85,
                duration: 250,
                ease: "Back.easeOut",
            });
        }

        // Update slot visual - hide placeholder
        const placeholder = slot.graphics.getAt(2) as Phaser.GameObjects.Text;
        if (placeholder) placeholder.setVisible(false);

        // Show checkmark with animation
        if (slot.checkmark) {
            slot.checkmark.setVisible(true);
            slot.checkmark.setScale(0);
            this.tweens.add({
                targets: slot.checkmark,
                scale: 1,
                duration: 300,
                ease: "Back.easeOut",
            });
        }

        // Stop pulsing on glow
        const glowCircle = slot.graphics.getAt(0) as Phaser.GameObjects.Arc;
        this.tweens.killTweensOf(glowCircle);
        glowCircle.setAlpha(0.6);

        // Play sound
        if (this.soundSuccess) this.soundSuccess.play();

        // Make placed ball interactive for ejection
        if (ball.container) {
            ball.container.setInteractive({ useHandCursor: true });
            ball.container.off('pointerdown');
            ball.container.on('pointerdown', () => {
                this.ejectBallFromSlot(slot);
            });
        }

        // Update equation display
        this.placedBalls.push(ball.value);
        this.updateEquationText();

        // Check answer if all slots are filled
        if (this.slots.every(s => s.filled)) {
            this.time.delayedCall(500, () => {
                this.checkAnswer();
            });
        }
    }

    ejectBallFromSlot(slot: SlotZone) {
        if (!slot.filled || !slot.occupiedBall) return;

        console.log("[BilliardsGameScene] Ejecting ball from slot", { slot: slot.index, value: slot.filledValue });

        const ball = slot.occupiedBall;

        // Remove ejection listener
        if (ball.container) {
            ball.container.off('pointerdown');
        }

        // Reset slot state
        slot.filled = false;
        slot.filledValue = null;
        slot.occupiedBall = null;
        if (slot.checkmark) {
            slot.checkmark.setVisible(false);
            slot.checkmark.setScale(0); // Reset scale for next animation
        }

        // Show placeholder again
        const placeholder = slot.graphics.getAt(2) as Phaser.GameObjects.Text;
        if (placeholder) placeholder.setVisible(true);

        // Restart pulsating animation
        const glowCircle = slot.graphics.getAt(0) as Phaser.GameObjects.Arc;
        this.tweens.add({
            targets: glowCircle,
            alpha: { from: 0.25, to: 0.5 },
            scale: { from: 1, to: 1.1 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
        });

        // Reset ball state
        ball.isPlaced = false;
        ball.isMoving = true;

        // Pop it out gently downwards
        ball.velocityY = 50;
        ball.velocityX = Phaser.Math.Between(-20, 20);

        // Restore scale
        if (ball.container) {
            this.tweens.add({
                targets: ball.container,
                scale: 1,
                duration: 200,
            });
        }

        // Remove from current placed balls calculation logic
        // placedBalls array is just a list of values, but order matters for equation check
        // We'll need to rebuild placedBalls from slots
        this.rebuildPlacedBalls();
        this.updateEquationText();

        // Play pop sound
        if (this.soundBallClick) this.soundBallClick.play();
    }

    rebuildPlacedBalls() {
        this.placedBalls = [];
        // We need to preserve the order of slots
        // Assuming slots are sorted by index
        const sortedSlots = [...this.slots].sort((a, b) => a.index - b.index);

        // Wait, updateEquationText uses this.slots directly to show display text
        // But checkAnswer uses placedBalls?
        // checkAnswer uses `this.placedBalls`.
        // `fillSlot` pushes to `placedBalls`.
        // If we remove one, `placedBalls` array logic is broken if we just pop.
        // We should rebuild `placedBalls` from the current slot state.

        // Actually, checkAnswer relies on placedBalls having the values in order?
        // In `checkAnswer`: `this.placedBalls[0] + this.placedBalls[1]`
        // This implies [Slot 0 Value, Slot 1 Value].
        // But `fillSlot` just pushes: `this.placedBalls.push(ball.value)`.
        // If I fill Slot 1 then Slot 0, placedBalls is [Slot1Val, Slot0Val].
        // This seems WRONG if the equation is `? + ?`. Order usually doesn't matter for +, but for - and / it does.
        // For `-`, `Slot0 - Slot1`.
        // If I fill Slot 1 first, then Slot 0... the current logic `placedBalls[0]` would be the first one filled (Slot 1).
        // This means the current implementation of `checkAnswer` DEPENDS on filling order!
        // That is a bug if the user fills them out of order (which is possible).

        // FIX: Rebuild placedBalls based on Slot Index order.

        this.placedBalls = [];
        // We can't easily map partial arrays if we rely on indices.
        // But wait, `checkAnswer` is only called if `allFilled`.
        // So if allFilled, we can map slots 0..N to placedBalls.

        if (this.slots.every(s => s.filled)) {
            this.placedBalls = this.slots
                .sort((a, b) => a.index - b.index)
                .map(s => s.filledValue as number);
        } else {
            // Partial filled - mostly for display?
            // updateEquationText iterates slots directly.
            // So placedBalls is mostly used for final check.
            // We can just clear it here and let checkAnswer rebuild it?
            // checkAnswer doesn't rebuild it. It reads it.

            // So, `rebuildPlacedBalls` should just act as "sync placedBalls with slots"
            // But `checkAnswer` expects a full array.
            // If we eject, we are not full anymore.
            // So `placedBalls` can be empty or partial.
            // Let's just update it to match slots if we want to be safe.
            this.placedBalls = this.slots
                .filter(s => s.filled)
                .sort((a, b) => a.index - b.index)
                .map(s => s.filledValue as number);
        }
    }

    checkAnswer() {
        // First ensure placedBalls is accurate to slot order
        this.rebuildPlacedBalls();

        this.isLocked = true;
        this.attempts++;

        // ... rest of checkAnswer
        // Copied checkAnswer logic here to be safe or just call existing?
        // multi_replace can't reference existing function body unless I replace it too.
        // I will just implement rebuildPlacedBalls and ensure checkAnswer calls it or I fix fillSlot to not push blindly.
        // Actually, if I fix `fillSlot` to NOT push blindly either, that's better.
        // But for now, let's just make `rebuild` work.

        const isComplex = this.equationGenerator.isComplexEquation(this.currentEquation);
        let isCorrect: boolean;

        if (isComplex) {
            const complexEquation = this.currentEquation as ComplexEquation;
            isCorrect = this.equationGenerator.validateEquation(complexEquation, this.placedBalls);
        } else {
            const simpleEquation = this.currentEquation as any;
            const op = simpleEquation.operator || "+";
            let userAnswer: number;
            // Ensure we have enough balls
            if (this.placedBalls.length < this.slots.length) {
                // Should not happen if checkAnswer called only on allFilled
                isCorrect = false;
            } else {
                if (op === "+") {
                    userAnswer = this.placedBalls[0] + this.placedBalls[1];
                } else if (op === "-") {
                    userAnswer = this.placedBalls[0] - this.placedBalls[1];
                } else if (op === "*" || op === "×") {
                    userAnswer = this.placedBalls[0] * this.placedBalls[1];
                } else {
                    userAnswer = this.placedBalls[0] / this.placedBalls[1];
                }
                isCorrect = userAnswer === simpleEquation.result;
            }
        }

        console.log("[BilliardsGameScene] Answer checked", { isCorrect, placedBalls: this.placedBalls });

        if (isCorrect) {
            this.handleCorrectAnswer();
        } else {
            this.handleWrongAnswer();
        }
    }
    createBalls() {
        this.cleanupBalls();
        this.cleanupObstacles();

        const layout = this.layoutGenerator.generateLayout(this.currentEquation, this.currentLevelConfig);
        const { width } = this.scale;
        const ballRadius = Math.min(28, width * 0.055);

        // 1. Create Obstacles
        layout.obstacles.forEach(obs => {
            // Visual
            const rect = this.add.rectangle(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width, obs.height, 0x5c4033); // Dark wood color
            rect.setStrokeStyle(2, 0x3e2b22);
            rect.setDepth(18); // Below balls (20)

            // Physics Body (Manual collision)
            const body = new Phaser.Geom.Rectangle(obs.x, obs.y, obs.width, obs.height);

            this.obstacles.list.push(rect);
            this.obstacles.bodies.push(body);
        });

        // 2. Create Balls
        layout.balls.forEach(b => {
            const ball = this.createBall(b.value, b.x, b.y, ballRadius, b.isHazard);
            this.balls.push(ball);
        });

        // 3. Create Cue Ball
        this.createCueBall(ballRadius * 0.85);

        console.log("[BilliardsGameScene] Level layout created", {
            balls: this.balls.length,
            obstacles: this.obstacles.list.length,
            hazards: this.balls.filter(b => b.isHazard).length
        });
    }

    createCueBall(radius: number) {
        const { width } = this.scale;
        const cueBallX = width / 2;
        const cueBallY = this.tableBounds.bottom - radius * 2.5;

        const container = this.add.container(cueBallX, cueBallY);

        // Shadow
        const shadow = this.add.circle(3, 3, radius, 0x000000, 0.3);
        container.add(shadow);

        // White cue ball - make it visually distinct
        const ballCircle = this.add.circle(0, 0, radius, 0xffffff);
        ballCircle.setStrokeStyle(2, 0xcccccc);
        container.add(ballCircle);

        // Small dot in center to show it's the cue ball
        const centerDot = this.add.circle(0, 0, radius * 0.15, 0xdddddd);
        container.add(centerDot);

        container.setSize(radius * 2, radius * 2);
        container.setDepth(25); // Slightly above other balls
        container.setInteractive({ useHandCursor: true });

        this.cueBall = {
            id: 0,
            value: 0, // Cue ball has no value
            x: cueBallX,
            y: cueBallY,
            originalX: cueBallX,
            originalY: cueBallY,
            isDragging: false,
            isPlaced: false,
            container,
            sprite: null,
            velocityX: 0,
            velocityY: 0,
            isMoving: false,
        };

        console.log("[BilliardsGameScene] Cue ball created at", { x: cueBallX, y: cueBallY });

        // Highlight cue ball at start
        this.tweens.add({
            targets: container,
            scale: { from: 1, to: 1.3 },
            alpha: { from: 1, to: 0.8 },
            duration: 500,
            yoyo: true,
            repeat: 2,
            ease: "Sine.easeInOut"
        });

        const hintRing = this.add.graphics();
        hintRing.lineStyle(4, 0xffffff, 0.8);
        hintRing.strokeCircle(0, 0, radius * 1.5);
        container.add(hintRing);

        this.tweens.add({
            targets: hintRing,
            alpha: { from: 0.8, to: 0 },
            scale: { from: 1, to: 1.5 },
            duration: 1500,
            repeat: -1,
        });
    }

    createBall(value: number, x: number, y: number, radius: number, isHazard?: boolean): PhysicsBall {
        const container = this.add.container(x, y);

        // Shadow
        const shadow = this.add.circle(3, 3, radius, 0x000000, 0.3);
        container.add(shadow);

        if (isHazard || value === 99) {
            // Hazard Ball (Red with Skull)
            const ballCircle = this.add.circle(0, 0, radius, 0xff0000).setStrokeStyle(2, 0x000000);
            const text = this.add.text(0, 0, "☠", {
                fontFamily: "Arial, sans-serif",
                fontSize: `${radius * 1.2}px`,
                color: "#000000"
            }).setOrigin(0.5);
            container.add([ballCircle, text]);
        } else if (value >= 1 && value <= 10) {
            const ballImage = this.add.image(0, 0, `ball-${value}`);
            ballImage.setDisplaySize(radius * 2.2, radius * 2.2);
            container.add(ballImage);
        } else {
            const ballCircle = this.add.circle(0, 0, radius, 0xffffff).setStrokeStyle(2, 0x000000);
            const text = this.add
                .text(0, 0, value.toString(), {
                    fontFamily: "Arial, sans-serif",
                    fontSize: `${radius * 0.8}px`,
                    color: "#000000",
                    fontStyle: "bold",
                })
                .setOrigin(0.5);
            container.add([ballCircle, text]);
        }

        container.setSize(radius * 2, radius * 2);
        container.setDepth(20); // Below aim line (100) but above table

        // Make interactive
        container.setInteractive({ useHandCursor: true });

        return {
            id: value,
            value,
            x,
            y,
            originalX: x,
            originalY: y,
            isDragging: false,
            isPlaced: false,
            container,
            sprite: null,
            velocityX: 0,
            velocityY: 0,
            isMoving: false,
            isHazard: isHazard || value === 99
        };
    }

    startLevel() {
        console.log("[BilliardsGameScene] Starting level");
        this.levelStartTime = Date.now();
        this.generateNewEquation();
        this.isLocked = false;
        this.startTime = Date.now();
        this.startTimer();
    }

    generateNewEquation() {
        this.currentEquation = this.equationGenerator.generateFillInTheBlanksEquation();

        console.log("[BilliardsGameScene] Generated equation", {
            result: this.currentEquation.result,
            displayText: this.currentEquation.displayText
        });

        // Create slot zones based on equation
        this.createSlotZones();

        // Create balls
        this.createBalls();

        // Reset placed balls
        this.placedBalls = [];

        // Initialize shot limit for this equation
        this.shotsRemaining = this.currentLevelConfig.shotLimit;
        this.shotsTakenThisEquation = 0;
        this.updateShotCounter();
    }

    startEquationTimer() {
        // Clear any existing equation timer
        if (this.equationTimerEvent) {
            this.equationTimerEvent.remove();
        }

        this.equationStartTime = Date.now();
        this.equationTimeRemaining = this.currentLevelConfig.perEquationTimeSeconds;

        // Update display immediately
        this.updateEquationTimerDisplay();

        // Update timer every 100ms
        this.equationTimerEvent = this.time.addEvent({
            delay: 100,
            callback: () => {
                if (this.isPaused || this.isLocked) return;

                const elapsed = (Date.now() - this.equationStartTime) / 1000;
                this.equationTimeRemaining = Math.max(0, this.currentLevelConfig.perEquationTimeSeconds - elapsed);

                this.updateEquationTimerDisplay();

                // Check if time expired
                if (this.equationTimeRemaining <= 0) {
                    this.handleEquationTimeExpired();
                }
            },
            loop: true,
        });
    }

    updateEquationTimerDisplay() {
        if (this.equationTimerText) {
            const seconds = Math.ceil(this.equationTimeRemaining);
            const isWarning = seconds <= 10;
            const isCritical = seconds <= 5;

            let color = "#FFFFFF";
            if (isCritical) color = "#FF4444";
            else if (isWarning) color = "#FFAA44";

            this.equationTimerText.setText(`⏱️ ${seconds}s`);
            this.equationTimerText.setColor(color);

            // Pulsing effect when critical
            if (isCritical && !this.equationTimerText.getData('pulsing')) {
                this.equationTimerText.setData('pulsing', true);
                this.tweens.add({
                    targets: this.equationTimerText,
                    scale: { from: 1, to: 1.15 },
                    duration: 300,
                    yoyo: true,
                    repeat: -1,
                });
            }
        }
    }

    handleEquationTimeExpired() {
        if (this.equationTimerEvent) {
            this.equationTimerEvent.remove();
        }

        console.log("[BilliardsGameScene] Equation time expired - resetting equation");

        // Flash timer warning
        if (this.equationTimerText) {
            this.tweens.killTweensOf(this.equationTimerText);
            this.equationTimerText.setData('pulsing', false);
            this.equationTimerText.setScale(1);
        }

        // Soft penalty - reset the current equation (not the whole level)
        this.wrongEquations++;
        this.totalEquations++;
        this.currentErrorRun++;
        if (this.currentErrorRun > this.consecutiveErrors) {
            this.consecutiveErrors = this.currentErrorRun;
        }

        if (this.soundBallRattle) this.soundBallRattle.play();
        this.cameras.main.shake(200, 0.008);

        this.time.delayedCall(1200, () => this.resetCurrentEquation());
    }



    handleCorrectAnswer() {
        this.correctEquations++;
        this.totalEquations++;
        this.currentErrorRun = 0;

        // Stop the equation timer
        if (this.equationTimerEvent) {
            this.equationTimerEvent.remove();
        }
        if (this.equationTimerText) {
            this.tweens.killTweensOf(this.equationTimerText);
            this.equationTimerText.setData('pulsing', false);
            this.equationTimerText.setScale(1);
        }

        this.trackCompletedEquation(this.currentEquation.result);

        // Success animation on all slots
        this.slots.forEach((slot) => {
            this.tweens.add({
                targets: slot.graphics,
                scale: 1.2,
                duration: 200,
                yoyo: true,
                ease: "Back.easeOut",
            });
        });

        this.time.delayedCall(1200, () => this.nextEquation());
    }

    handleWrongAnswer() {
        this.wrongEquations++;
        this.totalEquations++;
        this.currentErrorRun++;
        if (this.currentErrorRun > this.consecutiveErrors) {
            this.consecutiveErrors = this.currentErrorRun;
        }
        this.repeatedErrors++;

        if (this.soundBallRattle) this.soundBallRattle.play();

        // Shake camera
        this.cameras.main.shake(200, 0.008);

        this.time.delayedCall(1200, () => this.resetCurrentEquation());
    }

    resetCurrentEquation() {
        // Reset all slots
        this.slots.forEach((slot) => {
            slot.filled = false;
            slot.filledValue = null;
            slot.occupiedBall = null;
            if (slot.checkmark) slot.checkmark.setVisible(false);

            // Show placeholder again
            const placeholder = slot.graphics.getAt(2) as Phaser.GameObjects.Text;
            if (placeholder) {
                placeholder.setVisible(true);
                placeholder.setText("?");
            }

            // Restart pulsing animation
            const glowCircle = slot.graphics.getAt(0) as Phaser.GameObjects.Arc;
            glowCircle.setAlpha(0.25);
            this.tweens.add({
                targets: glowCircle,
                alpha: { from: 0.25, to: 0.5 },
                scale: { from: 1, to: 1.1 },
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
            });
        });

        // Reset balls to original positions
        this.balls.forEach((ball) => {
            if (ball.container) {
                this.tweens.killTweensOf(ball.container);
                // Immediately set container position
                ball.container.setPosition(ball.originalX, ball.originalY);
                ball.container.setScale(1);
            }
            // Update ball's internal position to match
            ball.x = ball.originalX;
            ball.y = ball.originalY;
            ball.velocityX = 0;
            ball.velocityY = 0;
            ball.isPlaced = false;
            ball.isMoving = false;
        });

        // Reset cue ball
        if (this.cueBall && this.cueBall.container) {
            this.cueBall.container.setPosition(this.cueBall.originalX, this.cueBall.originalY);
            this.cueBall.x = this.cueBall.originalX;
            this.cueBall.y = this.cueBall.originalY;
            this.cueBall.velocityX = 0;
            this.cueBall.velocityY = 0;
            this.cueBall.isMoving = false;

            // Reset cue ball scale in case it was highlighted
            this.cueBall.container.setScale(1);
        }

        this.placedBalls = [];
        this.updateEquationText();
        this.isLocked = false;

        // Reset shot counter
        this.shotsRemaining = this.currentLevelConfig.shotLimit;
        this.shotsTakenThisEquation = 0;
        this.updateShotCounter();
    }

    nextEquation() {
        this.placedBalls = [];

        if (this.totalEquations >= this.currentLevelConfig.totalEquations) {
            this.endLevel();
        } else {
            this.generateNewEquation();
            this.isLocked = false;
        }
    }

    // Shadow ball tracker (progress indicator)
    createShadowBallTracker() {
        const { width, height } = this.scale;
        const y = height - Math.min(85, height * 0.13);

        this.shadowBallContainer = this.add.container(width / 2, y);

        const totalBalls = this.currentLevelConfig.totalEquations;
        const ballSpacing = Math.min(55, width * 0.1); // Increased spacing
        const startX = (-(totalBalls - 1) * ballSpacing) / 2;

        for (let i = 0; i < totalBalls; i++) {
            const shadowBall = this.createShadowBall(i);
            shadowBall.setPosition(startX + i * ballSpacing, 0);
            this.shadowBalls.push(shadowBall);
            this.shadowBallContainer.add(shadowBall);
        }
    }

    createShadowBall(index: number): Phaser.GameObjects.Container {
        const container = this.add.container(0, 0);
        const { width } = this.scale;
        // Increased size from 18 to 28
        const ballRadius = Math.min(28, width * 0.055);

        const ball = this.add.circle(0, 0, ballRadius, 0xcccccc).setStrokeStyle(2, 0x666666);
        const text = this.add
            .text(0, 0, "?", {
                fontFamily: "Arial, sans-serif",
                fontSize: `${Math.min(18, width * 0.035)}px`,
                color: "#ffffff",
                fontStyle: "bold",
            })
            .setOrigin(0.5);

        container.add([ball, text]);
        return container;
    }

    trackCompletedEquation(result: number) {
        this.completedEquationResults.push(result);

        const index = this.completedEquationResults.length - 1;
        if (index < this.shadowBalls.length) {
            const shadowBall = this.shadowBalls[index];
            shadowBall.removeAll(true);

            const { width } = this.scale;
            // Increased size to match larger shadow balls
            const ballRadius = Math.min(30, width * 0.06);

            const goalBall = this.add.image(0, 0, "goal-ball");
            goalBall.setDisplaySize(ballRadius * 2.2, ballRadius * 2.2);

            const resultText = this.add
                .text(0, 0, result.toString(), {
                    fontFamily: "Arial, sans-serif",
                    fontSize: `${Math.min(18, width * 0.035)}px`,
                    color: "#ffffff",
                    fontStyle: "bold",
                })
                .setOrigin(0.5);

            shadowBall.add([goalBall, resultText]);

            this.tweens.add({
                targets: shadowBall,
                scale: { from: 0.5, to: 1 },
                duration: 300,
                ease: "Back.easeOut",
            });
        }
    }

    // Timer methods
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
        const y = height - Math.min(45, height * 0.07);

        this.customTimerBar.fillStyle(0x8b4513, 0.2);
        this.customTimerBar.fillRoundedRect(x, y, barW, barH, 6);

        const isWarning = pct < 25;
        const color = isWarning ? 0xff4444 : 0x76d13d;

        let alpha = 1;
        if (isWarning) {
            alpha = 0.65 + 0.35 * Math.sin(this.time.now / 150);
        }

        this.customTimerBar.fillStyle(color, alpha);
        if (pct > 0) {
            this.customTimerBar.fillRoundedRect(x, y, barW * (pct / 100), barH, 6);
        }
    }

    endLevel() {
        this.input.enabled = false;
        if (this.timerEvent) this.timerEvent.remove();
        if (this.customTimerBar) this.customTimerBar.setVisible(false);

        // Cleanup equation timer
        if (this.equationTimerEvent) this.equationTimerEvent.remove();

        const endTime = Date.now();
        const totalTime = endTime - this.levelStartTime;

        const stars = calculateStars(
            totalTime,
            this.correctEquations,
            this.totalEquations,
            this.currentLevelConfig.starRequirements.threeStars,
            this.currentLevelConfig.starRequirements.twoStars,
            this.continuedAfterTimeout
        );

        const starHint = getStarHint(
            totalTime,
            this.correctEquations,
            this.totalEquations,
            this.currentLevelConfig.starRequirements.threeStars,
            this.continuedAfterTimeout
        );

        console.log("[BilliardsGameScene] Level ended", { stars, totalTime, correctEquations: this.correctEquations });

        const onGameOver = this.registry.get("onGameOver");

        if (onGameOver) {
            const gameStats: BilliardsGameStats = {
                levelPlayed: this.currentLevelConfig.level,
                difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
                totalEquations: this.totalEquations,
                correctEquations: this.correctEquations,
                wrongEquations: this.wrongEquations,
                totalTimeMs: totalTime,
                parTimeMs: this.currentLevelConfig.starRequirements.threeStars * 1000,
                consecutiveErrors: this.consecutiveErrors,
                repeatedErrors: this.repeatedErrors,
                attempts: this.attempts,
                continuedAfterTimeout: this.continuedAfterTimeout,
            };

            const finalData = {
                success: true,
                stars,
                starHint,
                ...gameStats,
                userTimeMs: totalTime,
                level: this.currentLevelConfig.level,
            };

            try {
                onGameOver(finalData);
            } catch (error) {
                console.error("[BilliardsGameScene] Error in onGameOver callback:", error);
            }
        }

        if (stars >= 1) {
            if (this.soundLevelPass) this.soundLevelPass.play();
        } else {
            if (this.soundLevelFail) this.soundLevelFail.play();
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
            if (this.customTimerBar) this.customTimerBar.setVisible(false);
            if (this.timerEvent) this.timerEvent.remove();

            this.game.events.emit("timer-update", {
                remaining: this.currentLevelConfig.timeLimitSeconds,
                total: this.currentLevelConfig.timeLimitSeconds,
            });
        }
    }

    layoutGame() {
        const { width, height } = this.scale;

        // Update table bounds
        const tableWidth = width * 0.85;
        const tableHeight = height * 0.55;
        this.tableBounds = {
            left: width / 2 - tableWidth / 2,
            right: width / 2 + tableWidth / 2,
            top: height / 2 - tableHeight / 2,
            bottom: height / 2 + tableHeight / 2,
        };

        if (this.poolTable) {
            this.poolTable.setPosition(width / 2, height / 2);
        }

        if (this.equationText) {
            this.equationText.setPosition(width / 2, this.tableBounds.top + 25);
        }

        if (this.shadowBallContainer) {
            const y = height - Math.min(75, height * 0.11);
            this.shadowBallContainer.setPosition(width / 2, y);
        }

        if (this.customTimerBar && this.customTimerBar.visible) {
            this.drawTimerBar(this.lastTimerPct);
        }
    }
}
