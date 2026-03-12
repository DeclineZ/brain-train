export interface UnifiedLevelScoreInput {
  rawCore: number;
  level: number;
  maxLevel: number;
  difficultyMultiplier: number;
  success: boolean;
}

const DIFFICULTY_MIN = 0.8;
const DIFFICULTY_MAX = 2.7;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const clamp01 = (value: number) =>
  clamp(Number.isFinite(value) ? value : 0, 0, 1);

export const mapDifficultyFromScale = (
  value: number,
  inMin: number,
  inMax: number,
): number => {
  if (!Number.isFinite(value)) return DIFFICULTY_MIN;
  if (inMax <= inMin) return DIFFICULTY_MIN;

  const normalized = clamp01((value - inMin) / (inMax - inMin));
  return DIFFICULTY_MIN + normalized * (DIFFICULTY_MAX - DIFFICULTY_MIN);
};

export const mapLevelToDifficultyMultiplier = (
  level: number,
  maxLevel: number,
): number => {
  const safeMaxLevel = Math.max(1, maxLevel);
  const normalized = clamp01((level - 1) / Math.max(1, safeMaxLevel - 1));
  return DIFFICULTY_MIN + normalized * (DIFFICULTY_MAX - DIFFICULTY_MIN);
};

export function calculateUnifiedLevelScore(
  input: UnifiedLevelScoreInput,
): number {
  const raw = clamp01(input.rawCore);
  const levelNorm = clamp01((input.level - 1) / Math.max(1, input.maxLevel - 1));
  const difficultyNorm = clamp01(
    (input.difficultyMultiplier - DIFFICULTY_MIN) /
      (DIFFICULTY_MAX - DIFFICULTY_MIN),
  );

  const difficultyFactor = 1 + 0.18 * difficultyNorm;
  const levelPenalty = 0.22 * levelNorm;
  const finalCore = input.success
    ? clamp01(raw * difficultyFactor - levelPenalty)
    : 0;

  return Math.round(clamp(finalCore * 100, 0, 100));
}
