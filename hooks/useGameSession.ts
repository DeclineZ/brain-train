import { createClient } from '@/utils/supabase/client';
import { calculateClinicalStats, CardGameRawStats } from '@/lib/scoring/example';

type ClinicalStats = {
  stat_memory: number | null;
  stat_speed: number | null;
  stat_visual: number | null;
  stat_focus: number | null;
  stat_planning: number | null;
  stat_emotion: number | null;
};

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
    } 
    // Add 'else if' for other games here later...

    const { data: { user } } = await supabase.auth.getUser();
    const userIdToSave = user ? user.id : 'd58f1e3b-f35c-4a0e-9a30-4a312cad0f5a';

    // 2. Save to Supabase
    // Now TypeScript knows 'clinicalStats' definitely exists
    // ... inside useGameSession.ts

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

      // 3. THE MAGIC BACKPACK (JSON)
      // We take EVERYTHING else Phaser sent us and save it here.
      // Game 5 saves: { "wrongFlips": 2, "pairs": 6 }
      // Game 2 saves: { "moves": 15, "tubes": 4 }
      // ALL IN THE SAME COLUMN.
      raw_data: rawData 
    });

    if (error) console.error("Error saving:", error);
    
    return clinicalStats;
  };

  return { submitSession };
};