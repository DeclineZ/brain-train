import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
    getOverallLeaderboard,
    getGameLeaderboard
} from '@/lib/server/friendActions';

// GET: Get leaderboard data
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const gameId = searchParams.get('gameId');

        if (gameId) {
            const result = await getGameLeaderboard(user.id, gameId);
            if (!result.ok) {
                return NextResponse.json(
                    { ok: false, error: result.error },
                    { status: 400 }
                );
            }
            return NextResponse.json({ ok: true, data: result.data, type: 'game' });
        }

        const result = await getOverallLeaderboard(user.id);
        if (!result.ok) {
            return NextResponse.json(
                { ok: false, error: result.error },
                { status: 400 }
            );
        }
        return NextResponse.json({ ok: true, data: result.data, type: 'overall' });
    } catch (error) {
        console.error('Leaderboard API error:', error);
        return NextResponse.json(
            { ok: false, error: 'เกิดข้อผิดพลาด' },
            { status: 500 }
        );
    }
}
