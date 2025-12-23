import { createClient } from "@/utils/supabase/server";
import { getCheckinStatus } from "@/lib/server/dailystreakAction";
import { getUserBalance } from "@/lib/server/shopAction";
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
    const [streakResult, balanceResult] = await Promise.all([
      getCheckinStatus(user.id),
      getUserBalance(user.id)
    ]);

    let streak = 0;
    let balance = 0;
    let stars = 12; // Mocked - could be fetched from user profile later

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
