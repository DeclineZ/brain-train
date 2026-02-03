import * as Phaser from 'phaser';
import { TUBE_SORT_COLORS } from './levels';

type TubeData = {
  container: Phaser.GameObjects.Container;
  outline: Phaser.GameObjects.Graphics;
  glass: Phaser.GameObjects.Graphics;
  shine: Phaser.GameObjects.Graphics;
  shadow: Phaser.GameObjects.Graphics;
  elements: Phaser.GameObjects.GameObject[];
  index: number;
};

type BallState = {
  id: number;
  hasMoveLimit: boolean;
  remainingMoves: number | null;
  frozenUntil: number;
};

type TubeSortTheme = {
  background: number;
  glowA: number;
  glowB: number;
  glowC: number;
  tubeStroke: number;
  tubeFill: number;
  tubeHighlight: number;
  accent: number;
  text: string;
  softText: string;
};

type TubeLayoutMetrics = {
  tubeWidth: number;
  tubeHeight: number;
  elementRadius: number;
  elementGap: number;
  spacingX: number;
  spacingY: number;
  startX: number;
  startY: number;
  rows: number;
  cols: number;
};

export class TubeSortTutorialScene extends Phaser.Scene {
  private tubes: TubeData[] = [];
  private tubeState: number[][] = [];
  private selectedTubeIndex: number | null = null;
  private completedTubes = new Set<number>();
  private tubeBallIds: number[][] = [];
  private ballStates = new Map<number, BallState>();
  private nextBallId = 0;
  private particleTextureKey = 'tube-sort-particle';
  private theme: TubeSortTheme = {
    background: 0xF5F7FF,
    glowA: 0xEEF2FF,
    glowB: 0xF8FAFC,
    glowC: 0xE0F2FE,
    tubeStroke: 0xCBD5F5,
    tubeFill: 0xFFFFFF,
    tubeHighlight: 0xFFFFFF,
    accent: 0x38BDF8,
    text: '#1E293B',
    softText: '#64748B'
  };

  private messageText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private background?: Phaser.GameObjects.Rectangle;
  private backgroundGlow?: Phaser.GameObjects.Graphics;
  private tubeLayout: TubeLayoutMetrics = {
    tubeWidth: 80,
    tubeHeight: 220,
    elementRadius: 24,
    elementGap: 6,
    spacingX: 120,
    spacingY: 280,
    startX: 0,
    startY: 0,
    rows: 1,
    cols: 1
  };

  private tutorialStep = 0;
  private tutorialPanel!: Phaser.GameObjects.Graphics;
  private tutorialText!: Phaser.GameObjects.Text;
  private continueText!: Phaser.GameObjects.Text;
  private stepText!: Phaser.GameObjects.Text;
  private skipButton!: Phaser.GameObjects.Text;
  private arrowGraphic!: Phaser.GameObjects.Graphics;
  private highlightRing!: Phaser.GameObjects.Graphics;
  private ballHighlight?: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Rectangle;
  private isInteractiveStep = false;
  private canAdvance = true;
  private level = 1;
  private hasShownMoveLimit = false;
  private hasShownFreeze = false;
  private moveLimitBallId?: number;
  private frozenBallId?: number;

  private tutorialState: number[][] = [
    [0, 0, 1, 1],
    [1, 1, 1],
    [],
    [0, 0, 0]
  ];

  private readonly tutorialSteps = [
    'เป้าหมายคือจัดสี\nให้เหมือนกันในแต่ละหลอด',
    'แตะหลอดที่ต้องการย้าย',
    'แตะหลอดปลายทางเพื่อเทลูกบอล',
    'เทได้เมื่อสีเหมือนกัน\nหรือหลอดปลายทางว่าง',
    'เยี่ยม! หลอดนี้เสร็จแล้ว',
    'บางลูกมีเลขจำกัดการย้าย\nหมดเลข = ไม่สามารถย้ายได้',
    'พ่อมดน้ำแข็งจะหยุดลูกบอลชั่วคราว\nรอจนละลายก่อนย้าย',
    'เรียบร้อยแล้ว!\nพร้อมเริ่มเล่นเกมจริง'
  ];

  constructor() {
    super({ key: 'TubeSortTutorialScene' });
  }

  preload() {
    this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
  }

  create(data: { level?: number }) {
    const regLevel = this.registry.get('level');
    this.level = data.level || regLevel || 1;

    this.createBackground();
    this.createParticleTexture();
    this.createTutorialUI();
    this.createPuzzle();
    this.layoutTubes();
    this.updateProgressUI();
    this.startTutorial();

    this.scale.on('resize', () => {
      this.layoutTubes();
      this.layoutTutorialUI();
      this.renderTubes();
      this.updateTutorialVisuals();
    });
  }

  private createBackground() {
    const { width, height } = this.scale;
    this.background = this.add.rectangle(width / 2, height / 2, width, height, this.theme.background);
    this.background.setDepth(-10);

    this.backgroundGlow = this.add.graphics();
    this.backgroundGlow.fillGradientStyle(this.theme.glowA, this.theme.glowB, this.theme.glowC, this.theme.glowB, 0.85);
    this.backgroundGlow.fillRoundedRect(width * 0.1, height * 0.15, width * 0.8, height * 0.7, 32);
    this.backgroundGlow.setDepth(-9);
  }

  private createTutorialUI() {
    const { width, height } = this.scale;

    this.messageText = this.add.text(width / 2, 120, 'จัดเรียงสีให้เหมือนกัน', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '28px',
      color: this.theme.text,
      fontStyle: 'bold',
      padding: { top: 6, bottom: 6, left: 12, right: 12 }
    }).setOrigin(0.5);

    this.progressBar = this.add.graphics();
    this.progressText = this.add.text(width / 2, height -80, '0% สำเร็จ', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '16px',
      color: this.theme.softText,
      padding: { top: 4, bottom: 4, left: 8, right: 8 }
    }).setOrigin(0.5);

    this.tutorialPanel = this.add.graphics();
    this.tutorialText = this.add.text(width / 2, height - 150, '', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '24px',
      color: '#2C3E50',
      align: 'center',
      wordWrap: { width: width * 0.8 },
      padding: { top: 10, bottom: 10, left: 14, right: 14 }
    }).setOrigin(0.5).setDepth(210);

    this.continueText = this.add.text(width / 2, height - 90, 'แตะเพื่อไปต่อ', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '20px',
      color: '#64748B'
    }).setOrigin(0.5).setDepth(210);

    this.stepText = this.add.text(30, 24, `ขั้นตอน 1/${this.tutorialSteps.length}`, {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '18px',
      color: this.theme.softText,
      fontStyle: 'bold'
    }).setOrigin(0, 0).setDepth(210);

    this.skipButton = this.add.text(width - 24, 20, 'ข้าม', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      backgroundColor: '#F97316',
      padding: { left: 14, right: 14, top: 8, bottom: 8 }
    }).setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(210);

    this.skipButton.on('pointerdown', () => this.startGame());

    this.arrowGraphic = this.add.graphics();
    this.arrowGraphic.setDepth(220);

    this.highlightRing = this.add.graphics();
    this.highlightRing.setDepth(215);

    this.ballHighlight = this.add.graphics();
    this.ballHighlight.setDepth(216);

    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(205)
      .setInteractive();

    this.overlay.on('pointerdown', () => {
      if (!this.canAdvance || this.isInteractiveStep) return;
      if (this.tutorialStep >= this.tutorialSteps.length - 1) {
        return;
      }
      this.nextTutorialStep();
    });

    this.tweens.add({
      targets: this.continueText,
      alpha: 0.4,
      duration: 900,
      yoyo: true,
      repeat: -1
    });

    this.game.events.emit('tutorial-show-next-btn', false);
    this.layoutTutorialUI();
  }

  private layoutTutorialUI() {
    const { width, height } = this.scale;
    const panelWidth = Math.min(640, width * 0.88);
    const panelHeight = 140;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height - panelHeight - 100;

    this.tutorialPanel.clear();
    this.tutorialPanel.fillStyle(0xffffff, 0.96);
    this.tutorialPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 18);
    this.tutorialPanel.lineStyle(3, 0x93C5FD, 0.8);
    this.tutorialPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 18);
    this.tutorialPanel.setDepth(208);

    this.tutorialText.setPosition(width / 2, panelY + panelHeight / 2 - 10);
    this.continueText.setPosition(width / 2, panelY + panelHeight - 24);
    this.stepText.setPosition(24, 20);
    this.skipButton.setPosition(width - 24, 20);

    this.overlay.setPosition(width / 2, height / 2);
    this.overlay.setSize(width, height);
  }

  private computeLayoutMetrics() {
    const { width, height } = this.scale;
    const tubeCount = this.tubeState.length;
    const tubeCapacity = 4;

    const rows = tubeCount > 6 ? 2 : 1;
    const cols = rows === 1 ? tubeCount : Math.ceil(tubeCount / 2);

    const topPadding = 130;
    const bottomPadding = 220;
    const availableW = width * 0.84;
    const availableH = Math.max(220, height - topPadding - bottomPadding);

    const tubeWidth = Math.max(52, Math.min(96, availableW / (cols + 0.6)));
    const tubeHeight = Math.max(170, Math.min(235, availableH / rows));

    const elementGap = Math.max(4, Math.min(8, tubeWidth * 0.08));
    const maxRadiusFromHeight = (tubeHeight - 24 - elementGap * (tubeCapacity - 1)) / (tubeCapacity * 2);
    const elementRadius = Math.max(12, Math.min(tubeWidth * 0.32, maxRadiusFromHeight));

    const rawSpacingX = cols > 1 ? (availableW - tubeWidth) / (cols - 1) : 0;
    const minSpacingX = 40;
    const maxSpacingX = 100;
    const spacingX = cols > 1
      ? Math.min(maxSpacingX, Math.max(rawSpacingX, minSpacingX))
      : 0;
    const spacingY = tubeHeight + tubeHeight * 0.12;
    const gridHeight = tubeHeight + (rows - 1) * spacingY;
    const startX = width / 2 - (cols - 1) * spacingX / 2;
    const startY = topPadding + (availableH - gridHeight) / 2 + tubeHeight / 2;

    this.tubeLayout = {
      tubeWidth,
      tubeHeight,
      elementRadius,
      elementGap,
      spacingX,
      spacingY,
      startX,
      startY,
      rows,
      cols
    };
  }

  private createPuzzle() {
    this.tubeState = this.tutorialState.map(tube => [...tube]);
    this.initializeBallStates();

    for (let i = 0; i < this.tubeState.length; i++) {
      const container = this.add.container(0, 0);
      const shadow = this.add.graphics();
      const glass = this.add.graphics();
      const outline = this.add.graphics();
      const shine = this.add.graphics();
      container.add(shadow);
      container.add(glass);
      container.add(outline);
      container.add(shine);

      const tube: TubeData = {
        container,
        outline,
        glass,
        shine,
        shadow,
        elements: [],
        index: i
      };

      container.setSize(90, 240);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => this.handleTubeTap(i));
      this.tubes.push(tube);
    }

    this.renderTubes();
  }

  private renderTubes() {
    const tubeCapacity = 4;
    const { tubeWidth, tubeHeight, elementRadius, elementGap } = this.tubeLayout;

    this.tubes.forEach((tube, index) => {
      tube.container.setSize(tubeWidth, tubeHeight);
      tube.shadow.clear();
      tube.glass.clear();
      tube.outline.clear();
      tube.shine.clear();

      const isSelected = this.selectedTubeIndex === index;
      const strokeColor = isSelected ? this.theme.accent : this.theme.tubeStroke;

      tube.shadow.fillStyle(0x0, 0.12);
      tube.shadow.fillRoundedRect(-tubeWidth / 2 + 6, -tubeHeight / 2 + 8, tubeWidth, tubeHeight, 22);

      tube.glass.fillStyle(this.theme.tubeFill, 0.18);
      tube.glass.fillRoundedRect(-tubeWidth / 2, -tubeHeight / 2, tubeWidth, tubeHeight, 20);
      tube.glass.lineStyle(3, strokeColor, 0.85);
      tube.glass.strokeRoundedRect(-tubeWidth / 2, -tubeHeight / 2, tubeWidth, tubeHeight, 20);

      tube.outline.lineStyle(2, 0xFFFFFF, 0.5);
      tube.outline.strokeRoundedRect(-tubeWidth / 2 + 4, -tubeHeight / 2 + 4, tubeWidth - 8, tubeHeight - 8, 18);

      tube.shine.lineStyle(2, this.theme.tubeHighlight, 0.35);
      tube.shine.strokeRoundedRect(-tubeWidth / 2 + 10, -tubeHeight / 2 + 12, tubeWidth * 0.28, tubeHeight - 24, 16);

      tube.elements.forEach(element => element.destroy());
      tube.elements = [];

      const stack = this.tubeState[index] || [];
      const topBallOutsideOffset = elementRadius * 2.4;
      const topBallOutsideY = -tubeHeight / 2 - elementRadius * 0.2;
      stack.forEach((type, stackIndex) => {
        const color = TUBE_SORT_COLORS[type % TUBE_SORT_COLORS.length];
        const textureKey = this.getBallTexture(color);
        const element = this.add.image(0, 0, textureKey);
        element.setDisplaySize(elementRadius * 2, elementRadius * 2);
        element.setOrigin(0.5);
        const y = tubeHeight / 2 - elementRadius - stackIndex * (elementRadius * 2 + elementGap);
        if (isSelected && stackIndex === stack.length - 1) {
          element.setPosition(0, topBallOutsideY - topBallOutsideOffset);
        } else {
          element.setPosition(0, y - 6);
        }
        const ballId = this.tubeBallIds[index]?.[stackIndex];
        const ballState = ballId !== undefined ? this.ballStates.get(ballId) : undefined;
        const isFrozen = this.isBallFrozen(ballState);
        tube.container.add(element);
        tube.elements.push(element);

        if (ballState?.hasMoveLimit) {
          const badgeLabel = this.createMoveCounterVisual(
            tube.container,
            element.x,
            element.y,
            elementRadius,
            Math.max(ballState.remainingMoves ?? 0, 0)
          );
          tube.elements.push(badgeLabel);
        }

        if (isFrozen) {
          const iceElements = this.createIceOverlay(tube.container, element.x, element.y, elementRadius);
          tube.elements.push(...iceElements);
        }
      });

      const emptySlots = tubeCapacity - stack.length;
      for (let i = 0; i < emptySlots; i++) {
        const y = tubeHeight / 2 - elementRadius - (stack.length + i) * (elementRadius * 2 + elementGap);
        const ghost = this.add.circle(0, y - 6, elementRadius, 0xE2E8F0, 0.25);
        ghost.setStrokeStyle(1, 0xCBD5F5, 0.4);
        ghost.setOrigin(0.5);
        tube.container.add(ghost);
        tube.elements.push(ghost);
      }
    });
  }

  private getBallTexture(color: number) {
    const key = `tube-sort-ball-${color}`;
    if (this.textures.exists(key)) return key;

    const size = 64;
    const canvas = this.textures.createCanvas(key, size, size);
    if (!canvas) return key;
    const ctx = canvas.getContext();
    if (!ctx) return key;
    const base = Phaser.Display.Color.IntegerToColor(color);
    const highlight = Phaser.Display.Color.IntegerToColor(0xffffff);
    const dark = new Phaser.Display.Color(
      Math.max(0, base.red - 40),
      Math.max(0, base.green - 40),
      Math.max(0, base.blue - 40)
    );

    const gradient = ctx.createRadialGradient(size * 0.35, size * 0.35, size * 0.1, size * 0.5, size * 0.5, size * 0.45);
    gradient.addColorStop(0, `rgba(${highlight.red}, ${highlight.green}, ${highlight.blue}, 0.9)`);
    gradient.addColorStop(0.35, `rgba(${base.red}, ${base.green}, ${base.blue}, 0.95)`);
    gradient.addColorStop(1, `rgba(${dark.red}, ${dark.green}, ${dark.blue}, 0.95)`);

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(size * 0.32, size * 0.3, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    canvas.refresh();
    return key;
  }

  private layoutTubes() {
    this.computeLayoutMetrics();
    const { rows, cols, spacingX, spacingY, startX, startY } = this.tubeLayout;

    this.tubes.forEach((tube, index) => {
      const row = rows === 1 ? 0 : Math.floor(index / cols);
      const col = rows === 1 ? index : index % cols;
      tube.container.setPosition(startX + col * spacingX, startY + row * spacingY);
    });

    if (this.tubes.length > 0) {
      this.renderTubes();
    }
  }

  private handleTubeTap(index: number) {
    if (!this.isInteractiveStep) return;

    if (this.tutorialStep === 1) {
      if (index !== 0) {
        this.flashMessage('ลองแตะหลอดที่มีสีด้านซ้าย');
        return;
      }
      this.selectedTubeIndex = index;
      this.renderTubes();
      this.pulseTube(index);
      this.isInteractiveStep = false;
      this.canAdvance = false;
      this.time.delayedCall(600, () => {
        this.tutorialStep = 2;
        this.showTutorialStep();
      });
      return;
    }

    if (this.tutorialStep === 2) {
      if (index !== 1) {
        this.flashMessage('แตะหลอดที่มีสีเดียวกันตรงกลาง');
        return;
      }
      const from = this.selectedTubeIndex ?? 0;
      const prevState = this.tubeState.map(tube => [...tube]);
      const result = this.performPourWithIds(prevState, this.tubeBallIds, from, index, 4);
      if (!result) return;
      this.tubeState = result.state;
      this.tubeBallIds = result.ids;
      this.selectedTubeIndex = null;
      this.renderTubes();
      this.animatePour(from, index, prevState, result.state, true);
      this.updateProgressUI();
      this.isInteractiveStep = false;
      this.canAdvance = false;
      this.time.delayedCall(600, () => {
        this.tutorialStep = 3;
        this.showTutorialStep();
      });
    }
  }

  private performPour(state: number[][], from: number, to: number, tubeCapacity: number) {
    const source = state[from];
    const destination = state[to];
    if (!source || !destination) return null;
    if (source.length === 0) return null;
    if (destination.length >= tubeCapacity) return null;

    const next = state.map(tube => [...tube]);
    const element = next[from].pop();
    if (element === undefined) return null;
    next[to].push(element);
    return next;
  }

  private performPourWithIds(
    state: number[][],
    ids: number[][],
    from: number,
    to: number,
    tubeCapacity: number
  ) {
    const source = state[from];
    const destination = state[to];
    const sourceIds = ids[from];
    const destinationIds = ids[to];
    if (!source || !destination || !sourceIds || !destinationIds) return null;
    if (source.length === 0) return null;
    if (destination.length >= tubeCapacity) return null;

    const nextState = state.map(tube => [...tube]);
    const nextIds = ids.map(tube => [...tube]);
    const element = nextState[from].pop();
    const ballId = nextIds[from].pop();
    if (element === undefined || ballId === undefined) return null;
    nextState[to].push(element);
    nextIds[to].push(ballId);
    return { state: nextState, ids: nextIds, movedBallId: ballId };
  }

  private animatePour(from: number, to: number, prevState: number[][], nextState: number[][], fromPulled = false) {
    const sourceTube = this.tubes[from];
    const targetTube = this.tubes[to];
    if (!sourceTube || !targetTube) return;

    const fromStack = prevState[from];
    const toStack = nextState[to];
    if (!fromStack || !toStack || fromStack.length === 0) return;

    const { tubeHeight, elementRadius, elementGap } = this.tubeLayout;
    const fromIndex = fromStack.length - 1;
    const toIndex = toStack.length - 1;

    const startX = sourceTube.container.x;
    const pulledOffset = elementRadius * 2.4;
    const pulledTopY = -tubeHeight / 2 - elementRadius * 0.2;
    const startLocalY = fromPulled
      ? pulledTopY - pulledOffset
      : this.getElementY(tubeHeight, elementRadius, elementGap, fromIndex);
    const startY = sourceTube.container.y + startLocalY;
    const endX = targetTube.container.x;
    const endY = targetTube.container.y + this.getElementY(tubeHeight, elementRadius, elementGap, toIndex);

    const type = fromStack[fromIndex];
    const color = TUBE_SORT_COLORS[type % TUBE_SORT_COLORS.length];
    const textureKey = this.getBallTexture(color);
    const mover = this.add.image(startX, startY, textureKey);
    mover.setDisplaySize(elementRadius * 2, elementRadius * 2);
    mover.setDepth(10);

    const trail = this.add.particles(0, 0, this.particleTextureKey, {
      follow: mover,
      lifespan: 200,
      speed: { min: 10, max: 40 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: color,
      frequency: 45,
      blendMode: 'ADD'
    });

    const controlX = (startX + endX) / 2;
    const controlY = Math.min(startY, endY) - 80;
    const tweenData = { t: 0 };

    this.tweens.add({
      targets: tweenData,
      t: 1,
      duration: 300,
      ease: 'Cubic.Out',
      onUpdate: () => {
        const t = tweenData.t;
        const x = Phaser.Math.Interpolation.QuadraticBezier(t, startX, controlX, endX);
        const y = Phaser.Math.Interpolation.QuadraticBezier(t, startY, controlY, endY);
        mover.setPosition(x, y);
      },
      onComplete: () => {
        mover.destroy();
        trail.destroy();
      }
    });
  }

  private getElementY(tubeHeight: number, elementRadius: number, elementGap: number, stackIndex: number) {
    return tubeHeight / 2 - elementRadius - stackIndex * (elementRadius * 2 + elementGap) - 6;
  }

  private updateProgressUI() {
    if (!this.progressBar) return;
    const { width } = this.scale;
    const tubeCapacity = 4;
    const completed = this.tubeState.filter(tube =>
      tube.length === tubeCapacity && tube.every(el => el === tube[0])
    ).length;
    const total = 2;
    const percent = Math.round((completed / Math.max(total, 1)) * 100);

    this.progressText.setText(`${percent}% สำเร็จ`);

    const barWidth = Math.min(320, width * 0.6);
    const barHeight = 10;
    const x = width / 2 - barWidth / 2;
    const y = this.scale.height - 55;

    this.progressBar.clear();
    this.progressBar.fillStyle(0xE2E8F0, 1);
    this.progressBar.fillRoundedRect(x, y, barWidth, barHeight, 6);
    const progressColor = percent >= 80 ? 0x22C55E : percent >= 40 ? this.theme.accent : 0xF97316;
    this.progressBar.fillStyle(progressColor, 1);
    this.progressBar.fillRoundedRect(x, y, (barWidth * percent) / 100, barHeight, 6);
  }

  private flashMessage(text: string) {
    this.messageText.setText(text);
    this.messageText.setAlpha(1);
    this.messageText.setColor(this.theme.text);
    this.tweens.add({
      targets: this.messageText,
      alpha: 0.6,
      duration: 600,
      yoyo: true
    });
  }

  private pulseTube(index: number) {
    const tube = this.tubes[index];
    if (!tube) return;
    const ring = this.add.graphics();
    ring.lineStyle(3, this.theme.accent, 0.6);
    ring.strokeRoundedRect(
      tube.container.x - this.tubeLayout.tubeWidth / 2 - 8,
      tube.container.y - this.tubeLayout.tubeHeight / 2 - 8,
      this.tubeLayout.tubeWidth + 16,
      this.tubeLayout.tubeHeight + 16,
      24
    );
    ring.setDepth(214);
    tube.container.setScale(1);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy()
    });
  }

  private celebrateTube(index: number, elementType?: number) {
    const tube = this.tubes[index];
    if (!tube) return;

    const glow = this.add.graphics();
    glow.lineStyle(6, 0xFACC15, 0.8);
    glow.strokeRoundedRect(
      tube.container.x - this.tubeLayout.tubeWidth / 2 - 6,
      tube.container.y - this.tubeLayout.tubeHeight / 2 - 6,
      this.tubeLayout.tubeWidth + 12,
      this.tubeLayout.tubeHeight + 12,
      22
    );
    glow.setDepth(215);

    this.tweens.add({
      targets: tube.container,
      scale: 1.06,
      duration: 180,
      yoyo: true,
      ease: 'Cubic.Out'
    });

    this.tweens.add({
      targets: glow,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.Out',
      onComplete: () => glow.destroy()
    });
    const color = elementType !== undefined
      ? TUBE_SORT_COLORS[elementType % TUBE_SORT_COLORS.length]
      : this.theme.accent;
    this.spawnBurst(tube.container.x, tube.container.y - this.tubeLayout.tubeHeight / 3, color);
  }

  private createParticleTexture() {
    if (this.textures.exists(this.particleTextureKey)) return;
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture(this.particleTextureKey, 8, 8);
    gfx.destroy();
  }

  private spawnBurst(x: number, y: number, color: number) {
    const particles = this.add.particles(0, 0, this.particleTextureKey, {
      x,
      y,
      speed: { min: 60, max: 160 },
      angle: { min: 200, max: 340 },
      lifespan: { min: 300, max: 600 },
      quantity: 16,
      scale: { start: 0.8, end: 0 },
      tint: color,
      blendMode: 'ADD'
    });

    this.time.delayedCall(700, () => particles.destroy());
  }

  private startTutorial() {
    this.tutorialStep = 0;
    this.showTutorialStep();
  }

  private showTutorialStep() {
    this.tutorialText.setText(this.tutorialSteps[this.tutorialStep] ?? '');
    this.stepText.setText(`ขั้นตอน ${this.tutorialStep + 1}/${this.tutorialSteps.length}`);
    this.arrowGraphic.clear();
    this.highlightRing.clear();
    this.ballHighlight?.clear();
    this.continueText.setVisible(!this.isInteractiveStep);
    this.overlay.setInteractive(!this.isInteractiveStep);

    this.isInteractiveStep = false;
    this.canAdvance = true;
    this.game.events.emit('tutorial-show-next-btn', false);

    if (this.tutorialStep === 0) {
      this.continueText.setText('แตะเพื่อไปต่อ');
      this.highlightTube(0);
      return;
    }

    if (this.tutorialStep === 1) {
      this.isInteractiveStep = true;
      this.canAdvance = false;
      this.continueText.setVisible(false);
      this.overlay.disableInteractive();
      this.highlightTube(0);
      this.drawArrowForTube(0, 'down');
      return;
    }

    if (this.tutorialStep === 2) {
      this.isInteractiveStep = true;
      this.canAdvance = false;
      this.continueText.setVisible(false);
      this.overlay.disableInteractive();
      this.highlightTube(1);
      this.drawArrowForTube(1, 'down');
      return;
    }

    if (this.tutorialStep === 3) {
      this.continueText.setText('แตะเพื่อไปต่อ');
      return;
    }

    if (this.tutorialStep === 4) {
      this.continueText.setText('แตะเพื่อไปต่อ');
      this.highlightTube(1, 0xFACC15);
      this.celebrateTube(1, this.tubeState[1]?.[0]);
      return;
    }

    if (this.tutorialStep === 5) {
      this.continueText.setText('แตะเพื่อไปต่อ');
      this.showMoveLimitDemo();
      return;
    }

    if (this.tutorialStep === 6) {
      this.continueText.setText('แตะเพื่อไปต่อ');
      this.showFreezeDemo();
      return;
    }

    if (this.tutorialStep === 7) {
      this.continueText.setText('กดปุ่มเริ่มเล่นเพื่อเริ่มเกม');
      this.endTutorial();
      return;
    }
  }

  private updateTutorialVisuals() {
    if (this.tutorialStep === 1) {
      this.highlightTube(0);
      this.drawArrowForTube(0, 'down');
    }
    if (this.tutorialStep === 2) {
      this.highlightTube(1);
      this.drawArrowForTube(1, 'down');
    }
    if (this.tutorialStep === 4) {
      this.highlightTube(1, 0xFACC15);
    }
    if (this.tutorialStep === 5 && this.moveLimitBallId !== undefined) {
      this.highlightBallById(this.moveLimitBallId, 0xF97316);
    }
    if (this.tutorialStep === 6 && this.frozenBallId !== undefined) {
      this.highlightBallById(this.frozenBallId, 0x38BDF8);
    }
  }

  private nextTutorialStep() {
    if (this.tutorialStep >= this.tutorialSteps.length - 1) {
      this.startGame();
      return;
    }
    this.tutorialStep += 1;
    this.showTutorialStep();
  }

  private highlightTube(index: number, color = this.theme.accent) {
    const tube = this.tubes[index];
    if (!tube) return;
    const { tubeWidth, tubeHeight } = this.tubeLayout;
    this.highlightRing.clear();
    this.highlightRing.lineStyle(4, color, 0.9);
    this.highlightRing.strokeRoundedRect(
      tube.container.x - tubeWidth / 2 - 10,
      tube.container.y - tubeHeight / 2 - 10,
      tubeWidth + 20,
      tubeHeight + 20,
      24
    );
    this.highlightRing.setDepth(214);
  }

  private highlightBallById(ballId: number, color: number) {
    if (!this.ballHighlight) return;
    const tubeIndex = this.tubeBallIds.findIndex(tube => tube.includes(ballId));
    if (tubeIndex < 0) return;
    const stackIndex = this.tubeBallIds[tubeIndex]?.indexOf(ballId) ?? -1;
    if (stackIndex < 0) return;
    const tube = this.tubes[tubeIndex];
    if (!tube) return;

    const { tubeHeight, elementRadius, elementGap } = this.tubeLayout;
    const x = tube.container.x;
    const y = tube.container.y + this.getElementY(tubeHeight, elementRadius, elementGap, stackIndex);

    this.ballHighlight.clear();
    this.ballHighlight.lineStyle(4, color, 0.85);
    this.ballHighlight.strokeCircle(x, y, elementRadius + 10);
    this.ballHighlight.setDepth(216);
  }

  private drawArrowForTube(index: number, direction: 'down' | 'up') {
    const tube = this.tubes[index];
    if (!tube) return;

    const arrowColor = 0x38BDF8;
    const size = 30;
    const { tubeHeight } = this.tubeLayout;
    const startX = tube.container.x;
    const startY = tube.container.y - tubeHeight / 2 - 60;
    const endY = tube.container.y - tubeHeight / 2 - 10;

    this.arrowGraphic.clear();
    this.arrowGraphic.lineStyle(6, arrowColor, 0.9);
    this.arrowGraphic.beginPath();
    this.arrowGraphic.moveTo(startX, startY);
    this.arrowGraphic.lineTo(startX, endY);
    this.arrowGraphic.strokePath();

    if (direction === 'down') {
      this.arrowGraphic.fillStyle(arrowColor, 1);
      this.arrowGraphic.fillTriangle(
        startX - size / 2,
        endY - 4,
        startX + size / 2,
        endY - 4,
        startX,
        endY + size / 2
      );
    }
  }

  private demoAutoPour() {
    const from = 0;
    const to = 3;
    const prevState = this.tubeState.map(tube => [...tube]);
    const nextState = this.performPour(prevState, from, to, 4);
    if (!nextState) {
      this.time.delayedCall(800, () => this.nextTutorialStep());
      return;
    }
    this.tubeState = nextState;
    this.renderTubes();
    this.animatePour(from, to, prevState, nextState, true);
    this.updateProgressUI();
    this.time.delayedCall(900, () => {
      this.tutorialStep = 4;
      this.showTutorialStep();
    });
  }

  private initializeBallStates() {
    this.tubeBallIds = this.tubeState.map(tube => tube.map(() => this.nextBallId++));
    this.ballStates.clear();

    const allBallIds = this.tubeBallIds.flat();
    const limitedIds = allBallIds.length > 0 ? [allBallIds[0]] : [];

    allBallIds.forEach(id => {
      const hasMoveLimit = limitedIds.includes(id);
      this.ballStates.set(id, {
        id,
        hasMoveLimit,
        remainingMoves: hasMoveLimit ? 2 : null,
        frozenUntil: 0
      });
    });
  }

  private isBallFrozen(ballState?: BallState) {
    if (!ballState) return false;
    return ballState.frozenUntil > Date.now();
  }

  private showMoveLimitDemo() {
    if (this.hasShownMoveLimit) return;
    this.hasShownMoveLimit = true;
    this.messageText.setText('ดูเลขบนลูกบอลที่จำกัดจำนวนการย้าย');
    const moveLimitBall = Array.from(this.ballStates.values()).find(state => state.hasMoveLimit);
    if (moveLimitBall) {
      this.moveLimitBallId = moveLimitBall.id;
      this.highlightBallById(moveLimitBall.id, 0xF97316);
    }
    this.renderTubes();
  }

  private showFreezeDemo() {
    if (this.hasShownFreeze) return;
    this.hasShownFreeze = true;
    this.messageText.setText('พ่อมดน้ำแข็งทำให้ลูกบอลหยุดชั่วคราว');
    const allBallIds = this.tubeBallIds.flat();
    const targetId = allBallIds[allBallIds.length - 1];
    if (targetId === undefined) return;
    const ballState = this.ballStates.get(targetId);
    if (!ballState) return;
    ballState.frozenUntil = Date.now() + 2600;
    this.frozenBallId = targetId;
    this.highlightBallById(targetId, 0x38BDF8);
    this.showWizardPopup();
    this.renderTubes();
    this.time.delayedCall(2600, () => {
      ballState.frozenUntil = 0;
      this.renderTubes();
    });
  }

  private createMoveCounterVisual(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    elementRadius: number,
    remainingMoves: number
  ) {
    const isCritical = remainingMoves <= 2;
    const strokeColor = isCritical ? '#F97316' : '#0F172A';
    const textColor = '#FFFFFF';

    const label = this.add.text(0, 0, `${remainingMoves}`, {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: `${Math.max(18, Math.floor(elementRadius * 0.95))}px`,
      color: textColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    label.setStroke(strokeColor, Math.max(2, Math.round(elementRadius * 0.12)));
    label.setShadow(0, 2, 'rgba(0,0,0,0.4)', 4, false, true);
    label.setPosition(x, y);

    container.add(label);
    return label;
  }

  private createIceOverlay(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    elementRadius: number
  ) {
    const glow = this.add.circle(0, 0, elementRadius * 1.35, 0x38BDF8, 0.28);
    glow.setPosition(x, y);
    glow.setBlendMode(Phaser.BlendModes.ADD);

    const outer = this.add.circle(0, 0, elementRadius * 0.98, 0x7DD3FC, 0.3);
    outer.setStrokeStyle(2.5, 0xE0F2FE, 0.95);
    outer.setPosition(x, y);

    const inner = this.add.circle(0, 0, elementRadius * 0.55, 0xBAE6FD, 0.25);
    inner.setPosition(x - elementRadius * 0.12, y - elementRadius * 0.18);

    const shine = this.add.graphics();
    shine.lineStyle(2, 0xFFFFFF, 0.55);
    shine.beginPath();
    shine.moveTo(x - elementRadius * 0.35, y - elementRadius * 0.1);
    shine.lineTo(x + elementRadius * 0.1, y - elementRadius * 0.45);
    shine.strokePath();

    container.add([glow, outer, inner, shine]);

    this.tweens.add({
      targets: glow,
      alpha: 0.6,
      scale: 1.1,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    return [glow, outer, inner, shine];
  }

  private showWizardPopup() {
    const { width } = this.scale;
    const wizardX = width - 140;
    const wizardY = 170;
    const wizard = this.add.container(wizardX, wizardY);

    const glow = this.add.graphics();
    glow.fillStyle(0x60A5FA, 0.22);
    glow.fillCircle(0, 0, 56);
    glow.fillStyle(0x38BDF8, 0.35);
    glow.fillCircle(0, 0, 40);

    const robe = this.add.graphics();
    robe.fillStyle(0x6366F1, 1);
    robe.fillRoundedRect(-26, -10, 52, 58, 16);
    robe.fillStyle(0x4F46E5, 1);
    robe.fillRoundedRect(-24, 2, 48, 44, 14);

    const face = this.add.circle(0, -28, 14, 0xFDE2C4, 1);
    const beard = this.add.graphics();
    beard.fillStyle(0xE2E8F0, 1);
    beard.beginPath();
    beard.moveTo(-16, -18);
    beard.lineTo(0, 8);
    beard.lineTo(16, -18);
    beard.closePath();
    beard.fillPath();

    const hat = this.add.graphics();
    hat.fillStyle(0x312E81, 1);
    hat.beginPath();
    hat.moveTo(-24, -38);
    hat.lineTo(0, -78);
    hat.lineTo(24, -38);
    hat.closePath();
    hat.fillPath();
    hat.fillStyle(0x1E1B4B, 1);
    hat.fillRoundedRect(-30, -40, 60, 12, 6);
    hat.fillStyle(0xFBBF24, 1);
    hat.fillCircle(-10, -56, 3);
    hat.fillCircle(8, -62, 2.5);
    hat.fillCircle(0, -48, 2);

    const eyeLeft = this.add.circle(-6, -30, 2.4, 0x111827, 1);
    const eyeRight = this.add.circle(6, -30, 2.4, 0x111827, 1);
    const smile = this.add.graphics();
    smile.lineStyle(2, 0x7C2D12, 0.8);
    smile.beginPath();
    smile.arc(0, -24, 6, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    smile.strokePath();

    const staff = this.add.graphics();
    staff.lineStyle(4, 0x6B7280, 1);
    staff.beginPath();
    staff.moveTo(26, -6);
    staff.lineTo(36, 36);
    staff.strokePath();
    const orbGlow = this.add.circle(24, -12, 10, 0x93C5FD, 0.35);
    const orb = this.add.circle(24, -12, 6, 0xFDE68A, 1);

    const label = this.add.text(0, 48, 'แช่แข็ง!', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '16px',
      color: '#0F172A',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    wizard.add([
      glow,
      orbGlow,
      orb,
      staff,
      robe,
      face,
      beard,
      hat,
      eyeLeft,
      eyeRight,
      smile,
      label
    ]);
    wizard.setDepth(20);
    wizard.setScale(0.6);
    wizard.setAlpha(0);

    this.tweens.add({
      targets: wizard,
      alpha: 1,
      scale: 1,
      duration: 240,
      ease: 'Back.Out'
    });

    this.tweens.add({
      targets: wizard,
      y: wizardY - 8,
      yoyo: true,
      repeat: -1,
      duration: 1200,
      ease: 'Sine.InOut'
    });

    this.tweens.add({
      targets: [eyeLeft, eyeRight],
      scaleY: 0.1,
      duration: 120,
      yoyo: true,
      repeat: -1,
      delay: 1400
    });

    this.tweens.add({
      targets: [orbGlow, orb],
      scale: 1.15,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    const magic = this.add.particles(0, 0, this.particleTextureKey, {
      follow: orb,
      lifespan: { min: 200, max: 420 },
      speed: { min: 10, max: 30 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: [0x93C5FD, 0xFDE68A, 0xA5B4FC],
      frequency: 120,
      blendMode: 'ADD'
    });

    this.time.delayedCall(1300, () => {
      this.tweens.add({
        targets: wizard,
        alpha: 0,
        duration: 220,
        onComplete: () => {
          wizard.destroy();
          magic.destroy();
        }
      });
    });
  }

  private endTutorial() {
    this.sound.play('level-pass');
    const onTutorialComplete = this.registry.get('onTutorialComplete');
    if (onTutorialComplete) {
      onTutorialComplete();
    }
  }

  private startGame() {
    this.scene.start('TubeSortGameScene', { level: this.level });
  }

  startRealGame() {
    this.startGame();
  }
}