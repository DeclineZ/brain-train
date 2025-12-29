import { createClient } from "@/utils/supabase/server";
import { addCoins } from "./shopAction";
import type { Result, CheckinResult, StreakBadge, CheckinStatus, CheckinCalendar, CalendarDay } from "@/types";


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

    let status = statusResult.data;

    // PATCH: If we just checked in successfully, ensure counts are at least 1
    // This handles potential read-after-write consistency delays
    if (status.total_checkins === 0) {
      status.total_checkins = 1;
    }
    if (status.current_streak === 0) {
      status.current_streak = 1;
      status.longest_streak = Math.max(status.longest_streak, 1);
    }

    // Fetch currently owned badges from DB to avoid duplicates
    const { data: ownedBadgesData, error: ownedBadgesError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    if (ownedBadgesError) {
      console.error('Failed to fetch owned badges:', ownedBadgesError);
      // Continue anyway, unique constraint will handle duplicates
    }

    const ownedBadgeIds = new Set(ownedBadgesData?.map(b => b.badge_id) || []);

    // Define badges logic locally to check for NEW unlocks
    const allBadgesDef: StreakBadge[] = [
      { id: 'first_checkin', threshold: 1, metric: 'TOTAL' } as any,
      { id: 'three_day_streak', threshold: 3, metric: 'STREAK' } as any,
      { id: 'week_streak', threshold: 7, metric: 'STREAK' } as any,
      { id: 'month_streak', threshold: 30, metric: 'STREAK' } as any,
      { id: 'hundred_days', threshold: 100, metric: 'STREAK' } as any,
      { id: 'fifty_total', threshold: 50, metric: 'TOTAL' } as any,
      { id: 'hundred_total', threshold: 100, metric: 'TOTAL' } as any
    ];

    const newUnlockedBadges: StreakBadge[] = [];

    // Check which badges should be unlocked based on CURRENT status
    const badgesToInsert: { user_id: string, badge_id: string }[] = [];

    for (const badge of allBadgesDef) {
      let isEligible = false;
      if (badge.metric === 'TOTAL') {
        isEligible = status.total_checkins >= badge.threshold;
      } else if (badge.metric === 'STREAK') {
        isEligible = status.longest_streak >= badge.threshold;
      }

      // If eligible but NOT owned, it's a new unlock
      if (isEligible && !ownedBadgeIds.has(badge.id)) {
        badgesToInsert.push({ user_id: userId, badge_id: badge.id });

        // Re-construct full badge object for UI
        // We need to fetch the full definition from getStreakBadges or duplicate it.
        // Let's call getStreakBadges later or just use a helper.
        // For now, I will use a simple mapping since I don't have the full objects here easily without duplication.
        // Actually, let's just grab the full list first.
      }
    }

    if (badgesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('user_badges')
        .insert(badgesToInsert);

      if (insertError) {
        console.error('Failed to insert new badges:', insertError);
        // Don't fail the checkin, just log error
      }
    }

    // Now get the final list of badges to return to UI (including the newly unlocked ones)
    // pass providedStatus to avoid re-fetching
    const finalBadgesResult = await getStreakBadges(userId, status);

    // Filter to find the ones we just unlocked for the "Popup"
    // The "new_badges" in the result should be the ones we just inserted.
    // Logic: ID is in badgesToInsert.
    const justUnlockedIds = new Set(badgesToInsert.map(b => b.badge_id));
    const finalNewBadges = finalBadgesResult.ok
      ? finalBadgesResult.data.filter(b => justUnlockedIds.has(b.id))
      : [];

    console.log('[Checkin] New Badges Inserted:', finalNewBadges);

    // Calculate coin rewards with streak multiplier
    const baseAmount = 10; // Base coins for daily check-in
    const rawMultiplier = status.total_checkins * 0.1; // 0.1x per total check-in
    const multiplier = Math.min(3, Math.max(1, rawMultiplier)); // Min 1x, max 3x
    const calculatedAmount = baseAmount * multiplier; // Calculate full amount first
    const coinsEarned = Math.floor(calculatedAmount); // Then floor to integer

    // Add coins to user's wallet
    const coinResult = await addCoins(userId, coinsEarned, `เช็คอินประจำวัน (สตรีก x${multiplier.toFixed(1)})`,"daily_checkin");
    
    let newBalance = 0;
    if (coinResult.ok) {
      newBalance = coinResult.data.new_balance;
      console.log(`[Checkin] Added ${coinsEarned} coins to user ${userId}. New balance: ${newBalance}`);
      
      // Trigger coin/stats update event for UI
      console.log(`[Checkin] Coin reward event triggered: +${coinsEarned} coins, new balance: ${newBalance}`);
      // Note: window.dispatchEvent would be called on client side, not server side
    } else {
      console.error('Failed to add coins:', coinResult.error);
      // Continue with check-in even if coin reward fails
    }

    const result: CheckinResult = {
      success: true,
      streak_count: status.current_streak,
      new_badges: finalNewBadges,
      message: `เช็คอินสำเร็จ! สตรีกปัจจุบัน ${status.current_streak} วัน 🔥`,
      coins_earned: coinResult.ok ? coinsEarned : undefined,
      base_amount: coinResult.ok ? baseAmount : undefined,
      multiplier: coinResult.ok ? parseFloat(multiplier.toFixed(1)) : undefined,
      new_balance: coinResult.ok ? newBalance : undefined
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
      // Graceful fallback: If profile missing, return default status instead of crashing
      if (profileError.code === 'PGRST116') { // PGRST116 = Not found
        console.warn('Profile not found for checkin status, returning default.');
        return {
          ok: true,
          data: {
            checked_in_today: false,
            current_streak: 0,
            longest_streak: 0,
            total_checkins: 0,
            last_checkin_date: null,
            weekly_progress: {
              days_checked_in: 0,
              total_days: 7,
              week_days: []
            }
          }
        };
      }
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

    // Get weekly progress (current week Sunday to Saturday)
    const getWeeklyProgress = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - currentDay);
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);

      const startDate = sunday.toISOString().split('T')[0];
      const endDate = saturday.toISOString().split('T')[0];

      const thaiDayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        weekDays.push({
          day_name: thaiDayNames[i],
          date: dateStr,
          checked_in: false,
          is_today: dateStr === today
        });
      }

      return { startDate, endDate, weekDays };
    };

    const { startDate, endDate, weekDays } = getWeeklyProgress();

    // Get check-ins for the current week
    const { data: weekCheckins } = await supabase
      .from('checkin_days')
      .select('checkin_date')
      .eq('user_id', userId)
      .gte('checkin_date', startDate)
      .lte('checkin_date', endDate);

    const checkedInDates = new Set(weekCheckins?.map(c => c.checkin_date) || []);

    // Mark checked-in days
    weekDays.forEach(day => {
      day.checked_in = checkedInDates.has(day.date);
    });

    const daysCheckedIn = weekDays.filter(day => day.checked_in).length;

    const status: CheckinStatus = {
      checked_in_today: checkedInToday,
      current_streak: summary?.current_streak || 0,
      longest_streak: summary?.longest_streak || 0,
      total_checkins: summary?.total_checkins || 0,
      last_checkin_date: summary?.last_checkin_date || null,
      weekly_progress: {
        days_checked_in: daysCheckedIn,
        total_days: 7,
        week_days: weekDays
      }
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
export async function getStreakBadges(userId: string, providedStatus?: CheckinStatus): Promise<Result<StreakBadge[]>> {
  try {
    const supabase = await createClient();

    // 1. Fetch unlocked badges from DB
    const { data: unlockedBadgesData, error: dbError } = await supabase
      .from('user_badges')
      .select('badge_id, earned_at')
      .eq('user_id', userId);

    if (dbError) {
      console.error('Error fetching user badges:', dbError);
      return { ok: false, error: dbError.message };
    }

    const unlockedBadgeMap = new Map<string, string>(); // badge_id -> earned_at
    unlockedBadgesData?.forEach(row => {
      unlockedBadgeMap.set(row.badge_id, row.earned_at);
    });

    // 2. Define all possible badges (Static Definition)
    const allBadges: StreakBadge[] = [
      {
        id: 'first_checkin',
        name: 'การเริ่มต้น',
        description: 'เช็คอินครั้งแรก',
        icon: '🌱',
        threshold: 1,
        metric: 'TOTAL',
        unlocked: false // default, will overwrite
      },
      {
        id: 'three_day_streak',
        name: 'เครื่องร้อน',
        description: 'เช็คอินติดต่อกัน 3 วัน',
        icon: '🔥',
        threshold: 3,
        metric: 'STREAK',
        unlocked: false
      },
      {
        id: 'week_streak',
        name: 'สัปดาห์แห่งความมุ่งมั่น',
        description: 'เช็คอินติดต่อกัน 7 วัน',
        icon: '🔥',
        threshold: 7,
        metric: 'STREAK',
        unlocked: false
      },
      {
        id: 'month_streak',
        name: 'เดือนแห่งความมุ่งมั่น',
        description: 'เช็คอินติดต่อกัน 30 วัน',
        icon: '💪',
        threshold: 30,
        metric: 'STREAK',
        unlocked: false
      },
      {
        id: 'hundred_days',
        name: 'ระดับตำนาน',
        description: 'เช็คอินติดต่อกัน 100 วัน',
        icon: '👑',
        threshold: 100,
        metric: 'STREAK',
        unlocked: false
      },
      {
        id: 'fifty_total',
        name: 'ผู้ฝึกฝนตัวจริง',
        description: 'เช็คอินรวม 50 ครั้ง',
        icon: '⭐',
        threshold: 50,
        metric: 'TOTAL',
        unlocked: false
      },
      {
        id: 'hundred_total',
        name: 'ยอดฝีมือ',
        description: 'เช็คอินรวม 100 ครั้ง',
        icon: '🏆',
        threshold: 100,
        metric: 'TOTAL',
        unlocked: false
      }
    ];

    // 3. Map DB status to Badge Objects
    // Note: We no longer calculate based on current streak derived from 'providedStatus' 
    // because the DB is the source of truth for "Unlocked".

    const finalBadges = allBadges.map(badge => {
      const isUnlocked = unlockedBadgeMap.has(badge.id);
      return {
        ...badge,
        unlocked: isUnlocked,
        unlocked_at: isUnlocked ? unlockedBadgeMap.get(badge.id) : undefined
      };
    });

    return { ok: true, data: finalBadges };
  } catch (error) {
    console.error('Badges error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}
