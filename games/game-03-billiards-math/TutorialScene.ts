import * as Phaser from 'phaser';
import { EquationGenerator } from './equationGenerator';
import type { BilliardsLevelConfig, Equation, Ball } from './types';

export class TutorialScene extends Phaser.Scene {
    // Tutorial State
    private tutorialStep = 0;
    private balls: Ball[] = [];
    private currentEquation!: Equation;
    private placedBalls: number[] = [];
    private isLocked = true;

    // Tutorial Equations (simple, progressive)
    private tutorialEquations: Equation[] = [
        { leftOperand1: 2, operator: '+', leftOperand2: 3, result: 5, displayText: "2 + 3 = _" },
        { leftOperand1: 1, operator: '+', leftOperand2: 4, result: 5, displayText: "1 + 4 = _" },
        { leftOperand1: 3, operator: '+', leftOperand2: 2, result: 5, displayText: "3 + 2 = _" }
    ];

    // UI Elements
    private messageText!: Phaser.GameObjects.Text;
    private equationContainer!: Phaser.GameObjects.Container;
    private equationBalls: { [key: string]: Phaser.GameObjects.Container } = {};
    private operatorTexts: { [key: string]: string } = {};
    private goalBall!: Phaser.GameObjects.Container;
    private poolTable!: Phaser.GameObjects.Container;

    // Visual hints
    private currentHighlightTween: Phaser.Tweens.Tween | null = null;

    constructor() { super({ key: 'TutorialScene' }); }

    preload() {
        // Load same assets as main game
        for (let i = 1; i <= 9; i++) {
            this.load.image(`ball-${i}`, `/assets/images/billiards/ball-${i}.png`);
        }
        this.load.image("goal-ball", "/assets/images/billiards/goal-ball.png");
        this.load.image("pool-table", "/assets/images/billiards/pool-table.png");

        // Load sounds
        this.load.audio("ball-drop", "/assets/sounds/billiards/ball-drop.mp3");
        this.load.audio("ball-rattle", "/assets/sounds/billiards/ball-rattle.mp3");
        this.load.audio("success", "/assets/sounds/billiards/success.mp3");
        this.load.audio("bg-music", "/assets/sounds/billiards/bg-music.mp3");
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

        // Start background music
        try {
            const bgMusic = this.sound.add("bg-music", {
                volume: 0.3,
                loop: true,
            });
            bgMusic.play();
        } catch (e) {
            console.warn("Background music failed to play", e);
        }
    }

    createPoolTable() {
        const { width, height } = this.scale;

        // Create pool table container
        this.poolTable = this.add.container(width / 2, height / 2);

        // Table background (felt)
        const tableBg = this.add
            .rectangle(0, 0, width * 0.9, height * 0.7, 0x2e7d32) // Dark green felt
            .setStrokeStyle(8, 0x8b4513) // Brown rail
            .setOrigin(0.5);

        this.poolTable.add(tableBg);
    }

    createUI() {
        const { width, height } = this.scale;

        // Create equation container for visual components (center of pool table)
        this.equationContainer = this.add.container(width / 2, height * 0.5);

        // Message text
        this.messageText = this.add
            .text(0, 0, "", {
                fontFamily: 'Sarabun, sans-serif',
                fontSize: `${Math.min(32, width * 0.05)}px`,
                color: '#2B2115',
                stroke: '#FFFFFF',
                strokeThickness: 3,
                fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setVisible(false);

        // Goal ball positioned after "=" (in equation area, center of pool table)
        this.goalBall = this.add.container(width / 2, height * 0.5);
        const goalBallRadius = Math.min(35, width * 0.06);
        const goalBallBg = this.add
            .circle(0, 0, goalBallRadius, 0xffd700) // Gold color
            .setStrokeStyle(4, 0xffa500);
        const goalBallText = this.add
            .text(0, 0, "", {
                fontFamily: "Sarabun, sans-serif",
                fontSize: `${Math.min(28, width * 0.04)}px`,
                color: "#000000",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        this.goalBall.add([goalBallBg, goalBallText]);
    }

    startTutorial() {
        this.tutorialStep = 0;
        this.showTutorialStep();
    }

    showTutorialStep() {
        const { width, height } = this.scale;

        // Clear existing balls
        this.balls.forEach((ball) => {
            if (ball.container) ball.container.destroy();
        });
        this.balls = [];
        this.placedBalls = [];
        this.equationContainer.removeAll(true);
        this.equationBalls = {};
        this.operatorTexts = {};

        // Get current equation
        this.currentEquation = this.tutorialEquations[this.tutorialStep];

        // Update goal ball with target number
        const goalText = this.goalBall.getAt(1) as Phaser.GameObjects.Text;
        goalText.setText(this.currentEquation.result.toString());

        // Update message based on step
        if (this.tutorialStep === 0) {
            this.messageText.setText("ยินดีต้อนรับ! ลากบอลหมายเลข 2 และ 3");
            this.messageText.setVisible(true);
            this.messageText.setPosition(width / 2, height * 0.15);
        } else if (this.tutorialStep === 1) {
            this.messageText.setText("ดีมาก! ลองทำสมการนี้: 1 + 4 = ?");
            this.messageText.setPosition(width / 2, height * 0.15);
        } else {
            this.messageText.setText("ยอดเยี่ยม! ลองอีกข้อ: 3 + 2 = ?");
            this.messageText.setPosition(width / 2, height * 0.15);
        }

        // Update equation display
        this.updateEquationDisplay();

        // Create balls for this equation
        this.createTutorialBalls();

        // Show hints for first step only
        if (this.tutorialStep === 0) {
            this.highlightBalls([2, 3]);
        } else if (this.tutorialStep === 1) {
            this.highlightBalls([1, 4]);
        }

        // Emit event to show next button
        this.game.events.emit('tutorial-show-next-btn', true);

        this.isLocked = false;
    }

    createTutorialBalls() {
        const requiredNumbers = [
            this.currentEquation.leftOperand1,
            this.currentEquation.leftOperand2,
            this.currentEquation.result
        ];

        const { width, height } = this.scale;

        requiredNumbers.forEach((num, index) => {
            const ball = this.createBall(num);
            
            // Position in a simple row at the bottom
            const x = width * 0.3 + (index * 100);
            const y = height * 0.7;

            ball.container.setPosition(x, y);
            ball.x = x;
            ball.y = y;
            ball.originalX = x;
            ball.originalY = y;
            
            this.balls.push(ball);
        });
    }

    createBall(value: number): Ball {
        const container = this.add.container(0, 0);
        const { width } = this.scale;

        // Responsive sizing
        const ballRadius = Math.min(25, width * 0.05);
        const fontSize = Math.min(18, width * 0.03);
        const shadowOffset = ballRadius * 0.12;

        // Ball shadow
        const shadow = this.add.circle(shadowOffset, shadowOffset, ballRadius, 0x000000, 0.3).setOrigin(0.5);

        // Ball body
        const ball = this.add
            .circle(0, 0, ballRadius, 0xffffff)
            .setStrokeStyle(2, 0x000000);

        // Ball number
        const text = this.add
            .text(0, 0, value.toString(), {
                fontFamily: "Arial, sans-serif",
                fontSize: `${fontSize}px`,
                color: "#000000",
                fontStyle: "bold",
            })
            .setOrigin(0.5);

        container.add([shadow, ball, text]);
        container.setSize(ballRadius * 2, ballRadius * 2);

        // Make container itself interactive
        container.setInteractive({ useHandCursor: true });
        container.on("pointerdown", () => this.handleBallClick(value));

        return {
            id: value,
            value,
            x: 0,
            y: 0,
            originalX: 0,
            originalY: 0,
            isDragging: false,
            isPlaced: false,
            container,
        };
    }

    highlightBalls(values: number[]) {
        // Clear previous highlights
        if (this.currentHighlightTween) {
            this.currentHighlightTween.stop();
            this.balls.forEach(ball => {
                if (ball.container) {
                    ball.container.setScale(1);
                    const ballCircle = ball.container.getAt(1) as Phaser.GameObjects.Arc;
                    ballCircle.setStrokeStyle(2, 0x000000);
                }
            });
        }

        // Highlight new balls
        const ballsToHighlight = this.balls.filter(ball => values.includes(ball.value));
        if (ballsToHighlight.length > 0) {
            this.currentHighlightTween = this.tweens.add({
                targets: ballsToHighlight.map(b => b.container),
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });

            ballsToHighlight.forEach(ball => {
                const ballCircle = ball.container.getAt(1) as Phaser.GameObjects.Arc;
                ballCircle.setStrokeStyle(4, 0xFFD700); // Gold highlight
            });
        }
    }

    handleBallClick(value: number) {
        if (this.isLocked) return;

        // Check if we have empty slots
        if (this.placedBalls.length >= 2) return;

        // Check if this ball is needed
        if (value !== this.currentEquation.leftOperand1 && value !== this.currentEquation.leftOperand2) {
            return; // Not the right ball for this equation
        }

        // Place the ball
        this.placedBalls.push(value);
        this.updateEquationDisplay();

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

        // Clear highlights once first ball is placed
        if (this.placedBalls.length === 1) {
            this.highlightBalls([]);
        }

        // Check if equation is complete
        if (this.placedBalls.length === 2) {
            this.checkAnswer();
        }
    }

    updateEquationDisplay() {
        const { operator, result } = this.currentEquation;
        const { width, height } = this.scale;
        
        // Clear existing equation display
        this.equationContainer.removeAll(true);
        this.equationBalls = {};
        this.operatorTexts = {};

        // Calculate responsive spacing based on screen width
        const baseSpacing = Math.min(120, width * 0.1);
        const startX = -baseSpacing * 1.5; // Center the equation

        // Create first ball (placed or empty)
        const firstValue = this.placedBalls[0] !== undefined ? this.placedBalls[0] : null;
        const firstBall = this.createEquationBall(firstValue, 'first');
        firstBall.setPosition(startX, 0);

        // Create operator text
        const operatorText = this.createOperatorText(operator, 'operator');
        operatorText.setPosition(startX + baseSpacing, 0);

        // Create second ball (placed or empty)
        const secondValue = this.placedBalls[1] !== undefined ? this.placedBalls[1] : null;
        const secondBall = this.createEquationBall(secondValue, 'second');
        secondBall.setPosition(startX + baseSpacing * 2, 0);

        // Create equals sign
        const equalsText = this.createOperatorText('=', 'equals');
        equalsText.setPosition(startX + baseSpacing * 3, 0);

        // Position gold ball at result location
        this.positionGoldBallAtResult(baseSpacing * 2.5);

        // Add all elements to equation container
        this.equationContainer.add([firstBall, operatorText, secondBall, equalsText]);

        // Animate entrance
        this.equationContainer.setAlpha(0);
        this.tweens.add({
            targets: this.equationContainer,
            alpha: 1,
            duration: 300,
            ease: "Linear"
        });
    }

    createEquationBall(value: number | null, position: string): Phaser.GameObjects.Container {
        const container = this.add.container(0, 0);
        const { width } = this.scale;
        
        // Responsive sizing
        const ballRadius = Math.min(30, width * 0.05);
        const fontSize = Math.min(22, width * 0.035);
        
        if (value === null) {
            // Create empty slot placeholder
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
            container.add([ball, placeholder]);
            
            // Add subtle idle animation for empty slots
            this.tweens.add({
                targets: container,
                scale: { from: 1, to: 1.05 },
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
        } else {
            // Create numbered ball
            const ball = this.add
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
            container.add([ball, text]);
            
            // Add entrance animation
            container.setScale(0);
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 300,
                ease: "Back.easeOut"
            });
        }
        
        // Store reference
        this.equationBalls[position] = container;
        return container;
    }

    createOperatorText(operator: string, position: string): Phaser.GameObjects.Text {
        const { width } = this.scale;
        const fontSize = Math.min(48, width * 0.08);
        
        const text = this.add
            .text(0, 0, operator, {
                fontFamily: "Sarabun, sans-serif",
                fontSize: `${fontSize}px`,
                color: "#2B2115",
                stroke: "#FFFFFF",
                strokeThickness: 2,
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        
        this.operatorTexts[position] = operator;
        return text;
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
            ease: "Sine.easeInOut"
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
        const baseSpacing = Math.min(120, width * 0.08);
        const startX = -baseSpacing * 1.5;
        const targetX = equationX + (blankIndex === 0 ? startX : startX + baseSpacing * 2);
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

    checkAnswer() {
        this.isLocked = true;

        const userAnswer = this.placedBalls[0] + this.placedBalls[1];
        const isCorrect = userAnswer === this.currentEquation.result;

        if (isCorrect) {
            this.handleCorrectAnswer();
        } else {
            this.handleWrongAnswer();
        }
    }

    handleCorrectAnswer() {
        this.sound.play("success");

        // Add success animation to equation balls
        Object.values(this.equationBalls).forEach(ball => {
            this.tweens.add({
                targets: ball,
                scale: 1.2,
                duration: 200,
                yoyo: true,
                ease: "Back.easeOut"
            });
        });

        this.time.delayedCall(1500, () => {
            this.nextTutorialStep();
        });
    }

    handleWrongAnswer() {
        this.sound.play("ball-rattle");

        // Add shake animation to indicate error
        this.equationContainer.scene.tweens.add({
            targets: this.equationContainer,
            x: '+=10',
            duration: 50,
            yoyo: true,
            repeat: 5,
            ease: "Power2.easeInOut"
        });

        this.time.delayedCall(1500, () => {
            this.resetCurrentStep();
        });
    }

    resetCurrentStep() {
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

    // Called by React via Event/Reference
    nextPhase() {
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
    }
}
