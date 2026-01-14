import * as Phaser from "phaser";
import { FLOATING_BALL_MATH_LEVELS } from "./levels";
import { EquationGenerator } from "./utils/EquationGenerator";
import { WaterPhysics } from "./utils/WaterPhysics";
import { BallSpawner } from "./utils/BallSpawner";
import { FloatboatController } from "./utils/Floatboat";
import { HandController } from "./utils/HandController";
import type {
  FloatingBall,
  Equation,
  FloatingBallMathLevelConfig,
  BallColor,
} from "./types";
import type { FloatingBallMathGameStats as GameStats } from "@/types";

export class FloatingBallMathGameScene extends Phaser.Scene {
  private currentLevelConfig!: FloatingBallMathLevelConfig;
  private equationGenerator!: EquationGenerator;
  private waterPhysics!: WaterPhysics;
  private ballSpawner!: BallSpawner;
  private floatboatController!: FloatboatController;
  private handController!: HandController;

  // Game State
  private balls: FloatingBall[] = [];
  private currentEquation!: Equation;
  private currentScore: number = 0; // Always starts at 0
  private collectedBalls: FloatingBall[] = [];
  private completedEquationResults: number[] = [];
  private completedEquationStats: { target: number; ballsCollected: number }[] = [];
  private startTime = 0;
  private levelStartTime = 0;
  private totalEquations = 0;
  private correctEquations = 0;
  private wrongEquations = 0;
  private consecutiveErrors = 0;
  private currentErrorRun = 0;
  private repeatedErrors = 0;
  private attempts = 0;
  private isLocked = true; // Controls user interaction
  private physicsEnabled = true; // Controls ball movement
  private continuedAfterTimeout = false;
  private isPaused = false;
  private equationStartTime = 0;
  private initialBallCount: number = 8; // Track starting ball count
  private minBallCount: number = 8; // Minimum to maintain
  private ballsCollectedThisEquation: number = 0; // Track balls collected this equation

  // Reaction Time Tracking
  private reactionTimes: number[] = [];
  private ballsCollected = 0;
  private successfulCollections = 0;

  // Timer
  private timerEvent!: Phaser.Time.TimerEvent;
  private customTimerBar!: Phaser.GameObjects.Graphics;
  private lastTimerPct: number = 100;

  // UI Elements
  private targetDisplay!: Phaser.GameObjects.Container;
  private targetText!: Phaser.GameObjects.Text;
  private currentDisplay!: Phaser.GameObjects.Container;
  private currentText!: Phaser.GameObjects.Text;
  private shadowBallContainer!: Phaser.GameObjects.Container;
  private shadowBalls: Phaser.GameObjects.Container[] = [];
  private waterOverlay!: Phaser.GameObjects.Graphics;

  // Audio
  private bgMusic!: Phaser.Sound.BaseSound;
  private soundBallCollect!: Phaser.Sound.BaseSound;
  private soundSuccess!: Phaser.Sound.BaseSound;
  private soundError!: Phaser.Sound.BaseSound;
  private soundBomb!: Phaser.Sound.BaseSound;
  private soundLevelPass!: Phaser.Sound.BaseSound;
  private soundLevelFail!: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: "FloatingBallMathGameScene" });
  }

  init(data: { level: number }) {
    const level = this.registry.get("level");
    console.log(`[FloatingBallMathGameScene] init called with level:`, {
      dataLevel: data.level,
      registryLevel: level,
      finalLevel: level,
    });

    this.currentLevelConfig =
      FLOATING_BALL_MATH_LEVELS[level] || FLOATING_BALL_MATH_LEVELS[1];
    this.equationGenerator = new EquationGenerator(this.currentLevelConfig);
    this.waterPhysics = new WaterPhysics(this, this.currentLevelConfig);
    this.ballSpawner = new BallSpawner(this);
    this.floatboatController = new FloatboatController(this);
    this.handController = new HandController(this);

    this.resetGameState();
  }

  resetGameState() {
    console.log("[FloatingBallMathGameScene] resetGameState called");
    this.cleanupBalls();
    this.cleanupShadowBalls();

    this.balls = [];
    this.currentEquation = {} as Equation;
    this.currentScore = 0; // Always start at 0
    this.collectedBalls = [];
    this.completedEquationResults = [];
    this.completedEquationStats = [];
    this.totalEquations = 0;
    this.correctEquations = 0;
    this.wrongEquations = 0;
    this.consecutiveErrors = 0;
    this.currentErrorRun = 0;
    this.repeatedErrors = 0;
    this.attempts = 0;
    this.isLocked = true;
    this.physicsEnabled = true;
    this.continuedAfterTimeout = false;
    this.isPaused = false;
    this.equationStartTime = 0;
    this.reactionTimes = [];
    this.ballsCollected = 0;
    this.successfulCollections = 0;
    this.ballsCollectedThisEquation = 0;
    this.shadowBalls = [];
    console.log("[FloatingBallMathGameScene] resetGameState completed - isLocked:", this.isLocked, "physicsEnabled:", this.physicsEnabled);
  }

  cleanupBalls() {
    this.balls.forEach((ball) => {
      if (ball && ball.container) {
        ball.container.removeAllListeners();
        ball.container.destroy();
      }
    });
    this.balls = [];
    this.handController.hideAllHands();
  }

  /**
   * Destroy all balls (used when resetting)
   */
  destroyAllBalls() {
    console.log("[FloatingBallMathGameScene] destroyAllBalls called");
    this.balls.forEach((ball) => {
      if (ball && ball.container) {
        ball.container.removeAllListeners();
        ball.container.destroy();
      }
    });
    this.balls = [];
    this.collectedBalls = [];
    this.currentScore = 0;
    console.log("[FloatingBallMathGameScene] destroyAllBalls completed");
  }

  /**
   * Spawn replacement balls with random operations
   * Called after balls are collected
   */
  spawnReplacementBalls() {
    console.log("[FloatingBallMathGameScene] spawnReplacementBalls called - adding new balls");
    const { width } = this.scale;
    const margin = 80;

    // Spawn replacement balls equal to number of collected balls
    const count = this.collectedBalls.length;
    
    for (let i = 0; i < count; i++) {
      const { min, max } = this.currentLevelConfig.operandRange;
      const operations = this.currentLevelConfig.operations;
      const value = min + Math.floor(Math.random() * (max - min + 1));
      const operator = operations[Math.floor(Math.random() * operations.length)];
      const color = this.equationGenerator.getRandomColor();
      
      // Random position - spawn from top with vertical spacing
      const x = margin + Math.random() * (width - margin * 2);
      const y = -100 - (i * 120)*2.5;

      const ball = this.ballSpawner.createBall(value, operator, color, x, y);

      // Store original position
      ball.originalX = x;
      ball.originalY = y;

      // Store operator
      ball.operator = operator;

      this.balls.push(ball);
    }
    console.log("[FloatingBallMathGameScene] spawnReplacementBalls completed - total balls:", this.balls.length);
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

  preload() {
    // Load colored ball images (placeholder - user will provide)
    this.load.image("ball-coral", "/assets/images/billiards/ball-1.png");
    this.load.image("ball-mint", "/assets/images/billiards/ball-2.png");
    this.load.image("ball-yellow", "/assets/images/billiards/ball-3.png");
    this.load.image("ball-lavender", "/assets/images/billiards/ball-4.png");

    // Load sounds (placeholder)
    this.load.audio("ball-collect", "/assets/sounds/billiards/ball-rattle.mp3");
    this.load.audio("success", "/assets/sounds/billiards/success.mp3");
    this.load.audio("error", "/assets/sounds/billiards/ball-rattle.mp3");
    this.load.audio("bomb", "/assets/sounds/billiards/ball-rattle.mp3"); // Reuse bomb sound
    this.load.audio("bg-music", "/assets/sounds/billiards/bg-music.mp3");
    this.load.audio("level-pass", "/assets/sounds/level-pass.mp3");
    this.load.audio("level-fail", "/assets/sounds/level-fail.mp3");
  }

  create() {
    console.log("[FloatingBallMathGameScene] create called");
    const { width, height } = this.scale;

    // Enable input for the scene
    this.input.enabled = true;

    // Create water background
    this.createWaterBackground();

    // Create floatboat at higher position (75% of screen height from top)
    const boatY = height * 0.75;
    this.floatboatController.createFloatboat(boatY);
    
    // Create movement hint arrows
    this.floatboatController.createMovementHints();

    // Create UI elements
    this.createUI();

    // Start the game
    this.startLevel();
    console.log("[FloatingBallMathGameScene] create completed, game started");

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
      this.soundBallCollect = this.sound.add("ball-collect", { volume: 0.5 });
      this.soundSuccess = this.sound.add("success", { volume: 0.8 });
      this.soundError = this.sound.add("error", { volume: 0.7 });
      this.soundBomb = this.sound.add("bomb", { volume: 0.8 });
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

  update(time: number, delta: number) {
    // Update floatboat movement
    this.floatboatController.handleKeyboardMovement(delta);
    
    // Update movement hints
    this.floatboatController.updateMovementHints();

    // Check for ball collisions with floatboat
    if (!this.isLocked && !this.isPaused && this.physicsEnabled) {
      this.checkBallCollisions();
      this.checkBallCount();
    }

    // Update water overlay animation
    if (this.waterOverlay) {
      this.waterPhysics.updateWaterOverlay(this.waterOverlay);
    }

    // Update ball positions with water physics - only check physicsEnabled, not isLocked
    if (!this.isPaused && this.physicsEnabled) {
      // Get boat position for dynamic speed calculation
      const floatboat = this.floatboatController.getFloatboat();
      
      // Filter out destroyed balls to prevent null reference errors
      const activeBalls = this.balls.filter(ball => ball && ball.container && !ball.isCollected);
      
      activeBalls.forEach((ball) => {
        // Calculate distance to boat and adjust speed
        let speedMultiplier = 1.0;
        if (floatboat) {
          const distance = Math.sqrt(
            Math.pow(ball.x - floatboat.x, 2) +
            Math.pow(ball.y - floatboat.y, 2)
          );

          // Speed curve: balls fall fast at top, slow near boat
          // 0px distance = 0.3x, 600px = 1.0x speed
          const maxDistance = 600;
          const speedMultiplier = Math.min(1.0, 0.3 + (distance / maxDistance) * 0.7);
        }

        // Apply speed multiplier to physics
        const adjustedDelta = delta * speedMultiplier;
        this.waterPhysics.updateBall(ball, adjustedDelta);

        // Update container position
        if (ball.container) {
          ball.container.setPosition(ball.x, ball.y);
        }

        // Check if ball needs respawn
        if (this.waterPhysics.shouldRespawn(ball)) {
          const newX = this.waterPhysics.getRandomSpawnX();
          const newY = -100;
          this.waterPhysics.respawnBall(ball, newX, newY);
        }
      });
    }

    // Update timer
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

  /**
   * Check for collisions between balls and floatboat
   */
  checkBallCollisions() {
    const floatboat = this.floatboatController.getFloatboat();
    if (!floatboat) return;

    this.balls.forEach((ball) => {
      if (ball.isCollected || !ball.container) return; // Skip collected or destroyed balls

      const ballDistance = Math.sqrt(
        Math.pow(ball.x - floatboat.x, 2) + 
        Math.pow(ball.y - floatboat.y, 2)
      );

      // Check if ball is "bad" - would cause equation to fail
      let isBadBall = false;
      if (!ball.isBomb) {
        // Calculate if this operation would be bad
        let newScore = this.currentScore;
        switch (ball.operator) {
          case '+':
            newScore += ball.value;
            break;
          case '-':
            newScore -= ball.value;
            break;
          case '*':
            newScore *= ball.value;
            break;
          case '/':
            if (ball.value !== 0) {
              newScore = Math.round(newScore / ball.value);
            }
            break;
        }
        
        // Ball is bad if it would exceed target or go negative
        isBadBall = newScore < 0 || newScore > this.currentEquation.target * 2;
      }

      // Check if bomb ball is close - trigger warning hand
      if (ball.isBomb) {
        // If bomb is within 200px of boat and no hand active
        if (ballDistance < 200 && !this.handController.isHandActive(ball.id)) {
          this.handController.showWarningHand(ball);
        }
      } else if (isBadBall) {
        // If bad ball is within 200px of boat and no hand active
        if (ballDistance < 200 && !this.handController.isHandActive(ball.id)) {
          this.handController.showWarningHand(ball);
        }
      } else {
        // Normal ball collision check
        const ballRadius = 40; // Approximate radius
        const isColliding = this.floatboatController.checkCollision(
          ball.x,
          ball.y,
          ballRadius
        );

        if (isColliding) {
          this.collectBall(ball);
        }
      }
    });
    
    // Check bomb ball collisions separately
    this.checkBombCollisions();
  }

  /**
   * Check for bomb ball collisions
   */
  checkBombCollisions() {
    const floatboat = this.floatboatController.getFloatboat();
    if (!floatboat) return;

    this.balls.forEach((ball) => {
      if (!ball.isBomb || ball.isCollected || !ball.container) return;

      const ballRadius = 40;
      const isColliding = this.floatboatController.checkCollision(
        ball.x,
        ball.y,
        ballRadius
      );

      if (isColliding) {
        this.collectBall(ball);
      }
    });
  }

  /**
   * Check ball count and replenish if needed
   */
  checkBallCount() {
    const activeBalls = this.balls.filter(b => !b.isCollected && b.container);
    
    if (activeBalls.length < this.minBallCount) {
      const ballsNeeded = this.minBallCount - activeBalls.length;
      this.spawnOperationBalls(ballsNeeded);
    }
  }

  /**
   * Handle ball collection by floatboat
   */
  async collectBall(ball: FloatingBall) {
    console.log(`[FloatingBallMathGameScene] Ball collected - id: ${ball.id}, operator: ${ball.operator}, value: ${ball.value}`);
    
    // Check if bomb ball
    if (ball.isBomb) {
      await this.handleBombCollision(ball);
      return;
    }
    
    // Mark ball as collected
    ball.isCollected = true;
    this.collectedBalls.push(ball);
    this.ballsCollected++;
    this.ballsCollectedThisEquation++;

    // Play collect sound
    if (this.soundBallCollect) {
      this.soundBallCollect.play();
    }

    // Animate boat collection
    await this.floatboatController.animateCollection();

    // Apply operation to current score
    this.applyOperation(ball);

    // Destroy ball
    if (ball.container) {
      ball.container.destroy();
      ball.container = null;
    }

    // Remove from active balls array
    this.balls = this.balls.filter(b => b.id !== ball.id);

    // Check if target reached
    if (this.currentScore === this.currentEquation.target) {
      this.handleSuccess();
    } else if (this.currentScore < 0 || this.currentScore > this.currentEquation.target * 2) {
      // Overshot or went negative - give option to reset
      this.handleOvershoot();
    }
  }

  /**
   * Handle bomb ball collision - game over for equation
   */
  async handleBombCollision(ball: FloatingBall) {
    console.log(`[FloatingBallMathGameScene] BOMB HIT! - id: ${ball.id}`);
    
    // Mark bomb as collected and count as wrong equation
    ball.isCollected = true;
    this.wrongEquations++;
    this.totalEquations++;

    // Play bomb sound
    if (this.soundBomb) {
      this.soundBomb.play();
    }

    // Shake screen
    this.cameras.main.shake(500, 0.02);

    // Flash red
    const flash = this.add.graphics();
    flash.fillStyle(0xFF0000, 0.5);
    flash.fillRect(0, 0, this.scale.width, this.scale.height);
    flash.setDepth(1000);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        flash.destroy();
      },
    });

    // Destroy bomb
    if (ball.container) {
      ball.container.destroy();
      ball.container = null;
    }

    // Remove from active balls array
    this.balls = this.balls.filter(b => b.id !== ball.id);

    // Wait then reset equation
    this.time.delayedCall(1500, () => {
      this.resetEquation();
    });
  }

  /**
   * Apply operation from collected ball to current score
   */
  applyOperation(ball: FloatingBall) {
    const oldValue = this.currentScore;
    
    switch (ball.operator) {
      case '+':
        this.currentScore += ball.value;
        break;
      case '-':
        this.currentScore -= ball.value;
        break;
      case '*':
        this.currentScore *= ball.value;
        break;
      case '/':
        if (ball.value !== 0) {
          this.currentScore = Math.round(this.currentScore / ball.value);
        }
        break;
    }

    console.log(`[FloatingBallMathGameScene] Applied operation: ${oldValue} ${ball.operator} ${ball.value} = ${this.currentScore}`);
    this.updateCurrentDisplay();
  }

  createWaterBackground() {
    const { width, height } = this.scale;

    // Create gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE3F2FD, 0xE3F2FD, 0xBBDEFB, 0xBBDEFB, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-2);

    // Create water wave overlay
    this.waterOverlay = this.waterPhysics.createWaterOverlay();
  }

  createUI() {
    const { width, height } = this.scale;

    // Target display (left side)
    this.targetDisplay = this.add.container(width * 0.25, height * 0.12);

    const targetBg = this.add.graphics();
    targetBg.fillStyle(0x42A5F5, 1);
    targetBg.fillRoundedRect(-70, -40, 140, 80, 15);

    const targetLabel = this.add.text(0, -25, "เป้าหมาย", {
      fontFamily: "Sarabun, sans-serif",
      fontSize: `${Math.min(16, width * 0.03)}px`,
      color: "#FFFFFF",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.targetText = this.add.text(0, 10, "0", {
      fontFamily: "Arial, sans-serif",
      fontSize: `${Math.min(48, width * 0.08)}px`,
      color: "#FFFFFF",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.targetDisplay.add([targetBg, targetLabel, this.targetText]);

    // Current display (right side)
    this.currentDisplay = this.add.container(width * 0.75, height * 0.12);

    const currentBg = this.add.graphics();
    currentBg.fillStyle(0x4CAF50, 1);
    currentBg.fillRoundedRect(-70, -40, 140, 80, 15);

    const currentLabel = this.add.text(0, -25, "ปัจจุบัน", {
      fontFamily: "Sarabun, sans-serif",
      fontSize: `${Math.min(16, width * 0.03)}px`,
      color: "#FFFFFF",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.currentText = this.add.text(0, 10, "0", {
      fontFamily: "Arial, sans-serif",
      fontSize: `${Math.min(48, width * 0.08)}px`,
      color: "#FFFFFF",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.currentDisplay.add([currentBg, currentLabel, this.currentText]);

    // Timer bar
    this.customTimerBar = this.add.graphics();
    this.customTimerBar.setVisible(false);

    // Create shadow ball progress tracker
    this.createShadowBallTracker();
  }

  createShadowBallTracker() {
    const { width, height } = this.scale;

    const totalBalls = this.currentLevelConfig.totalEquations;
    const ballSpacing = Math.min(45, width * 0.08);
    const y = height - Math.min(100, height * 0.15);

    this.shadowBallContainer = this.add.container(width / 2, y);

    const startX = (-(totalBalls - 1) * ballSpacing) / 2;

    for (let i = 0; i < totalBalls; i++) {
      const shadowBall = this.createShadowBall(i);
      shadowBall.setPosition(startX + i * ballSpacing, 0);
      this.shadowBalls.push(shadowBall);
      this.shadowBallContainer.add(shadowBall);
    }

    this.updateShadowBallDisplay();
  }

  createShadowBall(index: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const { width } = this.scale;

    const ballRadius = Math.min(25, width * 0.05);
    const shadowOffset = ballRadius * 0.1;

    const shadow = this.add
      .circle(shadowOffset, shadowOffset, ballRadius, 0x000000, 0.3)
      .setOrigin(0.5);

    const ball = this.add
      .circle(0, 0, ballRadius, 0xcccccc)
      .setStrokeStyle(2, 0x666666);

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
    container.setSize(ballRadius * 2, ballRadius * 2);

    return container;
  }

  updateShadowBallDisplay() {
    const { width } = this.scale;

    this.shadowBalls.forEach((shadowBall, index) => {
      const text = shadowBall.getAt(2) as Phaser.GameObjects.Text;
      const ball = shadowBall.getAt(1) as Phaser.GameObjects.Arc;

      if (index < this.completedEquationResults.length) {
        const result = this.completedEquationResults[index];
        shadowBall.removeAll(true);

        const ballRadius = Math.min(30, width * 0.06);
        const bg = this.add.graphics();
        bg.fillStyle(0x42A5F5, 1);
        bg.fillCircle(0, 0, ballRadius);

        const resultText = this.add
          .text(0, 0, result.toString(), {
            fontFamily: "Arial, sans-serif",
            fontSize: `${Math.min(24, width * 0.05)}px`,
            color: "#ffffff",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        shadowBall.add([bg, resultText]);

        this.tweens.add({
          targets: shadowBall,
          scale: { from: 0.8, to: 1 },
          duration: 300,
          ease: "Back.easeOut",
        });
      } else {
        text.setText("?");
        text.setColor("#ffffff");
        ball.setFillStyle(0xcccccc);
      }
    });
  }

  trackCompletedEquation(result: number) {
    this.completedEquationResults.push(result);
    this.updateShadowBallDisplay();
  }

  /**
   * Update the current display
   */
  updateCurrentDisplay() {
    this.currentText.setText(this.currentScore.toString());

    // Pulse animation on change
    this.tweens.add({
      targets: this.currentDisplay,
      scale: { from: 1, to: 1.15 },
      duration: 150,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  startLevel() {
    console.log("[FloatingBallMathGameScene] startLevel called");
    this.levelStartTime = Date.now();
    this.equationGenerator.reset();
    
    // Spawn initial operation balls
    const initialBallCount = 8; // Start with 8 balls for good variety
    this.spawnOperationBalls(initialBallCount);
    
    // Now generate equation
    this.generateNewEquation();
    this.isLocked = false;
    this.physicsEnabled = true;
    this.startTime = Date.now();
    this.startTimer();
    console.log("[FloatingBallMathGameScene] startLevel completed - isLocked:", this.isLocked, "physicsEnabled:", this.physicsEnabled);
  }

  /**
   * Spawn operation balls with random values and operators
   * Balls are equally spaced horizontally for better gameplay
   */
  spawnOperationBalls(count: number) {
    console.log(`[FloatingBallMathGameScene] spawnOperationBalls called - adding ${count} new balls`);
    const { width } = this.scale;
    const margin = 80;

    // Calculate equal horizontal spacing
    const availableWidth = width - (margin * 2);
    const spacing = availableWidth / (count - 1);

    for (let i = 0; i < count; i++) {
      const { min, max } = this.currentLevelConfig.operandRange;
      const operations = this.currentLevelConfig.operations;
      const value = min + Math.floor(Math.random() * (max - min + 1));
      const operator = operations[Math.floor(Math.random() * operations.length)];
      const color = this.equationGenerator.getRandomColor();
      
      // Equal horizontal spacing with vertical offset
      const x = margin + Math.random() * (width - margin * 2);
      const y = -100 - (i * 120);

      let ball: FloatingBall;
      if (Math.random() < 0.15) { // 15% chance to spawn bomb ball
        ball = this.ballSpawner.createBombBall(value, operator, x, y);
      } else {
        ball = this.ballSpawner.createBall(value, operator, color, x, y);
      }

      // Store original position
      ball.originalX = x;
      ball.originalY = y;

      this.balls.push(ball);
    }
    console.log(`[FloatingBallMathGameScene] spawnOperationBalls completed - total balls: ${this.balls.length}`);
  }

  generateNewEquation() {
    console.log("[FloatingBallMathGameScene] generateNewEquation called");
    try {
      // Generate equation
      this.currentEquation = this.equationGenerator.generateEquation();
      this.equationStartTime = Date.now();
      console.log("[FloatingBallMathGameScene] New equation:", this.currentEquation);

      // Reset ball count for this equation
      this.ballsCollectedThisEquation = 0;

      // Update displays
      this.updateTargetDisplay();
      this.currentScore = 0; // Always start at 0
      this.updateCurrentDisplay();
      console.log("[FloatingBallMathGameScene] generateNewEquation completed");
    } catch (error) {
      console.error("[FloatingBallMathGameScene] ERROR in generateNewEquation:", error);
    }
  }

  updateTargetDisplay() {
    this.targetText.setText(this.currentEquation.target.toString());

    // Pulse animation
    this.tweens.add({
      targets: this.targetDisplay,
      scale: { from: 1, to: 1.1 },
      duration: 200,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  /**
   * Handle successful completion of equation
   */
  async handleSuccess() {
    console.log("[FloatingBallMathGameScene] handleSuccess called - target reached!");
    this.correctEquations++;
    this.totalEquations++;
    this.successfulCollections++;
    this.currentErrorRun = 0;
    if (this.soundSuccess) {
      this.soundSuccess.play();
    }

    // Track completed equation with ball count
    this.completedEquationStats.push({
      target: this.currentEquation.target,
      ballsCollected: this.ballsCollectedThisEquation
    });

    // Track completed equation for UI
    this.trackCompletedEquation(this.currentEquation.target);

    // Animate success
    this.tweens.add({
      targets: [this.targetDisplay, this.currentDisplay],
      scale: 1.2,
      duration: 200,
      yoyo: true,
      ease: "Back.easeOut",
    });

    // Wait then replace balls and generate new equation
    this.time.delayedCall(1500, () => {
      this.replaceBallsAndContinue();
    });
  }

  /**
   * Handle overshoot (current value went beyond target or negative)
   */
  async handleOvershoot() {
    console.log("[FloatingBallMathGameScene] handleOvershoot called");
    this.wrongEquations++;
    this.totalEquations++;
    this.currentErrorRun++;
    if (this.currentErrorRun > this.consecutiveErrors) {
      this.consecutiveErrors = this.currentErrorRun;
    }
    this.repeatedErrors++;
    if (this.soundError) {
      this.soundError.play();
    }

    // Shake current display
    this.tweens.add({
      targets: this.currentDisplay,
      x: "+=10",
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: "Power2.easeInOut",
    });

    // Wait then reset
    this.time.delayedCall(1500, () => {
      this.resetEquation();
    });
  }

  /**
   * Replace collected balls with new ones and continue to next equation
   */
  replaceBallsAndContinue() {
    console.log("[FloatingBallMathGameScene] replaceBallsAndContinue called");

    // Spawn new replacement balls
    this.spawnReplacementBalls();

    // Reset collection state
    this.collectedBalls = [];

    // Clear feedback from all balls
    this.balls.forEach((ball) => {
      ball.isCollected = false;
    });

    // Check if level complete
    if (this.totalEquations >= this.currentLevelConfig.totalEquations) {
      console.log("[FloatingBallMathGameScene] Level complete, ending level");
      this.endLevel();
      return;
    }

    // Generate new equation
    try {
      this.currentEquation = this.equationGenerator.generateEquation();
      this.equationStartTime = Date.now();
      console.log("[FloatingBallMathGameScene] New equation:", this.currentEquation);

      this.updateTargetDisplay();
      this.currentScore = 0; // Always start at 0
      this.updateCurrentDisplay();
      console.log("[FloatingBallMathGameScene] replaceBallsAndContinue completed");
    } catch (error) {
      console.error("[FloatingBallMathGameScene] ERROR in replaceBallsAndContinue:", error);
    }

    // Unlock for next collection
    this.isLocked = false;
  }

  /**
   * Reset current equation (when overshoot occurs)
   */
  resetEquation() {
    console.log("[FloatingBallMathGameScene] resetEquation called");

    // Reset current score to 0
    this.currentScore = 0;
    this.updateCurrentDisplay();

    // Reset collected balls
    this.collectedBalls = [];
    this.balls.forEach((ball) => {
      ball.isCollected = false;
    });

    // Unlock for next collection
    this.isLocked = false;
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
    const y = height - Math.min(60, height * 0.1);

    // Background
    this.customTimerBar.fillStyle(0x90CAF9, 0.2);
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

    // Calculate average reaction time
    const avgReactionTime =
      this.reactionTimes.length > 0
        ? this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length
        : 0;

    const stars = this.calculateStars(totalTime, avgReactionTime);
    const gameStats: GameStats = {
      levelPlayed: this.currentLevelConfig.level,
      difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
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
      averageReactionTime: avgReactionTime,
      mismatchCorrect: this.successfulCollections,
      mismatchAttempts: this.ballsCollected,
    } as any;

    const onGameOver = this.registry.get("onGameOver");
    console.log(
      "[FloatingBallMathGameScene] onGameOver callback from registry:",
      !!onGameOver
    );

    if (onGameOver) {
      const finalData = {
        success: true,
        stars,
        ...gameStats,
      };

      try {
        onGameOver(finalData);
      } catch (error) {
        console.error(
          "[FloatingBallMathGameScene] Error in onGameOver callback:",
          error
        );
      }
    }

    // Play end game sound
    if (stars >= 1) {
      if (this.soundLevelPass) {
        this.soundLevelPass.play();
      }
    } else {
      if (this.soundLevelFail) {
        this.soundLevelFail.play();
      }
    }

    if (this.bgMusic && this.bgMusic.isPlaying) {
      this.bgMusic.pause();
    }
  }

  calculateStars(totalTime: number, avgReactionTime: number): number {
    if (this.continuedAfterTimeout) {
      return 1;
    }

    const averageTimePerEquation = totalTime / this.totalEquations;
    const averageTimeSeconds = averageTimePerEquation / 1000;
    const accuracy = this.totalEquations > 0 
      ? (this.correctEquations / this.totalEquations) * 100 
      : 0;

    const timeRequirement = this.currentLevelConfig.starRequirements.threeStars;
    const timePercentage = timeRequirement > 0 
      ? (averageTimeSeconds / timeRequirement) * 100 
      : 100;

    // Check if * and / are in operations (hardest level)
    const hasMultiplication = this.currentLevelConfig.operations.includes('*');
    const hasDivision = this.currentLevelConfig.operations.includes('/');
    const isHardestLevel = hasMultiplication || hasDivision;

    // Check if it's a starter level (only - and +)
    const hasOtherOps = this.currentLevelConfig.operations.some(op => 
      op !== '-' && op !== '+'
    );
    const isStarterLevel = !hasOtherOps;

    // PERFECT PERFORMANCE: 100% accuracy AND ≤3 balls per equation
    const perfectPerformance = accuracy === 100 && this.completedEquationStats.every(
      stat => stat.ballsCollected <= 3
    );

    // HIGHEST DIFFICULTY BONUS: 100% accuracy AND complete in time
    const allPerfectInTime = accuracy === 100 && timePercentage <= 100;

    // HARDEST LEVEL BONUS: 2 stars for 100% accuracy, efficient gameplay
    if (isHardestLevel && perfectPerformance) {
      console.log(`[FloatingBallMathGameScene] Hardest level bonus: 2 stars (100% accuracy, ≤3 balls/equation)`);
      return 2;
    }

    // STARTER LEVEL BONUS: 3 stars for 100% accuracy, efficient gameplay
    if (isStarterLevel && perfectPerformance) {
      console.log(`[FloatingBallMathGameScene] Starter level bonus: 3 stars (100% accuracy, ≤3 balls/equation)`);
      return 3;
    }

    // 3 STARS: Less than 80% of time requirement AND accuracy >= 85%
    if (timePercentage < 80 && accuracy >= 85) {
      console.log(`[FloatingBallMathGameScene] Awarded 3 stars (speed + accuracy)`);
      return 3;
    }

    // 2 STARS: Complete within time requirement AND accuracy >= 50%
    if (accuracy >= 50) {
      console.log(`[FloatingBallMathGameScene] Awarded 2 stars`);
      return 2;
    }

    // 1 STAR: Complete level regardless of accuracy
    console.log(`[FloatingBallMathGameScene] Awarded 1 star`);
    return 1;
  }

  resumeGame(applyPenalty: boolean) {
    this.isPaused = false;
    this.input.enabled = true;

    if (applyPenalty) {
      this.continuedAfterTimeout = true;

      if (this.customTimerBar) {
        this.customTimerBar.setVisible(false);
      }

      if (this.timerEvent) {
        this.timerEvent.remove();
      }

      this.game.events.emit("timer-update", {
        remaining: this.currentLevelConfig.timeLimitSeconds,
        total: this.currentLevelConfig.timeLimitSeconds,
      });
    }
  }

  layoutGame() {
    const { width, height } = this.scale;

    if (this.targetDisplay) {
      this.targetDisplay.setPosition(width * 0.25, height * 0.12);
    }

    if (this.currentDisplay) {
      this.currentDisplay.setPosition(width * 0.75, height * 0.12);
    }

    if (this.shadowBallContainer) {
      const y = height - Math.min(100, height * 0.15);
      this.shadowBallContainer.setPosition(width / 2, y);
    }

    if (this.customTimerBar && this.customTimerBar.visible) {
      this.drawTimerBar(this.lastTimerPct);
    }
  }
}
