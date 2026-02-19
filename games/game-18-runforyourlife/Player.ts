import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    // Movement
    private readonly SPEED = 300;
    private readonly ACCELERATION = 700;
    private readonly DRAG = 400;
    private moveDirection: number = 0; // -1 left, 0 none, 1 right

    // Display size
    private shipSize: number;

    // Space hole slow effect
    private spaceHoleTimer: Phaser.Time.TimerEvent | null = null;
    private isSlowedByHole: boolean = false;

    // Tilt visual
    private currentTilt: 'left' | 'straight' | 'right' = 'straight';

    constructor(scene: Phaser.Scene, x: number, y: number, laneWidth: number) {
        super(scene, x, y, 'ship-straight');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Size ship to fit roughly 80% of lane width
        this.shipSize = Math.floor(laneWidth * 0.8);
        this.setDisplaySize(this.shipSize, this.shipSize);

        this.setCollideWorldBounds(true);
        this.setDrag(this.DRAG);
        this.setDamping(false);
        this.setMaxVelocity(this.SPEED);

        // Keyboard fallback
        if (scene.input.keyboard) {
            this.cursors = scene.input.keyboard.createCursorKeys();
        }
    }

    update() {
        this.handleMovement();
        this.updateTiltVisual();
    }

    private handleMovement() {
        this.setAcceleration(0);

        if (this.moveDirection !== 0) {
            this.setAccelerationX(this.ACCELERATION * this.moveDirection);
        } else if (this.cursors) {
            if (this.cursors.left.isDown) {
                this.setAccelerationX(-this.ACCELERATION);
            } else if (this.cursors.right.isDown) {
                this.setAccelerationX(this.ACCELERATION);
            }
            if (this.cursors.up.isDown) {
                this.setAccelerationY(-this.ACCELERATION);
            } else if (this.cursors.down.isDown) {
                this.setAccelerationY(this.ACCELERATION);
            }
        }
    }

    private updateTiltVisual() {
        const vx = this.body?.velocity.x || 0;
        let newTilt: 'left' | 'straight' | 'right' = 'straight';

        if (vx < -30) newTilt = 'left';
        else if (vx > 30) newTilt = 'right';

        if (newTilt !== this.currentTilt) {
            this.currentTilt = newTilt;
            switch (newTilt) {
                case 'left': this.setTexture('ship-left'); break;
                case 'right': this.setTexture('ship-right'); break;
                default: this.setTexture('ship-straight'); break;
            }
            this.setDisplaySize(this.shipSize, this.shipSize);
        }
    }

    public startMoveLeft() { this.moveDirection = -1; }
    public startMoveRight() { this.moveDirection = 1; }
    public stopMove() { this.moveDirection = 0; }

    public getShape(): string { return 'SHIP'; }
    public isInSpaceHole(): boolean { return this.isSlowedByHole; }

    public setSurface(type: 'NORMAL' | 'SPACE_HOLE') {
        switch (type) {
            case 'NORMAL':
                if (!this.isSlowedByHole) {
                    this.setDrag(this.DRAG);
                    this.setMaxVelocity(this.SPEED);
                }
                break;
            case 'SPACE_HOLE':
                if (!this.isSlowedByHole) {
                    this.isSlowedByHole = true;
                    this.setDrag(this.DRAG * 2);
                    this.setMaxVelocity(this.SPEED * 0.5);
                    this.setTint(0xAA66FF);

                    if (this.spaceHoleTimer) this.spaceHoleTimer.destroy();

                    this.spaceHoleTimer = this.scene.time.delayedCall(2000, () => {
                        this.isSlowedByHole = false;
                        this.setDrag(this.DRAG);
                        this.setMaxVelocity(this.SPEED);
                        this.clearTint();
                        this.spaceHoleTimer = null;
                    });
                }
                break;
        }
    }
}
