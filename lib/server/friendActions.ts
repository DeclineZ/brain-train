"use server";

import { createClient } from "@/utils/supabase/server";
import type { Result } from "@/types";

// ─── Types ───────────────────────────────────────────────────

export interface FriendProfile {
    user_id: string;
    avatar_url: string | null;
    friend_code: string;
    display_name: string;
}

export interface LeaderboardEntry {
    user_id: string;
    avatar_url: string | null;
    display_name: string;
    total_stars: number;
    is_self: boolean;
    rank: number;
}

export interface GameLeaderboardEntry extends LeaderboardEntry {
    game_stars: number;
    high_score: number;
}

export interface FriendRequest {
    id: string;
    from_user_id: string;
    from_avatar_url: string | null;
    from_display_name: string;
    created_at: string;
}

// ─── Helper: Generate unique friend code ─────────────────────

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateRandomCode(): string {
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return code;
}

export async function generateUniqueFriendCode(userId: string): Promise<Result<string>> {
    const supabase = await createClient();

    // Check if user already has a code
    const { data: existing } = await supabase
        .from('user_profiles')
        .select('friend_code')
        .eq('user_id', userId)
        .single();

    if (existing?.friend_code) {
        return { ok: true, data: existing.friend_code };
    }

    // Try generating unique codes
    for (let attempt = 0; attempt < 100; attempt++) {
        const code = generateRandomCode();
        const { data: conflict } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('friend_code', code)
            .single();

        if (!conflict) {
            const { error } = await supabase
                .from('user_profiles')
                .update({ friend_code: code })
                .eq('user_id', userId);

            if (!error) {
                return { ok: true, data: code };
            }
        }
    }

    return { ok: false, error: 'ไม่สามารถสร้างรหัสได้ กรุณาลองใหม่' };
}

// ─── Get friend code ─────────────────────────────────────────

export async function getFriendCode(userId: string): Promise<Result<string>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('user_profiles')
        .select('friend_code')
        .eq('user_id', userId)
        .single();

    if (error || !data?.friend_code) {
        // Auto-generate if missing
        return generateUniqueFriendCode(userId);
    }

    return { ok: true, data: data.friend_code };
}

// ─── Send friend request ─────────────────────────────────────

export async function sendFriendRequest(friendCode: string): Promise<Result<{ message: string }>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' };
    }

    // Find the target user by friend_code
    const { data: targetProfile, error: findError } = await supabase
        .from('user_profiles')
        .select('user_id, friend_code')
        .eq('friend_code', friendCode)
        .single();

    if (findError || !targetProfile) {
        return { ok: false, error: 'ไม่พบผู้ใช้ที่มีรหัสนี้' };
    }

    if (targetProfile.user_id === user.id) {
        return { ok: false, error: 'ไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้' };
    }

    // Check if already friends
    const uid1 = user.id < targetProfile.user_id ? user.id : targetProfile.user_id;
    const uid2 = user.id < targetProfile.user_id ? targetProfile.user_id : user.id;

    const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id_1', uid1)
        .eq('user_id_2', uid2)
        .single();

    if (existingFriendship) {
        return { ok: false, error: 'เป็นเพื่อนกันอยู่แล้ว' };
    }

    // Check if request already exists (either direction)
    const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${targetProfile.user_id}),and(from_user_id.eq.${targetProfile.user_id},to_user_id.eq.${user.id})`)
        .eq('status', 'pending')
        .single();

    if (existingRequest) {
        return { ok: false, error: 'มีคำขอเป็นเพื่อนอยู่แล้ว' };
    }

    // Create friend request
    const { error: insertError } = await supabase
        .from('friend_requests')
        .insert({
            from_user_id: user.id,
            to_user_id: targetProfile.user_id,
            status: 'pending'
        });

    if (insertError) {
        console.error('Friend request insert error:', insertError);
        return { ok: false, error: 'ไม่สามารถส่งคำขอได้ กรุณาลองใหม่' };
    }

    return { ok: true, data: { message: 'ส่งคำขอเป็นเพื่อนแล้ว!' } };
}

// ─── Get pending friend requests (incoming) ──────────────────

export async function getPendingRequests(userId: string): Promise<Result<FriendRequest[]>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('friend_requests')
        .select(`
      id,
      from_user_id,
      created_at
    `)
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Get pending requests error:', error);
        return { ok: false, error: 'ไม่สามารถดึงคำขอได้' };
    }

    if (!data || data.length === 0) {
        return { ok: true, data: [] };
    }

    // Fetch profiles for all requesting users
    const fromUserIds = data.map(r => r.from_user_id);
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, avatar_url, full_name')
        .in('user_id', fromUserIds);

    const requests: FriendRequest[] = data.map(req => {
        const profile = profiles?.find(p => p.user_id === req.from_user_id);
        return {
            id: req.id,
            from_user_id: req.from_user_id,
            from_avatar_url: profile?.avatar_url || null,
            from_display_name: profile?.full_name || 'ผู้ใช้',
            created_at: req.created_at
        };
    });

    return { ok: true, data: requests };
}

// ─── Accept friend request ───────────────────────────────────

export async function acceptFriendRequest(requestId: string): Promise<Result<{ message: string }>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' };
    }

    // Get the request
    const { data: request, error: fetchError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('id', requestId)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .single();

    if (fetchError || !request) {
        return { ok: false, error: 'ไม่พบคำขอนี้' };
    }

    // Create friendship (ensure user_id_1 < user_id_2)
    const uid1 = request.from_user_id < user.id ? request.from_user_id : user.id;
    const uid2 = request.from_user_id < user.id ? user.id : request.from_user_id;

    const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({ user_id_1: uid1, user_id_2: uid2 });

    if (friendshipError) {
        // If already friends (duplicate), just update the request
        if (friendshipError.code !== '23505') {
            console.error('Friendship insert error:', friendshipError);
            return { ok: false, error: 'ไม่สามารถเพิ่มเพื่อนได้' };
        }
    }

    // Update request status
    await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

    return { ok: true, data: { message: 'เพิ่มเพื่อนสำเร็จ!' } };
}

// ─── Reject friend request ───────────────────────────────────

export async function rejectFriendRequest(requestId: string): Promise<Result<{ message: string }>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' };
    }

    const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .eq('to_user_id', user.id);

    if (error) {
        return { ok: false, error: 'ไม่สามารถปฏิเสธคำขอได้' };
    }

    return { ok: true, data: { message: 'ปฏิเสธคำขอแล้ว' } };
}

// ─── Get friends list ────────────────────────────────────────

export async function getFriendsList(userId: string): Promise<Result<FriendProfile[]>> {
    const supabase = await createClient();

    // Get all friendships for this user
    const { data: friendships, error } = await supabase
        .from('friendships')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    if (error) {
        console.error('Get friends error:', error);
        return { ok: false, error: 'ไม่สามารถดึงรายชื่อเพื่อนได้' };
    }

    if (!friendships || friendships.length === 0) {
        return { ok: true, data: [] };
    }

    // Get friend user IDs
    const friendIds = friendships.map(f =>
        f.user_id_1 === userId ? f.user_id_2 : f.user_id_1
    );

    // Fetch profiles
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, avatar_url, friend_code, full_name')
        .in('user_id', friendIds);

    const friends: FriendProfile[] = (profiles || []).map(p => ({
        user_id: p.user_id,
        avatar_url: p.avatar_url,
        friend_code: p.friend_code,
        display_name: p.full_name || 'ผู้ใช้'
    }));

    return { ok: true, data: friends };
}

// ─── Get leaderboard data (overall) ─────────────────────────

export async function getOverallLeaderboard(userId: string): Promise<Result<LeaderboardEntry[]>> {
    const supabase = await createClient();

    // Get friends list
    const friendsResult = await getFriendsList(userId);
    if (!friendsResult.ok) {
        return { ok: false, error: friendsResult.error };
    }

    // Include self + friends
    const allUserIds = [userId, ...friendsResult.data.map(f => f.user_id)];

    // Get total stars for all users
    const { data: starsData, error: starsError } = await supabase
        .from('user_game_stars')
        .select('user_id, star')
        .in('user_id', allUserIds);

    if (starsError) {
        console.error('Leaderboard stars error:', starsError);
        return { ok: false, error: 'ไม่สามารถดึงข้อมูล leaderboard ได้' };
    }

    // Sum stars per user
    const starsByUser: Record<string, number> = {};
    allUserIds.forEach(id => { starsByUser[id] = 0; });
    (starsData || []).forEach(row => {
        starsByUser[row.user_id] = (starsByUser[row.user_id] || 0) + (row.star || 0);
    });

    // Get profiles
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, avatar_url, friend_code, full_name')
        .in('user_id', allUserIds);

    // Build leaderboard
    const entries: LeaderboardEntry[] = allUserIds.map(uid => {
        const profile = profiles?.find(p => p.user_id === uid);
        return {
            user_id: uid,
            avatar_url: profile?.avatar_url || null,
            display_name: profile?.full_name || 'ผู้ใช้',
            total_stars: starsByUser[uid] || 0,
            is_self: uid === userId,
            rank: 0
        };
    });

    // Sort by stars descending
    entries.sort((a, b) => b.total_stars - a.total_stars);

    // Assign ranks
    entries.forEach((entry, index) => {
        entry.rank = index + 1;
    });

    return { ok: true, data: entries };
}

// ─── Get game leaderboard ────────────────────────────────────

export async function getGameLeaderboard(userId: string, gameId: string): Promise<Result<GameLeaderboardEntry[]>> {
    const supabase = await createClient();

    // Get friends list
    const friendsResult = await getFriendsList(userId);
    if (!friendsResult.ok) {
        return { ok: false, error: friendsResult.error };
    }

    const allUserIds = [userId, ...friendsResult.data.map(f => f.user_id)];

    // Get stars for this game for all users
    const { data: gameStars, error: starsError } = await supabase
        .from('user_game_stars')
        .select('user_id, star')
        .in('user_id', allUserIds)
        .eq('game_id', gameId);

    if (starsError) {
        console.error('Game leaderboard error:', starsError);
        return { ok: false, error: 'ไม่สามารถดึงข้อมูลได้' };
    }

    // Sum stars per user for this game
    const starsByUser: Record<string, number> = {};
    allUserIds.forEach(id => { starsByUser[id] = 0; });
    (gameStars || []).forEach(row => {
        starsByUser[row.user_id] = (starsByUser[row.user_id] || 0) + (row.star || 0);
    });

    // Get high scores from game_sessions
    const { data: sessions } = await supabase
        .from('game_sessions')
        .select('user_id, score')
        .in('user_id', allUserIds)
        .eq('game_id', gameId);

    const highScores: Record<string, number> = {};
    (sessions || []).forEach(s => {
        const score = s.score || 0;
        highScores[s.user_id] = Math.max(highScores[s.user_id] || 0, score);
    });

    // Get profiles
    const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, avatar_url, full_name')
        .in('user_id', allUserIds);

    // Build leaderboard
    const entries: GameLeaderboardEntry[] = allUserIds.map(uid => {
        const profile = profiles?.find(p => p.user_id === uid);
        return {
            user_id: uid,
            avatar_url: profile?.avatar_url || null,
            display_name: profile?.full_name || 'ผู้ใช้',
            total_stars: starsByUser[uid] || 0,
            game_stars: starsByUser[uid] || 0,
            high_score: highScores[uid] || 0,
            is_self: uid === userId,
            rank: 0
        };
    });

    // Sort by stars descending, then high score
    entries.sort((a, b) => {
        if (b.game_stars !== a.game_stars) return b.game_stars - a.game_stars;
        return b.high_score - a.high_score;
    });

    entries.forEach((entry, index) => {
        entry.rank = index + 1;
    });

    return { ok: true, data: entries };
}

// ─── Get pending request count ───────────────────────────────

export async function getPendingRequestCount(userId: string): Promise<number> {
    const supabase = await createClient();

    const { count, error } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', userId)
        .eq('status', 'pending');

    if (error) {
        console.error('Pending count error:', error);
        return 0;
    }

    return count || 0;
}

// ─── Get games where user is #1 among friends ───────────────

export interface Top1GameInfo {
    game_id: string;
    user_value: number; // stars or score
    metric: 'stars' | 'score';
}

export async function getTop1Games(
    userId: string,
    gameIds: string[],
    haveLevelMap: Record<string, boolean>
): Promise<Result<Top1GameInfo[]>> {
    const supabase = await createClient();

    // Get friends
    const friendsResult = await getFriendsList(userId);
    if (!friendsResult.ok) return { ok: false, error: friendsResult.error };

    if (friendsResult.data.length === 0) {
        return { ok: true, data: [] };
    }

    const allUserIds = [userId, ...friendsResult.data.map(f => f.user_id)];

    // Batch fetch stars for ALL games at once
    const { data: allStars } = await supabase
        .from('user_game_stars')
        .select('user_id, game_id, star')
        .in('user_id', allUserIds)
        .in('game_id', gameIds);

    // Batch fetch high scores for endless games
    const endlessGameIds = gameIds.filter(id => !haveLevelMap[id]);
    let allSessions: { user_id: string; game_id: string; score: number }[] = [];
    if (endlessGameIds.length > 0) {
        const { data: sessions } = await supabase
            .from('game_sessions')
            .select('user_id, game_id, score')
            .in('user_id', allUserIds)
            .in('game_id', endlessGameIds);
        allSessions = sessions || [];
    }

    const top1Games: Top1GameInfo[] = [];

    for (const gameId of gameIds) {
        const isLevelGame = haveLevelMap[gameId];

        if (isLevelGame) {
            // Sum stars per user for this game
            const gameStars = (allStars || []).filter(s => s.game_id === gameId);
            const starsByUser: Record<string, number> = {};
            allUserIds.forEach(id => { starsByUser[id] = 0; });
            gameStars.forEach(s => {
                starsByUser[s.user_id] = (starsByUser[s.user_id] || 0) + (s.star || 0);
            });

            // Check if user is #1
            const userStars = starsByUser[userId] || 0;
            if (userStars <= 0) continue;

            const isTop1 = allUserIds.every(uid => uid === userId || (starsByUser[uid] || 0) <= userStars);
            if (isTop1) {
                top1Games.push({ game_id: gameId, user_value: userStars, metric: 'stars' });
            }
        } else {
            // Max score per user for this game
            const gameSessions = allSessions.filter(s => s.game_id === gameId);
            const scoresByUser: Record<string, number> = {};
            allUserIds.forEach(id => { scoresByUser[id] = 0; });
            gameSessions.forEach(s => {
                scoresByUser[s.user_id] = Math.max(scoresByUser[s.user_id] || 0, s.score || 0);
            });

            const userScore = scoresByUser[userId] || 0;
            if (userScore <= 0) continue;

            const isTop1 = allUserIds.every(uid => uid === userId || (scoresByUser[uid] || 0) <= userScore);
            if (isTop1) {
                top1Games.push({ game_id: gameId, user_value: userScore, metric: 'score' });
            }
        }
    }

    return { ok: true, data: top1Games };
}
