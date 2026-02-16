import type { PowerPumpLevelConfig } from './types';

const LEVEL_COUNT = 30;

// Explicit unique seed per level (deterministic + easy manual tuning)
const LEVEL_SEEDS: Record<number, number> = {
  1: 12013,
  2: 23117,
  3: 34129,
  4: 45137,
  5: 56149,
  6: 67153,
  7: 78167,
  8: 89173,
  9: 100183,
  10: 111193,
  11: 122201,
  12: 133213,
  13: 144227,
  14: 155239,
  15: 166247,
  16: 177257,
  17: 188271,
  18: 199289,
  19: 210301,
  20: 221317,
  21: 232327,
  22: 243343,
  23: 254353,
  24: 265371,
  25: 276383,
  26: 287399,
  27: 298409,
  28: 309433,
  29: 320449,
  30: 331463
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function lerpInt(min: number, max: number, level: number) {
  const t = (level - 1) / (LEVEL_COUNT - 1);
  return Math.round(min + (max - min) * t);
}

function getGrid(level: number) {
  if (level <= 4) return { w: 3, h: 4 };
  if (level <= 8) return { w: 4, h: 4 };
  if (level <= 14) return { w: 5, h: 5 };
  if (level <= 20) return { w: 6, h: 5 };
  if (level <= 26) return { w: 6, h: 6 };
  return { w: 7, h: 7 };
}

function getTargets(level: number) {
  if (level <= 3) return 1;
  if (level <= 10) return 2;
  if (level <= 20) return 3;
  return 4;
}

function getHybrids(level: number) {
  if (level <= 5) return 0;
  if (level <= 10) return 1;
  if (level <= 15) return 2;
  if (level <= 22) return 3;
  return 4;
}

function getDeadEnds(level: number) {
  if (level <= 4) return 0;
  if (level <= 10) return 1;
  if (level <= 18) return 2;
  return 3;
}

function getWireComplexity(level: number) {
  return clamp(lerpInt(6, 18, level), 6, 18);
}

function getParRotations(level: number) {
  const { w, h } = getGrid(level);
  const area = w * h;
  const targets = getTargets(level);
  const complexity = getWireComplexity(level);

  const base =
    2 +
    Math.floor(area * 0.34) +
    targets * 2 +
    Math.floor(complexity * 0.42) +
    Math.floor(level / 6);

  return clamp(base, 4, 34);
}

function getParWasteMs(level: number) {
  const { w, h } = getGrid(level);
  const targets = getTargets(level);
  const complexity = getWireComplexity(level);

  // Keep higher-level waste budget realistic. Very small values made late levels feel unfair.
  const budget =
    900 +
    targets * 320 +
    Math.floor((w * h) * 22) +
    Math.floor(complexity * 38);

  return clamp(budget, 1200, 3400);
}

function getTargetTimeMs(level: number) {
  const { w, h } = getGrid(level);
  const targets = getTargets(level);
  const complexity = getWireComplexity(level);

  const target =
    52000 +
    Math.floor((w * h) * 640) +
    targets * 2600 +
    complexity * 230 +
    level * 140;

  return clamp(target, 60000, 98000);
}

export function getPowerPumpLevel(level: number): PowerPumpLevelConfig {
  const bounded = clamp(level, 1, LEVEL_COUNT);
  const grid = getGrid(bounded);
  const seed = LEVEL_SEEDS[bounded];

  if (seed === undefined) {
    throw new Error(`Missing seed for Power Pump level ${bounded}`);
  }

  return {
    level: bounded,
    gridW: grid.w,
    gridH: grid.h,
    wireComplexity: getWireComplexity(bounded),
    targetsCount: getTargets(bounded),
    pipeJunctionsEnabled: bounded >= 10,
    hybridTilesCount: getHybrids(bounded),
    deadEndTilesCount: getDeadEnds(bounded),
    parRotations: getParRotations(bounded),
    parWasteMs: getParWasteMs(bounded),
    targetTimeMs: getTargetTimeMs(bounded),
    seed
  };
}

export const POWER_PUMP_LEVELS: Record<number, PowerPumpLevelConfig> = Array.from(
  { length: LEVEL_COUNT },
  (_, i) => getPowerPumpLevel(i + 1)
).reduce((acc, level) => {
  acc[level.level] = level;
  return acc;
}, {} as Record<number, PowerPumpLevelConfig>);

// Safety guard: fail fast if future edits introduce duplicate seeds
const _uniqueSeedCount = new Set(Object.values(LEVEL_SEEDS)).size;
if (_uniqueSeedCount !== LEVEL_COUNT) {
  throw new Error('Power Pump seeds must be unique for every level');
}
