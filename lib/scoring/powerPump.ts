import type { ClinicalStats, PowerPumpGameStats } from '@/types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function calculatePowerPumpStats(data: PowerPumpGameStats): ClinicalStats {
  if (!data.parRotations || data.parRotations <= 0) {
    return {
      stat_memory: null,
      stat_speed: null,
      stat_visual: null,
      stat_focus: null,
      stat_planning: null,
      stat_emotion: null
    };
  }

  const rotRatio = data.tapRotateCount / Math.max(data.parRotations, 1);
  const maxOverRotRatio = 2.5;
  const rotScore =
    100 *
    (1 - clamp((rotRatio - 1) / (maxOverRotRatio - 1), 0, 1));

  const wasteOver = Math.max(0, data.wasteMs - data.parWasteMs);
  const wastePenalty = clamp(wasteOver / 200, 0, 40);

  const supportPenalty =
    data.undoCount * 4 +
    data.resetCount * 12 +
    data.hintUsedCount * 10 +
    data.repeatedRotateSameTileCount * 0.5;

  const planning = clamp(rotScore - wastePenalty - supportPenalty, 0, 100);

  let visual: number | null = null;
  if (data.uniqueTilesRotatedCount >= 3) {
    const expectedRotPerTile = 1.2;
    const rotPerTileBad = 3.2;
    const rotPerTile = data.tapRotateCount / Math.max(data.uniqueTilesRotatedCount, 1);
    const base =
      100 *
      (1 -
        clamp(
          (rotPerTile - expectedRotPerTile) / (rotPerTileBad - expectedRotPerTile),
          0,
          1
        ));
    visual = clamp(base - data.repeatedRotateSameTileCount * 0.4, 0, 100);
  }

  const speed = clamp((data.targetTimeMs / Math.max(data.totalTimeMs, 1)) * 100, 0, 100);

  return {
    stat_memory: null,
    stat_speed: Math.round(speed),
    stat_visual: visual === null ? null : Math.round(visual),
    stat_focus: null,
    stat_planning: Math.round(planning),
    stat_emotion: null
  };
}

export function calculatePowerPumpStars(input: {
  completionState: 'win' | 'in_progress' | 'abandon';
  tapRotateCount: number;
  parRotations: number;
  wasteMs: number;
  parWasteMs: number;
  totalTimeMs: number;
  targetTimeMs: number;
}) {
  if (input.completionState !== 'win') return 0;

  const safeParRotations = Math.max(input.parRotations, 1);
  const safeParWasteMs = Math.max(input.parWasteMs, 1);
  const safeTargetTimeMs = Math.max(input.targetTimeMs, 1);

  const rotationRatio = input.tapRotateCount / safeParRotations;
  const wasteOverRatio = Math.max(0, input.wasteMs - safeParWasteMs) / safeParWasteMs;
  const timeRatio = input.totalTimeMs / safeTargetTimeMs;

  const rotationScore = clamp(100 - Math.max(0, rotationRatio - 1) * 55, 0, 100);
  const wasteScore = clamp(100 - wasteOverRatio * 120, 0, 100);
  const speedScore = clamp(100 - Math.max(0, timeRatio - 1) * 80, 0, 100);

  // Hard gate for 3⭐ so players cannot compensate poor quality in one area
  // with overperformance in another area.
  const canEarnThreeStars =
    rotationRatio <= 1.15 &&
    input.wasteMs <= safeParWasteMs * 1.1 &&
    timeRatio <= 1.12;

  const weighted = rotationScore * 0.38 + wasteScore * 0.42 + speedScore * 0.2;

  if (canEarnThreeStars && weighted >= 90) return 3;
  if (weighted >= 72) return 2;
  if (weighted >= 52) return 1;
  return 0;
}
