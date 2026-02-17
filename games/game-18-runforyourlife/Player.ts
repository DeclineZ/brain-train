import Phaser from 'phaser';

export type PlayerShape = 'CIRCLE' | 'SQUARE' | 'TRIANGLE';

export class Player extends Phaser.Physics.Arcade.Sprite {
    private currentShape: PlayerShape = 'SQUARE';
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private shapeKeys!: {
        circle: Phaser.Input.Keyboard.Key;
        square: Phaser.Input.Keyboard.Key;
        triangle: Phaser.Input.Keyboard.Key;
    };

    // Movement feel tuned for portrait 480×800
    private readonly SPEED = 300;
    private readonly ACCELERATION = 700;
    private readonly DRAG = 400;

    // Button-driven movement state
    private moveDirection: number = 0; // -1 left, 0 none, 1 right

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'player-square');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setDrag(this.DRAG);
        this.setDamping(false);
        this.setMaxVelocity(this.SPEED);

        // Keyboard fallback
        if (scene.input.keyboard) {
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.shapeKeys = {
                circle: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
                square: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
                triangle: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
            };
        }

        this.updateShapeVisual();
    }

    update() {
        this.handleMovement();
        this.handleShapeSwitching();
    }

    private handleMovement() {
        this.setAcceleration(0);

        // On-screen button state takes priority
        if (this.moveDirection !== 0) {
            this.setAccelerationX(this.ACCELERATION * this.moveDirection);
        }
        // Keyboard fallback
        else if (this.cursors) {
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

    private handleShapeSwitching() {
        if (!this.shapeKeys) return;
        if (Phaser.Input.Keyboard.JustDown(this.shapeKeys.circle)) {
            this.setShape('CIRCLE');
        } else if (Phaser.Input.Keyboard.JustDown(this.shapeKeys.square)) {
            this.setShape('SQUARE');
        } else if (Phaser.Input.Keyboard.JustDown(this.shapeKeys.triangle)) {
            this.setShape('TRIANGLE');
        }
    }

    // --- Public methods for on-screen buttons ---
    public startMoveLeft() {
        this.moveDirection = -1;
    }

    public startMoveRight() {
        this.moveDirection = 1;
    }

    public stopMove() {
        this.moveDirection = 0;
    }

    public setShape(shape: PlayerShape) {
        if (this.currentShape === shape) return;
        this.currentShape = shape;
        this.updateShapeVisual();

        this.scene.tweens.add({
            targets: this,
            scale: { from: 1.3, to: 1 },
            duration: 200,
            ease: 'Back.out'
        });
    }

    private updateShapeVisual() {
        switch (this.currentShape) {
            case 'CIRCLE':
                this.setTexture('player-circle');
                break;
            case 'SQUARE':
                this.setTexture('player-square');
                break;
            case 'TRIANGLE':
                this.setTexture('player-triangle');
                break;
        }
    }

    public getShape(): PlayerShape {
        return this.currentShape;
    }

    public setSurface(type: 'NORMAL' | 'ICE' | 'MUD') {
        switch (type) {
            case 'NORMAL':
                this.setDrag(this.DRAG);
                this.setMaxVelocity(this.SPEED);
                break;
            case 'ICE':
                this.setDrag(this.DRAG / 5);
                this.setMaxVelocity(this.SPEED * 1.2);
                break;
            case 'MUD':
                this.setDrag(this.DRAG * 2);
                this.setMaxVelocity(this.SPEED * 0.5);
                break;
        }
    }
}
