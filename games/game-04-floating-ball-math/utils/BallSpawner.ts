import { FloatingBall, BallColor } from '../types';

export class BallSpawner {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create a floating ball with colored image and operation text (e.g., "+5", "-3", "*2", "/4")
   */
  createBall(value: number, operator: '+' | '-' | '*' | '/', color: BallColor, x: number, y: number): FloatingBall {
    const { width } = this.scene.scale;
    const ballRadius = Math.min(40, width * 0.08);
    const fontSize = Math.min(28, width * 0.05);

    const container = this.scene.add.container(x, y);
    const id = `ball-${Date.now()}-${Math.random()}`;

    // Load and add colored ball image
    const ballImage = this.scene.add.image(0, 0, `ball-${color}`);
    ballImage.setDisplaySize(ballRadius * 2, ballRadius * 2);
    container.add(ballImage);

    // Create shadow (behind ball, with offset for depth effect)
    const shadow = this.scene.add.circle(5, 5, ballRadius, 0x000000, 0.2);
    container.addAt(shadow, 0); // Add at index 0 (behind ball image)

    // Format the operator for display
    const displayOperator = operator === '*' ? '×' : operator === '/' ? '÷' : operator;
    
    // Add operation text (black with white stroke, e.g., "+5", "-3", "×2", "÷4")
    const text = this.scene.add.text(0, 0, `${displayOperator}${value}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#000000',
      fontStyle: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(text);

    // Set interactive with centered hit area for better mobile support
    // Hit area is 60% larger than visual ball for easier tapping
    const hitAreaRadius = ballRadius * 1.6;
    container.setSize(ballRadius * 2, ballRadius * 2);
    container.setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Circle(0, 0, hitAreaRadius),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
    });

    // Add hover effect (desktop only - no hover on mobile)
    container.on('pointerover', () => {
      if (!this.scene.input.pointer1.isDown && !this.scene.input.pointer2.isDown) {
        this.scene.tweens.add({
          targets: container,
          scale: 1.1,
          duration: 150,
          ease: 'Sine.easeOut',
        });
      }
    });

    container.on('pointerout', () => {
      if (!this.scene.input.pointer1.isDown && !this.scene.input.pointer2.isDown) {
        this.scene.tweens.add({
          targets: container,
          scale: 1,
          duration: 150,
          ease: 'Sine.easeOut',
        });
      }
    });

    // Add visual feedback on touch start (for mobile) - more prominent
    container.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: container,
        scale: 0.85,
        duration: 50,
        ease: 'Sine.easeOut',
      });
    });

    // Touch feedback - more prominent bounce
    container.on('pointerup', () => {
      this.scene.tweens.add({
        targets: container,
        scale: 1.2,
        duration: 150,
        ease: 'Back.easeOut',
      });
    });

    return {
      id,
      value,
      operator,
      color,
      x,
      y,
      originalX: x,
      originalY: y,
      wavePhase: Math.random() * Math.PI * 2,
      isCollected: false,
      isBomb: false, // Not a bomb by default
      container,
    };
  }

  /**
   * Add selection highlight to ball
   */
  highlightBall(ball: FloatingBall): void {
    if (!ball.container) return;
    
    const { width } = this.scene.scale;
    const ballRadius = Math.min(44, width * 0.09); // Slightly larger

    const glow = this.scene.add.graphics();
    glow.lineStyle(4, 0xFFFFFF, 0.9);
    glow.strokeCircle(0, 0, ballRadius);
    glow.name = 'highlight';
    ball.container.add(glow);
  }

  /**
   * Remove selection highlight from ball
   */
  unhighlightBall(ball: FloatingBall): void {
    if (!ball.container) return;
    
    const glow = ball.container.getByName('highlight');
    if (glow) {
      glow.destroy();
    }
  }

  /**
   * Show correct feedback (green glow)
   */
  showCorrectFeedback(ball: FloatingBall): void {
    if (!ball.container) return;
    
    const { width } = this.scene.scale;
    const ballRadius = Math.min(44, width * 0.09);

    const glow = this.scene.add.graphics();
    glow.lineStyle(5, 0x4CAF50, 1);
    glow.strokeCircle(0, 0, ballRadius);
    glow.name = 'feedback';
    ball.container.add(glow);
  }

  /**
   * Show incorrect feedback (red glow + shake)
   */
  showIncorrectFeedback(ball: FloatingBall): void {
    if (!ball.container) return;
    
    const { width } = this.scene.scale;
    const ballRadius = Math.min(44, width * 0.09);

    const glow = this.scene.add.graphics();
    glow.lineStyle(5, 0xF44336, 1);
    glow.strokeCircle(0, 0, ballRadius);
    glow.name = 'feedback';
    ball.container.add(glow);

    // Shake animation
    this.scene.tweens.add({
      targets: ball.container,
      x: '+=10',
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Power2.easeInOut',
    });
  }

  /**
   * Clear all feedback highlights
   */
  clearFeedback(ball: FloatingBall): void {
    if (!ball.container) return;
    
    const feedback = ball.container.getByName('feedback');
    if (feedback) {
      feedback.destroy();
    }
  }

  /**
   * Animate ball to equation position
   */
  animateToPosition(ball: FloatingBall, targetX: number, targetY: number): Promise<void> {
    return new Promise((resolve) => {
      if (!ball.container) {
        resolve();
        return;
      }

      this.scene.tweens.add({
        targets: ball.container,
        x: targetX,
        y: targetY,
        scale: 1.2,
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  /**
   * Animate ball back to original position
   */
  animateToOriginal(ball: FloatingBall): Promise<void> {
    return new Promise((resolve) => {
      if (!ball.container) {
        resolve();
        return;
      }

      this.scene.tweens.add({
        targets: ball.container,
        x: ball.originalX,
        y: ball.originalY,
        scale: 1,
        duration: 600,
        ease: 'Back.easeOut',
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  /**
   * Destroy ball container
   */
  destroyBall(ball: FloatingBall): void {
    if (ball.container) {
      ball.container.removeAllListeners();
      ball.container.destroy();
      ball.container = null;
    }
  }

  /**
   * Create a replacement ball with random value, operator, color, and position
   * Used when balls are collected and need to be replaced
   */
  createReplacementBall(value: number, operator: '+' | '-' | '*' | '/', color: BallColor, x: number, y: number): FloatingBall {
    const { width, height } = this.scene.scale;
    const margin = 80;
    
    // Ensure position is within screen bounds with margin
    const safeX = Math.max(margin, Math.min(x, width - margin));
    const safeY = Math.max(-100, Math.min(y, height - 100));
    
    const ball = this.createBall(value, operator, color, safeX, safeY);
    return ball;
  }

  /**
   * Create a bomb ball with black color and bomb/skull icon
   */
  createBombBall(value: number, operator: '+' | '-' | '*' | '/', x: number, y: number): FloatingBall {
    const { width } = this.scene.scale;
    const ballRadius = Math.min(40, width * 0.08);
    const fontSize = Math.min(28, width * 0.05);

    const container = this.scene.add.container(x, y);
    const id = `bomb-${Date.now()}-${Math.random()}`;

    // Black bomb ball
    const ballImage = this.scene.add.graphics();
    ballImage.fillStyle(0x222222, 1); // Dark gray/black color
    ballImage.fillCircle(0, 0, ballRadius);
    
    // Add danger border
    ballImage.lineStyle(4, 0xFF0000, 1); // Red danger border
    ballImage.strokeCircle(0, 0, ballRadius);
    container.add(ballImage);

    // Create shadow
    const shadow = this.scene.add.circle(5, 5, ballRadius, 0x000000, 0.2);
    container.addAt(shadow, 0);

    // Format the operator for display
    const displayOperator = operator === '*' ? '×' : operator === '/' ? '÷' : operator;
    
    // Add bomb icon (💣)
    const bombIcon = this.scene.add.text(0, -15, '💣', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.min(24, width * 0.05)}px`,
      color: '#FF0000',
    }).setOrigin(0.5);
    container.add(bombIcon);

    // Add operation text below bomb
    const text = this.scene.add.text(0, 15, `${displayOperator}${value}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    container.add(text);

    // Set interactive
    const hitAreaRadius = ballRadius * 1.6;
    container.setSize(ballRadius * 2, ballRadius * 2);
    container.setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Circle(0, 0, hitAreaRadius),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
    });

    return {
      id,
      value,
      operator,
      color: 'coral', // Default color, but overridden by black graphics
      x,
      y,
      originalX: x,
      originalY: y,
      wavePhase: Math.random() * Math.PI * 2,
      isCollected: false,
      isBomb: true, // This IS a bomb ball
      container,
    };
  }

  /**
   * Get ball color hex code
   */
  private getBallColorHex(color: BallColor): number {
    const colorMap: Record<BallColor, number> = {
      coral: 0xFF6B6B,
      mint: 0x4ECDC4,
      yellow: 0xFFE66D,
      lavender: 0x6C5CE7,
    };
    return colorMap[color];
  }
}
