import * as Phaser from 'phaser';
import type { PinkCupLevelConfig } from './types';

/**
 * Find the Pink Cup - Tutorial Scene
 * Interactive tutorial explaining game mechanics
 */
export class PinkCupTutorialScene extends Phaser.Scene {
  private tutorialStep = 0;
  private tutorialText!: Phaser.GameObjects.Text;
  private highlightOverlay!: Phaser.GameObjects.Rectangle;
  private pinkCupHighlight!: Phaser.GameObjects.Arc;
  private targetTileHighlight!: Phaser.GameObjects.Rectangle;

  // Tutorial elements
  private tutorialCups: Phaser.GameObjects.Container[] = [];
  private tutorialTiles: Phaser.GameObjects.Rectangle[] = [];

  constructor() { 
    super({ key: 'PinkCupTutorialScene' }); 
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0xF0F4F8).setAlpha(1);

    // Create simplified 3x3 grid for tutorial
    this.createTutorialGrid();
    this.createTutorialUI();

    // Start tutorial
    this.startTutorial();
  }

  createTutorialGrid() {
    const { width, height } = this.scale;
    const cellSize = 80;
    const gap = 10;
    const cols = 3;
    const rows = 3;

    const gridWidth = cols * cellSize + (cols - 1) * gap;
    const gridHeight = rows * cellSize + (rows - 1) * gap;
    const startX = (width - gridWidth) / 2 + cellSize / 2;
    const startY = (height - gridHeight) / 2 + cellSize / 2 + 50;

    // Create tiles
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const isTarget = x === 2 && y === 1; // Fixed target for tutorial
        const color = isTarget ? 0xFFB6C1 : 0xE8E8E8;

    const tile = this.add.rectangle(0, 0, cellSize, cellSize, color);
    const strokeGraphics = this.add.graphics();
    const strokeColor = isTarget ? 0xFF69B4 : 0xC0C0C0;
    strokeGraphics.lineStyle(4, strokeColor);
    strokeGraphics.strokeRect(-cellSize/2, -cellSize/2, cellSize, cellSize);
        
        const posX = startX + x * (cellSize + gap);
        const posY = startY + y * (cellSize + gap);
        tile.setPosition(posX, posY);
        strokeGraphics.setPosition(posX, posY);
        tile.setAlpha(1);
        tile.setDepth(-1);
        strokeGraphics.setAlpha(1);
        strokeGraphics.setDepth(-1);
        
        this.tutorialTiles.push(tile);
        this.tutorialTiles.push(strokeGraphics as any);
      }
    }

    // Create cups (1 pink, 8 blue)
    const cupPositions = [
      {x: 0, y: 0, isPink: false, number: 1},
      {x: 1, y: 0, isPink: false, number: 2},
      {x: 2, y: 0, isPink: false, number: 3},
      {x: 0, y: 1, isPink: true, number: 4},  // Pink cup at (0,1)
      {x: 1, y: 1, isPink: false, number: 5},
      {x: 2, y: 1, isPink: false, number: 6},
      {x: 0, y: 2, isPink: false, number: 7},
      {x: 1, y: 2, isPink: false, number: 8},
      {x: 2, y: 2, isPink: false, number: 9}
    ];

    cupPositions.forEach(pos => {
      const cup = this.createTutorialCup(
        pos.isPink, 
        pos.number, 
        startX + pos.x * (cellSize + gap),
        startY + pos.y * (cellSize + gap),
        cellSize
      );
      this.tutorialCups.push(cup);
    });

    // Create highlight overlays
    this.highlightOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000)
      .setAlpha(0.5)
      .setVisible(false)
      .setInteractive()
      .setDepth(200);

    this.highlightOverlay.on('pointerdown', () => {
      this.nextTutorialStep();
    });

    // Pink cup highlight with stroke
    const pinkHighlightGraphics = this.add.graphics();
    pinkHighlightGraphics.lineStyle(4, 0xFFFF00);
    pinkHighlightGraphics.strokeCircle(0, 0, cellSize / 2 + 10);
    pinkHighlightGraphics.setPosition(
      startX + 0 * (cellSize + gap),
      startY + 1 * (cellSize + gap)
    );
    pinkHighlightGraphics.setAlpha(0.3);
    pinkHighlightGraphics.setVisible(false);
    pinkHighlightGraphics.setDepth(50);
    this.pinkCupHighlight = pinkHighlightGraphics as any;

    // Target tile highlight with stroke
    const targetHighlightGraphics = this.add.graphics();
    targetHighlightGraphics.lineStyle(4, 0xFF0000);
    targetHighlightGraphics.strokeRect(
      -(cellSize + 20) / 2,
      -(cellSize + 20) / 2,
      cellSize + 20,
      cellSize + 20
    );
    targetHighlightGraphics.setPosition(
      startX + 2 * (cellSize + gap),
      startY + 1 * (cellSize + gap)
    );
    targetHighlightGraphics.setAlpha(0.2);
    targetHighlightGraphics.setVisible(false);
    targetHighlightGraphics.setDepth(50);
    this.targetTileHighlight = targetHighlightGraphics as any;
  }

  createTutorialCup(isPink: boolean, number: number, x: number, y: number, size: number) {
    const container = this.add.container(x, y);

    const bodyColor = isPink ? 0xFF69B4 : 0x4A90E2;
    const body = this.add.arc(0, 0, size / 2 - 5, 0, Math.PI * 2)
      .setOrigin(0.5)
      .setAlpha(1);
    body.setFillStyle(bodyColor);

    // Body stroke using graphics
    const bodyStrokeGraphics = this.add.graphics();
    const bodyStrokeColor = isPink ? 0xFF1493 : 0x2E6BB3;
    bodyStrokeGraphics.lineStyle(3, bodyStrokeColor);
    bodyStrokeGraphics.strokeCircle(0, 0, size / 2 - 5);
    bodyStrokeGraphics.setDepth(1);
    container.add(bodyStrokeGraphics);

    // Rim using graphics
    const rimGraphics = this.add.graphics();
    rimGraphics.fillStyle(0xFFFFFF);
    rimGraphics.fillCircle(0, 0, size / 2 - 10);
    rimGraphics.lineStyle(3, 0xFFFFFF);
    rimGraphics.strokeCircle(0, 0, size / 2 - 10);
    rimGraphics.setAlpha(0.3);
    container.add(rimGraphics);

    const numberText = this.add.text(0, 0, number.toString(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.floor(size * 0.35)}px`,
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);

    container.add([body, rimGraphics, numberText]);
    return container;
  }

  createTutorialUI() {
    const { width, height } = this.scale;

    // Title
    this.add.text(width / 2, 50, 'เรียนรู้วิธีเล่น', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '32px',
      color: '#2C3E50',
      stroke: '#FFFFFF',
      strokeThickness: 6,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Tutorial text
    this.tutorialText = this.add.text(width / 2, height - 150, '', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '24px',
      color: '#2C3E50',
      align: 'center',
      wordWrap: { width: width * 0.85 }
    }).setOrigin(0.5).setDepth(250);

    // Continue instruction
    const continueText = this.add.text(width / 2, height - 80, 'แตะเพื่อดำเนินการต่อ →', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '20px',
      color: '#888888',
      fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(250);

    // Pulsing animation on continue text
    this.tweens.add({
      targets: continueText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Skip button
    const skipButton = this.add.text(width - 80, 30, 'ข้าม >', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '18px',
      color: '#666666',
      backgroundColor: '#FFFFFF',
      padding: {x: 15, y: 8}
    }).setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(300);

    skipButton.on('pointerdown', () => {
      this.scene.start('PinkCupGameScene', { level: 1, isTutorialComplete: true });
    });
  }

  startTutorial() {
    this.tutorialStep = 0;
    this.showTutorialStep();
  }

  showTutorialStep() {
    const messages = [
      'นี่คือถ้วยสีชมพู 🎯\nเป้าหมายของคุณคือเคลื่อนถ้วยนี้\nไปยังช่องเป้าหมายสีชมพู',
      'ช่องสีชมพูคือจุดหมาย\nถ้วยชมพูต้องมายังที่นี่\nเพื่อให้ผ่านด่าน',
      'คุณเคลื่อนถ้วยได้\nโดยการแตะถ้วยสีน้ำเงิน\nที่อยู่ข้างๆ ถ้วยชมพู',
      'เมื่อเคลื่อน ถ้วยจะสลับที่\nแตะที่ถ้วยใดๆ ก็ได้\nที่อยู่ข้างๆ เพื่อเริ่มเล่น',
      '⚠️ สิ่งสำคัญ!\nหลังจากเคลื่อนครั้งแรก\nจะมีตัวเลขปรากฏใต้ถ้วย',
      'จำตำแหน่งตัวเลขให้ดี!\nเพราะคุณจะต้องตอบคำถาม\nเกี่ยวกับตัวเลขเหล่านี้',
      'เมื่อถ้วยชมพูถึงช่องเป้าหมาย\nเกมจะถามคำถามท้ายๆ\nเช่น "ตัวเลขใต้ถ้วยที่ (2,1) คืออะไร?"',
      'พร้อมแล้วหรือ?\nแตะเพื่อเริ่มเล่น!'
    ];

    if (this.tutorialStep >= messages.length) {
      this.finishTutorial();
      return;
    }

    // Update text
    this.tutorialText.setText(messages[this.tutorialStep]);

    // Show highlights based on step
    this.pinkCupHighlight.setVisible(false);
    this.targetTileHighlight.setVisible(false);

    switch (this.tutorialStep) {
      case 0:
        this.pinkCupHighlight.setVisible(true);
        this.pulseObject(this.pinkCupHighlight);
        break;
      case 1:
        this.targetTileHighlight.setVisible(true);
        this.pulseObject(this.targetTileHighlight);
        break;
      case 2:
      case 3:
        // Highlight blue cups around pink cup
        const adjacentCups = this.tutorialCups.filter((_, i) => 
          i === 1 || i === 3 || i === 5 || i === 7
        );
        adjacentCups.forEach(cup => {
          this.tweens.add({
            targets: cup,
            scale: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1
          });
        });
        break;
      case 4:
      case 5:
        // Show number reveal animation
        this.tutorialCups.forEach(cup => {
          const numberText = cup.list[2] as Phaser.GameObjects.Text;
          numberText.setVisible(true);
          numberText.setAlpha(0);
          this.tweens.add({
            targets: numberText,
            alpha: 1,
            duration: 300,
            delay: this.tutorialStep === 4 ? 500 : 0
          });
        });
        break;
      case 6:
        // Continue showing numbers
        break;
    }
  }

  pulseObject(obj: Phaser.GameObjects.GameObject) {
    this.tweens.add({
      targets: obj,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  nextTutorialStep() {
    this.tutorialStep++;

    // Hide numbers after step 6
    if (this.tutorialStep === 7) {
      this.tutorialCups.forEach(cup => {
        const numberText = cup.list[2] as Phaser.GameObjects.Text;
        this.tweens.add({
          targets: numberText,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            numberText.setVisible(false);
          }
        });
      });
    }

    this.showTutorialStep();
  }

  finishTutorial() {
    // Clean up
    this.tutorialCups.forEach(cup => cup.destroy());
    this.tutorialTiles.forEach(tile => tile.destroy());
    this.highlightOverlay.destroy();
    this.pinkCupHighlight.destroy();
    this.targetTileHighlight.destroy();

    // Start game
    this.scene.start('PinkCupGameScene', { level: 1, isTutorialComplete: true });
  }
}
