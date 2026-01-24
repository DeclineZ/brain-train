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
    private activeTutorialJunctions: Set<string> = new Set();
    private tutorialHintElements: Map<string, Phaser.GameObjects.GameObject[]> = new Map();

    // Colors matching the reference game
    private readonly BG_COLOR = 0x4ade80;        // Light green background
    private readonly BORDER_COLOR = 0x166534;    // Dark green border
    private readonly TRACK_COLOR = 0x15803d;     // Track line color (medium green)

    constructor(scene: GameScene) {
        this.scene = scene;
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(WormGameConfig.DEPTH.JUNCTION_UI);

        this.scene.events.on('JUNCTION_SWITCHED', this.onSwitch, this);
        this.scene.events.on('SHOW_TUTORIAL_HINT', this.onShowTutorialHint, this);
        this.scene.events.on('HIDE_TUTORIAL_HINT', this.onHideTutorialHint, this);
    }

    public init(levelData: any) {
        // Clear old
        this.container.removeAll(true);
        this.indicators.clear();
        this.junctionOutEdges.clear();
        this.activeTutorialJunctions.clear(); // Reset tutorial state

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
                // TUTORIAL RESTRICTION: Only allow click if highlighted
                const currentLevel = this.scene.registry.get('level') ?? 1;
                if (currentLevel === 0) {
                    if (!this.activeTutorialJunctions.has(j.id)) return;
                }

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

    // --- TUTORIAL VISUALS ---
    private onShowTutorialHint({ junctionId }: { junctionId: string }) {
        this.activeTutorialJunctions.add(junctionId); // Mark as active

        const indicator = this.indicators.get(junctionId);
        if (!indicator) return;

        const elements: Phaser.GameObjects.GameObject[] = [];
        const container = indicator.container;
        const junctionX = container.x;
        const junctionY = container.y;

        // 1. Create Pulsing Ring around the button
        const ring = this.scene.add.circle(junctionX, junctionY, 50, 0x000000, 0);
        ring.setStrokeStyle(4, 0xFFD700); // Yellow/gold ring
        ring.setDepth(WormGameConfig.DEPTH.JUNCTION_UI + 5);
        elements.push(ring);

        // Animate ring pulsing
        this.scene.tweens.add({
            targets: ring,
            scale: { from: 1, to: 1.3 },
            alpha: { from: 1, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            key: 'tutorial-ring-pulse-' + junctionId
        });

        // 2. Create Arrow Line pointing to the button (from right side)
        const arrowGraphics = this.scene.add.graphics();
        arrowGraphics.setDepth(WormGameConfig.DEPTH.JUNCTION_UI + 4);
        elements.push(arrowGraphics);

        const arrowEndX = junctionX + 65;
        const arrowStartX = junctionX + 140;
        const arrowY = junctionY;

        // Draw arrow line
        arrowGraphics.lineStyle(4, 0xFFD700, 1);
        arrowGraphics.beginPath();
        arrowGraphics.moveTo(arrowStartX, arrowY);
        arrowGraphics.lineTo(arrowEndX, arrowY);
        arrowGraphics.strokePath();

        // Draw arrow head (pointing left)
        arrowGraphics.fillStyle(0xFFD700, 1);
        arrowGraphics.beginPath();
        arrowGraphics.moveTo(arrowEndX, arrowY);
        arrowGraphics.lineTo(arrowEndX + 12, arrowY - 8);
        arrowGraphics.lineTo(arrowEndX + 12, arrowY + 8);
        arrowGraphics.closePath();
        arrowGraphics.fillPath();

        // 3. Create Text Label "กดเพื่อเปลี่ยนทาง"
        const hintText = this.scene.add.text(arrowStartX + 10, arrowY, 'กดเพื่อเปลี่ยนทาง', {
            fontSize: '22px',
            color: '#FFD700',
            fontFamily: 'Noto Sans Thai, Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5,
            padding: { x: 8, y: 6 },
            align: 'left'
        });
        hintText.setOrigin(0, 0.5);
        hintText.setDepth(WormGameConfig.DEPTH.JUNCTION_UI + 5);
        elements.push(hintText);

        // Store elements for cleanup
        this.tutorialHintElements.set(junctionId, elements);

        // Visual Highlight: Pulse / Scale Up the button itself
        this.scene.tweens.add({
            targets: indicator.container,
            scale: 1.15,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            key: 'tutorial-pulse-' + junctionId // Unique key to stop later
        });
    }

    private onHideTutorialHint({ junctionId }: { junctionId: string }) {
        this.activeTutorialJunctions.delete(junctionId); // Mark as inactive

        const indicator = this.indicators.get(junctionId);
        if (!indicator) return;

        // Stop Pulse animation on button
        this.scene.tweens.killTweensOf(indicator.container);

        // Cleanup tutorial hint elements (ring, arrow, text)
        const elements = this.tutorialHintElements.get(junctionId);
        if (elements) {
            elements.forEach(el => {
                this.scene.tweens.killTweensOf(el);
                el.destroy();
            });
            this.tutorialHintElements.delete(junctionId);
        }

        // Reset Scale
        this.scene.tweens.add({
            targets: indicator.container,
            scale: 1,
            duration: 200,
            ease: 'Back.out'
        });
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

        // Draw simple, clear arrow from center-ish to edge
        const radius = 20;

        // Shaft (Line)
        graphics.beginPath();
        // Start slightly opposite to the target direction to give the arrow some length
        const backX = Math.cos(exitAngle + Math.PI) * 5;
        const backY = Math.sin(exitAngle + Math.PI) * 5;

        // End point for the shaft (slightly before the tip to leave room for head)
        const shaftEndX = Math.cos(exitAngle) * (radius - 5);
        const shaftEndY = Math.sin(exitAngle) * (radius - 5);

        graphics.moveTo(backX, backY);
        graphics.lineTo(shaftEndX, shaftEndY);
        graphics.strokePath();

        // Arrowhead (Filled Triangle)
        const tipX = Math.cos(exitAngle) * radius;
        const tipY = Math.sin(exitAngle) * radius;

        // Base of the triangle
        const baseCenterDist = radius - 8;
        const baseX = Math.cos(exitAngle) * baseCenterDist;
        const baseY = Math.sin(exitAngle) * baseCenterDist;

        // Perpendicular vector for width
        const perpX = Math.cos(exitAngle + Math.PI / 2);
        const perpY = Math.sin(exitAngle + Math.PI / 2);

        const corner1X = baseX + perpX * 8;
        const corner1Y = baseY + perpY * 8;
        const corner2X = baseX - perpX * 8;
        const corner2Y = baseY - perpY * 8;

        graphics.fillStyle(this.TRACK_COLOR);
        graphics.beginPath();
        graphics.moveTo(tipX, tipY);
        graphics.lineTo(corner1X, corner1Y);
        graphics.lineTo(corner2X, corner2Y);
        graphics.closePath();
        graphics.fillPath();

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
