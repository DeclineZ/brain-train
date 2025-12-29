import { getGames } from "@/lib/api";
import { createClient } from "@/utils/supabase/server";
import { getDailyMissions } from "@/lib/dailyMissions";
import TopCard from "@/components/TopCard";
import MainGameCard from "@/components/MainGameCard";
import BottomNav from "@/components/BottomNav";
import ModernDashboard from "@/components/ModernDashboard";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const games = await getGames();
  const missions = await getDailyMissions(user.id);

  // Filter games that have GIFs for the main page (featured games)
  const featuredGames = games.filter(game => game.featured);

  const completedCount = missions.filter(m => m.completed).length;
  const currentMission = missions.find(m => !m.completed);
  const isAllComplete = completedCount === 3;

  return (
    <div className="bg-cream overflow-hidden">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6">
        {/* TopCard */}
        <TopCard />

        <ModernDashboard
          title={isAllComplete ? "ภารกิจวันนี้สำเร็จ!" : currentMission ? `ภารกิจ: ${currentMission.label}` : "ภารกิจวันนี้"}
          totalGames={3}
          completedGames={completedCount}
          action={
            isAllComplete ? (
              <span className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-1.5 rounded-xl text-sm font-bold shadow-md cursor-default">
                สำเร็จแล้ว
              </span>
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
            {featuredGames.map((game, index) => (
              <MainGameCard
                key={game.id}
                gameName={game.title}
                image={game.image!}
                index={index}
                durationMin={game.durationMin}
                gameId={game.gameId}
                currentLevel={game.currentLevel}
              />
            ))}
          </div>
        </ModernDashboard>
      </div>

      {/* Bottom Navigation */}
      <BottomNav active="home" />
    </div>
  );
}
