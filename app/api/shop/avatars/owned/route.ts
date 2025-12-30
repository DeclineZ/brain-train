import { NextRequest, NextResponse } from 'next/server';
import { getShopItemsByCategoryWithOwnership } from '@/lib/server/shopAction';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'จำเป็นต้องระบุ userId' },
        { status: 400 }
      );
    }

    const result = await getShopItemsByCategoryWithOwnership('avatar', userId);
    
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    console.error('Owned avatars API error:', error);
    return NextResponse.json(
      { ok: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
