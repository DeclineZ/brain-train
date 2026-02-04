import * as Phaser from 'phaser';

export class GridHunterGameScene extends Phaser.Scene {
    // Game State
    private isPlaying = false;
    private score = 0;
    private combo = 0;
    private maxCombo = 0;
    private correctTaps = 0;
    private totalTaps = 0;
    private trapAvoided = 0;
    private trapHit = 0;
    private totalReactionTime = 0;
    private reactionCount = 0;

    // Grid State
    private gridSize = 3; // Start with 3x3
    private tiles: Phaser.GameObjects.Container[] = [];
    private numbers: number[] = [];
    private nextNumber = 100; // Starting high number for replacements
    private trapIndices: Set<number> = new Set(); // Indices with "hot" red numbers
    private trapLives: Map<number, number> = new Map(); // Turns remaining for each trap

    // Timing
    private lastTapTime = 0;
    private cardStartTime = 0;
    private timeLimitPerCard = 10000; // 10s base limit
    private minTimeLimit = 3000;
    private speedupRate = 100;

    // Phase tracking
    private currentPhase = 1;
    // Thresholds
    private THRESHOLD_PHASE_2 = 5000;   // 4x4 Grid
    private THRESHOLD_PHASE_3 = 10000;  // Shuffle
    private THRESHOLD_PHASE_4 = 15000;  // Same Color
    private THRESHOLD_PHASE_5 = 20000;  // Lowest EVEN (No Shuffle)
    private THRESHOLD_PHASE_6 = 25000;  // Lowest ODD (No Shuffle)
    private THRESHOLD_PHASE_7 = 27500;  // Highest ODD (Shuffle)

    // Rule Configs
    private shuffleEnabled = false;
    private shuffleCount = 0;
    private sameColorMode = false;
    private targetEven = false;
    private targetOdd = false;
    private targetHighest = false; // if false, target Lowest

    // Visuals
    private scoreText!: Phaser.GameObjects.Text;
    private comboText!: Phaser.GameObjects.Text;
    private timerBar!: Phaser.GameObjects.Graphics;
    private gridContainer!: Phaser.GameObjects.Container;

    // Audio
    private soundPop!: Phaser.Sound.BaseSound;
    private soundWrong!: Phaser.Sound.BaseSound;
    private soundPhaseUp!: Phaser.Sound.BaseSound;
    private soundBgm!: Phaser.Sound.BaseSound;

    // Countdown
    private isCountdown = false;
    private countdownValue = 3;

    constructor() {
        super({ key: 'GridHunterGameScene' });
    }

    preload() {
        // Grid Hunter sounds
        this.load.audio('pop', '/assets/sounds/gridhunter/pop.mp3');
        this.load.audio('wrong', '/assets/sounds/gridhunter/wrong.mp3');
        this.load.audio('phase-up', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('beep', '/assets/sounds/sensorlock/beep.mp3');
        this.load.audio('bgm', '/assets/sounds/gridhunter/gridhunter-bg.mp3');
    }

    create() {
        // 1. Background
        this.createBackground();

        // 2. HUD
        this.createHUD();

        // 3. Grid Container (centered)
        const { width, height } = this.scale;
        this.gridContainer = this.add.container(width / 2, height / 2);

        // 4. Audio
        this.soundPop = this.sound.add('pop');
        this.soundWrong = this.sound.add('wrong');
        this.soundPhaseUp = this.sound.add('phase-up');
        this.soundBgm = this.sound.add('bgm', { loop: true, volume: 0.4 });

        // 5. Handle Resize
        this.scale.on('resize', () => this.layoutUI());

        // 6. Start Countdown
        this.startCountdown();
    }

    update(time: number, delta: number) {
        if (!this.isPlaying || this.isCountdown) return;

        // Update timer bar
        const elapsed = Date.now() - this.cardStartTime;
        const pct = 1 - (elapsed / this.timeLimitPerCard);

        if (pct <= 0) {
            this.handleTimeout();
        } else {
            this.drawTimerBar(pct);
        }
    }

    // =====================
    // SETUP & VISUALS
    // =====================

    createBackground() {
        const { width, height } = this.scale;

        // Warm coral-to-lavender gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0xFFB5A7, 0xFCD5CE, 0xF8EDEB, 0xE8E8E4, 1);
        bg.fillRect(0, 0, width, height);

        // Add subtle pattern overlay (diagonal stripes)
        const pattern = this.add.graphics();
        pattern.lineStyle(1, 0xffffff, 0.08);
        for (let i = -height; i < width + height; i += 30) {
            pattern.moveTo(i, 0);
            pattern.lineTo(i + height, height);
        }
        pattern.strokePath();

        // Floating decorative bubbles in background
        this.createFloatingBubbles();

        // Soft glow circles in corners
        this.createCornerGlows();

        // Sparkle stars scattered around
        this.createSparkles();
    }

    createFloatingBubbles() {
        const { width, height } = this.scale;
        const colors = [0xFFCDB2, 0xFFB4A2, 0xE5989B, 0xB5838D, 0x6D6875];

        for (let i = 0; i < 8; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const radius = 20 + Math.random() * 40;
            const color = colors[Math.floor(Math.random() * colors.length)];

            const bubble = this.add.container(x, y);

            // Main bubble
            const circle = this.add.graphics();
            circle.fillStyle(color, 0.2);
            circle.fillCircle(0, 0, radius);
            circle.lineStyle(2, color, 0.3);
            circle.strokeCircle(0, 0, radius);
            bubble.add(circle);

            // Highlight shine
            const shine = this.add.graphics();
            shine.fillStyle(0xffffff, 0.4);
            shine.fillCircle(-radius * 0.3, -radius * 0.3, radius * 0.25);
            bubble.add(shine);

            // Float animation
            this.tweens.add({
                targets: bubble,
                y: y - 20 - Math.random() * 20,
                duration: 3000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Subtle rotation
            this.tweens.add({
                targets: bubble,
                angle: 10,
                duration: 4000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createCornerGlows() {
        const { width, height } = this.scale;

        // Top-left warm glow
        const glow1 = this.add.graphics();
        glow1.fillStyle(0xFFB5A7, 0.3);
        glow1.fillCircle(0, 0, 150);

        // Bottom-right cool glow
        const glow2 = this.add.graphics();
        glow2.fillStyle(0xB5838D, 0.2);
        glow2.fillCircle(width, height, 180);
    }

    createSparkles() {
        const { width, height } = this.scale;

        for (let i = 0; i < 12; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height * 0.7;

            const star = this.add.text(x, y, '✦', {
                fontSize: `${12 + Math.random() * 16}px`,
                color: '#ffffff'
            }).setAlpha(0.3 + Math.random() * 0.4);

            // Twinkle animation
            this.tweens.add({
                targets: star,
                alpha: 0.1,
                scale: 0.8,
                duration: 1000 + Math.random() * 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Math.random() * 2000
            });
        }
    }

    createHUD() {
        const { width, height } = this.scale;

        // Instruction indicator (top center)
        this.createInstructionIndicator();

        // Score (below instruction, centered)
        const scoreContainer = this.add.container(width / 2, 85);

        // Score bubble background
        const scoreBg = this.add.graphics();
        scoreBg.fillStyle(0xffffff, 0.85);
        scoreBg.fillRoundedRect(-50, -22, 100, 44, 22);
        scoreBg.lineStyle(3, 0xFFB5A7, 1);
        scoreBg.strokeRoundedRect(-50, -22, 100, 44, 22);
        scoreContainer.add(scoreBg);

        this.scoreText = this.add.text(0, 0, '0', {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#B5838D'
        }).setOrigin(0.5, 0.5);
        scoreContainer.add(this.scoreText);
        scoreContainer.setDepth(100);

        // Combo text (below score)
        this.comboText = this.add.text(width / 2, 140, '', {
            fontFamily: '"Mali", sans-serif',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#E5989B',
            stroke: '#ffffff',
            strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0).setDepth(100);

        // Timer bar
        this.timerBar = this.add.graphics().setDepth(100);
    }

    private instructionText!: Phaser.GameObjects.Text;
    private instructionBg!: Phaser.GameObjects.Container;

    createInstructionIndicator() {
        const { width } = this.scale;

        // Instruction container - centered at top
        this.instructionBg = this.add.container(width / 2, 35);

        // Calculate pill size (wider for larger text)
        const pillWidth = 280;
        const pillHeight = 44;
        const pillRadius = 22;

        // Pill-shaped background
        const pill = this.add.graphics();
        pill.fillStyle(0x6D6875, 0.9);
        pill.fillRoundedRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, pillRadius);
        this.instructionBg.add(pill);

        // Instruction text - centered in pill
        this.instructionText = this.add.text(0, 0, 'หาเลขน้อยที่สุด', {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5).setPadding(10, 14, 10, 14);
        this.instructionBg.add(this.instructionText);

        this.instructionBg.setDepth(100);

        // Subtle pulse animation
        this.tweens.add({
            targets: this.instructionBg,
            scale: 1.02,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    updateInstructionIndicator() {
        if (!this.instructionText) return;

        let text = 'หาเลขน้อยที่สุด';
        if (this.currentPhase === 5) {
            text = 'หา "เลขคู่" น้อยสุด';
        } else if (this.currentPhase === 6) {
            text = 'หา "เลขคี่" น้อยสุด';
        } else if (this.currentPhase === 7) {
            text = 'หา "เลขคี่" มากสุด';
        }

        this.instructionText.setText(text);
    }

    drawTimerBar(pct: number) {
        const { width, height } = this.scale;
        const barWidth = width * 0.6;
        const barHeight = 14;
        const x = (width - barWidth) / 2;
        const y = height - 45;

        this.timerBar.clear();

        // Background with rounded ends
        this.timerBar.fillStyle(0xE8E8E4, 1);
        this.timerBar.fillRoundedRect(x, y, barWidth, barHeight, 7);

        // Fill with gradient-like coloring based on time
        const fillColor = pct > 0.4 ? 0xB5838D : (pct > 0.2 ? 0xE5989B : 0xFFB5A7);
        this.timerBar.fillStyle(fillColor, 1);
        this.timerBar.fillRoundedRect(x, y, barWidth * pct, barHeight, 7);

        // White border
        this.timerBar.lineStyle(2, 0xffffff, 0.5);
        this.timerBar.strokeRoundedRect(x, y, barWidth, barHeight, 7);
    }

    layoutUI() {
        const { width, height } = this.scale;

        // Score centered below instruction
        if (this.scoreText) {
            const parent = this.scoreText.parentContainer;
            if (parent) parent.setPosition(width / 2, 85);
        }
        // Instruction centered at top
        if (this.instructionBg) this.instructionBg.setPosition(width / 2, 35);
        // Combo below score
        if (this.comboText) this.comboText.setPosition(width / 2, 140);
        if (this.gridContainer) this.gridContainer.setPosition(width / 2, height / 2);

        // Rebuild grid tiles to fit new size
        if (this.isPlaying) {
            this.rebuildGrid();
        }
    }

    // =====================
    // COUNTDOWN & START
    // =====================

    startCountdown() {
        this.isCountdown = true;
        this.countdownValue = 3;

        const { width, height } = this.scale;

        const countdownText = this.add.text(width / 2, height / 2, '3', {
            fontFamily: '"Mali", sans-serif',
            fontSize: '120px',
            fontStyle: 'bold',
            color: '#6c5ce7',
            stroke: '#ffffff',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(200);

        const tickSound = this.sound.add('beep');

        const doTick = () => {
            if (this.countdownValue <= 0) {
                countdownText.destroy();
                this.startGame();
                return;
            }

            countdownText.setText(this.countdownValue.toString());
            countdownText.setScale(0.5);
            this.tweens.add({
                targets: countdownText,
                scale: 1,
                duration: 300,
                ease: 'Back.out'
            });

            tickSound.play();
            this.countdownValue--;
            this.time.delayedCall(1000, doTick);
        };

        doTick();
    }

    startGame() {
        this.isCountdown = false;
        this.isPlaying = true;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctTaps = 0;
        this.totalTaps = 0;
        this.trapAvoided = 0;
        this.trapHit = 0;
        this.totalReactionTime = 0;
        this.reactionCount = 0;
        this.currentPhase = 1;
        this.gridSize = 3;
        this.shuffleEnabled = false;
        this.sameColorMode = false;
        this.targetEven = false;
        this.targetOdd = false;
        this.targetHighest = false;
        this.updateInstructionIndicator();

        this.nextNumber = 100;
        this.trapIndices.clear();
        this.trapIndices.clear();
        this.trapLives.clear();

        this.soundBgm.play();

        this.initGrid();
        this.cardStartTime = Date.now();
        this.lastTapTime = Date.now();
    }

    // =====================
    // GRID LOGIC
    // =====================

    initGrid() {
        // Clear existing
        this.tiles.forEach(t => t.destroy());
        this.tiles = [];
        this.numbers = [];
        this.tiles = [];
        this.numbers = [];
        this.trapIndices.clear();
        this.trapLives.clear();

        const count = this.gridSize * this.gridSize;

        // Generate random unique numbers
        const nums: number[] = [];
        for (let i = 0; i < count; i++) {
            nums.push(Math.floor(Math.random() * 50) + 1 + i * 5);
        }
        // Shuffle
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }

        // Rule Enforcement: Ensure at least one valid target exists
        if (this.targetEven) {
            if (!nums.some(n => n % 2 === 0)) {
                nums[0] = (Math.floor(nums[0] / 2) * 2);
            }
        } else if (this.targetOdd) {
            if (!nums.some(n => n % 2 !== 0)) {
                nums[0] = (Math.floor(nums[0] / 2) * 2) + 1;
            }
        }

        this.numbers = nums;
        this.nextNumber = Math.max(...nums) + 10;

        this.rebuildGrid();
    }

    rebuildGrid() {
        const { width, height } = this.scale;
        const tileSize = Math.min(width, height) * 0.18;
        const gap = tileSize * 0.15;
        const totalSize = this.gridSize * tileSize + (this.gridSize - 1) * gap;
        const startX = -totalSize / 2 + tileSize / 2;
        const startY = -totalSize / 2 + tileSize / 2;

        // Clear and rebuild
        this.tiles.forEach(t => t.destroy());
        this.tiles = [];

        for (let i = 0; i < this.numbers.length; i++) {
            const row = Math.floor(i / this.gridSize);
            const col = i % this.gridSize;
            const x = startX + col * (tileSize + gap);
            const y = startY + row * (tileSize + gap);

            const tile = this.createTile(x, y, tileSize, this.numbers[i], i);
            this.gridContainer.add(tile);
            this.tiles.push(tile);
        }
    }

    createTile(x: number, y: number, size: number, num: number, index: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);

        const isTrap = this.trapIndices.has(index);

        // Pastel color based on number (warm palette)
        let baseColor: number;
        if (isTrap) {
            baseColor = 0xff6b6b;
        } else if (this.sameColorMode) {
            baseColor = 0x95a5a6; // Uniform grey/blue to remove color cues
        } else {
            const hue = (num * 7) % 360;
            baseColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.75).color;
        }

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.1);
        shadow.fillRoundedRect(-size / 2 + 4, -size / 2 + 6, size, size, 16);
        container.add(shadow);

        // Tile background
        const bg = this.add.graphics();
        bg.fillStyle(baseColor, 1);
        bg.fillRoundedRect(-size / 2, -size / 2, size, size, 16);
        bg.lineStyle(4, 0xffffff, 0.5);
        bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 16);
        container.add(bg);

        // Number text
        const fontSize = Math.max(24, size * 0.45);
        const text = this.add.text(0, 0, num.toString(), {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: `${fontSize}px`,
            fontStyle: 'bold',
            color: isTrap ? '#ffffff' : '#2d3436'
        }).setOrigin(0.5);
        container.add(text);

        // Trap glow animation
        if (isTrap) {
            this.tweens.add({
                targets: container,
                scale: 1.05,
                duration: 400,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.inOut'
            });
        }

        // Hit area
        const hitArea = this.add.rectangle(0, 0, size, size, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        container.add(hitArea);

        hitArea.on('pointerdown', () => this.handleTileTap(index));

        // Store reference
        container.setData('index', index);
        container.setData('number', num);

        return container;
    }

    handleTileTap(index: number) {
        if (!this.isPlaying) return;

        const tappedNumber = this.numbers[index];
        const isTrap = this.trapIndices.has(index);

        // Determine target based on rules
        let candidates = this.numbers.filter((_, i) => !this.trapIndices.has(i));
        if (this.targetEven) candidates = candidates.filter(n => n % 2 === 0);
        else if (this.targetOdd) candidates = candidates.filter(n => n % 2 !== 0);

        let target = -999;
        if (candidates.length > 0) {
            target = this.targetHighest ? Math.max(...candidates) : Math.min(...candidates);
        }

        this.totalTaps++;

        // Track reaction time
        const now = Date.now();
        const reactionTime = now - this.lastTapTime;
        this.totalReactionTime += reactionTime;
        this.reactionCount++;
        this.lastTapTime = now;

        if (isTrap) {
            // Tapped a trap! Penalty
            this.handleTrapHit(index);
            return;
        }

        if (tappedNumber === target) {
            // Correct!
            this.handleCorrectTap(index);
        } else {
            // Wrong number
            this.handleWrongTap(index);
        }
    }

    handleCorrectTap(index: number) {
        this.correctTaps++;
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // Score calculation (combo multiplier)
        const points = 100 * Math.min(this.combo, 10);
        this.score += points;
        this.updateScoreDisplay();

        // Visual + sound with dynamic pitch based on combo
        this.playPopEffect(index);
        this.playPopSound();

        // Show combo
        if (this.combo >= 3) {
            this.showComboText();
        }

        // Replace the tile with new high number
        this.replaceTile(index);

        // Check phase transitions
        this.checkPhaseTransition();

        // Shuffle if Phase 3
        if (this.shuffleEnabled) {
            this.performShuffle();
        }

        // Speed up timer slightly
        this.timeLimitPerCard = Math.max(this.minTimeLimit, this.timeLimitPerCard - this.speedupRate);
        this.cardStartTime = Date.now();

        // Maybe spawn a trap
        this.maybeSpawnTrap();

        // Update trap lives
        this.updateTraps();
    }

    handleWrongTap(index: number) {
        this.combo = 0;

        // Shake effect
        this.cameras.main.shake(100, 0.01);
        this.soundWrong.play();

        // Flash the tile red
        const tile = this.tiles[index];
        if (tile) {
            this.tweens.add({
                targets: tile,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: 2
            });
        }

        // Time penalty
        this.cardStartTime -= 1500;
    }

    handleTrapHit(index: number) {
        this.trapHit++;
        this.combo = 0;
        this.score = Math.max(0, this.score - 500);
        this.updateScoreDisplay();

        // Big shake
        this.cameras.main.shake(200, 0.02);
        this.soundWrong.play();

        // Flash screen red
        const { width, height } = this.scale;
        const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xff0000, 0.3).setDepth(150);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy()
        });

        // Clear the trap (user already got punished)
        this.trapIndices.delete(index);
        this.trapLives.delete(index);

        // Rebuild to update colors
        this.rebuildGrid();

        // Time penalty
        this.cardStartTime -= 2000;
    }

    replaceTile(index: number) {
        // Generate new number higher than current max
        this.nextNumber += Math.floor(Math.random() * 10) + 5;
        let newNum = this.nextNumber;

        // Ensure validity for Even/Odd rules if needed
        // (Just ensure the new number doesn't break solvability if board is sparse)
        // Simple check: if rules are active, verify board solvability after replacement.
        // It's cheaper to just make the new number match the rule if we are worried,
        // but random spread usually works.
        // Let's force validity if we are in a strict mode to be safe.
        if (this.targetEven && newNum % 2 !== 0) {
            // 50% chance to flip to even just to keep population up
            if (Math.random() > 0.5) newNum++;
        } else if (this.targetOdd && newNum % 2 === 0) {
            if (Math.random() > 0.5) newNum++;
        }

        this.numbers[index] = newNum;
        this.nextNumber = Math.max(this.nextNumber, newNum);

        // Clear trap if was one
        if (this.trapIndices.has(index)) {
            this.trapIndices.delete(index);
            this.trapLives.delete(index);
        }

        // Rebuild grid
        this.rebuildGrid();
    }

    maybeSpawnTrap() {
        // Only spawn traps after phase 1
        if (this.currentPhase < 2) return;

        // 10% chance
        if (Math.random() > 0.1) return;

        // Find a non-trap, non-lowest tile
        const lowest = Math.min(...this.numbers);
        const candidates = this.numbers
            .map((n, i) => ({ n, i }))
            .filter(({ n, i }) => n !== lowest && !this.trapIndices.has(i));

        if (candidates.length === 0) return;

        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        this.trapIndices.add(chosen.i);
        this.trapLives.set(chosen.i, 3); // Lasts for 3 correct selections
        this.trapAvoided++; // Will decrement if hit

        this.rebuildGrid();
    }

    updateTraps() {
        let changed = false;
        for (const [index, lives] of this.trapLives.entries()) {
            if (lives <= 1) {
                // Expire
                this.trapLives.delete(index);
                this.trapIndices.delete(index);
                changed = true;
            } else {
                this.trapLives.set(index, lives - 1);
            }
        }

        if (changed) {
            this.rebuildGrid();
        }
    }

    checkPhaseTransition() {
        if (this.currentPhase === 1 && this.score >= this.THRESHOLD_PHASE_2) {
            this.transitionToPhase(2);
        } else if (this.currentPhase === 2 && this.score >= this.THRESHOLD_PHASE_3) {
            this.transitionToPhase(3);
        } else if (this.currentPhase === 3 && this.score >= this.THRESHOLD_PHASE_4) {
            this.transitionToPhase(4);
        } else if (this.currentPhase === 4 && this.score >= this.THRESHOLD_PHASE_5) {
            this.transitionToPhase(5);
        } else if (this.currentPhase === 5 && this.score >= this.THRESHOLD_PHASE_6) {
            this.transitionToPhase(6);
        } else if (this.currentPhase === 6 && this.score >= this.THRESHOLD_PHASE_7) {
            this.transitionToPhase(7);
        }
    }

    transitionToPhase(phase: number) {
        this.currentPhase = phase;
        this.soundPhaseUp.play();
        this.isPlaying = false; // Pause game during transition

        const { width, height } = this.scale;

        // Create overlay (darker for modal focus)
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
            .setDepth(190).setInteractive(); // Block clicks

        // Phase-specific content in Thai
        // Phase-specific content in Thai
        let titleText: string;
        let descText: string;

        switch (phase) {
            case 2:
                titleText = 'ยากขึ้นแล้ว!';
                descText = 'ตารางใหญ่ขึ้นเป็น 4x4';
                break;
            case 3:
                titleText = 'โหมดสับ!';
                descText = 'ตัวเลขจะสลับที่ทุกครั้ง';
                break;
            case 4:
                titleText = 'สีเดียวกัน!';
                descText = 'ไม่มีสีช่วยแล้วนะ';
                break;
            case 5:
                titleText = 'หาเลขคู่!';
                descText = 'หา "เลขคู่" ที่น้อยที่สุด';
                break;
            case 6:
                titleText = 'หาเลขคี่!';
                descText = 'หา "เลขคี่" ที่น้อยที่สุด';
                break;
            case 7:
                titleText = 'ระดับสูงสุด!';
                descText = 'หา "เลขคี่" ที่ *มาก* ที่สุด';
                break;
            default:
                titleText = 'ระดับใหม่!';
                descText = 'สู้ๆ นะ!';
        }

        const container = this.add.container(width / 2, height / 2).setDepth(200).setAlpha(0).setScale(0.8);

        // Title
        const title = this.add.text(0, -50, titleText, {
            fontFamily: '"Mali", sans-serif',
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#6D6875',
            strokeThickness: 8
        }).setOrigin(0.5).setPadding(20);
        container.add(title);

        // Description
        const desc = this.add.text(0, 10, descText, {
            fontFamily: '"Mali", sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#FFB5A7', // Soft pink/coral
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setPadding(10, 5, 10, 5);
        container.add(desc);

        // Continue Button
        const btnY = 80;
        const btnWidth = 160;
        const btnHeight = 50;

        const btnContainer = this.add.container(0, btnY);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x58CC02, 1); // Green button
        btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 16);
        btnBg.lineStyle(4, 0xffffff, 1);
        btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 16);

        // Shadow (border-bottom style for button feel)
        const btnShadow = this.add.graphics();
        btnShadow.fillStyle(0x46A302, 1);
        btnShadow.fillRoundedRect(-btnWidth / 2, -btnHeight / 2 + 4, btnWidth, btnHeight, 16);

        const btnText = this.add.text(0, 0, 'ไปต่อ >', {
            fontFamily: '"Mali", sans-serif',
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5).setPadding(10, 5, 10, 5);

        btnContainer.add([btnShadow, btnBg, btnText]);
        container.add(btnContainer);

        // Interactive Button Area
        const hitArea = this.add.rectangle(0, btnY, btnWidth, btnHeight, 0xffffff, 0)
            .setInteractive({ useHandCursor: true });
        container.add(hitArea);

        // Animate in
        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: 1,
            duration: 400,
            ease: 'Back.out'
        });

        // Resume Action
        const resumeGame = () => {
            // Disable input
            hitArea.disableInteractive();

            this.tweens.add({
                targets: [container, overlay],
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    container.destroy();
                    overlay.destroy();

                    // Apply phase changes
                    if (phase === 2) {
                        this.gridSize = 4;
                        this.initGrid();
                    } else if (phase === 3) {
                        this.shuffleEnabled = true;
                    } else if (phase === 4) {
                        this.sameColorMode = true;
                        this.shuffleEnabled = true;
                        this.initGrid();
                    } else if (phase === 5) {
                        this.targetEven = true;
                        this.targetOdd = false;
                        this.targetHighest = false;
                        this.shuffleEnabled = false;
                        this.initGrid();
                    } else if (phase === 6) {
                        this.targetEven = false;
                        this.targetOdd = true;
                        this.targetHighest = false;
                        this.shuffleEnabled = false;
                        this.initGrid();
                    } else if (phase === 7) {
                        this.targetEven = false;
                        this.targetOdd = true;
                        this.targetHighest = true;
                        this.shuffleEnabled = true;
                        this.initGrid();
                    }

                    this.updateInstructionIndicator();

                    // Resume game
                    this.isPlaying = true;
                    this.cardStartTime = Date.now();
                }
            });
        };

        hitArea.on('pointerdown', () => {
            btnBg.y += 4; // Press effect
        });

        hitArea.on('pointerup', () => {
            btnBg.y -= 4; // Release effect
            this.sound.play('pop'); // Reuse pop sound
            resumeGame();
        });
    }

    performShuffle() {
        this.shuffleCount++;

        // Show hint for first 5 shuffles
        if (this.shuffleCount <= 5) {
            this.showShuffleHint();
        }

        // Delay the actual shuffle slightly for visual cue
        this.time.delayedCall(this.shuffleCount <= 5 ? 300 : 0, () => {
            this.shuffleGrid();
        });
    }

    showShuffleHint() {
        const { width, height } = this.scale;

        // Brief "สลับ!" indicator
        const hint = this.add.text(width / 2, height / 2 - 180, 'สลับ!', {
            fontFamily: '"Mali", sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#6D6875',
            stroke: '#ffffff',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(150).setAlpha(0).setPadding(10);

        // Quick flash animation
        this.tweens.add({
            targets: hint,
            alpha: 1,
            scale: 1.1,
            duration: 150,
            yoyo: true,
            hold: 200,
            ease: 'Quad.out',
            onComplete: () => hint.destroy()
        });
    }

    shuffleGrid() {
        // Shuffle positions (not numbers)
        for (let i = this.numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.numbers[i], this.numbers[j]] = [this.numbers[j], this.numbers[i]];
        }
        this.rebuildGrid();
    }

    // =====================
    // EFFECTS
    // =====================

    playPopEffect(index: number) {
        const tile = this.tiles[index];
        if (!tile) return;

        const { width, height } = this.scale;
        const worldPos = this.gridContainer.getWorldTransformMatrix().transformPoint(tile.x, tile.y);

        // 1. SQUASH & STRETCH - tile squishes then bounces
        this.tweens.add({
            targets: tile,
            scaleX: 0.7,
            scaleY: 1.4,
            duration: 50,
            ease: 'Quad.out',
            onComplete: () => {
                this.tweens.add({
                    targets: tile,
                    scaleX: 1.3,
                    scaleY: 0.8,
                    duration: 80,
                    ease: 'Quad.out',
                    onComplete: () => {
                        this.tweens.add({
                            targets: tile,
                            scaleX: 1,
                            scaleY: 1,
                            duration: 150,
                            ease: 'Elastic.out'
                        });
                    }
                });
            }
        });

        // 2. EXPANDING RING RIPPLE
        const ring = this.add.graphics().setDepth(50);
        ring.lineStyle(4, 0xffffff, 0.8);
        ring.strokeCircle(worldPos.x, worldPos.y, 20);

        this.tweens.add({
            targets: ring,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 400,
            ease: 'Quad.out',
            onComplete: () => ring.destroy()
        });

        // Second ring (delayed)
        this.time.delayedCall(80, () => {
            const ring2 = this.add.graphics().setDepth(50);
            ring2.lineStyle(3, 0xFFB5A7, 0.6);
            ring2.strokeCircle(worldPos.x, worldPos.y, 15);

            this.tweens.add({
                targets: ring2,
                scaleX: 2.5,
                scaleY: 2.5,
                alpha: 0,
                duration: 350,
                ease: 'Quad.out',
                onComplete: () => ring2.destroy()
            });
        });

        // 3. CONFETTI BURST - colorful particles
        const colors = [0xFFCDB2, 0xFFB4A2, 0xE5989B, 0xB5838D, 0xffffff];
        for (let i = 0; i < 16; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 4 + Math.random() * 8;
            const isCircle = Math.random() > 0.5;

            let particle: Phaser.GameObjects.Shape;
            if (isCircle) {
                particle = this.add.circle(worldPos.x, worldPos.y, size, color);
            } else {
                particle = this.add.rectangle(worldPos.x, worldPos.y, size, size, color);
            }
            particle.setDepth(60);

            const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
            const dist = 80 + Math.random() * 60;
            const rotation = Math.random() * 720 - 360;

            this.tweens.add({
                targets: particle,
                x: worldPos.x + Math.cos(angle) * dist,
                y: worldPos.y + Math.sin(angle) * dist - 20, // slight upward bias
                alpha: 0,
                scale: 0.2,
                angle: rotation,
                duration: 500 + Math.random() * 200,
                ease: 'Quad.out',
                onComplete: () => particle.destroy()
            });
        }

        // 4. FLOATING SCORE TEXT ("+100" rising up)
        const points = 100 * Math.min(this.combo, 10);
        const pointsText = this.add.text(worldPos.x, worldPos.y, `+${points}`, {
            fontFamily: '"Mali", sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#B5838D',
            stroke: '#ffffff',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(70);

        this.tweens.add({
            targets: pointsText,
            y: worldPos.y - 80,
            alpha: 0,
            scale: 1.3,
            duration: 700,
            ease: 'Quad.out',
            onComplete: () => pointsText.destroy()
        });

        // 5. BRIEF WHITE FLASH on tile (removed screen punch for older audiences)
        const flash = this.add.rectangle(worldPos.x, worldPos.y, 100, 100, 0xffffff, 0.6)
            .setDepth(55);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.5,
            duration: 150,
            ease: 'Quad.out',
            onComplete: () => flash.destroy()
        });

        // 7. SPARKLE BURST - small stars
        for (let i = 0; i < 6; i++) {
            const sparkle = this.add.text(worldPos.x, worldPos.y, '✦', {
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0.5).setDepth(65);

            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 50;

            this.tweens.add({
                targets: sparkle,
                x: worldPos.x + Math.cos(angle) * dist,
                y: worldPos.y + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0.3,
                rotation: Math.random() * 3,
                duration: 400,
                ease: 'Quad.out',
                delay: Math.random() * 100,
                onComplete: () => sparkle.destroy()
            });
        }
    }

    playPopSound() {
        // Dynamic Pitch: Increases for streaks 2, 3, 4, max at 5 (detune +200 cents per step)
        const pitchStep = 200; // cents
        const detune = Math.min(Math.max(0, this.combo - 1), 4) * pitchStep;

        this.sound.play('pop', { detune: detune });
    }

    showComboText() {
        this.comboText.setText(`${this.combo} COMBO!`);
        this.comboText.setAlpha(1);
        this.comboText.setScale(0.3);

        // Bouncy entrance
        this.tweens.add({
            targets: this.comboText,
            scale: 1.2,
            duration: 150,
            ease: 'Back.out',
            onComplete: () => {
                this.tweens.add({
                    targets: this.comboText,
                    scale: 1,
                    duration: 100,
                    ease: 'Quad.out',
                    onComplete: () => {
                        // Shake animation while visible
                        this.tweens.add({
                            targets: this.comboText,
                            x: this.comboText.x + 3,
                            duration: 50,
                            yoyo: true,
                            repeat: 3,
                            onComplete: () => {
                                this.time.delayedCall(300, () => {
                                    this.tweens.add({
                                        targets: this.comboText,
                                        alpha: 0,
                                        scale: 1.5,
                                        duration: 200,
                                        ease: 'Quad.in'
                                    });
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    updateScoreDisplay() {
        this.scoreText.setText(this.score.toString());

        // Juicy pop with color flash
        this.scoreText.setStyle({ color: '#E5989B' }); // Flash to pink

        this.tweens.add({
            targets: this.scoreText,
            scale: 1.4,
            duration: 80,
            yoyo: true,
            ease: 'Quad.out',
            onComplete: () => {
                this.scoreText.setStyle({ color: '#B5838D' }); // Back to normal
            }
        });
    }

    // =====================
    // GAME OVER
    // =====================

    handleTimeout() {
        this.isPlaying = false;
        this.sound.stopAll();
        this.soundPhaseUp.play();

        // Emit Game Over
        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: true,
                score: this.score,
                maxCombo: this.maxCombo,
                totalCorrect: this.correctTaps,
                totalAttempts: this.totalTaps,
                reactionTimeAvg: this.reactionCount > 0 ? this.totalReactionTime / this.reactionCount : 0,
                trapAvoided: this.trapAvoided - this.trapHit,
                trapHit: this.trapHit,
                phaseReached: this.currentPhase,
                stars: 0 // Endless mode, no stars
            });
        }
    }
}
