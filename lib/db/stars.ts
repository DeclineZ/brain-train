import { createClient } from "@/utils/supabase/server";

export interface UserGameStars {
    user_id: string;
    game_id: string;
    level: number;
    star: number;
}

export async function getUserStars(userId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('user_game_stars')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching user stars:', error);
        return [];
    }

    return data as UserGameStars[]; // Returns rows now
}

export async function getGlobalStarCount(userId: string): Promise<number> {
    const supabase = await createClient();

    // Sum star from all levels for this user
    const { data, error } = await supabase
        .from('user_game_stars')
        .select('star')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching global star count:', error);
        return 0;
    }

    // Calculate sum manually
    const total = data.reduce((acc, row) => acc + (row.star || 0), 0);

    return total;
}

// Helper to get stars in the format the UI expects (level_X_stars)
export async function getGameStars(userId: string, gameId: string): Promise<Record<string, number>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('user_game_stars')
        .select('level, star')
        .eq('user_id', userId)
        .eq('game_id', gameId);

    if (error) {
        console.error('Error fetching game stars:', error);
        return {};
    }

    const result: Record<string, number> = {};
    if (data) {
        data.forEach((row: any) => {
            result[`level_${row.level}_stars`] = row.star;
        });
    }

    return result;
}

export async function upsertLevelStars(
    userId: string,
    gameId: string,
    level: number,
    newStars: number
) {
    const supabase = await createClient();

    // 1. Fetch existing row to determine logic
    const { data: existing } = await supabase
        .from('user_game_stars')
        .select('star')
        .eq('user_id', userId)
        .eq('game_id', gameId)
        .eq('level', level)
        .single();

    const oldStars = existing ? existing.star : 0;

    // 2. Only update if new score is higher
    if (newStars <= oldStars) {
        console.log(`[upsertLevelStars] No update needed. Old: ${oldStars}, New: ${newStars}`);
        return { success: true, updated: false, stars: oldStars };
    }

    // 3. Upsert (Insert or Update)
    const { error } = await supabase
        .from('user_game_stars')
        .upsert({
            user_id: userId,
            game_id: gameId,
            level: level,
            star: newStars
        }, {
            onConflict: 'user_id, game_id, level'
        });

    if (error) {
        console.error('[upsertLevelStars] Upsert failed:', error);
        return { success: false, error };
    }

    return { success: true, updated: true, stars: newStars };
}
