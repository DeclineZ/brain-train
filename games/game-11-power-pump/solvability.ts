import { POWER_PUMP_LEVELS, getPowerPumpLevel } from './levels';
import type { PowerPumpLevelConfig } from './types';

const DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 }
] as const;

const BIT = (dir: number) => 1 << dir;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type Point = { x: number; y: number };

function manhattanDistance(a: Point, b: Point) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isEdgeCell(point: Point, gridW: number, gridH: number) {
  return point.x === 0 || point.y === 0 || point.x === gridW - 1 || point.y === gridH - 1;
}

function isAdjacent(a: Point, b: Point) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

function isPumpAdjacentToAnyTarget(pump: Point, targets: Point[]) {
  return targets.some(target => isAdjacent(pump, target));
}

export type PowerPumpLevelSolution = {
  level: number;
  gridW: number;
  gridH: number;
  source: Point;
  pump: Point;
  targets: Point[];
  pipeSolvedMasks: number[][];
  wireSolvedMasks: number[][];
};

export type PowerPumpSolvabilityReport = {
  level: number;
  isSolvable: boolean;
  issues: string[];
  solution: PowerPumpLevelSolution;
};

function connectManhattan(maskGrid: number[][], from: Point, to: Point) {
  let cx = from.x;
  let cy = from.y;
  while (cx !== to.x) {
    const nx = cx + (to.x > cx ? 1 : -1);
    const d1 = to.x > cx ? 1 : 3;
    const d2 = (d1 + 2) % 4;
    maskGrid[cy][cx] |= BIT(d1);
    maskGrid[cy][nx] |= BIT(d2);
    cx = nx;
  }
  while (cy !== to.y) {
    const ny = cy + (to.y > cy ? 1 : -1);
    const d1 = to.y > cy ? 2 : 0;
    const d2 = (d1 + 2) % 4;
    maskGrid[cy][cx] |= BIT(d1);
    maskGrid[ny][cx] |= BIT(d2);
    cy = ny;
  }
}

function connectManhattanSeeded(maskGrid: number[][], from: Point, to: Point, seed: number) {
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

function generateTargets(source: Point, pump: Point, gridW: number, gridH: number, count: number, seed: number) {
  const cells: Point[] = [];
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const point = { x, y };
      const isSource = x === source.x && y === source.y;
      const isPump = x === pump.x && y === pump.y;
      const touchesSource = isAdjacent(point, source);
      const touchesPump = isAdjacent(point, pump);
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

function enforcePumpTargetSpacing(source: Point, pump: Point, targets: Point[], gridW: number, gridH: number, seed: number) {
  if (!isPumpAdjacentToAnyTarget(pump, targets)) return targets;

  const nextTargets = [...targets];
  const occupied = new Set<string>([
    `${source.x},${source.y}`,
    `${pump.x},${pump.y}`,
    ...targets.map(target => `${target.x},${target.y}`)
  ]);

  for (let i = 0; i < nextTargets.length; i++) {
    const target = nextTargets[i];
    if (!isAdjacent(target, pump)) continue;

    occupied.delete(`${target.x},${target.y}`);
    let replacement: Point | null = null;
    for (let attempt = 0; attempt < gridW * gridH * 2; attempt++) {
      const x = (seed + i * 29 + attempt * 17) % gridW;
      const y = (seed + i * 37 + attempt * 13) % gridH;
      const candidate = { x, y };
      const key = `${x},${y}`;
      if (occupied.has(key)) continue;
      if (isAdjacent(candidate, source) || isAdjacent(candidate, pump)) continue;
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

function pickEndpoints(gridW: number, gridH: number, seed: number) {
  const candidateCells: Point[] = [];
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

  const minDistance = candidateCells.length <= 4
    ? 1
    : Math.max(2, Math.floor((gridW + gridH) / 4));

  const preferInterior = gridW >= 5 && gridH >= 5;
  const endpointCandidates = preferInterior
    ? candidateCells.filter(cell => !isEdgeCell(cell, gridW, gridH))
    : candidateCells;

  const searchCells = endpointCandidates.length >= 2 ? endpointCandidates : candidateCells;

  const fallbackSourceIndex = seed % candidateCells.length;
  let fallbackPumpIndex = (seed * 7 + 11) % candidateCells.length;
  if (fallbackPumpIndex === fallbackSourceIndex) {
    fallbackPumpIndex = (fallbackPumpIndex + 1) % candidateCells.length;
  }
  const fallbackSource = candidateCells[fallbackSourceIndex] ?? { x: 0, y: 0 };
  const fallbackPump = candidateCells[fallbackPumpIndex] ?? { x: Math.max(0, gridW - 1), y: Math.max(0, gridH - 1) };

  let bestSource = fallbackSource;
  let bestPump = fallbackPump;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let si = 0; si < searchCells.length; si++) {
    const sourceCandidate = searchCells[si];
    for (let pi = 0; pi < searchCells.length; pi++) {
      const pumpCandidate = searchCells[pi];
      if (si === pi) continue;

      const dist = manhattanDistance(sourceCandidate, pumpCandidate);
      if (dist < minDistance) continue;
      const sameAxisPenalty = (sourceCandidate.x === pumpCandidate.x || sourceCandidate.y === pumpCandidate.y) ? 6 : 0;
      const edgePenalty = (isEdgeCell(sourceCandidate, gridW, gridH) ? 8 : 0)
        + (isEdgeCell(pumpCandidate, gridW, gridH) ? 8 : 0);
      const sourceEdgeDistance = Math.min(sourceCandidate.x, gridW - 1 - sourceCandidate.x, sourceCandidate.y, gridH - 1 - sourceCandidate.y);
      const pumpEdgeDistance = Math.min(pumpCandidate.x, gridW - 1 - pumpCandidate.x, pumpCandidate.y, gridH - 1 - pumpCandidate.y);
      const interiorBonus = (sourceEdgeDistance + pumpEdgeDistance) * 2;
      const tieBreaker = ((seed + si * 17 + pi * 31) % 11) * 0.01;

      const score = dist * 10 + interiorBonus - sameAxisPenalty - edgePenalty + tieBreaker;
      if (score > bestScore) {
        bestScore = score;
        bestSource = sourceCandidate;
        bestPump = pumpCandidate;
      }
    }
  }

  if (bestScore === Number.NEGATIVE_INFINITY) {
    return { source: fallbackSource, pump: fallbackPump };
  }

  return { source: bestSource, pump: bestPump };
}

function connectPipeRoute(maskGrid: number[][], levelConfig: PowerPumpLevelConfig, from: Point, to: Point, seed: number) {
  const { gridW, gridH, level } = levelConfig;
  const points: Point[] = [from];

  if (from.y === 0 && gridH > 1) {
    points.push({ x: from.x, y: 1 });
  }

  const bendCount = clamp(2 + Math.floor(level / 8), 2, 5);
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
    connectManhattanSeeded(maskGrid, points[i], points[i + 1], seed + i * 23);
  }
}

function connectWireRoute(maskGrid: number[][], levelConfig: PowerPumpLevelConfig, from: Point, to: Point, seed: number) {
  const { gridW, gridH, level, wireComplexity } = levelConfig;

  if (gridH <= 1) {
    connectManhattan(maskGrid, from, to);
    return;
  }

  const directDistance = manhattanDistance(from, to);
  const points: Point[] = [from];
  const used = new Set<string>([`${from.x},${from.y}`]);

  const pushPoint = (candidate: Point) => {
    const key = `${candidate.x},${candidate.y}`;
    if (used.has(key)) return;
    const prev = points[points.length - 1];
    if (prev.x === candidate.x && prev.y === candidate.y) return;
    points.push(candidate);
    used.add(key);
  };

  // Use pipe-style waypoint generation as the base, then add extra detours.
  const baseBendCount = clamp(3 + Math.floor(level / 6), 3, 7);
  const bonusBends = clamp(Math.floor(wireComplexity / 4) + Math.floor(level / 10), 1, 5);
  const bendCount = clamp(baseBendCount + bonusBends, 4, Math.max(8, Math.floor(gridW * gridH * 0.56)));

  if (from.y === 0 && gridH > 1) {
    pushPoint({ x: from.x, y: 1 });
  }

  const corners: Point[] = [
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
  if (scenicCorner) pushPoint(scenicCorner);

  for (let i = 0; i < bendCount; i++) {
    const wx = clamp((seed + i * 37 + (i % 3) * (wireComplexity + 11)) % gridW, 0, gridW - 1);
    const wy = clamp((seed + i * 53 + i * 19 + (i % 2) * (wireComplexity + 7)) % gridH, 0, gridH - 1);
    pushPoint({ x: wx, y: wy });
  }

  // Additional detour layer for more complex wire puzzle shape.
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
    connectManhattanSeeded(maskGrid, points[i], points[i + 1], seed + i * 29 + wireComplexity * 7);
  }

  const expectedFloor = clamp(
    directDistance + 2 + Math.floor(wireComplexity * 0.65),
    directDistance + 1,
    directDistance + 14
  );
  const reachable = bfsMaskGrid(maskGrid, from);
  const minTurns = clamp(1 + Math.floor(wireComplexity / 5) + Math.floor(level / 14), 1, 5);
  const turns = countPathTurnsInMaskGrid(maskGrid, from, to);

  if (!reachable.has(`${to.x},${to.y}`) || reachable.size < expectedFloor || turns < minTurns) {
    const rescueA: Point = {
      x: clamp((seed + wireComplexity * 5 + level * 3) % gridW, 0, gridW - 1),
      y: clamp((seed + wireComplexity * 7 + level * 2) % gridH, 0, gridH - 1)
    };
    const rescueB: Point = {
      x: clamp((seed + Math.floor(gridW / 2) + wireComplexity * 9) % gridW, 0, gridW - 1),
      y: clamp((seed + Math.floor(gridH / 2) + level * 5) % gridH, 0, gridH - 1)
    };

    if (rescueA.x === from.x && rescueA.x === to.x && gridW > 1) rescueA.x = (rescueA.x + 1) % gridW;
    if (rescueA.y === from.y && rescueA.y === to.y && gridH > 1) rescueA.y = (rescueA.y + 1) % gridH;
    if (rescueB.x === from.x && rescueB.x === to.x && gridW > 1) rescueB.x = (rescueB.x + 1) % gridW;
    if (rescueB.y === from.y && rescueB.y === to.y && gridH > 1) rescueB.y = (rescueB.y + 1) % gridH;

    const rescuePoints = [from, rescueA, rescueB, to]
      .filter((point, idx, arr) => {
        if (idx > 0) {
          const prev = arr[idx - 1];
          if (prev.x === point.x && prev.y === point.y) return false;
        }
        return true;
      });

    for (let i = 0; i < rescuePoints.length - 1; i++) {
      connectManhattanSeeded(maskGrid, rescuePoints[i], rescuePoints[i + 1], seed + 911 + i * 41);
    }

    const recovered = bfsMaskGrid(maskGrid, from);
    const recoveredTurns = countPathTurnsInMaskGrid(maskGrid, from, to);
    if (!recovered.has(`${to.x},${to.y}`) || recoveredTurns < 1) {
      connectManhattan(maskGrid, from, to);
    }
  }
}

function findPathInMaskGrid(maskGrid: number[][], start: Point, end: Point) {
  const startKey = `${start.x},${start.y}`;
  const endKey = `${end.x},${end.y}`;

  const q: Point[] = [start];
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

  const path: Point[] = [];
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

function countPathTurns(path: Point[] | null) {
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

function countPathTurnsInMaskGrid(maskGrid: number[][], start: Point, end: Point) {
  const path = findPathInMaskGrid(maskGrid, start, end);
  return countPathTurns(path);
}

function resolveChannelOverlaps(pipeGrid: number[][], wireGrid: number[][], source: Point, pump: Point, targets: Point[]) {
  const gridH = pipeGrid.length;
  const gridW = pipeGrid[0]?.length ?? 0;

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const isSource = x === source.x && y === source.y;
      const isPump = x === pump.x && y === pump.y;
      const isTarget = targets.some(t => t.x === x && t.y === y);
      if (isSource || isPump || isTarget) continue;

      const hasPipe = pipeGrid[y][x] !== 0;
      const hasWire = wireGrid[y][x] !== 0;
      if (hasPipe && hasWire) {
        if (y <= 1) {
          pipeGrid[y][x] = 0;
        } else {
          wireGrid[y][x] = 0;
        }
      }
    }
  }
}

function enforceGeneratorPipeSpacing(pipeGrid: number[][], source: Point) {
  for (let dir = 0; dir < 4; dir++) {
    const nx = source.x + DIRS[dir].dx;
    const ny = source.y + DIRS[dir].dy;
    if (!pipeGrid[ny] || pipeGrid[ny][nx] === undefined) continue;
    const opposite = (dir + 2) % 4;
    pipeGrid[ny][nx] &= ~BIT(opposite);
  }
}

function addDeadEnds(maskGrid: number[][], source: Point, pump: Point, count: number, seed: number) {
  const gridH = maskGrid.length;
  const gridW = maskGrid[0]?.length ?? 0;

  let added = 0;
  let guard = 0;
  while (added < count && guard < 400) {
    guard++;
    const x = (seed + guard * 13) % gridW;
    const y = (seed + guard * 29) % gridH;
    if ((x === source.x && y === source.y) || (x === pump.x && y === pump.y)) continue;
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

function isMaskGridConnected(maskGrid: number[][], start: Point, end: Point) {
  const visited = bfsMaskGrid(maskGrid, start);
  return visited.has(`${end.x},${end.y}`);
}

function enforceWireBackboneConnected(wireGrid: number[][], source: Point, pump: Point) {
  if (isMaskGridConnected(wireGrid, source, pump)) return;
  connectManhattan(wireGrid, source, pump);
}

function enforceSingleSourceWirePort(
  wireGrid: number[][],
  levelConfig: PowerPumpLevelConfig,
  source: Point,
  pump: Point
) {
  const { x, y } = source;
  const currentMask = wireGrid[y]?.[x] ?? 0;
  if (currentMask === 0) {
    connectWireRoute(wireGrid, levelConfig, source, pump, levelConfig.seed + 2333);
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

    if (!isWireGridStrictlyValid(testGrid, source, pump)) continue;

    const turns = countPathTurnsInMaskGrid(testGrid, source, pump);
    const distance = Math.abs(nx - pump.x) + Math.abs(ny - pump.y);
    if (turns > bestTurns || (turns === bestTurns && distance < bestDistance)) {
      bestTurns = turns;
      bestDistance = distance;
      chosenDir = dir;
    }
  }

  if (chosenDir < 0) {
    for (let yy = 0; yy < wireGrid.length; yy++) {
      for (let xx = 0; xx < (wireGrid[0]?.length ?? 0); xx++) {
        wireGrid[yy][xx] = 0;
      }
    }
    connectManhattan(wireGrid, source, pump);
    chosenDir = source.x < pump.x ? 1 : source.x > pump.x ? 3 : source.y < pump.y ? 2 : 0;
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

function reduceWireJunctionComplexity(
  wireGrid: number[][],
  source: Point,
  pump: Point,
  targets: Point[],
  seed: number
) {
  const candidates: Point[] = [];
  for (let y = 0; y < wireGrid.length; y++) {
    for (let x = 0; x < (wireGrid[0]?.length ?? 0); x++) {
      const isSpecial = (x === source.x && y === source.y)
        || (x === pump.x && y === pump.y)
        || targets.some(t => t.x === x && t.y === y);
      if (isSpecial) continue;
      if (getMaskDegree(wireGrid[y][x] ?? 0) >= 3) {
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
    while (getMaskDegree(wireGrid[y][x] ?? 0) > 2 && guard < 8) {
      guard += 1;

      const dirs: number[] = [];
      for (let dir = 0; dir < 4; dir++) {
        if ((wireGrid[y][x] & BIT(dir)) !== 0) dirs.push(dir);
      }

      const orderedDirs = dirs
        .map(dir => {
          const nx = x + DIRS[dir].dx;
          const ny = y + DIRS[dir].dy;
          const sourceDist = Math.abs(nx - source.x) + Math.abs(ny - source.y);
          const pumpDist = Math.abs(nx - pump.x) + Math.abs(ny - pump.y);
          return { dir, score: sourceDist + pumpDist };
        })
        .sort((a, b) => b.score - a.score);

      let trimmed = false;
      for (const option of orderedDirs) {
        const beforeA = wireGrid[y][x];
        const nx = x + DIRS[option.dir].dx;
        const ny = y + DIRS[option.dir].dy;
        const beforeB = wireGrid[ny]?.[nx] ?? 0;

        disconnectMaskEdge(wireGrid, x, y, option.dir);

        if (isMaskGridConnected(wireGrid, source, pump)) {
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

function ensurePipeTargetsReachable(pipeGrid: number[][], levelConfig: PowerPumpLevelConfig, pump: Point, targets: Point[]) {
  const maxAttempts = Math.max(6, targets.length * 4);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const visited = bfsMaskGrid(pipeGrid, pump);
    const missing = targets.filter(target => !visited.has(`${target.x},${target.y}`));
    if (missing.length === 0) return;

    missing.forEach((target, idx) => {
      connectPipeRoute(
        pipeGrid,
        levelConfig,
        pump,
        target,
        levelConfig.seed + 1301 + attempt * 211 + idx * 97
      );
    });
  }
}

function forceReconnectUnreachableTargets(
  pipeGrid: number[][],
  levelConfig: PowerPumpLevelConfig,
  pump: Point,
  targets: Point[],
  seed: number
) {
  const visited = bfsMaskGrid(pipeGrid, pump);
  targets.forEach((target, idx) => {
    const key = `${target.x},${target.y}`;
    const targetMask = pipeGrid[target.y]?.[target.x] ?? 0;
    if (visited.has(key) && targetMask !== 0) return;
    connectPipeRoute(pipeGrid, levelConfig, pump, target, seed + idx * 131);
  });
}

function enforceDestinationInlets(pipeGrid: number[][], pump: Point, targets: Point[]) {
  const blockedTargets = new Set(targets.map(t => `${t.x},${t.y}`));
  const reachableFromPump = bfsMaskGridWithBlocked(pipeGrid, pump, blockedTargets);
  const isTargetCell = (x: number, y: number) => targets.some(t => t.x === x && t.y === y);

  for (const target of targets) {
    const { x, y } = target;
    const currentMask = pipeGrid[y]?.[x] ?? 0;
    if (currentMask === 0) continue;

    let chosenDir = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let dir = 0; dir < 4; dir++) {
      if ((currentMask & BIT(dir)) === 0) continue;
      const nx = x + DIRS[dir].dx;
      const ny = y + DIRS[dir].dy;
      // Prevent target-to-target inlet links (can isolate both targets).
      if (isTargetCell(nx, ny)) continue;
      const neighborMask = pipeGrid[ny]?.[nx] ?? 0;
      if ((neighborMask & BIT((dir + 2) % 4)) === 0) continue;
      if (!reachableFromPump.has(`${nx},${ny}`)) continue;
      const score = Math.abs(nx - pump.x) + Math.abs(ny - pump.y);
      if (score < bestScore) {
        bestScore = score;
        chosenDir = dir;
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

function countReachableTargetsInMaskGrid(maskGrid: number[][], start: Point, targets: Point[]) {
  const visited = bfsMaskGrid(maskGrid, start);
  let count = 0;
  for (const target of targets) {
    if (visited.has(`${target.x},${target.y}`)) count += 1;
  }
  return count;
}

function hasBrokenEdgeInVisited(maskGrid: number[][], visited: Set<string>) {
  for (const key of visited) {
    const [xStr, yStr] = key.split(',');
    const x = Number(xStr);
    const y = Number(yStr);
    const mask = maskGrid[y]?.[x] ?? 0;
    for (let dir = 0; dir < 4; dir++) {
      if ((mask & BIT(dir)) === 0) continue;
      const nx = x + DIRS[dir].dx;
      const ny = y + DIRS[dir].dy;
      const neighborMask = maskGrid[ny]?.[nx] ?? 0;
      if ((neighborMask & BIT((dir + 2) % 4)) === 0) return true;
    }
  }
  return false;
}

function hasReachableDeadEnds(maskGrid: number[][], pump: Point, targets: Point[]) {
  const visited = bfsMaskGrid(maskGrid, pump);
  const targetSet = new Set(targets.map(t => `${t.x},${t.y}`));
  const pumpKey = `${pump.x},${pump.y}`;

  for (const key of visited) {
    if (key === pumpKey || targetSet.has(key)) continue;
    const [xStr, yStr] = key.split(',');
    const x = Number(xStr);
    const y = Number(yStr);
    const degree = getMaskDegree(maskGrid[y]?.[x] ?? 0);
    if (degree <= 1) return true;
  }
  return false;
}

function normalizeBrokenVisitedEdges(maskGrid: number[][], pump: Point) {
  const visited = bfsMaskGrid(maskGrid, pump);
  for (const key of visited) {
    const [xStr, yStr] = key.split(',');
    const x = Number(xStr);
    const y = Number(yStr);
    const mask = maskGrid[y]?.[x] ?? 0;
    for (let dir = 0; dir < 4; dir++) {
      if ((mask & BIT(dir)) === 0) continue;
      const nx = x + DIRS[dir].dx;
      const ny = y + DIRS[dir].dy;
      const neighborMask = maskGrid[ny]?.[nx] ?? 0;
      if ((neighborMask & BIT((dir + 2) % 4)) === 0) {
        disconnectMaskEdge(maskGrid, x, y, dir);
      }
    }
  }
}

function isPipeNetworkStrictlyValid(pipeGrid: number[][], pump: Point, targets: Point[]) {
  const pumpMask = pipeGrid[pump.y]?.[pump.x] ?? 0;
  if (getMaskDegree(pumpMask) !== 1) return false;

  const visited = bfsMaskGrid(pipeGrid, pump);
  for (const target of targets) {
    if (!visited.has(`${target.x},${target.y}`)) return false;
    if (!isTargetInletValid(pipeGrid, pump, targets, target)) return false;
  }

  if (hasBrokenEdgeInVisited(pipeGrid, visited)) return false;
  if (hasReachableDeadEnds(pipeGrid, pump, targets)) return false;

  return true;
}

function isWireGridStrictlyValid(wireGrid: number[][], source: Point, pump: Point) {
  const sourceMask = wireGrid[source.y]?.[source.x] ?? 0;
  if (getMaskDegree(sourceMask) !== 1) return false;
  const visited = bfsMaskGrid(wireGrid, source);
  if (!visited.has(`${pump.x},${pump.y}`)) return false;
  if (hasBrokenEdgeInVisited(wireGrid, visited)) return false;
  return true;
}

function enforceSinglePumpPipePort(pipeGrid: number[][], levelConfig: PowerPumpLevelConfig, pump: Point, targets: Point[]) {
  const { x, y } = pump;
  const currentMask = pipeGrid[y]?.[x] ?? 0;
  if (currentMask === 0) return;

  let chosenDir = -1;
  let bestReachableTargets = -1;
  let bestDistanceScore = Number.POSITIVE_INFINITY;
  let strictCandidateFound = false;

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

    const strictValid = isPipeNetworkStrictlyValid(testGrid, pump, targets);
    if (!strictValid && strictCandidateFound) continue;

    const reachableTargets = countReachableTargetsInMaskGrid(testGrid, pump, targets);
    const nearestTargetDistance = targets.reduce((min, t) => {
      const d = Math.abs(nx - t.x) + Math.abs(ny - t.y);
      return Math.min(min, d);
    }, Number.POSITIVE_INFINITY);

    if (
      (strictValid && !strictCandidateFound)
      || (
        strictValid === strictCandidateFound
        && (
          reachableTargets > bestReachableTargets
          || (reachableTargets === bestReachableTargets && nearestTargetDistance < bestDistanceScore)
        )
      )
    ) {
      strictCandidateFound = strictValid;
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

  if (!isPipeNetworkStrictlyValid(pipeGrid, pump, targets) && targets.length > 0) {
    targets.forEach((target, idx) => {
      connectPipeRoute(pipeGrid, levelConfig, pump, target, levelConfig.seed + 1109 + idx * 43);
    });
    enforceDestinationInlets(pipeGrid, pump, targets);
  }
}

function getMaskDegree(mask: number) {
  let degree = 0;
  for (let dir = 0; dir < 4; dir++) {
    if ((mask & BIT(dir)) !== 0) degree += 1;
  }
  return degree;
}

function isSpecialPipeNode(x: number, y: number, source: Point | undefined, pump: Point, targets: Point[]) {
  if (source && x === source.x && y === source.y) return true;
  if (x === pump.x && y === pump.y) return true;
  return targets.some(t => t.x === x && t.y === y);
}

function getConnectedDeadEndPairs(maskGrid: number[][], source: Point | undefined, pump: Point, targets: Point[]) {
  const pairs: Array<{ a: Point; b: Point }> = [];
  const seen = new Set<string>();
  const gridH = maskGrid.length;
  const gridW = maskGrid[0]?.length ?? 0;

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      if (isSpecialPipeNode(x, y, source, pump, targets)) continue;

      const mask = maskGrid[y]?.[x] ?? 0;
      if (getMaskDegree(mask) !== 1) continue;

      for (let dir = 0; dir < 4; dir++) {
        if ((mask & BIT(dir)) === 0) continue;
        const nx = x + DIRS[dir].dx;
        const ny = y + DIRS[dir].dy;
        if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) continue;
        if (isSpecialPipeNode(nx, ny, source, pump, targets)) continue;

        const neighborMask = maskGrid[ny]?.[nx] ?? 0;
        const opposite = (dir + 2) % 4;
        if ((neighborMask & BIT(opposite)) === 0) continue;
        if (getMaskDegree(neighborMask) !== 1) continue;

        const keyA = `${x},${y}`;
        const keyB = `${nx},${ny}`;
        const pairKey = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
        if (seen.has(pairKey)) continue;

        seen.add(pairKey);
        pairs.push({ a: { x, y }, b: { x: nx, y: ny } });
      }
    }
  }

  return pairs;
}

function enforceDeadEndPairIsolation(maskGrid: number[][], source: Point, pump: Point, targets: Point[], seed: number) {
  const pairs = getConnectedDeadEndPairs(maskGrid, source, pump, targets);
  if (pairs.length === 0) return;

  pairs.forEach((pair, idx) => {
    const chooseA = ((seed + idx * 17) % 2) === 0;
    const chosen = chooseA ? pair.a : pair.b;
    const other = chooseA ? pair.b : pair.a;

    for (let dir = 0; dir < 4; dir++) {
      if ((maskGrid[chosen.y]?.[chosen.x] ?? 0) & BIT(dir)) {
        disconnectMaskEdge(maskGrid, chosen.x, chosen.y, dir);
      }
    }

    const candidateDirs: number[] = [];
    for (let dir = 0; dir < 4; dir++) {
      const nx = chosen.x + DIRS[dir].dx;
      const ny = chosen.y + DIRS[dir].dy;

      if (nx < 0 || ny < 0 || ny >= maskGrid.length || nx >= (maskGrid[0]?.length ?? 0)) {
        candidateDirs.push(dir);
        continue;
      }

      if (nx === other.x && ny === other.y) continue;
      if (isSpecialPipeNode(nx, ny, source, pump, targets)) continue;
      const neighborMask = maskGrid[ny]?.[nx] ?? 0;
      if (getMaskDegree(neighborMask) <= 1) continue;
      candidateDirs.push(dir);
    }

    if (candidateDirs.length === 0) return;

    const selectedDir = candidateDirs[(seed + idx * 31) % candidateDirs.length];
    const nx = chosen.x + DIRS[selectedDir].dx;
    const ny = chosen.y + DIRS[selectedDir].dy;
    maskGrid[chosen.y][chosen.x] = BIT(selectedDir);
    if (maskGrid[ny] && maskGrid[ny][nx] !== undefined) {
      maskGrid[ny][nx] &= ~BIT((selectedDir + 2) % 4);
    }
  });
}

function hasDeadEndTargetDirectConnection(pipeGrid: number[][], pump: Point, targets: Point[]) {
  const targetSet = new Set(targets.map(t => `${t.x},${t.y}`));
  const gridH = pipeGrid.length;
  const gridW = pipeGrid[0]?.length ?? 0;

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const key = `${x},${y}`;
      if (x === pump.x && y === pump.y) continue;
      if (targetSet.has(key)) continue;

      const mask = pipeGrid[y]?.[x] ?? 0;
      if (getMaskDegree(mask) !== 1) continue;

      for (let dir = 0; dir < 4; dir++) {
        if ((mask & BIT(dir)) === 0) continue;
        const nx = x + DIRS[dir].dx;
        const ny = y + DIRS[dir].dy;
        if (!targetSet.has(`${nx},${ny}`)) continue;
        const targetMask = pipeGrid[ny]?.[nx] ?? 0;
        if ((targetMask & BIT((dir + 2) % 4)) !== 0) return true;
      }
    }
  }

  return false;
}

function repairDeadEndEdgeCases(
  pipeGrid: number[][],
  levelConfig: PowerPumpLevelConfig,
  source: Point,
  pump: Point,
  targets: Point[],
  seed: number
) {
  const maxAttempts = Math.max(4, targets.length + 2);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    enforceDeadEndPairIsolation(pipeGrid, source, pump, targets, seed + attempt * 73);
    ensurePipeTargetsReachable(pipeGrid, levelConfig, pump, targets);
    enforceDestinationInlets(pipeGrid, pump, targets);
    ensureValidTargetInlets(pipeGrid, levelConfig, pump, targets, seed + 1009 + attempt * 59);
    enforceSinglePumpPipePort(pipeGrid, levelConfig, pump, targets);

    const hasPair = getConnectedDeadEndPairs(pipeGrid, source, pump, targets).length > 0;
    const hasTargetConflict = hasDeadEndTargetDirectConnection(pipeGrid, pump, targets);
    if (!hasPair && !hasTargetConflict) return;
  }
}

function disconnectMaskEdge(maskGrid: number[][], x: number, y: number, dir: number) {
  if (!maskGrid[y] || maskGrid[y][x] === undefined) return;
  maskGrid[y][x] &= ~BIT(dir);

  const nx = x + DIRS[dir].dx;
  const ny = y + DIRS[dir].dy;
  if (!maskGrid[ny] || maskGrid[ny][nx] === undefined) return;
  const opposite = (dir + 2) % 4;
  maskGrid[ny][nx] &= ~BIT(opposite);
}

function reducePipeJunctionComplexity(
  pipeGrid: number[][],
  levelConfig: PowerPumpLevelConfig,
  source: Point,
  pump: Point,
  targets: Point[],
  seed: number
) {
  const candidates: Point[] = [];
  for (let y = 0; y < levelConfig.gridH; y++) {
    for (let x = 0; x < levelConfig.gridW; x++) {
      const isSpecial = (x === source.x && y === source.y)
        || (x === pump.x && y === pump.y)
        || targets.some(t => t.x === x && t.y === y);
      if (isSpecial) continue;
      if (getMaskDegree(pipeGrid[y][x] ?? 0) >= 3) {
        candidates.push({ x, y });
      }
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = (seed + i * 31) % (i + 1);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const candidate of candidates) {
    const { x, y } = candidate;
    let guard = 0;
    while (getMaskDegree(pipeGrid[y][x] ?? 0) > 2 && guard < 6) {
      guard += 1;
      const dirs: number[] = [];
      for (let dir = 0; dir < 4; dir++) {
        if ((pipeGrid[y][x] & BIT(dir)) !== 0) dirs.push(dir);
      }

      const orderedDirs = dirs
        .map(dir => {
          const nx = x + DIRS[dir].dx;
          const ny = y + DIRS[dir].dy;
          const nearestTargetDist = targets.reduce((best, t) => {
            const d = Math.abs(nx - t.x) + Math.abs(ny - t.y);
            return Math.min(best, d);
          }, Number.POSITIVE_INFINITY);
          return { dir, score: nearestTargetDist + Math.abs(nx - pump.x) + Math.abs(ny - pump.y) };
        })
        .sort((a, b) => b.score - a.score);

      let trimmed = false;
      for (const option of orderedDirs) {
        const beforeA = pipeGrid[y][x];
        const nx = x + DIRS[option.dir].dx;
        const ny = y + DIRS[option.dir].dy;
        const beforeB = pipeGrid[ny]?.[nx] ?? 0;
        disconnectMaskEdge(pipeGrid, x, y, option.dir);

        if (countReachableTargetsInMaskGrid(pipeGrid, pump, targets) === targets.length) {
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

function sparsifyPipeNetwork(
  pipeGrid: number[][],
  levelConfig: PowerPumpLevelConfig,
  source: Point,
  pump: Point,
  targets: Point[],
  seed: number
) {
  const candidates: Point[] = [];
  for (let y = 0; y < levelConfig.gridH; y++) {
    for (let x = 0; x < levelConfig.gridW; x++) {
      const isSpecial = (x === source.x && y === source.y)
        || (x === pump.x && y === pump.y)
        || targets.some(t => t.x === x && t.y === y);
      if (isSpecial) continue;

      const mask = pipeGrid[y][x] ?? 0;
      const degree = getMaskDegree(mask);
      if (degree > 0 && degree <= 2) {
        candidates.push({ x, y });
      }
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = (seed + i * 19) % (i + 1);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const removeBudget = clamp(1 + Math.floor(levelConfig.level / 7), 1, 5);
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

    if (countReachableTargetsInMaskGrid(pipeGrid, pump, targets) !== targets.length) {
      pipeGrid[y][x] = current;
      for (const neighbor of neighborState) {
        pipeGrid[neighbor.y][neighbor.x] = neighbor.prev;
      }
      continue;
    }

    removed += 1;
  }
}

function bfsMaskGrid(maskGrid: number[][], start: Point) {
  const visited = new Set<string>();
  const q: Point[] = [start];
  visited.add(`${start.x},${start.y}`);

  while (q.length) {
    const cur = q.shift()!;
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
      q.push({ x: nx, y: ny });
    }
  }

  return visited;
}

function bfsMaskGridWithBlocked(maskGrid: number[][], start: Point, blocked: Set<string>) {
  const visited = new Set<string>();
  const q: Point[] = [start];
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

      const nextMask = maskGrid[ny]?.[nx] ?? 0;
      const opposite = (dir + 2) % 4;
      if ((nextMask & BIT(opposite)) === 0) continue;
      if (visited.has(key)) continue;

      visited.add(key);
      q.push({ x: nx, y: ny });
    }
  }

  return visited;
}

function buildSolutionForSeed(levelConfig: PowerPumpLevelConfig, seed: number): PowerPumpLevelSolution {
  const { gridW, gridH } = levelConfig;
  const pipeSolvedMasks: number[][] = Array.from({ length: gridH }, () => Array(gridW).fill(0));
  const wireSolvedMasks: number[][] = Array.from({ length: gridH }, () => Array(gridW).fill(0));

  const endpoints = pickEndpoints(gridW, gridH, seed);
  const source: Point = endpoints.source;
  const pump: Point = endpoints.pump;
  const initialTargets = generateTargets(source, pump, gridW, gridH, levelConfig.targetsCount, seed + 3);
  const targets = enforcePumpTargetSpacing(source, pump, initialTargets, gridW, gridH, seed + 41);

  connectWireRoute(wireSolvedMasks, levelConfig, source, pump, seed + 17);
  targets.forEach((target, index) => connectPipeRoute(pipeSolvedMasks, levelConfig, pump, target, seed + index * 97));
  addDeadEnds(pipeSolvedMasks, source, pump, levelConfig.deadEndTilesCount, seed + 101);
  enforceDeadEndPairIsolation(pipeSolvedMasks, source, pump, targets, seed + 151);
  resolveChannelOverlaps(pipeSolvedMasks, wireSolvedMasks, source, pump, targets);
  enforceGeneratorPipeSpacing(pipeSolvedMasks, source);
  ensurePipeTargetsReachable(pipeSolvedMasks, levelConfig, pump, targets);
  enforceDestinationInlets(pipeSolvedMasks, pump, targets);
  if (levelConfig.level >= 6) {
    reducePipeJunctionComplexity(pipeSolvedMasks, levelConfig, source, pump, targets, seed + 409);
    sparsifyPipeNetwork(pipeSolvedMasks, levelConfig, source, pump, targets, seed + 577);
  }
  ensurePipeTargetsReachable(pipeSolvedMasks, levelConfig, pump, targets);
  forceReconnectUnreachableTargets(pipeSolvedMasks, levelConfig, pump, targets, seed + 811);
  enforceDestinationInlets(pipeSolvedMasks, pump, targets);
  enforceSinglePumpPipePort(pipeSolvedMasks, levelConfig, pump, targets);
  ensurePipeTargetsReachable(pipeSolvedMasks, levelConfig, pump, targets);
  enforceDestinationInlets(pipeSolvedMasks, pump, targets);
  enforceSinglePumpPipePort(pipeSolvedMasks, levelConfig, pump, targets);
  ensureValidTargetInlets(pipeSolvedMasks, levelConfig, pump, targets, seed + 1013);
  repairDeadEndEdgeCases(pipeSolvedMasks, levelConfig, source, pump, targets, seed + 1291);
  ensurePipeTargetsReachable(pipeSolvedMasks, levelConfig, pump, targets);
  enforceDestinationInlets(pipeSolvedMasks, pump, targets);
  enforceSinglePumpPipePort(pipeSolvedMasks, levelConfig, pump, targets);
  ensureValidTargetInlets(pipeSolvedMasks, levelConfig, pump, targets, seed + 1457);
  enforceSinglePumpPipePort(pipeSolvedMasks, levelConfig, pump, targets);

  if (getMaskDegree(pipeSolvedMasks[pump.y]?.[pump.x] ?? 0) !== 1 && targets.length > 0) {
    for (let dir = 0; dir < 4; dir++) {
      disconnectMaskEdge(pipeSolvedMasks, pump.x, pump.y, dir);
    }
    connectPipeRoute(pipeSolvedMasks, levelConfig, pump, targets[0], seed + 1601);
    ensurePipeTargetsReachable(pipeSolvedMasks, levelConfig, pump, targets);
    enforceDestinationInlets(pipeSolvedMasks, pump, targets);
    enforceSinglePumpPipePort(pipeSolvedMasks, levelConfig, pump, targets);
  }

  normalizeBrokenVisitedEdges(pipeSolvedMasks, pump);
  ensurePipeTargetsReachable(pipeSolvedMasks, levelConfig, pump, targets);
  enforceDestinationInlets(pipeSolvedMasks, pump, targets);
  enforceSinglePumpPipePort(pipeSolvedMasks, levelConfig, pump, targets);

  if (!isPipeNetworkStrictlyValid(pipeSolvedMasks, pump, targets) && targets.length > 0) {
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        pipeSolvedMasks[y][x] = 0;
      }
    }

    targets.forEach((target, index) => {
      connectPipeRoute(pipeSolvedMasks, levelConfig, pump, target, seed + 1901 + index * 131);
    });
    ensurePipeTargetsReachable(pipeSolvedMasks, levelConfig, pump, targets);
    enforceDestinationInlets(pipeSolvedMasks, pump, targets);
    enforceSinglePumpPipePort(pipeSolvedMasks, levelConfig, pump, targets);
    ensureValidTargetInlets(pipeSolvedMasks, levelConfig, pump, targets, seed + 2237);
  }

  enforceGeneratorPipeSpacing(pipeSolvedMasks, source);
  enforceWireBackboneConnected(wireSolvedMasks, source, pump);
  enforceSingleSourceWirePort(wireSolvedMasks, levelConfig, source, pump);
  reduceWireJunctionComplexity(wireSolvedMasks, source, pump, targets, seed + 2661);
  enforceWireBackboneConnected(wireSolvedMasks, source, pump);
  enforceSingleSourceWirePort(wireSolvedMasks, levelConfig, source, pump);

  return {
    level: levelConfig.level,
    gridW,
    gridH,
    source,
    pump,
    targets,
    pipeSolvedMasks,
    wireSolvedMasks
  };
}

function isTargetInletValid(pipeGrid: number[][], pump: Point, targets: Point[], target: Point) {
  const { x, y } = target;
  const mask = pipeGrid[y]?.[x] ?? 0;
  if (getMaskDegree(mask) !== 1) return false;

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
  const blockedTargets = new Set(targets.map(t => `${t.x},${t.y}`));
  if (blockedTargets.has(`${nx},${ny}`)) return false;

  const neighborMask = pipeGrid[ny]?.[nx] ?? 0;
  if ((neighborMask & BIT((inletDir + 2) % 4)) === 0) return false;

  const reachableWithoutTargets = bfsMaskGridWithBlocked(pipeGrid, pump, blockedTargets);
  return reachableWithoutTargets.has(`${nx},${ny}`);
}

function areTargetInletsValid(pipeGrid: number[][], pump: Point, targets: Point[]) {
  return targets.every(target => isTargetInletValid(pipeGrid, pump, targets, target));
}

function clearMaskConnectionsAtPoint(maskGrid: number[][], point: Point) {
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

function ensureValidTargetInlets(
  pipeGrid: number[][],
  levelConfig: PowerPumpLevelConfig,
  pump: Point,
  targets: Point[],
  seed: number
) {
  const maxAttempts = Math.max(8, targets.length * 6);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (areTargetInletsValid(pipeGrid, pump, targets)) return;

    targets.forEach((target, idx) => {
      if (isTargetInletValid(pipeGrid, pump, targets, target)) return;
      clearMaskConnectionsAtPoint(pipeGrid, target);
      connectPipeRoute(pipeGrid, levelConfig, pump, target, seed + attempt * 211 + idx * 97);
    });

    ensurePipeTargetsReachable(pipeGrid, levelConfig, pump, targets);
    enforceDestinationInlets(pipeGrid, pump, targets);
    enforceSinglePumpPipePort(pipeGrid, levelConfig, pump, targets);
    ensurePipeTargetsReachable(pipeGrid, levelConfig, pump, targets);
    enforceDestinationInlets(pipeGrid, pump, targets);
  }
}

function isStrictSolvable(solution: PowerPumpLevelSolution) {
  if (!isWireGridStrictlyValid(solution.wireSolvedMasks, solution.source, solution.pump)) return false;
  if (!isPipeNetworkStrictlyValid(solution.pipeSolvedMasks, solution.pump, solution.targets)) return false;

  if (getMaskDegree(solution.pipeSolvedMasks[solution.pump.y]?.[solution.pump.x] ?? 0) !== 1) return false;
  if (isPumpAdjacentToAnyTarget(solution.pump, solution.targets)) return false;

  for (let dir = 0; dir < 4; dir++) {
    const nx = solution.source.x + DIRS[dir].dx;
    const ny = solution.source.y + DIRS[dir].dy;
    const mask = solution.pipeSolvedMasks[ny]?.[nx] ?? 0;
    if ((mask & BIT((dir + 2) % 4)) !== 0) return false;
  }

  for (const target of solution.targets) {
    if ((solution.pipeSolvedMasks[target.y]?.[target.x] ?? 0) === 0) return false;
    if (!isTargetInletValid(solution.pipeSolvedMasks, solution.pump, solution.targets, target)) return false;
  }
  if (getConnectedDeadEndPairs(solution.pipeSolvedMasks, solution.source, solution.pump, solution.targets).length > 0) {
    return false;
  }
  if (hasDeadEndTargetDirectConnection(solution.pipeSolvedMasks, solution.pump, solution.targets)) {
    return false;
  }
  return true;
}

export function getPowerPumpLevelSolution(level: number): PowerPumpLevelSolution {
  const levelConfig = getPowerPumpLevel(level);
  const baseSeed = levelConfig.seed;

  let fallback = buildSolutionForSeed(levelConfig, baseSeed);
  if (isStrictSolvable(fallback)) return fallback;

  for (let i = 1; i <= 300; i++) {
    const candidateSeed = baseSeed + i * 101;
    const candidate = buildSolutionForSeed(levelConfig, candidateSeed);
    if (isStrictSolvable(candidate)) return candidate;
    fallback = candidate;
  }

  return fallback;
}

export function validatePowerPumpLevelSolvability(level: number): PowerPumpSolvabilityReport {
  const solution = getPowerPumpLevelSolution(level);
  const issues: string[] = [];

  const wireReachable = bfsMaskGrid(solution.wireSolvedMasks, solution.source);
  if (!wireReachable.has(`${solution.pump.x},${solution.pump.y}`)) {
    issues.push('wire path from source to pump is disconnected');
  }

  const sourceMask = solution.wireSolvedMasks[solution.source.y]?.[solution.source.x] ?? 0;
  if (getMaskDegree(sourceMask) !== 1) {
    issues.push('source(generator) must have exactly one wire outlet direction');
  }
  if (!isWireGridStrictlyValid(solution.wireSolvedMasks, solution.source, solution.pump)) {
    issues.push('wire network has invalid edges or disconnected source-to-pump route');
  }

  const pumpMask = solution.pipeSolvedMasks[solution.pump.y]?.[solution.pump.x] ?? 0;
  if (getMaskDegree(pumpMask) !== 1) {
    issues.push('pump must have exactly one pipe outlet direction');
  }

  if (isPumpAdjacentToAnyTarget(solution.pump, solution.targets)) {
    issues.push('pump must not be directly adjacent to any target tile');
  }

  for (let dir = 0; dir < 4; dir++) {
    const nx = solution.source.x + DIRS[dir].dx;
    const ny = solution.source.y + DIRS[dir].dy;
    const mask = solution.pipeSolvedMasks[ny]?.[nx] ?? 0;
    if ((mask & BIT((dir + 2) % 4)) !== 0) {
      issues.push('generator must keep surrounding space free from direct pipe inlets');
      break;
    }
  }

  const pipeReachable = bfsMaskGrid(solution.pipeSolvedMasks, solution.pump);
  for (const target of solution.targets) {
    if (!pipeReachable.has(`${target.x},${target.y}`)) {
      issues.push(`target (${target.x},${target.y}) is unreachable from pump`);
    }
    const targetMask = solution.pipeSolvedMasks[target.y]?.[target.x] ?? 0;
    if (targetMask === 0) {
      issues.push(`target (${target.x},${target.y}) has no pipe inlet`);
    }
    if (!isTargetInletValid(solution.pipeSolvedMasks, solution.pump, solution.targets, target)) {
      issues.push(`target (${target.x},${target.y}) inlet does not come from a valid pump-reachable route`);
    }
  }

  if (!isPipeNetworkStrictlyValid(solution.pipeSolvedMasks, solution.pump, solution.targets)) {
    issues.push('pipe network contains dead-end/broken outlet path from pump');
  }

  if (getConnectedDeadEndPairs(solution.pipeSolvedMasks, solution.source, solution.pump, solution.targets).length > 0) {
    issues.push('dead-end pipes must not directly connect to another dead-end pipe');
  }

  if (hasDeadEndTargetDirectConnection(solution.pipeSolvedMasks, solution.pump, solution.targets)) {
    issues.push('dead-end pipe must not be the direct source inlet for any target');
  }

  return {
    level: solution.level,
    isSolvable: issues.length === 0,
    issues,
    solution
  };
}

export function validateAllPowerPumpLevelsSolvable() {
  const levelNumbers = Object.keys(POWER_PUMP_LEVELS)
    .map(Number)
    .sort((a, b) => a - b);

  const reports = levelNumbers.map(level => validatePowerPumpLevelSolvability(level));
  return {
    allSolvable: reports.every(report => report.isSolvable),
    reports
  };
}
