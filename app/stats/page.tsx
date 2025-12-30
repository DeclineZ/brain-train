import Link from "next/link"
import BottomNav from "@/components/BottomNav"
import { createClient } from "@/utils/supabase/server"
import { getCheckinStatus, getStreakBadges } from "@/lib/server/dailystreakAction"
import { getShopItemsWithOwnership } from "@/lib/server/shopAction"
import { getGlobalStarCount } from "@/lib/stars"
import StatsPageClient from "./StatsPageClient"

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-dark mb-4">กรุณาเข้าสู่ระบบ</h1>
          <Link href="/login" className="inline-block bg-green text-white font-bold py-3 px-8 rounded-xl shadow-[0_4px_0_#46A302] active:shadow-none active:translate-y-[4px] transition-all">
            เข้าสู่ระบบ
          </Link>
        </div>
        <BottomNav active="stats" />
      </div>
    )
  }

  // Parallel data fetching
  const [profileResult, walletResult, checkinResult, badgesResult, itemsResult, stars] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
    getCheckinStatus(user.id),
    getStreakBadges(user.id),
    getShopItemsWithOwnership(user.id),
    getGlobalStarCount(user.id)
  ])

  const profile = profileResult.data
  const balance = walletResult.data?.balance || 0
  const checkinStatus = checkinResult.ok ? checkinResult.data : null
  const badges = badgesResult.ok ? badgesResult.data : []
  const ownedThemes = itemsResult.ok ? itemsResult.data.filter(item => item.type === "theme" && item.isOwned) : []
  // Wait, array destructuring is cleaner, let's fix that below.


  return (
    <StatsPageClient
      profile={profile}
      balance={balance}
      stars={stars}
      checkinStatus={checkinStatus}
      badges={badges}
      userId={user.id}
      ownedThemes={ownedThemes}
    />
  )
}
