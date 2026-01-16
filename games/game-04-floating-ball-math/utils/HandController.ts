import { WarningHand, FloatingBall } from '../types';

export class HandController {
  private scene: Phaser.Scene;
  private activeHands: Map<string, WarningHand> = new Map();
  private defendButtons: Map<string, Phaser.GameObjects.Container> = new Map();
  private onDefendCallbacks: Map<string, () => void> = new Map();
  private isDefending: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show warning hand near a ball that's close to the boat
   * @param ball The ball being targeted
   * @param defendTimeMs Time window for player to defend (default 2500ms)
   * @returns The hand ID for reference
   */
  showWarningHand(ball: FloatingBall, defendTimeMs: number = 2500): string {
    // Safety check: don't create hand if ball doesn't exist or is already destroyed
    if (!ball || !ball.container) {
      console.warn('[HandController] Cannot show warning hand - ball or container is null');
      return '';
    }

    const handId = `hand-${ball.id}`;
    const { width, height } = this.scene.scale;

    // Create hand container positioned near the ball
    const container = this.scene.add.container(ball.x, ball.y - 140);
    container.setDepth(100); // Above balls

    // Load and create Arm.png sprite
    const armSprite = this.scene.add.image(0, 0, 'arm');
    armSprite.setScale(0.1); // Made smaller (was 0.2)
    armSprite.setOrigin(0.5, 0.5);
    container.add(armSprite);

    // Create thief popup at left-top of screen
    const thiefPopup = this.scene.add.container(width * 0.15, height * 0.15);
    thiefPopup.setDepth(150); // Above hand
    
    const thiefSprite = this.scene.add.image(0, 0, 'thief');
    thiefSprite.setScale(0.15); // Reduced from 0.25 for smaller size
    thiefSprite.setOrigin(0.5, 0.5);
    thiefPopup.add(thiefSprite);
    
    // Animate thief popup appearance
    thiefPopup.setScale(0);
    this.scene.tweens.add({
      targets: thiefPopup,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    container.add(thiefPopup);

    // Create DEFEND button positioned near thief popup (within hand container to follow it)
    const defendButton = this.createDefendButton(handId, ball);
    defendButton.setPosition(0, -100); // Position above the hand (relative to container)
    defendButton.setDepth(200); // Above everything else, including the hand
    defendButton.setVisible(true);
    container.add(defendButton); // Add to hand container so it follows the hand

    // Create warning text
    const warningText = this.scene.add.text(0, -60, '!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      color: '#FF0000',
      fontStyle: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(warningText);

    // Store hand data
    const warningHand: WarningHand = {
      container,
      targetBall: ball,
      isStealing: false,
      retreatDelay: defendTimeMs,
      defendButton,
      thiefPopup, // Store reference to thief popup
    };

    this.activeHands.set(handId, warningHand);
    this.defendButtons.set(handId, defendButton);

    // Set up automatic stealing after timeout
    const stealTimer = this.scene.time.delayedCall(defendTimeMs/1.4, () => {
      this.stealBall(handId);
    });

    // Store timer on container for cleanup
    container.setData('stealTimer', stealTimer);

    // Animate hand reaching
    this.scene.tweens.add({
      targets: container,
      y: ball.y - 50,
      duration: 300,
      ease: 'Sine.easeOut',
      yoyo: true,
      repeat: -1,
    });

    return handId;
  }

  /**
   * Create DEFEND button
   */
  private createDefendButton(handId: string, ball: FloatingBall): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const { width } = this.scene.scale;

    const buttonWidth = Math.min(180, width * 0.3);
    const buttonHeight = Math.min(60, width * 0.12);

    // Button background (green)
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x4CAF50, 1);
    bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
    
    // Border
    bg.lineStyle(4, 0x2E7D32, 1);
    bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
    container.add(bg);

    // Button text
    const text = this.scene.add.text(0, 0, 'ห้ามขโมย!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.min(24, width * 0.05)}px`,
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(text);

    // Make interactive
    container.setSize(buttonWidth, buttonHeight);
    container.setInteractive({
      useHandCursor: true,
    });

    // Add hover effect
    container.on('pointerover', () => {
      this.scene.tweens.add({
        targets: container,
        scale: 1.1,
        duration: 150,
      });
    });

    container.on('pointerout', () => {
      this.scene.tweens.add({
        targets: container,
        scale: 1.0,
        duration: 150,
      });
    });

    // Handle defend button click
    container.on('pointerdown', () => {
      this.defend(handId);
    });

    // Store handId for reference
    container.setData('handId', handId);

    return container;
  }

  /**
   * Handle DEFEND button click - hand retreats
   */
  private defend(handId: string): void {
    const hand = this.activeHands.get(handId);
    if (!hand || hand.isStealing) return;

    // Cancel steal timer
    const stealTimer = hand.container.getData('stealTimer');
    if (stealTimer) {
      stealTimer.remove();
    }

    // Animate hand retreat
    this.scene.tweens.add({
      targets: hand.container,
      y: hand.container.y - 100,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.hideHand(handId);
      },
    });

    // Animate thief popup hiding
    if (hand.thiefPopup) {
      this.scene.tweens.add({
        targets: hand.thiefPopup,
        scale: 0,
        alpha: 0,
        duration: 200,
        ease: 'Sine.easeIn',
      });
    }

    // Trigger defend callback
    const callback = this.onDefendCallbacks.get(handId);
    if (callback) {
      callback();
    }
  }

  /**
   * Steal the ball - hand grabs it and disappears
   */
  private stealBall(handId: string): void {
    const hand = this.activeHands.get(handId);
    
    // Safety checks
    if (!hand || hand.isStealing) {
      console.warn('[HandController] stealBall called but hand is null or already stealing');
      return;
    }

    // Check if ball still exists
    if (!hand.targetBall || !hand.targetBall.container) {
      console.warn('[HandController] Ball was already destroyed, skipping steal animation');
      this.hideHand(handId);
      return;
    }

    hand.isStealing = true;

    // Animate thief popup hiding
    if (hand.thiefPopup) {
      this.scene.tweens.add({
        targets: hand.thiefPopup,
        scale: 0,
        alpha: 0,
        duration: 200,
        ease: 'Sine.easeIn',
      });
    }

    // Get boat Y position (boat is at height * 0.75)
    const { height } = this.scene.scale;
    const boatY = height * 0.75;

    // Animate hand grabbing ball at boat Y level
    this.scene.tweens.add({
      targets: [hand.container, hand.targetBall.container],
      y: boatY,
      alpha: 0,
      scale: 0.8,
      duration: 400,
      ease: 'Sine.easeIn',
      onComplete: () => {
        // Destroy ball if it still exists
        if (hand.targetBall && hand.targetBall.container) {
          hand.targetBall.container.destroy();
          hand.targetBall.container = null;
        }

        this.hideHand(handId);
      },
    });

    // Play steal sound (optional - add later)
  }

  /**
   * Hide hand and button
   */
  private hideHand(handId: string): void {
    const hand = this.activeHands.get(handId);
    const button = this.defendButtons.get(handId);

    if (hand) {
      if (hand.container) {
        hand.container.removeAllListeners();
        hand.container.destroy();
      }
      this.activeHands.delete(handId);
    }

    if (button) {
      button.removeAllListeners();
      button.destroy();
      this.defendButtons.delete(handId);
    }

    this.onDefendCallbacks.delete(handId);
  }

  /**
   * Register callback when player defends
   */
  onDefend(handId: string, callback: () => void): void {
    this.onDefendCallbacks.set(handId, callback);
  }

  /**
   * Check if hand is active for a ball
   */
  isHandActive(ballId: string): boolean {
    return this.activeHands.has(`hand-${ballId}`);
  }

  /**
   * Get active hand for a ball
   */
  getHand(ballId: string): WarningHand | undefined {
    return this.activeHands.get(`hand-${ballId}`);
  }

  /**
   * Get count of active hands
   */
  getActiveHandCount(): number {
    return this.activeHands.size;
  }

  /**
   * Hide all hands (e.g., on game reset)
   */
  hideAllHands(): void {
    this.activeHands.forEach((_, handId) => {
      this.hideHand(handId);
    });
    this.activeHands.clear();
    this.defendButtons.clear();
    this.onDefendCallbacks.clear();
  }

  /**
   * Update hand position to follow ball
   */
  updateHandPosition(ballId: string): void {
    const hand = this.activeHands.get(`hand-${ballId}`);
    if (hand && !hand.isStealing) {
      hand.container.setPosition(hand.targetBall.x, hand.targetBall.y - 50);
    }
  }

  /**
   * Destroy all resources
   */
  destroy(): void {
    this.hideAllHands();
  }
}
