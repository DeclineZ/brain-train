import * as Phaser from 'phaser';
import { getParkingJamLevel } from './levels';
import {
  type ParkingJamCarConfig,
  type ParkingJamCarRuntime,
  type ParkingJamDirection,
} from './types';

type TutorialAction = 'info' | 'select_car' | 'confirm_side' | 'move_one_way';
type TapZone = ParkingJamDirection | 'center';
type CarVisualDensity = 'full' | 'medium' | 'compact';

type TutorialStep = {
  id: string;
  title: string;
  description: string;
  action: TutorialAction;
  carId?: string;
  direction?: ParkingJamDirection;
};

interface TutorialCar {
  config: ParkingJamCarConfig;
  runtime: ParkingJamCarRuntime;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  details: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
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
  textMain: '#0f172a',
  textMuted: '#475569',
  accent: 0x22d3ee,
  accentSoft: 0x67e8f9,
  success: 0x16a34a,
  warning: 0xef4444,
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
    description: 'รถที่ไปได้ 2 ทาง จะต้องแตะรถก่อน แล้วค่อยแตะฝั่งที่อยากให้รถไป',
    action: 'info',
  },
  {
    id: 'select-c',
    title: 'ขั้นที่ 1',
    description: 'ลองแตะรถ C ก่อน เพื่อเลือกคันนี้',
    action: 'select_car',
    carId: 'C',
  },
  {
    id: 'confirm-c',
    title: 'ขั้นที่ 2',
    description: 'ดีมาก ตอนนี้แตะครึ่งล่างของรถ C เพื่อให้รถออกทางล่าง',
    action: 'confirm_side',
    carId: 'C',
    direction: 'down',
  },
  {
    id: 'move-b',
    title: 'ขั้นที่ 3',
    description: 'รถ B ไปได้ทางเดียว แตะคันรถครั้งเดียวก็จะวิ่งลงทันที',
    action: 'move_one_way',
    carId: 'B',
    direction: 'down',
  },
  {
    id: 'move-a',
    title: 'ขั้นที่ 4',
    description: 'รถ A ก็เช่นกัน แตะคันรถเพื่อให้วิ่งออก\nทางขวา',
    action: 'move_one_way',
    carId: 'A',
    direction: 'right',
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
  private selectedCarId?: string;

  private boardGraphics!: Phaser.GameObjects.Graphics;
  private arrowGraphics!: Phaser.GameObjects.Graphics;
  private highlightGraphics!: Phaser.GameObjects.Graphics;
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private selectionFeedbackGraphics!: Phaser.GameObjects.Graphics;
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
    this.highlightGraphics = this.add.graphics().setDepth(25);
    this.selectionGraphics = this.add.graphics().setDepth(28);
    this.selectionFeedbackGraphics = this.add.graphics().setDepth(29);
    this.arrowGraphics = this.add.graphics().setDepth(50);

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
      wordWrap: { width: 420 },
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

    const tutorialOverrides: Record<string, Partial<ParkingJamCarConfig>> = {
      A: { allowedExitDirections: ['right'] },
      B: { allowedExitDirections: ['down'] },
    };

    this.level.cars.forEach((config) => {
      const finalConfig = tutorialOverrides[config.id]
        ? { ...config, ...tutorialOverrides[config.id] }
        : config;

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
    this.refreshSelectionOverlay();
    this.renderTutorialStep();
  }

  private getCarVisualDensity(): CarVisualDensity {
    if (this.cellSize <= 52) return 'compact';
    if (this.cellSize <= 66) return 'medium';
    return 'full';
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

    return {
      widthCells,
      heightCells,
      widthPx: Math.max(18, widthCells * this.cellSize - inset),
      heightPx: Math.max(18, heightCells * this.cellSize - inset),
      cornerRadius: density === 'compact' ? 12 : density === 'medium' ? 13 : 14,
      labelInsetX: density === 'compact' ? 8 : density === 'medium' ? 10 : 12,
      labelInsetY: density === 'compact' ? 7 : density === 'medium' ? 9 : 10,
    };
  }

  private drawBoard() {
    const size = this.gridSize;
    const boardSize = this.cellSize * size;
    const blockedCells = new Set((this.level.blockedCells ?? []).map((cell) => `${cell.row},${cell.col}`));

    this.boardGraphics.clear();
    this.boardGraphics.fillStyle(0xffffff, 1);
    this.boardGraphics.fillRoundedRect(this.gridOriginX - 12, this.gridOriginY - 12, boardSize + 24, boardSize + 24, 20);
    this.boardGraphics.lineStyle(4, COLORS.gridBorder, 1);
    this.boardGraphics.strokeRoundedRect(this.gridOriginX - 12, this.gridOriginY - 12, boardSize + 24, boardSize + 24, 20);

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
        if (blockedCells.has(`${row},${col}`)) {
          this.drawConeInCell(row, col);
        }
      }
    }

    for (let index = 0; index < size; index += 1) {
      this.drawGate('left', index);
      this.drawGate('right', index);
      this.drawGate('top', index);
      this.drawGate('bottom', index);
    }
  }

  private drawConeInCell(row: number, col: number) {
    const x = this.gridOriginX + col * this.cellSize;
    const y = this.gridOriginY + row * this.cellSize;
    const centerX = x + this.cellSize * 0.5;
    const centerY = y + this.cellSize * 0.52;
    const coneH = Math.max(16, this.cellSize * 0.56);
    const coneBaseW = Math.max(12, this.cellSize * 0.42);
    const coneTopW = coneBaseW * 0.42;

    this.boardGraphics.fillStyle(0xf97316, 0.98);
    this.boardGraphics.beginPath();
    this.boardGraphics.moveTo(centerX - coneBaseW * 0.5, centerY + coneH * 0.5);
    this.boardGraphics.lineTo(centerX - coneTopW * 0.5, centerY - coneH * 0.5);
    this.boardGraphics.lineTo(centerX + coneTopW * 0.5, centerY - coneH * 0.5);
    this.boardGraphics.lineTo(centerX + coneBaseW * 0.5, centerY + coneH * 0.5);
    this.boardGraphics.closePath();
    this.boardGraphics.fillPath();

    this.boardGraphics.fillStyle(0xffedd5, 0.96);
    const stripeH = Math.max(3, coneH * 0.15);
    this.boardGraphics.fillRoundedRect(
      centerX - coneBaseW * 0.34,
      centerY - coneH * 0.05,
      coneBaseW * 0.68,
      stripeH,
      2
    );
    this.boardGraphics.fillRoundedRect(
      centerX - coneBaseW * 0.28,
      centerY + coneH * 0.2,
      coneBaseW * 0.56,
      stripeH,
      2
    );

    this.boardGraphics.fillStyle(0x7c2d12, 0.28);
    this.boardGraphics.fillEllipse(centerX, centerY + coneH * 0.56, coneBaseW * 0.9, Math.max(4, coneH * 0.16));
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
      this.boardGraphics.fillRoundedRect(this.gridOriginX - gateThickness - 3, this.gridOriginY + index * this.cellSize + gateInset, gateThickness, gateLength, gateRadius);
    } else if (edge === 'right') {
      this.boardGraphics.fillRoundedRect(this.gridOriginX + boardSize + 3, this.gridOriginY + index * this.cellSize + gateInset, gateThickness, gateLength, gateRadius);
    } else if (edge === 'top') {
      this.boardGraphics.fillRoundedRect(this.gridOriginX + index * this.cellSize + gateInset, this.gridOriginY - gateThickness - 3, gateLength, gateThickness, gateRadius);
    } else {
      this.boardGraphics.fillRoundedRect(this.gridOriginX + index * this.cellSize + gateInset, this.gridOriginY + boardSize + 3, gateLength, gateThickness, gateRadius);
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

    this.drawCarDetails(car, widthPx, heightPx);
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

  private drawCarDetails(car: TutorialCar, widthPx: number, heightPx: number) {
    const g = car.details;
    const { carType, axis } = car.config;
    const twoWay = this.isTwoWayCar(car);
    const density = this.getCarVisualDensity();
    g.clear();
    const defaultForward: ParkingJamDirection = axis === 'h' ? 'right' : 'down';
    let forward = (car.config.allowedExitDirections[0] ?? defaultForward) as ParkingJamDirection;
    if (axis === 'h' && (forward === 'up' || forward === 'down')) {
      forward = defaultForward;
    }
    if (axis === 'v' && (forward === 'left' || forward === 'right')) {
      forward = defaultForward;
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
    if (!twoWay) {
      if (axis === 'h') {
        roofX += forward === 'right' ? -roofShiftPx : roofShiftPx;
        roofX = Phaser.Math.Clamp(roofX, -widthPx / 2 + 2, widthPx / 2 - roofWidth - 2);
      } else {
        roofY += forward === 'down' ? -roofShiftPx : roofShiftPx;
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

    const lightThickness = Math.max(6, Math.floor(Math.min(widthPx, heightPx) * 0.18));
    const horizontalLightY = -heightPx * 0.33;
    const horizontalLightHeight = heightPx * 0.31;
    const verticalLightX = -widthPx * 0.33;
    const verticalLightWidth = widthPx * 0.31;
    if (twoWay) {
      g.fillStyle(0xe0f2fe, 0.82);
      if (axis === 'h') {
        const leftX = -widthPx / 2 + 1;
        const rightX = widthPx / 2 - lightThickness - 1;
        g.fillRoundedRect(leftX, horizontalLightY, lightThickness, horizontalLightHeight, 4);
        g.fillRoundedRect(leftX, -horizontalLightY - horizontalLightHeight, lightThickness, horizontalLightHeight, 4);
        g.fillRoundedRect(rightX, horizontalLightY, lightThickness, horizontalLightHeight, 4);
        g.fillRoundedRect(rightX, -horizontalLightY - horizontalLightHeight, lightThickness, horizontalLightHeight, 4);
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
        g.fillRoundedRect(verticalLightX, topY, verticalLightWidth, lightThickness, 4);
        g.fillRoundedRect(-verticalLightX - verticalLightWidth, topY, verticalLightWidth, lightThickness, 4);
        g.fillRoundedRect(verticalLightX, bottomY, verticalLightWidth, lightThickness, 4);
        g.fillRoundedRect(-verticalLightX - verticalLightWidth, bottomY, verticalLightWidth, lightThickness, 4);
        if (density !== 'compact') {
          g.lineStyle(density === 'medium' ? 1.5 : 2, 0xffffff, 0.55);
          g.beginPath();
          g.moveTo(-widthPx * 0.28, 0);
          g.lineTo(widthPx * 0.28, 0);
          g.strokePath();
        }
      }
    } else if (axis === 'h') {
      const frontOnRight = forward === 'right';
      const frontX = frontOnRight ? widthPx / 2 - lightThickness - 1 : -widthPx / 2 + 1;
      const rearX = frontOnRight ? -widthPx / 2 + 1 : widthPx / 2 - lightThickness - 1;
      g.fillStyle(0xfef08a, 0.95);
      g.fillRoundedRect(frontX, horizontalLightY, lightThickness, horizontalLightHeight, 4);
      g.fillRoundedRect(frontX, -horizontalLightY - horizontalLightHeight, lightThickness, horizontalLightHeight, 4);
      const whiteCoreW = Math.max(3, lightThickness - 1);
      const whiteCoreH = Math.max(3, Math.floor(heightPx * 0.12));
      const whiteCoreX = frontX + Math.max(0, Math.floor((lightThickness - whiteCoreW) * 0.5));
      g.fillStyle(0xffffff, 0.92);
      g.fillRoundedRect(whiteCoreX, horizontalLightY + 2, whiteCoreW, whiteCoreH, 2);
      g.fillRoundedRect(whiteCoreX, -horizontalLightY - whiteCoreH - 2, whiteCoreW, whiteCoreH, 2);
      g.fillStyle(0xfda4af, 0.9);
      g.fillRoundedRect(rearX, horizontalLightY, lightThickness, horizontalLightHeight, 4);
      g.fillRoundedRect(rearX, -horizontalLightY - horizontalLightHeight, lightThickness, horizontalLightHeight, 4);
    } else {
      const frontOnBottom = forward === 'down';
      const frontY = frontOnBottom ? heightPx / 2 - lightThickness - 1 : -heightPx / 2 + 1;
      const rearY = frontOnBottom ? -heightPx / 2 + 1 : heightPx / 2 - lightThickness - 1;
      g.fillStyle(0xfef08a, 0.95);
      g.fillRoundedRect(verticalLightX, frontY, verticalLightWidth, lightThickness, 4);
      g.fillRoundedRect(-verticalLightX - verticalLightWidth, frontY, verticalLightWidth, lightThickness, 4);
      const whiteCoreW = Math.max(3, Math.floor(widthPx * 0.12));
      const whiteCoreH = Math.max(3, lightThickness - 1);
      const leftCoreX = verticalLightX + Math.max(0, Math.floor((verticalLightWidth - whiteCoreW) * 0.5));
      const rightCoreX = -verticalLightX - verticalLightWidth + Math.max(0, Math.floor((verticalLightWidth - whiteCoreW) * 0.5));
      const coreY = frontY + Math.max(0, Math.floor((lightThickness - whiteCoreH) * 0.5));
      g.fillStyle(0xffffff, 0.92);
      g.fillRoundedRect(leftCoreX, coreY, whiteCoreW, whiteCoreH, 2);
      g.fillRoundedRect(rightCoreX, coreY, whiteCoreW, whiteCoreH, 2);
      g.fillStyle(0xfda4af, 0.9);
      g.fillRoundedRect(verticalLightX, rearY, verticalLightWidth, lightThickness, 4);
      g.fillRoundedRect(-verticalLightX - verticalLightWidth, rearY, verticalLightWidth, lightThickness, 4);
    }

    g.fillStyle(0xdbeafe, 0.72);
    g.lineStyle(density === 'compact' ? 0.8 : density === 'medium' ? 1 : 1.5, 0xffffff, density === 'compact' ? 0.42 : density === 'medium' ? 0.5 : 0.6);
    if (axis === 'h') {
      if (twoWay) {
        const windshieldWidth = density === 'compact'
          ? Math.max(8, Math.round(widthPx * 0.16))
          : Math.max(8, Math.round(roofWidth * 0.2));
        const windshieldHeight = density === 'compact'
          ? Math.max(10, Math.round(heightPx * 0.5))
          : Math.max(8, roofHeight - 6);
        const frontInset = density === 'compact' ? Math.max(5, Math.round(widthPx * 0.05)) : 4;
        const windshieldY = density === 'compact' ? -windshieldHeight / 2 : roofY + 3;
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
        const windshieldWidth = density === 'compact'
          ? Math.max(8, Math.round(widthPx * 0.16))
          : Math.max(8, Math.round(roofWidth * 0.2));
        const windshieldHeight = density === 'compact'
          ? Math.max(10, Math.round(heightPx * 0.5))
          : Math.max(8, roofHeight - 6);
        const frontInset = density === 'compact' ? Math.max(5, Math.round(widthPx * 0.05)) : 4;
        const windshieldX = density === 'compact'
          ? forward === 'right'
            ? widthPx / 2 - windshieldWidth - frontInset
            : -widthPx / 2 + frontInset
          : forward === 'right'
            ? roofX + roofWidth - windshieldWidth - frontInset
            : roofX + frontInset;
        const windshieldY = density === 'compact' ? -windshieldHeight / 2 : roofY + 3;

        g.fillRoundedRect(windshieldX, windshieldY, windshieldWidth, windshieldHeight, density === 'compact' ? 2 : density === 'medium' ? 2 : 3);
        g.beginPath();
        if (forward === 'right') {
          g.moveTo(windshieldX + 1, windshieldY + 1);
          g.lineTo(windshieldX + windshieldWidth - 1, windshieldY + 4);
        } else {
          g.moveTo(windshieldX + windshieldWidth - 1, windshieldY + 1);
          g.lineTo(windshieldX + 1, windshieldY + 4);
        }
        g.strokePath();
      }
    } else {
      if (twoWay) {
        const windshieldWidth = density === 'compact'
          ? Math.max(10, Math.round(widthPx * 0.5))
          : Math.max(8, roofWidth - 6);
        const windshieldHeight = density === 'compact'
          ? Math.max(8, Math.round(heightPx * 0.16))
          : Math.max(8, Math.round(roofHeight * 0.2));
        const frontInset = density === 'compact' ? Math.max(5, Math.round(heightPx * 0.05)) : 4;
        const windshieldX = density === 'compact' ? -windshieldWidth / 2 : roofX + 3;
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
        const windshieldWidth = density === 'compact'
          ? Math.max(10, Math.round(widthPx * 0.5))
          : Math.max(8, roofWidth - 6);
        const windshieldHeight = density === 'compact'
          ? Math.max(8, Math.round(heightPx * 0.16))
          : Math.max(8, Math.round(roofHeight * 0.2));
        const frontInset = density === 'compact' ? Math.max(5, Math.round(heightPx * 0.05)) : 4;
        const windshieldX = density === 'compact' ? -windshieldWidth / 2 : roofX + 3;
        const windshieldY = density === 'compact'
          ? forward === 'down'
            ? heightPx / 2 - windshieldHeight - frontInset
            : -heightPx / 2 + frontInset
          : forward === 'down'
            ? roofY + roofHeight - windshieldHeight - frontInset
            : roofY + frontInset;

        g.fillRoundedRect(windshieldX, windshieldY, windshieldWidth, windshieldHeight, density === 'compact' ? 2 : density === 'medium' ? 2 : 3);
        g.beginPath();
        if (forward === 'down') {
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
    this.refreshSelectionOverlay();

    if (step.action === 'info') {
      this.startTapToContinueAnimation();
      return;
    }

    this.stopTapToContinueAnimation();
    if (!step.carId) return;

    const car = this.cars.get(step.carId);
    if (!car) return;

    if (step.action === 'select_car') {
      this.highlightCar(step.carId);
      this.drawArrowToCar(step.carId);
      return;
    }

    if (step.action === 'confirm_side' && step.direction) {
      this.selectCar(step.carId);
      this.highlightCar(step.carId);
      this.drawArrowToZone(car, step.direction);
      return;
    }

    if (step.action === 'move_one_way' && step.direction) {
      this.highlightCar(step.carId);
      this.drawArrowToZone(car, step.direction);
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
    const { widthCells, heightCells, widthPx, heightPx } = this.getCarPixelBounds(car.config);

    const drawHighlight = (alpha: number, scale: number) => {
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
      onUpdate: (tween) => {
        const value = tween.targets[0] as { alpha: number; scale: number };
        drawHighlight(value.alpha, value.scale);
      },
    });
  }

  private drawArrowToCar(carId: string) {
    const car = this.cars.get(carId);
    if (!car) return;
    this.drawAnimatedArrow(car.container.x, this.titleText.y + 120, car.container.x, car.container.y - this.cellSize * 0.8);
  }

  private drawArrowToZone(car: TutorialCar, direction: ParkingJamDirection) {
    const { widthPx, heightPx } = this.getCarPixelBounds(car.config);

    let targetX = car.container.x;
    let targetY = car.container.y;
    if (direction === 'left') targetX -= widthPx * 0.28;
    if (direction === 'right') targetX += widthPx * 0.28;
    if (direction === 'up') targetY -= heightPx * 0.28;
    if (direction === 'down') targetY += heightPx * 0.28;

    this.drawAnimatedArrow(targetX, this.titleText.y + 120, targetX, targetY);
  }

  private drawAnimatedArrow(startX: number, startY: number, endX: number, endY: number) {
    this.arrowTween?.stop();

    const draw = (offset: number, alpha: number) => {
      this.arrowGraphics.clear();
      this.arrowGraphics.lineStyle(6, COLORS.accent, alpha);
      this.arrowGraphics.fillStyle(COLORS.accentSoft, alpha);

      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const ux = dx / length;
      const uy = dy / length;
      const perpX = -uy;
      const perpY = ux;
      const animatedStartX = startX + ux * offset;
      const animatedStartY = startY + uy * offset;

      this.arrowGraphics.beginPath();
      this.arrowGraphics.moveTo(animatedStartX, animatedStartY);
      this.arrowGraphics.lineTo(endX, endY);
      this.arrowGraphics.strokePath();

      const headLen = 16;
      const headWidth = 12;
      this.arrowGraphics.beginPath();
      this.arrowGraphics.moveTo(endX, endY);
      this.arrowGraphics.lineTo(endX - ux * headLen + perpX * headWidth, endY - uy * headLen + perpY * headWidth);
      this.arrowGraphics.lineTo(endX - ux * headLen - perpX * headWidth, endY - uy * headLen - perpY * headWidth);
      this.arrowGraphics.closePath();
      this.arrowGraphics.fillPath();
    };

    draw(0, 0.95);
    this.arrowTween = this.tweens.add({
      targets: { offset: 0, alpha: 0.95 },
      offset: 12,
      alpha: 0.6,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      onUpdate: (tween) => {
        const value = tween.targets[0] as { offset: number; alpha: number };
        draw(value.offset, value.alpha);
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

    const car = this.getCarAtPointer(pointer);
    if (!car || !step.carId) {
      this.clearSelectedCar();
      return;
    }

    if (step.action === 'select_car') {
      if (car.config.id !== step.carId || !this.isTwoWayCar(car)) {
        this.flashHint(car, undefined);
        return;
      }
      this.selectCar(car.config.id);
      this.tutorialIndex += 1;
      this.renderTutorialStep();
      return;
    }

    if (step.action === 'confirm_side' && step.direction) {
      if (car.config.id !== step.carId || this.selectedCarId !== step.carId) {
        this.flashHint(car, step.direction);
        return;
      }

      const zone = this.getTapZoneForPointer(car, pointer);
      if (zone !== step.direction) {
        this.flashHint(car, step.direction);
        return;
      }

      this.showSelectionFeedback(car, step.direction, true);
      this.tryMoveCar(car, step.direction);
      return;
    }

    if (step.action === 'move_one_way' && step.direction) {
      if (car.config.id !== step.carId) {
        this.flashHint(car, step.direction);
        return;
      }
      this.clearSelectedCar();
      this.tryMoveCar(car, step.direction);
    }
  }

  private getCarAtPointer(pointer: Phaser.Input.Pointer): TutorialCar | null {
    for (const car of this.cars.values()) {
      if (car.runtime.removed || !car.container.visible) continue;

      const { widthPx, heightPx } = this.getCarPixelBounds(car.config);
      const left = car.container.x - widthPx / 2;
      const top = car.container.y - heightPx / 2;

      if (new Phaser.Geom.Rectangle(left, top, widthPx, heightPx).contains(pointer.x, pointer.y)) {
        return car;
      }
    }
    return null;
  }

  private isTwoWayCar(car: TutorialCar) {
    return car.config.allowedExitDirections.length > 1;
  }

  private getSingleDirection(car: TutorialCar): ParkingJamDirection {
    return car.config.allowedExitDirections[0] ?? (car.config.axis === 'h' ? 'right' : 'down');
  }

  private selectCar(carId: string) {
    this.selectedCarId = carId;
    this.refreshSelectionOverlay();
  }

  private clearSelectedCar() {
    this.selectedCarId = undefined;
    this.selectionGraphics.clear();
  }

  private refreshSelectionOverlay() {
    this.selectionGraphics.clear();
    if (!this.selectedCarId) return;

    const car = this.cars.get(this.selectedCarId);
    if (!car || car.runtime.removed || !this.isTwoWayCar(car)) {
      this.clearSelectedCar();
      return;
    }

    this.renderSelectedOverlay(car);
  }

  private renderSelectedOverlay(car: TutorialCar) {
    this.selectionGraphics.clear();

    const density = this.getCarVisualDensity();
    const { widthPx, heightPx } = this.getCarPixelBounds(car.config);
    const left = car.container.x - widthPx / 2;
    const top = car.container.y - heightPx / 2;
    const centerX = car.container.x;
    const centerY = car.container.y;

    this.selectionGraphics.lineStyle(density === 'compact' ? 2 : 3, COLORS.accent, 0.9);
    this.selectionGraphics.strokeRoundedRect(left - 4, top - 4, widthPx + 8, heightPx + 8, 16);

    const directions = car.config.axis === 'h'
      ? (['left', 'right'] as const)
      : (['up', 'down'] as const);
    directions.forEach((direction) => {
      this.selectionGraphics.fillStyle(COLORS.accentSoft, 0.22);
      if (car.config.axis === 'h') {
        this.selectionGraphics.fillRect(direction === 'left' ? left : centerX, top, widthPx / 2, heightPx);
      } else {
        this.selectionGraphics.fillRect(left, direction === 'up' ? top : centerY, widthPx, heightPx / 2);
      }

      this.selectionGraphics.fillStyle(0x0f766e, 0.95);
      const offset = Math.max(density === 'compact' ? 18 : 22, Math.min(widthPx, heightPx) * (density === 'compact' ? 0.24 : 0.3));
      const arrowX = direction === 'left' ? centerX - offset : direction === 'right' ? centerX + offset : centerX;
      const arrowY = direction === 'up' ? centerY - offset : direction === 'down' ? centerY + offset : centerY;
      this.drawSelectionArrow(this.selectionGraphics, arrowX, arrowY, direction, Math.max(density === 'compact' ? 12 : 15, Math.floor(Math.min(widthPx, heightPx) * (density === 'compact' ? 0.21 : 0.25))));
    });

    this.selectionGraphics.lineStyle(density === 'compact' ? 1.5 : 2, 0xffffff, 0.8);
    if (car.config.axis === 'h') {
      this.selectionGraphics.beginPath();
      this.selectionGraphics.moveTo(centerX, top + 4);
      this.selectionGraphics.lineTo(centerX, top + heightPx - 4);
      this.selectionGraphics.strokePath();
    } else {
      this.selectionGraphics.beginPath();
      this.selectionGraphics.moveTo(left + 4, centerY);
      this.selectionGraphics.lineTo(left + widthPx - 4, centerY);
      this.selectionGraphics.strokePath();
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

  private getTapZoneForPointer(car: TutorialCar, pointer: Phaser.Input.Pointer): TapZone {
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

  private showSelectionFeedback(car: TutorialCar, direction: ParkingJamDirection, success: boolean) {
    const { widthPx, heightPx } = this.getCarPixelBounds(car.config);
    const left = car.container.x - widthPx / 2;
    const top = car.container.y - heightPx / 2;

    const draw = (alpha: number) => {
      this.selectionFeedbackGraphics.clear();
      this.selectionFeedbackGraphics.fillStyle(success ? COLORS.success : COLORS.warning, alpha);
      if (car.config.axis === 'h') {
        this.selectionFeedbackGraphics.fillRect(direction === 'left' ? left : car.container.x, top, widthPx / 2, heightPx);
      } else {
        this.selectionFeedbackGraphics.fillRect(left, direction === 'up' ? top : car.container.y, widthPx, heightPx / 2);
      }
    };

    draw(success ? 0.35 : 0.28);
    this.tweens.addCounter({
      from: success ? 0.35 : 0.28,
      to: 0,
      duration: 220,
      onUpdate: (tween) => draw(tween.getValue() ?? 0),
      onComplete: () => this.selectionFeedbackGraphics.clear(),
    });
  }

  private flashHint(car: TutorialCar, correctDirection?: ParkingJamDirection) {
    this.playSfx(this.blockedSfx);
    if (correctDirection) {
      this.showSelectionFeedback(car, correctDirection, false);
    }
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
      this.showSelectionFeedback(car, direction, false);
      return;
    }

    const offset = sign * Math.max(1, distance);
    if (car.config.axis === 'h') {
      car.runtime.col += offset;
    } else {
      car.runtime.row += offset;
    }

    this.clearSelectedCar();

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
    (this.level.blockedCells ?? []).forEach((cell) => {
      occupied.add(`${cell.row},${cell.col}`);
    });
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

    let x = car.container.x;
    let y = car.container.y;
    const distance = this.cellSize * 1.4;
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
    this.clearSelectedCar();
    this.clearArrowsAndHighlights();
    this.playSfx(this.levelPassSfx);
    this.bgMusic?.stop();

    this.titleText.setText('เก่งมาก!');
    this.descText.setText('ตอนนี้คุณแยกได้แล้วว่ารถ 2 ทางต้องเลือกฝั่ง ส่วนรถทางเดียวแตะครั้งเดียวก็วิ่ง');
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
      // Audio is optional.
    }
  }

  private playSfx(sound?: Phaser.Sound.BaseSound) {
    if (!sound) return;
    try {
      sound.play();
    } catch {
      // Ignore playback errors.
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
    this.moveSfx = undefined;
    this.blockedSfx = undefined;
    this.exitSfx = undefined;
    this.levelPassSfx = undefined;
  }
}
