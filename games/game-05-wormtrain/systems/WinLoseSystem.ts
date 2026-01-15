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

    public init(levelData: LevelData) {
        this.ruleSet = levelData.rules;
        this.winCondition = levelData.winCondition;
        this.arrivedCount = 0;
        this.gameOver = false;
    }

    // Called when worm reaches a HOLE
    public checkHoleArrival(wormColor: string, holeColor: string, wormSize?: string, holeSize?: string): boolean {
        if (this.gameOver) return false;

        // Color must match
        if (wormColor !== holeColor) {
            this.triggerFail("WRONG_HOLE");
            return false;
        }

        // Size matching (if hole has size specified)
        // M worm can go to holes without size (backwards compatibility)
        // S worm must go to S hole, M worm must go to M hole
        if (holeSize) {
            const wormSizeNorm = wormSize || 'M'; // Default to M if not specified
            if (wormSizeNorm !== holeSize) {
                this.triggerFail("WRONG_SIZE");
                return false;
            }
        }

        this.arrivedCount++;
        this.checkWinCondition();
        return true; // Success
    }

    // Called when worm hits a TRAP
    public checkTrapCollision(trapId: string, trapType: string) {
        if (this.gameOver) return;

        if (trapType === 'SPIDER') {
            this.triggerFail("TRAP_SPIDER");
        }
    }

    public checkWinCondition() {
        if (this.arrivedCount >= this.winCondition.requiredCount) {
            this.triggerWin();
        }
    }

    private triggerWin() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.scene.gameOver = true;
        console.log("GAME WON!");

        // Calculate score using ScoringSystem
        const scoreResult = this.scene.scoringSystem.calculateScore();

        // Emit internal event (for Phaser-based visuals if needed)
        this.scene.events.emit('GAME_WIN', { arrived: this.arrivedCount });

        // Call React onGameOver callback via game registry
        const onGameOver = this.scene.game.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: true,
                level: this.scene.game.registry.get('level') || 1,
                stars: scoreResult.stars,
                score: scoreResult.score,
                // This game focuses on planning skills
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

    public triggerFail(reason: string) {
        if (this.gameOver) return;
        this.gameOver = true;
        this.scene.gameOver = true;
        console.log(`GAME OVER: ${reason}`);

        // Emit internal event
        this.scene.events.emit('GAME_OVER', { reason });

        // Call React onGameOver callback
        const onGameOver = this.scene.game.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: false,
                level: this.scene.game.registry.get('level') || 1,
                stars: 0,
                score: 0,
                stat_planning: null,
                stat_memory: null,
                stat_speed: null,
                stat_focus: null,
                stat_visual: null,
                stat_emotion: null,
                failReason: reason
            });
        }
    }

    private getStarHint(stars: number): string | null {
        if (stars >= 3) return null;
        if (stars === 2) {
            return 'ลดจำนวนครั้งที่กดเปลี่ยนทาง\nจะได้ 3 ดาว';
        }
        return 'ลองวางแผนก่อนกด\nเพื่อลดความผิดพลาด';
    }
}

