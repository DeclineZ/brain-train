import * as Phaser from 'phaser';
import type { Equation, ComplexEquation, GeneratedLayout, LayoutBall, LayoutObstacle, BilliardsLevelConfig } from './types';

export class LayoutGenerator {
    private bounds: { left: number; right: number; top: number; bottom: number };

    constructor(bounds: { left: number; right: number; top: number; bottom: number }) {
        this.bounds = bounds;
    }

    public generateLayout(equation: Equation, levelConfig: BilliardsLevelConfig): GeneratedLayout {
        const difficulty = levelConfig.level;

        // Progression Curve Logic (Default if not in config)
        let hazardCount = 0;
        let obstacleCount = 0;
        let decoyCount = 3;

        // Level-based progression
        // Levels 1-10: Pure shooting (Decoys only)
        // Levels 11-20: Add Obstacles
        // Levels 21+: Add Mines

        if (levelConfig.layoutConfig) {
            hazardCount = Phaser.Math.Between(levelConfig.layoutConfig.hazardCount.min, levelConfig.layoutConfig.hazardCount.max);
            obstacleCount = Phaser.Math.Between(levelConfig.layoutConfig.obstacleCount.min, levelConfig.layoutConfig.obstacleCount.max);
            decoyCount = levelConfig.layoutConfig.decoyCount;
        } else {
            // Default progression
            if (difficulty >= 11) obstacleCount = Phaser.Math.Between(1, 2);
            if (difficulty >= 21) hazardCount = Phaser.Math.Between(1, 3);
            if (difficulty >= 40) obstacleCount++;

            // Adjust for mobile density (keep counts manageable)
            decoyCount = Math.max(2, 5 - obstacleCount - hazardCount);
        }

        const layout: GeneratedLayout = {
            balls: [],
            obstacles: []
        };

        // 1. Generate Obstacles (Walls) first
        for (let i = 0; i < obstacleCount; i++) {
            const obstacle = this.findValidObstaclePosition(layout.obstacles);
            if (obstacle) layout.obstacles.push(obstacle);
        }

        // 2. Identify Required Balls
        const requiredValues = this.getRequiredValues(equation);

        // 3. Generate Decoy Values
        const decoyValues = this.generateDecoys(requiredValues, decoyCount);

        // 4. Place Balls (Required + Decoys + Mines)
        const allBallValues = [
            ...requiredValues.map(v => ({ value: v, isHazard: false })),
            ...decoyValues.map(v => ({ value: v, isHazard: false })),
            ...Array(hazardCount).fill({ value: 99, isHazard: true }) // 99 as placeholder for mine
        ];

        // Shuffle placement order
        Phaser.Utils.Array.Shuffle(allBallValues);

        allBallValues.forEach(item => {
            const pos = this.findValidBallPosition(layout, 28); // 28 is approx ball radius
            if (pos) {
                layout.balls.push({
                    value: item.value,
                    x: pos.x,
                    y: pos.y,
                    isHazard: item.isHazard
                });
            }
        });

        return layout;
    }

    private getRequiredValues(equation: Equation): number[] {
        if (equation.type === 'complex') {
            return (equation as ComplexEquation).operands;
        } else {
            const eq = equation as any;
            return [eq.leftOperand, eq.rightOperand].filter(x => x !== undefined); // Adjust based on your types
            // Fallback for types that might vary
        }
    }

    private generateDecoys(required: number[], count: number): number[] {
        const decoys: number[] = [];
        let attempts = 0;
        while (decoys.length < count && attempts < 100) {
            const val = Phaser.Math.Between(1, 10);
            if (!required.includes(val) && !decoys.includes(val)) {
                decoys.push(val);
            }
            attempts++;
        }
        return decoys;
    }

    private findValidObstaclePosition(existingObstacles: LayoutObstacle[]): LayoutObstacle | null {
        // Define safe area (avoid spawn zone at very bottom)
        const safeTop = this.bounds.top + 50;
        const safeBottom = this.bounds.bottom - 150; // Keep cue ball area clear
        const safeLeft = this.bounds.left + 50;
        const safeRight = this.bounds.right - 50;

        for (let i = 0; i < 20; i++) {
            const isVertical = Math.random() > 0.5;
            const width = isVertical ? 20 : Phaser.Math.Between(100, 150);
            const height = isVertical ? Phaser.Math.Between(100, 150) : 20;

            const x = Phaser.Math.Between(safeLeft, safeRight - width);
            const y = Phaser.Math.Between(safeTop, safeBottom - height);

            // Check overlap with existing
            const newRect = new Phaser.Geom.Rectangle(x, y, width, height);

            // Check overlap with existing obstacles
            const hasOverlapObs = existingObstacles.some(obs => {
                const obsRect = new Phaser.Geom.Rectangle(obs.x, obs.y, obs.width, obs.height);
                return Phaser.Geom.Intersects.RectangleToRectangle(newRect, obsRect);
            });

            // Check overlap with SLOT AREA (Top Center)
            // Assuming slots are centered at width/2, around top + 100px
            const slotZoneWidth = 400;
            const slotZoneHeight = 150;
            const slotZoneX = (this.bounds.left + this.bounds.right) / 2 - slotZoneWidth / 2;
            const slotZoneY = this.bounds.top; // From top of table down
            const slotRect = new Phaser.Geom.Rectangle(slotZoneX, slotZoneY, slotZoneWidth, slotZoneHeight);

            const hasSlotOverlap = Phaser.Geom.Intersects.RectangleToRectangle(newRect, slotRect);

            if (!hasOverlapObs && !hasSlotOverlap) {
                return { type: isVertical ? 'wall_v' : 'wall_h', x, y, width, height };
            }
        }
        return null;
    }

    private findValidBallPosition(layout: GeneratedLayout, radius: number): { x: number, y: number } | null {
        const margin = radius * 2.5; // Ensure spacing
        const safeTop = this.bounds.top + margin;
        const safeBottom = this.bounds.bottom - margin - 100; // Leave cue ball space high
        const safeLeft = this.bounds.left + margin;
        const safeRight = this.bounds.right - margin;

        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(safeLeft, safeRight);
            const y = Phaser.Math.Between(safeTop, safeBottom);

            // Check ball overlaps
            const ballCircle = new Phaser.Geom.Circle(x, y, radius * 2.2); // Generous spacing
            const hitsBall = layout.balls.some(b =>
                Phaser.Math.Distance.Between(x, y, b.x, b.y) < radius * 2.5
            );

            // Check obstacle overlaps
            const hitsObstacle = layout.obstacles.some(obs => {
                const obsRect = new Phaser.Geom.Rectangle(obs.x, obs.y, obs.width, obs.height);
                return Phaser.Geom.Intersects.CircleToRectangle(ballCircle, obsRect);
            });

            if (!hitsBall && !hitsObstacle) {
                return { x, y };
            }
        }
        return null;
    }
}
