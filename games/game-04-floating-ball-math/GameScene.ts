import * as Phaser from "phaser";
import { FLOATING_BALL_MATH_LEVELS } from "./levels";
import { EquationGenerator } from "./utils/EquationGenerator";
import { WaterPhysics } from "./utils/WaterPhysics";
import { BallSpawner } from "./utils/BallSpawner";
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

  // Game State
  private balls: FloatingBall[] = [];
  private currentEquation!: Equation;
  private selectedBalls: FloatingBall[] = [];
  private completedEquationResults: number[] = [];
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

  // Reaction Time Tracking
  private reactionTimes: number[] = [];
  private mismatchCorrect = 0;
  private mismatchAttempts = 0;

  // Timer
  private timerEvent!: Phaser.Time.TimerEvent;
  private customTimerBar!: Phaser.GameObjects.Graphics;
  private lastTimerPct: number = 100;

  // UI Elements
  private targetDisplay!: Phaser.GameObjects.Container;
  private targetText!: Phaser.GameObjects.Text;
  private operationText!: Phaser.GameObjects.Text;
  private operationBg!: Phaser.GameObjects.Graphics;
  private selectionCounter!: Phaser.GameObjects.Text;
  private shadowBallContainer!: Phaser.GameObjects.Container;
  private shadowBalls: Phaser.GameObjects.Container[] = [];
  private waterOverlay!: Phaser.GameObjects.Graphics;

  // Audio
  private bgMusic!: Phaser.Sound.BaseSound;
  private soundBallClick!: Phaser.Sound.BaseSound;
  private soundSuccess!: Phaser.Sound.BaseSound;
  private soundError!: Phaser.Sound.BaseSound;
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

    this.resetGameState();
  }

  resetGameState() {
    console.log("[FloatingBallMathGameScene] resetGameState called");
    this.cleanupBalls();
    this.cleanupShadowBalls();

    this.balls = [];
    this.currentEquation = {} as Equation;
    this.selectedBalls = [];
    this.completedEquationResults = [];
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
    this.mismatchCorrect = 0;
    this.mismatchAttempts = 0;
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
  }

  /**
   * Destroy only the selected balls (not all balls)
   * Used when player selects the correct answer
   */
  destroySelectedBalls() {
    console.log("[FloatingBallMathGameScene] destroySelectedBalls called - removing selected balls");
    this.selectedBalls.forEach((ball) => {
      if (ball && ball.container) {
        ball.container.removeAllListeners();
        ball.container.destroy();
      }
    });
    
    // Remove selected balls from the balls array
    this.balls = this.balls.filter(ball => !this.selectedBalls.includes(ball));
    console.log("[FloatingBallMathGameScene] destroySelectedBalls completed - remaining balls:", this.balls.length);
  }

  /**
   * Spawn replacement balls with random values and positions
   * Called after correct balls are destroyed
   */
  spawnReplacementBalls() {
    console.log("[FloatingBallMathGameScene] spawnReplacementBalls called - adding 2 new balls");
    const { width, height } = this.scale;
    const margin = 80;

    // Spawn 2 replacement balls with random values and positions
    for (let i = 0; i < 2; i++) {
      const { min, max } = this.currentLevelConfig.operandRange;
      const value = min + Math.floor(Math.random() * (max - min + 1));
      const color = this.equationGenerator.getRandomColor();
      
      // Random position - spawn from top with increased vertical spacing
      const x = margin + Math.random() * (width - margin * 2);
      const y = -100 - (i * 120); // Increased spacing from 60px to 120px

      const ball = this.ballSpawner.createReplacementBall(value, color, x, y);

      // Store original position
      ball.originalX = x;
      ball.originalY = y;

      // Add click handler
      if (ball.container) {
        ball.container.on("pointerdown", () => {
          this.handleBallClick(ball);
        });
      }

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
    this.load.audio("ball-click", "/assets/sounds/billiards/ball-rattle.mp3");
    this.load.audio("success", "/assets/sounds/billiards/success.mp3");
    this.load.audio("error", "/assets/sounds/billiards/ball-rattle.mp3");
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
      this.soundBallClick = this.sound.add("ball-click", { volume: 0.5 });
      this.soundSuccess = this.sound.add("success", { volume: 0.8 });
      this.soundError = this.sound.add("error", { volume: 0.7 });
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
    // Update water overlay animation
    if (this.waterOverlay) {
      this.waterPhysics.updateWaterOverlay(this.waterOverlay);
    }

    // Update ball positions with water physics - only check physicsEnabled, not isLocked
    if (!this.isPaused && this.physicsEnabled) {
      // Filter out destroyed balls to prevent null reference errors
      const activeBalls = this.balls.filter(ball => ball && ball.container);
      
      activeBalls.forEach((ball) => {
        this.waterPhysics.updateBall(ball, delta);

        // Update container position
        if (ball.container) {
          ball.container.setPosition(ball.x, ball.y);
        }

        // Check if ball needs respawn
        if (this.waterPhysics.shouldRespawn(ball)) {
          // console.log(`[FloatingBallMathGameScene] Ball ${ball.id} needs respawn at ${ball.x}, ${ball.y}`);
          const newX = this.waterPhysics.getRandomSpawnX();
          const newY = -100;
          this.waterPhysics.respawnBall(ball, newX, newY);
          // console.log(`[FloatingBallMathGameScene] Ball ${ball.id} respawned to ${newX}, ${newY}`);
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

    // Target display (top center)
    this.targetDisplay = this.add.container(width / 2, height * 0.12);

    const targetBg = this.add.graphics();
    targetBg.fillStyle(0x42A5F5, 1);
    targetBg.fillRoundedRect(-70, -40, 140, 80, 15);

    this.targetText = this.add.text(0, 0, "0", {
      fontFamily: "Arial, sans-serif",
      fontSize: `${Math.min(48, width * 0.08)}px`,
      color: "#FFFFFF",
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Create attractive operation symbol background
    const opRadius = Math.min(28, width * 0.05);
    this.operationBg = this.add.graphics();
    this.operationBg.fillStyle(0xFFC107, 1); // Golden yellow
    this.operationBg.fillCircle(50, 0, opRadius);
    this.operationBg.lineStyle(3, 0xFFF59D, 0.8); // Lighter yellow glow
    this.operationBg.strokeCircle(50, 0, opRadius);
    this.operationBg.lineStyle(2, 0xFFFFFF, 0.6); // White glow
    this.operationBg.strokeCircle(50, 0, opRadius - 3);

    this.operationText = this.add.text(50, 0, "+", {
      fontFamily: "Arial, sans-serif",
      fontSize: `${Math.min(36, width * 0.06)}px`,
      color: "#1565C0",
      fontStyle: "bold",
      shadow: {
        offsetX: 1,
        offsetY: 1,
        blur: 2,
        color: "#FFFFFF",
        fill: true,
      },
    }).setOrigin(0.5);

    this.targetDisplay.add([targetBg, this.targetText, this.operationBg, this.operationText]);

    // Selection counter (below target)
    this.selectionCounter = this.add
      .text(width / 2, height * 0.22, "เลือก 0/2", {
        fontFamily: "Sarabun, sans-serif",
        fontSize: `${Math.min(24, width * 0.04)}px`,
        color: "#2c3e50",
        stroke: "#FFFFFF",
        strokeThickness: 2,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

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

  startLevel() {
    console.log("[FloatingBallMathGameScene] startLevel called");
    this.levelStartTime = Date.now();
    this.equationGenerator.reset();
    
    // Spawn initial balls BEFORE generating equation to avoid crash
    const initialBallCount = 6; // Start with 6 balls for good variety
    this.spawnAdditionalBalls(initialBallCount);
    
    // Now generate equation using available balls
    this.generateNewEquation();
    this.isLocked = false;
    this.physicsEnabled = true;
    this.startTime = Date.now();
    this.startTimer();
    console.log("[FloatingBallMathGameScene] startLevel completed - isLocked:", this.isLocked, "physicsEnabled:", this.physicsEnabled);
  }

  generateNewEquation() {
    console.log("[FloatingBallMathGameScene] generateNewEquation called");
    try {
      // Extract available ball values
      const availableValues = this.balls.map(ball => ball.value);
      console.log("[FloatingBallMathGameScene] Available ball values:", availableValues);

      // Generate equation based on available balls
      this.currentEquation = this.equationGenerator.generateEquationWithBalls(availableValues);
      this.equationStartTime = Date.now();
      console.log("[FloatingBallMathGameScene] New equation:", this.currentEquation);

      // Update only the target display (balls are already spawned)
      this.updateTargetDisplay();
      console.log("[FloatingBallMathGameScene] generateNewEquation completed");
    } catch (error) {
      console.error("[FloatingBallMathGameScene] ERROR in generateNewEquation:", error);
      // If we can't generate an equation with available balls, spawn new balls and try again
      console.log("[FloatingBallMathGameScene] Falling back to spawning new balls");
      this.handleEquationGenerationFallback();
    }
  }

  /**
   * Handle fallback when we can't generate an equation with available balls
   * This can happen if: 1) Not enough balls, 2) No valid pairs exist
   */
  private handleEquationGenerationFallback() {
    console.log("[FloatingBallMathGameScene] handleEquationGenerationFallback called");
    
    // Check if we have enough balls (need at least 4 for the equation to be solvable)
    if (this.balls.length < 4) {
      // Spawn additional balls to ensure we have enough options
      const ballsNeeded = Math.max(4, this.balls.length + 2) - this.balls.length;
      console.log("[FloatingBallMathGameScene] Not enough balls, spawning additional ones");
      this.spawnAdditionalBalls(ballsNeeded);
    }

    // Try again with the traditional method (spawn all balls for the equation)
    try {
      this.currentEquation = this.equationGenerator.generateEquation();
      this.equationStartTime = Date.now();
      console.log("[FloatingBallMathGameScene] Fallback equation generated:", this.currentEquation);
      
      this.updateTargetDisplay();
      this.spawnBalls();
    } catch (error) {
      console.error("[FloatingBallMathGameScene] ERROR in fallback equation generation:", error);
      this.isLocked = false;
    }
  }

  /**
   * Spawn additional balls without clearing existing ones
   * @param count - Number of balls to spawn
   */
  private spawnAdditionalBalls(count: number) {
    console.log(`[FloatingBallMathGameScene] spawnAdditionalBalls called - adding ${count} new balls`);
    const { width, height } = this.scale;
    const margin = 80;

    for (let i = 0; i < count; i++) {
      const { min, max } = this.currentLevelConfig.operandRange;
      const value = min + Math.floor(Math.random() * (max - min + 1));
      const color = this.equationGenerator.getRandomColor();
      
      // Random position - spawn from top with increased vertical spacing
      const x = margin + Math.random() * (width - margin * 2);
      const y = -100 - (i * 120 * 2); // Increased spacing from 60px to 120px

      const ball = this.ballSpawner.createBall(value, color, x, y);

      // Store original position
      ball.originalX = x;
      ball.originalY = y;

      // Add click handler
      if (ball.container) {
        ball.container.on("pointerdown", () => {
          this.handleBallClick(ball);
        });
      }

      this.balls.push(ball);
    }
    console.log(`[FloatingBallMathGameScene] spawnAdditionalBalls completed - total balls: ${this.balls.length}`);
  }

  updateTargetDisplay() {
    this.targetText.setText(this.currentEquation.target.toString());

    const operationDisplay = {
      "+": "+",
      "-": "-",
      "*": "×",
      "/": "÷",
    };
    const operation = operationDisplay[this.currentEquation.operation];
    this.operationText.setText(operation);

    // Update operation background color based on operation
    const { width } = this.scale;
    const opRadius = Math.min(28, width * 0.05);
    
    // Clear and redraw operation background
    if (this.operationBg) {
      this.operationBg.clear();
      
      // Choose color based on operation
      let bgColor = 0xFFC107; // Golden yellow (default for +)
      let textColor = "#1565C0"; // Blue (default for +)
      
      if (this.currentEquation.operation === "*") {
        bgColor = 0x9C27B0; // Purple for multiplication
        textColor = "#FFFFFF"; // White text for better contrast
      }
      
      // Fill circle
      this.operationBg.fillStyle(bgColor, 1);
      this.operationBg.fillCircle(50, 0, opRadius);
      
      // Add glow effects
      this.operationBg.lineStyle(3, this.lightenColor(bgColor, 40), 0.8);
      this.operationBg.strokeCircle(50, 0, opRadius);
      this.operationBg.lineStyle(2, 0xFFFFFF, 0.6); // White glow
      this.operationBg.strokeCircle(50, 0, opRadius - 3);
      
      // Update text color
      this.operationText.setColor(textColor);
    }

    // Pulse animation
    this.tweens.add({
      targets: this.targetDisplay,
      scale: { from: 1, to: 1.1 },
      duration: 200,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  // Helper to lighten a hex color
  private lightenColor(color: number, percent: number): number {
    const num = color >>> 0;
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return 0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
           (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
           (B < 255 ? B < 1 ? 0 : B : 255);
  }

  spawnBalls() {
    this.cleanupBalls();

    const { width, height } = this.scale;
    const startY = -100;
    const margin = 80;

    // Spawn balls with random x positions
    this.currentEquation.allNumbers.forEach((value, index) => {
      const x = margin + Math.random() * (width - margin * 2);
      const y = startY - (index * 120*2); // Increased spacing from 60px to 120px
      const color = this.equationGenerator.getRandomColor();

      const ball = this.ballSpawner.createBall(value, color, x, y);

      // Store original position
      ball.originalX = x;
      ball.originalY = y;

      // Add click handler
      if (ball.container) {
        ball.container.on("pointerdown", () => {
          this.handleBallClick(ball);
        });
      }

      this.balls.push(ball);
    });
  }

  handleBallClick(ball: FloatingBall) {
    if (this.isLocked) {
      console.log("[FloatingBallMathGameScene] Click blocked - isLocked:", this.isLocked);
      return;
    }
    console.log(`[FloatingBallMathGameScene] Ball clicked - id: ${ball.id}, value: ${ball.value}`);

    // Check if ball is already selected
    if (this.selectedBalls.includes(ball)) {
      // Deselect
      this.deselectBall(ball);
      return;
    }

    // Check if already have 2 selected
    if (this.selectedBalls.length >= 2) return;

    // Select ball
    this.selectBall(ball);

    // Check if 2 balls selected
    if (this.selectedBalls.length === 2) {
      this.checkAnswer();
    }
  }

  selectBall(ball: FloatingBall) {
    this.selectedBalls.push(ball);
    ball.isSelected = true;
    console.log(`[FloatingBallMathGameScene] Ball selected - id: ${ball.id}, total selected: ${this.selectedBalls.length}`);

    // Highlight ball
    this.ballSpawner.highlightBall(ball);

    // Play sound
    if (this.soundBallClick) {
      this.soundBallClick.play();
    }

    // Update selection counter
    this.updateSelectionCounter();

    // Animate ball to selection area
    this.animateBallToSelection(ball, this.selectedBalls.length - 1);
  }

  deselectBall(ball: FloatingBall) {
    const index = this.selectedBalls.indexOf(ball);
    if (index > -1) {
      this.selectedBalls.splice(index, 1);
    }
    ball.isSelected = false;

    // Remove highlight
    this.ballSpawner.unhighlightBall(ball);

    // Clear feedback
    this.ballSpawner.clearFeedback(ball);

    // Update selection counter
    this.updateSelectionCounter();

    // Animate back to original position
    this.ballSpawner.animateToOriginal(ball);
  }

  updateSelectionCounter() {
    this.selectionCounter.setText(
      `เลือก ${this.selectedBalls.length}/2`
    );
  }

  async animateBallToSelection(ball: FloatingBall, index: number) {
    const { width, height } = this.scale;
    const spacing = 120;
    const startX = width / 2 - spacing;
    const targetX = startX + index * spacing;
    const targetY = height * 0.4;

    await this.ballSpawner.animateToPosition(ball, targetX, targetY);
  }

  checkAnswer() {
    console.log("[FloatingBallMathGameScene] checkAnswer called - isLocked set to true");
    this.isLocked = true;
    this.attempts++;

    const [ball1, ball2] = this.selectedBalls;
    const num1 = ball1.value;
    const num2 = ball2.value;
    const target = this.currentEquation.target;
    const operation = this.currentEquation.operation;

    let result: number;
    let isCorrect: boolean;

    switch (operation) {
      case "+":
        result = num1 + num2;
        break;
      case "-":
        result = Math.abs(num1 - num2);
        break;
      case "*":
        result = num1 * num2;
        break;
      case "/":
        result = Math.round(num1 / num2);
        break;
    }

    isCorrect = result === target;
    console.log(`[FloatingBallMathGameScene] Answer check: ${num1} ${operation} ${num2} = ${result} (target: ${target}) - isCorrect: ${isCorrect}`);

    // Track reaction time
    const reactionTime = Date.now() - this.equationStartTime;
    this.reactionTimes.push(reactionTime);

    // Track mismatch attempts (when balls don't form target)
    if (!isCorrect) {
      this.mismatchAttempts++;
    } else {
      this.mismatchCorrect++;
    }

    // Add safety timeout - if nothing happens in 3 seconds, force unlock
    this.time.delayedCall(3000, () => {
      if (this.isLocked) {
        console.log("[FloatingBallMathGameScene] SAFETY TIMEOUT - Force unlocking after 3 seconds");
        this.isLocked = false;
      }
    });

    if (isCorrect) {
      this.handleCorrectAnswer();
    } else {
      this.handleWrongAnswer();
    }
  }

  handleCorrectAnswer() {
    console.log("[FloatingBallMathGameScene] handleCorrectAnswer called");
    this.correctEquations++;
    this.totalEquations++;
    this.currentErrorRun = 0;
    if (this.soundSuccess) {
      this.soundSuccess.play();
    }

    // Show feedback
    this.selectedBalls.forEach((ball) => {
      this.ballSpawner.showCorrectFeedback(ball);
    });

    // Track completed equation
    this.trackCompletedEquation(this.currentEquation.target);

    // Animate success
    this.tweens.add({
      targets: [this.targetDisplay],
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
   * Replace selected balls with new ones and continue to next equation
   * This keeps unselected balls in their current positions
   */
  replaceBallsAndContinue() {
    console.log("[FloatingBallMathGameScene] replaceBallsAndContinue called");

    // Destroy only the selected balls
    this.destroySelectedBalls();

    // Spawn 2 new replacement balls with random values
    this.spawnReplacementBalls();

    // Reset selection
    this.selectedBalls = [];
    this.updateSelectionCounter();

    // Clear feedback from all balls
    this.balls.forEach((ball) => {
      this.ballSpawner.clearFeedback(ball);
      this.ballSpawner.unhighlightBall(ball);
      ball.isSelected = false;
    });

    // Check if level complete
    if (this.totalEquations >= this.currentLevelConfig.totalEquations) {
      console.log("[FloatingBallMathGameScene] Level complete in replaceBallsAndContinue, ending level");
      this.endLevel();
      return;
    }

    // Generate new equation based on available balls (but don't spawn balls)
    try {
      // Extract available ball values
      const availableValues = this.balls.map(ball => ball.value);
      console.log("[FloatingBallMathGameScene] Available ball values:", availableValues);

      // Generate equation based on available balls
      this.currentEquation = this.equationGenerator.generateEquationWithBalls(availableValues);
      this.equationStartTime = Date.now();
      console.log("[FloatingBallMathGameScene] New equation:", this.currentEquation);

      // Update target display only
      this.updateTargetDisplay();
      console.log("[FloatingBallMathGameScene] replaceBallsAndContinue completed - isLocked:", this.isLocked);
    } catch (error) {
      console.error("[FloatingBallMathGameScene] ERROR in replaceBallsAndContinue:", error);
      // If we can't generate an equation with available balls, try with the traditional method
      console.log("[FloatingBallMathGameScene] Falling back to traditional equation generation");
      try {
        this.currentEquation = this.equationGenerator.generateEquation();
        this.equationStartTime = Date.now();
        console.log("[FloatingBallMathGameScene] Fallback equation generated:", this.currentEquation);
        this.updateTargetDisplay();
      } catch (fallbackError) {
        console.error("[FloatingBallMathGameScene] ERROR in fallback equation generation:", fallbackError);
      }
    }

    // Unlock for next selection
    this.isLocked = false;
  }

  handleWrongAnswer() {
    console.log("[FloatingBallMathGameScene] handleWrongAnswer called");
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

    // Show error feedback
    this.selectedBalls.forEach((ball) => {
      this.ballSpawner.showIncorrectFeedback(ball);
    });

    // Shake target display
    this.tweens.add({
      targets: this.targetDisplay,
      x: "+=10",
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: "Power2.easeInOut",
    });

    // Wait then reset
    this.time.delayedCall(1500, () => {
      this.resetSelection();
    });
  }

  resetSelection() {
    console.log("[FloatingBallMathGameScene] resetSelection called - isLocked will be set to false");
    // Clear feedback and deselect all balls
    this.selectedBalls.forEach((ball) => {
      this.ballSpawner.clearFeedback(ball);
      this.ballSpawner.unhighlightBall(ball);
      this.ballSpawner.animateToOriginal(ball);
      ball.isSelected = false;
    });

    this.selectedBalls = [];
    this.updateSelectionCounter();
    this.isLocked = false;
    console.log("[FloatingBallMathGameScene] resetSelection completed - isLocked:", this.isLocked);
  }

  nextEquation() {
    console.log("[FloatingBallMathGameScene] nextEquation called");
    // Reset selection
    this.selectedBalls = [];
    this.updateSelectionCounter();

    // Clear feedback from all balls
    this.balls.forEach((ball) => {
      this.ballSpawner.clearFeedback(ball);
      this.ballSpawner.unhighlightBall(ball);
      ball.isSelected = false;
    });

    // Check if level complete
    if (this.totalEquations >= this.currentLevelConfig.totalEquations) {
      console.log("[FloatingBallMathGameScene] Level complete, ending level");
      this.endLevel();
    } else {
      console.log("[FloatingBallMathGameScene] Generating next equation");
      this.generateNewEquation();
      this.isLocked = false;
      console.log("[FloatingBallMathGameScene] nextEquation completed - isLocked:", this.isLocked);
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
      mismatchCorrect: this.mismatchCorrect,
      mismatchAttempts: this.mismatchAttempts,
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
    const accuracy = (this.correctEquations / this.totalEquations) * 100;

    const timeRequirement = this.currentLevelConfig.starRequirements.threeStars;

    // Perfect score: within time requirement and high accuracy
    if (averageTimeSeconds <= timeRequirement && accuracy === 100) {
      return 3;
    }

    // Good score: within time requirement or good accuracy
    if (
      averageTimeSeconds <= timeRequirement * 1.5 ||
      accuracy >= this.totalEquations * 0.8
    ) {
      return 2;
    }

    // Complete the level = at least 1 star
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
      this.targetDisplay.setPosition(width / 2, height * 0.12);
    }

    if (this.selectionCounter) {
      this.selectionCounter.setPosition(width / 2, height * 0.22);
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
