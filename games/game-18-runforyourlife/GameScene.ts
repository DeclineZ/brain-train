import Phaser from 'phaser';
import { Player } from './Player';
import { ObstacleManager } from './ObstacleManager';

export class RunForYourLifeGameScene extends Phaser.Scene {
    private player!: Player;
    private obstacleManager!: ObstacleManager;
    private background!: Phaser.GameObjects.TileSprite;
    private nightOverlay!: Phaser.GameObjects.Rectangle;

    // Track Configuration (portrait 480×800)
    private readonly LANE_COUNT = 5;
    private readonly TRACK_WIDTH = 360;
    private readonly LANE_WIDTH = 72; // 360 / 5
    private readonly TRACK_LEFT = 60; // (480 - 360) / 2
    private readonly CANVAS_W = 480;
    private readonly CANVAS_H = 800;

    // UI
    private scoreText!: Phaser.GameObjects.Text;
    private coinText!: Phaser.GameObjects.Text;

    // Power-up States
    private magnetActive: boolean = false;
    private ghostActive: boolean = false;
    private slowMoActive: boolean = false;
    private originalSpeed: number = 0;

    // Stats
    private score: number = 0;
    private coins: number = 0;
    private isGameOver: boolean = false;

    constructor() {
        super({ key: 'RunForYourLifeGameScene' });
    }

    preload() {
        const g = this.make.graphics({ x: 0, y: 0 });

        // ===== PLAYER TEXTURES (48×48 with glow) =====
        // Square - Cyan
        g.fillStyle(0x001a33, 0.4);
        g.fillRoundedRect(4, 6, 44, 44, 10);
        g.fillStyle(0x00E5FF);
        g.fillRoundedRect(2, 2, 44, 44, 10);
        g.lineStyle(3, 0xFFFFFF, 0.9);
        g.strokeRoundedRect(2, 2, 44, 44, 10);
        g.fillStyle(0xFFFFFF, 0.35);
        g.fillRoundedRect(8, 6, 20, 12, 5);
        g.generateTexture('player-square', 48, 48);
        g.clear();

        // Circle - Magenta
        g.fillStyle(0x330019, 0.4);
        g.fillCircle(26, 28, 22);
        g.fillStyle(0xFF00DD);
        g.fillCircle(24, 24, 22);
        g.lineStyle(3, 0xFFFFFF, 0.9);
        g.strokeCircle(24, 24, 21);
        g.fillStyle(0xFFFFFF, 0.35);
        g.fillCircle(16, 16, 7);
        g.generateTexture('player-circle', 48, 48);
        g.clear();

        // Triangle - Yellow
        g.fillStyle(0x1a1a00, 0.4);
        g.beginPath(); g.moveTo(24, 6); g.lineTo(46, 44); g.lineTo(2, 44); g.closePath(); g.fillPath();
        g.fillStyle(0xFFD600);
        g.beginPath(); g.moveTo(24, 2); g.lineTo(46, 42); g.lineTo(2, 42); g.closePath(); g.fillPath();
        g.lineStyle(3, 0xFFFFFF, 0.9);
        g.strokePath();
        g.fillStyle(0xFFFFFF, 0.3);
        g.beginPath(); g.moveTo(24, 10); g.lineTo(34, 28); g.lineTo(14, 28); g.closePath(); g.fillPath();
        g.generateTexture('player-triangle', 48, 48);
        g.clear();

        // ===== OBSTACLE - Colorful barricade/crate =====
        // Shadow
        g.fillStyle(0x000000, 0.25);
        g.fillRoundedRect(4, 6, 64, 64, 6);
        // Base - Orange-Red
        g.fillStyle(0xF44336);
        g.fillRoundedRect(0, 0, 64, 64, 6);
        // Highlight stripe
        g.fillStyle(0xFFEB3B, 0.6);
        g.fillRect(0, 0, 64, 14);
        // Danger mark
        g.fillStyle(0xFFFFFF, 0.7);
        g.fillRect(28, 22, 8, 20);
        g.fillRect(20, 30, 24, 8);
        g.lineStyle(2, 0xB71C1C);
        g.strokeRoundedRect(0, 0, 64, 64, 6);
        g.generateTexture('obstacle-container', 64, 64);
        g.clear();

        // ===== GATES - thick vivid hollow shapes =====
        // Gate Circle
        g.lineStyle(8, 0xFF00DD, 0.9);
        g.strokeCircle(36, 36, 28);
        g.lineStyle(2, 0xFFFFFF, 0.5);
        g.strokeCircle(36, 36, 28);
        g.generateTexture('gate-circle', 72, 72);
        g.clear();

        // Gate Square
        g.lineStyle(8, 0x00E5FF, 0.9);
        g.strokeRoundedRect(6, 6, 60, 60, 4);
        g.lineStyle(2, 0xFFFFFF, 0.5);
        g.strokeRoundedRect(6, 6, 60, 60, 4);
        g.generateTexture('gate-square', 72, 72);
        g.clear();

        // Gate Triangle
        g.lineStyle(8, 0xFFD600, 0.9);
        g.beginPath(); g.moveTo(36, 6); g.lineTo(66, 66); g.lineTo(6, 66); g.closePath(); g.strokePath();
        g.lineStyle(2, 0xFFFFFF, 0.5);
        g.strokePath();
        g.generateTexture('gate-triangle', 72, 72);
        g.clear();

        // ===== FLOOR TEXTURE (480×800 portrait) =====
        // Sky / side area
        g.fillStyle(0x2ECC71, 0.15); // Faint green tint for sides
        g.fillRect(0, 0, 480, 800);

        // Side decorations - tropical feel
        g.fillStyle(0x27AE60, 0.3);
        g.fillRect(0, 0, 60, 800); // Left side strip
        g.fillRect(420, 0, 60, 800); // Right side strip
        g.fillStyle(0x1E8449, 0.3);
        g.fillRect(0, 0, 30, 800);
        g.fillRect(450, 0, 30, 800);

        // Track surface - dark gray
        g.fillStyle(0x34495E);
        g.fillRect(60, 0, 360, 800);

        // Lane dividers (white dashed)
        g.fillStyle(0xBDC3C7, 0.6);
        for (let i = 1; i < 5; i++) {
            const lx = 60 + i * 72;
            // Dashed pattern
            for (let dy = 0; dy < 800; dy += 40) {
                g.fillRect(lx - 1, dy, 2, 20);
            }
        }

        // Center line (slightly brighter)
        g.fillStyle(0xF1C40F, 0.4);
        for (let dy = 0; dy < 800; dy += 60) {
            g.fillRect(240 - 2, dy, 4, 30);
        }

        // Side barriers — red/white pattern
        g.fillStyle(0xE74C3C, 0.8);
        g.fillRect(56, 0, 4, 800);
        g.fillRect(420, 0, 4, 800);
        g.fillStyle(0xFFFFFF, 0.5);
        for (let dy = 0; dy < 800; dy += 20) {
            g.fillRect(56, dy, 4, 10);
            g.fillRect(420, dy, 4, 10);
        }

        g.generateTexture('floor-track', 480, 800);
        g.clear();

        // ===== ZONES =====
        // Ice
        g.fillStyle(0x3498DB, 0.35);
        g.fillRect(0, 0, 360, 160);
        g.fillStyle(0xFFFFFF, 0.5);
        for (let i = 0; i < 20; i++) {
            const sx = Phaser.Math.Between(5, 355);
            const sy = Phaser.Math.Between(5, 155);
            g.fillCircle(sx, sy, Phaser.Math.Between(2, 5));
        }
        g.generateTexture('zone-ice', 360, 160);
        g.clear();

        // Mud
        g.fillStyle(0x795548, 0.5);
        g.fillRect(0, 0, 360, 160);
        g.fillStyle(0x4E342E, 0.6);
        for (let i = 0; i < 10; i++) {
            const sx = Phaser.Math.Between(10, 350);
            const sy = Phaser.Math.Between(10, 150);
            g.fillCircle(sx, sy, Phaser.Math.Between(6, 12));
        }
        g.generateTexture('zone-mud', 360, 160);
        g.clear();

        // ===== COIN =====
        g.fillStyle(0x000000, 0.2);
        g.fillCircle(16, 18, 14);
        g.fillStyle(0xF1C40F);
        g.fillCircle(14, 14, 14);
        g.fillStyle(0xF39C12);
        g.fillCircle(14, 14, 9);
        g.fillStyle(0xFFFFFF, 0.4);
        g.fillCircle(10, 10, 4);
        g.generateTexture('coin', 28, 28);
        g.clear();

        // ===== POWER-UPS (circle icons) =====
        // Magnet
        g.fillStyle(0xE91E63);
        g.fillCircle(16, 16, 16);
        g.fillStyle(0xFFFFFF, 0.7);
        g.fillRect(8, 6, 4, 14);
        g.fillRect(20, 6, 4, 14);
        g.fillRect(8, 6, 16, 4);
        g.generateTexture('powerup-magnet', 32, 32);
        g.clear();

        // SlowMo
        g.fillStyle(0x2196F3);
        g.fillCircle(16, 16, 16);
        g.fillStyle(0xFFFFFF, 0.8);
        g.fillCircle(16, 16, 8);
        g.fillStyle(0x2196F3);
        g.fillCircle(16, 16, 5);
        g.fillStyle(0xFFFFFF);
        g.fillRect(15, 10, 2, 8);
        g.generateTexture('powerup-slowmo', 32, 32);
        g.clear();

        // Ghost
        g.fillStyle(0xB0BEC5);
        g.fillCircle(16, 14, 12);
        g.fillRect(4, 14, 24, 14);
        g.fillStyle(0xFFFFFF, 0.6);
        g.fillCircle(12, 12, 3);
        g.fillCircle(20, 12, 3);
        g.generateTexture('powerup-ghost', 32, 32);
        g.clear();

        g.destroy();
    }

    create() {
        // Background
        this.background = this.add.tileSprite(240, 400, 480, 800, 'floor-track');
        this.background.setDepth(-10);

        // Night Overlay
        this.nightOverlay = this.add.rectangle(240, 400, 480, 800, 0x0D0D3F);
        this.nightOverlay.setAlpha(0);
        this.nightOverlay.setDepth(50);

        // HUD
        this.scoreText = this.add.text(240, 20, '0', {
            fontSize: '36px',
            color: '#FFFFFF',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5, 0).setDepth(60);

        this.coinText = this.add.text(240, 58, '🪙 0', {
            fontSize: '20px',
            color: '#F1C40F',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5, 0).setDepth(60);

        // Player (start center lane)
        const centerLaneX = this.TRACK_LEFT + 2.5 * this.LANE_WIDTH; // Lane 2 center = 240
        this.player = new Player(this, centerLaneX, 620);
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(30);

        // World bounds = track area only
        this.physics.world.setBounds(this.TRACK_LEFT, 0, this.TRACK_WIDTH, this.CANVAS_H);
        this.player.setCollideWorldBounds(true);

        this.obstacleManager = new ObstacleManager(this);

        // Collisions
        this.physics.add.overlap(this.player, this.obstacleManager.getObstacles(), this.handleCollision, undefined, this);
        this.physics.add.overlap(this.player, this.obstacleManager.getZones(), this.handleZoneOverlap, undefined, this);

        // Day/Night Cycle
        this.time.addEvent({
            delay: 15000,
            callback: this.toggleDayNight,
            callbackScope: this,
            loop: true
        });

        // ===== ON-SCREEN CONTROLS =====
        this.createControls();
    }

    private createControls() {
        const btnH = 64;
        const btnY = this.CANVAS_H - 50;
        const btnAlpha = 0.85;

        // --- Left/Right Arrows (Bottom Left) ---
        const leftBtn = this.add.rectangle(50, btnY, btnH, btnH, 0x263238, btnAlpha)
            .setInteractive({ useHandCursor: true })
            .setDepth(60)
            .setStrokeStyle(3, 0xFFFFFF, 0.5);

        this.add.text(50, btnY, '◀', { fontSize: '32px', color: '#FFFFFF' })
            .setOrigin(0.5).setDepth(61);

        const rightBtn = this.add.rectangle(124, btnY, btnH, btnH, 0x263238, btnAlpha)
            .setInteractive({ useHandCursor: true })
            .setDepth(60)
            .setStrokeStyle(3, 0xFFFFFF, 0.5);

        this.add.text(124, btnY, '▶', { fontSize: '32px', color: '#FFFFFF' })
            .setOrigin(0.5).setDepth(61);

        // Hold-based movement
        leftBtn.on('pointerdown', () => this.player.startMoveLeft());
        leftBtn.on('pointerup', () => this.player.stopMove());
        leftBtn.on('pointerout', () => this.player.stopMove());

        rightBtn.on('pointerdown', () => this.player.startMoveRight());
        rightBtn.on('pointerup', () => this.player.stopMove());
        rightBtn.on('pointerout', () => this.player.stopMove());

        // --- Shape Buttons (Bottom Right) ---
        // Circle (Magenta)
        const circleBtn = this.add.rectangle(300, btnY, 56, btnH, 0xFF00DD, btnAlpha)
            .setInteractive({ useHandCursor: true })
            .setDepth(60)
            .setStrokeStyle(3, 0xFFFFFF, 0.4);

        this.add.text(300, btnY, '●', { fontSize: '28px', color: '#FFFFFF' })
            .setOrigin(0.5).setDepth(61);

        // Square (Cyan)
        const squareBtn = this.add.rectangle(364, btnY, 56, btnH, 0x00E5FF, btnAlpha)
            .setInteractive({ useHandCursor: true })
            .setDepth(60)
            .setStrokeStyle(3, 0xFFFFFF, 0.4);

        this.add.text(364, btnY, '■', { fontSize: '28px', color: '#FFFFFF' })
            .setOrigin(0.5).setDepth(61);

        // Triangle (Yellow)
        const triangleBtn = this.add.rectangle(428, btnY, 56, btnH, 0xFFD600, btnAlpha)
            .setInteractive({ useHandCursor: true })
            .setDepth(60)
            .setStrokeStyle(3, 0xFFFFFF, 0.4);

        this.add.text(428, btnY, '▲', { fontSize: '26px', color: '#333333' })
            .setOrigin(0.5).setDepth(61);

        // Shape button handlers
        circleBtn.on('pointerdown', () => {
            this.player.setShape('CIRCLE');
            this.flashButton(circleBtn);
        });
        squareBtn.on('pointerdown', () => {
            this.player.setShape('SQUARE');
            this.flashButton(squareBtn);
        });
        triangleBtn.on('pointerdown', () => {
            this.player.setShape('TRIANGLE');
            this.flashButton(triangleBtn);
        });
    }

    private flashButton(btn: Phaser.GameObjects.Rectangle) {
        this.tweens.add({
            targets: btn,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 80,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
    }

    update(time: number, delta: number) {
        if (this.isGameOver) return;

        this.player.update();
        this.obstacleManager.update(time, delta);

        // Magnet Logic
        if (this.magnetActive) {
            this.obstacleManager.getObstacles().getChildren().forEach((child: any) => {
                if (child.getData('type') === 'COIN') {
                    this.physics.moveToObject(child, this.player, 500);
                }
            });
        }

        // Score from distance
        this.score += (this.obstacleManager.currentSpeed * delta / 1000) / 10;
        this.scoreText.setText(String(Math.floor(this.score)));

        // Reset surface
        this.player.setSurface('NORMAL');

        // Scroll background
        this.background.tilePositionY -= this.obstacleManager.currentSpeed * (delta / 1000);
    }

    private handleZoneOverlap(_player: any, zone: any) {
        const type = zone.getData('type');
        (this.player as Player).setSurface(type);
    }

    private toggleDayNight() {
        const target = this.nightOverlay.alpha === 0 ? 0.5 : 0;
        this.tweens.add({
            targets: this.nightOverlay,
            alpha: target,
            duration: 6000,
            ease: 'Linear'
        });
    }

    private handleCollision(_player: any, obstacle: any) {
        if (this.isGameOver) return;

        const playerShape = this.player.getShape();
        const obstacleType = obstacle.getData('type');
        const obstacleShape = obstacle.getData('shape');

        if (obstacleType === 'OBSTACLE') {
            this.doGameOver();
        } else if (obstacleType === 'GATE') {
            if (playerShape !== obstacleShape) {
                this.doGameOver();
            } else {
                (obstacle as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
                this.score += 100;
                // Flash green feedback
                this.cameras.main.flash(100, 0, 255, 0, false);
            }
        } else if (obstacleType === 'COIN') {
            this.collectCoin(obstacle);
        } else if (obstacleType === 'POWERUP') {
            this.collectPowerup(obstacle);
        }
    }

    private collectCoin(coin: any) {
        (coin as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
        this.coins++;
        this.score += 50;
        this.coinText.setText('🪙 ' + this.coins);
    }

    private collectPowerup(powerup: any) {
        const type = powerup.getData('powerupType');
        (powerup as Phaser.Physics.Arcade.Sprite).disableBody(true, true);

        if (type === 'MAGNET') this.activateMagnet();
        else if (type === 'GHOST') this.activateGhost();
        else if (type === 'SLOWMO') this.activateSlowMo();
    }

    private activateMagnet() {
        this.magnetActive = true;
        this.time.delayedCall(5000, () => { this.magnetActive = false; });
    }

    private activateGhost() {
        this.ghostActive = true;
        this.player.setAlpha(0.5);
        this.time.delayedCall(5000, () => {
            this.ghostActive = false;
            this.player.setAlpha(1);
        });
    }

    private activateSlowMo() {
        if (this.slowMoActive) return;
        this.slowMoActive = true;
        this.originalSpeed = this.obstacleManager.currentSpeed;
        this.obstacleManager.currentSpeed /= 2;
        this.time.delayedCall(5000, () => {
            this.slowMoActive = false;
            if (this.obstacleManager.currentSpeed < this.originalSpeed * 2) {
                this.obstacleManager.currentSpeed *= 2;
            }
        });
    }

    private doGameOver() {
        if (this.ghostActive) return;
        if (this.isGameOver) return;
        this.isGameOver = true;

        this.physics.pause();
        this.obstacleManager.stop();

        // Camera shake
        this.cameras.main.shake(300, 0.02);

        // Emit to React via registry
        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                success: true,
                score: Math.floor(this.score),
                stars: 0,
            });
        }
    }
}
