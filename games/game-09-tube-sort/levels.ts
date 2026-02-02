export type TubeSortLevelConfig = {
  level: number;
  tubeCount: number;
  tubeCapacity: number;
  elementTypes: number;
  totalElements: number;
  optimalMoves: number;
  targetTimeSeconds: number;
  difficultyMultiplier: number;
  seed: number;
};

const LEVEL_COUNT = 30;
const SHUFFLE_MOVES = {
  easy: 15,
  medium: 25,
  hard: 40
};

const basePalette = [
  0xFF6B6B,
  0x4D96FF,
  0x6BCB77,
  0xFFD93D,
  0xB980F0,
  0xFF9F45,
  0x4ECDC4,
  0xFF5DA2
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function getTier(level: number) {
  if (level <= 10) return 'easy';
  if (level <= 20) return 'medium';
  return 'hard';
}

function getTubeCount(level: number) {
  if (level <= 5) return 4;
  if (level <= 10) return 4;
  if (level <= 15) return 5;
  if (level <= 20) return 6;
  if (level <= 25) return 7;
  return 8;
}

function getTubeCapacity(level: number) {
  if (level <= 10) return 4;
  if (level <= 20) return 5;
  return 6;
}

function getElementTypes(level: number) {
  const tubeCount = getTubeCount(level);
  return Math.min(basePalette.length, Math.max(2, tubeCount - 1));
}

function getDifficultyMultiplier(level: number) {
  const min = 1.0;
  const max = 2.5;
  const pct = (level - 1) / (LEVEL_COUNT - 1);
  return Number((min + (max - min) * pct).toFixed(2));
}

function getTargetTimeSeconds(level: number) {
  if (level <= 10) return 60;
  if (level <= 20) return 90;
  return 120;
}

function generateSolvedState(tubeCount: number, tubeCapacity: number, elementTypes: number, totalElements: number) {
  const tubes: number[][] = Array.from({ length: tubeCount }, () => []);
  let remaining = totalElements;

  for (let type = 0; type < elementTypes && type < tubeCount; type++) {
    const elementsForType = Math.min(tubeCapacity, remaining);
    if (elementsForType <= 0) break;
    const tube = tubes[type];
    for (let i = 0; i < elementsForType; i++) {
      tube.push(type);
    }
    remaining -= elementsForType;
  }

  return tubes;
}

function cloneState(tubes: number[][]) {
  return tubes.map(tube => [...tube]);
}

function canPour(source: number[], destination: number[], tubeCapacity: number) {
  if (source.length === 0) return false;
  if (destination.length >= tubeCapacity) return false;
  if (destination.length === 0) return true;
  return source[source.length - 1] === destination[destination.length - 1];
}

function performPour(state: number[][], from: number, to: number, tubeCapacity: number) {
  const next = cloneState(state);
  const source = next[from];
  const destination = next[to];
  if (!canPour(source, destination, tubeCapacity)) return null;

  const element = source.pop();
  if (element === undefined) return null;
  destination.push(element);
  return next;
}

function shuffleState(state: number[][], tubeCapacity: number, moves: number, seed: number) {
  let current = cloneState(state);
  let usedMoves = 0;
  let rng = seed;

  const randomIndex = (max: number) => {
    rng = (rng * 9301 + 49297) % 233280;
    return Math.floor((rng / 233280) * max);
  };

  while (usedMoves < moves) {
    const from = randomIndex(current.length);
    const to = randomIndex(current.length);
    if (from === to) continue;

    const next = performPour(current, from, to, tubeCapacity);
    if (!next) continue;

    current = next;
    usedMoves++;
  }

  return { state: current, shuffleMoves: usedMoves };
}

export function getTubeSortLevel(level: number): TubeSortLevelConfig {
  const boundedLevel = clamp(level, 1, LEVEL_COUNT);
  const tubeCount = getTubeCount(boundedLevel);
  const tubeCapacity = getTubeCapacity(boundedLevel);
  const elementTypes = getElementTypes(boundedLevel);
  const totalElements = elementTypes * tubeCapacity; // one full tube per color

  const tier = getTier(boundedLevel);
  const shuffleMoves = SHUFFLE_MOVES[tier];
  const seed = 1000 + boundedLevel * 7919;

  const solvedState = generateSolvedState(tubeCount, tubeCapacity, elementTypes, totalElements);
  const { shuffleMoves: actualMoves } = shuffleState(solvedState, tubeCapacity, shuffleMoves, seed + 17);

  return {
    level: boundedLevel,
    tubeCount,
    tubeCapacity,
    elementTypes,
    totalElements,
    optimalMoves: actualMoves,
    targetTimeSeconds: getTargetTimeSeconds(boundedLevel),
    difficultyMultiplier: getDifficultyMultiplier(boundedLevel),
    seed
  };
}

export const TUBE_SORT_LEVELS: Record<number, TubeSortLevelConfig> = Array.from(
  { length: LEVEL_COUNT },
  (_, index) => getTubeSortLevel(index + 1)
).reduce((acc, level) => {
  acc[level.level] = level;
  return acc;
}, {} as Record<number, TubeSortLevelConfig>);

export const TUBE_SORT_COLORS = basePalette;