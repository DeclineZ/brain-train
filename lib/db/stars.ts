import { createClient } from "@/utils/supabase/server";

export interface UserGameStars {
    user_id: string;
    game_id: string;
    level_1_stars: number;
    level_2_stars: number;
    level_3_stars: number;
    level_4_stars: number;
    level_5_stars: number;
    level_6_stars: number;
    level_7_stars: number;
    level_8_stars: number;
    level_9_stars: number;
    level_10_stars: number;
    total_stars: number;
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

    return data as UserGameStars[];
}

export async function getGlobalStarCount(userId: string): Promise<number> {
    const supabase = await createClient();

    // Sum total_stars from all games for this user
    const { data, error } = await supabase
        .from('user_game_stars')
        .select('total_stars')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching global star count:', error);
        return 0;
    }

    // Calculate sum manually from the rows returned
    // (Since we can't easily do SUM() aggregator without a grouped query or RPC)
    const total = data.reduce((acc, row) => acc + (row.total_stars || 0), 0);

    return total;
}

export async function getGameStars(userId: string, gameId: string): Promise<UserGameStars | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('user_game_stars')
        .select('*')
        .eq('user_id', userId)
        .eq('game_id', gameId)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') { // Not found code
            console.error('Error fetching game stars:', error);
        }
        return null;
    }

    return data as UserGameStars;
}

export async function upsertLevelStars(
    userId: string,
    gameId: string,
    level: number,
    newStars: number
) {
    const supabase = await createClient();
    const levelCol = `level_${level}_stars`;

    // 1. Fetch existing row to determine logic
    const { data: existing } = await supabase
        .from('user_game_stars')
        .select(levelCol)
        .eq('user_id', userId)
        .eq('game_id', gameId)
        .single();

    const oldStars = existing ? (existing as any)[levelCol] : 0;

    // 2. Only update if new score is higher
    if (newStars <= oldStars) {
        console.log(`[upsertLevelStars] No update needed. Old: ${oldStars}, New: ${newStars}`);
        return { success: true, updated: false, stars: oldStars };
    }

    // 3. Perform explicit Update or Insert to avoid upsert/generated column ambiguity
    if (existing) {
        // Row exists, perform UPDATE
        const updateData: any = {};
        updateData[levelCol] = newStars;

        const { error: updateError } = await supabase
            .from('user_game_stars')
            .update(updateData)
            .eq('user_id', userId)
            .eq('game_id', gameId);

        if (updateError) {
            console.error('[upsertLevelStars] Update failed:', updateError);
            return { success: false, error: updateError };
        }
    } else {
        // Row missing, perform INSERT
        const insertData: any = {
            user_id: userId,
            game_id: gameId,
        };
        insertData[levelCol] = newStars;

        const { error: insertError } = await supabase
            .from('user_game_stars')
            .insert(insertData);

        if (insertError) {
            console.error('[upsertLevelStars] Insert failed:', insertError);
            return { success: false, error: insertError };
        }
    }

    return { success: true, updated: true, stars: newStars };
}
