import { FloatingBall, FloatingBallMathLevelConfig } from '../types';
import type { SeededRandom } from '@/lib/seededRandom';

export class WaterPhysics {
  private scene: Phaser.Scene;
  private config: FloatingBallMathLevelConfig;
  private waveLayers: Phaser.GameObjects.Graphics[] = [];
  private causticsOverlay: Phaser.GameObjects.Graphics | null = null;
  private rng: SeededRandom;

  constructor(scene: Phaser.Scene, config: FloatingBallMathLevelConfig, rng: SeededRandom) {
    this.scene = scene;
    this.config = config;
    this.rng = rng;
  }

  /**
   * Update ball position based on water physics
   */
  updateBall(ball: FloatingBall, deltaTime: number): void {
    const time = this.scene.time.now;
    const { height } = this.scene.scale;
    
    // Determine speed based on ball position - INCREASED SPEED
    // Fast speed in top 20% of screen, medium speed in middle 30%, normal speed in bottom 50%
    const fastZoneThreshold = height * 0.2;
    const mediumZoneThreshold = height * 0.5;
    let speedMultiplier: number;
    
    if (ball.y < fastZoneThreshold) {
      speedMultiplier = 3.0; // Very fast at top
    } else if (ball.y < mediumZoneThreshold) {
      speedMultiplier = 4.0; // Fast in middle
    } else {
      speedMultiplier = 5.0; // Normal speed at bottom
    }
    
    // Vertical movement (float down) - FASTER - normalized to 60fps
    ball.y += this.config.waterSpeed * speedMultiplier * (deltaTime / 16.67);
    
    // Horizontal movement (sine wave) - USE LERP for smooth movement
    const waveFrequency = 0.002;
    const targetX = ball.originalX + 
                    this.config.waveAmplitude * Math.sin(waveFrequency * time + ball.wavePhase);
    
    // Smooth lerp interpolation to reduce jitter
    const lerpFactor = 0.2; // 20% lerp for smooth but responsive movement
    ball.x = Phaser.Math.Linear(ball.x, targetX, lerpFactor);
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
    ball.wavePhase = this.rng.next() * Math.PI * 2; // Random new phase
    
    if (ball.container) {
      ball.container.setPosition(newX, newY);
    }
  }

  /**
   * Calculate random x position for spawning
   */
  getRandomSpawnX(margin: number = 80): number {
    const { width } = this.scene.scale;
    return margin + this.rng.next() * (width - margin * 2);
  }

  /**
   * Create water wave overlay effect
   */
  createWaterOverlay(): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.depth = -1;
    return graphics;
  }

  /**
   * Update water visual effects with improved rendering
   * Draws multi-layer parallax waves and caustics directly to the graphics object
   */
  updateWaterOverlay(graphics: Phaser.GameObjects.Graphics): void {
    const { width, height } = this.scene.scale;
    const time = this.scene.time.now;
    
    // Debug: Ensure graphics is visible
    if (!graphics || !graphics.active) return;
    
    graphics.clear();
    
    // Draw 3 parallax wave layers for depth effect - FILLED WAVES for maximum visibility
    for (let layerIndex = 0; layerIndex < 3; layerIndex++) {
      const numWaves = 4 - layerIndex; // Layer 0: 4 waves, Layer 1: 3 waves, Layer 2: 2 waves
      const baseAmplitude = 25 + (layerIndex * 15); // 25px, 40px, 55px - VERY LARGER amplitude
      const baseFrequency = 0.0008 + (layerIndex * 0.0004); // Different frequencies per layer
      const yOffsetBase = height * 0.25 + (layerIndex * height * 0.15); // Start at 25%, 40%, 55%
      
      for (let i = 0; i < numWaves; i++) {
        const yOffset = yOffsetBase + (i * height * 0.15);
        const amplitude = baseAmplitude + (i * 10) ;
        const frequency = baseFrequency + (i * 0.0002);
        
        // Filled wave shape with gradient-like effect
        graphics.beginPath();
        
        // Start at bottom-left corner
        graphics.moveTo(0, yOffset + amplitude);
        
        // Draw wave top
        for (let x = 0; x <= width; x += 5) {
          const phaseOffset = layerIndex * Math.PI * 0.5 + i * 0.5;
          const y = yOffset + amplitude * Math.sin(frequency * time + x * 0.01 + phaseOffset);
          graphics.lineTo(x, y);
        }
        
        // Complete the shape (go down to bottom, then back to start)
        graphics.lineTo(width, yOffset + amplitude + 100);
        graphics.lineTo(0, yOffset + amplitude + 100);
        graphics.closePath();
        
        // Fill with semi-transparent blue
        const fillAlpha = 0.15 - (layerIndex * 0.04); // 0.15, 0.11, 0.07
        graphics.fillStyle(0x64B5F6, fillAlpha);
        graphics.fill();
        
        // Draw thick wave line on top
        const lineWidth = 8 - layerIndex * 2; // 8px, 6px, 4px
        const lineAlpha = 0.8 - (layerIndex * 0.1); // 0.8, 0.7, 0.6
        graphics.lineStyle(lineWidth, 0xa6e9ff, lineAlpha);
        graphics.strokePath();
      }
    }
    
    // Draw light caustics (animated light patterns) - MUCH MORE VISIBLE
    const numCaustics = 4; // More caustics
    
    for (let i = 0; i < numCaustics; i++) {
      const x = (width / numCaustics) * i + (width / numCaustics) * 0.5;
      const y = height * 0.25 + (i * height * 0.1) + Math.sin(time * 0.0005 + i) * 15;
      const radius = 35 + Math.sin(time * 0.001 + i * 2) * 10; // Larger caustics
      
      // White caustic circles - MUCH more visible
      graphics.fillStyle(0xFFFFFF, 0.25); // Increased from 0.15 to 0.25
      graphics.fillCircle(x, y, radius);
      
      // Blue secondary caustics for depth
      graphics.fillStyle(0x64B5F6, 0.15); // Increased from 0.10 to 0.15
      graphics.fillCircle(
        x + Math.sin(time * 0.0008 + i * 3) * 15,
        y + 10,
        radius * 0.7
      );
    }
  }
}
