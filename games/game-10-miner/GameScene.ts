import * as Phaser from 'phaser';
import { MINER_LEVELS } from './levels';
import { calculateMinerStars } from '@/lib/scoring/miner';
import type { MinerDynamicEvent, MinerLevelConfig, MinerObjectConfig } from './levels';
import { createSeededRandom } from '@/lib/seededRandom';

type MinerObject = MinerObjectConfig & {
  id: number;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Container;
  grabbed: boolean;
  penaltyMs?: number;
};

type MinerStats = {
  levelPlayed: number;
  attempts: number;
  successGrabs: number;
  valuableGrabs: number;
  mistakes: number;
  totalValue: number;
  maxPossibleValue: number;
  decisionTimes: number[];
  targetDecisionTimeMs: number;
};

type ScheduledDynamicEvent = MinerDynamicEvent & {
  nextTriggerSec: number;
  warningTriggered?: boolean;
  eventIndex: number;
};

const COLORS = {
  gold: 0xf7c948,
  gem: 0x6c63ff,
  rock: 0x6b6b6b,
  cursed: 0x9b59b6,
  rope: 0x8b5a2b,
  hook: 0x4a4a4a,
  dirt: 0xc69c6d,
  dirtDark: 0xa97c50,
  skyTop: 0xf8f1e5,
  skyBottom: 0xf2d9b6
};

export class MinerGameScene extends Phaser.Scene {
  private currentLevelConfig!: MinerLevelConfig;
  private minerObjects: MinerObject[] = [];
  private hookContainer!: Phaser.GameObjects.Container;
  private ropeGraphics!: Phaser.GameObjects.Graphics;
  private hookPivot!: Phaser.GameObjects.Arc;
  private hookHead!: Phaser.GameObjects.Rectangle;
  private hookTip!: Phaser.GameObjects.Triangle;
  private hookJawLeft!: Phaser.GameObjects.Rectangle;
  private hookJawRight!: Phaser.GameObjects.Rectangle;
  private hookBaseY = 70;
  private hookCenterX = 0;
  private hookAngle = 0;
  private hookLockedAngle = 0;
  private hookAngularVelocity = 0;
  private hookAngularAcceleration = 0;
  private hookSwingSpeed = 0.00085;
  private hookSwingMaxAngle = Phaser.Math.DegToRad(32);
  private hookGravity = 0.0016;
  private hookDropGravity = 0.0026;
  private hookDropAngularGravity = 0.00016;
  private hookReady = true;
  private hookDropping = false;
  private hookPulling = false;
  private hookTarget: MinerObject | null = null;
  private hookRopeFullLength = 0;
  private hookRopeSwingLength = 0;
  private hookDropVelocity = 0;
  private hookDropDistance = 0;
  private hookPullSpeed = 0;
  private hookDropAngularVelocity = 0;
  private hookOpenProgress = 1;
  private hookLastDropEnd: { x: number; y: number } | null = null;
  private lastUpdateTime = 0;
  private levelStartTime = 0;
  private decisionStartTime = 0;
  private timerEvent!: Phaser.Time.TimerEvent;
  private timerBar!: Phaser.GameObjects.Graphics;
  private lastTimerPct = 100;
  private totalValue = 0;
  private hookDropCost = 0;
  private combinedValue = 0;
  private stats!: MinerStats;
  private rockMistakes = 0;
  private isPaused = false;
  private backgroundRect!: Phaser.GameObjects.Graphics;
  private groundRect!: Phaser.GameObjects.Graphics;
  private moneyText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private goalBar!: Phaser.GameObjects.Graphics;
  private minerCharacter?: Phaser.GameObjects.Container;
  private hookCostBubble?: Phaser.GameObjects.Container;
  private sparkleEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private audioContext?: AudioContext;
  private dynamicEvents: MinerDynamicEvent[] = [];
  private nextEventIndex = 0;
  private spawnArea = { left: 0, right: 0, top: 0, bottom: 0 };
  private activeVeinTweens = new Map<number, Phaser.Tweens.Tween>();
  private eventBanner?: Phaser.GameObjects.Text;
  private scheduledEvents: ScheduledDynamicEvent[] = [];
  private quakeWarningActive = false;
  private quakeOverlay?: Phaser.GameObjects.Rectangle;
  private warningIcon?: Phaser.GameObjects.Text;
  private warningTween?: Phaser.Tweens.Tween;
  private valueLabelChance = 0.35;
  private quakeBand = { minY: 0, maxY: 0 };

  private textureKeys = {
    sparkle: 'miner-sparkle',
    dust: 'miner-dust'
  };

  constructor() {
    super({ key: 'MinerGameScene' });
  }

  init(data: { level: number }) {
    const level = this.registry.get('level') ?? data.level ?? 1;
    this.currentLevelConfig = MINER_LEVELS[level] || MINER_LEVELS[1];
    this.resetState();
  }

  resetState() {
    this.minerObjects = [];
    this.hookAngle = Phaser.Math.DegToRad(-28);
    this.hookLockedAngle = this.hookAngle;
    this.hookAngularVelocity = this.hookSwingSpeed;
    this.hookAngularAcceleration = 0;
    this.hookDropVelocity = 0;
    this.hookDropDistance = 0;
    this.hookPullSpeed = 0;
    this.hookDropAngularVelocity = 0;
    this.hookLastDropEnd = null;
    this.hookOpenProgress = 1;
    this.lastUpdateTime = 0;
    this.hookReady = true;
    this.hookDropping = false;
    this.hookPulling = false;
    this.hookTarget = null;
    this.totalValue = 0;
    this.hookDropCost = this.currentLevelConfig.hook_drop_cost;
    this.combinedValue = this.currentLevelConfig.starter_money;
    this.valueLabelChance = 0.35;
    this.stats = {
      levelPlayed: this.currentLevelConfig.level,
      attempts: 0,
      successGrabs: 0,
      valuableGrabs: 0,
      mistakes: 0,
      totalValue: 0,
      maxPossibleValue: this.currentLevelConfig.max_possible_value,
      decisionTimes: [],
      targetDecisionTimeMs: this.currentLevelConfig.target_decision_time_ms
    };
    this.rockMistakes = 0;
    this.dynamicEvents = [...this.currentLevelConfig.dynamic_events].sort(
      (a, b) => a.timeSec - b.timeSec
    );
    this.nextEventIndex = 0;
    this.scheduledEvents = this.dynamicEvents.map((event, index) => ({
      ...event,
      nextTriggerSec: event.timeSec,
      warningTriggered: false,
      eventIndex: index
    }));
  }

  create() {
    const { width, height } = this.scale;
    this.hookCenterX = width / 2;
    this.hookBaseY = Math.max(100, height * 0.18);
    this.levelStartTime = Date.now();
    this.decisionStartTime = Date.now();

    this.updateHookLengths();

    this.drawBackground(width, height);
    this.createParticleTextures();
    this.createEmitters();
    if (typeof window !== 'undefined' && !this.audioContext) {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.audioContext = AudioContextClass ? new AudioContextClass() : undefined;
    }

    this.infoText = this.add
      .text(width / 2, height * 0.11, '', {
        fontFamily: 'Sarabun, Arial, sans-serif',
        fontSize: '18px',
        color: '#3b2f2f',
        fontStyle: '600'
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.moneyText = this.add
      .text(width / 2, height * 0.08, '', {
        fontFamily: 'Sarabun, Arial, sans-serif',
        fontSize: '26px',
        color: '#f6d776',
        fontStyle: '700',
        stroke: '#3b2a1c',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(6);
    this.moneyText.setVisible(false);

    this.eventBanner = this.add
      .text(width / 2, height * 0.19, '', {
        fontFamily: 'Sarabun, Arial, sans-serif',
        fontSize: '16px',
        color: '#4a3b2a',
        backgroundColor: 'rgba(244, 230, 196, 0.9)',
        padding: { x: 12, y: 6 }
      })
      .setOrigin(0.5)
      .setDepth(7)
      .setAlpha(0);

    this.goalBar = this.add.graphics().setDepth(6);

    this.createHook();
    this.createMinerCharacter();
    this.spawnObjects();
    this.createTimer();
    this.updateInfoText();
    this.updateMoneyText();

    this.input.on('pointerdown', () => {
      if (this.hookReady && !this.isPaused) {
        if (this.combinedValue < this.hookDropCost) {
          this.playTone(160, 0.12, 'sine', 0.18);
          this.endLevel(false);
          return;
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        this.playTone(520, 0.08, 'triangle', 0.2);
        this.releaseHook();
      }
    });

    this.scale.on('resize', () => {
      this.layoutScene();
      if (this.timerBar?.visible) {
        this.drawTimerBar(this.lastTimerPct);
      }
    });
  }

  createHook() {
    const { width, height } = this.scale;
    const ropeLength = this.hookRopeSwingLength || height * 0.35 * this.currentLevelConfig.rope_length;

    this.ropeGraphics = this.add.graphics().setDepth(8);
    this.hookPivot = this.add.circle(width / 2, this.hookBaseY, 8, 0x4e4e4e, 0.9).setDepth(12);
    this.hookPivot.setStrokeStyle(2, 0x1f1f1f, 0.8);

    this.hookContainer = this.add.container(0, 0).setDepth(13);
    this.hookHead = this.add.rectangle(0, 0, 30, 14, 0x5f5f5f).setOrigin(0.5, 0.5);
    this.hookHead.setStrokeStyle(2, 0x1f1f1f, 0.8);
    const plate = this.add.rectangle(0, -8, 22, 6, 0x2f2f2f).setOrigin(0.5);
    plate.setStrokeStyle(1.5, 0x191919, 0.8);
    this.hookTip = this.add.triangle(0, 14, 0, 0, 14, 22, -14, 22, 0x3d3d3d).setOrigin(0.5, 0);
    this.hookTip.setStrokeStyle(1.5, 0x1f1f1f, 0.8);

    this.hookJawLeft = this.add.rectangle(-11, 18, 7, 16, 0x3a3a3a).setOrigin(0.5, 0);
    this.hookJawRight = this.add.rectangle(11, 18, 7, 16, 0x3a3a3a).setOrigin(0.5, 0);
    this.hookJawLeft.setStrokeStyle(1.5, 0x161616, 0.8);
    this.hookJawRight.setStrokeStyle(1.5, 0x161616, 0.8);

    const ring = this.add.circle(0, -12, 7, 0x6a6a6a, 0.95);
    ring.setStrokeStyle(2, 0x2a2a2a, 0.8);
    const bolt = this.add.circle(0, -12, 2.5, 0x1f1f1f, 0.9);

    this.hookContainer.add([ring, bolt, plate, this.hookHead, this.hookTip, this.hookJawLeft, this.hookJawRight]);
    this.updateHookJaw(this.hookOpenProgress);

    const end = this.getHookEndPosition(ropeLength, this.hookAngle);
    this.hookContainer.setPosition(end.x, end.y);
    this.hookContainer.setRotation(this.hookAngle);
    this.drawRope(ropeLength, this.hookAngle, 0.3);
  }

  spawnObjects() {
    const { width, height } = this.scale;
    const rng = createSeededRandom(this.currentLevelConfig.spawn_seed);
    this.spawnArea = {
      left: width * 0.15,
      right: width * 0.85,
      top: height * 0.42,
      bottom: height * 0.9
    };
    const margin = 52;
    const spawnQueue: MinerObjectConfig[] = [];
    this.currentLevelConfig.objects.forEach((config) => {
      for (let i = 0; i < config.count; i++) {
        spawnQueue.push(config);
      }
    });

    for (let i = spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [spawnQueue[i], spawnQueue[j]] = [spawnQueue[j], spawnQueue[i]];
    }

    let id = 1;
    spawnQueue.forEach((config) => {
      let attempts = 0;
      let x = rng.nextInt(this.spawnArea.left, this.spawnArea.right);
      let y = rng.nextInt(this.spawnArea.top, this.spawnArea.bottom);
      while (!this.isSpawnPositionValid(x, y, config.size, margin) && attempts < 120) {
        x = rng.nextInt(this.spawnArea.left, this.spawnArea.right);
        y = rng.nextInt(this.spawnArea.top, this.spawnArea.bottom);
        attempts += 1;
      }

      const showValueLabel = rng.next() < this.valueLabelChance && config.value !== 0;
      const sprite = this.createMinerSprite(x, y, config, showValueLabel);
      const minerObject: MinerObject = {
        ...config,
        id: id++,
        x,
        y,
        sprite,
        grabbed: false
      };
      this.minerObjects.push(minerObject);
    });
  }

  private isSpawnPositionValid(x: number, y: number, size: number, margin: number) {
    return this.minerObjects.every((obj) => {
      const distance = Phaser.Math.Distance.Between(x, y, obj.x, obj.y);
      const minDistance = (size + obj.size) * 0.5 + margin;
      return distance >= minDistance;
    });
  }

  getColorForType(type: MinerObjectConfig['type']) {
    if (type.startsWith('copper')) return 0xcd7f32;
    if (type.startsWith('iron')) return 0x6f7b82;
    if (type.startsWith('silver')) return 0xcfd2d6;
    if (type.startsWith('diamond')) return 0xb9f2ff;
    if (type === 'gem') return COLORS.gem;
    if (type === 'rock') return COLORS.rock;
    if (type.startsWith('stone')) return 0x5a5a5a;
    if (type.startsWith('bomb')) return 0x2d2d2d;
    if (type === 'cursed') return COLORS.cursed;
    return COLORS.gold;
  }

  createTimer() {
    this.timerBar = this.add.graphics().setDepth(20);
    this.timerBar.setVisible(true);
    this.drawTimerBar(100);

    this.timerEvent = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (this.isPaused) return;
        const limitMs = this.currentLevelConfig.time_limit_sec * 1000;
        const elapsed = Date.now() - this.levelStartTime;
        const remainingMs = Math.max(0, limitMs - elapsed);
        const pct = Math.max(0, (remainingMs / limitMs) * 100);
        this.lastTimerPct = pct;
        this.drawTimerBar(pct);

        if (remainingMs <= 0) {
          this.endLevel(false);
        }
      }
    });
  }

  drawTimerBar(pct: number) {
    const { width, height } = this.scale;
    const barW = Math.min(420, width * 0.6);
    const barH = 10;
    const x = (width - barW) / 2;
    const y = height - 28;

    this.timerBar.clear();
    this.timerBar.fillStyle(0x1f1a16, 0.25);
    this.timerBar.fillRoundedRect(x, y, barW, barH, 6);

    const fillW = barW * (pct / 100);
    const warningColor = 0xe65c5c;
    const safeLeft = 0x7bcf9a;
    const safeMid = 0xf1c27a;
    const safeRight = 0xf6e6b5;
    const isWarning = pct < 25;

    if (fillW > 0) {
      if (isWarning) {
        this.timerBar.fillStyle(warningColor, 0.95);
      } else {
        this.timerBar.fillGradientStyle(safeLeft, safeMid, safeRight, safeMid, 0.95);
      }
      this.timerBar.fillRoundedRect(x, y, fillW, barH, 6);
    }
  }

  update(_time: number, delta: number) {
    if (this.isPaused) return;

    this.processDynamicEvents();

    const dt = Math.max(8, Math.min(delta, 32));

    if (this.hookDropping) {
      this.hookDropVelocity += this.hookDropGravity * dt;
      this.hookDropDistance = Math.min(
        this.hookRopeFullLength,
        this.hookDropDistance + this.hookDropVelocity * dt
      );

      const prevEnd = this.hookLastDropEnd ?? this.getHookEndPosition(this.hookDropDistance, this.hookLockedAngle);
      const end = this.updateHookVisual(this.hookDropDistance, this.hookLockedAngle, 1);
      this.updateGrabbedTargetPosition(end.x, end.y);
      this.checkDropGrabSegment(prevEnd, end);
      this.hookLastDropEnd = end;

      if (this.hookDropDistance >= this.hookRopeFullLength) {
        this.resolveGrab();
      }
      return;
    }

    if (this.hookPulling) {
      this.hookDropDistance = Math.max(
        this.hookRopeSwingLength,
        this.hookDropDistance - this.hookPullSpeed * dt
      );
      const end = this.updateHookVisual(this.hookDropDistance, this.hookLockedAngle, 1);
      this.updateGrabbedTargetPosition(end.x, end.y);

      if (this.hookDropDistance <= this.hookRopeSwingLength + 1) {
        this.finishPull();
      }
      return;
    }

    const ropeLength = this.hookRopeSwingLength;
    this.hookAngle += this.hookAngularVelocity * dt;
    if (this.hookAngle > this.hookSwingMaxAngle) {
      this.hookAngle = this.hookSwingMaxAngle;
      this.hookAngularVelocity = -Math.abs(this.hookSwingSpeed);
    } else if (this.hookAngle < -this.hookSwingMaxAngle) {
      this.hookAngle = -this.hookSwingMaxAngle;
      this.hookAngularVelocity = Math.abs(this.hookSwingSpeed);
    }

    this.updateHookVisual(ropeLength, this.hookAngle, 0.25);
  }

  releaseHook() {
    this.hookReady = false;
    this.hookDropping = true;
    this.stats.attempts += 1;
    this.hookDropAngularVelocity = 0;
    this.animateMinerReaction();

    this.combinedValue -= this.hookDropCost;
    this.updateMoneyText();

    this.animateHookOpen(1, 120);
    if (this.hookRopeFullLength <= this.hookRopeSwingLength) {
      this.updateHookLengths();
    }
    this.hookDropVelocity = 0;
    this.hookDropDistance = this.hookRopeSwingLength;
    this.hookLockedAngle = this.hookAngle;
    this.updateHookVisual(this.hookDropDistance, this.hookLockedAngle, 1);
    this.hookLastDropEnd = this.getHookEndPosition(this.hookDropDistance, this.hookLockedAngle);

    const decisionTime = Date.now() - this.decisionStartTime;
    this.stats.decisionTimes.push(decisionTime);
  }

  resolveGrab() {
    if (this.hookTarget) {
      this.handleGrabResult();
    } else {
      this.stats.mistakes += 1;
      this.playTone(140, 0.12, 'sine', 0.12);
    }

    this.hookDropping = false;
    this.pullHook();
  }

  pullHook() {
    this.hookPulling = true;
    const target = this.hookTarget;
    const weight = target?.weight ?? 1.0;
    const baseDuration = Phaser.Math.Clamp(
      (820 * weight) / this.currentLevelConfig.pull_speed_base,
      420,
      1600
    );
    const distance = Math.max(1, this.hookDropDistance - this.hookRopeSwingLength);
    this.hookPullSpeed = distance / baseDuration;

    if (target) {
      this.playTone(260, 0.1, 'triangle', 0.18);
    }
  }

  private finishPull() {
    const target = this.hookTarget;
    if (target) {
      target.sprite.setVisible(false);
      if (!target.isHazard) {
        this.totalValue += target.value;
        this.stats.totalValue = this.totalValue;
        this.combinedValue += target.value;
        this.spawnScorePopup(target.x, target.y, target.value);
        this.sparkleEmitter?.explode(18, target.x, target.y);
        this.playTone(660, 0.12, 'sine', 0.22);
      } else {
        if (target.value < 0) {
          this.totalValue += target.value;
          this.stats.totalValue = this.totalValue;
          this.combinedValue += target.value;
          this.spawnScorePopup(target.x, target.y, target.value);
        }
        this.dustEmitter?.explode(14, target.x, target.y);
      }
    }

    this.hookTarget = null;
    this.hookPulling = false;
    this.hookReady = true;
    this.hookDropDistance = this.hookRopeSwingLength;
    this.hookAngle = this.hookLockedAngle;
    this.hookDropAngularVelocity = 0;
    this.hookLastDropEnd = null;
    this.animateHookOpen(1, 160);
    this.decisionStartTime = Date.now();
    this.updateInfoText();
    this.checkWin();
    if (!this.isPaused && this.combinedValue < 0) {
      this.endLevel(false);
    }
  }

  checkWin() {
    if (this.totalValue >= this.currentLevelConfig.money_goal) {
      this.endLevel(true);
    }
  }

  updateInfoText() {
    this.infoText.setText(
      `ทรัพย์รวม: ${this.combinedValue} | เป้าหมาย: ${this.currentLevelConfig.money_goal}`
    );
    this.drawGoalBar();
  }

  private updateMoneyText() {
    if (!this.infoText) return;
    this.updateInfoText();
  }

  private getStarHint(payload: {
    total_value: number;
    goal_amount: number;
    valuable_grabs: number;
    attempts: number;
    mistakes: number;
    avg_decision_time_ms: number;
    target_decision_time_ms: number;
  }) {
    const safeAttempts = Math.max(payload.attempts, 1);
    const goalAmount = Math.max(payload.goal_amount, 1);
    const valueRatio = payload.total_value / goalAmount;
    const efficiency = payload.valuable_grabs / safeAttempts;
    const planning = Math.min(100, Math.max(0, valueRatio * efficiency * 100));
    const focus = Math.min(100, Math.max(0, (1 - payload.mistakes / safeAttempts) * 100));
    const speed = Math.min(
      100,
      Math.max(0, (payload.target_decision_time_ms / Math.max(payload.avg_decision_time_ms, 1)) * 100)
    );

    const weakArea = Math.min(planning, focus, speed);

    if (weakArea === planning) {
      return 'พยายามเก็บของมีค่ามากขึ้น เช่น ทองคำหรือเพชร';
    }
    if (weakArea === focus) {
      return 'หลีกเลี่ยงหินและของอันตรายเพื่อลดความผิดพลาด';
    }
    return 'ตัดสินใจให้เร็วขึ้นเมื่อเลือกเป้าหมาย';
  }

  private createMinerCharacter() {
    if (this.minerCharacter) this.minerCharacter.destroy();
    if (this.hookCostBubble) this.hookCostBubble.destroy();

    const { width } = this.scale;
    const baseX = this.hookCenterX - Math.min(240, width * 0.28);
    const baseY = this.hookBaseY + 108;

    const miner = this.add.container(baseX, baseY).setDepth(7);

    const shadow = this.add.ellipse(0, 36, 44, 14, 0x1f1410, 0.22);

    const legs = this.add.rectangle(0, 24, 28, 18, 0x2f3b52, 1);
    legs.setStrokeStyle(2, 0x1e273a, 0.7);
    const boots = this.add.rectangle(0, 34, 34, 10, 0x4a2d18, 1);
    boots.setStrokeStyle(1.5, 0x2f1b0c, 0.8);

    const torso = this.add.rectangle(0, 6, 36, 30, 0x4b74c3, 1);
    torso.setStrokeStyle(2, 0x2d3f62, 0.8);
    const bib = this.add.rectangle(0, 6, 18, 16, 0x3f63a8, 1);
    bib.setStrokeStyle(1.5, 0x2d3f62, 0.8);
    const belt = this.add.rectangle(0, 16, 30, 4, 0x2b1f1a, 1);
    const buckle = this.add.rectangle(0, 16, 6, 4, 0xc9a24d, 1);
    const strapLeft = this.add.rectangle(-10, -4, 6, 12, 0x3f63a8, 1);
    const strapRight = this.add.rectangle(10, -4, 6, 12, 0x3f63a8, 1);

    const neck = this.add.rectangle(0, -12, 8, 6, 0xe3c19a, 1);
    const head = this.add.circle(0, -22, 12, 0xf2d6b3, 1);
    head.setStrokeStyle(1.5, 0xd4b291, 0.6);

    const hatTop = this.add.circle(0, -36, 15, 0xf2c94c, 1);
    hatTop.setStrokeStyle(2, 0xc79b2a, 0.8);
    const hatBrim = this.add.rectangle(0, -29, 34, 6, 0xf2c94c, 1);
    hatBrim.setStrokeStyle(2, 0xc79b2a, 0.8);
    const lampGlow = this.add.circle(11, -38, 8, 0xfff3c2, 0.35);
    const lampBase = this.add.circle(11, -38, 4.5, 0xffffff, 0.95);
    lampBase.setStrokeStyle(1.5, 0xc79b2a, 0.8);

    const eyeLeft = this.add.circle(-4, -23, 2, 0x2b1b12, 1);
    const eyeRight = this.add.circle(4, -23, 2, 0x2b1b12, 1);
    const browLeft = this.add.rectangle(-4, -26, 6, 2, 0x6b4b3a, 1);
    const browRight = this.add.rectangle(4, -26, 6, 2, 0x6b4b3a, 1);

    const mouth = this.add.graphics();
    mouth.lineStyle(2, 0x6b4b3a, 1);
    mouth.beginPath();
    mouth.arc(0, -18, 4, 0, Math.PI);
    mouth.strokePath();

    const beard = this.add.circle(0, -16, 7, 0x7a4b2a, 1);

    const armLeft = this.add.rectangle(-20, 6, 7, 18, 0xf2d6b3, 1);
    const armRight = this.add.rectangle(20, 6, 7, 18, 0xf2d6b3, 1);

    const pickaxeHandle = this.add.rectangle(26, -2, 4, 30, 0x8b5a2b, 1);
    pickaxeHandle.setRotation(Phaser.Math.DegToRad(18));
    const pickaxeHead = this.add.rectangle(34, -18, 18, 4, 0x6b6b6b, 1);
    pickaxeHead.setRotation(Phaser.Math.DegToRad(18));

    miner.add([
      shadow,
      pickaxeHandle,
      pickaxeHead,
      armLeft,
      armRight,
      legs,
      boots,
      torso,
      bib,
      belt,
      buckle,
      strapLeft,
      strapRight,
      neck,
      head,
      beard,
      mouth,
      eyeLeft,
      eyeRight,
      browLeft,
      browRight,
      hatTop,
      hatBrim,
      lampGlow,
      lampBase
    ]);

    const bubble = this.add.container(baseX, baseY - 94).setDepth(7);
    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0xfff6df, 0.95);
    bubbleBg.lineStyle(2, 0xd6b989, 0.8);
    bubbleBg.fillRoundedRect(-64, -18, 128, 36, 12);
    bubbleBg.strokeRoundedRect(-64, -18, 128, 36, 12);
    bubbleBg.fillTriangle(-6, 18, 6, 18, 0, 30);

    const bubbleText = this.add.text(0, 0, `💰 -${this.hookDropCost} ต่อครั้ง`, {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '14px',
      color: '#4a3b2a',
      fontStyle: '700'
    }).setOrigin(0.5);

    bubble.add([bubbleBg, bubbleText]);

    this.minerCharacter = miner;
    this.hookCostBubble = bubble;
  }

  private animateMinerReaction() {
    if (!this.minerCharacter) return;
    this.tweens.killTweensOf(this.minerCharacter);
    this.minerCharacter.setScale(1);
    this.minerCharacter.setAngle(0);

    this.tweens.add({
      targets: this.minerCharacter,
      scale: 1.05,
      angle: -4,
      duration: 120,
      yoyo: true,
      ease: 'Quad.out'
    });
  }


  endLevel(success: boolean) {
    if (this.isPaused) return;
    this.isPaused = true;
    if (this.timerEvent) this.timerEvent.remove();
    this.timerBar.setVisible(false);

    const onGameOver = this.registry.get('onGameOver');
    if (onGameOver) {
      const avgDecisionTime = this.stats.decisionTimes.length
        ? this.stats.decisionTimes.reduce((sum, t) => sum + t, 0) / this.stats.decisionTimes.length
        : this.currentLevelConfig.target_decision_time_ms;

      const payload = {
        levelPlayed: this.currentLevelConfig.level,
        attempts: this.stats.attempts,
        success_grabs: this.stats.successGrabs,
        valuable_grabs: this.stats.valuableGrabs,
        mistakes: this.stats.mistakes,
        total_value: this.totalValue,
        max_possible_value: this.currentLevelConfig.max_possible_value,
        goal_amount: this.currentLevelConfig.money_goal,
        avg_decision_time_ms: avgDecisionTime,
        target_decision_time_ms: this.currentLevelConfig.target_decision_time_ms,
        success
      };

      const forgivenRockMistakes = Math.min(this.rockMistakes, 2);
      const adjustedMistakes = Math.max(0, payload.mistakes - forgivenRockMistakes);
      const starPayload = {
        ...payload,
        mistakes: adjustedMistakes
      };
      const stars = success ? calculateMinerStars(starPayload) : 0;
      const starHint = stars < 3 ? this.getStarHint(starPayload) : null;

      onGameOver({
        ...payload,
        stars,
        starHint
      });
    }
  }

  layoutScene() {
    const { width, height } = this.scale;
    this.drawBackground(width, height);
    this.hookCenterX = width / 2;
    this.hookBaseY = Math.max(100, height * 0.18);
    this.updateHookLengths();
    if (this.hookPivot) {
      this.hookPivot.setPosition(this.hookCenterX, this.hookBaseY);
    }
    this.updateHookVisual(
      this.hookDropping || this.hookPulling ? this.hookDropDistance : this.hookRopeSwingLength,
      this.hookDropping || this.hookPulling ? this.hookLockedAngle : this.hookAngle,
      this.hookDropping || this.hookPulling ? 1 : 0.25
    );
    this.drawGoalBar();
    if (this.eventBanner) {
      this.eventBanner.setPosition(this.scale.width / 2, height * 0.19);
    }
    if (this.moneyText) {
      this.moneyText.setPosition(this.scale.width / 2, height * 0.08);
    }
    if (this.infoText) {
      this.infoText.setPosition(this.scale.width / 2, height * 0.11);
    }
    this.layoutMinerUI();
  }

  private layoutMinerUI() {
    if (!this.minerCharacter || !this.hookCostBubble) return;
    const { width } = this.scale;
    const baseX = this.hookCenterX - Math.min(240, width * 0.28);
    const baseY = this.hookBaseY + 108;
    this.minerCharacter.setPosition(baseX, baseY);
    this.hookCostBubble.setPosition(baseX, baseY - 94);
  }

  private updateHookLengths() {
    const safeHeight = this.scale.height || 600;
    const baseLength = safeHeight * 0.35 * this.currentLevelConfig.rope_length;
    this.hookRopeSwingLength = Phaser.Math.Clamp(baseLength * 0.28, 60, 140);
    this.hookRopeFullLength = Math.max(baseLength * 1.7, this.hookRopeSwingLength + 120);
    this.hookDropGravity = 0.0024 * (safeHeight / 600);
    this.hookSwingSpeed = 0.00085 * (safeHeight / 600);
    this.hookDropAngularGravity = 0.00016 * (safeHeight / 600);
  }

  private checkDropGrabSegment(start: { x: number; y: number }, end: { x: number; y: number }) {
    if (this.hookTarget) return;
    const available = this.minerObjects.filter(obj => !obj.grabbed);
    let closest: MinerObject | null = null;
    let minDist = Infinity;
    let closestT = Infinity;

    for (const obj of available) {
      const { distance, t } = this.getPointToSegmentDistance({ x: obj.x, y: obj.y }, start, end);
      if (distance < obj.size + 8) {
        if (t < closestT || (Math.abs(t - closestT) < 0.0001 && distance < minDist)) {
          closestT = t;
          minDist = distance;
          closest = obj;
        }
      }
    }

    if (closest) {
      closest.grabbed = true;
      this.hookTarget = closest;
      this.handleGrabResult();
      this.hookDropping = false;
      this.pullHook();
    }
  }

  private getPointToSegmentDistance(
    point: { x: number; y: number },
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) {
    const vx = end.x - start.x;
    const vy = end.y - start.y;
    const wx = point.x - start.x;
    const wy = point.y - start.y;
    const lenSq = vx * vx + vy * vy || 1;
    const t = Phaser.Math.Clamp((wx * vx + wy * vy) / lenSq, 0, 1);
    const projX = start.x + t * vx;
    const projY = start.y + t * vy;
    const dx = point.x - projX;
    const dy = point.y - projY;
    return { distance: Math.sqrt(dx * dx + dy * dy), t };
  }

  private handleGrabResult() {
    const target = this.hookTarget;
    if (!target) return;

    this.stats.successGrabs += 1;
    if (!target.isHazard) {
      this.stats.valuableGrabs += 1;
    }

    this.animateHookOpen(0.1, 140);

    if (target.isHazard) {
      this.stats.mistakes += 1;
      if (target.type === 'rock') {
        this.rockMistakes += 1;
      }
      this.playTone(180, 0.15, 'sawtooth', 0.18);
    }

    if (target.type === 'cursed' && this.currentLevelConfig.hazards.cursed_items_enabled) {
      this.stats.mistakes += 1;
      const penaltyMs = target.penaltyMs ?? 5000;
      this.levelStartTime -= penaltyMs;
    }
  }

  private updateHookVisual(ropeLength: number, angle: number, tension: number) {
    const end = this.getHookEndPosition(ropeLength, angle);
    this.drawRope(ropeLength, angle, tension);
    this.hookContainer.setPosition(end.x, end.y);
    this.hookContainer.setRotation(angle);
    return end;
  }

  private updateGrabbedTargetPosition(x: number, y: number) {
    if (this.hookTarget) {
      this.hookTarget.sprite.setPosition(x, y + 18);
    }
  }

  private getHookEndPosition(length: number, angle: number) {
    return {
      x: this.hookCenterX + Math.sin(angle) * length,
      y: this.hookBaseY + Math.cos(angle) * length
    };
  }

  private updateHookJaw(progress: number) {
    const openAngle = Phaser.Math.DegToRad(18 + progress * 20);
    this.hookJawLeft.setRotation(-openAngle);
    this.hookJawRight.setRotation(openAngle);
  }

  private animateHookOpen(target: number, duration = 140) {
    this.tweens.add({
      targets: this,
      hookOpenProgress: target,
      duration,
      ease: 'Quad.out',
      onUpdate: () => this.updateHookJaw(this.hookOpenProgress)
    });
  }

  private drawRope(length: number, angle: number, tension: number) {
    if (!this.ropeGraphics) return;
    const start = { x: this.hookCenterX, y: this.hookBaseY };
    const end = this.getHookEndPosition(length, angle);
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const perp = { x: Math.cos(angle), y: -Math.sin(angle) };
    const curveAmount = (1 - tension) * Math.sin(angle) * length * 0.12;
    const control = {
      x: mid.x + perp.x * curveAmount,
      y: mid.y + perp.y * curveAmount
    };

    this.ropeGraphics.clear();
    this.ropeGraphics.lineStyle(3, 0x6b4725, 0.9);
    this.ropeGraphics.beginPath();
    const samples = 20;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const point = this.getQuadraticPoint(t, start, control, end);
      if (i === 0) {
        this.ropeGraphics.moveTo(point.x, point.y);
      } else {
        this.ropeGraphics.lineTo(point.x, point.y);
      }
    }
    this.ropeGraphics.strokePath();

    const linkCount = Math.max(7, Math.round(length / 16));
    for (let i = 0; i <= linkCount; i++) {
      const t = i / linkCount;
      const point = this.getQuadraticPoint(t, start, control, end);
      this.ropeGraphics.fillStyle(0x7a4b23, 0.95);
      this.ropeGraphics.fillRoundedRect(point.x - 3, point.y - 2.5, 6, 5, 2);
      this.ropeGraphics.fillStyle(0x3b2512, 0.6);
      this.ropeGraphics.fillRoundedRect(point.x - 1.5, point.y - 1.5, 3, 3, 1.2);
    }
  }

  private getQuadraticPoint(t: number, p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }) {
    const inv = 1 - t;
    return {
      x: inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
      y: inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y
    };
  }

  private drawBackground(width: number, height: number) {
    if (this.backgroundRect) this.backgroundRect.destroy();
    if (this.groundRect) this.groundRect.destroy();
    this.backgroundRect = this.add.graphics().setDepth(0);
    this.backgroundRect.fillGradientStyle(0xe8dcca, 0xe8dcca, 0x8b6b4a, 0x5a4a3a, 1);
    this.backgroundRect.fillRect(0, 0, width, height);

    this.groundRect = this.add.graphics().setDepth(1);
    const groundTop = height * 0.36;
    const groundHeight = height * 0.6;
    this.groundRect.fillGradientStyle(0xa87b4f, 0xa87b4f, 0x5b3d24, 0x3a2718, 1);
    this.groundRect.fillRoundedRect(width * 0.03, groundTop, width * 0.94, groundHeight, 28);
    this.groundRect.fillStyle(0x3a2718, 0.18);
    for (let i = 0; i < 10; i++) {
      const stripY = groundTop + i * (groundHeight / 10);
      this.groundRect.fillRect(width * 0.06, stripY, width * 0.88, 2);
    }
  }

  private createMinerSprite(x: number, y: number, config: MinerObjectConfig, showValueLabel = false) {
    const baseColor = this.getColorForType(config.type);
    const sprite = this.add.container(x, y).setDepth(5);
    const shadow = this.add.circle(3, 5, config.size + 4, 0x1c1412, 0.22);
    sprite.add(shadow);

    if (config.type.startsWith('diamond')) {
      const outer = this.add.polygon(0, 0, [
        0, -config.size,
        config.size * 0.7, -config.size * 0.2,
        config.size * 0.5, config.size,
        -config.size * 0.5, config.size,
        -config.size * 0.7, -config.size * 0.2
      ], baseColor, 1);
      outer.setStrokeStyle(2, 0xffffff, 0.7);
      const facet = this.add.polygon(0, config.size * 0.05, [
        0, -config.size * 0.35,
        config.size * 0.25, -config.size * 0.05,
        0, config.size * 0.3,
        -config.size * 0.25, -config.size * 0.05
      ], 0xffffff, 0.25);
      const inner = this.add.polygon(0, -config.size * 0.1, [
        0, -config.size * 0.6,
        config.size * 0.35, -config.size * 0.1,
        0, config.size * 0.5,
        -config.size * 0.35, -config.size * 0.1
      ], 0xffffff, 0.35);
      sprite.add([outer, facet, inner]);
    } else if (config.type.startsWith('silver')) {
      const outer = this.add.circle(0, 0, config.size + 1, 0xe5e9ee, 0.95);
      const body = this.add.circle(0, 0, config.size, baseColor, 1);
      body.setStrokeStyle(2, 0x9da3a8, 0.6);
      const shine = this.add.circle(-config.size * 0.35, -config.size * 0.3, config.size * 0.42, 0xffffff, 0.55);
      const groove = this.add.circle(config.size * 0.25, config.size * 0.18, config.size * 0.32, 0xb7bcc3, 0.35);
      sprite.add([outer, body, groove, shine]);
    } else if (config.type.startsWith('copper')) {
      const body = this.add.circle(0, 0, config.size, baseColor, 1);
      body.setStrokeStyle(2, 0x6d3d1f, 0.6);
      const patina = this.add.circle(config.size * 0.2, -config.size * 0.1, config.size * 0.35, 0xb86b3f, 0.35);
      const shine = this.add.circle(-config.size * 0.35, -config.size * 0.28, config.size * 0.35, 0xf7e6d1, 0.4);
      sprite.add([body, patina, shine]);
    } else if (config.type.startsWith('iron')) {
      const body = this.add.rectangle(0, 0, config.size * 1.45, config.size * 1.15, baseColor, 1);
      body.setStrokeStyle(2, 0x2d3438, 0.7);
      const highlight = this.add.rectangle(-config.size * 0.25, -config.size * 0.2, config.size * 0.85, config.size * 0.4, 0xffffff, 0.2);
      const scratch = this.add.rectangle(config.size * 0.15, config.size * 0.05, config.size * 0.7, 2, 0x1f1f1f, 0.4);
      scratch.setRotation(Phaser.Math.DegToRad(-12));
      sprite.add([body, highlight, scratch]);
    } else if (config.type.startsWith('stone')) {
      const body = this.add.circle(0, 0, config.size, baseColor, 1);
      body.setStrokeStyle(2, 0x2f2f2f, 0.6);
      const crack = this.add.rectangle(0, 0, config.size * 0.7, 3, 0x3b2a1a, 0.65);
      crack.setRotation(Phaser.Math.DegToRad(18));
      const pebble = this.add.circle(-config.size * 0.3, config.size * 0.25, config.size * 0.2, 0x4b4b4b, 0.5);
      const penalty = this.add.text(0, 0, `${config.value}`, {
        fontFamily: 'Sarabun, Arial, sans-serif',
        fontSize: `${Math.max(11, config.size * 0.45)}px`,
        color: '#f0dede'
      }).setOrigin(0.5).setAlpha(0.8);
      sprite.add([body, crack, pebble, penalty]);
    } else if (config.type.startsWith('bomb')) {
      const body = this.add.circle(0, 0, config.size, baseColor, 1);
      body.setStrokeStyle(2, 0x141414, 0.7);
      const fuse = this.add.rectangle(0, -config.size - 4, 4, 10, 0xd9a441, 1);
      const fuseTip = this.add.circle(0, -config.size - 10, 4, 0xff5a5a, 1);
      const bolt = this.add.circle(-config.size * 0.2, -config.size * 0.15, config.size * 0.18, 0x2b2b2b, 0.8);
      const warning = this.add.text(0, 0, '💣', {
        fontFamily: 'Sarabun, Arial, sans-serif',
        fontSize: `${Math.max(12, config.size * 0.6)}px`
      }).setOrigin(0.5).setAlpha(0.85);
      sprite.add([body, bolt, fuse, fuseTip, warning]);
      this.tweens.add({
        targets: fuseTip,
        alpha: { from: 1, to: 0.4 },
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    } else if (config.type === 'rock') {
      const body = this.add.circle(0, 0, config.size, baseColor, 1);
      body.setStrokeStyle(2, 0x2b2b2b, 0.6);
      const crack = this.add.rectangle(0, 0, config.size * 0.6, 3, 0x4a3b2a, 0.6);
      crack.setRotation(Phaser.Math.DegToRad(20));
      const rubble = this.add.circle(config.size * 0.25, -config.size * 0.2, config.size * 0.18, 0x4a4a4a, 0.55);
      sprite.add([body, crack, rubble]);
    } else {
      const outer = this.add.circle(0, 0, config.size + 3, 0x3b2f2f, 0.2);
      const body = this.add.circle(0, 0, config.size, baseColor, 1);
      body.setStrokeStyle(2, 0x1f1f1f, 0.4);
      const shine = this.add.circle(-config.size * 0.32, -config.size * 0.32, config.size * 0.42, 0xffffff, 0.55);
      const ridge = this.add.circle(config.size * 0.25, config.size * 0.1, config.size * 0.3, 0xf7d77f, 0.35);
      sprite.add([outer, body, ridge, shine]);
    }

    if (config.type === 'cursed') {
      const aura = this.add.circle(0, 0, config.size + 6, 0x9b59b6, 0.3);
      sprite.add(aura);
      this.tweens.add({
        targets: aura,
        alpha: { from: 0.15, to: 0.45 },
        duration: 700,
        yoyo: true,
        repeat: -1
      });
    }

    if (config.type === 'gem') {
      this.sparkleEmitter?.explode(6, x, y);
    }

    if (showValueLabel) {
      const labelBg = this.add.circle(0, -config.size - 8, Math.max(9, config.size * 0.35), 0x2f1b0c, 0.85);
      const label = this.add.text(0, -config.size - 8, `${config.value}`, {
        fontFamily: 'Sarabun, Arial, sans-serif',
        fontSize: `${Math.max(10, config.size * 0.35)}px`,
        color: '#f7e2a1',
        fontStyle: '700'
      }).setOrigin(0.5);
      sprite.add([labelBg, label]);
    }

    return sprite;
  }

  private drawGoalBar() {
    if (!this.goalBar) return;
    const { width, height } = this.scale;
    const barW = Math.min(360, width * 0.5);
    const barH = 8;
    const x = (width - barW) / 2;
    const y = height * 0.14;
    const pct = Phaser.Math.Clamp(this.totalValue / this.currentLevelConfig.money_goal, 0, 1);

    this.goalBar.clear();
    this.goalBar.fillStyle(0x2f261c, 0.22);
    this.goalBar.fillRoundedRect(x, y, barW, barH, 6);
    if (pct > 0) {
      this.goalBar.fillGradientStyle(0xf7d77f, 0xf1c27a, 0xe3a85c, 0xf1c27a, 0.95);
      this.goalBar.fillRoundedRect(x, y, barW * pct, barH, 6);
    }
  }

  private createParticleTextures() {
    if (this.textures.exists(this.textureKeys.sparkle)) return;

    const sparkle = this.make.graphics({ x: 0, y: 0 });
    sparkle.fillStyle(0xffffff, 1);
    sparkle.fillCircle(4, 4, 4);
    sparkle.generateTexture(this.textureKeys.sparkle, 8, 8);
    sparkle.destroy();

    const dust = this.make.graphics({ x: 0, y: 0 });
    dust.fillStyle(0xc69c6d, 1);
    dust.fillCircle(3, 3, 3);
    dust.generateTexture(this.textureKeys.dust, 6, 6);
    dust.destroy();
  }

  private createEmitters() {
    this.sparkleEmitter = this.add.particles(0, 0, this.textureKeys.sparkle, {
      lifespan: 500,
      speed: { min: 40, max: 120 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      quantity: 0
    }).setDepth(12);

    this.dustEmitter = this.add.particles(0, 0, this.textureKeys.dust, {
      lifespan: 600,
      speed: { min: 20, max: 80 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.8, end: 0 },
      quantity: 0
    }).setDepth(9);
  }

  private spawnScorePopup(x: number, y: number, value: number) {
    const isPenalty = value < 0;
    const displayValue = isPenalty ? `${value}` : `+${value}`;
    const text = this.add
      .text(x, y - 10, displayValue,
        {
          fontFamily: 'Sarabun, Arial, sans-serif',
          fontSize: '17px',
          color: isPenalty ? '#f26d6d' : '#f4d47c',
          fontStyle: '600'
        })
      .setOrigin(0.5)
      .setDepth(15);

    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 700,
      ease: 'Quad.out',
      onComplete: () => text.destroy()
    });
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume = 0.15) {
    if (!this.audioContext || this.audioContext.state === 'suspended') return;

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private processDynamicEvents() {
    if (!this.scheduledEvents.length) return;

    const elapsedSec = (Date.now() - this.levelStartTime) / 1000;

    this.scheduledEvents.forEach((event) => {
      const warningSec = event.payload?.warningSec ?? 3;
      if (
        event.type === 'shift_layer' &&
        !event.warningTriggered &&
        elapsedSec >= event.nextTriggerSec - warningSec
      ) {
        event.warningTriggered = true;
        this.triggerQuakeWarning(warningSec);
      }

      if (elapsedSec >= event.nextTriggerSec) {
        this.triggerDynamicEvent(event, event.eventIndex);
        event.warningTriggered = false;
        if (event.repeat_interval) {
          event.nextTriggerSec += event.repeat_interval;
        } else {
          event.nextTriggerSec = Number.MAX_SAFE_INTEGER;
        }
      }
    });
  }

  private triggerQuakeWarning(durationSec: number) {
    if (this.quakeWarningActive) return;
    this.quakeWarningActive = true;
    const { width, height } = this.scale;
    if (!this.quakeOverlay) {
      this.quakeOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x4b2f1f, 0.18).setDepth(18);
    }
    if (!this.warningIcon) {
      this.warningIcon = this.add.text(width / 2, height * 0.22, '⚠️ แผ่นดินกำลังสั่น! ⚠️', {
        fontFamily: 'Sarabun, Arial, sans-serif',
        fontSize: '20px',
        color: '#f5e2c8',
        backgroundColor: 'rgba(74, 50, 32, 0.8)',
        padding: { x: 14, y: 6 }
      }).setOrigin(0.5).setDepth(19);
    }

    this.warningTween?.stop();
    this.warningTween = this.tweens.add({
      targets: [this.quakeOverlay, this.warningIcon],
      alpha: { from: 0.2, to: 0.6 },
      duration: 300,
      yoyo: true,
      repeat: Math.floor((durationSec * 1000) / 300)
    });

    this.cameras.main.shake(durationSec * 1000, 0.004);

    this.time.delayedCall(durationSec * 1000, () => {
      this.quakeWarningActive = false;
      if (this.quakeOverlay) this.quakeOverlay.setAlpha(0);
      if (this.warningIcon) this.warningIcon.setAlpha(0);
    });
  }

  private triggerDynamicEvent(event: MinerDynamicEvent, index: number) {
    if (event.type === 'shift_layer') {
      const dx = event.payload?.dx ?? 0;
      const dy = event.payload?.dy ?? 0;
      this.setQuakeBand();
      this.shiftLayer(dx, dy);
      this.showEventBanner('พื้นดินขยับแล้ว!');
      return;
    }

    if (event.type === 'move_vein') {
      const speed = event.payload?.speed ?? 18;
      this.moveGoldVeins(speed);
      this.showEventBanner('สายแร่กำลังเคลื่อนที่');
      return;
    }

    if (event.type === 'cursed_spawn') {
      const penalty = event.payload?.penalty ?? 5;
      this.spawnCursedItem(index, penalty);
      this.showEventBanner('ไอเท็มต้องสาปปรากฏ!');
    }
  }

  private setQuakeBand() {
    const bandHeight = (this.spawnArea.bottom - this.spawnArea.top) * 0.3;
    const minStart = this.spawnArea.top;
    const maxStart = this.spawnArea.bottom - bandHeight;
    const startY = Phaser.Math.FloatBetween(minStart, Math.max(minStart, maxStart));
    this.quakeBand = { minY: startY, maxY: startY + bandHeight };
  }

  private shiftLayer(dx: number, dy: number) {
    if (!this.groundRect) return;

    const yTop = this.quakeBand.minY || this.spawnArea.top;
    const yBottom = this.quakeBand.maxY || this.spawnArea.bottom;

    this.minerObjects.forEach((obj) => {
      if (obj.grabbed) return;
      if (obj.y < yTop || obj.y > yBottom) return;

      obj.x += dx;
      obj.y = Phaser.Math.Clamp(obj.y + dy, yTop, yBottom);
      this.tweens.add({
        targets: obj.sprite,
        x: obj.x,
        y: obj.y,
        duration: 650,
        ease: 'Sine.inOut'
      });
    });
  }

  private moveGoldVeins(speed: number) {
    const amplitude = 42;
    const duration = Math.max(600, (amplitude * 2 * 1000) / Math.max(speed, 1));
    const yTop = this.spawnArea.top;
    const yBottom = this.spawnArea.bottom;

    this.minerObjects.forEach((obj) => {
      if (obj.grabbed) return;
      if (obj.y < yTop || obj.y > yBottom) return;
      const sprite = obj.sprite;
      this.tweens.killTweensOf(sprite);
      sprite.setScale(1);
      this.tweens.add({
        targets: sprite,
        scale: 1.08,
        duration: 350,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
      const tween = this.tweens.add({
        targets: sprite,
        x: sprite.x + amplitude,
        duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
        onUpdate: () => {
          obj.x = sprite.x;
          obj.y = sprite.y;
        }
      });
      this.activeVeinTweens.set(obj.id, tween);
    });
  }

  private spawnCursedItem(eventIndex: number, penaltySec: number) {
    const seed = this.currentLevelConfig.spawn_seed + eventIndex * 1337;
    const rng = createSeededRandom(seed);
    const margin = 24;
    let attempts = 0;
    let x = rng.nextInt(this.spawnArea.left, this.spawnArea.right);
    let y = rng.nextInt(this.spawnArea.top, this.spawnArea.bottom);
    while (!this.isSpawnPositionValid(x, y, 22, margin) && attempts < 80) {
      x = rng.nextInt(this.spawnArea.left, this.spawnArea.right);
      y = rng.nextInt(this.spawnArea.top, this.spawnArea.bottom);
      attempts += 1;
    }
    const config: MinerObjectConfig = {
      type: 'cursed',
      count: 1,
      value: 360,
      weight: 1.8,
      size: 22,
      isHazard: false,
      isCursed: true
    };

    const showValueLabel = rng.next() < this.valueLabelChance && config.value !== 0;
    const sprite = this.createMinerSprite(x, y, config, showValueLabel);
    const minerObject: MinerObject = {
      ...config,
      id: this.minerObjects.length + 1,
      x,
      y,
      sprite,
      grabbed: false,
      penaltyMs: penaltySec * 1000
    };

    this.minerObjects.push(minerObject);
  }

  private showEventBanner(message: string) {
    if (!this.eventBanner) return;
    this.eventBanner.setText(message);
    this.eventBanner.setAlpha(0);
    this.tweens.killTweensOf(this.eventBanner);
    this.tweens.add({
      targets: this.eventBanner,
      alpha: 1,
      duration: 240,
      ease: 'Quad.out',
      yoyo: true,
      hold: 1100
    });
  }
}