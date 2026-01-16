import Phaser from 'phaser';
import GameScene from '../GameScene';
import { LevelData, WormConfig, WormSpawnConfig, WormSize, Point, Node, Edge } from '../types/level';
import { WormGameConstants as WormGameConfig } from '../config';

// Add PAUSED_TUTORIAL to state
export type WormState = 'MOVING' | 'JAMMED' | 'NEAR_TRAP' | 'DEAD' | 'ARRIVED' | 'PAUSED_TUTORIAL';

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

    // Tutorial tracking
    visitedJunctions?: Set<string>;
}

export class WormSystem {
    private scene: GameScene;
    private worms: Map<string, WormEntity> = new Map();
    private spawnQueue: WormSpawnConfig[] = [];
    private timeElapsed: number = 0;

    // Tutorial State
    private isTutorial: boolean = false;
    private isTutorialPaused: boolean = false; // Add Global Pause Flag

    constructor(scene: GameScene) {
        this.scene = scene;

        // Listen for junction switches to resume tutorial
        this.scene.events.on('JUNCTION_SWITCHED', this.onJunctionSwitched, this);
    }

    public init(levelData: LevelData) {
        this.worms.clear();
        this.spawnQueue = [...levelData.worms].sort((a, b) => a.spawnTimeMs - b.spawnTimeMs);
        this.timeElapsed = 0;
        this.isTutorial = levelData.levelId === 0;
        this.isTutorialPaused = false;
    }

    private onJunctionSwitched({ junctionId }: { junctionId: string }) {
        if (!this.isTutorial) return;

        // Check if any worm is paused at this junction (waiting for resume)
        let resumed = false;
        this.worms.forEach(worm => {
            if (worm.state === 'PAUSED_TUTORIAL' && worm.nextNodeId === junctionId) {
                this.setWormState(worm, 'MOVING');
                resumed = true;
            }
        });

        if (resumed) {
            this.scene.events.emit('HIDE_TUTORIAL_HINT', { junctionId });
            this.isTutorialPaused = false; // Resume Global Game
        }
    }

    public update(time: number, delta: number) {
        // GLOBAL TUTORIAL PAUSE: Stop everything if paused
        if (this.isTutorialPaused) return;

        this.timeElapsed += delta;

        // 1. Spawning
        this.processSpawns();

        // 2. Movement & Login
        this.worms.forEach(worm => {
            if (worm.state === 'DEAD' || worm.state === 'ARRIVED' || worm.state === 'PAUSED_TUTORIAL') return;

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

        // Check for node arrival or Tutorial Pause
        if (worm.distanceOnEdge >= edge.length) {
            const reachedNodeId = edge.to;
            this.handleNodeArrival(worm, reachedNodeId);
        } else if (this.isTutorial && worm.distanceOnEdge >= edge.length - 80) {
            // TUTORIAL PAUSE CHECK
            // If near end of edge (approaching junction), check if we should pause
            const nextNodeId = edge.to;
            const nextNode = this.scene.graphSystem.getNode(nextNodeId);

            if (nextNode && nextNode.type === 'JUNCTION') {
                if (!worm.visitedJunctions) worm.visitedJunctions = new Set();

                if (!worm.visitedJunctions.has(nextNodeId)) {
                    // PAUSE!
                    this.setWormState(worm, 'PAUSED_TUTORIAL');
                    worm.visitedJunctions.add(nextNodeId);
                    worm.nextNodeId = nextNodeId; // Store for resume check

                    this.scene.events.emit('SHOW_TUTORIAL_HINT', { junctionId: nextNodeId });

                    // Trigger Global Pause (Stop other worms / spawning)
                    this.isTutorialPaused = true;
                }
            }
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
                    // Spider is purely visual - worms pass through without blocking
                    // Just emit event for visual feedback if needed
                    this.scene.events.emit('WORM_PASSED_SPIDER', {
                        wormId: worm.config.id,
                        trapId: trap.id,
                        x: node.x,
                        y: node.y
                    });
                    // Continue processing - don't block or return
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

            this.scene.events.emit('WORM_RESOLVED', {
                x: node.x,
                y: node.y,
                success: success,
                reason: success ? 'ARRIVED' : 'WRONG_HOLE'
            });
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
                // JAMMED Logic -> FAIL immediately for clarity
                worm.distanceOnEdge = this.scene.graphSystem.getEdge(worm.currentEdgeId)!.length;
                this.setWormState(worm, 'DEAD');

                this.scene.events.emit('WORM_RESOLVED', {
                    x: node.x,
                    y: node.y,
                    success: false,
                    reason: 'BLOCKED'
                });

                // Trigger Fail with clear reason
                this.scene.winLoseSystem.triggerFail("SIZE_MISMATCH_JAM");
            } else {
                // Move to next edge
                worm.currentEdgeId = nextEdge.id;
                worm.distanceOnEdge = 0; // Reset dist
            }
        } else {
            // No active edge? Dead end?
            this.setWormState(worm, 'DEAD'); // Fall off map

            this.scene.events.emit('WORM_RESOLVED', {
                x: node.x,
                y: node.y,
                success: false,
                reason: 'DEAD_END'
            });

            this.scene.winLoseSystem.triggerFail("DEAD_END");
        }
    }

    private isBlocked(worm: WormEntity, edge: Edge): boolean {
        // Narrow check
        if (edge.widthClass === 'narrow') {
            // TODO: Check global rules if we want to toggle this mechanic?
            // For now assume rule is always ON for narrow edges
            if (worm.config.size === 'M') {
                // Only S fits narrow. M is too large.
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
