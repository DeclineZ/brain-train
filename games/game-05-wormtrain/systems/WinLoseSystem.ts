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
    public checkHoleArrival(wormColor: string, holeColor: string): boolean {
        if (this.gameOver) return false;

        if (wormColor === holeColor) {
            this.arrivedCount++;
            this.checkWinCondition();
            return true; // Success
        } else {
            this.triggerFail("WRONG_HOLE");
            return false; // Fail
        }
    }

    // Called when worm hits a TRAP
    public checkTrapCollision(trapId: string, trapType: string) {
        if (this.gameOver) return;

        if (trapType === 'SPIDER') {
            this.triggerFail("TRAP_SPIDER");
        }
        // COLLAPSING_HOLE is more of a blocker, checked during movement, not immediate fail usually?
        // If it is immediate fail:
        // this.triggerFail("TRAP_HOLE");
    }

    public checkWinCondition() {
        if (this.arrivedCount >= this.winCondition.requiredCount) {
            this.triggerWin();
        }
    }

    private triggerWin() {
        if (this.gameOver) return;
        this.gameOver = true;
        console.log("GAME WON!");
        this.scene.events.emit('GAME_WIN', { arrived: this.arrivedCount });
    }

    public triggerFail(reason: string) {
        if (this.gameOver) return;
        this.gameOver = true;
        console.log(`GAME OVER: ${reason}`);
        this.scene.events.emit('GAME_OVER', { reason });
    }
}
