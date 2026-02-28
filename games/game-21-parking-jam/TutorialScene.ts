import * as Phaser from 'phaser';

type TutorialCar = {
  id: string;
  axis: 'h' | 'v';
  length: 2;
  row: number;
  col: number;
  color: number;
  removed: boolean;
  container: Phaser.GameObjects.Container;
};

interface DragState {
  carId: string;
  startPointerX: number;
  startPointerY: number;
  startRow: number;
  startCol: number;
  minOffset: number;
  maxOffset: number;
  rawOffset: number;
}

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

export class ParkingJamTutorialScene extends Phaser.Scene {
  private gridSize = 5;
  private cellSize = 70;
  private gridOriginX = 0;
  private gridOriginY = 0;

  private cars = new Map<string, TutorialCar>();
  private drag: DragState | null = null;

  private boardGraphics!: Phaser.GameObjects.Graphics;
  private tipText!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;
  private pulseRing?: Phaser.GameObjects.Graphics;
  private pulseTween?: Phaser.Tweens.Tween;

  private moveSfx?: Phaser.Sound.BaseSound;
  private blockedSfx?: Phaser.Sound.BaseSound;
  private exitSfx?: Phaser.Sound.BaseSound;
  private levelPassSfx?: Phaser.Sound.BaseSound;
  private bgMusic?: Phaser.Sound.BaseSound;

  private started = false;
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
    this.cameras.main.setBackgroundColor(0xf3f8fb);
    this.setupAudio();

    this.boardGraphics = this.add.graphics();
    this.tipText = this.add.text(0, 14, 'ลากรถ แล้วออกทางประตูที่เปิด', {
      fontSize: '28px',
      color: '#0f172a',
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      fontStyle: '700',
    }).setOrigin(0.5, 0);

    this.subText = this.add.text(0, 54, 'เริ่มจากรถที่ไฮไลต์ไว้ก่อน', {
      fontSize: '20px',
      color: '#475569',
      fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
      fontStyle: '700',
    }).setOrigin(0.5, 0);

    this.createCars();
    this.layout();
    this.highlightCar('A');

    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.scale.on('resize', this.layout, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointermove', this.handlePointerMove, this);
      this.input.off('pointerup', this.handlePointerUp, this);
      this.scale.off('resize', this.layout, this);
      this.cleanupAudio();
    });
  }

  private createCars() {
    this.cars.forEach((car) => car.container.destroy());
    this.cars.clear();

    const seed = [
      { id: 'A', axis: 'h' as const, row: 2, col: 1, color: 0xf97316 },
      { id: 'B', axis: 'v' as const, row: 0, col: 0, color: 0x0ea5e9 },
      { id: 'C', axis: 'v' as const, row: 1, col: 3, color: 0x84cc16 },
    ];

    seed.forEach((item) => {
      const container = this.add.container(0, 0).setDepth(20);
      const bg = this.add.graphics();
      const label = this.add.text(0, 0, item.id, {
        fontSize: '18px',
        color: '#0f172a',
        fontFamily: 'Sarabun, Noto Sans Thai, sans-serif',
        fontStyle: '700',
      }).setOrigin(0.5);

      container.add([bg, label]);
      container.setInteractive(new Phaser.Geom.Rectangle(-80, -80, 160, 160), Phaser.Geom.Rectangle.Contains);
      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.startDrag(item.id, pointer));

      const car: TutorialCar = {
        id: item.id,
        axis: item.axis,
        length: 2,
        row: item.row,
        col: item.col,
        color: item.color,
        removed: false,
        container,
      };

      this.cars.set(item.id, car);
    });
  }

  private layout() {
    const { width, height } = this.scale;

    this.tipText.setPosition(width / 2, 14);
    this.subText.setPosition(width / 2, 54);

    this.cellSize = Math.floor(Math.min((width * 0.86) / this.gridSize, (height * 0.6) / this.gridSize));
    const boardSize = this.cellSize * this.gridSize;
    this.gridOriginX = Math.floor((width - boardSize) / 2);
    this.gridOriginY = Math.floor((height - boardSize) / 2 + 28);

    this.drawBoard();
    this.renderCars();
    this.updatePulsePosition();
  }

  private drawBoard() {
    const size = this.gridSize;
    const boardSize = this.cellSize * size;

    this.boardGraphics.clear();
    this.boardGraphics.fillStyle(0xffffff, 1);
    this.boardGraphics.fillRoundedRect(this.gridOriginX - 8, this.gridOriginY - 8, boardSize + 16, boardSize + 16, 16);
    this.boardGraphics.lineStyle(3, 0xb7cad8, 1);
    this.boardGraphics.strokeRoundedRect(this.gridOriginX - 8, this.gridOriginY - 8, boardSize + 16, boardSize + 16, 16);

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        this.boardGraphics.fillStyle(0xf8fbfd, 1);
        this.boardGraphics.fillRect(this.gridOriginX + col * this.cellSize, this.gridOriginY + row * this.cellSize, this.cellSize, this.cellSize);
        this.boardGraphics.lineStyle(1, 0xd9e6ef, 1);
        this.boardGraphics.strokeRect(this.gridOriginX + col * this.cellSize, this.gridOriginY + row * this.cellSize, this.cellSize, this.cellSize);
      }
    }

    for (let i = 0; i < size; i += 1) {
      this.boardGraphics.fillStyle(0x7dd3fc, 0.65);
      this.boardGraphics.fillRoundedRect(this.gridOriginX + i * this.cellSize + 8, this.gridOriginY - 6, this.cellSize - 16, 5, 4);
      this.boardGraphics.fillRoundedRect(this.gridOriginX + i * this.cellSize + 8, this.gridOriginY + boardSize + 1, this.cellSize - 16, 5, 4);
      this.boardGraphics.fillRoundedRect(this.gridOriginX - 6, this.gridOriginY + i * this.cellSize + 8, 5, this.cellSize - 16, 4);
      this.boardGraphics.fillRoundedRect(this.gridOriginX + boardSize + 1, this.gridOriginY + i * this.cellSize + 8, 5, this.cellSize - 16, 4);
    }
  }

  private renderCars() {
    this.cars.forEach((car) => {
      if (car.removed) {
        car.container.setVisible(false);
        return;
      }

      const widthCells = car.axis === 'h' ? car.length : 1;
      const heightCells = car.axis === 'v' ? car.length : 1;
      const widthPx = widthCells * this.cellSize - 10;
      const heightPx = heightCells * this.cellSize - 10;

      const bg = car.container.list[0] as Phaser.GameObjects.Graphics;
      const label = car.container.list[1] as Phaser.GameObjects.Text;

      bg.clear();
      bg.fillStyle(car.color, 1);
      bg.fillRoundedRect(-widthPx / 2, -heightPx / 2, widthPx, heightPx, 14);
      bg.lineStyle(2, 0x0f172a, 0.28);
      bg.strokeRoundedRect(-widthPx / 2, -heightPx / 2, widthPx, heightPx, 14);

      label.setPosition(-widthPx / 2 + 12, -heightPx / 2 + 10).setOrigin(0, 0);

      const centerX = this.gridOriginX + (car.col + widthCells / 2) * this.cellSize;
      const centerY = this.gridOriginY + (car.row + heightCells / 2) * this.cellSize;
      car.container.setPosition(centerX, centerY).setVisible(true);
    });
  }

  private startDrag(carId: string, pointer: Phaser.Input.Pointer) {
    if (this.completed) return;
    const car = this.cars.get(carId);
    if (!car || car.removed) return;

    const occupied = this.getOccupied(carId);
    let minOffset = 0;
    let maxOffset = 0;

    if (car.axis === 'h') {
      while (car.col - (Math.abs(minOffset) + 1) >= 0 && !occupied.has(`${car.row},${car.col - (Math.abs(minOffset) + 1)}`)) {
        minOffset -= 1;
      }
      while (car.col + car.length - 1 + maxOffset + 1 < this.gridSize && !occupied.has(`${car.row},${car.col + car.length - 1 + maxOffset + 1}`)) {
        maxOffset += 1;
      }
    } else {
      while (car.row - (Math.abs(minOffset) + 1) >= 0 && !occupied.has(`${car.row - (Math.abs(minOffset) + 1)},${car.col}`)) {
        minOffset -= 1;
      }
      while (car.row + car.length - 1 + maxOffset + 1 < this.gridSize && !occupied.has(`${car.row + car.length - 1 + maxOffset + 1},${car.col}`)) {
        maxOffset += 1;
      }
    }

    this.drag = {
      carId,
      startPointerX: pointer.x,
      startPointerY: pointer.y,
      startRow: car.row,
      startCol: car.col,
      minOffset,
      maxOffset,
      rawOffset: 0,
    };

    if (!this.started) {
      this.started = true;
      this.subText.setText('เยี่ยมมาก! ลองพารถออกจากขอบ');
      this.clearPulse();
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.drag) return;
    const car = this.cars.get(this.drag.carId);
    if (!car) return;

    const raw = car.axis === 'h'
      ? (pointer.x - this.drag.startPointerX) / this.cellSize
      : (pointer.y - this.drag.startPointerY) / this.cellSize;

    const clamped = Phaser.Math.Clamp(raw, this.drag.minOffset, this.drag.maxOffset);
    this.drag.rawOffset = clamped;

    const widthCells = car.axis === 'h' ? car.length : 1;
    const heightCells = car.axis === 'v' ? car.length : 1;
    const baseX = this.gridOriginX + (this.drag.startCol + widthCells / 2) * this.cellSize;
    const baseY = this.gridOriginY + (this.drag.startRow + heightCells / 2) * this.cellSize;

    if (car.axis === 'h') car.container.setPosition(baseX + clamped * this.cellSize, baseY);
    else car.container.setPosition(baseX, baseY + clamped * this.cellSize);
  }

  private handlePointerUp() {
    if (!this.drag) return;

    const drag = this.drag;
    this.drag = null;

    const car = this.cars.get(drag.carId);
    if (!car) return;

    const snapped = Phaser.Math.Clamp(Math.round(drag.rawOffset), drag.minOffset, drag.maxOffset);
    if (snapped !== 0) {
      this.playSfx(this.moveSfx);
      if (car.axis === 'h') car.col += snapped;
      else car.row += snapped;

      if (this.canExit(car, snapped)) {
        this.exitCar(car, snapped);
        return;
      }
    } else {
      this.playSfx(this.blockedSfx);
    }

    this.renderCars();
    this.updatePulsePosition();
  }

  private canExit(car: TutorialCar, snapped: number) {
    if (car.axis === 'h') {
      if (snapped < 0 && car.col === 0) return true;
      if (snapped > 0 && car.col + car.length - 1 === this.gridSize - 1) return true;
      return false;
    }

    if (snapped < 0 && car.row === 0) return true;
    if (snapped > 0 && car.row + car.length - 1 === this.gridSize - 1) return true;
    return false;
  }

  private exitCar(car: TutorialCar, snapped: number) {
    if (this.completed) return;

    car.removed = true;
    this.playSfx(this.exitSfx);
    let x = car.container.x;
    let y = car.container.y;
    const distance = this.cellSize * 1.4;

    if (car.axis === 'h') x += snapped < 0 ? -distance : distance;
    else y += snapped < 0 ? -distance : distance;

    this.tweens.add({
      targets: car.container,
      x,
      y,
      alpha: 0,
      duration: 260,
      ease: 'Sine.in',
      onComplete: () => {
        car.container.setVisible(false);
        this.completeTutorial();
      },
    });
  }

  private completeTutorial() {
    if (this.completed) return;
    this.completed = true;
    this.playSfx(this.levelPassSfx);
    this.bgMusic?.stop();
    this.subText.setText('เก่งมาก! เคลียร์ที่เหลือแบบนี้ได้เลย');

    this.time.delayedCall(850, () => {
      const onTutorialComplete = this.registry.get('onTutorialComplete');
      if (onTutorialComplete) {
        onTutorialComplete();
      }
    });
  }

  private highlightCar(carId: string) {
    this.clearPulse();

    const car = this.cars.get(carId);
    if (!car) return;

    this.pulseRing = this.add.graphics().setDepth(25);
    this.drawPulseRing(car);

    this.pulseTween = this.tweens.add({
      targets: this.pulseRing,
      alpha: 0.2,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      onYoyo: () => this.drawPulseRing(car),
      onRepeat: () => this.drawPulseRing(car),
    });
  }

  private updatePulsePosition() {
    if (!this.pulseRing || this.completed) return;
    const car = this.cars.get('A');
    if (!car || car.removed) return;
    this.drawPulseRing(car);
  }

  private drawPulseRing(car: TutorialCar) {
    if (!this.pulseRing) return;

    const widthCells = car.axis === 'h' ? car.length : 1;
    const heightCells = car.axis === 'v' ? car.length : 1;
    const widthPx = widthCells * this.cellSize;
    const heightPx = heightCells * this.cellSize;

    const centerX = this.gridOriginX + (car.col + widthCells / 2) * this.cellSize;
    const centerY = this.gridOriginY + (car.row + heightCells / 2) * this.cellSize;

    this.pulseRing.clear();
    this.pulseRing.lineStyle(4, 0x22d3ee, 0.95);
    this.pulseRing.strokeRoundedRect(centerX - widthPx / 2 + 3, centerY - heightPx / 2 + 3, widthPx - 6, heightPx - 6, 16);
  }

  private clearPulse() {
    this.pulseTween?.stop();
    this.pulseTween = undefined;
    this.pulseRing?.destroy();
    this.pulseRing = undefined;
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

  private getOccupied(skipId: string) {
    const occupied = new Set<string>();
    this.cars.forEach((car) => {
      if (car.id === skipId || car.removed) return;
      const w = car.axis === 'h' ? car.length : 1;
      const h = car.axis === 'v' ? car.length : 1;
      for (let r = 0; r < h; r += 1) {
        for (let c = 0; c < w; c += 1) {
          occupied.add(`${car.row + r},${car.col + c}`);
        }
      }
    });
    return occupied;
  }
}
