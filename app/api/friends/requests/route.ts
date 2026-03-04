import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
    getPendingRequests,
    acceptFriendRequest,
    rejectFriendRequest
} from '@/lib/server/friendActions';

// GET: Get pending friend requests
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

        const result = await getPendingRequests(user.id);

        if (!result.ok) {
            return NextResponse.json(
                { ok: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({ ok: true, data: result.data });
    } catch (error) {
        console.error('Friend requests API error:', error);
        return NextResponse.json(
            { ok: false, error: 'เกิดข้อผิดพลาด' },
            { status: 500 }
        );
    }
}

// POST: Accept or reject a friend request
export async function POST(request: NextRequest) {
    try {
        const { requestId, action } = await request.json();

        if (!requestId || !action || !['accept', 'reject'].includes(action)) {
            return NextResponse.json(
                { ok: false, error: 'ข้อมูลไม่ถูกต้อง' },
                { status: 400 }
            );
        }

        const result = action === 'accept'
            ? await acceptFriendRequest(requestId)
            : await rejectFriendRequest(requestId);

        if (!result.ok) {
            return NextResponse.json(
                { ok: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({ ok: true, data: result.data });
    } catch (error) {
        console.error('Friend request action API error:', error);
        return NextResponse.json(
            { ok: false, error: 'เกิดข้อผิดพลาด' },
            { status: 500 }
        );
    }
}
