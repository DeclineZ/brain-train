import * as Phaser from 'phaser';
import { PIPE_PATCH_LEVELS, getPipePatchLevel } from './levels';
import { calculatePipePatchLevelScore } from '@/lib/scoring/engine/levelScoreMappers';
import { calculateUnifiedLevelScore, mapDifficultyFromScale } from '@/lib/scoring/engine/unifiedLevelScore';
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
  type PipePatchEndpoint,
  type RuntimePlacedPiece,
  type PipePieceType,
  type RequiredPlacement,
  type OneWayGateConfig,
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
  endpointSatisfiedCount: number;
  endpointUnsatisfiedCount: number;
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

interface PipePatchStarBreakdown {
  mindChangeScore: number;
  accuracyScore: number;
  precisionScore: number;
  speedScore: number;
  starScore: number;
}

type NetworkTraversalMode = 'gameplay' | 'visual';
type TraversalNeighborResult =
  | {
      status: 'ok';
      x: number;
      y: number;
      key: string;
      opp: number;
      neighborType: PipePieceType | undefined;
    }
  | {
      status: 'blocked' | 'leak' | 'open' | 'gate_fail';
      x: number;
      y: number;
      key?: string;
      opp?: number;
      gate?: OneWayGateConfig;
    };

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
  pipe: 0xd6dee9,
  pipeShadow: 0x0f172a,
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
  private bgMusic?: Phaser.Sound.BaseSound;
  private lastLeakSfxAt = 0;
  private readonly soundKeys = {
    bgLoop: 'pipe-patch-bg-loop',
    leak: 'pipe-patch-error',
    pumpOn: 'pipe-patch-place',
    rotate: 'pipe-patch-rotate',
  };

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
  private trayUiObjects: Phaser.GameObjects.GameObject[] = [];
  private trayPage = 0;
  private placedIdSeq = 0;
  private activeRequiredPlacements: RequiredPlacement[] = [];
  private activeEndpointCells: Coord[] = [];

  private cellVisuals = new Map<string, CellVisual>();
  private endpointVisuals = new Map<string, Phaser.GameObjects.Graphics>();
  private endpointWallVisuals = new Map<string, Phaser.GameObjects.Graphics>();
  private fixedVisuals = new Map<string, Phaser.GameObjects.Graphics>();
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

  private buildActiveEndpointCells(): Coord[] {
    const endpoints: Coord[] = [];
    const seen = new Set<string>();
    const upsert = (position: Coord) => {
      const key = `${position.x},${position.y}`;
      if (seen.has(key)) return;
      seen.add(key);
      endpoints.push({ ...position });
    };

    this.level.endpointGroups.forEach((group) => {
      group.endpoints.forEach((endpoint) => upsert(endpoint.position));
    });

    return endpoints;
  }

  private buildTrayInventory() {
    const lockedSet = new Set(this.level.lockedPlaceholders.map((l) => this.getCellKey(l.position)));
    this.activeRequiredPlacements = this.level.requiredPlacements.filter((r) => !lockedSet.has(this.getCellKey(r.position)));
    this.activeEndpointCells = this.buildActiveEndpointCells().filter((c) => !lockedSet.has(this.getCellKey(c)));

    const inv = new Map<PipePieceType, number>();
    
    // Authored required placements must exist in tray count.
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

  preload() {
    this.load.audio(this.soundKeys.bgLoop, '/assets/sounds/pipe-patch/bg-music.mp3');
    this.load.audio(this.soundKeys.leak, '/assets/sounds/global/error.mp3');
    this.load.audio(this.soundKeys.pumpOn, '/assets/sounds/pipe-patch/place.mp3');
    this.load.audio(this.soundKeys.rotate, '/assets/sounds/pipe-patch/rotate.mp3');
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
    this.input.dragDistanceThreshold = 4;
    this.input.dragTimeThreshold = 90;
    this.setupAudio();
    this.createUiChrome();
    this.startLevel(this.levelIndex);
    this.sceneState = 'playing';
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupAudio, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupAudio, this);
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

  public advanceTime(ms: number) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    const delta = ms / steps;
    for (let i = 0; i < steps; i += 1) {
      this.update(0, delta);
    }
  }

  public renderGameToText() {
    const evalResult = this.evaluateBoardState();
    const payload = {
      mode: this.sceneState,
      levelId: this.level?.id ?? null,
      gridSize: this.level?.gridSize ?? null,
      coordinateSystem: { origin: 'top-left', x: 'right', y: 'down' },
      endpoints: this.activeEndpointCells.map((cell) => ({
        key: this.getCellKey(cell),
        colorId: this.getEndpointColorAt(cell.x, cell.y) ?? null,
        active: this.hasActiveEndpointPipe(cell.x, cell.y),
      })),
      placed: [...this.placed.entries()].map(([key, piece]) => ({
        key,
        pieceType: piece.pieceType,
        colorId: piece.colorId ?? null,
      })),
      tray: [...this.trayInventory.entries()].map(([pieceType, count]) => ({ pieceType, count })),
      evaluation: {
        isSolved: evalResult.isSolved,
        isConnected: evalResult.isConnected,
        openEndsCount: evalResult.openEndsCount,
        leakCount: evalResult.leakCount,
        endpointSatisfiedCount: evalResult.endpointSatisfiedCount,
        endpointUnsatisfiedCount: evalResult.endpointUnsatisfiedCount,
      },
    };
    return JSON.stringify(payload);
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

  private setupAudio() {
    this.sound.stopAll();
    try {
      this.bgMusic = this.sound.add(this.soundKeys.bgLoop, { volume: 0.4, loop: true });
      this.bgMusic.play();
    } catch (error) {
      console.warn('Failed to play bg music', error);
    }
  }

  private playSfx(key: string, config?: Phaser.Types.Sound.SoundConfig) {
    try {
      this.sound.play(key, config);
    } catch (error) {
      console.warn(`Failed to play sound: ${key}`, error);
    }
  }

  private maybePlayLeakSfx() {
    const now = Date.now();
    if (now - this.lastLeakSfxAt < 250) return;
    this.lastLeakSfxAt = now;
    this.playSfx(this.soundKeys.leak, { volume: 0.55 });
  }

  private cleanupAudio() {
    if (this.bgMusic?.isPlaying) {
      this.bgMusic.stop();
    }
    this.bgMusic?.destroy();
    this.bgMusic = undefined;
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
    this.trayPage = 0;
    this.buildTrayInventory();
    const targetPlacementCount = this.activeRequiredPlacements.length + this.activeEndpointCells.length;
    this.levelMetrics.requiredPieceCount = targetPlacementCount;
    this.levelMetrics.optimalPlacements = targetPlacementCount;
    this.prevDistance = targetPlacementCount;

    this.drawBoard();
    this.drawTray();
    this.sceneState = 'playing';
  }

  private drawBoard() {
    const size = this.level.gridSize;
    const width = this.scale.width;
    const height = this.scale.height;
    const gridPaddingX = 24;
    const gridPaddingTop = 10;
    const gridPaddingBottom = 10;
    this.boardSizePx = Math.min(500, width - gridPaddingX * 2);
    this.cellSize = Math.floor(this.boardSizePx / size);
    this.boardSizePx = this.cellSize * size;
    this.boardOrigin.x = Math.floor((width - this.boardSizePx) / 2);
    // Lift the board a bit higher so gameplay area matches other games' composition.
    const topUiY = 20 + gridPaddingTop;
    const bottomMargin = 12 + gridPaddingBottom;
    const types = [...this.trayInventory.keys()];
    const trayLayout = this.getTrayLayout(types.length);
    const panelH = this.getTrayPanelHeight(
      trayLayout.visibleRows,
      trayLayout.size,
      trayLayout.gap,
      trayLayout.totalPages > 1
    );
    const minBoardY = topUiY;
    const maxBoardY = Math.max(minBoardY, height - panelH - this.boardSizePx - 20 - bottomMargin);
    // Bias toward a slightly higher board anchor (while still clamped by tray space).
    const centeredBoardY = Math.floor((height - this.boardSizePx) / 2) - 36;
    this.boardOrigin.y = Math.max(minBoardY, Math.min(maxBoardY, centeredBoardY));

    const boardCx = this.boardOrigin.x + this.boardSizePx / 2;
    const boardCy = this.boardOrigin.y + this.boardSizePx / 2;

    this.add.rectangle(boardCx, boardCy + 4, this.boardSizePx + 26, this.boardSizePx + 26, 0x000000, 0.28);
    this.add.rectangle(boardCx, boardCy, this.boardSizePx + 24, this.boardSizePx + 24, COLORS.boardOuter).setStrokeStyle(4, 0x8b5e34, 0.9);
    this.add.rectangle(boardCx, boardCy, this.boardSizePx + 10, this.boardSizePx + 10, COLORS.boardInner).setStrokeStyle(2, 0x1f110a, 0.8);

    const blockedSet = new Set(this.level.blockedCells.map((c) => `${c.x},${c.y}`));
    const endpointGroups = this.level.endpointGroups;
    // Build a map from position to endpoint info for all endpoints (peer-to-peer)
    const endpointMap = new Map<string, { endpoint: PipePatchEndpoint; group: PipePatchEndpointGroup }>();
    endpointGroups.forEach((group) => {
      group.endpoints.forEach((ep) => {
        endpointMap.set(`${ep.position.x},${ep.position.y}`, { endpoint: ep, group });
      });
    });
    const endpointHighlightMap = this.getEndpointConnectionHighlightMap();
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
        if (endpointMap.has(key)) {
          if (this.isBoardEdgeCoord(x, y)) {
            const info = endpointMap.get(key)!;
            const color = COLOR_HEX[info.group.colorId as ColorId];
            border.setStrokeStyle(2, this.brightenColor(color, 18), 0.85);
          }
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
          continue;
        }
      }
    }

    this.applyEndpointConnectionHighlights(endpointHighlightMap);
    this.refreshFixedPipeVisuals();
    this.refreshEndpointVisuals();
  }

  private getEndpointConnectionHighlightMap() {
    const highlights = new Map<string, number>();
    const addHighlight = (x: number, y: number, mask: ConnectionMask, color: number) => {
      // Keep edge endpoints on the original style.
      // Connection tile highlighting is only for interior endpoints.
      if (this.isBoardEdgeCoord(x, y)) return;
      for (const dir of DIRS) {
        if ((mask & dir) === 0) continue;
        const dv = DIR_VECTORS[dir];
        const tx = x + dv.x;
        const ty = y + dv.y;
        if (tx < 0 || ty < 0 || tx >= this.level.gridSize || ty >= this.level.gridSize) continue;
        const key = `${tx},${ty}`;
        if (this.level.blockedCells.some((c) => c.x === tx && c.y === ty)) continue;
        if (this.level.fixedPipes.some((f) => f.position.x === tx && f.position.y === ty)) continue;
        if (this.level.oneWayGates.some((g) => g.position.x === tx && g.position.y === ty)) continue;
        if (this.isLockedCell(tx, ty)) continue;

        const existing = highlights.get(key);
        if (existing === undefined || existing === color) {
          highlights.set(key, color);
        } else {
          highlights.set(key, 0xe2e8f0);
        }
      }
    };

    this.level.endpointGroups.forEach((group) => {
      const color = COLOR_HEX[group.colorId as ColorId];
      group.endpoints.forEach((endpoint) => {
        const mask = this.resolveEndpointFlowMask(endpoint.position.x, endpoint.position.y, OPPOSITE_DIR[endpoint.mask]);
        addHighlight(endpoint.position.x, endpoint.position.y, mask, color);
      });
    });
    return highlights;
  }

  private applyEndpointConnectionHighlights(highlights: Map<string, number>) {
    highlights.forEach((color, key) => {
      const cv = this.cellVisuals.get(key);
      if (!cv) return;
      cv.border.setStrokeStyle(2, this.brightenColor(color, 16), 0.92);
    });
  }

  private getGameplayConnectedMaskForCell(x: number, y: number, mask: number) {
    let connectedMask = 0;
    for (const dir of DIRS) {
      if ((mask & dir) === 0) continue;
      const neighbor = this.inspectTraversalNeighbor(x, y, dir, 'gameplay');
      if (neighbor.status === 'ok') {
        connectedMask |= dir;
      }
    }
    return connectedMask;
  }

  private getVisualConnectedMaskForCell(x: number, y: number, mask: number) {
    let connectedMask = 0;
    for (const dir of DIRS) {
      if ((mask & dir) === 0) continue;
      const neighbor = this.inspectTraversalNeighbor(x, y, dir, 'visual');
      if (neighbor.status === 'ok') {
        connectedMask |= dir;
      }
    }
    return connectedMask;
  }

  private getEndpointVisualHideMask(x: number, y: number, endpointMask: number) {
    const placed = this.placed.get(this.getCellKey({ x, y }));
    if (!placed) return 0;
    if (!this.isEndpointPlacementValid(x, y, placed.pieceType)) return 0;
    return endpointMask;
  }

  private refreshFixedPipeVisuals(colorByCell?: Map<string, ColorId | undefined>) {
    this.fixedVisuals.forEach((g) => g.destroy());
    this.fixedVisuals.clear();

    this.level.fixedPipes.forEach((fixed) => {
      const key = `${fixed.position.x},${fixed.position.y}`;
      const cell = this.cellVisuals.get(key);
      if (!cell) return;

      const mask = PIECE_DEFINITIONS[fixed.pieceType].mask;
      const touchesInactiveEndpoint = this.hasInactiveEndpointContact(fixed.position.x, fixed.position.y, mask);
      const hideCapMask = touchesInactiveEndpoint ? 0 : this.getVisualConnectedMaskForCell(fixed.position.x, fixed.position.y, mask);
      const isCrossover = fixed.pieceType === 'crossover';
      let axisXColor: number | undefined;
      let axisYColor: number | undefined;
      if (isCrossover && !touchesInactiveEndpoint) {
        const axis = this.resolveCrossoverAxisColors(fixed.position.x, fixed.position.y);
        axisXColor = axis.axisX ? COLOR_HEX[axis.axisX] : undefined;
        axisYColor = axis.axisY ? COLOR_HEX[axis.axisY] : undefined;
      }
      const fixedColor = isCrossover
        ? COLORS.pipe
        : (!touchesInactiveEndpoint && colorByCell?.get(key) ? COLOR_HEX[colorByCell.get(key)!] : COLORS.pipe);
      const art = this.createPipeVisual(
        fixed.pieceType,
        cell.rect.x,
        cell.rect.y,
        this.cellSize * 0.96,
        false,
        fixedColor,
        axisXColor,
        axisYColor,
        hideCapMask
      );
      this.fixedVisuals.set(key, art);
    });
  }

  private refreshEndpointVisuals() {
    this.endpointVisuals.forEach((g) => g.destroy());
    this.endpointVisuals.clear();
    this.endpointWallVisuals.forEach((g) => g.destroy());
    this.endpointWallVisuals.clear();

    const endpointGroups = this.level.endpointGroups;
    endpointGroups.forEach((group) => {
      const color = COLOR_HEX[group.colorId as ColorId];
      group.endpoints.forEach((endpoint) => {
        const key = `${endpoint.position.x},${endpoint.position.y}`;
        const cell = this.cellVisuals.get(key);
        if (!cell) return;
        
        // endpoint.mask is the direction the endpoint faces INTO the board
        const facingDir = endpoint.mask;
        // Visual mask is same as facing direction - pipe arm faces into the board
        const mask = facingDir;
        const isEdge = this.isBoardEdgeCoord(endpoint.position.x, endpoint.position.y);
        if (!isEdge) {
          const wall = this.drawInteriorEndpointWall(cell.rect.x, cell.rect.y, facingDir);
          this.endpointWallVisuals.set(key, wall);
        }
        const drawPos = this.resolveEndpointRenderPosition(
          cell.rect.x,
          cell.rect.y,
          facingDir,
          isEdge
        );
        const hideMouthMask = this.getEndpointVisualHideMask(endpoint.position.x, endpoint.position.y, mask);
        const g = this.drawEndpointPipe(drawPos.x, drawPos.y, mask, color, hideMouthMask);
        this.endpointVisuals.set(key, g);
      });
    });
  }

  private drawInteriorEndpointWall(cx: number, cy: number, facingDir: number) {
    const g = this.add.graphics();
    const dv = DIR_VECTORS[facingDir];
    const bx = cx + dv.x * (this.cellSize * 0.5);
    const by = cy + dv.y * (this.cellSize * 0.5);
    const wallThickness = Math.max(5, Math.floor(this.cellSize * 0.12));
    const wallLength = Math.max(14, Math.floor(this.cellSize * 0.72));

    const stoneBase = 0x5b6470;
    const stoneDark = 0x3f4752;
    const stoneLight = 0x9aa4b2;

    g.fillStyle(stoneBase, 0.96);
    g.lineStyle(1, stoneLight, 0.55);

    if (facingDir === DIR.LEFT || facingDir === DIR.RIGHT) {
      g.fillRoundedRect(bx - wallThickness / 2, by - wallLength / 2, wallThickness, wallLength, 2);
      g.strokeRoundedRect(bx - wallThickness / 2, by - wallLength / 2, wallThickness, wallLength, 2);
      g.fillStyle(stoneDark, 0.65).fillRoundedRect(
        bx - wallThickness / 2 + 1,
        by - wallLength / 2 + 2,
        Math.max(2, wallThickness - 2),
        Math.max(4, wallLength - 4),
        1
      );
      g.fillStyle(stoneLight, 0.35).fillRect(
        bx - wallThickness * 0.25,
        by - wallLength * 0.35,
        Math.max(1, wallThickness * 0.2),
        Math.max(2, wallLength * 0.16)
      );
    } else {
      g.fillRoundedRect(bx - wallLength / 2, by - wallThickness / 2, wallLength, wallThickness, 2);
      g.strokeRoundedRect(bx - wallLength / 2, by - wallThickness / 2, wallLength, wallThickness, 2);
      g.fillStyle(stoneDark, 0.65).fillRoundedRect(
        bx - wallLength / 2 + 2,
        by - wallThickness / 2 + 1,
        Math.max(4, wallLength - 4),
        Math.max(2, wallThickness - 2),
        1
      );
      g.fillStyle(stoneLight, 0.35).fillRect(
        bx - wallLength * 0.35,
        by - wallThickness * 0.25,
        Math.max(2, wallLength * 0.16),
        Math.max(1, wallThickness * 0.2)
      );
    }
    return g;
  }

  private drawTray() {
    this.trayTypeVisuals.forEach((v) => v.container.destroy());
    this.trayTypeVisuals.clear();
    this.trayCountTexts.forEach((t) => t.destroy());
    this.trayCountTexts.clear();
    this.trayUiObjects.forEach((obj) => obj.destroy());
    this.trayUiObjects = [];

    const top = this.boardOrigin.y + this.boardSizePx + 20;
    const types = [...this.trayInventory.keys()];
    const layout = this.getTrayLayout(types.length);
    const { gap, size, cols, visibleRows, visibleSlots, totalPages } = layout;
    const panelH = this.getTrayPanelHeight(visibleRows, size, gap, totalPages > 1);

    this.trayPage = Phaser.Math.Clamp(this.trayPage, 0, Math.max(0, totalPages - 1));
    const pageStart = this.trayPage * visibleSlots;
    const visibleTypes = types.slice(pageStart, pageStart + visibleSlots);

    this.trayY = Math.min(this.scale.height - panelH / 2 - 8, top + panelH / 2);
    const shadowPanel = this.add.rectangle(this.scale.width / 2, this.trayY + 3, this.scale.width - 12, panelH, 0x000000, 0.35);
    const panel = this.add
      .rectangle(this.scale.width / 2, this.trayY, this.scale.width - 12, panelH, COLORS.trayPanel, 0.95)
      .setStrokeStyle(2, 0x406061, 0.9);
    this.trayUiObjects.push(shadowPanel, panel);
    this.trayBounds = new Phaser.Geom.Rectangle(6, this.trayY - panelH / 2, this.scale.width - 12, panelH);

    const pagerHeight = totalPages > 1 ? 30 : 0;
    const gridAreaHeight = visibleRows * size + Math.max(0, visibleRows - 1) * gap;
    const totalW = cols * size + Math.max(0, cols - 1) * gap;
    const startX = (this.scale.width - totalW) / 2 + size / 2;
    const startY = this.trayY - (gridAreaHeight + pagerHeight) / 2 + size / 2 + 10;

    visibleTypes.forEach((pieceType, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = startX + col * (size + gap);
      const py = startY + row * (size + gap);

      const pv = this.spawnPieceVisual(`tray-${pieceType}`, pieceType, px, py, true, size);
      this.trayTypeVisuals.set(pieceType, pv);

      const count = this.add
        .text(px, py - size * 0.62, '00', {
          fontSize: '18px',
          fontStyle: '700',
          color: '#f8fafc',
          backgroundColor: '#00000088',
          padding: { left: 4, right: 4, top: 1, bottom: 1 },
        })
        .setOrigin(0.5);
      this.trayCountTexts.set(pieceType, count);
    });

    if (totalPages > 1) {
      this.createTrayPagerControls(panelH, totalPages);
    }

    this.updateTrayCounts();
  }

  private getTrayLayout(typeCount = this.trayInventory.size) {
    const gap = 12;
    const size = Math.max(56, Math.min(78, Math.floor((this.scale.width - 24) / 6.4)));
    const cols = Math.max(3, Math.floor((this.scale.width - 24) / (size + gap)));
    const totalRows = Math.max(1, Math.ceil(typeCount / cols));
    const usePagination = typeCount > 12 || totalRows > 3;
    const visibleRows = usePagination ? Math.min(3, totalRows) : totalRows;
    const visibleSlots = cols * visibleRows;
    const totalPages = usePagination ? Math.max(1, Math.ceil(typeCount / visibleSlots)) : 1;
    return { gap, size, cols, visibleRows, visibleSlots, totalPages };
  }

  private getTrayPanelHeight(visibleRows: number, size: number, gap: number, hasPager: boolean) {
    const gridHeight = visibleRows * size + Math.max(0, visibleRows - 1) * gap;
    const pagerHeight = hasPager ? 30 : 0;
    return Math.max(140, Math.min(360, gridHeight + 62 + pagerHeight));
  }

  private createTrayPagerControls(panelH: number, totalPages: number) {
    const navY = this.trayY + panelH / 2 - 18;
    const label = this.add
      .text(this.scale.width / 2, navY, `${this.trayPage + 1}/${totalPages}`, {
        fontSize: '16px',
        fontStyle: '700',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);
    this.trayUiObjects.push(label);

    this.createTrayNavButton(
      this.scale.width / 2 - 56,
      navY,
      '‹',
      this.trayPage > 0,
      () => {
        this.trayPage -= 1;
        this.drawTray();
      }
    );
    this.createTrayNavButton(
      this.scale.width / 2 + 56,
      navY,
      '›',
      this.trayPage < totalPages - 1,
      () => {
        this.trayPage += 1;
        this.drawTray();
      }
    );
  }

  private createTrayNavButton(x: number, y: number, label: string, enabled: boolean, onClick: () => void) {
    const bg = this.add
      .rectangle(x, y, 32, 26, enabled ? 0x0f2f31 : 0x243638, 0.95)
      .setStrokeStyle(1, enabled ? 0x9dd7db : 0x4f6a6d, 0.9);
    const text = this.add
      .text(x, y - 1, label, {
        fontSize: '18px',
        fontStyle: '700',
        color: enabled ? '#f8fafc' : '#7b8a8c',
      })
      .setOrigin(0.5);
    if (enabled) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', onClick);
    }
    this.trayUiObjects.push(bg, text);
  }

  private spawnPieceVisual(pieceId: string, pieceType: PipePieceType, x: number, y: number, isFromTray: boolean, size: number) {
    const container = this.add.container(x, y);
    const touchHitSize = Math.max(size, size + 14);
    const bgShadow = this.add.rectangle(1, 2, size, size, 0x000000, 0.26).setStrokeStyle(0);
    const bg = this.add.rectangle(0, 0, size, size, COLORS.trayCard, 0.9).setStrokeStyle(1, COLORS.traySlotStroke, 0.9);
    const slotGlow = this.add.rectangle(0, 0, size - 6, size - 6, COLORS.traySlot, 0.3).setStrokeStyle(1, 0x5f8f91, 0.6);
    container.add(bgShadow);
    container.add(bg);
    container.add(slotGlow);
    
    const art = this.createPipeVisual(pieceType, 0, 0, size * 0.88, true, COLORS.pipe);
    container.add(art);
    container.setSize(touchHitSize, touchHitSize);
    container.setInteractive();
    container.input!.cursor = 'pointer';

    const data: PieceVisual = { pieceId, pieceType, container, isFromTray, homeX: x, homeY: y };
    this.input.setDraggable(container);

    container.on('dragstart', () => {
      if (this.sceneState !== 'playing') return;
      this.playSfx(this.soundKeys.rotate, { volume: 0.35 });
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
    const previousCellKey = piece.currentCellKey;
    const existing = this.placed.get(key);
    if (existing && existing.pieceId !== piece.pieceId) {
      const existingVisual = this.placedVisuals.get(existing.pieceId);
      if (existingVisual) {
        this.levelMetrics.undoCount += 1;
        this.countTargetPlacementRemovalAsIncorrect(existingVisual.currentCellKey ?? key);
        this.returnPieceToTray(existingVisual);
      }
      this.logEvent('piece_swapped', { incomingPieceId: piece.pieceId, outgoingPieceId: existing.pieceId, cellId: key });
    }

    let activePiece = piece;
    if (piece.isFromTray && !piece.currentCellKey) {
      const placedId = `placed-${piece.pieceType}-${this.placedIdSeq++}`;
      activePiece = this.spawnPieceVisual(placedId, piece.pieceType, this.cellCenterX(cell.x), this.cellCenterY(cell.y), false, Math.floor(this.cellSize * 0.98));
      this.trayInventory.set(piece.pieceType, Math.max(0, (this.trayInventory.get(piece.pieceType) ?? 0) - 1));
      piece.container.setPosition(piece.homeX, piece.homeY);
    } else {
      activePiece.container.setPosition(this.cellCenterX(cell.x), this.cellCenterY(cell.y));
    }

    // If a placed piece is moved to another cell, clear its old occupancy first.
    if (previousCellKey && previousCellKey !== key) {
      this.levelMetrics.undoCount += 1;
      this.countTargetPlacementRemovalAsIncorrect(previousCellKey);
      this.placed.delete(previousCellKey);
    }

    activePiece.currentCellKey = key;
    activePiece.isFromTray = false;
    this.placed.set(key, { pieceId: activePiece.pieceId, pieceType: activePiece.pieceType, fromTray: true, placedAtMs: Date.now() });
    this.placedVisuals.set(activePiece.pieceId, activePiece);
    this.updateTrayCounts();
    this.playSfx(this.soundKeys.pumpOn, { volume: 0.42 });

    const req = this.activeRequiredPlacements.find((r) => r.position.x === cell.x && r.position.y === cell.y);
    const isEndpointTarget = this.isEndpointCell(cell.x, cell.y);
    const isTargetCell = this.isAccuracyTargetCell(cell.x, cell.y);
    const isCorrectTargetPlacement = this.isCorrectAccuracyTargetPlacement(cell.x, cell.y, activePiece.pieceType);
    if (isTargetCell && isCorrectTargetPlacement && !this.cellHadWrongAttempt.has(key)) {
      this.levelMetrics.correctPlacementsOnFirstTryCount += 1;
    }
    if (isTargetCell && !isCorrectTargetPlacement) {
      this.levelMetrics.incorrectPlacementCount += 1;
      this.cellHadWrongAttempt.add(key);
    }
    this.levelMetrics.validPlacementsCount += 1;

    this.logEvent('piece_placed', {
      pieceId: activePiece.pieceId,
      cellId: key,
      isCorrectCell: isTargetCell ? isCorrectTargetPlacement : true,
      isRequiredCell: !!req || isEndpointTarget,
    });
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
    this.maybePlayLeakSfx();
    if (!this.reduceMotion) this.tweens.add({ targets: piece.container, x: piece.container.x + 8, duration: 50, yoyo: true, repeat: 2 });
    piece.container.setPosition(piece.homeX, piece.homeY);
  }

  private removePlacedPiece(piece: PieceVisual) {
    if (!piece.currentCellKey) return;
    this.pushUndoSnapshot();
    const cellKey = piece.currentCellKey;
    this.levelMetrics.undoCount += 1;
    this.countTargetPlacementRemovalAsIncorrect(cellKey);
    this.placed.delete(cellKey);
    this.returnPieceToTray(piece);
    this.levelMetrics.validPlacementsCount = Math.max(0, this.levelMetrics.validPlacementsCount - 1);
    this.logEvent('piece_removed', { pieceId: piece.pieceId, cellId: cellKey });
    this.updateAllPieceColors();
    this.runBoardEval();
  }

  private isAccuracyTargetCell(x: number, y: number): boolean {
    // Most authored levels currently have no requiredPlacements,
    // so accuracy targeting must fall back to endpoint cells.
    if (this.activeRequiredPlacements.length === 0) {
      return this.isEndpointCell(x, y);
    }
    return this.activeRequiredPlacements.some((r) => r.position.x === x && r.position.y === y)
      || this.isEndpointCell(x, y);
  }

  private isCorrectAccuracyTargetPlacement(x: number, y: number, pieceType: PipePieceType): boolean {
    const req = this.activeRequiredPlacements.find((r) => r.position.x === x && r.position.y === y);
    const isEndpointTarget = this.isEndpointCell(x, y);
    return (!!req && req.pieceType === pieceType)
      || (isEndpointTarget && this.isEndpointPlacementValid(x, y, pieceType));
  }

  private countTargetPlacementRemovalAsIncorrect(cellKey: string | undefined) {
    if (!cellKey) return;
    const [xRaw, yRaw] = cellKey.split(',');
    const x = Number(xRaw);
    const y = Number(yRaw);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    if (!this.isAccuracyTargetCell(x, y)) return;

    this.levelMetrics.incorrectPlacementCount += 1;
    this.cellHadWrongAttempt.add(cellKey);
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
      endpointSatisfiedCount: evalResult.endpointSatisfiedCount,
      endpointUnsatisfiedCount: evalResult.endpointUnsatisfiedCount,
      distanceToSolution: evalResult.distanceToSolution,
      isBeneficialAction: evalResult.isBeneficialAction,
    });

    if (evalResult.leakCount > 0) {
      this.maybePlayLeakSfx();
    }
    
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
    this.cleanupAudio();

    const current = this.perLevel[this.perLevel.length - 1] ?? this.levelMetrics;
    const starBreakdown = this.calculateStarBreakdown(current);
    const stars = this.calculateStarsByBreakdown(current, starBreakdown);
    const starHint = this.getStarHint(current, stars, starBreakdown);
    const levelScore = calculatePipePatchLevelScore({
      level: current.levelId,
      difficultyWeight: current.difficultyWeight,
      success: true,
      breakdown: starBreakdown,
    });

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
        starHint,
        success: true,
      });
    }
  }

  private clampScore(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private calculateStarBreakdown(current: PipePatchPerLevelMetrics): PipePatchStarBreakdown {
    const totalDragAttempts = Math.max(1, current.totalDragAttempts);
    const requiredPieceCount = Math.max(1, current.requiredPieceCount);
    const firstActionGraceMs = 6000;

    // v2: Endpoint-first scoring model for real gameplay behavior.
    const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

    const targetAttempts = Math.max(
      requiredPieceCount,
      current.correctPlacementsOnFirstTryCount + current.incorrectPlacementCount
    );

    // Accuracy: reward first-try correctness and penalize incorrect target attempts.
    const firstTryCore = clamp01(current.correctPlacementsOnFirstTryCount / requiredPieceCount);
    const incorrectPressure = current.incorrectPlacementCount / Math.max(1, targetAttempts);
    const recoveryPenalty = Math.min(0.35, incorrectPressure * 0.7);
    const accuracyCore = clamp01(firstTryCore - recoveryPenalty);
    const accuracyScore = this.clampScore(100 * (0.75 * accuracyCore + 0.25 * (1 - incorrectPressure)));

    // Mind-change: count explicit reversals and repeated mistakes.
    const mindChangeLoad = current.undoCount + current.resetCount + 0.5 * current.repeatedErrorCount;
    const mindChangeCore = requiredPieceCount / Math.max(1, requiredPieceCount + mindChangeLoad);
    const mindChangeScore = this.clampScore(100 * mindChangeCore);

    // Precision: account for rejected/invalid drops around tight cell placement.
    const precisionMistakes =
      current.rejectedDropCount + current.obstacleRejectCount + 1.2 * current.lockedSlotMismatchCount;
    const precisionBudget = totalDragAttempts + requiredPieceCount;
    const precisionCore = clamp01(1 - precisionMistakes / Math.max(1, precisionBudget));
    const precisionScore = this.clampScore(100 * precisionCore);

    // Speed: solve-time pace + first-action latency (with grace).
    const overTimeMs = Math.max(0, current.solveTimeMs - current.parTimeMs);
    const timeCore = clamp01(1 - overTimeMs / Math.max(1, current.parTimeMs * 1.2));
    const effectiveLatencyMs = Math.max(0, current.firstActionLatencyMs - firstActionGraceMs);
    const latencyCore = clamp01(1 - effectiveLatencyMs / 8000);
    const speedScore = this.clampScore(100 * (0.8 * timeCore + 0.2 * latencyCore));

    const starScore = this.clampScore(
      0.25 * mindChangeScore + 0.3 * accuracyScore + 0.2 * precisionScore + 0.25 * speedScore
    );

    return {
      mindChangeScore,
      accuracyScore,
      precisionScore,
      speedScore,
      starScore,
    };
  }

  private calculateStarsByBreakdown(
    current: PipePatchPerLevelMetrics,
    breakdown: PipePatchStarBreakdown
  ): 1 | 2 | 3 {
    let stars: 1 | 2 | 3 = 1;

    const mindChanges = current.undoCount + current.resetCount;
    const firstTryTarget = Math.max(1, current.requiredPieceCount);
    const perfectFirstTry = current.correctPlacementsOnFirstTryCount >= firstTryTarget;
    const perfectPrecision =
      current.rejectedDropCount === 0
      && current.obstacleRejectCount === 0
      && current.lockedSlotMismatchCount === 0;
    const cleanRunForThree =
      current.incorrectPlacementCount === 0
      && mindChanges === 0
      && perfectPrecision
      && perfectFirstTry
      && current.solveTimeMs <= current.parTimeMs;

    // v4 stricter score thresholds.
    if (breakdown.starScore >= 88) stars = 3;
    else if (breakdown.starScore >= 68) stars = 2;

    if (stars === 3 && !cleanRunForThree) {
      stars = 2;
    }

    // Hard cap for noisy/slow attempts.
    const heavyMistakeRun =
      current.incorrectPlacementCount >= 3
      || mindChanges >= 4
      || current.rejectedDropCount >= 5
      || current.solveTimeMs > current.hardTimeMs;
    if (heavyMistakeRun) {
      stars = 1;
    }

    return stars;
  }

  private getStarHint(
    current: PipePatchPerLevelMetrics,
    stars: number,
    breakdown: PipePatchStarBreakdown
  ): string | null {
    if (stars >= 3) return null;
    const firstActionGraceMs = 6000;

    const weakest = [
      { key: 'mindChange', score: breakdown.mindChangeScore },
      { key: 'accuracy', score: breakdown.accuracyScore },
      { key: 'precision', score: breakdown.precisionScore },
      { key: 'speed', score: breakdown.speedScore },
    ].sort((a, b) => a.score - b.score)[0];

    const shouldPreferSpeedHint =
      current.firstActionLatencyMs > firstActionGraceMs
      && breakdown.speedScore <= breakdown.accuracyScore + 5;

    if (shouldPreferSpeedHint) {
      return 'ทำ flow ให้ต่อเนื่องขึ้นอีกนิด โดยเฉพาะช่วงต้นด่าน จะช่วยดันดาวได้';
    }

    // Align hint with hard star gates first.
    if (current.incorrectPlacementCount > 0) {
      return 'ลองวางให้ตรงช่องมากขึ้น เพื่อลดจำนวนวางผิดและเพิ่มดาว';
    }
    if (current.undoCount + current.resetCount > 0) {
      return 'ลดการ undo/reset ระหว่างจัดวาง จะช่วยเพิ่มดาวได้เร็วที่สุด';
    }
    if (current.rejectedDropCount > 1) {
      return 'ลดจังหวะลาก/ปล่อยที่ไม่ลงช่องให้พอดี จะช่วยเพิ่มดาวได้';
    }
    if (current.correctPlacementsOnFirstTryCount < Math.max(1, current.requiredPieceCount)) {
      return 'ลองวางให้ถูกตั้งแต่ครั้งแรกให้ครบทุกจุดเป้าหมาย เพื่อปลดล็อก 3 ดาว';
    }
    if (current.solveTimeMs > current.parTimeMs) {
      return 'จบด่านให้เร็วขึ้นจะช่วยได้ 3 ดาว';
    }

    if (weakest.key === 'mindChange') {
      if (current.repeatedErrorCount > 0) {
        return 'ลดการ undo/reset และหลีกเลี่ยงการลองซ้ำจุดเดิม จะช่วยเพิ่มดาวได้เร็วที่สุด';
      }
      return 'ลดการ undo/reset ระหว่างจัดวาง จะช่วยเพิ่มดาวได้เร็วที่สุด';
    }
    if (weakest.key === 'accuracy') {
      if (current.incorrectPlacementCount > 0) {
        return 'ลองวางให้ตรงช่องมากขึ้น เพื่อลดจำนวนวางผิดและเพิ่มดาว';
      }
      return 'ลองเพิ่มความแม่นยำแบบวางถูกตั้งแต่ครั้งแรกให้มากขึ้น จะช่วยดันดาวได้';
    }
    if (weakest.key === 'precision') {
      if (current.rejectedDropCount > 0 || current.obstacleRejectCount > 0 || current.lockedSlotMismatchCount > 0) {
        return 'ลดจังหวะลาก/ปล่อยที่ไม่ลงช่องให้พอดี จะช่วยเพิ่มดาวได้';
      }
      return 'เล่นได้ดีแล้ว ลองคงจังหวะให้นิ่งต่อเนื่องเพื่อดันดาวให้สูงขึ้น';
    }
    return 'ทำ flow ให้ต่อเนื่องขึ้นอีกนิด โดยเฉพาะช่วงต้นด่าน จะช่วยดันดาวได้';
  }

  private evaluateBoardState(): EvalResult {
    let authoredRequiredCellsFilled = 0;
    let authoredCorrectPlacements = 0;
    let authoredIncorrectPlacements = 0;
    let endpointSatisfiedCount = 0;

    this.activeRequiredPlacements.forEach((r) => {
      const key = this.getCellKey(r.position);
      const placed = this.placed.get(key);
      if (!placed) return;
      authoredRequiredCellsFilled += 1;
      if (placed.pieceType === r.pieceType) authoredCorrectPlacements += 1;
      else authoredIncorrectPlacements += 1;
    });

    this.activeEndpointCells.forEach((cell) => {
      const placed = this.placed.get(this.getCellKey(cell));
      if (placed && this.isEndpointPlacementValid(cell.x, cell.y, placed.pieceType)) {
        endpointSatisfiedCount += 1;
      }
    });

    const endpointUnsatisfiedCount = this.activeEndpointCells.length - endpointSatisfiedCount;
    const authoredKeys = new Set(this.activeRequiredPlacements.map((r) => this.getCellKey(r.position)));
    const endpointKeys = new Set(this.activeEndpointCells.map((c) => this.getCellKey(c)));
    const extraWrong = [...this.placed.entries()].filter(([k]) => !authoredKeys.has(k) && !endpointKeys.has(k)).length;
    const requiredCellsFilled = authoredRequiredCellsFilled + endpointSatisfiedCount;
    const correctPlacements = authoredCorrectPlacements + endpointSatisfiedCount;
    const incorrectPlacements = authoredIncorrectPlacements + endpointUnsatisfiedCount + extraWrong;
    const distance = (this.activeRequiredPlacements.length - authoredCorrectPlacements) + endpointUnsatisfiedCount + extraWrong;
    const path = this.checkMultiColorConnectivity();
    const solved = authoredCorrectPlacements === this.activeRequiredPlacements.length
      && endpointUnsatisfiedCount === 0
      && path.isConnected
      && path.openEndsCount === 0
      && path.leakCount === 0;
    
    return {
      requiredCellsFilled,
      correctPlacements,
      incorrectPlacements,
      endpointSatisfiedCount,
      endpointUnsatisfiedCount,
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
      // In peer-to-peer model, all endpoints must be connected to each other
      const endpointKeys = new Set(group.endpoints.map((e) => `${e.position.x},${e.position.y}`));
      const connectedEndpoints = new Set<string>();
      
      // Start traversal from each endpoint that has an active pipe
      const activeStartPoints = group.endpoints.filter((e) => this.hasActiveEndpointPipe(e.position.x, e.position.y));
      
      let colorLeakCount = 0;
      let colorOpenEndsCount = 0;
      const colorRequiredCellsFilled = 0;
      const colorCorrectPlacements = 0;
      const colorIncorrectPlacements = 0;

      if (activeStartPoints.length > 0) {
        const visited = new Set<string>();
        const queue: Array<{ x: number; y: number; incomingDir?: number }> = [];
        
        // Start from the first active endpoint
        const startPoint = activeStartPoints[0];
        queue.push({ x: startPoint.position.x, y: startPoint.position.y });
        visited.add(this.getTraversalStateKey(startPoint.position.x, startPoint.position.y, this.getPieceTypeAt(startPoint.position.x, startPoint.position.y), undefined));
        connectedEndpoints.add(`${startPoint.position.x},${startPoint.position.y}`);

        while (queue.length) {
          const c = queue.shift()!;
          const mask = this.getColorMaskAt(c.x, c.y);
          if (mask === 0) continue;
          const pieceType = this.getPieceTypeAt(c.x, c.y);
          const dirs = this.getFlowDirections(mask, c.incomingDir, pieceType);

          for (const dir of dirs) {
            const neighbor = this.inspectTraversalNeighbor(c.x, c.y, dir, 'gameplay', gateMap);
            if (neighbor.status === 'leak') {
              colorLeakCount += 1;
              continue;
            }
            if (neighbor.status === 'open') {
              // Check if this is another endpoint in the same group
              if (neighbor.key && endpointKeys.has(neighbor.key)) {
                connectedEndpoints.add(neighbor.key);
              } else if (!neighbor.key || !endpointKeys.has(neighbor.key)) {
                colorOpenEndsCount += 1;
              }
              continue;
            }
            if (neighbor.status === 'gate_fail') {
              if (neighbor.gate) {
                this.logEvent('one_way_gate_path_fail', { gateId: neighbor.gate.id, attemptedFlowDirection: dir, colorId: group.colorId });
              }
              return { isConnected: false, openEndsCount: colorOpenEndsCount + 1, leakCount: colorLeakCount, colorResults };
            }
            if (neighbor.status !== 'ok') continue;

            // Check if we reached another endpoint of the same group
            if (neighbor.key && endpointKeys.has(neighbor.key)) {
              connectedEndpoints.add(neighbor.key);
            }

            const stateKey = this.getTraversalStateKey(neighbor.x, neighbor.y, neighbor.neighborType, neighbor.opp);
            if (!visited.has(stateKey)) {
              visited.add(stateKey);
              queue.push({ x: neighbor.x, y: neighbor.y, incomingDir: neighbor.opp });
            }
          }
        }
      }

      // Group is connected if all endpoints are connected
      const isGroupConnected = connectedEndpoints.size === endpointKeys.size && endpointKeys.size > 1;
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
    this.playSfx(this.soundKeys.pumpOn, { volume: 0.72 });
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
    const gateMap = new Map(this.level.oneWayGates.map((g) => [`${g.position.x},${g.position.y}`, g]));
    
    // Start from any endpoint that has an active pipe
    const activeEndpoints = group.endpoints.filter((e) => this.hasActiveEndpointPipe(e.position.x, e.position.y));
    if (activeEndpoints.length === 0) return path;
    
    const startPoint = activeEndpoints[0];
    const queue: Array<{ x: number; y: number; incomingDir?: number }> = [{ x: startPoint.position.x, y: startPoint.position.y }];
    visited.add(this.getTraversalStateKey(startPoint.position.x, startPoint.position.y, this.getPieceTypeAt(startPoint.position.x, startPoint.position.y), undefined));

    while (queue.length) {
      const c = queue.shift()!;
      path.push(c);
      const mask = this.getColorMaskAt(c.x, c.y);
      if (mask === 0) continue;
      const pieceType = this.getPieceTypeAt(c.x, c.y);
      const dirs = this.getFlowDirections(mask, c.incomingDir, pieceType);
      for (const dir of dirs) {
        const neighbor = this.inspectTraversalNeighbor(c.x, c.y, dir, 'gameplay', gateMap);
        if (neighbor.status !== 'ok') continue;

        const stateKey = this.getTraversalStateKey(neighbor.x, neighbor.y, neighbor.neighborType, neighbor.opp);
        if (!visited.has(stateKey)) {
          visited.add(stateKey);
          queue.push({ x: neighbor.x, y: neighbor.y, incomingDir: neighbor.opp });
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
    this.cleanupAudio();
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
      const success = reason !== 'timeout';
      const rawCore = summary.levelsSolved / Math.max(1, summary.levelsAttempted);
      const score = calculateUnifiedLevelScore({
        rawCore,
        level: this.levelIndex,
        maxLevel: 30,
        difficultyMultiplier: mapDifficultyFromScale(this.level.difficultyWeight, 1, 10),
        success,
      });
      onGameOver({
        ...summary,
        score,
        stars: 0,
        success,
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
      const pv = this.spawnPieceVisual(rp.pieceId, rp.pieceType, this.cellCenterX(x), this.cellCenterY(y), false, Math.floor(this.cellSize * 0.98));
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
    this.trayUiObjects.forEach((obj) => obj.destroy());
    this.trayUiObjects = [];
    this.fixedVisuals.clear();
    this.endpointWallVisuals.clear();
    this.endpointVisuals.clear();
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
    axisColorY?: number,
    hideCapMask = 0
  ) {
    const g = this.add.graphics();
    const half = size * 0.5;
    const t = Math.max(9, Math.floor(size * 0.34));
    const pipeColor = color ?? COLORS.pipe;
    const highlight = this.brightenColor(pipeColor, 68);
    const cap = this.brightenColor(pipeColor, 34);
    const lowLight = this.darkenColor(pipeColor, 42);
    g.setPosition(x, y);
    const m = PIECE_DEFINITIONS[pieceType].mask;

    if (pieceType === 'crossover') {
      const underT = Math.max(5, Math.floor(t * 0.86));
      const overT = Math.max(6, Math.floor(t * 1.04));
      const gap = Math.max(6, Math.floor(t * 0.9));

      const overColor = axisColorX ?? pipeColor;
      const underBase = axisColorY ?? pipeColor;
      const underColor = this.darkenColor(underBase, 26);
      const underHighlight = this.brightenColor(underColor, 40);
      const underCap = this.brightenColor(underColor, 22);
      const underLowLight = this.darkenColor(underColor, 30);
      const overHighlight = this.brightenColor(overColor, 52);
      const overCap = this.brightenColor(overColor, 24);
      const overLowLight = this.darkenColor(overColor, 34);

      // Underpass (vertical) — broken at center for over/under illusion
      const drawUnderVertical = () => {
        const segLen = Math.max(2, half - gap);

        // Up segment
        g.fillStyle(COLORS.pipeShadow, 0.58).fillRoundedRect(-underT / 2 + 1, -half + 1, underT, segLen, 4);
        g.fillStyle(underColor, 1).fillRoundedRect(-underT / 2, -half, underT, segLen, 4);
        g.fillStyle(underLowLight, 0.62).fillRoundedRect(-underT / 2 + underT * 0.5, -half + 1, Math.max(2, underT * 0.42), Math.max(2, segLen - 2), 2);
        g.fillStyle(underHighlight, 0.82).fillRoundedRect(-underT / 2 + 1, -half + 2, Math.max(2, underT * 0.3), Math.max(2, segLen - 4), 2);
        if ((hideCapMask & DIR.UP) === 0) {
          g.fillStyle(underCap, 1).fillCircle(0, -half + 1, underT * 0.55);
        }

        // Down segment
        g.fillStyle(COLORS.pipeShadow, 0.58).fillRoundedRect(-underT / 2 + 1, gap + 1, underT, segLen, 4);
        g.fillStyle(underColor, 1).fillRoundedRect(-underT / 2, gap, underT, segLen, 4);
        g.fillStyle(underLowLight, 0.62).fillRoundedRect(-underT / 2 + underT * 0.5, gap + 1, Math.max(2, underT * 0.42), Math.max(2, segLen - 2), 2);
        g.fillStyle(underHighlight, 0.82).fillRoundedRect(-underT / 2 + 1, gap + 2, Math.max(2, underT * 0.3), Math.max(2, segLen - 4), 2);
        if ((hideCapMask & DIR.DOWN) === 0) {
          g.fillStyle(underCap, 1).fillCircle(0, half - 1, underT * 0.55);
        }
      };

      // Overpass (horizontal) — continuous across center
      const drawOverHorizontal = () => {
        g.fillStyle(COLORS.pipeShadow, 0.62).fillRoundedRect(-half + 1, -overT / 2 + 2, size, overT, 5);
        g.fillStyle(overColor, 1).fillRoundedRect(-half, -overT / 2, size, overT, 5);
        g.fillStyle(overLowLight, 0.62).fillRoundedRect(-half + 2, overT * 0.06, Math.max(2, size - 4), Math.max(2, overT * 0.32), 3);
        g.fillStyle(overHighlight, 0.84).fillRoundedRect(-half + 2, -overT / 2 + 1, Math.max(2, size - 4), Math.max(2, overT * 0.28), 3);
        if ((hideCapMask & DIR.LEFT) === 0) {
          g.fillStyle(overCap, 1).fillCircle(-half + 1, 0, overT * 0.55);
        }
        if ((hideCapMask & DIR.RIGHT) === 0) {
          g.fillStyle(overCap, 1).fillCircle(half - 1, 0, overT * 0.55);
        }

        // Bridge lip to make the overpass read clearly
        g.lineStyle(Math.max(2, Math.floor(overT * 0.18)), 0x0b1220, 0.25);
        g.strokeRoundedRect(-overT * 0.9, -overT * 0.58, overT * 1.8, overT * 1.16, 6);
      };

      drawUnderVertical();
      drawOverHorizontal();

      // Subtle center joint glow
      const jointBase = axisColorX ?? axisColorY ?? pipeColor;
      g.fillStyle(this.brightenColor(jointBase, 32), 0.98).fillCircle(0, 0, Math.max(4, overT * 0.42));
      g.fillStyle(0x020617, 0.48).fillCircle(0, 0, Math.max(2, overT * 0.2));
      return g;
    }

    const drawArm = (dir: number) => {
      if (dir === DIR.UP) {
        g.fillStyle(COLORS.pipeShadow, 0.6).fillRoundedRect(-t / 2 + 1, -half + 1, t, half + t * 0.2, 4);
        g.fillStyle(pipeColor, 1).fillRoundedRect(-t / 2, -half, t, half + t * 0.2, 4);
        g.fillStyle(lowLight, 0.62).fillRoundedRect(-t / 2 + t * 0.5, -half + 1, Math.max(2, t * 0.42), Math.max(2, half - 1), 2);
        g.fillStyle(highlight, 0.86).fillRoundedRect(-t / 2 + 1, -half + 2, Math.max(2, t * 0.32), half - 2, 2);
        if ((hideCapMask & DIR.UP) === 0) {
          g.fillStyle(cap, 1).fillCircle(0, -half + 1, t * 0.55);
        }
        return;
      }
      if (dir === DIR.RIGHT) {
        g.fillStyle(COLORS.pipeShadow, 0.6).fillRoundedRect(1, -t / 2 + 1, half + t * 0.2, t, 4);
        g.fillStyle(pipeColor, 1).fillRoundedRect(0, -t / 2, half + t * 0.2, t, 4);
        g.fillStyle(lowLight, 0.62).fillRoundedRect(1, -t / 2 + t * 0.46, Math.max(2, half - 1), Math.max(2, t * 0.42), 2);
        g.fillStyle(highlight, 0.86).fillRoundedRect(2, -t / 2 + 1, half - 2, Math.max(2, t * 0.32), 2);
        if ((hideCapMask & DIR.RIGHT) === 0) {
          g.fillStyle(cap, 1).fillCircle(half - 1, 0, t * 0.55);
        }
        return;
      }
      if (dir === DIR.DOWN) {
        g.fillStyle(COLORS.pipeShadow, 0.6).fillRoundedRect(-t / 2 + 1, 1, t, half + t * 0.2, 4);
        g.fillStyle(pipeColor, 1).fillRoundedRect(-t / 2, 0, t, half + t * 0.2, 4);
        g.fillStyle(lowLight, 0.62).fillRoundedRect(-t / 2 + t * 0.5, 1, Math.max(2, t * 0.42), Math.max(2, half - 1), 2);
        g.fillStyle(highlight, 0.86).fillRoundedRect(-t / 2 + 1, 1, Math.max(2, t * 0.32), half - 2, 2);
        if ((hideCapMask & DIR.DOWN) === 0) {
          g.fillStyle(cap, 1).fillCircle(0, half - 1, t * 0.55);
        }
        return;
      }

      g.fillStyle(COLORS.pipeShadow, 0.6).fillRoundedRect(-half + 1, -t / 2 + 1, half + t * 0.2, t, 4);
      g.fillStyle(pipeColor, 1).fillRoundedRect(-half, -t / 2, half + t * 0.2, t, 4);
      g.fillStyle(lowLight, 0.62).fillRoundedRect(-half + 1, -t / 2 + t * 0.46, Math.max(2, half - 1), Math.max(2, t * 0.42), 2);
      g.fillStyle(highlight, 0.86).fillRoundedRect(-half + 1, -t / 2 + 1, Math.max(2, t * 0.32), half - 2, 2);
      if ((hideCapMask & DIR.LEFT) === 0) {
        g.fillStyle(cap, 1).fillCircle(-half + 1, 0, t * 0.55);
      }
    };

    if (m & DIR.UP) drawArm(DIR.UP);
    if (m & DIR.RIGHT) drawArm(DIR.RIGHT);
    if (m & DIR.DOWN) drawArm(DIR.DOWN);
    if (m & DIR.LEFT) drawArm(DIR.LEFT);

    // Add a subtle glow effect to the center connection
    g.fillStyle(this.brightenColor(pipeColor, 30), 1).fillCircle(0, 0, Math.max(5, t * 0.62));
    g.fillStyle(lowLight, 0.62).fillCircle(0, 0, Math.max(3, t * 0.34));
    g.fillStyle(0x020617, 0.5).fillCircle(0, 0, Math.max(2, t * 0.2));
    
    // Add a small highlight dot for better visual appeal
    g.fillStyle(this.brightenColor(pipeColor, 84), 0.9).fillCircle(-Math.max(1, t * 0.08), -Math.max(1, t * 0.08), Math.max(1, t * 0.16));
    
    return g;
  }

  private getPipeColor(pieceType: PipePieceType) {
    if (pieceType.startsWith('tee')) return 0xbcc4cf;
    if (pieceType === 'cross') return 0xd0d6de;
    if (pieceType === 'crossover') return COLORS.pipe;
    return COLORS.pipe;
  }

  private drawEndpointPipe(cx: number, cy: number, mask: number, color: number, hideMouthMask = 0) {
    const g = this.add.graphics();
    const half = this.cellSize * 0.31;
    const t = Math.max(9, Math.floor(this.cellSize * 0.25));
    const highlight = this.brightenColor(color, 52);
    const lowLight = this.darkenColor(color, 38);
    const cap = this.brightenColor(color, 26);
    const mouthOuter = Math.max(3, t * 0.26);
    const mouthInner = Math.max(1.5, t * 0.14);
    const collarOuter = Math.max(4, t * 0.76);
    const collarInner = Math.max(2, t * 0.48);
    g.setPosition(cx, cy);
    g.fillStyle(0x010409, 0.26).fillEllipse(0, Math.max(1, t * 0.1), half * 1.48, half * 1.12);

    const drawPipeMouth = (mx: number, my: number) => {
      // Make endpoint tips look hollow like real pipe openings.
      g.fillStyle(this.darkenColor(color, 68), 0.98).fillCircle(mx, my, mouthOuter);
      g.fillStyle(this.brightenColor(color, 16), 0.38).fillCircle(mx, my, Math.max(1, mouthOuter * 0.72));
      g.fillStyle(0x000205, 0.94).fillCircle(mx, my, mouthInner);
      g.fillStyle(this.brightenColor(color, 44), 0.34).fillCircle(
        mx - mouthOuter * 0.25,
        my - mouthOuter * 0.25,
        Math.max(1, mouthOuter * 0.22)
      );
    };

    const drawArm = (dir: number) => {
      if (dir === DIR.UP) {
        g.fillStyle(0x020617, 0.58).fillRoundedRect(-t / 2 + 1, -half + 2, t, half + t * 0.24, 4);
        g.fillStyle(color, 1).fillRoundedRect(-t / 2, -half, t, half + t * 0.24, 4);
        g.fillStyle(lowLight, 0.6).fillRoundedRect(-t / 2 + t * 0.52, -half + 1, Math.max(2, t * 0.4), Math.max(2, half - 1), 2);
        g.fillStyle(highlight, 0.88).fillRoundedRect(-t / 2 + 1, -half + 2, Math.max(2, t * 0.3), Math.max(2, half - 2), 2);
        g.fillStyle(cap, 1).fillCircle(0, -half + 1, t * 0.5);
        if ((hideMouthMask & DIR.UP) === 0) drawPipeMouth(0, -half + 1);
        return;
      }
      if (dir === DIR.RIGHT) {
        g.fillStyle(0x020617, 0.58).fillRoundedRect(1, -t / 2 + 2, half + t * 0.24, t, 4);
        g.fillStyle(color, 1).fillRoundedRect(0, -t / 2, half + t * 0.24, t, 4);
        g.fillStyle(lowLight, 0.6).fillRoundedRect(1, -t / 2 + t * 0.48, Math.max(2, half - 1), Math.max(2, t * 0.4), 2);
        g.fillStyle(highlight, 0.88).fillRoundedRect(2, -t / 2 + 1, Math.max(2, half - 2), Math.max(2, t * 0.3), 2);
        g.fillStyle(cap, 1).fillCircle(half - 1, 0, t * 0.5);
        if ((hideMouthMask & DIR.RIGHT) === 0) drawPipeMouth(half - 1, 0);
        return;
      }
      if (dir === DIR.DOWN) {
        g.fillStyle(0x020617, 0.58).fillRoundedRect(-t / 2 + 1, 2, t, half + t * 0.24, 4);
        g.fillStyle(color, 1).fillRoundedRect(-t / 2, 0, t, half + t * 0.24, 4);
        g.fillStyle(lowLight, 0.6).fillRoundedRect(-t / 2 + t * 0.52, 1, Math.max(2, t * 0.4), Math.max(2, half - 1), 2);
        g.fillStyle(highlight, 0.88).fillRoundedRect(-t / 2 + 1, 1, Math.max(2, t * 0.3), Math.max(2, half - 2), 2);
        g.fillStyle(cap, 1).fillCircle(0, half - 1, t * 0.5);
        if ((hideMouthMask & DIR.DOWN) === 0) drawPipeMouth(0, half - 1);
        return;
      }

      g.fillStyle(0x020617, 0.58).fillRoundedRect(-half + 1, -t / 2 + 2, half + t * 0.24, t, 4);
      g.fillStyle(color, 1).fillRoundedRect(-half, -t / 2, half + t * 0.24, t, 4);
      g.fillStyle(lowLight, 0.6).fillRoundedRect(-half + 1, -t / 2 + t * 0.48, Math.max(2, half - 1), Math.max(2, t * 0.4), 2);
      g.fillStyle(highlight, 0.88).fillRoundedRect(-half + 1, -t / 2 + 1, Math.max(2, t * 0.3), Math.max(2, half - 2), 2);
      g.fillStyle(cap, 1).fillCircle(-half + 1, 0, t * 0.5);
      if ((hideMouthMask & DIR.LEFT) === 0) drawPipeMouth(-half + 1, 0);
    };

    if (mask & DIR.UP) drawArm(DIR.UP);
    if (mask & DIR.RIGHT) drawArm(DIR.RIGHT);
    if (mask & DIR.DOWN) drawArm(DIR.DOWN);
    if (mask & DIR.LEFT) drawArm(DIR.LEFT);

    // Add a collar/flange and deeper core so endpoint reads as a realistic socket.
    g.fillStyle(this.darkenColor(color, 44), 0.95).fillCircle(0, 0, collarOuter);
    g.fillStyle(this.brightenColor(color, 12), 0.86).fillCircle(0, 0, collarInner);
    g.fillStyle(this.brightenColor(color, 34), 0.95).fillCircle(0, 0, Math.max(4, t * 0.44));
    g.fillStyle(0x010409, 0.62).fillCircle(0, 0, Math.max(2, t * 0.22));
    g.fillStyle(this.brightenColor(color, 54), 0.28).fillCircle(-Math.max(1, t * 0.08), -Math.max(1, t * 0.1), Math.max(1, t * 0.14));

    this.uiPersistent.delete(g as unknown as Phaser.GameObjects.GameObject);
    return g;
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

  private isEndpointCell(x: number, y: number) {
    return !!this.getEndpointInfoAt(x, y);
  }

  private getEndpointInfoAt(
    x: number,
    y: number
  ): { colorId: ColorId; flowMask: ConnectionMask; connectionMask: ConnectionMask; kind: 'input' | 'output' } | undefined {
    // In peer-to-peer model, all endpoints are equal - no input/output distinction
    for (const group of this.level.endpointGroups) {
      const endpoint = group.endpoints.find((e) => e.position.x === x && e.position.y === y);
      if (endpoint) {
        // connectionMask is the direction FROM the cell TO the endpoint (opposite of visual facing direction)
        // If endpoint faces LEFT visually, the pipe connects via RIGHT opening
        const connectionMask = OPPOSITE_DIR[endpoint.mask];
        return {
          colorId: group.colorId as ColorId,
          flowMask: this.resolveEndpointFlowMask(x, y, OPPOSITE_DIR[endpoint.mask]),
          connectionMask,
          kind: 'output', // All endpoints treated as output for compatibility
        };
      }
    }

    return undefined;
  }

  private isEndpointPlacementValid(x: number, y: number, pieceType: PipePieceType): boolean {
    const endpoint = this.getEndpointInfoAt(x, y);
    if (!endpoint) return false;

    const pieceMask = PIECE_DEFINITIONS[pieceType].mask;
    return (pieceMask & endpoint.connectionMask) !== 0;
  }

  private hasActiveEndpointPipe(x: number, y: number) {
    const pieceType = this.getPieceTypeAt(x, y);
    return !!pieceType && this.isEndpointPlacementValid(x, y, pieceType);
  }

  private hasInactiveEndpointContact(x: number, y: number, mask: ConnectionMask) {
    for (const dir of DIRS) {
      if ((mask & dir) === 0) continue;
      const v = DIR_VECTORS[dir];
      const nx = x + v.x;
      const ny = y + v.y;
      if (nx < 0 || ny < 0 || nx >= this.level.gridSize || ny >= this.level.gridSize) continue;
      if (this.isEndpointCell(nx, ny) && !this.hasActiveEndpointPipe(nx, ny)) {
        return true;
      }
    }
    return false;
  }

  private getTargetColor(targetIndex: number) {
    const palette = [0x22c55e, 0xef4444, 0x3b82f6, 0xeab308, 0xa855f7];
    if (targetIndex < 0) return palette[0];
    return palette[targetIndex % palette.length];
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

  private computeConnectedPieceColors(): Map<string, ColorId | undefined> {
    const connectedColorsByCell = new Map<string, Set<ColorId>>();
    const endpointGroups = this.level.endpointGroups;

    const addColorToCell = (cellKey: string, colorId: ColorId) => {
      const set = connectedColorsByCell.get(cellKey) ?? new Set<ColorId>();
      set.add(colorId);
      connectedColorsByCell.set(cellKey, set);
    };

    for (const group of endpointGroups) {
      const groupColor = group.colorId as ColorId;
      // In peer-to-peer model, color flows from all endpoints with active pipes
      const startPoints = group.endpoints
        .map((e) => e.position)
        .filter((p) => this.hasActiveEndpointPipe(p.x, p.y));
      if (startPoints.length === 0) continue;
      const queue: Array<{ x: number; y: number; incomingDir?: number }> = startPoints.map((p) => ({ ...p }));
      const visited = new Set<string>(
        startPoints.map((p) => this.getTraversalStateKey(p.x, p.y, this.getPieceTypeAt(p.x, p.y), undefined))
      );

      while (queue.length > 0) {
        const c = queue.shift()!;
        const pieceTypeAtCell = this.getPieceTypeAt(c.x, c.y);
        const cellMask = pieceTypeAtCell ? PIECE_DEFINITIONS[pieceTypeAtCell].mask : 0;
        const hasEndpointGap = pieceTypeAtCell ? this.hasInactiveEndpointContact(c.x, c.y, cellMask) : false;
        if (pieceTypeAtCell && pieceTypeAtCell !== 'crossover' && !hasEndpointGap) {
          addColorToCell(`${c.x},${c.y}`, groupColor);
        }
        if (hasEndpointGap) continue;

        const cMask = this.getVisualMaskAt(c.x, c.y);
        if (cMask === 0) continue;
        const dirs = this.getFlowDirections(cMask, c.incomingDir, pieceTypeAtCell);

        for (const dir of dirs) {
          const neighbor = this.inspectTraversalNeighbor(c.x, c.y, dir, 'visual');
          if (neighbor.status !== 'ok') continue;

          const stateKey = this.getTraversalStateKey(neighbor.x, neighbor.y, neighbor.neighborType, neighbor.opp);
          if (!visited.has(stateKey)) {
            visited.add(stateKey);
            queue.push({ x: neighbor.x, y: neighbor.y, incomingDir: neighbor.opp });
          }
        }
      }
    }

    const colorByCell = new Map<string, ColorId | undefined>();
    connectedColorsByCell.forEach((colors, cellKey) => {
      if (colors.size === 1) {
        colorByCell.set(cellKey, colors.values().next().value as ColorId);
      } else {
        colorByCell.set(cellKey, undefined);
      }
    });
    return colorByCell;
  }

  private getColorMaskAt(cx: number, cy: number): ConnectionMask {
    if (this.isEndpointCell(cx, cy) && !this.hasActiveEndpointPipe(cx, cy)) {
      return 0;
    }

    let finalMask = 0;
    const fixed = this.level.fixedPipes.find((f) => f.position.x === cx && f.position.y === cy);
    if (fixed) finalMask |= PIECE_DEFINITIONS[fixed.pieceType].mask;
    const placed = this.placed.get(`${cx},${cy}`);
    if (placed) finalMask |= PIECE_DEFINITIONS[placed.pieceType].mask;

    if (this.hasActiveEndpointPipe(cx, cy)) {
      finalMask &= ~this.getEndpointConnectionMaskAt(cx, cy);
    }

    return finalMask;
  }

  private getVisualMaskAt(cx: number, cy: number): ConnectionMask {
    if (this.isEndpointCell(cx, cy) && !this.hasActiveEndpointPipe(cx, cy)) {
      return 0;
    }

    let finalMask = 0;
    const fixed = this.level.fixedPipes.find((f) => f.position.x === cx && f.position.y === cy);
    if (fixed) finalMask |= PIECE_DEFINITIONS[fixed.pieceType].mask;
    const placed = this.placed.get(`${cx},${cy}`);
    if (placed) finalMask |= PIECE_DEFINITIONS[placed.pieceType].mask;

    if (this.hasActiveEndpointPipe(cx, cy)) {
      finalMask &= ~this.getEndpointConnectionMaskAt(cx, cy);
    }

    return finalMask;
  }

  private getMaskAtForTraversal(cx: number, cy: number, mode: NetworkTraversalMode): ConnectionMask {
    return mode === 'visual' ? this.getVisualMaskAt(cx, cy) : this.getColorMaskAt(cx, cy);
  }

  private inspectTraversalNeighbor(
    x: number,
    y: number,
    dir: number,
    mode: NetworkTraversalMode,
    gateMap?: Map<string, OneWayGateConfig>
  ): TraversalNeighborResult {
    const v = DIR_VECTORS[dir];
    const nx = x + v.x;
    const ny = y + v.y;
    if (nx < 0 || ny < 0 || nx >= this.level.gridSize || ny >= this.level.gridSize) {
      return { status: mode === 'gameplay' ? 'leak' : 'blocked', x: nx, y: ny };
    }

    const neighborKey = `${nx},${ny}`;
    if (this.level.blockedCells.some((b) => b.x === nx && b.y === ny) || this.isLockedCell(nx, ny)) {
      return { status: mode === 'gameplay' ? 'leak' : 'blocked', x: nx, y: ny, key: neighborKey };
    }

    if (this.isEndpointCell(nx, ny) && !this.hasActiveEndpointPipe(nx, ny)) {
      return { status: mode === 'gameplay' ? 'open' : 'blocked', x: nx, y: ny, key: neighborKey };
    }

    const opp = OPPOSITE_DIR[dir];
    const neighborMask = this.getMaskAtForTraversal(nx, ny, mode);
    if ((neighborMask & opp) === 0) {
      return { status: mode === 'gameplay' ? 'open' : 'blocked', x: nx, y: ny, key: neighborKey, opp };
    }

    const gate = gateMap?.get(neighborKey)
      ?? this.level.oneWayGates.find((g) => g.position.x === nx && g.position.y === ny);
    if (gate && opp !== NAME_TO_DIR[gate.entry]) {
      return { status: mode === 'gameplay' ? 'gate_fail' : 'blocked', x: nx, y: ny, key: neighborKey, opp, gate };
    }

    return {
      status: 'ok',
      x: nx,
      y: ny,
      key: neighborKey,
      opp,
      neighborType: this.getPieceTypeAt(nx, ny),
    };
  }

  private getEndpointMaskAt(cx: number, cy: number): ConnectionMask {
    return this.getEndpointInfoAt(cx, cy)?.flowMask ?? 0;
  }

  private getEndpointConnectionMaskAt(cx: number, cy: number): ConnectionMask {
    return this.getEndpointInfoAt(cx, cy)?.connectionMask ?? 0;
  }

  private resolveEndpointFlowMask(x: number, y: number, fallbackMask: number): ConnectionMask {
    // Endpoint direction comes from level config (arrow token or positional default).
    // Edge clipping is handled later in `getColorMaskAt`.
    return fallbackMask;
  }

  private resolveEndpointFacingDir(_x: number, _y: number, mask: number): number {
    // Visual orientation must follow endpoint token/config direction.
    return DIRS.find((dir) => (mask & dir) !== 0) ?? DIR.RIGHT;
  }

  private resolveEndpointRenderPosition(cx: number, cy: number, facingDir: number, isEdge: boolean) {
    if (isEdge) {
      const towardBoard = DIR_VECTORS[facingDir];
      const wallOffset = this.cellSize * 0.8;
      return {
        x: cx - towardBoard.x * wallOffset,
        y: cy - towardBoard.y * wallOffset,
      };
    }

    const towardBoundary = DIR_VECTORS[facingDir];
    const lineOffset = this.cellSize * 0.505;
    return {
      x: cx + towardBoundary.x * lineOffset,
      y: cy + towardBoundary.y * lineOffset,
    };
  }

  private isBoardEdgeCoord(x: number, y: number) {
    return x === 0 || y === 0 || x === this.level.gridSize - 1 || y === this.level.gridSize - 1;
  }

  private getInBoardMaskForEdgeCell(x: number, y: number): ConnectionMask {
    let mask: ConnectionMask = DIR.UP | DIR.RIGHT | DIR.DOWN | DIR.LEFT;
    if (x === 0) mask &= ~DIR.LEFT;
    if (x === this.level.gridSize - 1) mask &= ~DIR.RIGHT;
    if (y === 0) mask &= ~DIR.UP;
    if (y === this.level.gridSize - 1) mask &= ~DIR.DOWN;
    return mask;
  }

  private getSourceColorAt(cx: number, cy: number): ColorId | undefined {
    const endpoint = this.getEndpointInfoAt(cx, cy);
    return endpoint?.kind === 'input' ? endpoint.colorId : undefined;
  }

  private getTargetColorAt(cx: number, cy: number): ColorId | undefined {
    const endpoint = this.getEndpointInfoAt(cx, cy);
    return endpoint?.kind === 'output' ? endpoint.colorId : undefined;
  }

  private getEndpointColorAt(cx: number, cy: number): ColorId | undefined {
    return this.getSourceColorAt(cx, cy) ?? this.getTargetColorAt(cx, cy);
  }

  private findConnectedColorForDirection(x: number, y: number, dir: number): ColorId | undefined {
    const centerMask = this.getVisualMaskAt(x, y);
    if ((centerMask & dir) === 0) return undefined;
    const startNeighbor = this.inspectTraversalNeighbor(x, y, dir, 'visual');
    if (startNeighbor.status !== 'ok') return undefined;

    const queue: Array<{ x: number; y: number; incomingDir?: number }> = [{
      x: startNeighbor.x,
      y: startNeighbor.y,
      incomingDir: startNeighbor.opp,
    }];
    const visited = new Set<string>([
      this.getTraversalStateKey(startNeighbor.x, startNeighbor.y, startNeighbor.neighborType, startNeighbor.opp),
    ]);
    const foundColors = new Set<ColorId>();

    while (queue.length > 0) {
      const c = queue.shift()!;
      const currentPieceType = this.getPieceTypeAt(c.x, c.y);
      if (currentPieceType) {
        const currentMask = PIECE_DEFINITIONS[currentPieceType].mask;
        if (this.hasInactiveEndpointContact(c.x, c.y, currentMask)) {
          continue;
        }
      }
      const endpointColor = this.hasActiveEndpointPipe(c.x, c.y) ? this.getEndpointColorAt(c.x, c.y) : undefined;
      if (endpointColor) {
        foundColors.add(endpointColor);
        if (foundColors.size > 1) return undefined;
      }
      const mask = this.getVisualMaskAt(c.x, c.y);
      if (mask === 0) continue;
      const pieceType = this.getPieceTypeAt(c.x, c.y);
      const dirs = this.getFlowDirections(mask, c.incomingDir, pieceType);

      for (const d of dirs) {
        const neighbor = this.inspectTraversalNeighbor(c.x, c.y, d, 'visual');
        if (neighbor.status !== 'ok') continue;
        if (neighbor.x === x && neighbor.y === y) continue;
        const stateKey = this.getTraversalStateKey(neighbor.x, neighbor.y, neighbor.neighborType, neighbor.opp);
        if (visited.has(stateKey)) continue;
        visited.add(stateKey);
        queue.push({ x: neighbor.x, y: neighbor.y, incomingDir: neighbor.opp });
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
        const [x, y] = key.split(',').map(Number);
        const mask = PIECE_DEFINITIONS[piece.pieceType].mask;
        const touchesInactiveEndpoint = !this.isEndpointCell(x, y) && this.hasInactiveEndpointContact(x, y, mask);
        if (isCrossover && !touchesInactiveEndpoint) {
          const axis = this.resolveCrossoverAxisColors(x, y);
          visual.axisColorX = axis.axisX;
          visual.axisColorY = axis.axisY;
          axisXColor = axis.axisX ? COLOR_HEX[axis.axisX] : undefined;
          axisYColor = axis.axisY ? COLOR_HEX[axis.axisY] : undefined;
        } else {
          visual.axisColorX = undefined;
          visual.axisColorY = undefined;
        }
        const pipeColor = isCrossover
          ? COLORS.pipe
          : (!touchesInactiveEndpoint && colorId ? COLOR_HEX[colorId] : COLORS.pipe);
        const hideCapMask = touchesInactiveEndpoint ? 0 : this.getVisualConnectedMaskForCell(x, y, mask);
        const art = this.createPipeVisual(
          piece.pieceType,
          0,
          0,
          Math.floor(this.cellSize * 0.98) * 0.88,
          true,
          pipeColor,
          axisXColor,
          axisYColor,
          hideCapMask
        );
        container.add(art);
      }
    });

    // Keep fixed pipes visually continuous with neighbors as board changes.
    this.refreshFixedPipeVisuals(colorByCell);

    // Repaint endpoint mouths based on live connectivity:
    // when a pipe is connected to an endpoint, hide that endpoint hole.
    this.refreshEndpointVisuals();
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
