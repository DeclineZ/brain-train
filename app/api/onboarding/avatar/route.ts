import { NextRequest, NextResponse } from 'next/server';
import { addItemToInventory } from '@/lib/server/shopAction';
import { createClient } from '@/utils/supabase/server';

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

    // Check if user has already claimed a free avatar
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('claimed_free_avatar')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { ok: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' },
        { status: 400 }
      );
    }

    // If profile exists and user has already claimed a free avatar
    if (profile && profile.claimed_free_avatar) {
      return NextResponse.json(
        { ok: false, error: 'คุณได้เลือกอวาตาร์ฟรีไปแล้ว หากต้องการเปลี่ยนอวาตาร์สามารถทำได้ในร้านค้า' },
        { status: 400 }
      );
    }

    // Find the item by item_key to get the correct item_id
    const { data: items, error: itemError } = await supabase
      .from('items')
      .select('id')
      .eq('item_key', avatarId)
      .single();

    if (itemError || !items) {
      return NextResponse.json(
        { ok: false, error: 'ไม่พบอวาตาร์ที่เลือก' },
        { status: 400 }
      );
    }

    // Add selected avatar to user's inventory using the correct item_id
    const inventoryResult = await addItemToInventory(user.id, items.id, 1);
    
    if (!inventoryResult.ok) {
      return NextResponse.json(
        { ok: false, error: inventoryResult.error },
        { status: 400 }
      );
    }

    // Set as user's avatar and mark free avatar as claimed
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({ 
        user_id: user.id,
        avatar_url: avatarId,
        claimed_free_avatar: true,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { ok: false, error: 'ไม่สามารถบันทึกข้อมูลอวาตาร์' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      ok: true, 
      data: { 
        message: 'เลือกอวาตาร์สำเร็จแล้ว!',
        avatarId: avatarId 
      } 
    });
  } catch (error) {
    console.error('Onboarding avatar API error:', error);
    return NextResponse.json(
      { ok: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
