import Phaser from 'phaser';
import GameScene from '../GameScene';
import { LevelData } from '../types/level';

export class SwitchSystem {
    private scene: GameScene;
    private junctionStates: Map<string, number> = new Map(); // junctionId -> activeIndex
    private junctionConfigs: Map<string, { outEdges: string[] }> = new Map();

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    public init(levelData: LevelData) {
        this.junctionStates.clear();
        this.junctionConfigs.clear();

        levelData.junctions.forEach(j => {
            this.junctionStates.set(j.id, j.defaultIndex);
            this.junctionConfigs.set(j.id, { outEdges: j.outEdges });
        });
    }

    public switchJunction(junctionId: string, source: 'USER' | 'EARTHQUAKE' = 'USER') {
        if (!this.junctionStates.has(junctionId)) return;

        const prevIndex = this.junctionStates.get(junctionId) || 0;
        const config = this.junctionConfigs.get(junctionId);

        if (!config) return;

        const nextIndex = (prevIndex + 1) % config.outEdges.length;
        this.junctionStates.set(junctionId, nextIndex);

        // Emit event: JUNCTION_SWITCHED
        // Consumed by: ScoringSystem (stats - only USER), JunctionVisual (rotation anim)
        this.scene.events.emit('JUNCTION_SWITCHED', {
            junctionId,
            prevIndex,
            nextIndex,
            source
        });
    }

    public getActiveIndex(junctionId: string): number {
        return this.junctionStates.get(junctionId) || 0;
    }

    // Debug/Cheat
    public setIndex(junctionId: string, index: number) {
        if (!this.junctionStates.has(junctionId)) return;
        this.junctionStates.set(junctionId, index);
    }
}
