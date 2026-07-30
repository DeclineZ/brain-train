import { createClient } from "@/utils/supabase/server";
import { getUserBalance, getShopItemsByCategory, purchaseItem } from "@/lib/server/shopAction";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "ไม่ได้เข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const targetUserId = user.id;

    // Get both balance and items in parallel
    const [balanceResult, itemsResult] = await Promise.all([
      getUserBalance(targetUserId),
      getShopItemsByCategory(category)
    ]);

    if (!balanceResult.ok) {
      return NextResponse.json(
        { error: balanceResult.error },
        { status: 500 }
      );
    }

    if (!itemsResult.ok) {
      return NextResponse.json(
        { error: itemsResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      balance: balanceResult.data,
      items: itemsResult.data
    });
  } catch (error) {
    console.error("Shop API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "ไม่ได้เข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    const result = await purchaseItem(user.id, itemId);
    
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Purchase API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
