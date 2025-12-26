import { getGames } from "@/lib/api";
import TopCard from "@/components/TopCard";
import MainGameCard from "@/components/MainGameCard";
import BottomNav from "@/components/BottomNav";
import ModernDashboard from "@/components/ModernDashboard";
import Link from "next/link";

export default async function Home() {
  const games = await getGames();
  // Filter games that have GIFs for the main page (featured games)
  const featuredGames = games.filter(game => game.featured);

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6">
        {/* TopCard */}
        <TopCard />

        <ModernDashboard
          title="ภารกิจวันนี้"
          totalGames={3}
          completedGames={0}
          action={
            <Link
              href="/play/start-daily"
              className="inline-flex items-center gap-2 bg-orange-action text-white px-4 py-1.5 rounded-xl text-sm font-bold shadow-md hover:bg-orange-hover-2 active:translate-y-0.5 transition-all"
            >
              <span>เริ่มภารกิจ</span>
            </Link>
          }
        >
          {/* Game Cards Grid */}
          <div className="grid gap-6 grid-cols-1">
            {featuredGames.map((game, index) => (
              <MainGameCard
                key={game.id}
                gameName={game.title}
                gif={game.gif!}
                index={index}
                durationMin={game.durationMin}
                gameId={game.gameId}
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
