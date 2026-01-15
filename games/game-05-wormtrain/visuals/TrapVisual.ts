import Phaser from 'phaser';
import GameScene from '../GameScene';
import { WormGameConstants as WormGameConfig } from '../config';
import { TrapConfig, LevelData, Node } from '../types/level';

interface TrapVisualData {
    trapId: string;
    type: string;
    nodeId?: string;
    graphics: Phaser.GameObjects.Container;
    warningIndicator?: Phaser.GameObjects.Arc;
    shakeTween?: Phaser.Tweens.Tween;
}

export class TrapVisual {
    private scene: GameScene;
    private container: Phaser.GameObjects.Container;
    private trapVisuals: Map<string, TrapVisualData> = new Map();
    private nodePositions: Map<string, { x: number; y: number }> = new Map();

    constructor(scene: GameScene) {
        this.scene = scene;
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(WormGameConfig.DEPTH.TRAP);

        // Subscribe to trap events
        this.scene.events.on('TRAP_WARNING', this.onTrapWarning, this);
        this.scene.events.on('TRAP_ACTIVATED', this.onTrapActivated, this);
        this.scene.events.on('TRAP_DEACTIVATED', this.onTrapDeactivated, this);
    }

    public init(levelData: LevelData) {
        // Cache node positions
        levelData.nodes.forEach(node => {
            this.nodePositions.set(node.id, { x: node.x, y: node.y });
        });

        // Create visuals for each trap
        levelData.traps.forEach(trap => {
            this.createTrapVisual(trap);
        });
    }

    private createTrapVisual(trap: TrapConfig) {
        const nodePos = trap.nodeId ? this.nodePositions.get(trap.nodeId) : null;
        if (!nodePos && trap.type !== 'COLLAPSING_HOLE') return; // Need position for most traps

        const trapContainer = this.scene.add.container(nodePos?.x || 0, nodePos?.y || 0);

        if (trap.type === 'SPIDER') {
            // Spider: Red-ish danger zone indicator (placeholder for spider sprite)
            const body = this.scene.add.circle(0, -20, 12, 0x8B0000);
            body.setAlpha(0.8);
            const legs = this.scene.add.graphics();
            legs.lineStyle(3, 0x333333, 1);
            // Simple leg lines
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI + Math.PI / 8;
                legs.moveTo(0, -20);
                legs.lineTo(Math.cos(angle) * 18, -20 + Math.sin(angle) * 12);
                legs.moveTo(0, -20);
                legs.lineTo(-Math.cos(angle) * 18, -20 + Math.sin(angle) * 12);
            }
            legs.strokePath();

            trapContainer.add([legs, body]);

            // Add idle animation (bobbing)
            this.scene.tweens.add({
                targets: trapContainer,
                y: trapContainer.y - 5,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else if (trap.type === 'EARTHQUAKE') {
            // Earthquake: Warning indicator around junction
            const warningRing = this.scene.add.circle(0, 0, 35, 0x000000, 0);
            warningRing.setStrokeStyle(4, 0xFFAA00, 0.6);
            trapContainer.add(warningRing);

            // Pulse animation
            this.scene.tweens.add({
                targets: warningRing,
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 0.3,
                duration: 1500,
                yoyo: true,
                repeat: -1
            });

            // Store reference for warning flash
            const data: TrapVisualData = {
                trapId: trap.id,
                type: trap.type,
                nodeId: trap.nodeId,
                graphics: trapContainer,
                warningIndicator: warningRing
            };
            this.trapVisuals.set(trap.id, data);
        } else if (trap.type === 'COLLAPSING_HOLE') {
            // Collapsing Hole: Visual overlay on the hole node
            // This will be handled differently - overlaying the hole visual
            const collapseOverlay = this.scene.add.circle(0, 0, 22, 0x000000, 0.7);
            collapseOverlay.setVisible(false); // Show only when collapsed
            trapContainer.add(collapseOverlay);
        }

        this.container.add(trapContainer);

        // Store visual data
        if (!this.trapVisuals.has(trap.id)) {
            this.trapVisuals.set(trap.id, {
                trapId: trap.id,
                type: trap.type,
                nodeId: trap.nodeId,
                graphics: trapContainer
            });
        }
    }

    private onTrapWarning({ trapId, remaining }: { trapId: string; remaining: number }) {
        const data = this.trapVisuals.get(trapId);
        if (!data) return;

        if (data.type === 'EARTHQUAKE' && data.warningIndicator) {
            // Flash red warning
            this.scene.tweens.add({
                targets: data.warningIndicator,
                strokeColor: { from: 0xFFAA00, to: 0xFF0000 },
                duration: 100,
                yoyo: true,
                repeat: 3
            });
        }
    }

    private onTrapActivated({ trapId, type, nodeId }: { trapId: string; type: string; nodeId?: string }) {
        const data = this.trapVisuals.get(trapId);
        if (!data) return;

        if (type === 'EARTHQUAKE') {
            // Shake the junction visual briefly
            data.shakeTween = this.scene.tweens.add({
                targets: data.graphics,
                x: data.graphics.x + 3,
                duration: 50,
                yoyo: true,
                repeat: 5
            });

            // Emit particles (simple circles)
            const pos = this.nodePositions.get(nodeId || '');
            if (pos) {
                for (let i = 0; i < 5; i++) {
                    const particle = this.scene.add.circle(
                        pos.x + Phaser.Math.Between(-20, 20),
                        pos.y + Phaser.Math.Between(-20, 20),
                        Phaser.Math.Between(3, 6),
                        0x8B4513 // Brown dirt color
                    );
                    this.scene.tweens.add({
                        targets: particle,
                        y: particle.y + 30,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => particle.destroy()
                    });
                }
            }
        } else if (type === 'SPIDER') {
            // Spider attack animation
            this.scene.tweens.add({
                targets: data.graphics,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: 150,
                yoyo: true
            });
        } else if (type === 'COLLAPSING_HOLE') {
            // Show collapse overlay
            const overlay = data.graphics.list[0] as Phaser.GameObjects.Arc;
            if (overlay) {
                overlay.setVisible(true);
                this.scene.tweens.add({
                    targets: overlay,
                    alpha: 0.9,
                    duration: 200
                });
            }
        }
    }

    private onTrapDeactivated({ trapId, type }: { trapId: string; type: string }) {
        const data = this.trapVisuals.get(trapId);
        if (!data) return;

        if (type === 'COLLAPSING_HOLE') {
            // Hide collapse overlay
            const overlay = data.graphics.list[0] as Phaser.GameObjects.Arc;
            if (overlay) {
                this.scene.tweens.add({
                    targets: overlay,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => overlay.setVisible(false)
                });
            }
        }
    }
}
