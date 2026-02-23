import * as Phaser from 'phaser';
import { PIPE_PATCH_LEVELS, getPipePatchLevel } from './levels';
import {
  DIR,
  DIR_VECTORS,
  NAME_TO_DIR,
  OPPOSITE_DIR,
  PIECE_DEFINITIONS,
  type ConnectionMask,
  type Coord,
  type PipePatchGameStats,
  type PipePatchPerLevelMetrics,
  type PipePatchTelemetryEvent,
  type PipePatchLevelConfig,
  type PipePatchEndpointGroup,
  type RuntimePlacedPiece,
  type PipePieceType,
  type RequiredPlacement,
  type ColorId,
  COLOR_HEX,
  COLOR_NAMES,
} from './types';

type SceneState = 'boot' | 'level_intro' | 'playing' | 'paused' | 'level_complete' | 'session_complete';
type CellKind = 'empty' | 'blocked' | 'source' | 'target' | 'fixed' | 'locked' | 'gate';

interface CellVisual {
  x: number;
  y: number;
  rect: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  overlay?: Phaser.GameObjects.GameObject;
}

interface PieceVisual {
  pieceId: string;
  pieceType: PipePieceType;
  container: Phaser.GameObjects.Container;
  isFromTray: boolean;
  homeX: number;
  homeY: number;
  currentCellKey?: string;
  colorId?: ColorId; // Color inherited from connected source
  axisColorX?: ColorId;
  axisColorY?: ColorId;
}

interface EvalResult {
  requiredCellsFilled: number;
  correctPlacements: number;
  incorrectPlacements: number;
  distanceToSolution: number;
  isBeneficialAction: boolean;
  isSolved: boolean;
  isConnected: boolean;
  openEndsCount: number;
  leakCount: number;
  colorResults: Array<{
    colorId: ColorId;
    isConnected: boolean;
    openEndsCount: number;
    leakCount: number;
    requiredCellsFilled: number;
    correctPlacements: number;
    incorrectPlacements: number;
  }>;
}

const SESSION_DURATION_MS = 90_000;
const COLORS = {
  bg: 0x173d3e,
  boardOuter: 0x4a2a15,
  boardInner: 0x2b160d,
  cell: 0x3a1d10,
  cellAlt: 0x5b321b,
  cellStroke: 0x1e1009,
  trayPanel: 0x183638,
  traySlot: 0x294b4d,
  traySlotStroke: 0x10282a,
  trayCard: 0x28464a,
  pipe: 0xb5bec8,
  pipeShadow: 0x4b5563,
  water: 0x38bdf8,
  success: 0x22c55e,
  error: 0xef4444,
  locked: 0x0284c7,
  gate: 0xca8a04,
};

const DIRS = [DIR.UP, DIR.RIGHT, DIR.DOWN, DIR.LEFT];

export class PipePatchGameScene extends Phaser.Scene {
  private sceneState: SceneState = 'boot';
  private reduceMotion = false;

  private levelIndex = 1;
  private level!: PipePatchLevelConfig;
  private boardSizePx = 320;
  private cellSize = 52;
  private boardOrigin = { x: 40, y: 130 };
  private trayY = 540;
  private trayBounds!: Phaser.Geom.Rectangle;
  private trayCountTexts = new Map<PipePieceType, Phaser.GameObjects.Text>();
  private trayTypeVisuals = new Map<PipePieceType, PieceVisual>();
  private trayInventory = new Map<PipePieceType, number>();
  private placedIdSeq = 0;
  private activeRequiredPlacements: RequiredPlacement[] = [];

  private cellVisuals = new Map<string, CellVisual>();
  private placed = new Map<string, RuntimePlacedPiece>();
  private placedVisuals = new Map<string, PieceVisual>();
  private trayVisuals = new Map<string, PieceVisual>();
  private undoStack: Array<{ placed: Map<string, RuntimePlacedPiece>; inventory: Array<[PipePieceType, number]> }> = [];

  private timerDial!: Phaser.GameObjects.Graphics;
  private timerDialText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private uiPersistent = new Set<Phaser.GameObjects.GameObject>();
  private sessionMsRemaining = SESSION_DURATION_MS;
  private levelStartedAt = 0;
  private pausedAt = 0;
  private pausedAccumulatedMs = 0;

  private sessionStartedAt = 0;
  private telemetry: PipePatchTelemetryEvent[] = [];
  private perLevel: PipePatchPerLevelMetrics[] = [];
  private levelMetrics!: PipePatchPerLevelMetrics;
  private prevDistance = Number.MAX_SAFE_INTEGER;
  private firstActionAt = 0;
  private cellHadWrongAttempt = new Set<string>();
  private repeatedErrorMap = new Map<string, number>();

  private getCellKey(c: Coord) {
    return `${c.x},${c.y}`;
  }

  private isLockedCell(x: number, y: number) {
    return this.level.lockedPlaceholders.some((l) => l.position.x === x && l.position.y === y);
  }

  private buildTrayInventory() {
    const lockedSet = new Set(this.level.lockedPlaceholders.map((l) => this.getCellKey(l.position)));
    this.activeRequiredPlacements = this.level.requiredPlacements.filter((r) => !lockedSet.has(this.getCellKey(r.position)));

    const inv = new Map<PipePieceType, number>();
    
    // Add pieces from requiredPlacements (if any)
    this.activeRequiredPlacements.forEach((r) => {
      inv.set(r.pieceType, (inv.get(r.pieceType) ?? 0) + 1);
    });
    
    // Add ALL pieces from trayPieces (not just decoys)
    // This supports the new level format where all pieces are in trayPieces
    this.level.trayPieces.forEach((p) => {
      inv.set(p.pieceType, (inv.get(p.pieceType) ?? 0) + 1);
    });
    
    this.trayInventory = inv;
  }

  constructor() {
    super({ key: 'PipePatchGameScene' });
  }

  init(data: { level?: number; reduceMotion?: boolean; skipTutorial?: boolean }) {
    const regLevel = this.registry.get('level');
    this.levelIndex = data.level || regLevel || 1;
    this.reduceMotion = data.reduceMotion ?? false;
    this.sessionMsRemaining = SESSION_DURATION_MS;
    this.perLevel = [];
    this.telemetry = [];
    this.sessionStartedAt = Date.now();
    this.logEvent('session_start', { sessionDurationMs: SESSION_DURATION_MS });
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.createUiChrome();
    this.startLevel(this.levelIndex);
    this.sceneState = 'playing';
  }

  update(_: number, delta: number) {
    if (this.sceneState !== 'playing') return;
    this.sessionMsRemaining = Math.max(0, this.sessionMsRemaining - delta);
    const remainingSec = Math.ceil(this.sessionMsRemaining / 1000);
    const pct = (this.sessionMsRemaining / SESSION_DURATION_MS) * 100;
    this.drawTimerDial(pct, remainingSec);

    if (this.sessionMsRemaining <= 0) {
      this.finishCurrentLevel('timeout_skip');
      this.completeSession('timeout');
      return;
    }

    // Keep layout stable during play: do not auto-skip to the next level based on
    // per-level hard time. This prevents obstacles/targets from changing position
    // mid-run. Level transitions now happen only when solved or when session ends.
  }

  private createUiChrome() {
    

  

    const timerX = this.scale.width - 44;
    this.timerDial = this.add.graphics();
    this.timerDialText = this.add.text(timerX, 29, '90', { fontSize: '15px', color: '#f5f5f5', fontStyle: '700' }).setOrigin(0.5);

    this.statusText = this.add.text(18, 18, '', { fontSize: '15px', color: '#86efac' }).setOrigin(0, 0);
    this.drawTimerDial(100, 90);

    [  this.timerDial, this.timerDialText,this.statusText].forEach((g) => this.uiPersistent.add(g));
  }

  private drawTimerDial(pct: number, remainingSec: number) {
    const x = this.scale.width - 44;
    const y = 29;
    const radius = 15;
    const thickness = 5;
    const warning = pct <= 25;

    this.timerDial.clear();
    this.timerDial.lineStyle(thickness, 0x0b1416, 0.8);
    this.timerDial.strokeCircle(x, y, radius);

    if (pct > 0) {
      this.timerDial.lineStyle(thickness, warning ? COLORS.error : COLORS.success, 0.95);
      this.timerDial.beginPath();
      this.timerDial.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100, false);
      this.timerDial.strokePath();
    }

    this.timerDialText.setText(`${Math.max(0, remainingSec)}`);
    this.timerDialText.setColor(warning ? '#fecaca' : '#e2e8f0');
  }

  private startLevel(levelIndex: number) {
    this.clearLevelVisuals();
    this.level = getPipePatchLevel(levelIndex);
    this.logEvent('level_start', { levelId: this.level.id });

    this.levelMetrics = {
      levelId: this.level.id,
      difficultyWeight: this.level.difficultyWeight,
      parTimeMs: this.level.parTimeMs,
      hardTimeMs: this.level.hardTimeMs,
      requiredPieceCount: this.level.requiredPieceCount,
      decoyPieceCount: this.level.decoyPieceCount,
      optimalPlacements: this.level.requiredPieceCount,
      solveTimeMs: 0,
      activeTimeMs: 0,
      firstActionLatencyMs: 0,
      totalDragAttempts: 0,
      validPlacementsCount: 0,
      correctPlacementsOnFirstTryCount: 0,
      incorrectPlacementCount: 0,
      rejectedDropCount: 0,
      repeatedErrorCount: 0,
      beneficialActionCount: 0,
      nonBeneficialActionCount: 0,
      undoCount: 0,
      resetCount: 0,
      hintUsedCount: 0,
      obstacleRejectCount: 0,
      lockedSlotMismatchCount: 0,
      completionStatus: 'timeout_skip',
    };

    this.levelStartedAt = Date.now();
    this.pausedAccumulatedMs = 0;
    this.firstActionAt = 0;
    this.prevDistance = this.level.requiredPieceCount;
    this.cellHadWrongAttempt.clear();
    this.repeatedErrorMap.clear();
    this.undoStack = [];
    this.placed.clear();
    this.placedIdSeq = 0;
    this.buildTrayInventory();
    this.levelMetrics.requiredPieceCount = this.activeRequiredPlacements.length;
    this.levelMetrics.optimalPlacements = this.activeRequiredPlacements.length;
    this.prevDistance = this.activeRequiredPlacements.length;

    this.drawBoard();
    this.drawTray();
    this.sceneState = 'playing';
  }

  private drawBoard() {
    const size = this.level.gridSize;
    const width = this.scale.width;
    const height = this.scale.height;
    this.boardSizePx = Math.min(500, width - 30);
    this.cellSize = Math.floor(this.boardSizePx / size);
    this.boardSizePx = this.cellSize * size;
    this.boardOrigin.x = Math.floor((width - this.boardSizePx) / 2);
    const topUiY = 58;
    const bottomMargin = 12;
    const types = [...this.trayInventory.keys()];
    const { gap, size: trayCellSize, cols } = this.getTrayLayout();
    const rowCount = Math.max(1, Math.ceil(types.length / cols));
    const panelH = Math.max(140, Math.min(250, rowCount * (trayCellSize + gap) + 62));
    const minBoardY = topUiY;
    const maxBoardY = Math.max(minBoardY, height - panelH - this.boardSizePx - 20 - bottomMargin);
    const centeredBoardY = Math.floor((height - this.boardSizePx) / 2);
    this.boardOrigin.y = Math.max(minBoardY, Math.min(maxBoardY, centeredBoardY));

    const boardCx = this.boardOrigin.x + this.boardSizePx / 2;
    const boardCy = this.boardOrigin.y + this.boardSizePx / 2;

    this.add.rectangle(boardCx, boardCy + 4, this.boardSizePx + 26, this.boardSizePx + 26, 0x000000, 0.28);
    this.add.rectangle(boardCx, boardCy, this.boardSizePx + 24, this.boardSizePx + 24, COLORS.boardOuter).setStrokeStyle(4, 0x8b5e34, 0.9);
    this.add.rectangle(boardCx, boardCy, this.boardSizePx + 10, this.boardSizePx + 10, COLORS.boardInner).setStrokeStyle(2, 0x1f110a, 0.8);

    const blockedSet = new Set(this.level.blockedCells.map((c) => `${c.x},${c.y}`));
    const endpointGroups = this.level.endpointGroups;
    const inputMap = new Map(endpointGroups.map((g) => [`${g.input.position.x},${g.input.position.y}`, g]));
    const outputMap = new Map(
      endpointGroups.flatMap((g) => g.outputs.map((o) => [`${o.position.x},${o.position.y}`, { endpoint: o, group: g }] as const))
    );
    const fixedMap = new Map(this.level.fixedPipes.map((f) => [`${f.position.x},${f.position.y}`, f.pieceType]));
    const lockedMap = new Map(this.level.lockedPlaceholders.map((l) => [`${l.position.x},${l.position.y}`, l]));
    const gateMap = new Map(this.level.oneWayGates.map((g) => [`${g.position.x},${g.position.y}`, g]));

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const key = `${x},${y}`;
        const px = this.boardOrigin.x + x * this.cellSize;
        const py = this.boardOrigin.y + y * this.cellSize;
        const isAltCell = ((x + y) % 2) === 0;
        const rect = this.add.rectangle(px + this.cellSize / 2, py + this.cellSize / 2, this.cellSize - 3, this.cellSize - 3, isAltCell ? COLORS.cell : COLORS.cellAlt, 0.92);
        const border = this.add.rectangle(px + this.cellSize / 2, py + this.cellSize / 2, this.cellSize - 3, this.cellSize - 3, 0x000000, 0).setStrokeStyle(1, COLORS.cellStroke, 0.95);
        const cv: CellVisual = { x, y, rect, border };
        this.cellVisuals.set(key, cv);

        if (blockedSet.has(key)) {
          rect.setFillStyle(0x31211a, 1);
          border.setStrokeStyle(2, 0x64748b);
          cv.overlay = this.add.text(rect.x, rect.y, '▨', { fontSize: `${Math.floor(this.cellSize * 0.48)}px`, color: '#94a3b8' }).setOrigin(0.5);
          continue;
        }
        if (inputMap.has(key)) {
          const group = inputMap.get(key)!;
          const color = COLOR_HEX[group.colorId as ColorId];
          rect.setFillStyle(this.darkenColor(color, 40), 0.95);
          this.drawEndpointPipe(rect.x, rect.y, OPPOSITE_DIR[group.input.mask], color, 'OUT');
          continue;
        }
        if (outputMap.has(key as `${number},${number}`)) {
          const out = outputMap.get(key as `${number},${number}`)!;
          const color = COLOR_HEX[out.group.colorId as ColorId];
          rect.setFillStyle(this.darkenColor(color, 40), 0.95);
          this.drawEndpointPipe(rect.x, rect.y, out.endpoint.mask, color, 'IN');
          continue;
        }
        if (gateMap.has(key)) {
          rect.setFillStyle(0x4a3013, 0.95);
          const gate = gateMap.get(key)!;
          cv.overlay = this.add.text(rect.x, rect.y, this.arrowForGate(gate.entry, gate.exit), { fontSize: `${Math.floor(this.cellSize * 0.4)}px`, color: '#facc15' }).setOrigin(0.5);
          border.setStrokeStyle(2, COLORS.gate);
          continue;
        }
        if (lockedMap.has(key)) {
          rect.setFillStyle(0x0b3342, 0.95);
          border.setStrokeStyle(2, COLORS.locked);
          cv.overlay = this.add.text(rect.x, rect.y, '◍', { fontSize: `${Math.floor(this.cellSize * 0.4)}px`, color: '#0369a1' }).setOrigin(0.5);
          continue;
        }
        if (fixedMap.has(key)) {
          rect.setFillStyle(0x2c3742, 0.95);
          const pType = fixedMap.get(key)!;
          this.createPipeVisual(pType, rect.x, rect.y, this.cellSize * 0.9, false, 0x9ca3af);
          continue;
        }
      }
    }
  }

  private drawTray() {
    this.trayTypeVisuals.forEach((v) => v.container.destroy());
    this.trayTypeVisuals.clear();
    this.trayCountTexts.forEach((t) => t.destroy());
    this.trayCountTexts.clear();

    const top = this.boardOrigin.y + this.boardSizePx + 20;
    const types = [...this.trayInventory.keys()];
    const { gap, size, cols } = this.getTrayLayout();
    const rowCount = Math.max(1, Math.ceil(types.length / cols));
    const panelH = Math.max(140, Math.min(250, rowCount * (size + gap) + 62));

    this.trayY = Math.min(this.scale.height - panelH / 2 - 8, top + panelH / 2);
    this.add.rectangle(this.scale.width / 2, this.trayY + 3, this.scale.width - 12, panelH, 0x000000, 0.35);
    this.add.rectangle(this.scale.width / 2, this.trayY, this.scale.width - 12, panelH, COLORS.trayPanel, 0.95)
      .setStrokeStyle(2, 0x406061, 0.9);
    this.trayBounds = new Phaser.Geom.Rectangle(6, this.trayY - panelH / 2, this.scale.width - 12, panelH);

    const totalW = cols * size + (cols - 1) * gap;
    const startX = (this.scale.width - totalW) / 2 + size / 2;
    const startY = this.trayY - ((rowCount - 1) * (size + gap)) / 2 + 12;

    types.forEach((pieceType, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = startX + col * (size + gap);
      const py = startY + row * (size + gap);

      const pv = this.spawnPieceVisual(`tray-${pieceType}`, pieceType, px, py, true, size);
      this.trayTypeVisuals.set(pieceType, pv);

      const count = this.add.text(px, py - size * 0.62, '00', {
        fontSize: '18px',
        fontStyle: '700',
        color: '#f8fafc',
        backgroundColor: '#00000088',
        padding: { left: 4, right: 4, top: 1, bottom: 1 },
      }).setOrigin(0.5);
      this.trayCountTexts.set(pieceType, count);
    });

    this.updateTrayCounts();
  }

  private getTrayLayout() {
    const gap = 12;
    const size = Math.max(56, Math.min(78, Math.floor((this.scale.width - 24) / 6.4)));
    const cols = Math.max(4, Math.floor((this.scale.width - 20) / (size + gap)));
    return { gap, size, cols };
  }

  private spawnPieceVisual(pieceId: string, pieceType: PipePieceType, x: number, y: number, isFromTray: boolean, size: number) {
    const container = this.add.container(x, y);
    const bgShadow = this.add.rectangle(1, 2, size, size, 0x000000, 0.26).setStrokeStyle(0);
    const bg = this.add.rectangle(0, 0, size, size, COLORS.trayCard, 0.9).setStrokeStyle(1, COLORS.traySlotStroke, 0.9);
    const slotGlow = this.add.rectangle(0, 0, size - 6, size - 6, COLORS.traySlot, 0.3).setStrokeStyle(1, 0x5f8f91, 0.6);
    container.add(bgShadow);
    container.add(bg);
    container.add(slotGlow);
    
    const art = this.createPipeVisual(pieceType, 0, 0, size * 0.88, true, COLORS.pipe);
    container.add(art);
    container.setSize(size, size);
    container.setInteractive({ draggable: true, useHandCursor: true });

    const data: PieceVisual = { pieceId, pieceType, container, isFromTray, homeX: x, homeY: y };
    this.input.setDraggable(container);

    container.on('dragstart', () => {
      if (this.sceneState !== 'playing') return;
      if (!this.firstActionAt) this.firstActionAt = Date.now();
      this.levelMetrics.totalDragAttempts += 1;
      if (!data.currentCellKey) {
        this.logEvent('tray_piece_selected', { pieceId, pieceType });
      }
      this.logEvent('drag_start', { pieceId, from: data.currentCellKey ? 'board' : 'tray' });
      container.setScale(1.06);
    });

    container.on('drag', (_: unknown, dragX: number, dragY: number) => {
      container.setPosition(dragX, dragY);
    });

    container.on('dragend', (_: unknown, _dragX: number, _dragY: number) => {
      container.setScale(1);
      const dropTarget = this.handleDrop(data);
      this.logEvent('drag_end', { pieceId, dropTarget });
    });

    return data;
  }

  private handleDrop(piece: PieceVisual): 'cell' | 'tray' | 'invalid' {
    if (this.sceneState !== 'playing') return 'invalid';
    const cell = this.getCellFromWorld(piece.container.x, piece.container.y);

    if (!cell) {
      if (!piece.isFromTray && this.trayBounds.contains(piece.container.x, piece.container.y)) {
        this.removePlacedPiece(piece);
        return 'tray';
      }
      this.rejectPiece(piece, undefined, 'invalid_target');
      return 'invalid';
    }

    const key = `${cell.x},${cell.y}`;
    if (piece.isFromTray && !piece.currentCellKey) {
      const available = this.trayInventory.get(piece.pieceType) ?? 0;
      if (available <= 0) {
        this.rejectPiece(piece, key, 'out_of_stock');
        return 'invalid';
      }
    }

    const rejection = this.validateDrop(piece, cell);
    if (rejection) {
      this.rejectPiece(piece, key, rejection);
      return 'invalid';
    }

    this.pushUndoSnapshot();
    const existing = this.placed.get(key);
    if (existing) {
      const existingVisual = this.placedVisuals.get(existing.pieceId);
      if (existingVisual) {
        this.returnPieceToTray(existingVisual);
      }
      this.logEvent('piece_swapped', { incomingPieceId: piece.pieceId, outgoingPieceId: existing.pieceId, cellId: key });
    }

    let activePiece = piece;
    if (piece.isFromTray && !piece.currentCellKey) {
      const placedId = `placed-${piece.pieceType}-${this.placedIdSeq++}`;
      activePiece = this.spawnPieceVisual(placedId, piece.pieceType, this.cellCenterX(cell.x), this.cellCenterY(cell.y), false, Math.floor(this.cellSize * 0.94));
      this.trayInventory.set(piece.pieceType, Math.max(0, (this.trayInventory.get(piece.pieceType) ?? 0) - 1));
      piece.container.setPosition(piece.homeX, piece.homeY);
    } else {
      activePiece.container.setPosition(this.cellCenterX(cell.x), this.cellCenterY(cell.y));
    }

    activePiece.currentCellKey = key;
    activePiece.isFromTray = false;
    this.placed.set(key, { pieceId: activePiece.pieceId, pieceType: activePiece.pieceType, fromTray: true, placedAtMs: Date.now() });
    this.placedVisuals.set(activePiece.pieceId, activePiece);
    this.updateTrayCounts();

    const req = this.activeRequiredPlacements.find((r) => r.position.x === cell.x && r.position.y === cell.y);
    const isCorrectCell = !!req && req.pieceType === activePiece.pieceType;
    if (isCorrectCell && !this.cellHadWrongAttempt.has(key)) {
      this.levelMetrics.correctPlacementsOnFirstTryCount += 1;
    }
    if (!isCorrectCell) this.levelMetrics.incorrectPlacementCount += 1;
    this.levelMetrics.validPlacementsCount += 1;

    this.logEvent('piece_placed', { pieceId: activePiece.pieceId, cellId: key, isCorrectCell, isRequiredCell: !!req });
    this.updateAllPieceColors();
    this.runBoardEval();
    return 'cell';
  }

  private validateDrop(piece: PieceVisual, cell: Coord): string | null {
    const key = `${cell.x},${cell.y}`;
    const blocked = this.level.blockedCells.some((c) => c.x === cell.x && c.y === cell.y);
    if (blocked) {
      this.logEvent('obstacle_interaction_attempt', { obstacleType: 'wall', pieceId: piece.pieceId, cellId: key, result: 'rejected' });
      this.levelMetrics.obstacleRejectCount += 1;
      return 'blocked';
    }
    if (this.isEndpointCell(cell.x, cell.y)) return 'invalid_target';
    if (this.level.fixedPipes.some((f) => f.position.x === cell.x && f.position.y === cell.y)) return 'occupied';
    if (this.level.oneWayGates.some((g) => g.position.x === cell.x && g.position.y === cell.y)) {
      this.logEvent('obstacle_interaction_attempt', { obstacleType: 'one_way_gate', pieceId: piece.pieceId, cellId: key, result: 'rejected' });
      this.levelMetrics.obstacleRejectCount += 1;
      return 'invalid_target';
    }

    if (this.isLockedCell(cell.x, cell.y)) {
      this.logEvent('obstacle_interaction_attempt', { obstacleType: 'locked_placeholder', pieceId: piece.pieceId, cellId: key, result: 'rejected' });
      return 'locked_blocked';
    }
    return null;
  }

  private rejectPiece(piece: PieceVisual, cellId: string | undefined, reason: string) {
    this.levelMetrics.rejectedDropCount += 1;
    if (cellId) {
      const repKey = `${piece.pieceId}:${cellId}`;
      const prev = this.repeatedErrorMap.get(repKey) ?? 0;
      if (Date.now() - prev < 2000) this.levelMetrics.repeatedErrorCount += 1;
      this.repeatedErrorMap.set(repKey, Date.now());
      this.cellHadWrongAttempt.add(cellId);
    }
    this.logEvent('piece_rejected', { pieceId: piece.pieceId, attemptCellId: cellId, reason });
    if (!this.reduceMotion) this.tweens.add({ targets: piece.container, x: piece.container.x + 8, duration: 50, yoyo: true, repeat: 2 });
    piece.container.setPosition(piece.homeX, piece.homeY);
  }

  private removePlacedPiece(piece: PieceVisual) {
    if (!piece.currentCellKey) return;
    this.pushUndoSnapshot();
    const cellKey = piece.currentCellKey;
    this.placed.delete(cellKey);
    this.returnPieceToTray(piece);
    this.levelMetrics.validPlacementsCount = Math.max(0, this.levelMetrics.validPlacementsCount - 1);
    this.logEvent('piece_removed', { pieceId: piece.pieceId, cellId: cellKey });
    this.updateAllPieceColors();
    this.runBoardEval();
  }

  private returnPieceToTray(piece: PieceVisual) {
    if (!piece.isFromTray) {
      this.trayInventory.set(piece.pieceType, (this.trayInventory.get(piece.pieceType) ?? 0) + 1);
    }
    piece.isFromTray = true;
    piece.currentCellKey = undefined;
    piece.container.destroy();
    this.placedVisuals.delete(piece.pieceId);
    this.updateTrayCounts();
  }

  private runBoardEval() {
    const evalResult = this.evaluateBoardState();
    if (evalResult.isBeneficialAction) this.levelMetrics.beneficialActionCount += 1;
    else this.levelMetrics.nonBeneficialActionCount += 1;
    this.prevDistance = evalResult.distanceToSolution;

    this.logEvent('board_state_eval', {
      requiredCellsFilled: evalResult.requiredCellsFilled,
      correctPlacements: evalResult.correctPlacements,
      incorrectPlacements: evalResult.incorrectPlacements,
      distanceToSolution: evalResult.distanceToSolution,
      isBeneficialAction: evalResult.isBeneficialAction,
    });
    
    evalResult.colorResults.forEach(colorResult => {
      this.logEvent('color_path_check', {
        colorId: colorResult.colorId,
        isConnected: colorResult.isConnected,
        openEndsCount: colorResult.openEndsCount,
        leakCount: colorResult.leakCount,
        requiredCellsFilled: colorResult.requiredCellsFilled,
        correctPlacements: colorResult.correctPlacements,
        incorrectPlacements: colorResult.incorrectPlacements,
      });
    });

    if (evalResult.isSolved) {
      this.levelMetrics.completionStatus = 'solved';
      this.levelMetrics.solveTimeMs = Date.now() - this.levelStartedAt - this.pausedAccumulatedMs;
      this.logEvent('level_complete', { levelId: this.level.id, solveTimeMs: this.levelMetrics.solveTimeMs });
      this.playSuccessFlow(() => {
        this.finishCurrentLevel('solved');
        this.emitLevelSolvedGameOver();
      });
    }
  }

  /**
   * Match other games behavior: each solved level immediately reports game-over payload
   * so React page can show result popup and control next-level navigation.
   */
  private emitLevelSolvedGameOver() {
    this.sceneState = 'session_complete';

    const current = this.perLevel[this.perLevel.length - 1] ?? this.levelMetrics;
    const stars = current.solveTimeMs <= current.parTimeMs ? 3 : current.solveTimeMs <= current.hardTimeMs ? 2 : 1;
    const levelScore = Math.max(
      1,
      Math.round(current.requiredPieceCount * 12 - current.rejectedDropCount * 2 - current.incorrectPlacementCount)
    );

    const summary: PipePatchGameStats = {
      sessionDurationMs: current.activeTimeMs,
      levelsAttempted: 1,
      levelsSolved: 1,
      levelTimeoutSkips: 0,
      perLevelMetrics: [current],
      telemetryEvents: this.telemetry,
    };

    const onGameOver = this.registry.get('onGameOver');
    if (onGameOver) {
      onGameOver({
        ...summary,
        level: this.level.id,
        current_played: this.level.id,
        userTimeMs: current.activeTimeMs,
        score: levelScore,
        stars,
        success: true,
      });
    }
  }

  private evaluateBoardState(): EvalResult {
    let requiredCellsFilled = 0;
    let correctPlacements = 0;
    let incorrectPlacements = 0;

    this.activeRequiredPlacements.forEach((r) => {
      const key = `${r.position.x},${r.position.y}`;
      const placed = this.placed.get(key);
      if (!placed) return;
      requiredCellsFilled += 1;
      if (placed.pieceType === r.pieceType) correctPlacements += 1;
      else incorrectPlacements += 1;
    });

    const extraWrong = [...this.placed.entries()].filter(([k]) => !this.activeRequiredPlacements.some((r) => `${r.position.x},${r.position.y}` === k)).length;
    incorrectPlacements += extraWrong;
    const targetCount = this.activeRequiredPlacements.length;
    const distance = (targetCount - correctPlacements) + extraWrong;
    const path = this.checkMultiColorConnectivity();
    const solved = correctPlacements === targetCount && path.isConnected && path.openEndsCount === 0 && path.leakCount === 0;
    
    return {
      requiredCellsFilled,
      correctPlacements,
      incorrectPlacements,
      distanceToSolution: Math.max(0, distance),
      isBeneficialAction: distance < this.prevDistance,
      isSolved: solved,
      isConnected: path.isConnected,
      openEndsCount: path.openEndsCount,
      leakCount: path.leakCount,
      colorResults: path.colorResults,
    };
  }

  private checkMultiColorConnectivity() {
    const endpointGroups = this.level.endpointGroups;
    const blockedSet = new Set(this.level.blockedCells.map((b) => `${b.x},${b.y}`));
    const gateMap = new Map(this.level.oneWayGates.map((g) => [`${g.position.x},${g.position.y}`, g]));

    let leakCount = 0;
    let openEndsCount = 0;
    let groupsConnected = 0;
    const colorResults: Array<{
      colorId: ColorId;
      isConnected: boolean;
      openEndsCount: number;
      leakCount: number;
      requiredCellsFilled: number;
      correctPlacements: number;
      incorrectPlacements: number;
    }> = [];

    for (const group of endpointGroups) {
      const requiredOutputs = new Set(group.outputs.map((o) => `${o.position.x},${o.position.y}`));
      const reachedOutputs = new Set<string>();
      const visited = new Set<string>();
      const queue: Array<{ x: number; y: number; incomingDir?: number }> = [{ ...group.input.position }];
      visited.add(this.getTraversalStateKey(group.input.position.x, group.input.position.y, this.getPieceTypeAt(group.input.position.x, group.input.position.y), undefined));

      let colorLeakCount = 0;
      let colorOpenEndsCount = 0;
      const colorRequiredCellsFilled = 0;
      const colorCorrectPlacements = 0;
      const colorIncorrectPlacements = 0;

      while (queue.length) {
        const c = queue.shift()!;
        const mask = this.getColorMaskAt(c.x, c.y);
        if (mask === 0) continue;
        const pieceType = this.getPieceTypeAt(c.x, c.y);
        const dirs = this.getFlowDirections(mask, c.incomingDir, pieceType);

        for (const dir of dirs) {
          const v = DIR_VECTORS[dir];
          const nx = c.x + v.x;
          const ny = c.y + v.y;
          if (nx < 0 || ny < 0 || nx >= this.level.gridSize || ny >= this.level.gridSize) {
            colorLeakCount += 1;
            continue;
          }
          const neighborKey = `${nx},${ny}`;
          if (blockedSet.has(neighborKey)) {
            colorLeakCount += 1;
            continue;
          }
          if (this.isLockedCell(nx, ny)) {
            colorLeakCount += 1;
            continue;
          }

          const nMask = this.getColorMaskAt(nx, ny);
          const opp = OPPOSITE_DIR[dir];
          if ((nMask & opp) === 0) {
            const isUnreachedTargetOfGroup = requiredOutputs.has(neighborKey) && !reachedOutputs.has(neighborKey);
            if (!isUnreachedTargetOfGroup) colorOpenEndsCount += 1;
            continue;
          }

          const gate = gateMap.get(neighborKey);
          if (gate) {
            const entry = NAME_TO_DIR[gate.entry];
            if (opp !== entry) {
              this.logEvent('one_way_gate_path_fail', { gateId: gate.id, attemptedFlowDirection: dir, colorId: group.colorId });
              return { isConnected: false, openEndsCount: colorOpenEndsCount + 1, leakCount: colorLeakCount, colorResults };
            }
          }

          if (requiredOutputs.has(neighborKey)) reachedOutputs.add(neighborKey);
          const neighborType = this.getPieceTypeAt(nx, ny);
          const stateKey = this.getTraversalStateKey(nx, ny, neighborType, opp);
          if (!visited.has(stateKey)) {
            visited.add(stateKey);
            queue.push({ x: nx, y: ny, incomingDir: opp });
          }
        }
      }

      const isGroupConnected = reachedOutputs.size === requiredOutputs.size && requiredOutputs.size > 0;
      if (isGroupConnected) {
        groupsConnected += 1;
      }

      colorResults.push({
        colorId: group.colorId as ColorId,
        isConnected: isGroupConnected,
        openEndsCount: colorOpenEndsCount,
        leakCount: colorLeakCount,
        requiredCellsFilled: colorRequiredCellsFilled,
        correctPlacements: colorCorrectPlacements,
        incorrectPlacements: colorIncorrectPlacements,
      });

      openEndsCount += colorOpenEndsCount;
      leakCount += colorLeakCount;
    }

    return { 
      isConnected: groupsConnected === endpointGroups.length && endpointGroups.length > 0, 
      openEndsCount, 
      leakCount, 
      colorResults 
    };
  }

  private playSuccessFlow(onDone: () => void) {
    this.sceneState = 'level_complete';
    if (this.reduceMotion) {
      this.statusText.setText('Flow complete ✔');
      this.time.delayedCall(250, onDone);
      return;
    }

    const dots: Phaser.GameObjects.Arc[] = [];
    this.level.endpointGroups.forEach(group => {
      const path = this.findPathForColor(group);
      path.forEach((p, i) => {
        const color = COLOR_HEX[group.colorId as ColorId];
        const dot = this.add.circle(this.cellCenterX(p.x), this.cellCenterY(p.y), Math.max(4, this.cellSize * 0.12), color, 0.2);
        dot.setAlpha(0.05);
        dots.push(dot);
        this.tweens.add({ targets: dot, alpha: 1, duration: 90, delay: i * 70, yoyo: false });
      });
    });
    this.time.delayedCall(this.level.endpointGroups.length * 100 + 200, () => {
      dots.forEach((d) => d.destroy());
      this.statusText.setText('Solved ✔');
      onDone();
    });
  }

  private findPathForColor(group: PipePatchEndpointGroup): Coord[] {
    const path: Coord[] = [];
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number; incomingDir?: number }> = [{ ...group.input.position }];
    visited.add(this.getTraversalStateKey(group.input.position.x, group.input.position.y, this.getPieceTypeAt(group.input.position.x, group.input.position.y), undefined));

    while (queue.length) {
      const c = queue.shift()!;
      path.push(c);
      const mask = this.getColorMaskAt(c.x, c.y);
      if (mask === 0) continue;
      const pieceType = this.getPieceTypeAt(c.x, c.y);
      const dirs = this.getFlowDirections(mask, c.incomingDir, pieceType);
      for (const dir of dirs) {
        const v = DIR_VECTORS[dir];
        const nx = c.x + v.x;
        const ny = c.y + v.y;
        if (nx < 0 || ny < 0 || nx >= this.level.gridSize || ny >= this.level.gridSize) continue;
        
        const nMask = this.getColorMaskAt(nx, ny);
        const opp = OPPOSITE_DIR[dir];
        if ((nMask & opp) === 0) continue;

        const neighborType = this.getPieceTypeAt(nx, ny);
        const stateKey = this.getTraversalStateKey(nx, ny, neighborType, opp);
        if (!visited.has(stateKey)) {
          visited.add(stateKey);
          queue.push({ x: nx, y: ny, incomingDir: opp });
        }
      }
    }

    return path;
  }

  private finishCurrentLevel(status: 'solved' | 'timeout_skip') {
    this.levelMetrics.completionStatus = status;
    this.levelMetrics.activeTimeMs = Date.now() - this.levelStartedAt - this.pausedAccumulatedMs;
    if (!this.levelMetrics.solveTimeMs) this.levelMetrics.solveTimeMs = this.levelMetrics.activeTimeMs;
    this.levelMetrics.firstActionLatencyMs = this.firstActionAt ? this.firstActionAt - this.levelStartedAt : this.levelMetrics.activeTimeMs;
    this.perLevel.push({ ...this.levelMetrics });
  }

  private advanceLevel() {
    if (this.sessionMsRemaining <= 0) return this.completeSession('timeout');
    const next = this.levelIndex + 1;
    this.levelIndex = next > PIPE_PATCH_LEVELS.length ? 1 : next;
    this.startLevel(this.levelIndex);
  }

  private completeSession(reason: 'timeout' | 'normal_end' = 'normal_end') {
    this.sceneState = 'session_complete';
    const summary: PipePatchGameStats = {
      sessionDurationMs: SESSION_DURATION_MS - this.sessionMsRemaining,
      levelsAttempted: this.perLevel.length,
      levelsSolved: this.perLevel.filter((p) => p.completionStatus === 'solved').length,
      levelTimeoutSkips: this.perLevel.filter((p) => p.completionStatus === 'timeout_skip').length,
      perLevelMetrics: this.perLevel,
      telemetryEvents: this.telemetry,
    };
    this.logEvent('session_end', { levelsAttempted: summary.levelsAttempted, levelsSolved: summary.levelsSolved });

    const onGameOver = this.registry.get('onGameOver');
    if (onGameOver) {
      onGameOver({
        ...summary,
        score: summary.levelsSolved,
        stars: 0,
        success: reason !== 'timeout',
      });
    }
  }

  private pushUndoSnapshot() {
    this.undoStack.push({ placed: new Map(this.placed), inventory: [...this.trayInventory.entries()] });
    if (this.undoStack.length > 20) this.undoStack.shift();
  }

  private undoAction() {
    const prev = this.undoStack.pop();
    this.levelMetrics.undoCount += 1;
    this.logEvent('undo_pressed', { levelId: this.level.id });
    if (!prev) return;
    this.placed.clear();
    prev.placed.forEach((v, k) => this.placed.set(k, v));
    this.trayInventory = new Map(prev.inventory);

    this.placedVisuals.forEach((v) => v.container.destroy());
    this.placedVisuals.clear();
    this.placed.forEach((rp, key) => {
      const [x, y] = key.split(',').map(Number);
      const pv = this.spawnPieceVisual(rp.pieceId, rp.pieceType, this.cellCenterX(x), this.cellCenterY(y), false, Math.floor(this.cellSize * 0.94));
      pv.currentCellKey = key;
      pv.isFromTray = false;
      this.placedVisuals.set(rp.pieceId, pv);
    });

    this.updateAllPieceColors();
    this.updateTrayCounts();
    this.runBoardEval();
  }

  private resetLevel() {
    this.levelMetrics.resetCount += 1;
    this.logEvent('reset_level_pressed', { levelId: this.level.id });
    this.startLevel(this.level.id);
  }

  private clearLevelVisuals() {
    this.children.list
      .filter((g) => !this.uiPersistent.has(g))
      .forEach((g) => {
        if ((g as Phaser.GameObjects.GameObject).destroy) g.destroy();
      });
    this.cellVisuals.clear();
    this.trayVisuals.forEach((v) => v.container.destroy());
    this.trayTypeVisuals.forEach((v) => v.container.destroy());
    this.trayVisuals.clear();
    this.trayTypeVisuals.clear();
    this.placedVisuals.clear();
    this.trayCountTexts.clear();
  }

  private getCellFromWorld(x: number, y: number): Coord | null {
    if (x < this.boardOrigin.x || y < this.boardOrigin.y) return null;
    const gx = Math.floor((x - this.boardOrigin.x) / this.cellSize);
    const gy = Math.floor((y - this.boardOrigin.y) / this.cellSize);
    if (gx < 0 || gy < 0 || gx >= this.level.gridSize || gy >= this.level.gridSize) return null;
    return { x: gx, y: gy };
  }

  private cellCenterX(x: number) {
    return this.boardOrigin.x + x * this.cellSize + this.cellSize / 2;
  }
  private cellCenterY(y: number) {
    return this.boardOrigin.y + y * this.cellSize + this.cellSize / 2;
  }

  private createPipeVisual(
    pieceType: PipePieceType,
    x: number,
    y: number,
    size: number,
    local = true,
    color?: number,
    axisColorX?: number,
    axisColorY?: number
  ) {
    const g = this.add.graphics();
    const half = size * 0.5;
    const t = Math.max(8, Math.floor(size * 0.3));
    const pipeColor = color ?? COLORS.pipe;
    const highlight = this.brightenColor(pipeColor, 42);
    const cap = this.brightenColor(pipeColor, 20);
    const lowLight = this.darkenColor(pipeColor, 22);
    g.setPosition(x, y);
    const m = PIECE_DEFINITIONS[pieceType].mask;

    if (pieceType === 'crossover') {
      const underT = Math.max(5, Math.floor(t * 0.86));
      const overT = Math.max(6, Math.floor(t * 1.04));
      const gap = Math.max(6, Math.floor(t * 0.9));

      const overColor = axisColorX ?? pipeColor;
      const underBase = axisColorY ?? pipeColor;
      const underColor = this.darkenColor(underBase, 26);
      const underHighlight = this.brightenColor(underColor, 26);
      const underCap = this.brightenColor(underColor, 10);
      const underLowLight = this.darkenColor(underColor, 18);
      const overHighlight = this.brightenColor(overColor, 34);
      const overCap = this.brightenColor(overColor, 14);
      const overLowLight = this.darkenColor(overColor, 20);

      // Underpass (vertical) — broken at center for over/under illusion
      const drawUnderVertical = () => {
        const segLen = Math.max(2, half - gap);

        // Up segment
        g.fillStyle(COLORS.pipeShadow, 0.4).fillRoundedRect(-underT / 2 + 1, -half + 1, underT, segLen, 4);
        g.fillStyle(underColor, 1).fillRoundedRect(-underT / 2, -half, underT, segLen, 4);
        g.fillStyle(underLowLight, 0.45).fillRoundedRect(-underT / 2 + underT * 0.5, -half + 1, Math.max(2, underT * 0.42), Math.max(2, segLen - 2), 2);
        g.fillStyle(underHighlight, 0.55).fillRoundedRect(-underT / 2 + 1, -half + 2, Math.max(2, underT * 0.3), Math.max(2, segLen - 4), 2);
        g.fillStyle(underCap, 1).fillCircle(0, -half + 1, underT * 0.55);

        // Down segment
        g.fillStyle(COLORS.pipeShadow, 0.4).fillRoundedRect(-underT / 2 + 1, gap + 1, underT, segLen, 4);
        g.fillStyle(underColor, 1).fillRoundedRect(-underT / 2, gap, underT, segLen, 4);
        g.fillStyle(underLowLight, 0.45).fillRoundedRect(-underT / 2 + underT * 0.5, gap + 1, Math.max(2, underT * 0.42), Math.max(2, segLen - 2), 2);
        g.fillStyle(underHighlight, 0.55).fillRoundedRect(-underT / 2 + 1, gap + 2, Math.max(2, underT * 0.3), Math.max(2, segLen - 4), 2);
        g.fillStyle(underCap, 1).fillCircle(0, half - 1, underT * 0.55);
      };

      // Overpass (horizontal) — continuous across center
      const drawOverHorizontal = () => {
        g.fillStyle(COLORS.pipeShadow, 0.45).fillRoundedRect(-half + 1, -overT / 2 + 2, size, overT, 5);
        g.fillStyle(overColor, 1).fillRoundedRect(-half, -overT / 2, size, overT, 5);
        g.fillStyle(overLowLight, 0.45).fillRoundedRect(-half + 2, overT * 0.06, Math.max(2, size - 4), Math.max(2, overT * 0.32), 3);
        g.fillStyle(overHighlight, 0.65).fillRoundedRect(-half + 2, -overT / 2 + 1, Math.max(2, size - 4), Math.max(2, overT * 0.28), 3);
        g.fillStyle(overCap, 1).fillCircle(-half + 1, 0, overT * 0.55);
        g.fillStyle(overCap, 1).fillCircle(half - 1, 0, overT * 0.55);

        // Bridge lip to make the overpass read clearly
        g.lineStyle(Math.max(2, Math.floor(overT * 0.18)), 0x0b1220, 0.25);
        g.strokeRoundedRect(-overT * 0.9, -overT * 0.58, overT * 1.8, overT * 1.16, 6);
      };

      drawUnderVertical();
      drawOverHorizontal();

      // Subtle center joint glow
      const jointBase = axisColorX ?? axisColorY ?? pipeColor;
      g.fillStyle(this.brightenColor(jointBase, 18), 0.95).fillCircle(0, 0, Math.max(4, overT * 0.42));
      g.fillStyle(0x111827, 0.28).fillCircle(0, 0, Math.max(2, overT * 0.18));
      return g;
    }

    const drawArm = (dir: number) => {
      if (dir === DIR.UP) {
        g.fillStyle(COLORS.pipeShadow, 0.45).fillRoundedRect(-t / 2 + 1, -half + 1, t, half + t * 0.2, 4);
        g.fillStyle(pipeColor, 1).fillRoundedRect(-t / 2, -half, t, half + t * 0.2, 4);
        g.fillStyle(lowLight, 0.45).fillRoundedRect(-t / 2 + t * 0.5, -half + 1, Math.max(2, t * 0.42), Math.max(2, half - 1), 2);
        g.fillStyle(highlight, 0.65).fillRoundedRect(-t / 2 + 1, -half + 2, Math.max(2, t * 0.32), half - 2, 2);
        g.fillStyle(cap, 1).fillCircle(0, -half + 1, t * 0.55);
        return;
      }
      if (dir === DIR.RIGHT) {
        g.fillStyle(COLORS.pipeShadow, 0.45).fillRoundedRect(1, -t / 2 + 1, half + t * 0.2, t, 4);
        g.fillStyle(pipeColor, 1).fillRoundedRect(0, -t / 2, half + t * 0.2, t, 4);
        g.fillStyle(lowLight, 0.45).fillRoundedRect(1, -t / 2 + t * 0.46, Math.max(2, half - 1), Math.max(2, t * 0.42), 2);
        g.fillStyle(highlight, 0.65).fillRoundedRect(2, -t / 2 + 1, half - 2, Math.max(2, t * 0.32), 2);
        g.fillStyle(cap, 1).fillCircle(half - 1, 0, t * 0.55);
        return;
      }
      if (dir === DIR.DOWN) {
        g.fillStyle(COLORS.pipeShadow, 0.45).fillRoundedRect(-t / 2 + 1, 1, t, half + t * 0.2, 4);
        g.fillStyle(pipeColor, 1).fillRoundedRect(-t / 2, 0, t, half + t * 0.2, 4);
        g.fillStyle(lowLight, 0.45).fillRoundedRect(-t / 2 + t * 0.5, 1, Math.max(2, t * 0.42), Math.max(2, half - 1), 2);
        g.fillStyle(highlight, 0.65).fillRoundedRect(-t / 2 + 1, 1, Math.max(2, t * 0.32), half - 2, 2);
        g.fillStyle(cap, 1).fillCircle(0, half - 1, t * 0.55);
        return;
      }

      g.fillStyle(COLORS.pipeShadow, 0.45).fillRoundedRect(-half + 1, -t / 2 + 1, half + t * 0.2, t, 4);
      g.fillStyle(pipeColor, 1).fillRoundedRect(-half, -t / 2, half + t * 0.2, t, 4);
      g.fillStyle(lowLight, 0.45).fillRoundedRect(-half + 1, -t / 2 + t * 0.46, Math.max(2, half - 1), Math.max(2, t * 0.42), 2);
      g.fillStyle(highlight, 0.65).fillRoundedRect(-half + 1, -t / 2 + 1, Math.max(2, t * 0.32), half - 2, 2);
      g.fillStyle(cap, 1).fillCircle(-half + 1, 0, t * 0.55);
    };

    if (m & DIR.UP) drawArm(DIR.UP);
    if (m & DIR.RIGHT) drawArm(DIR.RIGHT);
    if (m & DIR.DOWN) drawArm(DIR.DOWN);
    if (m & DIR.LEFT) drawArm(DIR.LEFT);

    // Add a subtle glow effect to the center connection
    g.fillStyle(this.brightenColor(pipeColor, 18), 1).fillCircle(0, 0, Math.max(5, t * 0.62));
    g.fillStyle(lowLight, 0.45).fillCircle(0, 0, Math.max(3, t * 0.34));
    g.fillStyle(0x111827, 0.35).fillCircle(0, 0, Math.max(2, t * 0.2));
    
    // Add a small highlight dot for better visual appeal
    g.fillStyle(this.brightenColor(pipeColor, 56), 0.8).fillCircle(-Math.max(1, t * 0.08), -Math.max(1, t * 0.08), Math.max(1, t * 0.16));
    
    return g;
  }

  private getPipeColor(pieceType: PipePieceType) {
    if (pieceType.startsWith('tee')) return 0xbcc4cf;
    if (pieceType === 'cross') return 0xd0d6de;
    if (pieceType === 'crossover') return COLORS.pipe;
    return COLORS.pipe;
  }

  private drawEndpointPipe(cx: number, cy: number, mask: number, color: number, badgeText?: 'IN' | 'OUT') {
    const g = this.add.graphics();
    const half = this.cellSize * 0.36;
    const t = Math.max(7, Math.floor(this.cellSize * 0.22));
    g.setPosition(cx, cy);
    const drawArm = (dir: number) => {
      const v = DIR_VECTORS[dir as keyof typeof DIR_VECTORS];
      const ex = v.x * half;
      const ey = v.y * half;
      g.lineStyle(t + 4, 0x111827, 0.35);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(ex, ey); g.strokePath();
      g.lineStyle(t, color, 1);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(ex, ey); g.strokePath();
      g.fillStyle(this.brightenColor(color, 20), 1).fillCircle(ex, ey, t * 0.4);
    };

    if (mask & DIR.UP) drawArm(DIR.UP);
    if (mask & DIR.RIGHT) drawArm(DIR.RIGHT);
    if (mask & DIR.DOWN) drawArm(DIR.DOWN);
    if (mask & DIR.LEFT) drawArm(DIR.LEFT);

    g.fillStyle(this.brightenColor(color, 24), 1).fillCircle(0, 0, Math.max(5, t * 0.55));
    g.fillStyle(0x0f172a, 0.45).fillCircle(0, 0, Math.max(2, t * 0.22));

    this.uiPersistent.delete(g as unknown as Phaser.GameObjects.GameObject);

    if (badgeText) {
      const badge = this.add.text(cx, cy + this.cellSize * 0.29, badgeText, {
        fontSize: `${Math.max(9, Math.floor(this.cellSize * 0.16))}px`,
        color: '#e2e8f0',
        fontStyle: '700',
      }).setOrigin(0.5);
      this.uiPersistent.delete(badge as unknown as Phaser.GameObjects.GameObject);
    }
  }

  private updateTrayCounts() {
    this.trayCountTexts.forEach((text, type) => {
      const n = this.trayInventory.get(type) ?? 0;
      text.setText(`${n.toString().padStart(2, '0')}`);
      text.setColor(n > 0 ? '#f8fafc' : '#64748b');
    });
  }

  private brightenColor(color: number, amount: number) {
    const r = Math.min(255, ((color >> 16) & 0xff) + amount);
    const g = Math.min(255, ((color >> 8) & 0xff) + amount);
    const b = Math.min(255, (color & 0xff) + amount);
    return (r << 16) | (g << 8) | b;
  }

  private darkenColor(color: number, amount: number) {
    const r = Math.max(0, ((color >> 16) & 0xff) - amount);
    const g = Math.max(0, ((color >> 8) & 0xff) - amount);
    const b = Math.max(0, (color & 0xff) - amount);
    return (r << 16) | (g << 8) | b;
  }

  private getEndpointColor(colorId: string) {
    const byId: Record<string, number> = {
      blue: 0x3b82f6,
      red: 0xef4444,
      green: 0x22c55e,
      yellow: 0xeab308,
      purple: 0xa855f7,
    };
    if (byId[colorId]) return byId[colorId];
    const fallback = [0x22c55e, 0xef4444, 0x3b82f6, 0xeab308, 0xa855f7];
    const hash = [...colorId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return fallback[hash % fallback.length];
  }

  private getTargetColor(targetIndex: number) {
    const palette = [0x22c55e, 0xef4444, 0x3b82f6, 0xeab308, 0xa855f7];
    if (targetIndex < 0) return palette[0];
    return palette[targetIndex % palette.length];
  }

  private isEndpointCell(x: number, y: number): boolean {
    const key = `${x},${y}`;
    return this.level.endpointGroups.some((g) => {
      const inKey = `${g.input.position.x},${g.input.position.y}`;
      if (inKey === key) return true;
      return g.outputs.some((o) => `${o.position.x},${o.position.y}` === key);
    });
  }

  private getPieceTypeAt(cx: number, cy: number): PipePieceType | undefined {
    const fixed = this.level.fixedPipes.find((f) => f.position.x === cx && f.position.y === cy);
    if (fixed) return fixed.pieceType;
    const placed = this.placed.get(`${cx},${cy}`);
    return placed?.pieceType;
  }

  private getTraversalStateKey(cx: number, cy: number, pieceType: PipePieceType | undefined, incomingDir?: number) {
    if (pieceType !== 'crossover') return `${cx},${cy}`;
    if (incomingDir === DIR.LEFT || incomingDir === DIR.RIGHT) return `${cx},${cy},x`;
    if (incomingDir === DIR.UP || incomingDir === DIR.DOWN) return `${cx},${cy},y`;
    return `${cx},${cy},*`;
  }

  private getFlowDirections(mask: ConnectionMask, incomingDir?: number, pieceType?: PipePieceType): number[] {
    const allowed = DIRS.filter((dir) => (mask & dir) !== 0);
    if (pieceType !== 'crossover' || !incomingDir) return allowed;
    const straightOut = OPPOSITE_DIR[incomingDir];
    return (mask & straightOut) !== 0 ? [straightOut] : [];
  }

  private computeConnectedPieceColors(): Map<string, ColorId> {
    const colorByCell = new Map<string, ColorId>();
    const endpointGroups = this.level.endpointGroups;

    for (const group of endpointGroups) {
      const queue: Array<{ x: number; y: number; incomingDir?: number }> = [{ ...group.input.position }];
      const visited = new Set<string>([
        this.getTraversalStateKey(group.input.position.x, group.input.position.y, this.getPieceTypeAt(group.input.position.x, group.input.position.y), undefined),
      ]);

      while (queue.length > 0) {
        const c = queue.shift()!;
        const cMask = this.getColorMaskAt(c.x, c.y);
        if (cMask === 0) continue;
        const pieceType = this.getPieceTypeAt(c.x, c.y);
        const dirs = this.getFlowDirections(cMask, c.incomingDir, pieceType);

        for (const dir of dirs) {
          const v = DIR_VECTORS[dir];
          const nx = c.x + v.x;
          const ny = c.y + v.y;
          if (nx < 0 || ny < 0 || nx >= this.level.gridSize || ny >= this.level.gridSize) continue;
          if (this.level.blockedCells.some((b) => b.x === nx && b.y === ny)) continue;
          if (this.isLockedCell(nx, ny)) continue;
          const nMask = this.getColorMaskAt(nx, ny);
          const opp = OPPOSITE_DIR[dir];
          if ((nMask & opp) === 0) continue;
          const neighborCellKey = `${nx},${ny}`;
          if (this.placed.has(neighborCellKey)) {
            const neighborType = this.getPieceTypeAt(nx, ny);
            if (neighborType !== 'crossover' && !colorByCell.has(neighborCellKey)) {
              colorByCell.set(neighborCellKey, group.colorId as ColorId);
            }
          }

          const neighborType = this.getPieceTypeAt(nx, ny);
          const stateKey = this.getTraversalStateKey(nx, ny, neighborType, opp);
          if (!visited.has(stateKey)) {
            visited.add(stateKey);
            queue.push({ x: nx, y: ny, incomingDir: opp });
          }
        }
      }
    }
    return colorByCell;
  }

  private getColorMaskAt(cx: number, cy: number): ConnectionMask {
    const endpointGroups = this.level.endpointGroups;
    const input = endpointGroups.find((g) => g.input.position.x === cx && g.input.position.y === cy)?.input;
    if (input) return OPPOSITE_DIR[input.mask];
    const output = endpointGroups.flatMap((g) => g.outputs).find((o) => o.position.x === cx && o.position.y === cy);
    if (output) return output.mask;
    const fixed = this.level.fixedPipes.find((f) => f.position.x === cx && f.position.y === cy);
    if (fixed) return PIECE_DEFINITIONS[fixed.pieceType].mask;
    const placed = this.placed.get(`${cx},${cy}`);
    if (placed) return PIECE_DEFINITIONS[placed.pieceType].mask;
    return 0;
  }

  private getSourceColorAt(cx: number, cy: number): ColorId | undefined {
    const group = this.level.endpointGroups.find((g) => g.input.position.x === cx && g.input.position.y === cy);
    return group?.colorId as ColorId | undefined;
  }

  private findConnectedColorForDirection(x: number, y: number, dir: number): ColorId | undefined {
    const centerMask = this.getColorMaskAt(x, y);
    if ((centerMask & dir) === 0) return undefined;
    const v = DIR_VECTORS[dir];
    const sx = x + v.x;
    const sy = y + v.y;
    if (sx < 0 || sy < 0 || sx >= this.level.gridSize || sy >= this.level.gridSize) return undefined;
    if (this.level.blockedCells.some((b) => b.x === sx && b.y === sy)) return undefined;
    if (this.isLockedCell(sx, sy)) return undefined;

    const startMask = this.getColorMaskAt(sx, sy);
    const opp = OPPOSITE_DIR[dir];
    if ((startMask & opp) === 0) return undefined;

    const queue: Array<{ x: number; y: number; incomingDir?: number }> = [{ x: sx, y: sy, incomingDir: opp }];
    const visited = new Set<string>([
      this.getTraversalStateKey(sx, sy, this.getPieceTypeAt(sx, sy), opp),
    ]);
    const foundColors = new Set<ColorId>();

    while (queue.length > 0) {
      const c = queue.shift()!;
      const sourceColor = this.getSourceColorAt(c.x, c.y);
      if (sourceColor) {
        foundColors.add(sourceColor);
        if (foundColors.size > 1) return undefined;
      }
      const mask = this.getColorMaskAt(c.x, c.y);
      if (mask === 0) continue;
      const pieceType = this.getPieceTypeAt(c.x, c.y);
      const dirs = this.getFlowDirections(mask, c.incomingDir, pieceType);

      for (const d of dirs) {
        const dv = DIR_VECTORS[d];
        const nx = c.x + dv.x;
        const ny = c.y + dv.y;
        if (nx < 0 || ny < 0 || nx >= this.level.gridSize || ny >= this.level.gridSize) continue;
        if (nx === x && ny === y) continue;
        if (this.level.blockedCells.some((b) => b.x === nx && b.y === ny)) continue;
        if (this.isLockedCell(nx, ny)) continue;
        const nMask = this.getColorMaskAt(nx, ny);
        if ((nMask & OPPOSITE_DIR[d]) === 0) continue;
        const nextType = this.getPieceTypeAt(nx, ny);
        const stateKey = this.getTraversalStateKey(nx, ny, nextType, OPPOSITE_DIR[d]);
        if (visited.has(stateKey)) continue;
        visited.add(stateKey);
        queue.push({ x: nx, y: ny, incomingDir: OPPOSITE_DIR[d] });
      }
    }

    if (foundColors.size === 1) return [...foundColors][0];
    return undefined;
  }

  private resolveCrossoverAxisColors(x: number, y: number): { axisX?: ColorId; axisY?: ColorId } {
    const left = this.findConnectedColorForDirection(x, y, DIR.LEFT);
    const right = this.findConnectedColorForDirection(x, y, DIR.RIGHT);
    const up = this.findConnectedColorForDirection(x, y, DIR.UP);
    const down = this.findConnectedColorForDirection(x, y, DIR.DOWN);

    const axisX = left && right && left !== right ? undefined : (left ?? right);
    const axisY = up && down && up !== down ? undefined : (up ?? down);
    return { axisX, axisY };
  }

  /**
   * Update colors of all placed pieces based on their connections to sources.
   */
  private updateAllPieceColors() {
    const colorByCell = this.computeConnectedPieceColors();
    this.placed.forEach((piece, key) => {
      const rawColorId = colorByCell.get(key);
      const isCrossover = piece.pieceType === 'crossover';
      const colorId = isCrossover ? undefined : rawColorId;
      piece.colorId = colorId;
      
      // Update visual if exists
      const visual = this.placedVisuals.get(piece.pieceId);
      if (visual) {
        visual.colorId = colorId;
        // Re-render the piece with the correct color
        const container = visual.container;
        const children = container.list;
        // Find and remove old pipe graphics (keep background elements)
        const toRemove = children.filter(c => c instanceof Phaser.GameObjects.Graphics);
        toRemove.forEach(c => c.destroy());
        
        // Add new pipe graphics with correct color
        let axisXColor: number | undefined;
        let axisYColor: number | undefined;
        if (isCrossover) {
          const [x, y] = key.split(',').map(Number);
          const axis = this.resolveCrossoverAxisColors(x, y);
          visual.axisColorX = axis.axisX;
          visual.axisColorY = axis.axisY;
          axisXColor = axis.axisX ? COLOR_HEX[axis.axisX] : undefined;
          axisYColor = axis.axisY ? COLOR_HEX[axis.axisY] : undefined;
        } else {
          visual.axisColorX = undefined;
          visual.axisColorY = undefined;
        }
        const pipeColor = isCrossover ? COLORS.pipe : (colorId ? COLOR_HEX[colorId] : COLORS.pipe);
        const art = this.createPipeVisual(
          piece.pieceType,
          0,
          0,
          Math.floor(this.cellSize * 0.94) * 0.88,
          true,
          pipeColor,
          axisXColor,
          axisYColor
        );
        container.add(art);
      }
    });
  }

  private arrowForGate(entry: string, exit: string) {
    if (entry === 'left' && exit === 'right') return '→';
    if (entry === 'right' && exit === 'left') return '←';
    if (entry === 'up' && exit === 'down') return '↓';
    if (entry === 'down' && exit === 'up') return '↑';
    return '↦';
  }

  private logEvent(type: string, payload?: Record<string, unknown>) {
    this.telemetry.push({ type, atMs: Date.now() - this.sessionStartedAt, payload });
  }
}
