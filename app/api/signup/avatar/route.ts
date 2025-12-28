import { NextRequest, NextResponse } from 'next/server';
import { grantFreeAvatar, getFreeAvatars } from '@/lib/server/shopAction';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const result = await getFreeAvatars();
    
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error('Get free avatars API error:', error);
    return NextResponse.json(
      { ok: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { avatarId } = await request.json();
    
    if (!avatarId) {
      return NextResponse.json(
        { ok: false, error: 'จำเป็นต้องระบุอวาตาร์' },
        { status: 400 }
      );
    }

    // Get user from session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    // Grant free avatar to user
    const result = await grantFreeAvatar(user.id, avatarId);
    
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      ok: true, 
      data: { 
        message: 'รับอวาตาร์ฟรีสำเร็จ!',
        avatar: result.data 
      } 
    });
  } catch (error) {
    console.error('Grant free avatar API error:', error);
    return NextResponse.json(
      { ok: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
