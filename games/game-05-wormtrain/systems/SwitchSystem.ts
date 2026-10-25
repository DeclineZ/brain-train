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

        const junctionNode = this.scene.graphSystem.getNode(junctionId);
        let nearestDist: number | null = null;
        let wormsOnBoard = 0;

        const worms = this.scene.wormSystem.getWorms();
        worms.forEach(w => {
            if (w.state !== 'DEAD' && w.state !== 'ARRIVED') {
                wormsOnBoard++;
                if (junctionNode && this.scene.wormVisual) {
                    const pos = this.scene.wormVisual.getWormHeadPosition(w.id);
                    if (pos) {
                        const dist = Math.hypot(pos.x - junctionNode.x, pos.y - junctionNode.y);
                        if (nearestDist === null || dist < nearestDist) {
                            nearestDist = Math.round(dist);
                        }
                    }
                }
            }
        });

        this.scene.telemetry.action('junction_switched', {
            junction_id: junctionId,
            source: source.toLowerCase(),
            new_index: nextIndex,
            nearest_worm_distance: nearestDist,
            worms_on_board: wormsOnBoard,
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
