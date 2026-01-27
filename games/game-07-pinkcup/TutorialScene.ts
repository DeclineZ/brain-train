import * as Phaser from 'phaser';

type CupInfo = {
  container: Phaser.GameObjects.Container;
  isPink: boolean;
  gridPos: { x: number; y: number };
  baseScale: number;
};

/**
 * Find the Pink Cup - Tutorial Scene
 * Interactive tutorial with elder-friendly guidance.
 */
export class PinkCupTutorialScene extends Phaser.Scene {
  private tutorialStep = 0;
  private tutorialText!: Phaser.GameObjects.Text;
  private highlightOverlay!: Phaser.GameObjects.Rectangle;
  private movementHintArrow!: Phaser.GameObjects.Graphics;
  private pinkCupArrow!: Phaser.GameObjects.Graphics;
  private instructionPanel!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private continueText!: Phaser.GameObjects.Text;
  private skipButton!: Phaser.GameObjects.Text;
  private readonly tutorialPanelOffsetY = 40;

  // Grid visuals (match GameScene style)
  private backgroundRect!: Phaser.GameObjects.Rectangle;
  private tutorialCups: CupInfo[] = [];
  private tutorialTiles: Phaser.GameObjects.Rectangle[] = [];
  private numberTexts: Phaser.GameObjects.Text[] = [];
  private pinkCupHighlight!: Phaser.GameObjects.Graphics;
  private targetTileHighlight!: Phaser.GameObjects.Graphics;
  private emptyCellKeys: Set<string> = new Set();
  private emptyCell: { x: number; y: number } = { x: 2, y: 2 };
  private targetCell: { x: number; y: number } = { x: 2, y: 1 };

  // Interaction state
  private isInteractiveStep = false;
  private isNumbersRevealed = false;
  private probeTarget: { x: number; y: number } | null = null;
  private probeAnswer: number | null = null;

  // Layout config
  private gridCols = 3;
  private gridRows = 3;
  private cellSize = 100;
  private gap = 15;
  private startX = 0;
  private startY = 0;

  constructor() {
    super({ key: 'PinkCupTutorialScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Background (same as GameScene)
    this.backgroundRect = this.add.rectangle(width / 2, height / 2, width, height, 0xF0F4F8).setAlpha(1);

    // Create grid & UI
    this.createTutorialGrid();
    this.createTutorialUI();

    // Start tutorial
    this.startTutorial();

    // Resize handler for consistent layout
    this.scale.on('resize', () => {
      this.layoutGrid();
      this.positionHighlights();
      this.positionUI();
    });
  }

  private setOverlayBlocking(isBlocking: boolean) {
    this.highlightOverlay.setVisible(isBlocking);
    if (isBlocking) {
      this.highlightOverlay.setInteractive();
    } else {
      this.highlightOverlay.disableInteractive();
    }
  }

  private setCupInteraction(isEnabled: boolean) {
    this.tutorialCups.forEach(cup => {
      if (isEnabled) {
        cup.container.setInteractive({ useHandCursor: true });
      } else {
        cup.container.disableInteractive();
      }
    });
  }

  private completeTutorial() {
    const onTutorialComplete = this.registry.get('onTutorialComplete');
    if (onTutorialComplete) {
      onTutorialComplete();
    }
  }

  private createTutorialGrid() {
    this.calculateGridMetrics();

    // Create tiles (target at [2,1])
    this.tutorialTiles = [];
    this.numberTexts = [];

    for (let y = 0; y < this.gridRows; y++) {
      for (let x = 0; x < this.gridCols; x++) {
        const isTarget = x === this.targetCell.x && y === this.targetCell.y;
        const color = isTarget ? 0xFFB6C1 : 0xE8E8E8;

        const rectangle = this.add.rectangle(0, 0, this.cellSize, this.cellSize, color).setOrigin(0.5);
        rectangle.setDepth(0);

        const numberText = this.add.text(0, 0, `${y * this.gridCols + x + 1}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${Math.floor(this.cellSize * 0.32)}px`,
          color: '#1A1A1A',
          fontStyle: 'bold',
          stroke: '#FFFFFF',
          strokeThickness: 4
        })
          .setPadding(6, 6, 6, 6)
          .setOrigin(0.5)
          .setVisible(false)
          .setDepth(2);

        this.tutorialTiles.push(rectangle);
        this.numberTexts.push(numberText);
      }
    }

    this.emptyCellKeys = new Set([`${this.emptyCell.x},${this.emptyCell.y}`]);

    // Create cups with target tile occupied by a blue cup and pink cup next to it
    const cupPositions = [
      { x: 0, y: 0, isPink: false },
      { x: 1, y: 0, isPink: false },
      { x: 2, y: 0, isPink: false },
      { x: 0, y: 1, isPink: false },
      { x: 1, y: 1, isPink: true },
      { x: 2, y: 1, isPink: false },
      { x: 0, y: 2, isPink: false },
      { x: 1, y: 2, isPink: false }
    ];

    this.tutorialCups = cupPositions.map((pos) => this.createCup(pos.isPink, pos.x, pos.y));

    // Highlight overlay for tapping
    this.highlightOverlay = this.add.rectangle(0, 0, 1, 1, 0x000000)
      .setAlpha(0.05)
      .setVisible(true)
      .setInteractive()
      .setDepth(200);

    this.highlightOverlay.on('pointerdown', () => {
      if (!this.isInteractiveStep) {
        this.nextTutorialStep();
      }
    });

    // Highlights
    this.pinkCupHighlight = this.add.graphics();
    this.pinkCupHighlight.setVisible(false);
    this.pinkCupHighlight.setDepth(50);

    this.targetTileHighlight = this.add.graphics();
    this.targetTileHighlight.setVisible(false);
    this.targetTileHighlight.setDepth(50);

    this.layoutGrid();
    this.positionHighlights();
  }

  private calculateGridMetrics() {
    const { width, height } = this.scale;

    const maxCellSize = 120;
    const baseGap = 15;
    const availableW = width * 0.85;
    const availableH = height * 0.6;

    let scaledCellSize = Math.min(maxCellSize, (availableW - (this.gridCols - 1) * baseGap) / this.gridCols);
    let scaledGap = baseGap * (scaledCellSize / maxCellSize);

    const totalH = this.gridRows * scaledCellSize + (this.gridRows - 1) * scaledGap;
    if (totalH > availableH) {
      const scale = availableH / totalH;
      scaledCellSize *= scale;
      scaledGap *= scale;
    }

    this.cellSize = scaledCellSize;
    this.gap = scaledGap;

    const gridWidth = this.gridCols * this.cellSize + (this.gridCols - 1) * this.gap;
    const gridHeight = this.gridRows * this.cellSize + (this.gridRows - 1) * this.gap;

    this.startX = (width - gridWidth) / 2 + this.cellSize / 2;
    this.startY = (height - gridHeight) / 2 + this.cellSize / 2 + 30;
  }

  private layoutGrid() {
    this.calculateGridMetrics();

    this.tutorialTiles.forEach((tile, i) => {
      const col = i % this.gridCols;
      const row = Math.floor(i / this.gridCols);
      const x = this.startX + col * (this.cellSize + this.gap);
      const y = this.startY + row * (this.cellSize + this.gap);
      tile.setPosition(x, y);
      tile.setSize(this.cellSize, this.cellSize);

      const isEmptyCell = this.emptyCellKeys.has(`${col},${row}`);
      if (isEmptyCell) {
        tile.setStrokeStyle(4, 0x999999);
        tile.setAlpha(0.6);
      } else {
        tile.setStrokeStyle(0);
        tile.setAlpha(1);
      }
    });

    this.numberTexts.forEach((text, i) => {
      const col = i % this.gridCols;
      const row = Math.floor(i / this.gridCols);
      const x = this.startX + col * (this.cellSize + this.gap);
      const y = this.startY + row * (this.cellSize + this.gap);
      text.setPosition(x, y);
      text.setFontSize(Math.floor(this.cellSize * 0.32));
    });

    this.tutorialCups.forEach((cup) => {
      const { x, y } = cup.gridPos;
      const posX = this.startX + x * (this.cellSize + this.gap);
      const posY = this.startY + y * (this.cellSize + this.gap);
      cup.container.setPosition(posX, posY);
      const scale = this.cellSize / 100;
      cup.container.setScale(scale);
      cup.baseScale = scale;
    });

    this.highlightOverlay.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.highlightOverlay.setSize(this.scale.width, this.scale.height);
  }

  private createCup(isPink: boolean, gridX: number, gridY: number): CupInfo {
    const container = this.add.container(0, 0);

    // Shadow
    const shadow = this.add.arc(4, 4, 45, 0, Math.PI * 2).setOrigin(0.5);
    shadow.setFillStyle(0x000000);
    shadow.setAlpha(0.2);
    shadow.setDepth(1);
    container.add(shadow);

    // Body (cup) placeholder for scaling
    const bodyColor = isPink ? 0xFF69B4 : 0x4A90E2;
    const body = this.add.arc(0, 0, 45, 0, Math.PI * 2).setOrigin(0.5);
    body.setFillStyle(bodyColor);
    body.setAlpha(0);
    body.setDepth(1);
    container.add(body);

    // Cup silhouette (rim + body + base)
    const cupGraphics = this.add.graphics();
    const bodyStrokeColor = isPink ? 0xFF1493 : 0x2E6BB3;
    const bodyShade = isPink ? 0xD94A9E : 0x2C6BB8;

    cupGraphics.fillStyle(0xFFFFFF, 0.4);
    cupGraphics.fillEllipse(0, -26, 72, 16);
    cupGraphics.lineStyle(3, bodyStrokeColor, 1);
    cupGraphics.strokeEllipse(0, -26, 72, 16);

    cupGraphics.fillStyle(bodyColor, 1);
    cupGraphics.fillPoints([
      { x: -34, y: -20 },
      { x: 34, y: -20 },
      { x: 26, y: 28 },
      { x: -26, y: 28 }
    ], true);
    cupGraphics.lineStyle(3, bodyStrokeColor, 1);
    cupGraphics.strokePoints([
      { x: -34, y: -20 },
      { x: 34, y: -20 },
      { x: 26, y: 28 },
      { x: -26, y: 28 }
    ], true);

    cupGraphics.fillStyle(bodyShade, 1);
    cupGraphics.fillRoundedRect(-22, 26, 44, 10, 5);
    cupGraphics.lineStyle(2, bodyStrokeColor, 1);
    cupGraphics.strokeRoundedRect(-22, 26, 44, 10, 5);

    cupGraphics.fillStyle(0xFFFFFF, 0.25);
    cupGraphics.fillEllipse(-14, -4, 20, 26);
    cupGraphics.setDepth(3);
    container.add(cupGraphics);

    container.setSize(100, 100);
    container.setInteractive({ useHandCursor: true });

    const cupInfo: CupInfo = {
      container,
      isPink,
      gridPos: { x: gridX, y: gridY },
      baseScale: 1
    };

    container.on('pointerdown', () => {
      if (!this.isInteractiveStep) return;
      this.handleCupClick(cupInfo);
    });

    return cupInfo;
  }

  private handleCupClick(cup: CupInfo) {
    const adjacentEmptyCell = this.findAdjacentEmptyCell(cup.gridPos);
    if (!adjacentEmptyCell) return;

    const from = { ...cup.gridPos };
    const to = { ...adjacentEmptyCell };

    cup.gridPos = to;
    this.emptyCell = from;
    this.emptyCellKeys = new Set([`${this.emptyCell.x},${this.emptyCell.y}`]);

    this.animateMove(cup, to, () => {
      this.layoutGrid();
      if (this.tutorialStep === 2) {
        const pinkCup = this.tutorialCups.find(c => c.isPink);
        if (pinkCup && pinkCup.gridPos.x === this.targetCell.x && pinkCup.gridPos.y === this.targetCell.y) {
          this.isInteractiveStep = false;
          this.nextTutorialStep();
        }
      }
    });
  }

  private animateMove(cup: CupInfo, targetPos: { x: number; y: number }, onComplete: () => void) {
    const { width, height } = this.scale;
    const gridWidth = this.gridCols * this.cellSize + (this.gridCols - 1) * this.gap;
    const gridHeight = this.gridRows * this.cellSize + (this.gridRows - 1) * this.gap;
    const startX = (width - gridWidth) / 2 + this.cellSize / 2;
    const startY = (height - gridHeight) / 2 + this.cellSize / 2 + 30;

    const target = {
      x: startX + targetPos.x * (this.cellSize + this.gap),
      y: startY + targetPos.y * (this.cellSize + this.gap)
    };

    this.tweens.add({
      targets: cup.container,
      x: target.x,
      y: target.y,
      duration: 400,
      ease: 'Quad.easeInOut',
      onComplete
    });
  }

  private findAdjacentEmptyCell(position: { x: number; y: number }) {
    const neighbors = [
      { x: position.x - 1, y: position.y },
      { x: position.x + 1, y: position.y },
      { x: position.x, y: position.y - 1 },
      { x: position.x, y: position.y + 1 }
    ];

    return neighbors.find(neighbor => this.emptyCellKeys.has(`${neighbor.x},${neighbor.y}`)) || null;
  }

  private createTutorialUI() {
    const { width, height } = this.scale;

    // Title
    this.titleText = this.add.text(width / 2, 80, 'เรียนรู้วิธีเล่น', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '40px',
      color: '#2C3E50',
      stroke: '#FFFFFF',
      strokeThickness: 6,
      fontStyle: 'bold'
    })
      .setPadding(14, 10, 14, 12)
      .setOrigin(0.5);

    // Instruction panel
    this.instructionPanel = this.add.graphics();
    this.instructionPanel.fillStyle(0xFFFFFF, 0.95);
    this.instructionPanel.fillRoundedRect(-width * 0.45, -70, width * 0.9, 160, 24);
    this.instructionPanel.lineStyle(4, 0x4A90E2, 1);
    this.instructionPanel.strokeRoundedRect(-width * 0.45, -70, width * 0.9, 160, 24);
    this.instructionPanel.setDepth(240);

    this.tutorialText = this.add.text(width / 2, height - 165 + this.tutorialPanelOffsetY, '', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '30px',
      color: '#2C3E50',
      align: 'center',
      wordWrap: { width: width * 0.85 },
      padding: { x: 20, y: 15 }
    }).setOrigin(0.5).setDepth(250);

    this.continueText = this.add.text(width / 2, height - 80 + this.tutorialPanelOffsetY, 'แตะเพื่อไปต่อ', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '26px',
      color: '#555555',
      fontStyle: 'italic'
    })
      .setPadding(10, 8, 10, 8)
      .setOrigin(0.5)
      .setDepth(250);

    this.tweens.add({
      targets: this.continueText,
      alpha: 0.6,
      duration: 1200,
      yoyo: true,
      repeat: -1
    });

    this.skipButton = this.add.text(width - 32, 20, 'ข้าม', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '20px',
      color: '#FFFFFF',
      backgroundColor: '#FF6B6B',
      padding: { x: 18, y: 10 }
    }).setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(300);

    this.skipButton.setStyle({
      fontStyle: 'bold',
      stroke: '#B93A3A',
      strokeThickness: 2
    });


    this.movementHintArrow = this.add.graphics();
    this.movementHintArrow.setDepth(220);
    this.movementHintArrow.setVisible(false);

    this.pinkCupArrow = this.add.graphics();
    this.pinkCupArrow.setDepth(221);
    this.pinkCupArrow.setVisible(false);

    this.skipButton.on('pointerdown', () => {
      this.completeTutorial();
    });

    this.positionUI();
  }

  private positionUI() {
    const { width, height } = this.scale;

    this.titleText.setPosition(width / 2, 160);
    this.instructionPanel.setPosition(width / 2, height - 165 + this.tutorialPanelOffsetY);
    this.tutorialText.setPosition(width / 2, height - 165 + this.tutorialPanelOffsetY);
    this.continueText.setPosition(width / 2, height - 100 + this.tutorialPanelOffsetY);
    this.skipButton.setPosition(width - 24, 20);
  }

  private positionHighlights() {
    const pinkCup = this.tutorialCups.find(cup => cup.isPink);
    if (pinkCup) {
      this.pinkCupHighlight.clear();
      this.pinkCupHighlight.lineStyle(4, 0xFFFF00, 1);
      this.pinkCupHighlight.strokeCircle(0, 0, this.cellSize / 2 + 12);
      this.pinkCupHighlight.setPosition(pinkCup.container.x, pinkCup.container.y);
      this.pinkCupHighlight.setAlpha(0.3);
    }

    const targetIndex = this.targetCell.x + this.targetCell.y * this.gridCols;
    const targetTile = this.tutorialTiles[targetIndex];
    if (targetTile) {
      this.targetTileHighlight.clear();
      this.targetTileHighlight.lineStyle(4, 0xFF0000, 1);
      this.targetTileHighlight.strokeRect(
        -(this.cellSize + 20) / 2,
        -(this.cellSize + 20) / 2,
        this.cellSize + 20,
        this.cellSize + 20
      );
      this.targetTileHighlight.setPosition(targetTile.x, targetTile.y);
      this.targetTileHighlight.setAlpha(0.2);
    }
  }

  private startTutorial() {
    this.tutorialStep = 0;
    this.showTutorialStep();
  }

  private showTutorialStep() {
    const messages = [
      'นี่คือถ้วยสีชมพู\nถ้วยนี้คือของคุณ',
      'นี่คือช่องเป้าหมายสีชมพู\nพาถ้วยมาที่นี่เพื่อชนะ',
      'ลองแตะถ้วยสีน้ำเงิน\nเพื่อเลื่อนถ้วยสีชมพู',
      'หลังจากแตะครั้งแรก\nตัวเลข 2 ตัวจะปรากฏ',
      'จำตำแหน่งเลขทั้งสอง\nแล้วตอบคำถาม',
      'เก่งมาก!\nพร้อมเล่นจริงแล้ว'
    ];

    if (this.tutorialStep >= messages.length) {
      this.finishTutorial();
      return;
    }

    this.tutorialText.setText(messages[this.tutorialStep]);

    this.pinkCupHighlight.setVisible(false);
    this.targetTileHighlight.setVisible(false);
    this.tutorialCups.forEach(cup => this.tweens.killTweensOf(cup.container));
    this.tweens.killTweensOf(this.pinkCupHighlight);
    this.tweens.killTweensOf(this.targetTileHighlight);
    this.movementHintArrow.setVisible(false);
    this.pinkCupArrow.setVisible(false);

    const showNumbers = this.tutorialStep === 3;
    if (showNumbers) {
      this.showTutorialNumbers();
    } else {
      this.hideTutorialNumbers(true);
    }

    this.isInteractiveStep = false;
    this.continueText.setVisible(true);
    this.continueText.setText('แตะเพื่อไปต่อ');

    switch (this.tutorialStep) {
      case 0:
        this.setOverlayBlocking(true);
        this.pinkCupHighlight.setVisible(true);
        this.pulseObject(this.pinkCupHighlight);
        break;
      case 1:
        this.setOverlayBlocking(true);
        this.targetTileHighlight.setVisible(true);
        this.pulseObject(this.targetTileHighlight);
        break;
      case 2:
        this.setOverlayBlocking(false);
        this.setCupInteraction(true);
        this.isInteractiveStep = true;
        this.continueText.setVisible(false);
        this.highlightAdjacentCups();
        this.showMovementHint();
        this.showPinkCupArrow();
        break;
      case 3:
        this.setOverlayBlocking(false);
        this.setCupInteraction(false);
        this.targetTileHighlight.setVisible(true);
        this.pulseObject(this.targetTileHighlight);
        this.time.delayedCall(3000, () => {
          this.isInteractiveStep = false;
          this.nextTutorialStep();
        });
        break;
      case 4:
        this.setOverlayBlocking(false);
        this.setCupInteraction(false);
        this.isInteractiveStep = true;
        this.continueText.setVisible(false);
        this.startMemoryProbe();
        break;
      case 5:
        this.continueText.setText('แตะเพื่อเริ่มเล่นจริง');
        this.setOverlayBlocking(true);
        this.setCupInteraction(false);
        break;
      default:
        this.setOverlayBlocking(false);
        this.setCupInteraction(false);
        break;
    }
  }

  private pulseObject(obj: Phaser.GameObjects.GameObject) {
    this.tweens.add({
      targets: obj,
      alpha: 0.2,
      duration: 900,
      yoyo: true,
      repeat: -1
    });
  }

  private nextTutorialStep() {
    this.tutorialStep++;
    this.showTutorialStep();
  }

  private highlightAdjacentCups() {
    this.tutorialCups.forEach(cup => {
      if (cup.isPink) return;
      const isAdjacent = Math.abs(cup.gridPos.x - this.emptyCell.x) + Math.abs(cup.gridPos.y - this.emptyCell.y) === 1;
      if (!isAdjacent) return;
      this.tweens.add({
        targets: cup.container,
        scale: cup.baseScale * 1.12,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  private showTutorialNumbers() {
    if (this.isNumbersRevealed) return;
    this.isNumbersRevealed = true;

    const numberPositions = [
      { x: 0, y: 0, value: 1 },
      { x: 2, y: 2, value: 2 }
    ];

    this.numberTexts.forEach((text, index) => {
      const col = index % this.gridCols;
      const row = Math.floor(index / this.gridCols);
      const match = numberPositions.find(pos => pos.x === col && pos.y === row);
      if (!match) {
        text.setVisible(false);
        return;
      }

      text.setText(`${match.value}`);
      text.setVisible(true);
      text.setAlpha(0);
      this.tweens.add({
        targets: text,
        alpha: 1,
        duration: 800,
        ease: 'Quad.easeOut'
      });
    });
  }

  private hideTutorialNumbers(instant = false) {
    this.numberTexts.forEach(text => {
      this.tweens.killTweensOf(text);
      if (instant) {
        text.setAlpha(0);
        text.setVisible(false);
        return;
      }
      this.tweens.add({
        targets: text,
        alpha: 0,
        duration: 600,
        ease: 'Quad.easeIn',
        onComplete: () => {
          text.setVisible(false);
        }
      });
    });
  }

  private startMemoryProbe() {
    this.hideTutorialNumbers();

    const probeOptions = [
      { x: 0, y: 0, value: 1 },
      { x: 2, y: 2, value: 2 }
    ];

    const randomIndex = Phaser.Math.Between(0, probeOptions.length - 1);
    this.probeTarget = { x: probeOptions[randomIndex].x, y: probeOptions[randomIndex].y };
    this.probeAnswer = probeOptions[randomIndex].value;

    this.tutorialText.setText(`เลข ${this.probeAnswer} อยู่ช่องไหน?\nแตะช่องที่จำได้`);

    this.enableTileInteraction();
  }

  private enableTileInteraction() {
    this.tutorialTiles.forEach((tile, index) => {
      const col = index % this.gridCols;
      const row = Math.floor(index / this.gridCols);

      const isProbeTarget = !!this.probeTarget && col === this.probeTarget.x && row === this.probeTarget.y;

      // Only highlight the correct answer tile (probe target)
      if (isProbeTarget) {
        tile.setStrokeStyle(4, 0x4A90E2);
      } else {
        tile.setStrokeStyle(0);
      }

      tile.setScale(1);
      tile.setInteractive({ useHandCursor: true });
      tile.once('pointerdown', () => {
        if (!this.probeTarget) return;
        const isCorrect = col === this.probeTarget.x && row === this.probeTarget.y;
        this.handleProbeAnswer(tile, isCorrect);
      });

      // Pulse only the correct answer tile
      if (isProbeTarget) {
        this.tweens.add({
          targets: tile,
          alpha: 0.85,
          scale: 1.05,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else {
        tile.setAlpha(1);
      }
    });
  }

  private handleProbeAnswer(tile: Phaser.GameObjects.Rectangle, isCorrect: boolean) {
    this.tutorialTiles.forEach(t => {
      t.disableInteractive();
      this.tweens.killTweensOf(t);
      t.setAlpha(1);
      t.setStrokeStyle(0);
      t.setScale(1);
    });

    const color = isCorrect ? 0x58CC02 : 0xFF4444;
    const strokeColor = isCorrect ? 0x3D9400 : 0xCC0000;
    tile.setStrokeStyle(6, strokeColor);
    this.tweens.add({
      targets: tile,
      fillStyle: color,
      scale: 1.08,
      duration: 300,
      ease: 'Back.out'
    });

    // Avoid crashing if audio wasn't preloaded (common during tutorial/dev)
    const soundKey = isCorrect ? 'success' : 'error';
    if (this.cache.audio.exists(soundKey)) {
      this.sound.play(soundKey);
    }

    const tileIndex = this.tutorialTiles.indexOf(tile);
    if (tileIndex !== -1 && this.numberTexts[tileIndex]) {
      const numberText = this.numberTexts[tileIndex];
      numberText.setVisible(true);
      numberText.setAlpha(0);
      this.tweens.add({
        targets: numberText,
        alpha: 1,
        duration: 200
      });
    }

    this.time.delayedCall(900, () => {
      this.isInteractiveStep = false;
      this.nextTutorialStep();
    });
  }


  private showMovementHint() {
    const movableCups = this.tutorialCups.filter(cup => {
      const isAdjacent = Math.abs(cup.gridPos.x - this.emptyCell.x) + Math.abs(cup.gridPos.y - this.emptyCell.y) === 1;
      return isAdjacent;
    });

    const movableCup = movableCups.find(cup => !cup.isPink) || movableCups[0];
    if (!movableCup) {
      this.movementHintArrow.setVisible(false);
      return;
    }

    const emptyPos = this.gridToWorld(this.emptyCell.x, this.emptyCell.y);
    this.movementHintArrow.clear();
    this.movementHintArrow.lineStyle(6, 0x00AEEF, 1);
    this.movementHintArrow.strokeLineShape(
      new Phaser.Geom.Line(movableCup.container.x, movableCup.container.y, emptyPos.x, emptyPos.y)
    );
    this.movementHintArrow.fillStyle(0x00AEEF, 1);
    this.movementHintArrow.fillTriangle(emptyPos.x - 10, emptyPos.y - 10, emptyPos.x + 10, emptyPos.y - 10, emptyPos.x, emptyPos.y + 10);
    this.movementHintArrow.setVisible(true);
  }

  private showPinkCupArrow() {
    const pinkCup = this.tutorialCups.find(cup => cup.isPink);
    if (!pinkCup) {
      this.pinkCupArrow.setVisible(false);
      return;
    }

    const targetIndex = this.targetCell.x + this.targetCell.y * this.gridCols;
    const targetTile = this.tutorialTiles[targetIndex];
    if (!targetTile) {
      this.pinkCupArrow.setVisible(false);
      return;
    }

    const fromX = pinkCup.container.x;
    const fromY = pinkCup.container.y ;
    const toX = targetTile.x;
    const toY = targetTile.y;

    this.pinkCupArrow.clear();
    this.pinkCupArrow.lineStyle(6, 0xFF6FB2, 1);
    this.pinkCupArrow.strokeLineShape(new Phaser.Geom.Line(fromX, fromY, toX, toY));
    this.pinkCupArrow.fillStyle(0xFF6FB2, 1);
    this.pinkCupArrow.fillTriangle(
      toX - 10,
      toY - 12,
      toX - 10,
      toY + 12,
      toX + 14,
      toY
    );
    this.pinkCupArrow.setVisible(true);
  }

  private gridToWorld(gridX: number, gridY: number) {
    return {
      x: this.startX + gridX * (this.cellSize + this.gap),
      y: this.startY + gridY * (this.cellSize + this.gap)
    };
  }

  private finishTutorial() {
    this.tutorialCups.forEach(cup => cup.container.destroy());
    this.tutorialTiles.forEach(tile => tile.destroy());
    this.numberTexts.forEach(text => text.destroy());
    this.highlightOverlay.destroy();
    this.pinkCupHighlight.destroy();
    this.targetTileHighlight.destroy();
    this.instructionPanel.destroy();
    this.titleText.destroy();
    this.continueText.destroy();

    this.completeTutorial();
  }
}