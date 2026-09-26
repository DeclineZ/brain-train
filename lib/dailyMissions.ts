import { createClient } from "@/utils/supabase/server";
import { DailyMission } from "@/types";
import { selectDailyMissionGames } from "@/lib/recommendations";

export async function getDailyMissions(
    userId: string,
    supabaseClient?: any,
    randomFn: () => number = Math.random
): Promise<DailyMission[]> {
    const supabase = supabaseClient || (await createClient());
    const today = new Date().toISOString().split("T")[0];

    // 1. Fetch existing missions for today
    const { data: existingMissions } = await supabase
        .from("daily_missions")
        .select("*")
        .eq("user_id", userId)
        .eq("date", today)
        .order("slot_index", { ascending: true });

    if (existingMissions && existingMissions.length === 3) {
        return existingMissions as DailyMission[];
    }

    // 2. If incomplete or missing, generate/upsert them

    // Fetch all available games
    const { data: allGames, error: gamesError } = await supabase
        .from("games")
        .select("game_id, title");

    if (gamesError || !allGames || allGames.length < 3) {
        console.error("Error fetching games for daily missions or not enough games:", gamesError);
        return [];
    }

    // Fetch user profile to find top weaknesses
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("global_memory, global_speed, global_visual, global_focus, global_planning, global_emotion")
        .eq("user_id", userId)
        .single();

    const selectedGames = selectDailyMissionGames(allGames, profile, randomFn);

    const missionsToInsert = selectedGames.map((game, index) => ({
        user_id: userId,
        date: today,
        slot_index: index,
        label: game.title,
        game_id: game.game_id,
        completed: false,
    }));

    // We use upsert to be safe against race conditions
    const { data: newMissions, error } = await supabase
        .from("daily_missions")
        .upsert(missionsToInsert, { onConflict: "user_id,date,slot_index" })
        .select()
        .order("slot_index", { ascending: true });



    if (error) {
        console.error("Error creating daily missions:", JSON.stringify(error, null, 2));
        return [];
    }

    return (newMissions as DailyMission[]) || [];
}

export async function checkMissionCompletion(
    userId: string,
    gameId: string,
    levelPlayed: number,
    sessionId?: string | null
): Promise<{ completed: boolean; mission: DailyMission | null }> {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // 1. Get today's missions for this user
    const { data: missions } = await supabase
        .from("daily_missions")
        .select("*")
        .eq("user_id", userId)
        .eq("date", today)
        .order("slot_index", { ascending: true });

    if (!missions) return { completed: false, mission: null };

    // 2. Find the FIRST incomplete mission that matches this game_id
    const targetMission = missions.find(
        (m) => m.game_id === gameId && !m.completed
    );

    if (!targetMission) {
        // All missions for this game are already done (or none exist)
        return { completed: false, mission: null };
    }

    // 3. Mark it as complete
    const { data: updatedMission, error } = await supabase
        .from("daily_missions")
        .update({
            completed: true,
            completed_at: new Date().toISOString(),
            game_session_id: sessionId ?? null
        })
        .eq("id", targetMission.id)
        .select()
        .single();

    if (error) {
        console.error("Error updating mission completion:", error);
        return { completed: false, mission: null };
    }

    return { completed: true, mission: updatedMission as DailyMission };
}
