import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
    sendFriendRequest,
    getFriendsList,
    getFriendCode,
    getPendingRequestCount
} from '@/lib/server/friendActions';

// GET: Get friends list + pending request count + own friend code
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' },
                { status: 401 }
            );
        }

        const [friendsResult, codeResult, pendingCount] = await Promise.all([
            getFriendsList(user.id),
            getFriendCode(user.id),
            getPendingRequestCount(user.id)
        ]);

        return NextResponse.json({
            ok: true,
            data: {
                friends: friendsResult.ok ? friendsResult.data : [],
                friendCode: codeResult.ok ? codeResult.data : null,
                pendingCount
            }
        });
    } catch (error) {
        console.error('Friends API error:', error);
        return NextResponse.json(
            { ok: false, error: 'เกิดข้อผิดพลาด' },
            { status: 500 }
        );
    }
}

// POST: Send friend request
export async function POST(request: NextRequest) {
    try {
        const { friendCode } = await request.json();

        if (!friendCode || typeof friendCode !== 'string' || friendCode.length !== 4) {
            return NextResponse.json(
                { ok: false, error: 'กรุณากรอกรหัสเพื่อน 4 หลัก' },
                { status: 400 }
            );
        }

        const result = await sendFriendRequest(friendCode);

        if (!result.ok) {
            return NextResponse.json(
                { ok: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({ ok: true, data: result.data });
    } catch (error) {
        console.error('Friend request API error:', error);
        return NextResponse.json(
            { ok: false, error: 'เกิดข้อผิดพลาด' },
            { status: 500 }
        );
    }
}
