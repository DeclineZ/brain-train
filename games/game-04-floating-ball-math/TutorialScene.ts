import * as Phaser from "phaser";
import { WaterPhysics } from "./utils/WaterPhysics";

type Lane = 0 | 1 | 2;
type Op = "+" | "-" | "*" | "/";

type TutorialBall = {
  id: string;
  container: Phaser.GameObjects.Container;
  sprite?: Phaser.GameObjects.Image;
  valueText?: Phaser.GameObjects.Text;
  op: Op;
  value: number;
  isBomb: boolean;
  x: number;
  y: number;
  lane: Lane;
  speedY: number;
  waveT: number;
  waveAmp: number;
  waveSpeed: number;
  destroyed: boolean;
};

type TutorialStep = {
  title: string;
  body: string;
  // Called when the step becomes active
  enter?: () => void;
  // Called every frame while active
  update?: (dt: number) => void;
  // Return true to enable "Next"
  isComplete?: () => boolean;
  // Called when leaving the step
  exit?: () => void;
  // If true, "Next" is always enabled
  allowNext?: boolean;
};

export class TutorialScene extends Phaser.Scene {
  // Lanes
  private lanes: { left: number; center: number; right: number } = {
    left: 0,
    center: 0,
    right: 0,
  };
  private laneWidth = 0;
  private currentLane: Lane = 1;

  // Background
  private bg!: Phaser.GameObjects.Graphics;
  private waterPhysics!: WaterPhysics;
  private waterOverlay!: Phaser.GameObjects.Graphics;
  private waterBackground!: Phaser.GameObjects.Graphics;
  
  // Audio
  private bgMusic!: Phaser.Sound.BaseSound;

  // Boat
  private boatContainer!: Phaser.GameObjects.Container;
  private boatSprite!: Phaser.GameObjects.Image;
  private isDraggingBoat = false;
  private dragStartX = 0;
  private leftArrow!: Phaser.GameObjects.Graphics;
  private rightArrow!: Phaser.GameObjects.Graphics;

  // HUD (Target/Current)
  private targetBox!: Phaser.GameObjects.Container;
  private currentBox!: Phaser.GameObjects.Container;
  private targetText!: Phaser.GameObjects.Text;
  private currentText!: Phaser.GameObjects.Text;
  private target = 6;
  private current = 0;

  // Tutorial panel + buttons
  private panel!: Phaser.GameObjects.Container;
  private panelTitle!: Phaser.GameObjects.Text;
  private panelBody!: Phaser.GameObjects.Text;
  private nextBtn!: Phaser.GameObjects.Container;
  private backBtn!: Phaser.GameObjects.Container;
  private skipBtn!: Phaser.GameObjects.Container;
  private nextBtnLabel!: Phaser.GameObjects.Text;

  // Step state
  private stepIndex = 0;
  private steps: TutorialStep[] = [];
  private stepEntered = false;
  private stepCompleteOverride = false;
  private autoAdvanceScheduled = false; // Flag to prevent multiple auto-advances

  // Step-specific flags
  private movedLeft = false;
  private movedRight = false;
  private collectedDemoBall = false;
  private bombTriggered = false;
  private collectedGoodBombsStep = false;

  // Balls
  private balls: TutorialBall[] = [];

  // Thief demo
  private thiefSprite!: Phaser.GameObjects.Image;
  private armSprite!: Phaser.GameObjects.Image;
  private blockBtn!: Phaser.GameObjects.Container;
  private blockTimerBar!: Phaser.GameObjects.Graphics;
  private thiefActive = false;
  private thiefAppearTime = 0;
  private thiefDecisionWindowMs = 3000;
  private thiefTargetBallId: string | null = null;

  // Input
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: "TutorialScene" });
  }

  preload() {
    // If your game scene already preloads these, Phaser will no-op.
    this.load.image("ball-1", "/assets/images/floatingBallMath/Ball-1.png");
    this.load.image("ball-2", "/assets/images/floatingBallMath/Ball-2.png");
    this.load.image("ball-3", "/assets/images/floatingBallMath/Ball-3.png");
    this.load.image("ball-4", "/assets/images/floatingBallMath/Ball-4.png");
    this.load.image("bomb-ball", "/assets/images/floatingBallMath/Bomb.png");
    this.load.image("boat", "/assets/images/floatingBallMath/Boat.png");
    this.load.image("thief", "/assets/images/floatingBallMath/Thief.png");
    this.load.image("arm", "/assets/images/floatingBallMath/Arm.png");
    
    // Load background music
    this.load.audio("bg-music", "/assets/sounds/floatingball-math/bg-music.mp3");
  }

  create() {
    const { width, height } = this.scale;

    this.setupLanes(width);

    this.createBackground(width, height);
    this.createHud(width, height);
    this.createBoat(width, height);
    this.createThiefUi(width, height);
    this.createTutorialPanel(width, height);

    this.cursors = this.input.keyboard?.createCursorKeys();

    this.steps = this.buildSteps();

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

    // Resize
    this.scale.on("resize", () => this.layout());

    // Start first step
    this.goToStep(0);
  }

  update(_time: number, delta: number) {
    const dt = Math.max(0, delta);

    // Update water overlay animation
    if (this.waterOverlay) {
      this.waterPhysics.updateWaterOverlay(this.waterOverlay);
    }

    // Step enter hook (deferred until update so layout is stable)
    const step = this.steps[this.stepIndex];
    if (!this.stepEntered) {
      this.stepEntered = true;
      this.stepCompleteOverride = false;
      this.autoAdvanceScheduled = false; // Reset auto-advance flag
      step.enter?.();
      this.refreshPanel();
    }

    // Movement input always allowed in tutorial
    this.handleBoatMovement();
    this.updateBalls(dt);
    this.checkCollisions();

    // Thief timer
    if (this.thiefActive) {
      this.updateThiefTimer();
      this.trackArmToBall();
      const elapsed = Date.now() - this.thiefAppearTime;
      if (elapsed >= this.thiefDecisionWindowMs) {
        // Timeout: auto "adapt" for demo
        this.resolveThiefDecision(false);
      }
    }

    // Step update
    step.update?.(dt);

    // Next button enable/disable and auto-advance logic
    const complete =
      this.stepCompleteOverride ||
      step.allowNext === true ||
      (step.isComplete ? step.isComplete() : true);
    this.setNextEnabled(complete);

    // AUTO-ADVANCE: If step has isComplete() and it's complete, auto-advance after delay
    if (!this.autoAdvanceScheduled && step.isComplete && step.isComplete() && !step.allowNext) {
      this.autoAdvanceScheduled = true;
      this.time.delayedCall(500, () => {
        this.goToStep(this.stepIndex + 1);
      });
    }
  }

  // -----------------------------
  // Layout / Setup
  // -----------------------------
  private setupLanes(width: number) {
    this.laneWidth = width / 3;
    this.lanes = {
      left: this.laneWidth * 0.5,
      center: width * 0.5,
      right: width * 0.75 + this.laneWidth * 0.25,
    };
  }

  private getLaneX(lane: Lane): number {
    if (lane === 0) return this.lanes.left;
    if (lane === 1) return this.lanes.center;
    return this.lanes.right;
  }

  private createBackground(width: number, height: number) {
    // Create gradient background
    this.waterBackground = this.add.graphics();
    this.waterBackground.fillGradientStyle(0xE3F2FD, 0xE3F2FD, 0xBBDEFB, 0xBBDEFB, 1);
    this.waterBackground.fillRect(0, 0, width, height);
    this.waterBackground.setDepth(-2);

    // Initialize water physics
    this.waterPhysics = new WaterPhysics(this, {
      level: 1,
      difficultyMultiplier: 1,
      timeLimitSeconds: 60,
      totalEquations: 5,
      operandRange: { min: 1, max: 9 },
      operations: ['+', '-', '*', '/'],
      waterSpeed: 1.0,
      waveAmplitude: 15,
    } as any);

    // Create water wave overlay
    this.waterOverlay = this.waterPhysics.createWaterOverlay();
  }

  private createHud(width: number, height: number) {
    // Target
    this.targetBox = this.add.container(width * 0.5, height * 0.18);
    const targetLabel = this.add
      .text(0, -42, "เป้าหมาย", {
        fontFamily: "Sarabun, Arial, sans-serif",
        fontSize: `${Math.min(22, width * 0.04)}px`,
        color: "#1976D2",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const targetBg = this.add.graphics();
    targetBg.fillStyle(0x1976d2, 1);
    targetBg.fillRoundedRect(-110, -24, 220, 58, 14);

    this.targetText = this.add
      .text(0, 2, String(this.target), {
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.min(44, width * 0.085)}px`,
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.targetBox.add([targetLabel, targetBg, this.targetText]);

    // Current
    this.currentBox = this.add.container(width * 0.85, height * 0.15);
    this.currentBox.setDepth(50);

    const currentLabel = this.add
      .text(0, -30, "คะแนนปัจจุบัน", {
        fontFamily: "Sarabun, Arial, sans-serif",
        fontSize: `${Math.min(18, width * 0.032)}px`,
        color: "#2b2b2b",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.currentText = this.add
      .text(0, 0, String(this.current), {
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.min(30, width * 0.055)}px`,
        color: "#555555",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.currentBox.add([currentLabel, this.currentText]);
  }

  private createBoat(width: number, height: number) {
    const boatY = height * 0.78;

    this.boatSprite = this.add.image(0, 0, "boat");
    this.boatSprite.setOrigin(0.5);
    this.boatSprite.setScale(0.25);

    this.boatContainer = this.add.container(this.getLaneX(1), boatY, [
      this.boatSprite,
    ]);

    // Drag movement
    this.boatSprite.setInteractive({ useHandCursor: true });
    this.input.setDraggable(this.boatSprite);

    this.boatSprite.on("dragstart", (pointer: Phaser.Input.Pointer) => {
      this.isDraggingBoat = true;
      this.dragStartX = pointer.x;
    });

    this.boatSprite.on("drag", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDraggingBoat) return;
      const dx = pointer.x - this.dragStartX;
      const newX = this.boatContainer.x + dx;

      const boatW = 80;
      const minX = boatW / 2;
      const maxX = this.scale.width - boatW / 2;

      this.boatContainer.x = Phaser.Math.Clamp(newX, minX, maxX);
      this.dragStartX = pointer.x;

      this.updateLaneFromX(this.boatContainer.x);
    });

    this.boatSprite.on("dragend", () => {
      this.isDraggingBoat = false;
      this.snapBoatToLane();
    });

    // A tiny “hit circle” for collision
    const hit = this.add.circle(0, -10, 35, 0x000000, 0);
    hit.setName("boatHit");
    this.boatContainer.add(hit);
  }

  private updateLaneFromX(x: number) {
    const d0 = Math.abs(x - this.lanes.left);
    const d1 = Math.abs(x - this.lanes.center);
    const d2 = Math.abs(x - this.lanes.right);
    const min = Math.min(d0, d1, d2);
    const lane: Lane = min === d0 ? 0 : min === d1 ? 1 : 2;
    if (lane !== this.currentLane) {
      this.currentLane = lane;
      // Track movement step completion
      if (lane === 0) this.movedLeft = true;
      if (lane === 2) this.movedRight = true;
    }
  }

  private snapBoatToLane() {
    const targetX = this.getLaneX(this.currentLane);
    this.tweens.add({
      targets: this.boatContainer,
      x: targetX,
      duration: 150,
      ease: "Quad.easeInOut",
    });
  }

  private handleBoatMovement() {
    if (!this.cursors) return;

    if (this.cursors.left?.isDown && this.currentLane > 0) {
      this.moveBoatToLane((this.currentLane - 1) as Lane);
    } else if (this.cursors.right?.isDown && this.currentLane < 2) {
      this.moveBoatToLane((this.currentLane + 1) as Lane);
    }
  }

  private moveBoatToLane(lane: Lane) {
    if (lane === this.currentLane) return;
    this.currentLane = lane;

    if (lane === 0) this.movedLeft = true;
    if (lane === 2) this.movedRight = true;

    this.tweens.add({
      targets: this.boatContainer,
      x: this.getLaneX(lane),
      duration: 160,
      ease: "Quad.easeInOut",
    });
  }

  private createMovementArrows() {
    const { height } = this.scale;
    const boatY = height * 0.78;
    const arrowSize = 40;
    const arrowOffsetX = 120;
    const arrowOffsetY = -20;

    // Left arrow
    this.leftArrow = this.add.graphics();
    this.leftArrow.setDepth(100);
    this.leftArrow.lineStyle(6, 0x2196F3, 1);
    this.leftArrow.fillStyle(0x2196F3, 0.9);
    
    // Draw left arrow
    this.leftArrow.beginPath();
    const leftX = this.getLaneX(1) - arrowOffsetX;
    this.leftArrow.moveTo(leftX + arrowSize/2, boatY + arrowOffsetY);
    this.leftArrow.lineTo(leftX - arrowSize/2, boatY + arrowOffsetY);
    this.leftArrow.lineTo(leftX - arrowSize/2 + 10, boatY + arrowOffsetY - 10);
    this.leftArrow.lineTo(leftX - arrowSize/2 + 10, boatY + arrowOffsetY + 10);
    this.leftArrow.lineTo(leftX - arrowSize/2, boatY + arrowOffsetY);
    this.leftArrow.closePath();
    this.leftArrow.fill();
    this.leftArrow.stroke();

    // Right arrow
    this.rightArrow = this.add.graphics();
    this.rightArrow.setDepth(100);
    this.rightArrow.lineStyle(6, 0x2196F3, 1);
    this.rightArrow.fillStyle(0x2196F3, 0.9);
    
    // Draw right arrow
    this.rightArrow.beginPath();
    const rightX = this.getLaneX(1) + arrowOffsetX;
    this.rightArrow.moveTo(rightX - arrowSize/2, boatY + arrowOffsetY);
    this.rightArrow.lineTo(rightX + arrowSize/2, boatY + arrowOffsetY);
    this.rightArrow.lineTo(rightX + arrowSize/2 - 10, boatY + arrowOffsetY - 10);
    this.rightArrow.lineTo(rightX + arrowSize/2 - 10, boatY + arrowOffsetY + 10);
    this.rightArrow.lineTo(rightX + arrowSize/2, boatY + arrowOffsetY);
    this.rightArrow.closePath();
    this.rightArrow.fill();
    this.rightArrow.stroke();

    // Animate arrows
    this.animateArrows();
  }

  private animateArrows() {
    if (!this.leftArrow || !this.rightArrow) return;
    
    // Pulse animation for arrows
    this.tweens.add({
      targets: [this.leftArrow, this.rightArrow],
      alpha: { from: 0.9, to: 0.5 },
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: "Sine.easeInOut",
    });

    // Slight horizontal movement
    this.tweens.add({
      targets: this.leftArrow,
      x: { from: this.leftArrow.x, to: this.leftArrow.x - 10 },
      yoyo: true,
      repeat: -1,
      duration: 1000,
      ease: "Sine.easeInOut",
    });

    this.tweens.add({
      targets: this.rightArrow,
      x: { from: this.rightArrow.x, to: this.rightArrow.x + 10 },
      yoyo: true,
      repeat: -1,
      duration: 1000,
      ease: "Sine.easeInOut",
    });
  }

  private hideMovementArrows() {
    if (this.leftArrow) {
      this.leftArrow.destroy();
      this.leftArrow = null as any;
    }
    if (this.rightArrow) {
      this.rightArrow.destroy();
      this.rightArrow = null as any;
    }
  }

  private createThiefUi(width: number, height: number) {
    this.thiefSprite = this.add.image(width - 80, 180, "thief");
    this.thiefSprite.setVisible(false);
    this.thiefSprite.setDepth(900);

    this.tweens.add({
      targets: this.thiefSprite,
      scale: { from: 1, to: 1.1 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.armSprite = this.add.image(width * 0.5, height * 0.3, "arm");
    this.armSprite.setVisible(false);
    this.armSprite.setDepth(950);
    this.armSprite.setScale(1.3);

    // BLOCK button
    this.blockBtn = this.makeButton("ห้ามโจร", 140, 54, 0xff5252);
    this.blockBtn.setDepth(2000);
    this.blockBtn.setVisible(false);
    this.blockBtn.on("pointerdown", () => {
      if (!this.thiefActive) return;
      this.resolveThiefDecision(true);
    });

    this.blockTimerBar = this.add.graphics();
    this.blockTimerBar.setDepth(1999);
    this.blockTimerBar.setVisible(false);
  }

  private createTutorialPanel(width: number, height: number) {
    this.panel = this.add.container(width * 0.5, height * 0.5);
    this.panel.setDepth(0);

    this.panelTitle = this.add
      .text(-width * 0.31, -height * 0.14, "แนะนำการเล่น", {
        fontFamily: "Sarabun, Arial, sans-serif",
        fontSize: `${Math.min(32, width * 0.055)}px`, // INCREASED from 24px/0.04 to 32px/0.055
        color: "#111111",
        fontStyle: "bold",
      })
      .setOrigin(0, 0)
      .setPadding({ top: 5, bottom: 5, left: 5, right: 5 }); // Add padding for Thai text

    this.panelBody = this.add
      .text(-width * 0.31, -height * 0.095, "", {
        fontFamily: "Sarabun, Arial, sans-serif",
        fontSize: `${Math.min(22, width * 0.4)}px`, // INCREASED from 17px/0.3 to 22px/0.4
        color: "#222222",
        wordWrap: { width: width * 0.59 },
        lineSpacing: 8,
      })
      .setOrigin(0, 0)
      .setPadding({ top: 5, bottom: 8, left: 5, right: 5 }); // Add padding for Thai diacritics

    // Buttons - only Back and Next (Skip removed)
    this.backBtn = this.makeButton("ย้อนกลับ", 100, 42, 0x90a4ae);
    this.nextBtn = this.makeButton("ถัดไป", 100, 42, 0x1976d2);
    // Skip button removed - no longer needed with auto-advance

    // Position buttons: Back on left, Next on right (centered)
    this.backBtn.setPosition(-60, height * 0.115);
    this.nextBtn.setPosition(60, height * 0.115);
    // Skip button position removed

    this.nextBtnLabel = this.nextBtn.getByName("label") as Phaser.GameObjects.Text;

    this.backBtn.on("pointerdown", () => this.goToStep(this.stepIndex - 1));
    this.nextBtn.on("pointerdown", () => this.goToStep(this.stepIndex + 1));
    // Skip button handler removed

    this.panel.add([this.panelTitle, this.panelBody, this.backBtn, this.nextBtn]); // Skip removed from panel
  }

  private makeButton(label: string, w: number, h: number, color: number) {
    const c = this.add.container(0, 0);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });

    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);

    const t = this.add
      .text(0, 0, label, {
        fontFamily: "Sarabun, Arial, sans-serif",
        fontSize: "20px", // INCREASED from 18px to 20px
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setPadding({ top: 3, bottom: 3, left: 3, right: 3 }); // Add padding for Thai text
    t.setName("label");

    c.add([g, t]);
    return c;
  }

  private layout() {
    const { width, height } = this.scale;

    this.setupLanes(width);

    // Background
    if (this.waterBackground) {
      this.waterBackground.clear();
      this.waterBackground.fillGradientStyle(0xE3F2FD, 0xE3F2FD, 0xBBDEFB, 0xBBDEFB, 1);
      this.waterBackground.fillRect(0, 0, width, height);
    }

    // HUD
    this.targetBox?.setPosition(width * 0.5, height * 0.18);
    this.currentBox?.setPosition(width * 0.16, height * 0.12);

    // Boat
    this.boatContainer?.setPosition(this.getLaneX(this.currentLane), height * 0.78);

    // Thief sprites
    this.thiefSprite?.setPosition(width - 80, 180);

    // Panel
    this.panel?.setPosition(width * 0.5, height * 0.5);

    // If block UI visible, keep timer bar aligned
    if (this.blockBtn?.visible) {
      this.drawBlockTimerBar(this.getThiefRemainingPct());
    }

    this.refreshPanel();
  }

  // -----------------------------
  // Steps
  // -----------------------------
  private buildSteps(): TutorialStep[] {
    return [
      {
        title: "แนะนำการเล่น",
        body:
          "เก็บลูกบอลเพื่อทำคะแนน\nให้ถึงเป้าหมาย\nแต่ละลูกบอลใช้ + − × ÷",
        allowNext: true,
        enter: () => {
          this.resetDemoState();
          this.setEquation(6, 0);
          this.clearBalls();
          this.hideThiefUi();
        },
      },
      {
        title: "เคลื่อนที่เรือ",
        body:
          "เคลื่อนที่ด้วยการลากเรือแนวนอน\nให้เรือไปที่เลนซ้ายและขวา\nอย่างละหนึ่งครั้ง",
        enter: () => {
          this.movedLeft = false;
          this.movedRight = false;
          this.clearBalls();
          this.hideThiefUi();
          this.createMovementArrows();
        },
        update: (dt: number) => {
            // Show arrows based on completed movements
            if (this.movedLeft) {
              this.leftArrow.setVisible(false);
            }else{
              this.leftArrow.setVisible(true);
            }
            if (this.movedRight) {
              this.rightArrow.setVisible(false);
            }else{
              this.rightArrow.setVisible(true); 
            }
        },
        exit: () => {
          this.hideMovementArrows();
        },
        isComplete: () => this.movedLeft && this.movedRight,
      },
      {
        title: "เก็บลูกบอลดี",
        body:
          "เก็บลูกบอล +3 เพื่อเพิ่มคะแนน",
        enter: () => {
          this.collectedDemoBall = false;
          this.setEquation(6, 0);
          this.clearBalls();
          this.hideThiefUi();
          this.spawnBall({ op: "+", value: 3, lane: 1, isBomb: false, y: -80 });
        },
        isComplete: () => this.collectedDemoBall,
      },
      {
        title: "หลีกเลี่ยงระเบิด",
        body:
          "ให้หลบระเบิด ถ้าโดนระเบิดคะแนนจะรีเซ็ต",
        enter: () => {
          this.bombTriggered = false;
          this.collectedGoodBombsStep = false;
          this.setEquation(6, 0);
          this.clearBalls();
          this.hideThiefUi();
          this.spawnBall({ op: "+", value: 2, lane: 0, isBomb: false, y: -180 });
          this.spawnBall({ op: "+", value: 2, lane: 2, isBomb: false, y: -260 });
          this.spawnBall({ op: "+", value: 1, lane: 1, isBomb: true, y: -120 }); // bomb
        },
        isComplete: () => this.collectedGoodBombsStep && !this.bombTriggered,
      },
      {
        title: "โจรขโมย (ห้ามขโมย)",
        body:
          "กดปุ่ม 'ห้ามโจร' ภายในเวลา\nที่กำหนดเพื่อยกเลิกโจร",
        enter: () => {
          this.setEquation(6, 0);
          this.clearBalls();
          this.startThiefDemo();
        },
        isComplete: () => this.stepCompleteOverride,
      },
      {
        title: "เรียบร้อย",
        body:
          "สิ้นสุดการแนะนำ\nกดถัดไปเพื่อเริ่มเล่นจริง",
        allowNext: true,
        enter: () => {
          this.clearBalls();
          this.hideThiefUi();
        },
        exit: () => {
          // no-op
        },
      },
    ];
  }

  private refreshPanel() {
    const step = this.steps[this.stepIndex];
    this.panelTitle.setText(step.title);
    this.panelBody.setText(step.body);

    // Back disabled on first step
    this.backBtn.setAlpha(this.stepIndex === 0 ? 0.5 : 1);
    this.backBtn.disableInteractive();
    if (this.stepIndex !== 0) this.backBtn.setInteractive({ useHandCursor: true });

    // Next button: show only for allowNext steps, hide for interactive steps (auto-advance)
    const isInteractiveStep = step.isComplete !== undefined && !step.allowNext;
    if (isInteractiveStep) {
      this.nextBtn.setVisible(false); // Hide Next button on interactive steps
    } else {
      this.nextBtn.setVisible(true); // Show Next button on informational steps
    }

    // Next label for last step
    const isLast = this.stepIndex === this.steps.length - 1;
    this.nextBtnLabel.setText(isLast ? "เริ่มเกม" : "ถัดไป");
  }

  private goToStep(index: number) {
    // Check if we're trying to go past last step
    const isLastStep = this.stepIndex === this.steps.length - 1;
    const isMovingForward = index > this.stepIndex;

    // If on last step and trying to go forward, finish tutorial
    // This handles both manual Next button click and auto-advance
    if (isLastStep && isMovingForward) {
      const current = this.steps[this.stepIndex];
      current.exit?.();
      this.finishTutorial();
      return;
    }

    const clamped = Phaser.Math.Clamp(index, 0, this.steps.length - 1);
    if (clamped === this.stepIndex && this.stepEntered) return;

    // Exit current
    const current = this.steps[this.stepIndex];
    current.exit?.();

    this.stepIndex = clamped;
    this.stepEntered = false;

    this.refreshPanel();
  }

  private setNextEnabled(enabled: boolean) {
    this.nextBtn.setAlpha(enabled ? 1 : 0.45);
    this.nextBtn.disableInteractive();
    if (enabled) this.nextBtn.setInteractive({ useHandCursor: true });
  }

  private finishTutorial() {
    // Stop background music before transitioning to game
    if (this.bgMusic && this.bgMusic.isPlaying) {
      this.bgMusic.stop();
    }

    // Call the tutorial complete callback (like other tutorials)
    const onTutorialComplete = this.registry.get('onTutorialComplete');
    if (onTutorialComplete) {
      onTutorialComplete();
    }

    // Start the real game scene
    const levelFromRegistry = this.registry.get("level");
    const level = typeof levelFromRegistry === "number" ? levelFromRegistry :1;

    // Clean up
    this.clearBalls();
    this.hideThiefUi();

    this.scene.start("FloatingBallMathGameScene", { level });
  }

    private resetDemoState() {
    this.movedLeft = false;
    this.movedRight = false;
    this.collectedDemoBall = false;
    this.bombTriggered = false;
    this.collectedGoodBombsStep = false;
    this.stepCompleteOverride = false;
  }

  // -----------------------------
  // Equation + HUD updates
  // -----------------------------
  private setEquation(target: number, current: number) {
    this.target = target;
    this.current = current;
    this.targetText.setText(String(this.target));
    this.currentText.setText(String(this.current));
  }

  private applyBall(op: Op, value: number) {
    switch (op) {
      case "+":
        this.current += value;
        break;
      case "-":
        this.current -= value;
        break;
      case "*":
        this.current *= value;
        break;
      case "/":
        if (value !== 0) this.current = Math.round(this.current / value);
        break;
    }
    this.currentText.setText(String(this.current));

    this.tweens.add({
      targets: this.currentBox,
      scale: { from: 1, to: 1.12 },
      duration: 120,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  // -----------------------------
  // Balls
  // -----------------------------
  private spawnBall(opts: { op: Op; value: number; lane: Lane; isBomb: boolean; y?: number }) {
    const id = `ball-${Math.random().toString(16).slice(2)}`;
    const x = this.getLaneX(opts.lane);
    const y = typeof opts.y === "number" ? opts.y : -120;

    const container = this.add.container(x, y);
    container.setDepth(100);

    const key = opts.isBomb
      ? "bomb-ball"
      : (["ball-1", "ball-2", "ball-3", "ball-4"][Phaser.Math.Between(0, 3)] as string);

    const sprite = this.textures.exists(key) ? this.add.image(0, 0, key) : undefined;
    if (sprite) {
      sprite.setOrigin(0.5);
      const ballRadius = Math.min(60, this.scale.width * 0.12);
      sprite.setDisplaySize(ballRadius * 2, ballRadius * 2);
      container.add(sprite);
    } else {
      const ballRadius = Math.min(60, this.scale.width * 0.12);
      const fallback = this.add.circle(0, 0, ballRadius, opts.isBomb ? 0x000000 : 0x42a5f5, 1);
      container.add(fallback);
    }

    // Only add value text for regular balls, not bombs
    let valueText: Phaser.GameObjects.Text | undefined;
    if (!opts.isBomb) {
      valueText = this.add
        .text(0, 0, `${opts.op}${opts.value}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: `${Math.min(42, this.scale.width * 0.075)}px`,
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      container.add(valueText);
    }

    const ball: TutorialBall = {
      id,
      container,
      sprite,
      valueText,
      op: opts.op,
      value: opts.value,
      isBomb: opts.isBomb,
      x,
      y,
      lane: opts.lane,
      speedY: opts.isBomb ? 210 : 170,
      waveT: Phaser.Math.FloatBetween(0, 10),
      waveAmp: Phaser.Math.FloatBetween(10, 22),
      waveSpeed: Phaser.Math.FloatBetween(0.004, 0.006),
      destroyed: false,
    };

    this.balls.push(ball);
    return ball;
  }

  private clearBalls() {
    this.balls.forEach((b) => {
      if (!b.destroyed) {
        b.container.destroy();
        b.destroyed = true;
      }
    });
    this.balls = [];
    this.thiefTargetBallId = null;
  }

  private updateBalls(dt: number) {
    const { height } = this.scale;
    for (const b of this.balls) {
      if (b.destroyed) continue;

      b.waveT += dt * b.waveSpeed;
      const waveX = Math.sin(b.waveT) * b.waveAmp;

      b.y += (b.speedY * dt) / 1000;
      b.x = this.getLaneX(b.lane) + waveX;

      b.container.setPosition(b.x, b.y);

      // Cleanup if off-screen
      if (b.y > height + 120) {
        b.container.destroy();
        b.destroyed = true;
      }
    }

    this.balls = this.balls.filter((b) => !b.destroyed);
  }

  private checkCollisions() {
    // Simple circle collision
    const bx = this.boatContainer.x;
    const by = this.boatContainer.y - 10;

    for (const b of this.balls) {
      if (b.destroyed) continue;

      const dx = b.x - bx;
      const dy = b.y - by;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 60) {
        this.onBallHit(b);
      }
    }
  }

  private onBallHit(ball: TutorialBall) {
    if (ball.destroyed) return;

    if (ball.isBomb) {
      ball.container.destroy();
      ball.destroyed = true;

      // Bomb feedback
      this.cameras.main.shake(350, 0.015);
      this.setEquation(this.target, 0);

      this.bombTriggered = true;
      return;
    }

    // Apply operation
    this.applyBall(ball.op, ball.value);

    // Mark step completion if it's the +3 demo
    if (ball.op === "+" && ball.value === 3) {
      this.collectedDemoBall = true;
    }

    // Track if both +2 balls are collected in bomb avoidance step
    if (ball.op === "+" ) {
      
        this.collectedGoodBombsStep = true;
    }

    ball.container.destroy();
    ball.destroyed = true;

    // If thief is targeting this ball, end thief UI cleanly
    if (this.thiefActive && this.thiefTargetBallId === ball.id) {
      this.hideThiefUi();
      this.thiefActive = false;
      this.thiefTargetBallId = null;
    }
  }

  // -----------------------------
  // Thief demo
  // -----------------------------
  private startThiefDemo() {
    this.hideThiefUi();

    // Disable thief timer for tutorial (set to very large value)
    this.thiefDecisionWindowMs = 999999;

    // Spawn a target ball near 40% height
    const { height } = this.scale;
    const warningY = height * 0.4;

    const ball = this.spawnBall({ op: "+", value: 2, lane: 1, isBomb: false, y: warningY - 10 });
    ball.speedY = 60; // slow so player can react

    this.thiefTargetBallId = ball.id;
    this.thiefActive = true;
    this.thiefAppearTime = Date.now();

    this.thiefSprite.setVisible(true);
    this.armSprite.setVisible(true);

    // Place arm and block UI above the ball
    this.armSprite.setPosition(ball.x, warningY);

    this.blockBtn.setVisible(true);
    this.blockBtn.setPosition(ball.x, warningY - 44);

    this.blockTimerBar.setVisible(true);
    this.drawBlockTimerBar(100);
  }

  private hideThiefUi() {
    this.thiefActive = false;
    this.thiefSprite?.setVisible(false);
    this.armSprite?.setVisible(false);
    this.blockBtn?.setVisible(false);
    this.blockTimerBar?.setVisible(false);
    this.blockTimerBar?.clear();
  }

  private trackArmToBall() {
    if (!this.thiefActive || !this.thiefTargetBallId) return;

    const { height } = this.scale;
    const warningY = height * 0.4;

    const b = this.balls.find((x) => x.id === this.thiefTargetBallId && !x.destroyed);
    if (!b) return;

    this.armSprite.setPosition(b.x, warningY);
    this.blockBtn.setPosition(b.x, warningY - 44);
  }

  private updateThiefTimer() {
    this.drawBlockTimerBar(this.getThiefRemainingPct());
  }

  private getThiefRemainingPct() {
    if (!this.thiefActive) return 0;
    const elapsed = Date.now() - this.thiefAppearTime;
    const remaining = Math.max(0, this.thiefDecisionWindowMs - elapsed);
    return (remaining / this.thiefDecisionWindowMs) * 100;
  }

  private drawBlockTimerBar(pct: number) {
    if (!this.blockTimerBar || !this.blockBtn) return;

    this.blockTimerBar.clear();
    const barW = 140;
    const barH = 9;
    const x = this.blockBtn.x - barW / 2;
    const y = this.blockBtn.y + 40;

    this.blockTimerBar.fillStyle(0x000000, 0.25);
    this.blockTimerBar.fillRoundedRect(x, y, barW, barH, 5);

    if (pct > 0) {
      const fillW = barW * (pct / 100);
      const color = pct < 30 ? 0xff4444 : 0x76d13d;
      this.blockTimerBar.fillStyle(color, 1);
      this.blockTimerBar.fillRoundedRect(x, y, fillW, barH, 5);
    }
  }

  /**
   * @param didBlock true = player pressed BLOCK on time, false = timeout (auto adapt)
   */
  private resolveThiefDecision(didBlock: boolean) {
    if (!this.thiefActive) return;

    const elapsed = Date.now() - this.thiefAppearTime;
    const onTime = elapsed <= this.thiefDecisionWindowMs;

    // For tutorial: success condition is "BLOCK on time"
    if (didBlock && onTime) {
      // Visual confirmation
      this.flashPanelSuccess();
      this.stepCompleteOverride = true;

      // Clean up thief UI, keep ball as-is (BLOCK cancels)
      this.hideThiefUi();
      return;
    }

    // Timeout / fail: demonstrate “adapt” effect by moving ball lane
    const b = this.thiefTargetBallId
      ? this.balls.find((x) => x.id === this.thiefTargetBallId && !x.destroyed)
      : undefined;

    if (b) {
      const newLane: Lane = b.lane === 1 ? 2 : 1;
      b.lane = newLane;

      // Tween x shift for clarity
      this.tweens.add({
        targets: [b.container, this.armSprite, this.blockBtn],
        x: this.getLaneX(newLane),
        duration: 450,
        ease: "Quad.easeInOut",
        onComplete: () => {
          this.hideThiefUi();
        },
      });
    } else {
      this.hideThiefUi();
    }
  }

  private flashPanelSuccess() {
    // Light green flash on inner panel
    const { width, height } = this.scale;
    const flash = this.add.graphics();
    flash.setDepth(4999);
    flash.fillStyle(0x4caf50, 0.18);
    flash.fillRoundedRect(
      this.panel.x - width * 0.42,
      this.panel.y - height * 0.18,
      width * 0.84,
      height * 0.36,
      16
    );
    this.tweens.add({
      targets: flash,
      alpha: { from: 1, to: 0 },
      duration: 450,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });
  }
}
