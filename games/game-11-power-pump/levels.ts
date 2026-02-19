import type { PowerPumpLevelConfig } from './types';

const LEVEL_COUNT = 30;
export const WIRE_UNLOCK_LEVEL = 7;

export function isWireEnabledForLevel(level: number) {
  return level >= WIRE_UNLOCK_LEVEL;
}

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
  if (level <= 2) return { w: 3, h: 4 };
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
  if (level <= 4) return 0;
  if (level <= 8) return 1;
  if (level <= 10) return 1;
  if (level <= 15) return 2;
  if (level <= 22) return 3;
  return 4;
}

function getDeadEnds(level: number) {
  if (level <= 1) return 0;
  if (level <= 4) return 1;
  if (level <= 8) return 2;
  if (level <= 10) return 1;
  if (level <= 18) return 2;
  return 3;
}

type EarlyLevelTuning = Pick<PowerPumpLevelConfig,
  'parRotations' | 'parWasteMs' | 'targetTimeMs' | 'deadEndTilesCount' | 'hybridTilesCount'
>;

const EARLY_LEVEL_TUNING: Partial<Record<number, EarlyLevelTuning>> = {
  1: { parRotations: 8, parWasteMs: 1484, targetTimeMs: 62420, deadEndTilesCount: 0, hybridTilesCount: 0 },
  2: { parRotations: 8, parWasteMs: 1484, targetTimeMs: 62560, deadEndTilesCount: 1, hybridTilesCount: 0 },
  3: { parRotations: 7, parWasteMs: 1365, targetTimeMs: 65000, deadEndTilesCount: 1, hybridTilesCount: 0 },
  4: { parRotations: 9, parWasteMs: 1655, targetTimeMs: 67000, deadEndTilesCount: 1, hybridTilesCount: 0 },
  5: { parRotations: 10, parWasteMs: 1730, targetTimeMs: 69000, deadEndTilesCount: 2, hybridTilesCount: 1 },
  6: { parRotations: 11, parWasteMs: 1710, targetTimeMs: 70000, deadEndTilesCount: 2, hybridTilesCount: 1 },
  7: { parRotations: 13, parWasteMs: 1950, targetTimeMs: 72000, deadEndTilesCount: 2, hybridTilesCount: 1 },
  8: { parRotations: 13, parWasteMs: 1980, targetTimeMs: 73500, deadEndTilesCount: 2, hybridTilesCount: 1 }
};

function getWireComplexity(level: number) {
  if (!isWireEnabledForLevel(level)) return 0;
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

function getLevelIntro(level: number): PowerPumpLevelConfig['intro'] {
  if (level === 3) {
    return {
      title: 'เริ่มมีทางหลอกแล้ว 🧩',
      description:
        'ด่านนี้มีทางตัน/ทางอ้อมมากขึ้นเล็กน้อย\n'
        + 'ลองไล่เส้นจากปั๊มไปปลายทางทีละช่วง จะช่วยลดการหมุนซ้ำ',
      oncePerSession: true
    };
  }

  if (level === 5) {
    return {
      title: 'วางแผนเป็นลำดับขั้น 🧠',
      description:
        'ด่านนี้เริ่มต้องคิดหลายชั้นมากขึ้น\n'
        + 'แนะนำ: วางเส้นหลักก่อน แล้วค่อยเก็บทางย่อย/ทางหลอกทีหลัง',
      oncePerSession: true
    };
  }

  if (level !== WIRE_UNLOCK_LEVEL) return undefined;

  return {
    title: 'ระบบสายไฟมาแล้ว! ⚡',
    description:
      'ด่านนี้ปลดล็อก "เลเยอร์สายไฟ"\n\n'
      + '1) สลับไปที่แท็บ "สายไฟ" แล้วหมุนให้ไฟจากเครื่องกำเนิดไหลถึงปั๊ม\n'
      + '2) เมื่อปั๊มติดแล้ว ค่อยสลับกลับมา "ท่อน้ำ" เพื่อส่งน้ำไปยังทุกปลายทาง\n\n'
      + 'ทริค: ต่อสายไฟให้ถึงปั๊มเป็นขั้นตอนท้าย ๆ เพื่อลดน้ำเสียระหว่างจัดท่อ',
    oncePerSession: true
  };
}

export function getPowerPumpLevel(level: number): PowerPumpLevelConfig {
  const bounded = clamp(level, 1, LEVEL_COUNT);
  const grid = getGrid(bounded);
  const seed = LEVEL_SEEDS[bounded];

  if (seed === undefined) {
    throw new Error(`Missing seed for Power Pump level ${bounded}`);
  }

  const early = EARLY_LEVEL_TUNING[bounded];

  return {
    level: bounded,
    gridW: grid.w,
    gridH: grid.h,
    wireEnabled: isWireEnabledForLevel(bounded),
    wireComplexity: getWireComplexity(bounded),
    targetsCount: getTargets(bounded),
    pipeJunctionsEnabled: bounded >= 10,
    hybridTilesCount: early?.hybridTilesCount ?? getHybrids(bounded),
    deadEndTilesCount: early?.deadEndTilesCount ?? getDeadEnds(bounded),
    parRotations: early?.parRotations ?? getParRotations(bounded),
    parWasteMs: early?.parWasteMs ?? getParWasteMs(bounded),
    targetTimeMs: early?.targetTimeMs ?? getTargetTimeMs(bounded),
    seed,
    intro: getLevelIntro(bounded)
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
