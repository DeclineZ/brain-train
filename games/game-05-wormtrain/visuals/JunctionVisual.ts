import Phaser from 'phaser';
import GameScene from '../GameScene';
import { WormGameConstants as WormGameConfig } from '../config';

export class JunctionVisual {
    private scene: GameScene;
    private container: Phaser.GameObjects.Container;
    private indicators: Map<string, Phaser.GameObjects.Image | Phaser.GameObjects.Shape> = new Map();

    constructor(scene: GameScene) {
        this.scene = scene;
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(WormGameConfig.DEPTH.JUNCTION_UI);

        this.scene.events.on('JUNCTION_SWITCHED', this.onSwitch, this);
    }

    public init(levelData: any) {
        // Clear old
        this.container.removeAll(true);
        this.indicators.clear();

        levelData.junctions.forEach((j: any) => {
            const node = levelData.nodes.find((n: any) => n.id === j.id);
            if (!node) return;

            // Hit Area (Invisible interactive circle)
            const hitArea = this.scene.add.circle(node.x, node.y, 30, 0x000000, 0.0);
            hitArea.setInteractive({ useHandCursor: true });
            hitArea.on('pointerdown', () => {
                this.scene.switchSystem.switchJunction(j.id);
            });
            this.container.add(hitArea);

            // Indicator (Arrow or Line showing direction)
            // For MVP: A Line stick that rotates
            const stick = this.scene.add.rectangle(node.x, node.y, 40, 6, 0xffffff);
            stick.setOrigin(0.5, 0.5); // Pivot center
            this.container.add(stick);
            this.indicators.set(j.id, stick);

            // Initial rotation
            this.updateVisualRotation(j.id, j.defaultIndex, j.outEdges);
        });
    }

    private onSwitch({ junctionId, nextIndex }: { junctionId: string; nextIndex: number; source: string }) {
        // Fetch OutEdge geometry to calculate rotation angle
        const outEdges = this.scene.graphSystem.getOutEdges(junctionId);
        this.updateVisualRotation(junctionId, nextIndex, outEdges);
    }

    private updateVisualRotation(jId: string, index: number, outEdgeIds: string[]) {
        const stick = this.indicators.get(jId);
        if (!stick) return;

        const edgeId = outEdgeIds[index];
        const edge = this.scene.graphSystem.getEdge(edgeId);

        if (edge && edge.path.length >= 2) {
            // Angle from P0 to P1
            const p0 = edge.path[0];
            const p1 = edge.path[1]; // Direction vector
            const angle = Phaser.Math.Angle.Between(p0.x, p0.y, p1.x, p1.y);

            this.scene.tweens.add({
                targets: stick,
                rotation: angle,
                duration: 200,
                ease: 'Back.easeOut'
            });
        }
    }
}
