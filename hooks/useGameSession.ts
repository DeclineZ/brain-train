import { createClient } from '@/utils/supabase/client';
import { calculateClinicalStats } from '@/lib/scoring/example';
import { calculateMatchingStats } from '@/lib/scoring/matching';
import type { CardGameRawStats, MatchingGameStats, ClinicalStats } from '@/types';

export const useGameSession = () => {
  const supabase = createClient();

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
      clinicalStats = { ...calculateMatchingStats(rawData as MatchingGameStats), stat_emotion: null };
    }
    // Add 'else if' for other games here later...

    const { data: { user } } = await supabase.auth.getUser();
    const userIdToSave = user ? user.id : 'd58f1e3b-f35c-4a0e-9a30-4a312cad0f5a';

    const { error } = await supabase.from('game_sessions').insert({
      game_id: gameId,
      user_id: userIdToSave,

      // 1. The Clinical Stats (Structured for easy graphing)
      stat_memory: clinicalStats.stat_memory,
      stat_speed: clinicalStats.stat_speed,
      stat_focus: clinicalStats.stat_focus,
      stat_visual: clinicalStats.stat_visual,
      stat_planning: clinicalStats.stat_planning,
      stat_emotion: clinicalStats.stat_emotion,

      // 2. The Universal Time (Keep this, it's useful for sorting)
      duration_seconds: rawData.userTimeMs ? rawData.userTimeMs / 1000 : 0,

      current_played: rawData.current_played ?? rawData.levelPlayed ?? 1,

      raw_data: rawData
    });

    if (error) console.error("Error saving:", error);

    return clinicalStats;
  };

  return { submitSession };
};
