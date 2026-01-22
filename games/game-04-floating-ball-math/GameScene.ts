import * as Phaser from "phaser";
import { FLOATING_BALL_MATH_LEVELS } from "./levels";
import { EquationGenerator } from "./utils/EquationGenerator";
import { WaterPhysics } from "./utils/WaterPhysics";
import { BallSpawner } from "./utils/BallSpawner";
import { FloatboatController } from "./utils/Floatboat";
import type {
  FloatingBall,
  Equation,
  FloatingBallMathLevelConfig,
  Operation,
} from "./types";
import type { FloatingBallMathGameStats as GameStats } from "@/types";

export class FloatingBallMathGameScene extends Phaser.Scene {
  private currentLevelConfig!: FloatingBallMathLevelConfig;
  private equationGenerator!: EquationGenerator;
  private waterPhysics!: WaterPhysics;
  private ballSpawner!: BallSpawner;
  private floatboatController!: FloatboatController;

  // Lane System
  private lanes: { left: number; center: number; right: number } = {
    left: 0,
    center: 0,
    right: 0,
  };
  private currentLane: 0 | 1 | 2 = 1; // 0=Left, 1=Center, 2=Right
  private laneWidth: number = 0;

  // Game State
  private balls: FloatingBall[] = [];
  private currentEquation!: Equation;
  private currentScore: number = 0; // Always starts at 0
  private completedEquationResults: number[] = [];
  private completedEquationStats: { target: number; ballsCollected: number }[] = [];
  private startTime = 0;
  private levelStartTime = 0;
  private totalEquations = 0;
  private correctEquations = 0;
  private wrongEquations = 0;
  private consecutiveErrors = 0;
  private currentErrorRun = 0;
  private attempts = 0;
  private isLocked = true;
  private physicsEnabled = true;
  private continuedAfterTimeout = false;
  private isPaused = false;
  private equationStartTime = 0;
  
  // Thief Event System
  private activeThiefEvent: {
    ballId: string;
    targetLane: 0 | 1 | 2;
    originalLane: 0 | 1 | 2;
    appearTime: number;
    decisionWindowMs: number;
  } | null = null;
  private thiefSpawnTimer!: Phaser.Time.TimerEvent;
  private thiefSpawnInterval: number = 8000; // 8 seconds between thief spawns
  private lastThiefSpawnTime: number = 0;
  
  
  // Block/Adapt UI
  private blockButton!: Phaser.GameObjects.Container;
  private blockTimerBar!: Phaser.GameObjects.Graphics;
  private blockTimerEvent!: Phaser.Time.TimerEvent;
  private armTrackingTimer!: Phaser.Time.TimerEvent;
  
  // Telemetry Tracking
  private thiefEvents: number = 0;
  private blockSuccessCount: number = 0;
  private adaptSuccessCount: number = 0;
  private decisionFailCount: number = 0;
  private onTimeDecisionCount: number = 0;
  private lateDecisionCount: number = 0;
  private panicBlock: number = 0;
  private panicAdapt: number = 0;
  private bombHits: number = 0;
  private consecutiveBlockErrors: number = 0; // For panic tracking
  private consecutiveAdaptErrors: number = 0; // For panic tracking
  
  // Reaction Time Tracking (legacy, kept for compatibility)
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
  private laneIndicators!: Phaser.GameObjects.Graphics;
  private shadowBallContainer!: Phaser.GameObjects.Container;
  private shadowBalls: Phaser.GameObjects.Container[] = [];
  private waterOverlay!: Phaser.GameObjects.Graphics;
  private waterBackground!: Phaser.GameObjects.Graphics;
  
  // Thief and Arm UI
  private thiefSprite!: Phaser.GameObjects.Image;
  private armSprite!: Phaser.GameObjects.Image;
  
  // Background Flash System
  private backgroundFlashTween!: Phaser.Tweens.Tween;
  private isBackgroundFlashed: boolean = false;
  
  // Boat Drag System
  private isDraggingBoat: boolean = false;
  private dragStartX: number = 0;
  
  // Lane Movement Cooldown System
  private lastLaneMoveTime: number = 0;
  private laneMoveCooldown: number = 250; // 250ms between lane changes
  
  // Audio
  private bgMusic!: Phaser.Sound.BaseSound;
  private soundBallCollect!: Phaser.Sound.BaseSound;
  private soundSuccess!: Phaser.Sound.BaseSound;
  private soundError!: Phaser.Sound.BaseSound;
  private soundBomb!: Phaser.Sound.BaseSound;
  private soundLevelPass!: Phaser.Sound.BaseSound;
  private soundLevelFail!: Phaser.Sound.BaseSound;
  private soundBlock!: Phaser.Sound.BaseSound;
  private soundAdapt!: Phaser.Sound.BaseSound;

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

    this.resetGameState();
  }

  resetGameState() {
    console.log("[FloatingBallMathGameScene] resetGameState called");
    this.cleanupBalls();
    this.cleanupShadowBalls();
    
    // Stop all timers
    if (this.thiefSpawnTimer) {
      this.thiefSpawnTimer.remove();
    }
    if (this.blockTimerEvent) {
      this.blockTimerEvent.remove();
    }

    this.balls = [];
    this.currentEquation = {} as Equation;
    this.currentScore = 0;
    this.completedEquationResults = [];
    this.completedEquationStats = [];
    this.totalEquations = 0;
    this.correctEquations = 0;
    this.wrongEquations = 0;
    this.consecutiveErrors = 0;
    this.currentErrorRun = 0;
    this.attempts = 0;
    this.isLocked = true;
    this.physicsEnabled = true;
    this.continuedAfterTimeout = false;
    this.isPaused = false;
    this.equationStartTime = 0;
    this.reactionTimes = [];
    this.ballsCollected = 0;
    this.successfulCollections = 0;
    
    // Reset thief events
    this.activeThiefEvent = null;
    this.thiefEvents = 0;
    this.blockSuccessCount = 0;
    this.adaptSuccessCount = 0;
    this.decisionFailCount = 0;
    this.onTimeDecisionCount = 0;
    this.lateDecisionCount = 0;
    this.panicBlock = 0;
    this.panicAdapt = 0;
    this.bombHits = 0;
    this.consecutiveBlockErrors = 0;
    this.consecutiveAdaptErrors = 0;
    
    // Reset background flash
    this.isBackgroundFlashed = false;
    
    // Reset boat drag state
    this.isDraggingBoat = false;
    this.dragStartX = 0;
    
    console.log("[FloatingBallMathGameScene] resetGameState completed");
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
    // Load all ball images and bomb
    this.load.image("ball-1", "/assets/images/floatingBallMath/Ball-1.png");
    this.load.image("ball-2", "/assets/images/floatingBallMath/Ball-2.png");
    this.load.image("ball-3", "/assets/images/floatingBallMath/Ball-3.png");
    this.load.image("ball-4", "/assets/images/floatingBallMath/Ball-4.png");
    this.load.image("bomb-ball", "/assets/images/floatingBallMath/Bomb.png");
    
    // Load boat image
    this.load.image("boat", "/assets/images/floatingBallMath/Boat.png");
    
    // Load thief and arm images
    this.load.image("thief", "/assets/images/floatingBallMath/Thief.png");
    this.load.image("arm", "/assets/images/floatingBallMath/Arm.png");

    // Load sounds
    this.load.audio("ball-collect", "/assets/sounds/floatingball-math/waterspalsh.mp3");
    this.load.audio("success", "/assets/sounds/billiards/success.mp3");
    this.load.audio("error", "/assets/sounds/global/error.mp3");
    this.load.audio("bomb", "/assets/sounds/floatingball-math/bomb.mp3");
    this.load.audio("bg-music", "/assets/sounds/floatingball-math/bg-music.mp3");
    this.load.audio("level-pass", "/assets/sounds/global/level-pass.mp3");
    this.load.audio("level-fail", "/assets/sounds/global/level-fail.mp3");
    this.load.audio("block", "/assets/sounds/global/error.mp3");
    this.load.audio("adapt", "/assets/sounds/floatingball-math/adapt.mp3");
  }

  create() {
    console.log("[FloatingBallMathGameScene] create called");
    const { width, height } = this.scale;

    // Setup lane positions
    this.laneWidth = width / 3;
    this.lanes = {
      left: this.laneWidth * 0.5,
      center: width * 0.5,
      right: width * 0.75 + this.laneWidth * 0.25,
    };

    // Create water background
    this.createWaterBackground();

    // Create floatboat in center lane
    const boatY = height * 0.75;
    const floatboat = this.floatboatController.createFloatboat(boatY);
    if (floatboat) {
      floatboat.container.x = this.lanes.center;
      
      // Enable boat drag for horizontal control
      const boatSprite = floatboat.container.getByName("boat") as Phaser.GameObjects.Image;
      if (boatSprite) {
        boatSprite.setInteractive({ useHandCursor: true });
        boatSprite.on("dragstart", this.handleBoatDragStart.bind(this));
        boatSprite.on("drag", this.handleBoatDrag.bind(this));
        boatSprite.on("dragend", this.handleBoatDragEnd.bind(this));
      }
    }
    
    // Create movement hints (arrows) beside boat
    this.floatboatController.createMovementHints();
    
    // Create UI elements
    this.createUI();

    // Start game
    this.startLevel();
    console.log("[FloatingBallMathGameScene] create completed");

    // Handle resize
    this.scale.on("resize", () => {
      this.layoutGame();
    });

    // Listen for resume event
    this.game.events.on("resume-game", (data: { penalty: boolean }) => {
      this.resumeGame(data.penalty);
    });

    // Listen for arrow click events to move boat
    this.events.on("arrow-click", (data: { direction: 'left' | 'right' }) => {
      if (data.direction === 'left' && this.currentLane > 0) {
        this.moveBoatToLane((this.currentLane - 1) as 0 | 1 | 2);
      } else if (data.direction === 'right' && this.currentLane < 2) {
        this.moveBoatToLane((this.currentLane + 1) as 0 | 1 | 2);
      }
    });

    // Initialize sound effects
    try {
      this.soundBallCollect = this.sound.add("ball-collect", { volume: 0.5 });
      this.soundSuccess = this.sound.add("success", { volume: 0.8 });
      this.soundError = this.sound.add("error", { volume: 0.7 });
      this.soundBomb = this.sound.add("bomb", { volume: 0.8 });
      this.soundLevelPass = this.sound.add("level-pass", { volume: 0.8 });
      this.soundLevelFail = this.sound.add("level-fail", { volume: 0.8 });
      this.soundBlock = this.sound.add("block", { volume: 0.8 });
      this.soundAdapt = this.sound.add("adapt", { volume: 0.8 });
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

  /**
   * Handle boat drag start
   */
  private handleBoatDragStart(pointer: Phaser.Input.Pointer) {
    if (!this.isDraggingBoat) {
      this.isDraggingBoat = true;
      this.dragStartX = pointer.x;
      console.log(`[FloatingBallMathGameScene] Boat drag started at X: ${pointer.x}`);
    }
  }

  /**
   * Handle boat drag
   */
  private handleBoatDrag(pointer: Phaser.Input.Pointer) {
    if (this.isDraggingBoat) {
      const floatboat = this.floatboatController.getFloatboat();
      if (floatboat) {
        // Calculate horizontal drag distance
        const dragDelta = pointer.x - this.dragStartX;
        const newX = floatboat.container.x + dragDelta;
        
        // Keep boat within screen bounds
        const { width } = this.scale;
        const boatWidth = 80; // Approximate boat width
        const minX = boatWidth / 2;
        const maxX = width - boatWidth / 2;
        
        if (newX < minX) {
          floatboat.container.x = minX;
        } else if (newX > maxX) {
          floatboat.container.x = maxX;
        } else {
          floatboat.container.x = newX;
        }
        
        this.dragStartX = pointer.x;
        this.updateCurrentLaneBasedOnXPosition(floatboat.container.x);
      }
    }
  }

  /**
   * Handle boat drag end
   */
  private handleBoatDragEnd(pointer: Phaser.Input.Pointer) {
    if (this.isDraggingBoat) {
      this.isDraggingBoat = false;
      console.log(`[FloatingBallMathGameScene] Boat drag ended at X: ${pointer.x}`);
      
      // Snap to nearest lane after drag ends
      const floatboat = this.floatboatController.getFloatboat();
      if (floatboat) {
        this.snapBoatToNearestLane(floatboat.container.x);
      }
    }
  }

  /**
   * Snap boat to nearest lane
   */
  private snapBoatToNearestLane(currentX: number) {
    // Find nearest lane center
    const distances = [
      { lane: 0, center: this.lanes.left, distance: Math.abs(currentX - this.lanes.left) },
      { lane: 1, center: this.lanes.center, distance: Math.abs(currentX - this.lanes.center) },
      { lane: 2, center: this.lanes.right, distance: Math.abs(currentX - this.lanes.right) },
    ];
    
    // Sort by distance and get nearest
    distances.sort((a, b) => a.distance - b.distance);
    const nearest = distances[0];
    
    if (nearest.lane !== this.currentLane) {
      this.moveBoatToLane(nearest.lane as 0 | 1 | 2);
    }
  }

  /**
   * Update current lane based on X position
   */
  private updateCurrentLaneBasedOnXPosition(x: number) {
    // Determine which lane boat is closest to
    const distances = [
      { lane: 0, center: this.lanes.left, distance: Math.abs(x - this.lanes.left) },
      { lane: 1, center: this.lanes.center, distance: Math.abs(x - this.lanes.center) },
      { lane: 2, center: this.lanes.right, distance: Math.abs(x - this.lanes.right) },
    ];
    
    distances.sort((a, b) => a.distance - b.distance);
    const nearest = distances[0];
    
    if (nearest.lane !== this.currentLane) {
      this.currentLane = nearest.lane as 0 | 1 | 2;
    }
  }

  createWaterBackground() {
    const { width, height } = this.scale;

    // Create gradient background (keep reference for flash system)
    this.waterBackground = this.add.graphics();
    this.waterBackground.fillGradientStyle(0xE3F2FD, 0xE3F2FD, 0xBBDEFB, 0xBBDEFB, 1);
    this.waterBackground.fillRect(0, 0, width, height);
    this.waterBackground.setDepth(-2);

    // Create water wave overlay
    this.waterOverlay = this.waterPhysics.createWaterOverlay();
  }

  createUI() {
    const { width, height } = this.scale;

    // Create thief sprite (moved down from top, using default aspect ratio)
    this.thiefSprite = this.add.image(width - 20, 180, "thief");
    this.thiefSprite.setOrigin(0.5);
    // Remove custom scale to use default aspect ratio
    this.thiefSprite.setVisible(false); // Hidden until thief event
    this.thiefSprite.setDepth(900);
    
    // Add pulsing animation to thief (smaller range for default size)
    this.tweens.add({
      targets: this.thiefSprite,
      scale: { from: 1, to: 1.1 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Create arm sprite - hidden initially
    this.armSprite = this.add.image(width * 0.5, height * 0.3, "arm");
    this.armSprite.setOrigin(0.5);
    this.armSprite.setScale(1.5); // Reasonable scale for visibility
    this.armSprite.setVisible(false); // Hidden until adapt
    this.armSprite.setDepth(950);

    // Target display
    this.targetDisplay = this.add.container(width * 0.5, height * 0.2);

    const targetLabel = this.add.text(0, -50, "เป้าหมาย", {
      fontFamily: "Sarabun, sans-serif",
      fontSize: `${Math.min(28, width * 0.05)}px`,
      color: "#42A5F5",
      fontStyle: "bold",
    }).setOrigin(0.5);
    targetLabel.setDepth(110);
    const targetBg = this.add.graphics();
    targetBg.fillStyle(0x1976D2, 1); // More vibrant blue
    targetBg.fillRoundedRect(-100, -25, 200, 60, 15);

    this.targetText = this.add.text(0, 0, "0", {
      fontFamily: "Arial, sans-serif",
      fontSize: `${Math.min(48, width * 0.09)}px`,
      color: "#FFFFFF",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.targetDisplay.add([targetLabel, targetBg, this.targetText]);

    // Current display
    this.currentDisplay = this.add.container(width * 0.15, height * 0.12);

    const currentLabel = this.add.text(0, -35, "ปัจจุบัน", {
      fontFamily: "Sarabun, sans-serif",
      fontSize: `${Math.min(18, width * 0.035)}px`,
      color: "#2b2b2b",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.currentText = this.add.text(0, 0, "0", {
      fontFamily: "Arial, sans-serif",
      fontSize: `${Math.min(28, width * 0.05)}px`,
      color: "#666666",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.currentDisplay.add([currentLabel, this.currentText]);

    // Timer bar
    this.customTimerBar = this.add.graphics();
    this.customTimerBar.setVisible(false);

    // Create shadow ball progress tracker
    this.createShadowBallTracker();
    
    // Create block button (hidden initially)
    this.createBlockButton();
  }

  createBlockButton() {
    const { width, height } = this.scale;
    
    this.blockButton = this.add.container(width * 0.5, height * 0.5);
    this.blockButton.setVisible(false);
    this.blockButton.setDepth(2000); // Higher than arm sprite (950) and thief sprite (900)
    
    // Button background - LARGER size (120x50 instead of 100x40)
    const bg = this.add.graphics();
    bg.fillStyle(0xFF5252, 1);
    bg.fillRoundedRect(-60, -25, 120, 50, 10);
    
    // Button text - LARGER font, Thai text
    const text = this.add.text(0, 0, "ห้ามขโมย", {
      fontFamily: "Sarabun, sans-serif",
      fontSize: "22px",
      color: "#FFFFFF",
      fontStyle: "bold",
    }).setOrigin(0.5);
    
    this.blockButton.add([bg, text]);
    
    // Set container size and enable interaction with hit area
    this.blockButton.setSize(120, 50);
    this.blockButton.setInteractive({ useHandCursor: true });
    
    this.blockButton.on("pointerdown", () => {
      this.handleBlockDecision();
    });
    
    // Timer bar for block button
    this.blockTimerBar = this.add.graphics();
    this.blockTimerBar.setVisible(false);
    this.blockTimerBar.setDepth(1999); // Just below block button (2000)
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

    const ballRadius = Math.min(30, width * 0.06);
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
        fontSize: `${Math.min(22, width * 0.045)}px`,
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
            fontSize: `${Math.min(24, width * 0.045)}px`,
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

  startLevel() {
    console.log("[FloatingBallMathGameScene] startLevel called");
    this.levelStartTime = Date.now();
    this.equationGenerator.reset();
    
    // Reset lane movement cooldown
    this.lastLaneMoveTime = 0;
    
    // Generate equation (balls will be generated gradually via continuous spawning)
    this.generateNewEquation();
    this.isLocked = false;
    this.physicsEnabled = true;
    this.startTime = Date.now();
    this.startTimer();
    
    // Start thief spawning
    this.startThiefSpawning();
    
    console.log("[FloatingBallMathGameScene] startLevel completed");
  }

  /**
   * Get X position for a lane
   */
  private getLanePosition(lane: 0 | 1 | 2): number {
    switch (lane) {
      case 0:
        return this.lanes.left;
      case 1:
        return this.lanes.center;
      case 2:
        return this.lanes.right;
    }
  }

  /**
   * Move boat to a specific lane
   */
  private moveBoatToLane(lane: 0 | 1 | 2) {
    if (this.isLocked || this.isPaused || this.currentLane === lane) return;
    
    // Add cooldown check to prevent rapid-fire lane changes
    const now = Date.now();
    if (now - this.lastLaneMoveTime < this.laneMoveCooldown) {
      console.log(`[FloatingBallMathGameScene] Lane move on cooldown (${this.laneMoveCooldown}ms)`);
      return;
    }

    const targetX = this.getLanePosition(lane);
    const floatboat = this.floatboatController.getFloatboat();
    
    if (floatboat) {
      this.tweens.add({
        targets: floatboat.container,
        x: targetX,
        duration: 200,
        ease: "Quad.easeInOut",
        onComplete: () => {
          this.lastLaneMoveTime = Date.now(); // Update timestamp after move completes
          this.floatboatController.resetIsBoatMoving(); // Reset moving flag so arrows can show again
        },
      });
      
      this.currentLane = lane;
      this.lastLaneMoveTime = now; // Update timestamp immediately
    }
  }

  generateNewEquation() {
    console.log("[FloatingBallMathGameScene] generateNewEquation called");
    try {
      this.currentEquation = this.equationGenerator.generateEquation();
      this.equationStartTime = Date.now();
      console.log("[FloatingBallMathGameScene] New equation:", this.currentEquation);

      this.updateTargetDisplay();
      this.currentScore = 0;
      this.updateCurrentDisplay();
      
      // Clean up existing balls before generating new ones
      this.cleanupBalls();
      
      console.log("[FloatingBallMathGameScene] Balls will be spawned via generateSolvableBallSet() and replacement spawning");
      
    } catch (error) {
      console.error("[FloatingBallMathGameScene] ERROR in generateNewEquation:", error);
    }
  }

  /**
   * Generate solvable ball set for current equation
   * This is called when no balls are on screen and game is not locked
   */
  private generateSolvableBallSet() {
    console.log("[FloatingBallMathGameScene] Generating solvable ball set for target:", this.currentEquation.target);
    
    // Use EquationGenerator to generate complete ball set
    const ballTemplates = this.equationGenerator.generateBallsForGame(
      this.currentScore,
      this.currentEquation.target
    );
    
    // Spawn each ball from the generated set
    ballTemplates.forEach((ballTemplate, index) => {
      const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
      const x = this.getLanePosition(lane);
      const y = -150 - (index * 220); // Proper Y spacing
      
      let ballObj: FloatingBall;
      
      // If bomb, create bomb graphics instead
      if (ballTemplate.isBomb) {
        ballObj = this.ballSpawner.createBombBall(ballTemplate.value, ballTemplate.operator, x, y);
      } else {
        // Create regular ball using the template values
        ballObj = this.ballSpawner.createBall(
          ballTemplate.value,
          ballTemplate.operator,
          ballTemplate.color,
          x,
          y
        );
      }
      
      // FIX: Set ALL properties FIRST, then push to array
      // This prevents race condition where physics loop runs before properties are set
      ballObj.lane = lane;
      ballObj.originalLane = lane;
      ballObj.originalX = x;
      ballObj.originalY = y;
      ballObj.isSolvable = ballTemplate.isSolvable;
      ballObj.isBomb = ballTemplate.isBomb;
      
      // Only push AFTER all properties are set
      this.balls.push(ballObj);
      
      // Fade in ball
      const targetBall = ballTemplate.isBomb ? this.balls[this.balls.length - 1] : ballObj;
      if (targetBall.container) {
        targetBall.container.setAlpha(0);
        this.tweens.add({
          targets: targetBall.container,
          alpha: { from: 0, to: 1 },
          duration: 400,
          ease: "Quad.easeOut",
        });
      }
      
      console.log(`[FloatingBallMathGameScene] Spawned ${ballTemplate.isBomb ? 'bomb' : (ballTemplate.isSolvable ? 'solvable' : 'distractor')} ball: ${ballTemplate.operator} ${ballTemplate.value} in lane ${lane}`);
    });
    
    console.log(`[FloatingBallMathGameScene] Spawned ${ballTemplates.length} balls total`);
  }

  /**
   * Spawn exactly 1 replacement solvable ball when a solvable ball is collected
   * This keeps the solvable ball pool fresh as the game progresses
   */
  private spawnReplacementSolvableBall() {
    console.log("[FloatingBallMathGameScene] Spawning replacement solvable ball");
    
    // Try to use EquationGenerator to generate ball pool, then pick 1 solvable ball
    const ballTemplates = this.equationGenerator.generateBallsForGame(
      this.currentScore,
      this.currentEquation.target
    );
    
    // Filter to get only solvable balls (not bombs or distractors)
    const solvableBalls = ballTemplates.filter(ball => ball.isSolvable && !ball.isBomb);
    
    if (solvableBalls.length > 0) {
      // Select 1 random solvable ball from generated set
      const ballTemplate = solvableBalls[Math.floor(Math.random() * solvableBalls.length)];
      this.spawnBallFromTemplate(ballTemplate);
      return;
    }
    
    // FALLBACK: Create direct solution ball manually if generator failed
    console.log("[FloatingBallMathGameScene] No solvable balls from generator, creating fallback solution ball");
    const difference = this.currentEquation.target - this.currentScore;
    const { min, max } = this.currentLevelConfig.operandRange;
    
    // Determine operator and value
    let operator: Operation = '+';
    let value = difference;
    
    // Ensure value is within valid range
    if (value < min) {
      value = min;
    } else if (value > max) {
      value = max;
    }
    
    // If we need to subtract (already over target), use subtraction
    if (difference < 0 && this.currentScore > 0) {
      operator = '-';
      value = Math.min(Math.abs(difference), max);
      // Ensure we don't subtract below 0
      if (value > this.currentScore) {
        value = this.currentScore;
      }
    }
    
    // Create fallback ball
    const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    const x = this.getLanePosition(lane);
    const y = this.findSafeSpawnPosition(lane);
    
    const ballObj = this.ballSpawner.createBall(
      value,
      operator,
      this.equationGenerator.getRandomColor(),
      x,
      y
    );
    
    // FIX: Set ALL properties FIRST, then push to array
    // This prevents race condition where physics loop runs before properties are set
    ballObj.lane = lane;
    ballObj.originalLane = lane;
    ballObj.originalX = x;
    ballObj.originalY = y;
    ballObj.isSolvable = true;
    ballObj.isBomb = false;
    
    // Only push AFTER all properties are set
    this.balls.push(ballObj);
    
    // Fade in ball
    if (ballObj.container) {
      ballObj.container.setAlpha(0);
      this.tweens.add({
        targets: ballObj.container,
        alpha: { from: 0, to: 1 },
        duration: 400,
        ease: "Quad.easeOut",
      });
    }
    
    console.log(`[FloatingBallMathGameScene] Spawned FALLBACK solvable ball: ${ballObj.operator} ${ballObj.value}`);
  }

  /**
   * Helper method to spawn a ball from a template
   */
  private spawnBallFromTemplate(ballTemplate: any) {
    const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    const x = this.getLanePosition(lane);
    const y = this.findSafeSpawnPosition(lane);
    
    const ballObj = this.ballSpawner.createBall(
      ballTemplate.value,
      ballTemplate.operator,
      ballTemplate.color,
      x,
      y
    );
    
    // Set all properties BEFORE pushing to array (prevents race condition)
    ballObj.lane = lane;
    ballObj.originalLane = lane;
    ballObj.originalX = x;
    ballObj.originalY = y;
    ballObj.isSolvable = true;
    ballObj.isBomb = false;
    
    this.balls.push(ballObj);
    
    // Fade in ball
    if (ballObj.container) {
      ballObj.container.setAlpha(0);
      this.tweens.add({
        targets: ballObj.container,
        alpha: { from: 0, to: 1 },
        duration: 400,
        ease: "Quad.easeOut",
      });
    }
    
    console.log(`[FloatingBallMathGameScene] Spawned replacement solvable ball: ${ballObj.operator} ${ballObj.value} in lane ${lane}`);
  }

  /**
   * End game with loss (0 stars) when score drops below 0
   */
  private endGameWithLoss() {
    console.log("[FloatingBallMathGameScene] Game over - score dropped below 0");
    
    this.input.enabled = false;
    this.isLocked = true;
    this.isPaused = true;
    this.physicsEnabled = false;
    
    // Stop ALL timers and event loops
    if (this.timerEvent) this.timerEvent.remove();
    if (this.thiefSpawnTimer) this.thiefSpawnTimer.remove();
    if (this.blockTimerEvent) this.blockTimerEvent.remove();
    if (this.armTrackingTimer) this.armTrackingTimer.remove();
    
    // Hide all UI elements
    if (this.customTimerBar) {
      this.customTimerBar.setVisible(false);
    }
    if (this.blockTimerBar) {
      this.blockTimerBar.setVisible(false);
    }
    
    // Clean up any active thief event
    if (this.activeThiefEvent) {
      this.cleanupThiefEvent();
    }
    
    // STOP ALL BALLS - freeze them in place
    this.balls.forEach((ball) => {
      if (ball && ball.container) {
        this.tweens.killTweensOf(ball.container);
        ball.isCollected = true;
      }
    });
    
    const endTime = Date.now();
    const totalTime = endTime - this.levelStartTime;
    
    const penaltyFactor = this.continuedAfterTimeout ? 0.7 : 1.0;
    
    const gameStats: GameStats = {
      levelPlayed: this.currentLevelConfig.level,
      difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
      penaltyFactor: penaltyFactor,
      
      thiefEvents: this.thiefEvents,
      blockSuccessCount: this.blockSuccessCount,
      adaptSuccessCount: this.adaptSuccessCount,
      decisionFailCount: this.decisionFailCount,
      
      onTimeDecisionCount: this.onTimeDecisionCount,
      lateDecisionCount: this.lateDecisionCount,
      timeLimitSeconds: this.currentLevelConfig.timeLimitSeconds,
      
      panicBlock: this.panicBlock,
      panicAdapt: this.panicAdapt,
      
      bombHits: this.bombHits,
      consecutiveErrors: this.consecutiveErrors,
      
      totalEquations: this.totalEquations,
      correctEquations: this.correctEquations,
      wrongEquations: this.wrongEquations,
      totalTimeMs: totalTime,
      attempts: this.attempts,
      continuedAfterTimeout: this.continuedAfterTimeout,
    } as any;

    const onGameOver = this.registry.get("onGameOver");
    
    if (onGameOver) {
      const finalData = {
        success: false, // Failed - score dropped below 0
        stars: 0, // 0 stars for losing
        ...gameStats,
      };

      try {
        onGameOver(finalData);
      } catch (error) {
        console.error("[FloatingBallMathGameScene] Error in onGameOver callback:", error);
      }
    }

    if (this.soundLevelFail) {
      this.soundLevelFail.play();
    }

    if (this.bgMusic && this.bgMusic.isPlaying) {
      this.bgMusic.pause();
    }
  }


  /**
   * Clean up balls that have gone off-screen
   */
  private cleanupOffScreenBalls() {
    const { height } = this.scale;
    const bottomThreshold = height + 100; // 100px below screen
    const minimumSafeY = 50; // Minimum Y before considering cleanup (prevents race condition)

    this.balls = this.balls.filter(ball => {
      // Skip cleanup for balls that are still near the top (newly spawned)
      // This prevents race condition where ball properties aren't fully initialized yet
      if (ball.y < minimumSafeY) {
        return true; // Keep the ball - it's too new to cleanup
      }
      
      // Remove ball if it's off-screen and not collected
      if (ball && ball.container && ball.y > bottomThreshold) {
        // Spawn replacement solvable ball if this was a solvable ball going off-screen
        // FIX: Delay spawn to next frame to prevent race condition with cleanup logic
        ball.container.removeAllListeners();
        ball.container.destroy();
        if (ball.isSolvable) {
          console.log("[FloatingBallMathGameScene] Solvable ball went off-screen, spawning replacement");
          this.time.delayedCall(16, () => {  // 16ms = 1 frame at 60fps
            this.spawnReplacementSolvableBall();
          });
        }
        
        return false; // Remove from array
      }
      return true; // Keep in array
    });
  }

  /**
   * Find safe spawn position to avoid overlap with existing balls
   */
  private findSafeSpawnPosition(lane: 0 | 1 | 2): number {
    const minSpacing = 180; // Minimum vertical spacing between balls
    const startY = -100; // Starting Y position (top of screen)
    
    // Get all active balls in same lane
    const laneBalls = this.balls.filter(ball => 
      ball && ball.container && !ball.isCollected && ball.lane === lane && ball.y > -200
    );
    
    // Sort balls by Y position (highest first)
    laneBalls.sort((a, b) => a.y - b.y);
    
    // Find first available position with sufficient spacing
    if (laneBalls.length === 0) {
      return startY;
    }
    
    // Check position before highest ball
    const highestBall = laneBalls[0];
    if (highestBall.y - startY >= minSpacing) {
      return startY;
    }
    
    // Check positions between balls
    for (let i = 0; i < laneBalls.length - 1; i++) {
      const currentBall = laneBalls[i];
      const nextBall = laneBalls[i + 1];
      const gap = nextBall.y - currentBall.y;
      
      // If gap is large enough, spawn in the middle
      if (gap >= minSpacing * 2) {
        return currentBall.y + minSpacing;
      }
    }
    
    // If no gap found, spawn above the lowest ball
    const lowestBall = laneBalls[laneBalls.length - 1];
    return lowestBall.y - minSpacing;
  }

  updateTargetDisplay() {
    this.targetText.setText(this.currentEquation.target.toString());
    
    this.tweens.add({
      targets: this.targetDisplay,
      scale: { from: 1, to: 1.1 },
      duration: 200,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  updateCurrentDisplay() {
    this.currentText.setText(this.currentScore.toString());
    this.floatboatController.updateSignText(this.currentScore);

    this.tweens.add({
      targets: this.currentDisplay,
      scale: { from: 1, to: 1.15 },
      duration: 150,
      yoyo: true,
      ease: "Sine.easeInOut",
    });

    const childrenWithSign = this.floatboatController.getChildrenWithSign();
    if (childrenWithSign) {
      this.tweens.add({
        targets: childrenWithSign,
        scale: { from: 1, to: 1.15 },
        duration: 150,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }
  }

  /**
   * Start thief spawning
   */
  startThiefSpawning() {
    if (this.thiefSpawnTimer) {
      this.thiefSpawnTimer.remove();
    }

    this.thiefSpawnTimer = this.time.addEvent({
      delay: this.thiefSpawnInterval,
      callback: this.spawnThiefEvent,
      callbackScope: this,
      loop: true,
    });

    console.log(`[FloatingBallMathGameScene] Started thief spawning every ${this.thiefSpawnInterval}ms`);
  }


  /**
   * Spawn a thief event on a random ball
   */
  spawnThiefEvent() {
    // Only spawn if no active thief event
    if (this.activeThiefEvent) return;
    
    // Check cooldown
    const timeSinceLastSpawn = Date.now() - this.lastThiefSpawnTime;
    if (timeSinceLastSpawn < this.thiefSpawnInterval) return;
    
    const { height } = this.scale;
    const warningHeight = height * 0.2; // 20% height - warning appears early
    const movementHeight = height * 0.5; // 50% height - arm moves ball here (upper half)
    
    // Find available balls that have just entered warning zone (20-25%)
    const availableBalls = this.balls.filter(ball => {
      if (!ball || !ball.container || ball.isCollected) return false;
      // Only target balls in early warning zone: 20-25% from top
      return ball.y >= warningHeight && ball.y <= height * 0.25;
    });
    
    if (availableBalls.length === 0) return;
    
    // Pick random ball
    const targetBall = availableBalls[Math.floor(Math.random() * availableBalls.length)];
    
    // Select new lane (different from current)
    const possibleLanes = [0, 1, 2].filter(l => l !== targetBall.lane);
    const newLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)] as 0 | 1 | 2;
    
    // Create thief event
    this.activeThiefEvent = {
      ballId: targetBall.id,
      targetLane: newLane,
      originalLane: targetBall.lane,
      appearTime: Date.now(),
      decisionWindowMs: 5000, // 5 second decision window (increased for better reaction time)
    };
    
    this.thiefEvents++;
    this.lastThiefSpawnTime = Date.now();
    
    // Show thief sprite
    this.thiefSprite.setVisible(true);
    
    // Show arm at fixed warning height from top (40% of screen height)
    // positioned horizontally on the targeted ball
    this.armSprite.setVisible(true);
    this.armSprite.setPosition(targetBall.x, warningHeight);
    
    // Show block button on top of arm (at warning height)
    this.showBlockButton(targetBall.x, warningHeight, targetBall.id);
    
    console.log(`[FloatingBallMathGameScene] Thief spawned - ball ${targetBall.id}, lane ${targetBall.lane} -> ${newLane}`);
  }

  /**
   * Show block button with timer on top of arm
   * Arm tracking is now handled in update() loop for smoother following
   */
  showBlockButton(armX: number, armY: number, ballId?: string) {
    // Position button on top of arm (adjusted for larger button)
    this.blockButton.setPosition(armX, armY - 40);
    this.blockButton.setVisible(true);
    this.blockTimerBar.setVisible(true);
    this.drawBlockTimerBar(100);
    
    // Arm tracking is now handled in update() loop for smoother following
    
    // Start timer countdown
    if (this.blockTimerEvent) {
      this.blockTimerEvent.remove();
    }
    
    this.blockTimerEvent = this.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.activeThiefEvent) return;
        
        const elapsed = Date.now() - this.activeThiefEvent.appearTime;
        const remainingMs = Math.max(0, this.activeThiefEvent.decisionWindowMs - elapsed);
        const pct = (remainingMs / this.activeThiefEvent.decisionWindowMs) * 100;
        
        this.drawBlockTimerBar(pct);
        
        if (remainingMs <= 0) {
          this.handleDecisionTimeout();
        }
      },
      loop: true,
    });
    
    // Animate button appearance
    this.tweens.add({
      targets: this.blockButton,
      scale: { from: 0, to: 1 },
      duration: 300,
      ease: "Back.easeOut",
    });
  }

  /**
   * Draw timer bar below block button
   */
  private drawBlockTimerBar(pct: number) {
    this.blockTimerBar.clear();
    const { width } = this.scale;
    
    const barW = 120; // Wider bar for larger button
    const barH = 8;
    const x = this.blockButton.x - barW / 2;
    const y = this.blockButton.y + 35;
    
    this.blockTimerBar.fillStyle(0x000000, 0.3);
    this.blockTimerBar.fillRoundedRect(x, y, barW, barH, 5);
    
    if (pct > 0) {
      const color = pct < 30 ? 0xff4444 : 0x76d13d;
      this.blockTimerBar.fillStyle(color, 1);
      this.blockTimerBar.fillRoundedRect(x, y, barW * (pct / 100), barH, 5);
    }
  }

  /**
   * Flash background to green on success
   */
  private flashBackgroundGreen() {
    if (this.isBackgroundFlashed) return;
    
    console.log("[FloatingBallMathGameScene] Flashing background green");
    this.isBackgroundFlashed = true;
    
    // Flash green
    if (this.waterBackground) {
      this.waterBackground.clear();
      this.waterBackground.fillStyle(0x4CAF50, 1);
      this.waterBackground.fillRect(0, 0, this.scale.width, this.scale.height);
    }
    
    // Reset to normal gradient after 1.5 seconds
    if (this.backgroundFlashTween) {
      this.backgroundFlashTween.destroy();
    }
    
    // Create a temporary object to tween for timing
    const flashObj = { value: 0 };
    
    this.backgroundFlashTween = this.tweens.add({
      targets: flashObj,
      value: 1,
      duration: 1500,
      ease: "Quad.easeInOut",
      onComplete: () => {
        this.isBackgroundFlashed = false;
        
        // Reset to gradient
        if (this.waterBackground) {
          this.waterBackground.clear();
          this.waterBackground.fillGradientStyle(0xE3F2FD, 0xE3F2FD, 0xBBDEFB, 0xBBDEFB, 1);
          this.waterBackground.fillRect(0, 0, this.scale.width, this.scale.height);
        }
      },
    });
  }

  /**
   * Flash target display background to green on success
   */
  private flashTargetDisplayGreen() {
    console.log("[FloatingBallMathGameScene] Flashing target display green");
    
    // Get the target background graphics (second element in container)
    const targetBg = this.targetDisplay.getAt(1) as Phaser.GameObjects.Graphics;
    if (targetBg) {
      // Flash to green
      targetBg.clear();
      targetBg.fillStyle(0x4CAF50, 1);
      targetBg.fillRoundedRect(-100, -25, 200, 60, 15);
      
      // Reset to blue after 1.5 seconds
      this.time.delayedCall(1500, () => {
        targetBg.clear();
        targetBg.fillStyle(0x1976D2, 1); // Back to blue
        targetBg.fillRoundedRect(-100, -25, 200, 60, 15);
      });
    }
  }

  /**
   * Clean up thief event - stops all timers and hides UI
   */
  private cleanupThiefEvent() {
    console.log("[FloatingBallMathGameScene] Cleaning up thief event");
    
    // Stop tracking timer if it exists
    if (this.armTrackingTimer) {
      this.armTrackingTimer.remove();
    }
    
    // Hide all thief-related UI
    this.armSprite.setVisible(false);
    this.thiefSprite.setVisible(false);
    this.hideBlockButton();
    
    // Clear active event
    this.activeThiefEvent = null;
  }

  /**
   * Handle BLOCK decision - cancels thief without moving anything
   */
  handleBlockDecision() {
    if (!this.activeThiefEvent) return;
    
    console.log("[FloatingBallMathGameScene] Player chose BLOCK - canceling thief");
    
    const isOnTime = Date.now() - this.activeThiefEvent.appearTime < this.activeThiefEvent.decisionWindowMs;
    
    if (isOnTime) {
      this.onTimeDecisionCount++;
    } else {
      this.lateDecisionCount++;
    }
    
    // Play block sound
    if (this.soundBlock) {
      this.soundBlock.play();
    }
    
    // Check if block was correct
    const wasCorrect = this.evaluateBlockDecision();
    
    if (wasCorrect) {
      this.blockSuccessCount++;
      this.consecutiveBlockErrors = 0;
    } else {
      this.decisionFailCount++;
      this.consecutiveBlockErrors++;
      
      // Check for panic (3+ bad blocks in a row)
      if (this.consecutiveBlockErrors >= 3) {
        this.panicBlock++;
      }
    }
    
    // Clean up thief event
    this.cleanupThiefEvent();
  }

  /**
   * Handle decision timeout (player didn't block = adapt by default)
   */
  handleDecisionTimeout() {
    if (!this.activeThiefEvent) return;
    
    console.log("[FloatingBallMathGameScene] Decision timeout = ADAPT");
    
    this.lateDecisionCount++;
    
    // Execute adapt (which will call cleanupThiefEvent)
    this.executeAdapt();
  }

  /**
   * Execute adapt decision (let thief change lane)
   */
  executeAdapt() {
    if (!this.activeThiefEvent) return;
    
    // Play adapt sound
    if (this.soundAdapt) {
      this.soundAdapt.play();
    }
    
    // Find target ball
    const ball = this.balls.find(b => b.id === this.activeThiefEvent?.ballId);
    if (!ball || !ball.container) {
      console.warn("[FloatingBallMathGameScene] Target ball not found or has no container");
      // Clean up even if ball not found
      this.cleanupThiefEvent();
      return;
    }
    
    // Capture targetLane before it becomes null
    const targetLane = this.activeThiefEvent.targetLane;
    const { width, height } = this.scale;
    
    // Move ball to new lane - arm stays on ball throughout
    const newX = this.getLanePosition(targetLane);
    this.tweens.add({
      targets: [ball.container, this.armSprite, this.blockButton],
      x: newX,
      duration: 600,
      ease: "Quad.easeInOut",
      onComplete: () => {
        ball.lane = targetLane;
        ball.originalX = newX; // Update originalX so wave motion centers correctly
        
        // Clean up thief event after ball reaches destination
        this.cleanupThiefEvent();
      },
    });
    
    // Check if adapt was correct
    const wasCorrect = this.evaluateAdaptDecision();
    
    if (wasCorrect) {
      this.adaptSuccessCount++;
      this.consecutiveAdaptErrors = 0;
    } else {
      this.decisionFailCount++;
      this.consecutiveAdaptErrors++;
      
      // Check for panic (3+ bad adapts in a row)
      if (this.consecutiveAdaptErrors >= 3) {
        this.panicAdapt++;
      }
    }
    
    // Clear thief event (will be set to null by cleanupThiefEvent)
    this.activeThiefEvent = null;
  }

  /**
   * Evaluate if block decision was correct
   */
  evaluateBlockDecision(): boolean {
    // Find target ball
    const ball = this.balls.find(b => b.id === this.activeThiefEvent?.ballId);
    if (!ball) return false;
    
    // Check if ball would be good or bad for current equation
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
    const isBadBall = newScore < 0 || newScore > this.currentEquation.target * 2;
    
    // Debug logging
    console.log('[FloatingBallMathGameScene] Block Decision Evaluation:', {
      currentScore: this.currentScore,
      target: this.currentEquation.target,
      ballOperator: ball.operator,
      ballValue: ball.value,
      newScore,
      isBadBall,
      ballLane: ball.lane,
      currentLane: this.currentLane,
      result: !isBadBall
    });
    
    // Block is correct if:
    // - Ball is bad (want to keep it in wrong lane to miss it)
    // - Or ball is good and keeping in current lane is safe
    return !isBadBall;
  }

  /**
   * Evaluate if adapt decision was correct
   */
  evaluateAdaptDecision(): boolean {
    // Find target ball
    const ball = this.balls.find(b => b.id === this.activeThiefEvent?.ballId);
    if (!ball) return false;
    
    // Check if ball would be good or bad for current equation
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
    const isBadBall = newScore < 0 || newScore > this.currentEquation.target * 2;
    
    // Debug logging
    console.log('[FloatingBallMathGameScene] Adapt Decision Evaluation:', {
      currentScore: this.currentScore,
      target: this.currentEquation.target,
      ballOperator: ball.operator,
      ballValue: ball.value,
      newScore,
      isBadBall,
      originalLane: ball.lane,
      targetLane: this.activeThiefEvent?.targetLane,
      currentLane: this.currentLane,
      result: !isBadBall && this.activeThiefEvent!.targetLane === this.currentLane
    });
    
    // Adapt is correct if ball is good and new lane is accessible
    return !isBadBall && this.activeThiefEvent!.targetLane === this.currentLane;
  }

  hideBlockButton() {
    if (this.blockTimerEvent) {
      this.blockTimerEvent.remove();
    }
    
    // Hide thief sprite
    this.thiefSprite.setVisible(false);
    
    this.tweens.add({
      targets: this.blockButton,
      scale: { from: 1, to: 0 },
      duration: 200,
      ease: "Quad.easeInOut",
      onComplete: () => {
        this.blockButton.setVisible(false);
        this.blockTimerBar.setVisible(false);
        this.blockTimerBar.clear(); // Clear graphics
      },
    });
  }

  update(time: number, delta: number) {
    // Update boat lane movement
    this.handleLaneMovement();
    
    // Update boat movement hints (arrow visibility)
    this.floatboatController.updateMovementHints();
    
    // Check for ball collisions
    if (!this.isLocked && !this.isPaused && this.physicsEnabled) {
      this.checkBallCollisions();
    }

    // Update water overlay animation
    if (this.waterOverlay) {
      this.waterPhysics.updateWaterOverlay(this.waterOverlay);
    }

    // Update ball positions
    if (!this.isPaused && this.physicsEnabled) {
      // FIX 1: Clean up off-screen balls FIRST (before filtering activeBalls)
      // This ensures newly spawned replacement balls are included in same frame's update
      this.cleanupOffScreenBalls();
      
      const activeBalls = this.balls.filter(ball => ball && ball.container && !ball.isCollected);
      
      // Regenerate balls if all collected (even after timeout)
      if (activeBalls.length === 0 && !this.isLocked) {
        console.log("[FloatingBallMathGameScene] No active balls, regenerating solvable ball set");
        this.generateSolvableBallSet();
      }
      
      activeBalls.forEach((ball) => {
        this.waterPhysics.updateBall(ball, delta);
        if (ball.container) {
          ball.container.setPosition(ball.x, ball.y);
        }
      });
    }

    // NEW: Track arm position during active thief event (runs every frame for smooth following)
    if (this.activeThiefEvent && this.armSprite.visible && !this.isPaused) {
      const trackedBall = this.balls.find(b => b.id === this.activeThiefEvent!.ballId);
      if (trackedBall && !trackedBall.isCollected && trackedBall.container) {
        const armOffset = 120; // Arm stays 120px above ball
        
        // Arm and button follow ball's position, staying above it
        const armY = trackedBall.y - armOffset;
        this.armSprite.setPosition(trackedBall.x, armY);
        this.blockButton.setPosition(trackedBall.x, armY - 40);
        
        // Update timer bar position
        this.drawBlockTimerBar(100);
        
        // Check if ball has gone below 50% of screen height from top
        // If so, execute adapt (steal) immediately
        const { height } = this.scale;
        const fiftyPercentHeight = height * 0.5;
        if (trackedBall.y > fiftyPercentHeight) {
          console.log(`[FloatingBallMathGameScene] Ball at Y=${trackedBall.y} is below 50% (${fiftyPercentHeight}) - executing adapt`);
          // Execute adapt immediately
          this.executeAdapt();
        }
      }
    }

    // Update timer
    if (!this.customTimerBar || !this.customTimerBar.visible || this.isPaused || this.continuedAfterTimeout) {
      return;
    }

    const limitMs = this.currentLevelConfig.timeLimitSeconds * 1000;
    const elapsed = Date.now() - this.startTime;
    const remainingMs = Math.max(0, limitMs - elapsed);
    const pct = Math.max(0, (remainingMs / limitMs) * 100);

    this.drawTimerBar(pct);
  }

  /**
   * Handle lane movement input
   */
  private handleLaneMovement() {
    if (this.isLocked || this.isPaused) return;

    const cursors = this.input.keyboard?.createCursorKeys();
    if (!cursors) return;

    if (cursors.left.isDown && this.currentLane > 0) {
      this.moveBoatToLane((this.currentLane - 1) as 0 | 1 | 2);
    } else if (cursors.right.isDown && this.currentLane < 2) {
      this.moveBoatToLane((this.currentLane + 1) as 0 | 1 | 2);
    }
  }

  /**
   * Check for collisions between balls and boat
   */
  checkBallCollisions() {
    const floatboat = this.floatboatController.getFloatboat();
    if (!floatboat) return;

    this.balls.forEach((ball) => {
      if (ball.isCollected || !ball.container) return;

      // Check collision based on actual positions, not just lane
      // Balls move in sine wave, so we need to check actual x position
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
   * Handle ball collection
   */
  async collectBall(ball: FloatingBall) {
    console.log(`[FloatingBallMathGameScene] Ball collected - id: ${ball.id}, operator: ${ball.operator}, value: ${ball.value}`);
    
    // Check if this ball is the target of an active thief event
    // If so, hide the arm immediately
    if (this.activeThiefEvent && this.activeThiefEvent.ballId === ball.id) {
      console.log("[FloatingBallMathGameScene] Target ball collected during thief event - hiding arm");
      this.armSprite.setVisible(false);
      // Clean up thief event since ball is gone
      this.cleanupThiefEvent();
    }
    
    // Check if bomb
    if (ball.isBomb) {
      this.bombHits++;
      await this.handleBombCollision(ball);
      return;
    }
    
    // FIX 2: Remove bad ball check - allow collecting ANY ball
    // Ball will be collected and score < 0 check will trigger endGameWithLoss()
    
    // Mark as collected
    ball.isCollected = true;
    this.ballsCollected++;
    
    if (this.soundBallCollect) {
      this.soundBallCollect.play();
    }

    // Apply operation
    this.applyOperation(ball);

    // FEATURE 1: Spawn replacement solvable ball if this was a solvable ball
    if (ball.isSolvable) {
      console.log("[FloatingBallMathGameScene] Solvable ball collected, spawning replacement");
      this.spawnReplacementSolvableBall();
    }

    // FEATURE 3: Check if score dropped below 0 - end game immediately with 0 stars
    if (this.currentScore < 0) {
      console.log("[FloatingBallMathGameScene] Score dropped below 0, ending game with loss");
      this.endGameWithLoss();
      return;
    }

    // Destroy ball
    if (ball.container) {
      ball.container.destroy();
      ball.container = null;
    }

    // Remove from array
    const index = this.balls.indexOf(ball);
    if (index !== -1) {
      this.balls.splice(index, 1);
    }

    // Check if target reached
    if (this.currentScore === this.currentEquation.target) {
      this.handleSuccess();
    } else if (this.currentScore < 0 || this.currentScore > this.currentEquation.target * 2) {
      this.handleOvershoot();
    }
  }

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

  async handleBombCollision(ball: FloatingBall) {
    console.log("[FloatingBallMathGameScene] Bomb collision!");
    
    if (this.soundBomb) {
      this.soundBomb.play();
    }

    this.cameras.main.shake(500, 0.02);

    if (ball.container) {
      ball.container.destroy();
      ball.container = null;
    }

    // Remove from array
    const index = this.balls.indexOf(ball);
    if (index !== -1) {
      this.balls.splice(index, 1);
    }

    this.time.delayedCall(1500, () => {
      this.resetEquation();
    });
  }

  handleSuccess() {
    console.log("[FloatingBallMathGameScene] handleSuccess called");
    this.correctEquations++;
    this.totalEquations++;
    this.successfulCollections++;
    this.currentErrorRun = 0;
    if (this.consecutiveErrors < this.currentErrorRun) {
      this.consecutiveErrors = this.currentErrorRun;
    }
    
    if (this.soundSuccess) {
      this.soundSuccess.play();
    }
    
    // Flash target display background green on success
    this.flashTargetDisplayGreen();

    this.completedEquationStats.push({
      target: this.currentEquation.target,
      ballsCollected: 1,
    });

    this.trackCompletedEquation(this.currentEquation.target);

    const childrenWithSign = this.floatboatController.getChildrenWithSign();
    const targets = childrenWithSign ? [childrenWithSign, this.targetDisplay, this.currentDisplay] : [this.targetDisplay, this.currentDisplay];
    this.tweens.add({
      targets: targets,
      scale: 1.2,
      duration: 200,
      yoyo: true,
      ease: "Back.easeOut",
    });

    this.time.delayedCall(1500, () => {
      // End game after completing the configured number of equations
      if (this.correctEquations >= this.currentLevelConfig.totalEquations) {
        this.endLevel();
      } else {
        this.generateNewEquation();
      }
    });
  }

  handleOvershoot() {
    console.log("[FloatingBallMathGameScene] handleOvershoot called");
    this.wrongEquations++;
    this.totalEquations++;
    this.currentErrorRun++;
    if (this.consecutiveErrors < this.currentErrorRun) {
      this.consecutiveErrors = this.currentErrorRun;
    }
    
    if (this.soundError) {
      this.soundError.play();
    }

    this.tweens.add({
      targets: this.currentDisplay,
      x: "+=10",
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: "Power2.easeInOut",
    });

    this.time.delayedCall(1500, () => {
      this.resetEquation();
    });
  }

  resetEquation() {
    console.log("[FloatingBallMathGameScene] resetEquation called");
    this.currentScore = 0;
    this.updateCurrentDisplay();
    this.isLocked = false;
  }

  trackCompletedEquation(result: number) {
    this.completedEquationResults.push(result);
    this.updateShadowBallDisplay();
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

    this.customTimerBar.fillStyle(0x90CAF9, 0.2);
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
    this.isLocked = true;
    this.isPaused = true;
    this.physicsEnabled = false; // Disable physics to stop ball movement
    
    // Stop ALL timers and event loops
    if (this.timerEvent) this.timerEvent.remove();
    if (this.thiefSpawnTimer) this.thiefSpawnTimer.remove();
    if (this.blockTimerEvent) this.blockTimerEvent.remove();
    if (this.armTrackingTimer) this.armTrackingTimer.remove();
    
    // Hide all UI elements
    if (this.customTimerBar) {
      this.customTimerBar.setVisible(false);
    }
    if (this.blockTimerBar) {
      this.blockTimerBar.setVisible(false);
    }
    
    // Clean up any active thief event
    if (this.activeThiefEvent) {
      this.cleanupThiefEvent();
    }
    
    if (this.backgroundFlashTween) {
      this.backgroundFlashTween.destroy();
    }
    
    // STOP ALL BALLS - freeze them in place
    this.balls.forEach((ball) => {
      if (ball && ball.container) {
        // Stop any tweens on this ball
        this.tweens.killTweensOf(ball.container);
        // Mark as collected to prevent further interactions
        ball.isCollected = true;
      }
    });
    
    console.log("[FloatingBallMathGameScene] All balls stopped and frozen");

    const endTime = Date.now();
    const totalTime = endTime - this.levelStartTime;

    const avgReactionTime =
      this.reactionTimes.length > 0
        ? this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length
        : 0;

    const stars = this.calculateStars(totalTime, avgReactionTime);
    
    const penaltyFactor = this.continuedAfterTimeout ? 0.7 : 1.0;
    
    // Log final stats for debugging
    console.log("[FloatingBallMathGameScene] Final Game Stats:", {
      thiefEvents: this.thiefEvents,
      blockSuccessCount: this.blockSuccessCount,
      adaptSuccessCount: this.adaptSuccessCount,
      decisionFailCount: this.decisionFailCount,
      onTimeDecisionCount: this.onTimeDecisionCount,
      lateDecisionCount: this.lateDecisionCount,
      panicBlock: this.panicBlock,
      panicAdapt: this.panicAdapt,
      bombHits: this.bombHits,
      consecutiveErrors: this.consecutiveErrors,
      difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
      penaltyFactor: penaltyFactor,
      totalTimeMs: totalTime,
      timeLimitSeconds: this.currentLevelConfig.timeLimitSeconds,
    });
    
    const gameStats: GameStats = {
      levelPlayed: this.currentLevelConfig.level,
      difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
      penaltyFactor: penaltyFactor,
      
      // Thief event tracking
      thiefEvents: this.thiefEvents,
      blockSuccessCount: this.blockSuccessCount,
      adaptSuccessCount: this.adaptSuccessCount,
      decisionFailCount: this.decisionFailCount,
      
      // Timing tracking
      onTimeDecisionCount: this.onTimeDecisionCount,
      lateDecisionCount: this.lateDecisionCount,
      timeLimitSeconds: this.currentLevelConfig.timeLimitSeconds, // Time limit for speed scoring
      
      // Panic behavior tracking
      panicBlock: this.panicBlock,
      panicAdapt: this.panicAdapt,
      
      // Ball interception tracking
      bombHits: this.bombHits,
      consecutiveErrors: this.consecutiveErrors,
      
      // Legacy fields
      totalEquations: this.totalEquations,
      correctEquations: this.correctEquations,
      wrongEquations: this.wrongEquations,
      totalTimeMs: totalTime,
      attempts: this.attempts,
      continuedAfterTimeout: this.continuedAfterTimeout,
    } as any;

    const onGameOver = this.registry.get("onGameOver");
    console.log("[FloatingBallMathGameScene] onGameOver callback from registry:", !!onGameOver);

    if (onGameOver) {
      const starHint = this.generateStarHint(stars, totalTime);
      
      const finalData = {
        success: true,
        stars,
        starHint,
        ...gameStats,
      };

      try {
        onGameOver(finalData);
      } catch (error) {
        console.error("[FloatingBallMathGameScene] Error in onGameOver callback:", error);
      }
    }

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
    // All players get at least 1 star for completing level
    let stars = 0;
    
    // 1 star: Pass ALL equations
    if (this.correctEquations === this.currentLevelConfig.totalEquations) {
      stars = 1;
    }
    
    // 2 stars: 1 star + complete in time (not continued after timeout)
    if (stars >= 1 && !this.continuedAfterTimeout) {
      stars = 2;
    }
    
    // 3 stars: 2 stars + no bomb hits + use <80% of time
    const timeLimitMs = this.currentLevelConfig.timeLimitSeconds * 1000;
    const usedLessThan80PercentTime = totalTime < (timeLimitMs * 0.8);
    
    if (stars >= 2 && this.bombHits === 0 && usedLessThan80PercentTime) {
      stars = 3;
    }
    
    console.log('[FloatingBallMathGameScene] Star Calculation:', {
      continuedAfterTimeout: this.continuedAfterTimeout,
      totalEquations: this.totalEquations,
      correctEquations: this.correctEquations,
      requiredEquations: this.currentLevelConfig.totalEquations,
      bombHits: this.bombHits,
      totalTimeMs: totalTime,
      timeLimitMs: timeLimitMs,
      timeUsedPercent: (totalTime / timeLimitMs * 100).toFixed(1),
      usedLessThan80Percent: usedLessThan80PercentTime,
      stars: stars
    });
    
    return stars;
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

  /**
   * Generate star hint based on what's blocking the next star
   */
  private generateStarHint(stars: number, totalTime: number): string {
    const timeLimitMs = this.currentLevelConfig.timeLimitSeconds * 1000;
    const timeUsedPercent = (totalTime / timeLimitMs * 100);
    const timeUsedSeconds = (totalTime / 1000).toFixed(1);
    const timeLimit80Seconds = ((timeLimitMs * 0.8) / 1000).toFixed(1);
    
    if (stars === 0) {
      return "ต้องผ่านสมการทั้งหมดเพื่อรับ 1 ⭐";
    } else if (stars === 1) {
      if (this.continuedAfterTimeout) {
        return "เสร็จในเวลาเพื่อรับ 2 ⭐";
      } else if (this.bombHits > 0) {
        return `หลบลูกระเบิด (${this.bombHits} ครั้ง) เพื่อรับ 3 ⭐`;
      } else {
        return `ใช้เวลาต่ำกว่า ${timeLimit80Seconds} วินาทีเพื่อรับ 3 ⭐`;
      }
    } else if (stars === 2) {
      if (this.bombHits > 0) {
        return `หลบลูกระเบิด (${this.bombHits} ครั้ง) เพื่อรับ 3 ⭐`;
      } else {
        return `ใช้เวลาต่ำกว่า ${timeLimit80Seconds} วินาทีเพื่อรับ 3 ⭐`;
      }
    }
    
    return ""; // 3 stars - no hint needed
  }

  layoutGame() {
    const { width, height } = this.scale;

    if (this.targetDisplay) {
      this.targetDisplay.setPosition(width * 0.5, height * 0.2);
    }

    if (this.currentDisplay) {
      this.currentDisplay.setPosition(width * 0.15, height * 0.12);
    }

    if (this.shadowBallContainer) {
      const y = height - Math.min(100, height * 0.15);
      this.shadowBallContainer.setPosition(width / 2, y);
    }

    if (this.customTimerBar && this.customTimerBar.visible) {
      this.drawTimerBar(this.lastTimerPct);
    }
    
    // Update lane positions
    this.laneWidth = width / 3;
    this.lanes = {
      left: this.laneWidth * 0.5,
      center: width * 0.5,
      right: width * 0.75 + this.laneWidth * 0.25,
    };
    
    // Move boat to current lane's new position
    this.floatboatController.getFloatboat()?.container.setPosition(
      this.getLanePosition(this.currentLane),
      height * 0.75
    );
  }
}
