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
            // Create spider image DIRECTLY on scene (not in container) for proper depth sorting
            if (this.scene.textures.exists('spider_trap')) {
                const spider = this.scene.add.image(nodePos?.x || 0, nodePos?.y || 0, 'spider_trap');
                // Target size - compact so it doesn't overwhelm
                const targetSize = 70;
                const textureWidth = spider.width || 512;
                spider.setScale(targetSize / textureWidth);

                // Set very high depth so it's above everything
                spider.setDepth(1000);

                // Start HIDDEN - will appear on TRAP_ACTIVATED event
                spider.setVisible(false);
                spider.setAlpha(0);

                // Store spider reference and initial position in trapContainer for animation
                trapContainer.setData('spiderImage', spider);
                trapContainer.setData('initialPos', { x: nodePos?.x || 0, y: nodePos?.y || 0 });
            } else {
                // Fallback
                const body = this.scene.add.circle(0, -30, 30, 0x8B0000);
                const text = this.scene.add.text(0, -30, "X", { fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
                trapContainer.add([body, text]);
            }
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

    private onTrapWarning({ trapId, type, remaining, nodeId }: { trapId: string; type: string; remaining: number, nodeId?: string }) {
        const data = this.trapVisuals.get(trapId);
        if (!data) return;

        if (data.type === 'EARTHQUAKE' && data.warningIndicator) {
            // Flash red warning
            this.scene.tweens.add({
                targets: data.warningIndicator,
                scale: 1.2, // Added scale to the warning indicator
                strokeColor: { from: 0xFFAA00, to: 0xFF0000 },
                duration: 100,
                yoyo: true,
                repeat: 3
            });
        } else if (data.type === 'SPIDER') {
            // Determine warning position: use provided nodeId or fallback to spider image/default
            let x = data.graphics.x;
            let y = data.graphics.y - 120; // Default offset

            if (nodeId && this.nodePositions.has(nodeId)) {
                const pos = this.nodePositions.get(nodeId)!;
                x = pos.x;
                y = pos.y - 80; // Adjusted offset for spider warning
            } else {
                const spiderImage = data.graphics.getData('spiderImage') as Phaser.GameObjects.Image;
                if (spiderImage) {
                    x = spiderImage.x;
                    y = spiderImage.y - 80;
                }
            }

            // Let's create a temporary warning text if not exists
            if (!data.warningIndicator) {
                const text = this.scene.add.text(x, y, "!", {
                    fontSize: '80px',
                    fontStyle: 'bold',
                    color: '#ff0000',
                    stroke: '#ffffff',
                    strokeThickness: 6
                }).setOrigin(0.5);
                text.setDepth(1001); // Above spider
                data.warningIndicator = text as any;
            } else {
                // Update position of existing indicator
                (data.warningIndicator as any).setPosition(x, y);
            }

            if (data.warningIndicator) {
                // Ensure visible
                (data.warningIndicator as any).setVisible(true);
                this.scene.tweens.add({
                    targets: data.warningIndicator,
                    scale: 1.5,
                    alpha: { from: 1, to: 0.5 },
                    duration: 300,
                    yoyo: true,
                    repeat: -1
                });
            }
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
            // Remove warning if exists
            if (data.warningIndicator) {
                (data.warningIndicator as any).setVisible(false);
            }

            // Get new position from nodeId (for relocating spiders)
            const spiderImage = data.graphics.getData('spiderImage') as Phaser.GameObjects.Image;
            if (spiderImage && nodeId) {
                const newPos = this.nodePositions.get(nodeId);
                if (newPos) {
                    spiderImage.x = newPos.x;
                    spiderImage.y = newPos.y;
                }
            }

            // Spider APPEARS
            if (spiderImage) {
                spiderImage.setVisible(true);
                spiderImage.setAlpha(1);
                spiderImage.setScale(0.02); // Start tiny

                // Scale up animation to final size (100px / 512 = ~0.2)
                const finalScale = 100 / 512;
                this.scene.tweens.add({
                    targets: spiderImage,
                    scaleX: finalScale,
                    scaleY: finalScale,
                    ease: 'Back.out',
                    duration: 500
                });
            } else {
                // Fallback for container-based spider
                data.graphics.setVisible(true);
                data.graphics.setAlpha(1);
                data.graphics.setScale(0.1);

                this.scene.tweens.add({
                    targets: data.graphics,
                    scaleX: 1,
                    scaleY: 1,
                    ease: 'Back.out',
                });
            }
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

        if (type === 'SPIDER') {
            // Spider HIDES - get the actual spider image
            const spiderImage = data.graphics.getData('spiderImage') as Phaser.GameObjects.Image;
            if (spiderImage) {
                this.scene.tweens.add({
                    targets: spiderImage,
                    scaleX: 0,
                    scaleY: 0,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        spiderImage.setVisible(false);
                    }
                });
            } else {
                // Fallback for container-based spider
                this.scene.tweens.add({
                    targets: data.graphics,
                    scaleX: 0,
                    scaleY: 0,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        data.graphics.setVisible(false);
                    }
                });
            }
        } else if (type === 'COLLAPSING_HOLE') {
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
