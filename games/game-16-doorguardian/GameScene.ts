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
    protected cardIndex = 0;
    protected allowedCharacterIds: string[] = [];
    protected refViewsUsed = 0;

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
        this.lives = 1; // Strict mode: 1 life
        this.maxLives = 1;
        this.currentVisitorIndex = 0;
        this.visitors = [];
        this.isPlaying = false;
        this.isInputLocked = false;
        this.isAnimating = false;
        this.timerActive = false;
        this.charImageKeys = new Set();
        this.refViewsUsed = 0;
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

    protected createReferencePanel() {
        const { width, height } = this.scale;

        const panelW = 230;
        const panelH = 260;
        const panelX = width - panelW / 2 - 10;
        const panelY = height - 220;
        this.cardPanelContainer = this.add.container(panelX, panelY);
        this.cardPanelContainer.setDepth(60);

        this.allowedCharacterIds = [...this.levelConfig.allowedCharacters];
        this.cardIndex = 0;

        this.drawReferenceCard();

        // Make it clickable
        const hitArea = this.add.rectangle(0, 0, panelW + 10, panelH + 10, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        this.cardPanelContainer.add(hitArea);

        hitArea.on('pointerdown', () => {
            const maxViews = this.levelConfig.maxRefViews;
            if (maxViews !== undefined && this.refViewsUsed >= maxViews) {
                // Cannot view anymore
                // Shake the panel
                this.tweens.add({
                    targets: this.cardPanelContainer,
                    x: panelX + 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                });
                return;
            }

            this.refViewsUsed++;
            this.cardIndex = (this.cardIndex + 1) % this.allowedCharacterIds.length;
            this.drawReferenceCard();

            // Slide animation
            this.tweens.add({
                targets: this.cardPanelContainer,
                x: panelX + 5,
                duration: 80,
                yoyo: true,
                ease: 'Sine.easeInOut',
            });
        });
    }

    private drawReferenceCard() {
        // Remove old card graphics (keep the hitArea)
        const children = this.cardPanelContainer.getAll();
        children.forEach((child: any) => {
            if (child.type !== 'Rectangle') child.destroy();
        });

        const cardW = 210;
        const cardH = 230;

        // Check view limit
        const maxViews = this.levelConfig.maxRefViews;
        if (maxViews !== undefined && this.refViewsUsed >= maxViews) {
            // Show "Locked" state
            const bg = this.add.graphics();
            bg.fillStyle(0xEEEEEE, 0.95);
            bg.lineStyle(3, 0x888888, 1);
            bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
            bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
            this.cardPanelContainer.add(bg);

            const lockText = this.add.text(0, 0, 'จำไว้ให้ดีนะ!', {
                fontFamily: '"Mali", "Sarabun", sans-serif',
                fontSize: '24px',
                color: '#555555',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.cardPanelContainer.add(lockText);

            const subText = this.add.text(0, 40, '(ดูครบโควต้าแล้ว)', {
                fontFamily: '"Mali", "Sarabun", sans-serif',
                fontSize: '18px',
                color: '#888888',
            }).setOrigin(0.5);
            this.cardPanelContainer.add(subText);
            return;
        }

        const charId = this.allowedCharacterIds[this.cardIndex] as CharacterId;
        const char = CHARACTERS[charId];

        // Card background
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.lineStyle(3, 0xDDDDDD, 1);
        bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
        bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
        this.cardPanelContainer.add(bg);

        // Character image (use normal sprite)
        const spriteKey = char.normalSprite;
        if (this.charImageKeys.has(spriteKey)) {
            const img = this.add.image(0, -30, spriteKey); // Moved up
            const s = Math.min(180 / img.width, 150 / img.height); // Reduced max height
            img.setScale(s);
            this.cardPanelContainer.add(img);
        } else {
            // Mini procedural character
            const miniG = this.add.graphics();
            miniG.setScale(1.0);
            this.cardPanelContainer.add(miniG);

            // Simple mini avatar
            const palette: Record<string, number> = {
                woman: 0xD2B48C, man: 0x6495ED, kid: 0xFFD700,
                dog: 0xD2B48C, cat: 0xFF8C00, rabbit: 0xFFFFFF,
                bear: 0x8B4513, fox: 0xFF8C00,
                alien: 0x32CD32, monster: 0x1E90FF, ghost: 0xE6E6FA, robot: 0xC0C0C0
            };
            const col = palette[charId] || 0xCCCCCC;
            miniG.fillStyle(col, 1);
            miniG.fillCircle(0, -30, 20);
            miniG.fillRoundedRect(-18, -5, 36, 35, 8);
        }

        // Name
        const nameText = this.add.text(0, cardH / 2 - 25, char.name, { // Moved down slightly
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#555555',
        }).setOrigin(0.5).setPadding({ top: 10, bottom: 5, left: 5, right: 5 });
        this.cardPanelContainer.add(nameText);

        // Dots indicator
        const totalDots = this.allowedCharacterIds.length;
        const dotStartX = -(totalDots - 1) * 8;
        for (let i = 0; i < totalDots; i++) {
            const dot = this.add.circle(dotStartX + i * 16, cardH / 2 - 5, 5,
                i === this.cardIndex ? 0x6c5ce7 : 0xCCCCCC);
            this.cardPanelContainer.add(dot);
        }

        // Swipe arrow hint OR views remaining
        if (maxViews !== undefined) {
            const remaining = maxViews - this.refViewsUsed;
            const limitText = this.add.text(cardW / 2 - 5, -cardH / 2 + 15, `${remaining}`, {
                fontSize: '16px', color: '#FF6B6B', fontStyle: 'bold'
            }).setOrigin(1, 0);
            this.cardPanelContainer.add(limitText);
        }

        const arrow = this.add.text(cardW / 2 + 5, -10, '↔', {
            fontSize: '18px', color: '#AAAAAA',
        }).setOrigin(0.5);
        this.cardPanelContainer.add(arrow);

        // Pulse the arrow
        this.tweens.add({
            targets: arrow,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
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
        this.visitors = [];
        const config = this.levelConfig;
        const pool = config.characterPool as CharacterId[];
        const allowedSet = new Set(config.allowedCharacters);

        // Count how many guaranteed abnormals
        let abnormalCount = config.guaranteedAbnormal || 0;
        // Remaining visitors
        let remaining = config.totalVisitors - abnormalCount;
        if (remaining < 0) { abnormalCount = config.totalVisitors; remaining = 0; }

        const generated: Visitor[] = [];
        let previousCharId: CharacterId | null = null;

        // Helper to get random char that isn't previous (reduce repetition)
        const getChar = () => {
            let charId: CharacterId;
            let attempts = 0;
            do {
                charId = pool[Math.floor(Math.random() * pool.length)];
                attempts++;
            } while (charId === previousCharId && attempts < 10);
            previousCharId = charId;
            return charId;
        };

        // 1. Generate guaranteed abnormals
        for (let i = 0; i < abnormalCount; i++) {
            const charId = getChar();
            const character = CHARACTERS[charId];
            // Abnormal guaranteed
            // Use abnormal dialogue
            const dialogues = character.abnormalDialogue;
            const dialogue = dialogues[Math.floor(Math.random() * dialogues.length)];

            generated.push({
                character,
                isAbnormal: true,
                isAllowed: false, // Abnormal is ALWAYS not allowed 
                dialogue
            });
        }

        // 2. Generate remaining (mix of normal allowed/not allowed + chance of extra abnormal)
        for (let i = 0; i < remaining; i++) {
            const charId = getChar();
            const character = CHARACTERS[charId];
            const isInAllowed = allowedSet.has(charId);

            // Chance for extra abnormal?
            const isAbnormal = Math.random() < (config.abnormalChance || 0);

            // Final decision: Allowed ONLY if In Allowed List AND Normal
            const isAllowed = isInAllowed && !isAbnormal;

            const dialogues = isAbnormal ? character.abnormalDialogue : character.normalDialogue;
            const dialogue = dialogues[Math.floor(Math.random() * dialogues.length)];

            generated.push({ character, isAbnormal, isAllowed, dialogue });
        }

        // Shuffle the visitors
        Phaser.Utils.Array.Shuffle(generated);
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

        this.isInputLocked = true;
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
        // Score text removed in strict mode

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

    private showFeedback(isCorrect: boolean) {
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
        // Strict mode logic: If you pass, you get 3 stars
        // (Since 1 mistake = fail, passing implies perfection)
        return 3;
    }

    private onLevelComplete() {
        this.isPlaying = false;
        this.timerActive = false;

        const stars = this.calculateStars();

        // Emit game over data to system
        this.time.delayedCall(500, () => {
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
                    livesRemaining: this.lives,
                    totalVisitors: this.visitors.length,
                    correctDecisions: this.visitors.length - (this.maxLives - this.lives),
                });
            }
        });
    }

    private onGameOver() {
        this.isPlaying = false;
        this.timerActive = false;

        this.time.delayedCall(500, () => {
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
                    livesRemaining: 0,
                    totalVisitors: this.visitors.length,
                    correctDecisions: this.currentVisitorIndex - (this.maxLives - this.lives),
                });
            }
        });
    }

    // ============ RESIZE ============

    private handleResize() {
        // Re-layout is handled by next round since positions are calculated dynamically
    }
}
