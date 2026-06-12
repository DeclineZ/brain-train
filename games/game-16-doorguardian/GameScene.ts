import * as Phaser from 'phaser';
import {
    CHARACTERS,
    DOORGUARDIAN_LEVELS,
    type CharacterId,
    type CharacterData,
    type DoorGuardianLevelConfig,
} from './levels';

// --- Visitor data for each round ---
interface Visitor {
    character: CharacterData;
    isAbnormal: boolean;
    isAllowed: boolean; // Should the player let them in?
    dialogue: string;
}

export class DoorGuardianGameScene extends Phaser.Scene {
    // --- Game State ---
    protected isPlaying = false;
    protected score = 0;
    protected lives = 3;
    protected maxLives = 3;
    protected currentVisitorIndex = 0;
    protected visitors: Visitor[] = [];
    protected levelConfig!: DoorGuardianLevelConfig;

    // --- Phase State ---
    protected isDoorOpen = false;
    protected isInputLocked = false;
    protected isAnimating = false;

    // --- Timer ---
    protected timerActive = false;
    protected timerStartTime = 0;
    protected timePerVisitor = 0; // 0 = no timer

    // --- UI Elements ---
    protected doorGraphics!: Phaser.GameObjects.Graphics;
    protected doorContainer!: Phaser.GameObjects.Container;
    protected characterContainer!: Phaser.GameObjects.Container;
    protected speechBubbleContainer!: Phaser.GameObjects.Container;
    protected heartsContainer!: Phaser.GameObjects.Container;
    protected scoreText!: Phaser.GameObjects.Text;
    protected timerBar!: Phaser.GameObjects.Graphics;
    protected timerBarBg!: Phaser.GameObjects.Graphics;

    // --- Buttons ---
    protected acceptBtn!: Phaser.GameObjects.Container;
    protected rejectBtn!: Phaser.GameObjects.Container;

    // --- Reference Card Panel ---
    protected cardPanelContainer!: Phaser.GameObjects.Container;
    protected refCardContainer!: Phaser.GameObjects.Container;
    protected currentRefIndex = 0;
    protected isRefTransitioning = false;
    protected refModalDots: Phaser.GameObjects.Arc[] = [];
    protected allowedCharacterIds: string[] = [];
    protected refViewsUsed = 0;

    // --- Stat Tracking ---
    protected correctCount = 0;
    protected abnormalCorrect = 0;
    protected abnormalTotal = 0;

    // --- Background ---
    protected bgContainer!: Phaser.GameObjects.Container;

    // --- Audio ---
    protected soundSuccess!: Phaser.Sound.BaseSound;
    protected soundFail!: Phaser.Sound.BaseSound;
    protected soundKnock!: Phaser.Sound.BaseSound;
    protected soundDoorOpen!: Phaser.Sound.BaseSound;
    protected bgm!: Phaser.Sound.BaseSound;

    // --- Character sprites (loaded images, fallback to procedural) ---
    protected charImageKeys: Set<string> = new Set();

    constructor(key: string = 'DoorGuardianGameScene') {
        super({ key });
    }

    init(data: { level: number }) {
        const regLevel = this.registry.get('level');
        const level = data.level || regLevel || 1;
        this.levelConfig = DOORGUARDIAN_LEVELS[level] || DOORGUARDIAN_LEVELS[1];
        this.timePerVisitor = 0; // User requested no timer

        // Reset state
        this.score = 0;
        this.lives = 3;
        this.maxLives = 3;
        this.currentVisitorIndex = 0;
        this.visitors = [];
        this.isPlaying = false;
        this.isInputLocked = false;
        this.isAnimating = false;
        this.isDoorOpen = false;
        this.timerActive = false;
        this.charImageKeys = new Set();
        this.refViewsUsed = 0;
        this.correctCount = 0;
        this.abnormalCorrect = 0;
        this.abnormalTotal = 0;
    }

    preload() {
        // --- Load sounds (reuse global sounds) ---
        this.load.audio('match-success', '/assets/sounds/cardmatch/match-success.mp3');
        this.load.audio('match-fail', '/assets/sounds/cardmatch/match-fail.mp3');
        this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('level-fail', '/assets/sounds/global/level-fail.mp3');

        // Game-specific sounds (use global if not available)
        this.load.audio('knock', '/assets/game-16-doorguardian/knock.mp3');
        this.load.audio('door-open', '/assets/game-16-doorguardian/door-open.mp3');
        this.load.audio('bgm-doorguardian', '/assets/game-16-doorguardian/bgm.mp3');

        // --- Try to load character images ---
        const allCharIds: CharacterId[] = ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox'];
        for (const id of allCharIds) {
            const char = CHARACTERS[id];
            this.load.image(char.normalSprite, `/assets/game-16-doorguardian/${char.normalSprite}.webp`);
            this.load.image(char.abnormalSprite, `/assets/game-16-doorguardian/${char.abnormalSprite}.webp`);
        }

        // Suppress load errors for missing images (we'll fall back to procedural)
        this.load.on('loaderror', (file: any) => {
            // silently ignore missing images
        });
    }

    create() {
        // Clean up any lingering tweens/timers from previous run
        this.tweens?.killAll();
        this.time?.removeAllEvents();

        const { width, height } = this.scale;

        // Track which images loaded successfully
        const allCharIds: CharacterId[] = ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox'];
        for (const id of allCharIds) {
            const char = CHARACTERS[id];
            if (this.textures.exists(char.normalSprite) &&
                this.textures.get(char.normalSprite).key !== '__MISSING') {
                this.charImageKeys.add(char.normalSprite);
            }
            if (this.textures.exists(char.abnormalSprite) &&
                this.textures.get(char.abnormalSprite).key !== '__MISSING') {
                this.charImageKeys.add(char.abnormalSprite);
            }
        }

        // 1. Background (outdoor view through door)
        this.createBackground();

        // 2. Door
        this.createDoor();

        // 3. HUD (score, hearts)
        this.createHUD();

        // 4. Buttons
        this.createButtons();

        // 5. Reference Card Panel
        this.createReferencePanel();

        // 6. Timer bar
        this.createTimerBar();

        // 7. Audio
        this.setupAudio();
        
        // Stop sounds if scene shuts down (prevents hanging BGM)
        this.events.once('shutdown', () => {
            this.sound.stopAll();
        });

        // 8. Generate visitors for this level
        this.generateVisitors();

        // 9. Handle Resize
        this.scale.on('resize', () => this.handleResize());

        // 10. Start the first round
        this.startRound();
    }


    update(time: number, delta: number) {
        if (!this.isPlaying || !this.timerActive || this.timePerVisitor <= 0) return;

        const elapsed = (Date.now() - this.timerStartTime) / 1000;
        const remaining = this.timePerVisitor - elapsed;
        const pct = remaining / this.timePerVisitor;

        if (pct <= 0) {
            this.timerActive = false;
            this.handleTimeout();
        } else {
            this.drawTimerBar(pct);
        }
    }

    // ============ BACKGROUND ============

    private createBackground() {
        const { width, height } = this.scale;
        this.bgContainer = this.add.container(0, 0);

        // Sky gradient
        const sky = this.add.graphics();
        sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xB8E6FF, 0xB8E6FF, 1);
        sky.fillRect(0, 0, width, height);
        this.bgContainer.add(sky);

        // Sun
        const sun = this.add.circle(width * 0.8, height * 0.12, 40, 0xFFD93D);
        this.bgContainer.add(sun);

        // Clouds
        this.addCloud(width * 0.15, height * 0.1, 0.6);
        this.addCloud(width * 0.55, height * 0.08, 0.8);
        this.addCloud(width * 0.85, height * 0.18, 0.5);

        // Green ground / garden
        const ground = this.add.graphics();
        ground.fillStyle(0x7BC67E, 1);
        ground.fillRect(0, height * 0.55, width, height * 0.45);
        this.bgContainer.add(ground);

        // Garden path
        const path = this.add.graphics();
        path.fillStyle(0xD4A574, 1);
        path.fillRoundedRect(width * 0.3, height * 0.55, width * 0.4, height * 0.45, 0);
        this.bgContainer.add(path);

        // Small flowers
        for (let i = 0; i < 8; i++) {
            const fx = Phaser.Math.Between(20, width - 20);
            const fy = Phaser.Math.Between(height * 0.6, height * 0.9);
            if (fx > width * 0.25 && fx < width * 0.75) continue; // Skip path area
            const flower = this.add.circle(fx, fy, 5, [0xFF69B4, 0xFFD700, 0xFF6347, 0x9370DB][i % 4]);
            this.bgContainer.add(flower);
            const stem = this.add.rectangle(fx, fy + 8, 2, 10, 0x228B22);
            this.bgContainer.add(stem);
        }

        // Trees on edges
        this.addTree(width * 0.08, height * 0.45, 0.7);
        this.addTree(width * 0.92, height * 0.48, 0.6);

        // Door frame (house interior edges)
        const frame = this.add.graphics();
        // Left wall
        frame.fillStyle(0xF5E6CA, 1);
        frame.fillRect(0, 0, width * 0.08, height);
        // Right wall
        frame.fillRect(width * 0.92, 0, width * 0.08, height);
        // Top wall
        frame.fillRect(0, 0, width, height * 0.05);
        // Floor
        frame.fillStyle(0xC4956A, 1);
        frame.fillRect(0, height * 0.92, width, height * 0.08);
        this.bgContainer.add(frame);
    }

    private addCloud(x: number, y: number, scale: number) {
        const cloud = this.add.container(x, y);
        cloud.setScale(scale);
        const g = this.add.graphics();
        g.fillStyle(0xFFFFFF, 0.9);
        g.fillCircle(0, 0, 25);
        g.fillCircle(20, -8, 30);
        g.fillCircle(40, 0, 25);
        cloud.add(g);
        this.bgContainer.add(cloud);

        this.tweens.add({
            targets: cloud,
            x: x + 15,
            duration: 4000 + Math.random() * 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private addTree(x: number, y: number, scale: number) {
        const tree = this.add.container(x, y);
        tree.setScale(scale);
        const g = this.add.graphics();
        g.fillStyle(0x8B4513, 1);
        g.fillRect(-6, 0, 12, 40);
        g.fillStyle(0x228B22, 1);
        g.fillCircle(0, -15, 30);
        g.fillCircle(-15, 5, 22);
        g.fillCircle(15, 5, 22);
        tree.add(g);
        this.bgContainer.add(tree);
    }

    // ============ DOOR ============

    private createDoor() {
        const { width, height } = this.scale;
        this.doorContainer = this.add.container(width / 2, height / 2);

        const doorW = width * 0.75;
        const doorH = height * 0.85;

        this.doorGraphics = this.add.graphics();

        // Draw closed door
        this.drawClosedDoor(doorW, doorH);

        this.doorContainer.add(this.doorGraphics);
        this.doorContainer.setDepth(10);
    }

    private drawClosedDoor(w: number, h: number) {
        this.doorGraphics.clear();

        // Door body
        this.doorGraphics.fillStyle(0x8B6914, 1);
        this.doorGraphics.fillRoundedRect(-w / 2, -h / 2, w, h, 8);

        // Wood grain lines
        this.doorGraphics.lineStyle(1, 0x7A5C0F, 0.3);
        for (let i = 0; i < 6; i++) {
            const y = -h / 2 + 30 + i * (h / 7);
            this.doorGraphics.moveTo(-w / 2 + 20, y);
            this.doorGraphics.lineTo(w / 2 - 20, y);
        }
        this.doorGraphics.strokePath();

        // Door panels (decorative)
        this.doorGraphics.lineStyle(3, 0x7A5C0F, 0.5);
        const panelW = w * 0.35;
        const panelH = h * 0.35;
        // Top panel
        this.doorGraphics.strokeRoundedRect(-panelW / 2, -h / 2 + 30, panelW, panelH, 4);
        // Bottom panel
        this.doorGraphics.strokeRoundedRect(-panelW / 2, h / 2 - panelH - 30, panelW, panelH, 4);

        // Door knob
        this.doorGraphics.fillStyle(0xDAA520, 1);
        this.doorGraphics.fillCircle(w / 2 - 35, 0, 12);
        this.doorGraphics.lineStyle(2, 0xB8860B, 1);
        this.doorGraphics.strokeCircle(w / 2 - 35, 0, 12);

        // Peephole
        this.doorGraphics.fillStyle(0x333333, 1);
        this.doorGraphics.fillCircle(0, -h * 0.22, 6);
        this.doorGraphics.lineStyle(2, 0xDAA520, 1);
        this.doorGraphics.strokeCircle(0, -h * 0.22, 6);
    }

    private animateDoorKnock(callback: () => void) {
        this.isAnimating = true;

        // Play knock sound
        if (this.soundKnock) {
            try { this.soundKnock.play(); } catch (e) { /* ignore */ }
        }

        // Shake the door
        this.tweens.add({
            targets: this.doorContainer,
            x: this.doorContainer.x + 4,
            duration: 50,
            yoyo: true,
            repeat: 5,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Wait a beat then open
                this.time.delayedCall(400, () => {
                    this.animateDoorOpen(callback);
                });
            },
        });
    }

    private animateDoorOpen(callback: () => void) {
        const { width } = this.scale;

        // Play door open sound
        if (this.soundDoorOpen) {
            try { this.soundDoorOpen.play(); } catch (e) { /* ignore */ }
        }

        // Slide door to the left
        this.tweens.add({
            targets: this.doorContainer,
            x: -width * 0.4,
            alpha: 0.3,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.isDoorOpen = true;
                this.isAnimating = false;
                callback();
            },
        });
    }

    private animateDoorClose(callback: () => void) {
        const { width } = this.scale;
        this.isAnimating = true;

        this.tweens.add({
            targets: this.doorContainer,
            x: width / 2,
            alpha: 1,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                this.isDoorOpen = false;
                this.isAnimating = false;
                callback();
            },
        });
    }

    // ============ CHARACTER RENDERING ============

    private showCharacter(visitor: Visitor) {
        const { width, height } = this.scale;

        if (this.characterContainer) {
            this.characterContainer.destroy();
        }

        this.characterContainer = this.add.container(width / 2, height * 0.45);
        this.characterContainer.setDepth(5);

        const spriteKey = visitor.isAbnormal
            ? visitor.character.abnormalSprite
            : visitor.character.normalSprite;

        // Try image first, fall back to procedural
        if (this.charImageKeys.has(spriteKey)) {
            const img = this.add.image(0, 0, spriteKey);
            // Responsive sizing - REDUCED SIZE to avoid overlapping with UI/Choices
            const maxH = height * 0.55;
            const maxW = width * 0.65;
            const scaleF = Math.min(maxW / img.width, maxH / img.height);
            img.setScale(scaleF);
            // Shift character down to be more central but not blocking speech bubble
            img.setY(maxH * 0.1);
            this.characterContainer.add(img);
        } else {
            // Procedural character
            this.drawProceduralCharacter(visitor);
        }

        // Entrance animation
        this.characterContainer.setScale(0);
        this.characterContainer.setAlpha(0);
        this.tweens.add({
            targets: this.characterContainer,
            scale: 1,
            alpha: 1,
            duration: 400,
            ease: 'Back.out',
        });
    }

    private drawProceduralCharacter(visitor: Visitor) {
        const g = this.add.graphics();
        const char = visitor.character;
        const isAbnormal = visitor.isAbnormal;

        // Color palette per character
        const palettes: Record<string, { body: number; head: number; accent: number; abnormalBody?: number; abnormalHead?: number }> = {
            woman: { body: 0xD2B48C, head: 0xFFDBC4, accent: 0x8B4513, abnormalHead: 0x90EE90 },
            man: { body: 0x6495ED, head: 0xFFDBC4, accent: 0x333333 },
            kid: { body: 0xFFD700, head: 0xFFDBC4, accent: 0x4169E1 },
            dog: { body: 0xD2B48C, head: 0xD2B48C, accent: 0x8B4513 },
            cat: { body: 0xFF8C00, head: 0xFF8C00, accent: 0xFFD700 },
            rabbit: { body: 0xFFFFFF, head: 0xFFFFFF, accent: 0xFFB6C1, abnormalHead: 0xFFFFFF },
            bear: { body: 0x8B4513, head: 0x8B4513, accent: 0x654321, abnormalBody: 0x9370DB, abnormalHead: 0x9370DB },
            fox: { body: 0xFF8C00, head: 0xFF8C00, accent: 0xFFD700 },
            alien: { body: 0x32CD32, head: 0x32CD32, accent: 0x00FF00 },
            monster: { body: 0x1E90FF, head: 0x1E90FF, accent: 0xFF4500 },
            ghost: { body: 0xE6E6FA, head: 0xE6E6FA, accent: 0xFFFFFF },
            robot: { body: 0xA9A9A9, head: 0xC0C0C0, accent: 0xFF0000 },
        };

        const p = palettes[char.id] || palettes.woman;
        const bodyColor = (isAbnormal && p.abnormalBody) ? p.abnormalBody : p.body;
        const headColor = (isAbnormal && p.abnormalHead) ? p.abnormalHead : p.head;

        const isAnimal = ['dog', 'cat', 'rabbit', 'bear', 'fox'].includes(char.id);
        const isCreature = ['alien', 'monster', 'ghost', 'robot'].includes(char.id);

        if (isAnimal) {
            this.drawAnimal(g, char.id, bodyColor, headColor, p.accent, isAbnormal);
        } else if (isCreature) {
            this.drawCreature(g, char.id, bodyColor, headColor, p.accent, isAbnormal);
        } else {
            this.drawHuman(g, char.id, bodyColor, headColor, p.accent, isAbnormal);
        }

        this.characterContainer.add(g);
    }

    private drawHuman(g: Phaser.GameObjects.Graphics, id: string, bodyColor: number, headColor: number, accent: number, isAbnormal: boolean) {
        // Body
        g.fillStyle(bodyColor, 1);
        g.fillRoundedRect(-40, 10, 80, 70, 12);

        // Head
        g.fillStyle(headColor, 1);
        g.fillCircle(0, -20, 35);

        // Eyes
        g.fillStyle(0x333333, 1);
        g.fillCircle(-12, -25, 5);
        g.fillCircle(12, -25, 5);

        // Abnormal: third eye for man
        if (isAbnormal && id === 'man') {
            g.fillCircle(0, -35, 5);
        }

        // Abnormal: horns for kid
        if (isAbnormal && id === 'kid') {
            g.fillStyle(0xCC0000, 1);
            g.fillTriangle(-15, -55, -10, -40, -20, -40);
            g.fillTriangle(15, -55, 10, -40, 20, -40);
        }

        // Mouth
        g.lineStyle(2, 0x333333, 1);
        g.beginPath();
        g.moveTo(-8, -10);
        g.lineTo(0, -6);
        g.lineTo(8, -10);
        g.strokePath();

        // Hair
        g.fillStyle(accent, 1);
        if (id === 'woman') {
            // Bun
            g.fillCircle(0, -55, 15);
            g.fillRoundedRect(-35, -45, 70, 15, 8);
        } else if (id === 'man') {
            g.fillRoundedRect(-30, -50, 60, 20, 10);
            // Glasses
            g.lineStyle(2, 0x333333, 1);
            g.strokeCircle(-12, -25, 10);
            g.strokeCircle(12, -25, 10);
            g.moveTo(-2, -25);
            g.lineTo(2, -25);
            g.strokePath();
        } else if (id === 'kid') {
            // Cap
            g.fillStyle(0xFFD700, 1);
            g.fillRoundedRect(-30, -52, 60, 25, 12);
            g.fillRoundedRect(-35, -35, 40, 8, 4);
        }

        // Legs
        g.fillStyle(accent === 0x333333 ? 0x555555 : 0x4169E1, 1);
        g.fillRoundedRect(-30, 80, 24, 40, 8);
        g.fillRoundedRect(6, 80, 24, 40, 8);
    }

    private drawAnimal(g: Phaser.GameObjects.Graphics, id: string, bodyColor: number, headColor: number, accent: number, isAbnormal: boolean) {
        // Body
        g.fillStyle(bodyColor, 1);
        g.fillRoundedRect(-35, 10, 70, 50, 16);

        // Head
        g.fillStyle(headColor, 1);
        g.fillCircle(0, -15, 30);

        // Eyes
        g.fillStyle(0x333333, 1);
        if (isAbnormal && id === 'bear') {
            // 3 eyes
            g.fillCircle(-12, -18, 4);
            g.fillCircle(0, -25, 4);
            g.fillCircle(12, -18, 4);
        } else if (isAbnormal && id === 'rabbit') {
            // Red eyes
            g.fillStyle(0xFF0000, 1);
            g.fillCircle(-10, -18, 4);
            g.fillCircle(10, -18, 4);
        } else {
            g.fillCircle(-10, -18, 4);
            g.fillCircle(10, -18, 4);
        }

        // Eye shine
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(-8, -20, 2);
        g.fillCircle(12, -20, 2);

        // Nose
        g.fillStyle(id === 'cat' ? 0xFFB6C1 : 0x333333, 1);
        if (id === 'dog' || id === 'bear') {
            g.fillCircle(0, -8, 5);
        } else if (id === 'cat') {
            g.fillTriangle(0, -6, -4, -10, 4, -10);
        } else if (id === 'rabbit') {
            g.fillStyle(0xFFB6C1, 1);
            g.fillCircle(0, -8, 4);
        } else if (id === 'fox') {
            g.fillStyle(0x333333, 1);
            g.fillCircle(0, -6, 4);
        }

        // Ears
        if (id === 'dog') {
            g.fillStyle(bodyColor, 1);
            // Floppy ears
            g.fillEllipse(-25, -30, 18, 28);
            g.fillEllipse(25, -30, 18, 28);
        } else if (id === 'cat') {
            g.fillStyle(bodyColor, 1);
            g.fillTriangle(-25, -35, -15, -5, -35, -10);
            g.fillTriangle(25, -35, 15, -5, 35, -10);
            // Inner ear
            g.fillStyle(0xFFB6C1, 1);
            g.fillTriangle(-25, -30, -18, -10, -32, -13);
            g.fillTriangle(25, -30, 18, -10, 32, -13);
        } else if (id === 'rabbit') {
            if (isAbnormal) {
                // Only one ear
                g.fillStyle(headColor, 1);
                g.fillRoundedRect(-8, -65, 16, 40, 8);
                g.fillStyle(accent, 1);
                g.fillRoundedRect(-5, -60, 10, 30, 6);
            } else {
                g.fillStyle(headColor, 1);
                g.fillRoundedRect(-18, -65, 14, 40, 7);
                g.fillRoundedRect(4, -65, 14, 40, 7);
                g.fillStyle(accent, 1);
                g.fillRoundedRect(-15, -60, 8, 30, 4);
                g.fillRoundedRect(7, -60, 8, 30, 4);
            }
        } else if (id === 'bear') {
            g.fillStyle(bodyColor, 1);
            g.fillCircle(-22, -38, 12);
            g.fillCircle(22, -38, 12);
            g.fillStyle(accent, 1);
            g.fillCircle(-22, -38, 7);
            g.fillCircle(22, -38, 7);
        } else if (id === 'fox') {
            g.fillStyle(bodyColor, 1);
            g.fillTriangle(-22, -40, -12, -8, -32, -8);
            g.fillTriangle(22, -40, 12, -8, 32, -8);
            g.fillStyle(0xFFFFFF, 1);
            g.fillTriangle(-22, -35, -15, -12, -29, -12);
            g.fillTriangle(22, -35, 15, -12, 29, -12);
        }

        // Legs (4 or 6)
        g.fillStyle(bodyColor, 1);
        const legCount = (isAbnormal && id === 'dog') ? 6 : 4;
        const spacing = 70 / (legCount / 2 + 1);
        for (let i = 0; i < legCount / 2; i++) {
            const lx = -35 + spacing * (i + 1);
            g.fillRoundedRect(lx - 6, 55, 12, 25, 6);
        }

        // Tail
        if (id === 'fox' && isAbnormal) {
            // No tail (abnormal)
        } else if (id === 'fox') {
            g.fillStyle(bodyColor, 1);
            g.fillEllipse(45, 25, 20, 30);
            g.fillStyle(0xFFFFFF, 1);
            g.fillEllipse(48, 35, 10, 12);
        } else if (id === 'cat') {
            if (isAbnormal) {
                // Split tail
                g.fillStyle(0x6495ED, 1); // Blue cat
                g.lineStyle(4, 0x6495ED, 1);
                g.beginPath();
                g.moveTo(35, 30);
                g.lineTo(50, 10);
                g.strokePath();
                g.beginPath();
                g.moveTo(35, 30);
                g.lineTo(55, 35);
                g.strokePath();
            } else {
                g.lineStyle(4, bodyColor, 1);
                g.beginPath();
                g.moveTo(35, 30);
                g.lineTo(50, 15);
                g.lineTo(55, 25);
                g.strokePath();
            }
        } else if (id === 'dog') {
            g.lineStyle(4, bodyColor, 1);
            g.beginPath();
            g.moveTo(35, 15);
            g.lineTo(45, 0);
            g.strokePath();
        } else if (id === 'rabbit') {
            g.fillStyle(headColor, 1);
            g.fillCircle(30, 40, 8);
        } else if (id === 'bear') {
            g.lineStyle(5, bodyColor, 1);
            g.beginPath();
            g.moveTo(30, 35);
            g.lineTo(38, 25);
            g.strokePath();
        }

        // Whiskers for cat & fox
        if (id === 'cat' || id === 'fox') {
            g.lineStyle(1, 0x333333, 0.5);
            g.beginPath();
            g.moveTo(-15, -8); g.lineTo(-35, -12);
            g.moveTo(-15, -5); g.lineTo(-35, -3);
            g.moveTo(15, -8); g.lineTo(35, -12);
            g.moveTo(15, -5); g.lineTo(35, -3);
            g.strokePath();
        }

        // Fox fangs if abnormal
        if (id === 'fox' && isAbnormal) {
            g.fillStyle(0xFFFFFF, 1);
            g.fillTriangle(-5, -4, -3, 5, -7, 5);
            g.fillTriangle(5, -4, 3, 5, 7, 5);
        }
    }

    private drawCreature(g: Phaser.GameObjects.Graphics, id: string, bodyColor: number, headColor: number, accent: number, isAbnormal: boolean) {
        // Shared basic shape
        g.fillStyle(bodyColor, 1);

        if (id === 'ghost') {
            // Wavy bottom (simplified to jagged)
            g.beginPath();
            g.moveTo(-35, -50); // Top-left
            g.lineTo(35, -50);  // Top-right
            g.lineTo(35, 50);   // Bottom-right
            g.lineTo(17.5, 60); // Jagged point 1
            g.lineTo(0, 50);    // Jagged point 2
            g.lineTo(-17.5, 60); // Jagged point 3
            g.lineTo(-35, 50);  // Bottom-left
            g.closePath(); // Closes path back to (-35, -50)
            g.fillPath();
            // Face
            g.fillStyle(0x000000, 0.6);
            g.fillCircle(-12, -15, 6);
            g.fillCircle(12, -15, 6);
            g.fillEllipse(0, 10, 10, 15);
        }
        else if (id === 'alien') {
            // Body
            g.fillRoundedRect(-25, 10, 50, 60, 10);
            // Head (inverted pear ish)
            g.fillStyle(headColor, 1);
            g.fillEllipse(0, -25, 45, 55);
            // Eyes
            g.fillStyle(0x000000, 1);
            g.fillEllipse(-15, -25, 12, 20); // Big eyes
            g.fillEllipse(15, -25, 12, 20);
            g.fillStyle(0xFFFFFF, 1);
            g.fillCircle(-12, -30, 3);
            g.fillCircle(18, -30, 3);

            if (isAbnormal) {
                // 3rd eye
                g.fillStyle(0x000000, 1);
                g.fillEllipse(0, -45, 10, 15);
                g.fillStyle(0xFFFFFF, 1);
                g.fillCircle(0, -48, 2);
            }
        }
        else if (id === 'monster') {
            // Furry body
            g.fillRoundedRect(-40, -10, 80, 90, 20);
            // Horns
            g.fillStyle(0xFFD700, 1);
            g.fillTriangle(-20, -10, -35, -40, -10, -10);
            g.fillTriangle(20, -10, 35, -40, 10, -10);
            // Face
            g.fillStyle(0xFFFFFF, 1);
            g.fillCircle(0, 20, 15); // One eye
            g.fillStyle(0x333333, 1);
            g.fillCircle(0, 20, 6);
            // Teeth
            g.fillStyle(0xFFFFFF, 1);
            g.fillTriangle(-10, 50, 10, 50, 0, 65);

            if (isAbnormal) {
                // Extra horns
                g.fillStyle(0xFF4500, 1);
                g.fillTriangle(0, -10, 0, -50, 10, -10);
            }
        }
        else if (id === 'robot') {
            // Body
            g.fillStyle(bodyColor, 1);
            g.fillRect(-35, 10, 70, 70);
            // Head
            g.fillStyle(headColor, 1);
            g.fillRect(-25, -40, 50, 45);
            // Eyes (visor)
            g.fillStyle(accent, 1);
            g.fillRect(-20, -25, 40, 10);
            // Antenna
            g.lineStyle(2, 0x333333, 1);
            g.moveTo(0, -40);
            g.lineTo(0, -60);
            g.strokePath();
            g.fillStyle(accent, 1);
            g.fillCircle(0, -60, 4);

            if (isAbnormal) {
                // Broken arm / sparks logic simplified
                g.fillStyle(0xFF0000, 1);
                g.fillRect(-45, 20, 10, 40); // Weird arm
            }
        }
    }

    // ============ SPEECH BUBBLE ============

    private showSpeechBubble(text: string) {
        const { width, height } = this.scale;

        if (this.speechBubbleContainer) {
            this.speechBubbleContainer.destroy();
        }

        this.speechBubbleContainer = this.add.container(width / 2, height * 0.12);
        this.speechBubbleContainer.setDepth(15);

        const bubbleW = Math.min(width * 0.85, 380);
        const fontSize = Math.max(16, Math.min(width * 0.045, 22));

        // Bubble background
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.lineStyle(3, 0xCCCCCC, 1);
        bg.fillRoundedRect(-bubbleW / 2, -35, bubbleW, 70, 20);
        bg.strokeRoundedRect(-bubbleW / 2, -35, bubbleW, 70, 20);

        // Tail triangle
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillTriangle(-10, 35, 10, 35, 0, 50);
        bg.lineStyle(3, 0xCCCCCC, 1);
        bg.moveTo(-10, 35);
        bg.lineTo(0, 50);
        bg.lineTo(10, 35);
        bg.strokePath();

        // Cover the stroke on top of triangle
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillRect(-12, 33, 24, 4);

        this.speechBubbleContainer.add(bg);

        // Text
        const bubbleText = this.add.text(0, 0, text, {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: `${fontSize}px`,
            color: '#333333',
            align: 'center',
            wordWrap: { width: bubbleW - 40 },
        }).setOrigin(0.5).setPadding(5, 10, 5, 10);
        this.speechBubbleContainer.add(bubbleText);

        // Pop-in animation
        this.speechBubbleContainer.setScale(0);
        this.tweens.add({
            targets: this.speechBubbleContainer,
            scale: 1,
            duration: 300,
            ease: 'Back.out',
            delay: 200,
        });
    }

    // ============ HUD ============

    protected createHUD() {
        const { width } = this.scale;

        // Level Indicator (Top Center)
        this.add.text(width / 2, 35, `ด่าน ${this.levelConfig.level}`, {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '32px',
            color: '#6c5ce7',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(100);
    }

    private updateHeartsUI() {
        // No UI in strict mode
    }

    // ============ BUTTONS ============

    private createButtons() {
        const { width, height } = this.scale;
        const btnY = height - 65;
        const btnWidth = width * 0.42;
        const btnHeight = 65;
        const lipDepth = 8;

        // Accept button (green)
        this.acceptBtn = this.create3DButton(
            width * 0.26, btnY, btnWidth, btnHeight, lipDepth,
            'ให้เข้า ✓', 0x55efc4, 0x3EBFA6, true
        );

        // Reject button (red)
        this.rejectBtn = this.create3DButton(
            width * 0.74, btnY, btnWidth, btnHeight, lipDepth,
            'ปฏิเสธ ✗', 0xFF6B6B, 0xE05656, false
        );
    }

    private create3DButton(
        x: number, y: number, w: number, h: number, lip: number,
        label: string, color: number, lipColor: number, isAccept: boolean
    ): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        container.setDepth(50);

        // Lip (shadow)
        const lipG = this.add.graphics();
        lipG.fillStyle(lipColor, 1);
        lipG.fillRoundedRect(-w / 2, -h / 2 + lip, w, h, 16);
        container.add(lipG);

        // Face
        const faceGroup = this.add.container(0, 0);
        const face = this.add.graphics();
        face.fillStyle(color, 1);
        face.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
        faceGroup.add(face);

        // Label
        const textSize = Math.min(w * 0.2, 28);
        const text = this.add.text(0, 0, label, {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: `${textSize}px`,
            fontStyle: '900',
            color: '#FFFFFF',
            shadow: { offsetX: 0, offsetY: 2, color: '#00000044', blur: 3, fill: true, stroke: false },
        }).setOrigin(0.5).setPadding(5, 8, 5, 10);
        faceGroup.add(text);
        container.add(faceGroup);

        // Hit area
        const hitArea = this.add.rectangle(0, lip / 2, w, h + lip, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        container.add(hitArea);

        hitArea.on('pointerdown', () => {
            this.tweens.add({
                targets: faceGroup, y: lip, duration: 50, ease: 'Quad.easeOut',
            });
            this.handleDecision(isAccept);
        });

        hitArea.on('pointerup', () => {
            this.tweens.add({ targets: faceGroup, y: 0, duration: 50, ease: 'Quad.easeOut' });
        });
        hitArea.on('pointerout', () => {
            this.tweens.add({ targets: faceGroup, y: 0, duration: 50, ease: 'Quad.easeOut' });
        });

        return container;
    }

    // ============ REFERENCE CARD PANEL ============
    protected refModalContainer!: Phaser.GameObjects.Container;
    protected isRefModalOpen = false;

    protected createReferencePanel() {
        const { width, height } = this.scale;

        const panelW = 160;
        const panelH = 50;
        const panelX = width - panelW / 2 - 10;
        const panelY = height - 120; // Lower than hearts, higher than buttons
        this.cardPanelContainer = this.add.container(panelX, panelY);
        this.cardPanelContainer.setDepth(60);

        this.allowedCharacterIds = [...this.levelConfig.allowedCharacters];
        
        // Draw the main button
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.lineStyle(2, 0x6c5ce7, 1);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
        this.cardPanelContainer.add(bg);

        // Icon + Text
        const btnText = this.add.text(0, 0, '📋 ดูรายชื่อเข้าได้', {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '18px',
            color: '#6c5ce7',
            fontStyle: 'bold'
        }).setOrigin(0.5).setPadding({ top: 8, bottom: 8 });
        this.cardPanelContainer.add(btnText);

        const hitArea = this.add.rectangle(0, 0, panelW, panelH, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        this.cardPanelContainer.add(hitArea);

        hitArea.on('pointerdown', () => {
            if (this.isRefModalOpen || this.isInputLocked) return;

            const maxViews = this.levelConfig.maxRefViews;
            if (maxViews !== undefined && this.refViewsUsed >= maxViews) {
                // Shake if locked
                this.tweens.add({
                    targets: this.cardPanelContainer, x: panelX + 5, duration: 50, yoyo: true, repeat: 3
                });
                return;
            }

            this.showReferenceModal();
        });
        
        // Update limits text initially
        this.updateRefButtonText();
    }

    private updateRefButtonText() {
        const maxViews = this.levelConfig.maxRefViews;
        if (maxViews === undefined) return;
        
        // Find existing limit text or create it
        let limitText = this.cardPanelContainer.getByName('limitText') as Phaser.GameObjects.Text;
        if (!limitText) {
            limitText = this.add.text(0, -35, '', {
                fontFamily: '"Mali", "Sarabun", sans-serif', fontSize: '14px', color: '#FF6B6B', fontStyle: 'bold'
            }).setOrigin(0.5).setPadding({ top: 5, bottom: 5 }).setName('limitText');
            this.cardPanelContainer.add(limitText);
        }
        
        const remaining = maxViews - this.refViewsUsed;
        if (remaining <= 0) {
            limitText.setText('ใช้โควต้าดูครบแล้ว');
            // Gray out button
            const bg = this.cardPanelContainer.first as Phaser.GameObjects.Graphics;
            bg.clear();
            bg.fillStyle(0xEEEEEE, 0.95);
            bg.lineStyle(2, 0xAAAAAA, 1);
            bg.fillRoundedRect(-80, -25, 160, 50, 12);
            bg.strokeRoundedRect(-80, -25, 160, 50, 12);
            const text = this.cardPanelContainer.list[1] as Phaser.GameObjects.Text;
            text.setColor('#AAAAAA');
        } else {
            limitText.setText(`ดูได้อีก ${remaining} ครั้ง`);
        }
    }

    private populateRefCard(container: Phaser.GameObjects.Container, index: number) {
        const charId = this.allowedCharacterIds[index] as CharacterId;
        const char = CHARACTERS[charId];

        // Character Image (centered in the card container)
        const spriteKey = char.normalSprite;
        const imgY = -25;
        if (this.charImageKeys.has(spriteKey)) {
            const img = this.add.image(0, imgY, spriteKey);
            // Large size: max 150px
            const s = Math.min(150 / img.width, 150 / img.height);
            img.setScale(s);
            container.add(img);
        } else {
            // Draw a beautiful fallback card
            const fallbackBg = this.add.graphics();
            fallbackBg.fillStyle(0xf1f2f6, 1);
            fallbackBg.lineStyle(3, 0x6c5ce7, 1);
            fallbackBg.fillRoundedRect(-60, imgY - 60, 120, 120, 16);
            fallbackBg.strokeRoundedRect(-60, imgY - 60, 120, 120, 16);
            container.add(fallbackBg);

            const fallbackText = this.add.text(0, imgY, '❓', {
                fontSize: '48px'
            }).setOrigin(0.5);
            container.add(fallbackText);
        }

        // Character Name
        const nameText = this.add.text(0, 70, char.name, {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '24px', // Larger font size
            color: '#2d3436', // Dark gray
            fontStyle: 'bold'
        }).setOrigin(0.5).setPadding({ top: 10, bottom: 10 });
        container.add(nameText);
    }

    private animateRefCardTransition(newIndex: number, direction: 'left' | 'right') {
        if (newIndex === this.currentRefIndex || this.isRefTransitioning) return;
        this.isRefTransitioning = true;

        const maxChars = this.allowedCharacterIds.length;
        const slideDistance = 250; // Distance to slide out/in

        // 1. Create a new temporary container for the incoming card
        const incomingCardContainer = this.add.container(0, 0);
        this.populateRefCard(incomingCardContainer, newIndex);
        this.refModalContainer.add(incomingCardContainer);

        // Position incoming container off-screen
        const startX = direction === 'left' ? slideDistance : -slideDistance;
        incomingCardContainer.setX(startX);
        incomingCardContainer.setAlpha(0);

        // 2. Animate outgoing card sliding out and fading out
        const targetX = direction === 'left' ? -slideDistance : slideDistance;
        this.tweens.add({
            targets: this.refCardContainer,
            x: targetX,
            alpha: 0,
            duration: 250,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.refCardContainer.destroy();
            }
        });

        // 3. Animate incoming card sliding in and fading in
        this.tweens.add({
            targets: incomingCardContainer,
            x: 0,
            alpha: 1,
            duration: 250,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.refCardContainer = incomingCardContainer;
                this.currentRefIndex = newIndex;
                this.isRefTransitioning = false;
            }
        });

        // 4. Update dots indicator
        for (let i = 0; i < maxChars; i++) {
            const dot = this.refModalDots[i];
            if (dot) {
                const isActive = i === newIndex;
                this.tweens.add({
                    targets: dot,
                    radius: isActive ? 6 : 4,
                    duration: 150,
                    ease: 'Quad.easeOut'
                });
                dot.setFillStyle(isActive ? 0x6c5ce7 : 0xcccccc);
            }
        }
    }

    private showReferenceModal() {
        this.isRefModalOpen = true;
        this.isRefTransitioning = false;
        this.currentRefIndex = 0;
        this.refModalDots = [];

        const { width, height } = this.scale;

        this.refModalContainer = this.add.container(width / 2, height / 2);
        this.refModalContainer.setDepth(150);

        // Dark overlay
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
            .setInteractive(); // Blocks hits
        this.refModalContainer.add(overlay);

        const maxChars = this.allowedCharacterIds.length;

        // Modal Box
        const modalW = Math.min(width * 0.9, 380);
        const modalH = 430;

        const bgGroup = this.add.container(0, 0);
        
        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillRoundedRect(-modalW / 2 + 5, -modalH / 2 + 5, modalW, modalH, 20);
        bgGroup.add(shadow);
        
        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 1);
        bg.lineStyle(4, 0x6c5ce7, 1); // Purple border
        bg.fillRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 20);
        bg.strokeRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 20);
        bgGroup.add(bg);
        
        this.refModalContainer.add(bgGroup);

        // Title
        const titleText = this.add.text(0, -modalH / 2 + 40, 'ผู้ที่ได้รับอนุญาตให้เข้าวันนี้', {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '22px', color: '#333333', fontStyle: 'bold'
        }).setOrigin(0.5).setPadding({ top: 10, bottom: 10 });
        this.refModalContainer.add(titleText);

        // Create Container for the Card Content (Image + Name)
        this.refCardContainer = this.add.container(0, 0);
        this.refModalContainer.add(this.refCardContainer);

        // Navigation Arrows
        const leftBtnX = -modalW / 2 + 45;
        const arrowY = -15; // Centered with image
        const leftArrowBtn = this.add.container(leftBtnX, arrowY);
        
        const leftArrowBg = this.add.graphics();
        leftArrowBg.fillStyle(0xFFFFFF, 1);
        leftArrowBg.lineStyle(3, 0x6c5ce7, 1);
        leftArrowBg.fillCircle(0, 0, 22);
        leftArrowBg.strokeCircle(0, 0, 22);
        leftArrowBtn.add(leftArrowBg);

        const leftArrowIcon = this.add.text(0, 0, '◀', {
            fontFamily: 'sans-serif', fontSize: '18px', color: '#6c5ce7'
        }).setOrigin(0.5);
        leftArrowBtn.add(leftArrowIcon);

        const leftArrowHit = this.add.circle(0, 0, 22, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        leftArrowBtn.add(leftArrowHit);

        leftArrowHit.on('pointerdown', () => {
            if (this.isRefTransitioning) return;
            const newIndex = (this.currentRefIndex - 1 + maxChars) % maxChars;
            this.animateRefCardTransition(newIndex, 'right');
        });
        
        leftArrowHit.on('pointerover', () => {
            this.tweens.add({ targets: leftArrowBtn, scale: 1.1, duration: 100 });
        });
        leftArrowHit.on('pointerout', () => {
            this.tweens.add({ targets: leftArrowBtn, scale: 1.0, duration: 100 });
        });

        this.refModalContainer.add(leftArrowBtn);

        // Right Arrow Button
        const rightBtnX = modalW / 2 - 45;
        const rightArrowBtn = this.add.container(rightBtnX, arrowY);
        
        const rightArrowBg = this.add.graphics();
        rightArrowBg.fillStyle(0xFFFFFF, 1);
        rightArrowBg.lineStyle(3, 0x6c5ce7, 1);
        rightArrowBg.fillCircle(0, 0, 22);
        rightArrowBg.strokeCircle(0, 0, 22);
        rightArrowBtn.add(rightArrowBg);

        const rightArrowIcon = this.add.text(0, 0, '▶', {
            fontFamily: 'sans-serif', fontSize: '18px', color: '#6c5ce7'
        }).setOrigin(0.5);
        rightArrowBtn.add(rightArrowIcon);

        const rightArrowHit = this.add.circle(0, 0, 22, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        rightArrowBtn.add(rightArrowHit);

        rightArrowHit.on('pointerdown', () => {
            if (this.isRefTransitioning) return;
            const newIndex = (this.currentRefIndex + 1) % maxChars;
            this.animateRefCardTransition(newIndex, 'left');
        });

        rightArrowHit.on('pointerover', () => {
            this.tweens.add({ targets: rightArrowBtn, scale: 1.1, duration: 100 });
        });
        rightArrowHit.on('pointerout', () => {
            this.tweens.add({ targets: rightArrowBtn, scale: 1.0, duration: 100 });
        });

        this.refModalContainer.add(rightArrowBtn);

        // Page Dots Indicator
        const dotY = 110;
        const dotSpacing = 16;
        const dotsTotalW = (maxChars - 1) * dotSpacing;
        const dotsStartX = -dotsTotalW / 2;

        for (let i = 0; i < maxChars; i++) {
            const dotX = dotsStartX + i * dotSpacing;
            const isActive = i === 0;
            const dot = this.add.arc(dotX, dotY, isActive ? 6 : 4, 0, 360, false, isActive ? 0x6c5ce7 : 0xcccccc);
            dot.setFillStyle(isActive ? 0x6c5ce7 : 0xcccccc);
            this.refModalContainer.add(dot);
            this.refModalDots.push(dot);
        }

        // Close Button
        const closeBtnW = 180;
        const closeBtnH = 50;
        const btnContainer = this.add.container(0, modalH / 2 - 45);
        
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x6c5ce7, 1);
        btnBg.fillRoundedRect(-closeBtnW / 2, -closeBtnH / 2, closeBtnW, closeBtnH, 14);
        btnContainer.add(btnBg);

        const closeText = this.add.text(0, 0, 'จำได้แล้ว (ปิด)', {
            fontFamily: '"Mali", "Sarabun", sans-serif', fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold'
        }).setOrigin(0.5).setPadding({ top: 10, bottom: 10 });
        btnContainer.add(closeText);

        const closeHit = this.add.rectangle(0, 0, closeBtnW, closeBtnH, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        btnContainer.add(closeHit);

        // Button press animation
        closeHit.on('pointerdown', () => {
            closeHit.disableInteractive();
            this.tweens.add({
                targets: btnContainer,
                scale: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: () => this.closeReferenceModal()
            });
        });

        this.refModalContainer.add(btnContainer);

        // Drag / Swipe Gestures on Overlay
        let dragStartX = 0;
        overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            dragStartX = pointer.x;
        });
        overlay.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.isRefTransitioning) return;
            const dragDiff = pointer.x - dragStartX;
            if (dragDiff > 50) {
                const newIndex = (this.currentRefIndex - 1 + maxChars) % maxChars;
                this.animateRefCardTransition(newIndex, 'right');
            } else if (dragDiff < -50) {
                const newIndex = (this.currentRefIndex + 1) % maxChars;
                this.animateRefCardTransition(newIndex, 'left');
            }
        });

        // Initialize first card
        this.populateRefCard(this.refCardContainer, 0);

        // Entrance Animation
        this.refModalContainer.setScale(0);
        this.tweens.add({
            targets: this.refModalContainer, scale: 1, duration: 300, ease: 'Back.out'
        });
    }

    private closeReferenceModal() {
        this.tweens.add({
            targets: this.refModalContainer, scale: 0, duration: 200, ease: 'Back.in',
            onComplete: () => {
                this.refModalContainer.destroy();
                this.isRefModalOpen = false;
                this.refModalDots = [];
                
                // Increment view and update UI
                this.refViewsUsed++;
                this.updateRefButtonText();
            }
        });
    }

    // ============ TIMER BAR ============

    private createTimerBar() {
        const { width, height } = this.scale;

        this.timerBarBg = this.add.graphics();
        this.timerBarBg.setDepth(40);
        this.timerBar = this.add.graphics();
        this.timerBar.setDepth(41);

        if (this.timePerVisitor <= 0) {
            this.timerBarBg.setVisible(false);
            this.timerBar.setVisible(false);
        }
    }

    private drawTimerBar(pct: number) {
        const { width, height } = this.scale;
        const barW = width * 0.7;
        const barH = 10;
        const barX = width * 0.15;
        const barY = height * 0.95;

        this.timerBarBg.clear();
        this.timerBarBg.fillStyle(0xDDDDDD, 0.5);
        this.timerBarBg.fillRoundedRect(barX, barY, barW, barH, 5);

        this.timerBar.clear();
        const color = pct > 0.3 ? 0x55efc4 : pct > 0.15 ? 0xffeaa7 : 0xFF6B6B;
        this.timerBar.fillStyle(color, 1);
        this.timerBar.fillRoundedRect(barX, barY, barW * pct, barH, 5);
    }

    // ============ AUDIO ============

    private setupAudio() {
        try {
            this.soundSuccess = this.sound.add('match-success');
        } catch (e) { /* ignore */ }
        try {
            this.soundFail = this.sound.add('match-fail');
        } catch (e) { /* ignore */ }
        try {
            this.soundKnock = this.sound.add('knock');
        } catch (e) { /* ignore */ }
        try {
            this.soundDoorOpen = this.sound.add('door-open');
        } catch (e) { /* ignore */ }
        try {
            this.bgm = this.sound.add('bgm-doorguardian', { loop: true, volume: 0.4 });
        } catch (e) { /* ignore */ }
    }

    // ============ GAME LOGIC ============

    protected generateVisitors() {
        const config = this.levelConfig;
        const pool = config.characterPool as CharacterId[];
        const allowedPool = config.allowedCharacters as CharacterId[];
        const notAllowedPool = pool.filter(id => !allowedPool.includes(id));

        const targetTotal = config.totalVisitors;
        const generated: Visitor[] = [];

        // Determine targets for balance: ~40-45% allowed
        let targetAllowed = Math.floor(targetTotal * 0.45);
        if (targetAllowed === 0 && targetTotal > 0) targetAllowed = 1;
        
        let targetAbnormal = config.guaranteedAbnormal || 0;
        // Ensure we don't exceed total with guaranteed
        if (targetAbnormal + targetAllowed > targetTotal) {
            targetAbnormal = targetTotal - targetAllowed;
        }

        const typeList: number[] = []; // 1: Allowed, 2: Abnormal, 3: Normal NotAllowed
        for (let i = 0; i < targetAllowed; i++) typeList.push(1);
        for (let i = 0; i < targetAbnormal; i++) typeList.push(2);

        // Fill the rest randomly
        while (typeList.length < targetTotal) {
            const isAbnormal = Math.random() < (config.abnormalChance || 0);
            if (isAbnormal) {
                typeList.push(2);
            } else {
                if (notAllowedPool.length > 0 && Math.random() < 0.5) {
                    typeList.push(3);
                } else {
                    typeList.push(1);
                }
            }
        }

        // Shuffle the types
        Phaser.Utils.Array.Shuffle(typeList);

        let previousCharId: CharacterId | null = null;
        const getCharFromPool = (srcPool: CharacterId[]) => {
            if (srcPool.length === 0) return pool[Math.floor(Math.random() * pool.length)];
            let charId: CharacterId;
            let attempts = 0;
            do {
                charId = srcPool[Math.floor(Math.random() * srcPool.length)];
                attempts++;
            } while (charId === previousCharId && attempts < 10 && srcPool.length > 1);
            previousCharId = charId;
            return charId;
        };

        for (const type of typeList) {
            let charId: CharacterId;
            let isAbnormal = false;
            let isAllowed = false;

            if (type === 1) { // Allowed
                charId = getCharFromPool(allowedPool);
                isAbnormal = false;
                isAllowed = true;
            } else if (type === 2) { // Abnormal
                charId = getCharFromPool(pool);
                isAbnormal = true;
                isAllowed = false;
            } else { // Normal NotAllowed
                charId = getCharFromPool(notAllowedPool);
                isAbnormal = false;
                isAllowed = false;
            }

            const character = CHARACTERS[charId];
            const dialogues = isAbnormal ? character.abnormalDialogue : character.normalDialogue;
            const dialogue = dialogues[Math.floor(Math.random() * dialogues.length)];

            generated.push({ character, isAbnormal, isAllowed, dialogue });
        }

        this.visitors = generated;
    }

    protected startRound() {
        this.isPlaying = true;
        this.currentVisitorIndex = 0;

        // Start BGM
        if (this.bgm) {
            try {
                this.sound.stopAll();
                this.bgm.play();
            } catch (e) { /* ignore */ }
        }

        // Show first visitor
        this.showNextVisitor();
    }

    protected showNextVisitor() {
        if (this.currentVisitorIndex >= this.visitors.length) {
            this.onLevelComplete();
            return;
        }

        if (this.lives <= 0) {
            this.onGameOver();
            return;
        }

        // Safety: kill any lingering door tweens to prevent stuck state
        if (this.doorContainer) {
            this.tweens.killTweensOf(this.doorContainer);
        }

        this.isInputLocked = true;
        this.isAnimating = false;
        this.timerActive = false;

        const visitor = this.visitors[this.currentVisitorIndex];

        // 1. Show closed door
        if (this.isDoorOpen) {
            this.animateDoorClose(() => {
                // Hide character
                if (this.characterContainer) this.characterContainer.setVisible(false);
                if (this.speechBubbleContainer) this.speechBubbleContainer.setVisible(false);

                // 2. Knock and open
                this.time.delayedCall(300, () => {
                    this.animateDoorKnock(() => {
                        this.revealVisitor(visitor);
                    });
                });
            });
        } else {
            // First visitor - door already closed
            this.time.delayedCall(500, () => {
                this.animateDoorKnock(() => {
                    this.revealVisitor(visitor);
                });
            });
        }
    }

    protected revealVisitor(visitor: Visitor) {
        // Show character
        this.showCharacter(visitor);

        // Show speech bubble
        this.time.delayedCall(300, () => {
            this.showSpeechBubble(visitor.dialogue);
        });

        // Enable input
        this.time.delayedCall(500, () => {
            this.isInputLocked = false;

            // Start timer if applicable
            if (this.timePerVisitor > 0) {
                this.timerActive = true;
                this.timerStartTime = Date.now();
                this.timerBarBg.setVisible(true);
                this.timerBar.setVisible(true);
            }
        });
    }

    protected handleDecision(allowIn: boolean) {
        if (this.isInputLocked || this.isAnimating || !this.isPlaying) return;
        this.isInputLocked = true;
        this.timerActive = false;

        const visitor = this.visitors[this.currentVisitorIndex];
        const isCorrect = allowIn === visitor.isAllowed;

        if (isCorrect) {
            this.handleCorrect();
        } else {
            this.handleWrong();
        }
    }

    protected handleCorrect() {
        this.score += 100;
        this.correctCount++;

        // Track abnormal identification
        const visitor = this.visitors[this.currentVisitorIndex];
        if (visitor.isAbnormal) {
            this.abnormalCorrect++;
        }

        // Play success sound
        if (this.soundSuccess) {
            try { this.soundSuccess.play(); } catch (e) { /* ignore */ }
        }

        // Flash green
        this.showFeedback(true);

        // Score popup
        this.showPointPopup(100);

        // Next visitor
        this.time.delayedCall(800, () => {
            this.currentVisitorIndex++;
            this.showNextVisitor();
        });
    }

    protected handleWrong() {
        this.lives--;
        this.updateHeartsUI();

        // Play fail sound
        if (this.soundFail) {
            try { this.soundFail.play(); } catch (e) { /* ignore */ }
        }

        // Flash red
        this.showFeedback(false);

        // Shake character
        if (this.characterContainer) {
            this.tweens.add({
                targets: this.characterContainer,
                x: this.characterContainer.x + 8,
                duration: 50,
                yoyo: true,
                repeat: 3,
            });
        }

        this.time.delayedCall(800, () => {
            if (this.lives <= 0) {
                this.onGameOver();
            } else {
                this.currentVisitorIndex++;
                this.showNextVisitor();
            }
        });
    }

    private handleTimeout() {
        // Treating timeout as wrong
        this.lives--;
        this.updateHeartsUI();

        if (this.soundFail) {
            try { this.soundFail.play(); } catch (e) { /* ignore */ }
        }

        this.showFeedback(false);

        // Show "หมดเวลา!" text
        const { width, height } = this.scale;
        const timeoutText = this.add.text(width / 2, height / 2, '⏰ หมดเวลา!', {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#FF6B6B',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: timeoutText,
            alpha: 0,
            y: height / 2 - 50,
            duration: 800,
            onComplete: () => timeoutText.destroy(),
        });

        this.time.delayedCall(800, () => {
            if (this.lives <= 0) {
                this.onGameOver();
            } else {
                this.currentVisitorIndex++;
                this.showNextVisitor();
            }
        });
    }

    protected showFeedback(isCorrect: boolean) {
        const { width, height } = this.scale;

        const overlay = this.add.rectangle(width / 2, height / 2, width, height,
            isCorrect ? 0x55efc4 : 0xFF6B6B, 0.3
        ).setDepth(150);

        this.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 400,
            onComplete: () => overlay.destroy(),
        });
    }

    private showPointPopup(points: number) {
        const { width, height } = this.scale;

        const popup = this.add.text(width / 2, height * 0.35, `+${points}`, {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#55efc4',
            stroke: '#FFFFFF',
            strokeThickness: 5,
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: popup,
            y: popup.y - 60,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => popup.destroy(),
        });
    }

    // ============ GAME END ============

    // ============ GAME END ============

    private calculateStars(): number {
        const mistakes = this.maxLives - this.lives;
        if (mistakes === 0) return 3;
        if (mistakes === 1) return 2;
        return 1; // 2 mistakes but still completed
    }

    private onLevelComplete() {
        this.isPlaying = false;
        this.timerActive = false;

        const stars = this.calculateStars();

        // Count total abnormal visitors
        this.abnormalTotal = this.visitors.filter(v => v.isAbnormal).length;

        // Calculate Stats (0-100 scale)
        // Focus: overall accuracy
        const totalDecisions = this.visitors.length;
        const stat_focus = totalDecisions > 0
            ? Math.round((this.correctCount / totalDecisions) * 100)
            : 0;

        // Visual: ability to spot abnormal characters
        const stat_visual = this.abnormalTotal > 0
            ? Math.round(60 + (this.abnormalCorrect / this.abnormalTotal) * 40)
            : 100; // If no abnormals, full marks

        console.log(`DoorGuardian Stats — Focus: ${stat_focus}, Visual: ${stat_visual}, Correct: ${this.correctCount}/${totalDecisions}, Abnormal: ${this.abnormalCorrect}/${this.abnormalTotal}`);

        // Emit game over data to system
        this.time.delayedCall(500, () => {
            // Stop BGM to prevent hanging
            if (this.bgm) { try { this.bgm.stop(); } catch (e) { /* ignore */ } }
            
            // Play success sound
            if (this.soundSuccess) {
                try { this.sound.play('level-pass'); } catch (e) { /* ignore */ }
            }

            const onGameOver = this.game.registry.get('onGameOver');
            if (onGameOver) {
                onGameOver({
                    success: true,
                    level: this.levelConfig.level,
                    stars: stars,
                    score: this.score,
                    stat_focus,
                    stat_visual,
                    stat_memory: null,
                    stat_speed: null,
                    stat_planning: null,
                    stat_emotion: null,
                });
            }
        });
    }

    private onGameOver() {
        this.isPlaying = false;
        this.timerActive = false;

        // Count total abnormal visitors
        this.abnormalTotal = this.visitors.filter(v => v.isAbnormal).length;

        // Calculate Stats even on fail
        const totalDecisions = this.currentVisitorIndex + 1; // Include the failed one
        const stat_focus = totalDecisions > 0
            ? Math.round((this.correctCount / totalDecisions) * 100)
            : 0;
        const stat_visual = this.abnormalTotal > 0
            ? Math.round(60 + (this.abnormalCorrect / this.abnormalTotal) * 40)
            : 100;

        console.log(`DoorGuardian Stats (fail) — Focus: ${stat_focus}, Visual: ${stat_visual}, Correct: ${this.correctCount}/${totalDecisions}, Abnormal: ${this.abnormalCorrect}/${this.abnormalTotal}`);

        this.time.delayedCall(500, () => {
            // Stop BGM to prevent hanging
            if (this.bgm) { try { this.bgm.stop(); } catch (e) { /* ignore */ } }
            
            // Play fail sound
            if (this.soundFail) {
                try { this.sound.play('level-fail'); } catch (e) { /* ignore */ }
            }

            const onGameOver = this.game.registry.get('onGameOver');
            if (onGameOver) {
                onGameOver({
                    success: false,
                    level: this.levelConfig.level,
                    score: this.score,
                    stars: 0,
                    stat_focus,
                    stat_visual,
                    stat_memory: null,
                    stat_speed: null,
                    stat_planning: null,
                    stat_emotion: null,
                });
            }
        });
    }

    // ============ RESIZE ============

    private handleResize() {
        // Re-layout is handled by next round since positions are calculated dynamically
    }
}
