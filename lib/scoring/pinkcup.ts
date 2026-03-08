import type { RoundTelemetry } from '@/games/game-07-pinkcup/types';
import type { ClinicalStats } from '@/types';

const DIFFICULTY_MIN = 0.8;
const DIFFICULTY_SPAN = 1.9;
const DIFFICULTY_MAX_BONUS = 0.12;

export interface PinkCupGameStats {
  telemetry: RoundTelemetry;
  success: boolean;
  level: number;
  difficultyMultiplier: number;
}

const safeRate = (numerator: number, denominator: number) => (denominator > 0 ? numerator / denominator : 0);

const saturatingTargetCore = (actual: number, target: number) => {
  if (target <= 0) return 1;
  const over = Math.max(0, actual - target);
  return target / (target + over);
};

const toPercent = (core: number) => Math.round(100 * core);

const difficultyBonus = (difficultyMultiplier: number) =>
  DIFFICULTY_MAX_BONUS * ((difficultyMultiplier - DIFFICULTY_MIN) / DIFFICULTY_SPAN);

const applySoftBonus = (core: number, bonus: number) => core + (1 - core) * bonus;

export function calculatePinkCupStats(data: PinkCupGameStats): ClinicalStats {
  const { telemetry, difficultyMultiplier, success } = data;

  if (!telemetry || !difficultyMultiplier || difficultyMultiplier <= 0) {
    return getZeroStats();
  }

  const bonus = difficultyBonus(difficultyMultiplier);

  const spatialCore = calculateSpatialCore(telemetry);
  const planningCore = calculatePlanningCore(telemetry);
  const memoryCore = calculateMemoryCore(telemetry, success);
  const speedCore = calculateSpeedCore(telemetry);
  const planningBlendCore = 0.6 * spatialCore + 0.4 * planningCore;

  return {
    stat_memory: toPercent(applySoftBonus(memoryCore, bonus)),
    stat_speed: toPercent(applySoftBonus(speedCore, bonus)),
    stat_planning: toPercent(applySoftBonus(planningBlendCore, bonus)),
    stat_visual: null,
    stat_focus: null,
    stat_emotion: null
  };
}

function getZeroStats(): ClinicalStats {
  return {
    stat_memory: 0,
    stat_speed: 0,
    stat_planning: 0,
    stat_visual: null,
    stat_focus: null,
    stat_emotion: null
  };
}

function calculateSpatialCore(telemetry: RoundTelemetry): number {
  const { moves, targetCell, pinkStart } = telemetry;

  if (moves.length === 0) {
    return 0;
  }

  let goodMoves = 0;
  let currentPos = pinkStart;

  moves.forEach((move) => {
    const distanceBefore = Math.abs(currentPos.x - targetCell.x) + Math.abs(currentPos.y - targetCell.y);
    const distanceAfter = move.distanceToTarget;
    if (distanceAfter < distanceBefore) {
      goodMoves++;
    }
    currentPos = move.to;
  });

  const goodMoveRate = goodMoves / moves.length;
  const optimalMoves = Math.abs(pinkStart.x - targetCell.x) + Math.abs(pinkStart.y - targetCell.y);
  const detourMoves = Math.max(0, moves.length - optimalMoves);
  const pathEfficiency = safeRate(optimalMoves, optimalMoves + detourMoves);
  return 0.6 * goodMoveRate + 0.4 * pathEfficiency;
}

function calculateMemoryCore(telemetry: RoundTelemetry, success: boolean): number {
  const { probes } = telemetry;

  if (probes.length === 0) {
    return 0;
  }

  const correctProbes = probes.filter(p => p.correct).length;
  const recallAccuracy = correctProbes / probes.length;

  const recallRTs = probes
    .map(p => p.answerTime - p.probeTime)
    .filter(rt => rt > 0);
  const avgRecallRTMs = recallRTs.length > 0
    ? recallRTs.reduce((sum, rt) => sum + rt, 0) / recallRTs.length
    : 2500;
  const recallRtCore = saturatingTargetCore(avgRecallRTMs, 2500);
  const baseCore = 0.85 * recallAccuracy + 0.15 * recallRtCore;
  return success ? baseCore : baseCore * 0.6;
}

function calculateSpeedCore(telemetry: RoundTelemetry): number {
  const { moves, t_start, t_end } = telemetry;

  if (moves.length === 0) {
    return 0;
  }

  const rtFirstMs = Math.max(0, moves[0].timestamp - t_start);
  const interMoveRTs: number[] = [];
  for (let i = 1; i < moves.length; i++) {
    const rt = moves[i].timestamp - moves[i - 1].timestamp;
    if (rt > 0) {
      interMoveRTs.push(rt);
    }
  }

  const meanInterMoveRT = interMoveRTs.length > 0
    ? interMoveRTs.reduce((sum, rt) => sum + rt, 0) / interMoveRTs.length
    : 2000;
  const completionTimeMs = Math.max(0, t_end - t_start);

  const firstMoveCore = saturatingTargetCore(rtFirstMs, 3000);
  const interMoveCore = saturatingTargetCore(meanInterMoveRT, 2000);
  const completionCore = saturatingTargetCore(completionTimeMs, 60000);

  return 0.4 * firstMoveCore + 0.3 * interMoveCore + 0.3 * completionCore;
}

function calculatePlanningCore(telemetry: RoundTelemetry): number {
  const { moves, targetCell, pinkStart } = telemetry;

  if (moves.length === 0) {
    return 0;
  }

  const optimalMoves = Math.abs(pinkStart.x - targetCell.x) + Math.abs(pinkStart.y - targetCell.y);
  const detourMoves = Math.max(0, moves.length - optimalMoves);
  const backtrackCount = moves.filter(m => m.backtracked).length;
  const moveEfficiency = safeRate(optimalMoves, optimalMoves + detourMoves);
  const stability = 1 - safeRate(backtrackCount, moves.length);
  return 0.75 * moveEfficiency + 0.25 * stability;
}
