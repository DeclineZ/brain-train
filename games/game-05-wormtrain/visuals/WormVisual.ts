import Phaser from 'phaser';
import GameScene from '../GameScene';
import { WormSystem, WormState, WormEntity } from '../systems/WormSystem';
import { WormGameConstants as WormGameConfig } from '../config';
import { Point } from '../types/level';

// Number of body segments per worm (increased for longer tail)
const SEGMENT_COUNT = 8;
// Distance between segments (in pixels, increased for longer tail)
const SEGMENT_SPACING = 16;
// How many position samples to keep in history
const HISTORY_SIZE = 80;

interface WormVisualData {
    id: string;
    segments: (Phaser.GameObjects.Arc | Phaser.GameObjects.Image)[]; // Head is Image, Body is Arc
    positionHistory: Point[]; // History of head positions for body to follow
    wiggleOffset: number; // Current wiggle phase
    color: number;
    state: WormState;

    shakeTween?: Phaser.Tweens.Tween;
    maskGraphic?: Phaser.GameObjects.Graphics; // Mask for sprite head
    headBorder?: Phaser.GameObjects.Arc; // White border for head
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

        const segments: (Phaser.GameObjects.Arc | Phaser.GameObjects.Image)[] = [];
        const bodySegments: Phaser.GameObjects.Arc[] = [];

        // 1. Create Body Segments FIRST (so they are visually behind the head)
        for (let i = 0; i < SEGMENT_COUNT - 1; i++) {
            const bodyPart = this.scene.add.circle(0, 0, bodyRadius - i * 0.5 * sizeMultiplier, colorInt);
            bodyPart.setAlpha(0.9 - i * 0.1);
            this.container.add(bodyPart);
            bodySegments.push(bodyPart);
        }

        // 2. Create Head Sprite LAST (so it renders on top)
        const headKey = worm.config.size === 'S' ? 'worm_head_s' : 'worm_head_m';
        const head = this.scene.add.image(0, 0, headKey);
        head.setTint(colorInt);

        if (this.scene.textures.exists(headKey)) {
            const targetSize = headRadius * 2.8;
            head.setDisplaySize(targetSize, targetSize);
        } else {
            head.setScale(0.5);
        }

        // 3. Apply Circular Mask to remove square background
        const maskGraphic = this.scene.make.graphics({});
        maskGraphic.fillStyle(0xffffff);
        maskGraphic.fillCircle(0, 0, headRadius * 1.2); // Slightly larger mask to fit the sprite content
        const mask = maskGraphic.createGeometryMask();
        head.setMask(mask);

        // 3.5 Create White Border (Stroke)
        const headBorder = this.scene.add.circle(0, 0, headRadius * 1.2, 0x000000, 0); // Transparent fill, match mask radius
        headBorder.setStrokeStyle(3, 0xffffff); // 3px white stroke

        this.container.add(head);
        this.container.add(headBorder); // Add border on top of head

        // 4. assemble segments array [Head, ...Body]
        segments.push(head);
        segments.push(...bodySegments);

        // Initialize visual data
        const visualData: WormVisualData = {
            id: worm.id,
            segments,
            positionHistory: [],
            wiggleOffset: Math.random() * Math.PI * 2,
            color: colorInt,
            state: worm.state,
            maskGraphic: maskGraphic,
            headBorder: headBorder
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

            // Also shrink border
            if (newState === 'DEAD' && data.headBorder) {
                this.scene.tweens.add({
                    targets: data.headBorder,
                    scaleX: 0,
                    scaleY: 0,
                    alpha: 0,
                    duration: 400
                });
            }
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

            // Arrive tween for border
            if (data.headBorder) {
                this.scene.tweens.add({
                    targets: data.headBorder,
                    scaleX: 1.3,
                    scaleY: 1.3,
                    duration: 150,
                    yoyo: true,
                    onComplete: () => {
                        if (data.headBorder) {
                            this.scene.tweens.add({
                                targets: data.headBorder,
                                scaleX: 0,
                                scaleY: 0,
                                y: data.headBorder.y + 15,
                                duration: 300
                            });
                        }
                    }
                });
            }

        } else if (newState === 'JAMMED') {
            // Shake effect on head only
            const head = data.segments[0];
            const targets: any[] = [head];
            if (data.headBorder) targets.push(data.headBorder);

            data.shakeTween = this.scene.tweens.add({
                targets: targets,
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
        if (data.maskGraphic) {
            data.maskGraphic.destroy();
        }
        if (data.headBorder) {
            data.headBorder.destroy();
        }
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
            const head = data.segments[0] as Phaser.GameObjects.Image; // Cast to Image
            head.x = headPos.x;
            head.y = headPos.y;

            // Move mask with head
            if (data.maskGraphic) {
                // GeometryMask works in world space usually, but since container is at 0,0, head.x/y works
                data.maskGraphic.setPosition(headPos.x, headPos.y);
            }

            // Move border with head
            if (data.headBorder) {
                data.headBorder.x = headPos.x;
                data.headBorder.y = headPos.y;
            }

            // Rotate head to face movement direction
            if (data.positionHistory.length >= 2) {
                const pCurrent = data.positionHistory[0];
                const pPrev = data.positionHistory[1];
                // Check if moved enough to calculate angle (prevent jitter)
                const distSq = (pCurrent.x - pPrev.x) ** 2 + (pCurrent.y - pPrev.y) ** 2;
                if (distSq > 1) {
                    const angle = Math.atan2(pCurrent.y - pPrev.y, pCurrent.x - pPrev.x);
                    head.setRotation(angle);

                    // Flip Y logic if upside down? No, rotation handles full 360.
                    // But if sprite is "facing right" by default, then 0 deg is right. 
                    // Math.atan2(0,1) = 0. Correct.

                    // If moving left (-x), atan2 is PI. Sprite rotates 180. Upside down?
                    // Yes, standard 2D rotation. If we want to avoid "upside down eyes", we would need flipY logic.
                    // But for top-down worms, rotating is usually fine.
                }
            }

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
