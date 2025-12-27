import Link from "next/link"
import BottomNav from "@/components/BottomNav"
import { createClient } from "@/utils/supabase/server"
import { getCheckinStatus, getStreakBadges } from "@/lib/server/dailystreakAction"
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
  const [profileResult, walletResult, checkinResult, badgesResult] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
    getCheckinStatus(user.id),
    getStreakBadges(user.id)
  ])

  const profile = profileResult.data
  const balance = walletResult.data?.balance || 0
  const checkinStatus = checkinResult.ok ? checkinResult.data : null
  const badges = badgesResult.ok ? badgesResult.data : []

  return (
    <StatsPageClient
      profile={profile}
      balance={balance}
      checkinStatus={checkinStatus}
      badges={badges}
    />
  )
}
