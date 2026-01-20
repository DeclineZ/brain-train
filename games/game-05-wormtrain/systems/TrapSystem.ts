import Phaser from 'phaser';
import GameScene from '../GameScene';
import { LevelData, TrapConfig, TrapType } from '../types/level';

export class TrapSystem {
    private scene: GameScene;
    private traps: TrapConfig[] = [];
    private trapStates: Map<string, { active: boolean, timer: number, appearances?: number, nextSpawnNode?: string }> = new Map();
    // Helper for Earthquake auto-switch timers
    private earthquakeTimers: Map<string, number> = new Map();
    // Track if we've shown warning for current cycle
    private warningShown: Map<string, boolean> = new Map();

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    public init(levelData: LevelData) {
        this.traps = levelData.traps;
        this.trapStates.clear();
        this.earthquakeTimers.clear();
        this.warningShown.clear();

        this.traps.forEach(trap => {
            // Default assumes active immediately unless delayed
            let startActive = true;
            let startTimer = trap.activeDurationMs || 3000;

            // Pre-calculate initial spawn node
            let nextSpawnNode = trap.nodeId;
            if (trap.nodePool && trap.nodePool.length > 0) {
                nextSpawnNode = trap.nodePool[Math.floor(Math.random() * trap.nodePool.length)];
            }

            if (trap.type === 'SPIDER') {
                if (trap.initialDelayMs && trap.initialDelayMs > 0) {
                    startActive = false;
                    startTimer = trap.initialDelayMs;
                }
                this.trapStates.set(trap.id, { active: startActive, timer: startTimer, nextSpawnNode });

                if (!startActive) {
                    // Logic handled in update
                }
            } else {
                this.trapStates.set(trap.id, { active: true, timer: 0 });
            }

            if (trap.type === 'EARTHQUAKE' && trap.intervalMs) {
                const initialDelay = trap.initialDelayMs ?? trap.intervalMs;
                this.earthquakeTimers.set(trap.id, initialDelay);
                this.warningShown.set(trap.id, false);
            }
        });
    }

    public update(time: number, delta: number) {
        this.traps.forEach(trap => {
            const state = this.trapStates.get(trap.id);
            if (!state) return;

            // --- EARTHQUAKE LOGIC ---
            if (trap.type === 'EARTHQUAKE' && trap.intervalMs) {
                let timer = this.earthquakeTimers.get(trap.id) || 0;
                timer -= delta;

                // Use pre-calculated nextSpawnNode or default nodeId
                const targetNodeId = state.nextSpawnNode || trap.nodeId;

                // Warning only shows ONCE (first time) per cycle
                if (timer <= 2000 && !this.warningShown.get(trap.id)) {
                    this.warningShown.set(trap.id, true);
                    this.scene.events.emit('TRAP_WARNING', {
                        trapId: trap.id,
                        type: 'EARTHQUAKE',
                        remaining: timer,
                        nodeId: targetNodeId
                    });
                    this.scene.game.events.emit('trap-warning', { trapId: trap.id, type: 'EARTHQUAKE', message: '⚠️ สั่นสะเทือน!' });
                }

                if (timer <= 0 && targetNodeId) {
                    this.scene.events.emit('TRAP_ACTIVATED', { trapId: trap.id, type: 'EARTHQUAKE', nodeId: targetNodeId });
                    this.scene.switchSystem.switchJunction(targetNodeId, 'EARTHQUAKE');
                    this.earthquakeTimers.set(trap.id, trap.intervalMs);

                    // Reset warning for next cycle? NO, User wants ONLY ONCE per level.
                    // this.warningShown.set(trap.id, false);
                    timer = trap.intervalMs;

                    // Pick NEXT node for FUTURE appearance
                    if (trap.nodePool && trap.nodePool.length > 0) {
                        state.nextSpawnNode = trap.nodePool[Math.floor(Math.random() * trap.nodePool.length)];
                    }
                } else {
                    this.earthquakeTimers.set(trap.id, timer);
                }
            }

            // --- SPIDER LOGIC (Intermittent) ---
            if (trap.type === 'SPIDER') {
                state.timer -= delta;

                // Warning before appearing (if inactive and about to be active)
                if (!state.active && state.timer <= 2000 && state.timer > 0) {
                    if (!this.warningShown.get(trap.id)) {
                        this.warningShown.set(trap.id, true);
                        // Use pre-calculated nextSpawnNode for warning
                        this.scene.events.emit('TRAP_WARNING', {
                            trapId: trap.id,
                            type: 'SPIDER',
                            remaining: state.timer,
                            nodeId: state.nextSpawnNode
                        });
                    }
                }

                if (state.timer <= 0) {
                    // Toggle State
                    state.active = !state.active;
                    this.warningShown.set(trap.id, false); // Reset warning flag on state change

                    if (state.active) {
                        // Spider APPEARS - use pre-calculated node
                        const spawnNodeId = state.nextSpawnNode || trap.nodeId;

                        this.scene.events.emit('TRAP_ACTIVATED', { trapId: trap.id, type: 'SPIDER', nodeId: spawnNodeId });
                        state.timer = trap.activeDurationMs || 3000; // Default 3s duration
                        state.appearances = (state.appearances || 0) + 1; // Increment appearance count
                    } else {
                        // Spider HIDES
                        this.scene.events.emit('TRAP_DEACTIVATED', { trapId: trap.id, type: 'SPIDER' });

                        // Check if this was the last appearance
                        if (trap.maxAppearances && (state.appearances || 0) >= trap.maxAppearances) {
                            state.timer = Infinity; // Puts trap to sleep forever
                            return;
                        }

                        // Pick NEXT node for FUTURE appearance
                        if (trap.nodePool && trap.nodePool.length > 0) {
                            state.nextSpawnNode = trap.nodePool[Math.floor(Math.random() * trap.nodePool.length)];
                        }

                        state.timer = trap.intervalMs || 3000; // Default 3s interval (gone)
                    }
                }
            }
        });
    }

    public isTrapActive(trapId: string): boolean {
        return this.trapStates.get(trapId)?.active || false;
    }

    public getTrapsAtNode(nodeId: string): TrapConfig[] {
        return this.traps.filter(t => t.nodeId === nodeId);
    }
}
