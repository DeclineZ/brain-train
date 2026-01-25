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
  private signText!: Phaser.GameObjects.Text;
  private childrenWithSign!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create floatboat sprite at bottom of screen
   */
  createFloatboat(yPosition: number): Floatboat {
    const { width } = this.scene.scale;
    const boatWidth = Math.min(120, width * 0.35); // Wider for Boat.png
    const boatHeight = Math.min(120, width * 0.06); // Taller for Boat.png
    const x = width / 2;

    const container = this.scene.add.container(x, yPosition);
    container.setDepth(10); // Above balls (depth 0) but below other UI elements

    // Load and add boat image sprite
    const boatSprite = this.scene.add.image(0, 0, 'boat');
    boatSprite.setOrigin(0.5, 0.5);
    boatSprite.setScale(0.25); // Scale down Boat.png image appropriately

    // Calculate actual boat image size after scaling (drag box equals image)
    const boatDisplayWidth = boatSprite.width * boatSprite.scaleX;
    const boatDisplayHeight = boatSprite.height * boatSprite.scaleY;
    container.setSize(boatDisplayWidth, boatDisplayHeight);

    // Create children holding sign (moved to left side of boat)
    this.childrenWithSign = this.createChildrenWithSign(boatWidth, boatHeight, width);
    container.add([boatSprite, this.childrenWithSign]);

    // Make container interactive for drag
    container.setInteractive({
      useHandCursor: true,
      draggable: true,
    });

    // Set up drag events
    container.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      // Only allow horizontal movement
      const newY = yPosition; // Keep at fixed Y position
      
      // Use lerp for smooth drag movement to reduce jitter
      const lerpFactor = 0.6; // 60% lerp for responsive but smooth drag
      const currentX = container.x;
      const smoothedX = Phaser.Math.Linear(currentX, dragX, lerpFactor);
      
      container.setPosition(smoothedX, newY);
      this.targetX = smoothedX;
      this.onBoatMoved();
    });

    container.on('dragend', () => {
      this.isDragging = false;
      // Snap to nearest lane after drag ends
      this.snapToNearestLane();
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
    
    // Initialize last movement time so arrows will show after 3 seconds of being idle
    this.lastMovementTime = Date.now();

    return this.floatboat;
  }

  /**
   * Get floatboat object
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

    // Left arrow hint - add to boat container so it follows automatically
    this.leftArrowHint = this.createArrow('left', -100, width);
    this.floatboat.container.add(this.leftArrowHint); // Add to boat container
    this.leftArrowHint.setDepth(1500); // Above boat but below UI
    
    // Right arrow hint - add to boat container so it follows automatically
    this.rightArrowHint = this.createArrow('right', 100, width);
    this.floatboat.container.add(this.rightArrowHint); // Add to boat container
    this.rightArrowHint.setDepth(1500); // Above boat but below UI
    
    // Hide initially
    this.leftArrowHint.setVisible(false);
    this.rightArrowHint.setVisible(false);
  }

  /**
   * Create an arrow hint container using Phaser graphics
   */
  private createArrow(direction: 'left' | 'right', xOffset: number, screenWidth: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(xOffset, 0);
    const arrowSize = Math.min(40, screenWidth * 0.08);

    // Shadow (offset for depth effect)
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillCircle(3, 3, arrowSize / 2);

    // Background circle
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xFFFF00, 0.8); // Yellow background
    bg.lineStyle(3, 0xFFA000, 1); // Orange outline
    bg.fillCircle(0, 0, arrowSize / 2);
    bg.strokeCircle(0, 0, arrowSize / 2);

    // Arrow graphics
    const arrow = this.scene.add.graphics();
    arrow.fillStyle(0xFFFFFF, 1); // White arrow
    arrow.lineStyle(2, 0xFFFF00, 1); // Yellow outline
    
    if (direction === 'left') {
      // Draw left-pointing triangle
      arrow.fillTriangle(
        arrowSize / 3, -arrowSize / 3,  // Top
        arrowSize / 3, arrowSize / 3,   // Bottom
        -arrowSize / 3, 0              // Left point
      );
      arrow.strokeTriangle(
        arrowSize / 3, -arrowSize / 3,  // Top
        arrowSize / 3, arrowSize / 3,   // Bottom
        -arrowSize / 3, 0              // Left point
      );
    } else {
      // Draw right-pointing triangle
      arrow.fillTriangle(
        -arrowSize / 3, -arrowSize / 3,  // Top
        -arrowSize / 3, arrowSize / 3,   // Bottom
        arrowSize / 3, 0               // Right point
      );
      arrow.strokeTriangle(
        -arrowSize / 3, -arrowSize / 3,  // Top
        -arrowSize / 3, arrowSize / 3,   // Bottom
        arrowSize / 3, 0               // Right point
      );
    }

    container.add([shadow, bg, arrow]);
    
    // Make container interactive for click-to-move
    container.setSize(arrowSize, arrowSize);
    container.setInteractive({ useHandCursor: true });
    
    // Add click handler to move boat - emit event for GameScene to handle
    container.on('pointerdown', () => {
      this.onBoatMoved();
      // Emit event to trigger lane movement
      this.scene.events.emit('arrow-click', { direction });
    });
    
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
    if (this.leftArrowHint) {
      this.leftArrowHint.setVisible(false);
    }
    if (this.rightArrowHint) {
      this.rightArrowHint.setVisible(false);
    }
  }

  /**
   * Reset boat moving flag (called when movement completes)
   */
  resetIsBoatMoving() {
    this.isBoatMoving = false;
  }

  /**
   * Update movement hints (call from scene update)
   */
  updateMovementHints() {
    if (!this.floatboat) return;

    const idleTime = Date.now() - this.lastMovementTime;
    
    // Hide arrows when boat is moving
    if (this.isBoatMoving) {
      if (this.leftArrowHint) {
        this.leftArrowHint.setVisible(false);
      }
      if (this.rightArrowHint) {
        this.rightArrowHint.setVisible(false);
      }
    } else if (idleTime > 800) {
      // Show arrows if idle for 3 seconds (arrows are children of boat container, so they follow automatically)
      if (this.leftArrowHint) {
        this.leftArrowHint.setVisible(true);
      }
      if (this.rightArrowHint) {
        this.rightArrowHint.setVisible(true);
      }
    }
  }

  /**
   * Get collision bounds of floatboat
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
   * Snap boat to nearest lane
   */
  snapToNearestLane(): void {
    if (!this.floatboat || !this.floatboat.container) return;

    const { width } = this.scene.scale;
    const laneWidth = width / 3;
    
    // Calculate lane positions
    const lanes = {
      left: laneWidth * 0.5,
      center: width * 0.5,
      right: width * 0.75 + laneWidth * 0.25,
    };

    // Find nearest lane
    const currentX = this.floatboat.container.x;
    const distances = [
      { lane: 'left', center: lanes.left, distance: Math.abs(currentX - lanes.left) },
      { lane: 'center', center: lanes.center, distance: Math.abs(currentX - lanes.center) },
      { lane: 'right', center: lanes.right, distance: Math.abs(currentX - lanes.right) },
    ];
    
    distances.sort((a, b) => a.distance - b.distance);
    const nearest = distances[0];
    
    // Animate to nearest lane and reset moving flag
    this.scene.tweens.add({
      targets: this.floatboat.container,
      x: nearest.center,
      duration: 200,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.isBoatMoving = false; // Reset flag when movement completes
      },
    });
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
        scaleX:1.1,
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
   * Create children holding a sign with target text
   */
  private createChildrenWithSign(boatWidth: number, boatHeight: number, screenWidth: number): Phaser.GameObjects.Container {
    // Position on left side of boat (negative x offset)
    const container = this.scene.add.container(-boatWidth / 2 + 30, -boatHeight / 2 - 20);
    container.setDepth(11); // Above boat container (depth 10)
    
    const signWidth = Math.min(140, screenWidth * 0.25);
    const signHeight = Math.min(50, screenWidth * 0.2);

    // Create sign/board (white with blue border)
    const signBg = this.scene.add.graphics();
    signBg.fillStyle(0xFFFFFF, 1);
    signBg.lineStyle(4, 0x42A5F5, 1);
    signBg.fillRoundedRect(-signWidth / 2, -signHeight / 2, signWidth, signHeight, 10);
    signBg.strokeRoundedRect(-signWidth / 2, -signHeight / 2, signWidth, signHeight, 10);

    // Sign shadow
    const signShadow = this.scene.add.graphics();
    signShadow.fillStyle(0x000000, 0.2);
    signShadow.fillRoundedRect(-signWidth / 2 + 4, -signHeight / 2 + 4, signWidth, signHeight, 10);

    // Target text on sign
    this.signText = this.scene.add.text(0, 0, "เป้าหมาย 0", {
      fontFamily: "Sarabun, sans-serif",
      fontSize: `${Math.min(40, screenWidth * 0.3)}px`,
      color: "#333333",
      fontStyle: "bold",
    }).setOrigin(0.5);

    container.add([signShadow, signBg, this.signText ]);

    return container;
  }


  /**
   * Update current value on sign
   */
  updateSignText(current: number): void {
    if (this.signText) {
      this.signText.setText(`${current.toString()}`);
    }
  }

  /**
   * Get sign text object (for animations)
   */
  getSignText(): Phaser.GameObjects.Text | null {
    return this.signText || null;
  }

  /**
   * Get children with sign container (for animations)
   */
  getChildrenWithSign(): Phaser.GameObjects.Container | null {
    return this.childrenWithSign || null;
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
