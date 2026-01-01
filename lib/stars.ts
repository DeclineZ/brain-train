import { createClient } from "@/utils/supabase/server";

export interface UserGameStars {
    user_id: string;
    game_id: string;
    level: number;
    star: number;
}

// Helper function to get current user
async function getCurrentUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
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

// Auto-user versions (no userId parameter needed)
export async function getUserStarsAuto() {
    const user = await getCurrentUser();
    if (!user) return [];
    return getUserStars(user.id);
}

export async function getGlobalStarCountAuto(): Promise<number> {
    const user = await getCurrentUser();
    if (!user) return 0;
    return getGlobalStarCount(user.id);
}

export async function getGameStarsAuto(gameId: string): Promise<Record<string, number>> {
    const user = await getCurrentUser();
    if (!user) return {};
    return getGameStars(user.id, gameId);
}

// Get total stars for a specific game (sum of all levels)
export async function getGameTotalStars(gameId: string, userId?: string): Promise<number> {
    let currentUserId = userId;
    if (!currentUserId) {
        const user = await getCurrentUser();
        if (!user) return 0;
        currentUserId = user.id;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .from('user_game_stars')
        .select('star')
        .eq('user_id', currentUserId)
        .eq('game_id', gameId);

    if (error) {
        console.error('Error fetching game total stars:', error);
        return 0;
    }

    // Calculate sum manually
    const total = data.reduce((acc, row) => acc + (row.star || 0), 0);

    return total;
}

// Get total stars for multiple games at once
export async function getMultipleGameTotalStars(gameIds: string[], userId?: string): Promise<Record<string, number>> {
    let currentUserId = userId;
    if (!currentUserId) {
        const user = await getCurrentUser();
        if (!user) return {};
        currentUserId = user.id;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
        .from('user_game_stars')
        .select('game_id, star')
        .eq('user_id', currentUserId)
        .in('game_id', gameIds);

    if (error) {
        console.error('Error fetching multiple game total stars:', error);
        return {};
    }

    // Group by game_id and sum stars
    const result: Record<string, number> = {};
    if (data) {
        data.forEach((row: any) => {
            if (!result[row.game_id]) {
                result[row.game_id] = 0;
            }
            result[row.game_id] += row.star || 0;
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
