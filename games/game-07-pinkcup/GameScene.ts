import * as Phaser from 'phaser';
import { PINKCUP_LEVELS, getPinkCupLevel } from './levels';
import { upsertLevelStars } from '@/lib/stars';
import type { 
  PinkCupLevelConfig, 
  CupData, 
  TileData,
  RoundTelemetry, 
  MoveRecord, 
  ProbeRecord,
  GridConfig
} from './types';

/**
 * Find the Pink Cup - Main Game Scene
 * Scalable architecture with event-driven design
 * Numbers stay in grid cells, not on cups
 */
export class PinkCupGameScene extends Phaser.Scene {
  private currentLevelConfig!: PinkCupLevelConfig;
  private isTutorialComplete = false;

  // Audio
  private bgMusic!: Phaser.Sound.BaseSound;
  private bgMusicVolume = 0.5;

  // Game State
  private cups: CupData[] = [];
  private tiles: TileData[] = [];
  private targetCell: {x: number, y: number} = {x: 0, y: 0};
  private emptyCells: {x: number, y: number}[] = [];
  private emptyCellKeys: Set<string> = new Set();
  private pinkCupIndex = 0;
  private isLocked = false;
  private hasMovedFirst = false;
  private isNumbersRevealed = false;
  private numbersRevealedAt = 0;
  private originalBackgroundColor = 0xF0F4F8;
  private backgroundRect!: Phaser.GameObjects.Rectangle;
  
  // Memory probe state
  private currentProbeIndex = 0;
  private totalProbes = 1;
  private probeQuestions: {x: number, y: number}[] = [];
  private probeCorrectCount = 0;
  private probeCells: {container: Phaser.GameObjects.Container, x: number, y: number, number: number}[] = [];
  
  // Telemetry
  private telemetry!: RoundTelemetry;
  private startTime = 0;
  private timerEvent!: Phaser.Time.TimerEvent;
  private customTimerBar!: Phaser.GameObjects.Graphics;
  private lastTimerPct = 100;
  
  // Grid Layout
  private gridMetrics: GridConfig | null = null;

  // UI Elements
  private messageText!: Phaser.GameObjects.Text;
  private probeUIContainer!: Phaser.GameObjects.Container;

  // Timer Events
  private revealTimerEvent!: Phaser.Time.TimerEvent;
  
  // Probe tracking
  private isProbePhase = false;
  private probeUIGraphics!: Phaser.GameObjects.Graphics;
  private swipeStart: {x: number, y: number} | null = null;
  private activeCup: CupData | null = null;

  constructor() {
    super({ key: 'PinkCupGameScene' });
  }

  init(data: { level: number; isTutorialComplete?: boolean }) {
    const regLevel = this.registry.get('level');
    console.log(`[PinkCupGameScene] init data=${JSON.stringify(data)} registry=${regLevel}`);
    
    const level = data.level || regLevel || 1;
    this.currentLevelConfig = PINKCUP_LEVELS[level] || PINKCUP_LEVELS[1];
    this.isTutorialComplete = data.isTutorialComplete || false;

    // Reset state
    this.cups = [];
    this.tiles = [];
    this.hasMovedFirst = false;
    this.isNumbersRevealed = false;
    this.isLocked = false;
    
    // Initialize telemetry
    this.telemetry = {
      level: level,
      mode: this.currentLevelConfig.mode || 'classic',
      targetCell: {x: 0, y: 0},
      pinkStart: {x: 0, y: 0},
      t_start: 0,
      t_end: 0,
      moves: [],
      reveal: {
        start: 0,
        end: 0,
        elements: {}
      },
      probes: [],
      metrics: {
        spatial: {
          goodMoveRate: 0,
          pathDirectness: 0,
          score: 0
        },
        memory: {
          recallAccuracy: 0,
          avgRecallRTMs: 0,
          score: 0
        },
        speed: {
          RT_firstMs: 0,
          meanInterMoveRT: 0,
          completionTimeMs: 0,
          score: 0
        },
        planning: {
          optimalMoves: 0,
          movesTaken: 0,
          detourMoves: 0,
          backtrackCount: 0,
          score: 0
        }
      }
    };

    // Stop all sounds
    this.sound.stopAll();
  }

  preload() {
    // Load audio
    this.load.audio('cup-move', '/assets/sounds/cardmatch/card-flip.mp3');
    this.load.audio('success', '/assets/sounds/cardmatch/match-success.mp3');
    this.load.audio('error', '/assets/sounds/cardmatch/match-fail.mp3');
    this.load.audio('timer-warning', '/assets/sounds/global/timer-warning.mp3');
    this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
    this.load.audio('level-fail', '/assets/sounds/global/level-fail.mp3');
    this.load.audio('bg-music', '/assets/sounds/cardmatch/bg-music.mp3');
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.backgroundRect = this.add.rectangle(width / 2, height / 2, width, height, 0xF0F4F8).setAlpha(1);

    // Create grid and game elements
    this.createGrid();
    this.createTiles();
    this.createCups();
    this.layoutGrid();
    this.createUI();
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.resolveSwipe(pointer);
    });
    
    // Create timer bar
    this.customTimerBar = this.add.graphics();
    this.customTimerBar.setDepth(150);
    this.customTimerBar.setVisible(false);

    // Check if tutorial should be shown
    if (!this.isTutorialComplete) {
      this.showTutorialHint();
    } else {
      this.startGame();
    }

    // Handle resize
    this.scale.on('resize', () => {
      this.layoutGrid();
      if (this.customTimerBar.visible) {
        this.drawTimerBar(this.lastTimerPct);
      }
    });

    // Start BG music
    try {
      this.bgMusic = this.sound.add('bg-music', {
        volume: this.bgMusicVolume,
        loop: true
      });
      this.bgMusic.play();
    } catch (e) {
      console.warn('Failed to play bg-music', e);
    }
  }

  update() {
    if (!this.customTimerBar || !this.customTimerBar.visible || this.isLocked) return;

    const limitMs = this.currentLevelConfig.timeLimitSeconds * 1000;
    const elapsed = Date.now() - this.startTime;
    const remainingMs = Math.max(0, limitMs - elapsed);
    const pct = Math.max(0, (remainingMs / limitMs) * 100);

    this.drawTimerBar(pct);
  }

  // ===== GRID SETUP =====

  createGrid() {
    const { gridCols, gridRows } = this.currentLevelConfig;
    let adjustedCols = gridCols;
    let adjustedRows = gridRows;

    this.gridMetrics = {
      cols: adjustedCols,
      rows: adjustedRows,
      cellSize: 100,
      gap: 15
    };
  }

  createTiles() {
    const { gridCols, gridRows } = this.currentLevelConfig;
    let adjustedCols = gridCols;
    let adjustedRows = gridRows;

    this.tiles = [];

    // Random target position (within adjusted grid)
    const targetX = Math.floor(Math.random() * adjustedCols);
    const targetY = Math.floor(Math.random() * adjustedRows);
    this.targetCell = {x: targetX, y: targetY};
    this.telemetry.targetCell = this.targetCell;
    
    console.log('[CreateTiles] Level:', this.currentLevelConfig.level, 'Adjusted grid:', adjustedCols, 'x', adjustedRows);
    console.log('[CreateTiles] Target cell:', this.targetCell);

    // Determine number of numbered cells (not all cells need numbers)
    const totalCells = adjustedCols * adjustedRows;
    const defaultNumberedCells = totalCells - 1; // One empty cell, rest have numbers
    const numberedCellsCount = Math.min(
      this.currentLevelConfig.numberedTilesCount ?? defaultNumberedCells,
      defaultNumberedCells
    );

    // Create list of cell positions and shuffle
    const allCellPositions: {x: number, y: number}[] = [];
    for (let y = 0; y < adjustedRows; y++) {
      for (let x = 0; x < adjustedCols; x++) {
        allCellPositions.push({x, y});
      }
    }
    Phaser.Utils.Array.Shuffle(allCellPositions);

    // Assign numbers to cells (all except one)
    const cellNumbers: {[key: string]: number} = {};
    for (let i = 0; i < numberedCellsCount; i++) {
      const pos = allCellPositions[i];
      cellNumbers[`${pos.x},${pos.y}`] = i + 1;
    }

    // Create tiles with numbers
    for (let y = 0; y < adjustedRows; y++) {
      for (let x = 0; x < adjustedCols; x++) {
        const isTarget = x === targetX && y === targetY;
        const color = isTarget ? 0xFFB6C1 : 0xE8E8E8;
        
        const rectangle = this.add.rectangle(0, 0, 100, 100, color);
        rectangle.setOrigin(0.5);
        rectangle.setDepth(0);
        
        // Check if this cell has a number
        const cellKey = `${x},${y}`;
        const hasNumber = cellNumbers[cellKey] !== undefined;
        const numberValue = cellNumbers[cellKey] || null;

        // Create number text if cell has a number
        let numberText: Phaser.GameObjects.Text | null = null;
        if (hasNumber && numberValue !== null) {
          numberText = this.add.text(0, 0, numberValue.toString(), {
            fontFamily: 'Arial, sans-serif',
            fontSize: '32px',
            color: '#1A1A1A',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 4
          })
            .setPadding(6, 6, 6, 6)
            .setOrigin(0.5)
            .setVisible(false)
            .setDepth(2);
        }

        const tileData: TileData = {
          rectangle,
          numberText,
          hasNumber,
          numberValue,
          position: {x, y}
        };
        
        this.tiles.push(tileData);

        // Store in telemetry for memory probe
        if (hasNumber && numberValue !== null) {
          this.telemetry.reveal.elements[cellKey] = numberValue;
        }
      }
    }

    console.log('[CreateTiles] Created tiles with numbers:', numberedCellsCount);
  }

  createCups() {
    const { gridCols, gridRows } = this.currentLevelConfig;
    let adjustedCols = gridCols;
    let adjustedRows = gridRows;

    const totalCells = adjustedCols * adjustedRows;
    const emptyCount = this.getEmptyCellCount();
    const totalCups = Math.max(0, totalCells - emptyCount);
    
    // Create list of cell positions
    const allPositions: {x: number, y: number}[] = [];
    for (let i = 0; i < totalCells; i++) {
      allPositions.push({x: i % adjustedCols, y: Math.floor(i / adjustedCols)});
    }
    
    // Shuffle all positions
    Phaser.Utils.Array.Shuffle(allPositions);

    this.cups = [];

    // Create cups (1 pink, rest blue) - no numbers on cups anymore
    for (let i = 0; i < totalCups; i++) {
      const isPink = i === 0;
      const cup = this.createCup(isPink, i);
      cup.position = allPositions[i];
      
      if (isPink) {
        this.pinkCupIndex = i;
        this.telemetry.pinkStart = {...cup.position};
      }

      this.cups.push(cup);
    }

    // Remaining positions are empty cells
    this.emptyCells = allPositions.slice(totalCups, totalCells);
    this.emptyCellKeys = new Set(this.emptyCells.map(cell => `${cell.x},${cell.y}`));
    
    console.log('[CreateCups] Total cells:', totalCells, 'Total cups:', totalCups, 'Empty cells:', this.emptyCells.length);
    console.log('[CreateCups] Pink cup at:', this.telemetry.pinkStart);
    console.log('[CreateCups] Empty cells at:', this.emptyCells);
    console.log('[CreateCups] Target cell:', this.targetCell);
  }

  createCup(isPink: boolean, index: number): CupData {
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

    // Rim
    cupGraphics.fillStyle(0xFFFFFF, 0.4);
    cupGraphics.fillEllipse(0, -26, 72, 16);
    cupGraphics.lineStyle(3, bodyStrokeColor, 1);
    cupGraphics.strokeEllipse(0, -26, 72, 16);

    // Cup body (trapezoid)
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

    // Base
    cupGraphics.fillStyle(bodyShade, 1);
    cupGraphics.fillRoundedRect(-22, 26, 44, 10, 5);
    cupGraphics.lineStyle(2, bodyStrokeColor, 1);
    cupGraphics.strokeRoundedRect(-22, 26, 44, 10, 5);

    // Highlight
    cupGraphics.fillStyle(0xFFFFFF, 0.25);
    cupGraphics.fillEllipse(-14, -4, 20, 26);

    cupGraphics.setDepth(3);
    container.add(cupGraphics);

    // Make ALL cups interactive for sliding puzzle
    container.setSize(100, 100);
    container.setInteractive({ useHandCursor: true });

    const cupData: CupData = {
      container,
      body,
      shadow,
      hitZone: container as any,
      position: {x: 0, y: 0},
      memoryValue: index + 1,
      isPink,
      baseScale: 1
    };

    // Add event listeners for swipe
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.activeCup = cupData;
      this.swipeStart = { x: pointer.x, y: pointer.y };
    });

    return cupData;
  }

  layoutGrid() {
    if (!this.gridMetrics) return;

    const { width, height } = this.scale;
    const { cols, rows, cellSize, gap } = this.gridMetrics;

    // Calculate responsive dimensions
    const maxCellSize = 120;
    const baseGap = 15;
    
    // Use 85% of screen width and 70% of screen height
    const availableW = width * 0.85;
    const availableH = height * 0.70;

    let scaledCellSize = Math.min(maxCellSize, (availableW - (cols - 1) * baseGap) / cols);
    let scaledGap = baseGap * (scaledCellSize / maxCellSize);

    // Re-check vertical fit
    const totalH = rows * scaledCellSize + (rows - 1) * scaledGap;
    if (totalH > availableH) {
      const scale = availableH / totalH;
      scaledCellSize *= scale;
      scaledGap *= scale;
    }

    this.gridMetrics.cellSize = scaledCellSize;
    this.gridMetrics.gap = scaledGap;

    const gridWidth = cols * scaledCellSize + (cols - 1) * scaledGap;
    const gridHeight = rows * scaledCellSize + (rows - 1) * scaledGap;

    const startX = (width - gridWidth) / 2 + scaledCellSize / 2;
    const startY = (height - gridHeight) / 2 + scaledCellSize / 2;

    // Layout tiles
    this.tiles.forEach((tile, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (scaledCellSize + scaledGap);
      const y = startY + row * (scaledCellSize + scaledGap);
      tile.rectangle.setPosition(x, y);
      tile.rectangle.setSize(scaledCellSize, scaledCellSize);
      
      // Update number text position and scale
      if (tile.numberText) {
        tile.numberText.setPosition(x, y);
        const fontSize = Math.floor(28 * (scaledCellSize / 100));
        tile.numberText.setFontSize(fontSize);
      }
      
      // Highlight empty cell
      const isEmptyCell = this.emptyCellKeys.has(`${tile.position.x},${tile.position.y}`);
      if (isEmptyCell) {
        tile.rectangle.setStrokeStyle(4, 0x999999);
        tile.rectangle.setAlpha(0.6);
      } else {
        tile.rectangle.setStrokeStyle(0);
        tile.rectangle.setAlpha(1);
      }
    });

    // Layout cups
    this.cups.forEach((cup) => {
      const { x, y } = cup.position;
      const posX = startX + x * (scaledCellSize + scaledGap);
      const posY = startY + y * (scaledCellSize + scaledGap);
      cup.container.setPosition(posX, posY);

      // Scale elements
      const scale = scaledCellSize / 100;
      cup.container.setScale(scale);
      cup.baseScale = scale;
    });
  }

  createUI() {
    const { width, height } = this.scale;

    this.messageText = this.add.text(width / 2, height * 0.17, '', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '36px',
      color: '#2C3E50',
      stroke: '#FFFFFF',
      strokeThickness: 6,
      fontStyle: 'bold',
      align: 'center'
    })
      .setPadding(14, 10, 14, 12)
      .setOrigin(0.5)
      .setDepth(200);
  }

  // ===== GAME FLOW =====

  showTutorialHint() {
    const { width, height } = this.scale;
    const message = 'เคลื่อนถ้วยสีชมพูไปยังช่องเป้าหมาย!\nหลังจากเคลื่อนครั้งแรก จะมีตัวเลขปรากฏในช่อง\nจำตำแหน่งตัวเลขให้ดี!';

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000)
      .setAlpha(0.7)
      .setDepth(300)
      .setInteractive();

    // Hint background using graphics
    const hintBgGraphics = this.add.graphics();
    hintBgGraphics.fillStyle(0xFFFFFF);
    hintBgGraphics.fillRect(-width * 0.45, -100, width * 0.9, 200);
    hintBgGraphics.lineStyle(4, 0x4A90E2);
    hintBgGraphics.strokeRect(-width * 0.45, -100, width * 0.9, 200);
    hintBgGraphics.setAlpha(0.95);
    hintBgGraphics.setDepth(301);
    hintBgGraphics.setPosition(width / 2, height / 2);

    const hintText = this.add.text(width / 2, height / 2 - 20, message, {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '24px',
      color: '#2C3E50',
      align: 'center',
      wordWrap: { width: width * 0.8 }
    }).setOrigin(0.5).setDepth(302).setPadding(10, 14, 10, 18);

    const tapText = this.add.text(width / 2, height / 2 + 60, '👆 แตะเพื่อเริ่มเล่น', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '20px',
      color: '#888888',
      fontStyle: 'italic'
    })
      .setPadding(10, 8, 10, 8)
      .setOrigin(0.5)
      .setDepth(302);

    // Entrance animation
    hintBgGraphics.setScale(0);
    hintText.setScale(0);

    this.tweens.add({
      targets: [hintBgGraphics, hintText],
      scale: 1,
      duration: 300,
      ease: 'Back.out'
    });

    this.tweens.add({
      targets: tapText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    overlay.on('pointerdown', () => {
      this.tweens.add({
        targets: [overlay, hintBgGraphics, hintText, tapText],
        alpha: 0,
        duration: 250,
        onComplete: () => {
          overlay.destroy();
          hintBgGraphics.destroy();
          hintText.destroy();
          tapText.destroy();
          this.startGame();
        }
      });
    });
  }

  startGame() {
    this.messageText.setText('เคลื่อนถ้วยชมพู\nไปยังช่องเป้าหมาย');
    this.startTime = Date.now();
    this.telemetry.t_start = this.startTime;
    this.startTimer();
  }

  startTimer() {
    this.customTimerBar.setVisible(true);
    this.drawTimerBar(100);

    this.timerEvent = this.time.addEvent({
      delay: 100,
      callback: () => {
        if (this.isLocked) return;

        const elapsed = Date.now() - this.startTime;
        const limitMs = this.currentLevelConfig.timeLimitSeconds * 1000;
        const remainingMs = Math.max(0, limitMs - elapsed);
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        const pct = Math.max(0, (remainingMs / limitMs) * 100);
        this.lastTimerPct = pct;

        this.game.events.emit('timer-update', {
          remaining: remainingSeconds,
          total: this.currentLevelConfig.timeLimitSeconds
        });

        if (remainingMs <= 0) {
          this.handleTimeout();
        }
      },
      loop: true
    });
  }

  drawTimerBar(pct: number) {
    if (!this.customTimerBar) return;
    this.customTimerBar.clear();

    const { width, height } = this.scale;
    const barW = Math.min(width * 0.8, 400);
    const barH = 16;
    const x = (width - barW) / 2;
    const y = height * 0.92;

    // Background
    this.customTimerBar.fillStyle(0x4A90E2, 0.2);
    this.customTimerBar.fillRoundedRect(x, y, barW, barH, 8);
    this.customTimerBar.lineStyle(2, 0x4A90E2, 1);
    this.customTimerBar.strokeRoundedRect(x, y, barW, barH, 8);

    // Fill
    const isWarning = pct < 25;
    const color = isWarning ? 0xFF4444 : 0x58CC02;

    let alpha = 1;
    if (isWarning) {
      alpha = 0.65 + 0.35 * Math.sin(this.time.now / 150);
    }

    this.customTimerBar.fillStyle(color, alpha);
    if (pct > 0) {
      this.customTimerBar.fillRoundedRect(x, y, barW * (pct / 100), barH, 8);
    }
  }

  // ===== CUP MOVEMENT =====

  handleCupClick(cup: CupData) {
    if (this.isLocked) return;
    if (!this.gridMetrics) return;

    const { x, y } = cup.position;

    // Check if adjacent to any empty cell
    const adjacentEmptyCell = this.findAdjacentEmptyCell({ x, y });
    
    console.log('[Cup Click]', cup.isPink ? 'Pink' : 'Blue', 'at', cup.position, 'Empty cells:', this.emptyCells, 'Adjacent:', adjacentEmptyCell);
    
    if (!adjacentEmptyCell) {
      console.log('[Cup] Cannot move - not adjacent to empty');
      return;
    }

    console.log('[Cup] Moving cup from', cup.position, 'to', adjacentEmptyCell);
    this.executeMove(cup, adjacentEmptyCell);
  }

  handleCupSwipe(cup: CupData, direction: 'left' | 'right' | 'up' | 'down') {
    if (this.isLocked) return;
    if (!this.gridMetrics) return;

    const { x, y } = cup.position;
    const target = {
      left: { x: x - 1, y },
      right: { x: x + 1, y },
      up: { x, y: y - 1 },
      down: { x, y: y + 1 }
    }[direction];

    if (!this.emptyCellKeys.has(`${target.x},${target.y}`)) {
      console.log('[Cup Swipe] No empty cell in swipe direction', direction, target);
      return;
    }

    console.log('[Cup Swipe] Moving cup', cup.position, 'to', target, 'direction', direction);
    this.executeMove(cup, target);
  }

  resolveSwipe(pointer: Phaser.Input.Pointer) {
    if (!this.activeCup) return;

    if (!this.swipeStart) {
      this.activeCup = null;
      return;
    }

    const deltaX = pointer.x - this.swipeStart.x;
    const deltaY = pointer.y - this.swipeStart.y;
    const distance = Math.hypot(deltaX, deltaY);
    const cup = this.activeCup;

    this.swipeStart = null;
    this.activeCup = null;

    if (distance < 20) {
      this.handleCupClick(cup);
      return;
    }

    const direction = Math.abs(deltaX) > Math.abs(deltaY)
      ? (deltaX > 0 ? 'right' : 'left')
      : (deltaY > 0 ? 'down' : 'up');

    this.handleCupSwipe(cup, direction);
  }

  executeMove(cup: CupData, targetEmptyCell: {x: number, y: number}) {
    const from = {...cup.position};
    const to = {...targetEmptyCell};

    // Update cup position
    cup.position = to;

    // Update empty cell position (where cup was)
    this.emptyCells = this.emptyCells.map(empty =>
      empty.x === targetEmptyCell.x && empty.y === targetEmptyCell.y ? from : empty
    );
    this.emptyCellKeys = new Set(this.emptyCells.map(cell => `${cell.x},${cell.y}`));

    // Find pink cup to check win condition
    const pinkCup = this.cups.find(c => c.isPink);
    if (!pinkCup) return;

    // Calculate distance to target
    const distanceBefore = Math.abs(from.x - this.targetCell.x) + Math.abs(from.y - this.targetCell.y);
    const distanceAfter = Math.abs(to.x - this.targetCell.x) + Math.abs(to.y - this.targetCell.y);

    // Check if backtracking
    const lastMove = this.telemetry.moves[this.telemetry.moves.length - 1];
    const backtracked = lastMove && 
      lastMove.to.x === to.x && lastMove.to.y === to.y &&
      lastMove.from.x === from.x && lastMove.from.y === from.y;

    // Animate movement
    this.animateMove(cup, to, () => {
      // Record move
      const move: MoveRecord = {
        timestamp: Date.now(),
        from,
        to,
        valid: true,
        distanceToTarget: distanceAfter,
        backtracked
      };
      this.telemetry.moves.push(move);

      // Check if first move
      if (!this.hasMovedFirst) {
        this.hasMovedFirst = true;
        this.revealNumbers();
      }

      // Check win condition - pink cup must be at target cell
      if (pinkCup.position.x === this.targetCell.x && pinkCup.position.y === this.targetCell.y) {
        console.log('[Win Condition] Pink cup reached target!', pinkCup.position, this.targetCell);
        this.handleWin();
      }
    });
  }

  animateMove(cup: CupData, targetPos: {x: number, y: number}, onComplete: () => void) {
    if (!this.gridMetrics) return;

    const { cellSize, gap } = this.gridMetrics;
    const { width, height } = this.scale;

    // Calculate target position
    const gridWidth = this.gridMetrics.cols * cellSize + (this.gridMetrics.cols - 1) * gap;
    const gridHeight = this.gridMetrics.rows * cellSize + (this.gridMetrics.rows - 1) * gap;
    const startX = (width - gridWidth) / 2 + cellSize / 2;
    const startY = (height - gridHeight) / 2 + cellSize / 2;

    const target = {
      x: startX + targetPos.x * (cellSize + gap),
      y: startY + targetPos.y * (cellSize + gap)
    };

    // Play sound
    this.sound.play('cup-move', { volume: 0.6 });

    // Animate cup movement
    this.tweens.add({
      targets: cup.container,
      x: target.x,
      y: target.y,
      duration: 400,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        // Update tile highlights
        this.layoutGrid();
        onComplete();
      }
    });
  }

  findAdjacentEmptyCell(position: {x: number, y: number}): {x: number, y: number} | null {
    const neighbors = [
      { x: position.x - 1, y: position.y },
      { x: position.x + 1, y: position.y },
      { x: position.x, y: position.y - 1 },
      { x: position.x, y: position.y + 1 }
    ];

    const match = neighbors.find(neighbor =>
      this.emptyCellKeys.has(`${neighbor.x},${neighbor.y}`)
    );

    return match || null;
  }

  getEmptyCellCount(): number {
    const level = this.currentLevelConfig.level;
    if (level <= 5) return 3;
    if (level <= 15) return 2;
    return 1;
  }

  // ===== MEMORY REVEAL =====

  revealNumbers() {
    if (this.isNumbersRevealed) return;

    this.isNumbersRevealed = true;
    this.numbersRevealedAt = Date.now();
    this.telemetry.reveal.start = this.numbersRevealedAt;

    // Change background color to indicate memory phase
    this.tweens.add({
      targets: this.backgroundRect,
      fillStyle: 0xFFE4B5,
      duration: 300,
      ease: 'Quad.out'
    });

    // Show numbers on grid tiles (not on cups)
    this.tiles.forEach(tile => {
      if (tile.numberText !== null && tile.hasNumber) {
        tile.numberText.setVisible(true);
        tile.numberText.setAlpha(0);

        this.tweens.add({
          targets: tile.numberText,
          alpha: 1,
          duration: 200
        });
      }
    });

    this.showMessage('จำตำแหน่งตัวเลขให้ดี!');

    // Hide numbers after reveal duration
    this.revealTimerEvent = this.time.delayedCall(this.currentLevelConfig.revealDurationMs, () => {
      this.hideNumbers();
    });
  }

  hideNumbers() {
    this.telemetry.reveal.end = Date.now();

    // Revert background color
    this.tweens.add({
      targets: this.backgroundRect,
      fillStyle: this.originalBackgroundColor,
      duration: 300,
      ease: 'Quad.out'
    });

    // Hide numbers on grid tiles
    this.tiles.forEach(tile => {
      if (tile.numberText !== null) {
        const textObj = tile.numberText;
        this.tweens.add({
          targets: textObj,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            textObj.setVisible(false);
          }
        });
      }
    });

    this.showMessage('เคลื่อนถ้วยชมพู\nไปยังช่องเป้าหมาย');
  }

  // ===== WIN/LOSE HANDLING =====

  handleWin() {
    this.isLocked = true;
    this.telemetry.t_end = Date.now();

    this.sound.play('success');
    this.showMessage('เยี่ยมมาก!');

    console.log('[HandleWin] showProbeImmediately:', this.currentLevelConfig.showProbeImmediately);
    
    // Show memory probe
    if (this.currentLevelConfig.showProbeImmediately && (this.currentLevelConfig.probeCount || 0) > 0) {
      console.log('[HandleWin] Starting memory probe in 1 second...');
      this.time.delayedCall(1000, () => {
        console.log('[HandleWin] Calling showMemoryProbe()');
        this.showMemoryProbe();
      });
    } else {
      console.log('[HandleWin] Ending game immediately');
      this.endGame();
    }
  }

  handleTimeout() {
    this.isLocked = true;
    this.telemetry.t_end = Date.now();

    if (this.timerEvent) this.timerEvent.remove();
    if (this.customTimerBar) this.customTimerBar.setVisible(false);

    this.showMessage('หมดเวลา!');
    this.sound.play('level-fail');

    this.time.delayedCall(2000, () => {
      this.endGame(false);
    });
  }

  // ===== MEMORY PROBE =====

  showMemoryProbe() {
    console.log('[ShowMemoryProbe] Starting memory probe...');
    const level = this.currentLevelConfig.level;
    
    // Determine number of questions based on difficulty
    // Use probeCount from level config if available, otherwise calculate based on level
    let numQuestions = this.currentLevelConfig.probeCount || 1;
    if (!this.currentLevelConfig.probeCount) {
      if (level <= 5) {
        numQuestions = 1;
      } else if (level <= 10) {
        numQuestions = 2;
      } else {
        numQuestions = 3;
      }
    }
    
    console.log('[ShowMemoryProbe] Number of questions:', numQuestions);

    // Start memory probe sequence
    this.currentProbeIndex = 0;
    this.totalProbes = numQuestions;
    this.probeQuestions = [];
    this.probeCorrectCount = 0;
    this.isProbePhase = true;

    // Generate questions from numbered tiles only
    const allPositions: {x: number, y: number}[] = [];
    this.tiles.forEach(tile => {
      if (tile.hasNumber) {
        allPositions.push({...tile.position});
      }
    });
    Phaser.Utils.Array.Shuffle(allPositions);

    // Select random positions for questions
    for (let i = 0; i < numQuestions && i < allPositions.length; i++) {
      this.probeQuestions.push(allPositions[i]);
    }
    
    console.log('[ShowMemoryProbe] Probe questions:', this.probeQuestions);

    // Ensure tiles are on top and cups stop capturing input
    this.bringTilesToFrontForProbe();
    // Hide cups to make tiles accessible
    this.hideCupsForProbe();

    this.showProbeQuestion();
  }

  bringTilesToFrontForProbe() {
    // Raise tiles above UI/cups so pointer events reach them
    this.tiles.forEach(tile => {
      tile.rectangle.setDepth(180);
      if (tile.numberText) {
        tile.numberText.setDepth(181);
      }
    });
  }

  hideCupsForProbe() {
    // Fade out all cups with smooth animation
    this.cups.forEach(cup => {
      // Disable interaction immediately to prevent blocking tile clicks
      cup.container.disableInteractive();
      this.tweens.add({
        targets: cup.container,
        alpha: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => {
          cup.container.setVisible(false);
          cup.container.disableInteractive();
        }
      });
    });
  }

  showCupsForGame() {
    // Fade cups back in (if needed after probe)
    this.cups.forEach(cup => {
      cup.container.setVisible(true);
      cup.container.setAlpha(0);
      cup.container.setInteractive({ useHandCursor: true });

      this.tweens.add({
        targets: cup.container,
        alpha: 1,
        duration: 400,
        ease: 'Quad.easeOut'
      });
    });
  }

  showProbeQuestion() {
    console.log('[ShowProbeQuestion] Question index:', this.currentProbeIndex, 'of', this.totalProbes);
    
    if (this.currentProbeIndex >= this.totalProbes) {
      console.log('[ShowProbeQuestion] All questions done, ending game');
      this.endGame(true);
      return;
    }

    const question = this.probeQuestions[this.currentProbeIndex];

    // Find tile at this position
    const questionTile = this.tiles.find(t => t.position.x === question.x && t.position.y === question.y);
    
    if (!questionTile) {
      console.error('[ShowProbeQuestion] No tile found at position:', question);
      this.endGame(true);
      return;
    }

    // Determine question type based on tile
    let questionText: string;
    let correctAnswer: any;
    
    if (!questionTile.hasNumber) {
      console.warn('[ShowProbeQuestion] Non-numbered tile selected, skipping:', question);
      this.currentProbeIndex++;
      this.showProbeQuestion();
      return;
    }

    // Numbered cell question
    correctAnswer = this.telemetry.reveal.elements[`${question.x},${question.y}`];
    questionText = `เลขที่ ${correctAnswer} อยู่ที่ช่องไหน?`;
    console.log('[ShowProbeQuestion] Number question:', question, 'Answer:', correctAnswer);

    // Create elegant probe UI panel
    this.createProbeUI(
      `คำถามที่ ${this.currentProbeIndex + 1} / ${this.totalProbes}`,
      questionText,
      `แตะช่อง!`
    );

    // Enable interactivity on tiles with visual enhancements
    this.enableTileInteraction();

    console.log('[ShowProbeQuestion] Tiles enabled for interaction');

    // Record probe start time
    const probeRecord: ProbeRecord = {
      cell: question,
      probeTime: Date.now(),
      answerTime: 0,
      correct: false,
      correctAnswer
    };
    this.telemetry.probes.push(probeRecord);
  }

  createProbeUI(title: string, subtitle: string, instruction: string) {
    const { width, height } = this.scale;

    // Create probe UI container with lower depth to not block tile clicks
    this.probeUIContainer = this.add.container(width / 2, height * 0.22).setDepth(250);

    // Semi-transparent background panel
    this.probeUIGraphics = this.add.graphics();
    this.probeUIGraphics.fillStyle(0xFFFFFF, 0.95);
    
    // Calculate panel dimensions
    const panelW = Math.min(width * 0.7, 350);
    const panelH = 160;
    
    // Draw rounded panel
    this.probeUIGraphics.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 20);
    this.probeUIGraphics.lineStyle(3, 0x4A90E2, 1);
    this.probeUIGraphics.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 20);
    this.probeUIGraphics.setDepth(249);
    this.probeUIContainer.add(this.probeUIGraphics);

    // Title text (smaller, cleaner)
    const titleText = this.add.text(0, -50, title, {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '18px',
      color: '#4A90E2',
      fontStyle: 'bold',
      align: 'center'
    })
      .setPadding(10, 8, 10, 8)
      .setOrigin(0.5);
    this.probeUIContainer.add(titleText);

    // Subtitle text (number to find)
    const subtitleText = this.add.text(0, -10, subtitle, {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '32px',
      color: '#2C3E50',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: panelW - 40 }
    })
      .setPadding(10, 8, 10, 8)
      .setOrigin(0.5);
    this.probeUIContainer.add(subtitleText);

    // Instruction text
    const instructionText = this.add.text(0, 35, instruction, {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '22px',
      color: '#666666',
      align: 'center',
      wordWrap: { width: panelW - 40 }
    })
      .setPadding(10, 8, 10, 8)
      .setOrigin(0.5);
    this.probeUIContainer.add(instructionText);

    // Entrance animation
    this.probeUIContainer.setScale(0.9);
    this.probeUIContainer.setAlpha(0);
    
    this.tweens.add({
      targets: this.probeUIContainer,
      scale: 1,
      alpha: 1,
      duration: 400,
      ease: 'Back.out'
    });
  }

  hideProbeUI() {
    if (this.probeUIContainer) {
      this.tweens.add({
        targets: this.probeUIContainer,
        alpha: 0,
        scale: 0.9,
        duration: 250,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.probeUIContainer.destroy();
          this.probeUIGraphics.destroy();
        }
      });
    }
  }

  enableTileForProbe(tile: TileData) {
    // Remove any existing listeners to prevent duplicates
    tile.rectangle.off('pointerdown');
    tile.rectangle.setInteractive({ useHandCursor: true });
    
    // Add click handler
    tile.rectangle.on('pointerdown', () => this.handleTileClick(tile));
  }

  enableTileInteraction() {
    // Make ALL tiles interactive for probe (including empty cell)
    this.tiles.forEach(tile => {
      this.enableTileForProbe(tile);
      
      // Add visual pulse effect to indicate interactivity on all tiles
      this.tweens.add({
        targets: tile.rectangle,
        alpha: 0.8,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  handleTileClick(tile: TileData) {
    if (!this.isProbePhase) return;

    const question = this.probeQuestions[this.currentProbeIndex];
    if (!question) {
      console.warn('[HandleTileClick] No active probe question. Ignoring click.');
      return;
    }
    const isEmptyQuestion = !this.telemetry.reveal.elements[`${question.x},${question.y}`];
    const isClickedEmpty = this.emptyCellKeys.has(`${tile.position.x},${tile.position.y}`);
    const isCorrect = isEmptyQuestion
      ? isClickedEmpty
      : tile.position.x === question.x && tile.position.y === question.y;
    
    console.log('[HandleTileClick] Tile:', tile.position, 'Question:', question, 'Correct:', isCorrect);

    // Visual feedback on the tile
    const feedbackColor = isCorrect ? 0x58CC02 : 0xFF4444;
    const strokeColor = isCorrect ? 0x3D9400 : 0xCC0000;
    
    tile.rectangle.setStrokeStyle(6, strokeColor);
    
    this.tweens.add({
      targets: tile.rectangle,
      fillStyle: feedbackColor,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 300,
      ease: 'Back.out'
    });

    // Play sound
    this.sound.play(isCorrect ? 'success' : 'error');

    // Show the number on the tile for feedback
    if (tile.numberText) {
      tile.numberText.setVisible(true);
      tile.numberText.setAlpha(0);
      this.tweens.add({
        targets: tile.numberText,
        alpha: 1,
        duration: 200
      });
    }

    // Record answer
    const probeRecord = this.telemetry.probes[this.telemetry.probes.length - 1];
    probeRecord.answerTime = Date.now();
    probeRecord.correct = isCorrect;
    probeRecord.playerAnswer = isEmptyQuestion ? null : tile.numberValue;

    if (isCorrect) {
      this.probeCorrectCount++;
    }

    // Disable further clicks on this tile
    tile.rectangle.disableInteractive();

    // Stop pulse animations on all tiles
    this.tiles.forEach(t => {
      this.tweens.killTweensOf(t.rectangle);
    });

    // Move to next question after delay
    this.time.delayedCall(1000, () => {
      this.resetTileVisuals();
      this.currentProbeIndex++;
      this.showProbeQuestion();
    });
  }

  resetTileVisuals() {
    // Reset tile visuals before next question
    this.tiles.forEach(tile => {
      // Reset fill color for ALL tiles
      const isTarget = tile.position.x === this.targetCell.x && tile.position.y === this.targetCell.y;
      const originalColor = isTarget ? 0xFFB6C1 : 0xE8E8E8;
      tile.rectangle.setFillStyle(originalColor);
      tile.rectangle.setStrokeStyle(0);
      tile.rectangle.setScale(1);
      
      // Hide number text only for tiles that have it
      if (tile.numberText) {
        tile.numberText.setVisible(false);
        tile.numberText.setAlpha(0);
      }
      
      // Use helper to re-enable with proper hit area and pulse
      this.enableTileForProbe(tile);
      
      // Re-add visual pulse effect
      this.tweens.add({
        targets: tile.rectangle,
        alpha: 0.8,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  // ===== END GAME =====

  endGame(success: boolean = true) {
    if (this.timerEvent) this.timerEvent.remove();
    if (this.customTimerBar) this.customTimerBar.setVisible(false);
    if (this.revealTimerEvent) this.revealTimerEvent.remove();

    // Stop music
    if (this.bgMusic && this.bgMusic.isPlaying) {
      this.bgMusic.pause();
    }

    // Calculate stars
    const stars = this.calculateStars(success);
    const starHint = this.generateStarHint(stars);

    // Save stars to database
    this.saveStars(stars);

    const onGameOver = this.registry.get('onGameOver');
    if (onGameOver) {
      onGameOver({
        telemetry: this.telemetry,
        success,
        level: this.currentLevelConfig.level,
        difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
        stars,
        starHint
      });
    }

    this.sound.play(success ? 'level-pass' : 'level-fail');
  }

  private generateStarHint(stars: number): string | null {
    if (stars >= 3) {
      return 'เยี่ยมมาก! เก่งมาก!';
    }

    if (stars === 2) {
      return 'เคลื่อนเร็วและตอบถูกทั้งหมด';
    }

    if (stars === 1) {
      return 'ตอบคำถามให้ถูกมากขึ้น';
    }

    return null;
  }

  // ===== STAR SYSTEM =====

  calculateStars(success: boolean): number {
    if (!success) return 0;

    const timeUsed = this.telemetry.t_end - this.telemetry.t_start;
    const parTimeMs = this.currentLevelConfig.parTimeSeconds * 1000;
    const timeRatio = timeUsed / parTimeMs;

    // Calculate memory accuracy from probes
    const totalProbes = this.telemetry.probes.length;
    const correctProbes = this.telemetry.probes.filter(p => p.correct).length;
    const accuracy = totalProbes > 0 ? correctProbes / totalProbes : 1;

    console.log('[Stars] Time:', timeUsed, 'Par:', parTimeMs, 'Ratio:', timeRatio.toFixed(2));
    console.log('[Stars] Accuracy:', accuracy.toFixed(2), `(${correctProbes}/${totalProbes})`);

    // Star criteria
    if (timeRatio < 0.8 && accuracy === 1.0) {
      console.log('[Stars] Awarded: 3 stars (Perfect + Speed)');
      return 3;
    } else if (accuracy >= 0.5) {
      console.log('[Stars] Awarded: 2 stars (50%+ Memory)');
      return 2;
    } else {
      console.log('[Stars] Awarded: 1 star (Completion)');
      return 1;
    }
  }

  async saveStars(stars: number) {
    if (stars === 0) return;

    try {
      const userId = this.registry.get('userId');
      if (!userId) {
        console.warn('[Stars] No user ID found, skipping save');
        return;
      }

      const result = await upsertLevelStars(
        userId,
        'game-07-pinkcup',
        this.currentLevelConfig.level,
        stars
      );

      if (result.success) {
        console.log(`[Stars] Saved ${stars} stars for level ${this.currentLevelConfig.level}`);
        if (result.updated) {
          this.game.events.emit('stars-updated', {
            gameId: 'game-07-pinkcup',
            level: this.currentLevelConfig.level,
            stars
          });
        }
      } else {
        console.warn('[Stars] Failed to save stars:', result.error);
      }
    } catch (error) {
      console.error('[Stars] Error saving stars:', error);
    }
  }

  // ===== HELPERS =====

  showMessage(text: string) {
    this.messageText.setText(text);
    this.messageText.setAlpha(1);
    this.messageText.setScale(0.8);

    this.tweens.add({
      targets: this.messageText,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Quad.out'
    });
  }
}
