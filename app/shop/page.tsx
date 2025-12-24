import BottomNav from "@/components/BottomNav";
import ShopContent from "@/components/shop/ShopContent";
import { createClient } from "@/utils/supabase/server";
import { getUserBalance, getShopItemsByCategory } from "@/lib/server/shopAction";
import type { UserBalance, ShopItem } from "@/lib/server/shopAction";
import { Suspense } from "react";

// Server Component to get initial data
async function getShopData(userId: string | null) {
  if (!userId) {
    return {
      balance: { balance: 0, updated_at: new Date().toISOString() },
      items: []
    };
  }

  try {
    const [balanceResult, itemsResult] = await Promise.all([
      getUserBalance(userId),
      getShopItemsByCategory("all")
    ]);

    return {
      balance: balanceResult.ok ? balanceResult.data : { balance: 0, updated_at: new Date().toISOString() },
      items: itemsResult.ok ? itemsResult.data : []
    };
  } catch (error) {
    console.error("Shop data fetch error:", error);
    return {
      balance: { balance: 0, updated_at: new Date().toISOString() },
      items: []
    };
  }
}

export default async function Shop() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { balance, items } = await getShopData(user?.id || null);

  return (
    <div className="min-h-screen bg-[#FFFDF7]">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6">
        

        {/* Shop Content */}
        <Suspense fallback={
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-xl font-bold text-[#5D4037]">กำลังโหลด...</h3>
          </div>
        }>
          <ShopContent 
            userId={user?.id || null}
            initialBalance={balance}
            initialItems={items}
          />
        </Suspense>
      </div>
      
      <BottomNav active="shop" />
    </div>
  );
}
