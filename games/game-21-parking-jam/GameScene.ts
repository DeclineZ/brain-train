import * as Phaser from 'phaser';
import { calculateParkingJamStats } from '@/lib/scoring/parking-jam';
import { calculateParkingJamLevelScore } from '@/lib/scoring/engine/levelScoreMappers';
import { getParkingJamLevel } from './levels';
import { canParkingJamCarExit } from './solver';
import {
  PARKING_JAM_SESSION_MS,
  type ParkingJamCarConfig,
  type ParkingJamCarRuntime,
  type ParkingJamDirection,
  type ParkingJamLevelAttemptStats,
  type ParkingJamLevelConfig,
  type ParkingJamOnGameOverPayload,
} from './types';

type SceneState = 'playing' | 'paused' | 'complete';
type TapZone = ParkingJamDirection | 'center';
type BoardDensityMode = 'normal' | 'compact';
type CarVisualDensity = 'full' | 'medium' | 'compact';

interface CarVisual {
  config: ParkingJamCarConfig;
  runtime: ParkingJamCarRuntime;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  details: Phaser.GameObjects.Graphics;
  directionHint: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

interface UndoSnapshot {
  cars: Record<string, Pick<ParkingJamCarRuntime, 'row' | 'col' | 'removed'>>;
}

interface AdaptiveMetrics {
  mode: BoardDensityMode;
  boardTop: number;
  boardBottomReserve: number;
  boardWidthRatio: number;
  objectiveY: number;
  progressY: number;
  objectiveFontSize: number;
  progressFontSize: number;
  toastYRatio: number;
  timerX: number;
  timerY: number;
  timerRadius: number;
  timerThickness: number;
  timerFontSize: number;
  buttonWidth: number;
  buttonHeight: number;
  buttonFontSize: number;
  buttonGap: number;
  buttonY: number;
  boardBorderWidth: number;
  gridAlpha: number;
  gateMinThickness: number;
  gateMinInset: number;
  openGateAlpha: number;
  blockedGateAlpha: number;
}

interface CarPixelBounds {
  widthCells: number;
  heightCells: number;
  widthPx: number;
  heightPx: number;
  cornerRadius: number;
  labelInsetX: number;
  labelInsetY: number;
}

const COLORS = {
  bg: 0xf3f8fb,
  grid: 0xd9e6ef,
  gridBorder: 0xb7cad8,
  gateOpen: 0x7dd3fc,
  gateBlocked: 0xfb7185,
  textMain: '#0f172a',
  textMuted: '#475569',
  buttonBg: 0xffffff,
  buttonBorder: 0xb9cad6,
  buttonDisabled: 0xe2e8f0,
  buttonText: '#0f172a',
  success: 0x16a34a,
  warning: 0xef4444,
};

const SOUND_KEYS = {
  move: 'parking-jam-move',
  blocked: 'parking-jam-blocked',
  exit: 'parking-jam-exit',
  levelPass: 'parking-jam-level-pass',
  levelFail: 'parking-jam-level-fail',
  bgm: 'parking-jam-bgm',
} as const;

const SOUND_PATHS = {
  move: '/assets/sounds/parking-jam/move.mp3',
  blocked: '/assets/sounds/parking-jam/blocked.mp3',
  exit: '/assets/sounds/parking-jam/exit.mp3',
  levelPass: '/assets/sounds/global/level-pass.mp3',
  levelFail: '/assets/sounds/global/level-fail.mp3',
  bgm: '/assets/sounds/parking-jam/bg-music.mp3',
} as const;

export class ParkingJamGameScene extends Phaser.Scene {
  private level!: ParkingJamLevelConfig;
  private levelIndex = 1;
  private sceneState: SceneState = 'playing';

  private gridOriginX = 0;
  private gridOriginY = 0;
  private cellSize = 0;

  private levelGraphics!: Phaser.GameObjects.Graphics;
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private selectionFeedbackGraphics!: Phaser.GameObjects.Graphics;
  private timerDial!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private noArrowGuideOverlay?: Phaser.GameObjects.Container;

  private controls: Record<string, Phaser.GameObjects.Container> = {};

  private cars = new Map<string, CarVisual>();
  private undoStack: UndoSnapshot[] = [];
  private selectedCarId?: string;

  private levelStartMs = 0;
  private remainingMs = PARKING_JAM_SESSION_MS;
  private effectiveLimitMs = PARKING_JAM_SESSION_MS;
  private reduceMotion = false;

  private moveCount = 0;
  private slideCellDistanceTotal = 0;
  private invalidMoveCount = 0;
  private blockedExitAttemptCount = 0;
  private undoCount = 0;
  private hintUsedCount = 0;
  private collisionCount = 0;
  private restartCount = 0;
  private distinctCarsMoved = new Set<string>();
  private carMoveHistogram: Record<string, number> = {};
  private repeatedErrorCount = 0;
  private idleTimeMs = 0;
  private firstActionAtMs = 0;
  private lastInputAtMs = 0;
  private repeatedErrorMap = new Map<string, number>();

  private moveSfx?: Phaser.Sound.BaseSound;
  private blockedSfx?: Phaser.Sound.BaseSound;
  private exitSfx?: Phaser.Sound.BaseSound;
  private levelPassSfx?: Phaser.Sound.BaseSound;
  private levelFailSfx?: Phaser.Sound.BaseSound;
  private bgMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: 'ParkingJamGameScene' });
  }

  init(data: { level?: number }) {
    const regLevel = this.registry.get('level');
    this.levelIndex = data.level || regLevel || 1;
    this.level = getParkingJamLevel(this.levelIndex);
  }

  preload() {
    if (!this.cache.audio.exists(SOUND_KEYS.move)) {
      this.load.audio(SOUND_KEYS.move, SOUND_PATHS.move);
    }
    if (!this.cache.audio.exists(SOUND_KEYS.blocked)) {
      this.load.audio(SOUND_KEYS.blocked, SOUND_PATHS.blocked);
    }
    if (!this.cache.audio.exists(SOUND_KEYS.exit)) {
      this.load.audio(SOUND_KEYS.exit, SOUND_PATHS.exit);
    }
    if (!this.cache.audio.exists(SOUND_KEYS.levelPass)) {
      this.load.audio(SOUND_KEYS.levelPass, SOUND_PATHS.levelPass);
    }
    if (!this.cache.audio.exists(SOUND_KEYS.levelFail)) {
      this.load.audio(SOUND_KEYS.levelFail, SOUND_PATHS.levelFail);
    }
    if (!this.cache.audio.exists(SOUND_KEYS.bgm)) {
      this.load.audio(SOUND_KEYS.bgm, SOUND_PATHS.bgm);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.reduceMotion = this.readReduceMotion();
    this.setupAudio();

    this.resetTelemetry();
    this.effectiveLimitMs = Math.min(PARKING_JAM_SESSION_MS, this.level.timeLimitMs ?? PARKING_JAM_SESSION_MS);
    this.remainingMs = this.effectiveLimitMs;

    this.levelGraphics = this.add.graphics();
    this.selectionGraphics = this.add.graphics().setDepth(26);
    this.selectionFeedbackGraphics = this.add.graphics().setDepth(27);

    this.createHud();
    this.createControls();
    this.createCars();
    this.layoutScene();

    this.levelStartMs = Date.now();

    this.input.on('pointerdown', this.onScenePointerDown, this);
    this.scale.on('resize', this.handleResize, this);

    this.maybeShowNoArrowGuide();
    this.toast('เริ่มด่านนี้เลย!', false);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.onScenePointerDown, this);
      this.scale.off('resize', this.handleResize, this);
      this.cleanupAudio();
    });
  }

  update(_: number, delta: number) {
    if (this.sceneState !== 'playing') return;

    this.remainingMs = Math.max(0, this.remainingMs - delta);
    this.drawTimerDial();

    if (this.remainingMs <= 0) {
      this.endGame(false);
    }
  }

  private resetTelemetry() {
    this.moveCount = 0;
    this.slideCellDistanceTotal = 0;
    this.invalidMoveCount = 0;
    this.blockedExitAttemptCount = 0;
    this.undoCount = 0;
    this.hintUsedCount = 0;
    this.collisionCount = 0;
    this.restartCount = 0;
    this.distinctCarsMoved.clear();
    this.carMoveHistogram = {};
    this.repeatedErrorCount = 0;
    this.idleTimeMs = 0;
    this.firstActionAtMs = 0;
    this.lastInputAtMs = 0;
    this.repeatedErrorMap.clear();
    this.undoStack = [];
  }

  private createHud() {
    this.timerDial = this.add.graphics().setDepth(30);
    this.timerText = this.add.text(42, 42, '90', {
      fontSize: '18px',
      color: '#0f172a',
      fontStyle: '700',
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      padding: { left: 4, right: 4, top: 2, bottom: 2 },
    }).setOrigin(0.5).setDepth(31);

    const objectiveLabel = 'เคลียร์รถทั้งหมดให้ออกจากลาน';

    this.objectiveText = this.add.text(0, 0, objectiveLabel, {
      fontSize: '24px',
      color: COLORS.textMain,
      fontStyle: '700',
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      align: 'center',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
    }).setOrigin(0.5, 0).setDepth(30);

    this.progressText = this.add.text(0, 0, '', {
      fontSize: '18px',
      color: COLORS.textMuted,
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      fontStyle: '700',
      padding: { left: 8, right: 8, top: 3, bottom: 3 },
    }).setOrigin(0.5, 0).setDepth(30);

    this.toastText = this.add.text(0, 0, '', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#0f172a',
      padding: { left: 12, right: 12, top: 8, bottom: 8 },
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      fontStyle: '700',
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    this.updateProgressText();
    this.drawTimerDial();
  }

  private createControls() {
    this.controls.undo = this.createControlButton('ย้อนกลับ', () => this.handleUndo());
    this.controls.reset = this.createControlButton('รีเซ็ต', () => this.handleReset());
  }

  private createControlButton(label: string, onClick: () => void) {
    const container = this.add.container(0, 0).setDepth(40);
    const bg = this.add.rectangle(0, 0, 120, 56, COLORS.buttonBg, 1)
      .setStrokeStyle(2, COLORS.buttonBorder, 1)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontSize: '22px',
      color: COLORS.buttonText,
      fontStyle: '700',
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      padding: { left: 4, right: 4, top: 2, bottom: 2 },
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      if (this.sceneState !== 'playing') return;
      onClick();
    });

    bg.on('pointerover', () => {
      if (this.sceneState !== 'playing') return;
      container.setScale(1.03);
    });

    bg.on('pointerout', () => {
      container.setScale(1);
    });

    container.add([bg, text]);
    return container;
  }

  private createCars() {
    this.cars.forEach((car) => car.container.destroy());
    this.cars.clear();

    this.level.cars.forEach((config) => {
      const runtime: ParkingJamCarRuntime = {
        id: config.id,
        row: config.row,
        col: config.col,
        removed: false,
      };

      const container = this.add.container(0, 0).setDepth(20);
      const bg = this.add.graphics();
      const details = this.add.graphics();
      const directionHint = this.add.graphics();
      const label = this.add.text(0, 0, config.id, {
        fontSize: '16px',
        color: '#0f172a',
        fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
        fontStyle: '700',
        padding: { left: 2, right: 2, top: 1, bottom: 1 },
      }).setOrigin(0.5);

      container.add([bg, details, directionHint, label]);
      this.cars.set(config.id, { config, runtime, container, bg, details, directionHint, label });
      this.carMoveHistogram[config.id] = 0;
    });
  }

  private onScenePointerDown(pointer: Phaser.Input.Pointer) {
    if (this.sceneState !== 'playing') return;
    if (this.isPointerOnControl(pointer)) return;

    const car = this.getCarAtPointer(pointer);
    if (!car) {
      this.clearSelectedCar();
      return;
    }

    if (this.selectedCarId === car.config.id && this.isTwoWayCar(car)) {
      this.handleSelectedCarTap(car, pointer);
      return;
    }

    this.handleCarTap(car.config.id, pointer);
  }

  private isPointerOnControl(pointer: Phaser.Input.Pointer) {
    return Object.values(this.controls).some((control) => {
      const bounds = control.getBounds();
      return bounds.contains(pointer.x, pointer.y);
    });
  }

  private getCarAtPointer(pointer: Phaser.Input.Pointer): CarVisual | null {
    const candidates: Array<{ car: CarVisual; area: number }> = [];
    this.cars.forEach((car) => {
      if (car.runtime.removed || !car.container.visible) return;

      const { widthPx, heightPx } = this.getCarPixelBounds(car.config);
      const left = car.container.x - widthPx / 2;
      const top = car.container.y - heightPx / 2;
      const hit = new Phaser.Geom.Rectangle(left, top, widthPx, heightPx);
      if (!hit.contains(pointer.x, pointer.y)) return;
      candidates.push({ car, area: widthPx * heightPx });
    });

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.area - b.area);
    return candidates[0].car;
  }

  private getBoardDensityMode(): BoardDensityMode {
    const denseByGrid = this.level.gridSize >= 6 && this.level.cars.length >= 8;
    if (denseByGrid || this.level.difficulty >= 7) {
      return 'compact';
    }
    return 'normal';
  }

  private getCarVisualDensity(): CarVisualDensity {
    const mode = this.getBoardDensityMode();
    if (this.cellSize <= 52) return 'compact';
    if (this.cellSize <= 66) return mode === 'compact' ? 'compact' : 'medium';
    if (mode === 'compact') return 'medium';
    return 'full';
  }

  private getAdaptiveMetrics(): AdaptiveMetrics {
    const mode = this.getBoardDensityMode();
    const compact = mode === 'compact';

    return {
      mode,
      boardTop: compact ? 118 : 150,
      boardBottomReserve: compact ? 110 : 140,
      boardWidthRatio: compact ? 0.92 : 0.88,
      objectiveY: compact ? 62 : 84,
      progressY: compact ? 94 : 122,
      objectiveFontSize: compact ? 20 : 24,
      progressFontSize: compact ? 16 : 18,
      toastYRatio: compact ? 0.2 : 0.26,
      timerX: this.scale.width - (compact ? 36 : 44),
      timerY: compact ? 36 : 44,
      timerRadius: compact ? 18 : 21,
      timerThickness: compact ? 5 : 6,
      timerFontSize: compact ? 16 : 18,
      buttonWidth: compact ? 126 : 144,
      buttonHeight: compact ? 52 : 56,
      buttonFontSize: compact ? 20 : 22,
      buttonGap: compact ? 14 : 20,
      buttonY: this.scale.height - (compact ? 42 : 48),
      boardBorderWidth: compact ? 3 : 4,
      gridAlpha: compact ? 0.68 : 1,
      gateMinThickness: compact ? 7 : 8,
      gateMinInset: compact ? 5 : 7,
      openGateAlpha: compact ? 0.56 : 0.65,
      blockedGateAlpha: compact ? 0.78 : 0.85,
    };
  }

  private getCarPixelBounds(config: ParkingJamCarConfig): CarPixelBounds {
    const density = this.getCarVisualDensity();
    const widthCells = config.axis === 'h' ? config.length : 1;
    const heightCells = config.axis === 'v' ? config.length : 1;
    const inset = density === 'compact'
      ? Math.max(8, Math.round(this.cellSize * 0.18))
      : density === 'medium'
        ? Math.max(8, Math.round(this.cellSize * 0.16))
        : 10;
    const widthPx = Math.max(18, widthCells * this.cellSize - inset);
    const heightPx = Math.max(18, heightCells * this.cellSize - inset);

    return {
      widthCells,
      heightCells,
      widthPx,
      heightPx,
      cornerRadius: density === 'compact' ? 12 : density === 'medium' ? 13 : 14,
      labelInsetX: density === 'compact' ? 8 : density === 'medium' ? 10 : 12,
      labelInsetY: density === 'compact' ? 7 : density === 'medium' ? 9 : 10,
    };
  }

  private applyControlButtonLayout(
    button: Phaser.GameObjects.Container,
    width: number,
    height: number,
    fontSize: number
  ) {
    const bg = button.list[0] as Phaser.GameObjects.Rectangle | undefined;
    const text = button.list[1] as Phaser.GameObjects.Text | undefined;
    if (bg) {
      bg.setSize(width, height);
      bg.setDisplaySize(width, height);
    }
    if (text) {
      text.setFontSize(fontSize);
    }
  }

  private layoutScene() {
    const { width, height } = this.scale;
    const metrics = this.getAdaptiveMetrics();
    const boardTop = metrics.boardTop;
    const boardBottomLimit = height - metrics.boardBottomReserve;

    this.cellSize = Math.floor(
      Math.min(
        (width * metrics.boardWidthRatio) / this.level.gridSize,
        Math.max(40, (boardBottomLimit - boardTop) / this.level.gridSize)
      )
    );

    const boardSize = this.cellSize * this.level.gridSize;
    this.gridOriginX = Math.floor((width - boardSize) / 2);
    this.gridOriginY = Math.floor((boardTop + boardBottomLimit - boardSize) / 2);

    this.objectiveText.setPosition(width / 2, metrics.objectiveY).setFontSize(metrics.objectiveFontSize);
    this.progressText.setPosition(width / 2, metrics.progressY).setFontSize(metrics.progressFontSize);
    this.toastText.setPosition(width / 2, height * metrics.toastYRatio);

    const buttons = [this.controls.undo, this.controls.reset];
    const gap = metrics.buttonGap;
    const buttonWidth = metrics.buttonWidth;
    const totalWidth = buttons.length * buttonWidth + (buttons.length - 1) * gap;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;
    const y = metrics.buttonY;
    buttons.forEach((button, index) => {
      this.applyControlButtonLayout(button, metrics.buttonWidth, metrics.buttonHeight, metrics.buttonFontSize);
      button.setPosition(startX + index * (buttonWidth + gap), y);
    });

    this.drawBoard();
    this.positionCars();
    this.refreshSelectionOverlay();
    this.drawTimerDial();
  }

  private drawBoard() {
    this.levelGraphics.clear();
    const metrics = this.getAdaptiveMetrics();

    const size = this.level.gridSize;
    const boardSize = this.cellSize * size;

    this.levelGraphics.fillStyle(0xffffff, 1);
    this.levelGraphics.fillRoundedRect(this.gridOriginX - 12, this.gridOriginY - 12, boardSize + 24, boardSize + 24, 20);
    this.levelGraphics.lineStyle(metrics.boardBorderWidth, COLORS.gridBorder, 1);
    this.levelGraphics.strokeRoundedRect(this.gridOriginX - 12, this.gridOriginY - 12, boardSize + 24, boardSize + 24, 20);

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        this.levelGraphics.fillStyle(0xf8fbfd, 1);
        this.levelGraphics.fillRect(
          this.gridOriginX + col * this.cellSize,
          this.gridOriginY + row * this.cellSize,
          this.cellSize,
          this.cellSize
        );

        this.levelGraphics.lineStyle(1, COLORS.grid, metrics.gridAlpha);
        this.levelGraphics.strokeRect(
          this.gridOriginX + col * this.cellSize,
          this.gridOriginY + row * this.cellSize,
          this.cellSize,
          this.cellSize
        );
      }
    }

    for (let index = 0; index < size; index += 1) {
      this.drawGate('left', index);
      this.drawGate('right', index);
      this.drawGate('top', index);
      this.drawGate('bottom', index);
    }
  }

  private drawGate(edge: 'top' | 'right' | 'bottom' | 'left', index: number) {
    const metrics = this.getAdaptiveMetrics();
    const blocked = this.level.blockedGateSegments.some((segment) => segment.edge === edge && segment.index === index);
    const color = blocked ? COLORS.gateBlocked : COLORS.gateOpen;
    const boardSize = this.cellSize * this.level.gridSize;
    const gateThickness = Math.max(metrics.gateMinThickness, Math.round(this.cellSize * 0.14));
    const gateInset = Math.max(metrics.gateMinInset, Math.round(this.cellSize * 0.13));
    const gateLength = this.cellSize - gateInset * 2;
    const gateRadius = Math.max(4, Math.round(gateThickness * 0.55));

    this.levelGraphics.fillStyle(color, blocked ? metrics.blockedGateAlpha : metrics.openGateAlpha);

    if (edge === 'left') {
      const x = this.gridOriginX - gateThickness - 3;
      const y = this.gridOriginY + index * this.cellSize + gateInset;
      this.levelGraphics.fillRoundedRect(x, y, gateThickness, gateLength, gateRadius);
      this.levelGraphics.fillStyle(0xffffff, blocked ? 0.22 : 0.34);
      this.levelGraphics.fillRoundedRect(x + Math.max(1, Math.floor(gateThickness * 0.28)), y + 3, Math.max(2, Math.floor(gateThickness * 0.32)), Math.max(6, gateLength - 6), 2);
    } else if (edge === 'right') {
      const x = this.gridOriginX + boardSize + 3;
      const y = this.gridOriginY + index * this.cellSize + gateInset;
      this.levelGraphics.fillRoundedRect(x, y, gateThickness, gateLength, gateRadius);
      this.levelGraphics.fillStyle(0xffffff, blocked ? 0.22 : 0.34);
      this.levelGraphics.fillRoundedRect(x + Math.max(1, Math.floor(gateThickness * 0.28)), y + 3, Math.max(2, Math.floor(gateThickness * 0.32)), Math.max(6, gateLength - 6), 2);
    } else if (edge === 'top') {
      const x = this.gridOriginX + index * this.cellSize + gateInset;
      const y = this.gridOriginY - gateThickness - 3;
      this.levelGraphics.fillRoundedRect(x, y, gateLength, gateThickness, gateRadius);
      this.levelGraphics.fillStyle(0xffffff, blocked ? 0.22 : 0.34);
      this.levelGraphics.fillRoundedRect(x + 3, y + Math.max(1, Math.floor(gateThickness * 0.28)), Math.max(6, gateLength - 6), Math.max(2, Math.floor(gateThickness * 0.32)), 2);
    } else {
      const x = this.gridOriginX + index * this.cellSize + gateInset;
      const y = this.gridOriginY + boardSize + 3;
      this.levelGraphics.fillRoundedRect(x, y, gateLength, gateThickness, gateRadius);
      this.levelGraphics.fillStyle(0xffffff, blocked ? 0.22 : 0.34);
      this.levelGraphics.fillRoundedRect(x + 3, y + Math.max(1, Math.floor(gateThickness * 0.28)), Math.max(6, gateLength - 6), Math.max(2, Math.floor(gateThickness * 0.32)), 2);
    }

    if (!blocked) return;

    const lockHalf = Math.max(4, Math.round(gateThickness * 0.58));
    this.levelGraphics.lineStyle(2, 0xffffff, 0.9);
    if (edge === 'left' || edge === 'right') {
      const centerX = edge === 'left'
        ? this.gridOriginX - gateThickness * 0.5 - 3
        : this.gridOriginX + boardSize + gateThickness * 0.5 + 3;
      const centerY = this.gridOriginY + index * this.cellSize + this.cellSize * 0.5;
      this.levelGraphics.beginPath();
      this.levelGraphics.moveTo(centerX - lockHalf, centerY - lockHalf);
      this.levelGraphics.lineTo(centerX + lockHalf, centerY + lockHalf);
      this.levelGraphics.moveTo(centerX + lockHalf, centerY - lockHalf);
      this.levelGraphics.lineTo(centerX - lockHalf, centerY + lockHalf);
      this.levelGraphics.strokePath();
      return;
    }

    const centerX = this.gridOriginX + index * this.cellSize + this.cellSize * 0.5;
    const centerY = edge === 'top'
      ? this.gridOriginY - gateThickness * 0.5 - 3
      : this.gridOriginY + boardSize + gateThickness * 0.5 + 3;
    this.levelGraphics.beginPath();
    this.levelGraphics.moveTo(centerX - lockHalf, centerY - lockHalf);
    this.levelGraphics.lineTo(centerX + lockHalf, centerY + lockHalf);
    this.levelGraphics.moveTo(centerX + lockHalf, centerY - lockHalf);
    this.levelGraphics.lineTo(centerX - lockHalf, centerY + lockHalf);
    this.levelGraphics.strokePath();
  }

  private positionCars() {
    this.cars.forEach((car) => this.renderCar(car));
  }

  private renderCar(car: CarVisual) {
    const { config, runtime } = car;

    if (runtime.removed) {
      car.container.setVisible(false);
      return;
    }

    const density = this.getCarVisualDensity();
    const {
      widthCells,
      heightCells,
      widthPx,
      heightPx,
      cornerRadius,
      labelInsetX,
      labelInsetY,
    } = this.getCarPixelBounds(config);

    car.bg.clear();
    car.bg.fillStyle(config.color, 1);
    car.bg.fillRoundedRect(-widthPx / 2, -heightPx / 2, widthPx, heightPx, cornerRadius);
    car.bg.lineStyle(density === 'compact' ? 1.5 : 2, 0x0f172a, density === 'compact' ? 0.22 : 0.28);
    car.bg.strokeRoundedRect(-widthPx / 2, -heightPx / 2, widthPx, heightPx, cornerRadius);

    this.drawVehicleDetails(car, widthPx, heightPx);
    if (this.shouldShowDirectionHints()) {
      this.drawDirectionHints(car, widthPx, heightPx);
    } else {
      car.directionHint.clear();
    }

    car.label
      .setPosition(-widthPx / 2 + labelInsetX, -heightPx / 2 + labelInsetY)
      .setOrigin(0, 0)
      .setFontSize(density === 'compact' ? 13 : density === 'medium' ? 14 : 16);

    const centerX = Math.round(this.gridOriginX + (runtime.col + widthCells / 2) * this.cellSize);
    const centerY = Math.round(this.gridOriginY + (runtime.row + heightCells / 2) * this.cellSize);

    car.container.setPosition(centerX, centerY).setVisible(true).setScale(1);
    if (this.selectedCarId === car.config.id) {
      this.renderSelectedOverlay(car);
    }
  }

  private drawVehicleDetails(car: CarVisual, widthPx: number, heightPx: number) {
    const g = car.details;
    const { carType, axis } = car.config;
    const isTwoWay = this.isTwoWayCar(car);
    const density = this.getCarVisualDensity();
    g.clear();
    const defaultForward: ParkingJamDirection = axis === 'h' ? 'right' : 'down';
    let forwardDirection = (car.config.allowedExitDirections[0] ?? defaultForward) as ParkingJamDirection;
    if (axis === 'h' && (forwardDirection === 'up' || forwardDirection === 'down')) {
      forwardDirection = defaultForward;
    }
    if (axis === 'v' && (forwardDirection === 'left' || forwardDirection === 'right')) {
      forwardDirection = defaultForward;
    }

    const bodyInset = carType === 'bus' || carType === 'truck' ? 4 : 6;
    const roofInset = (() => {
      switch (carType) {
        case 'bus':
          return { x: 8, y: 8, alpha: 0.22 };
        case 'van':
          return { x: 10, y: 9, alpha: 0.26 };
        case 'truck':
          return { x: 12, y: 10, alpha: 0.24 };
        case 'pickup':
          return { x: 13, y: 10, alpha: 0.22 };
        case 'suv':
          return { x: 12, y: 10, alpha: 0.24 };
        case 'taxi':
          return { x: 13, y: 11, alpha: 0.28 };
        default:
          return { x: 14, y: 11, alpha: 0.3 };
      }
    })();

    const roofWidth = Math.max(10, widthPx - roofInset.x * 2);
    const roofHeight = Math.max(10, heightPx - roofInset.y * 2);
    const roofShiftPx = axis === 'h'
      ? Math.max(6, Math.round(widthPx * 0.2))
      : Math.max(6, Math.round(heightPx * 0.2));

    let roofX = -widthPx / 2 + roofInset.x;
    let roofY = -heightPx / 2 + roofInset.y;
    if (!isTwoWay) {
      if (axis === 'h') {
        roofX += forwardDirection === 'right' ? -roofShiftPx : roofShiftPx;
        roofX = Phaser.Math.Clamp(roofX, -widthPx / 2 + 2, widthPx / 2 - roofWidth - 2);
      } else {
        roofY += forwardDirection === 'down' ? -roofShiftPx : roofShiftPx;
        roofY = Phaser.Math.Clamp(roofY, -heightPx / 2 + 2, heightPx / 2 - roofHeight - 2);
      }
    }

    if (density !== 'compact') {
      g.fillStyle(0xffffff, density === 'medium' ? Math.min(roofInset.alpha, 0.24) : roofInset.alpha);
      g.fillRoundedRect(roofX, roofY, roofWidth, roofHeight, density === 'medium' ? 7 : 8);
    } else {
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(-widthPx * 0.18, -heightPx * 0.18, widthPx * 0.36, heightPx * 0.36, 6);
    }

    const lightThickness = Math.max(4, Math.floor(Math.min(widthPx, heightPx) * 0.12));
    if (isTwoWay) {
      g.fillStyle(0xe0f2fe, 0.82);
      if (axis === 'h') {
        const leftX = -widthPx / 2 + 1;
        const rightX = widthPx / 2 - lightThickness - 1;
        g.fillRoundedRect(leftX, -heightPx * 0.26, lightThickness, heightPx * 0.22, 3);
        g.fillRoundedRect(leftX, heightPx * 0.04, lightThickness, heightPx * 0.22, 3);
        g.fillRoundedRect(rightX, -heightPx * 0.26, lightThickness, heightPx * 0.22, 3);
        g.fillRoundedRect(rightX, heightPx * 0.04, lightThickness, heightPx * 0.22, 3);
        if (density !== 'compact') {
          g.lineStyle(density === 'medium' ? 1.5 : 2, 0xffffff, 0.55);
          g.beginPath();
          g.moveTo(0, -heightPx * 0.28);
          g.lineTo(0, heightPx * 0.28);
          g.strokePath();
        }
      } else {
        const topY = -heightPx / 2 + 1;
        const bottomY = heightPx / 2 - lightThickness - 1;
        g.fillRoundedRect(-widthPx * 0.26, topY, widthPx * 0.22, lightThickness, 3);
        g.fillRoundedRect(widthPx * 0.04, topY, widthPx * 0.22, lightThickness, 3);
        g.fillRoundedRect(-widthPx * 0.26, bottomY, widthPx * 0.22, lightThickness, 3);
        g.fillRoundedRect(widthPx * 0.04, bottomY, widthPx * 0.22, lightThickness, 3);
        if (density !== 'compact') {
          g.lineStyle(density === 'medium' ? 1.5 : 2, 0xffffff, 0.55);
          g.beginPath();
          g.moveTo(-widthPx * 0.28, 0);
          g.lineTo(widthPx * 0.28, 0);
          g.strokePath();
        }
      }
    } else if (axis === 'h') {
      const frontOnRight = forwardDirection === 'right';
      const frontX = frontOnRight ? widthPx / 2 - lightThickness - 1 : -widthPx / 2 + 1;
      const rearX = frontOnRight ? -widthPx / 2 + 1 : widthPx / 2 - lightThickness - 1;
      g.fillStyle(0xfef08a, 0.95);
      g.fillRoundedRect(frontX, -heightPx * 0.26, lightThickness, heightPx * 0.22, 3);
      g.fillRoundedRect(frontX, heightPx * 0.04, lightThickness, heightPx * 0.22, 3);
      const whiteCoreW = Math.max(2, lightThickness - 2);
      const whiteCoreH = Math.max(2, Math.floor(heightPx * 0.1));
      const whiteCoreX = frontX + Math.max(0, Math.floor((lightThickness - whiteCoreW) * 0.5));
      g.fillStyle(0xffffff, 0.92);
      g.fillRoundedRect(whiteCoreX, -heightPx * 0.22, whiteCoreW, whiteCoreH, 2);
      g.fillRoundedRect(whiteCoreX, heightPx * 0.08, whiteCoreW, whiteCoreH, 2);
      g.fillStyle(0xfda4af, 0.9);
      g.fillRoundedRect(rearX, -heightPx * 0.26, lightThickness, heightPx * 0.22, 3);
      g.fillRoundedRect(rearX, heightPx * 0.04, lightThickness, heightPx * 0.22, 3);
    } else {
      const frontOnBottom = forwardDirection === 'down';
      const frontY = frontOnBottom ? heightPx / 2 - lightThickness - 1 : -heightPx / 2 + 1;
      const rearY = frontOnBottom ? -heightPx / 2 + 1 : heightPx / 2 - lightThickness - 1;
      g.fillStyle(0xfef08a, 0.95);
      g.fillRoundedRect(-widthPx * 0.26, frontY, widthPx * 0.22, lightThickness, 3);
      g.fillRoundedRect(widthPx * 0.04, frontY, widthPx * 0.22, lightThickness, 3);
      const whiteCoreW = Math.max(2, Math.floor(widthPx * 0.1));
      const whiteCoreH = Math.max(2, lightThickness - 2);
      const leftCoreX = -widthPx * 0.26 + Math.max(0, Math.floor((widthPx * 0.22 - whiteCoreW) * 0.5));
      const rightCoreX = widthPx * 0.04 + Math.max(0, Math.floor((widthPx * 0.22 - whiteCoreW) * 0.5));
      const coreY = frontY + Math.max(0, Math.floor((lightThickness - whiteCoreH) * 0.5));
      g.fillStyle(0xffffff, 0.92);
      g.fillRoundedRect(leftCoreX, coreY, whiteCoreW, whiteCoreH, 2);
      g.fillRoundedRect(rightCoreX, coreY, whiteCoreW, whiteCoreH, 2);
      g.fillStyle(0xfda4af, 0.9);
      g.fillRoundedRect(-widthPx * 0.26, rearY, widthPx * 0.22, lightThickness, 3);
      g.fillRoundedRect(widthPx * 0.04, rearY, widthPx * 0.22, lightThickness, 3);
    }

    g.fillStyle(0xdbeafe, 0.72);
    g.lineStyle(density === 'compact' ? 0.8 : density === 'medium' ? 1 : 1.5, 0xffffff, density === 'compact' ? 0.42 : density === 'medium' ? 0.5 : 0.6);
    if (axis === 'h') {
      const windshieldWidth = density === 'compact'
        ? Math.max(8, Math.round(widthPx * 0.16))
        : Math.max(8, Math.round(roofWidth * 0.2));
      const windshieldHeight = density === 'compact'
        ? Math.max(10, Math.round(heightPx * 0.5))
        : Math.max(8, roofHeight - 6);
      const frontInset = density === 'compact' ? Math.max(5, Math.round(widthPx * 0.05)) : 4;
      const windshieldY = density === 'compact' ? -windshieldHeight / 2 : roofY + 3;

      if (isTwoWay) {
        const leftWindshieldX = density === 'compact'
          ? -widthPx / 2 + frontInset
          : roofX + frontInset;
        const rightWindshieldX = density === 'compact'
          ? widthPx / 2 - windshieldWidth - frontInset
          : roofX + roofWidth - windshieldWidth - frontInset;

        g.fillRoundedRect(leftWindshieldX, windshieldY, windshieldWidth, windshieldHeight, density === 'compact' ? 2 : density === 'medium' ? 2 : 3);
        g.beginPath();
        g.moveTo(leftWindshieldX + windshieldWidth - 1, windshieldY + 1);
        g.lineTo(leftWindshieldX + 1, windshieldY + 4);
        g.strokePath();

        g.fillRoundedRect(rightWindshieldX, windshieldY, windshieldWidth, windshieldHeight, density === 'compact' ? 2 : density === 'medium' ? 2 : 3);
        g.beginPath();
        g.moveTo(rightWindshieldX + 1, windshieldY + 1);
        g.lineTo(rightWindshieldX + windshieldWidth - 1, windshieldY + 4);
        g.strokePath();
      } else {
        const windshieldX = density === 'compact'
          ? forwardDirection === 'right'
            ? widthPx / 2 - windshieldWidth - frontInset
            : -widthPx / 2 + frontInset
          : forwardDirection === 'right'
            ? roofX + roofWidth - windshieldWidth - frontInset
            : roofX + frontInset;
        g.fillRoundedRect(windshieldX, windshieldY, windshieldWidth, windshieldHeight, density === 'compact' ? 2 : density === 'medium' ? 2 : 3);
        g.beginPath();
        if (forwardDirection === 'right') {
          g.moveTo(windshieldX + 1, windshieldY + 1);
          g.lineTo(windshieldX + windshieldWidth - 1, windshieldY + 4);
        } else {
          g.moveTo(windshieldX + windshieldWidth - 1, windshieldY + 1);
          g.lineTo(windshieldX + 1, windshieldY + 4);
        }
        g.strokePath();
      }
    } else {
      const windshieldWidth = density === 'compact'
        ? Math.max(10, Math.round(widthPx * 0.5))
        : Math.max(8, roofWidth - 6);
      const windshieldHeight = density === 'compact'
        ? Math.max(8, Math.round(heightPx * 0.16))
        : Math.max(8, Math.round(roofHeight * 0.2));
      const frontInset = density === 'compact' ? Math.max(5, Math.round(heightPx * 0.05)) : 4;
      const windshieldX = density === 'compact' ? -windshieldWidth / 2 : roofX + 3;

      if (isTwoWay) {
        const topWindshieldY = density === 'compact'
          ? -heightPx / 2 + frontInset
          : roofY + frontInset;
        const bottomWindshieldY = density === 'compact'
          ? heightPx / 2 - windshieldHeight - frontInset
          : roofY + roofHeight - windshieldHeight - frontInset;

        g.fillRoundedRect(windshieldX, topWindshieldY, windshieldWidth, windshieldHeight, density === 'compact' ? 2 : density === 'medium' ? 2 : 3);
        g.beginPath();
        g.moveTo(windshieldX + 1, topWindshieldY + windshieldHeight - 1);
        g.lineTo(windshieldX + 4, topWindshieldY + 1);
        g.strokePath();

        g.fillRoundedRect(windshieldX, bottomWindshieldY, windshieldWidth, windshieldHeight, density === 'compact' ? 2 : density === 'medium' ? 2 : 3);
        g.beginPath();
        g.moveTo(windshieldX + 1, bottomWindshieldY + 1);
        g.lineTo(windshieldX + 4, bottomWindshieldY + windshieldHeight - 1);
        g.strokePath();
      } else {
        const windshieldY = density === 'compact'
          ? forwardDirection === 'down'
            ? heightPx / 2 - windshieldHeight - frontInset
            : -heightPx / 2 + frontInset
          : forwardDirection === 'down'
            ? roofY + roofHeight - windshieldHeight - frontInset
            : roofY + frontInset;
        g.fillRoundedRect(windshieldX, windshieldY, windshieldWidth, windshieldHeight, density === 'compact' ? 2 : density === 'medium' ? 2 : 3);
        g.beginPath();
        if (forwardDirection === 'down') {
          g.moveTo(windshieldX + 1, windshieldY + 1);
          g.lineTo(windshieldX + 4, windshieldY + windshieldHeight - 1);
        } else {
          g.moveTo(windshieldX + 1, windshieldY + windshieldHeight - 1);
          g.lineTo(windshieldX + 4, windshieldY + 1);
        }
        g.strokePath();
      }
    }

    if (density === 'compact') {
      return;
    }

    g.fillStyle(0x0f172a, 0.5);
    const tireSize = Math.max(density === 'medium' ? 4 : 5, Math.floor(Math.min(widthPx, heightPx) * (density === 'medium' ? 0.12 : 0.15)));
    if (axis === 'h') {
      g.fillRoundedRect(-widthPx / 2 + bodyInset, -heightPx / 2 + 1, tireSize, 3, 1);
      g.fillRoundedRect(widthPx / 2 - bodyInset - tireSize, -heightPx / 2 + 1, tireSize, 3, 1);
      g.fillRoundedRect(-widthPx / 2 + bodyInset, heightPx / 2 - 4, tireSize, 3, 1);
      g.fillRoundedRect(widthPx / 2 - bodyInset - tireSize, heightPx / 2 - 4, tireSize, 3, 1);
    } else {
      g.fillRoundedRect(-widthPx / 2 + 1, -heightPx / 2 + bodyInset, 3, tireSize, 1);
      g.fillRoundedRect(widthPx / 2 - 4, -heightPx / 2 + bodyInset, 3, tireSize, 1);
      g.fillRoundedRect(-widthPx / 2 + 1, heightPx / 2 - bodyInset - tireSize, 3, tireSize, 1);
      g.fillRoundedRect(widthPx / 2 - 4, heightPx / 2 - bodyInset - tireSize, 3, tireSize, 1);
    }

    if (density === 'full' && carType === 'pickup') {
      g.lineStyle(2, 0x0f172a, 0.3);
      if (axis === 'h') {
        g.beginPath();
        g.moveTo(widthPx * 0.05, -heightPx * 0.32);
        g.lineTo(widthPx * 0.05, heightPx * 0.32);
        g.strokePath();
      } else {
        g.beginPath();
        g.moveTo(-widthPx * 0.32, heightPx * 0.05);
        g.lineTo(widthPx * 0.32, heightPx * 0.05);
        g.strokePath();
      }
    }

    if (density === 'full' && carType === 'taxi') {
      g.fillStyle(0xfacc15, 0.95);
      if (axis === 'h') {
        g.fillRoundedRect(-8, -heightPx * 0.38, 16, 6, 3);
      } else {
        g.fillRoundedRect(-widthPx * 0.38, -8, 6, 16, 3);
      }
    }
  }

  private drawDirectionHints(car: CarVisual, widthPx: number, heightPx: number) {
    const g = car.directionHint;
    const { axis, allowedExitDirections } = car.config;
    const density = this.getCarVisualDensity();
    g.clear();

    const directions = axis === 'h' ? (['left', 'right'] as const) : (['up', 'down'] as const);
    directions.forEach((direction) => {
      const allowed = allowedExitDirections.includes(direction);
      const color = allowed ? 0x16a34a : 0x94a3b8;
      const alpha = allowed ? 0.95 : 0.5;
      const marker = Math.max(density === 'compact' ? 5 : 6, Math.floor(Math.min(widthPx, heightPx) * (density === 'compact' ? 0.13 : 0.16)));

      g.fillStyle(color, alpha);
      g.lineStyle(density === 'compact' ? 1.5 : 2, 0xffffff, allowed ? 0.9 : 0.55);

      const inset = density === 'compact' ? 6: 8;
      if (direction === 'left') {
        g.beginPath();
        g.moveTo(-widthPx / 2 + inset, 0);
        g.lineTo(-widthPx / 2 + inset + marker * 0.8, -marker * 0.6);
        g.lineTo(-widthPx / 2 + inset + marker * 0.8, marker * 0.6);
        g.closePath();
        g.fillPath();
        g.strokePath();
      } else if (direction === 'right') {
        g.beginPath();
        g.moveTo(widthPx / 2 - inset, 0);
        g.lineTo(widthPx / 2 - inset - marker * 0.8, -marker * 0.6);
        g.lineTo(widthPx / 2 - inset - marker * 0.8, marker * 0.6);
        g.closePath();
        g.fillPath();
        g.strokePath();
      } else if (direction === 'up') {
        g.beginPath();
        g.moveTo(0, -heightPx / 2 + inset);
        g.lineTo(-marker * 0.6, -heightPx / 2 + inset + marker * 0.8);
        g.lineTo(marker * 0.6, -heightPx / 2 + inset + marker * 0.8);
        g.closePath();
        g.fillPath();
        g.strokePath();
      } else {
        g.beginPath();
        g.moveTo(0, heightPx / 2 - inset);
        g.lineTo(-marker * 0.6, heightPx / 2 - inset - marker * 0.8);
        g.lineTo(marker * 0.6, heightPx / 2 - inset - marker * 0.8);
        g.closePath();
        g.fillPath();
        g.strokePath();
      }

      if (allowed) return;
      g.lineStyle(density === 'compact' ? 1.5 : 2, 0x7f1d1d, 0.8);
      if (direction === 'left') {
        g.beginPath();
        g.moveTo(-widthPx / 2 + marker * 0.2, -marker * 0.5);
        g.lineTo(-widthPx / 2 + marker * 0.9, marker * 0.5);
        g.moveTo(-widthPx / 2 + marker * 0.9, -marker * 0.5);
        g.lineTo(-widthPx / 2 + marker * 0.2, marker * 0.5);
        g.strokePath();
      } else if (direction === 'right') {
        g.beginPath();
        g.moveTo(widthPx / 2 - marker * 0.9, -marker * 0.5);
        g.lineTo(widthPx / 2 - marker * 0.2, marker * 0.5);
        g.moveTo(widthPx / 2 - marker * 0.2, -marker * 0.5);
        g.lineTo(widthPx / 2 - marker * 0.9, marker * 0.5);
        g.strokePath();
      } else if (direction === 'up') {
        g.beginPath();
        g.moveTo(-marker * 0.5, -heightPx / 2 + marker * 0.2);
        g.lineTo(marker * 0.5, -heightPx / 2 + marker * 0.9);
        g.moveTo(marker * 0.5, -heightPx / 2 + marker * 0.2);
        g.lineTo(-marker * 0.5, -heightPx / 2 + marker * 0.9);
        g.strokePath();
      } else {
        g.beginPath();
        g.moveTo(-marker * 0.5, heightPx / 2 - marker * 0.9);
        g.lineTo(marker * 0.5, heightPx / 2 - marker * 0.2);
        g.moveTo(marker * 0.5, heightPx / 2 - marker * 0.9);
        g.lineTo(-marker * 0.5, heightPx / 2 - marker * 0.2);
        g.strokePath();
      }
    });
  }

  private handleCarTap(carId: string, pointer: Phaser.Input.Pointer) {
    if (this.sceneState !== 'playing') return;
    const car = this.cars.get(carId);
    if (!car || car.runtime.removed) return;
    this.markInput();
    if (!this.isTwoWayCar(car)) {
      this.clearSelectedCar();
      this.tryStepMove(car, car.config.allowedExitDirections[0]);
      return;
    }

    this.selectCar(car.config.id);
    if (this.getTapZoneForPointer(car, pointer) === 'center') {
      this.toast(car.config.axis === 'h' ? 'แตะซ้ายหรือขวาของรถคันนี้' : 'แตะบนหรือล่างของรถคันนี้', false);
    }
  }

  private handleSelectedCarTap(car: CarVisual, pointer: Phaser.Input.Pointer) {
    this.markInput();
    const zone = this.getTapZoneForPointer(car, pointer);
    if (zone === 'center') {
      this.toast(car.config.axis === 'h' ? 'แตะครึ่งซ้ายหรือขวาเพื่อเลือกทิศ' : 'แตะครึ่งบนหรือล่างเพื่อเลือกทิศ', true);
      return;
    }

    this.trySelectedDirection(car, zone);
  }

  private trySelectedDirection(car: CarVisual, direction: ParkingJamDirection) {
    this.showSelectionFeedback(car, direction, this.isDirectionCurrentlyAvailable(car, direction));
    this.clearSelectedCar();
    this.tryStepMove(car, direction, true);
  }

  private tryStepMove(car: CarVisual, direction: ParkingJamDirection, fromSelected = false) {
    const slideRange = this.computeSlideRange(car);
    const sign = direction === 'left' || direction === 'up' ? -1 : 1;
    const distance = sign < 0 ? Math.abs(slideRange.minOffset) : slideRange.maxOffset;
    const canMove = distance >= 1;

    // Cars on an open edge can exit immediately even with zero slide distance.
    if (this.canExitByDirection(car, direction)) {
      this.pushUndoSnapshot();
      this.playSfx(this.moveSfx);
      this.moveCount += 1;
      this.distinctCarsMoved.add(car.config.id);
      this.carMoveHistogram[car.config.id] = (this.carMoveHistogram[car.config.id] ?? 0) + 1;
      this.animateExit(car, direction);
      return;
    }

    if (!canMove) {
      this.invalidMoveCount += 1;
      this.trackRepeatedError(car.config.id, direction);
      this.playSfx(this.blockedSfx);

      if (this.isFrontCollision(car, direction)) {
        this.collisionCount += 1;
        this.flashCollision(car.container);
        this.toast('ชนรถคันหน้า', true);
      } else if (this.isBlockedExitAttempt(car, direction)) {
        this.blockedExitAttemptCount += 1;
        this.flashError(car.container);
        if (fromSelected) {
          this.toast('ด้านนี้ออกไม่ได้', true);
        }
      } else {
        this.flashNudge(car.container);
        if (fromSelected) {
          this.toast('ด้านนี้ไปต่อไม่ได้', true);
        }
      }

      this.renderCar(car);
      return;
    }

    this.pushUndoSnapshot();
    this.playSfx(this.moveSfx);
    const offset = sign * distance;
    if (car.config.axis === 'h') car.runtime.col += offset;
    else car.runtime.row += offset;

    this.moveCount += 1;
    this.slideCellDistanceTotal += distance;
    this.distinctCarsMoved.add(car.config.id);
    this.carMoveHistogram[car.config.id] = (this.carMoveHistogram[car.config.id] ?? 0) + 1;

    // If this movement reaches an open edge gate, dash out immediately.
    if (this.canExitByDirection(car, direction)) {
      this.animateExit(car, direction);
      return;
    }

    const tweenMs = this.reduceMotion ? 70 : 140;
    this.tweens.add({
      targets: car.container,
      x: this.gridOriginX + (car.runtime.col + (car.config.axis === 'h' ? car.config.length / 2 : 0.5)) * this.cellSize,
      y: this.gridOriginY + (car.runtime.row + (car.config.axis === 'v' ? car.config.length / 2 : 0.5)) * this.cellSize,
      duration: tweenMs,
      ease: 'Sine.out',
      onComplete: () => {
        car.container.setDepth(20);
        this.checkObjectiveCompletion();
      },
    });

    this.updateProgressText();
  }

  private handleUndo() {
    if (this.sceneState !== 'playing') return;
    if (this.undoStack.length === 0) {
      this.toast('ไม่มีการเคลื่อนไหวให้ย้อน', true);
      return;
    }

    this.markInput();
    this.undoCount += 1;

    const snapshot = this.undoStack.pop();
    if (!snapshot) return;
    this.clearSelectedCar();

    Object.entries(snapshot.cars).forEach(([id, saved]) => {
      const car = this.cars.get(id);
      if (!car) return;
      car.runtime.row = saved.row;
      car.runtime.col = saved.col;
      car.runtime.removed = saved.removed;
      this.renderCar(car);
    });

    this.updateProgressText();
    this.toast('ย้อนการเคลื่อนไหวแล้ว', false);
  }

  private handleReset() {
    if (this.sceneState !== 'playing') return;
    this.markInput();
    this.restartCount += 1;
    this.undoStack = [];
    this.clearSelectedCar();

    this.cars.forEach((car) => {
      car.runtime.row = car.config.row;
      car.runtime.col = car.config.col;
      car.runtime.removed = false;
      car.container.setAlpha(1);
      car.container.setVisible(true);
      this.renderCar(car);
    });

    this.toast('รีเซ็ตตำแหน่งรถแล้ว', false);
    this.updateProgressText();
  }

  private computeSlideRange(car: CarVisual) {
    const occupied = this.getOccupiedSet(car.config.id);
    const { runtime, config } = car;

    let minOffset = 0;
    let maxOffset = 0;

    if (config.axis === 'h') {
      while (runtime.col - (Math.abs(minOffset) + 1) >= 0) {
        const checkCol = runtime.col - (Math.abs(minOffset) + 1);
        if (occupied.has(`${runtime.row},${checkCol}`)) break;
        minOffset -= 1;
      }

      while (runtime.col + config.length - 1 + maxOffset + 1 < this.level.gridSize) {
        const checkCol = runtime.col + config.length - 1 + maxOffset + 1;
        if (occupied.has(`${runtime.row},${checkCol}`)) break;
        maxOffset += 1;
      }

      return { minOffset, maxOffset };
    }

    while (runtime.row - (Math.abs(minOffset) + 1) >= 0) {
      const checkRow = runtime.row - (Math.abs(minOffset) + 1);
      if (occupied.has(`${checkRow},${runtime.col}`)) break;
      minOffset -= 1;
    }

    while (runtime.row + config.length - 1 + maxOffset + 1 < this.level.gridSize) {
      const checkRow = runtime.row + config.length - 1 + maxOffset + 1;
      if (occupied.has(`${checkRow},${runtime.col}`)) break;
      maxOffset += 1;
    }

    return { minOffset, maxOffset };
  }

  private getOccupiedSet(skipCarId?: string) {
    const occupied = new Set<string>();
    this.cars.forEach((car) => {
      if (car.runtime.removed) return;
      if (skipCarId && car.config.id === skipCarId) return;

      const widthCells = car.config.axis === 'h' ? car.config.length : 1;
      const heightCells = car.config.axis === 'v' ? car.config.length : 1;

      for (let r = 0; r < heightCells; r += 1) {
        for (let c = 0; c < widthCells; c += 1) {
          occupied.add(`${car.runtime.row + r},${car.runtime.col + c}`);
        }
      }
    });
    return occupied;
  }

  private canExitByDirection(car: CarVisual, direction: ParkingJamDirection) {
    return canParkingJamCarExit(
      {
        gridSize: this.level.gridSize,
        blockedGateSegments: this.level.blockedGateSegments,
      },
      car.config,
      car.runtime.row,
      car.runtime.col,
      direction
    );
  }

  private isBlockedExitAttempt(car: CarVisual, direction: ParkingJamDirection) {
    if (car.config.axis === 'h' && (direction === 'up' || direction === 'down')) return false;
    if (car.config.axis === 'v' && (direction === 'left' || direction === 'right')) return false;

    if (direction === 'left' && car.runtime.col === 0) return !this.canExitByDirection(car, direction);
    if (direction === 'right' && car.runtime.col + car.config.length - 1 === this.level.gridSize - 1) {
      return !this.canExitByDirection(car, direction);
    }
    if (direction === 'up' && car.runtime.row === 0) return !this.canExitByDirection(car, direction);
    if (direction === 'down' && car.runtime.row + car.config.length - 1 === this.level.gridSize - 1) {
      return !this.canExitByDirection(car, direction);
    }
    return false;
  }

  private isFrontCollision(car: CarVisual, direction: ParkingJamDirection) {
    const occupied = this.getOccupiedSet(car.config.id);
    if (direction === 'left') {
      const frontCol = car.runtime.col - 1;
      if (frontCol < 0) return false;
      return occupied.has(`${car.runtime.row},${frontCol}`);
    }
    if (direction === 'right') {
      const frontCol = car.runtime.col + car.config.length;
      if (frontCol >= this.level.gridSize) return false;
      return occupied.has(`${car.runtime.row},${frontCol}`);
    }
    if (direction === 'up') {
      const frontRow = car.runtime.row - 1;
      if (frontRow < 0) return false;
      return occupied.has(`${frontRow},${car.runtime.col}`);
    }
    const frontRow = car.runtime.row + car.config.length;
    if (frontRow >= this.level.gridSize) return false;
    return occupied.has(`${frontRow},${car.runtime.col}`);
  }

  private animateExit(car: CarVisual, direction: ParkingJamDirection) {
    if (this.selectedCarId === car.config.id) {
      this.clearSelectedCar();
    }
    car.runtime.removed = true;
    this.playSfx(this.exitSfx);

    const distance = this.cellSize * 1.4;
    let x = car.container.x;
    let y = car.container.y;

    if (direction === 'left') x -= distance;
    if (direction === 'right') x += distance;
    if (direction === 'up') y -= distance;
    if (direction === 'down') y += distance;

    const trail = this.reduceMotion
      ? null
      : this.add.rectangle(car.container.x, car.container.y, 6, 6, 0xffffff, 0.8).setDepth(24);

    if (trail) {
      this.tweens.add({
        targets: trail,
        alpha: 0,
        scaleX: 10,
        scaleY: 0.6,
        duration: 240,
        onComplete: () => trail.destroy(),
      });
    }

    this.tweens.add({
      targets: car.container,
      x,
      y,
      alpha: 0,
      duration: this.reduceMotion ? 120 : 260,
      ease: 'Sine.in',
      onComplete: () => {
        car.container.setVisible(false).setAlpha(1).setDepth(20);
        this.updateProgressText();
        this.toast(`รถ ${car.config.id} ออกสำเร็จ`, false);
        this.checkObjectiveCompletion();
      },
    });
  }

  private checkObjectiveCompletion() {
    const allRemoved = [...this.cars.values()].every((car) => car.runtime.removed);
    if (allRemoved) {
      this.completeLevel({ solved: true, failedTimeout: false, skipped: false });
    }
  }

  private endGame(success: boolean) {
    if (success) {
      this.completeLevel({ solved: true, failedTimeout: false, skipped: false });
    } else {
      this.completeLevel({ solved: false, failedTimeout: true, skipped: false });
    }
  }

  private completeLevel(result: { solved: boolean; failedTimeout: boolean; skipped: boolean }) {
    if (this.sceneState === 'complete') return;

    this.sceneState = 'complete';
    if (result.solved) this.playSfx(this.levelPassSfx);
    else this.playSfx(this.levelFailSfx);
    this.bgMusic?.stop();
    const levelEndMs = Date.now();
    const levelTimeMs = Math.max(0, levelEndMs - this.levelStartMs);
    const firstActionLatencyMs = this.firstActionAtMs > 0
      ? Math.max(0, this.firstActionAtMs - this.levelStartMs)
      : levelTimeMs;

    const levelAttempt: ParkingJamLevelAttemptStats = {
      levelId: this.level.level,
      levelStartMs: this.levelStartMs,
      levelEndMs,
      levelTimeMs,
      solved: result.solved,
      failedTimeout: result.failedTimeout,
      skipped: result.skipped,
      moveCount: this.moveCount,
      slideCellDistanceTotal: this.slideCellDistanceTotal,
      invalidMoveCount: this.invalidMoveCount,
      blockedExitAttemptCount: this.blockedExitAttemptCount,
      undoCount: this.undoCount,
      hintUsedCount: this.hintUsedCount,
      restartCount: this.restartCount,
      distinctCarsMovedCount: this.distinctCarsMoved.size,
      carMoveHistogram: { ...this.carMoveHistogram },
      firstActionLatencyMs,
      repeatedErrorCount: this.repeatedErrorCount,
      idleTimeMs: this.idleTimeMs,
      parMoves: this.level.parMoves,
      parTimeMs: this.level.parTimeMs,
      difficulty: this.level.difficulty,
      relevantCarSet: this.level.relevantCarSet,
      objectiveType: this.level.objectiveType,
      gatingProfile: this.level.gatingProfile,
    };

    const sessionStats = {
      sessionId: `parking-jam-${this.level.level}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      startTimeMs: this.levelStartMs,
      endTimeMs: levelEndMs,
      levelsAttemptedCount: 1,
      levelsSolvedCount: result.solved ? 1 : 0,
      levelsFailedCount: result.failedTimeout ? 1 : 0,
      levelsSkippedCount: result.skipped ? 1 : 0,
      levelAttempts: [levelAttempt],
    };

    const clinicalStats = calculateParkingJamStats(sessionStats);

    const stars = this.calculateStars(result, levelAttempt);
    const score = this.calculateScore(result, levelAttempt);
    const starHint = this.getStarHint(result, levelAttempt, stars);

    const payload: ParkingJamOnGameOverPayload = {
      ...sessionStats,
      success: result.solved,
      level: this.level.level,
      current_played: this.level.level,
      userTimeMs: levelTimeMs,
      score,
      stars,
      starHint,
      objectiveType: this.level.objectiveType,
      gatingProfile: this.level.gatingProfile,
      stat_memory: null,
      stat_emotion: null,
      stat_planning: clinicalStats.stat_planning ?? 0,
      stat_speed: clinicalStats.stat_speed ?? 0,
      stat_focus: clinicalStats.stat_focus ?? 0,
      stat_visual: clinicalStats.stat_visual ?? 0,
    };

    const onGameOver = this.registry.get('onGameOver');
    if (onGameOver) {
      onGameOver(payload);
    }
  }

  private calculateStars(
    result: { solved: boolean; failedTimeout: boolean; skipped: boolean },
    attempt: ParkingJamLevelAttemptStats
  ): 0 | 1 | 2 | 3 {
    if (result.failedTimeout || result.skipped) return 1;
    if (!result.solved) return 0;

    const moveRatio = attempt.moveCount / Math.max(1, this.level.parMoves);
    const timeRatio = attempt.levelTimeMs / Math.max(1, this.level.parTimeMs);
    const errorPenalty =
      attempt.invalidMoveCount +
      attempt.blockedExitAttemptCount +
      attempt.undoCount * 0.5 +
      this.collisionCount * 1.2;

    if (moveRatio <= 1.4 && timeRatio <= 1.35 && errorPenalty <= 1) return 3;
    if (moveRatio <= 2.1 && timeRatio <= 1.9 && errorPenalty <= 4) return 2;
    return 1;
  }

  private calculateScore(
    result: { solved: boolean; failedTimeout: boolean; skipped: boolean },
    attempt: ParkingJamLevelAttemptStats
  ) {
    return calculateParkingJamLevelScore({
      attempt,
      solved: result.solved && !result.failedTimeout && !result.skipped,
    });
  }

  private getStarHint(
    result: { solved: boolean; failedTimeout: boolean; skipped: boolean },
    attempt: ParkingJamLevelAttemptStats,
    stars: 0 | 1 | 2 | 3
  ) {
    if (stars === 3) return null;

    if (result.skipped) {
      return 'ข้ามด่านจะได้ดาวต่ำ ลองแก้เองเพื่อเก็บดาวเพิ่ม';
    }
    if (result.failedTimeout) {
      return 'หมดเวลา ลองเคลื่อนรถที่เปิดทางกว้างก่อน';
    }
    if (attempt.moveCount > this.level.parMoves) {
      return 'ลองขยับรถให้น้อยลง จะผ่านได้ไวและได้ดาวมากขึ้น';
    }
    if (attempt.invalidMoveCount + attempt.blockedExitAttemptCount > 0) {
      return 'สังเกตทางออกที่เปิดก่อนแตะ จะลดความผิดพลาดได้';
    }
    if (this.collisionCount > 0) {
      return 'หลีกเลี่ยงการชน จะช่วยเพิ่มดาวได้';
    }

    return 'อีกนิดเดียว! ลองทำให้เร็วขึ้นเพื่อเก็บดาวเพิ่ม';
  }

  private pushUndoSnapshot() {
    const snapshot: UndoSnapshot = { cars: {} };
    this.cars.forEach((car, id) => {
      snapshot.cars[id] = {
        row: car.runtime.row,
        col: car.runtime.col,
        removed: car.runtime.removed,
      };
    });

    this.undoStack.push(snapshot);
    if (this.undoStack.length > 40) {
      this.undoStack.shift();
    }
  }

  private updateProgressText() {
    const cleared = [...this.cars.values()].filter((car) => car.runtime.removed).length;
    const totalCars = this.level.cars.length;
    this.progressText.setText(`ออกไปแล้ว ${cleared}/${totalCars} คัน`);
  }

  private drawTimerDial() {
    const metrics = this.getAdaptiveMetrics();
    const x = metrics.timerX;
    const y = metrics.timerY;
    const radius = metrics.timerRadius;
    const thickness = metrics.timerThickness;

    const pct = Math.max(0, Math.min(1, this.remainingMs / this.effectiveLimitMs));
    const warning = pct <= 0.25;

    this.timerDial.clear();
    this.timerDial.lineStyle(thickness, 0xd6e4ef, 1);
    this.timerDial.strokeCircle(x, y, radius);

    this.timerDial.lineStyle(thickness, warning ? 0xef4444 : 0x22c55e, 1);
    this.timerDial.beginPath();
    this.timerDial.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2, false);
    this.timerDial.strokePath();

    const seconds = Math.ceil(this.remainingMs / 1000);
    this.timerText.setText(`${Math.max(0, seconds)}`);
    this.timerText.setColor(warning ? '#b91c1c' : '#0f172a');
    this.timerText.setFontSize(metrics.timerFontSize);
    this.timerText.setPosition(x, y);
  }

  private toast(message: string, isError: boolean) {
    this.toastText.setText(message);
    this.toastText.setBackgroundColor(isError ? '#7f1d1d' : '#0f172a');
    this.toastText.setAlpha(1);

    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: this.reduceMotion ? 420 : 760,
      duration: this.reduceMotion ? 160 : 260,
      ease: 'Sine.out',
    });
  }

  private isTwoWayCar(car: CarVisual) {
    return car.config.allowedExitDirections.length > 1;
  }

  private selectCar(carId: string) {
    this.selectedCarId = carId;
    this.refreshSelectionOverlay();
  }

  private clearSelectedCar() {
    this.selectedCarId = undefined;
    this.selectionGraphics?.clear();
  }

  private refreshSelectionOverlay() {
    if (!this.selectionGraphics) return;
    if (!this.selectedCarId) {
      this.selectionGraphics.clear();
      return;
    }

    const car = this.cars.get(this.selectedCarId);
    if (!car || car.runtime.removed || !this.isTwoWayCar(car)) {
      this.clearSelectedCar();
      return;
    }

    this.renderSelectedOverlay(car);
  }

  private renderSelectedOverlay(car: CarVisual) {
    this.selectionGraphics.clear();
    if (!this.isTwoWayCar(car)) return;

    const g = this.selectionGraphics;
    const density = this.getCarVisualDensity();
    const { widthPx, heightPx } = this.getCarPixelBounds(car.config);
    const centerX = car.container.x;
    const centerY = car.container.y;
    const left = centerX - widthPx / 2;
    const top = centerY - heightPx / 2;
    const directions = car.config.axis === 'h'
      ? (['left', 'right'] as const)
      : (['up', 'down'] as const);

    g.lineStyle(density === 'compact' ? 2 : 3, 0x22d3ee, 0.9);
    g.strokeRoundedRect(left - 4, top - 4, widthPx + 8, heightPx + 8, 16);

    directions.forEach((direction) => {
      const available = this.isDirectionCurrentlyAvailable(car, direction);
      g.fillStyle(available ? 0x67e8f9 : 0x94a3b8, available ? 0.22 : 0.14);

      if (car.config.axis === 'h') {
        const zoneLeft = direction === 'left' ? left : centerX;
        g.fillRect(zoneLeft, top, widthPx / 2, heightPx);
      } else {
        const zoneTop = direction === 'up' ? top : centerY;
        g.fillRect(left, zoneTop, widthPx, heightPx / 2);
      }

      g.fillStyle(available ? 0x0f766e : 0x64748b, 0.95);
      const offset = Math.max(density === 'compact' ? 14 : 18, Math.min(widthPx, heightPx) * (density === 'compact' ? 0.2 : 0.24));
      const arrowX = direction === 'left'
        ? centerX - offset
        : direction === 'right'
          ? centerX + offset
          : centerX;
      const arrowY = direction === 'up'
        ? centerY - offset
        : direction === 'down'
          ? centerY + offset
          : centerY;
      this.drawSelectionArrow(g, arrowX, arrowY, direction, Math.max(density === 'compact' ? 9 : 11, Math.floor(Math.min(widthPx, heightPx) * (density === 'compact' ? 0.14 : 0.16))));
    });

    g.lineStyle(density === 'compact' ? 1.5 : 2, 0xffffff, 0.8);
    if (car.config.axis === 'h') {
      g.beginPath();
      g.moveTo(centerX, top + 4);
      g.lineTo(centerX, top + heightPx - 4);
      g.strokePath();
    } else {
      g.beginPath();
      g.moveTo(left + 4, centerY);
      g.lineTo(left + widthPx - 4, centerY);
      g.strokePath();
    }
  }

  private drawSelectionArrow(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    direction: ParkingJamDirection,
    size: number
  ) {
    graphics.beginPath();
    if (direction === 'left') {
      graphics.moveTo(x - size, y);
      graphics.lineTo(x + size * 0.7, y - size * 0.8);
      graphics.lineTo(x + size * 0.7, y + size * 0.8);
    } else if (direction === 'right') {
      graphics.moveTo(x + size, y);
      graphics.lineTo(x - size * 0.7, y - size * 0.8);
      graphics.lineTo(x - size * 0.7, y + size * 0.8);
    } else if (direction === 'up') {
      graphics.moveTo(x, y - size);
      graphics.lineTo(x - size * 0.8, y + size * 0.7);
      graphics.lineTo(x + size * 0.8, y + size * 0.7);
    } else {
      graphics.moveTo(x, y + size);
      graphics.lineTo(x - size * 0.8, y - size * 0.7);
      graphics.lineTo(x + size * 0.8, y - size * 0.7);
    }
    graphics.closePath();
    graphics.fillPath();
  }

  private getTapZoneForPointer(car: CarVisual, pointer: Phaser.Input.Pointer): TapZone {
    const { widthPx, heightPx } = this.getCarPixelBounds(car.config);
    const localX = pointer.x - car.container.x;
    const localY = pointer.y - car.container.y;

    if (car.config.axis === 'h') {
      const deadHalfWidth = Math.max(10, widthPx * 0.075);
      if (Math.abs(localX) <= deadHalfWidth) return 'center';
      return localX < 0 ? 'left' : 'right';
    }

    const deadHalfHeight = Math.max(10, heightPx * 0.075);
    if (Math.abs(localY) <= deadHalfHeight) return 'center';
    return localY < 0 ? 'up' : 'down';
  }

  private isDirectionCurrentlyAvailable(car: CarVisual, direction: ParkingJamDirection) {
    if (!car.config.allowedExitDirections.includes(direction)) return false;
    if (this.canExitByDirection(car, direction)) return true;

    const slideRange = this.computeSlideRange(car);
    if (direction === 'left' || direction === 'up') {
      return Math.abs(slideRange.minOffset) >= 1;
    }
    return slideRange.maxOffset >= 1;
  }

  private showSelectionFeedback(car: CarVisual, direction: ParkingJamDirection, success: boolean) {
    if (!this.selectionFeedbackGraphics) return;

    const { widthPx, heightPx } = this.getCarPixelBounds(car.config);
    const left = car.container.x - widthPx / 2;
    const top = car.container.y - heightPx / 2;

    const draw = (alpha: number) => {
      this.selectionFeedbackGraphics.clear();
      this.selectionFeedbackGraphics.fillStyle(success ? 0x22c55e : 0xef4444, alpha);
      if (car.config.axis === 'h') {
        const zoneLeft = direction === 'left' ? left : car.container.x;
        this.selectionFeedbackGraphics.fillRect(zoneLeft, top, widthPx / 2, heightPx);
      } else {
        const zoneTop = direction === 'up' ? top : car.container.y;
        this.selectionFeedbackGraphics.fillRect(left, zoneTop, widthPx, heightPx / 2);
      }
    };

    draw(success ? 0.35 : 0.28);
    this.tweens.addCounter({
      from: success ? 0.35 : 0.28,
      to: 0,
      duration: this.reduceMotion ? 120 : 220,
      onUpdate: (tween) => draw(tween.getValue() ?? 0),
      onComplete: () => this.selectionFeedbackGraphics.clear(),
    });
  }

  private flashError(target: Phaser.GameObjects.Container) {
    if (this.reduceMotion) return;
    this.tweens.add({
      targets: target,
      x: target.x + 8,
      duration: 45,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.inOut',
    });
  }

  private flashNudge(target: Phaser.GameObjects.Container) {
    this.tweens.add({
      targets: target,
      scaleX: 0.97,
      scaleY: 0.97,
      duration: this.reduceMotion ? 60 : 90,
      yoyo: true,
    });
  }

  private flashCollision(target: Phaser.GameObjects.Container) {
    if (this.reduceMotion) return;
    this.tweens.add({
      targets: target,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 55,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.inOut',
    });
  }

  private markInput() {
    const now = Date.now();
    if (this.firstActionAtMs === 0) {
      this.firstActionAtMs = now;
    }

    if (this.lastInputAtMs > 0) {
      const gap = now - this.lastInputAtMs;
      if (gap > 2000) {
        this.idleTimeMs += gap;
      }
    }

    this.lastInputAtMs = now;
  }

  private trackRepeatedError(carId: string, direction: ParkingJamDirection) {
    const key = `${carId}:${direction}`;
    const now = Date.now();
    const prev = this.repeatedErrorMap.get(key);
    if (prev && now - prev <= 2000) {
      this.repeatedErrorCount += 1;
    }
    this.repeatedErrorMap.set(key, now);
  }

  private setupAudio() {
    try {
      this.moveSfx = this.sound.add(SOUND_KEYS.move, { volume: 0.35 });
      this.blockedSfx = this.sound.add(SOUND_KEYS.blocked, { volume: 0.4 });
      this.exitSfx = this.sound.add(SOUND_KEYS.exit, { volume: 0.45 });
      this.levelPassSfx = this.sound.add(SOUND_KEYS.levelPass, { volume: 0.55 });
      this.levelFailSfx = this.sound.add(SOUND_KEYS.levelFail, { volume: 0.55 });

      const existingBgm = this.sound.get(SOUND_KEYS.bgm);
      if (existingBgm) {
        existingBgm.stop();
        existingBgm.destroy();
      }
      this.bgMusic = this.sound.add(SOUND_KEYS.bgm, { loop: true, volume: 0.28 });
      this.bgMusic.play();
    } catch {
      // Audio is optional.
    }
  }

  private playSfx(sound?: Phaser.Sound.BaseSound) {
    if (!sound) return;
    try {
      sound.play();
    } catch {
      // Ignore playback errors in unsupported contexts.
    }
  }

  private cleanupAudio() {
    this.selectionGraphics?.clear();
    this.selectionFeedbackGraphics?.clear();
    this.bgMusic?.stop();
    this.bgMusic?.destroy();
    this.bgMusic = undefined;

    this.moveSfx?.destroy();
    this.blockedSfx?.destroy();
    this.exitSfx?.destroy();
    this.levelPassSfx?.destroy();
    this.levelFailSfx?.destroy();

    this.moveSfx = undefined;
    this.blockedSfx = undefined;
    this.exitSfx = undefined;
    this.levelPassSfx = undefined;
    this.levelFailSfx = undefined;
  }

  private arrowForDirection(direction: ParkingJamDirection) {
    if (direction === 'left') return '←';
    if (direction === 'right') return '→';
    if (direction === 'up') return '↑';
    return '↓';
  }

  private handleResize() {
    this.layoutScene();
    if (this.noArrowGuideOverlay) {
      this.noArrowGuideOverlay.destroy();
      this.noArrowGuideOverlay = undefined;
      this.showNoArrowGuidePopup();
    }
  }

  private shouldShowDirectionHints() {
    return this.level.level <= 15;
  }

  private maybeShowNoArrowGuide() {
    if (this.level.level <= 15) return;
    if (this.hasSeenNoArrowGuide()) return;
    this.showNoArrowGuidePopup();
  }

  private hasSeenNoArrowGuide() {
    try {
      if (typeof window === 'undefined') return false;
      return window.localStorage.getItem('parking_jam_no_arrow_guide_seen') === '1';
    } catch {
      return false;
    }
  }

  private setNoArrowGuideSeen() {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem('parking_jam_no_arrow_guide_seen', '1');
    } catch {
      // ignore persistence errors
    }
  }

  private showNoArrowGuidePopup() {
    this.sceneState = 'paused';
    const { width, height } = this.scale;

    const overlay = this.add.container(0, 0).setDepth(120);
    const scrim = this.add.rectangle(0, 0, width, height, 0x0f172a, 0.52)
      .setOrigin(0)
      .setInteractive();

    const panelWidth = Math.min(520, Math.max(320, width * 0.88));
    const panelHeight = Math.min(320, Math.max(230, height * 0.42));
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0xffffff, 1)
      .setStrokeStyle(3, 0xb9cad6, 1);

    const title = this.add.text(width / 2, height / 2 - panelHeight * 0.33, 'ด่านท้าทาย: ไม่มีลูกศร', {
      fontSize: '28px',
      color: '#0f172a',
      fontStyle: '700',
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      align: 'center',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
      wordWrap: { width: panelWidth - 40 },
    }).setOrigin(0.5, 0);

    const body = this.add.text(
      width / 2,
      height / 2 - panelHeight * 0.1,
      'จากด่านนี้ไป ให้ดูทิศจากตัวรถเอง\nไฟหน้า (เหลือง) = ด้านหน้า\nไฟท้าย (แดง) = ด้านหลัง\nแนวหลังคาเอียงช่วยบอกกระจกหน้า',
      {
        fontSize: '20px',
        color: '#334155',
        fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
        fontStyle: '700',
        align: 'center',
        lineSpacing: 6,
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
        wordWrap: { width: panelWidth - 48 },
      }
    ).setOrigin(0.5, 0);

    const button = this.add.rectangle(width / 2, height / 2 + panelHeight * 0.34, 170, 56, 0x0f172a, 1)
      .setStrokeStyle(2, 0x111827, 1)
      .setInteractive({ useHandCursor: true });
    const buttonLabel = this.add.text(width / 2, button.y, 'เข้าใจแล้ว', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      fontStyle: '700',
      padding: { left: 6, right: 6, top: 3, bottom: 3 },
    }).setOrigin(0.5);

    const close = () => {
      this.setNoArrowGuideSeen();
      overlay.destroy();
      this.noArrowGuideOverlay = undefined;
      if (this.sceneState !== 'complete') {
        this.sceneState = 'playing';
      }
    };

    button.on('pointerdown', close);
    button.on('pointerover', () => button.setFillStyle(0x1f2937, 1));
    button.on('pointerout', () => button.setFillStyle(0x0f172a, 1));

    overlay.add([scrim, panel, title, body, button, buttonLabel]);
    this.noArrowGuideOverlay = overlay;
  }

  private readReduceMotion() {
    try {
      if (typeof window === 'undefined') return false;
      return window.localStorage.getItem('parking_jam_reduce_motion') === '1';
    } catch {
      return false;
    }
  }

  private persistReduceMotion() {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem('parking_jam_reduce_motion', this.reduceMotion ? '1' : '0');
    } catch {
      // ignore persistence errors
    }
  }
}
