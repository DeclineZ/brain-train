import * as Phaser from 'phaser';
import { EquationGenerator } from './equationGenerator';
import type { BilliardsLevelConfig } from './types';

export class TutorialScene extends Phaser.Scene {
    private currentLevelConfig!: BilliardsLevelConfig;
    private equationGenerator!: EquationGenerator;

    // Tutorial State
    private tutorialStep = 0;
    private balls: any[] = [];
    private currentEquation: any;
    private placedBalls: number[] = [];

    // UI Elements
    private messageText!: Phaser.GameObjects.Text;
    private equationText!: Phaser.GameObjects.Text;
    private goalBall!: Phaser.GameObjects.Container;

    constructor() { super({ key: 'TutorialScene' }); }

    init(data: any) {
        // Tutorial uses level 0 config
        this.currentLevelConfig = {
            level: 0,
            operations: '+',
            numberRange: { min: 1, max: 5 },
            equationComplexity: 'simple',
            timeLimitSeconds: 999,
            difficultyMultiplier: 1.0,
            starRequirements: { threeStars: 999, twoStars: 999 }
        };
        this.equationGenerator = new EquationGenerator(this.currentLevelConfig);
    }

    preload() {
        // Load same assets as main game
        for (let i = 1; i <= 9; i++) {
            this.load.image(`ball-${i}`, `/assets/images/billiards/ball-${i}.png`);
        }
        this.load.image('goal-ball', '/assets/images/billiards/goal-ball.png');
        this.load.audio('ball-drop', '/assets/sounds/billiards/ball-drop.mp3');
        this.load.audio('success', '/assets/sounds/billiards/success.mp3');
    }

    create() {
        const { width, height } = this.scale;

        // Create simple background
        this.add.rectangle(width / 2, height / 2, width, height, 0xF5F5DC); // Light cream

        // Create UI
        this.createUI();

        // Start tutorial
        this.startTutorial();
    }

    createUI() {
        const { width, height } = this.scale;

        // Message text
        this.messageText = this.add.text(width / 2, height * 0.15, "ยินดีต้อนรับ! มาเรียนรู้เกมสนุกกัน", {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '32px',
            color: '#2B2115',
            stroke: '#FFFFFF',
            strokeThickness: 4,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Equation display
        this.equationText = this.add.text(width / 2, height * 0.3, '', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '48px',
            color: '#2B2115',
            stroke: '#FFFFFF',
            strokeThickness: 4,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Goal ball at top
        this.goalBall = this.add.container(width / 2, height * 0.2);
        const goalBallBg = this.add.circle(0, 0, 30, 0xFFD700)
            .setStrokeStyle(3, 0xFFA500);
        const goalBallText = this.add.text(0, 0, '5', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '24px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.goalBall.add([goalBallBg, goalBallText]);
    }

    startTutorial() {
        this.tutorialStep = 0;
        this.showStep1();
    }

    showStep1() {
        this.messageText.setText("ลองดูสมการนี้: 2 + 3 = ?");
        
        // Create a simple equation
        this.currentEquation = {
            leftOperand1: 2,
            operator: '+',
            leftOperand2: 3,
            result: 5,
            displayText: "2 + 3 = _"
        };
        
        this.equationText.setText(this.currentEquation.displayText);
        
        // Update goal ball
        const goalText = this.goalBall.getAt(1) as Phaser.GameObjects.Text;
        goalText.setText('5');

        // Create balls needed (2, 3, 5)
        this.createTutorialBalls([2, 3, 5]);

        // Show hint after delay
        this.time.delayedCall(2000, () => {
            this.messageText.setText("ลากบอลหมายเลข 2 และ 3");
            this.highlightBalls([2, 3]);
        });

        // Emit event to show next button
        this.game.events.emit('tutorial-show-next-btn', true);
    }

    createTutorialBalls(values: number[]) {
        const { width, height } = this.scale;

        values.forEach((value, index) => {
            const ball = this.createBall(value);
            
            // Position in a simple row
            const x = width * 0.3 + (index * 80);
            const y = height * 0.5;

            ball.container.setPosition(x, y);
            this.balls.push(ball);
        });
    }

    createBall(value: number): any {
        const container = this.add.container(0, 0);
        
        // Ball body
        const ball = this.add.circle(0, 0, 25, 0xFFFFFF).setStrokeStyle(2, 0x000000);
        
        // Ball number
        const text = this.add.text(0, 0, value.toString(), {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([ball, text]);

        // Make interactive
        container.setInteractive({ useHandCursor: true });
        container.on('pointerdown', () => this.handleBallClick(value));

        return { container, value };
    }

    highlightBalls(values: number[]) {
        this.balls.forEach(ball => {
            const isHighlighted = values.includes(ball.value);
            const ballCircle = ball.container.getAt(0) as Phaser.GameObjects.Arc;
            
            if (isHighlighted) {
                ballCircle.setStrokeStyle(4, 0xFFD700); // Gold highlight
                // Pulse effect
                this.tweens.add({
                    targets: ball.container,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else {
                ballCircle.setStrokeStyle(2, 0x000000);
                this.tweens.killTweensOf(ball.container);
                ball.container.setScale(1);
            }
        });
    }

    handleBallClick(value: number) {
        if (this.placedBalls.length >= 2) return;

        this.placedBalls.push(value);
        this.updateEquationDisplay();

        // Hide clicked ball
        const ballIndex = this.balls.findIndex(b => b.value === value);
        if (ballIndex !== -1) {
            this.balls[ballIndex].container.setVisible(false);
        }

        // Check if equation is complete
        if (this.placedBalls.length === 2) {
            this.checkAnswer();
        }
    }

    updateEquationDisplay() {
        const { leftOperand1, operator, leftOperand2 } = this.currentEquation;
        const firstBall = this.placedBalls[0] !== undefined ? this.placedBalls[0] : '_';
        const secondBall = this.placedBalls[1] !== undefined ? this.placedBalls[1] : '_';
        
        this.equationText.setText(`${leftOperand1} ${operator} ${leftOperand2} = ${firstBall} + ${secondBall}`);
    }

    checkAnswer() {
        const userAnswer = this.placedBalls[0] + this.placedBalls[1];
        const isCorrect = userAnswer === this.currentEquation.result;

        if (isCorrect) {
            this.handleCorrectAnswer();
        } else {
            this.handleWrongAnswer();
        }
    }

    handleCorrectAnswer() {
        this.messageText.setText("ดีมาก! คุณตอบถูกต้อง!");
        
        // Animate goal ball
        this.tweens.add({
            targets: this.goalBall,
            y: this.scale.height * 0.4,
            duration: 800,
            ease: 'Quad.easeIn'
        });

        this.time.delayedCall(1500, () => {
            this.completeTutorial();
        });
    }

    handleWrongAnswer() {
        this.messageText.setText("ลองลองใหม่! 2 + 3 ควรจะเท่ากับ 5");
        
        this.time.delayedCall(2000, () => {
            this.resetStep();
        });
    }

    resetStep() {
        this.placedBalls = [];
        this.updateEquationDisplay();
        
        // Show balls again
        this.balls.forEach(ball => {
            ball.container.setVisible(true);
        });
    }

    completeTutorial() {
        const onTutorialComplete = this.registry.get('onTutorialComplete');
        if (onTutorialComplete) {
            onTutorialComplete();
        }
    }

    nextPhase() {
        this.tutorialStep++;
        
        switch (this.tutorialStep) {
            case 1:
                this.showStep2();
                break;
            default:
                this.completeTutorial();
                break;
        }
    }

    showStep2() {
        this.messageText.setText("ยอดเยี่ยม! ตอนนี้คุณสามารถเริ่มเล่นได้เลย");
        this.game.events.emit('tutorial-show-next-btn', false);
        this.time.delayedCall(2000, () => {
            this.completeTutorial();
        });
    }
}
