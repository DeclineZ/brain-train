import { createClient } from "@/utils/supabase/server";
import { DailyMission } from "@/types";

const MOCK_MISSIONS = [
    { slot_index: 0, label: "Card Match", game_id: "game-01-cardmatch" },
    { slot_index: 1, label: "Sensor Lock", game_id: "game-02-sensorlock" },
];

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

    if (existingMissions && existingMissions.length === 2) {
        return existingMissions as DailyMission[];
    }

    // 2. If incomplete or missing, generate/upsert them
    // (In a real app, this might be a scheduled job, but doing it lazy-load is fine for now)
    const missionsToInsert = MOCK_MISSIONS.map((mock) => ({
        user_id: userId,
        date: today,
        slot_index: mock.slot_index,
        label: mock.label,
        game_id: mock.game_id,
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
    levelPlayed: number
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
            completed_at: new Date().toISOString()
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
