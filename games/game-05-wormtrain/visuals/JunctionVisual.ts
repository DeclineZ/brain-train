import Phaser from 'phaser';
import GameScene from '../GameScene';
import { WormGameConstants as WormGameConfig } from '../config';

interface JunctionIndicator {
    container: Phaser.GameObjects.Container;
    bgCircle: Phaser.GameObjects.Arc;
    borderCircle: Phaser.GameObjects.Arc;
    trackGraphics: Phaser.GameObjects.Graphics;
}

export class JunctionVisual {
    private scene: GameScene;
    private container: Phaser.GameObjects.Container;
    private indicators: Map<string, JunctionIndicator> = new Map();
    // Cache junction outEdges from level config
    private junctionOutEdges: Map<string, string[]> = new Map();

    // Colors matching the reference game
    private readonly BG_COLOR = 0x4ade80;        // Light green background
    private readonly BORDER_COLOR = 0x166534;    // Dark green border
    private readonly TRACK_COLOR = 0x15803d;     // Track line color (medium green)

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
        this.junctionOutEdges.clear();

        levelData.junctions.forEach((j: any) => {
            const node = levelData.nodes.find((n: any) => n.id === j.id);
            if (!node) return;

            // Skip junctions with only 1 outEdge - no choice to make
            if (!j.outEdges || j.outEdges.length <= 1) return;

            // Cache the outEdges
            this.junctionOutEdges.set(j.id, j.outEdges);

            // Create circular button at junction center
            const btnContainer = this.scene.add.container(node.x, node.y);

            // Border circle (dark green outline)
            const borderCircle = this.scene.add.circle(0, 0, 30, this.BORDER_COLOR);

            // Background circle (light green fill)
            const bgCircle = this.scene.add.circle(0, 0, 26, this.BG_COLOR);

            // Track graphics - will show the curved/straight path inside
            const trackGraphics = this.scene.add.graphics();

            btnContainer.add([borderCircle, bgCircle, trackGraphics]);

            // Hit area for clicking
            const hitArea = this.scene.add.circle(0, 0, 32, 0x000000, 0);
            hitArea.setInteractive({ useHandCursor: true });
            hitArea.on('pointerdown', () => {
                this.scene.switchSystem.switchJunction(j.id);
            });
            btnContainer.add(hitArea);

            this.container.add(btnContainer);

            const indicator: JunctionIndicator = {
                container: btnContainer,
                bgCircle,
                borderCircle,
                trackGraphics
            };

            this.indicators.set(j.id, indicator);

            // Draw initial track shape
            this.updateTrackShape(j.id, j.defaultIndex, j.outEdges, levelData.edges, node);
        });
    }

    private onSwitch({ junctionId, nextIndex }: { junctionId: string; nextIndex: number; source: string }) {
        const outEdges = this.junctionOutEdges.get(junctionId) || [];
        const junctionNode = this.scene.graphSystem.getNode(junctionId);

        if (junctionNode) {
            const edgesData = outEdges.map(edgeId => this.scene.graphSystem.getEdge(edgeId)).filter(e => e);
            this.updateTrackShape(junctionId, nextIndex, outEdges, edgesData, junctionNode);
        }
    }

    private updateTrackShape(
        jId: string,
        activeIndex: number,
        outEdgeIds: string[],
        edges: any[],
        junctionNode: any
    ) {
        const indicator = this.indicators.get(jId);
        if (!indicator) return;

        const graphics = indicator.trackGraphics;
        graphics.clear();

        // Find the active edge
        const activeEdgeId = outEdgeIds[activeIndex];
        const activeEdge = edges.find((e: any) => e && e.id === activeEdgeId);

        if (!activeEdge) return;

        const jx = junctionNode.x;
        const jy = junctionNode.y;

        // Calculate direction from junction to next point
        let targetX = activeEdge.path[1]?.x ?? activeEdge.path[0].x;
        let targetY = activeEdge.path[1]?.y ?? activeEdge.path[0].y;

        if (Math.abs(activeEdge.path[0].x - jx) < 5 && Math.abs(activeEdge.path[0].y - jy) < 5) {
            targetX = activeEdge.path[1]?.x ?? activeEdge.path[0].x;
            targetY = activeEdge.path[1]?.y ?? activeEdge.path[0].y;
        } else {
            targetX = activeEdge.path[0].x;
            targetY = activeEdge.path[0].y;
        }

        const exitAngle = Math.atan2(targetY - jy, targetX - jx);

        // Determine if this is a curved or straight junction
        // by checking if exit direction differs significantly from entry
        // For simplicity, we'll just draw a curved track shape inside the circle

        // Draw track shape inside the button (like the reference game)
        graphics.lineStyle(8, this.TRACK_COLOR, 1);

        // Draw curved track shape
        // The shape shows: entry from one side, curved exit to another side
        const radius = 18;

        // Draw a curved arc showing the active direction
        // Entry assumed from top (or we could calculate from previous edge)
        const entryAngle = exitAngle + Math.PI; // Opposite of exit

        // Draw curved track from entry to exit
        graphics.beginPath();

        // Start from entry side
        const startX = Math.cos(entryAngle) * 10;
        const startY = Math.sin(entryAngle) * 10;

        // End at exit side
        const endX = Math.cos(exitAngle) * radius;
        const endY = Math.sin(exitAngle) * radius;

        // Draw curved path using quadratic curve
        graphics.moveTo(startX, startY);

        // Control point for curve (perpendicular to midpoint)
        const midAngle = (entryAngle + exitAngle) / 2;
        const curveFactor = 0.3;
        const ctrlX = Math.cos(midAngle) * radius * curveFactor;
        const ctrlY = Math.sin(midAngle) * radius * curveFactor;

        // Draw as simple line for now - can enhance with bezier later
        graphics.lineTo(0, 0); // Center
        graphics.lineTo(endX, endY);
        graphics.strokePath();

        // Add arrowhead at exit
        const arrowSize = 6;
        const arrowAngle1 = exitAngle + Math.PI - 0.5;
        const arrowAngle2 = exitAngle + Math.PI + 0.5;

        graphics.beginPath();
        graphics.moveTo(endX, endY);
        graphics.lineTo(
            endX + Math.cos(arrowAngle1) * arrowSize,
            endY + Math.sin(arrowAngle1) * arrowSize
        );
        graphics.strokePath();

        graphics.beginPath();
        graphics.moveTo(endX, endY);
        graphics.lineTo(
            endX + Math.cos(arrowAngle2) * arrowSize,
            endY + Math.sin(arrowAngle2) * arrowSize
        );
        graphics.strokePath();

        // Animate button press
        this.scene.tweens.add({
            targets: indicator.container,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 80,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
    }
}
