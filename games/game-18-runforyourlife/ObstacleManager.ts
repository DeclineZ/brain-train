import Phaser from 'phaser';

export class ObstacleManager {
    private scene: Phaser.Scene;
    private obstacles: Phaser.Physics.Arcade.Group;
    private zones: Phaser.Physics.Arcade.Group;
    private nextSpawnTime: number = 0;
    private nextZoneTime: number = 0;
    private isStopped: boolean = false;

    // Game speed
    public currentSpeed: number = 180;
    private readonly MAX_SPEED = 600;
    private readonly SPEED_INCREMENT = 8;

    // Track config (must match GameScene)
    private readonly TRACK_LEFT = 60;
    private readonly LANE_WIDTH = 72;
    private readonly LANE_COUNT = 5;
    private readonly TRACK_WIDTH = 360;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.obstacles = this.scene.physics.add.group();
        this.zones = this.scene.physics.add.group();
    }

    // Get lane center X position (0-indexed)
    private laneX(index: number): number {
        return this.TRACK_LEFT + index * this.LANE_WIDTH + this.LANE_WIDTH / 2;
    }

    update(time: number, delta: number) {
        if (this.isStopped) return;

        // Speed up
        if (this.currentSpeed < this.MAX_SPEED) {
            this.currentSpeed += this.SPEED_INCREMENT * (delta / 1000);
        }

        // Spawn obstacles
        if (time > this.nextSpawnTime) {
            this.spawnObstacle();
            const delay = Math.max(500, (350 / this.currentSpeed) * 1000);
            this.nextSpawnTime = time + delay;
        }

        // Spawn zones
        if (time > this.nextZoneTime) {
            this.spawnZone();
            this.nextZoneTime = time + Phaser.Math.Between(6000, 12000);
        }

        // Update velocities
        this.obstacles.setVelocityY(this.currentSpeed);
        this.zones.setVelocityY(this.currentSpeed);

        // Cleanup off-screen
        this.cleanupGroup(this.obstacles);
        this.cleanupGroup(this.zones);
    }

    private cleanupGroup(group: Phaser.Physics.Arcade.Group) {
        group.getChildren().forEach((child) => {
            const sprite = child as Phaser.Physics.Arcade.Sprite;
            if (sprite.y > 900) {
                group.killAndHide(sprite);
                group.remove(sprite, true, true);
            }
        });
    }

    private spawnObstacle() {
        const laneIndex = Phaser.Math.Between(0, 4);
        const x = this.laneX(laneIndex);

        // 35% chance of gate, 65% obstacle
        const isGate = Phaser.Math.Between(0, 100) > 65;

        let texture = 'obstacle-container';
        let type = 'OBSTACLE';
        let shape = 'NONE';

        if (isGate) {
            const shapes = ['gate-circle', 'gate-square', 'gate-triangle'];
            const shapeNames = ['CIRCLE', 'SQUARE', 'TRIANGLE'];
            const index = Phaser.Math.Between(0, 2);
            texture = shapes[index];
            shape = shapeNames[index];
            type = 'GATE';
        }

        const obstacle = this.obstacles.create(x, -80, texture) as Phaser.Physics.Arcade.Sprite;
        obstacle.setData('type', type);
        obstacle.setData('shape', shape);
        obstacle.setVelocityY(this.currentSpeed);
        obstacle.setImmovable(true);
        obstacle.setDepth(10);

        if (obstacle.body) {
            obstacle.body.setSize(50, 50);
        }

        // Spawn coins in a different lane
        if (Phaser.Math.Between(0, 100) > 45) {
            let coinLane = laneIndex;
            while (coinLane === laneIndex) {
                coinLane = Phaser.Math.Between(0, 4);
            }
            this.spawnCoin(this.laneX(coinLane));
        }

        // Rare power-up
        if (Phaser.Math.Between(0, 100) > 92) {
            let powerLane = laneIndex;
            while (powerLane === laneIndex) {
                powerLane = Phaser.Math.Between(0, 4);
            }
            this.spawnPowerup(this.laneX(powerLane));
        }
    }

    private spawnCoin(x: number) {
        const coin = this.obstacles.create(x, -80, 'coin') as Phaser.Physics.Arcade.Sprite;
        coin.setData('type', 'COIN');
        coin.setVelocityY(this.currentSpeed);
        coin.setCircle(14);
        coin.setDepth(10);
    }

    private spawnPowerup(x: number) {
        const types = ['MAGNET', 'GHOST', 'SLOWMO'];
        const type = types[Phaser.Math.Between(0, 2)];
        let texture = 'powerup-magnet';
        if (type === 'GHOST') texture = 'powerup-ghost';
        else if (type === 'SLOWMO') texture = 'powerup-slowmo';

        const powerup = this.obstacles.create(x, -80, texture) as Phaser.Physics.Arcade.Sprite;
        powerup.setData('type', 'POWERUP');
        powerup.setData('powerupType', type);
        powerup.setVelocityY(this.currentSpeed);
        powerup.setDepth(10);
    }

    private spawnZone() {
        const type = Phaser.Math.Between(0, 1) === 0 ? 'ICE' : 'MUD';
        const texture = type === 'ICE' ? 'zone-ice' : 'zone-mud';

        // Center of track
        const x = this.TRACK_LEFT + this.TRACK_WIDTH / 2;
        const zone = this.zones.create(x, -200, texture) as Phaser.Physics.Arcade.Sprite;
        zone.setData('type', type);
        zone.setVelocityY(this.currentSpeed);
        zone.setImmovable(true);
        zone.setDepth(5);
    }

    public stop() {
        this.isStopped = true;
        this.obstacles.setVelocityY(0);
        this.zones.setVelocityY(0);
    }

    public getObstacles() {
        return this.obstacles;
    }

    public getZones() {
        return this.zones;
    }
}
