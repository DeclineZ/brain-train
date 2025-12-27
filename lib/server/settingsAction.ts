import { createClient } from "@/utils/supabase/server";
import type { Result } from "@/types/result";

/**
 * Updates user's avatar URL
 */
export async function updateAvatar(userId: string, avatarUrl: string): Promise<Result<{ avatar_url: string }>> {
  try {
    const supabase = await createClient();
    
    // Validate avatar URL (only allow predefined avatars)
    const allowedAvatars = ['avatar-1', 'avatar-2', 'avatar-3'];
    if (!allowedAvatars.includes(avatarUrl)) {
      return { ok: false, error: "อวาตาร์ไม่ถูกต้อง" };
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        avatar_url: avatarUrl,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('avatar_url')
      .single();
      
    if (error) {
      console.error('Avatar update error:', error);
      return { ok: false, error: "ไม่สามารถอัปเดตอวาตาร์ได้" };
    }
    
    return { ok: true, data: { avatar_url: data.avatar_url } };
  } catch (error) {
    console.error('Avatar update error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
}

/**
 * Gets user's current profile settings
 */
export async function getProfileSettings(userId: string): Promise<Result<{ avatar_url: string | null }>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Profile fetch error:', error);
      return { ok: false, error: "ไม่สามารถดึงข้อมูลโปรไฟล์ได้" };
    }
    
    return { ok: true, data: { avatar_url: data.avatar_url } };
  } catch (error) {
    console.error('Profile fetch error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
}
