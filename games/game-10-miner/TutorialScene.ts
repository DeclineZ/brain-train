import * as Phaser from 'phaser';

type TutorialTargetType = 'gold' | 'gem' | 'rock';
type HookState = 'swing' | 'dropping' | 'pulling';
type TutorialStepAction = 'tap_hook' | 'grab_gold' | 'grab_gem';

type TutorialStep = {
  instruction: string;
  interactive: boolean;
  action?: TutorialStepAction;
  helperText?: string;
};

type TutorialMinerObject = {
  id: number;
  type: TutorialTargetType;
  value: number;
  weight: number;
  size: number;
  isHazard: boolean;
  x: number;
  y: number;
  grabbed: boolean;
  sprite: Phaser.GameObjects.Container;
};

const COLORS = {
  gold: 0xf7c948,
  gem: 0x6c63ff,
  rock: 0x6b6b6b,
  rope: 0x8b5a2b,
  skyTop: 0xe8dcca,
  skyBottom: 0x5a4a3a,
  groundTop: 0xa87b4f,
  groundBottom: 0x3a2718
};

export class MinerTutorialScene extends Phaser.Scene {
  private hookCenterX = 0;
  private hookBaseY = 0;
  private hookAngle = Phaser.Math.DegToRad(-28);
  private hookLockedAngle = 0;
  private hookSwingSpeed = 0.0011;
  private hookSwingMaxAngle = Phaser.Math.DegToRad(32);
  private hookSwingDirection = 1;
  private hookState: HookState = 'swing';
  private hookSwingLength = 120;
  private hookFullLength = 470;
  private hookDropDistance = 120;
  private hookDropVelocity = 0;
  private hookPullSpeed = 0.8;
  private hookTarget: TutorialMinerObject | null = null;
  private hookLastDropEnd: { x: number; y: number } | null = null;

  private ropeGraphics!: Phaser.GameObjects.Graphics;
  private hookContainer!: Phaser.GameObjects.Container;
  private hookPivot!: Phaser.GameObjects.Arc;

  private minerObjects: TutorialMinerObject[] = [];
  private tutorialSteps: TutorialStep[] = [];
  private currentStepIndex = 0;
  private pendingStepAdvanceAfterPull = false;

  private score = 0;
  private goal = 700;
  private hookDropCost = 25;
  private totalFreeHooks = 2;
  private freeHooksRemaining = 2;
  private hookFeePending = false;

  private hudScoreText!: Phaser.GameObjects.Text;
  private hudGoalText!: Phaser.GameObjects.Text;
  private hookCostText!: Phaser.GameObjects.Text;

  private tutorialPanel!: Phaser.GameObjects.Container;
  private tutorialStepText!: Phaser.GameObjects.Text;
  private tutorialInstructionText!: Phaser.GameObjects.Text;
  private tutorialContinueText!: Phaser.GameObjects.Text;
  private tutorialHelperText!: Phaser.GameObjects.Text;

  private guidanceArrow!: Phaser.GameObjects.Graphics;
  private guidanceArrowTween?: Phaser.Tweens.Tween;
  private highlightRing?: Phaser.GameObjects.Arc;
  private highlightTween?: Phaser.Tweens.Tween;

  constructor() {
    super({ key: 'MinerTutorialScene' });
  }

  preload() {
    this.load.audio('miner-hook-release', '/assets/sounds/miner/hook-release.mp3');
    this.load.audio('miner-grab-success', '/assets/sounds/miner/grab-success.mp3');
    this.load.audio('miner-grab-hazard', '/assets/sounds/miner/grab-hazard.mp3');
  }

  create() {
    const { width, height } = this.scale;
    this.hookCenterX = width / 2;
    this.hookBaseY = Math.max(120, height * 0.21);
    this.hookDropDistance = this.hookSwingLength;
    this.hookLockedAngle = this.hookAngle;

    this.drawBackground(width, height);
    this.createHUD();
    this.createHook();
    this.createTutorialObjects();
    this.createTutorialUI();
    this.createTutorialSteps();
    this.showTutorialStep(0);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleStepInteraction(pointer);
    });
  }

  update(_time: number, delta: number) {
    const dt = Math.max(8, Math.min(delta, 32));

    if (this.hookState === 'dropping') {
      this.hookDropVelocity += 0.003 * dt;
      this.hookDropDistance = Math.min(this.hookFullLength, this.hookDropDistance + this.hookDropVelocity * dt);

      const prevEnd = this.hookLastDropEnd ?? this.getHookEndPosition(this.hookDropDistance, this.hookLockedAngle);
      const end = this.updateHookVisual(this.hookDropDistance, this.hookLockedAngle);
      this.checkDropGrabSegment(prevEnd, end);
      this.hookLastDropEnd = end;

      if (this.hookDropDistance >= this.hookFullLength && this.hookState === 'dropping') {
        this.startPull();
      }
      return;
    }

    if (this.hookState === 'pulling') {
      this.hookDropDistance = Math.max(this.hookSwingLength, this.hookDropDistance - this.hookPullSpeed * dt);
      const end = this.updateHookVisual(this.hookDropDistance, this.hookLockedAngle);
      if (this.hookTarget) {
        this.hookTarget.sprite.setPosition(end.x, end.y + 18);
      }

      if (this.hookDropDistance <= this.hookSwingLength + 1) {
        this.finishPull();
      }
      return;
    }

    this.hookAngle += this.hookSwingDirection * this.hookSwingSpeed * dt;
    if (this.hookAngle > this.hookSwingMaxAngle) {
      this.hookAngle = this.hookSwingMaxAngle;
      this.hookSwingDirection = -1;
    } else if (this.hookAngle < -this.hookSwingMaxAngle) {
      this.hookAngle = -this.hookSwingMaxAngle;
      this.hookSwingDirection = 1;
    }

    this.updateHookVisual(this.hookSwingLength, this.hookAngle);
  }

  private createHUD() {
    const { width, height } = this.scale;
    const panel = this.add.container(width / 2, height * 0.11).setDepth(10);
    const bg = this.add.graphics();
    const panelWidth = Math.min(380, width * 0.66);
    const panelHeight = 52;
    bg.fillStyle(0xfff8ea, 0.93);
    bg.lineStyle(1.5, 0xdcc7a2, 0.75);
    bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 16);
    bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 16);

    const scoreLabel = this.add.text(-panelWidth * 0.26, -8, 'คะแนน', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '12px',
      color: '#7b5b3e',
      padding: { x: 2, y: 2 }
    }).setOrigin(0.5);
    this.hudScoreText = this.add.text(-panelWidth * 0.26, 11, `${this.score}`, {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '20px',
      color: '#d17300',
      fontStyle: '700',
      padding: { x: 2, y: 2 }
    }).setOrigin(0.5);

    const goalLabel = this.add.text(panelWidth * 0.26, -8, 'เป้าหมาย', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '12px',
      color: '#7b5b3e',
      padding: { x: 2, y: 2 }
    }).setOrigin(0.5);
    this.hudGoalText = this.add.text(panelWidth * 0.26, 11, `${this.goal}`, {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '20px',
      color: '#5a7aa5',
      fontStyle: '700',
      padding: { x: 2, y: 2 }
    }).setOrigin(0.5);

    panel.add([bg, scoreLabel, this.hudScoreText, goalLabel, this.hudGoalText]);

    this.hookCostText = this.add.text(width * 0.09, this.hookBaseY + 108, '', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '14px',
      color: '#4a3b2a',
      backgroundColor: 'rgba(255, 246, 223, 0.95)',
      padding: { x: 10, y: 6 }
    }).setDepth(12);
    this.updateHookCostText();
  }

  private createHook() {
    this.ropeGraphics = this.add.graphics().setDepth(11);
    this.hookPivot = this.add.circle(this.hookCenterX, this.hookBaseY, 8, 0x4e4e4e, 0.9).setDepth(12);
    this.hookPivot.setStrokeStyle(2, 0x1f1f1f, 0.8);

    this.hookContainer = this.add.container(0, 0).setDepth(13);
    const head = this.add.rectangle(0, 0, 30, 14, 0x5f5f5f).setOrigin(0.5);
    head.setStrokeStyle(2, 0x1f1f1f, 0.8);
    const tip = this.add.triangle(0, 14, 0, 0, 12, 20, -12, 20, 0x3d3d3d).setOrigin(0.5, 0);
    tip.setStrokeStyle(1.5, 0x1f1f1f, 0.8);
    const ring = this.add.circle(0, -12, 7, 0x6a6a6a, 0.95);
    ring.setStrokeStyle(2, 0x2a2a2a, 0.8);

    this.hookContainer.add([ring, head, tip]);
    this.updateHookVisual(this.hookSwingLength, this.hookAngle);
  }

  private createTutorialObjects() {
    const { width, height } = this.scale;
    const objects: Array<Omit<TutorialMinerObject, 'id' | 'grabbed' | 'sprite'>> = [
      { type: 'gold', value: 260, weight: 2.3, size: 24, isHazard: false, x: width * 0.42, y: height * 0.58 },
      { type: 'gem', value: 430, weight: 1.1, size: 20, isHazard: false, x: width * 0.62, y: height * 0.64 },
      { type: 'rock', value: -120, weight: 2.8, size: 30, isHazard: true, x: width * 0.26, y: height * 0.72 }
    ];

    this.minerObjects = objects.map((obj, index) => ({
      ...obj,
      id: index + 1,
      grabbed: false,
      sprite: this.createMinerObjectSprite(obj)
    }));
  }

  private createMinerObjectSprite(object: Omit<TutorialMinerObject, 'id' | 'grabbed' | 'sprite'>) {
    const sprite = this.add.container(object.x, object.y).setDepth(6);
    const shadow = this.add.circle(0, 0, object.size + 4, 0x1c1412, 0.22);
    sprite.add(shadow);

    if (object.type === 'gold') {
      const body = this.add.polygon(object.size * 0.82, object.size * 0.82, [
        0, -object.size,
        object.size * 0.8, -object.size * 0.2,
        object.size * 0.6, object.size,
        -object.size * 0.4, object.size * 0.85,
        -object.size, -object.size * 0.1
      ], COLORS.gold, 1);
      body.setStrokeStyle(2, 0x6d4f1f, 0.7);
      const shine = this.add.circle(-object.size * 0.28, -object.size * 0.25, object.size * 0.35, 0xffffff, 0.45);
      sprite.add([body, shine]);
      return sprite;
    }

    if (object.type === 'gem') {
      const body = this.add.polygon(object.size * 0.82, object.size * 0.82, [
        0, -object.size * 1.1,
        object.size * 0.72, -object.size * 0.35,
        object.size * 0.55, object.size * 0.9,
        0, object.size * 1.15,
        -object.size * 0.55, object.size * 0.9,
        -object.size * 0.72, -object.size * 0.35
      ], COLORS.gem, 1);
      body.setStrokeStyle(2, 0xc9c7ff, 0.8);
      const facet = this.add.polygon(object.size * 0.82, object.size * 0.74, [
        0, -object.size * 0.55,
        object.size * 0.28, -object.size * 0.1,
        0, object.size * 0.4,
        -object.size * 0.28, -object.size * 0.1
      ], 0xffffff, 0.35);
      sprite.add([body, facet]);
      return sprite;
    }

    const rock = this.add.polygon(object.size * 0.82, object.size * 0.82, [
      0, -object.size,
      object.size * 0.76, -object.size * 0.45,
      object.size, object.size * 0.15,
      object.size * 0.36, object.size * 0.95,
      -object.size * 0.5, object.size * 0.9,
      -object.size, object.size * 0.1,
      -object.size * 0.65, -object.size * 0.7
    ], COLORS.rock, 1);
    rock.setStrokeStyle(2, 0x303030, 0.8);
    const crack = this.add.rectangle(0, 0, object.size * 0.9, 3, 0x3f3022, 0.6);
    crack.setRotation(Phaser.Math.DegToRad(20));
    sprite.add([rock, crack]);

    return sprite;
  }

  private createTutorialUI() {
    const { width, height } = this.scale;
    const panelWidth = Math.min(570, width * 0.93);
    const panelHeight = 142;

    this.tutorialPanel = this.add.container(width / 2, height - panelHeight / 2 - 10).setDepth(40);
    const bg = this.add.graphics();
    bg.fillStyle(0x2f261c, 0.84);
    bg.lineStyle(2, 0xf3d9a2, 0.6);
    bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 16);
    bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 16);

    this.tutorialStepText = this.add.text(-panelWidth / 2 + 18, -panelHeight / 2 + 12, '', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '18px',
      color: '#ffe8bc',
      fontStyle: '700',
      padding: { x: 4, y: 3 }
    });
    this.tutorialInstructionText = this.add.text(-panelWidth / 2 + 18, -12, '', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '20px',
      color: '#fff8e9',
      wordWrap: { width: panelWidth - 36 },
      padding: { x: 4, y: 4 }
    }).setOrigin(0, 0.5);

    this.tutorialContinueText = this.add.text(0, panelHeight / 2 - 20, 'แตะเพื่อไปต่อ', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '16px',
      color: '#f6d991',
      padding: { x: 4, y: 3 }
    }).setOrigin(0.5);

    this.tutorialHelperText = this.add.text(0, panelHeight / 2 - 46, '', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '15px',
      color: '#ffd4d4',
      padding: { x: 4, y: 3 }
    }).setOrigin(0.5);

    this.tutorialPanel.add([
      bg,
      this.tutorialStepText,
      this.tutorialInstructionText,
      this.tutorialContinueText,
      this.tutorialHelperText
    ]);

    this.tweens.add({
      targets: this.tutorialContinueText,
      alpha: 0.35,
      duration: 650,
      yoyo: true,
      repeat: -1
    });

    this.guidanceArrow = this.add.graphics().setDepth(35);
  }

  private createTutorialSteps() {
    this.tutorialSteps = [
      { instruction: 'เป้าหมายคือเก็บแร่มีค่าให้ได้คะแนนถึงเป้าหมาย', interactive: false },
      {
        instruction: 'แตะบริเวณตะขอด้านบนเพื่อปล่อยตะขอลงไป',
        interactive: true,
        action: 'tap_hook',
        helperText: 'แตะใกล้จุดหมุนตะขอด้านบน'
      },
      {
        instruction: 'จับจังหวะตะขอให้ตรงทอง แล้วแตะเพื่อปล่อยตะขอ',
        interactive: true,
        action: 'grab_gold',
        helperText: 'เล็งให้ตะขอชี้ใกล้ทอง แล้วแตะปล่อย'
      },
      {
        instruction: 'หินเป็นสิ่งกีดขวาง ควรหลีกเลี่ยงเพราะเสียจัง\nหวะและอาจเสียคะแนน',
        interactive: false
      },
      {
        instruction: 'หลังใช้สิทธิ์ฟรีหมด จะมีค่าปล่อยตะขอครั้งละ 25 คะแนน',
        interactive: false
      },
      {
        instruction: 'คราวนี้เล็งเองอีกครั้งให้โดนเพชร และจะมีค่าปล่อยตะขอถูกหัก',
        interactive: true,
        action: 'grab_gem',
        helperText: 'จับจังหวะให้ตะขอชี้ใกล้เพชร แล้วแตะปล่อย'
      },
      {
        instruction: 'ยอดเยี่ยม! พร้อมเล่น Miner จริงแล้ว 🎉',
        interactive: false
      }
    ];
  }

  private showTutorialStep(index: number) {
    this.currentStepIndex = Phaser.Math.Clamp(index, 0, this.tutorialSteps.length - 1);
    const step = this.tutorialSteps[this.currentStepIndex];

    this.clearGuidance();
    this.setHelperText('');
    this.tutorialStepText.setText(`ขั้นตอน ${this.currentStepIndex + 1}/${this.tutorialSteps.length}`);
    this.tutorialInstructionText.setText(step.instruction);
    this.tutorialContinueText.setVisible(!step.interactive);

    if (this.currentStepIndex === 1) {
      this.drawArrowTo(this.hookCenterX, this.hookBaseY);
      this.highlightPoint(this.hookCenterX, this.hookBaseY, 30);
      return;
    }

    if (this.currentStepIndex === 2) {
      const gold = this.getObjectByType('gold');
      if (gold && !gold.grabbed) {
        this.drawArrowTo(gold.x, gold.y);
        this.highlightObject(gold);
      }
      return;
    }

    if (this.currentStepIndex === 3) {
      const rock = this.getObjectByType('rock');
      if (rock && !rock.grabbed) {
        this.drawArrowTo(rock.x, rock.y);
        this.highlightObject(rock, 0xff8a8a);
      }
      this.setHelperText('โฟกัสทองและเพชรก่อน จะทำคะแนนได้ดีกว่า');
      return;
    }

    if (this.currentStepIndex === 4) {
      this.drawArrowTo(this.hookCostText.x + this.hookCostText.width * 0.45, this.hookCostText.y + 12);
      this.highlightPoint(this.hookCostText.x + this.hookCostText.width * 0.45, this.hookCostText.y + 10, 28);
      return;
    }

    if (this.currentStepIndex === 5) {
      const gem = this.getObjectByType('gem');
      if (gem && !gem.grabbed) {
        this.drawArrowTo(gem.x, gem.y);
        this.highlightObject(gem, 0xb7b4ff);
      }
    }
  }

  private handleStepInteraction(pointer: Phaser.Input.Pointer) {
    const step = this.tutorialSteps[this.currentStepIndex];

    if (!step.interactive) {
      if (this.currentStepIndex === this.tutorialSteps.length - 1) {
        this.completeTutorial();
      } else {
        this.nextTutorialStep();
      }
      return;
    }

    if (this.hookState !== 'swing') {
      this.setHelperText('รอตะขอกลับก่อน แล้วลองอีกครั้ง');
      return;
    }

    if (step.action === 'tap_hook') {
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.hookCenterX, this.hookBaseY);
      if (dist > 95) {
        this.setHelperText(step.helperText ?? 'แตะใกล้ตะขออีกนิด');
        return;
      }

      this.pendingStepAdvanceAfterPull = true;
      this.releaseHook();
      return;
    }

    if (step.action === 'grab_gold') {
      this.pendingStepAdvanceAfterPull = true;
      this.releaseHook();
      return;
    }

    if (step.action === 'grab_gem') {
      this.pendingStepAdvanceAfterPull = true;
      this.releaseHook();
    }
  }

  private releaseHook() {
    this.playSafeSound('miner-hook-release', 0.65);
    this.hookState = 'dropping';
    this.hookDropDistance = this.hookSwingLength;
    this.hookDropVelocity = 0;
    this.hookLockedAngle = this.hookAngle;
    this.hookLastDropEnd = this.getHookEndPosition(this.hookDropDistance, this.hookLockedAngle);

    if (this.freeHooksRemaining > 0) {
      this.freeHooksRemaining -= 1;
      this.hookFeePending = false;
    } else {
      this.hookFeePending = true;
    }
    this.updateHookCostText();
    this.updateHookVisual(this.hookDropDistance, this.hookLockedAngle);
  }

  private startPull() {
    this.hookState = 'pulling';
    const weight = this.hookTarget?.weight ?? 1.1;
    this.hookPullSpeed = Phaser.Math.Clamp(0.92 - weight * 0.08, 0.45, 0.92);
  }

  private finishPull() {
    const grabbedTarget = this.hookTarget;
    this.hookState = 'swing';
    this.hookTarget = null;
    this.hookDropDistance = this.hookSwingLength;
    this.hookLastDropEnd = null;

    if (grabbedTarget) {
      grabbedTarget.sprite.setVisible(false);
      const netValue = this.applyHookFee(grabbedTarget.value);
      this.score += netValue;
      this.hudScoreText.setText(`${this.score}`);
      this.spawnScorePopup(grabbedTarget.x, grabbedTarget.y, netValue);
      if (grabbedTarget.isHazard) {
        this.playSafeSound('miner-grab-hazard', 0.65);
      } else {
        this.playSafeSound('miner-grab-success', 0.65);
      }
    } else {
      const feeOnlyValue = this.applyHookFee(0);
      if (feeOnlyValue < 0) {
        this.score += feeOnlyValue;
        this.hudScoreText.setText(`${this.score}`);
        this.spawnScorePopup(this.hookCenterX, this.hookBaseY + 140, feeOnlyValue);
      }
    }

    if (this.pendingStepAdvanceAfterPull) {
      const currentStep = this.tutorialSteps[this.currentStepIndex];
      this.pendingStepAdvanceAfterPull = false;

      if (currentStep.action === 'grab_gold' && grabbedTarget?.type !== 'gold') {
        this.setHelperText('ลองอีกครั้ง ระบบต้องเก็บ “ทอง” ในขั้นตอนนี้');
        return;
      }
      if (currentStep.action === 'grab_gem' && grabbedTarget?.type !== 'gem') {
        this.setHelperText('ลองอีกครั้ง ระบบต้องเก็บ “เพชร” ในขั้นตอนนี้');
        return;
      }

      this.nextTutorialStep();
    }
  }

  private applyHookFee(value: number) {
    if (!this.hookFeePending) return value;
    this.hookFeePending = false;
    return value - this.hookDropCost;
  }

  private updateHookCostText() {
    if (this.freeHooksRemaining > 0) {
      this.hookCostText.setText(`ดึงฟรี ${this.freeHooksRemaining}/${this.totalFreeHooks} ครั้ง`);
      return;
    }
    this.hookCostText.setText(`💰 ค่าปล่อยตะขอ -${this.hookDropCost} ต่อครั้ง`);
  }

  private checkDropGrabSegment(start: { x: number; y: number }, end: { x: number; y: number }) {
    if (this.hookTarget) return;

    if (this.tutorialSteps[this.currentStepIndex]?.action === 'tap_hook') {
      return;
    }

    const expectedType = this.getExpectedGrabTypeForCurrentStep();
    const activeObjects = this.minerObjects.filter((obj) => {
      if (obj.grabbed) return false;
      if (!expectedType) return true;
      return obj.type === expectedType;
    });
    let closest: TutorialMinerObject | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const obj of activeObjects) {
      const { distance } = this.getPointToSegmentDistance({ x: obj.x, y: obj.y }, start, end);
      if (distance < obj.size + 8 && distance < minDistance) {
        closest = obj;
        minDistance = distance;
      }
    }

    if (closest) {
      closest.grabbed = true;
      this.hookTarget = closest;
      this.startPull();
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

  private getExpectedGrabTypeForCurrentStep(): TutorialTargetType | null {
    const action = this.tutorialSteps[this.currentStepIndex]?.action;
    if (action === 'grab_gold') return 'gold';
    if (action === 'grab_gem') return 'gem';
    return null;
  }

  private nextTutorialStep() {
    const next = this.currentStepIndex + 1;
    if (next >= this.tutorialSteps.length) {
      this.completeTutorial();
      return;
    }
    this.showTutorialStep(next);
  }

  private completeTutorial() {
    const onTutorialComplete = this.registry.get('onTutorialComplete');
    if (onTutorialComplete) onTutorialComplete();
    else this.scene.start('MinerGameScene', { level: this.registry.get('level') || 1 });
  }

  private drawArrowTo(targetX: number, targetY: number) {
    this.guidanceArrow.clear();
    this.guidanceArrow.setPosition(targetX, targetY - 120);
    this.guidanceArrow.lineStyle(5, 0xffd86b, 0.95);
    this.guidanceArrow.beginPath();
    this.guidanceArrow.moveTo(0, 0);
    this.guidanceArrow.lineTo(0, 74);
    this.guidanceArrow.strokePath();
    this.guidanceArrow.fillStyle(0xffd86b, 0.95);
    this.guidanceArrow.fillTriangle(-12, 74, 12, 74, 0, 94);

    this.guidanceArrowTween?.stop();
    this.guidanceArrowTween = this.tweens.add({
      targets: this.guidanceArrow,
      y: this.guidanceArrow.y + 10,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }

  private highlightObject(target: TutorialMinerObject, color = 0xffe082) {
    this.highlightPoint(target.x, target.y, target.size + 16, color);
  }

  private highlightPoint(x: number, y: number, radius: number, color = 0xffe082) {
    this.highlightRing?.destroy();
    this.highlightTween?.stop();
    this.highlightRing = this.add.circle(x, y, radius).setDepth(34);
    this.highlightRing.setStrokeStyle(4, color, 0.9);
    this.highlightRing.setFillStyle(color, 0.09);

    this.highlightTween = this.tweens.add({
      targets: this.highlightRing,
      scale: 1.18,
      alpha: 0.42,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }

  private clearGuidance() {
    this.guidanceArrow.clear();
    this.guidanceArrowTween?.stop();
    this.guidanceArrowTween = undefined;
    this.highlightTween?.stop();
    this.highlightTween = undefined;
    this.highlightRing?.destroy();
    this.highlightRing = undefined;
  }

  private setHelperText(text: string) {
    this.tutorialHelperText.setText(text);
  }

  private getObjectByType(type: TutorialTargetType) {
    return this.minerObjects.find((obj) => obj.type === type);
  }

  private spawnScorePopup(x: number, y: number, value: number) {
    const isPenalty = value < 0;
    const display = isPenalty ? `${value}` : `+${value}`;
    const popup = this.add.text(x, y - 10, display, {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '24px',
      color: isPenalty ? '#f47e7e' : '#f4d47c',
      fontStyle: '700',
      padding: { x: 3, y: 3 }
    }).setOrigin(0.5).setDepth(36);

    this.tweens.add({
      targets: popup,
      y: y - 48,
      alpha: 0,
      scale: 0.88,
      duration: 900,
      ease: 'Quad.out',
      onComplete: () => popup.destroy()
    });
  }

  private playSafeSound(key: string, volume: number) {
    try {
      this.sound.play(key, { volume });
    } catch {
      // safe when assets missing
    }
  }

  private updateHookVisual(length: number, angle: number) {
    const end = this.getHookEndPosition(length, angle);
    this.drawRope(length, angle);
    this.hookContainer.setPosition(end.x, end.y);
    this.hookContainer.setRotation(angle);
    return end;
  }

  private drawRope(length: number, angle: number) {
    const start = { x: this.hookCenterX, y: this.hookBaseY };
    const end = this.getHookEndPosition(length, angle);
    this.ropeGraphics.clear();
    this.ropeGraphics.lineStyle(3, COLORS.rope, 0.9);
    this.ropeGraphics.beginPath();
    this.ropeGraphics.moveTo(start.x, start.y);
    this.ropeGraphics.lineTo(end.x, end.y);
    this.ropeGraphics.strokePath();
  }

  private getHookEndPosition(length: number, angle: number) {
    return {
      x: this.hookCenterX + Math.sin(angle) * length,
      y: this.hookBaseY + Math.cos(angle) * length
    };
  }

  private drawBackground(width: number, height: number) {
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, 0x8b6b4a, COLORS.skyBottom, 1);
    bg.fillRect(0, 0, width, height);

    const ground = this.add.graphics().setDepth(1);
    const groundTop = height * 0.36;
    const groundHeight = height * 0.6;
    ground.fillGradientStyle(COLORS.groundTop, COLORS.groundTop, 0x5b3d24, COLORS.groundBottom, 1);
    ground.fillRoundedRect(width * 0.03, groundTop, width * 0.94, groundHeight, 28);
    ground.fillStyle(0x3a2718, 0.18);
    for (let i = 0; i < 9; i += 1) {
      const stripY = groundTop + i * (groundHeight / 9);
      ground.fillRect(width * 0.06, stripY, width * 0.88, 2);
    }
  }
}
