import type { RoundTelemetry } from '@/games/game-07-pinkcup/types';

/**
 * Find the Pink Cup - Scoring System
 * Calculates 4 cognitive stats from game telemetry
 * 
 * SCORING ALGORITHM:
 * - All stats start at 100 and subtract penalties for suboptimal performance
 * - Penalties are calculated based on performance metrics vs benchmarks
 * - Final scores are clamped to 0-100 range
 * - Difficulty multiplier scales the final score (typically 0.8-2.0)
 */

export interface PinkCupGameStats {
  telemetry: RoundTelemetry;
  success: boolean;
  level: number;
  difficultyMultiplier: number;
}

export interface PinkCupScoringResult {
  stat_memory: number;
  stat_speed: number;
  stat_spatial: number;
  stat_planning: number;
  stat_visual: number | null;
  stat_focus: number | null;
  stat_emotion: number | null;
}

/**
 * Main scoring function - calculates all 4 cognitive stats
 * 
 * Returns values 0-100 for each stat, clamped to valid range
 */
export function calculatePinkCupStats(data: PinkCupGameStats): PinkCupScoringResult {
  const { telemetry, difficultyMultiplier, success } = data;
  const isTutorial = data.level === 0;

  // Validate inputs
  if (!telemetry || !difficultyMultiplier || difficultyMultiplier <= 0) {
    if (!isTutorial) {
      console.error('[PinkCupStats] Invalid input data');
    }
    return getZeroStats();
  }

  // Calculate individual metrics with defensive checks
  const spatialMetrics = calculateSpatialMetrics(telemetry, difficultyMultiplier);
  const memoryMetrics = calculateMemoryMetrics(telemetry, difficultyMultiplier, success);
  const speedMetrics = calculateSpeedMetrics(telemetry, difficultyMultiplier);
  const planningMetrics = calculatePlanningMetrics(telemetry, difficultyMultiplier);

  return {
    stat_memory: Math.round(memoryMetrics.score),
    stat_speed: Math.round(speedMetrics.score),
    stat_spatial: Math.round(spatialMetrics.score),
    stat_planning: Math.round(planningMetrics.score),
    stat_visual: null,
    stat_focus: null,
    stat_emotion: null
  };
}

/**
 * Helper: Return zero stats for invalid input
 */
function getZeroStats(): PinkCupScoringResult {
  return {
    stat_memory: 0,
    stat_speed: 0,
    stat_spatial: 0,
    stat_planning: 0,
    stat_visual: null,
    stat_focus: null,
    stat_emotion: null
  };
}

/**
 * Calculate Spatial Awareness score
 * Starts at 100, subtracts penalties for bad moves and inefficiency
 */
function calculateSpatialMetrics(
  telemetry: RoundTelemetry,
  difficultyMultiplier: number
) {
  const { moves, targetCell, pinkStart } = telemetry;

  if (moves.length === 0) {
    return {
      goodMoveRate: 0,
      pathDirectness: 0,
      score: 0
    };
  }

  // Calculate good move rate
  // A move is "good" if it reduces distance to target
  let goodMoves = 0;
  let currentPos = pinkStart;

  moves.forEach((move, index) => {
    const distanceBefore = Math.abs(currentPos.x - targetCell.x) + Math.abs(currentPos.y - targetCell.y);
    const distanceAfter = move.distanceToTarget;
    
    if (distanceAfter < distanceBefore) {
      goodMoves++;
    }

    currentPos = move.to;
  });

  const goodMoveRate = goodMoves / moves.length;

  // Calculate path directness
  const optimalMoves = Math.abs(pinkStart.x - targetCell.x) + Math.abs(pinkStart.y - targetCell.y);
  const pathDirectness = optimalMoves / Math.max(moves.length, 1);

  // Calculate spatial score (0-100)
  // Penalty-based: Start at 100, subtract penalties
  // -25 points for each bad move (move that increases distance)
  // -10 points per extra move beyond optimal
  const rawSpatialScore = 100 - 25 * (moves.length - goodMoves) - 10 * Math.max(0, moves.length - optimalMoves);

  // Apply difficulty multiplier
  const spatialScore = clamp(rawSpatialScore * difficultyMultiplier);

  return {
    goodMoveRate: Math.round(goodMoveRate * 100) / 100,
    pathDirectness: Math.round(pathDirectness * 100) / 100,
    score: spatialScore
  };
}

/**
 * Calculate Memory score
 * Starts at 100, subtracts penalties for wrong answers and slow response
 */
function calculateMemoryMetrics(
  telemetry: RoundTelemetry,
  difficultyMultiplier: number,
  success: boolean
) {
  const { probes } = telemetry;

  if (probes.length === 0) {
    return {
      recallAccuracy: 0,
      avgRecallRTMs: 0,
      score: 0
    };
  }

  // Calculate recall accuracy
  const correctProbes = probes.filter(p => p.correct).length;
  const recallAccuracy = correctProbes / probes.length;

  // Calculate average recall reaction time
  const recallRTs = probes
    .map(p => p.answerTime - p.probeTime)
    .filter(rt => rt > 0);
  
  const avgRecallRTMs = recallRTs.length > 0 
    ? recallRTs.reduce((sum, rt) => sum + rt, 0) / recallRTs.length 
    : 0;

  // Calculate memory score (0-100)
  // Penalty-based: Start at 100, subtract penalties
  // -50 points for each wrong answer
  // -0.02 points per millisecond of reaction time
  // If game failed, score is 0
  // Apply difficulty multiplier
  let rawMemoryScore = 100 - 50 * (probes.length - correctProbes) - 0.02 * avgRecallRTMs;

  if (!success) {
    rawMemoryScore = 0;
  }

  const memoryScore = clamp(rawMemoryScore * difficultyMultiplier);

  return {
    recallAccuracy: Math.round(recallAccuracy * 100) / 100,
    avgRecallRTMs: Math.round(avgRecallRTMs),
    score: memoryScore
  };
}

/**
 * Calculate Processing Speed score
 * Starts at 100, subtracts penalties only if slower than benchmarks
 */
function calculateSpeedMetrics(
  telemetry: RoundTelemetry,
  difficultyMultiplier: number
) {
  const { moves, t_start, t_end } = telemetry;

  if (moves.length === 0) {
    return {
      RT_firstMs: 0,
      meanInterMoveRT: 0,
      completionTimeMs: 0,
      score: 0
    };
  }

  // Calculate first reaction time
  const RT_firstMs = moves[0].timestamp - t_start;

  // Calculate inter-move reaction times
  const interMoveRTs: number[] = [];
  for (let i = 1; i < moves.length; i++) {
    const rt = moves[i].timestamp - moves[i - 1].timestamp;
    if (rt > 0) {
      interMoveRTs.push(rt);
    }
  }

  const meanInterMoveRT = interMoveRTs.length > 0
    ? interMoveRTs.reduce((sum, rt) => sum + rt, 0) / interMoveRTs.length
    : 0;

  // Calculate completion time
  const completionTimeMs = t_end - t_start;

  // Calculate speed score (0-100)
  // Start at 100, subtract penalties for slow performance
  // Only penalize if SLOWER than benchmarks
  const T_first_target = 3000; // 3 seconds for first move
  const T_move_target = 2000; // 2 seconds per move
  const T_complete_target = 60000; // 60 seconds total

  // Penalty: -1 point per 30ms over benchmark (only if slower)
  const firstMovePenalty = Math.max(0, (RT_firstMs - T_first_target) / 30);
  const interMovePenalty = Math.max(0, (meanInterMoveRT - T_move_target) / 30);
  const completionPenalty = Math.max(0, (completionTimeMs - T_complete_target) / 600);

  // Apply difficulty multiplier
  const rawSpeedScore = 100 - firstMovePenalty - interMovePenalty - completionPenalty;
  const speedScore = clamp(rawSpeedScore * difficultyMultiplier);

  return {
    RT_firstMs: Math.round(RT_firstMs),
    meanInterMoveRT: Math.round(meanInterMoveRT),
    completionTimeMs: Math.round(completionTimeMs),
    score: speedScore
  };
}

/**
 * Calculate Planning score
 * Measures decision efficiency: reaching goal with minimal unnecessary moves and backtracking
 * Already penalty-based (starts at 100)
 */
function calculatePlanningMetrics(
  telemetry: RoundTelemetry,
  difficultyMultiplier: number
) {
  const { moves, targetCell, pinkStart } = telemetry;

  if (moves.length === 0) {
    return {
      optimalMoves: 0,
      movesTaken: 0,
      detourMoves: 0,
      backtrackCount: 0,
      score: 0
    };
  }

  // Calculate optimal moves (Manhattan distance)
  const optimalMoves = Math.abs(pinkStart.x - targetCell.x) + Math.abs(pinkStart.y - targetCell.y);

  // Calculate detour moves
  const detourMoves = Math.max(0, moves.length - optimalMoves);

  // Calculate backtrack count
  const backtrackCount = moves.filter(m => m.backtracked).length;

  // Calculate planning score (0-100)
  // Penalty-based: Start at 100, subtract penalties
  // -10 points for each detour move
  // -5 points for each backtrack
  let rawPlanningScore = 100 
    - 10 * detourMoves 
    - 5 * backtrackCount;

  // Apply difficulty multiplier
  const planningScore = clamp(rawPlanningScore * difficultyMultiplier);

  return {
    optimalMoves,
    movesTaken: moves.length,
    detourMoves,
    backtrackCount,
    score: planningScore
  };
}

/**
 * Helper: Clamp value between 0 and 100
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
