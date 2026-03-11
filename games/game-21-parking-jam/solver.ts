import type {
  ParkingJamCarConfig,
  ParkingJamCarRuntime,
  ParkingJamDirection,
  ParkingJamLevelConfig,
  ParkingJamMove,
  ParkingJamRawLevelConfig,
  ParkingJamSolveResult,
} from './types';

type VectorState = number[];

type Edge = {
  prevKey: string;
  move: ParkingJamMove;
};

type NextState = {
  key: string;
  vector: VectorState;
  move: ParkingJamMove;
};

type SolveOptions = {
  maxStates?: number;
  maxDepth?: number;
  collectRelevant?: boolean;
};

const DEFAULT_SOLVE_OPTIONS: Required<SolveOptions> = {
  maxStates: 80_000,
  maxDepth: 70,
  collectRelevant: true,
};

const DEFAULT_HINT_OPTIONS: Required<SolveOptions> = {
  maxStates: 20_000,
  maxDepth: 36,
  collectRelevant: false,
};

const DIR_ORDER: ParkingJamDirection[] = ['left', 'right', 'up', 'down'];

const keyFromVector = (vector: VectorState) => vector.join(',');

const cloneVector = (vector: VectorState) => vector.slice();

const encodeStartVector = (level: Pick<ParkingJamRawLevelConfig, 'cars'>): VectorState => {
  const vector: number[] = [];
  level.cars.forEach((car) => {
    vector.push(car.row, car.col);
  });
  return vector;
};

const encodeRuntimeVector = (
  level: Pick<ParkingJamRawLevelConfig, 'cars'>,
  runtimeCars: Record<string, ParkingJamCarRuntime>
): VectorState => {
  const vector: number[] = [];
  level.cars.forEach((car) => {
    const runtime = runtimeCars[car.id];
    if (!runtime || runtime.removed) {
      vector.push(-1, -1);
      return;
    }
    vector.push(runtime.row, runtime.col);
  });
  return vector;
};

const isRemoved = (vector: VectorState, index: number) => vector[index * 2] < 0;

const getRow = (vector: VectorState, index: number) => vector[index * 2];

const getCol = (vector: VectorState, index: number) => vector[index * 2 + 1];

const setPos = (vector: VectorState, index: number, row: number, col: number) => {
  vector[index * 2] = row;
  vector[index * 2 + 1] = col;
};

const setRemoved = (vector: VectorState, index: number) => {
  setPos(vector, index, -1, -1);
};

const getCells = (car: ParkingJamCarConfig, row: number, col: number): Array<{ row: number; col: number }> => {
  if (car.axis === 'h') {
    return Array.from({ length: car.length }, (_, i) => ({ row, col: col + i }));
  }
  return Array.from({ length: car.length }, (_, i) => ({ row: row + i, col }));
};

const buildOccupied = (
  level: Pick<ParkingJamRawLevelConfig, 'cars' | 'blockedCells'>,
  vector: VectorState,
  skipIndex: number
): Set<string> => {
  const occupied = new Set<string>();
  (level.blockedCells ?? []).forEach((cell) => {
    occupied.add(`${cell.row},${cell.col}`);
  });
  level.cars.forEach((car, index) => {
    if (index === skipIndex || isRemoved(vector, index)) return;
    const row = getRow(vector, index);
    const col = getCol(vector, index);
    getCells(car, row, col).forEach((cell) => {
      occupied.add(`${cell.row},${cell.col}`);
    });
  });
  return occupied;
};

const hasBlockedSegment = (
  level: Pick<ParkingJamRawLevelConfig, 'blockedGateSegments'>,
  edge: 'top' | 'right' | 'bottom' | 'left',
  index: number
) => {
  return level.blockedGateSegments.some((segment) => segment.edge === edge && segment.index === index);
};

export const canParkingJamCarExit = (
  level: Pick<ParkingJamRawLevelConfig, 'gridSize' | 'blockedGateSegments'>,
  car: ParkingJamCarConfig,
  row: number,
  col: number,
  direction: ParkingJamDirection
) => {
  if (!car.allowedExitDirections.includes(direction)) return false;

  if (car.axis === 'h' && (direction === 'up' || direction === 'down')) return false;
  if (car.axis === 'v' && (direction === 'left' || direction === 'right')) return false;

  if (direction === 'left') {
    if (col !== 0) return false;
    return !hasBlockedSegment(level, 'left', row);
  }
  if (direction === 'right') {
    if (col + car.length - 1 !== level.gridSize - 1) return false;
    return !hasBlockedSegment(level, 'right', row);
  }
  if (direction === 'up') {
    if (row !== 0) return false;
    return !hasBlockedSegment(level, 'top', col);
  }

  if (row + car.length - 1 !== level.gridSize - 1) return false;
  return !hasBlockedSegment(level, 'bottom', col);
};

const isSolved = (
  level: Pick<ParkingJamRawLevelConfig, 'objectiveType' | 'targetCarId' | 'cars'>,
  vector: VectorState
) => {
  if (level.objectiveType === 'clear_all') {
    return level.cars.every((_, index) => isRemoved(vector, index));
  }

  const targetIndex = level.cars.findIndex((car) => car.id === level.targetCarId);
  if (targetIndex < 0) return false;
  return isRemoved(vector, targetIndex);
};

const cmpMove = (a: ParkingJamMove, b: ParkingJamMove) => {
  if (a.carId !== b.carId) return a.carId.localeCompare(b.carId);
  const ad = DIR_ORDER.indexOf(a.direction);
  const bd = DIR_ORDER.indexOf(b.direction);
  if (ad !== bd) return ad - bd;
  return a.distance - b.distance;
};

const enumerateNextStates = (level: ParkingJamRawLevelConfig, vector: VectorState): NextState[] => {
  const out: NextState[] = [];

  level.cars.forEach((car, index) => {
    if (isRemoved(vector, index)) return;

    const row = getRow(vector, index);
    const col = getCol(vector, index);
    const occupied = buildOccupied(level, vector, index);

    if (car.axis === 'h') {
      let maxLeft = 0;
      while (col - maxLeft - 1 >= 0 && !occupied.has(`${row},${col - maxLeft - 1}`)) {
        maxLeft += 1;
      }

      let maxRight = 0;
      while (
        col + car.length - 1 + maxRight + 1 < level.gridSize &&
        !occupied.has(`${row},${col + car.length - 1 + maxRight + 1}`)
      ) {
        maxRight += 1;
      }

      for (let distance = 1; distance <= maxLeft; distance += 1) {
        const next = cloneVector(vector);
        const nextCol = col - distance;
        const exits = canParkingJamCarExit(level, car, row, nextCol, 'left');
        if (exits) setRemoved(next, index);
        else setPos(next, index, row, nextCol);

        out.push({
          key: keyFromVector(next),
          vector: next,
          move: { carId: car.id, direction: 'left', distance, exits },
        });
      }

      for (let distance = 1; distance <= maxRight; distance += 1) {
        const next = cloneVector(vector);
        const nextCol = col + distance;
        const exits = canParkingJamCarExit(level, car, row, nextCol, 'right');
        if (exits) setRemoved(next, index);
        else setPos(next, index, row, nextCol);

        out.push({
          key: keyFromVector(next),
          vector: next,
          move: { carId: car.id, direction: 'right', distance, exits },
        });
      }

      return;
    }

    let maxUp = 0;
    while (row - maxUp - 1 >= 0 && !occupied.has(`${row - maxUp - 1},${col}`)) {
      maxUp += 1;
    }

    let maxDown = 0;
    while (
      row + car.length - 1 + maxDown + 1 < level.gridSize &&
      !occupied.has(`${row + car.length - 1 + maxDown + 1},${col}`)
    ) {
      maxDown += 1;
    }

    for (let distance = 1; distance <= maxUp; distance += 1) {
      const next = cloneVector(vector);
      const nextRow = row - distance;
      const exits = canParkingJamCarExit(level, car, nextRow, col, 'up');
      if (exits) setRemoved(next, index);
      else setPos(next, index, nextRow, col);

      out.push({
        key: keyFromVector(next),
        vector: next,
        move: { carId: car.id, direction: 'up', distance, exits },
      });
    }

    for (let distance = 1; distance <= maxDown; distance += 1) {
      const next = cloneVector(vector);
      const nextRow = row + distance;
      const exits = canParkingJamCarExit(level, car, nextRow, col, 'down');
      if (exits) setRemoved(next, index);
      else setPos(next, index, nextRow, col);

      out.push({
        key: keyFromVector(next),
        vector: next,
        move: { carId: car.id, direction: 'down', distance, exits },
      });
    }
  });

  out.sort((a, b) => cmpMove(a.move, b.move));
  return out;
};

const extractPathMoves = (startKey: string, solvedKey: string, parent: Map<string, Edge>): ParkingJamMove[] => {
  const moves: ParkingJamMove[] = [];
  const seen = new Set<string>();
  let cursor = solvedKey;

  while (cursor !== startKey && !seen.has(cursor)) {
    seen.add(cursor);
    const edge = parent.get(cursor);
    if (!edge) break;
    moves.push(edge.move);
    cursor = edge.prevKey;
  }

  moves.reverse();
  return moves;
};

const fallbackResult = (level: ParkingJamRawLevelConfig): ParkingJamSolveResult => {
  const fallbackMoves = Math.max(1, level.cars.length + Math.max(1, Math.floor(level.dependencyDepth / 2)));
  return {
    solvable: false,
    parMoves: fallbackMoves,
    parTimeMs: Math.max(3000, Math.round(2200 + fallbackMoves * 1700 + level.difficulty * 350)),
    relevantCarSet: level.cars.map((car) => car.id),
    firstMove: null,
  };
};

const solveFromVector = (
  level: ParkingJamRawLevelConfig,
  startVector: VectorState,
  options?: SolveOptions
): ParkingJamSolveResult => {
  const resolved = {
    ...DEFAULT_SOLVE_OPTIONS,
    ...options,
  };
  const startKey = keyFromVector(startVector);

  const dist = new Map<string, number>([[startKey, 0]]);
  const parent = new Map<string, Edge>();
  const allParents = resolved.collectRelevant ? new Map<string, Edge[]>() : null;

  const queue: Array<{ key: string; vector: VectorState }> = [{ key: startKey, vector: cloneVector(startVector) }];
  let qIndex = 0;

  let bestSolvedDepth = Number.POSITIVE_INFINITY;
  const solvedKeys: string[] = [];
  let exhaustedByLimits = false;

  while (qIndex < queue.length) {
    if (dist.size > resolved.maxStates) {
      exhaustedByLimits = true;
      break;
    }

    const current = queue[qIndex];
    qIndex += 1;

    const currentDepth = dist.get(current.key) ?? 0;
    if (currentDepth > bestSolvedDepth) continue;
    if (currentDepth >= resolved.maxDepth) continue;

    if (isSolved(level, current.vector)) {
      if (currentDepth < bestSolvedDepth) {
        bestSolvedDepth = currentDepth;
        solvedKeys.length = 0;
      }
      if (currentDepth === bestSolvedDepth) {
        solvedKeys.push(current.key);
      }
      continue;
    }

    const nextStates = enumerateNextStates(level, current.vector);
    nextStates.forEach((next) => {
      const nextDepth = currentDepth + 1;
      if (nextDepth > bestSolvedDepth || nextDepth > resolved.maxDepth) return;

      const existingDepth = dist.get(next.key);
      if (existingDepth === undefined) {
        dist.set(next.key, nextDepth);
        parent.set(next.key, { prevKey: current.key, move: next.move });
        if (allParents) {
          allParents.set(next.key, [{ prevKey: current.key, move: next.move }]);
        }
        queue.push({ key: next.key, vector: next.vector });
        return;
      }

      if (allParents && existingDepth === nextDepth) {
        const edges = allParents.get(next.key) ?? [];
        edges.push({ prevKey: current.key, move: next.move });
        allParents.set(next.key, edges);
      }
    });
  }

  if (!Number.isFinite(bestSolvedDepth) || solvedKeys.length === 0) {
    return fallbackResult(level);
  }

  const preferredSolvedKey = [...solvedKeys].sort()[0];
  const pathMoves = extractPathMoves(startKey, preferredSolvedKey, parent);

  const relevant = new Set<string>();
  if (allParents) {
    const stack = [...solvedKeys];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const key = stack.pop();
      if (!key || visited.has(key)) continue;
      visited.add(key);
      if (key === startKey) continue;

      const edges = allParents.get(key) ?? [];
      edges.forEach((edge) => {
        relevant.add(edge.move.carId);
        if (!visited.has(edge.prevKey)) {
          stack.push(edge.prevKey);
        }
      });
    }
  } else {
    pathMoves.forEach((move) => relevant.add(move.carId));
  }

  const parMoves = Math.max(1, bestSolvedDepth);
  const parTimeMs = Math.max(3000, Math.round(2200 + parMoves * 1700 + level.difficulty * 350));

  return {
    solvable: !exhaustedByLimits || Number.isFinite(bestSolvedDepth),
    parMoves,
    parTimeMs,
    relevantCarSet: relevant.size > 0 ? [...relevant] : level.cars.map((car) => car.id),
    firstMove: pathMoves[0] ?? null,
  };
};

export const solveParkingJamLevel = (
  level: ParkingJamRawLevelConfig,
  options?: SolveOptions
): ParkingJamSolveResult => {
  return solveFromVector(level, encodeStartVector(level), options);
};

export const findParkingJamHintMove = (
  level: ParkingJamRawLevelConfig,
  runtimeCars: Record<string, ParkingJamCarRuntime>
): ParkingJamMove | null => {
  const vector = encodeRuntimeVector(level, runtimeCars);
  const solved = solveFromVector(level, vector, DEFAULT_HINT_OPTIONS);
  return solved.firstMove;
};

export const annotateParkingJamLevels = (
  rawLevels: ParkingJamRawLevelConfig[],
  options?: SolveOptions
): Record<number, ParkingJamLevelConfig> => {
  const byId: Record<number, ParkingJamLevelConfig> = {};

  rawLevels.forEach((rawLevel) => {
    if (rawLevel.level <= 0) {
      byId[rawLevel.level] = {
        ...rawLevel,
        blockedCells: rawLevel.blockedCells ?? [],
        parMoves: 2,
        parTimeMs: 6000,
        relevantCarSet: rawLevel.cars.map((car) => car.id),
      };
      return;
    }

    const solved = solveParkingJamLevel(rawLevel, options);
    byId[rawLevel.level] = {
      ...rawLevel,
      blockedCells: rawLevel.blockedCells ?? [],
      parMoves: solved.parMoves,
      parTimeMs: solved.parTimeMs,
      relevantCarSet: solved.relevantCarSet.length > 0 ? solved.relevantCarSet : rawLevel.cars.map((car) => car.id),
    };
  });

  return byId;
};
