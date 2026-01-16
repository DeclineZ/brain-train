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
    segments: (Phaser.GameObjects.Arc | Phaser.GameObjects.Image | Phaser.GameObjects.Container)[]; // Updated type
    positionHistory: Point[];
    wiggleOffset: number;
    color: number;
    state: WormState;

    shakeTween?: Phaser.Tweens.Tween;
    maskGraphic?: Phaser.GameObjects.Graphics;
    headBorder?: Phaser.GameObjects.Arc;
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

        const segments: (Phaser.GameObjects.Arc | Phaser.GameObjects.Image | Phaser.GameObjects.Container)[] = [];
        const bodySegments: Phaser.GameObjects.Arc[] = [];

        // 1. Create Body Segments FIRST (so they are visually behind the head)
        for (let i = 0; i < SEGMENT_COUNT - 1; i++) {
            const bodyPart = this.scene.add.circle(0, 0, bodyRadius - i * 0.5 * sizeMultiplier, colorInt);
            bodyPart.setAlpha(0.9 - i * 0.1);
            this.container.add(bodyPart);
            bodySegments.push(bodyPart);
        }

        // 2. Create Head Container (holds sprite, mask, border)
        const headContainer = this.scene.add.container(0, 0);

        // 2. Create Procedural Head (Face + Eyes)
        // 2a. Head Base (Color)
        const headBase = this.scene.add.circle(0, 0, headRadius, colorInt);

        // 2b. Eyes (Procedural)
        const eyeOffset = headRadius * 0.35;
        const eyeSize = headRadius * 0.35;
        const pupilSize = eyeSize * 0.5;

        // Left Eye
        const leftEye = this.scene.add.circle(-eyeOffset, -eyeOffset * 0.5, eyeSize, 0xffffff);
        const leftPupil = this.scene.add.circle(-eyeOffset, -eyeOffset * 0.5, pupilSize, 0x000000);

        // Right Eye
        const rightEye = this.scene.add.circle(eyeOffset, -eyeOffset * 0.5, eyeSize, 0xffffff);
        const rightPupil = this.scene.add.circle(eyeOffset, -eyeOffset * 0.5, pupilSize, 0x000000);

        // 2c. Border
        const headBorder = this.scene.add.circle(0, 0, headRadius, 0x000000, 0);
        headBorder.setStrokeStyle(3, 0xffffff);

        // Add to Head Container
        headContainer.add([headBase, leftEye, leftPupil, rightEye, rightPupil, headBorder]);

        // Add Head Container to Main Container
        this.container.add(headContainer);

        // 4. assemble segments array [HeadContainer, ...Body]
        segments.push(headContainer); // Treat container as the "head segment"
        segments.push(...bodySegments);

        // Initialize visual data
        const visualData: WormVisualData = {
            id: worm.id,
            segments,
            positionHistory: [],
            wiggleOffset: Math.random() * Math.PI * 2,
            color: colorInt,
            state: worm.state,
            headBorder
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

            // 2. Update Position History (Only if moved or first update)
            // Fixes "No tail" issue when paused: only push if position changed significantly
            const lastPos = data.positionHistory[0];
            const hasMoved = !lastPos || (Math.abs(lastPos.x - headPos.x) > 0.1 || Math.abs(lastPos.y - headPos.y) > 0.1);

            if (hasMoved) {
                // Unshift new position (limited by spacing / speed)
                data.positionHistory.unshift({ x: headPos.x, y: headPos.y });
                if (data.positionHistory.length > HISTORY_SIZE) {
                    data.positionHistory.pop();
                }
            }

            // 3. Update Wiggle Phase (continuous sine wave)
            // Only wiggle if moving
            if (worm.state === 'MOVING' || worm.state === 'NEAR_TRAP') {
                data.wiggleOffset += delta * 0.01;
            }

            const wiggleX = Math.cos(data.wiggleOffset) * 2; // Amplitude 2px
            const wiggleY = Math.sin(data.wiggleOffset) * 2;

            // 4. Update Head Container (Sprite, Mask, Border all move together)
            const headContainer = data.segments[0] as Phaser.GameObjects.Container;
            const finalHeadX = headPos.x + wiggleX;
            const finalHeadY = headPos.y + wiggleY;

            headContainer.setPosition(finalHeadX, finalHeadY);

            // Border and Eyes are inside container, move automatically.

            // 5. Update Body Segments
            const bodySegments = data.segments.slice(1);
            bodySegments.forEach((seg, i) => {
                // Calculate which history index corresponds to this segment
                const segmentIndex = i + 1;
                // We need to find a point in history roughly (segmentIndex * SEGMENT_SPACING) pixels behind
                // Simple approx: assume each history point is ~1 frame of movement. 
                // Better: Iterate history to find cumulative distance.
                // For now, use fixed index spacing assuming constant speed (simplified)

                // If paused, history isn't growing, so segments stay relative to head in history
                const indexStep = Math.max(1, Math.floor(150 / (worm.speed || 50))); // Dynamic spacing based on speed
                const historyIndex = segmentIndex * indexStep;

                if (historyIndex < data.positionHistory.length) {
                    const pos = data.positionHistory[historyIndex];
                    seg.setPosition(pos.x, pos.y);
                    const historyPos = data.positionHistory[historyIndex];

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

                    seg.x = historyPos.x + perpX * wiggle;
                    seg.y = historyPos.y + perpY * wiggle;
                    seg.setVisible(true);
                } else {
                    // Not enough history yet (just spawned), hide tail
                    seg.setVisible(false);
                }
            });

            // 6. Rotate Head to face movement
            if (data.positionHistory.length >= 2) {
                // Look a bit back in history to get smooth angle
                const pCurrent = data.positionHistory[0];
                const pPrev = data.positionHistory[Math.min(4, data.positionHistory.length - 1)];

                if (pCurrent && pPrev && (Math.abs(pCurrent.x - pPrev.x) > 1 || Math.abs(pCurrent.y - pPrev.y) > 1)) {
                    const angle = Math.atan2(pCurrent.y - pPrev.y, pCurrent.x - pPrev.x);
                    headContainer.setRotation(angle);
                }
            }
        });
    }

    private getWormPosition(worm: WormEntity): Point | null {
        const edge = this.scene.graphSystem.getEdge(worm.currentEdgeId);
        if (!edge || !edge.path || edge.path.length === 0) return null;

        const path = edge.path;

        // Interpolate along polyline
        let accumulatedDist = 0;
        for (let i = 0; i < (path.length - 1); i++) {
            const p0 = path[i];
            const p1 = path[i + 1];
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
        return path[path.length - 1];
    }
}
