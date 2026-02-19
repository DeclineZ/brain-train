import * as Phaser from 'phaser';
import { POWER_PUMP_LEVELS, getPowerPumpLevel } from './levels';
import type { Direction, PowerPumpGameStats, PowerPumpLevelConfig } from './types';
import { calculatePowerPumpStars } from '@/lib/scoring/powerPump';
import { getPowerPumpLevelSolution, validateAllPowerPumpLevelsSolvable } from './solvability';
import type { PowerPumpSolvabilityReport } from './solvability';

type RuntimeTile = {
  id: number;
  x: number;
  y: number;
  channel: 'wire' | 'pipe' | 'special' | 'obstacle';
  pipeRotation: Direction;
  wireRotation: Direction;
  locked: boolean;
  pipeSolvedMask: number;
  wireSolvedMask: number;
  pipeMask: number;
  wireMask: number;
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Rectangle;
  bg: Phaser.GameObjects.Rectangle;
  gfx: Phaser.GameObjects.Graphics;
};

type Snapshot = {
  pipeRotations: Direction[];
  wireRotations: Direction[];
};

const DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 }
] as const;

const BIT = (dir: number) => 1 << dir;

function rotateMask(mask: number, turns: number) {
  let out = mask;
  for (let i = 0; i < turns; i++) {
    out = ((out << 1) | (out >> 3)) & 0b1111;
  }
  return out;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isAdjacent(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

function manhattanDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export class PowerPumpGameScene extends Phaser.Scene {
  private levelConfig: PowerPumpLevelConfig = POWER_PUMP_LEVELS[1];
  private tiles: RuntimeTile[] = [];
  private tileMap = new Map<string, RuntimeTile>();
  private targets: Array<{ x: number; y: number }> = [];
  private source = { x: 0, y: 0 };
  private pump = { x: 1, y: 0 };

  private tileSize = 64;
  private gap = 10;

  private isPumpOn = false;
  private isSolved = false;
  private leakActive = false;
  private lastTick = 0;
  private startTime = 0;
  private firstPumpOnTimeMs: number | null = null;
  private targetsFilledAtPumpOn = 0;
  private maxTargetsFilled = 0;

  private tapRotateCount = 0;
  private uniqueTiles = new Set<number>();
  private repeatedRotateSameTileCount = 0;
  private lastRotatedTileId: number | null = null;
  private undoCount = 0;
  private resetCount = 0;
  private hintUsedCount = 0;
  private pumpOnTransitions = 0;
  private pumpOnMs = 0;
  private wasteMs = 0;
  private leakEventCount = 0;
  private activeLayer: 'pipe' | 'wire' = 'pipe';
  private levelStarted = false;

  private history: Snapshot[] = [];

  private wasteText!: Phaser.GameObjects.Text;
  private layerToggleContainer?: Phaser.GameObjects.Container;
  private pipeLayerBg?: Phaser.GameObjects.Rectangle;
  private wireLayerBg?: Phaser.GameObjects.Rectangle;
  private pipeLayerText?: Phaser.GameObjects.Text;
  private wireLayerText?: Phaser.GameObjects.Text;
  private layerHintTween?: Phaser.Tweens.Tween;
  private timerContainer?: Phaser.GameObjects.Container;
  private timerBar?: Phaser.GameObjects.Graphics;
  private timerText?: Phaser.GameObjects.Text;
  private timeWarningText?: Phaser.GameObjects.Text;

  private flowWireStartMs = 0;
  private flowPipeStartMs = 0;
  private hasStartedPipeFlow = false;
  private renderNowMs = 0;
  private static readonly FLOW_TILE_DELAY_MS = 300;
  private wireDistanceMap = new Map<string, number>();
  private pipeDistanceMap = new Map<string, number>();
  private pipeWetKeys = new Set<string>();
  private bgLoopSfx?: Phaser.Sound.BaseSound;

  private static hasValidatedAllLevels = false;
  private static shownIntroLevels = new Set<number>();

  constructor() {
    super({ key: 'PowerPumpGameScene' });
  }

  preload() {
    this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
    this.load.audio('level-fail', '/assets/sounds/global/level-fail.mp3');
    this.load.audio('pp-bg-loop', '/assets/sounds/power-pump/bg-loop.mp3');
    this.load.audio('pp-rotate', '/assets/sounds/power-pump/rotate.mp3');
    this.load.audio('pp-pump-on', '/assets/sounds/power-pump/pump-on.mp3');
    this.load.audio('pp-leak', '/assets/sounds/power-pump/leak.mp3');
  }

  init(data: { level?: number }) {
    if (!PowerPumpGameScene.hasValidatedAllLevels && process.env.NODE_ENV !== 'production') {
      PowerPumpGameScene.hasValidatedAllLevels = true;
      const report = validateAllPowerPumpLevelsSolvable();
      if (!report.allSolvable) {
        const details = report.reports
          .filter((r: PowerPumpSolvabilityReport) => !r.isSolvable)
          .map((r: PowerPumpSolvabilityReport) => `L${r.level}: ${r.issues.join(', ')}`)
          .join(' | ');
        throw new Error(`Power Pump solvability validation failed: ${details}`);
      }
    }

    const regLevel = this.registry.get('level');
    const level = data.level || regLevel || 1;
    this.levelConfig = getPowerPumpLevel(level);
    this.resetRuntimeState();
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0xFFF4DC);
    this.add.rectangle(width / 2, height / 2, width, height, 0xFFF8F0, 0.62);
    this.add.rectangle(width / 2, height * 0.18, width * 1.2, height * 0.5, 0xBDEFFF, 0.34);
    this.add.rectangle(width / 2, height * 0.85, width * 1.15, height * 0.48, 0xFFD39A, 0.34);

    this.buildLevel();
    this.ensureDisconnectedStartState();
    this.createHud();
    this.layoutBoard();
    this.renderAllTiles();
    this.updateDerivedState();

    const intro = this.levelConfig.intro;
    const shouldShowIntro = Boolean(
      intro
      && (!intro.oncePerSession || !PowerPumpGameScene.shownIntroLevels.has(this.levelConfig.level))
    );

    if (shouldShowIntro && intro) {
      this.levelStarted = false;
      PowerPumpGameScene.shownIntroLevels.add(this.levelConfig.level);
      this.game.events.emit('SHOW_INTRO', intro);
      this.game.events.once('START_LEVEL', () => {
        this.beginLevelRun();
      });
    } else {
      this.beginLevelRun();
    }

    try {
      this.bgLoopSfx = this.sound.add('pp-bg-loop', { loop: true, volume: 0.28 });
      this.bgLoopSfx.play();
    } catch {
      // noop
    }

    this.scale.on('resize', () => {
      this.layoutBoard();
      this.layoutHud();
      this.renderAllTiles();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      try {
        this.bgLoopSfx?.stop();
        this.bgLoopSfx?.destroy();
      } catch {
        // noop
      }
      this.bgLoopSfx = undefined;
      this.game.events.off('START_LEVEL');
    });
  }

  update() {
    if (!this.levelStarted) return;

    const now = Date.now();
    const dt = Math.max(0, now - this.lastTick);
    this.lastTick = now;

    if (!this.isSolved) {
      this.updateDerivedState();
      if (this.isPumpOn) {
        this.pumpOnMs += dt;
        const filled = this.getFilledTargets().length;
        if (this.isDrainSystemEnabled() && filled < this.targets.length) {
          this.wasteMs += dt;
        }
      }
      this.updateTimerRing();
    }
  }

  private resetRuntimeState() {
    this.tiles = [];
    this.tileMap.clear();
    this.targets = [];
    this.source = { x: 0, y: 0 };
    this.pump = { x: 1, y: 0 };
    this.isPumpOn = false;
    this.isSolved = false;
    this.leakActive = false;
    this.firstPumpOnTimeMs = null;
    this.targetsFilledAtPumpOn = 0;
    this.maxTargetsFilled = 0;

    this.tapRotateCount = 0;
    this.uniqueTiles.clear();
    this.repeatedRotateSameTileCount = 0;
    this.lastRotatedTileId = null;
    this.undoCount = 0;
    this.resetCount = 0;
    this.hintUsedCount = 0;
    this.pumpOnTransitions = 0;
    this.pumpOnMs = 0;
    this.wasteMs = 0;
    this.leakEventCount = 0;
    this.activeLayer = 'pipe';
    this.levelStarted = false;
    this.history = [];
    this.pipeWetKeys.clear();
    this.hasStartedPipeFlow = false;
    this.flowWireStartMs = 0;
    this.flowPipeStartMs = 0;
  }

  private isWireEnabled() {
    return this.levelConfig.wireEnabled;
  }

  private isDrainSystemEnabled() {
    return this.isWireEnabled();
  }

  private beginLevelRun() {
    const now = Date.now();
    this.levelStarted = true;
    this.startTime = now;
    this.lastTick = now;
    this.flowWireStartMs = now;
    this.flowPipeStartMs = 0;
    this.hasStartedPipeFlow = false;
  }

  private buildLevel() {
    const { gridW, gridH, seed } = this.levelConfig;
    const solved = getPowerPumpLevelSolution(this.levelConfig.level);
    const pipeSolved = solved.pipeSolvedMasks.map(row => [...row]);
    const wireSolved = solved.wireSolvedMasks.map(row => [...row]);
    const wireEnabled = this.isWireEnabled();

    this.source = { ...solved.source };
    this.pump = { ...solved.pump };
    this.targets = solved.targets.map(target => ({ ...target }));

    // Safety: generator/source tile must never carry pipe.
    // Keep nearby tiles free from direct pipe inlet into generator.
    pipeSolved[this.source.y][this.source.x] = 0;
    this.enforceGeneratorPipeSpacing(pipeSolved);

    // Runtime rule: targets are destination-only for pipe, so wire must not occupy target tiles.
    // After clearing target wire masks, rebuild and validate a source->pump wire backbone that
    // explicitly routes around targets (and does not rely on any removed/blocked tile).
    if (wireEnabled) {
      this.clearMaskConnectionsAtTargets(wireSolved);
      this.ensureWireBackboneConnected(wireSolved);
      this.enforceSingleSourceWirePort(wireSolved);
      this.ensureWireRouteComplexity(wireSolved);
      this.reduceWireJunctionComplexity(wireSolved, seed + 2661);
      this.ensureWireBackboneConnected(wireSolved);
      this.enforceSingleSourceWirePort(wireSolved);
    } else {
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          wireSolved[y][x] = 0;
        }
      }
    }

    // Keep incoming wire links into pump. Clearing both sides here makes every level unwinnable
    // because source power can never reach the pump.
    const obstacleKeys = this.placeObstacles(pipeSolved, wireSolved, seed + 701);

    let id = 1;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const isSource = x === this.source.x && y === this.source.y;
        const isPump = x === this.pump.x && y === this.pump.y;
        const isTarget = this.targets.some(t => t.x === x && t.y === y);
        const isObstacle = obstacleKeys.has(`${x},${y}`);
        const channel: RuntimeTile['channel'] = (isSource || isPump || isTarget)
          ? 'special'
          : isObstacle
            ? 'obstacle'
            : (wireEnabled && wireSolved[y][x] !== 0 ? 'wire' : 'pipe');
        const randomPipeRot = (isSource || isPump || isObstacle || isTarget)
          ? 0
          : ((seed + id * 37) % 4) as Direction;
        const randomWireRot = (!wireEnabled || isSource || isPump || isObstacle || isTarget)
          ? 0
          : ((seed + id * 53 + 7) % 4) as Direction;
        const locked = isSource || isPump || isObstacle || isTarget;

        const tile: RuntimeTile = {
          id,
          x,
          y,
          channel,
          pipeRotation: randomPipeRot,
          wireRotation: randomWireRot,
          locked,
          pipeSolvedMask: pipeSolved[y][x],
          wireSolvedMask: wireSolved[y][x],
          pipeMask: rotateMask(pipeSolved[y][x], randomPipeRot),
          wireMask: rotateMask(wireSolved[y][x], randomWireRot),
          container: this.add.container(0, 0),
          shadow: this.add.rectangle(2, 3, this.tileSize, this.tileSize, 0x5B87A6, 0.24),
          bg: this.add.rectangle(0, 0, this.tileSize, this.tileSize, 0xFCE6C2),
          gfx: this.add.graphics()
        };

        tile.bg.setStrokeStyle(3, 0x7DB9D6, 0.95);
        tile.container.add([tile.shadow, tile.bg, tile.gfx]);
        tile.container.setSize(this.tileSize, this.tileSize);
        if (!tile.locked) {
          tile.container.setInteractive({ useHandCursor: true });
          tile.container.on('pointerdown', () => this.rotateTile(tile));
        }

        this.tiles.push(tile);
        this.tileMap.set(`${x},${y}`, tile);
        id++;
      }
    }
  }

  private setTileRotation(tile: RuntimeTile, pipeRotation: Direction, wireRotation: Direction = pipeRotation) {
    tile.pipeRotation = pipeRotation;
    tile.wireRotation = wireRotation;
    tile.pipeMask = rotateMask(tile.pipeSolvedMask, pipeRotation);
    tile.wireMask = rotateMask(tile.wireSolvedMask, wireRotation);
  }

  private ensureDisconnectedStartState() {
    const unlockedTiles = this.tiles.filter(tile => !tile.locked);
    const seed = this.levelConfig.seed;
    const wireEnabled = this.isWireEnabled();

    const isValidStartState = () => {
      const wireConnected = wireEnabled ? this.isWireConnected(this.source, this.pump) : false;
      const targetsReachableFromPump = this.getFilledTargets(true).length;
      return !wireConnected && targetsReachableFromPump === 0;
    };

    if (isValidStartState()) {
      this.flowWireStartMs = Date.now();
      this.flowPipeStartMs = Date.now();
      return;
    }

    for (let attempt = 1; attempt <= 28; attempt++) {
      for (const tile of unlockedTiles) {
        const nextPipeRot = ((seed + tile.id * 37 + attempt * 53) % 4) as Direction;
        const nextWireRot = wireEnabled
          ? ((seed + tile.id * 41 + attempt * 67) % 4) as Direction
          : tile.wireRotation;
        this.setTileRotation(tile, nextPipeRot, nextWireRot);
      }
      if (isValidStartState()) {
        this.flowWireStartMs = Date.now();
        this.flowPipeStartMs = Date.now();
        return;
      }
    }

    // Hard fallback: deterministic forced offsets to guarantee unsolved start.
    unlockedTiles.slice(0, 6).forEach((tile, idx) => {
      this.setTileRotation(
        tile,
        ((tile.pipeRotation + 1 + (idx % 2)) % 4) as Direction,
        wireEnabled
          ? ((tile.wireRotation + 2 + (idx % 2)) % 4) as Direction
          : tile.wireRotation
      );
    });

    if (!isValidStartState()) {
      unlockedTiles.slice(6, 12).forEach((tile, idx) => {
        this.setTileRotation(
          tile,
          ((tile.pipeRotation + 2 + (idx % 3)) % 4) as Direction,
          wireEnabled
            ? ((tile.wireRotation + 1 + (idx % 2)) % 4) as Direction
            : tile.wireRotation
        );
      });
    }

    for (let i = 0; i < 10 && !isValidStartState(); i++) {
      const brokenWire = wireEnabled ? this.breakConnectedWirePath() : false;
      const brokenPipe = this.breakConnectedPipePath();
      if (!brokenWire && !brokenPipe) break;
    }

    if (this.levelConfig.level <= 8) {
      for (let attempt = 1; attempt <= 14; attempt++) {
        if (isValidStartState() && this.hasEarlyFairOpeningMove()) break;

        for (const tile of unlockedTiles) {
          const nextPipeRot = ((seed + tile.id * 19 + attempt * 41) % 4) as Direction;
          const nextWireRot = wireEnabled
            ? ((seed + tile.id * 23 + attempt * 59) % 4) as Direction
            : tile.wireRotation;
          this.setTileRotation(tile, nextPipeRot, nextWireRot);
        }
      }
    }

    this.flowWireStartMs = Date.now();
    this.flowPipeStartMs = Date.now();
  }

  private hasEarlyFairOpeningMove() {
    if (this.levelConfig.level > 8) return true;

    const unlockedTiles = this.tiles.filter(tile => !tile.locked);
    if (unlockedTiles.length === 0) return true;

    const baseWireConnected = this.isWireEnabled() ? this.isWireConnected(this.source, this.pump) : false;
    const baseReachableTargets = this.targets.filter(target => this.bfs(this.pump, 'pipe').has(`${target.x},${target.y}`)).length;
    const baseLeak = this.hasLeak();

    const hasImprovement = () => {
      const nowWireConnected = this.isWireEnabled() ? this.isWireConnected(this.source, this.pump) : false;
      const nowReachableTargets = this.targets.filter(target => this.bfs(this.pump, 'pipe').has(`${target.x},${target.y}`)).length;
      const nowLeak = this.hasLeak();

      const improvedPipe = nowReachableTargets > baseReachableTargets || (baseLeak && !nowLeak);
      const improvedWire = this.isWireEnabled() && !baseWireConnected && nowWireConnected;
      return improvedPipe || improvedWire;
    };

    for (const tile of unlockedTiles) {
      const basePipeRot = tile.pipeRotation;
      const baseWireRot = tile.wireRotation;

      this.setTileRotation(tile, ((basePipeRot + 1) % 4) as Direction, baseWireRot);
      const pipeImproves = hasImprovement();
      this.setTileRotation(tile, basePipeRot, baseWireRot);
      if (pipeImproves) return true;

      if (this.isWireEnabled()) {
        this.setTileRotation(tile, basePipeRot, ((baseWireRot + 1) % 4) as Direction);
        const wireImproves = hasImprovement();
        this.setTileRotation(tile, basePipeRot, baseWireRot);
        if (wireImproves) return true;
      }
    }

    return !baseLeak;
  }

  private clearMaskConnectionsAtTargets(maskGrid: number[][]) {
    for (const target of this.targets) {
      const { x, y } = target;
      const current = maskGrid[y]?.[x] ?? 0;
      if (current === 0) continue;

      for (let dir = 0; dir < 4; dir++) {
        if ((current & BIT(dir)) === 0) continue;
        const nx = x + DIRS[dir].dx;
        const ny = y + DIRS[dir].dy;
        if (!maskGrid[ny] || maskGrid[ny][nx] === undefined) continue;
        maskGrid[ny][nx] &= ~BIT((dir + 2) % 4);
      }

      maskGrid[y][x] = 0;
    }
  }

  private clearMaskConnectionsAtPoint(maskGrid: number[][], point: { x: number; y: number }) {
    const { x, y } = point;
    const current = maskGrid[y]?.[x] ?? 0;
    if (current === 0) return;

    for (let dir = 0; dir < 4; dir++) {
      if ((current & BIT(dir)) === 0) continue;
      const nx = x + DIRS[dir].dx;
      const ny = y + DIRS[dir].dy;
      if (!maskGrid[ny] || maskGrid[ny][nx] === undefined) continue;
      maskGrid[ny][nx] &= ~BIT((dir + 2) % 4);
    }

    maskGrid[y][x] = 0;
  }

  private breakConnectedWirePath() {
    if (!this.isWireEnabled()) return false;

    const path = this.findRuntimePath(this.source, this.pump, 'wire');
    if (!path || path.length < 3) return false;

    for (let i = 1; i < path.length - 1; i++) {
      const tile = this.tileMap.get(`${path[i].x},${path[i].y}`);
      if (!tile || tile.locked) continue;
      const nextWireRot = ((tile.wireRotation + 1) % 4) as Direction;
      this.setTileRotation(tile, tile.pipeRotation, nextWireRot);
      return true;
    }

    return false;
  }

  private breakConnectedPipePath() {
    const reachableTarget = this.targets.find(target => this.bfs(this.pump, 'pipe').has(`${target.x},${target.y}`));
    if (!reachableTarget) return false;

    const path = this.findRuntimePath(this.pump, reachableTarget, 'pipe');
    if (!path || path.length < 3) return false;

    for (let i = 1; i < path.length - 1; i++) {
      const tile = this.tileMap.get(`${path[i].x},${path[i].y}`);
      if (!tile || tile.locked) continue;
      const nextPipeRot = ((tile.pipeRotation + 1) % 4) as Direction;
      this.setTileRotation(tile, nextPipeRot, tile.wireRotation);
      return true;
    }

    return false;
  }

  private ensureWireBackboneConnected(wireGrid: number[][]) {
    if (this.isMaskGridConnected(wireGrid, this.source, this.pump)) return;
    this.connectWireRoute(wireGrid, this.source, this.pump, this.levelConfig.seed + 2111);
  }

  private enforceSingleSourceWirePort(wireGrid: number[][]) {
    const { x, y } = this.source;
    const currentMask = wireGrid[y]?.[x] ?? 0;
    if (currentMask === 0) {
      this.connectWireRoute(wireGrid, this.source, this.pump, this.levelConfig.seed + 2333);
    }

    const refreshedMask = wireGrid[y]?.[x] ?? 0;
    if (refreshedMask === 0) return;

    let chosenDir = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestTurns = -1;

    for (let dir = 0; dir < 4; dir++) {
      if ((refreshedMask & BIT(dir)) === 0) continue;
      const nx = x + DIRS[dir].dx;
      const ny = y + DIRS[dir].dy;
      const neighborMask = wireGrid[ny]?.[nx] ?? 0;
      if ((neighborMask & BIT((dir + 2) % 4)) === 0) continue;

      const testGrid = wireGrid.map(row => [...row]);
      testGrid[y][x] = BIT(dir);
      for (let pruneDir = 0; pruneDir < 4; pruneDir++) {
        if (pruneDir === dir) continue;
        const px = x + DIRS[pruneDir].dx;
        const py = y + DIRS[pruneDir].dy;
        if (!testGrid[py] || testGrid[py][px] === undefined) continue;
        testGrid[py][px] &= ~BIT((pruneDir + 2) % 4);
      }

      if (!this.isMaskGridConnected(testGrid, this.source, this.pump)) continue;

      const turns = this.countPathTurnsInMaskGrid(testGrid, this.source, this.pump);
      const distance = Math.abs(nx - this.pump.x) + Math.abs(ny - this.pump.y);
      if (turns > bestTurns || (turns === bestTurns && distance < bestDistance)) {
        bestTurns = turns;
        bestDistance = distance;
        chosenDir = dir;
      }
    }

    if (chosenDir < 0) {
      this.connectWireRoute(wireGrid, this.source, this.pump, this.levelConfig.seed + 2557);
      this.enforceSingleSourceWirePort(wireGrid);
      return;
    }

    wireGrid[y][x] = BIT(chosenDir);
    for (let dir = 0; dir < 4; dir++) {
      if (dir === chosenDir) continue;
      const nx = x + DIRS[dir].dx;
      const ny = y + DIRS[dir].dy;
      if (!wireGrid[ny] || wireGrid[ny][nx] === undefined) continue;
      wireGrid[ny][nx] &= ~BIT((dir + 2) % 4);
    }
  }

  private ensureWireRouteComplexity(wireGrid: number[][]) {
    const minTurns = clamp(
      1 + Math.floor(this.levelConfig.wireComplexity / 4) + Math.floor(this.levelConfig.level / 14),
      2,
      6
    );
    const minCornerTiles = clamp(
      2 + Math.floor(this.levelConfig.wireComplexity / 3),
      2,
      9
    );

    const hasEnoughComplexity = () => {
      const turns = this.countPathTurnsInMaskGrid(wireGrid, this.source, this.pump);
      const corners = this.countConnectedWireCornerTiles(wireGrid);
      return turns >= minTurns && corners >= minCornerTiles;
    };

    if (hasEnoughComplexity()) return;

    for (let attempt = 0; attempt < 7; attempt++) {
      this.resetWireGridToBackbone(wireGrid);
      this.connectWireRoute(wireGrid, this.source, this.pump, this.levelConfig.seed + 3001 + attempt * 101);
      this.enforceSingleSourceWirePort(wireGrid);
      if (hasEnoughComplexity()) return;
    }
  }

  private resetWireGridToBackbone(wireGrid: number[][]) {
    const { gridW, gridH } = this.levelConfig;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const isSource = x === this.source.x && y === this.source.y;
        const isPump = x === this.pump.x && y === this.pump.y;
        if (isSource || isPump) {
          wireGrid[y][x] = 0;
          continue;
        }
        wireGrid[y][x] = 0;
      }
    }
  }

  private isCornerMask(mask: number) {
    if (this.getMaskDegree(mask) !== 2) return false;
    const verticalStraight = (mask & (BIT(0) | BIT(2))) === (BIT(0) | BIT(2));
    const horizontalStraight = (mask & (BIT(1) | BIT(3))) === (BIT(1) | BIT(3));
    return !verticalStraight && !horizontalStraight;
  }

  private countConnectedWireCornerTiles(wireGrid: number[][]) {
    const visited = this.bfsMaskGrid(wireGrid, this.source);
    let corners = 0;
    for (const key of visited) {
      const [xStr, yStr] = key.split(',');
      const x = Number(xStr);
      const y = Number(yStr);
      if ((x === this.source.x && y === this.source.y) || (x === this.pump.x && y === this.pump.y)) continue;
      if (this.isCornerMask(wireGrid[y]?.[x] ?? 0)) corners += 1;
    }
    return corners;
  }

  private ensurePipeTargetsReachable(pipeGrid: number[][]) {
    const maxAttempts = Math.max(6, this.targets.length * 4);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const visited = this.bfsMaskGrid(pipeGrid, this.pump);
      const missing = this.targets.filter(target => !visited.has(`${target.x},${target.y}`));
      if (missing.length === 0) return;

      missing.forEach((target, idx) => {
        this.connectPipeRoute(
          pipeGrid,
          this.pump,
          target,
          this.levelConfig.seed + 1301 + attempt * 211 + idx * 97
        );
      });
    }
  }

  private forceReconnectUnreachableTargets(pipeGrid: number[][], seed: number) {
    const visited = this.bfsMaskGrid(pipeGrid, this.pump);
    this.targets.forEach((target, idx) => {
      const key = `${target.x},${target.y}`;
      const targetMask = pipeGrid[target.y]?.[target.x] ?? 0;
      if (visited.has(key) && targetMask !== 0) return;
      this.connectPipeRoute(pipeGrid, this.pump, target, seed + idx * 131);
    });
  }

  private isMaskGridConnected(maskGrid: number[][], start: { x: number; y: number }, end: { x: number; y: number }) {
    const visited = new Set<string>();
    const q: Array<{ x: number; y: number }> = [start];
    visited.add(`${start.x},${start.y}`);

    while (q.length) {
      const cur = q.shift()!;
      if (cur.x === end.x && cur.y === end.y) return true;
      const mask = maskGrid[cur.y]?.[cur.x] ?? 0;
      for (let dir = 0; dir < 4; dir++) {
        if ((mask & BIT(dir)) === 0) continue;
        const nx = cur.x + DIRS[dir].dx;
        const ny = cur.y + DIRS[dir].dy;
        if (ny < 0 || nx < 0 || ny >= maskGrid.length || nx >= (maskGrid[0]?.length ?? 0)) continue;
        const nextMask = maskGrid[ny][nx] ?? 0;
        const opposite = (dir + 2) % 4;
        if ((nextMask & BIT(opposite)) === 0) continue;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        visited.add(key);
        q.push({ x: nx, y: ny });
      }
    }

    return false;
  }

  private enforceDestinationInlets(pipeGrid: number[][]) {
    const blockedTargets = new Set(this.targets.map(t => `${t.x},${t.y}`));
    const reachableFromPump = this.bfsMaskGridWithBlocked(pipeGrid, this.pump, blockedTargets);
    const isTargetCell = (x: number, y: number) => this.targets.some(t => t.x === x && t.y === y);

    for (const target of this.targets) {
      const { x, y } = target;
      const currentMask = pipeGrid[y][x] ?? 0;
      if (currentMask === 0) continue;

      let chosenDir = -1;
      let bestScore = Number.POSITIVE_INFINITY;
      for (let dir = 0; dir < 4; dir++) {
        if ((currentMask & BIT(dir)) === 0) continue;
        const nx = x + DIRS[dir].dx;
        const ny = y + DIRS[dir].dy;
        // Never choose another destination tile as the inlet source.
        if (isTargetCell(nx, ny)) continue;
        const neighborMask = pipeGrid[ny]?.[nx] ?? 0;
        if ((neighborMask & BIT((dir + 2) % 4)) === 0) continue;
        if (!reachableFromPump.has(`${nx},${ny}`)) continue;
        const score = Math.abs(nx - this.pump.x) + Math.abs(ny - this.pump.y);
        if (score < bestScore) {
          bestScore = score;
          chosenDir = dir;
        }
      }

      if (chosenDir < 0) {
        // Fallback: reconnect target first, then re-evaluate valid inlet direction.
        this.connectPipeRoute(pipeGrid, this.pump, target, this.levelConfig.seed + x * 31 + y * 17);

        const refreshedMask = pipeGrid[y][x] ?? 0;
        for (let dir = 0; dir < 4; dir++) {
          if ((refreshedMask & BIT(dir)) === 0) continue;
          const nx = x + DIRS[dir].dx;
          const ny = y + DIRS[dir].dy;
          if (isTargetCell(nx, ny)) continue;
          const neighborMask = pipeGrid[ny]?.[nx] ?? 0;
          if ((neighborMask & BIT((dir + 2) % 4)) === 0) continue;
          chosenDir = dir;
          break;
        }
      }

      if (chosenDir < 0) {
        // Last-resort safety: force one inlet toward nearest in-bounds side and connect both sides.
        const dirPreference = [0, 1, 2, 3].sort((a, b) => {
          const ax = x + DIRS[a].dx;
          const ay = y + DIRS[a].dy;
          const bx = x + DIRS[b].dx;
          const by = y + DIRS[b].dy;
          const ad = Math.abs(ax - this.pump.x) + Math.abs(ay - this.pump.y);
          const bd = Math.abs(bx - this.pump.x) + Math.abs(by - this.pump.y);
          return ad - bd;
        });

        for (const dir of dirPreference) {
          const nx = x + DIRS[dir].dx;
          const ny = y + DIRS[dir].dy;
          if (isTargetCell(nx, ny)) continue;
          if (!pipeGrid[ny] || pipeGrid[ny][nx] === undefined) continue;
          chosenDir = dir;
          break;
        }
      }

      if (chosenDir < 0) continue;

      pipeGrid[y][x] = BIT(chosenDir);

      const keepNx = x + DIRS[chosenDir].dx;
      const keepNy = y + DIRS[chosenDir].dy;
      if (pipeGrid[keepNy] && pipeGrid[keepNy][keepNx] !== undefined) {
        pipeGrid[keepNy][keepNx] |= BIT((chosenDir + 2) % 4);
      }
    }
  }

  private bfsMaskGridWithBlocked(maskGrid: number[][], start: { x: number; y: number }, blocked: Set<string>) {
    const visited = new Set<string>();
    const q: Array<{ x: number; y: number }> = [start];
    const startKey = `${start.x},${start.y}`;
    visited.add(startKey);

    while (q.length) {
      const cur = q.shift()!;
      const mask = maskGrid[cur.y]?.[cur.x] ?? 0;
      for (let dir = 0; dir < 4; dir++) {
        if ((mask & BIT(dir)) === 0) continue;
        const nx = cur.x + DIRS[dir].dx;
        const ny = cur.y + DIRS[dir].dy;
        if (ny < 0 || nx < 0 || ny >= maskGrid.length || nx >= (maskGrid[0]?.length ?? 0)) continue;

        const key = `${nx},${ny}`;
        if (blocked.has(key)) continue;

        const nextMask = maskGrid[ny][nx] ?? 0;
        const opposite = (dir + 2) % 4;
        if ((nextMask & BIT(opposite)) === 0) continue;
        if (visited.has(key)) continue;
        visited.add(key);
        q.push({ x: nx, y: ny });
      }
    }

    return visited;
  }

  private isTargetInletValid(pipeGrid: number[][], target: { x: number; y: number }, blockedTargets: Set<string>) {
    const { x, y } = target;
    const mask = pipeGrid[y]?.[x] ?? 0;
    if (this.getMaskDegree(mask) !== 1) return false;

    let inletDir = -1;
    for (let dir = 0; dir < 4; dir++) {
      if ((mask & BIT(dir)) !== 0) {
        inletDir = dir;
        break;
      }
    }
    if (inletDir < 0) return false;

    const nx = x + DIRS[inletDir].dx;
    const ny = y + DIRS[inletDir].dy;
    const key = `${nx},${ny}`;
    if (blockedTargets.has(key)) return false;

    const neighborMask = pipeGrid[ny]?.[nx] ?? 0;
    if ((neighborMask & BIT((inletDir + 2) % 4)) === 0) return false;

    const reachableWithoutTargets = this.bfsMaskGridWithBlocked(pipeGrid, this.pump, blockedTargets);
    return reachableWithoutTargets.has(key);
  }

  private areTargetInletsValid(pipeGrid: number[][]) {
    const blockedTargets = new Set(this.targets.map(t => `${t.x},${t.y}`));
    return this.targets.every(target => this.isTargetInletValid(pipeGrid, target, blockedTargets));
  }

  private ensureValidTargetInlets(pipeGrid: number[][], seed: number) {
    const maxAttempts = Math.max(8, this.targets.length * 6);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (this.areTargetInletsValid(pipeGrid)) return;

      const blockedTargets = new Set(this.targets.map(t => `${t.x},${t.y}`));
      this.targets.forEach((target, idx) => {
        if (this.isTargetInletValid(pipeGrid, target, blockedTargets)) return;
        this.clearMaskConnectionsAtPoint(pipeGrid, target);
        this.connectPipeRoute(pipeGrid, this.pump, target, seed + attempt * 211 + idx * 97);
      });

      this.ensurePipeTargetsReachable(pipeGrid);
      this.enforceDestinationInlets(pipeGrid);
      this.enforceSinglePumpPipePort(pipeGrid);
      this.ensurePipeTargetsReachable(pipeGrid);
      this.enforceDestinationInlets(pipeGrid);
    }
  }

  private enforceSinglePumpPipePort(pipeGrid: number[][]) {
    const { x, y } = this.pump;
    const currentMask = pipeGrid[y]?.[x] ?? 0;
    if (currentMask === 0) return;

    let chosenDir = -1;
    let bestReachableTargets = -1;
    let bestDistanceScore = Number.POSITIVE_INFINITY;

    const cloneGrid = (grid: number[][]) => grid.map(row => [...row]);

    for (let dir = 0; dir < 4; dir++) {
      if ((currentMask & BIT(dir)) === 0) continue;
      const nx = x + DIRS[dir].dx;
      const ny = y + DIRS[dir].dy;
      const neighborMask = pipeGrid[ny]?.[nx] ?? 0;
      if ((neighborMask & BIT((dir + 2) % 4)) === 0) continue;

      const testGrid = cloneGrid(pipeGrid);
      testGrid[y][x] = BIT(dir);
      for (let pruneDir = 0; pruneDir < 4; pruneDir++) {
        if (pruneDir === dir) continue;
        const px = x + DIRS[pruneDir].dx;
        const py = y + DIRS[pruneDir].dy;
        if (!testGrid[py] || testGrid[py][px] === undefined) continue;
        testGrid[py][px] &= ~BIT((pruneDir + 2) % 4);
      }

      const reachableTargets = this.countReachableTargetsInMaskGrid(testGrid, this.pump);
      const nearestTargetDistance = this.targets.reduce((min, t) => {
        const d = Math.abs(nx - t.x) + Math.abs(ny - t.y);
        return Math.min(min, d);
      }, Number.POSITIVE_INFINITY);

      if (
        reachableTargets > bestReachableTargets
        || (reachableTargets === bestReachableTargets && nearestTargetDistance < bestDistanceScore)
      ) {
        bestReachableTargets = reachableTargets;
        bestDistanceScore = nearestTargetDistance;
        chosenDir = dir;
      }
    }

    if (chosenDir < 0) return;

    pipeGrid[y][x] = BIT(chosenDir);
    for (let dir = 0; dir < 4; dir++) {
      if (dir === chosenDir) continue;
      const nx = x + DIRS[dir].dx;
      const ny = y + DIRS[dir].dy;
      if (!pipeGrid[ny] || pipeGrid[ny][nx] === undefined) continue;
      pipeGrid[ny][nx] &= ~BIT((dir + 2) % 4);
    }

    if (this.countReachableTargetsInMaskGrid(pipeGrid, this.pump) === 0) {
      this.connectPipeRoute(pipeGrid, this.pump, this.targets[0], this.levelConfig.seed + 1109);
      this.enforceDestinationInlets(pipeGrid);
      this.enforceSinglePumpPipePort(pipeGrid);
    }
  }

  private countReachableTargetsInMaskGrid(maskGrid: number[][], start: { x: number; y: number }) {
    const visited = this.bfsMaskGrid(maskGrid, start);

    let reachableTargets = 0;
    for (const target of this.targets) {
      if (visited.has(`${target.x},${target.y}`)) reachableTargets += 1;
    }

    return reachableTargets;
  }

  private bfsMaskGrid(maskGrid: number[][], start: { x: number; y: number }) {
    const visited = new Set<string>();
    const q: Array<{ x: number; y: number }> = [start];
    visited.add(`${start.x},${start.y}`);

    while (q.length) {
      const cur = q.shift()!;
      const mask = maskGrid[cur.y]?.[cur.x] ?? 0;
      for (let dir = 0; dir < 4; dir++) {
        if ((mask & BIT(dir)) === 0) continue;
        const nx = cur.x + DIRS[dir].dx;
        const ny = cur.y + DIRS[dir].dy;
        if (ny < 0 || nx < 0 || ny >= maskGrid.length || nx >= (maskGrid[0]?.length ?? 0)) continue;
        const nextMask = maskGrid[ny][nx] ?? 0;
        const opposite = (dir + 2) % 4;
        if ((nextMask & BIT(opposite)) === 0) continue;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        visited.add(key);
        q.push({ x: nx, y: ny });
      }
    }

    return visited;
  }

  private findPathInMaskGrid(maskGrid: number[][], start: { x: number; y: number }, end: { x: number; y: number }) {
    const startKey = `${start.x},${start.y}`;
    const endKey = `${end.x},${end.y}`;

    const q: Array<{ x: number; y: number }> = [start];
    const visited = new Set<string>([startKey]);
    const parent = new Map<string, string>();

    while (q.length) {
      const cur = q.shift()!;
      const curKey = `${cur.x},${cur.y}`;
      if (curKey === endKey) break;

      const mask = maskGrid[cur.y]?.[cur.x] ?? 0;
      for (let dir = 0; dir < 4; dir++) {
        if ((mask & BIT(dir)) === 0) continue;
        const nx = cur.x + DIRS[dir].dx;
        const ny = cur.y + DIRS[dir].dy;
        if (ny < 0 || nx < 0 || ny >= maskGrid.length || nx >= (maskGrid[0]?.length ?? 0)) continue;

        const nextMask = maskGrid[ny]?.[nx] ?? 0;
        const opposite = (dir + 2) % 4;
        if ((nextMask & BIT(opposite)) === 0) continue;

        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        visited.add(key);
        parent.set(key, curKey);
        q.push({ x: nx, y: ny });
      }
    }

    if (!visited.has(endKey)) return null;

    const path: Array<{ x: number; y: number }> = [];
    let cursor: string | undefined = endKey;
    while (cursor) {
      const [xStr, yStr] = cursor.split(',');
      path.push({ x: Number(xStr), y: Number(yStr) });
      if (cursor === startKey) break;
      cursor = parent.get(cursor);
    }
    path.reverse();
    return path;
  }

  private countPathTurns(path: Array<{ x: number; y: number }> | null) {
    if (!path || path.length < 3) return 0;
    let turns = 0;
    let prevDir: number | null = null;

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dir = dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0;
      if (prevDir !== null && dir !== prevDir) turns += 1;
      prevDir = dir;
    }

    return turns;
  }

  private countPathTurnsInMaskGrid(maskGrid: number[][], start: { x: number; y: number }, end: { x: number; y: number }) {
    const path = this.findPathInMaskGrid(maskGrid, start, end);
    return this.countPathTurns(path);
  }

  private placeObstacles(pipeGrid: number[][], wireGrid: number[][], seed: number) {
    const { gridW, gridH, level } = this.levelConfig;
    const areaCap = Math.max(0, Math.floor((gridW * gridH) * 0.34));
    const obstacleCount = level <= 2 ? 0 : clamp(1 + Math.floor((level - 2) / 3), 1, Math.max(3, areaCap));
    if (obstacleCount <= 0) return new Set<string>();

    const candidates: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const isSource = x === this.source.x && y === this.source.y;
        const isPump = x === this.pump.x && y === this.pump.y;
        const isTarget = this.targets.some(t => t.x === x && t.y === y);
        if (isSource || isPump || isTarget) continue;
        if ((pipeGrid[y][x] ?? 0) !== 0) continue;
        if ((wireGrid[y][x] ?? 0) !== 0) continue;
        candidates.push({ x, y });
      }
    }

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = (seed + i * 17) % (i + 1);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const selected = new Set<string>();
    for (const c of candidates) {
      if (selected.size >= obstacleCount) break;
      const nearSpecial = [this.source, this.pump, ...this.targets].some(p => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) <= 1);
      if (nearSpecial && level > 6) continue;
      selected.add(`${c.x},${c.y}`);
    }
    return selected;
  }

  private enforcePumpTargetSpacing(targets: Array<{ x: number; y: number }>, seed: number) {
    if (!targets.some(target => isAdjacent(target, this.pump))) return targets;

    const nextTargets = [...targets];
    const occupied = new Set<string>([
      `${this.source.x},${this.source.y}`,
      `${this.pump.x},${this.pump.y}`,
      ...targets.map(target => `${target.x},${target.y}`)
    ]);

    for (let i = 0; i < nextTargets.length; i++) {
      const target = nextTargets[i];
      if (!isAdjacent(target, this.pump)) continue;

      occupied.delete(`${target.x},${target.y}`);
      let replacement: { x: number; y: number } | null = null;

      for (let attempt = 0; attempt < this.levelConfig.gridW * this.levelConfig.gridH * 2; attempt++) {
        const x = (seed + i * 29 + attempt * 17) % this.levelConfig.gridW;
        const y = (seed + i * 37 + attempt * 13) % this.levelConfig.gridH;
        const candidate = { x, y };
        const key = `${x},${y}`;
        if (occupied.has(key)) continue;
        if (isAdjacent(candidate, this.source) || isAdjacent(candidate, this.pump)) continue;
        replacement = candidate;
        break;
      }

      if (replacement) {
        nextTargets[i] = replacement;
        occupied.add(`${replacement.x},${replacement.y}`);
      } else {
        occupied.add(`${target.x},${target.y}`);
      }
    }

    return nextTargets;
  }

  private enforceGeneratorPipeSpacing(pipeGrid: number[][]) {
    for (let dir = 0; dir < 4; dir++) {
      const nx = this.source.x + DIRS[dir].dx;
      const ny = this.source.y + DIRS[dir].dy;
      if (!pipeGrid[ny] || pipeGrid[ny][nx] === undefined) continue;
      const opposite = (dir + 2) % 4;
      pipeGrid[ny][nx] &= ~BIT(opposite);
    }
  }

  private generateTargets(gridW: number, gridH: number, count: number, seed: number) {
    const cells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const point = { x, y };
        const isSource = x === this.source.x && y === this.source.y;
        const isPump = x === this.pump.x && y === this.pump.y;
        const touchesSource = isAdjacent(point, this.source);
        const touchesPump = isAdjacent(point, this.pump);
        if (!isSource && !isPump && !touchesSource && !touchesPump) {
          cells.push({ x, y });
        }
      }
    }
    for (let i = cells.length - 1; i > 0; i--) {
      const j = (seed + i * 17) % (i + 1);
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells.slice(0, count);
  }

  private pickEndpoints(gridW: number, gridH: number, seed: number) {
    const candidateCells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        candidateCells.push({ x, y });
      }
    }

    if (candidateCells.length < 2) {
      return {
        source: { x: 0, y: 0 },
        pump: { x: Math.max(0, gridW - 1), y: Math.max(0, gridH - 1) }
      };
    }

    let bestSource = candidateCells[seed % candidateCells.length] ?? { x: 0, y: 0 };
    let bestPump = candidateCells[(seed * 7 + 11) % candidateCells.length] ?? { x: Math.max(0, gridW - 1), y: Math.max(0, gridH - 1) };
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let si = 0; si < candidateCells.length; si++) {
      const sourceCandidate = candidateCells[si];
      for (let pi = 0; pi < candidateCells.length; pi++) {
        const pumpCandidate = candidateCells[pi];
        if (si === pi) continue;

        const dist = manhattanDistance(sourceCandidate, pumpCandidate);
        const sameAxisPenalty = (sourceCandidate.x === pumpCandidate.x || sourceCandidate.y === pumpCandidate.y) ? 6 : 0;
        const sourceEdgeDistance = Math.min(sourceCandidate.x, gridW - 1 - sourceCandidate.x, sourceCandidate.y, gridH - 1 - sourceCandidate.y);
        const pumpEdgeDistance = Math.min(pumpCandidate.x, gridW - 1 - pumpCandidate.x, pumpCandidate.y, gridH - 1 - pumpCandidate.y);
        const interiorBonus = (sourceEdgeDistance + pumpEdgeDistance) * 2;
        const tieBreaker = ((seed + si * 17 + pi * 31) % 11) * 0.01;

        const score = dist * 10 + interiorBonus - sameAxisPenalty + tieBreaker;
        if (score > bestScore) {
          bestScore = score;
          bestSource = sourceCandidate;
          bestPump = pumpCandidate;
        }
      }
    }

    return { source: bestSource, pump: bestPump };
  }

  private connectManhattan(maskGrid: number[][], from: { x: number; y: number }, to: { x: number; y: number }, seed = 0) {
    let cx = from.x;
    let cy = from.y;
    const horizontalFirst = seed % 2 === 0;

    const walkHorizontal = () => {
      while (cx !== to.x) {
        const nx = cx + (to.x > cx ? 1 : -1);
        const d1 = to.x > cx ? 1 : 3;
        const d2 = (d1 + 2) % 4;
        maskGrid[cy][cx] |= BIT(d1);
        maskGrid[cy][nx] |= BIT(d2);
        cx = nx;
      }
    };

    const walkVertical = () => {
      while (cy !== to.y) {
        const ny = cy + (to.y > cy ? 1 : -1);
        const d1 = to.y > cy ? 2 : 0;
        const d2 = (d1 + 2) % 4;
        maskGrid[cy][cx] |= BIT(d1);
        maskGrid[ny][cx] |= BIT(d2);
        cy = ny;
      }
    };

    if (horizontalFirst) {
      walkHorizontal();
      walkVertical();
    } else {
      walkVertical();
      walkHorizontal();
    }
  }

  private connectPipeRoute(maskGrid: number[][], from: { x: number; y: number }, to: { x: number; y: number }, seed: number) {
    const { gridW, gridH, level } = this.levelConfig;
    const points: Array<{ x: number; y: number }> = [from];

    if (from.y === 0 && gridH > 1) {
      points.push({ x: from.x, y: 1 });
    }

    const bendCount = clamp(3 + Math.floor(level / 6), 3, 7);
    for (let i = 0; i < bendCount; i++) {
      const wx = clamp((seed + i * 37) % gridW, 0, gridW - 1);
      const wy = clamp((seed + i * 53 + i * 19) % gridH, 0, gridH - 1);
      const prev = points[points.length - 1];
      if (prev.x !== wx || prev.y !== wy) {
        points.push({ x: wx, y: wy });
      }
    }

    points.push(to);
    for (let i = 0; i < points.length - 1; i++) {
      this.connectManhattan(maskGrid, points[i], points[i + 1], seed + i * 23);
    }
  }

  private connectWireRoute(maskGrid: number[][], from: { x: number; y: number }, to: { x: number; y: number }, seed: number) {
    const { gridW, gridH, level, wireComplexity } = this.levelConfig;

    if (gridH <= 1) {
      this.connectManhattan(maskGrid, from, to);
      return;
    }

    const directDistance = manhattanDistance(from, to);
    const points: Array<{ x: number; y: number }> = [from];
    const used = new Set<string>([`${from.x},${from.y}`]);
    const blocked = new Set(this.targets.map(t => `${t.x},${t.y}`));

    const pushPoint = (candidate: { x: number; y: number }) => {
      const key = `${candidate.x},${candidate.y}`;
      if (blocked.has(key) || used.has(key)) return;
      const prev = points[points.length - 1];
      if (prev.x === candidate.x && prev.y === candidate.y) return;
      points.push(candidate);
      used.add(key);
    };

    const corners: Array<{ x: number; y: number }> = [
      { x: 0, y: 0 },
      { x: gridW - 1, y: 0 },
      { x: gridW - 1, y: gridH - 1 },
      { x: 0, y: gridH - 1 }
    ];

    const scenicCorner = corners
      .sort((a, b) => {
        const scoreA = Math.min(manhattanDistance(from, a), manhattanDistance(to, a));
        const scoreB = Math.min(manhattanDistance(from, b), manhattanDistance(to, b));
        return scoreB - scoreA;
      })[0];
    if (scenicCorner) {
      pushPoint(scenicCorner);
    }

    // Use pipe-like waypoint generation as base + extra detours for harder wire puzzles.
    const baseBendCount = clamp(3 + Math.floor(level / 6), 3, 7);
    const bonusBends = clamp(Math.floor(wireComplexity / 4) + Math.floor(level / 10), 1, 5);
    const bendCount = clamp(baseBendCount + bonusBends, 4, Math.max(8, Math.floor(gridW * gridH * 0.56)));

    if (from.y === 0 && gridH > 1) {
      pushPoint({ x: from.x, y: 1 });
    }

    for (let i = 0; i < bendCount; i++) {
      const wx = clamp((seed + i * 37 + (i % 3) * (wireComplexity + 11)) % gridW, 0, gridW - 1);
      const wy = clamp((seed + i * 53 + i * 19 + (i % 2) * (wireComplexity + 7)) % gridH, 0, gridH - 1);
      pushPoint({ x: wx, y: wy });
    }

    const detourCount = clamp(1 + Math.floor(wireComplexity / 5) + Math.floor(level / 12), 1, 5);
    for (let i = 0; i < detourCount; i++) {
      const phase = (seed + i * 11 + level) % 4;
      const laneX = clamp((seed + i * 17 + wireComplexity * 3) % gridW, 0, gridW - 1);
      const laneY = clamp((seed + i * 23 + wireComplexity * 5) % gridH, 0, gridH - 1);

      if (phase === 0) {
        pushPoint({ x: 0, y: laneY });
        pushPoint({ x: laneX, y: laneY });
      } else if (phase === 1) {
        pushPoint({ x: gridW - 1, y: laneY });
        pushPoint({ x: laneX, y: laneY });
      } else if (phase === 2) {
        pushPoint({ x: laneX, y: 0 });
        pushPoint({ x: laneX, y: gridH - 1 });
      } else {
        pushPoint({ x: laneX, y: laneY });
        pushPoint({ x: (laneX + Math.max(1, Math.floor(gridW / 2))) % gridW, y: laneY });
      }
    }

    points.push(to);
    for (let i = 0; i < points.length - 1; i++) {
      this.connectPathAvoidingBlocked(maskGrid, points[i], points[i + 1], blocked, seed + i * 29 + wireComplexity * 7);
    }

    const expectedFloor = clamp(
      directDistance + 2 + Math.floor(wireComplexity * 0.65),
      directDistance + 1,
      directDistance + 14
    );
    const reachable = this.bfsMaskGrid(maskGrid, from);
    if (!reachable.has(`${to.x},${to.y}`) || reachable.size < expectedFloor) {
      // Recovery path should avoid collapsing into a single direct line.
      // First add deterministic zig-zag rescue legs, then only hard-fallback to Manhattan if still disconnected.
      const rescueA = {
        x: clamp((seed + wireComplexity * 5 + level * 3) % gridW, 0, gridW - 1),
        y: clamp((seed + wireComplexity * 7 + level * 2) % gridH, 0, gridH - 1)
      };
      const rescueB = {
        x: clamp((seed + Math.floor(gridW / 2) + wireComplexity * 9) % gridW, 0, gridW - 1),
        y: clamp((seed + Math.floor(gridH / 2) + level * 5) % gridH, 0, gridH - 1)
      };

      const rescuePoints = [from, rescueA, rescueB, to]
        .filter((point, idx, arr) => {
          const key = `${point.x},${point.y}`;
          if (idx > 0) {
            const prev = arr[idx - 1];
            if (prev.x === point.x && prev.y === point.y) return false;
          }
          if (key !== `${to.x},${to.y}` && key !== `${from.x},${from.y}` && blocked.has(key)) return false;
          return true;
        });

      for (let i = 0; i < rescuePoints.length - 1; i++) {
        this.connectPathAvoidingBlocked(maskGrid, rescuePoints[i], rescuePoints[i + 1], blocked, seed + 911 + i * 41);
      }

      const recovered = this.bfsMaskGrid(maskGrid, from);
      if (!recovered.has(`${to.x},${to.y}`)) {
        this.connectManhattan(maskGrid, from, to, seed + 997);
      }
    }
  }

  private connectPathAvoidingBlocked(
    maskGrid: number[][],
    from: { x: number; y: number },
    to: { x: number; y: number },
    blocked: Set<string>,
    seed: number
  ) {
    const path = this.findGridPathAvoidingBlocked(from, to, blocked, seed);
    if (!path || path.length < 2) return;

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dir = dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0;
      const opposite = (dir + 2) % 4;
      maskGrid[a.y][a.x] |= BIT(dir);
      maskGrid[b.y][b.x] |= BIT(opposite);
    }
  }

  private findGridPathAvoidingBlocked(
    from: { x: number; y: number },
    to: { x: number; y: number },
    blocked: Set<string>,
    seed: number
  ) {
    const { gridW, gridH } = this.levelConfig;
    const startKey = `${from.x},${from.y}`;
    const endKey = `${to.x},${to.y}`;

    const q: Array<{ x: number; y: number }> = [from];
    const visited = new Set<string>([startKey]);
    const parent = new Map<string, string>();

    const directionOrders = [
      [0, 1, 2, 3],
      [1, 2, 3, 0],
      [2, 3, 0, 1],
      [3, 0, 1, 2]
    ] as const;
    const dirOrder = directionOrders[seed % directionOrders.length];

    while (q.length) {
      const cur = q.shift()!;
      const curKey = `${cur.x},${cur.y}`;
      if (curKey === endKey) break;

      for (const dir of dirOrder) {
        const nx = cur.x + DIRS[dir].dx;
        const ny = cur.y + DIRS[dir].dy;
        if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) continue;
        const key = `${nx},${ny}`;
        if (key !== endKey && blocked.has(key)) continue;
        if (visited.has(key)) continue;
        visited.add(key);
        parent.set(key, curKey);
        q.push({ x: nx, y: ny });
      }
    }

    if (!visited.has(endKey)) return null;

    const path: Array<{ x: number; y: number }> = [];
    let cursor: string | undefined = endKey;
    while (cursor) {
      const [xStr, yStr] = cursor.split(',');
      path.push({ x: Number(xStr), y: Number(yStr) });
      if (cursor === startKey) break;
      cursor = parent.get(cursor);
    }
    path.reverse();
    return path;
  }

  private resolveChannelOverlaps(pipeGrid: number[][], wireGrid: number[][]) {
    const { gridW, gridH } = this.levelConfig;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const isSource = x === this.source.x && y === this.source.y;
        const isPump = x === this.pump.x && y === this.pump.y;
        const isTarget = this.targets.some(t => t.x === x && t.y === y);
        if (isTarget) {
          wireGrid[y][x] = 0;
          continue;
        }
        if (isSource || isPump) continue;

        const hasPipe = pipeGrid[y][x] !== 0;
        const hasWire = wireGrid[y][x] !== 0;
        if (hasPipe && hasWire) {
          // Force separation while keeping wire integrity near upper rows.
          if (y <= 1) {
            pipeGrid[y][x] = 0;
          } else {
            wireGrid[y][x] = 0;
          }
        }
      }
    }
  }

  private findRuntimePath(start: { x: number; y: number }, end: { x: number; y: number }, mode: 'pipe' | 'wire') {
    const startKey = `${start.x},${start.y}`;
    const endKey = `${end.x},${end.y}`;

    const q: Array<{ x: number; y: number }> = [start];
    const visited = new Set<string>([startKey]);
    const parent = new Map<string, string>();

    while (q.length) {
      const cur = q.shift()!;
      const curKey = `${cur.x},${cur.y}`;
      if (curKey === endKey) break;

      const tile = this.tileMap.get(curKey);
      if (!tile) continue;
      const mask = mode === 'pipe' ? tile.pipeMask : tile.wireMask;

      for (let dir = 0; dir < 4; dir++) {
        if ((mask & BIT(dir)) === 0) continue;
        const nx = cur.x + DIRS[dir].dx;
        const ny = cur.y + DIRS[dir].dy;
        const next = this.tileMap.get(`${nx},${ny}`);
        if (!next) continue;
        const nextMask = mode === 'pipe' ? next.pipeMask : next.wireMask;
        const opposite = (dir + 2) % 4;
        if ((nextMask & BIT(opposite)) === 0) continue;

        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        visited.add(key);
        parent.set(key, curKey);
        q.push({ x: nx, y: ny });
      }
    }

    if (!visited.has(endKey)) return null;

    const path: Array<{ x: number; y: number }> = [];
    let cursor: string | undefined = endKey;
    while (cursor) {
      const [xStr, yStr] = cursor.split(',');
      path.push({ x: Number(xStr), y: Number(yStr) });
      if (cursor === startKey) break;
      cursor = parent.get(cursor);
    }

    path.reverse();
    return path;
  }

  private addDeadEnds(maskGrid: number[][], count: number, seed: number) {
    const { gridW, gridH } = this.levelConfig;
    let added = 0;
    let guard = 0;
    while (added < count && guard < 400) {
      guard++;
      const x = (seed + guard * 13) % gridW;
      const y = (seed + guard * 29) % gridH;
      if ((x === this.source.x && y === this.source.y) || (x === this.pump.x && y === this.pump.y)) continue;
      const dir = (seed + guard) % 4;
      const nx = x + DIRS[dir].dx;
      const ny = y + DIRS[dir].dy;
      if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) {
        if ((maskGrid[y][x] & BIT(dir)) === 0) {
          maskGrid[y][x] |= BIT(dir);
          added++;
        }
      }
    }
  }

  private layoutBoard() {
    const { width, height } = this.scale;
    const { gridW, gridH } = this.levelConfig;
    const availableW = width * 0.96;
    const availableH = height * 0.8;
    this.tileSize = Math.floor(Math.min(110, (availableW - (gridW - 1) * 8) / gridW, (availableH - (gridH - 1) * 8) / gridH));
    this.gap = Math.max(2, Math.floor(this.tileSize * 0.04));

    const boardW = gridW * this.tileSize + (gridW - 1) * this.gap;
    const boardH = gridH * this.tileSize + (gridH - 1) * this.gap;
    const startX = (width - boardW) / 2 + this.tileSize / 2;
    const startY = height * 0.1 + (availableH - boardH) / 2 + this.tileSize / 2;

    this.tiles.forEach(tile => {
      tile.shadow.setSize(this.tileSize, this.tileSize);
      tile.bg.setSize(this.tileSize, this.tileSize);
      tile.container.setPosition(startX + tile.x * (this.tileSize + this.gap), startY + tile.y * (this.tileSize + this.gap));
      tile.container.setSize(this.tileSize, this.tileSize);
    });

    if (this.layerToggleContainer) {
      const toggleY = Math.min(height - 26, startY + boardH + Math.max(18, this.tileSize * 0.45));
      const toggleX = width / 2 - 119;
      this.layerToggleContainer.setPosition(toggleX, toggleY);
    }

    this.layoutHud();
  }

  private renderAllTiles() {
    this.renderNowMs = Date.now();
    this.wireDistanceMap = this.isWireEnabled() ? this.computeDistances(this.source, 'wire') : new Map();
    this.pipeDistanceMap = this.isPumpOn ? this.computeDistances(this.pump, 'pipe') : new Map();
    this.pipeWetKeys = this.isPumpOn ? this.getReachedPipeKeys() : new Set();
    this.tiles.forEach(tile => this.drawTile(tile));
  }

  private getReachedPipeKeys() {
    const reached = new Set<string>();
    for (const [key, distance] of this.pipeDistanceMap.entries()) {
      const front = this.getFlowFrontProgress(distance, 'pipe');
      if (front >= 1) reached.add(key);
    }
    return reached;
  }

  private drawTile(tile: RuntimeTile) {
    const r = this.tileSize / 2;
    const wireThickness = Math.max(5, this.tileSize * 0.13);
    const pipeThickness = Math.max(9, this.tileSize * 0.22);
    const g = tile.gfx;
    g.clear();

    const isSource = tile.x === this.source.x && tile.y === this.source.y;
    const isPump = tile.x === this.pump.x && tile.y === this.pump.y;
    const isTarget = this.targets.some(t => t.x === tile.x && t.y === tile.y);
    const targetIndex = this.targets.findIndex(t => t.x === tile.x && t.y === tile.y);
    const targetPalette = [
      { bg: 0xF2DAFF, iconMain: 0xFFFFFF, iconAccent: 0xB76CFF, ring: 0xD48DFF },
      { bg: 0xCCF4FF, iconMain: 0xFFFFFF, iconAccent: 0x47BFFF, ring: 0x79D8FF },
      { bg: 0xFFE7B5, iconMain: 0xFFFDF6, iconAccent: 0xFFAD3F, ring: 0xFFD07A },
      { bg: 0xDBF9CB, iconMain: 0xF8FFF4, iconAccent: 0x67D36A, ring: 0x98EC93 },
      { bg: 0xFFD9D3, iconMain: 0xFFF8F6, iconAccent: 0xFF8A76, ring: 0xFFB2A4 },
      { bg: 0xDDE4FF, iconMain: 0xF9FAFF, iconAccent: 0x7A8DFF, ring: 0xAFBDFF }
    ];
    const targetTheme = isTarget ? targetPalette[targetIndex % targetPalette.length] : null;
    const tileKey = `${tile.x},${tile.y}`;
    const filledTargets = new Set(this.getFilledTargets().map(t => `${t.x},${t.y}`));

    const baseFill = isPump
      ? 0x73D8F2
      : isSource
        ? 0xFFD072
        : isTarget
          ? (targetTheme?.bg ?? 0xE6D9CF)
        : tile.channel === 'obstacle'
          ? 0xB6A597
        : tile.channel === 'wire'
          ? 0xFFE9C9
          : tile.channel === 'pipe'
            ? 0xFFE0B8
            : 0xF8DFC4;
    tile.bg.setFillStyle(baseFill);
    tile.bg.setStrokeStyle(3, 0x78BFE3, tile.locked ? 0.98 : 0.86);

    if (tile.channel === 'obstacle') {
      g.fillStyle(0xB8ABA0, 0.95);
      g.fillCircle(0, 0, r * 0.36);
      g.fillStyle(0xD4C5B8, 0.78);
      g.fillCircle(-r * 0.16, -r * 0.1, r * 0.18);
      g.fillCircle(r * 0.12, r * 0.06, r * 0.15);
      g.lineStyle(4, 0x8D8074, 0.75);
      g.beginPath();
      g.moveTo(-r * 0.34, -r * 0.34);
      g.lineTo(r * 0.34, r * 0.34);
      g.moveTo(r * 0.34, -r * 0.34);
      g.lineTo(-r * 0.34, r * 0.34);
      g.strokePath();
      return;
    }

    const wireLayerVisibility = this.isWireEnabled()
      ? (this.activeLayer === 'wire' ? 1 : 0.04)
      : 0;
    const pipeLayerVisibility = this.activeLayer === 'pipe' ? 1 : 0.04;
    const wireAlpha = 0.98 * wireLayerVisibility;
    const pipeAlpha = 0.98 * pipeLayerVisibility;
    const wetPipe = this.pipeWetKeys.has(tileKey);
    const pipeDistance = this.pipeDistanceMap.get(tileKey);
    const pipeFront = this.getFlowFrontProgress(pipeDistance, 'pipe');
    const pipeFillAlpha = wetPipe ? 1 : clamp(pipeFront * 0.85, 0, 0.85);
    this.drawMask(g, tile.wireMask, 0x695911, wireThickness, r, 'wire', wireAlpha);
    this.drawMask(g, tile.pipeMask, 0x4A9FC7, pipeThickness, r, 'pipe', (0.9 + pipeFillAlpha * 0.1) * pipeLayerVisibility);
    this.drawMask(
      g,
      tile.pipeMask,
      wetPipe ? 0x66EDFF : 0x3DB4CF,
      Math.max(5, pipeThickness * 0.62),
      r,
      'pipe',
      pipeAlpha * (0.2 + pipeFillAlpha * 0.8)
    );
    if (!wetPipe && tile.pipeMask !== 0) {
      this.drawMask(g, tile.pipeMask, 0x2E697A, Math.max(3, pipeThickness * 0.28), r, 'pipe', 0.68 * pipeLayerVisibility);
    }

    const wireFlow = this.getFlowAlpha(this.wireDistanceMap.get(tileKey), 'wire');
    if (wireFlow * wireLayerVisibility > 0.02) {
      this.drawMask(g, tile.wireMask, 0xFFF4B8, Math.max(2.5, wireThickness * 0.46), r, 'wire', clamp((wireFlow + 0.14) * wireLayerVisibility, 0, 1));
      g.lineStyle(2, 0xFFF0A7, clamp((wireFlow + 0.08) * wireLayerVisibility, 0, 0.95));
      g.strokeCircle(0, 0, Math.max(2.2, wireThickness * 0.38));
    }
    const pipeFlow = this.getFlowAlpha(this.pipeDistanceMap.get(tileKey), 'pipe');
    if (pipeFlow * pipeLayerVisibility > 0.02) {
      this.drawMask(g, tile.pipeMask, 0xB2F8FF, Math.max(4, pipeThickness * 0.48), r, 'pipe', pipeFlow * pipeLayerVisibility);
      this.drawPipeFlowParticles(g, tile.pipeMask, r, pipeThickness, pipeFlow * pipeLayerVisibility, tile.id);
    }

    if (isSource) {
      // Generator icon (mint electrical cabinet style)
      const bodyW = r * 1.52;
      const bodyH = r * 1.02;
      const pulse = 0.58 + 0.42 * Math.sin(this.renderNowMs * 0.012);

      // Outer body
      g.fillStyle(0x58CBB4, 0.98);
      g.fillRoundedRect(-bodyW * 0.56, -bodyH * 0.44, bodyW * 1.12, bodyH * 0.88, 8);

      // Side connectors
      g.fillStyle(0x0F5E54, 0.95);
      g.fillRoundedRect(-bodyW * 0.67, -bodyH * 0.28, bodyW * 0.11, bodyH * 0.16, 4);
      g.fillRoundedRect(-bodyW * 0.67, bodyH * 0.12, bodyW * 0.11, bodyH * 0.16, 4);
      g.fillStyle(0x83E5D2, 0.95);
      g.fillRect(-bodyW * 0.64, -bodyH * 0.24, bodyW * 0.04, bodyH * 0.08);
      g.fillRect(-bodyW * 0.64, bodyH * 0.16, bodyW * 0.04, bodyH * 0.08);

      // Cabinet face + divider
      g.fillStyle(0x71DFC7, 0.98);
      g.fillRoundedRect(-bodyW * 0.43, -bodyH * 0.38, bodyW * 0.86, bodyH * 0.76, 5);
      g.fillStyle(0x1F8D79, 0.95);
      g.fillRect(-bodyW * 0.04, -bodyH * 0.38, bodyW * 0.08, bodyH * 0.76);

      // Left panel
      g.fillStyle(0x57D7BE, 0.96);
      g.fillRect(-bodyW * 0.39, -bodyH * 0.34, bodyW * 0.3, bodyH * 0.68);
      g.fillStyle(0x101113, 0.98);
      g.fillRoundedRect(-bodyW * 0.33, -bodyH * 0.2, bodyW * 0.17, bodyH * 0.25, 4);
      g.fillStyle(0xD7D7CC, 0.95);
      g.fillRect(-bodyW * 0.295, -bodyH * 0.145, bodyW * 0.1, bodyH * 0.13);
      g.fillStyle(0x0F5E54, 0.95);
      g.fillRect(-bodyW * 0.31, bodyH * 0.11, bodyW * 0.08, bodyH * 0.06);
      g.fillRect(-bodyW * 0.21, bodyH * 0.11, bodyW * 0.08, bodyH * 0.06);

      // Right panel + bolt
      g.fillStyle(0x7BE7D1, 0.96);
      g.fillRect(bodyW * 0.09, -bodyH * 0.34, bodyW * 0.31, bodyH * 0.68);
      g.fillStyle(0x0C0F12, 0.98);
      g.fillRoundedRect(bodyW * 0.18, -bodyH * 0.16, bodyW * 0.19, bodyH * 0.33, 4);
      g.fillStyle(0xFAE83F, 0.98);
      g.beginPath();
      g.moveTo(bodyW * 0.225, -bodyH * 0.14);
      g.lineTo(bodyW * 0.305, -bodyH * 0.14);
      g.lineTo(bodyW * 0.255, -bodyH * 0.005);
      g.lineTo(bodyW * 0.33, -bodyH * 0.005);
      g.lineTo(bodyW * 0.225, bodyH * 0.15);
      g.lineTo(bodyW * 0.27, bodyH * 0.03);
      g.lineTo(bodyW * 0.21, bodyH * 0.03);
      g.closePath();
      g.fillPath();
      g.fillStyle(0x0F5E54, 0.96);
      g.fillRect(bodyW * 0.14, bodyH * 0.16, bodyW * 0.05, bodyH * 0.07);
      g.fillRect(bodyW * 0.215, bodyH * 0.16, bodyW * 0.05, bodyH * 0.07);
      g.fillRect(bodyW * 0.29, bodyH * 0.16, bodyW * 0.05, bodyH * 0.07);

      // Top vent bar
      g.fillStyle(0x667A8A, 0.95);
      g.fillRect(bodyW * 0.12, -bodyH * 0.62, bodyW * 0.22, bodyH * 0.08);

      // Base + feet
      g.fillStyle(0x3A5164, 0.98);
      g.fillRect(-bodyW * 0.56, bodyH * 0.45, bodyW * 1.12, bodyH * 0.17);
      g.fillStyle(0x889CAB, 0.95);
      g.fillRect(-bodyW * 0.42, bodyH * 0.64, bodyW * 0.19, bodyH * 0.09);
      g.fillRect(bodyW * 0.23, bodyH * 0.64, bodyW * 0.19, bodyH * 0.09);

      if (this.wireDistanceMap.size > 1) {
        g.lineStyle(3, 0xBFFBF0, 0.36 + pulse * 0.36);
        g.strokeRoundedRect(-bodyW * 0.58, -bodyH * 0.46, bodyW * 1.16, bodyH * 0.92, 9);
      }
    }
    if (isPump) {
      // Pump tile visual updated to resemble the provided machine-style pump icon.
      const bodyW = r * 1.42;
      const bodyH = r * 0.98;
      const centerX = 0;
      const centerY = 0;

      // Main cyan body
      g.fillStyle(0x61B8E0, 0.98);
      g.fillRoundedRect(centerX - bodyW * 0.55, centerY - bodyH * 0.5, bodyW * 1.1, bodyH, 10);
      // Right highlight strip
      g.fillStyle(0x4C9BFF, 0.72);
      g.fillRect(centerX + bodyW * 0.36, centerY - bodyH * 0.5, bodyW * 0.12, bodyH);

      // Left intake connector
      g.fillStyle(0x5D5A57, 0.95);
      g.fillRoundedRect(centerX - bodyW * 0.72, centerY - bodyH * 0.26, bodyW * 0.16, bodyH * 0.52, 6);

      // Right dark cap
      g.fillStyle(0x303236, 0.98);
      g.fillRoundedRect(centerX + bodyW * 0.52, centerY - bodyH * 0.5, bodyW * 0.36, bodyH, 8);

      // Right-side bolts/panels
      for (let i = -1; i <= 1; i += 2) {
        const sy = centerY + i * bodyH * 0.22;
        g.fillStyle(0x0F1012, 0.96);
        g.fillRoundedRect(centerX + bodyW * 0.64, sy - bodyH * 0.11, bodyW * 0.14, bodyH * 0.22, 4);
        g.fillStyle(0xE7EEF2, 0.95);
        g.fillRoundedRect(centerX + bodyW * 0.69, sy - bodyH * 0.06, bodyW * 0.05, bodyH * 0.12, 2);
      }

      // Cooling slits on body
      g.lineStyle(Math.max(2, bodyH * 0.06), 0x0A0D10, 0.95);
      for (let i = -2; i <= 2; i++) {
        const y = centerY + i * bodyH * 0.17;
        g.beginPath();
        g.moveTo(centerX - bodyW * 0.24, y);
        g.lineTo(centerX + bodyW * 0.26, y);
        g.strokePath();
      }
      // Bottom feet
      g.fillStyle(0xDDB37C, 0.98);
      g.fillRect(centerX - bodyW * 0.42, centerY + bodyH * 0.58, bodyW * 0.24, bodyH * 0.14);
      g.fillRect(centerX + bodyW * 0.2, centerY + bodyH * 0.58, bodyW * 0.24, bodyH * 0.14);


      // Active glow pulse when powered
      if (this.isPumpOn) {
        const pulse = 0.62 + 0.38 * Math.sin(this.renderNowMs * 0.012);
        g.lineStyle(3, 0xC9F7FF, 0.4 + pulse * 0.3);
        g.strokeRoundedRect(centerX - bodyW * 0.56, centerY - bodyH * 0.52, bodyW * 1.12, bodyH * 1.04, 11);
      }
    }
    if (isTarget) {
      g.lineStyle(3, targetTheme?.ring ?? 0xE8E1D8, 0.9);
      g.strokeRoundedRect(-r * 0.74, -r * 0.74, r * 1.48, r * 1.48, 10);
      const targetType = targetIndex % 3;
      const filled = filledTargets.has(tileKey);
      const scale = 1.35;
      const rr = r * scale;
      const iconMain = targetTheme?.iconMain ?? 0xE7E7E7;
      const iconAccent = targetTheme?.iconAccent ?? 0xB2D5D9;

      if (targetType === 0) {
        // Home
        g.fillStyle(iconMain, 0.92);
        g.fillRect(-rr * 0.22, -rr * 0.05, rr * 0.44, rr * 0.34);
        g.fillStyle(iconAccent, 0.97);
        g.fillTriangle(-rr * 0.27, -rr * 0.04, 0, -rr * 0.30, rr * 0.27, -rr * 0.04);
        g.fillStyle(filled ? 0x7FDFC0 : 0x8C9A7B, 0.85);
        g.fillRect(-rr * 0.05, rr * 0.1, rr * 0.1, rr * 0.19);
      } else if (targetType === 1) {
        // Factory
        g.fillStyle(iconMain, 0.92);
        g.fillRect(-rr * 0.28, -rr * 0.02, rr * 0.56, rr * 0.31);
        g.fillStyle(iconAccent, 0.97);
        g.fillRect(-rr * 0.18, -rr * 0.24, rr * 0.09, rr * 0.22);
        g.fillRect(-rr * 0.04, -rr * 0.2, rr * 0.08, rr * 0.18);
        g.fillRect(rr * 0.08, -rr * 0.16, rr * 0.08, rr * 0.14);
        g.fillStyle(filled ? 0x7FDFC0 : 0x8C9A7B, 0.82);
        g.fillRect(-rr * 0.24, rr * 0.14, rr * 0.48, rr * 0.12);
      } else {
        // Tank destination
        g.fillStyle(iconMain, 0.92);
        g.fillRoundedRect(-rr * 0.24, -rr * 0.24, rr * 0.48, rr * 0.54, 12);
        g.lineStyle(2, iconAccent, 0.95);
        g.strokeRoundedRect(-rr * 0.24, -rr * 0.24, rr * 0.48, rr * 0.54, 12);
        g.fillStyle(filled ? 0x7FDFC0 : 0x8C9A7B, 0.86);
        g.fillRoundedRect(-rr * 0.18, -rr * 0.02, rr * 0.36, rr * 0.25, 8);
      }



      if (filled) {
        g.lineStyle(3, 0xF4F4EF, 0.98);
        g.beginPath();
        g.moveTo(-r * 0.14, r * 0.01);
        g.lineTo(-r * 0.03, r * 0.13);
        g.lineTo(r * 0.15, -r * 0.1);
        g.strokePath();
      }
    }
  }


  private getFlowAlpha(distance: number | undefined, mode: 'pipe' | 'wire') {
    if (distance === undefined) return 0;

    const stepDelayMs = PowerPumpGameScene.FLOW_TILE_DELAY_MS;
    const travel = this.renderNowMs - (mode === 'pipe' ? this.flowPipeStartMs : this.flowWireStartMs) - distance * stepDelayMs;
    if (travel < 0) return 0;

    const wave = 0.5 + 0.5 * Math.sin(travel * (mode === 'pipe' ? 0.008 : 0.011));
    const base = mode === 'pipe' ? 0.28 : 0.22;
    const amp = mode === 'pipe' ? 0.36 : 0.3;
    let alpha = clamp(base + wave * amp, 0, 0.82);
    if (mode === 'wire' && this.activeLayer === 'pipe') {
      alpha *= 0.35;
    }
    if (mode === 'pipe' && this.activeLayer === 'wire') {
      alpha *= 0.55;
    }
    return alpha;
  }

  private getFlowFrontProgress(distance: number | undefined, mode: 'pipe' | 'wire') {
    if (distance === undefined) return 0;
    const stepDelayMs = PowerPumpGameScene.FLOW_TILE_DELAY_MS;
    const travel = this.renderNowMs - (mode === 'pipe' ? this.flowPipeStartMs : this.flowWireStartMs) - distance * stepDelayMs;
    return clamp(travel / stepDelayMs, 0, 1);
  }

  private getMaskDegree(mask: number) {
    let degree = 0;
    for (let dir = 0; dir < 4; dir++) {
      if ((mask & BIT(dir)) !== 0) degree += 1;
    }
    return degree;
  }

  private disconnectMaskEdge(maskGrid: number[][], x: number, y: number, dir: number) {
    if (!maskGrid[y] || maskGrid[y][x] === undefined) return;
    maskGrid[y][x] &= ~BIT(dir);

    const nx = x + DIRS[dir].dx;
    const ny = y + DIRS[dir].dy;
    if (!maskGrid[ny] || maskGrid[ny][nx] === undefined) return;
    const opposite = (dir + 2) % 4;
    maskGrid[ny][nx] &= ~BIT(opposite);
  }

  private reducePipeJunctionComplexity(pipeGrid: number[][], seed: number) {
    const candidates: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.levelConfig.gridH; y++) {
      for (let x = 0; x < this.levelConfig.gridW; x++) {
        const isSpecial = (x === this.source.x && y === this.source.y)
          || (x === this.pump.x && y === this.pump.y)
          || this.targets.some(t => t.x === x && t.y === y);
        if (isSpecial) continue;
        if (this.getMaskDegree(pipeGrid[y][x] ?? 0) >= 3) {
          candidates.push({ x, y });
        }
      }
    }

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = (seed + i * 31) % (i + 1);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const passes = 3;
    for (let pass = 0; pass < passes; pass++) {
      for (const candidate of candidates) {
        const { x, y } = candidate;
        let guard = 0;
        while (this.getMaskDegree(pipeGrid[y][x] ?? 0) > 2 && guard < 10) {
          guard += 1;
          const dirs: number[] = [];
          for (let dir = 0; dir < 4; dir++) {
            if ((pipeGrid[y][x] & BIT(dir)) !== 0) dirs.push(dir);
          }

          const orderedDirs = dirs
            .map(dir => {
              const nx = x + DIRS[dir].dx;
              const ny = y + DIRS[dir].dy;
              const nearestTargetDist = this.targets.reduce((best, t) => {
                const d = Math.abs(nx - t.x) + Math.abs(ny - t.y);
                return Math.min(best, d);
              }, Number.POSITIVE_INFINITY);
              return { dir, score: nearestTargetDist + Math.abs(nx - this.pump.x) + Math.abs(ny - this.pump.y) };
            })
            .sort((a, b) => b.score - a.score);

          let trimmed = false;
          for (const option of orderedDirs) {
            const beforeA = pipeGrid[y][x];
            const nx = x + DIRS[option.dir].dx;
            const ny = y + DIRS[option.dir].dy;
            const beforeB = pipeGrid[ny]?.[nx] ?? 0;
            this.disconnectMaskEdge(pipeGrid, x, y, option.dir);

            if (this.countReachableTargetsInMaskGrid(pipeGrid, this.pump) === this.targets.length) {
              trimmed = true;
              break;
            }

            pipeGrid[y][x] = beforeA;
            if (pipeGrid[ny] && pipeGrid[ny][nx] !== undefined) {
              pipeGrid[ny][nx] = beforeB;
            }
          }

          if (!trimmed) break;
        }
      }
    }
  }

  private reduceWireJunctionComplexity(wireGrid: number[][], seed: number) {
    const candidates: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.levelConfig.gridH; y++) {
      for (let x = 0; x < this.levelConfig.gridW; x++) {
        const isSpecial = (x === this.source.x && y === this.source.y)
          || (x === this.pump.x && y === this.pump.y)
          || this.targets.some(t => t.x === x && t.y === y);
        if (isSpecial) continue;
        if (this.getMaskDegree(wireGrid[y][x] ?? 0) >= 3) {
          candidates.push({ x, y });
        }
      }
    }

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = (seed + i * 23) % (i + 1);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const candidate of candidates) {
      const { x, y } = candidate;
      let guard = 0;
      while (this.getMaskDegree(wireGrid[y][x] ?? 0) > 2 && guard < 8) {
        guard += 1;
        const dirs: number[] = [];
        for (let dir = 0; dir < 4; dir++) {
          if ((wireGrid[y][x] & BIT(dir)) !== 0) dirs.push(dir);
        }

        const orderedDirs = dirs
          .map(dir => {
            const nx = x + DIRS[dir].dx;
            const ny = y + DIRS[dir].dy;
            const sourceDist = Math.abs(nx - this.source.x) + Math.abs(ny - this.source.y);
            const pumpDist = Math.abs(nx - this.pump.x) + Math.abs(ny - this.pump.y);
            return { dir, score: sourceDist + pumpDist };
          })
          .sort((a, b) => b.score - a.score);

        let trimmed = false;
        for (const option of orderedDirs) {
          const beforeA = wireGrid[y][x];
          const nx = x + DIRS[option.dir].dx;
          const ny = y + DIRS[option.dir].dy;
          const beforeB = wireGrid[ny]?.[nx] ?? 0;
          this.disconnectMaskEdge(wireGrid, x, y, option.dir);

          if (this.isMaskGridConnected(wireGrid, this.source, this.pump)) {
            trimmed = true;
            break;
          }

          wireGrid[y][x] = beforeA;
          if (wireGrid[ny] && wireGrid[ny][nx] !== undefined) {
            wireGrid[ny][nx] = beforeB;
          }
        }

        if (!trimmed) break;
      }
    }
  }

  private sparsifyPipeNetwork(pipeGrid: number[][], seed: number) {
    const candidates: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.levelConfig.gridH; y++) {
      for (let x = 0; x < this.levelConfig.gridW; x++) {
        const isSpecial = (x === this.source.x && y === this.source.y)
          || (x === this.pump.x && y === this.pump.y)
          || this.targets.some(t => t.x === x && t.y === y);
        if (isSpecial) continue;
        const mask = pipeGrid[y][x] ?? 0;
        const degree = this.getMaskDegree(mask);
        if (degree > 0 && degree <= 2) {
          candidates.push({ x, y });
        }
      }
    }

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = (seed + i * 19) % (i + 1);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const removeBudget = clamp(2 + Math.floor(this.levelConfig.level / 6), 2, 8);
    let removed = 0;

    for (const candidate of candidates) {
      if (removed >= removeBudget) break;
      const { x, y } = candidate;
      const current = pipeGrid[y][x] ?? 0;
      if (current === 0) continue;

      const neighborState: Array<{ dir: number; x: number; y: number; prev: number }> = [];
      for (let dir = 0; dir < 4; dir++) {
        if ((current & BIT(dir)) === 0) continue;
        const nx = x + DIRS[dir].dx;
        const ny = y + DIRS[dir].dy;
        if (!pipeGrid[ny] || pipeGrid[ny][nx] === undefined) continue;
        neighborState.push({ dir, x: nx, y: ny, prev: pipeGrid[ny][nx] });
      }

      pipeGrid[y][x] = 0;
      for (const neighbor of neighborState) {
        pipeGrid[neighbor.y][neighbor.x] &= ~BIT((neighbor.dir + 2) % 4);
      }

      if (this.countReachableTargetsInMaskGrid(pipeGrid, this.pump) !== this.targets.length) {
        pipeGrid[y][x] = current;
        for (const neighbor of neighborState) {
          pipeGrid[neighbor.y][neighbor.x] = neighbor.prev;
        }
        continue;
      }

      removed += 1;
    }
  }

  private drawPipeFlowParticles(
    g: Phaser.GameObjects.Graphics,
    mask: number,
    r: number,
    thickness: number,
    alpha: number,
    tileId: number
  ) {
    if (mask === 0 || alpha <= 0.02) return;
    const t = this.renderNowMs * 0.0024 + tileId * 0.37;
    const len = r - Math.max(2, thickness * 0.2);

    for (let dir = 0; dir < 4; dir++) {
      if ((mask & BIT(dir)) === 0) continue;
      const progress = (t + dir * 0.17) % 1;
      const ox = DIRS[dir].dx * len * progress;
      const oy = DIRS[dir].dy * len * progress;
      g.fillStyle(0xE8FDFF, clamp(alpha * 0.92, 0, 1));
      g.fillCircle(ox, oy, Math.max(1.8, thickness * 0.11));
    }
  }

  private drawMask(
    g: Phaser.GameObjects.Graphics,
    mask: number,
    color: number,
    thickness: number,
    r: number,
    mode: 'pipe' | 'wire',
    alpha: number
  ) {
    if (mask === 0) return;
    const endDistance = r - Math.max(2, thickness * 0.2);
    const getEnd = (dir: number) => {
      const d = DIRS[dir];
      return {
        x: d.dx * endDistance,
        y: d.dy * endDistance
      };
    };

    if (mode === 'wire') {
      g.lineStyle(thickness + 0.9, 0x4A2E19, alpha * 0.82);
      for (let dir = 0; dir < 4; dir++) {
        if ((mask & BIT(dir)) === 0) continue;
        const { x: endX, y: endY } = getEnd(dir);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(endX, endY);
        g.strokePath();
      }
      g.lineStyle(thickness * 0.56, color, alpha);
    } else {
      g.lineStyle(thickness + 2, 0x3F4A50, alpha * 0.7);
      for (let dir = 0; dir < 4; dir++) {
        if ((mask & BIT(dir)) === 0) continue;
        const { x: endX, y: endY } = getEnd(dir);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(endX, endY);
        g.strokePath();
      }
      g.lineStyle(thickness, color, alpha);
    }
    for (let dir = 0; dir < 4; dir++) {
      if ((mask & BIT(dir)) === 0) continue;
      const { x: endX, y: endY } = getEnd(dir);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(endX, endY);
      g.strokePath();

      g.fillStyle(color, alpha);
      if (mode === 'wire') {
        g.fillCircle(endX, endY, Math.max(1.2, thickness * 0.2));
      } else {
        g.fillCircle(endX, endY, thickness * 0.3);
        g.fillStyle(0xD7E1E5, alpha * 0.65);
        g.fillCircle(endX, endY, thickness * 0.13);
      }
    }
    g.fillStyle(color, alpha);
    if (mode === 'wire') {
      g.fillCircle(0, 0, Math.max(1.2, thickness * 0.22));
    } else {
      g.fillCircle(0, 0, thickness * 0.35);
      g.fillStyle(0xD7E1E5, alpha * 0.65);
      g.fillCircle(0, 0, thickness * 0.15);
    }
  }

  private rotateTile(tile: RuntimeTile) {
    if (!this.levelStarted || tile.locked || this.isSolved) return;

    this.pushHistory();

    this.tapRotateCount += 1;
    this.uniqueTiles.add(tile.id);
    if (this.lastRotatedTileId === tile.id) {
      this.repeatedRotateSameTileCount += 1;
    }
    this.lastRotatedTileId = tile.id;

    if (this.activeLayer === 'pipe') {
      const nextRot = ((tile.pipeRotation + 1) % 4) as Direction;
      tile.pipeRotation = nextRot;
      tile.pipeMask = rotateMask(tile.pipeSolvedMask, nextRot);
    }
    if (this.activeLayer === 'wire' && this.isWireEnabled()) {
      const nextRot = ((tile.wireRotation + 1) % 4) as Direction;
      tile.wireRotation = nextRot;
      tile.wireMask = rotateMask(tile.wireSolvedMask, nextRot);
    }

    this.tweens.add({
      targets: tile.bg,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 70,
      yoyo: true,
      ease: 'Sine.Out',
      onComplete: () => {
        tile.bg.setScale(1);
      }
    });

    try {
      this.sound.play('pp-rotate', { volume: 0.42 });
    } catch {
      // noop
    }

    this.updateDerivedState(true);
  }

  private pushHistory() {
    this.history.push({
      pipeRotations: this.tiles.map(t => t.pipeRotation),
      wireRotations: this.tiles.map(t => t.wireRotation)
    });
    if (this.history.length > 40) this.history.shift();
  }

  private updateDerivedState(fromRotation = false) {
    const now = Date.now();
    const wireDistances = this.isWireEnabled() ? this.computeDistances(this.source, 'wire') : new Map<string, number>();
    const pumpDistance = wireDistances.get(`${this.pump.x},${this.pump.y}`);
    const pumpPowered = this.isWireEnabled() ? this.hasFlowArrived(pumpDistance, 'wire', now) : true;
    const prevPumpOn = this.isPumpOn;

    if (pumpPowered !== prevPumpOn) {
      this.pumpOnTransitions += 1;
      if (pumpPowered && this.firstPumpOnTimeMs === null) {
        this.firstPumpOnTimeMs = Date.now() - this.startTime;
        this.targetsFilledAtPumpOn = this.getFilledTargets(true).length;
      }
      if (pumpPowered) {
        try {
          this.sound.play('pp-pump-on', { volume: 0.55 });
        } catch {
          // noop
        }
      }
    }
    this.isPumpOn = pumpPowered;

    if (!prevPumpOn && this.isPumpOn) {
      if (!this.hasStartedPipeFlow) {
        this.flowPipeStartMs = now;
        this.hasStartedPipeFlow = true;
      }
    }

    const filledTargets = this.getFilledTargetsWithFlow(false, now);
    this.maxTargetsFilled = Math.max(this.maxTargetsFilled, filledTargets.length);

    const leakNow = this.isPumpOn ? this.hasLeak() : false;
    if (fromRotation && leakNow) {
      this.leakEventCount += 1;
      this.cameras.main.shake(80, 0.0015);
      try {
        this.sound.play('pp-leak', { volume: 0.45 });
      } catch {
        // noop
      }
    }
    this.leakActive = leakNow;

    this.renderAllTiles();
    this.refreshTopHud();

    if (!this.isSolved && filledTargets.length >= this.targets.length) {
      this.winLevel();
    }
  }

  private getFilledTargets(ignorePumpState = false) {
    return this.getFilledTargetsWithFlow(ignorePumpState, Date.now());
  }

  private getFilledTargetsWithFlow(ignorePumpState = false, now = Date.now()) {
    if (!ignorePumpState && !this.isPumpOn) return [] as Array<{ x: number; y: number }>;
    const distances = this.computeDistances(this.pump, 'pipe');
    return this.targets.filter(t => {
      const distance = distances.get(`${t.x},${t.y}`);
      return this.hasFlowArrived(distance, 'pipe', now);
    });
  }

  private hasFlowArrived(distance: number | undefined, mode: 'pipe' | 'wire', now = Date.now()) {
    if (distance === undefined) return false;
    const startMs = mode === 'pipe' ? this.flowPipeStartMs : this.flowWireStartMs;
    return now - startMs >= distance * PowerPumpGameScene.FLOW_TILE_DELAY_MS;
  }

  private isWireConnected(a: { x: number; y: number }, b: { x: number; y: number }) {
    if (!this.isWireEnabled()) return false;
    return this.bfs(a, 'wire').has(`${b.x},${b.y}`);
  }

  private bfs(start: { x: number; y: number }, mode: 'pipe' | 'wire') {
    const visited = new Set<string>();
    const q: Array<{ x: number; y: number }> = [start];
    visited.add(`${start.x},${start.y}`);

    while (q.length) {
      const cur = q.shift()!;
      const tile = this.tileMap.get(`${cur.x},${cur.y}`);
      if (!tile) continue;
      const mask = mode === 'pipe' ? tile.pipeMask : tile.wireMask;

      for (let dir = 0; dir < 4; dir++) {
        if ((mask & BIT(dir)) === 0) continue;
        const nx = cur.x + DIRS[dir].dx;
        const ny = cur.y + DIRS[dir].dy;
        const next = this.tileMap.get(`${nx},${ny}`);
        if (!next) continue;
        const nextMask = mode === 'pipe' ? next.pipeMask : next.wireMask;
        const opposite = (dir + 2) % 4;
        if (mode === 'wire' && nx === this.pump.x && ny === this.pump.y) {
          // Pump is a wire sink: allow incoming power without requiring wire mask on pump tile.
        } else if ((nextMask & BIT(opposite)) === 0) {
          continue;
        }
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        visited.add(key);
        q.push({ x: nx, y: ny });
      }
    }
    return visited;
  }

  private computeDistances(start: { x: number; y: number }, mode: 'pipe' | 'wire') {
    const distances = new Map<string, number>();
    const q: Array<{ x: number; y: number; d: number }> = [{ ...start, d: 0 }];
    distances.set(`${start.x},${start.y}`, 0);

    while (q.length) {
      const cur = q.shift()!;
      const tile = this.tileMap.get(`${cur.x},${cur.y}`);
      if (!tile) continue;
      const mask = mode === 'pipe' ? tile.pipeMask : tile.wireMask;

      for (let dir = 0; dir < 4; dir++) {
        if ((mask & BIT(dir)) === 0) continue;
        const nx = cur.x + DIRS[dir].dx;
        const ny = cur.y + DIRS[dir].dy;
        const next = this.tileMap.get(`${nx},${ny}`);
        if (!next) continue;
        const nextMask = mode === 'pipe' ? next.pipeMask : next.wireMask;
        const opposite = (dir + 2) % 4;
        if (mode === 'wire' && nx === this.pump.x && ny === this.pump.y) {
          // Pump is a wire sink: allow incoming power without requiring wire mask on pump tile.
        } else if ((nextMask & BIT(opposite)) === 0) {
          continue;
        }
        const key = `${nx},${ny}`;
        if (distances.has(key)) continue;
        const nd = cur.d + 1;
        distances.set(key, nd);
        q.push({ x: nx, y: ny, d: nd });
      }
    }

    return distances;
  }

  private hasLeak() {
    const wet = this.bfs(this.pump, 'pipe');
    for (const key of wet) {
      const tile = this.tileMap.get(key);
      if (!tile) continue;
      for (let dir = 0; dir < 4; dir++) {
        if ((tile.pipeMask & BIT(dir)) === 0) continue;
        const nx = tile.x + DIRS[dir].dx;
        const ny = tile.y + DIRS[dir].dy;
        const next = this.tileMap.get(`${nx},${ny}`);
        if (!next) return true;
        const opposite = (dir + 2) % 4;
        if ((next.pipeMask & BIT(opposite)) === 0) return true;
      }
    }
    return false;
  }

  private createHud() {
    const { width, height } = this.scale;

    this.wasteText = this.add.text(width / 2, height - 78, '', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '18px',
      color: '#2FA870',
      fontStyle: '700'
    }).setOrigin(0.5, 0).setPadding(10, 6, 10, 6).setDepth(32);
    this.wasteText.setBackgroundColor('#F1FFF5');
    this.wasteText.setVisible(false);

    this.timeWarningText = this.add.text(width / 2, 0, '', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '17px',
      color: '#F04B4B',
      fontStyle: '700'
    }).setOrigin(0.5, 0).setPadding(10, 5, 10, 5).setDepth(33);
    this.timeWarningText.setBackgroundColor('#FFF1F1');
    this.timeWarningText.setVisible(false);

    this.createLayerToggle();
    this.createTimerRing();
    this.layoutHud();
    this.refreshTopHud();
  }

  private createLayerToggle() {
    this.layerToggleContainer = this.add.container(0, 0).setDepth(25);

    this.pipeLayerBg = this.add.rectangle(0, 0, 114, 42, 0xF1DECA).setOrigin(0, 0.5);
    this.pipeLayerBg.setStrokeStyle(2, 0x91D7F6, 0.8);
    this.pipeLayerBg.setInteractive({ useHandCursor: true });
    this.pipeLayerBg.on('pointerdown', () => this.setActiveLayer('pipe'));

    this.wireLayerBg = this.add.rectangle(124, 0, 114, 42, 0xF1DECA).setOrigin(0, 0.5);
    this.wireLayerBg.setStrokeStyle(2, 0xFFCA7E, 0.8);
    this.wireLayerBg.setInteractive({ useHandCursor: true });
    this.wireLayerBg.on('pointerdown', () => this.setActiveLayer('wire'));

    this.pipeLayerText = this.add.text(57, 0, 'ท่อน้ำ', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '16px',
      color: '#2D7FA2',
      fontStyle: '700'
    }).setOrigin(0.5).setPadding(6, 6, 6, 6);

    this.wireLayerText = this.add.text(181, 0, 'สายไฟ', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '16px',
      color: '#B9701E',
      fontStyle: '700'
    }).setOrigin(0.5).setPadding(6, 6, 6, 6);

    this.layerToggleContainer.add([
      this.pipeLayerBg,
      this.wireLayerBg,
      this.pipeLayerText,
      this.wireLayerText
    ]);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.layerHintTween?.stop();
      this.layerHintTween?.remove();
      this.layerHintTween = undefined;
    });

    this.refreshLayerToggleVisual();
  }

  private setActiveLayer(layer: 'pipe' | 'wire') {
    if (layer === 'wire' && !this.isWireEnabled()) return;
    if (this.activeLayer === layer) return;
    this.activeLayer = layer;
    this.refreshLayerToggleVisual();
    this.renderAllTiles();
  }

  private refreshLayerToggleVisual() {
    if (!this.pipeLayerBg || !this.wireLayerBg || !this.pipeLayerText || !this.wireLayerText) return;
    if (!this.isWireEnabled()) {
      this.activeLayer = 'pipe';
      this.layerHintTween?.stop();
      this.layerHintTween?.remove();
      this.layerHintTween = undefined;

      this.wireLayerBg.disableInteractive();
      this.wireLayerBg.setVisible(false);
      this.wireLayerText.setVisible(false);

      this.pipeLayerBg.setFillStyle(0x46CCF2, 0.98);
      this.pipeLayerBg.setStrokeStyle(2, 0xE9FBFF, 0.98);
      this.pipeLayerText.setColor('#FFFFFF');
      this.pipeLayerBg.setAlpha(1);
      this.pipeLayerText.setAlpha(1);
      this.pipeLayerBg.setScale(1);
      this.pipeLayerText.setScale(1);
      return;
    }

    this.wireLayerBg.setVisible(true);
    this.wireLayerText.setVisible(true);
    this.wireLayerBg.setInteractive({ useHandCursor: true });

    const pipeActive = this.activeLayer === 'pipe';

    this.layerHintTween?.stop();
    this.layerHintTween?.remove();
    this.layerHintTween = undefined;

    this.pipeLayerBg.setScale(1);
    this.wireLayerBg.setScale(1);
    this.pipeLayerText.setScale(1);
    this.wireLayerText.setScale(1);
    this.pipeLayerBg.setAlpha(1);
    this.wireLayerBg.setAlpha(1);
    this.pipeLayerText.setAlpha(1);
    this.wireLayerText.setAlpha(1);

    this.pipeLayerBg.setFillStyle(pipeActive ? 0x46CCF2 : 0xFFEFD9, pipeActive ? 0.98 : 0.94);
    this.pipeLayerBg.setStrokeStyle(2, pipeActive ? 0xE9FBFF : 0x9FCDE2, pipeActive ? 0.98 : 0.68);
    this.pipeLayerText.setColor(pipeActive ? '#FFFFFF' : '#4A8AA6');

    this.wireLayerBg.setFillStyle(!pipeActive ? 0xFFB24F : 0xFFEFD9, !pipeActive ? 0.98 : 0.94);
    this.wireLayerBg.setStrokeStyle(2, !pipeActive ? 0xFFEAC5 : 0xE4C198, !pipeActive ? 0.98 : 0.68);
    this.wireLayerText.setColor(!pipeActive ? '#FFFFFF' : '#A5722D');

    const unselectedBg = pipeActive ? this.wireLayerBg : this.pipeLayerBg;
    const unselectedText = pipeActive ? this.wireLayerText : this.pipeLayerText;
    this.layerHintTween = this.tweens.add({
      targets: [unselectedBg, unselectedText],
      scaleX: 1.04,
      scaleY: 1.04,
      alpha: 0.82,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  private layoutHud() {
    const { width } = this.scale;
    const boardTop = this.tiles.length > 0
      ? Math.min(...this.tiles.map(tile => tile.container.y - this.tileSize / 2))
      : 120;
    const hudTop = Math.max(8, boardTop - 62);

    this.wasteText.setPosition(width / 2, hudTop);
    this.timeWarningText?.setPosition(width / 2, hudTop + 32);
    this.updateTimerRing();
  }

  private createTimerRing() {
    this.timerContainer = this.add.container(0, 0).setDepth(20);
    this.timerBar = this.add.graphics();
    this.timerText = this.add.text(0, 0, '', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '16px',
      color: '#2F89AD',
      fontStyle: '700'
    }).setOrigin(0.5);
    this.timerContainer.add([this.timerBar, this.timerText]);
  }

  private updateTimerRing() {
    if (!this.timerBar || !this.timerText) return;
    const { width } = this.scale;
    const radius = Math.min(30, Math.max(22, width * 0.035));
    const thickness = Math.max(5, radius * 0.28);
    const margin = Math.max(14, radius * 0.55);
    const x = width - margin - radius;
    const y = margin + radius;

    const elapsed = Date.now() - this.startTime;
    const limitMs = this.levelConfig.targetTimeMs;
    const remainingMs = limitMs - elapsed;
    const pct = clamp((remainingMs / limitMs) * 100, 0, 100);
    const remainingSec = Math.ceil(Math.max(0, remainingMs) / 1000);
    const overSec = Math.ceil(Math.max(0, -remainingMs) / 1000);
    const isWarning = pct <= 25 || remainingMs <= 0;
    const criticalTime = remainingMs > 0 && remainingMs <= 10000;

    this.timerBar.clear();
    this.timerBar.lineStyle(thickness, 0xC8E8F7, 0.62);
    this.timerBar.strokeCircle(x, y, radius);
    if (pct > 0) {
      const ringColor = criticalTime
        ? 0xF04B4B
        : isWarning
          ? 0xF58862
          : 0x4BC7ED;
      const ringAlpha = criticalTime ? 0.8 + 0.2 * Math.sin(Date.now() * 0.015) : 0.98;
      this.timerBar.lineStyle(thickness, ringColor, ringAlpha);
      this.timerBar.beginPath();
      this.timerBar.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100, false);
      this.timerBar.strokePath();
    }
    this.timerText.setPosition(x, y);
    this.timerText.setText(remainingMs >= 0 ? `${remainingSec}` : `-${overSec}`);
    this.timerText.setColor(criticalTime ? '#E64040' : isWarning ? '#EE6C4A' : '#237FA1');

    if (this.timeWarningText) {
      if (criticalTime && !this.isSolved) {
        this.timeWarningText.setText('⚠️ ใกล้หมดเวลา!');
        this.timeWarningText.setVisible(true);
      } else {
        this.timeWarningText.setVisible(false);
      }
    }
  }

  private refreshTopHud() {
    const filled = this.getFilledTargets().length;
    const showWaste = this.isDrainSystemEnabled() && this.isPumpOn && filled < this.targets.length;
    if (!showWaste) {
      this.wasteText.setText('');
      this.wasteText.setVisible(false);
      return;
    }

    const wasteSec = Math.round(this.wasteMs / 1000);
    this.wasteText.setText(`⚠️ น้ำไหลออกไปแล้ว: ${wasteSec} วินาที`);
    this.wasteText.setVisible(true);

    if (wasteSec > 5) {
      this.wasteText.setColor('#E64040');
      this.wasteText.setBackgroundColor('#FFF1F1');
    } else if (wasteSec >= 3) {
      this.wasteText.setColor('#C48A00');
      this.wasteText.setBackgroundColor('#FFF9E8');
    } else {
      this.wasteText.setColor('#2FA870');
      this.wasteText.setBackgroundColor('#F1FFF5');
    }
  }

  private winLevel() {
    if (this.isSolved) return;
    this.isSolved = true;
    const end = Date.now();
    const totalTimeMs = end - this.startTime;
    const stars = calculatePowerPumpStars({
      completionState: 'win',
      tapRotateCount: this.tapRotateCount,
      parRotations: this.levelConfig.parRotations,
      wasteMs: this.wasteMs,
      parWasteMs: this.levelConfig.parWasteMs,
      totalTimeMs,
      targetTimeMs: this.levelConfig.targetTimeMs
    });

    const payload: PowerPumpGameStats = {
      levelId: this.levelConfig.level,
      levelStartTimeMs: this.startTime,
      levelEndTimeMs: end,
      totalTimeMs,
      targetTimeMs: this.levelConfig.targetTimeMs,
      overtimeMs: Math.max(0, totalTimeMs - this.levelConfig.targetTimeMs),
      tapRotateCount: this.tapRotateCount,
      uniqueTilesRotatedCount: this.uniqueTiles.size,
      repeatedRotateSameTileCount: this.repeatedRotateSameTileCount,
      undoCount: this.undoCount,
      resetCount: this.resetCount,
      hintUsedCount: this.hintUsedCount,
      pumpOnTransitions: this.pumpOnTransitions,
      pumpOnMs: this.pumpOnMs,
      wasteMs: this.wasteMs,
      firstPumpOnTimeMs: this.firstPumpOnTimeMs,
      targetsTotal: this.targets.length,
      targetsFilledMax: this.maxTargetsFilled,
      targetsFilledAtPumpOn: this.targetsFilledAtPumpOn,
      leakEventCount: this.leakEventCount,
      completionState: 'win',
      starsEarned: stars,
      parRotations: this.levelConfig.parRotations,
      parWasteMs: this.levelConfig.parWasteMs
    };

    try {
      this.sound.play('level-pass', { volume: 0.7 });
    } catch {
      // noop
    }

    const onGameOver = this.registry.get('onGameOver');
    if (onGameOver) {
      onGameOver({
        ...payload,
        stars: stars,
        starHint: stars === 2
          ? 'ใกล้ได้ 3 ดาวแล้ว! ลองลดจำนวนครั้งที่หมุนเกินจำเป็น'
          : stars === 1
            ? 'ลองวางแผนให้พร้อมก่อน แล้วค่อยเปิดปั๊มเป็นขั้นตอนสุดท้าย'
            : null,
        success: true
      });
    }
  }

}
