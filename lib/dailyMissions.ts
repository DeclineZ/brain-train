import { createClient } from "@/utils/supabase/server";
import { DailyMission } from "@/types";

// Helper to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export async function getDailyMissions(userId: string): Promise<DailyMission[]> {
    const supabase = await createClient();
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

    const statsList = [
        { key: "global_memory", val: profile?.global_memory ?? 0 },
        { key: "global_speed", val: profile?.global_speed ?? 0 },
        { key: "global_visual", val: profile?.global_visual ?? 0 },
        { key: "global_focus", val: profile?.global_focus ?? 0 },
        { key: "global_planning", val: profile?.global_planning ?? 0 },
        { key: "global_emotion", val: profile?.global_emotion ?? 0 },
    ];

    // Sort ascending by value to find weaknesses
    statsList.sort((a, b) => a.val - b.val);

    const weakest1 = statsList[0].key;
    const weakest2 = statsList[1].key;

    // Dimension to Game IDs mapping
    const DIMENSION_GAMES: Record<string, string[]> = {
        global_memory: ["game-01-cardmatch", "game-13-boxpattern", "game-14-wordrecognize"],
        global_focus: ["game-02-sensorlock", "game-06-dreamdirect", "game-18-runforyourlife"],
        global_planning: ["game-09-tube-sort", "game-21-parking-jam", "game-05-wormtrain"],
        global_speed: ["game-02-sensorlock", "game-06-dreamdirect", "game-12-gridhunter"],
        global_visual: ["game-20-boxcounting", "game-11-pipe-patch", "game-10-miner"],
        global_emotion: ["game-08-mysterysound"],
    };

    // Map of game_id -> game object
    const gamesById = new Map<string, typeof allGames[0]>();
    allGames.forEach(game => {
        gamesById.set(game.game_id, game);
    });

    const getGamesForDimension = (dim: string) => {
        const ids = DIMENSION_GAMES[dim] || [];
        return ids.map(id => gamesById.get(id)).filter((g): g is NonNullable<typeof g> => !!g);
    };

    const gamesForWeakness1 = getGamesForDimension(weakest1);
    const gamesForWeakness2 = getGamesForDimension(weakest2);

    let chosenGame1: typeof allGames[0];
    let chosenGame2: typeof allGames[0];
    let chosenGame3: typeof allGames[0];

    // 1. Pick Game 2 (Weakest 1)
    if (gamesForWeakness1.length > 0) {
        chosenGame2 = gamesForWeakness1[Math.floor(Math.random() * gamesForWeakness1.length)];
    } else {
        chosenGame2 = allGames[Math.floor(Math.random() * allGames.length)];
    }

    // 2. Pick Game 3 (Weakest 2) - Exclude chosenGame2
    const filteredWeakness2 = gamesForWeakness2.filter(g => g.game_id !== chosenGame2.game_id);
    if (filteredWeakness2.length > 0) {
        chosenGame3 = filteredWeakness2[Math.floor(Math.random() * filteredWeakness2.length)];
    } else {
        if (gamesForWeakness2.length > 0) {
            chosenGame3 = gamesForWeakness2[Math.floor(Math.random() * gamesForWeakness2.length)];
        } else {
            const fallbackGames = allGames.filter(g => g.game_id !== chosenGame2.game_id);
            chosenGame3 = fallbackGames[Math.floor(Math.random() * fallbackGames.length)] || allGames[0];
        }
    }

    // 3. Pick Game 1 (Random all games) - Exclude chosenGame2 and chosenGame3
    const filteredAllGames = allGames.filter(g => g.game_id !== chosenGame2.game_id && g.game_id !== chosenGame3.game_id);
    if (filteredAllGames.length > 0) {
        chosenGame1 = filteredAllGames[Math.floor(Math.random() * filteredAllGames.length)];
    } else {
        chosenGame1 = allGames[Math.floor(Math.random() * allGames.length)];
    }

    const selectedGames = [chosenGame1, chosenGame2, chosenGame3];

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
