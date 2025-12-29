import { calculateClinicalStats } from '@/lib/scoring/example';
import { calculateMatchingStats } from '@/lib/scoring/matching';
import { submitGameSession } from '@/lib/server/gameSessionActions';
import type { CardGameRawStats, MatchingGameStats, ClinicalStats } from '@/types';

export const useGameSession = () => {

  const submitSession = async (gameId: string, rawData: any) => {

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
    }
    // Add 'else if' for other games here later...

    // 2. Submit to Server Action
    // This handles: Auth check, Replay check (Learning Rate), Profile Update, Session Save
    const result = await submitGameSession(gameId, rawData, clinicalStats);

    if (!result.ok) {
      console.error("Error submitting game session:", result.error);
    } else {
      console.log("Game session submitted successfully.", result);
    }

    return {
      ...clinicalStats,
      statChanges: result.ok ? result.statChanges : null
    };
  };

  return { submitSession };
};

