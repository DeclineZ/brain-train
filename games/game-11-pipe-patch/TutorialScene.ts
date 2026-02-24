import * as Phaser from 'phaser';
import { getPipePatchLevel } from './levels';
import { type Coord, type PipePatchLevelConfig, type PipePieceType } from './types';
import { PipePatchGameScene } from './GameScene';

type TutorialAnchor = 'board' | 'tray' | 'source' | 'target' | 'status';
type TutorialAction = 'info' | 'place';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  anchor: TutorialAnchor;
  action: TutorialAction;
  targetCell?: Coord;
  targetPieceType?: PipePieceType;
}

interface BoardLayout {
  boardSizePx: number;
  cellSize: number;
  boardOrigin: { x: number; y: number };
  trayRect: Phaser.Geom.Rectangle;
}

interface PanelLayout {
  mode: 'full' | 'mini';
  x: number;
  y: number;
  width: number;
  height: number;
  bodyWrapWidth: number;
  titleFontSize: number;
  bodyFontSize: number;
  progressFontSize: number;
  dimAlpha: number;
}

type CircleFocus = { x: number; y: number; radius: number; centerX: number; centerY: number };
type RectFocus = { x: number; y: number; w: number; h: number; centerX: number; centerY: number };
type FocusTarget = CircleFocus | RectFocus;

const TUTORIAL_LEVEL_ID = 8;

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'intro',
    title: 'ภารกิจด่านสอน',
    description: 'เราจะพาเล่นทีละขั้น: ต่อท่อจากจุดเริ่ม (ซ้าย) ไปจุดปลาย (ขวา) ให้สำเร็จ',
    anchor: 'board',
    action: 'info',
  },
  {
    id: 'place-1',
    title: 'ขั้นที่ 1',
    description: 'ลากท่อตรงแนวนอน ไปวางที่ช่องที่ไฮไลต์ถัดจากจุดเริ่ม',
    anchor: 'source',
    action: 'place',
    targetCell: { x: 1, y: 0 },
    targetPieceType: 'straight_h',
  },
  {
    id: 'place-2',
    title: 'ขั้นที่ 2',
    description: 'ดีมาก ต่อท่อตรงแนวนอนอีกชิ้นในช่องไฮไลต์ถัดไป',
    anchor: 'board',
    action: 'place',
    targetCell: { x: 2, y: 0 },
    targetPieceType: 'straight_h',
  },
  {
    id: 'place-3',
    title: 'ขั้นที่ 3',
    description: 'วางท่อตรงแนวนอนชิ้นสุดท้ายให้ถึงจุดปลาย',
    anchor: 'target',
    action: 'place',
    targetCell: { x: 3, y: 0 },
    targetPieceType: 'straight_h',
  },
];

const UI_COLORS = {
  dim: 0x030712,
  accent: 0x22d3ee,
  accentSoft: 0x67e8f9,
  panel: 0xdff7ff,
  panelStroke: 0x2b6f8a,
  textTitle: '#0b2b36',
  textBody: '#133a49',
  textSubtle: '#24586d',
  button: 0x06b6d4,
  buttonHover: 0x0891b2,
  warning: '#9f1239',
  success: '#166534',
};

export class PipePatchTutorialScene extends PipePatchGameScene {
  private tutorialIndex = 0;
  private tutorialOpen = true;
  private lastAdvanceAtMs = 0;
  private activeGuideTweens: Phaser.Tweens.Tween[] = [];
  private activeGuideGraphics: Phaser.GameObjects.GameObject[] = [];

  private tutorialDimmer?: Phaser.GameObjects.Graphics;
  private tutorialFocus?: Phaser.GameObjects.Graphics;
  private tutorialArrow?: Phaser.GameObjects.Graphics;
  private tutorialPanel?: Phaser.GameObjects.Container;
  private panelShadow?: Phaser.GameObjects.Rectangle;
  private panelBg?: Phaser.GameObjects.Rectangle;
  private tutorialTitle?: Phaser.GameObjects.Text;
  private tutorialDescription?: Phaser.GameObjects.Text;
  private tutorialProgress?: Phaser.GameObjects.Text;
  private warningText?: Phaser.GameObjects.Text;

  constructor() {
    super();
    this.sys.settings.key = 'PipePatchTutorialScene';
  }

  create() {
    super.create();

    // Force a deterministic tutorial map for strict step-by-step onboarding.
    (this as any).startLevel?.(TUTORIAL_LEVEL_ID);

    this.buildTutorialUi();
    this.renderTutorialStep();

    this.input.on('pointerup', this.handlePlayerAction, this);
    this.scale.on('resize', this.handleResize, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerup', this.handlePlayerAction, this);
      this.scale.off('resize', this.handleResize, this);
    });
  }

  private handleResize() {
    if (!this.tutorialOpen) return;
    this.renderTutorialStep();
  }

  private buildTutorialUi() {
    this.tutorialDimmer = this.add.graphics().setDepth(3800);
    this.tutorialFocus = this.add.graphics().setDepth(3801);
    this.tutorialArrow = this.add.graphics().setDepth(3802);

    this.tutorialPanel = this.add.container(0, 0).setDepth(3900);
    this.panelShadow = this.add.rectangle(4, 4, 420, 208, 0x000000, 0.2).setOrigin(0.5);
    this.panelBg = this.add.rectangle(0, 0, 420, 208, UI_COLORS.panel, 0.98)
      .setOrigin(0.5)
      .setStrokeStyle(2, UI_COLORS.panelStroke, 0.95);

    this.tutorialTitle = this.add.text(0, -56, '', {
      fontFamily: 'Noto Sans Thai, sans-serif',
      fontSize: '28px',
      color: UI_COLORS.textTitle,
      fontStyle: '700',
      align: 'center',
      wordWrap: { width: 360 },
    }).setOrigin(0.5, 0);

    this.tutorialDescription = this.add.text(0, -14, '', {
      fontFamily: 'Noto Sans Thai, sans-serif',
      fontSize: '22px',
      color: UI_COLORS.textBody,
      align: 'center',
      wordWrap: { width: 360 },
      lineSpacing: 3,
    }).setOrigin(0.5, 0);

    this.tutorialProgress = this.add.text(0, 70, '', {
      fontFamily: 'Noto Sans Thai, sans-serif',
      fontSize: '18px',
      color: UI_COLORS.textSubtle,
      fontStyle: '700',
    }).setOrigin(0.5, 0.5);

    this.warningText = this.add.text(0, 98, '', {
      fontFamily: 'Noto Sans Thai, sans-serif',
      fontSize: '17px',
      color: UI_COLORS.warning,
      fontStyle: '700',
    }).setOrigin(0.5, 0.5);

    this.tutorialPanel.add([
      this.panelShadow,
      this.panelBg,
      this.tutorialTitle,
      this.tutorialDescription,
      this.tutorialProgress,
      this.warningText,
    ]);
  }

  private handlePlayerAction() {
    if (!this.tutorialOpen) return;
    if (Date.now() - this.lastAdvanceAtMs < 180) return;

    const step = TUTORIAL_STEPS[this.tutorialIndex];
    if (!step) return;

    if (step.action === 'info') {
      this.tutorialIndex += 1;
      this.lastAdvanceAtMs = Date.now();
      if (this.tutorialIndex >= TUTORIAL_STEPS.length) {
        this.closeTutorial();
        return;
      }
      this.renderTutorialStep();
      return;
    }

    const sanitized = this.sanitizePlacementsForCurrentStep();
    if (sanitized > 0) {
      this.showWarning('ต้องวางตามช่องที่ไฮไลต์ทีละขั้น');
      return;
    }

    if (this.isCurrentPlacementSatisfied()) {
      this.showWarning('ถูกต้อง ไปขั้นถัดไป', true);
      this.tutorialIndex += 1;
      this.lastAdvanceAtMs = Date.now();
      if (this.tutorialIndex >= TUTORIAL_STEPS.length) {
        this.closeTutorial();
        return;
      }
      this.renderTutorialStep();
    }
  }

  private closeTutorial() {
    this.tutorialOpen = false;
    this.tutorialDimmer?.setVisible(false);
    this.tutorialFocus?.setVisible(false);
    this.tutorialArrow?.setVisible(false);
    this.tutorialPanel?.setVisible(false);
    this.clearStepGuides();
    this.restoreTrayInteractivity();
  }

  private renderTutorialStep() {
    if (!this.tutorialOpen) return;

    const step = TUTORIAL_STEPS[this.tutorialIndex];
    if (
      !step ||
      !this.tutorialDimmer ||
      !this.tutorialFocus ||
      !this.tutorialArrow ||
      !this.tutorialPanel ||
      !this.panelShadow ||
      !this.panelBg ||
      !this.tutorialTitle ||
      !this.tutorialDescription ||
      !this.tutorialProgress ||
      !this.warningText
    ) {
      return;
    }

    const level = this.getCurrentLevel();
    const layout = this.computeBoardLayout(level);
    const focus = this.getStepFocus(step, layout, level);
    const panel = this.getBottomPanelRect({ width: this.scale.width, height: this.scale.height }, layout.trayRect, step);

    this.tutorialPanel.setPosition(panel.x, panel.y);
    this.panelShadow.setSize(panel.width, panel.height);
    this.panelBg.setSize(panel.width, panel.height);

    const isMini = panel.mode === 'mini';
    this.tutorialTitle
      .setFontSize(`${panel.titleFontSize}px`)
      .setWordWrapWidth(panel.bodyWrapWidth)
      .setPosition(0, isMini ? -panel.height * 0.46 : -panel.height * 0.44);

    this.tutorialDescription
      .setVisible(!isMini)
      .setFontSize(`${panel.bodyFontSize}px`)
      .setWordWrapWidth(panel.bodyWrapWidth)
      .setPosition(0, -panel.height * 0.23);

    this.tutorialProgress
      .setFontSize(`${panel.progressFontSize}px`)
      .setPosition(0, isMini ? -panel.height * 0.05 : panel.height * 0.20);

    this.warningText
      .setPosition(0, isMini ? panel.height * 0.10 : panel.height * 0.34)
      .setFontSize(`${Math.max(isMini ? 14 : 16, panel.progressFontSize - 1)}px`);

    this.tutorialTitle.setText(step.title);
    this.tutorialDescription.setText(step.description);
    this.tutorialProgress.setText(`ขั้นตอน ${this.tutorialIndex + 1}/${TUTORIAL_STEPS.length}`);

    if (step.action === 'place' && step.targetPieceType) {
      this.applyPieceRestriction(step.targetPieceType);
      this.warningText.setText(this.getMiniStepHint(step));
      this.warningText.setColor(UI_COLORS.textBody);
    } else {
      this.restoreTrayInteractivity();
      this.warningText.setText('แตะหน้าจอเพื่อไปขั้นถัดไป');
      this.warningText.setColor(UI_COLORS.textSubtle);
    }

    const noDimForStep = step.action === 'place';
    this.tutorialDimmer.clear();
    if (!noDimForStep) {
      this.tutorialDimmer.fillStyle(UI_COLORS.dim, panel.dimAlpha);
      this.tutorialDimmer.fillRect(0, 0, this.scale.width, this.scale.height);
    }

    this.tutorialFocus.clear();
    this.tutorialFocus.lineStyle(4, UI_COLORS.accent, 0.95);
    if ('radius' in focus) {
      this.tutorialFocus.strokeCircle(focus.x, focus.y, focus.radius);
      this.tutorialFocus.lineStyle(1, UI_COLORS.accentSoft, 0.65);
      this.tutorialFocus.strokeCircle(focus.x, focus.y, focus.radius + 8);
    } else {
      this.tutorialFocus.strokeRoundedRect(focus.x, focus.y, focus.w, focus.h, 14);
      this.tutorialFocus.lineStyle(1, UI_COLORS.accentSoft, 0.65);
      this.tutorialFocus.strokeRoundedRect(focus.x - 6, focus.y - 6, focus.w + 12, focus.h + 12, 16);
    }

    this.renderStepGuides(step, layout);
    this.drawArrowFromBottomPanel(panel, focus);
  }

  private drawArrowFromBottomPanel(panel: PanelLayout, focus: FocusTarget) {
    if (!this.tutorialArrow) return;

    const fromX = panel.x;
    const fromY = panel.y - panel.height * 0.5 + (panel.mode === 'mini' ? 4 : 6);
    const toX = focus.centerX;
    const toY = 'radius' in focus ? focus.y + Math.min(-8, -focus.radius * 0.55) : focus.y - 8;

    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const ux = dx / len;
    const uy = dy / len;

    const startDistance = panel.mode === 'mini' ? 16 : 24;
    const startX = fromX + ux * startDistance;
    const startY = fromY + uy * startDistance;
    const endX = toX - ux * 12;
    const endY = toY - uy * 12;

    this.tutorialArrow.clear();
    this.tutorialArrow.lineStyle(6, UI_COLORS.accent, 0.95);
    this.tutorialArrow.beginPath();
    this.tutorialArrow.moveTo(startX, startY);
    this.tutorialArrow.lineTo(endX, endY);
    this.tutorialArrow.strokePath();

    const perpX = -uy;
    const perpY = ux;
    const headLen = 16;
    const headWidth = 9;

    this.tutorialArrow.fillStyle(UI_COLORS.accentSoft, 1);
    this.tutorialArrow.beginPath();
    this.tutorialArrow.moveTo(endX, endY);
    this.tutorialArrow.lineTo(endX - ux * headLen + perpX * headWidth, endY - uy * headLen + perpY * headWidth);
    this.tutorialArrow.lineTo(endX - ux * headLen - perpX * headWidth, endY - uy * headLen - perpY * headWidth);
    this.tutorialArrow.closePath();
    this.tutorialArrow.fillPath();
  }

  private showWarning(message: string, success = false) {
    if (!this.warningText) return;
    this.warningText.setText(message).setColor(success ? UI_COLORS.success : UI_COLORS.warning);
  }

  private getCurrentLevel() {
    return getPipePatchLevel(TUTORIAL_LEVEL_ID);
  }

  private computeBoardLayout(level: PipePatchLevelConfig): BoardLayout {
    const inv = new Map<PipePieceType, number>();
    const lockedSet = new Set(level.lockedPlaceholders.map((l) => `${l.position.x},${l.position.y}`));

    level.requiredPlacements
      .filter((r) => !lockedSet.has(`${r.position.x},${r.position.y}`))
      .forEach((r) => inv.set(r.pieceType, (inv.get(r.pieceType) ?? 0) + 1));

    level.trayPieces.forEach((p) => inv.set(p.pieceType, (inv.get(p.pieceType) ?? 0) + 1));

    const width = this.scale.width;
    const height = this.scale.height;
    let boardSizePx = Math.min(500, width - 30);
    const cellSize = Math.floor(boardSizePx / level.gridSize);
    boardSizePx = cellSize * level.gridSize;

    const gap = 12;
    const trayCellSize = Math.max(56, Math.min(78, Math.floor((width - 24) / 6.4)));
    const cols = Math.max(4, Math.floor((width - 20) / (trayCellSize + gap)));
    const rowCount = Math.max(1, Math.ceil(inv.size / cols));
    const panelH = Math.max(140, Math.min(250, rowCount * (trayCellSize + gap) + 62));

    const minBoardY = 58;
    const bottomMargin = 12;
    const maxBoardY = Math.max(minBoardY, height - panelH - boardSizePx - 20 - bottomMargin);
    const centeredBoardY = Math.floor((height - boardSizePx) / 2);

    const boardOrigin = {
      x: Math.floor((width - boardSizePx) / 2),
      y: Math.max(minBoardY, Math.min(maxBoardY, centeredBoardY)),
    };

    const top = boardOrigin.y + boardSizePx + 20;
    const trayY = Math.min(height - panelH / 2 - 8, top + panelH / 2);

    return {
      boardSizePx,
      cellSize,
      boardOrigin,
      trayRect: new Phaser.Geom.Rectangle(6, trayY - panelH / 2, width - 12, panelH),
    };
  }

  private getBottomPanelRect(
    viewport: { width: number; height: number },
    trayRect: Phaser.Geom.Rectangle,
    step: TutorialStep
  ): PanelLayout {
    const isCompact = viewport.width < 400 || viewport.height < 650;
    const isMedium = !isCompact && (viewport.width < 520 || viewport.height < 760);
    const isMini = step.action === 'place';
    const mode: 'full' | 'mini' = isMini ? 'mini' : 'full';

    let width = isMini ? Math.min(460, viewport.width - 14) : Math.min(460, viewport.width - 20);
    let height = isMini ? (isCompact ? 100 : 112) : isCompact ? 196 : isMedium ? 214 : 236;
    const bottomPadding = isCompact ? 28 : 20;

    let titleFontSize = isMini ? (isCompact ? 19 : 20) : isCompact ? 22 : isMedium ? 25 : 28;
    let bodyFontSize = isMini ? 18 : isCompact ? 18 : isMedium ? 20 : 22;
    let progressFontSize = isMini ? (isCompact ? 16 : 17) : isCompact ? 16 : 18;

    const panelBottom = viewport.height - bottomPadding;
    let panelTop = panelBottom - height;

    // Collision guard with tray while keeping panel anchored at bottom.
    const overlap = trayRect.bottom - panelTop;
    if (overlap > 0) {
      const shrink = Math.min(isMini ? 24 : 40, overlap + 8);
      height = Math.max(isMini ? 88 : 170, height - shrink);
      titleFontSize = Math.max(isMini ? 13 : 16, titleFontSize - 1);
      bodyFontSize = Math.max(isMini ? 12 : 13, bodyFontSize - (isMini ? 0 : 2));
      progressFontSize = Math.max(11, progressFontSize - 1);
      width = Math.min(width, viewport.width - 14);
      panelTop = panelBottom - height;
    }

    const remainingOverlap = trayRect.bottom - panelTop;
    const dimAlpha = remainingOverlap > 20 ? 0.67 : 0.56;

    return {
      mode,
      x: viewport.width / 2,
      y: panelTop + height / 2,
      width,
      height,
      bodyWrapWidth: Math.max(240, width - 34),
      titleFontSize,
      bodyFontSize,
      progressFontSize,
      dimAlpha,
    };
  }

  private getMiniStepHint(step: TutorialStep) {
    if (!step.targetCell || !step.targetPieceType) return 'วางท่อตามช่องที่ไฮไลต์';
    return `วาง ${this.getPieceTypeLabel(step.targetPieceType)} ที่ช่อง (${step.targetCell.x + 1},${step.targetCell.y + 1})`;
  }

  private getPieceTypeLabel(pieceType: PipePieceType) {
    const labels: Record<PipePieceType, string> = {
      straight_h: 'ท่อตรงแนวนอน',
      straight_v: 'ท่อตรงแนวตั้ง',
      elbow_ur: 'ข้องอขึ้น-ขวา',
      elbow_rd: 'ข้องอขวา-ลง',
      elbow_dl: 'ข้องอลง-ซ้าย',
      elbow_lu: 'ข้องอซ้าย-ขึ้น',
      tee_urd: 'ท่อสามทาง',
      tee_rdl: 'ท่อสามทาง',
      tee_dlu: 'ท่อสามทาง',
      tee_lur: 'ท่อสามทาง',
      cross: 'ท่อสี่แยก',
      crossover: 'ท่อสะพานข้าม',
    };
    return labels[pieceType] ?? pieceType;
  }

  private renderStepGuides(step: TutorialStep, layout: BoardLayout) {
    this.clearStepGuides();
    if (step.action !== 'place' || !step.targetCell || !step.targetPieceType) return;
    this.highlightTrayPieceWithEase(step.targetPieceType);
    this.highlightTargetCellWithEase(step.targetCell, layout);
    this.drawGhostDragHint(step.targetCell, step.targetPieceType, layout);
  }

  private highlightTrayPieceWithEase(targetPieceType: PipePieceType) {
    const trayTypeVisuals = (this as any).trayTypeVisuals as Map<PipePieceType, { container: Phaser.GameObjects.Container }>;
    if (!trayTypeVisuals) return;
    const target = trayTypeVisuals.get(targetPieceType)?.container;
    if (!target) return;

    const tween = this.tweens.add({
      targets: target,
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 0.88,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.activeGuideTweens.push(tween);
  }

  private highlightTargetCellWithEase(targetCell: Coord, layout: BoardLayout) {
    const cx = layout.boardOrigin.x + targetCell.x * layout.cellSize + layout.cellSize / 2;
    const cy = layout.boardOrigin.y + targetCell.y * layout.cellSize + layout.cellSize / 2;
    const ring = this.add.circle(cx, cy, Math.max(20, layout.cellSize * 0.34), UI_COLORS.accent, 0)
      .setStrokeStyle(4, UI_COLORS.accentSoft, 0.9)
      .setDepth(3850);
    this.activeGuideGraphics.push(ring);

    const tween = this.tweens.add({
      targets: ring,
      scale: 1.18,
      alpha: 0.55,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.activeGuideTweens.push(tween);
  }

  private drawGhostDragHint(targetCell: Coord, targetPieceType: PipePieceType, layout: BoardLayout) {
    const trayTypeVisuals = (this as any).trayTypeVisuals as Map<PipePieceType, { container: Phaser.GameObjects.Container }>;
    const trayCenter = trayTypeVisuals?.get(targetPieceType)?.container;
    if (!trayCenter) return;

    const fromX = trayCenter.x;
    const fromY = trayCenter.y - 10;
    const toX = layout.boardOrigin.x + targetCell.x * layout.cellSize + layout.cellSize / 2;
    const toY = layout.boardOrigin.y + targetCell.y * layout.cellSize + layout.cellSize / 2;

    const path = this.add.graphics().setDepth(3840);
    path.lineStyle(3, UI_COLORS.accentSoft, 0.7);
    path.beginPath();
    path.moveTo(fromX, fromY);
    path.lineTo(toX, toY);
    path.strokePath();
    this.activeGuideGraphics.push(path);

    const hintDot = this.add.circle(fromX, fromY, 6, UI_COLORS.accent, 0.9).setDepth(3842);
    this.activeGuideGraphics.push(hintDot);

    const tween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1100,
      repeat: -1,
      ease: 'Quad.easeInOut',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const x = Phaser.Math.Linear(fromX, toX, t);
        const y = Phaser.Math.Linear(fromY, toY, t);
        hintDot.setPosition(x, y);
      },
    });
    this.activeGuideTweens.push(tween);
  }

  private clearStepGuides() {
    this.activeGuideTweens.forEach((tw) => tw.stop());
    this.activeGuideTweens = [];
    this.activeGuideGraphics.forEach((g) => g.destroy());
    this.activeGuideGraphics = [];
  }

  private getStepFocus(step: TutorialStep, layout: BoardLayout, level: PipePatchLevelConfig): FocusTarget {
    if (step.targetCell) {
      const centerX = layout.boardOrigin.x + step.targetCell.x * layout.cellSize + layout.cellSize / 2;
      const centerY = layout.boardOrigin.y + step.targetCell.y * layout.cellSize + layout.cellSize / 2;
      return {
        x: centerX,
        y: centerY,
        radius: Math.max(28, Math.floor(layout.cellSize * 0.58)),
        centerX,
        centerY,
      };
    }

    if (step.anchor === 'board') {
      const x = layout.boardOrigin.x - 8;
      const y = layout.boardOrigin.y - 8;
      const w = layout.boardSizePx + 16;
      const h = layout.boardSizePx + 16;
      return { x, y, w, h, centerX: x + w / 2, centerY: y + h / 2 };
    }

    if (step.anchor === 'tray') {
      const x = layout.trayRect.x;
      const y = layout.trayRect.y;
      const w = layout.trayRect.width;
      const h = Math.max(44, layout.trayRect.height - 70);
      return { x, y, w, h, centerX: x + w / 2, centerY: y + h / 2 };
    }

    if (step.anchor === 'status') {
      return {
        x: 8,
        y: 10,
        w: 190,
        h: 46,
        centerX: 103,
        centerY: 33,
      };
    }

    const firstGroup = level.endpointGroups[0];
    const cell = step.anchor === 'source' ? firstGroup?.input.position : firstGroup?.outputs[0]?.position;
    const coord: Coord = cell ?? { x: 0, y: 0 };
    const centerX = layout.boardOrigin.x + coord.x * layout.cellSize + layout.cellSize / 2;
    const centerY = layout.boardOrigin.y + coord.y * layout.cellSize + layout.cellSize / 2;

    return {
      x: centerX,
      y: centerY,
      radius: Math.max(28, Math.floor(layout.cellSize * 0.58)),
      centerX,
      centerY,
    };
  }

  private isCurrentPlacementSatisfied() {
    const step = TUTORIAL_STEPS[this.tutorialIndex];
    if (!step || step.action !== 'place' || !step.targetCell || !step.targetPieceType) return false;

    const placed = (this as any).placed as Map<string, { pieceType: PipePieceType }>;
    if (!placed) return false;

    const key = `${step.targetCell.x},${step.targetCell.y}`;
    return placed.get(key)?.pieceType === step.targetPieceType;
  }

  private sanitizePlacementsForCurrentStep() {
    const placed = (this as any).placed as Map<string, { pieceId: string; pieceType: PipePieceType }>;
    const placedVisuals = (this as any).placedVisuals as Map<string, { container: Phaser.GameObjects.Container; pieceType: PipePieceType }>;
    const trayInventory = (this as any).trayInventory as Map<PipePieceType, number>;

    if (!placed || !placedVisuals || !trayInventory) return 0;

    const allowed = new Map<string, PipePieceType>();
    for (let i = 0; i <= this.tutorialIndex; i += 1) {
      const s = TUTORIAL_STEPS[i];
      if (s.action === 'place' && s.targetCell && s.targetPieceType) {
        allowed.set(`${s.targetCell.x},${s.targetCell.y}`, s.targetPieceType);
      }
    }

    let removed = 0;
    [...placed.entries()].forEach(([cellKey, entry]) => {
      const expectedType = allowed.get(cellKey);
      if (!expectedType || expectedType !== entry.pieceType) {
        const visual = placedVisuals.get(entry.pieceId);
        if (visual) {
          visual.container.destroy();
          placedVisuals.delete(entry.pieceId);
        }
        placed.delete(cellKey);
        trayInventory.set(entry.pieceType, (trayInventory.get(entry.pieceType) ?? 0) + 1);
        removed += 1;
      }
    });

    if (removed > 0) {
      (this as any).updateTrayCounts?.();
      (this as any).updateAllPieceColors?.();
    }

    return removed;
  }

  private applyPieceRestriction(targetPieceType: PipePieceType) {
    const trayTypeVisuals = (this as any).trayTypeVisuals as Map<PipePieceType, { container: Phaser.GameObjects.Container }>;
    if (!trayTypeVisuals) return;

    trayTypeVisuals.forEach((value, type) => {
      const allow = type === targetPieceType;
      value.container.setAlpha(allow ? 1 : 0.42);
      if (allow) {
        value.container.setInteractive({ draggable: true, useHandCursor: true });
        this.input.setDraggable(value.container);
      } else {
        value.container.disableInteractive();
      }
    });
  }

  private restoreTrayInteractivity() {
    const trayTypeVisuals = (this as any).trayTypeVisuals as Map<PipePieceType, { container: Phaser.GameObjects.Container }>;
    if (!trayTypeVisuals) return;

    trayTypeVisuals.forEach((value) => {
      value.container.setAlpha(1);
      value.container.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(value.container);
    });
  }
}
