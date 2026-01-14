import { Floatboat } from '../types';

export class FloatboatController {
  private scene: Phaser.Scene;
  private floatboat: Floatboat | null = null;
  private velocityX: number = 0;
  private isDragging: boolean = false;
  private targetX: number = 0;
  private lastMovementTime: number = 0;
  private leftArrowHint!: Phaser.GameObjects.Container;
  private rightArrowHint!: Phaser.GameObjects.Container;
  private isBoatMoving: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create the floatboat sprite at the bottom of the screen
   */
  createFloatboat(yPosition: number): Floatboat {
    const { width } = this.scene.scale;
    const boatWidth = Math.min(120, width * 0.2);
    const boatHeight = Math.min(100, width * 0.1); // Made boat taller (from 60 to 100)
    const x = width / 2;

    const container = this.scene.add.container(x, yPosition);
    container.setSize(boatWidth, boatHeight);

    // Create boat body (simple boat shape using graphics)
    const boatGraphics = this.scene.add.graphics();
    
    // Boat hull (brown/wood color) - made taller
    boatGraphics.fillStyle(0x8B4513, 1);
    boatGraphics.beginPath();
    boatGraphics.moveTo(-boatWidth / 2, -boatHeight / 2);
    boatGraphics.lineTo(-boatWidth / 2 + 15, boatHeight / 2);
    boatGraphics.lineTo(boatWidth / 2 - 15, boatHeight / 2);
    boatGraphics.lineTo(boatWidth / 2, -boatHeight / 2);
    boatGraphics.closePath();
    boatGraphics.fillPath();

    // Boat deck (lighter wood) - made taller
    boatGraphics.fillStyle(0xDEB887, 1);
    boatGraphics.fillRoundedRect(-boatWidth / 2 + 18, -boatHeight / 2 + 8, boatWidth - 36, boatHeight / 2, 8);

    // Add some decorative stripes
    boatGraphics.lineStyle(3, 0xFFFFFF, 0.5);
    boatGraphics.beginPath();
    boatGraphics.moveTo(-boatWidth / 2 + 20, 0);
    boatGraphics.lineTo(boatWidth / 2 - 20, 0);
    boatGraphics.strokePath();

    // Add small mast/sail for visual interest - adjusted for taller boat
    const mast = this.scene.add.graphics();
    mast.fillStyle(0x8B4513, 1);
    mast.fillRect(-3, -boatHeight / 2 - 30, 6, 35);
    
    // Sail
    mast.fillStyle(0xFFFFFF, 0.9);
    mast.beginPath();
    mast.moveTo(0, -boatHeight / 2 - 55);
    mast.lineTo(0, -boatHeight / 2 - 30);
    mast.lineTo(30, -boatHeight / 2 - 30);
    mast.closePath();
    mast.fillPath();

    container.add([boatGraphics, mast]);

    // Make container interactive for drag
    container.setInteractive({
      useHandCursor: true,
      draggable: true,
    });

    // Set up drag events
    container.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      // Only allow horizontal movement
      const newY = yPosition; // Keep at fixed Y position
      container.setPosition(dragX, newY);
      this.targetX = dragX;
      this.onBoatMoved();
    });

    container.on('dragend', () => {
      this.isDragging = false;
    });

    container.on('pointerdown', () => {
      this.isDragging = true;
      this.targetX = container.x;
    });

    // Store floatboat data
    this.floatboat = {
      container,
      x,
      y: yPosition,
      width: boatWidth,
      height: boatHeight,
      speed: 8,
    };

    return this.floatboat;
  }

  /**
   * Get the floatboat object
   */
  getFloatboat(): Floatboat | null {
    return this.floatboat;
  }

  /**
   * Create arrow hint sprites
   */
  createMovementHints() {
    if (!this.floatboat || !this.floatboat.container) return;

    const { width } = this.scene.scale;

    // Left arrow hint
    this.leftArrowHint = this.createArrow('⬅️', -70, width);
    this.floatboat.container.add(this.leftArrowHint);
    
    // Right arrow hint
    this.rightArrowHint = this.createArrow('➡️', 70, width);
    this.floatboat.container.add(this.rightArrowHint);
    
    // Hide initially
    this.leftArrowHint.setVisible(false);
    this.rightArrowHint.setVisible(false);
  }

  /**
   * Create an arrow hint container
   */
  private createArrow(emoji: string, xOffset: number, screenWidth: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(xOffset, 0);
    const arrowSize = Math.min(40, screenWidth * 0.08);

    // Background circle
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xFFFF00, 0.8); // Yellow background
    bg.fillCircle(0, 0, arrowSize / 2);

    // Arrow text
    const text = this.scene.add.text(0, 0, emoji, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.min(28, screenWidth * 0.05)}px`,
    }).setOrigin(0.5);

    container.add([bg, text]);
    
    // Add pulsing animation
    this.scene.tweens.add({
      targets: container,
      scale: { from: 0.8, to: 1.2 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return container;
  }

  /**
   * Called when boat moves
   */
  onBoatMoved() {
    this.isBoatMoving = true;
    this.lastMovementTime = Date.now();
    this.leftArrowHint.setVisible(false);
    this.rightArrowHint.setVisible(false);
  }

  /**
   * Update movement hints (call from scene update)
   */
  updateMovementHints() {
    if (!this.isBoatMoving) return;

    const idleTime = Date.now() - this.lastMovementTime;
    
    // Show arrows if idle for 3 seconds
    if (idleTime > 3000) {
      this.leftArrowHint.setVisible(true);
      this.rightArrowHint.setVisible(true);
      this.isBoatMoving = false;
    }
  }

  /**
   * Get the collision bounds of the floatboat
   */
  getCollisionBounds(): Phaser.Geom.Rectangle | null {
    if (!this.floatboat) return null;

    const { container, width, height } = this.floatboat;
    return new Phaser.Geom.Rectangle(
      container.x - width / 2,
      container.y - height / 2,
      width,
      height
    );
  }

  /**
   * Move floatboat using keyboard arrow keys
   */
  handleKeyboardMovement(delta: number) {
    if (!this.floatboat || this.isDragging) return;

    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    const keys = keyboard.createCursorKeys();
    const speed = this.floatboat.speed * (delta / 16.67); // Normalize to 60fps

    let moved = false;

    if (keys.left.isDown) {
      this.floatboat.container.x -= speed;
      this.targetX = this.floatboat.container.x;
      moved = true;
    } else if (keys.right.isDown) {
      this.floatboat.container.x += speed;
      this.targetX = this.floatboat.container.x;
      moved = true;
    }

    if (moved) {
      this.onBoatMoved();
    }

    // Keep boat within screen bounds
    this.constrainToScreen();
  }

  /**
   * Constrain floatboat to stay within screen bounds
   */
  private constrainToScreen() {
    if (!this.floatboat) return;

    const { width } = this.scene.scale;
    const { container, width: boatWidth } = this.floatboat;
    const halfWidth = boatWidth / 2;

    // Keep boat within screen with margin
    const margin = 10;
    const minX = margin + halfWidth;
    const maxX = width - margin - halfWidth;

    if (container.x < minX) {
      container.x = minX;
    } else if (container.x > maxX) {
      container.x = maxX;
    }
  }

  /**
   * Check collision with a ball
   */
  checkCollision(ballX: number, ballY: number, ballRadius: number): boolean {
    const bounds = this.getCollisionBounds();
    if (!bounds) return false;

    // Check if ball center is within boat bounds (with some padding)
    const padding = ballRadius * 0.5;
    const contains = bounds.contains(ballX, ballY);
    
    return contains && 
      ballX >= bounds.x - padding &&
      ballX <= bounds.x + bounds.width + padding &&
      ballY >= bounds.y - padding &&
      ballY <= bounds.y + bounds.height + padding;
  }

  /**
   * Animate boat collecting a ball (bounce effect)
   */
  animateCollection(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.floatboat || !this.floatboat.container) {
        resolve();
        return;
      }

      this.scene.tweens.add({
        targets: this.floatboat.container,
        scaleX: 1.1,
        scaleY: 0.9,
        duration: 100,
        yoyo: true,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  /**
   * Destroy floatboat
   */
  destroy() {
    if (this.leftArrowHint) {
      this.leftArrowHint.removeAllListeners();
      this.leftArrowHint.destroy();
    }
    if (this.rightArrowHint) {
      this.rightArrowHint.removeAllListeners();
      this.rightArrowHint.destroy();
    }
    const boat = this.floatboat;
    if (boat && boat.container) {
      boat.container.removeAllListeners();
      boat.container.destroy();
      this.floatboat = null;
    }
  }
}
