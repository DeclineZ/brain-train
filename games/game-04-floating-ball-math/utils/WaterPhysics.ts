import { FloatingBall, FloatingBallMathLevelConfig } from '../types';

export class WaterPhysics {
  private scene: Phaser.Scene;
  private config: FloatingBallMathLevelConfig;

  constructor(scene: Phaser.Scene, config: FloatingBallMathLevelConfig) {
    this.scene = scene;
    this.config = config;
  }

  /**
   * Update ball position based on water physics
   */
  updateBall(ball: FloatingBall, deltaTime: number): void {
    const time = this.scene.time.now;
    const { height } = this.scene.scale;
    
    // Determine speed based on ball position
    // Fast speed in top 15% of screen, normal speed in bottom 85%
    const fastZoneThreshold = height * 0.17;
    const speedMultiplier = ball.y < fastZoneThreshold ? 3.0 : 1.0;
    
    // Vertical movement (float down)
    ball.y += this.config.waterSpeed * speedMultiplier * (deltaTime / 16.67); // Normalize to 60fps
    
    // Horizontal movement (sine wave)
    const waveFrequency = 0.002;
    ball.x = ball.originalX + 
             this.config.waveAmplitude * Math.sin(waveFrequency * time + ball.wavePhase);
  }

  /**
   * Check if ball is off screen and needs respawn
   */
  shouldRespawn(ball: FloatingBall): boolean {
    const { height } = this.scene.scale;
    return ball.y > height + 100; // 100px buffer below screen
  }

  /**
   * Respawn ball at top with new position
   */
  respawnBall(ball: FloatingBall, newX: number, newY: number): void {
    ball.x = newX;
    ball.y = newY;
    ball.originalX = newX;
    ball.originalY = newY;
    ball.wavePhase = Math.random() * Math.PI * 2; // Random new phase
    
    if (ball.container) {
      ball.container.setPosition(newX, newY);
    }
  }

  /**
   * Calculate random x position for spawning
   */
  getRandomSpawnX(margin: number = 80): number {
    const { width } = this.scene.scale;
    return margin + Math.random() * (width - margin * 2);
  }

  /**
   * Create water wave overlay effect
   */
  createWaterOverlay(): Phaser.GameObjects.Graphics {
    const { width, height } = this.scene.scale;
    const graphics = this.scene.add.graphics();
    
    // Create gradient water effect
    graphics.depth = -1;
    return graphics;
  }

  /**
   * Update water visual effects
   */
  updateWaterOverlay(graphics: Phaser.GameObjects.Graphics): void {
    graphics.clear();
    const { width, height } = this.scene.scale;
    const time = this.scene.time.now;
    
    // Create wave pattern
    graphics.lineStyle(2, 0x90CAF9, 0.3);
    
    for (let i = 0; i < 5; i++) {
      graphics.beginPath();
      const yOffset = (height * 0.3) + (i * height * 0.15);
      const amplitude = 20 + (i * 5);
      const frequency = 0.001 + (i * 0.0005);
      
      for (let x = 0; x <= width; x += 10) {
        const y = yOffset + amplitude * Math.sin(frequency * time + x * 0.01 + i);
        if (x === 0) {
          graphics.moveTo(x, y);
        } else {
          graphics.lineTo(x, y);
        }
      }
      graphics.strokePath();
    }
  }
}
