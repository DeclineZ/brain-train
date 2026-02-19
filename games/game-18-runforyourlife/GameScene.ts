import Phaser from 'phaser';
import { Player } from './Player';
import { ObstacleManager } from './ObstacleManager';

const ASSET_BASE = '/assets/game-18-runforyourlife/';

export class RunForYourLifeGameScene extends Phaser.Scene {
    private player!: Player;
    private obstacleManager!: ObstacleManager;
    private background!: Phaser.GameObjects.TileSprite;

    // Dynamic dimensions
    private LANE_COUNT = 5;
    private TRACK_WIDTH = 0;
    private LANE_WIDTH = 0;
    private TRACK_LEFT = 0;
    private CANVAS_W = 0;
    private CANVAS_H = 0;

    // UI
    private scoreText!: Phaser.GameObjects.Text;
    private coinText!: Phaser.GameObjects.Text;
    private sectorText!: Phaser.GameObjects.Text;

    // Power-up States
    private magnetActive: boolean = false;
    private ghostActive: boolean = false;
    private slowMoActive: boolean = false;
    private originalSpeed: number = 0;

    // Stats
    private score: number = 0;
    private coins: number = 0;
    private isGameOver: boolean = false;
    private isPaused: boolean = false;

    // Sector System
    private currentSector: number = 1;
    private shownTutorials: Set<number> = new Set();

    // Star particles
    private starParticles: { x: number; y: number; size: number; alpha: number; speed: number }[] = [];
    private starGraphics!: Phaser.GameObjects.Graphics;

    // Gun skill
    private gunAmmo: number = 1; // Start with 1
    private gunAmmoText!: Phaser.GameObjects.Text;
    private gunBtn!: Phaser.GameObjects.Rectangle;

    constructor() {
        super({ key: 'RunForYourLifeGameScene' });
    }

    preload() {
        // Load image assets
        this.load.image('ship-straight', ASSET_BASE + 'ship-straight.webp');
        this.load.image('ship-left', ASSET_BASE + 'ship-left.webp');
        this.load.image('ship-right', ASSET_BASE + 'ship-right.webp');
        this.load.image('enemy-wrecked', ASSET_BASE + 'enemy-wrecked.webp');
        this.load.image('enemy-shooter', ASSET_BASE + 'enemy-shooter.webp');
        this.load.image('coin-img', ASSET_BASE + 'coin.webp');
        this.load.image('powerup-magnet-img', ASSET_BASE + 'powerup-magnet.webp');
        this.load.image('powerup-slowmo-img', ASSET_BASE + 'powerup-slowmo.webp');
        this.load.image('powerup-ghost-img', ASSET_BASE + 'powerup-ghost.webp');
        this.load.image('powerup-gun', ASSET_BASE + 'powerup-gun.webp');

        // Load audio
        this.load.audio('bgm', ASSET_BASE + 'bgm.mp3');
        this.load.audio('sfx-coin', ASSET_BASE + 'coin.mp3');
        this.load.audio('sfx-laser', ASSET_BASE + 'laser.mp3');
        this.load.audio('sfx-powerup', ASSET_BASE + 'powerup.mp3');
        this.load.audio('sfx-explosion', ASSET_BASE + 'explosion.mp3');
        this.load.audio('sfx-whoosh', ASSET_BASE + 'whoosh.mp3');

        // Procedural textures (laser only)
        const g = this.make.graphics({ x: 0, y: 0 });

        // LASER BEAM
        g.fillStyle(0xFF0000, 0.3);
        g.fillRect(0, 0, 8, 40);
        g.fillStyle(0xFF4400, 0.6);
        g.fillRect(1, 0, 6, 40);
        g.fillStyle(0xFF8800, 0.9);
        g.fillRect(2, 0, 4, 40);
        g.fillStyle(0xFFFF00, 1);
        g.fillRect(3, 0, 2, 40);
        g.generateTexture('laser-beam', 8, 40);
        g.clear();

        g.destroy();
    }

    create() {
        // Calculate dimensions from actual screen size
        this.CANVAS_W = this.scale.width;
        this.CANVAS_H = this.scale.height;

        // Track fills 75% of width, centered
        this.TRACK_WIDTH = Math.floor(this.CANVAS_W * 0.75);
        this.LANE_WIDTH = Math.floor(this.TRACK_WIDTH / this.LANE_COUNT);
        this.TRACK_WIDTH = this.LANE_WIDTH * this.LANE_COUNT;
        this.TRACK_LEFT = Math.floor((this.CANVAS_W - this.TRACK_WIDTH) / 2);

        // Generate space background
        this.generateSpaceBackground();

        // Background tileSprite
        this.background = this.add.tileSprite(
            this.CANVAS_W / 2, this.CANVAS_H / 2,
            this.CANVAS_W, this.CANVAS_H,
            'floor-space'
        );
        this.background.setDepth(-10);

        // Star particles
        this.starGraphics = this.add.graphics();
        this.starGraphics.setDepth(-5);
        this.initStarParticles();

        // HUD — 8-bit style font
        const fontFamily = '"Press Start 2P", "Courier New", monospace';

        this.scoreText = this.add.text(this.CANVAS_W / 2, 20, '0', {
            fontSize: '36px',
            fontFamily,
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            padding: { top: 4, bottom: 4 },
        }).setOrigin(0.5, 0).setDepth(60);

        // Coin icon (image) + text
        const coinIconSize = 24;
        const coinIconX = this.CANVAS_W / 2 - 20;
        this.add.image(coinIconX, 66, 'coin-img')
            .setDisplaySize(coinIconSize, coinIconSize)
            .setOrigin(0.5, 0.5)
            .setDepth(60);

        this.coinText = this.add.text(coinIconX + 18, 56, '0', {
            fontSize: '18px',
            fontFamily,
            color: '#F1C40F',
            stroke: '#000000',
            strokeThickness: 3,
            padding: { top: 4, bottom: 4 },
        }).setOrigin(0, 0).setDepth(60);

        this.sectorText = this.add.text(this.TRACK_LEFT + 4, 70, 'SECTOR 1', {
            fontSize: '18px',
            fontFamily,
            color: '#AA88FF',
            stroke: '#000000',
            strokeThickness: 3,
            padding: { top: 4, bottom: 4 },
        }).setOrigin(0, 0).setDepth(60);

        // Player
        const centerLaneX = this.TRACK_LEFT + 2.5 * this.LANE_WIDTH;
        const playerY = this.CANVAS_H * 0.78;
        this.player = new Player(this, centerLaneX, playerY, this.LANE_WIDTH);
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(30);

        // World bounds = track area
        this.physics.world.setBounds(this.TRACK_LEFT, 0, this.TRACK_WIDTH, this.CANVAS_H);
        this.player.setCollideWorldBounds(true);

        this.obstacleManager = new ObstacleManager(this, {
            trackLeft: this.TRACK_LEFT,
            laneWidth: this.LANE_WIDTH,
            laneCount: this.LANE_COUNT,
            trackWidth: this.TRACK_WIDTH,
            canvasH: this.CANVAS_H,
        });

        // Collisions
        this.physics.add.overlap(this.player, this.obstacleManager.getObstacles(), this.handleCollision, undefined, this);
        this.physics.add.overlap(this.player, this.obstacleManager.getLasers(), this.handleCollision, undefined, this);
        this.physics.add.overlap(this.player, this.obstacleManager.getZones(), this.handleZoneOverlap, undefined, this);

        // Controls (direction only, no shape buttons)
        this.createControls();

        // Resize handler
        this.scale.on('resize', this.handleResize, this);

        // Start BGM
        if (!this.sound.get('bgm')) {
            this.sound.add('bgm', { loop: true, volume: 0.4 }).play();
        }
    }

    private generateSpaceBackground() {
        const g = this.make.graphics({ x: 0, y: 0 });
        const w = this.CANVAS_W;
        const h = this.CANVAS_H;
        const sideWidth = this.TRACK_LEFT;

        g.fillStyle(0x0a0a2e);
        g.fillRect(0, 0, w, h);

        // Nebula sides
        g.fillStyle(0x1a0a3e, 0.4);
        g.fillRect(0, 0, sideWidth + 20, h);
        g.fillRect(w - sideWidth - 20, 0, sideWidth + 20, h);
        g.fillStyle(0x2a1a4e, 0.2);
        g.fillRect(0, 0, sideWidth / 2, h);
        g.fillRect(w - sideWidth / 2, 0, sideWidth / 2, h);

        // Side barriers
        g.fillStyle(0x6633CC, 0.6);
        g.fillRect(this.TRACK_LEFT - 2, 0, 4, h);
        g.fillRect(this.TRACK_LEFT + this.TRACK_WIDTH - 2, 0, 4, h);
        g.fillStyle(0xAA66FF, 0.3);
        for (let dy = 0; dy < h; dy += 20) {
            g.fillRect(this.TRACK_LEFT - 2, dy, 4, 10);
            g.fillRect(this.TRACK_LEFT + this.TRACK_WIDTH - 2, dy, 4, 10);
        }

        // Lane markers
        g.fillStyle(0x3344AA, 0.15);
        for (let i = 1; i < this.LANE_COUNT; i++) {
            const lx = this.TRACK_LEFT + i * this.LANE_WIDTH;
            for (let dy = 0; dy < h; dy += 60) {
                g.fillRect(lx - 1, dy, 2, 30);
            }
        }

        // Stars
        for (let i = 0; i < 30; i++) {
            const sx = Phaser.Math.Between(0, w);
            const sy = Phaser.Math.Between(0, h);
            g.fillStyle(0xFFFFFF, 0.3 + Math.random() * 0.5);
            g.fillCircle(sx, sy, 1 + Math.random() * 1.5);
        }

        g.generateTexture('floor-space', w, h);
        g.destroy();
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        this.CANVAS_W = gameSize.width;
        this.CANVAS_H = gameSize.height;
        this.cameras.main.setSize(this.CANVAS_W, this.CANVAS_H);
    }

    private initStarParticles() {
        this.starParticles = [];
        for (let i = 0; i < 40; i++) {
            this.starParticles.push({
                x: Phaser.Math.Between(0, this.CANVAS_W),
                y: Phaser.Math.Between(0, this.CANVAS_H),
                size: 0.5 + Math.random() * 2,
                alpha: 0.2 + Math.random() * 0.8,
                speed: 20 + Math.random() * 60,
            });
        }
    }

    private updateStarParticles(delta: number) {
        this.starGraphics.clear();
        const dt = delta / 1000;
        for (const star of this.starParticles) {
            star.y += star.speed * dt;
            if (star.y > this.CANVAS_H) {
                star.y = -5;
                star.x = Phaser.Math.Between(0, this.CANVAS_W);
            }
            const twinkle = 0.7 + 0.3 * Math.sin(star.y * 0.05 + star.x * 0.03);
            this.starGraphics.fillStyle(0xFFFFFF, star.alpha * twinkle);
            this.starGraphics.fillCircle(star.x, star.y, star.size);
        }
    }

    private createControls() {
        const btnSize = 72;
        const btnY = this.CANVAS_H - 55;
        const btnAlpha = 0.85;

        // Left / Fire / Right buttons
        const cx = this.CANVAS_W / 2;
        const leftBtnX = cx - 80;
        const fireBtnX = cx;
        const rightBtnX = cx + 80;

        // Left
        const leftBtn = this.add.rectangle(leftBtnX, btnY, btnSize, btnSize, 0x263238, btnAlpha)
            .setInteractive({ useHandCursor: true })
            .setDepth(60)
            .setStrokeStyle(3, 0xFFFFFF, 0.5);
        this.add.text(leftBtnX, btnY, '◀', { fontSize: '36px', color: '#FFFFFF' })
            .setOrigin(0.5).setDepth(61);

        // Fire (Gun) button — red/orange
        this.gunBtn = this.add.rectangle(fireBtnX, btnY, btnSize, btnSize, 0xCC3300, btnAlpha)
            .setInteractive({ useHandCursor: true })
            .setDepth(60)
            .setStrokeStyle(3, 0xFF6600, 0.8);
        this.add.text(fireBtnX, btnY, '💥', { fontSize: '32px' })
            .setOrigin(0.5).setDepth(61);

        // Ammo badge (top-right corner of fire button)
        const badgeBg = this.add.circle(fireBtnX + 28, btnY - 28, 14, 0xFFFF00, 1)
            .setDepth(62);
        this.gunAmmoText = this.add.text(fireBtnX + 28, btnY - 28, String(this.gunAmmo), {
            fontSize: '16px',
            fontFamily: '"Press Start 2P", "Courier New", monospace',
            color: '#000000',
        }).setOrigin(0.5).setDepth(63);

        // Right
        const rightBtn = this.add.rectangle(rightBtnX, btnY, btnSize, btnSize, 0x263238, btnAlpha)
            .setInteractive({ useHandCursor: true })
            .setDepth(60)
            .setStrokeStyle(3, 0xFFFFFF, 0.5);
        this.add.text(rightBtnX, btnY, '▶', { fontSize: '36px', color: '#FFFFFF' })
            .setOrigin(0.5).setDepth(61);

        // Movement handlers
        leftBtn.on('pointerdown', () => this.player.startMoveLeft());
        leftBtn.on('pointerup', () => this.player.stopMove());
        leftBtn.on('pointerout', () => this.player.stopMove());
        rightBtn.on('pointerdown', () => this.player.startMoveRight());
        rightBtn.on('pointerup', () => this.player.stopMove());
        rightBtn.on('pointerout', () => this.player.stopMove());

        // Fire gun handler
        this.gunBtn.on('pointerdown', () => this.fireGun());
    }

    private fireGun() {
        if (this.isGameOver || this.isPaused) return;
        if (this.gunAmmo <= 0) return;

        this.gunAmmo--;
        this.gunAmmoText.setText(String(this.gunAmmo));
        this.updateGunButtonVisual();

        // Play explosion SFX
        this.sound.play('sfx-explosion', { volume: 0.5 });

        // Camera flash
        this.cameras.main.flash(100, 255, 100, 0, false);

        // Find the lane the player is in
        const playerX = this.player.x;
        const playerLane = Math.floor((playerX - this.TRACK_LEFT) / this.LANE_WIDTH);
        const laneLeft = this.TRACK_LEFT + playerLane * this.LANE_WIDTH;
        const laneRight = laneLeft + this.LANE_WIDTH;

        // Destroy all obstacles in the same lane that are above the player
        const toDestroy: Phaser.Physics.Arcade.Sprite[] = [];
        this.obstacleManager.getObstacles().getChildren().forEach((child: any) => {
            const sprite = child as Phaser.Physics.Arcade.Sprite;
            if (!sprite.active) return;
            const type = sprite.getData('type');
            if (type !== 'OBSTACLE') return; // Only destroy ship obstacles
            // Check if in same lane
            if (sprite.x >= laneLeft && sprite.x < laneRight && sprite.y < this.player.y) {
                toDestroy.push(sprite);
            }
        });

        // Also destroy lasers in the lane
        this.obstacleManager.getLasers().getChildren().forEach((child: any) => {
            const sprite = child as Phaser.Physics.Arcade.Sprite;
            if (!sprite.active) return;
            if (sprite.x >= laneLeft && sprite.x < laneRight && sprite.y < this.player.y) {
                toDestroy.push(sprite);
            }
        });

        // Add bullet visual streaking upward
        const bullet = this.add.rectangle(playerX, this.player.y - 30, 4, 20, 0xFFFF00, 1).setDepth(25);
        this.tweens.add({
            targets: bullet,
            y: -50,
            duration: 300,
            ease: 'Quad.easeIn',
            onComplete: () => bullet.destroy(),
        });

        // Destroy obstacles with explosion effect
        for (const sprite of toDestroy) {
            this.spawnExplosionEffect(sprite.x, sprite.y);
            this.score += 100;
            const group = sprite.getData('type') === 'LASER'
                ? this.obstacleManager.getLasers()
                : this.obstacleManager.getObstacles();
            group.killAndHide(sprite);
            group.remove(sprite, true, true);
        }

        if (toDestroy.length > 0) {
            this.scoreText.setText(String(Math.floor(this.score)));
        }
    }

    private spawnExplosionEffect(x: number, y: number) {
        // Create expanding ring + particles
        const ring = this.add.circle(x, y, 5, 0xFF6600, 0.9).setDepth(50);
        this.tweens.add({
            targets: ring,
            radius: 40,
            alpha: 0,
            duration: 300,
            ease: 'Quad.easeOut',
            onUpdate: () => {
                ring.setScale(ring.scaleX);
            },
            onComplete: () => ring.destroy(),
        });

        // Particle sparks
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const spark = this.add.rectangle(
                x, y, 4, 4,
                Phaser.Math.Between(0, 1) ? 0xFFFF00 : 0xFF4400, 1
            ).setDepth(50);

            this.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * 50,
                y: y + Math.sin(angle) * 50,
                alpha: 0,
                duration: 250 + Math.random() * 150,
                ease: 'Quad.easeOut',
                onComplete: () => spark.destroy(),
            });
        }
    }

    private updateGunButtonVisual() {
        if (this.gunAmmo > 0) {
            this.gunBtn.setFillStyle(0xCC3300, 0.85);
            this.gunBtn.setStrokeStyle(3, 0xFF6600, 0.8);
        } else {
            this.gunBtn.setFillStyle(0x333333, 0.5);
            this.gunBtn.setStrokeStyle(3, 0x555555, 0.4);
        }
    }

    update(time: number, delta: number) {
        if (this.isGameOver || this.isPaused) return;

        this.player.update();
        this.obstacleManager.update(time, delta);

        // Magnet
        if (this.magnetActive) {
            this.obstacleManager.getObstacles().getChildren().forEach((child: any) => {
                if (child.getData('type') === 'COIN') {
                    this.physics.moveToObject(child, this.player, 500);
                }
            });
        }

        this.score += (this.obstacleManager.currentSpeed * delta / 1000) / 10;
        this.scoreText.setText(String(Math.floor(this.score)));

        this.player.setSurface('NORMAL');
        this.background.tilePositionY -= this.obstacleManager.currentSpeed * (delta / 1000);
        this.updateStarParticles(delta);
        this.checkSectorTransition();
    }

    private checkSectorTransition() {
        const s = Math.floor(this.score);
        let newSector = 1;
        if (s >= 3000) newSector = 4;
        else if (s >= 1500) newSector = 3;
        else if (s >= 500) newSector = 2;

        if (newSector > this.currentSector) {
            this.currentSector = newSector;
            this.sectorText.setText('SECTOR ' + this.currentSector);
            this.obstacleManager.setSector(this.currentSector);

            if (!this.shownTutorials.has(newSector)) {
                this.shownTutorials.add(newSector);
                this.showSectorTutorial(newSector);
            }
        }
    }

    private showSectorTutorial(sector: number) {
        switch (sector) {
            case 2:
                this.showTutorialPopup('⚠️ WARNING!', 'ยานข้างหน้าจะยิงเลเซอร์\nหลบให้ดี!');
                break;
            case 3:
                this.showTutorialPopup('🕳️ SPACE HOLE!', 'ถ้าบินผ่านจะช้าลง 2 วินาที');
                break;
            case 4:
                this.showTutorialPopup('� MAX SPEED!', 'ระวัง! ยานศัตรูหนาแน่นขึ้น');
                break;
        }
    }

    private showTutorialPopup(title: string, body: string) {
        this.isPaused = true;
        this.physics.pause();
        const cx = this.CANVAS_W / 2;
        const cy = this.CANVAS_H / 2;
        const fontFamily = '"Press Start 2P", "Courier New", monospace';

        const overlay = this.add.rectangle(cx, cy, this.CANVAS_W, this.CANVAS_H, 0x000000, 0.7).setDepth(90);
        const popupBg = this.add.rectangle(cx, cy - 50, Math.min(360, this.CANVAS_W * 0.85), 220, 0x1a1a4e, 0.95)
            .setDepth(91).setStrokeStyle(3, 0x6633CC);

        const titleText = this.add.text(cx, cy - 120, title, {
            fontSize: '24px', fontFamily, color: '#FFFF00',
            stroke: '#000000', strokeThickness: 4,
            padding: { top: 4, bottom: 4 },
        }).setOrigin(0.5).setDepth(92);

        const bodyText = this.add.text(cx, cy - 60, body, {
            fontSize: '18px', color: '#CCCCFF', align: 'center',
            lineSpacing: 8, padding: { top: 4, bottom: 4 },
        }).setOrigin(0.5).setDepth(92);

        const okBtn = this.add.rectangle(cx, cy + 30, 180, 48, 0x4CAF50, 0.9)
            .setInteractive({ useHandCursor: true }).setDepth(92)
            .setStrokeStyle(2, 0xFFFFFF, 0.5);

        const okText = this.add.text(cx, cy + 30, 'OK!', {
            fontSize: '18px', fontFamily, color: '#FFFFFF',
            padding: { top: 4, bottom: 4 },
        }).setOrigin(0.5).setDepth(93);

        okBtn.on('pointerdown', () => {
            [overlay, popupBg, titleText, bodyText, okBtn, okText].forEach(o => o.destroy());
            this.isPaused = false;
            this.physics.resume();
        });
    }

    private handleZoneOverlap(_player: any, zone: any) {
        if (zone.getData('type') === 'SPACE_HOLE') {
            if (!this.player.isInSpaceHole()) {
                this.sound.play('sfx-whoosh', { volume: 0.5 });
            }
            (this.player as Player).setSurface('SPACE_HOLE');
        }
    }

    private handleCollision(_player: any, obstacle: any) {
        if (this.isGameOver) return;
        const obstacleType = obstacle.getData('type');

        if (obstacleType === 'OBSTACLE' || obstacleType === 'LASER') {
            this.doGameOver();
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
        this.coinText.setText(String(this.coins));
        this.sound.play('sfx-coin', { volume: 0.5 });
    }

    private collectPowerup(powerup: any) {
        const type = powerup.getData('powerupType');
        (powerup as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
        this.sound.play('sfx-powerup', { volume: 0.5 });
        if (type === 'MAGNET') this.activateMagnet();
        else if (type === 'GHOST') this.activateGhost();
        else if (type === 'SLOWMO') this.activateSlowMo();
        else if (type === 'GUN') this.collectGun();
    }

    private collectGun() {
        if (this.gunAmmo < 1) {
            this.gunAmmo = 1;
            this.gunAmmoText.setText(String(this.gunAmmo));
            this.updateGunButtonVisual();
        }
    }

    private activateMagnet() {
        this.magnetActive = true;
        this.time.delayedCall(5000, () => { this.magnetActive = false; });
    }

    private activateGhost() {
        this.ghostActive = true;
        this.player.setAlpha(0.5);
        this.time.delayedCall(5000, () => { this.ghostActive = false; this.player.setAlpha(1); });
    }

    private activateSlowMo() {
        if (this.slowMoActive) return;
        this.slowMoActive = true;
        this.originalSpeed = this.obstacleManager.currentSpeed;
        this.obstacleManager.currentSpeed /= 2;
        this.time.delayedCall(5000, () => {
            this.slowMoActive = false;
            if (this.obstacleManager.currentSpeed < this.originalSpeed * 2) this.obstacleManager.currentSpeed *= 2;
        });
    }

    private doGameOver() {
        if (this.ghostActive) return;
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        this.obstacleManager.stop();
        this.cameras.main.shake(300, 0.02);

        // Stop BGM, play explosion
        this.sound.stopByKey('bgm');
        this.sound.play('sfx-explosion', { volume: 0.6 });

        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({ success: true, score: Math.floor(this.score), stars: 0 });
        }
    }
}
