import * as Phaser from 'phaser';
import { TUBE_SORT_LEVELS, getTubeSortLevel, TUBE_SORT_COLORS } from './levels';
import { calculateTubeSortStars } from '@/lib/scoring/tubeSort';

type TubeSortStats = {
  levelPlayed: number;
  difficultyMultiplier: number;
  optimalMoves: number;
  playerMoves: number;
  correctPours: number;
  incorrectPours: number;
  illegalPourAttempts: number;
  redundantMoves: number;
  totalActions: number;
  completionTimeMs: number;
  targetTimeMs: number;
};

type TubeData = {
  container: Phaser.GameObjects.Container;
  outline: Phaser.GameObjects.Graphics;
  glass: Phaser.GameObjects.Graphics;
  shine: Phaser.GameObjects.Graphics;
  shadow: Phaser.GameObjects.Graphics;
  elements: Phaser.GameObjects.GameObject[];
  index: number;
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

export class TubeSortGameScene extends Phaser.Scene {
  private currentLevelConfig = TUBE_SORT_LEVELS[1];
  private tubes: TubeData[] = [];
  private tubeState: number[][] = [];
  private selectedTubeIndex: number | null = null;
  private moveHistory: { from: number; to: number; fromState: number[][] }[] = [];
  private completedTubes = new Set<number>();
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

  private startTime = 0;
  private totalMoves = 0;
  private correctPours = 0;
  private incorrectPours = 0;
  private illegalPourAttempts = 0;
  private redundantMoves = 0;
  private totalActions = 0;

  private background?: Phaser.GameObjects.Rectangle;
  private backgroundGlow?: Phaser.GameObjects.Graphics;
  private messageText!: Phaser.GameObjects.Text;
  private moveText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private timerRing?: Phaser.GameObjects.Graphics;
  private timerEvent?: Phaser.Time.TimerEvent;
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

  constructor() {
    super({ key: 'TubeSortGameScene' });
  }

  init(data: { level: number }) {
    const regLevel = this.registry.get('level');
    const level = data.level || regLevel || 1;
    this.currentLevelConfig = getTubeSortLevel(level) || TUBE_SORT_LEVELS[1];
    this.theme = this.getTheme();
    this.resetState();
  }

  create() {
    this.startTime = Date.now();
    this.createBackground();
    this.createParticleTexture();
    this.createUI();
    this.createPuzzle();
    this.layoutTubes();
    this.startTimer();

    this.scale.on('resize', () => {
      this.layoutUI();
      this.layoutTubes();
      this.renderTubes();
    });
  }

  update() {
    if (!this.timerEvent) return;
    this.updateTimerText();
  }

  private resetState() {
    this.tubes = [];
    this.tubeState = [];
    this.selectedTubeIndex = null;
    this.moveHistory = [];

    this.totalMoves = 0;
    this.correctPours = 0;
    this.incorrectPours = 0;
    this.illegalPourAttempts = 0;
    this.redundantMoves = 0;
    this.totalActions = 0;
    this.completedTubes.clear();
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

  private createUI() {
    const { width } = this.scale;

    this.messageText = this.add.text(width / 2, 128, 'จัดเรียงสีให้เหมือนกัน', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '28px',
      color: this.theme.text,
      fontStyle: 'bold',
      padding: { top: 6, bottom: 6, left: 12, right: 12 }
    }).setOrigin(0.5);

    this.moveText = this.add.text(24, this.scale.height - 56, 'จำนวนครั้ง : 0', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '18px',
      color: this.theme.softText,
      padding: { top: 4, bottom: 4, left: 8, right: 8 }
    });

    this.timeText = this.add.text(width - 88, 44, '0วิ', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '16px',
      color: this.theme.softText,
      padding: { top: 4, bottom: 4, left: 6, right: 6 }
    }).setOrigin(0.5, 0.5);

    this.progressBar = this.add.graphics();
    this.progressText = this.add.text(width / 2, this.scale.height - 100, '0% สำเร็จ', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '16px',
      color: this.theme.softText,
      padding: { top: 4, bottom: 4, left: 8, right: 8 }
    }).setOrigin(0.5);

    this.timerRing = this.add.graphics();

    this.layoutUI();
    this.updateProgressUI();
  }

  private layoutUI() {
    const { width } = this.scale;
    this.messageText.setPosition(width / 2, 128);
    this.moveText.setPosition(24, this.scale.height - 56);
    this.timeText.setPosition(width - 88, 44);
    this.progressText.setPosition(width / 2, this.scale.height - 100);
  }

  private computeLayoutMetrics() {
    const { width, height } = this.scale;
    const { tubeCount, tubeCapacity } = this.currentLevelConfig;

    const rows = tubeCount > 6 ? 2 : 1;
    const cols = rows === 1 ? tubeCount : Math.ceil(tubeCount / 2);

    const topPadding = 170;
    const bottomPadding = 150;
    const availableW = width * 0.84;
    const availableH = Math.max(220, height - topPadding - bottomPadding);

    const tubeWidth = Math.max(52, Math.min(96, availableW / (cols + 0.6)));
    const tubeHeight = Math.max(170, Math.min(245, availableH / rows));

    const elementGap = Math.max(4, Math.min(8, tubeWidth * 0.08));
    const maxRadiusFromHeight = (tubeHeight - 24 - elementGap * (tubeCapacity - 1)) / (tubeCapacity * 2);
    const elementRadius = Math.max(12, Math.min(tubeWidth * 0.32, maxRadiusFromHeight));

    const spacingX = cols > 1 ? (availableW - tubeWidth) / (cols - 1) : 0;
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
    const { tubeCount, tubeCapacity, elementTypes, totalElements, seed } = this.currentLevelConfig;
    const solvedState = this.generateSolvedState(tubeCount, tubeCapacity, elementTypes, totalElements);
    const { state } = this.shuffleState(solvedState, tubeCapacity, seed);
    const distributed = this.distributeEmptySlots(state, seed + 19);
    this.tubeState = this.shuffleTubeOrder(distributed, seed + 77);

    for (let i = 0; i < tubeCount; i++) {
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
    this.updateProgressUI();
  }

  private generateSolvedState(
    tubeCount: number,
    tubeCapacity: number,
    elementTypes: number,
    totalElements: number
  ) {
    const tubes: number[][] = Array.from({ length: tubeCount }, () => []);
    let remaining = totalElements;

    for (let type = 0; type < elementTypes; type++) {
      const fill = Math.min(tubeCapacity, remaining);
      if (fill <= 0) break;
      for (let i = 0; i < fill; i++) {
        tubes[type].push(type);
      }
      remaining -= fill;
    }

    let typeIndex = 0;
    while (remaining > 0) {
      const tubeIndex = typeIndex % tubeCount;
      if (tubes[tubeIndex].length < tubeCapacity) {
        tubes[tubeIndex].push(typeIndex % elementTypes);
        remaining--;
      }
      typeIndex++;
    }

    return tubes;
  }

  private shuffleState(state: number[][], tubeCapacity: number, seed: number) {
    let current = state.map(tube => [...tube]);
    let rng = seed;
    let moves = 0;
    const { tubeCount, tubeCapacity: capacity } = this.currentLevelConfig;
    const baseMoves = Math.max(this.currentLevelConfig.optimalMoves, tubeCount * capacity * 2);
    const difficultyFactor = Phaser.Math.Clamp(this.currentLevelConfig.difficultyMultiplier, 1, 2.5);
    const targetMoves = Math.round(baseMoves * difficultyFactor);

    const randomIndex = (max: number) => {
      rng = (rng * 9301 + 49297) % 233280;
      return Math.floor((rng / 233280) * max);
    };

    while (moves < targetMoves) {
      const from = randomIndex(current.length);
      const to = randomIndex(current.length);
      if (from === to) continue;

      const next = this.performPour(current, from, to, tubeCapacity);
      if (!next) continue;

      current = next;
      moves++;
    }

    return { state: current, moves };
  }

  private shuffleTubeOrder(state: number[][], seed: number) {
    const shuffled = state.map(tube => [...tube]);
    let rng = seed;

    const randomIndex = (max: number) => {
      rng = (rng * 9301 + 49297) % 233280;
      return Math.floor((rng / 233280) * max);
    };

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1);
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    return shuffled;
  }

  private renderTubes() {
    const { tubeCapacity } = this.currentLevelConfig;
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
        tube.container.add(element);
        tube.elements.push(element);
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
    const { tubeCount } = this.currentLevelConfig;

    this.computeLayoutMetrics();
    const { rows, cols, spacingX, spacingY, startX, startY } = this.tubeLayout;

    this.tubes.forEach((tube, index) => {
      const row = rows === 1 ? 0 : Math.floor(index / cols);
      const col = rows === 1 ? index : index % cols;
      tube.container.setPosition(startX + col * spacingX, startY + row * spacingY);
    });
  }

  private handleTubeTap(index: number) {
    this.totalActions++;

    if (this.selectedTubeIndex === null) {
      if (this.tubeState[index].length === 0) {
        this.illegalPourAttempts++;
        this.flashMessage('เลือกหลอดที่มีสี', true);
        return;
      }
      this.selectedTubeIndex = index;
      this.renderTubes();
      this.pulseTube(index);
      return;
    }

    if (this.selectedTubeIndex === index) {
      this.selectedTubeIndex = null;
      this.renderTubes();
      return;
    }

    const from = this.selectedTubeIndex;
    const to = index;
    const prevState = this.tubeState.map(tube => [...tube]);
    const next = this.performPour(this.tubeState, from, to, this.currentLevelConfig.tubeCapacity);

    if (!next) {
      this.illegalPourAttempts++;
      this.incorrectPours++;
      this.flashMessage('ย้ายไม่ได้', true);
      this.shakeTube(index);
      this.selectedTubeIndex = null;
      this.renderTubes();
      return;
    }

    this.totalMoves++;
    this.correctPours++;
    this.tubeState = next;
    this.trackRedundantMove(from, to, prevState);
    this.moveHistory.push({ from, to, fromState: prevState });
    this.selectedTubeIndex = null;
    this.updateMoveText();
    this.updateProgressUI();
    this.renderTubes();
    this.animateMove(from, to);
    this.animatePour(from, to, prevState, next, true);
    this.handleTubeCompletion(prevState, next);
    this.checkWin();
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

  private trackRedundantMove(from: number, to: number, previousState: number[][]) {
    const lastMoves = this.moveHistory.slice(-3);
    const reversed = lastMoves.some(move => move.from === to && move.to === from);
    if (reversed) {
      this.redundantMoves++;
    }
    if (previousState) {
      // no-op, retained for future analytics
    }
  }

  private checkWin() {
    const { tubeCapacity } = this.currentLevelConfig;
    const isComplete = this.tubeState.every(tube => {
      if (tube.length === 0) return true;
      if (tube.length !== tubeCapacity) return false;
      return tube.every(element => element === tube[0]);
    });

    if (isComplete) {
      this.endGame();
    }
  }

  private startTimer() {
    this.timerEvent = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => this.updateTimerText()
    });
  }

  private updateTimerText() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.timeText.setText(`${elapsed}วิ`);
    this.drawTimerRing(elapsed);
  }

  private updateMoveText() {
    this.moveText.setText(`จำนวนครั้ง : ${this.totalMoves}`);
    this.moveText.setScale(1.05);
    this.tweens.add({
      targets: this.moveText,
      scale: 1,
      duration: 120,
      ease: 'Cubic.Out'
    });
  }

  private flashMessage(text: string, isError = false) {
    this.messageText.setText(text);
    this.messageText.setAlpha(1);
    this.messageText.setColor(isError ? '#DC2626' : this.theme.text);
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
    ring.setDepth(4);
    tube.container.setScale(1);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy()
    });
  }

  private shakeTube(index: number) {
    const tube = this.tubes[index];
    if (!tube) return;
    const ring = this.add.graphics();
    ring.lineStyle(4, 0xF87171, 0.7);
    ring.strokeRoundedRect(
      tube.container.x - this.tubeLayout.tubeWidth / 2 - 6,
      tube.container.y - this.tubeLayout.tubeHeight / 2 - 6,
      this.tubeLayout.tubeWidth + 12,
      this.tubeLayout.tubeHeight + 12,
      22
    );
    ring.setDepth(4);
    this.tweens.add({
      targets: tube.container,
      x: tube.container.x + 6,
      duration: 60,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.InOut'
    });
    this.tweens.add({
      targets: ring,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy()
    });
  }

  private animateMove(from: number, to: number) {
    const sourceTube = this.tubes[from];
    const targetTube = this.tubes[to];
    if (!sourceTube || !targetTube) return;

    targetTube.container.setScale(1);
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
    const startLocalY = fromPulled ? pulledTopY - pulledOffset : this.getElementY(tubeHeight, elementRadius, elementGap, fromIndex);
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
    const { tubeCapacity } = this.currentLevelConfig;
    const completed = this.tubeState.filter(tube =>
      tube.length === tubeCapacity && tube.every(el => el === tube[0])
    ).length;
    const total = this.currentLevelConfig.elementTypes;
    const percent = Math.round((completed / Math.max(total, 1)) * 100);

    this.progressText.setText(`${percent}% สำเร็จ`);

    const barWidth = Math.min(320, width * 0.6);
    const barHeight = 10;
    const x = width / 2 - barWidth / 2;
    const y = this.scale.height - 68;

    this.progressBar.clear();
    this.progressBar.fillStyle(0xE2E8F0, 1);
    this.progressBar.fillRoundedRect(x, y, barWidth, barHeight, 6);
    const progressColor = percent >= 80 ? 0x22C55E : percent >= 40 ? this.theme.accent : 0xF97316;
    this.progressBar.fillStyle(progressColor, 1);
    this.progressBar.fillRoundedRect(x, y, (barWidth * percent) / 100, barHeight, 6);
  }

  private drawTimerRing(elapsedSeconds: number) {
    if (!this.timerRing) return;
    const { width } = this.scale;
    const radius = 18;
    const centerX = width - 88;
    const centerY = 44;
    const maxTime = this.currentLevelConfig.targetTimeSeconds;
    const progress = Math.min(elapsedSeconds / Math.max(maxTime, 1), 1);

    let color = 0x22C55E;
    if (progress > 0.7) color = 0xF97316;
    if (progress > 0.9) color = 0xEF4444;

    this.timerRing.clear();
    this.timerRing.lineStyle(4, color, 1);
    this.timerRing.beginPath();
    this.timerRing.arc(centerX, centerY, radius, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + progress * 360), false);
    this.timerRing.strokePath();
  }

  private handleTubeCompletion(prevState: number[][], nextState: number[][]) {
    const { tubeCapacity } = this.currentLevelConfig;
    const newCompleted = new Set<number>();

    nextState.forEach((tube, index) => {
      const isComplete = tube.length === tubeCapacity && tube.every(el => el === tube[0]);
      if (isComplete) {
        newCompleted.add(index);
        if (!this.completedTubes.has(index)) {
          this.celebrateTube(index, tube[0]);
        }
      }
    });

    this.completedTubes = newCompleted;
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
    glow.setDepth(5);

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

  private distributeEmptySlots(state: number[][], seed: number) {
    const tubes = state.map(tube => [...tube]);
    const { tubeCapacity } = this.currentLevelConfig;
    const emptySlots = tubes.map(tube => tubeCapacity - tube.length);
    const totalEmpty = emptySlots.reduce((sum, slots) => sum + slots, 0);
    const emptyTubes = emptySlots.map((slots, index) => ({ slots, index })).filter(({ slots }) => slots > 0);

    if (totalEmpty !== tubeCapacity || emptyTubes.length >= 2) {
      return tubes;
    }

    let rng = seed + 999;
    const randomIndex = (max: number) => {
      rng = (rng * 9301 + 49297) % 233280;
      return Math.floor((rng / 233280) * max);
    };

    const emptyIndex = emptyTubes[0].index;
    const donors = tubes
      .map((tube, index) => ({ tube, index }))
      .filter(({ tube, index }) => tube.length > 0 && index !== emptyIndex);
    const donorCount = Math.min(Math.max(2, Math.floor(tubeCapacity / 2)), Math.min(donors.length, tubeCapacity - 1));

    for (let i = 0; i < donorCount; i++) {
      const donorIndex = randomIndex(donors.length - i) + i;
      const temp = donors[i];
      donors[i] = donors[donorIndex];
      donors[donorIndex] = temp;
      const element = donors[i].tube.pop();
      if (element !== undefined) {
        tubes[emptyIndex].push(element);
      }
    }

    return tubes;
  }

  private getTheme(): TubeSortTheme {
    const themes: TubeSortTheme[] = [
      {
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
      },
      {
        background: 0xFFF7ED,
        glowA: 0xFFEDD5,
        glowB: 0xFFF7ED,
        glowC: 0xFEF3C7,
        tubeStroke: 0xFBD38D,
        tubeFill: 0xFFFFFF,
        tubeHighlight: 0xFFF7ED,
        accent: 0xFB7185,
        text: '#7C2D12',
        softText: '#9A3412'
      },
      {
        background: 0xECFDF3,
        glowA: 0xD1FAE5,
        glowB: 0xECFDF3,
        glowC: 0xE0F2FE,
        tubeStroke: 0x6EE7B7,
        tubeFill: 0xFFFFFF,
        tubeHighlight: 0xECFDF3,
        accent: 0x22C55E,
        text: '#14532D',
        softText: '#166534'
      }
    ];

    const index = (this.currentLevelConfig.level - 1) % themes.length;
    return themes[index];
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

  private endGame() {
    const completionTimeMs = Date.now() - this.startTime;
    if (this.timerEvent) {
      this.timerEvent.remove();
    }

    this.cameras.main.flash(200, 255, 255, 255, true);
    this.tubes.forEach((tube, index) => {
      const topType = this.tubeState[index]?.[0];
      if (topType !== undefined) {
        this.spawnBurst(tube.container.x, tube.container.y - this.tubeLayout.tubeHeight / 3, TUBE_SORT_COLORS[topType % TUBE_SORT_COLORS.length]);
      }
    });

    const stats: TubeSortStats = {
      levelPlayed: this.currentLevelConfig.level,
      difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
      optimalMoves: this.currentLevelConfig.optimalMoves,
      playerMoves: this.totalMoves || 1,
      correctPours: this.correctPours,
      incorrectPours: this.incorrectPours,
      illegalPourAttempts: this.illegalPourAttempts,
      redundantMoves: this.redundantMoves,
      totalActions: this.totalActions || 1,
      completionTimeMs,
      targetTimeMs: this.currentLevelConfig.targetTimeSeconds * 1000
    };

    const stars = calculateTubeSortStars(stats);

    const onGameOver = this.registry.get('onGameOver');
    if (onGameOver) {
      onGameOver({
        ...stats,
        stars,
        success: true
      });
    }
  }
}