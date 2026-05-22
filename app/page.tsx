import { getGames } from "@/lib/api";
import { createClient } from "@/utils/supabase/server";
import { getDailyMissions } from "@/lib/dailyMissions";
import { getMultipleGameTotalStars } from "@/lib/stars";
import { getTodayStatGains } from "@/lib/server/dashboardStats";
import TopCard from "@/components/TopCard";
import MainGameCard from "@/components/MainGameCard";
import BottomNav from "@/components/BottomNav";
import ModernDashboard from "@/components/ModernDashboard";
import StatRadarCard from "@/components/StatRadarCard";
import Link from "next/link";
import { redirect } from "next/navigation";
import QuestNotificationManager from "@/components/QuestNotificationManager";
import WeaknessNotification from "@/components/WeaknessNotification";
import { Trophy, Grid3X3 } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [games, missions, stats] = await Promise.all([
    getGames(user.id),
    getDailyMissions(user.id),
    getTodayStatGains(user.id),
  ]);

  // Fetch profile stats to determine weakest skill
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("global_memory, global_speed, global_visual, global_focus, global_planning, global_emotion")
    .eq("user_id", user.id)
    .single();

  const statsList = [
    { key: "global_memory", val: profile?.global_memory ?? 0, shortSuggestion: "ลองเล่นเกมเกี่ยวกับด้านความจำ เพื่อเพิ่มทักษะด้านนี้" },
    { key: "global_speed", val: profile?.global_speed ?? 0, shortSuggestion: "ลองเล่นเกมเกี่ยวกับความเร็วในการคิด เพื่อเพิ่มทักษะด้านนี้" },
    { key: "global_visual", val: profile?.global_visual ?? 0, shortSuggestion: "ลองเล่นเกมเกี่ยวกับมิติสัมพันธ์ เพื่อเพิ่มทักษะด้านนี้" },
    { key: "global_focus", val: profile?.global_focus ?? 0, shortSuggestion: "ลองเล่นเกมเกี่ยวกับด้านสมาธิและการจดจ่อ เพื่อเพิ่มทักษะด้านนี้" },
    { key: "global_planning", val: profile?.global_planning ?? 0, shortSuggestion: "ลองเล่นเกมเกี่ยวกับด้านการวางแผนและแก้ปัญหา เพื่อเพิ่มทักษะด้านนี้" },
    { key: "global_emotion", val: profile?.global_emotion ?? 0, shortSuggestion: "ลองเล่นเกมเกี่ยวกับด้านภาษาและการนึกคำ เพื่อเพิ่มทักษะด้านนี้" },
  ];

  statsList.sort((a, b) => a.val - b.val);
  const weakest = statsList[0];
  const shortRecommendation = weakest ? weakest.shortSuggestion : "ลองเล่นเกมพัฒนาทักษะสมองกันเถอะ";

  // Filter games that are part of today's missions
  const dailyQuestGames = games.filter(game => missions.some(m => m.game_id === game.gameId));

  // Sort dailyQuestGames according to the mission slot_index
  dailyQuestGames.sort((a, b) => {
    const missionA = missions.find(m => m.game_id === a.gameId);
    const missionB = missions.find(m => m.game_id === b.gameId);
    return (missionA?.slot_index || 0) - (missionB?.slot_index || 0);
  });

  // Fetch total stars for daily quest games
  const dailyQuestGameIds = dailyQuestGames.map(game => game.gameId);
  const dailyQuestGameStars = await getMultipleGameTotalStars(dailyQuestGameIds);

  const completedCount = missions.filter(m => m.completed).length;
  const currentMission = missions.find(m => !m.completed);
  const isAllComplete = completedCount === 3;

  return (
    <div className="bg-cream overflow-hidden">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl px-4 py-6">
        <QuestNotificationManager />
        <WeaknessNotification message={shortRecommendation} />
        {/* TopCard */}
        <TopCard />

        <div className="grid grid-cols-1 md:grid-cols-[6fr_4fr] items-stretch gap-6 md:gap-4 lg:gap-6 mt-8 pb-20 md:pb-8">
          {/* Dashboard / Missions */}
          <ModernDashboard
            title={isAllComplete ? "ภารกิจวันนี้สำเร็จ!" : currentMission ? `ภารกิจ: ${currentMission.label}` : "ภารกิจวันนี้"}
            totalGames={3}
            completedGames={completedCount}
            action={
              isAllComplete ? (
                <div className="flex flex-col items-start gap-2">
                  <Link
                    href="/allgames"
                    className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-[var(--color-blue)] to-[var(--color-blue-dark)] text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-[var(--color-blue)]/30 hover:shadow-lg hover:shadow-[var(--color-blue)]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 border border-white/20 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <Grid3X3 className="w-4 h-4 text-white drop-shadow-sm group-hover:rotate-12 transition-transform" />
                    <span className="drop-shadow-sm relative z-10">ไปที่คลังเกม</span>
                  </Link>
                </div>
              ) : (
                <Link
                  href={currentMission ? `/play/${currentMission.game_id}` : "#"}
                  className="inline-flex items-center gap-2 bg-orange-action text-white px-4 py-1.5 rounded-xl text-sm font-bold shadow-md hover:bg-orange-hover-2 active:translate-y-0.5 transition-all"
                >
                  <span>เริ่มภารกิจ</span>
                </Link>
              )
            }
          >
            {/* Game Cards Grid */}
            <div className="grid gap-6 grid-cols-1">
              {dailyQuestGames.map((game, index) => {
                const mission = missions.find(m => m.game_id === game.gameId);
                const isCompleted = mission ? mission.completed : false;

                return (
                  <MainGameCard
                    key={game.id}
                    gameName={game.title}
                    image={game.image!}
                    index={index}
                    durationMin={game.durationMin}
                    gameId={game.gameId}
                    currentLevel={game.currentLevel}
                    haveLevel={game.have_level}
                    totalStars={game.have_level ? dailyQuestGameStars[game.gameId] : undefined}
                    isCompleted={isCompleted}
                  />
                );
              })}
            </div>
          </ModernDashboard>

          {/* Radar Chart */}
          <StatRadarCard data={stats} />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav active="home" />
    </div >
  );
}

