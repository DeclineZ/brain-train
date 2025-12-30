import { NextRequest, NextResponse } from 'next/server';
import { updateAvatar, getProfileSettings } from '@/lib/server/settingsAction';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    // Get current profile settings
    const result = await getProfileSettings(user.id);
    
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error('Avatar fetch API error:', error);
    return NextResponse.json(
      { ok: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { avatarUrl } = await request.json();
    
    if (!avatarUrl) {
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

    // Update avatar
    const result = await updateAvatar(user.id, avatarUrl);
    
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error('Avatar update API error:', error);
    return NextResponse.json(
      { ok: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
