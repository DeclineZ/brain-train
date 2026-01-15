import Phaser from 'phaser';
import GameScene from '../GameScene';
import { WormGameConstants as WormGameConfig } from '../config';

export class ScoringSystem {
    private scene: GameScene;

    // Stats
    private switchCount: number = 0;
    private resetCount: number = 0;
    private mistakeCount: number = 0;

    // Scoring weights
    private optimalSteps: number = 100; // Placeholder until path metrics exist
    private actualSteps: number = 0; // NOT IMPLEMENTED YET

    constructor(scene: GameScene) {
        this.scene = scene;

        // Subscribe to events
        this.scene.events.on('JUNCTION_SWITCHED', this.onSwitch, this);
        this.scene.events.on('MISTAKE', this.onMistake, this); // WormSystem might need to emit this for Jamming/etc
    }

    public init() {
        this.switchCount = 0;
        this.resetCount = 0;
        this.mistakeCount = 0;
    }

    private onSwitch(data: { junctionId: string; source: string }) {
        // Only count USER switches, not EARTHQUAKE auto-switches
        if (data.source === 'USER') {
            this.switchCount++;
        }
    }

    public registerMistake(type: string) {
        this.mistakeCount++;
        console.log(`Mistake recorded: ${type}`);
    }

    private onMistake() {
        this.registerMistake("generic");
    }

    public incrementReset() {
        this.resetCount++;
    }

    public calculateScore(): { score: number, stars: number } {
        const W = WormGameConfig.SCORE_WEIGHTS;

        // 1. Planning: 100 - (switch * 5) - (reset * 20)
        let planning = 100 - (this.switchCount * 5) - (this.resetCount * 20);
        planning = Math.max(0, planning);

        // 2. Efficiency: (optimal / actual) * 100 - Skipping for now, defaulting to 100
        let efficiency = 100;

        // 3. Accuracy: 100 - (mistake * 15)
        let accuracy = 100 - (this.mistakeCount * 15);
        accuracy = Math.max(0, accuracy);

        const finalScore = (W.PLANNING * planning) + (W.EFFICIENCY * efficiency) + (W.ACCURACY * accuracy);
        const roundedScore = Math.round(finalScore);

        // Stars
        let stars = 1;
        if (roundedScore >= WormGameConfig.STARS.THREE) stars = 3;
        else if (roundedScore >= WormGameConfig.STARS.TWO) stars = 2;

        return { score: roundedScore, stars };
    }
}
