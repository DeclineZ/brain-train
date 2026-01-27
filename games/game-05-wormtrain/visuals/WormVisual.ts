import Phaser from 'phaser';
import GameScene from '../GameScene';
import { WormSystem, WormState, WormEntity } from '../systems/WormSystem';
import { WormGameConstants as WormGameConfig } from '../config';
import { Point } from '../types/level';

// Visual configuration based on worm size
const WORM_VISUAL_CONFIG = {
    S: {
        segmentCount: 8,
        spacing: 14, // Wider relative spacing for small worms
    },
    M: {
        segmentCount: 6,
        spacing: 20, // Tight spacing for normal look
    },
    L: { // Future-proofing
        segmentCount: 8,
        spacing: 24,
    }
};

// How many position samples to keep in history
const HISTORY_SIZE = 300;
// Lerp smoothing factor (0-1, lower = smoother)
const LERP_FACTOR = 0.2; // Slightly smoother


interface WormVisualData {
    id: string;
    segments: (Phaser.GameObjects.Arc | Phaser.GameObjects.Image | Phaser.GameObjects.Container)[]; // Updated type
    positionHistory: Point[];
    wiggleOffset: number;
    color: number;
    state: WormState;
    size: 'S' | 'M' | 'L'; // Store size context

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
        const sizeKey = worm.config.size as 'S' | 'M'; // Default to M logic if neither, but type helps
        const config = WORM_VISUAL_CONFIG[sizeKey] || WORM_VISUAL_CONFIG.M;

        // Size multipliers: S=smaller, M=normal
        const sizeMultiplier = sizeKey === 'S' ? 0.5 : 1.0;
        const headRadius = WormGameConfig.WORM_HEAD_RADIUS * sizeMultiplier;
        // const bodyRadius = WormGameConfig.WORM_BODY_RADIUS * sizeMultiplier; // Unused for now as we match head

        const segments: (Phaser.GameObjects.Arc | Phaser.GameObjects.Image | Phaser.GameObjects.Container)[] = [];
        const bodySegments: Phaser.GameObjects.Arc[] = [];

        // 1. Create Body Segments FIRST (so they are visually behind the head)
        // All segments have the same size as head for uniform look
        for (let i = 0; i < config.segmentCount - 1; i++) {
            const bodyPart = this.scene.add.circle(0, 0, headRadius, colorInt);
            bodyPart.setAlpha(1);
            // Store current position for smooth lerping
            (bodyPart as any)._smoothX = 0;
            (bodyPart as any)._smoothY = 0;
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
            size: sizeKey as any,
            headBorder
        };

        this.visualDataMap.set(worm.id, visualData);

        // Pre-fill history to prevent segments flying in from (0,0)
        // We calculate the initial position and fill the history with it
        // so the worm appears to be "stacked" at the tunnel exit initially
        const startPos = this.getWormPosition(worm);
        if (startPos) {
            // Fill history enough to cover the whole worm
            // Using a rough estimate of how many points we need
            // If the worm moves fast, we might need more, but this is a good start
            // for the "stacked at spawn" look.
            for (let i = 0; i < HISTORY_SIZE; i++) {
                visualData.positionHistory.push({ x: startPos.x, y: startPos.y });
            }

            // Force immediate position update for all segments
            // This ensures they are at the start pos, not (0,0)
            segments.forEach(seg => {
                seg.setPosition(startPos.x, startPos.y);
                (seg as any)._smoothX = startPos.x;
                (seg as any)._smoothY = startPos.y;
                seg.setVisible(true);
            });
        }
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

            // No wiggle - smooth movement only

            // 3. Update Head Container with smooth lerping
            const headContainer = data.segments[0] as Phaser.GameObjects.Container;

            // Smooth head position using lerp
            const currentHeadX = headContainer.x;
            const currentHeadY = headContainer.y;
            const smoothHeadX = currentHeadX + (headPos.x - currentHeadX) * LERP_FACTOR;
            const smoothHeadY = currentHeadY + (headPos.y - currentHeadY) * LERP_FACTOR;

            headContainer.setPosition(smoothHeadX, smoothHeadY);

            // Border and Eyes are inside container, move automatically.

            // 4. Update Body Segments with smooth following
            const bodySegments = data.segments.slice(1);
            const sizeConf = WORM_VISUAL_CONFIG[data.size as 'S' | 'M' | 'L'] || WORM_VISUAL_CONFIG.M;
            const spacing = sizeConf.spacing;

            bodySegments.forEach((seg, i) => {
                const segmentIndex = i + 1;

                // Find position in history at the correct distance behind head
                const targetDistance = segmentIndex * spacing;
                let targetPos = this.getPositionAtDistance(data.positionHistory, targetDistance);

                if (targetPos) {
                    // Get current smooth position
                    const smoothX = (seg as any)._smoothX || seg.x;
                    const smoothY = (seg as any)._smoothY || seg.y;

                    // Lerp to target position for smooth movement
                    const newX = smoothX + (targetPos.x - smoothX) * LERP_FACTOR;
                    const newY = smoothY + (targetPos.y - smoothY) * LERP_FACTOR;

                    // Store smooth position
                    (seg as any)._smoothX = newX;
                    (seg as any)._smoothY = newY;

                    seg.setPosition(newX, newY);
                    seg.setVisible(true);
                } else {
                    // Not enough history yet, hide segment
                    seg.setVisible(false);
                }
            });

            // 5. Rotate Head to face movement with smooth interpolation
            if (data.positionHistory.length >= 2) {
                const pCurrent = data.positionHistory[0];
                const pPrev = data.positionHistory[Math.min(6, data.positionHistory.length - 1)];

                if (pCurrent && pPrev && (Math.abs(pCurrent.x - pPrev.x) > 0.5 || Math.abs(pCurrent.y - pPrev.y) > 0.5)) {
                    const targetAngle = Math.atan2(pCurrent.y - pPrev.y, pCurrent.x - pPrev.x);

                    // Smooth rotation using lerp
                    const currentAngle = headContainer.rotation;
                    let angleDiff = targetAngle - currentAngle;

                    // Normalize angle difference to -PI to PI
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    headContainer.setRotation(currentAngle + angleDiff * LERP_FACTOR);
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

    private getPositionAtDistance(history: Point[], targetDistance: number): Point | null {
        if (history.length < 2) return null;

        let currentDist = 0;

        for (let i = 0; i < history.length - 1; i++) {
            const p1 = history[i];
            const p2 = history[i + 1];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (currentDist + dist >= targetDistance) {
                const remaining = targetDistance - currentDist;
                const ratio = remaining / (dist || 1); // Avoid division by zero

                return {
                    x: p1.x + dx * ratio,
                    y: p1.y + dy * ratio
                };
            }

            currentDist += dist;
        }

        return null;
    }
}
