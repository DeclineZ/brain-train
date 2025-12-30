import { createClient } from "@/utils/supabase/server";
import { getCheckinStatus } from "@/lib/server/dailystreakAction";
import { getUserBalance } from "@/lib/server/shopAction";
import { getGlobalStarCount } from "@/lib/stars";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Fetch user stats in parallel
    const [streakResult, balanceResult, stars] = await Promise.all([
      getCheckinStatus(user.id),
      getUserBalance(user.id),
      getGlobalStarCount(user.id)
    ]);

    let streak = 0;
    let balance = 0;
    // Stars is already a number from getGlobalStarCount

    if (streakResult.ok) {
      streak = streakResult.data.current_streak;
    }

    if (balanceResult.ok) {
      balance = balanceResult.data.balance;
    }

    return NextResponse.json({
      streak,
      balance,
      stars
    });
  } catch (error) {
    console.error("User stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
