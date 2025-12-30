import { createClient } from "@/utils/supabase/server";
import { getUserBalance, getShopItemsByCategory, purchaseItem } from "@/lib/server/shopAction";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category') || 'all';

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get both balance and items in parallel
    const [balanceResult, itemsResult] = await Promise.all([
      getUserBalance(userId),
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
    const body = await request.json();
    const { userId, itemId } = body;

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: "User ID and Item ID are required" },
        { status: 400 }
      );
    }

    const result = await purchaseItem(userId, itemId);
    
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
