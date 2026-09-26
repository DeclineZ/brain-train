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
import { calculateFloatingMarketStats, type FloatingMarketGameStats } from '@/lib/scoring/floatingmarket';
import { calculateCashierStats } from '@/lib/scoring/cashier';
import { calculatePipePatchStats, type PipePatchGameStats } from '@/lib/scoring/pipepatch';
import { calculateParkingJamStats } from '@/lib/scoring/parking-jam';
import { calculateMinerStats, type MinerGameStats } from '@/lib/scoring/miner';
import type { ParkingJamGameStats } from '@/games/game-21-parking-jam/types';
import type { CashierGameStats } from '@/games/game-19-cashier/types';
import type {
  CardGameRawStats,
  MatchingGameStats,
  ClinicalStats,
  SensorLockGameStats,
  BilliardsGameStats,
  FloatingBallMathGameStats,
  DreamDirectGameStats,
  PinkCupGameStats,
  TubeSortGameStats,
  GridHunterGameStats,
  TaxiDriverGameStats,
} from '@/types';
import { isTutorialPayload } from '@/lib/sessionProgression';

/**
 * Calculates standardized clinical stats for a game session payload.
 * Used consistently across session persistence (useGameSession) and optimistic UI (page.tsx).
 */
export function calculateGameClinicalStats(gameId: string, rawData: any): ClinicalStats {
  if (!rawData || isTutorialPayload(rawData)) {
    return {
      stat_memory: null,
      stat_speed: null,
      stat_visual: null,
      stat_focus: null,
      stat_planning: null,
      stat_emotion: null,
    };
  }

  if (gameId === 'game-00-example') {
    return calculateClinicalStats(rawData as CardGameRawStats);
  } else if (gameId === 'game-01-cardmatch') {
    return {
      ...calculateMatchingStats(rawData as MatchingGameStats),
      stat_emotion: rawData.stat_emotion ?? null,
    };
  } else if (gameId === 'game-02-sensorlock') {
    return calculateSensorLockStats(rawData as SensorLockGameStats);
  } else if (gameId === 'game-03-billiards-math') {
    return calculateBilliardsStats(rawData as BilliardsGameStats);
  } else if (gameId === 'game-04-floating-ball-math') {
    return calculateFloatingBallMathStats(rawData as FloatingBallMathGameStats);
  } else if (gameId === 'game-05-wormtrain') {
    return {
      stat_memory: rawData.stat_memory ?? null,
      stat_speed: rawData.stat_speed ?? null,
      stat_visual: rawData.stat_visual ?? null,
      stat_focus: rawData.stat_focus ?? null,
      stat_planning: rawData.stat_planning ?? null,
      stat_emotion: rawData.stat_emotion ?? null,
    };
  } else if (gameId === 'game-06-dreamdirect') {
    return calculateDreamDirectStats(rawData as DreamDirectGameStats);
  } else if (gameId === 'game-07-pinkcup') {
    return calculatePinkCupStats(rawData as PinkCupGameStats);
  } else if (gameId === 'game-08-mysterysound') {
    return {
      stat_memory: rawData.stat_memory ?? null,
      stat_speed: rawData.stat_speed ?? null,
      stat_visual: rawData.stat_visual ?? null,
      stat_focus: rawData.stat_focus ?? null,
      stat_planning: rawData.stat_planning ?? null,
      stat_emotion: rawData.stat_emotion ?? null,
    };
  } else if (gameId === 'game-09-tube-sort') {
    return calculateTubeSortStats(rawData as TubeSortGameStats);
  } else if (gameId === 'game-10-miner') {
    return calculateMinerStats(rawData as MinerGameStats);
  } else if (gameId === 'game-11-pipe-patch') {
    return calculatePipePatchStats(rawData as PipePatchGameStats);
  } else if (gameId === 'game-12-gridhunter') {
    return calculateGridHunterStats(rawData as GridHunterGameStats);
  } else if (gameId === 'game-15-taxidriver') {
    return calculateTaxiDriverStats(rawData as TaxiDriverGameStats);
  } else if (gameId === 'game-17-floatingmarket') {
    return calculateFloatingMarketStats(rawData as FloatingMarketGameStats);
  } else if (gameId === 'game-19-cashier') {
    return calculateCashierStats(rawData as CashierGameStats);
  } else if (gameId === 'game-21-parking-jam') {
    return calculateParkingJamStats(rawData as ParkingJamGameStats);
  }

  return {
    stat_memory: rawData.stat_memory ?? null,
    stat_speed: rawData.stat_speed ?? null,
    stat_visual: rawData.stat_visual ?? null,
    stat_focus: rawData.stat_focus ?? null,
    stat_planning: rawData.stat_planning ?? null,
    stat_emotion: rawData.stat_emotion ?? null,
  };
}
