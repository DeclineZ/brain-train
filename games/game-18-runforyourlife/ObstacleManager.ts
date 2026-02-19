import Phaser from 'phaser';

export interface TrackConfig {
    trackLeft: number;
    laneWidth: number;
    laneCount: number;
    trackWidth: number;
    canvasH: number;
}

export class ObstacleManager {
    private scene: Phaser.Scene;
    private obstacles: Phaser.Physics.Arcade.Group;
    private lasers: Phaser.Physics.Arcade.Group;
    private zones: Phaser.Physics.Arcade.Group;
    private nextSpawnTime: number = 0;
    private nextZoneTime: number = 0;
    private isStopped: boolean = false;

    // Game speed — slower ramp for longer gameplay
    public currentSpeed: number = 80;
    private readonly MAX_SPEED = 350;
    private readonly SPEED_INCREMENT = 1.5;

    // Track config (received from GameScene)
    private readonly TRACK_LEFT: number;
    private readonly LANE_WIDTH: number;
    private readonly LANE_COUNT: number;
    private readonly TRACK_WIDTH: number;
    private readonly CANVAS_H: number;

    // Sector system
    private currentSector: number = 1;

    // Track occupied lanes per spawn wave to guarantee passable path
    private lastOccupiedLanes: Set<number> = new Set();
    private isTutorial: boolean = false;

    constructor(scene: Phaser.Scene, config: TrackConfig) {
        this.scene = scene;
        this.TRACK_LEFT = config.trackLeft;
        this.LANE_WIDTH = config.laneWidth;
        this.LANE_COUNT = config.laneCount;
        this.TRACK_WIDTH = config.trackWidth;
        this.CANVAS_H = config.canvasH;

        this.obstacles = this.scene.physics.add.group();
        this.lasers = this.scene.physics.add.group();
        this.zones = this.scene.physics.add.group();
    }

    private laneX(index: number): number {
        return this.TRACK_LEFT + index * this.LANE_WIDTH + this.LANE_WIDTH / 2;
    }

    public setSector(sector: number) {
        this.currentSector = sector;
    }

    update(time: number, delta: number) {
        if (this.isStopped) return;

        // In tutorial, we don't auto-spawn waves or zones
        if (this.isTutorial) {
            this.obstacles.setVelocityY(this.currentSpeed);
            this.zones.setVelocityY(this.currentSpeed);
            const offScreenY = this.CANVAS_H + 100;
            this.cleanupGroup(this.obstacles, offScreenY);
            return;
        }

        // Speed up (slow ramp)
        if (this.currentSpeed < this.MAX_SPEED) {
            this.currentSpeed += this.SPEED_INCREMENT * (delta / 1000);
        }

        // Spawn obstacles
        if (time > this.nextSpawnTime) {
            this.spawnWave();
            const baseDelay = Math.max(600, (500 / this.currentSpeed) * 1000);
            const sectorMultiplier = Math.max(0.5, 1 - (this.currentSector - 1) * 0.1);
            this.nextSpawnTime = time + baseDelay * sectorMultiplier;
        }

        // Spawn zones (sector 3+)
        if (this.currentSector >= 3 && time > this.nextZoneTime) {
            this.spawnZone();
            this.nextZoneTime = time + Phaser.Math.Between(8000, 15000);
        }

        // Update obstacle velocities (NOT lasers)
        this.obstacles.setVelocityY(this.currentSpeed);
        this.zones.setVelocityY(this.currentSpeed);

        // Cleanup off-screen
        const offScreenY = this.CANVAS_H + 100;
        this.cleanupGroup(this.obstacles, offScreenY);
        this.cleanupGroup(this.lasers, offScreenY);
        this.cleanupGroup(this.zones, offScreenY);

        // Update shooter lasers
        this.updateShooters(time);
    }

    private cleanupGroup(group: Phaser.Physics.Arcade.Group, maxY: number) {
        group.getChildren().forEach((child) => {
            const sprite = child as Phaser.Physics.Arcade.Sprite;
            if (sprite.y > maxY) {
                group.killAndHide(sprite);
                group.remove(sprite, true, true);
            }
        });
    }

    private spawnWave() {
        this.lastOccupiedLanes.clear();

        let obstacleCount = 1;
        if (this.currentSector >= 2) obstacleCount = Phaser.Math.Between(1, 2);
        if (this.currentSector >= 3) obstacleCount = Phaser.Math.Between(1, 3);
        if (this.currentSector >= 4) obstacleCount = Phaser.Math.Between(2, 3);

        obstacleCount = Math.min(obstacleCount, this.LANE_COUNT - 1);

        const availableLanes = Array.from({ length: this.LANE_COUNT }, (_, i) => i);
        const chosenLanes: number[] = [];
        for (let i = 0; i < obstacleCount; i++) {
            if (availableLanes.length <= 1) break;
            const idx = Phaser.Math.Between(0, availableLanes.length - 1);
            chosenLanes.push(availableLanes[idx]);
            availableLanes.splice(idx, 1);
        }

        for (const lane of chosenLanes) {
            this.lastOccupiedLanes.add(lane);

            if (this.currentSector >= 2 && Phaser.Math.Between(0, 100) > 70) {
                this.spawnShooterShip(lane);
            } else {
                this.spawnWreckedShip(lane);
            }
        }

        // Spawn coins in an open lane
        if (Phaser.Math.Between(0, 100) > 35) {
            const openLanes = Array.from({ length: this.LANE_COUNT }, (_, i) => i).filter(l => !this.lastOccupiedLanes.has(l));
            if (openLanes.length > 0) {
                const coinLane = openLanes[Phaser.Math.Between(0, openLanes.length - 1)];
                this.spawnCoin(this.laneX(coinLane));
            }
        }

        // Rare power-up
        if (Phaser.Math.Between(0, 100) > 92) {
            const openLanes = Array.from({ length: this.LANE_COUNT }, (_, i) => i).filter(l => !this.lastOccupiedLanes.has(l));
            if (openLanes.length > 0) {
                const powerLane = openLanes[Phaser.Math.Between(0, openLanes.length - 1)];
                this.spawnPowerup(this.laneX(powerLane));
            }
        }
    }

    public spawnWreckedShip(laneIndex: number) {
        const x = this.laneX(laneIndex);
        const size = Math.floor(this.LANE_WIDTH * 0.85);
        const obstacle = this.obstacles.create(x, -80, 'enemy-wrecked') as Phaser.Physics.Arcade.Sprite;
        obstacle.setData('type', 'OBSTACLE');
        obstacle.setDisplaySize(size, size);
        obstacle.setVelocityY(this.currentSpeed);
        obstacle.setImmovable(true);
        obstacle.setDepth(10);
        if (obstacle.body) {
            obstacle.body.setSize(size * 0.8, size * 0.8);
        }
    }

    private spawnShooterShip(laneIndex: number) {
        const x = this.laneX(laneIndex);
        const size = Math.floor(this.LANE_WIDTH * 0.85);
        const shooter = this.obstacles.create(x, -80, 'enemy-shooter') as Phaser.Physics.Arcade.Sprite;
        shooter.setData('type', 'OBSTACLE');
        shooter.setData('isShooter', true);
        shooter.setData('lastShotTime', 0);
        shooter.setDisplaySize(size, size);
        shooter.setVelocityY(this.currentSpeed);
        shooter.setImmovable(true);
        shooter.setDepth(10);
        if (shooter.body) {
            shooter.body.setSize(size * 0.8, size * 0.8);
        }
    }

    private updateShooters(time: number) {
        const shootZoneMax = this.CANVAS_H * 0.8;
        this.obstacles.getChildren().forEach((child) => {
            const sprite = child as Phaser.Physics.Arcade.Sprite;
            if (!sprite.getData('isShooter')) return;
            if (!sprite.active) return;

            if (sprite.y < 50 || sprite.y > shootZoneMax) return;

            const lastShot = sprite.getData('lastShotTime') || 0;

            if (time - lastShot > 300) {
                this.fireLaser(sprite.x, sprite.y + 40);
                sprite.setData('lastShotTime', time);
            }
        });
    }

    private fireLaser(x: number, y: number) {
        const laser = this.lasers.create(x, y, 'laser-beam') as Phaser.Physics.Arcade.Sprite;
        laser.setData('type', 'LASER');
        laser.setVelocityY(this.currentSpeed + 500);
        laser.setImmovable(false);
        laser.setDepth(12);
        if (laser.body) {
            laser.body.setSize(6, 30);
        }
        this.scene.sound.play('sfx-laser', { volume: 0.2 });
    }

    private spawnCoin(x: number) {
        const coinSize = Math.floor(this.LANE_WIDTH * 0.45);
        const coin = this.obstacles.create(x, -80, 'coin-img') as Phaser.Physics.Arcade.Sprite;
        coin.setData('type', 'COIN');
        coin.setDisplaySize(coinSize, coinSize);
        coin.setVelocityY(this.currentSpeed);
        coin.setCircle(coinSize / 2);
        coin.setDepth(10);
    }

    private spawnPowerup(x: number) {
        const types = ['MAGNET', 'GHOST', 'SLOWMO', 'GUN'];
        const type = types[Phaser.Math.Between(0, 3)];
        let texture = 'powerup-magnet-img';
        if (type === 'GHOST') texture = 'powerup-ghost-img';
        else if (type === 'SLOWMO') texture = 'powerup-slowmo-img';
        else if (type === 'GUN') texture = 'powerup-gun';

        const pwSize = Math.floor(this.LANE_WIDTH * 0.55);
        const powerup = this.obstacles.create(x, -80, texture) as Phaser.Physics.Arcade.Sprite;
        powerup.setData('type', 'POWERUP');
        powerup.setData('powerupType', type);
        powerup.setDisplaySize(pwSize, pwSize);
        powerup.setVelocityY(this.currentSpeed);
        powerup.setDepth(10);
    }

    private spawnZone() {
        const x = this.TRACK_LEFT + this.TRACK_WIDTH / 2;
        // Generate zone-spacehole texture dynamically based on track width
        const g = this.scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x1a0033, 0.5);
        g.fillRect(0, 0, this.TRACK_WIDTH, 160);
        for (let r = 60; r > 10; r -= 12) {
            const alpha = 0.15 + (60 - r) * 0.005;
            g.lineStyle(3, 0x8833FF, alpha);
            g.strokeCircle(this.TRACK_WIDTH / 2, 80, r);
        }
        g.fillStyle(0xCC66FF, 0.3);
        g.fillCircle(this.TRACK_WIDTH / 2, 80, 15);
        g.fillStyle(0xFFAAFF, 0.2);
        g.fillCircle(this.TRACK_WIDTH / 2, 80, 8);
        g.generateTexture('zone-spacehole-dyn', this.TRACK_WIDTH, 160);
        g.destroy();

        const zone = this.zones.create(x, -200, 'zone-spacehole-dyn') as Phaser.Physics.Arcade.Sprite;
        zone.setData('type', 'SPACE_HOLE');
        zone.setVelocityY(this.currentSpeed);
        zone.setImmovable(true);
        zone.setDepth(5);
    }

    public stop() {
        this.isStopped = true;
        this.obstacles.setVelocityY(0);
        this.lasers.setVelocityY(0);
        this.zones.setVelocityY(0);
    }

    public getObstacles() {
        return this.obstacles;
    }

    public getLasers() {
        return this.lasers;
    }

    public getZones() {
        return this.zones;
    }

    public setTutorialMode(enabled: boolean) {
        this.isTutorial = enabled;
    }

    public spawnWreckedShipTarget(laneIndex: number) {
        const x = this.laneX(laneIndex);
        const size = Math.floor(this.LANE_WIDTH * 0.85);

        // Target for shooting tutorial - distinct look (maybe flashes?)
        const obstacle = this.obstacles.create(x, -80, 'enemy-wrecked') as Phaser.Physics.Arcade.Sprite;
        obstacle.setData('type', 'OBSTACLE');
        obstacle.setData('isTarget', true); // Identify as tutorial target
        obstacle.setDisplaySize(size, size);
        obstacle.setVelocityY(this.currentSpeed * 0.5); // Moves slower
        obstacle.setImmovable(true);
        obstacle.setDepth(10);
        obstacle.setTint(0xFF0000); // Red tint to indicate target
        if (obstacle.body) {
            obstacle.body.setSize(size * 0.8, size * 0.8);
        }
    }
}
