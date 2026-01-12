import * as Phaser from "phaser";
import { FLOATING_BALL_MATH_LEVELS } from "./levels";
import { EquationGenerator } from "./utils/EquationGenerator";
import { WaterPhysics } from "./utils/WaterPhysics";
import { BallSpawner } from "./utils/BallSpawner";
import type { FloatingBall, Equation, FloatingBallMathLevelConfig, Operation } from "./types";

export class TutorialScene extends Phaser.Scene {
  private step = 0;
  private titleText!: Phaser.GameObjects.Text;
  private descriptionText!: Phaser.GameObjects.Text;
  private continueButton!: Phaser.GameObjects.Container;
  private continueText!: Phaser.GameObjects.Text;
  
  // Demo balls
  private demoBalls: FloatingBall[] = [];
  private selectedDemoBalls: FloatingBall[] = [];
  
  // Game components reused from GameScene
  private targetDisplay!: Phaser.GameObjects.Container;
  private targetText!: Phaser.GameObjects.Text;
  private operationText!: Phaser.GameObjects.Text;
  private operationBg!: Phaser.GameObjects.Graphics;
  private selectionCounter!: Phaser.GameObjects.Text;
  private waterOverlay!: Phaser.GameObjects.Graphics;
  
  // Utilities
  private equationGenerator!: EquationGenerator;
  private waterPhysics!: WaterPhysics;
  private ballSpawner!: BallSpawner;
  private currentLevelConfig!: FloatingBallMathLevelConfig;
  
  // Tutorial state
  private demoEquation!: Equation;
  private currentOperation: Operation = '+';

  constructor() {
    super({ key: "TutorialScene" });
  }

  create() {
    console.log("[TutorialScene] create called");
    const { width, height } = this.scale;

    // Initialize utilities
    this.currentLevelConfig = FLOATING_BALL_MATH_LEVELS[1];
    this.equationGenerator = new EquationGenerator(this.currentLevelConfig);
    this.waterPhysics = new WaterPhysics(this, this.currentLevelConfig);
    this.ballSpawner = new BallSpawner(this);

    // Create water background
    this.createWaterBackground();

    // Create game UI components
    this.createGameUI();

    // Create tutorial text
    this.createTutorialUI();

    // Create continue button
    this.createContinueButton();

    // Add keyboard handler
    this.input.keyboard!.once('keydown-SPACE', () => {
      this.nextStep();
    });

    // Show first step
    this.showStep(0);
    console.log("[TutorialScene] create completed");
  }

  createWaterBackground() {
    const { width, height } = this.scale;

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xE3F2FD, 0xE3F2FD, 0xBBDEFB, 0xBBDEFB, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-2);

    // Create water wave overlay
    this.waterOverlay = this.waterPhysics.createWaterOverlay();
  }

  createGameUI() {
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
    this.operationBg.fillStyle(0xFFC107, 1); // Golden yellow for +
    this.operationBg.fillCircle(50, 0, opRadius);
    this.operationBg.lineStyle(3, 0xFFF59D, 0.8);
    this.operationBg.strokeCircle(50, 0, opRadius);
    this.operationBg.lineStyle(2, 0xFFFFFF, 0.6);
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

    // Selection counter
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
  }

  createTutorialUI() {
    const { width, height } = this.scale;

    // Title
    this.titleText = this.add.text(width / 2, height * 0.35, "", {
      fontFamily: "Sarabun, sans-serif",
      fontSize: `${Math.min(32, width * 0.05)}px`,
      color: "#1565C0",
      stroke: "#FFFFFF",
      strokeThickness: 3,
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Description
    this.descriptionText = this.add.text(width / 2, height * 0.55, "", {
      fontFamily: "Sarabun, sans-serif",
      fontSize: `${Math.min(24, width * 0.04)}px`,
      color: "#2c3e50",
      stroke: "#FFFFFF",
      strokeThickness: 2,
      align: "center",
      wordWrap: { width: width * 0.8 },
    }).setOrigin(0.5);
  }

  createContinueButton() {
    const { width, height } = this.scale;

    this.continueButton = this.add.container(width / 2, height * 0.85);

    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x42A5F5, 1);
    buttonBg.fillRoundedRect(-100, -30, 200, 60, 15);

    this.continueText = this.add.text(0, 0, "กดเพื่อดำเนินการ", {
      fontFamily: "Sarabun, sans-serif",
      fontSize: `${Math.min(28, width * 0.045)}px`,
      color: "#FFFFFF",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.continueButton.add([buttonBg, this.continueText]);

    // Add click handler
    this.continueButton.setInteractive();
    this.continueButton.on('pointerdown', () => {
      this.nextStep();
    });

    this.continueButton.on('pointerover', () => {
      this.continueButton.setScale(1.05);
    });

    this.continueButton.on('pointerout', () => {
      this.continueButton.setScale(1);
    });
  }

  showStep(step: number) {
    this.step = step;
    this.clearDemoBalls();
    this.selectedDemoBalls = [];

    const steps = [
      {
        title: "ยินดีต้อนรับสู่ Floating Ball Math!",
        description: "ในเกมนี้ คุณจะต้องเลือกลูกบอลสองลูกที่บวกหรือคูณกันแล้วเท่ากับเลขเป้าหมาย\nเลือกลูกบอลที่ถูกต้องให้ได้คะแนนมากที่สุด!",
      },
      {
        title: "เลขเป้าหมายอยู่ด้านบน",
        description: "ดูที่เลขที่แสดงด้านบนสุด\nนี่คือเลขที่คุณต้องทำให้ได้\nเช่น: 10",
        showTarget: 10,
      },
      {
        title: "เครื่องหมายคือบวก (+)",
        description: "เครื่องหมายมีสีทองคือบวก (+)\nคุณต้องหาลูกบอลสองลูกที่บวกกันแล้วได้เป้าหมาย\nเช่น: 3 + 5 = 8",
        operation: '+',
        equation: { target: 8, operation: '+' as const },
      },
      {
        title: "บวกลูกบอลให้ได้เป้าหมาย",
        description: "ลองเลือกลูกบอลที่บวกกันแล้วได้ 8\nลูกบอลจะลอยตามคลื่นน้ำ\nคลิกที่ลูกบอลที่คิดว่าถูก!",
        operation: '+',
        interactive: true,
      },
      {
        title: "ยอดเยี่ยม! 3 + 5 = 8",
        description: "คุณทำถูกแล้ว!\nเมื่อเลือกถูก ลูกบอลจะเคลื่นไปหาเป้าหมาย\nและคุณจะได้ 1 คะแนน",
        showSuccess: true,
      },
      {
        title: "เครื่องหมายที่สองคือคูณ (×)",
        description: "เครื่องหมายสีม่วงคือคูณ (×)\nคุณต้องหาลูกบอลสองลูกที่คูณกันแล้วได้เป้าหมาย\nเช่น: 4 × 2 = 8\n× มีสีม่วง ต่างจาก +",
        operation: '*',
        equation: { target: 8, operation: '*' as const },
      },
      {
        title: "คูณลูกบอลให้ได้เป้าหมาย",
        description: "ลองเลือกลูกบอลที่คูณกันแล้วได้ 8\nจำไว้ × มีสีม่วง!",
        operation: '*',
        interactive: true,
      },
      {
        title: "ยอดเยี่ยม! 2 × 4 = 8",
        description: "คุณทำถูกแล้ว!\nคุณรู้เรื่องบวก (+) และคูณ (×) แล้ว",
        showSuccess: true,
      },
      {
        title: "ถ้าตอบผิด",
        description: "ถ้าลูกบอลที่เลือกไม่ได้เป้าหมาย\nลูกบอลจะสั่นและไม่ได้คะแนน\nคุณต้องพยายามเลือกใหม่",
        showWrong: true,
      },
      {
        title: "ครบ 5 คะแนนเพื่อผ่านด่าน",
        description: "เมื่อทำถูกครบ 5 ข้อ เกมจะจบ\nคุณจะได้ 1-3 ดาวขึ้นกับความเร็วและความถูกต้อง\nพร้อมเล่นแล้วหรือยัง?",
      },
    ];

    if (step >= steps.length) {
      this.startGame();
      return;
    }

    const currentStep = steps[step];
    this.titleText.setText(currentStep.title);
    this.descriptionText.setText(currentStep.description);

    // Handle different step types
    if (currentStep.showTarget) {
      this.updateTargetDisplay(currentStep.showTarget, '+');
    } else if (currentStep.equation) {
      this.updateTargetDisplay(currentStep.equation.target, currentStep.equation.operation);
      this.spawnDemoBalls(currentStep.equation, false);
    } else if (currentStep.interactive) {
      this.setupInteractiveStep(this.currentOperation);
    } else if (currentStep.showWrong) {
      this.showWrongDemo();
    } else if (currentStep.showSuccess) {
      // Just continue, success is already shown
      this.updateContinueButton("ต่อไป");
    } else {
      this.updateContinueButton("ถัดไป");
    }
  }

  updateTargetDisplay(target: number, operation: Operation) {
    this.targetText.setText(target.toString());

    const operationDisplay: Record<Operation, string> = {
      "+": "+",
      "-": "-",
      "*": "×",
      "/": "÷",
    };
    const op = operationDisplay[operation];
    this.operationText.setText(op);

    // Update operation background color
    const { width } = this.scale;
    const opRadius = Math.min(28, width * 0.05);
    
    if (this.operationBg) {
      this.operationBg.clear();
      
      let bgColor = 0xFFC107; // Golden yellow for +
      let textColor = "#1565C0"; // Blue for +
      
      if (operation === "*") {
        bgColor = 0x9C27B0; // Purple for multiplication
        textColor = "#FFFFFF"; // White text for better contrast
      }
      
      this.operationBg.fillStyle(bgColor, 1);
      this.operationBg.fillCircle(50, 0, opRadius);
      this.operationBg.lineStyle(3, this.lightenColor(bgColor, 40), 0.8);
      this.operationBg.strokeCircle(50, 0, opRadius);
      this.operationBg.lineStyle(2, 0xFFFFFF, 0.6);
      this.operationBg.strokeCircle(50, 0, opRadius - 3);
      
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

  spawnDemoBalls(equation: Equation, interactive: boolean) {
    this.clearDemoBalls();
    this.currentOperation = equation.operation;

    const { width, height } = this.scale;
    const startY = -100;
    const margin = 80;

    // Spawn correct pair and some distractors
    const allNumbers = [...equation.correctPair];
    
    // Add 1 distractor for demo
    const { min, max } = this.currentLevelConfig.operandRange;
    let distractor;
    do {
      distractor = min + Math.floor(Math.random() * (max - min + 1));
    } while (allNumbers.includes(distractor));
    allNumbers.push(distractor);

    // Shuffle
    for (let i = allNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]];
    }

    // Spawn all balls
    allNumbers.forEach((value, index) => {
      const x = margin + Math.random() * (width - margin * 2);
      const y = startY - (index * 120);
      const color = this.equationGenerator.getRandomColor();

      const ball = this.ballSpawner.createBall(value, color, x, y);
      ball.originalX = x;
      ball.originalY = y;
      ball.isDemo = true;

      if (ball.container && interactive) {
        ball.container.on("pointerdown", () => {
          this.handleDemoBallClick(ball);
        });
      }

      this.demoBalls.push(ball);
    });
  }

  setupInteractiveStep(operation: '+' | '*') {
    // Generate simple equation
    const target = operation === '+' ? 8 : 8;
    const correctPair: [number, number] = operation === '+' ? [3, 5] : [2, 4];
    
    this.demoEquation = {
      target,
      operation,
      correctPair,
      allNumbers: [...correctPair, 1],
    } as Equation;

    this.updateTargetDisplay(target, operation);
    this.spawnDemoBalls(this.demoEquation, true);
    this.selectedDemoBalls = [];
    this.updateContinueButton("ผมจะทำเอง");
    this.continueButton.setVisible(false); // Hide button during interactive step
  }

  handleDemoBallClick(ball: FloatingBall) {
    if (this.selectedDemoBalls.includes(ball)) {
      // Deselect
      const index = this.selectedDemoBalls.indexOf(ball);
      this.selectedDemoBalls.splice(index, 1);
      ball.isSelected = false;
      this.ballSpawner.unhighlightBall(ball);
      this.ballSpawner.animateToOriginal(ball);
      this.updateSelectionCounter();
      return;
    }

    if (this.selectedDemoBalls.length >= 2) return;

    // Select
    this.selectedDemoBalls.push(ball);
    ball.isSelected = true;
    this.ballSpawner.highlightBall(ball);
    
    const { width, height } = this.scale;
    const spacing = 120;
    const startX = width / 2 - spacing;
    const targetX = startX + this.selectedDemoBalls.length * spacing;
    const targetY = height * 0.4;

    this.ballSpawner.animateToPosition(ball, targetX, targetY);
    this.updateSelectionCounter();

    // Check if 2 selected
    if (this.selectedDemoBalls.length === 2) {
      this.time.delayedCall(500, () => {
        this.checkDemoAnswer();
      });
    }
  }

  checkDemoAnswer() {
    const [ball1, ball2] = this.selectedDemoBalls;
    const num1 = ball1.value;
    const num2 = ball2.value;
    const target = this.demoEquation.target;
    const operation = this.demoEquation.operation;

    let result: number;
    let isCorrect: boolean;

    if (operation === '+') {
      result = num1 + num2;
    } else {
      result = num1 * num2;
    }

    isCorrect = result === target;

    if (isCorrect) {
      // Success
      this.selectedDemoBalls.forEach(ball => {
        this.ballSpawner.showCorrectFeedback(ball);
      });
      
      this.time.delayedCall(1500, () => {
        this.nextStep();
      });
    } else {
      // Wrong
      this.selectedDemoBalls.forEach(ball => {
        this.ballSpawner.showIncorrectFeedback(ball);
      });

      // Shake target
      this.tweens.add({
        targets: this.targetDisplay,
        x: "+=10",
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: "Power2.easeInOut",
      });

      this.time.delayedCall(1500, () => {
        // Reset selection
        this.selectedDemoBalls.forEach(ball => {
          this.ballSpawner.clearFeedback(ball);
          this.ballSpawner.unhighlightBall(ball);
          this.ballSpawner.animateToOriginal(ball);
          ball.isSelected = false;
        });
        this.selectedDemoBalls = [];
        this.updateSelectionCounter();
      });
    }
  }

  showWrongDemo() {
    // Show wrong answer example
    this.updateTargetDisplay(10, '+');
    
    const { width, height } = this.scale;
    const margin = 80;

    // Spawn wrong balls (2 + 3 = 5, but target is 10)
    const wrongBalls = [2, 3];
    wrongBalls.forEach((value, index) => {
      const x = width / 2 - 50 + (index * 100);
      const y = height * 0.45;
      const color = this.equationGenerator.getRandomColor();

      const ball = this.ballSpawner.createBall(value, color, x, y);
      ball.originalX = x;
      ball.originalY = y;
      ball.isDemo = true;

      this.demoBalls.push(ball);
    });

    // Show wrong feedback
    this.time.delayedCall(500, () => {
      this.demoBalls.forEach(ball => {
        this.ballSpawner.showIncorrectFeedback(ball);
      });

      // Shake
      this.tweens.add({
        targets: this.demoBalls.map(b => b.container),
        x: "+=10",
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: "Power2.easeInOut",
      });
    });
  }

  updateSelectionCounter() {
    this.selectionCounter.setText(`เลือก ${this.selectedDemoBalls.length}/2`);
  }

  updateContinueButton(text: string) {
    this.continueText.setText(text);
    this.continueButton.setVisible(true);
  }

  clearDemoBalls() {
    this.demoBalls.forEach(ball => {
      if (ball && ball.container) {
        ball.container.removeAllListeners();
        ball.container.destroy();
      }
    });
    this.demoBalls = [];
  }

  nextStep() {
    // Reset interactive state
    if (this.continueButton.visible) {
      this.input.keyboard!.once('keydown-SPACE', () => {
        this.nextStep();
      });
    }
    
    this.showStep(this.step + 1);
  }

  startGame() {
    this.scene.start("FloatingBallMathGameScene");
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

  update(time: number, delta: number) {
    // Update water overlay
    if (this.waterOverlay) {
      this.waterPhysics.updateWaterOverlay(this.waterOverlay);
    }

    // Update ball positions
    const activeBalls = this.demoBalls.filter(ball => ball && ball.container);
    
    activeBalls.forEach(ball => {
      this.waterPhysics.updateBall(ball, delta);
      if (ball.container) {
        ball.container.setPosition(ball.x, ball.y);
      }
    });
  }
}
