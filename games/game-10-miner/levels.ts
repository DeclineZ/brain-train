export type MinerObjectType =
  | 'gold_small'
  | 'gold_medium'
  | 'gold_large'
  | 'copper_small'
  | 'copper_medium'
  | 'copper_large'
  | 'iron_small'
  | 'iron_medium'
  | 'iron_large'
  | 'silver_small'
  | 'silver_medium'
  | 'silver_large'
  | 'diamond_small'
  | 'diamond_medium'
  | 'gem'
  | 'money_bag'
  | 'rock'
  | 'stone_small'
  | 'stone_medium'
  | 'stone_large'
  | 'bomb_small'
  | 'bomb_medium'
  | 'bomb_large'
  | 'cursed';

export type MinerObjectConfig = {
  type: MinerObjectType;
  count: number;
  value: number;
  weight: number;
  size: number;
  isHazard?: boolean;
  isCursed?: boolean;
};

export type MinerDynamicEvent = {
  timeSec: number;
  type: 'shift_layer' | 'move_vein' | 'cursed_spawn';
  payload?: Record<string, number>;
  repeat_interval?: number;
};

export type MinerLevelConfig = {
  id: string;
  level: number;
  time_limit_sec: number;
  money_goal: number;
  free_hooks: number;
  hook_drop_cost: number;
  rope_length: number;
  pull_speed_base: number;
  target_decision_time_ms: number;
  spawn_seed: number;
  objects: MinerObjectConfig[];
  hazards: {
    rocks_are_mistake: boolean;
    cursed_items_enabled: boolean;
  };
  dynamic_events: MinerDynamicEvent[];
  max_possible_value: number;
  scoring_mode: 'assessment' | 'standard';
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const baseObjects = {
  gold_small: { value: 90, weight: 1.0, size: 18 },
  gold_medium: { value: 210, weight: 1.4, size: 22 },
  gold_large: { value: 380, weight: 2.2, size: 28 },
  copper_small: { value: 40, weight: 0.8, size: 16 },
  copper_medium: { value: 70, weight: 1.0, size: 20 },
  copper_large: { value: 120, weight: 1.2, size: 24 },
  iron_small: { value: 60, weight: 1.2, size: 18 },
  iron_medium: { value: 95, weight: 1.5, size: 22 },
  iron_large: { value: 160, weight: 1.9, size: 26 },
  silver_small: { value: 120, weight: 1.0, size: 18 },
  silver_medium: { value: 190, weight: 1.3, size: 22 },
  silver_large: { value: 310, weight: 1.7, size: 28 },
  diamond_small: { value: 360, weight: 0.8, size: 19 },
  diamond_medium: { value: 620, weight: 1.1, size: 24 },
  gem: { value: 520, weight: 1.2, size: 20 },
  money_bag: { value: 420, weight: 1.6, size: 24 },
  rock: { value: 0, weight: 2.0, size: 26 },
  stone_small: { value: -12, weight: 1.8, size: 22 },
  stone_medium: { value: -24, weight: 2.2, size: 28 },
  stone_large: { value: -45, weight: 2.8, size: 34 },
  bomb_small: { value: -35, weight: 0.9, size: 20 },
  bomb_medium: { value: -70, weight: 1.2, size: 26 },
  bomb_large: { value: -120, weight: 1.5, size: 32 },
  cursed: { value: 420, weight: 1.8, size: 22 }
};

const LEVEL_COUNT = 30;

const getTier = (level: number) => {
  if (level <= 10) return 'early';
  if (level <= 20) return 'mid';
  return 'late';
};

const getRopeLength = (level: number) => {
  if (level <= 10) return 1.0;
  if (level <= 20) return 0.9;
  return 0.8;
};

const getPullSpeed = (level: number) => {
  const min = 0.9;
  const max = 1.3;
  const pct = (level - 1) / (LEVEL_COUNT - 1);
  return Number((min + (max - min) * pct).toFixed(2));
};

const getTimeLimit = (level: number) => {
  if (level <= 10) return 70;
  if (level <= 20) return 60;
  return 55;
};

const getTargetDecisionTime = (level: number) => {
  if (level <= 10) return 1400;
  if (level <= 20) return 1200;
  return 1050;
};

const getMoneyGoal = (level: number) => {
  const min = 600;
  const max = 1450;
  const pct = (level - 1) / (LEVEL_COUNT - 1);
  return Math.round(min + (max - min) * pct);
};

const getHookDropCost = (level: number) => {
  const min = 65;
  const max = 200;
  const pct = (level - 1) / (LEVEL_COUNT - 1);
  return Math.round(min + (max - min) * pct);
};

const getFreeHooks = (level: number) => {
  if (level <= 10) return 3;
  if (level <= 20) return 2;
  return 1;
};

const getObjectCounts = (level: number) => {
  const tier = getTier(level);
  if (tier === 'early') {
    return {
      gold_small: 6,
      gold_medium: 3,
      gold_large: 1,
      copper_small: 4,
      copper_medium: 2,
      iron_small: 3,
      gem: level >= 4 ? 1 : 0,
      stone_small: level >= 3 ? 3 : 0,
      rock: level >= 2 ? 2 : 0
    };
  }
  if (tier === 'mid') {
    return {
      gold_small: 4,
      gold_medium: 3,
      gold_large: 2,
      copper_small: 3,
      copper_medium: 2,
      copper_large: 1,
      iron_small: 2,
      iron_medium: 2,
      silver_small: level >= 12 ? 2 : 0,
      diamond_small: level >= 18 ? 1 : 0,
      gem: 1,
      money_bag: level >= 15 ? 1 : 0,
      stone_medium: level >= 13 ? 2 : 0,
      bomb_small: level >= 14 ? 2 : 0,
      rock: 3
    };
  }
  return {
    gold_small: 3,
    gold_medium: 3,
    gold_large: 2,
    copper_small: 2,
    copper_medium: 2,
    copper_large: 1,
    iron_small: 2,
    iron_medium: 1,
    iron_large: 1,
    silver_small: 2,
    silver_medium: 1,
    silver_large: 1,
    diamond_small: 1,
    diamond_medium: level >= 25 ? 1 : 0,
    gem: 1,
    money_bag: 1,
    stone_large: 2,
    bomb_medium: 2,
    bomb_large: level >= 28 ? 1 : 0,
    rock: 4,
    cursed: level >= 10 ? 1 : 0
  };
};

const getDynamicEvents = (level: number): MinerDynamicEvent[] => {
  const events: MinerDynamicEvent[] = [];
  if (level >= 5) {
    events.push({
      timeSec: 20,
      type: 'shift_layer',
      payload: { dx: -30, dy: 0, warningSec: 3 },
      repeat_interval: 25
    });
  }
  if (level >= 8) {
    events.push({
      timeSec: 35,
      type: 'shift_layer',
      payload: { dx: 25, dy: 0, warningSec: 3 },
      repeat_interval: 25
    });
  }
  if (level >= 15) {
    events.push({ timeSec: 25, type: 'move_vein', payload: { speed: 18 } });
  }
  if (level >= 18) {
    events.push({ timeSec: 30, type: 'move_vein', payload: { speed: 26 } });
  }
  if (level >= 10) {
    events.push({ timeSec: 32, type: 'cursed_spawn', payload: { penalty: 5 } });
  }
  if (level >= 24) {
    events.push({ timeSec: 42, type: 'cursed_spawn', payload: { penalty: 8 } });
  }
  return events;
};

const buildObjects = (counts: ReturnType<typeof getObjectCounts>): MinerObjectConfig[] => {
  const entries = Object.entries(counts) as Array<[MinerObjectType, number]>;
  return entries
    .filter(([, count]) => count > 0)
    .map(([type, count]) => {
      const base = baseObjects[type];
      return {
        type,
        count,
        value: base.value,
        weight: base.weight,
        size: base.size,
        isHazard: type === 'rock' || type.startsWith('stone') || type.startsWith('bomb'),
        isCursed: type === 'cursed'
      };
    });
};

const computeMaxPossibleValue = (objects: MinerObjectConfig[]) =>
  objects.reduce((sum, obj) => sum + Math.max(0, obj.value) * obj.count, 0);

export const getMinerLevel = (level: number): MinerLevelConfig => {
  const bounded = clamp(level, 1, LEVEL_COUNT);
  const counts = getObjectCounts(bounded);
  const objects = buildObjects(counts);
  const hookDropCost = getHookDropCost(bounded);
  const freeHooks = getFreeHooks(bounded);

  return {
    id: `L${bounded.toString().padStart(2, '0')}`,
    level: bounded,
    time_limit_sec: getTimeLimit(bounded),
    money_goal: getMoneyGoal(bounded),
    free_hooks: freeHooks,
    hook_drop_cost: hookDropCost,
    rope_length: getRopeLength(bounded),
    pull_speed_base: getPullSpeed(bounded),
    target_decision_time_ms: getTargetDecisionTime(bounded),
    spawn_seed: 5000 + bounded * 7919,
    objects,
    hazards: {
      rocks_are_mistake: bounded >= 2,
      cursed_items_enabled: bounded >= 26
    },
    dynamic_events: getDynamicEvents(bounded),
    max_possible_value: computeMaxPossibleValue(objects),
    scoring_mode: 'assessment'
  };
};

export const MINER_LEVELS: Record<number, MinerLevelConfig> = Array.from({ length: LEVEL_COUNT }, (_, i) => {
  const level = getMinerLevel(i + 1);
  return level;
}).reduce((acc, level) => {
  acc[level.level] = level;
  return acc;
}, {} as Record<number, MinerLevelConfig>);