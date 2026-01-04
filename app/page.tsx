import { getGames } from "@/lib/api";
import { createClient } from "@/utils/supabase/server";
import { getDailyMissions } from "@/lib/dailyMissions";
import { getMultipleGameTotalStars } from "@/lib/stars";
import TopCard from "@/components/TopCard";
import MainGameCard from "@/components/MainGameCard";
import BottomNav from "@/components/BottomNav";
import ModernDashboard from "@/components/ModernDashboard";
import Link from "next/link";
import { redirect } from "next/navigation";
import QuestNotificationManager from "@/components/QuestNotificationManager";
import { Trophy, Grid3X3 } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [games, missions] = await Promise.all([
    getGames(user.id),
    getDailyMissions(user.id),
  ]);

  // Filter games that have GIFs for the main page (featured games)
  const featuredGames = games.filter(game => game.featured);

  // Fetch total stars for featured games
  const featuredGameIds = featuredGames.map(game => game.gameId);
  const featuredGameStars = await getMultipleGameTotalStars(featuredGameIds);

  const completedCount = missions.filter(m => m.completed).length;
  const currentMission = missions.find(m => !m.completed);
  const isAllComplete = completedCount === 3;

  return (
    <div className="bg-cream overflow-hidden">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6">
        <QuestNotificationManager />
        {/* TopCard */}
        <TopCard />

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
            {featuredGames.map((game, index) => {
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
                  totalStars={game.have_level ? featuredGameStars[game.gameId] : undefined}
                  isCompleted={isCompleted}
                />
              );
            })}
          </div>
        </ModernDashboard>
      </div>

      {/* Bottom Navigation */}
      <BottomNav active="home" />
    </div >
  );
}
