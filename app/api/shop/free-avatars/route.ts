import { NextResponse } from 'next/server';
import { getFreeAvatars } from '@/lib/server/shopAction';

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
    console.error('Free avatars API error:', error);
    return NextResponse.json(
      { ok: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
