import * as Phaser from 'phaser';
import { DreamDirectConstants, Direction, ArrowType } from './config';
import { DREAMDIRECT_LEVELS, DreamDirectLevelConfig } from './levels';

interface Arrow {
    container: Phaser.GameObjects.Container;
    type: ArrowType;
    direction: Direction;
    targetDirection: Direction; // What the player should press
    spawnBeatTime: number;      // When it spawned (in beat time)
    targetBeatTime: number;     // When it should be hit
    resolved: boolean;
    // For special types
    secondDirection?: Direction; // For Double arrows (Legacy?)
    wigglerFinalDirection?: Direction; // For Wiggler
    spinnerCurrentAngle?: number;
    hitsRequired?: number; // For Double arrows
}

interface ArrowStats {
    correct: number;
    attempts: number;
}

export class DreamDirectGameScene extends Phaser.Scene {
    private currentLevelConfig!: DreamDirectLevelConfig;

    // Audio
    private bgMusic!: Phaser.Sound.BaseSound;

    // BPM & Beat System
    private bpm: number = 80;
    private beatIntervalMs: number = 750;
    private musicStartTime: number = 0;
    private currentBeat: number = 0;
    private nextArrowBeat: number = 2; // First arrow after 2 beats

    // Game State
    private arrows: Arrow[] = [];
    private arrowsSpawned: number = 0;
    private isPlaying: boolean = false;
    private gameOver: boolean = false;

    // Scoring
    private score: number = 0;
    private maxScore: number = 0;
    private combo: number = 0;
    private maxCombo: number = 0;
    private timingOffsets: number[] = [];

    // Stats Tracking (per arrow type)
    private ghostStats: ArrowStats = { correct: 0, attempts: 0 };
    private anchorStats: ArrowStats = { correct: 0, attempts: 0 };
    private wigglerStats: ArrowStats = { correct: 0, attempts: 0 };
    private fadeStats: ArrowStats = { correct: 0, attempts: 0 };
    private spinnerStats: ArrowStats = { correct: 0, attempts: 0 };
    private doubleStats: ArrowStats = { correct: 0, attempts: 0 };
    private ruleSwitchErrors: number = 0; // When Ghost→Same or Anchor→Opposite

    // UI Elements
    private hitZone!: Phaser.GameObjects.Graphics;
    private scoreText!: Phaser.GameObjects.Text;
    private comboText!: Phaser.GameObjects.Text;
    private beatIndicator!: Phaser.GameObjects.Graphics;
    private buttons: Map<Direction, Phaser.GameObjects.Container> = new Map();

    // Visual Constants
    private hitZoneY: number = 0;
    private spawnY: number = 0;

    // Particles
    private particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    // Tutorial System
    private tutorialsSeen: Set<ArrowType> = new Set(['ghost']); // Ghost is taught in main tutorial
    private isTutorialActive: boolean = false;
    private pauseStartTime: number = 0;
    private tutorialContainer!: Phaser.GameObjects.Container;
    private tutorialTargetHelper?: Direction; // Expected input for current tutorial
    private isTutorialResolving: boolean = false; // Prevent input spam during feedback

    // Localized Tutorial Texts
    private readonly TUTORIAL_TEXTS: Record<string, { title: string; desc: string; rule: string }> = {
        'anchor': {
            title: 'ANCHOR ARROW (สีแดง)',
            desc: 'Arrow นี้หนักและมั่นคง',
            rule: 'กดทิศ "เดียวกับ" ที่เห็น!'
        },
        'wiggler': {
            title: 'WIGGLER ARROW (สีเขียว)',
            desc: 'มันจะส่ายไปมาเพื่อหลอกคุณ',
            rule: 'รอมัน "หยุด" แล้วกดทิศ "ตรงข้าม"!'
        },
        'spinner': {
            title: 'SPINNER ARROW (สีเหลือง)',
            desc: 'มันจะหมุนติ้วๆ',
            rule: 'รอมัน "หยุดหมุน" แล้วกดทิศ "เดียวกับ" ที่เห็น!'
        },
        'fade': {
            title: 'SHADOW ARROW (สีม่วง)',
            desc: 'มันจะหายตัวไป',
            rule: 'จำทิศให้ได้ แล้วกด "ตรงข้าม"!'
        },
        'double': {
            title: 'DOUBLE ARROW (สีฟ้า)',
            desc: 'มาเป็นคู่ ดูยากขึ้น',
            rule: 'กดทิศ "เดียวกับ" ที่เห็น "2 ครั้ง" ติดกัน!'
        }
    };

    constructor() {
        super({ key: 'DreamDirectGameScene' });
    }

    init(data: { level: number }) {
        const regLevel = this.registry.get('level');
        const level = data.level ?? regLevel ?? 1;
        this.currentLevelConfig = DREAMDIRECT_LEVELS[level] || DREAMDIRECT_LEVELS[1];

        // Reset state
        this.arrows = [];
        this.arrowsSpawned = 0;
        this.isPlaying = false;
        this.gameOver = false;
        this.isTutorialActive = false;

        // PERSISTENT TUTORIAL TRACKING (LocalStorage)
        try {
            const stored = localStorage.getItem('dreamdirect_tutorials_seen');
            const seenArray = stored ? JSON.parse(stored) : ['ghost'];
            this.tutorialsSeen = new Set(seenArray);
        } catch (e) {
            console.error('Failed to load tutorials seen:', e);
            this.tutorialsSeen = new Set(['ghost']);
        }

        this.score = 0;
        this.maxScore = this.currentLevelConfig.arrowCount * DreamDirectConstants.SCORE.PERFECT;
        this.combo = 0;
        this.maxCombo = 0;
        this.timingOffsets = [];
        this.nextArrowBeat = 2;

        // Reset stats
        this.ghostStats = { correct: 0, attempts: 0 };
        this.anchorStats = { correct: 0, attempts: 0 };
        this.wigglerStats = { correct: 0, attempts: 0 };
        this.fadeStats = { correct: 0, attempts: 0 };
        this.spinnerStats = { correct: 0, attempts: 0 };
        this.doubleStats = { correct: 0, attempts: 0 };
        this.ruleSwitchErrors = 0;

        // Set BPM
        this.bpm = this.currentLevelConfig.bpm;
        this.beatIntervalMs = (60 / this.bpm) * 1000;
    }

    preload() {
        // Load audio
        this.load.audio('bgm-slow', '/assets/sounds/dreamdirect/BGM_Slow_60BPM.mp3');
        this.load.audio('bgm-med', '/assets/sounds/dreamdirect/BGM_Med_80BPM.mp3');
        this.load.audio('bgm-fast', '/assets/sounds/dreamdirect/BGM_Fast_100BPM.mp3');
        this.load.audio('bgm-swing', '/assets/sounds/dreamdirect/BGM_Swing.mp3');
        this.load.audio('sfx-spawn', '/assets/sounds/dreamdirect/SFX_Spawn.mp3');
        this.load.audio('sfx-correct', '/assets/sounds/dreamdirect/SFX_Tap_Correct.mp3');
        this.load.audio('sfx-wrong', '/assets/sounds/dreamdirect/SFX_Tap_Wrong.mp3');
        this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');

        // Ensure particle texture exists (create it if not)
        if (!this.textures.exists('particle_star')) {
            const graphics = this.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle_star', 8, 8);
        }
    }

    create() {
        const { width, height } = this.scale;

        // Calculate safe Hit Zone Y
        // Buttons occupy bottom ~220px (40 padding + 80 size + 100 spacing)
        // Top button edge is at roughly height - 220
        const buttonTopEdge = height - 220;
        const safeZoneY = buttonTopEdge - 50; // 50px buffer

        // Use the lesser of the config percentage OR the safe limit
        // This ensures on tall screens it looks balanced (percentage), 
        // but on short screens it respects the UI (pixel limit).
        this.hitZoneY = Math.min(height * DreamDirectConstants.HIT_ZONE_Y, safeZoneY);

        this.spawnY = height * DreamDirectConstants.SPAWN_Y;

        // Background - Dreamy gradient effect
        this.createBackground();

        // Hit Zone Line
        this.createHitZone();

        // Beat Indicator (pulses on beat)
        this.createBeatIndicator();

        // UI
        this.createUI();

        // Input Buttons
        this.createInputButtons();

        // Keyboard Input
        this.setupKeyboardInput();

        // Handle Resize
        this.scale.on('resize', () => this.handleResize());

        // Create Particles
        this.createParticles();

        // Start the game after a delay
        this.time.delayedCall(1000, () => this.startGame());
    }

    createParticles() {
        // Phaser 3.60+ style: add.particles returns an Emitter
        this.particleEmitter = this.add.particles(0, 0, 'particle_star', {
            speed: { min: 100, max: 300 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            emitting: false, // Don't emit automatically (v3.60 uses emitting: false instead of on: false)
            quantity: 15
        });
    }

    createBackground() {
        const { width, height } = this.scale;

        // Dark gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        bg.fillRect(0, 0, width, height);

        // Subtle stars/particles
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const size = Phaser.Math.FloatBetween(1, 3);
            const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.1, 0.4));

            // Twinkle animation
            this.tweens.add({
                targets: star,
                alpha: { from: star.alpha, to: star.alpha * 0.3 },
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createHitZone() {
        const { width } = this.scale;
        this.hitZone = this.add.graphics();
        this.hitZone.lineStyle(4, 0xffffff, 0.6);
        this.hitZone.moveTo(0, this.hitZoneY);
        this.hitZone.lineTo(width, this.hitZoneY);
        this.hitZone.strokePath();

        // Glow effect
        const glow = this.add.graphics();
        glow.lineStyle(12, 0x8844ff, 0.2);
        glow.moveTo(0, this.hitZoneY);
        glow.lineTo(width, this.hitZoneY);
        glow.strokePath();
    }

    createBeatIndicator() {
        this.beatIndicator = this.add.graphics();
        this.drawBeatIndicator(1);
    }

    drawBeatIndicator(scale: number) {
        const { width } = this.scale;
        this.beatIndicator.clear();

        const centerX = width / 2;
        const y = this.hitZoneY;
        const radius = 20 * scale;

        this.beatIndicator.fillStyle(0x8844ff, 0.6 * scale);
        this.beatIndicator.fillCircle(centerX, y, radius);
        this.beatIndicator.lineStyle(3, 0xffffff, 0.8 * scale);
        this.beatIndicator.strokeCircle(centerX, y, radius);
    }

    createUI() {
        const { width } = this.scale;

        // Score
        // Moved down to avoid overlapping the top Level/Header bar (approx height 80-100px)
        this.scoreText = this.add.text(width / 2, 120, 'SCORE: 0', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#1a1a2e',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(100);

        // Combo
        this.comboText = this.add.text(width / 2, 160, '', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '28px',
            color: '#ffaa00',
            stroke: '#1a1a2e',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(100);
    }

    createInputButtons() {
        const { width, height } = this.scale;
        const buttonSize = 80;
        const spacing = 100;
        const bottomPadding = 40;
        const centerX = width / 2;
        const bottomY = height - bottomPadding - buttonSize / 2;

        const directions: { dir: Direction; x: number; y: number }[] = [
            { dir: 'up', x: centerX, y: bottomY - spacing },
            { dir: 'down', x: centerX, y: bottomY },
            { dir: 'left', x: centerX - spacing, y: bottomY },
            { dir: 'right', x: centerX + spacing, y: bottomY },
        ];

        directions.forEach(({ dir, x, y }) => {
            const container = this.add.container(x, y);

            // Button Background
            const bg = this.add.circle(0, 0, buttonSize / 2, 0x4a4a6e, 1);
            bg.setStrokeStyle(3, 0x8844ff);

            // Draw Ghost Arrow Icon instead of Text
            const arrowGraphic = this.add.graphics();
            arrowGraphic.lineStyle(4, 0xffffff, 1);

            const size = 40; // Smaller than game arrows (60) to fit button
            const half = size / 2;
            const ax = 0;
            const ay = 0;

            const points: { x: number, y: number }[] = [];

            // Define shape based on direction (Tip, LeftWing, Center, RightWing)
            switch (dir) {
                case 'up':
                    points.push(
                        { x: ax, y: ay - half },              // Top Tip
                        { x: ax - half, y: ay + half * 0.5 }, // Left Wing
                        { x: ax, y: ay },                     // Center
                        { x: ax + half, y: ay + half * 0.5 }  // Right Wing
                    );
                    break;
                case 'down':
                    points.push(
                        { x: ax, y: ay + half },              // Bottom Tip
                        { x: ax - half, y: ay - half * 0.5 }, // Left Wing
                        { x: ax, y: ay },                     // Center
                        { x: ax + half, y: ay - half * 0.5 }  // Right Wing
                    );
                    break;
                case 'left':
                    points.push(
                        { x: ax - half, y: ay },              // Left Tip
                        { x: ax + half * 0.5, y: ay - half }, // Top Wing
                        { x: ax, y: ay },                     // Center
                        { x: ax + half * 0.5, y: ay + half }  // Bottom Wing
                    );
                    break;
                case 'right':
                    points.push(
                        { x: ax + half, y: ay },              // Right Tip
                        { x: ax - half * 0.5, y: ay - half }, // Top Wing
                        { x: ax, y: ay },                     // Center
                        { x: ax - half * 0.5, y: ay + half }  // Bottom Wing
                    );
                    break;
            }

            arrowGraphic.strokePoints(points, true, true);

            container.add([bg, arrowGraphic]);
            container.setSize(buttonSize, buttonSize);
            container.setDepth(200);

            // Make interactive
            bg.setInteractive({ useHandCursor: true });
            bg.on('pointerdown', () => this.handleInput(dir));

            this.buttons.set(dir, container);
        });
    }

    setupKeyboardInput() {
        this.input.keyboard?.on('keydown-UP', () => this.handleInput('up'));
        this.input.keyboard?.on('keydown-DOWN', () => this.handleInput('down'));
        this.input.keyboard?.on('keydown-LEFT', () => this.handleInput('left'));
        this.input.keyboard?.on('keydown-RIGHT', () => this.handleInput('right'));
        this.input.keyboard?.on('keydown-W', () => this.handleInput('up'));
        this.input.keyboard?.on('keydown-S', () => this.handleInput('down'));
        this.input.keyboard?.on('keydown-A', () => this.handleInput('left'));
        this.input.keyboard?.on('keydown-D', () => this.handleInput('right'));

        // DEBUG: Shift + R to Reset Tutorials
        this.input.keyboard?.on('keydown-R', (event: KeyboardEvent) => {
            if (event.shiftKey) {
                console.log('DEBUG: Resetting Tutorials');
                localStorage.removeItem('dreamdirect_tutorials_seen');
                this.scene.restart();
            }
        });
    }

    startGame() {
        // Start BGM
        const bgmConfig = this.currentLevelConfig.bgmTrack;
        const bgmKey = this.getBGMKey();

        // Calculate playback rate (Level BPM / Music Native BPM)
        const playbackRate = this.currentLevelConfig.bpm / bgmConfig.bpm;

        console.log(`Starting Level ${this.currentLevelConfig.level}: BPM ${this.currentLevelConfig.bpm} / Native ${bgmConfig.bpm} = Rate ${playbackRate}`);

        this.bgMusic = this.sound.add(bgmKey, {
            loop: true,
            volume: 0.5,
            rate: playbackRate
        });

        this.bgMusic.play();

        this.musicStartTime = Date.now();
        this.isPlaying = true;
    }

    getBGMKey(): string {
        const path = this.currentLevelConfig.bgmTrack.path;
        if (path.includes('Slow')) return 'bgm-slow';
        if (path.includes('Med')) return 'bgm-med';
        if (path.includes('Swing')) return 'bgm-swing';
        return 'bgm-fast';
    }

    startInGameTutorial(type: ArrowType) {
        this.isTutorialActive = true;
        this.bgMusic.pause();
        this.pauseStartTime = Date.now();

        this.tutorialsSeen.add(type);
        try {
            localStorage.setItem('dreamdirect_tutorials_seen', JSON.stringify(Array.from(this.tutorialsSeen)));
        } catch (e) {
            console.error('Failed to save tutorials seen:', e);
        }

        const { width, height } = this.scale;

        // Bring Buttons to Front (Depth 2000 > Tutorial 1000)
        this.buttons.forEach(btn => btn.setDepth(2000));

        // Container
        this.tutorialContainer = this.add.container(0, 0).setDepth(1000);
        this.tutorialContainer.setAlpha(0); // Start transparent

        // Overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        overlay.setInteractive(); // Block clicks below (game world)
        this.tutorialContainer.add(overlay);

        // Text Info
        const info = this.TUTORIAL_TEXTS[type];
        if (!info) {
            // Fallback if type missing (shouldn't happen)
            this.endInGameTutorial(type);
            return;
        }

        const titleText = this.add.text(width / 2, height * 0.15, info.title, {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '32px', // Smaller to fit mobile
            color: '#ffaa00',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            wordWrap: { width: width * 0.9 }
        }).setOrigin(0.5);

        const descText = this.add.text(width / 2, height * 0.25, info.desc, {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '24px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width * 0.8 },
            padding: { top: 5, bottom: 5 } // fix thai clipping
        }).setOrigin(0.5);

        const ruleText = this.add.text(width / 2, height * 0.70, info.rule, {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '32px',
            color: '#44ff44',
            stroke: '#000000',
            strokeThickness: 3,
            padding: { top: 10, bottom: 10 }, // fix thai clipping
            align: 'center',
            wordWrap: { width: width * 0.9 }
        }).setOrigin(0.5);

        this.tutorialContainer.add([titleText, descText, ruleText]);

        // Demo Arrow Visual
        // We'll spawn a dummy arrow in the center
        // Fix direction to UP for demo simplicity
        const demoDir: Direction = 'up';

        // Determine Target Input
        if (['anchor', 'spinner', 'double'].includes(type)) {
            this.tutorialTargetHelper = 'up'; // Same direction
        } else {
            this.tutorialTargetHelper = 'down'; // Opposite direction
        }

        // Draw the Big Arrow
        const arrowGraphics = this.add.graphics();
        this.tutorialContainer.add(arrowGraphics);

        arrowGraphics.clear();
        const cx = width / 2;
        const cy = height / 2;
        const size = 100; // Big!

        // Position graphics at center so rotation works correctly
        arrowGraphics.setPosition(cx, cy);

        // Draw based on type (Draw at 0,0 local)
        switch (type) {
            case 'anchor':
                arrowGraphics.fillStyle(DreamDirectConstants.COLORS.ANCHOR, 1);
                this.drawArrowShape(arrowGraphics, 0, 0, size, demoDir, true);
                break;
            case 'wiggler':
                arrowGraphics.lineStyle(6, DreamDirectConstants.COLORS.WIGGLER, 1);
                this.drawArrowShape(arrowGraphics, 0, 0, size, demoDir, false);
                // Animate Wiggle (relative to center)
                this.tweens.add({
                    targets: arrowGraphics,
                    x: { from: cx - 20, to: cx + 20 },
                    duration: 100,
                    yoyo: true,
                    repeat: -1
                });
                break;
            case 'spinner':
                arrowGraphics.lineStyle(6, DreamDirectConstants.COLORS.SPINNER, 1);
                this.drawArrowShape(arrowGraphics, 0, 0, size, demoDir, false);
                // Animate Spin (Works correctly now that origin is center)
                this.tweens.add({
                    targets: arrowGraphics,
                    angle: 360,
                    duration: 2000,
                    repeat: -1
                });
                break;
            case 'fade':
                arrowGraphics.fillStyle(DreamDirectConstants.COLORS.FADE, 1);
                this.drawArrowShape(arrowGraphics, 0, 0, size, demoDir, true);
                this.tweens.add({
                    targets: arrowGraphics,
                    alpha: { from: 1, to: 0.2 },
                    duration: 800,
                    yoyo: true,
                    repeat: -1
                });
                break;
            case 'double':
                arrowGraphics.fillStyle(DreamDirectConstants.COLORS.DOUBLE, 1);
                this.drawArrowShape(arrowGraphics, -40, 0, size, demoDir, true);
                this.drawArrowShape(arrowGraphics, 40, 0, size, demoDir, true);
                break;
        }

        // ENTRY ANIMATION
        this.tweens.add({
            targets: this.tutorialContainer,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }

    handleTutorialInput(dir: Direction) {
        if (!this.tutorialTargetHelper || this.isTutorialResolving) return;

        if (dir === this.tutorialTargetHelper) {
            // Correct!
            this.isTutorialResolving = true;
            this.sound.play('sfx-correct');

            const { width, height } = this.scale;

            // 1. Particles (Explosion effect)
            this.emitParticles(width / 2, height / 2, 0x44ff44);

            // 2. Animated Text
            const feedback = this.add.text(width / 2, height / 2, 'ยอดเยี่ยม!', {
                fontFamily: 'Sarabun, sans-serif',
                fontSize: '80px', // Larger
                color: '#44ff44',
                stroke: '#ffffff',
                strokeThickness: 6,
                padding: { top: 20, bottom: 20 }
            }).setOrigin(0.5).setDepth(2000).setScale(0); // Start scale 0

            this.tutorialContainer.add(feedback);

            // Pop in animation (Staged)
            this.tweens.add({
                targets: feedback,
                scale: 1.2,
                duration: 400,
                ease: 'Back.out', // Pop in
                onComplete: () => {
                    // Hold for a moment
                    this.time.delayedCall(500, () => {
                        // Then Fade Out
                        this.tweens.add({
                            targets: feedback,
                            scale: 1.5,
                            alpha: 0,
                            duration: 400,
                            onComplete: () => {
                                this.endInGameTutorial();
                            }
                        });
                    });
                }
            });

        } else {
            // Wrong!
            if (this.isTutorialResolving) return; // Should be caught by top check anyway

            this.sound.play('sfx-wrong');
            this.cameras.main.shake(200, 0.005);

            // Shake the container?
            this.tweens.add({
                targets: this.tutorialContainer,
                x: { from: -5, to: 5 },
                duration: 50,
                yoyo: true,
                repeat: 3
            });
        }
    }

    endInGameTutorial(pendingSpawnType?: ArrowType) {
        // Fade Out Animation
        this.tweens.add({
            targets: this.tutorialContainer,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                this.tutorialContainer.destroy();

                // RESTORE BUTTON DEPTH
                this.buttons.forEach(btn => btn.setDepth(200));

                // Resume Game
                this.isTutorialActive = false;
                this.isTutorialResolving = false;
                this.bgMusic.resume();

                // Adjust Time Tracking
                const pauseDuration = Date.now() - this.pauseStartTime;
                this.musicStartTime += pauseDuration;

                // Spawn the arrow that was pending
                if (!pendingSpawnType) {
                    // If called from delayedCall, we need to know what arrow triggered it?
                    // Actually, we can just trigger a spawn now.
                    // But verify: startInGameTutorial took a type. that arrow WAS NOT spawned.
                    // So we should spawn ONE arrow of that type now.
                    // But we don't have the type stored?
                    // Let's just spawnArrow() normally. It will pick a type.
                    // Wait, randomness might pick a different type.
                    // We should ideally force spawn the type we just taught.
                }

                // Force spawn next arrow immediately?
                // Or let the update loop handle it?
                // If we adjust musicStartTime, `elapsed` is effectively same as before pause.
                // So `currentBeatFloat` is same.
                // So `spawnArrow` will be called again by `update` loop?
                // Wait, `nextArrowBeat` wasn't incremented because `spawnArrow` returned early (we will implement this).
                // So yes, `update` will see `currentBeat >= nextArrowBeat` and call `spawnArrow` again.
                // It will try to pick a random arrow.
                // Since `tutorialsSeen` now has the type, it won't trigger tutorial again.
                // BUT, it might pick a *different* arrow type (e.g. Ghost) 
                // which would be confusing: "I just learned Wiggler, why did a Ghost come?".
                // To fix this: `spawnArrow` needs to retry the SAME type if it was interrupted.
                // OR: `tutorialsSeen.add` happened locally.
                // User flow:
                // 1. Update loop -> spawnArrow
                // 2. spawnArrow -> picks 'Wiggler' random
                // 3. 'Wiggler' not seen -> startInGameTutorial('Wiggler') -> return
                // 4. Game Looped.
                // 5. Resume.
                // 6. Update loop -> spawnArrow
                // 7. spawnArrow -> picks 'Ghost' random -> spawns Ghost.
                // Correct fix: When resuming, just let it happen. It's random. 
                // As long as they see the tutorial once, it's fine.
                // However, aesthetically, learning 'Wiggler' then getting 'Wiggler' is best.
                // I'll add `pendingTutorialType` property to force it if needed, 
                // but for simplicity, let randomness handle it.
                // Actually... if I return early, `nextArrowBeat` is NOT incremented.
                // So `spawnArrow` is called immediately next frame.
            }
        });
    }

    update(time: number, delta: number) {
        if (!this.isPlaying || this.gameOver) return;

        // Tutorial Pause Logic
        if (this.isTutorialActive) {
            return; // completely freeze game update loop
        }

        const elapsed = Date.now() - this.musicStartTime;
        const currentBeatFloat = elapsed / this.beatIntervalMs;
        this.currentBeat = Math.floor(currentBeatFloat);

        // Beat pulse animation
        const beatPhase = currentBeatFloat % 1;
        if (beatPhase < 0.1) {
            this.drawBeatIndicator(1 + (0.1 - beatPhase) * 5);
        } else {
            this.drawBeatIndicator(1);
        }

        // Spawn arrows
        if (this.arrowsSpawned < this.currentLevelConfig.arrowCount) {
            if (currentBeatFloat >= this.nextArrowBeat) {
                this.spawnArrow();
            }
        }

        // Update arrows
        this.updateArrows(elapsed);

        // Check for missed arrows
        this.checkMissedArrows(currentBeatFloat);

        // Check win condition
        if (this.arrowsSpawned >= this.currentLevelConfig.arrowCount &&
            this.arrows.filter(a => !a.resolved).length === 0) {
            this.endGame();
        }

        // Particle System Update
        if (this.particleEmitter) {
            // (Phaser handles emitter update automatically if added to scene)
        }
    }

    getSpawnInterval(): number {
        // Beats between arrow spawns
        if (this.currentLevelConfig.swingRhythm) {
            // Swing: Alternating 1.5 and 0.5 beat intervals
            return Phaser.Math.RND.pick([1, 1.5, 2]);
        }
        return 1; // Regular beat
    }

    spawnArrow() {
        const { width } = this.scale;

        // Pick Type based on Level Config
        const arrowType = Phaser.Math.RND.pick(this.currentLevelConfig.arrowTypes);

        // TUTORIAL CHECK
        if (!this.tutorialsSeen.has(arrowType)) {
            this.startInGameTutorial(arrowType);
            return;
        }

        // Determine Initial Direction
        const direction = Phaser.Math.RND.pick([...DreamDirectConstants.DIRECTIONS]);

        // Logic for Target Direction
        let targetDirection = direction;

        if (['ghost', 'fade'].includes(arrowType)) {
            targetDirection = this.getOppositeDirection(direction);
        }
        // Wiggler and Spinner targets are determined dynamically or overwrite this later

        // Create Visuals
        const container = this.createArrowVisual(width / 2, this.spawnY, arrowType, direction);

        const arrowObj: Arrow = {
            container,
            type: arrowType,
            direction,
            targetDirection,
            spawnBeatTime: this.nextArrowBeat,
            targetBeatTime: this.nextArrowBeat + this.getArrowTravelBeats(),
            resolved: false
        };

        // Special handling for Spinner
        if (arrowType === 'spinner') {
            arrowObj.spinnerCurrentAngle = Phaser.Math.Between(0, 360);
            // Target determined in updateArrows when it locks
        }

        // Special handling for Wiggler
        if (arrowType === 'wiggler') {
            // Wiggler changes direction mid-flight
            arrowObj.wigglerFinalDirection = Phaser.Math.RND.pick([...DreamDirectConstants.DIRECTIONS]);
            arrowObj.targetDirection = this.getOppositeDirection(arrowObj.wigglerFinalDirection);
        }

        // Special handling for Double
        if (arrowType === 'double') {
            arrowObj.hitsRequired = 2;
        }

        this.arrows.push(arrowObj);
        this.arrowsSpawned++;

        // Increment beat for next arrow
        this.nextArrowBeat += this.getSpawnInterval();
    }

    getArrowTravelBeats(): number {
        return 4; // Arrows take 4 beats to reach hit zone
    }

    getRandomDirection(): Direction {
        return Phaser.Math.RND.pick([...DreamDirectConstants.DIRECTIONS]);
    }

    calculateTargetDirection(type: ArrowType, displayDirection: Direction): Direction {
        switch (type) {
            case 'ghost':
                // Opposite of what's shown
                return this.getOppositeDirection(displayDirection);
            case 'anchor':
                // Same as what's shown
                return displayDirection;
            case 'fade':
                // Same as ghost (opposite)
                return this.getOppositeDirection(displayDirection);
            case 'spinner':
            case 'wiggler':
                // Will be determined dynamically
                return displayDirection;
            case 'double':
                // Same direction
                return displayDirection;
            default:
                return this.getOppositeDirection(displayDirection);
        }
    }

    getOppositeDirection(dir: Direction): Direction {
        switch (dir) {
            case 'up': return 'down';
            case 'down': return 'up';
            case 'left': return 'right';
            case 'right': return 'left';
        }
    }

    createArrowVisual(x: number, y: number, type: ArrowType, direction: Direction): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        const size = 60;
        const color = DreamDirectConstants.COLORS[type.toUpperCase() as keyof typeof DreamDirectConstants.COLORS] || 0xffffff;

        // Arrow shape based on type
        const arrowGraphic = this.add.graphics();

        switch (type) {
            case 'ghost':
                // Hollow arrow
                arrowGraphic.lineStyle(4, color, 1);
                this.drawArrowShape(arrowGraphic, 0, 0, size, direction, false);
                break;

            case 'anchor':
                // Solid filled arrow
                arrowGraphic.fillStyle(color, 1);
                this.drawArrowShape(arrowGraphic, 0, 0, size, direction, true);
                arrowGraphic.lineStyle(3, 0xffffff, 0.8);
                this.drawArrowShape(arrowGraphic, 0, 0, size, direction, false);
                break;

            case 'wiggler':
                // Squiggly arrow
                arrowGraphic.lineStyle(4, color, 1);
                this.drawArrowShape(arrowGraphic, 0, 0, size, direction, false);
                // Add wiggle effect
                this.tweens.add({
                    targets: container,
                    x: { from: x - 5, to: x + 5 },
                    duration: 100,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                break;

            case 'fade':
                // Transparent arrow
                arrowGraphic.fillStyle(color, 0.6);
                this.drawArrowShape(arrowGraphic, 0, 0, size, direction, true);

                // create the neutral "mystery" shape (hidden initially)
                const mysteryShape = this.add.graphics();
                mysteryShape.fillStyle(color, 1);
                mysteryShape.fillCircle(0, 0, size * 0.4); // A dot/circle
                mysteryShape.lineStyle(2, 0xffffff, 1);
                mysteryShape.strokeCircle(0, 0, size * 0.4);
                mysteryShape.setAlpha(0);
                container.add(mysteryShape);

                // Transform after 2 beats (slower fade)
                this.time.delayedCall(this.beatIntervalMs * 2, () => {
                    // Fade out arrow direction
                    this.tweens.add({
                        targets: arrowGraphic,
                        alpha: 0,
                        scale: 0.5,
                        duration: 300,
                    });
                    // Fade in neutral shape
                    this.tweens.add({
                        targets: mysteryShape,
                        alpha: 1,
                        scale: { from: 0.5, to: 1 },
                        duration: 300,
                        ease: 'Back.out'
                    });
                });
                break;

            case 'spinner':
                // Rotating arrow
                arrowGraphic.fillStyle(color, 1);
                this.drawArrowShape(arrowGraphic, 0, 0, size, 'up', true);
                break;

            case 'double':
                // Two stacked arrows
                arrowGraphic.fillStyle(color, 1);
                this.drawArrowShape(arrowGraphic, 0, -15, size * 0.8, direction, true);
                this.drawArrowShape(arrowGraphic, 0, 15, size * 0.8, direction, true);
                break;
        }

        container.add(arrowGraphic);
        container.setDepth(50);

        return container;
    }

    drawArrowShape(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number, direction: Direction, fill: boolean) {
        const half = size / 2;
        const points: number[] = [];

        switch (direction) {
            case 'up':
                points.push(x, y - half, x - half, y + half * 0.5, x, y, x + half, y + half * 0.5);
                break;
            case 'down':
                points.push(x, y + half, x - half, y - half * 0.5, x, y, x + half, y - half * 0.5);
                break;
            case 'left':
                points.push(x - half, y, x + half * 0.5, y - half, x, y, x + half * 0.5, y + half);
                break;
            case 'right':
                points.push(x + half, y, x - half * 0.5, y - half, x, y, x - half * 0.5, y + half);
                break;
        }

        if (fill) {
            graphics.fillPoints(points.map((v, i) => i % 2 === 0 ? { x: v, y: points[i + 1] } : null).filter(p => p) as Phaser.Geom.Point[], true);
        }
        graphics.strokePoints(points.map((v, i) => i % 2 === 0 ? { x: v, y: points[i + 1] } : null).filter(p => p) as Phaser.Geom.Point[], true);
    }

    updateArrows(elapsed: number) {
        const travelTime = this.getArrowTravelBeats() * this.beatIntervalMs;

        this.arrows.forEach(arrow => {
            if (arrow.resolved) return;

            const arrowElapsed = elapsed - (arrow.spawnBeatTime * this.beatIntervalMs);
            const progress = arrowElapsed / travelTime;

            // Move arrow down
            const newY = Phaser.Math.Linear(this.spawnY, this.hitZoneY, Math.min(1, progress));
            arrow.container.setY(newY);

            // Spinner rotation
            if (arrow.type === 'spinner' && arrow.spinnerCurrentAngle !== undefined) {
                if (progress <= 0.7) {
                    arrow.spinnerCurrentAngle += 5;
                    arrow.container.setRotation(Phaser.Math.DegToRad(arrow.spinnerCurrentAngle));
                } else {
                    // Lock in final direction near hit zone
                    const lockedRotation = Math.round(arrow.spinnerCurrentAngle / 90) * 90;
                    arrow.container.setRotation(Phaser.Math.DegToRad(lockedRotation));

                    const dirs: Direction[] = ['up', 'right', 'down', 'left'];
                    const dirIndex = ((lockedRotation / 90) % 4 + 4) % 4;

                    // Spinner now requires SAME direction
                    arrow.targetDirection = dirs[dirIndex];
                }
            }

            // Wiggler direction change
            if (arrow.type === 'wiggler' && progress > 0.6 && arrow.wigglerFinalDirection) {
                // LOCK WIGGLER
                // 1. Stop the wiggle tween
                this.tweens.killTweensOf(arrow.container);

                // 2. Reset X position to center (spawnX is width/2)
                arrow.container.setX(this.scale.width / 2);

                // 3. Update Visual to Final Direction
                const graphics = arrow.container.getAt(0) as Phaser.GameObjects.Graphics;
                graphics.clear();

                // Redraw with Final Direction
                graphics.lineStyle(4, DreamDirectConstants.COLORS.WIGGLER, 1);
                this.drawArrowShape(graphics, 0, 0, 60, arrow.wigglerFinalDirection, false);

                // Ensure targetDirection is set (Opposite for Wiggler)
                arrow.targetDirection = this.getOppositeDirection(arrow.wigglerFinalDirection);
            }
        });
    }

    checkMissedArrows(currentBeatFloat: number) {
        const missWindow = 0.5; // Half a beat late = miss

        this.arrows.forEach(arrow => {
            if (arrow.resolved) return;

            if (currentBeatFloat > arrow.targetBeatTime + missWindow) {
                this.handleMiss(arrow);
            }
        });
    }

    handleInput(inputDirection: Direction) {
        // Tutorial Input Routing
        if (this.isTutorialActive) {
            this.handleTutorialInput(inputDirection);
            this.flashButton(inputDirection);
            return;
        }

        if (!this.isPlaying || this.gameOver) return;

        this.flashButton(inputDirection);

        // Find closest arrow to hit zone that isn't resolved
        const hitableArrows = this.arrows
            .filter(a => !a.resolved)
            .filter(a => {
                const progress = (Date.now() - this.musicStartTime - a.spawnBeatTime * this.beatIntervalMs) /
                    (this.getArrowTravelBeats() * this.beatIntervalMs);
                return progress > 0.6 && progress < 1.3; // Within hit window
            })
            .sort((a, b) => a.targetBeatTime - b.targetBeatTime);

        if (hitableArrows.length === 0) return;

        const arrow = hitableArrows[0];
        const elapsed = Date.now() - this.musicStartTime;
        const targetTime = arrow.targetBeatTime * this.beatIntervalMs;
        const timingOffset = Math.abs(elapsed - targetTime);

        // Check if correct direction
        const isCorrect = inputDirection === arrow.targetDirection;

        // Track rule switch errors
        if (!isCorrect) {
            const oppositeInput = this.getOppositeDirection(inputDirection);
            if ((arrow.type === 'ghost' && inputDirection === arrow.direction) ||
                (arrow.type === 'anchor' && oppositeInput === arrow.direction)) {
                this.ruleSwitchErrors++;
            }
        }

        // Calculate score based on timing
        if (isCorrect) {

            // Double Arrow Logic
            if (arrow.type === 'double' && (arrow.hitsRequired ?? 0) > 1) {
                // First Hit of Double
                arrow.hitsRequired!--;

                // Visual/Audio Feedback for partial hit
                this.sound.play('sfx-correct', { volume: 0.5, rate: 1.5 }); // Higher pitch for first hit
                this.emitParticles(arrow.container.x, arrow.container.y, 0x44ffff); // Cyan
                this.pulseHitZone();

                // Show "HIT AGAIN" or specialized feedback?
                this.showTimingFeedback(arrow.container.x, arrow.container.y, 'อีกครั้ง!', true);

                // Remove one arrow visual
                // Double arrow is drawn with two shapes. We could clear and redraw or just scale punch
                this.tweens.add({
                    targets: arrow.container,
                    scale: 0.8,
                    duration: 50,
                    yoyo: true
                });

                // Flash button but DON'T destroy arrow yet
                this.flashButton(inputDirection);
                return;
            }

            const timing = this.getTimingGrade(timingOffset);
            this.addScore(timing.score, arrow);
            this.showTimingFeedback(arrow.container.x, arrow.container.y, timing.grade, true);
            this.timingOffsets.push(timingOffset);
            this.updateStats(arrow.type, true);
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            this.updateComboDisplay();
            this.sound.play('sfx-correct', { volume: 0.5 });

            // Visual feedback
            this.emitParticles(arrow.container.x, arrow.container.y, 0x44ff44); // Green particles
            this.pulseHitZone();
        } else {
            this.handleMiss(arrow);
        }

        // Mark as resolved
        arrow.resolved = true;
        this.destroyArrow(arrow);

        // Button press feedback
        this.flashButton(inputDirection);
    }

    getTimingGrade(offsetMs: number): { grade: string; score: number } {
        const multiplier = this.currentLevelConfig.timingWindowMultiplier;
        const perfect = DreamDirectConstants.TIMING.PERFECT * multiplier;
        const great = DreamDirectConstants.TIMING.GREAT * multiplier;
        const good = DreamDirectConstants.TIMING.GOOD * multiplier;

        if (offsetMs <= perfect) {
            return { grade: 'ยอดเยี่ยม!', score: DreamDirectConstants.SCORE.PERFECT };
        } else if (offsetMs <= great) {
            return { grade: 'ดีมาก!', score: DreamDirectConstants.SCORE.GREAT };
        } else if (offsetMs <= good) {
            return { grade: 'ดี!', score: DreamDirectConstants.SCORE.GOOD };
        }
        return { grade: 'พลาด!', score: 0 };
    }

    handleMiss(arrow: Arrow) {
        if (arrow.resolved) return;

        arrow.resolved = true;
        this.combo = 0;
        this.updateComboDisplay();
        this.updateStats(arrow.type, false);
        this.showTimingFeedback(arrow.container.x, arrow.container.y, 'พลาด!', false);
        this.sound.play('sfx-wrong', { volume: 0.5 });
        this.cameras.main.shake(200, 0.01); // Screen shake on miss
        this.destroyArrow(arrow);
    }

    updateStats(type: ArrowType, correct: boolean) {
        const stats = this.getStatsForType(type);
        stats.attempts++;
        if (correct) stats.correct++;
    }

    getStatsForType(type: ArrowType): ArrowStats {
        switch (type) {
            case 'ghost': return this.ghostStats;
            case 'anchor': return this.anchorStats;
            case 'wiggler': return this.wigglerStats;
            case 'fade': return this.fadeStats;
            case 'spinner': return this.spinnerStats;
            case 'double': return this.doubleStats;
        }
    }

    addScore(points: number, arrow: Arrow) {
        this.score += points;
        this.scoreText.setText(`SCORE: ${this.score}`);
    }

    updateComboDisplay() {
        if (this.combo > 1) {
            this.comboText.setText(`${this.combo} COMBO!`);
            this.comboText.setScale(0.8);
            this.tweens.add({
                targets: this.comboText,
                scale: 1,
                duration: 150,
                ease: 'Back.out'
            });
        } else {
            this.comboText.setText('');
        }
    }

    showTimingFeedback(x: number, y: number, grade: string, isGood: boolean) {
        const color = isGood ? '#44ff44' : '#ff4444';
        const text = this.add.text(x, y - 30, grade, {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '32px',
            color,
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: text,
            y: y - 80,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.out',
            onComplete: () => text.destroy()
        });
    }

    flashButton(dir: Direction) {
        const button = this.buttons.get(dir);
        if (!button) return;

        const bg = button.list[0] as Phaser.GameObjects.Arc;
        const originalColor = 0x4a4a6e;

        bg.setFillStyle(0x8844ff);
        this.time.delayedCall(100, () => {
            bg.setFillStyle(originalColor);
        });
    }

    destroyArrow(arrow: Arrow) {
        // "Shatter" effect
        this.tweens.add({
            targets: arrow.container,
            scale: 1.5,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                arrow.container.destroy();
            }
        });
    }

    emitParticles(x: number, y: number, tint: number) {
        this.particleEmitter.particleTint = tint;
        this.particleEmitter.explode(15, x, y);
    }

    pulseHitZone() {
        if (this.hitZone) {
            this.tweens.add({
                targets: this.hitZone,
                alpha: 0.2, // Flash clearer
                duration: 50,
                yoyo: true,
                onComplete: () => {
                    this.hitZone.alpha = 1;
                }
            });
        }
    }

    calculateStars(): number {
        const percentage = (this.score / this.maxScore) * 100;
        if (percentage >= DreamDirectConstants.STARS.THREE) return 3;
        if (percentage >= DreamDirectConstants.STARS.TWO) return 2;
        return 1;
    }

    getStarHint(): string | null {
        const percentage = (this.score / this.maxScore) * 100;
        if (percentage < DreamDirectConstants.STARS.TWO) {
            return 'พยายามกด Arrow ตามจังหวะให้แม่นยำกว่านี้';
        }
        if (percentage < DreamDirectConstants.STARS.THREE) {
            return 'เกือบได้ 3 ดาวแล้ว! ลองจับจังหวะให้ Perfect มากขึ้น';
        }
        return null;
    }

    endGame() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.isPlaying = false;

        if (this.bgMusic) {
            this.bgMusic.stop();
        }

        this.sound.play('level-pass', { volume: 0.7 });

        // Calculate average timing offset for speed stat
        const avgTiming = this.timingOffsets.length > 0
            ? this.timingOffsets.reduce((a, b) => a + b, 0) / this.timingOffsets.length
            : 300;

        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: true,
                current_played: this.currentLevelConfig.level,
                difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
                score: this.score,
                maxScore: this.maxScore,
                stars: this.calculateStars(),
                starHint: this.getStarHint(),

                // Raw stats for scoring calculation
                ghostCorrect: this.ghostStats.correct,
                ghostAttempts: this.ghostStats.attempts,
                anchorCorrect: this.anchorStats.correct,
                anchorAttempts: this.anchorStats.attempts,
                wigglerCorrect: this.wigglerStats.correct,
                wigglerAttempts: this.wigglerStats.attempts,
                fadeCorrect: this.fadeStats.correct,
                fadeAttempts: this.fadeStats.attempts,
                spinnerCorrect: this.spinnerStats.correct,
                spinnerAttempts: this.spinnerStats.attempts,
                doubleCorrect: this.doubleStats.correct,
                doubleAttempts: this.doubleStats.attempts,
                ruleSwitchErrors: this.ruleSwitchErrors,
                avgTimingOffsetMs: avgTiming,
                maxCombo: this.maxCombo,

                continuedAfterTimeout: false,
            });
        }
    }

    handleResize() {
        const { width, height } = this.scale;
        this.hitZoneY = height * DreamDirectConstants.HIT_ZONE_Y;
        this.spawnY = height * DreamDirectConstants.SPAWN_Y;

        // Update UI positions
        this.scoreText?.setPosition(width / 2, 60);
        this.comboText?.setPosition(width / 2, 100);

        // Redraw hit zone
        if (this.hitZone) {
            this.hitZone.clear();
            this.hitZone.lineStyle(4, 0xffffff, 0.6);
            this.hitZone.moveTo(0, this.hitZoneY);
            this.hitZone.lineTo(width, this.hitZoneY);
            this.hitZone.strokePath();
        }

        // Reposition buttons
        this.repositionButtons();
    }

    repositionButtons() {
        const { width, height } = this.scale;
        const spacing = 100;
        const bottomPadding = 40;
        const buttonSize = 80;
        const centerX = width / 2;
        const bottomY = height - bottomPadding - buttonSize / 2;

        const positions: { dir: Direction; x: number; y: number }[] = [
            { dir: 'up', x: centerX, y: bottomY - spacing },
            { dir: 'down', x: centerX, y: bottomY },
            { dir: 'left', x: centerX - spacing, y: bottomY },
            { dir: 'right', x: centerX + spacing, y: bottomY },
        ];

        positions.forEach(({ dir, x, y }) => {
            const button = this.buttons.get(dir);
            if (button) button.setPosition(x, y);
        });
    }
}
