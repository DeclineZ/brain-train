import * as Phaser from 'phaser';
import type { Ball } from '../types';

/**
 * Ball Pool - Object pooling system for efficient ball management
 */
export class BallPool {
    private static instance: BallPool;
    private pool: Ball[] = [];
    private activeBalls: Set<Ball> = new Set();
    private maxPoolSize: number = 20;

    private constructor() {}

    public static getInstance(): BallPool {
        if (!BallPool.instance) {
            BallPool.instance = new BallPool();
        }
        return BallPool.instance;
    }

    /**
     * Get a ball from the pool or create a new one
     */
    public getBall(value: number, scene: Phaser.Scene): Ball {
        let ball = this.pool.find(b => b.value === value && !b.container.active);
        
        if (!ball) {
            ball = this.createNewBall(value, scene);
        } else {
            // Reactivate the ball
            ball.container.setActive(true);
            ball.container.setVisible(true);
        }

        this.activeBalls.add(ball);
        return ball;
    }

    /**
     * Return a ball to the pool
     */
    public returnBall(ball: Ball): void {
        if (this.activeBalls.has(ball)) {
            this.activeBalls.delete(ball);
            
            // Reset ball state
            ball.container.setActive(false);
            ball.container.setVisible(false);
            ball.isPlaced = false;
            ball.isDragging = false;
            ball.container.setPosition(ball.originalX, ball.originalY);
            ball.container.setScale(1);
            
            // Remove from scene if pool is full
            if (this.pool.length >= this.maxPoolSize) {
                ball.container.destroy();
                const index = this.pool.indexOf(ball);
                if (index > -1) {
                    this.pool.splice(index, 1);
                }
            } else {
                // Keep in pool for reuse
                this.pool.push(ball);
            }
        }
    }

    /**
     * Return all active balls to the pool
     */
    public returnAllBalls(): void {
        const ballsToReturn = Array.from(this.activeBalls);
        ballsToReturn.forEach(ball => this.returnBall(ball));
    }

    /**
     * Clear the pool completely
     */
    public clearPool(): void {
        // Destroy all ball containers
        [...this.pool, ...this.activeBalls].forEach(ball => {
            if (ball && ball.container) {
                ball.container.removeAllListeners();
                ball.container.destroy();
            }
        });
        
        this.pool = [];
        this.activeBalls.clear();
    }

    /**
     * Get pool statistics
     */
    public getStats(): { poolSize: number; activeCount: number } {
        return {
            poolSize: this.pool.length,
            activeCount: this.activeBalls.size
        };
    }

    /**
     * Create a new ball
     */
    private createNewBall(value: number, scene: Phaser.Scene): Ball {
        const container = scene.add.container(0, 0);
        const { width } = scene.scale;

        // Responsive sizing
        const ballRadius = Math.min(35, width * 0.08);
        const fontSize = Math.min(22, width * 0.04);
        const shadowOffset = ballRadius * 0.12;

        // Conditional ball creation: PNG only for known values (1-10), generated circle for unknown
        let ball;
        if (value >= 1 && value <= 10) {
            ball = scene.add.image(0, 0, `ball-${value}`);
            ball.setDisplaySize(ballRadius * 2.5, ballRadius * 2.5);
            container.add([ball]);
        } else {
            ball = scene.add.circle(0, 0, ballRadius, 0xffffff).setStrokeStyle(2, 0x000000);
            const shadow = scene.add.circle(shadowOffset, shadowOffset, ballRadius, 0x000000, 0.3).setOrigin(0.5);
            const text = scene.add.text(0, 0, value.toString(), {
                fontFamily: "Arial, sans-serif",
                fontSize: `${fontSize}px`,
                color: "#ffffff",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 1,
            }).setOrigin(0.5);
            container.add([shadow, ball, text]);
        }

        container.setSize(ballRadius * 2, ballRadius * 2);
        container.setInteractive({ useHandCursor: true });

        const ballObject: Ball = {
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

        return ballObject;
    }

    /**
     * Preload balls into the pool for better performance
     */
    public preloadBalls(values: number[], scene: Phaser.Scene): void {
        values.forEach(value => {
            if (this.pool.length < this.maxPoolSize) {
                const ball = this.createNewBall(value, scene);
                ball.container.setActive(false);
                ball.container.setVisible(false);
                this.pool.push(ball);
            }
        });
    }
}
