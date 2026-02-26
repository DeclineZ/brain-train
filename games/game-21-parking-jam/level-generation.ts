import type { ParkingJamCarConfig, ParkingJamCarType, ParkingJamRawLevelConfig } from './types';

type LateLevelSpec = {
  level: number;
  gridSize: number;
  carCount: number;
  blockedSegmentCount: number;
  dependencyDepth: number;
  difficulty: number;
  timeLimitMs: number;
  length3Rate: number;
};

type Rng = () => number;

const COLORS = [
  0xf97316,
  0x0ea5e9,
  0x84cc16,
  0xec4899,
  0xf59e0b,
  0x14b8a6,
  0x8b5cf6,
  0xef4444,
  0x22c55e,
  0x6366f1,
  0x06b6d4,
  0xeab308,
];

const CAR_TYPES: ParkingJamCarType[] = ['sedan', 'suv', 'taxi', 'pickup', 'van', 'bus', 'truck'];
const CAR_IDS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const ATTEMPT_SEED_STRIDE = 7_919;
const MAX_ATTEMPTS_PER_LEVEL = 2;
const LATE_LEVEL_PAR_MIN = 10;
const LATE_LEVEL_PAR_MAX = 16;
const LATE_LEVEL_BLOCKED_GATE_MIN = 5;
const LATE_LEVEL_BLOCKED_GATE_MAX = 6;

const LATE_LEVEL_SPECS: LateLevelSpec[] = [
  {
    level: 21,
    gridSize: 7,
    carCount: 10,
    blockedSegmentCount: 6,
    dependencyDepth: 6,
    difficulty: 9,
    timeLimitMs: 35_000,
    length3Rate: 0.35,
  },
  {
    level: 22,
    gridSize: 7,
    carCount: 10,
    blockedSegmentCount: 6,
    dependencyDepth: 6,
    difficulty: 10,
    timeLimitMs: 32_000,
    length3Rate: 0.35,
  },
  {
    level: 23,
    gridSize: 7,
    carCount: 10,
    blockedSegmentCount: 6,
    dependencyDepth: 6,
    difficulty: 10,
    timeLimitMs: 30_000,
    length3Rate: 0.35,
  },
  {
    level: 24,
    gridSize: 7,
    carCount: 10,
    blockedSegmentCount: 6,
    dependencyDepth: 6,
    difficulty: 10,
    timeLimitMs: 28_000,
    length3Rate: 0.35,
  },
];

export const PARKING_JAM_GENERATED_LEVEL_SEEDS: Record<number, number> = {
  21: 21_002,
  22: 22_026,
  23: 23_054,
  24: 24_000,
};

const mulberry32 = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(items: T[], rand: Rng): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const gateKey = (edge: 'top' | 'right' | 'bottom' | 'left', index: number) => `${edge}:${index}`;

const carCells = (axis: 'h' | 'v', length: 2 | 3, row: number, col: number) => {
  if (axis === 'h') {
    return Array.from({ length }, (_, i) => ({ row, col: col + i }));
  }
  return Array.from({ length }, (_, i) => ({ row: row + i, col }));
};

const posFromEdge = (
  axis: 'h' | 'v',
  length: 2 | 3,
  direction: 'left' | 'right' | 'up' | 'down',
  lane: number,
  distance: number,
  gridSize: number
) => {
  if (axis === 'h') {
    return {
      row: lane,
      col: direction === 'right' ? gridSize - length - distance : distance,
    };
  }

  return {
    row: direction === 'down' ? gridSize - length - distance : distance,
    col: lane,
  };
};

const isPathClear = (
  occupied: Set<string>,
  axis: 'h' | 'v',
  length: 2 | 3,
  row: number,
  col: number,
  direction: 'left' | 'right' | 'up' | 'down',
  distance: number
) => {
  for (let step = 1; step <= distance; step += 1) {
    let nextRow = row;
    let nextCol = col;

    if (direction === 'left') nextCol -= step;
    if (direction === 'right') nextCol += step;
    if (direction === 'up') nextRow -= step;
    if (direction === 'down') nextRow += step;

    const swept = carCells(axis, length, nextRow, nextCol);
    if (swept.some((cell) => occupied.has(`${cell.row},${cell.col}`))) {
      return false;
    }
  }
  return true;
};

const directionForAxis = (axis: 'h' | 'v', rand: Rng): 'left' | 'right' | 'up' | 'down' => {
  if (axis === 'h') {
    return rand() < 0.5 ? 'left' : 'right';
  }
  return rand() < 0.5 ? 'up' : 'down';
};

const blockedSegmentsForCandidate = (
  gridSize: number,
  cars: ParkingJamCarConfig[],
  requiredGateKeys: Set<string>,
  blockedSegmentCount: number,
  rand: Rng
) => {
  const allSegments: Array<{ edge: 'top' | 'right' | 'bottom' | 'left'; index: number }> = [];
  for (let index = 0; index < gridSize; index += 1) {
    allSegments.push({ edge: 'left', index });
    allSegments.push({ edge: 'right', index });
    allSegments.push({ edge: 'top', index });
    allSegments.push({ edge: 'bottom', index });
  }

  const oppositeEdgeByAxis = (car: ParkingJamCarConfig): { edge: 'top' | 'right' | 'bottom' | 'left'; index: number } => {
    const direction = car.allowedExitDirections[0];
    if (car.axis === 'h') {
      if (direction === 'left') return { edge: 'right', index: car.row };
      if (direction === 'right') return { edge: 'left', index: car.row };
      return { edge: rand() < 0.5 ? 'left' : 'right', index: car.row };
    }

    if (direction === 'up') return { edge: 'bottom', index: car.col };
    if (direction === 'down') return { edge: 'top', index: car.col };
    return { edge: rand() < 0.5 ? 'top' : 'bottom', index: car.col };
  };

  const unique = new Map<string, { edge: 'top' | 'right' | 'bottom' | 'left'; index: number }>();
  const axisAwareWalls = shuffle(cars, rand)
    .slice(0, Math.min(3, cars.length))
    .map((car) => oppositeEdgeByAxis(car))
    .filter((segment) => !requiredGateKeys.has(gateKey(segment.edge, segment.index)));

  axisAwareWalls.forEach((segment) => {
    unique.set(gateKey(segment.edge, segment.index), segment);
  });

  const allowedBlockedPool = shuffle(
    allSegments.filter((segment) => !requiredGateKeys.has(gateKey(segment.edge, segment.index))),
    rand
  );

  for (const segment of allowedBlockedPool) {
    if (unique.size >= blockedSegmentCount) break;
    unique.set(gateKey(segment.edge, segment.index), segment);
  }

  return [...unique.values()].slice(0, blockedSegmentCount);
};

const createGeneratedCar = (
  id: string,
  axis: 'h' | 'v',
  length: 2 | 3,
  row: number,
  col: number,
  direction: 'left' | 'right' | 'up' | 'down',
  colorIndex: number
): ParkingJamCarConfig => ({
  id,
  axis,
  length,
  row,
  col,
  color: COLORS[colorIndex % COLORS.length],
  carType: CAR_TYPES[colorIndex % CAR_TYPES.length],
  allowedExitDirections: [direction],
});

const buildGeneratedLateLevel = (spec: LateLevelSpec, seed: number): ParkingJamRawLevelConfig | null => {
  const rand = mulberry32(seed);
  const occupied = new Set<string>();
  const requiredGateKeys = new Set<string>();
  const cars: ParkingJamCarConfig[] = [];

  for (let index = 0; index < spec.carCount; index += 1) {
    const carId = CAR_IDS[index];
    let placed = false;

    for (let tries = 0; tries < 260; tries += 1) {
      const axis = rand() < 0.5 ? 'h' : 'v';
      const length: 2 | 3 = rand() < spec.length3Rate ? 3 : 2;
      const direction = directionForAxis(axis, rand);
      const lane = Math.floor(rand() * spec.gridSize);
      const maxDistance = spec.gridSize - length;
      if (maxDistance < 1) continue;

      const distance = 1 + Math.floor(rand() * maxDistance);
      const pos = posFromEdge(axis, length, direction, lane, distance, spec.gridSize);

      if (
        pos.row < 0 ||
        pos.col < 0 ||
        pos.row + (axis === 'v' ? length : 1) > spec.gridSize ||
        pos.col + (axis === 'h' ? length : 1) > spec.gridSize
      ) {
        continue;
      }

      const cells = carCells(axis, length, pos.row, pos.col);
      if (cells.some((cell) => occupied.has(`${cell.row},${cell.col}`))) {
        continue;
      }

      if (!isPathClear(occupied, axis, length, pos.row, pos.col, direction, distance)) {
        continue;
      }

      cells.forEach((cell) => occupied.add(`${cell.row},${cell.col}`));
      cars.push(createGeneratedCar(carId, axis, length, pos.row, pos.col, direction, index));

      if (direction === 'left') requiredGateKeys.add(gateKey('left', pos.row));
      if (direction === 'right') requiredGateKeys.add(gateKey('right', pos.row));
      if (direction === 'up') requiredGateKeys.add(gateKey('top', pos.col));
      if (direction === 'down') requiredGateKeys.add(gateKey('bottom', pos.col));

      placed = true;
      break;
    }

    if (!placed) {
      return null;
    }
  }

  const blockedGateSegments = blockedSegmentsForCandidate(
    spec.gridSize,
    cars,
    requiredGateKeys,
    spec.blockedSegmentCount,
    rand
  );

  return {
    level: spec.level,
    gridSize: spec.gridSize,
    cars,
    objectiveType: 'clear_all',
    blockedGateSegments,
    gatingProfile: blockedGateSegments.length === 0 ? 'none' : 'partial',
    oneWayRatio: 1,
    dependencyDepth: spec.dependencyDepth,
    difficulty: spec.difficulty,
    timeLimitMs: spec.timeLimitMs,
  };
};

const hasAnyOverlapOrOutOfBounds = (candidate: ParkingJamRawLevelConfig) => {
  const occupied = new Set<string>();

  for (const car of candidate.cars) {
    const cells = carCells(car.axis, car.length, car.row, car.col);
    for (const cell of cells) {
      if (
        cell.row < 0 ||
        cell.col < 0 ||
        cell.row >= candidate.gridSize ||
        cell.col >= candidate.gridSize
      ) {
        return true;
      }

      const key = `${cell.row},${cell.col}`;
      if (occupied.has(key)) return true;
      occupied.add(key);
    }
  }

  return false;
};

const isLateLevelCandidateAccepted = (candidate: ParkingJamRawLevelConfig) => {
  if (candidate.cars.length < LATE_LEVEL_PAR_MIN || candidate.cars.length > LATE_LEVEL_PAR_MAX) return false;
  if (
    candidate.blockedGateSegments.length < LATE_LEVEL_BLOCKED_GATE_MIN ||
    candidate.blockedGateSegments.length > LATE_LEVEL_BLOCKED_GATE_MAX
  ) {
    return false;
  }
  if (candidate.cars.some((car) => car.allowedExitDirections.length !== 1)) return false;
  if (hasAnyOverlapOrOutOfBounds(candidate)) return false;
  return true;
};

export const generateParkingJamLateLevels = (
  fallbackByLevel: Record<number, ParkingJamRawLevelConfig>
): ParkingJamRawLevelConfig[] => {
  return LATE_LEVEL_SPECS.map((spec) => {
    const fallback = fallbackByLevel[spec.level];
    const baseSeed = PARKING_JAM_GENERATED_LEVEL_SEEDS[spec.level] ?? spec.level * 1000;

    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_LEVEL; attempt += 1) {
      const candidateSeed = baseSeed + attempt * ATTEMPT_SEED_STRIDE;
      const candidate = buildGeneratedLateLevel(spec, candidateSeed);
      if (!candidate) continue;
      if (!isLateLevelCandidateAccepted(candidate)) continue;
      return candidate;
    }

    return fallback;
  }).filter((level): level is ParkingJamRawLevelConfig => Boolean(level));
};
