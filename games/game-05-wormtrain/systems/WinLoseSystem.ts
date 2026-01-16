import Phaser from 'phaser';
import GameScene from '../GameScene';
import { LevelData } from '../types/level';

export class WinLoseSystem {
    private scene: GameScene;
    private ruleSet: any;
    private winCondition: any;
    private arrivedCount: number = 0;
    private gameOver: boolean = false;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    private totalWorms: number = 0;
    private lostCount: number = 0;

    public init(levelData: LevelData) {
        this.ruleSet = levelData.rules;
        this.winCondition = levelData.winCondition;
        this.arrivedCount = 0;
        this.lostCount = 0;
        this.totalWorms = levelData.worms.length;
        this.gameOver = false;

        // Reset Score System
        this.scene.scoringSystem.init();
    }

    // Called when worm reaches a HOLE
    public checkHoleArrival(wormColor: string, holeColor: string, wormSize?: string, holeSize?: string): boolean {
        if (this.gameOver) return false;

        let mismatch = false;

        // Color must match (Case insensitive)
        if (wormColor.toLowerCase() !== holeColor.toLowerCase()) {
            mismatch = true;
            this.scene.scoringSystem.registerMistake('WRONG_HOLE');
        } else if (holeSize) {
            // Size matching
            const wormSizeNorm = wormSize || 'M';
            if (wormSizeNorm !== holeSize) {
                mismatch = true;
                this.scene.scoringSystem.registerMistake('WRONG_SIZE');
            }
        }

        if (mismatch) {
            this.registerLoss();
            return false; // Result is FAIL (Worm Disappears)
        }

        this.arrivedCount++;
        this.scene.events.emit('WORM_ARRIVED');
        this.checkEndCondition();
        return true; // Success
    }

    // Called when worm hits a TRAP
    public checkTrapCollision(trapId: string, trapType: string) {
        if (this.gameOver) return;

        if (trapType === 'SPIDER') {
            this.scene.scoringSystem.registerMistake('TRAP_SPIDER');
            this.registerLoss();
        }
    }

    // External Trigger for JAM/BLOCK
    public triggerFail(reason: string) {
        if (this.gameOver) return;

        console.log(`Mistake: ${reason}`);
        this.scene.scoringSystem.registerMistake(reason);
        this.registerLoss();
    }

    private registerLoss() {
        this.lostCount++;
        this.checkEndCondition();
    }

    public checkEndCondition() {
        // If all worms processed
        if (this.arrivedCount + this.lostCount >= this.totalWorms) {
            this.finishLevel();
        }
    }

    private finishLevel() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.scene.gameOver = true;

        // Calculate score
        const scoreResult = this.scene.scoringSystem.calculateScore();
        console.log(`Level Finished. Arrived: ${this.arrivedCount}, Lost: ${this.lostCount}, Stars: ${scoreResult.stars}`);

        this.scene.events.emit('GAME_WIN', { arrived: this.arrivedCount, lost: this.lostCount });

        const onGameOver = this.scene.game.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: true, // Always "Success" in terms of completion? Or depend on Stars?
                // Let's assume completion = success. Stars determine quality.
                level: this.scene.game.registry.get('level') || 1,
                stars: scoreResult.stars,
                score: scoreResult.score,
                stat_planning: scoreResult.score,
                stat_memory: null,
                stat_speed: null,
                stat_focus: null,
                stat_visual: null,
                stat_emotion: null,
                starHint: this.getStarHint(scoreResult.stars)
            });
        }
    }

    private getStarHint(stars: number): string | null {
        if (stars >= 3) return null;
        if (stars === 2) {
            return 'ลองลดความผิดพลาดลง\nจะได้ 3 ดาว';
        }
        return 'วางแผนเส้นทางให้ดี\nหนอนหายไปเยอะเลย';
    }
}

