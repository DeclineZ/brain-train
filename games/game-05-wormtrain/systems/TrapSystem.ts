import Phaser from 'phaser';
import GameScene from '../GameScene';
import { LevelData, TrapConfig, TrapType } from '../types/level';

export class TrapSystem {
    private scene: GameScene;
    private traps: TrapConfig[] = [];
    private trapStates: Map<string, { active: boolean, timer: number }> = new Map();
    // Helper for Earthquake auto-switch timers
    private earthquakeTimers: Map<string, number> = new Map();

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    public init(levelData: LevelData) {
        this.traps = levelData.traps;
        this.trapStates.clear();
        this.earthquakeTimers.clear();

        this.traps.forEach(trap => {
            this.trapStates.set(trap.id, { active: true, timer: 0 }); // Default active? Or varied?

            if (trap.type === 'EARTHQUAKE' && trap.intervalMs) {
                this.earthquakeTimers.set(trap.id, trap.intervalMs);
            }
        });

        // TODO: Initial trap setup/warning if needed
    }

    public update(time: number, delta: number) {
        // Handle Earthquake automatic switching
        this.traps.forEach(trap => {
            if (trap.type === 'EARTHQUAKE' && trap.nodeId && trap.intervalMs) {
                let timer = this.earthquakeTimers.get(trap.id) || 0;
                timer -= delta;

                if (timer <= 0) {
                    // Trigger switch via event-based decoupling
                    this.scene.events.emit('TRAP_ACTIVATED', { trapId: trap.id, type: 'EARTHQUAKE', nodeId: trap.nodeId });
                    this.scene.switchSystem.switchJunction(trap.nodeId, 'EARTHQUAKE');

                    // Reset timer
                    this.earthquakeTimers.set(trap.id, trap.intervalMs);
                    timer = trap.intervalMs;

                    // Optional: Warning before switch?
                } else if (timer <= 1000 && timer + delta > 1000) {
                    // One second warning
                    this.scene.events.emit('TRAP_WARNING', { trapId: trap.id, remaining: timer });
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
