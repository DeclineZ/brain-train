import { submitGameSession } from '@/lib/server/gameSessionActions';
import type { ClinicalStats } from '@/types';
import { calculateGameClinicalStats } from '@/lib/clinicalStats';

export const useGameSession = () => {

  const submitSession = async (gameId: string, rawData: any) => {
    console.log("[useGameSession] submitSession called", { gameId, rawData });

    // 1. Calculate stats based on Game ID (skip for tutorials)
    const clinicalStats: ClinicalStats = calculateGameClinicalStats(gameId, rawData);

    if (process.env.NODE_ENV === "development") {
        console.log("[submitGameSession] clinicalStats:", clinicalStats);
    }
    // 2. Submit to Server Action
    // This handles: Auth check, Replay check (Learning Rate), Profile Update, Session Save
    try {
      const result = await submitGameSession(gameId, rawData, clinicalStats);

      if (!result.ok) {
        console.error("[useGameSession] Error submitting game session:", result.error);
        return {
          ...clinicalStats,
          saveStatus: "failed" as const,
          saveError: typeof result.error === "string" ? result.error : "Failed to save game session",
          statChanges: null,
          earnedCoins: 0,
        };
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[useGameSession] Game session submitted successfully.", result);
      }

      return {
        ...clinicalStats,
        saveStatus: "saved" as const,
        statChanges: result.statChanges ?? null,
        dailyPlayedCount: (result as any).dailyPlayedCount,
        allMissionsCompleted: (result as any).allMissionsCompleted,
        earnedCoins: (result as any).earnedCoins,
        checkinResult: (result as any).checkinResult,
      };
    } catch (err) {
      console.error("[useGameSession] Network or unexpected error submitting game session:", err);
      return {
        ...clinicalStats,
        saveStatus: "failed" as const,
        saveError: err instanceof Error ? err.message : "Unexpected error during session save",
        statChanges: null,
        earnedCoins: 0,
      };
    }
  };

  return { submitSession };
};
