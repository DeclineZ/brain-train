
import Link from "next/link"
import BottomNav from "@/components/BottomNav"
import { createClient } from "@/utils/supabase/server"
import { getCheckinStatus, getStreakBadges } from "@/lib/server/dailystreakAction"
import { Flame, Star, Coins, Zap, Trophy, Lock, Map, Brain, Eye, Target, Heart } from "lucide-react"
import Image from "next/image"
import BadgesSection from "./BadgesSection"
import TopBarMenu from "@/components/TopBarMenu"

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

  // Mock total XP since we don't have a direct field for it yet, or use sum of stats
  // Using stars/XP placeholder for now as per user request to refer to top bar context
  // We can calculate "Total Score" from the cognitive stats for now
  const cognitiveStats = [
    { key: "global_planning", label: "การวางแผน", color: "bg-green", icon: Map, val: profile?.global_planning || 0 },
    { key: "global_memory", label: "ความจำ", color: "bg-yellow", icon: Brain, val: profile?.global_memory || 0 },
    { key: "global_visual", label: "มิติสัมพันธ์", color: "bg-blue", icon: Eye, val: profile?.global_visual || 0 },
    { key: "global_focus", label: "สมาธิ", color: "bg-red", icon: Target, val: profile?.global_focus || 0 },
    { key: "global_speed", label: "ความเร็ว", color: "bg-blue-dark", icon: Zap, val: profile?.global_speed || 0 },
    { key: "global_emotion", label: "การควบคุมอารมณ์", color: "bg-purple", icon: Heart, val: profile?.global_emotion || 0 },
  ]

  // Helper to format join date
  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(date)
  }

  // Calculate scaled score: (Stat * 15) + 500
  const getScaledScore = (val: number) => Math.round((val * 15) + 500)

  // Avatar lookup similar to onboarding
  const getAvatarSrc = (url: string) => {
    // Simple mapping or return URL if it's external
    // Assuming the DB stores IDs 'avatar-1', etc.
    if (url === 'avatar-1') return '/avatars/avatar-1.png'
    if (url === 'avatar-2') return '/avatars/avatar-2.png'
    if (url === 'avatar-3') return '/avatars/avatar-3.png'
    return url || '/avatars/avatar-1.png' // Default
  }

  return (
    <div className="min-h-screen bg-cream pb-32">
      {/* Rustic Header Section - Matches TopCard style */}
      <div className="bg-tan-light border-b-4 border-brown-lightest pt-8 pb-10 px-4 rounded-b-[40px] shadow-sm">
        <div className="max-w-2xl mx-auto flex items-start gap-6">
          <div className="w-24 h-24 relative rounded-full border-4 border-white shadow-md overflow-hidden bg-brown-lightest flex-shrink-0">
            {profile?.avatar_url ? (
              <Image
                src={getAvatarSrc(profile.avatar_url)}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-4xl font-bold">{profile?.full_name?.charAt(0) || "?"}</span>
              </div>
            )}
          </div>

          <div className="flex-1 pt-1">
            <h1 className="text-2xl font-bold text-brown-darkest mb-1 drop-shadow-sm">{profile?.full_name || "Guest User"}</h1>
            <p className="text-brown-medium font-medium flex items-center gap-2 text-sm">
              <span>เข้าร่วมเมื่อ {formatDate(profile?.created_at)}</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="Thailand">🇹🇭</span>
            </div>
          </div>

          {/* Settings Menu */}
          <div className="ml-auto mt-3">
            <TopBarMenu variant="dark" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-8">
        {/* Quick Stats Grid - Rustic Board */}
        <section className="relative">
          <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_#5D4037] relative z-0">
            <div className="bg-cream rounded-[20px] p-5 relative z-10">
              <h2 className="text-xl font-bold text-brown-800 mb-4 flex items-center gap-2">
                สถิติการฝึก
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Streak */}
                <div className="border-2 border-gray-medium rounded-2xl p-4 flex items-center gap-3 bg-white shadow-sm">
                  <Flame className="w-8 h-8 text-orange-600 fill-orange-500" />
                  <div>
                    <div className="text-xl font-bold text-brown-darkest">{checkinStatus?.current_streak || 0}</div>
                    <div className="text-xs text-brown-light font-bold uppercase">สตรีกวัน</div>
                  </div>
                </div>

                {/* Total XP / Stars */}
                <div className="border-2 border-gray-medium rounded-2xl p-4 flex items-center gap-3 bg-white shadow-sm">
                  <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                  <div>
                    <div className="text-xl font-bold text-brown-darkest">{balance}</div>
                    <div className="text-xs text-brown-light font-bold uppercase">คะแนนสะสม</div>
                  </div>
                </div>

                {/* Coins */}
                <div className="border-2 border-gray-medium rounded-2xl p-4 flex items-center gap-3 bg-white shadow-sm">
                  <Coins className="w-8 h-8 text-yellow-500 fill-yellow-400" />
                  <div>
                    <div className="text-xl font-bold text-brown-darkest">{balance}</div>
                    <div className="text-xs text-brown-light font-bold uppercase">เหรียญ</div>
                  </div>
                </div>

                {/* Top League */}
                <div className="border-2 border-gray-medium rounded-2xl p-4 flex items-center gap-3 bg-white shadow-sm">
                  <Trophy className="w-8 h-8 text-yellow-500 fill-yellow-400" />
                  <div>
                    <div className="text-xl font-bold text-brown-darkest">-</div>
                    <div className="text-xs text-brown-light font-bold uppercase">ลีกสูงสุด</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cognitive Stats Chart - Rustic Board */}
        <section className="relative">
          <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_#5D4037] relative z-0">
            <div className="bg-cream rounded-[20px] p-5 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-brown-800">ทักษะสมอง</h2>
              </div>

              <div className="space-y-4">
                {cognitiveStats.map((stat) => (
                  <div key={stat.key} className="group">
                    <div className="flex justify-between items-end text-sm font-bold text-brown-light mb-1">
                      <div className="flex items-center gap-2">
                        <stat.icon className="w-5 h-5 text-brown-lightest" />
                        <span>{stat.label}</span>
                      </div>
                      <span className="text-brown-darkest">{getScaledScore(stat.val)}</span>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="h-4 w-full bg-gray-medium rounded-full overflow-hidden relative shadow-inner">
                      {/* Progress Bar Fill */}
                      <div
                        className={`h-full ${stat.color} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: `${Math.max(5, stat.val)}%` }}
                      />
                      {/* Highlight effect */}
                      <div className="absolute top-1 left-2 right-2 h-1 bg-white opacity-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Badges Section - Rustic Board Wrapper */}
        <section className="relative">
          {/* We pass specific styling props to BadgesSection or wrap it here. 
                 BadgesSection handles its own grid, but we want the Board look. 
                 Ideally, we refactor BadgesSection to accept a "Rustic" mode, 
                 but wrapping it here gives us the board container. */}

          <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_#5D4037] relative z-0">
            <div className="bg-cream rounded-[20px] p-5 relative z-10">
              <BadgesSection badges={badges} />
            </div>
          </div>
        </section>
      </div>

      <BottomNav active="stats" />
    </div>
  )
}

