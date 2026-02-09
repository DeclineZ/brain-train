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
  mouth: Phaser.GameObjects.Graphics;
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
  private isGameOver = false;

  private tubeBallIds: number[][] = [];
  private ballStates = new Map<number, BallState>();
  private nextBallId = 0;
  private nextFreezeAt = 0;
  private freezeCooldownMs = 0;
  private freezeDurationMs = 0;

  private background?: Phaser.GameObjects.Rectangle;
  private backgroundGlow?: Phaser.GameObjects.Graphics;
  private messageText!: Phaser.GameObjects.Text;
  private moveText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private timerContainer?: Phaser.GameObjects.Container;
  private timerBar?: Phaser.GameObjects.Graphics;
  private timerText?: Phaser.GameObjects.Text;
  private lastTimerPct = 100;
  private lastTimerSec = 0;
  private timeWarningTriggered = false;
  private timerShakeTween?: Phaser.Tweens.Tween;
  private timerEvent?: Phaser.Time.TimerEvent;
  private bgMusic?: Phaser.Sound.BaseSound;
  private readonly soundKeys = {
    ballSelect: 'tube-sort-ball-select',
    ballPour: 'tube-sort-ball-pour',
    tubeComplete: 'tube-sort-complete',
    wrongMove: 'tube-sort-wrong',
    freeze: 'tube-sort-freeze',
    levelPass: 'tube-sort-level-pass',
    levelFail: 'tube-sort-level-fail',
    timerWarning: 'tube-sort-timer-warning',
    bgMusic: 'tube-sort-bg-music'
  };
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

  preload() {
    this.load.audio(this.soundKeys.ballSelect, '/assets/sounds/tube-sort/ball-select.mp3');
    this.load.audio(this.soundKeys.ballPour, '/assets/sounds/tube-sort/ball-pour.mp3');
    this.load.audio(this.soundKeys.tubeComplete, '/assets/sounds/tube-sort/tube-complete.mp3');
    this.load.audio(this.soundKeys.wrongMove, '/assets/sounds/global/error.mp3');
    this.load.audio(this.soundKeys.freeze, '/assets/sounds/tube-sort/freeze-effect.mp3');
    this.load.audio(this.soundKeys.levelPass, '/assets/sounds/global/level-pass.mp3');
    this.load.audio(this.soundKeys.levelFail, '/assets/sounds/global/level-fail.mp3');
    this.load.audio(this.soundKeys.timerWarning, '/assets/sounds/global/timer-warning.mp3');
    this.load.audio(this.soundKeys.bgMusic, '/assets/sounds/tube-sort/bg-music.mp3');
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
    this.setupAudio();
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

  private setupAudio() {
    this.sound.stopAll();
    try {
      this.bgMusic = this.sound.add(this.soundKeys.bgMusic, { volume: 0.45, loop: true });
      this.bgMusic.play();
    } catch (error) {
      console.warn('Failed to play tube-sort bg music', error);
    }
  }

  update() {
    if (!this.timerEvent) return;
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
    this.isGameOver = false;
    this.timeWarningTriggered = false;
    this.stopTimerShake();

    this.tubeBallIds = [];
    this.ballStates.clear();
    this.nextBallId = 0;
    this.nextFreezeAt = 0;
    const freezeFeature = this.currentLevelConfig.freezeFeature;
    this.freezeCooldownMs = freezeFeature.enabled ? freezeFeature.cooldownSeconds * 1000 : 0;
    this.freezeDurationMs = freezeFeature.enabled ? freezeFeature.durationSeconds * 1000 : 0;
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

    this.moveText = this.add.text(24, this.scale.height - 56, this.getMoveLimitStatusText(), {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '18px',
      color: this.theme.softText,
      padding: { top: 4, bottom: 4, left: 8, right: 8 }
    });

    this.timerContainer = this.add.container(0, 0).setDepth(12);
    this.timerBar = this.add.graphics();
    this.timerContainer.add(this.timerBar);
    this.timerText = this.add.text(0, 0, '', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '16px',
      color: this.theme.text,
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);
    this.timerContainer.add(this.timerText);

    this.progressBar = this.add.graphics();
    this.progressText = this.add.text(width / 2, this.scale.height - 100, '0% สำเร็จ', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '16px',
      color: this.theme.softText,
      padding: { top: 4, bottom: 4, left: 8, right: 8 }
    }).setOrigin(0.5);

    this.layoutUI();
    this.updateProgressUI();
    this.updateMoveText();
    this.drawTimerBar(100, this.currentLevelConfig.targetTimeSeconds);
  }

  private layoutUI() {
    const { width } = this.scale;
    this.messageText.setPosition(width / 2, 128);
    this.moveText.setPosition(24, this.scale.height - 56);
    this.progressText.setPosition(width / 2, this.scale.height - 100);
    if (this.timerBar?.visible) {
      this.drawTimerBar(this.lastTimerPct, this.lastTimerSec);
    }
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

    const tubeWidth = Math.max(64, Math.min(112, availableW / (cols + 0.4)));
    const tubeHeight = Math.max(190, Math.min(270, availableH / rows));

    const elementGap = Math.max(4, Math.min(10, tubeWidth * 0.07));
    const maxRadiusFromHeight = (tubeHeight - 28 - elementGap * (tubeCapacity - 1)) / (tubeCapacity * 2);
    const elementRadius = Math.max(16, Math.min(tubeWidth * 0.52, maxRadiusFromHeight));

    const rawSpacingX = cols > 1 ? (availableW - tubeWidth) / (cols - 1) : 0;
    const minSpacingX = 80;
    const maxSpacingX = 150;
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
    const { tubeCount, tubeCapacity, elementTypes, totalElements, seed } = this.currentLevelConfig;
    const solvedState = this.generateSolvedState(tubeCount, tubeCapacity, elementTypes, totalElements);
    const { state } = this.shuffleState(solvedState, tubeCapacity, seed);
    const distributed = this.distributeEmptySlots(state, seed + 19);
    this.tubeState = this.shuffleTubeOrder(distributed, seed + 77);
    this.initializeBallStates();

    for (let i = 0; i < tubeCount; i++) {
      const container = this.add.container(0, 0);
      const shadow = this.add.graphics();
      const glass = this.add.graphics();
      const outline = this.add.graphics();
      const shine = this.add.graphics();
      const mouth = this.add.graphics();
      container.add(shadow);
      container.add(glass);
      container.add(outline);
      container.add(shine);
      container.add(mouth);

      const tube: TubeData = {
        container,
        outline,
        glass,
        shine,
        shadow,
        mouth,
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
    this.updateMoveText();
  }

  private initializeBallStates() {
    this.tubeBallIds = this.tubeState.map(tube => tube.map(() => this.nextBallId++));
    this.ballStates.clear();

    const moveLimitFeature = this.currentLevelConfig.moveLimitFeature;
    const allBallIds = this.tubeBallIds.flat();
    const limitedCount = moveLimitFeature.enabled
      ? Math.min(allBallIds.length, moveLimitFeature.maxBallsWithLimit)
      : 0;
    const limitedIds = moveLimitFeature.enabled
      ? Phaser.Utils.Array.Shuffle([...allBallIds]).slice(0, limitedCount)
      : [];

    allBallIds.forEach(id => {
      const hasMoveLimit = limitedIds.includes(id);
      this.ballStates.set(id, {
        id,
        hasMoveLimit,
        remainingMoves: hasMoveLimit ? moveLimitFeature.movesPerBall : null,
        frozenUntil: 0
      });
    });
  }

  private isBallFrozen(ballState?: BallState) {
    if (!ballState) return false;
    return ballState.frozenUntil > Date.now();
  }

  private isBallExhausted(ballState?: BallState) {
    if (!ballState || !ballState.hasMoveLimit) return false;
    return (ballState.remainingMoves ?? 0) <= 0;
  }

  private getMoveLimitStatusText() {
    return `ขยับไป : ${this.totalMoves}`;
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
      tube.mouth.clear();

      const isSelected = this.selectedTubeIndex === index;
      const strokeColor = isSelected
          ? this.theme.accent
          : this.theme.tubeStroke;

      tube.shadow.fillStyle(0x0, 0.08);
      tube.shadow.fillRoundedRect(-tubeWidth / 2 + 8, -tubeHeight / 2 + 10, tubeWidth, tubeHeight, 26);

      tube.glass.fillGradientStyle(0xFFFFFF, 0xF8FAFC, 0xE2E8F0, 0xF8FAFC, 0.26);
      tube.glass.fillRoundedRect(-tubeWidth / 2, -tubeHeight / 2, tubeWidth, tubeHeight, 24);
      tube.glass.lineStyle(2.5, strokeColor, 0.9);
      tube.glass.strokeRoundedRect(-tubeWidth / 2, -tubeHeight / 2, tubeWidth, tubeHeight, 24);

      tube.outline.lineStyle(1.4, 0xFFFFFF, 0.55);
      tube.outline.strokeRoundedRect(-tubeWidth / 2 + 5, -tubeHeight / 2 + 6, tubeWidth - 10, tubeHeight - 12, 20);

      tube.shine.lineStyle(2, this.theme.tubeHighlight, 0.4);
      tube.shine.strokeRoundedRect(-tubeWidth / 2 + 12, -tubeHeight / 2 + 14, tubeWidth * 0.24, tubeHeight - 28, 18);
      tube.shine.lineStyle(1.5, 0xFFFFFF, 0.35);
      tube.shine.beginPath();
      tube.shine.moveTo(-tubeWidth / 2 + 18, -tubeHeight / 2 + 18);
      tube.shine.lineTo(-tubeWidth / 2 + tubeWidth * 0.42, tubeHeight / 2 - 18);
      tube.shine.strokePath();

      const rimHeight = Math.max(8, tubeWidth * 0.12);
      const rimOuterWidth = tubeWidth * 1.06;
      const rimInnerWidth = tubeWidth * 0.86;
      const rimY = -tubeHeight / 2 - rimHeight * 0.35;
      const rimRadius = rimHeight * 0.55;

      tube.mouth.fillStyle(0x000000, 0.08);
      tube.mouth.fillRoundedRect(
        -rimOuterWidth / 2 + 2,
        rimY + rimHeight * 0.45,
        rimOuterWidth - 4,
        rimHeight * 0.6,
        rimRadius
      );
      tube.mouth.fillStyle(0xFFFFFF, 0.7);
      tube.mouth.fillRoundedRect(-rimOuterWidth / 2, rimY, rimOuterWidth, rimHeight, rimRadius);
      tube.mouth.lineStyle(1.4, strokeColor, 0.9);
      tube.mouth.strokeRoundedRect(-rimOuterWidth / 2, rimY, rimOuterWidth, rimHeight, rimRadius);
      tube.mouth.fillStyle(0xE2E8F0, 0.9);
      tube.mouth.fillRoundedRect(-rimInnerWidth / 2, rimY + rimHeight * 0.18, rimInnerWidth, rimHeight * 0.64, rimRadius * 0.8);
      tube.mouth.lineStyle(1, 0xFFFFFF, 0.75);
      tube.mouth.strokeRoundedRect(-rimInnerWidth / 2, rimY + rimHeight * 0.18, rimInnerWidth, rimHeight * 0.64, rimRadius * 0.8);

      tube.elements.forEach(element => element.destroy());
      tube.elements = [];

      const stack = this.tubeState[index] || [];
      const topBallOutsideOffset = elementRadius * 1.6;
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
        const isExhausted = this.isBallExhausted(ballState);
        if (isExhausted) {
          element.setTint(0x94A3B8);
        }
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

    const size = 80;
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

    const gradient = ctx.createRadialGradient(size * 0.32, size * 0.32, size * 0.1, size * 0.5, size * 0.5, size * 0.46);
    gradient.addColorStop(0, `rgba(${highlight.red}, ${highlight.green}, ${highlight.blue}, 0.9)`);
    gradient.addColorStop(0.35, `rgba(${base.red}, ${base.green}, ${base.blue}, 0.95)`);
    gradient.addColorStop(1, `rgba(${dark.red}, ${dark.green}, ${dark.blue}, 0.95)`);

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(size * 0.3, size * 0.28, size * 0.13, 0, Math.PI * 2);
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

    if (this.tubes.length > 0) {
      this.renderTubes();
    }
  }

  private handleTubeTap(index: number) {
    this.totalActions++;

    if (this.isGameOver) return;

    if (this.selectedTubeIndex === null) {
      this.sound.play(this.soundKeys.ballSelect, { volume: 0.6 });
      const selectedBallState = this.getTopBallState(index);
      if (this.tubeState[index].length === 0) {
        this.illegalPourAttempts++;
        this.flashMessage('เลือกหลอดที่มีสี', true);
        this.sound.play(this.soundKeys.wrongMove, { volume: 0.6 });
        return;
      }
      if (this.isBallFrozen(selectedBallState)) {
        this.flashMessage('ลูกบอลถูกแช่แข็ง', true);
        this.shakeTube(index);
        this.sound.play(this.soundKeys.wrongMove, { volume: 0.6 });
        return;
      }
      if (this.isBallExhausted(selectedBallState)) {
        this.flashMessage('บอลนี้หมดจำนวนครั้งแล้ว', true);
        this.shakeTube(index);
        this.sound.play(this.soundKeys.wrongMove, { volume: 0.6 });
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
    if (from === null) return;
    const fromBallState = this.getTopBallState(from);
    if (this.isBallFrozen(fromBallState)) {
      this.flashMessage('ลูกบอลถูกแช่แข็ง', true);
      this.selectedTubeIndex = null;
      this.renderTubes();
      return;
    }
    if (this.isBallExhausted(fromBallState)) {
      this.flashMessage('บอลนี้หมดจำนวนครั้งแล้ว', true);
      this.selectedTubeIndex = null;
      this.renderTubes();
      return;
    }
    const prevState = this.tubeState.map(tube => [...tube]);
    const result = this.performPourWithIds(
      this.tubeState,
      this.tubeBallIds,
      from,
      to,
      this.currentLevelConfig.tubeCapacity
    );

    if (!result) {
      this.illegalPourAttempts++;
      this.incorrectPours++;
      this.flashMessage('ย้ายไม่ได้', true);
      this.shakeTube(index);
      this.sound.play(this.soundKeys.wrongMove, { volume: 0.6 });
      this.selectedTubeIndex = null;
      this.renderTubes();
      return;
    }

    this.totalMoves++;
    this.correctPours++;
    this.tubeState = result.state;
    this.tubeBallIds = result.ids;
    this.applyMoveLimit(result.movedBallId);
    this.trackRedundantMove(from, to, prevState);
    this.moveHistory.push({ from, to, fromState: prevState });
    this.selectedTubeIndex = null;
    this.updateMoveText();
    this.updateProgressUI();
    this.renderTubes();
    this.animateMove(from, to);
    this.animatePour(from, to, prevState, result.state, true, result.movedBallId);
    this.sound.play(this.soundKeys.ballPour, { volume: 0.65 });
    this.handleTubeCompletion(prevState, result.state);
    this.checkWin();
  }

  private getTopBallState(index: number) {
    const ids = this.tubeBallIds[index];
    if (!ids || ids.length === 0) return undefined;
    const ballId = ids[ids.length - 1];
    return this.ballStates.get(ballId);
  }

  private applyMoveLimit(ballId?: number) {
    if (ballId === undefined) return;
    const ballState = this.ballStates.get(ballId);
    if (!ballState?.hasMoveLimit || ballState.remainingMoves === null) return;
    ballState.remainingMoves = Math.max(0, ballState.remainingMoves - 1);
    if (ballState.remainingMoves === 0 && !this.isGameOver) {
      if (!this.isPuzzleComplete()) {
        this.flashMessage('หมดจำนวนครั้งแล้ว', true);
        this.endGame(false);
      }
    }
  }

  private checkWin() {
    if (this.isPuzzleComplete()) {
      this.endGame(true);
    }
  }

  private isPuzzleComplete() {
    const { tubeCapacity } = this.currentLevelConfig;
    return this.tubeState.every(tube => {
      if (tube.length === 0) return true;
      if (tube.length !== tubeCapacity) return false;
      return tube.every(element => element === tube[0]);
    });
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

  private startTimer() {
    this.lastTimerPct = 100;
    this.lastTimerSec = Math.ceil(this.currentLevelConfig.targetTimeSeconds);
    this.timeWarningTriggered = false;
    this.stopTimerShake();
    this.timerEvent = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const limitMs = this.currentLevelConfig.targetTimeSeconds * 1000;
        const elapsed = Date.now() - this.startTime;
        const remainingMs = Math.max(0, limitMs - elapsed);
        const remainingSec = Math.ceil(remainingMs / 1000);
        const pct = limitMs > 0 ? Math.max(0, (remainingMs / limitMs) * 100) : 0;
        this.lastTimerPct = pct;
        this.lastTimerSec = remainingSec;
        this.drawTimerBar(pct, remainingSec);

        if (pct <= 25 && !this.timeWarningTriggered) {
          this.triggerTimeWarning();
        }

        if (remainingMs <= 0 && !this.isGameOver) {
          this.endGame(false);
        }

        this.updateFreezeState();
      }
    });

    if (this.currentLevelConfig.freezeFeature.enabled) {
      this.nextFreezeAt = Date.now() + this.freezeCooldownMs;
    }
  }

  private updateMoveText() {
    this.moveText.setText(this.getMoveLimitStatusText());
    this.moveText.setScale(1.05);
    this.tweens.add({
      targets: this.moveText,
      scale: 1,
      duration: 120,
      ease: 'Cubic.Out'
    });
  }

  private updateFreezeState() {
    if (!this.currentLevelConfig.freezeFeature.enabled || this.isGameOver) return;
    const now = Date.now();
    let hasThawed = false;
    this.ballStates.forEach(ballState => {
      if (ballState.frozenUntil > 0 && ballState.frozenUntil <= now) {
        ballState.frozenUntil = 0;
        hasThawed = true;
      }
    });
    if (hasThawed) {
      this.renderTubes();
    }
    if (now >= this.nextFreezeAt) {
      this.triggerFreeze();
    }
  }

  private triggerFreeze() {
    if (this.freezeCooldownMs <= 0) return;
    const freezeFeature = this.currentLevelConfig.freezeFeature;
    const now = Date.now();
    this.cancelSelectionOnFreeze();
    const candidates = this.tubeBallIds
      .flat()
      .filter(id => !this.isBallFrozen(this.ballStates.get(id)));

    if (candidates.length === 0) {
      this.nextFreezeAt = now + this.freezeCooldownMs;
      return;
    }

    const freezeCount = Math.min(candidates.length, freezeFeature.maxFrozenBalls);
    const frozenIds = Phaser.Utils.Array.Shuffle([...candidates]).slice(0, freezeCount);
    frozenIds.forEach(id => {
      const ballState = this.ballStates.get(id);
      if (ballState) {
        ballState.frozenUntil = now + this.freezeDurationMs;
      }
    });
    this.sound.play(this.soundKeys.freeze, { volume: 0.65 });
    this.nextFreezeAt = now + this.freezeCooldownMs;
    this.showWizardPopup();
    this.renderTubes();
  }

  private cancelSelectionOnFreeze() {
    if (this.selectedTubeIndex === null) return;
    const tube = this.tubes[this.selectedTubeIndex];
    this.selectedTubeIndex = null;
    this.renderTubes();
    if (tube) {
      this.tweens.add({
        targets: tube.container,
        scale: 1.03,
        duration: 120,
        yoyo: true,
        ease: 'Cubic.Out'
      });
    }
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

  private animatePour(
    from: number,
    to: number,
    prevState: number[][],
    nextState: number[][],
    fromPulled = false,
    movedBallId?: number
  ) {
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
    const pulledOffset = elementRadius * 1.6;
    const pulledTopY = -tubeHeight / 2 - elementRadius * 0.2;
    const startLocalY = fromPulled ? pulledTopY - pulledOffset : this.getElementY(tubeHeight, elementRadius, elementGap, fromIndex);
    const startY = sourceTube.container.y + startLocalY;
    const endX = targetTube.container.x;
    const endY = targetTube.container.y + this.getElementY(tubeHeight, elementRadius, elementGap, toIndex);

    const type = fromStack[fromIndex];
    const color = TUBE_SORT_COLORS[type % TUBE_SORT_COLORS.length];
    const textureKey = this.getBallTexture(color);
    const mover = this.add.container(startX, startY);
    mover.setDepth(10);
    const moverBall = this.add.image(0, 0, textureKey);
    moverBall.setDisplaySize(elementRadius * 2, elementRadius * 2);
    moverBall.setOrigin(0.5);
    mover.add(moverBall);

    const moverState = movedBallId !== undefined ? this.ballStates.get(movedBallId) : undefined;
    const moverFrozen = this.isBallFrozen(moverState);
    const moverExhausted = this.isBallExhausted(moverState);
    if (moverExhausted) {
      moverBall.setTint(0x94A3B8);
    }

    if (moverState?.hasMoveLimit) {
      this.createMoveCounterVisual(
        mover,
        0,
        0,
        elementRadius,
        Math.max(moverState.remainingMoves ?? 0, 0)
      );
    }

    if (moverFrozen) {
      this.createIceOverlay(mover, 0, 0, elementRadius);
    }

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

  private drawTimerBar(pct: number, remainingSec: number) {
    if (!this.timerBar) return;
    const { width } = this.scale;
    const radius = Math.min(30, Math.max(22, width * 0.04));
    const thickness = Math.max(5, radius * 0.28);
    const margin = Math.max(14, radius * 0.6);
    const x = width - margin - radius;
    const y = margin + radius;

    const safeColor = 0x22C55E;
    const warnColor = 0xF97316;
    const dangerColor = 0xEF4444;
    const isDanger = pct <= 10;
    const isWarn = pct <= 25 && !isDanger;
    const ringColor = isDanger ? dangerColor : isWarn ? warnColor : safeColor;

    this.timerBar.clear();
    this.timerBar.lineStyle(thickness, 0x1F2937, 0.15);
    this.timerBar.strokeCircle(x, y, radius);

    if (pct > 0) {
      this.timerBar.lineStyle(thickness, ringColor, 0.95);
      this.timerBar.beginPath();
      const startAngle = -Math.PI / 2;
      const sweep = (Math.PI * 2 * pct) / 100;
      this.timerBar.arc(x, y, radius, startAngle, startAngle + sweep, false);
      this.timerBar.strokePath();
    }

    if (this.timerText) {
      this.timerText.setPosition(x, y);
      this.timerText.setText(`${Math.max(0, remainingSec)}`);
      this.timerText.setColor(isWarn || isDanger ? '#B91C1C' : this.theme.text);
    }
  }

  private triggerTimeWarning() {
    this.timeWarningTriggered = true;
    this.startTimerShake();
    try {
      this.sound.play(this.soundKeys.timerWarning, { volume: 0.6 });
    } catch (error) {
      console.warn('timer-warning sound failed to play', error);
    }
  }

  private startTimerShake() {
    if (this.timerShakeTween || !this.timerContainer) return;
    this.timerShakeTween = this.tweens.add({
      targets: this.timerContainer,
      x: { from: -2, to: 2 },
      y: { from: 2, to: -2 },
      duration: 70,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }

  private stopTimerShake() {
    if (this.timerShakeTween) {
      this.timerShakeTween.stop();
      this.timerShakeTween = undefined;
    }
    this.timerContainer?.setPosition(0, 0);
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
    this.sound.play(this.soundKeys.tubeComplete, { volume: 0.7 });
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

  private endGame(success = true) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    const completionTimeMs = Date.now() - this.startTime;
    if (this.timerEvent) {
      this.timerEvent.remove();
    }
    this.stopTimerShake();

    if (this.bgMusic?.isPlaying) {
      this.bgMusic.stop();
    }

    if (success) {
      this.cameras.main.flash(200, 255, 255, 255, true);
      this.sound.play(this.soundKeys.levelPass, { volume: 0.7 });
      this.tubes.forEach((tube, index) => {
        const topType = this.tubeState[index]?.[0];
        if (topType !== undefined) {
          this.spawnBurst(tube.container.x, tube.container.y - this.tubeLayout.tubeHeight / 3, TUBE_SORT_COLORS[topType % TUBE_SORT_COLORS.length]);
        }
      });
    } else {
      this.cameras.main.shake(200, 0.01);
      this.sound.play(this.soundKeys.levelFail, { volume: 0.7 });
    }

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

    const stars = success ? calculateTubeSortStars(stats) : 0;
    const starHint = success ? this.getStarHint(stats, stars) : null;

    const onGameOver = this.registry.get('onGameOver');
    if (onGameOver) {
      onGameOver({
        ...stats,
        stars,
        starHint,
        success
      });
    }
  }

  private getStarHint(stats: TubeSortStats, stars: number) {
    if (stars >= 3) return null;

    const safeMoves = Math.max(stats.playerMoves, 1);
    const safeActions = Math.max(stats.totalActions, 1);
    const safeTime = Math.max(stats.completionTimeMs, 1000);

    const efficiencyScore = (stats.optimalMoves / safeMoves) * 100;
    const speedScore = (stats.targetTimeMs / safeTime) * 100;
    const accuracyScore = (stats.correctPours / safeActions) * 100;

    if (stars === 2) {
      if (efficiencyScore < 75) {
        return 'พยายามใช้จำนวนครั้งให้น้อยลงเพื่อได้ 3 ดาว';
      }
      if (speedScore < 70) {
        return 'ลองทำให้เร็วขึ้นเพื่อได้ 3 ดาว';
      }
      if (accuracyScore < 75) {
        return 'พยายามลดการเทผิดเพื่อได้ 3 ดาว';
      }
      return 'เล่นให้เนียนขึ้นเพื่อได้ 3 ดาว';
    }

    if (stars === 1) {
      if (efficiencyScore < 55) {
        return 'วางแผนดีขึ้นและลดจำนวนการย้ายที่ไม่จำเป็น';
      }
      if (accuracyScore < 60) {
        return 'โฟกัสให้มากขึ้นและลดการเทผิด';
      }
      if (speedScore < 55) {
        return 'ฝึกทำให้เร็วขึ้นอีกนิด';
      }
      return 'พยายามเพิ่มทั้งความเร็วและความแม่นยำ';
    }

    return 'ฝึกเล่นอีกครั้งเพื่อให้ได้ดาวเพิ่ม!';
  }
}