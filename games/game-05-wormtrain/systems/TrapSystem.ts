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
            // Default assumes active immediately unless delayed
            let startActive = true;
            let startTimer = trap.activeDurationMs || 3000;

            if (trap.type === 'SPIDER') {
                if (trap.initialDelayMs && trap.initialDelayMs > 0) {
                    startActive = false;
                    startTimer = trap.initialDelayMs;
                }
                this.trapStates.set(trap.id, { active: startActive, timer: startTimer });

                // If starting inactive, ensure visual is hidden initially (event though Visual handles update, 
                // we might need to emit if the visual defaults to visible. 
                // Actually TrapVisual creates it visible. So if startActive is false, we should emit DEACTIVATED immediately?
                // Better: TrapVisual should query system? Or we emit DEACTIVATED here.
                if (!startActive) {
                    // Defer slightly to ensure systems are ready? Or just rely on visual handling it?
                    // GraphVisual/TrapVisual creation happens before this init usually? 
                    // No, LevelLoader calls system.init. 
                    // TrapVisual.init creates objects. 
                    // We'll emit DEACTIVATED in the first update if needed, or just let it run.
                    // Actually, if I set timer, it will count down then toggle to ACTIVE.
                    // But if visual starts Visible, we have a mismatch.
                    // Let's emit DEACTIVATED here if needed.
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
            if (trap.type === 'EARTHQUAKE' && trap.nodeId && trap.intervalMs) {
                let timer = this.earthquakeTimers.get(trap.id) || 0;
                timer -= delta;

                // 2 second warning
                if (timer <= 2000 && !this.warningShown.get(trap.id)) {
                    this.warningShown.set(trap.id, true);
                    this.scene.events.emit('TRAP_WARNING', { trapId: trap.id, type: 'EARTHQUAKE', remaining: timer });
                    this.scene.game.events.emit('trap-warning', { trapId: trap.id, type: 'EARTHQUAKE', message: '⚠️ สั่นสะเทือน!' });
                }

                if (timer <= 0) {
                    this.scene.events.emit('TRAP_ACTIVATED', { trapId: trap.id, type: 'EARTHQUAKE', nodeId: trap.nodeId });
                    this.scene.switchSystem.switchJunction(trap.nodeId, 'EARTHQUAKE');
                    this.earthquakeTimers.set(trap.id, trap.intervalMs);
                    this.warningShown.set(trap.id, false);
                    timer = trap.intervalMs;
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
                        this.scene.events.emit('TRAP_WARNING', { trapId: trap.id, type: 'SPIDER', remaining: state.timer });
                    }
                }

                if (state.timer <= 0) {
                    // Toggle State
                    state.active = !state.active;
                    this.warningShown.set(trap.id, false); // Reset warning flag on state change

                    if (state.active) {
                        // Spider APPEARS
                        this.scene.events.emit('TRAP_ACTIVATED', { trapId: trap.id, type: 'SPIDER', nodeId: trap.nodeId });
                        state.timer = trap.activeDurationMs || 3000; // Default 3s duration
                    } else {
                        // Spider HIDES
                        this.scene.events.emit('TRAP_DEACTIVATED', { trapId: trap.id, type: 'SPIDER' });
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
