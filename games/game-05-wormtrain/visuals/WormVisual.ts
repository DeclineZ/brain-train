import Phaser from 'phaser';
import GameScene from '../GameScene';
import { WormSystem, WormState, WormEntity } from '../systems/WormSystem';
import { WormGameConstants as WormGameConfig } from '../config';
import { Point } from '../types/level';

// Number of body segments per worm
const SEGMENT_COUNT = 5;
// Distance between segments (in pixels)
const SEGMENT_SPACING = 12;
// How many position samples to keep in history
const HISTORY_SIZE = 60;

interface WormVisualData {
    id: string;
    segments: Phaser.GameObjects.Arc[]; // Head + Body segments as circles (placeholder for sprites)
    positionHistory: Point[]; // History of head positions for body to follow
    wiggleOffset: number; // Current wiggle phase
    color: number;
    state: WormState;
    shakeTween?: Phaser.Tweens.Tween;
}

export class WormVisual {
    private scene: GameScene;
    private wormSystem: WormSystem;
    private container: Phaser.GameObjects.Container;
    private visualDataMap: Map<string, WormVisualData> = new Map();

    constructor(scene: GameScene, wormSystem: WormSystem) {
        this.scene = scene;
        this.wormSystem = wormSystem;
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(WormGameConfig.DEPTH.WORM);

        // Subscribe to events
        this.scene.events.on('WORM_SPAWN', this.onSpawn, this);
        this.scene.events.on('WORM_STATE_CHANGE', this.onStateChange, this);
    }

    private onSpawn({ worm }: { worm: WormEntity }) {
        const colorInt = parseInt(worm.config.color.replace('#', '0x'));

        // Size multipliers: S=smaller, M=normal
        const sizeMultiplier = worm.config.size === 'S' ? 0.5 : 1.0;
        const headRadius = WormGameConfig.WORM_HEAD_RADIUS * sizeMultiplier;
        const bodyRadius = WormGameConfig.WORM_BODY_RADIUS * sizeMultiplier;

        const segments: Phaser.GameObjects.Arc[] = [];

        // Create Head (larger, with eyes placeholder)
        const head = this.scene.add.circle(0, 0, headRadius, colorInt);
        head.setStrokeStyle(2, 0xffffff);
        this.container.add(head);
        segments.push(head);

        // Create Body Segments (smaller, slightly transparent)
        for (let i = 0; i < SEGMENT_COUNT - 1; i++) {
            const bodyPart = this.scene.add.circle(0, 0, bodyRadius - i * 0.5 * sizeMultiplier, colorInt);
            bodyPart.setAlpha(0.9 - i * 0.1);
            this.container.add(bodyPart);
            segments.push(bodyPart);
        }

        // Initialize visual data
        const visualData: WormVisualData = {
            id: worm.id,
            segments,
            positionHistory: [],
            wiggleOffset: Math.random() * Math.PI * 2, // Random start phase
            color: colorInt,
            state: worm.state
        };

        this.visualDataMap.set(worm.id, visualData);
    }

    private onStateChange({ wormId, newState }: { wormId: string; newState: WormState }) {
        const data = this.visualDataMap.get(wormId);
        if (!data) return;

        data.state = newState;

        // Stop any existing shake tween
        if (data.shakeTween) {
            data.shakeTween.stop();
            data.shakeTween = undefined;
        }

        if (newState === 'DEAD') {
            // Shrink and fade all segments
            data.segments.forEach((seg, i) => {
                this.scene.tweens.add({
                    targets: seg,
                    scaleX: 0,
                    scaleY: 0,
                    alpha: 0,
                    duration: 400,
                    delay: i * 50, // Stagger effect
                    onComplete: () => {
                        if (i === data.segments.length - 1) {
                            this.destroyWormVisual(wormId);
                        }
                    }
                });
            });
        } else if (newState === 'ARRIVED') {
            // Victory bounce + sink into hole
            data.segments.forEach((seg, i) => {
                this.scene.tweens.add({
                    targets: seg,
                    scaleX: 1.3,
                    scaleY: 1.3,
                    duration: 150,
                    yoyo: true,
                    onComplete: () => {
                        this.scene.tweens.add({
                            targets: seg,
                            scaleX: 0,
                            scaleY: 0,
                            y: seg.y + 15,
                            duration: 300,
                            delay: i * 30,
                            onComplete: () => {
                                if (i === data.segments.length - 1) {
                                    this.destroyWormVisual(wormId);
                                }
                            }
                        });
                    }
                });
            });
        } else if (newState === 'JAMMED') {
            // Shake effect on head only
            const head = data.segments[0];
            data.shakeTween = this.scene.tweens.add({
                targets: head,
                x: { from: head.x - 3, to: head.x + 3 },
                duration: 50,
                yoyo: true,
                repeat: -1
            });
        } else if (newState === 'MOVING') {
            // Reset scale if coming from JAMMED
            data.segments.forEach(seg => {
                seg.setScale(1);
            });
        }
    }

    private destroyWormVisual(wormId: string) {
        const data = this.visualDataMap.get(wormId);
        if (!data) return;

        data.segments.forEach(seg => seg.destroy());
        this.visualDataMap.delete(wormId);
    }

    public update(time: number, delta: number) {
        const worms = this.wormSystem.getWorms();

        worms.forEach(worm => {
            const data = this.visualDataMap.get(worm.id);
            if (!data) return;
            if (worm.state === 'DEAD' || worm.state === 'ARRIVED') return;

            // 1. Calculate Head Position from Graph
            const headPos = this.getWormPosition(worm);
            if (!headPos) return;

            // 2. Update Position History
            data.positionHistory.unshift({ x: headPos.x, y: headPos.y });
            if (data.positionHistory.length > HISTORY_SIZE) {
                data.positionHistory.pop();
            }

            // 3. Update Wiggle Phase (continuous sine wave)
            data.wiggleOffset += (delta / 1000) * 8; // Speed of wiggle

            // 4. Position Head
            const head = data.segments[0];
            head.x = headPos.x;
            head.y = headPos.y;

            // 5. Position Body Segments (follow history with wiggle)
            for (let i = 1; i < data.segments.length; i++) {
                const segment = data.segments[i];
                const historyIndex = Math.min(i * 4, data.positionHistory.length - 1);
                const historyPos = data.positionHistory[historyIndex] || headPos;

                // Calculate direction for perpendicular wiggle
                const nextHistoryIndex = Math.min(historyIndex + 2, data.positionHistory.length - 1);
                const nextPos = data.positionHistory[nextHistoryIndex] || historyPos;

                const dx = nextPos.x - historyPos.x;
                const dy = nextPos.y - historyPos.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;

                // Perpendicular direction
                const perpX = -dy / len;
                const perpY = dx / len;

                // Sine wave offset (wiggle)
                const wiggleAmp = 3 - i * 0.3; // Decreasing amplitude toward tail
                const wigglePhase = data.wiggleOffset + i * 0.8;
                const wiggle = Math.sin(wigglePhase) * wiggleAmp;

                segment.x = historyPos.x + perpX * wiggle;
                segment.y = historyPos.y + perpY * wiggle;
            }
        });
    }

    private getWormPosition(worm: WormEntity): Point | null {
        const edge = this.scene.graphSystem.getEdge(worm.currentEdgeId);
        if (!edge || !edge.path || edge.path.length === 0) return null;

        // Interpolate along polyline
        let accumulatedDist = 0;
        for (let i = 0; i < edge.path.length - 1; i++) {
            const p0 = edge.path[i];
            const p1 = edge.path[i + 1];
            const segDx = p1.x - p0.x;
            const segDy = p1.y - p0.y;
            const segLen = Math.sqrt(segDx * segDx + segDy * segDy);

            if (accumulatedDist + segLen >= worm.distanceOnEdge) {
                const t = (worm.distanceOnEdge - accumulatedDist) / segLen;
                return {
                    x: p0.x + segDx * t,
                    y: p0.y + segDy * t
                };
            }
            accumulatedDist += segLen;
        }

        // Past end of edge, return last point
        return edge.path[edge.path.length - 1];
    }
}
