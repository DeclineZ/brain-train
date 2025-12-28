"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import type { ClinicalStats } from "@/types"

export async function submitGameSession(
    gameId: string,
    rawData: any,
    clinicalStats: ClinicalStats
) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { ok: false, error: "Unauthorized" }
    }

    try {
        // 1. Check for Replay (Learning Rate Logic)
        // We check if a session already exists for this game and level *before* inserting the new one.
        // The 'level' is usually in rawData.levelPlayed or rawData.current_played.
        // We'll try to find a consistent level indicator.
        const levelPlayed = rawData.levelPlayed ?? rawData.current_played ?? 1

        const { count: priorSessionCount, error: countError } = await supabase
            .from("game_sessions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("game_id", gameId)
            .eq("current_played", levelPlayed)

        if (countError) {
            console.error("Error checking prior sessions:", countError)
            // Fallback to standard learning rate if check fails, or throw?
            // Let's proceed with standard LR to not block gameplay, but log error.
        }

        const isReplay = (priorSessionCount || 0) > 0
        const learningRate = isReplay ? 0.05 : 0.1

        // 2. Fetch Current User Profile Stats
        const { data: currentProfile, error: profileError } = await supabase
            .from("user_profiles")
            .select("stat_memory, stat_speed, stat_visual, stat_focus, stat_planning, stat_emotion")
            .eq("user_id", user.id)
            .single()

        if (profileError) {
            console.error("Error fetching profile:", profileError)
            // If no profile, we can still save session but can't update stats easily.
            // However, usually profile exists. If not, we might need to create one or skip update.
        }

        // 3. Calculate New Stats
        // Formula: Current + ((GameResult - Current) * LearningRate)
        // If Current is null, New = GameResult
        // If GameResult is null, Skip
        const newStats: Partial<ClinicalStats> = {}
        const statKeys: (keyof ClinicalStats)[] = [
            "stat_memory",
            "stat_speed",
            "stat_visual",
            "stat_focus",
            "stat_planning",
            "stat_emotion",
        ]

        statKeys.forEach((key) => {
            const gameResult = clinicalStats[key]
            const currentVal = currentProfile ? currentProfile[key] : null

            if (gameResult !== null && gameResult !== undefined) {
                if (currentVal === null || currentVal === undefined) {
                    // First time this stat is recorded -> Set to Game Result
                    newStats[key] = gameResult
                } else {
                    // Standard update formula
                    // New = Current + ((GameResult - Current) * LearningRate)
                    const delta = gameResult - currentVal
                    const change = delta * learningRate
                    newStats[key] = currentVal + change
                }
            }
            // If gameResult is null, we leave newStats[key] undefined, so it won't be updated.
        })

        // 4. Update User Profile (if there are changes)
        if (Object.keys(newStats).length > 0) {
            const { error: updateError } = await supabase
                .from("user_profiles")
                .update(newStats)
                .eq("user_id", user.id)

            if (updateError) {
                console.error("Error updating profile stats:", updateError)
                return { ok: false, error: "Failed to update profile stats" }
            }
        }

        // 5. Save Game Session
        // We use the `clinicalStats` passed in, as they are the source of truth for this session.
        const { error: sessionError } = await supabase.from("game_sessions").insert({
            game_id: gameId,
            user_id: user.id,

            // Stats
            stat_memory: clinicalStats.stat_memory,
            stat_speed: clinicalStats.stat_speed,
            stat_focus: clinicalStats.stat_focus,
            stat_visual: clinicalStats.stat_visual,
            stat_planning: clinicalStats.stat_planning,
            stat_emotion: clinicalStats.stat_emotion,

            // Metadata
            duration_seconds: rawData.userTimeMs ? rawData.userTimeMs / 1000 : 0,
            current_played: levelPlayed,
            raw_data: rawData,
        })

        if (sessionError) {
            console.error("Error saving game session:", sessionError)
            return { ok: false, error: "Failed to save game session" }
        }

        revalidatePath("/stats")
        return { ok: true, newStats, isReplay, learningRate }
    } catch (err) {
        console.error("Unexpected error in submitGameSession:", err)
        return { ok: false, error: "Internal server error" }
    }
}
