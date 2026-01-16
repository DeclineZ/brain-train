import * as Phaser from 'phaser';
import type { Ball, Equation } from '../types';

/**
 * Shared utilities for game scenes
 */
export class SceneUtils {
    /**
     * Create a pool table with responsive dimensions
     */
    static createPoolTable(scene: Phaser.Scene): Phaser.GameObjects.Container {
        const { width, height } = scene.scale;
        const poolTable = scene.add.container(width / 2, height / 2);

        // Table dimensions - responsive for phone and desktop
        const tableWidth = width * 0.8;
        const tableHeight = height * 0.7;
        const cornerRadius = Math.min(20, width * 0.03);

        // Create table border (wooden frame)
        const borderWidth = Math.min(15, width * 0.05);
        const borderBg = scene.add.graphics();
        borderBg.fillStyle(0x8b4513); // Saddle brown for wooden frame
        borderBg.fillRoundedRect(
            -tableWidth / 2 - borderWidth,
            -tableHeight / 2 - borderWidth,
            tableWidth + borderWidth * 2,
            tableHeight + borderWidth * 2,
            cornerRadius + borderWidth
        );
        poolTable.add(borderBg);

        // Create table background (brown felt)
        const tableBg = scene.add.graphics();
        tableBg.fillStyle(0x0d5d3d); // Dark green felt color
        tableBg.fillRoundedRect(-tableWidth / 2, -tableHeight / 2, tableWidth, tableHeight, cornerRadius);
        poolTable.add(tableBg);

        // Add table pockets (6 pockets - 4 corners + 2 middle)
        const pocketRadius = Math.min(25, width * 0.04);
        const createPocket = (x: number, y: number) => {
            const pocket = scene.add.circle(x, y, pocketRadius, 0x000000);
            poolTable.add(pocket);
        };

        // Corner pockets
        createPocket(-tableWidth / 2 + cornerRadius, -tableHeight / 2 + cornerRadius);
        createPocket(tableWidth / 2 - cornerRadius, -tableHeight / 2 + cornerRadius);
        createPocket(-tableWidth / 2 + cornerRadius, tableHeight / 2 - cornerRadius);
        createPocket(tableWidth / 2 - cornerRadius, tableHeight / 2 - cornerRadius);
        // Middle pockets
        createPocket(-tableWidth / 2 + cornerRadius, 0);
        createPocket(tableWidth / 2 - cornerRadius, 0);

        // Add table markings
        const centerSpot = scene.add.circle(0, 0, Math.min(8, width * 0.015), 0xffffff, 0.5);
        poolTable.add(centerSpot);

        return poolTable;
    }

    /**
     * Create a miniature pool ball for equation display
     */
    static createEquationBall(
        scene: Phaser.Scene,
        value: number | null,
        position: string,
        isLarge: boolean = false
    ): Phaser.GameObjects.Container {
        const container = scene.add.container(0, 0);
        const { width } = scene.scale;

        // Responsive sizing
        const ballRadius = isLarge ? Math.min(40, width * 0.08) : Math.min(30, width * 0.05);
        const fontSize = isLarge ? Math.min(32, width * 0.06) : Math.min(22, width * 0.035);
        const shadowOffset = ballRadius * 0.1;

        if (value === null) {
            // Create empty slot placeholder
            const shadow = scene.add.circle(shadowOffset, shadowOffset, ballRadius, 0x000000, 0.2).setOrigin(0.5);
            const ball = scene.add.circle(0, 0, ballRadius, 0xe8e8e8).setStrokeStyle(3, 0xcccccc);
            const placeholder = scene.add.text(0, 0, "?", {
                fontFamily: "Arial, sans-serif",
                fontSize: `${isLarge ? Math.min(32, width * 0.06) : Math.min(24, width * 0.04)}px`,
                color: "#999999",
                fontStyle: "bold",
            }).setOrigin(0.5);
            container.add([shadow, ball, placeholder]);

            // Add subtle idle animation for empty slots
            scene.tweens.add({
                targets: container,
                scale: { from: 1, to: 1.05 },
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
            });
        } else {
            // Conditional ball creation: PNG only for known values (1-10), generated circle for unknown
            let ball;
            if (value >= 1 && value <= 10) {
                const shadow = scene.add.circle(shadowOffset, shadowOffset, ballRadius, 0x000000, isLarge ? 0.4 : 0.2).setOrigin(0.5);
                ball = scene.add.image(0, 0, `ball-${value}`);
                ball.setDisplaySize(ballRadius * (isLarge ? 2.8 : 2.5), ballRadius * (isLarge ? 2.8 : 2.5));
                container.add([shadow, ball]);
            } else {
                const shadow = scene.add.circle(shadowOffset, shadowOffset, ballRadius, 0x000000, isLarge ? 0.4 : 0.2).setOrigin(0.5);
                ball = scene.add.circle(0, 0, ballRadius, 0xffffff).setStrokeStyle(3, 0x000000);
                const text = scene.add.text(0, 0, value.toString(), {
                    fontFamily: "Arial, sans-serif",
                    fontSize: `${fontSize}px`,
                    color: "#000000",
                    fontStyle: "bold",
                }).setOrigin(0.5);
                container.add([shadow, ball, text]);
            }

            // Add entrance animation
            container.setScale(0);
            scene.tweens.add({
                targets: container,
                scale: 1,
                duration: 300,
                ease: "Back.easeOut",
            });
        }

        return container;
    }

    /**
     * Create operator text with responsive sizing
     */
    static createOperatorText(
        scene: Phaser.Scene,
        operator: string,
        isLarge: boolean = false
    ): Phaser.GameObjects.Text {
        const { width } = scene.scale;
        const fontSize = isLarge ? Math.min(64, width * 0.12) : Math.min(48, width * 0.08);

        return scene.add.text(0, 0, operator, {
            fontFamily: "Sarabun, sans-serif",
            fontSize: `${fontSize}px`,
            color: "#2B2115",
            stroke: "#FFFFFF",
            strokeThickness: 3,
            fontStyle: "bold",
        }).setOrigin(0.5);
    }

    /**
     * Create a shadow ball for progress tracking
     */
    static createShadowBall(
        scene: Phaser.Scene,
        index: number,
        isCompleted: boolean = false,
        result?: number
    ): Phaser.GameObjects.Container {
        const container = scene.add.container(0, 0);
        const { width } = scene.scale;

        const ballRadius = Math.min(25, width * 0.05);
        const shadowOffset = ballRadius * 0.1;

        if (isCompleted && result !== undefined) {
            // Show completed result with goal ball PNG
            const goalBall = scene.add.image(0, 0, "goal-ball");
            goalBall.setDisplaySize(ballRadius * 2.8, ballRadius * 2.8);
            
            const resultText = scene.add.text(0, 0, result.toString(), {
                fontFamily: "Arial, sans-serif",
                fontSize: `${Math.min(24, width * 0.05)}px`,
                color: "#ffffff",
                fontStyle: "bold",
            }).setOrigin(0.5);
            
            container.add([goalBall, resultText]);
        } else {
            // Show incomplete gray circle
            const shadow = scene.add.circle(shadowOffset, shadowOffset, ballRadius, 0x000000, 0.3).setOrigin(0.5);
            const ball = scene.add.circle(0, 0, ballRadius, 0xcccccc).setStrokeStyle(2, 0x666666);
            const text = scene.add.text(0, 0, "?", {
                fontFamily: "Arial, sans-serif",
                fontSize: `${Math.min(16, width * 0.03)}px`,
                color: "#ffffff",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 2,
            }).setOrigin(0.5);
            container.add([shadow, ball, text]);
        }

        // Set interactive properties
        container.setSize(ballRadius * 2, ballRadius * 2);
        container.setInteractive({
            useHandCursor: true,
            hitArea: new Phaser.Geom.Circle(0, 0, ballRadius),
            hitAreaCallback: Phaser.Geom.Circle.Contains,
        });

        // Add hover effects
        container.on('pointerover', () => {
            scene.tweens.add({
                targets: container,
                scale: 1.1,
                duration: 150,
                ease: "Sine.easeOut",
            });
        });

        container.on('pointerout', () => {
            scene.tweens.add({
                targets: container,
                scale: 1,
                duration: 150,
                ease: "Sine.easeOut",
            });
        });

        // Add completion animation if newly completed
        if (isCompleted) {
            scene.tweens.add({
                targets: container,
                scale: { from: 0.8, to: 1 },
                duration: 300,
                ease: "Back.easeOut",
            });
        }

        return container;
    }

    /**
     * Calculate responsive dimensions
     */
    static getResponsiveDimensions(scene: Phaser.Scene) {
        const { width, height } = scene.scale;
        return {
            ballRadius: Math.min(35, width * 0.08),
            fontSize: Math.min(22, width * 0.04),
            operatorFontSize: Math.min(64, width * 0.12),
            shadowOffset: (Math.min(35, width * 0.08)) * 0.12,
            baseSpacing: Math.min(120, width * 0.1),
            tableWidth: width * 0.8,
            tableHeight: height * 0.7,
            cornerRadius: Math.min(20, width * 0.03),
        };
    }

    /**
     * Create goal ball with result text
     */
    static createGoalBall(scene: Phaser.Scene, result: number = 0): Phaser.GameObjects.Container {
        const { width } = scene.scale;
        const goalBall = scene.add.container(width / 2, scene.scale.height * 0.5);
        
        const ballRadius = Math.min(35, width * 0.06);
        const goalBallBg = scene.add.image(0, 0, "goal-ball");
        goalBallBg.setDisplaySize(ballRadius * 2.2, ballRadius * 2.2);
        
        const goalText = scene.add.text(0, 0, result.toString(), {
            fontFamily: "Arial, sans-serif",
            fontSize: `${Math.min(20, width * 0.04)}px`,
            color: "#ffffff",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 2,
        }).setOrigin(0.5);
        
        goalBall.add([goalBallBg, goalText]);
        
        // Add pulse animation
        scene.tweens.add({
            targets: goalBall,
            scale: { from: 1, to: 1.1 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
        });

        return goalBall;
    }

    /**
     * Update goal ball with new result
     */
    static updateGoalBall(goalBall: Phaser.GameObjects.Container, result: number, scene: Phaser.Scene): void {
        const goalText = goalBall.getAt(1) as Phaser.GameObjects.Text;
        goalText.setText(result.toString());

        // Add pulse animation when result updates
        scene.tweens.add({
            targets: goalBall,
            scale: { from: 1, to: 1.2 },
            duration: 200,
            yoyo: true,
            ease: "Sine.easeInOut",
        });
    }

    /**
     * Animate ball to equation position
     */
    static animateBallToEquation(
        scene: Phaser.Scene,
        ball: Ball,
        targetX: number,
        targetY: number,
        onComplete?: () => void
    ): void {
        scene.tweens.add({
            targets: ball.container,
            x: targetX,
            y: targetY,
            scale: 1.2,
            duration: 400,
            ease: "Back.easeOut",
            onComplete: () => {
                if (onComplete) {
                    onComplete();
                }
                // Add bounce effect
                scene.tweens.add({
                    targets: ball.container,
                    scale: 1.2,
                    duration: 200,
                    ease: "Bounce.easeOut",
                });
            },
        });
    }

    /**
     * Reset ball to original position
     */
    static resetBallToOriginal(scene: Phaser.Scene, ball: Ball): void {
        if (ball.isPlaced && ball.container) {
            ball.container.setVisible(true);
            ball.isPlaced = false;

            scene.tweens.add({
                targets: ball.container,
                x: ball.originalX,
                y: ball.originalY,
                scale: 1,
                duration: 600,
                ease: "Back.easeOut",
            });
        }
    }

    /**
     * Add shake animation for wrong answers
     */
    static shakeElement(scene: Phaser.Scene, element: Phaser.GameObjects.Container): void {
        scene.tweens.add({
            targets: element,
            x: '+=10',
            duration: 50,
            yoyo: true,
            repeat: 5,
            ease: "Power2.easeInOut",
        });
    }

    /**
     * Add success animation to equation balls
     */
    static animateEquationSuccess(scene: Phaser.Scene, equationBalls: { [key: string]: Phaser.GameObjects.Container }): void {
        Object.values(equationBalls).forEach((ball) => {
            scene.tweens.add({
                targets: ball,
                scale: 1.2,
                duration: 200,
                yoyo: true,
                ease: "Back.easeOut",
            });
        });
    }
}
