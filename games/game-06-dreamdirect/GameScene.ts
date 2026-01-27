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
    lane: number;               // 0 (Left) or 1 (Right)

    // For special types
    secondDirection?: Direction; // For Double arrows
    wigglerFinalDirection?: Direction; // For Wiggler
    spinnerCurrentAngle?: number;
    hitsRequired?: number; // For Double arrows

    // Hold Arrow Properties
    duration?: number; // In beats
    isBeingHeld?: boolean;
    holdProgress?: number; // 0 to 1
    visualHeight?: number; // Initial graphic height
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
    private laneBusyUntilBeat: [number, number] = [0, 0]; // Track when each lane is free [Lane 0, Lane 1]

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
    private holdSolidStats: ArrowStats = { correct: 0, attempts: 0 };
    private holdHollowStats: ArrowStats = { correct: 0, attempts: 0 };
    private ruleSwitchErrors: number = 0; // When Ghost→Same or Anchor→Opposite

    // UI Elements
    private hitZone!: Phaser.GameObjects.Graphics;
    private laneGraphics!: Phaser.GameObjects.Graphics;
    private targetGraphics!: Phaser.GameObjects.Graphics;
    private glowGraphics!: Phaser.GameObjects.Graphics;
    private scoreText!: Phaser.GameObjects.Text;
    private comboText!: Phaser.GameObjects.Text;
    private beatIndicator!: Phaser.GameObjects.Graphics;
    private buttons: Map<Direction, Phaser.GameObjects.Container> = new Map();

    // Visual Constants
    // Visual Constants
    private hitZoneY: number = 0;
    private spawnY: number = 0;
    private readonly LANE_OFFSET: number = 50; // Distance from center for the two lanes



    private particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
    private holdParticleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter; // Visual for active holding

    // Tutorial System
    private tutorialsShownThisSession: Set<ArrowType> = new Set(['ghost']); // Ghost is taught in main tutorial
    private isTutorialActive: boolean = false;
    private pauseStartTime: number = 0;
    private tutorialContainer!: Phaser.GameObjects.Container;
    private tutorialTargetHelper?: Direction; // Expected input for current tutorial
    private isTutorialResolving: boolean = false; // Prevent input spam during feedback
    private currentTutorialType?: ArrowType;

    // Tutorial Hold State
    private isHoldingTutorial: boolean = false;
    private tutorialHoldTween?: Phaser.Tweens.Tween;
    private tutorialHoldBar?: Phaser.GameObjects.Graphics;

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
            rule: 'จำทิศให้ได้ แล้วกดทิศ "เดียวกับ" ที่เห็น!'
        },
        'double': {
            title: 'DOUBLE ARROW (สีฟ้า)',
            desc: 'มาเป็นคู่ ดูยากขึ้น',
            rule: 'กดทิศ "เดียวกับ" ที่เห็น "2 ครั้ง" ติดกัน!'
        },
        'beat_tap': {
            title: 'BEAT TAP (สีฟ้าใส)',
            desc: 'จังหวะหัวใจ',
            rule: 'กด "Spacebar" ให้ตรงจังหวะ!'
        },
        'beat_hold': {
            title: 'BEAT HOLD (สีทอง)',
            desc: 'ลากยาวตามเสียง',
            rule: 'กด "Spacebar" ค้างไว้จนสุดเสียง!'
        },
        'hold_solid': {
            title: 'HOLD ARROW (ฟ้า/Cyan)',
            desc: 'ยาวๆ มั่นคง',
            rule: 'กดค้างไว้ 2 วินาที!'
        },
        'hold_hollow': {
            title: 'HOLLOW HOLD (ขาว)',
            desc: 'เงาที่ยาวนาน',
            rule: 'กด "ตรงข้าม" ค้างไว้ 2 วินาที!'
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

        // TUTORIAL TRACKING (Session Only)
        // We now show tutorials ALWAYS on the level they are introduced, once per session (restart).
        this.tutorialsShownThisSession = new Set(['ghost']); // Ghost is assumed known from main tutorial

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
        this.holdSolidStats = { correct: 0, attempts: 0 };
        this.holdHollowStats = { correct: 0, attempts: 0 };
        this.ruleSwitchErrors = 0;

        // Set BPM
        this.bpm = this.currentLevelConfig.bpm;

        this.beatIntervalMs = (60 / this.bpm) * 1000;
        this.laneBusyUntilBeat = [0, 0];
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

        // Hold Particles (Continuous stream)
        this.holdParticleEmitter = this.add.particles(0, 0, 'particle_star', {
            speed: { min: 50, max: 100 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 400,
            blendMode: 'ADD',
            emitting: false,
            frequency: 50
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
        this.hitZone = this.add.graphics();
        this.laneGraphics = this.add.graphics();
        this.targetGraphics = this.add.graphics();
        this.glowGraphics = this.add.graphics();

        this.drawHitZone();
    }

    drawHitZone() {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const l1x = centerX - this.LANE_OFFSET;
        const l2x = centerX + this.LANE_OFFSET;

        // Clear all
        this.hitZone.clear();
        this.laneGraphics.clear();
        this.targetGraphics.clear();
        this.glowGraphics.clear();

        // 1. Horizontal Hit Line
        this.hitZone.lineStyle(4, 0xffffff, 0.6);
        this.hitZone.moveTo(0, this.hitZoneY);
        this.hitZone.lineTo(width, this.hitZoneY);
        this.hitZone.strokePath();

        // 2. Vertical Lanes
        this.laneGraphics.lineStyle(2, 0xffffff, 0.1);

        // Left Lane
        this.laneGraphics.moveTo(l1x, 0);
        this.laneGraphics.lineTo(l1x, height);

        // Right Lane
        this.laneGraphics.moveTo(l2x, 0);
        this.laneGraphics.lineTo(l2x, height);

        this.laneGraphics.strokePath();

        // 3. Target Circles (Timing Guides)
        this.targetGraphics.lineStyle(4, 0xffffff, 0.4); // Subtle white
        const targetRadius = 30;

        this.targetGraphics.strokeCircle(l1x, this.hitZoneY, targetRadius);
        this.targetGraphics.strokeCircle(l2x, this.hitZoneY, targetRadius);

        // 4. Glow effect
        this.glowGraphics.lineStyle(12, 0x8844ff, 0.2);
        this.glowGraphics.moveTo(0, this.hitZoneY);
        this.glowGraphics.lineTo(width, this.hitZoneY);
        this.glowGraphics.strokePath();
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
            bg.setInteractive({ useHandCursor: true });
            bg.on('pointerdown', () => this.handleInput(dir));
            bg.on('pointerup', () => this.handleRelease(dir));
            bg.on('pointerout', () => this.handleRelease(dir));

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



        this.input.keyboard?.on('keyup-UP', () => this.handleRelease('up'));
        this.input.keyboard?.on('keyup-DOWN', () => this.handleRelease('down'));
        this.input.keyboard?.on('keyup-LEFT', () => this.handleRelease('left'));
        this.input.keyboard?.on('keyup-RIGHT', () => this.handleRelease('right'));
        this.input.keyboard?.on('keyup-W', () => this.handleRelease('up'));
        this.input.keyboard?.on('keyup-S', () => this.handleRelease('down'));
        this.input.keyboard?.on('keyup-A', () => this.handleRelease('left'));
        this.input.keyboard?.on('keyup-D', () => this.handleRelease('right'));

        // DEBUG: Reset Tutorial
        this.input.keyboard?.on('keydown-R', () => {
            if (this.isTutorialActive) return;
            // logic is session-based now, so restart is sufficient
            this.scene.restart();
        });
    }

    handleRelease(dir?: Direction) {
        if (this.isTutorialActive) {
            this.handleTutorialRelease(dir);
            return;
        }

        // Find arrows that are currently being held AND match the direction released
        const releasingArrows = this.arrows.filter(a => a.isBeingHeld && a.targetDirection === dir);

        releasingArrows.forEach(arrow => {
            arrow.isBeingHeld = false;

            // Check if held long enough
            if ((arrow.holdProgress ?? 0) >= 0.98) {
                // Success!
                this.completeHold(arrow);
            } else {
                // Fail - Released Early
                this.handleMiss(arrow); /* "Released Too Early!" */
            }
        });
    }



    handleInput(dir: Direction) {
        if (!this.isPlaying || this.gameOver) return;

        // Visual feedback for button press
        const btn = this.buttons.get(dir);
        if (btn) {
            this.tweens.add({
                targets: btn,
                scale: { from: 0.9, to: 1 },
                duration: 100,
                yoyo: true
            });
        }

        // Tutorial Input Redirect
        if (this.isTutorialActive) {
            this.handleTutorialInput(dir);
            return;
        }

        const currentTime = Date.now() - this.musicStartTime;
        const currentBeatTime = currentTime / this.beatIntervalMs;

        // Find standard arrows near the hit zone
        const hitWindowBeats = (DreamDirectConstants.TIMING.GOOD / this.beatIntervalMs);

        // Filter: Find all arrows in window
        const candidates = this.arrows.filter(a =>
            !a.resolved &&
            !a.isBeingHeld && // Exclude currently held arrows so they don't block new inputs
            Math.abs(a.targetBeatTime - currentBeatTime) <= hitWindowBeats
        );

        if (candidates.length === 0) {
            return;
        }

        // CHORD LOGIC: Find the arrow that matches the INPUT DIRECTION
        // This allows simultaneous inputs (Up + Left) to hit separate arrows
        const targetArrow = candidates.find(a => a.targetDirection === dir);

        if (targetArrow) {
            // Hit logic
            this.processArrowHit(targetArrow, dir, currentBeatTime);
        } else {
            // Check if this input is already "busy" holding another arrow
            // If we are actively holding an arrow with this target direction, 
            // then this input is likely a key repeat or accidental press -> IGNORE IT.
            // Do NOT punish the closest arrow.
            const isHoldingThisDir = this.arrows.some(a => a.isBeingHeld && a.targetDirection === dir);
            if (isHoldingThisDir) {
                return;
            }

            // Miss logic? 
            // Only if closest arrow is NOT a Ghost (Ghost target is opposite, so input != arrow.dir)
            // Actually, a.targetDirection IS calculated.
            // So if I press UP, and there are NO arrows expecting UP, I missed/spammed.
            // For now, simple approach: check if any arrow is 'close' enough to be a "Wrong Direction" miss?
            // "Closest arrow needs DOWN, but I pressed UP" -> Miss?
            // "Closest arrow needs LEFT, I pressed UP" -> Miss?

            // To prevent "mashing", we can find the closest arrow overall and if it's NOT the right direction, punish it?
            // BUT for Chords, there might be Arrow A (Up) and Arrow B (Left).
            // If I press Up, I hit Arrow A.
            // If I press Right... I hit nothing.
            // Closest might be Arrow A. Should checking Arrow A penalize me? 
            // Probably yes, if I press Right when I needed Up/Left.

            // Let's implement a simple "Miss" if there's a hittable arrow but I pressed wrong.
            // Pick closest arrow
            const closest = candidates.reduce((prev, curr) => {
                return Math.abs(curr.targetBeatTime - currentBeatTime) < Math.abs(prev.targetBeatTime - currentBeatTime) ? curr : prev;
            });

            // If I pressed a button that is NOT valid for this arrow...
            // AND there wasn't another arrow that WAS valid...
            // It's a miss on the closest candidate.
            this.handleMiss(closest);
        }
    }

    completeHold(arrow: Arrow) {
        if (arrow.resolved) return;

        // Final Score Bonus
        this.addScore(DreamDirectConstants.SCORE.PERFECT, arrow);
        this.showTimingFeedback(arrow.container.x, arrow.container.y, 'ดีเยี่ยม!', true);
        this.updateStats(arrow.type, true);

        this.sound.play('sfx-correct', { rate: 1.2 });
        this.emitParticles(arrow.container.x, arrow.container.y, 0xFFD700); // Gold

        arrow.resolved = true;
        this.destroyArrow(arrow);
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

        this.currentTutorialType = type;
        this.tutorialsShownThisSession.add(type);

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
        // User Update: Shadow/Fade is now SAME direction. Ghost (White Outline) is OPPOSITE.
        if (['anchor', 'spinner', 'double', 'hold_solid', 'fade'].includes(type)) {
            this.tutorialTargetHelper = 'up'; // Same direction (Demo is UP)
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
            case 'fade': {
                // Morph Animation: Arrow <-> Circle
                // We need independent graphics objects, not children of 'arrowGraphics'
                const arrow = this.add.graphics();
                arrow.fillStyle(DreamDirectConstants.COLORS.FADE, 1);
                this.drawArrowShape(arrow, 0, 0, size, demoDir, true);

                const circle = this.add.graphics();
                circle.fillStyle(DreamDirectConstants.COLORS.FADE, 1);
                circle.fillCircle(0, 0, size * 0.4);
                circle.lineStyle(2, 0xffffff, 1);
                circle.strokeCircle(0, 0, size * 0.4);
                circle.setAlpha(0);
                circle.setScale(0.5);

                // Position them at center
                arrow.setPosition(cx, cy);
                circle.setPosition(cx, cy);

                this.tutorialContainer.add([arrow, circle]);

                // Hide the main placeholder `arrowGraphics` 
                arrowGraphics.clear();

                this.tweens.chain({
                    targets: arrow,
                    loop: -1,
                    tweens: [
                        {
                            targets: arrow,
                            duration: 1000,
                            alpha: 1
                        },
                        {
                            targets: arrow,
                            duration: 500,
                            alpha: 0,
                            scale: 0.5
                        },
                        {
                            targets: circle,
                            duration: 500,
                            alpha: 1,
                            scale: 1,
                            offset: '-=500' // Parallel with previous
                        },
                        {
                            targets: circle,
                            duration: 1000
                        },
                        {
                            targets: circle,
                            duration: 500,
                            alpha: 0,
                            scale: 0.5
                        },
                        {
                            targets: arrow,
                            duration: 500,
                            alpha: 1,
                            scale: 1,
                            offset: '-=500' // Parallel with previous
                        }
                    ]
                });
                break;
            }

            case 'double':
                arrowGraphics.fillStyle(DreamDirectConstants.COLORS.DOUBLE, 1);
                this.drawArrowShape(arrowGraphics, -40, 0, size, demoDir, true);
                this.drawArrowShape(arrowGraphics, 40, 0, size, demoDir, true);
                break;

            case 'hold_solid':
            case 'hold_hollow': {
                const isSolid = type === 'hold_solid';
                const tailColor = isSolid ? DreamDirectConstants.COLORS.HOLD_TAIL_SOLID : DreamDirectConstants.COLORS.HOLD_TAIL_HOLLOW;
                const headColor = isSolid ? DreamDirectConstants.COLORS.HOLD_SOLID : DreamDirectConstants.COLORS.HOLD_HOLLOW;

                // Draw Tail acting as "Upwards" visual (since it falls down)
                const tailHeight = 150;

                // We need a separate graphics for the tail to animate it independently
                const tail = this.add.graphics();
                tail.fillStyle(tailColor, 0.7);
                tail.lineStyle(2, headColor, 0.8);

                // Draw tail centered at cx, cy, extending UP
                tail.setPosition(cx, cy);

                // Initial Draw
                tail.fillRect(-20, -tailHeight, 40, tailHeight);
                tail.strokeRect(-20, -tailHeight, 40, tailHeight);

                this.tutorialContainer.add(tail);

                // Draw Head
                arrowGraphics.lineStyle(6, headColor, 1);
                if (isSolid) {
                    arrowGraphics.fillStyle(headColor, 1);
                    this.drawArrowShape(arrowGraphics, 0, 0, size, demoDir, true);
                } else {
                    this.drawArrowShape(arrowGraphics, 0, 0, size, demoDir, false);
                }

                // ANIMATE TAIL SHRINKING (Scanning effect)
                this.tweens.addCounter({
                    from: 1,
                    to: 0,
                    duration: 2000,
                    repeat: -1,
                    repeatDelay: 500,
                    onUpdate: (tween) => {
                        const progress = tween.getValue() ?? 1; // 1 -> 0
                        const currentH = tailHeight * progress;

                        tail.clear();
                        tail.fillStyle(tailColor, 0.7);
                        tail.lineStyle(2, headColor, 0.8);
                        // Draw shrinking tail
                        tail.fillRect(-20, -currentH, 40, currentH);
                        tail.strokeRect(-20, -currentH, 40, currentH);
                    }
                });
                break;
            }
        }

        // ENTRY ANIMATION
        this.tweens.add({
            targets: this.tutorialContainer,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }

    // REDOING THIS FUNCTION BLOCK TO INCLUDE NEW METHODS AND LOGIC
    handleTutorialInput(dir: Direction) {
        if (!this.tutorialTargetHelper || this.isTutorialResolving) return;

        if (dir === this.tutorialTargetHelper) {
            // Check if this is a HOLD tutorial
            if (this.currentTutorialType && (this.currentTutorialType === 'hold_solid' || this.currentTutorialType === 'hold_hollow')) {
                // START HOLDING
                if (this.isHoldingTutorial) return; // Already holding

                this.isHoldingTutorial = true;
                this.sound.play('sfx-correct', { volume: 0.5 }); // Initial feedback

                const { width, height } = this.scale;

                // Show Progress Bar
                this.tutorialHoldBar = this.add.graphics();
                this.tutorialContainer.add(this.tutorialHoldBar);
                this.tutorialHoldBar.setPosition(width / 2, height / 2 + 100);

                // Progress Tween
                this.tutorialHoldTween = this.tweens.addCounter({
                    from: 0,
                    to: 100,
                    duration: 2000,
                    onUpdate: (tween) => {
                        const val = tween.getValue() ?? 0;
                        this.tutorialHoldBar?.clear();
                        this.tutorialHoldBar?.fillStyle(0xffffff, 0.3);
                        this.tutorialHoldBar?.fillRoundedRect(-100, -10, 200, 20, 10);
                        this.tutorialHoldBar?.fillStyle(0x44ff44, 1);
                        this.tutorialHoldBar?.fillRoundedRect(-100, -10, 200 * (val / 100), 20, 10);
                    },
                    onComplete: () => {
                        this.completeTutorialAction();
                    }
                });

                return;
            }

            // Normal Click (Instant Success)
            this.completeTutorialAction();

        } else {
            // Wrong!
            if (this.isTutorialResolving || this.isHoldingTutorial) return;

            this.sound.play('sfx-wrong');
            this.cameras.main.shake(200, 0.005);
            this.tweens.add({
                targets: this.tutorialContainer,
                x: { from: -5, to: 5 },
                duration: 50,
                yoyo: true,
                repeat: 3
            });
        }
    }

    handleTutorialRelease(dir?: Direction) {
        if (this.isHoldingTutorial && dir === this.tutorialTargetHelper) {
            // RELEASED
            this.isHoldingTutorial = false;

            // Stop Progress
            if (this.tutorialHoldTween) {
                this.tutorialHoldTween.stop();
                this.tutorialHoldTween = undefined;
            }
            if (this.tutorialHoldBar) {
                this.tutorialHoldBar.destroy();
                this.tutorialHoldBar = undefined;
            }

            // Punishment / Feedback?
            // Just reset.
        }
    }

    completeTutorialAction() {
        this.isTutorialResolving = true;
        this.sound.play('sfx-correct');

        if (this.tutorialHoldBar) {
            this.tutorialHoldBar.destroy();
            this.tutorialHoldBar = undefined;
        }

        const { width, height } = this.scale;

        this.emitParticles(width / 2, height / 2, 0x44ff44);

        const feedback = this.add.text(width / 2, height / 2, 'ยอดเยี่ยม!', {
            fontFamily: 'Sarabun, sans-serif',
            fontSize: '80px',
            color: '#44ff44',
            stroke: '#ffffff',
            strokeThickness: 6,
            padding: { top: 20, bottom: 20 }
        }).setOrigin(0.5).setDepth(2000).setScale(0);

        this.tutorialContainer.add(feedback);

        this.tweens.add({
            targets: feedback,
            scale: 1.2,
            duration: 400,
            ease: 'Back.out',
            onComplete: () => {
                this.time.delayedCall(500, () => {
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
                // Since `tutorialsShownThisSession` now has the type, it won't trigger tutorial again.
                // BUT, it might pick a *different* arrow type (e.g. Ghost) 
                // which would be confusing: "I just learned Wiggler, why did a Ghost come?".
                // To fix this: `spawnArrow` needs to retry the SAME type if it was interrupted.
                // OR: `tutorialsShownThisSession.add` happened locally.
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

        // Pulse Visuals on Beat
        const scale = 1 + (0.3 * (1 - this.currentBeat % 1));

        // Spawn arrows
        if (this.arrowsSpawned < this.currentLevelConfig.arrowCount) {
            if (currentBeatFloat >= this.nextArrowBeat) {
                this.spawnArrow();
            }
        }

        // Update arrows
        // Update arrows
        this.updateArrows(elapsed, delta);

        // Check for missed arrows
        this.checkMissedArrows(currentBeatFloat);

        // Update Hold Particles
        // Update Hold Particles
        if (this.holdParticleEmitter) {
            this.updateHoldParticles();
        }

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
        const numberOfArrows = (Math.random() < (this.currentLevelConfig.chordChance || 0)) ? 2 : 1;

        // TRACK ALLOCATED TARGET DIRECTIONS TO PREVENT COLLISIONS
        const allocatedTargets = new Set<Direction>();

        // PRE-FILL ALLOCATED TARGETS WITH ACTIVE ARROWS (Prevent Overlapping Glitch)
        // If an arrow is currently on screen (unresolved), we should not spawn another one targeting the same direction
        // This is strict, but ensures "Hold Down" doesn't conflict with "Tap Down"
        this.arrows.forEach(a => {
            if (!a.resolved) {
                allocatedTargets.add(a.targetDirection);
            }
        });

        // DETERMINE LANES
        // If 2 arrows, use both lanes (0 and 1)
        // If 1 arrow, pick random lane
        const lanes = numberOfArrows === 2 ? [0, 1] : [Phaser.Math.RND.pick([0, 1])];

        for (const lane of lanes) {
            // LANE CHECK: Is this lane busy?
            if (this.nextArrowBeat < this.laneBusyUntilBeat[lane]) {
                continue; // Lane is busy, skip spawn
            }
            // Pick Type
            const arrowType = Phaser.Math.RND.pick(this.currentLevelConfig.arrowTypes);

            // TUTORIAL CHECK: Show ONLY if it's the specific Intro Level for this arrow type
            // AND we haven't shown it yet this session.
            const ARROW_INTRO_LEVELS: Record<string, number> = {
                'anchor': 3,
                'fade': 6,
                'double': 9,
                'wiggler': 11,
                'spinner': 13,
                'hold_solid': 21,
                'hold_hollow': 26
            };

            const introLevel = ARROW_INTRO_LEVELS[arrowType];
            if (introLevel === this.currentLevelConfig.level && !this.tutorialsShownThisSession.has(arrowType)) {
                if (numberOfArrows === 1) { // Only interrupt for single spawns to keep it simple
                    this.startInGameTutorial(arrowType);
                    return;
                }
            }

            // DETERMINE DIRECTION (Retry until valid unique target)
            let direction: Direction;
            let targetDirection: Direction;
            let arrowObj: Arrow | null = null;
            let attempts = 0;

            do {
                direction = Phaser.Math.RND.pick([...DreamDirectConstants.DIRECTIONS]);
                targetDirection = this.calculateTargetDirection(arrowType, direction); // Helper calculates target logic
                attempts++;
            } while (allocatedTargets.has(targetDirection) && attempts < 20);

            // If we failed to find a unique target, skip this arrow (avoid impossible chord)
            if (allocatedTargets.has(targetDirection)) continue;

            allocatedTargets.add(targetDirection);

            // Calculate X based on Lane
            const spawnX = (width / 2) + (lane === 0 ? -this.LANE_OFFSET : this.LANE_OFFSET);

            // Wiggler: Start visually random (but different from final), then lock to final
            let visualDirection = direction;
            if (arrowType === 'wiggler') {
                do {
                    visualDirection = Phaser.Math.RND.pick([...DreamDirectConstants.DIRECTIONS]);
                } while (visualDirection === direction);
            }

            // Create Visuals
            const container = this.createArrowVisual(spawnX, this.spawnY, arrowType, visualDirection);

            arrowObj = {
                container,
                type: arrowType,
                direction: visualDirection, // Start with random visual
                targetDirection,
                spawnBeatTime: this.nextArrowBeat,
                targetBeatTime: this.nextArrowBeat + this.getArrowTravelBeats(),
                resolved: false,
                lane
            };

            // SPECIAL TYPES INIT
            if (arrowType === 'spinner') {
                arrowObj.spinnerCurrentAngle = Phaser.Math.Between(0, 360);
            }
            if (arrowType === 'wiggler') {
                arrowObj.wigglerFinalDirection = direction; // Final Lock Direction (Checked for collision)
                // Target is already set correctly by the loop using calculateTargetDirection (Opposite of Final)
            }
            if (arrowType === 'double') {
                arrowObj.hitsRequired = 2;
            }

            // HOLD ARROWS
            if (arrowType === 'hold_solid' || arrowType === 'hold_hollow') {
                arrowObj.duration = Phaser.Math.Between(2, 4);
                arrowObj.isBeingHeld = false;
                arrowObj.holdProgress = 0;

                // For Hollow Hold, Target is Opposite
                if (arrowType === 'hold_hollow') {
                    arrowObj.targetDirection = this.getOppositeDirection(direction);
                } else {
                    arrowObj.targetDirection = direction;
                }

                // Verify collision for hold arrows too
                if (allocatedTargets.has(arrowObj.targetDirection) && attempts < 20) {
                    // This is complex because we already added it to set.
                    // But logic holds: if we broke loop, we're good.
                }

                // RESERVE LANE
                // Gap of 1 beat after hold ensures clean separation
                this.laneBusyUntilBeat[lane] = this.nextArrowBeat + arrowObj.duration + 1;

                // Visual Tail
                const distancePerBeat = (this.hitZoneY - this.spawnY) / this.getArrowTravelBeats();
                const tailHeight = arrowObj.duration * distancePerBeat;
                arrowObj.visualHeight = tailHeight;

                const tail = container.getAt(0) as Phaser.GameObjects.Graphics;
                tail.clear();

                const isSolid = arrowType === 'hold_solid';
                const tailColor = isSolid ? DreamDirectConstants.COLORS.HOLD_TAIL_SOLID : DreamDirectConstants.COLORS.HOLD_TAIL_HOLLOW;
                const headColor = isSolid ? DreamDirectConstants.COLORS.HOLD_SOLID : DreamDirectConstants.COLORS.HOLD_HOLLOW;

                tail.fillStyle(tailColor, 0.7);
                tail.lineStyle(2, headColor, 0.8);
                // Fix Disconnect: Make tail start at 0 (or slight positive) to overlap head
                // Previously: -30 - tailHeight. Bottom was -30.
                // New: -tailHeight. Bottom is 0.
                tail.fillRect(-10, -tailHeight, 20, tailHeight);
                tail.strokeRect(-10, -tailHeight, 20, tailHeight);
            }

            this.arrows.push(arrowObj);
            this.arrowsSpawned++;
        }

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
                // Ghost (White Outline) is OPPOSITE
                return this.getOppositeDirection(displayDirection);
            case 'anchor':
                // Same as what's shown
                return displayDirection;
            case 'fade':
                // Same as ghost (now SAME)
                return displayDirection;
            case 'spinner':
                // Will be determined dynamically
                return displayDirection;
            case 'wiggler':
                return this.getOppositeDirection(displayDirection);
            case 'double':
                // Same direction
                return displayDirection;

            case 'hold_solid':
                return displayDirection;
            case 'hold_hollow':
                return this.getOppositeDirection(displayDirection);
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



            case 'hold_solid':
            case 'hold_hollow':
                // 1. Draw Tail (Long Rectangle) extending UPWARDS
                const isSolid = type === 'hold_solid';
                const tailColor = isSolid ? DreamDirectConstants.COLORS.HOLD_TAIL_SOLID : DreamDirectConstants.COLORS.HOLD_TAIL_HOLLOW;
                const headColor = isSolid ? DreamDirectConstants.COLORS.HOLD_SOLID : DreamDirectConstants.COLORS.HOLD_HOLLOW;

                const tailGraphic = this.add.graphics();
                tailGraphic.fillStyle(tailColor, 0.7);
                tailGraphic.lineStyle(2, headColor, 0.8);
                // Default placeholder size, updated in spawnArrow
                // Overlap head: Start at -10 (slightly above center) to fill gap
                tailGraphic.fillRect(-10, -130, 20, 130);
                tailGraphic.strokeRect(-10, -130, 20, 130);
                container.add(tailGraphic);

                // 2. Draw Head
                arrowGraphic.lineStyle(4, headColor, 1);
                if (isSolid) {
                    arrowGraphic.fillStyle(headColor, 1);
                    this.drawArrowShape(arrowGraphic, 0, 0, size, direction, true);
                } else {
                    this.drawArrowShape(arrowGraphic, 0, 0, size, direction, false);
                }
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

    updateArrows(elapsed: number, delta: number) {
        const travelTime = this.getArrowTravelBeats() * this.beatIntervalMs;

        this.arrows.forEach(arrow => {
            if (arrow.resolved) return;

            // HOLD LOGIC UPDATE
            if (arrow.isBeingHeld) {
                // Arrow head stays at Hit Zone
                arrow.container.setY(this.hitZoneY);

                // Progress calculation
                // Increment progress based on time
                const durationMs = (arrow.duration || 1) * this.beatIntervalMs;

                // Use REAL delta (ms) for smooth progress
                arrow.holdProgress = (arrow.holdProgress || 0) + (delta / durationMs);

                // Visual: Shrink Tail
                // Tail height was `visualHeight`.
                // Current Height = Original * (1 - Progress)

                // CLAMP Progress to 1 (Max 100%)
                // We do NOT auto-complete anymore. User MUST release key.
                if (arrow.holdProgress > 1) arrow.holdProgress = 1;

                const currentHeight = (arrow.visualHeight || 100) * (1 - arrow.holdProgress);

                // if (currentHeight <= 0) {
                //    // Force complete if done -> NO! AUTO COMPLETE REMOVED
                //    this.completeHold(arrow);
                //    return;
                // }

                // Update Tail Graphics (We need to find the tail in the container)
                // Tail is always at index 0 for holds
                const tail = arrow.container.getAt(0) as Phaser.GameObjects.Graphics;
                tail.clear();

                const isSolid = arrow.type === 'hold_solid';
                const tailColor = isSolid ? DreamDirectConstants.COLORS.HOLD_TAIL_SOLID : DreamDirectConstants.COLORS.HOLD_TAIL_HOLLOW;
                const headColor = isSolid ? DreamDirectConstants.COLORS.HOLD_SOLID : DreamDirectConstants.COLORS.HOLD_HOLLOW;

                tail.fillStyle(tailColor, 0.7);
                tail.lineStyle(2, headColor, 0.8);
                // Draw tail extending UP from head (0,0)
                // Overlap head by ending at +10? or 0? 
                // Head is approx size 50. Center 0,0. Top -25, Bottom 25.
                // Tail extends UP.
                // To connect, tail bottom should be at 0 or slightly positive?
                // Visual Disconnect Fix: Draw slightly lower than -30.
                // Previous: -30 - currentHeight.
                // Head radius ~25.
                // Let's go from -10 (overlap head top) upwards.

                const tailBottomY = 0;
                tail.fillRect(-10, tailBottomY - currentHeight, 20, currentHeight);
                tail.strokeRect(-10, tailBottomY - currentHeight, 20, currentHeight);

                return; // Skip normal movement
            }

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
                    // Lock in final direction based on PRE-ALLOCATED Target
                    const dirToAngle: Record<string, number> = { 'up': 0, 'right': 90, 'down': 180, 'left': 270 };
                    const targetAngle = dirToAngle[arrow.targetDirection] || 0;

                    arrow.container.setRotation(Phaser.Math.DegToRad(targetAngle));
                    arrow.spinnerCurrentAngle = targetAngle;
                }
            }

            // Wiggler direction change
            if (arrow.type === 'wiggler' && progress > 0.6 && arrow.wigglerFinalDirection) {
                // LOCK WIGGLER
                // 1. Stop the wiggle tween
                this.tweens.killTweensOf(arrow.container);

                // 2. Reset X position to LANE center
                const laneX = (this.scale.width / 2) + (arrow.lane === 0 ? -this.LANE_OFFSET : this.LANE_OFFSET);
                arrow.container.setX(laneX);

                // 3. Update Visual to Final Direction
                const graphics = arrow.container.getAt(0) as Phaser.GameObjects.Graphics;
                graphics.clear();

                // Redraw with Final Direction
                graphics.lineStyle(4, DreamDirectConstants.COLORS.WIGGLER, 1);
                this.drawArrowShape(graphics, 0, 0, 60, arrow.wigglerFinalDirection, false);

                // Ensure targetDirection is set (Opposite for Wiggler)
                // arrow.targetDirection = this.getOppositeDirection(arrow.wigglerFinalDirection);
                // Already set in spawn!
            }
        });
    }

    checkMissedArrows(currentBeatFloat: number) {
        const missWindow = 0.5; // Half a beat late = miss

        this.arrows.forEach(arrow => {
            if (arrow.resolved) return;

            // For Hold Arrows that are being held, we extend the deadline
            let deadline = arrow.targetBeatTime + missWindow;

            if (arrow.isBeingHeld && arrow.duration) {
                // If being held, deadline is end of hold
                deadline += arrow.duration;
            }

            if (currentBeatFloat > deadline) {
                this.handleMiss(arrow);
            }
        });
    }

    // NEW Helper to clean up handleInput complexity
    processArrowHit(arrow: Arrow, inputDir: Direction, currentBeatTime: number) {
        const diffMs = Math.abs((arrow.targetBeatTime - currentBeatTime) * this.beatIntervalMs);
        const timingOffset = diffMs;

        // Check if correct direction
        const isCorrect = inputDir === arrow.targetDirection;

        // Track rule switch errors
        if (!isCorrect) {
            const oppositeInput = this.getOppositeDirection(inputDir);
            if ((arrow.type === 'ghost' && inputDir === arrow.direction) ||
                (arrow.type === 'anchor' && oppositeInput === arrow.direction)) {
                this.ruleSwitchErrors++;
            }
        }

        if (isCorrect) {
            // Double Arrow Logic
            if (arrow.type === 'double' && (arrow.hitsRequired ?? 0) > 1) {
                arrow.hitsRequired!--;
                this.showTimingFeedback(arrow.container.x, arrow.container.y, 'อีกครั้ง!', true);
                this.tweens.add({ targets: arrow.container, scale: 0.8, duration: 50, yoyo: true });
                this.flashButton(inputDir);
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

            // HOLD ARROW LOGIC
            if (arrow.type === 'hold_solid' || arrow.type === 'hold_hollow') {
                arrow.isBeingHeld = true;
                // Do NOT destroy. Return early.
                return;
            }

        } else {
            this.handleMiss(arrow);
        }

        // Mark as resolved (if not double arrow hit 1)
        arrow.resolved = true;
        this.destroyArrow(arrow);

        // Button press feedback
        this.flashButton(inputDir);
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
            case 'hold_solid': return this.holdSolidStats;
            case 'hold_hollow': return this.holdHollowStats;
            default: return this.ghostStats;
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

    updateHoldParticles() {
        const heldArrows = this.arrows.filter(a => a.isBeingHeld && !a.resolved);

        if (heldArrows.length > 0) {
            heldArrows.forEach(arrow => {
                // Emit particles at the arrow's current position (head)
                // Container position is the arrow head
                this.holdParticleEmitter.emitParticleAt(arrow.container.x, arrow.container.y);
            });
        }
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
                holdSolidCorrect: this.holdSolidStats.correct,
                holdSolidAttempts: this.holdSolidStats.attempts,
                holdHollowCorrect: this.holdHollowStats.correct,
                holdHollowAttempts: this.holdHollowStats.attempts,
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

        // Redraw hit zone visuals
        this.drawHitZone();

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
