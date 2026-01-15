import Phaser from 'phaser';
import GameScene from '../GameScene';
import { LevelData, WormConfig, WormSpawnConfig, WormSize, Point, Node, Edge } from '../types/level';
import { WormGameConstants as WormGameConfig } from '../config';

export type WormState = 'MOVING' | 'JAMMED' | 'NEAR_TRAP' | 'DEAD' | 'ARRIVED';

export interface WormEntity {
    id: string;
    config: WormSpawnConfig;
    state: WormState;

    // Position Logic
    currentEdgeId: string;
    distanceOnEdge: number; // distance from start of edge
    speed: number;

    // Future path preview (optional)
    nextNodeId?: string;

    // Visual ref (optional, but strictly we emit events)
}

export class WormSystem {
    private scene: GameScene;
    private worms: Map<string, WormEntity> = new Map();
    private spawnQueue: WormSpawnConfig[] = [];
    private timeElapsed: number = 0;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    public init(levelData: LevelData) {
        this.worms.clear();
        this.spawnQueue = [...levelData.worms].sort((a, b) => a.spawnTimeMs - b.spawnTimeMs);
        this.timeElapsed = 0;
    }

    public update(time: number, delta: number) {
        this.timeElapsed += delta;

        // 1. Spawning
        this.processSpawns();

        // 2. Movement & Login
        this.worms.forEach(worm => {
            if (worm.state === 'DEAD' || worm.state === 'ARRIVED') return;

            // Handle JAMMED state recovery check (if applicable)
            if (worm.state === 'JAMMED') {
                // Check if unblocked (e.g. junction switched)
                if (this.canMove(worm, worm.currentEdgeId, worm.distanceOnEdge)) {
                    this.setWormState(worm, 'MOVING');
                } else {
                    return; // Still stuck
                }
            }

            // Move
            const dp = (worm.speed * WormGameConfig.DEFAULT_SPEED / 100) * (delta / 1000); // Speed factor handling
            this.moveWorm(worm, dp);
        });
    }

    private processSpawns() {
        while (this.spawnQueue.length > 0 && this.spawnQueue[0].spawnTimeMs <= this.timeElapsed) {
            const config = this.spawnQueue.shift()!;
            this.spawnWorm(config);
        }
    }

    private spawnWorm(config: WormSpawnConfig) {
        // Find initial edge from spawn node
        const startNode = this.scene.graphSystem.getNode(config.spawnNodeId);
        if (!startNode) return;

        const nextEdge = this.scene.graphSystem.getNextEdge(config.spawnNodeId, 0); // Active index 0 for spawn usually? 
        // Actually spawn usually is a specific node that leads to one path.

        // If spawn has multiple outs, logic needs to be clear. Assuming single out for Spawn nodes usually.
        if (!nextEdge) {
            console.error(`Spawn node ${config.spawnNodeId} has no out edge!`);
            return;
        }

        const worm: WormEntity = {
            id: config.id,
            config: config,
            state: 'MOVING',
            currentEdgeId: nextEdge.id,
            distanceOnEdge: 0,
            speed: config.speed
        };

        this.worms.set(worm.id, worm);

        // Emit Spawn Event
        this.scene.events.emit('WORM_SPAWN', { worm });
    }

    private moveWorm(worm: WormEntity, dp: number) {
        const edge = this.scene.graphSystem.getEdge(worm.currentEdgeId);
        if (!edge) return;

        worm.distanceOnEdge += dp;

        // Check for End of Edge
        if (worm.distanceOnEdge >= edge.length) {
            const reachedNodeId = edge.to;
            this.handleNodeArrival(worm, reachedNodeId);
        } else {
            // Just update position event? 
            // Optimisation: Only emit position updates if visual layer needs precise sync, 
            // otherwise visual layer acts on frame interpolation and we just sync state/edge changes.
            // For now, let's emit generic update or let Visual read from System (direct access often faster for frame updates).
            // We'll expose a getter for visuals.
        }
    }

    private handleNodeArrival(worm: WormEntity, nodeId: string) {
        const node = this.scene.graphSystem.getNode(nodeId);
        if (!node) return;

        // 1. Check Traps at this node
        const traps = this.scene.trapSystem.getTrapsAtNode(nodeId);
        for (const trap of traps) {
            if (this.scene.trapSystem.isTrapActive(trap.id)) {
                if (trap.type === 'SPIDER') {
                    this.setWormState(worm, 'DEAD');
                    this.scene.winLoseSystem.checkTrapCollision(trap.id, 'SPIDER');
                    return;
                }
            }
        }

        // 2. Handle Node Types
        if (node.type === 'HOLE') {
            const success = this.scene.winLoseSystem.checkHoleArrival(
                worm.config.color,
                node.color || '',
                worm.config.size,
                node.size
            );
            this.setWormState(worm, success ? 'ARRIVED' : 'DEAD');
            return;
        }

        // 3. Junction / Merge - Pick next edge
        let nextEdge: Edge | undefined;

        if (node.type === 'JUNCTION') {
            const activeIndex = this.scene.switchSystem.getActiveIndex(nodeId);
            nextEdge = this.scene.graphSystem.getNextEdge(nodeId, activeIndex);
        } else {
            // Merge or just normal path node
            nextEdge = this.scene.graphSystem.getNextEdge(nodeId, 0);
        }

        if (nextEdge) {
            // Check Narrow Constraint
            if (this.isBlocked(worm, nextEdge)) {
                // JAMMED Logic
                // Snap to end of current edge
                worm.distanceOnEdge = this.scene.graphSystem.getEdge(worm.currentEdgeId)!.length;
                this.setWormState(worm, 'JAMMED');

                // Register Mistake for Jam?
                this.scene.scoringSystem.registerMistake('JAM');
            } else {
                // Move to next edge
                worm.currentEdgeId = nextEdge.id;
                worm.distanceOnEdge = 0; // Reset dist
                // We technically overshot 'dp', could preserve excess dist but simplifying for now.
            }
        } else {
            // No active edge? Dead end?
            // Should not happen in valid graph unless 'blocked' logically?
            this.setWormState(worm, 'DEAD'); // Fall off map
            this.scene.winLoseSystem.triggerFail("DEAD_END");
        }
    }

    private isBlocked(worm: WormEntity, edge: Edge): boolean {
        // Narrow check
        if (edge.widthClass === 'narrow') {
            // TODO: Check global rules if we want to toggle this mechanic?
            // For now assume rule is always ON for narrow edges
            if (worm.config.size === 'L' || worm.config.size === 'M') { // Assuming M/L cant fit narrow? Or just L?
                // Let's stick to user prompt: "worm.size === 'S' // หรือ S/M ตามดีไซน์ level"
                // Assume ONLY S fits narrow.
                return true;
            }
        }
        return false;
    }

    private canMove(worm: WormEntity, currentEdgeId: string, currentDist: number): boolean {
        // Helper for JAMMED worms to check if they can proceed now
        // Rerun logic similar to arrival
        return false; // TODO: Implement retry logic from Node (Need ref to node inside JAM state?)
        // Jammed worms are stuck at the END of their current edge.
        // So checks are against the Next Edge from the node `edge.to`.
    }

    private setWormState(worm: WormEntity, newState: WormState) {
        if (worm.state !== newState) {
            worm.state = newState;
            this.scene.events.emit('WORM_STATE_CHANGE', { wormId: worm.id, newState });
        }
    }

    // Public Accessor for Visuals
    public getWorms() {
        return this.worms;
    }
}
