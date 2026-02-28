import * as Phaser from 'phaser';
import { getParkingJamLevel } from './levels';
import {
  type ParkingJamCarConfig,
  type ParkingJamCarRuntime,
  type ParkingJamDirection,
} from './types';

type TutorialStep = {
  id: string;
  title: string;
  description: string;
  carId?: string;
  direction?: ParkingJamDirection;
  action: 'info' | 'move';
};

interface TutorialCar {
  config: ParkingJamCarConfig;
  runtime: ParkingJamCarRuntime;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  details: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

const COLORS = {
  bg: 0xf3f8fb,
  grid: 0xd9e6ef,
  gridBorder: 0xb7cad8,
  gateOpen: 0x7dd3fc,
  textMain: '#0f172a',
  textMuted: '#475569',
  accent: 0x22d3ee,
  accentSoft: 0x67e8f9,
  success: 0x16a34a,
};

const SOUND_KEYS = {
  move: 'parking-jam-move',
  blocked: 'parking-jam-blocked',
  exit: 'parking-jam-exit',
  levelPass: 'parking-jam-level-pass',
  bgm: 'parking-jam-bgm',
} as const;

const SOUND_PATHS = {
  move: '/assets/sounds/parking-jam/move.mp3',
  blocked: '/assets/sounds/parking-jam/blocked.mp3',
  exit: '/assets/sounds/parking-jam/exit.mp3',
  levelPass: '/assets/sounds/global/level-pass.mp3',
  bgm: '/assets/sounds/parking-jam/bg-music.mp3',
} as const;

const TUTORIAL_LEVEL_ID = 0;

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'intro',
    title: 'ยินดีต้อนรับ!',
    description: 'เป้าหมาย: กดรถเพื่อให้เคลื่อนไปด้านหน้า (ดูจากไฟเหลือง)',
    action: 'info',
  },
  {
    id: 'move-b',
    title: 'ขั้นที่ 1',
    description: 'รถ B ไฟหน้าชี้ลง กดเพื่อเคลื่อนไปด้านหน้า',
    carId: 'B',
    direction: 'down',
    action: 'move',
  },
  {
    id: 'move-c',
    title: 'ขั้นที่ 2',
    description: 'เยี่ยม! รถ C ไฟหน้าชี้ลง กดเพื่อออกทางประตู',
    carId: 'C',
    direction: 'up',
    action: 'move',
  },
  {
    id: 'move-a',
    title: 'ขั้นที่ 3',
    description: 'รถ A ไฟหน้าชี้ขวา กดเพื่อออกทางประตูด้านขวา!',
    carId: 'A',
    direction: 'right',
    action: 'move',
  },
];

export class ParkingJamTutorialScene extends Phaser.Scene {
  private level = getParkingJamLevel(TUTORIAL_LEVEL_ID);
  private gridSize = this.level.gridSize;
  private cellSize = 70;
  private gridOriginX = 0;
  private gridOriginY = 0;

  private cars = new Map<string, TutorialCar>();
  private tutorialIndex = 0;
  private tutorialOpen = true;

  private boardGraphics!: Phaser.GameObjects.Graphics;
  private arrowGraphics!: Phaser.GameObjects.Graphics;
  private highlightGraphics!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private tapToContinueText!: Phaser.GameObjects.Text;

  private arrowTween?: Phaser.Tweens.Tween;
  private highlightTween?: Phaser.Tweens.Tween;
  private tapToContinueTween?: Phaser.Tweens.Tween;

  private moveSfx?: Phaser.Sound.BaseSound;
  private blockedSfx?: Phaser.Sound.BaseSound;
  private exitSfx?: Phaser.Sound.BaseSound;
  private levelPassSfx?: Phaser.Sound.BaseSound;
  private bgMusic?: Phaser.Sound.BaseSound;

  private completed = false;

  constructor() {
    super({ key: 'ParkingJamTutorialScene' });
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
    if (!this.cache.audio.exists(SOUND_KEYS.bgm)) {
      this.load.audio(SOUND_KEYS.bgm, SOUND_PATHS.bgm);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.setupAudio();

    this.boardGraphics = this.add.graphics();
    this.arrowGraphics = this.add.graphics().setDepth(50);
    this.highlightGraphics = this.add.graphics().setDepth(25);

    this.titleText = this.add.text(0, 60, '', {
      fontSize: '28px',
      color: COLORS.textMain,
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      fontStyle: '700',
      padding: { left: 16, right: 16, top: 8, bottom: 8 },
    }).setOrigin(0.5, 0).setDepth(60);

    this.descText = this.add.text(0, 100, '', {
      fontSize: '20px',
      color: COLORS.textMuted,
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      fontStyle: '700',
      align: 'center',
      wordWrap: { width: 400 },
      padding: { left: 12, right: 12, top: 6, bottom: 6 },
    }).setOrigin(0.5, 0).setDepth(60);

    this.progressText = this.add.text(0, 0, '', {
      fontSize: '18px',
      color: COLORS.textMuted,
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      fontStyle: '700',
      padding: { left: 10, right: 10, top: 4, bottom: 4 },
    }).setOrigin(0.5, 0.5).setDepth(60);

    this.tapToContinueText = this.add.text(0, 0, 'กดเพื่อไปต่อ', {
      fontSize: '20px',
      color: COLORS.textMuted,
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      fontStyle: '700',
      padding: { left: 12, right: 12, top: 6, bottom: 6 },
    }).setOrigin(0.5, 0.5).setDepth(60).setAlpha(0);

    this.createCars();
    this.layout();
    this.renderTutorialStep();

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.scale.on('resize', this.layout, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.handlePointerDown, this);
      this.scale.off('resize', this.layout, this);
      this.cleanupAudio();
    });
  }

  private createCars() {
    this.cars.forEach((car) => car.container.destroy());
    this.cars.clear();

    // Tutorial-specific car overrides: flip car A to face right, car B to face down
    const tutorialOverrides: Record<string, Partial<ParkingJamCarConfig>> = {
      'A': { allowedExitDirections: ['right'] },
      'B': { allowedExitDirections: ['down'] },
    };

    this.level.cars.forEach((config) => {
      const override = tutorialOverrides[config.id];
      const finalConfig = override ? { ...config, ...override } : config;

      const runtime: ParkingJamCarRuntime = {
        id: finalConfig.id,
        row: finalConfig.row,
        col: finalConfig.col,
        removed: false,
      };

      const container = this.add.container(0, 0).setDepth(20);
      const bg = this.add.graphics();
      const details = this.add.graphics();
      const label = this.add.text(0, 0, finalConfig.id, {
        fontSize: '16px',
        color: '#0f172a',
        fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
        fontStyle: '700',
        padding: { left: 2, right: 2, top: 1, bottom: 1 },
      }).setOrigin(0.5);

      container.add([bg, details, label]);

      container.setInteractive(
        new Phaser.Geom.Rectangle(-80, -80, 160, 160),
        Phaser.Geom.Rectangle.Contains
      );

      this.cars.set(finalConfig.id, { config: finalConfig, runtime, container, bg, details, label });
    });
  }

  private layout() {
    const { width, height } = this.scale;

    this.titleText.setPosition(width / 2, 90);
    this.descText.setPosition(width / 2, 130);

    this.cellSize = Math.floor(
      Math.min((width * 0.86) / this.gridSize, (height * 0.55) / this.gridSize)
    );

    const boardSize = this.cellSize * this.gridSize;
    this.gridOriginX = Math.floor((width - boardSize) / 2);
    this.gridOriginY = Math.floor((height - boardSize) / 2 + 20);

    this.progressText.setPosition(width / 2, height - 40);
    this.tapToContinueText.setPosition(width / 2, height - 70);

    this.drawBoard();
    this.renderCars();
    this.renderTutorialStep();
  }

  private drawBoard() {
    const size = this.gridSize;
    const boardSize = this.cellSize * size;

    this.boardGraphics.clear();

    // Board background
    this.boardGraphics.fillStyle(0xffffff, 1);
    this.boardGraphics.fillRoundedRect(
      this.gridOriginX - 12,
      this.gridOriginY - 12,
      boardSize + 24,
      boardSize + 24,
      20
    );
    this.boardGraphics.lineStyle(4, COLORS.gridBorder, 1);
    this.boardGraphics.strokeRoundedRect(
      this.gridOriginX - 12,
      this.gridOriginY - 12,
      boardSize + 24,
      boardSize + 24,
      20
    );

    // Grid cells
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        this.boardGraphics.fillStyle(0xf8fbfd, 1);
        this.boardGraphics.fillRect(
          this.gridOriginX + col * this.cellSize,
          this.gridOriginY + row * this.cellSize,
          this.cellSize,
          this.cellSize
        );
        this.boardGraphics.lineStyle(1, COLORS.grid, 1);
        this.boardGraphics.strokeRect(
          this.gridOriginX + col * this.cellSize,
          this.gridOriginY + row * this.cellSize,
          this.cellSize,
          this.cellSize
        );
      }
    }

    // Gates
    for (let index = 0; index < size; index += 1) {
      this.drawGate('left', index);
      this.drawGate('right', index);
      this.drawGate('top', index);
      this.drawGate('bottom', index);
    }
  }

  private drawGate(edge: 'top' | 'right' | 'bottom' | 'left', index: number) {
    const blocked = this.level.blockedGateSegments.some(
      (segment) => segment.edge === edge && segment.index === index
    );
    const color = blocked ? 0xfb7185 : COLORS.gateOpen;
    const boardSize = this.cellSize * this.gridSize;
    const gateThickness = Math.max(8, Math.round(this.cellSize * 0.14));
    const gateInset = Math.max(7, Math.round(this.cellSize * 0.13));
    const gateLength = this.cellSize - gateInset * 2;
    const gateRadius = Math.max(4, Math.round(gateThickness * 0.55));

    this.boardGraphics.fillStyle(color, blocked ? 0.85 : 0.65);

    if (edge === 'left') {
      const x = this.gridOriginX - gateThickness - 3;
      const y = this.gridOriginY + index * this.cellSize + gateInset;
      this.boardGraphics.fillRoundedRect(x, y, gateThickness, gateLength, gateRadius);
    } else if (edge === 'right') {
      const x = this.gridOriginX + boardSize + 3;
      const y = this.gridOriginY + index * this.cellSize + gateInset;
      this.boardGraphics.fillRoundedRect(x, y, gateThickness, gateLength, gateRadius);
    } else if (edge === 'top') {
      const x = this.gridOriginX + index * this.cellSize + gateInset;
      const y = this.gridOriginY - gateThickness - 3;
      this.boardGraphics.fillRoundedRect(x, y, gateLength, gateThickness, gateRadius);
    } else {
      const x = this.gridOriginX + index * this.cellSize + gateInset;
      const y = this.gridOriginY + boardSize + 3;
      this.boardGraphics.fillRoundedRect(x, y, gateLength, gateThickness, gateRadius);
    }
  }

  private renderCars() {
    this.cars.forEach((car) => this.renderCar(car));
  }

  private renderCar(car: TutorialCar) {
    const { config, runtime } = car;

    if (runtime.removed) {
      car.container.setVisible(false);
      return;
    }

    const widthCells = config.axis === 'h' ? config.length : 1;
    const heightCells = config.axis === 'v' ? config.length : 1;
    const widthPx = widthCells * this.cellSize - 10;
    const heightPx = heightCells * this.cellSize - 10;

    // Body
    car.bg.clear();
    car.bg.fillStyle(config.color, 1);
    car.bg.fillRoundedRect(-widthPx / 2, -heightPx / 2, widthPx, heightPx, 14);
    car.bg.lineStyle(2, 0x0f172a, 0.28);
    car.bg.strokeRoundedRect(-widthPx / 2, -heightPx / 2, widthPx, heightPx, 14);

    // Details (roof, lights)
    this.drawCarDetails(car, widthPx, heightPx);

    // Label
    car.label.setPosition(-widthPx / 2 + 12, -heightPx / 2 + 10).setOrigin(0, 0);

    // Position
    const centerX = Math.round(
      this.gridOriginX + (runtime.col + widthCells / 2) * this.cellSize
    );
    const centerY = Math.round(
      this.gridOriginY + (runtime.row + heightCells / 2) * this.cellSize
    );

    car.container.setPosition(centerX, centerY).setVisible(true).setScale(1);
  }

  private drawCarDetails(car: TutorialCar, widthPx: number, heightPx: number) {
    const g = car.details;
    const { axis, allowedExitDirections } = car.config;
    g.clear();

    // Default forward direction
    const defaultForward: ParkingJamDirection = axis === 'h' ? 'right' : 'down';
    let forwardDirection = (allowedExitDirections[0] ?? defaultForward) as ParkingJamDirection;
    if (axis === 'h' && (forwardDirection === 'up' || forwardDirection === 'down')) {
      forwardDirection = defaultForward;
    }
    if (axis === 'v' && (forwardDirection === 'left' || forwardDirection === 'right')) {
      forwardDirection = defaultForward;
    }

    // Roof
    const roofInset = { x: 14, y: 11, alpha: 0.3 };
    const roofWidth = Math.max(10, widthPx - roofInset.x * 2);
    const roofHeight = Math.max(10, heightPx - roofInset.y * 2);
    const roofShiftPx = axis === 'h'
      ? Math.max(6, Math.round(widthPx * 0.2))
      : Math.max(6, Math.round(heightPx * 0.2));

    let roofX = -widthPx / 2 + roofInset.x;
    let roofY = -heightPx / 2 + roofInset.y;
    if (axis === 'h') {
      roofX += forwardDirection === 'right' ? -roofShiftPx : roofShiftPx;
      roofX = Phaser.Math.Clamp(roofX, -widthPx / 2 + 2, widthPx / 2 - roofWidth - 2);
    } else {
      roofY += forwardDirection === 'down' ? -roofShiftPx : roofShiftPx;
      roofY = Phaser.Math.Clamp(roofY, -heightPx / 2 + 2, heightPx / 2 - roofHeight - 2);
    }

    g.fillStyle(0xffffff, roofInset.alpha);
    g.fillRoundedRect(roofX, roofY, roofWidth, roofHeight, 8);

    // Headlights / taillights
    const lightThickness = Math.max(4, Math.floor(Math.min(widthPx, heightPx) * 0.12));
    if (axis === 'h') {
      const frontOnRight = forwardDirection === 'right';
      const frontX = frontOnRight ? widthPx / 2 - lightThickness - 1 : -widthPx / 2 + 1;
      const rearX = frontOnRight ? -widthPx / 2 + 1 : widthPx / 2 - lightThickness - 1;
      g.fillStyle(0xfef08a, 0.95);
      g.fillRoundedRect(frontX, -heightPx * 0.26, lightThickness, heightPx * 0.22, 3);
      g.fillRoundedRect(frontX, heightPx * 0.04, lightThickness, heightPx * 0.22, 3);
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
      g.fillStyle(0xfda4af, 0.9);
      g.fillRoundedRect(-widthPx * 0.26, rearY, widthPx * 0.22, lightThickness, 3);
      g.fillRoundedRect(widthPx * 0.04, rearY, widthPx * 0.22, lightThickness, 3);
    }
  }

  private renderTutorialStep() {
    if (!this.tutorialOpen) return;

    const step = TUTORIAL_STEPS[this.tutorialIndex];
    if (!step) {
      this.completeTutorial();
      return;
    }

    this.titleText.setText(step.title);
    this.descText.setText(step.description);
    this.progressText.setText(`ขั้นตอน ${this.tutorialIndex + 1}/${TUTORIAL_STEPS.length}`);

    this.clearArrowsAndHighlights();

    if (step.action === 'info') {
      this.highlightGraphics.clear();
      this.arrowGraphics.clear();
      this.startTapToContinueAnimation();
      return;
    }

    // Hide tap to continue text for move steps
    this.stopTapToContinueAnimation();

    if (step.carId && step.direction) {
      this.highlightCar(step.carId);
      this.drawArrow(step.carId, step.direction);
    }
  }

  private startTapToContinueAnimation() {
    this.stopTapToContinueAnimation();
    
    this.tapToContinueText.setAlpha(0);
    
    this.tapToContinueTween = this.tweens.add({
      targets: this.tapToContinueText,
      alpha: { from: 0.3, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private stopTapToContinueAnimation() {
    this.tapToContinueTween?.stop();
    this.tapToContinueTween = undefined;
    this.tapToContinueText.setAlpha(0);
  }

  private highlightCar(carId: string) {
    const car = this.cars.get(carId);
    if (!car || car.runtime.removed) return;

    this.highlightTween?.stop();

    const widthCells = car.config.axis === 'h' ? car.config.length : 1;
    const heightCells = car.config.axis === 'v' ? car.config.length : 1;
    const widthPx = widthCells * this.cellSize;
    const heightPx = heightCells * this.cellSize;

    const drawHighlight = (alpha: number, scale: number) => {
      if (!car || car.runtime.removed) return;
      const centerX = this.gridOriginX + (car.runtime.col + widthCells / 2) * this.cellSize;
      const centerY = this.gridOriginY + (car.runtime.row + heightCells / 2) * this.cellSize;

      this.highlightGraphics.clear();
      this.highlightGraphics.lineStyle(4, COLORS.accent, alpha);
      this.highlightGraphics.strokeRoundedRect(
        centerX - (widthPx / 2 + 4) * scale,
        centerY - (heightPx / 2 + 4) * scale,
        (widthPx + 8) * scale,
        (heightPx + 8) * scale,
        16
      );
    };

    drawHighlight(0.95, 1);

    this.highlightTween = this.tweens.add({
      targets: { alpha: 0.95, scale: 1 },
      alpha: 0.4,
      scale: 1.06,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      onUpdate: (tw) => {
        const v = tw.targets[0] as { alpha: number; scale: number };
        drawHighlight(v.alpha, v.scale);
      },
    });
  }

  private drawArrow(carId: string, direction: ParkingJamDirection) {
    const car = this.cars.get(carId);
    if (!car || car.runtime.removed) return;

    this.arrowTween?.stop();

    const widthCells = car.config.axis === 'h' ? car.config.length : 1;
    const heightCells = car.config.axis === 'v' ? car.config.length : 1;
    const widthPx = widthCells * this.cellSize;
    const heightPx = heightCells * this.cellSize;

    const centerX = this.gridOriginX + (car.runtime.col + widthCells / 2) * this.cellSize;
    const centerY = this.gridOriginY + (car.runtime.row + heightCells / 2) * this.cellSize;

    const arrowLen = Math.max(30, this.cellSize * 0.55);
    const arrowWidth = 14;

    const drawArrowGraphic = (offset: number, alpha: number) => {
      this.arrowGraphics.clear();
      this.arrowGraphics.lineStyle(6, COLORS.accent, alpha);
      this.arrowGraphics.fillStyle(COLORS.accentSoft, alpha);

      let startX = centerX;
      let startY = centerY;
      let endX = centerX;
      let endY = centerY;
      let perpX = 0;
      let perpY = 0;

      if (direction === 'left') {
        startX = centerX - widthPx / 2 - 10 - offset;
        endX = startX - arrowLen;
        perpY = 1;
      } else if (direction === 'right') {
        startX = centerX + widthPx / 2 + 10 + offset;
        endX = startX + arrowLen;
        perpY = 1;
      } else if (direction === 'up') {
        startY = centerY - heightPx / 2 - 10 - offset;
        endY = startY - arrowLen;
        perpX = 1;
      } else {
        startY = centerY + heightPx / 2 + 10 + offset;
        endY = startY + arrowLen;
        perpX = 1;
      }

      // Line
      this.arrowGraphics.beginPath();
      this.arrowGraphics.moveTo(startX, startY);
      this.arrowGraphics.lineTo(endX, endY);
      this.arrowGraphics.strokePath();

      // Arrowhead
      const headLen = 16;
      const ux = (endX - startX) / Math.max(1, arrowLen);
      const uy = (endY - startY) / Math.max(1, arrowLen);

      this.arrowGraphics.beginPath();
      this.arrowGraphics.moveTo(endX, endY);
      this.arrowGraphics.lineTo(
        endX - ux * headLen + perpX * arrowWidth,
        endY - uy * headLen + perpY * arrowWidth
      );
      this.arrowGraphics.lineTo(
        endX - ux * headLen - perpX * arrowWidth,
        endY - uy * headLen - perpY * arrowWidth
      );
      this.arrowGraphics.closePath();
      this.arrowGraphics.fillPath();
    };

    drawArrowGraphic(0, 0.95);

    this.arrowTween = this.tweens.add({
      targets: { offset: 0, alpha: 0.95 },
      offset: 12,
      alpha: 0.6,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      onUpdate: (tw) => {
        const v = tw.targets[0] as { offset: number; alpha: number };
        drawArrowGraphic(v.offset, v.alpha);
      },
    });
  }

  private clearArrowsAndHighlights() {
    this.highlightTween?.stop();
    this.highlightTween = undefined;
    this.arrowTween?.stop();
    this.arrowTween = undefined;
    this.highlightGraphics.clear();
    this.arrowGraphics.clear();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.tutorialOpen) return;

    const step = TUTORIAL_STEPS[this.tutorialIndex];
    if (!step) return;

    if (step.action === 'info') {
      this.tutorialIndex += 1;
      this.renderTutorialStep();
      return;
    }

    // Find clicked car
    const clickedCar = this.getCarAtPointer(pointer);
    if (!clickedCar) return;

    if (step.carId && clickedCar.config.id !== step.carId) {
      return; // Wrong car
    }

    // Move car in its front direction (where headlights face)
    const direction = this.getFrontDirection(clickedCar);
    
    // Execute move - always move in front direction
    this.tryMoveCar(clickedCar, direction);
  }

  private getCarAtPointer(pointer: Phaser.Input.Pointer): TutorialCar | null {
    for (const car of this.cars.values()) {
      if (car.runtime.removed || !car.container.visible) continue;

      const widthCells = car.config.axis === 'h' ? car.config.length : 1;
      const heightCells = car.config.axis === 'v' ? car.config.length : 1;
      const widthPx = widthCells * this.cellSize - 10;
      const heightPx = heightCells * this.cellSize - 10;
      const left = car.container.x - widthPx / 2;
      const top = car.container.y - heightPx / 2;

      const hit = new Phaser.Geom.Rectangle(left, top, widthPx, heightPx);
      if (hit.contains(pointer.x, pointer.y)) {
        return car;
      }
    }
    return null;
  }

  private getFrontDirection(car: TutorialCar): ParkingJamDirection {
    // Get the car's "front" direction based on headlights (allowedExitDirections[0])
    const { axis, allowedExitDirections } = car.config;
    const defaultForward: ParkingJamDirection = axis === 'h' ? 'right' : 'down';
    let forward = (allowedExitDirections[0] ?? defaultForward) as ParkingJamDirection;
    
    // Validate: horizontal cars can only go left/right, vertical only up/down
    if (axis === 'h' && (forward === 'up' || forward === 'down')) {
      forward = defaultForward;
    }
    if (axis === 'v' && (forward === 'left' || forward === 'right')) {
      forward = defaultForward;
    }
    
    return forward;
  }

  private flashHint(car: TutorialCar, correctDirection: ParkingJamDirection) {
    this.playSfx(this.blockedSfx);
    this.tweens.add({
      targets: car.container,
      x: car.container.x + (correctDirection === 'left' ? -8 : correctDirection === 'right' ? 8 : 0),
      y: car.container.y + (correctDirection === 'up' ? -8 : correctDirection === 'down' ? 8 : 0),
      duration: 50,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.inOut',
    });
  }

  private tryMoveCar(car: TutorialCar, direction: ParkingJamDirection) {
    const slideRange = this.computeSlideRange(car);
    const sign = direction === 'left' || direction === 'up' ? -1 : 1;
    const distance = sign < 0 ? Math.abs(slideRange.minOffset) : slideRange.maxOffset;

    if (distance < 1 && !this.canExitByDirection(car, direction)) {
      this.playSfx(this.blockedSfx);
      return;
    }

    // Apply move
    const offset = sign * Math.max(1, distance);
    if (car.config.axis === 'h') {
      car.runtime.col += offset;
    } else {
      car.runtime.row += offset;
    }

    // Check exit
    if (this.canExitByDirection(car, direction)) {
      this.animateExit(car, direction);
      return;
    }

    this.playSfx(this.moveSfx);
    this.animateMove(car, () => {
      this.tutorialIndex += 1;
      this.renderTutorialStep();
    });
  }

  private computeSlideRange(car: TutorialCar) {
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
      while (runtime.col + config.length - 1 + maxOffset + 1 < this.gridSize) {
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
    while (runtime.row + config.length - 1 + maxOffset + 1 < this.gridSize) {
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

  private canExitByDirection(car: TutorialCar, direction: ParkingJamDirection) {
    const { runtime, config } = car;
    const blocked = this.level.blockedGateSegments;

    if (config.axis === 'h') {
      if (direction === 'left' && runtime.col === 0) {
        return !blocked.some((s) => s.edge === 'left' && s.index === runtime.row);
      }
      if (direction === 'right' && runtime.col + config.length - 1 === this.gridSize - 1) {
        return !blocked.some((s) => s.edge === 'right' && s.index === runtime.row);
      }
    } else {
      if (direction === 'up' && runtime.row === 0) {
        return !blocked.some((s) => s.edge === 'top' && s.index === runtime.col);
      }
      if (direction === 'down' && runtime.row + config.length - 1 === this.gridSize - 1) {
        return !blocked.some((s) => s.edge === 'bottom' && s.index === runtime.col);
      }
    }
    return false;
  }

  private animateMove(car: TutorialCar, onComplete?: () => void) {
    const widthCells = car.config.axis === 'h' ? car.config.length : 1;
    const heightCells = car.config.axis === 'v' ? car.config.length : 1;

    const targetX = this.gridOriginX + (car.runtime.col + widthCells / 2) * this.cellSize;
    const targetY = this.gridOriginY + (car.runtime.row + heightCells / 2) * this.cellSize;

    this.tweens.add({
      targets: car.container,
      x: targetX,
      y: targetY,
      duration: 140,
      ease: 'Sine.out',
      onComplete: () => {
        this.renderCar(car);
        onComplete?.();
      },
    });
  }

  private animateExit(car: TutorialCar, direction: ParkingJamDirection) {
    car.runtime.removed = true;
    this.playSfx(this.exitSfx);

    const distance = this.cellSize * 1.4;
    let x = car.container.x;
    let y = car.container.y;

    if (direction === 'left') x -= distance;
    if (direction === 'right') x += distance;
    if (direction === 'up') y -= distance;
    if (direction === 'down') y += distance;

    this.tweens.add({
      targets: car.container,
      x,
      y,
      alpha: 0,
      duration: 260,
      ease: 'Sine.in',
      onComplete: () => {
        car.container.setVisible(false).setAlpha(1);
        this.tutorialIndex += 1;
        this.renderTutorialStep();
      },
    });
  }

  private completeTutorial() {
    if (this.completed) return;
    this.completed = true;
    this.tutorialOpen = false;

    this.clearArrowsAndHighlights();
    this.playSfx(this.levelPassSfx);
    this.bgMusic?.stop();

    this.titleText.setText('เก่งมาก!');
    this.descText.setText('คุณเข้าใจพื้นฐานแล้ว ไปเล่นด่านถัดไปกันเลย!');
    this.progressText.setText('');

    this.time.delayedCall(1200, () => {
      const onTutorialComplete = this.registry.get('onTutorialComplete');
      if (onTutorialComplete) {
        onTutorialComplete();
      }
    });
  }

  private setupAudio() {
    try {
      this.moveSfx = this.sound.add(SOUND_KEYS.move, { volume: 0.35 });
      this.blockedSfx = this.sound.add(SOUND_KEYS.blocked, { volume: 0.4 });
      this.exitSfx = this.sound.add(SOUND_KEYS.exit, { volume: 0.45 });
      this.levelPassSfx = this.sound.add(SOUND_KEYS.levelPass, { volume: 0.55 });

      const existingBgm = this.sound.get(SOUND_KEYS.bgm);
      if (existingBgm) {
        existingBgm.stop();
        existingBgm.destroy();
      }
      this.bgMusic = this.sound.add(SOUND_KEYS.bgm, { loop: true, volume: 0.22 });
      this.bgMusic.play();
    } catch {
      // Audio is optional
    }
  }

  private playSfx(sound?: Phaser.Sound.BaseSound) {
    if (!sound) return;
    try {
      sound.play();
    } catch {
      // Ignore playback errors
    }
  }

  private cleanupAudio() {
    this.bgMusic?.stop();
    this.bgMusic?.destroy();
    this.bgMusic = undefined;

    this.moveSfx?.destroy();
    this.blockedSfx?.destroy();
    this.exitSfx?.destroy();
    this.levelPassSfx?.destroy();
    this.moveSfx = undefined;
    this.blockedSfx = undefined;
    this.exitSfx = undefined;
    this.levelPassSfx = undefined;
  }
}