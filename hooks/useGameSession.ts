import { calculateClinicalStats } from '@/lib/scoring/example';
import { calculateMatchingStats } from '@/lib/scoring/matching';
import { calculateSensorLockStats } from '@/lib/scoring/sensorlock';
import { calculateBilliardsStats } from '@/lib/scoring/billiards';
import { calculateFloatingBallMathStats } from '@/lib/scoring/floatingBallMath';
import { calculateDreamDirectStats } from '@/lib/scoring/dreamdirect';
import { calculatePinkCupStats } from '@/lib/scoring/pinkcup';
import { calculateTubeSortStats } from '@/lib/scoring/tubeSort';
import { calculateGridHunterStats } from '@/lib/scoring/gridhunter';
import { calculateTaxiDriverStats } from '@/lib/scoring/taxidriver';
import { submitGameSession } from '@/lib/server/gameSessionActions';
import type { CardGameRawStats, MatchingGameStats, ClinicalStats, SensorLockGameStats, BilliardsGameStats, FloatingBallMathGameStats, DreamDirectGameStats, PinkCupGameStats, TubeSortGameStats, GridHunterGameStats, TaxiDriverGameStats } from '@/types';

export const useGameSession = () => {

  const submitSession = async (gameId: string, rawData: any) => {
    console.log("[useGameSession] submitSession called", { gameId, rawData });

    let clinicalStats: ClinicalStats = {
      stat_memory: null,
      stat_speed: null,
      stat_visual: null,
      stat_focus: null,
      stat_planning: null,
      stat_emotion: null
    };

    // 1. Calculate stats based on Game ID
    if (gameId === 'game-00-example') {
      clinicalStats = calculateClinicalStats(rawData as CardGameRawStats);
    } else if (gameId === 'game-01-cardmatch') {
      clinicalStats = { ...calculateMatchingStats(rawData as MatchingGameStats), stat_emotion: rawData.stat_emotion ?? null };
    } else if (gameId === 'game-02-sensorlock') {
      clinicalStats = calculateSensorLockStats(rawData as SensorLockGameStats);
    } else if (gameId === 'game-03-billiards-math') {
      clinicalStats = calculateBilliardsStats(rawData as BilliardsGameStats);
    } else if (gameId === 'game-05-wormtrain') {
      clinicalStats = {
        stat_memory: rawData.stat_memory ?? null,
        stat_speed: rawData.stat_speed ?? null,
        stat_visual: rawData.stat_visual ?? null,
        stat_focus: rawData.stat_focus ?? null,
        stat_planning: rawData.stat_planning ?? null,
        stat_emotion: rawData.stat_emotion ?? null
      };
    } else if (gameId === 'game-04-floating-ball-math') {
      clinicalStats = calculateFloatingBallMathStats(rawData as FloatingBallMathGameStats);
    } else if (gameId === 'game-06-dreamdirect') {
      clinicalStats = calculateDreamDirectStats(rawData as DreamDirectGameStats);
    } else if (gameId === 'game-08-mysterysound') {
      // These games pass stats directly from rawData
      clinicalStats = {
        stat_memory: rawData.stat_memory ?? null,
        stat_speed: rawData.stat_speed ?? null,
        stat_visual: rawData.stat_visual ?? null,
        stat_focus: rawData.stat_focus ?? null,
        stat_planning: rawData.stat_planning ?? null,
        stat_emotion: rawData.stat_emotion ?? null
      };
    } else if (gameId === 'game-07-pinkcup') {
      clinicalStats = calculatePinkCupStats(rawData as PinkCupGameStats);
    } else if (gameId === 'game-09-tube-sort') {
      clinicalStats = calculateTubeSortStats(rawData as TubeSortGameStats);
    } else if (gameId === 'game-12-gridhunter') {
      clinicalStats = calculateGridHunterStats(rawData as GridHunterGameStats);
    } else if (gameId === 'game-15-taxidriver') {
      clinicalStats = calculateTaxiDriverStats(rawData as TaxiDriverGameStats);
    }
    // Add 'else if' for other games here later...

    // 2. Submit to Server Action
    // This handles: Auth check, Replay check (Learning Rate), Profile Update, Session Save
    const result = await submitGameSession(gameId, rawData, clinicalStats);

    if (!result.ok) {
      console.error("[useGameSession] Error submitting game session:", result.error);
    } else {
      console.log("[useGameSession] Game session submitted successfully.", result);
    }

    return {
      ...clinicalStats,
      statChanges: result.ok ? result.statChanges : null,
      dailyPlayedCount: result.ok ? (result as any).dailyPlayedCount : undefined,
      allMissionsCompleted: result.ok ? (result as any).allMissionsCompleted : undefined,
      earnedCoins: result.ok ? (result as any).earnedCoins : undefined,
      checkinResult: result.ok ? (result as any).checkinResult : undefined
    };
  };

  return { submitSession };
};
