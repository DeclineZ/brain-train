import Phaser from 'phaser';
import GameScene from '../GameScene';
import { LevelData, TrapConfig, TrapType } from '../types/level';

export class TrapSystem {
    private scene: GameScene;
    private traps: TrapConfig[] = [];
    private trapStates: Map<string, { active: boolean, timer: number }> = new Map();
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
            this.trapStates.set(trap.id, { active: true, timer: 0 });

            if (trap.type === 'EARTHQUAKE' && trap.intervalMs) {
                // Use initialDelayMs if specified, otherwise use intervalMs
                const initialDelay = trap.initialDelayMs ?? trap.intervalMs;
                this.earthquakeTimers.set(trap.id, initialDelay);
                this.warningShown.set(trap.id, false);
            }
        });
    }

    public update(time: number, delta: number) {
        // Handle Earthquake automatic switching
        this.traps.forEach(trap => {
            if (trap.type === 'EARTHQUAKE' && trap.nodeId && trap.intervalMs) {
                let timer = this.earthquakeTimers.get(trap.id) || 0;
                timer -= delta;

                // 2 second warning - emit to game.events so React can catch it
                if (timer <= 2000 && !this.warningShown.get(trap.id)) {
                    this.warningShown.set(trap.id, true);
                    // Emit to scene events for Phaser visuals
                    this.scene.events.emit('TRAP_WARNING', { trapId: trap.id, type: 'EARTHQUAKE', remaining: timer });
                    // Emit to game.events for React overlay
                    this.scene.game.events.emit('trap-warning', { trapId: trap.id, type: 'EARTHQUAKE', message: '⚠️ สั่นสะเทือน!' });
                }

                if (timer <= 0) {
                    // Trigger switch via event-based decoupling
                    this.scene.events.emit('TRAP_ACTIVATED', { trapId: trap.id, type: 'EARTHQUAKE', nodeId: trap.nodeId });
                    this.scene.switchSystem.switchJunction(trap.nodeId, 'EARTHQUAKE');

                    // Reset timer and warning flag
                    this.earthquakeTimers.set(trap.id, trap.intervalMs);
                    this.warningShown.set(trap.id, false);
                    timer = trap.intervalMs;
                }

                this.earthquakeTimers.set(trap.id, timer);
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
