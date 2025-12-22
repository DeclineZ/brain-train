import { createClient } from "@/utils/supabase/server";
import type { Result } from "@/types/result";

// Type definitions for our daily streak system
export interface CheckinStatus {
  checked_in_today: boolean;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  last_checkin_date: string | null;
}

export interface CalendarDay {
  date: string;
  checked_in: boolean;
  is_today: boolean;
  is_future: boolean;
}

export interface CheckinCalendar {
  year: number;
  month: number;
  days: CalendarDay[];
  month_name: string;
}

export interface StreakBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  unlocked: boolean;
  unlocked_at?: string;
}

export interface CheckinResult {
  success: boolean;
  streak_count: number;
  new_badges: StreakBadge[];
  message: string;
}

/**
 * Performs daily check-in using the existing RPC function
 */
export async function performDailyCheckin(userId: string): Promise<Result<CheckinResult>> {
  try {
    const supabase = await createClient();
    
    // Call the existing RPC checkin_today() function
    const { data, error } = await supabase.rpc('checkin_today');

    if (error) {
      console.error('Check-in RPC error:', error);
      return { ok: false, error: error.message };
    }

    // Get updated check-in status
    const statusResult = await getCheckinStatus(userId);
    if (!statusResult.ok) {
      return { ok: false, error: "Failed to get updated status" };
    }

    const status = statusResult.data;
    
    // Check for new badges
    const badgesResult = await getStreakBadges(userId);
    if (!badgesResult.ok) {
      return { ok: false, error: "Failed to get badges" };
    }

    const newBadges = badgesResult.data.filter((badge: StreakBadge) => badge.unlocked && !badge.unlocked_at);
    
    const result: CheckinResult = {
      success: true,
      streak_count: status.current_streak,
      new_badges: newBadges,
      message: `เช็คอินสำเร็จ! สตรีกปัจจุบัน ${status.current_streak} วัน 🔥`
    };

    return { ok: true, data: result };
  } catch (error) {
    console.error('Check-in error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Gets the user's current check-in status and streak information
 */
export async function getCheckinStatus(userId: string): Promise<Result<CheckinStatus>> {
  try {
    const supabase = await createClient();
    
    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return { ok: false, error: profileError.message };
    }

    // Get check-in summary
    const { data: summary, error: summaryError } = await supabase
      .from('checkin_summary')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') { // Not found error is ok
      console.error('Summary fetch error:', summaryError);
      return { ok: false, error: summaryError.message };
    }

    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0];
    const { data: todayCheckin, error: todayError } = await supabase
      .from('checkin_days')
      .select('checkin_date')
      .eq('user_id', userId)
      .eq('checkin_date', today)
      .single();

    const checkedInToday = !todayError && todayCheckin !== null;

    const status: CheckinStatus = {
      checked_in_today: checkedInToday,
      current_streak: summary?.current_streak || 0,
      longest_streak: summary?.longest_streak || 0,
      total_checkins: summary?.total_checkins || 0,
      last_checkin_date: summary?.last_checkin_date || null
    };

    return { ok: true, data: status };
  } catch (error) {
    console.error('Status fetch error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Gets calendar data for a specific month
 */
export async function getCheckinCalendar(userId: string, year: number, month: number): Promise<Result<CheckinCalendar>> {
  try {
    const supabase = await createClient();
    
    // Get all check-ins for the specified month
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
    
    const { data: checkins, error } = await supabase
      .from('checkin_days')
      .select('checkin_date')
      .eq('user_id', userId)
      .gte('checkin_date', startDate)
      .lte('checkin_date', endDate);

    if (error) {
      console.error('Calendar fetch error:', error);
      return { ok: false, error: error.message };
    }

    const checkedInDates = new Set(checkins?.map(c => c.checkin_date) || []);
    const today = new Date().toISOString().split('T')[0];
    
    // Generate calendar days
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: CalendarDay[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = date.toISOString().split('T')[0];
      
      days.push({
        date: dateStr,
        checked_in: checkedInDates.has(dateStr),
        is_today: dateStr === today,
        is_future: date > new Date()
      });
    }

    // Thai month names
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const calendar: CheckinCalendar = {
      year,
      month,
      days,
      month_name: thaiMonths[month - 1]
    };

    return { ok: true, data: calendar };
  } catch (error) {
    console.error('Calendar error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Gets user's streak badges and achievements
 */
export async function getStreakBadges(userId: string): Promise<Result<StreakBadge[]>> {
  try {
    // Get user's current streak to determine unlocked badges
    const statusResult = await getCheckinStatus(userId);
    if (!statusResult.ok) {
      return { ok: false, error: "Failed to get user status" };
    }

    const currentStreak = statusResult.data.current_streak;
    const totalCheckins = statusResult.data.total_checkins;

    // Define all possible badges
    const allBadges: StreakBadge[] = [
      {
        id: 'first_checkin',
        name: 'การเริ่มต้น',
        description: 'เช็คอินครั้งแรก',
        icon: '🌱',
        threshold: 1,
        unlocked: totalCheckins >= 1
      },
      {
        id: 'week_streak',
        name: 'สัปดาห์แห่งความมุ่งมั่น',
        description: 'เช็คอินติดต่อกัน 7 วัน',
        icon: '🔥',
        threshold: 7,
        unlocked: currentStreak >= 7
      },
      {
        id: 'month_streak',
        name: 'เดือนแห่งความมุ่งมั่น',
        description: 'เช็คอินติดต่อกัน 30 วัน',
        icon: '💪',
        threshold: 30,
        unlocked: currentStreak >= 30
      },
      {
        id: 'hundred_days',
        name: 'ระดับตำนาน',
        description: 'เช็คอินติดต่อกัน 100 วัน',
        icon: '👑',
        threshold: 100,
        unlocked: currentStreak >= 100
      },
      {
        id: 'fifty_total',
        name: 'ผู้ฝึกฝนตัวจริง',
        description: 'เช็คอินรวม 50 ครั้ง',
        icon: '⭐',
        threshold: 50,
        unlocked: totalCheckins >= 50
      },
      {
        id: 'hundred_total',
        name: 'ยอดฝีมือ',
        description: 'เช็คอินรวม 100 ครั้ง',
        icon: '🏆',
        threshold: 100,
        unlocked: totalCheckins >= 100
      }
    ];

    return { ok: true, data: allBadges };
  } catch (error) {
    console.error('Badges error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}
