"use server"

import { checkMissionCompletion } from "@/lib/dailyMissions"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import type { ClinicalStats } from "@/types"
import { upsertLevelStars } from "@/lib/stars"
import { addCoins } from "@/lib/server/shopAction"

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
        const levelPlayed = rawData.level ?? rawData.levelPlayed ?? rawData.current_played ?? 1

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
        // SKIP if Tutorial (Level 0) - We don't want tutorials to affect global stats
        let currentProfile = null;
        if (levelPlayed > 0) {
            const { data, error: profileError } = await supabase
                .from("user_profiles")
                .select("global_memory, global_speed, global_visual, global_focus, global_planning, global_emotion")
                .eq("user_id", user.id)
                .single()

            if (profileError) {
                console.error("Error fetching profile:", profileError)
            }
            currentProfile = data;
        }

        // 3. Calculate New Stats
        // Formula: Current + ((GameResult - Current) * LearningRate)
        // If Current is null, New = GameResult
        // If GameResult is null, Skip
        const newStats: any = {}
        const statChanges: Record<string, number> = {}
        const statToGlobal: Record<string, string> = {
            stat_memory: "global_memory",
            stat_speed: "global_speed",
            stat_visual: "global_visual",
            stat_focus: "global_focus",
            stat_planning: "global_planning",
            stat_emotion: "global_emotion",
        }

        // Only calculate stats if not tutorial
        if (levelPlayed > 0) {

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
                const dbKey = statToGlobal[key]
                // @ts-ignore
                const currentVal = currentProfile ? currentProfile[dbKey] : null

                if (gameResult !== null && gameResult !== undefined) {
                    if (currentVal === null || currentVal === undefined) {
                        // First time this stat is recorded -> Set to Game Result
                        newStats[dbKey] = gameResult
                        // We consider this an "increase" from 0/null
                        statChanges[key] = gameResult
                    } else {
                        // Standard update formula
                        // New = Current + ((GameResult - Current) * LearningRate)
                        const delta = gameResult - currentVal
                        const change = delta * learningRate
                        // Ensure we stay within 0-100 and send integers (assuming DB is integer keys)
                        const newVal = Math.max(0, Math.min(100, Math.round(currentVal + change)))
                        newStats[dbKey] = newVal
                        statChanges[key] = newVal - currentVal
                    }
                }
                // If gameResult is null, we leave newStats[dbKey] undefined, so it won't be updated.
            })

            // 4. Update User Profile (if there are changes)
            if (Object.keys(newStats).length > 0) {
                const { error: updateError } = await supabase
                    .from("user_profiles")
                    .update(newStats)
                    .eq("user_id", user.id)

                if (updateError) {
                    console.error("Error updating profile stats:", updateError)
                    return { ok: false, error: `Failed to update profile stats: ${JSON.stringify(updateError)}` }
                }
            }
        } // End levelPlayed > 0 check

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
            score: rawData.score || 0, // Explicitly save score column
        })

        if (sessionError) {
            console.error("Error saving game session:", sessionError)
            return { ok: false, error: "Failed to save game session" }
        }

        // 6. Update Star Progression
        let starInfo = null;

        // Skip stars for Tutorial (Level 0)
        if (levelPlayed > 0 && rawData.stars !== undefined) {
            try {
                const starsEarned = Number(rawData.stars);
                if (!isNaN(starsEarned)) {
                    starInfo = await upsertLevelStars(user.id, gameId, levelPlayed, starsEarned);
                } else {
                    console.warn(`[submitGameSession] Stars is NaN: ${rawData.stars}`);
                }
            } catch (starErr) {
                console.error("Error updating stars:", starErr);
            }
        } else if (levelPlayed > 0) {
            console.warn(`[submitGameSession] rawData.stars is undefined`);
        }

        // 7. Add Coin Reward (Skip if Tutorial / Level 0)
        let coinResult: { ok: boolean, data?: { new_balance?: number }, error?: any } = { ok: true, data: { new_balance: undefined } }
        if (levelPlayed > 0) {
            let rewardAmount = 20
            let rewardReason = `เล่นเกมด่าน ${levelPlayed} สำเร็จ`

            if (gameId === 'game-02-sensorlock') {
                // Dynamic Reward: Score / 500.
                // Typical Score: ~15,000 -> 30 Coins.
                const score = rawData.score || 0
                rewardAmount = Math.max(1, Math.floor(score / 600))
                rewardReason = `เล่น Sensor Lock คะแนน ${score}`
            }

            const res = await addCoins(user.id, rewardAmount, rewardReason, "game_session")
            if (!res.ok) {
                console.error("Failed to add coin reward:", res.error)
            } else {
                coinResult = res
            }
        }

        // 8. Check Daily Mission Completion (Skip if Tutorial / Level 0)
        let missionCompleted = false
        let completedMission = null

        if (levelPlayed > 0) {
            const res = await checkMissionCompletion(user.id, gameId, levelPlayed)
            missionCompleted = res.completed
            completedMission = res.mission
        }

        // 9. Get Total Completed Count for Today (for UI update)
        const today = new Date().toISOString().split("T")[0]
        const { count: dailyPlayedCount } = await supabase
            .from("daily_missions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("date", today)
            .eq("completed", true)

        let allMissionsCompleted = false;
        // Assuming there are always 2 missions for now.
        // If dailyPlayedCount is 2 (or more?), and we JUST completed one (missionCompleted is distinct),
        // we might want to flag it. 
        // Logic: If missionCompleted is true AND dailyPlayedCount === 2, then we just finished the set.
        if (missionCompleted && dailyPlayedCount === 2) {
            // Award Bonus 100 Coins
            const bonusRes = await addCoins(user.id, 100, "Daily Quests Completed Bonus", "mission_bonus");
            if (!bonusRes.ok) {
                console.error("Failed to add mission bonus coins:", bonusRes.error);
            } else {
                // Update the returned newBalance if successful
                if (coinResult.ok && coinResult.data) {
                    coinResult.data.new_balance = bonusRes.data?.new_balance;
                } else {
                    coinResult = bonusRes;
                }
                allMissionsCompleted = true;
            }
        }

        revalidatePath("/stats")
        // Also revalidate home page where missions are shown
        revalidatePath("/")

        return {
            ok: true,
            newStats,
            statChanges,
            isReplay,
            learningRate,
            starInfo,
            newBalance: coinResult.ok ? coinResult.data?.new_balance : undefined,
            missionResult: missionCompleted ? {
                completed: true,
                label: completedMission?.label,
                slotIndex: completedMission?.slot_index
            } : null,
            dailyPlayedCount,
            allMissionsCompleted
        }
    } catch (err) {
        console.error("Unexpected error in submitGameSession:", err)
        return { ok: false, error: "Internal server error" }
    }
}