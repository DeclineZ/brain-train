import { getGames } from "@/lib/api";
import TopCard from "@/components/TopCard";
import MainGameCard from "@/components/MainGameCard";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";

export default async function Home() {
  const games = await getGames();
  // Filter games that have GIFs for the main page (featured games)
  const featuredGames = games.filter(game =>game.featured);

  return (
    <div className="min-h-screen bg-[#FFFDF7] pb-24">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6">
        {/* TopCard */}
        <TopCard />

        {/* Today's Games Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#3C2924]">ภารกิจวันนี้</h2>
            <Link 
              href="#"
              className="bg-[#D75931] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#C74A21] transition-colors"
            >
              เล่นทั้งหมด
            </Link>
          </div>

          {/* Game Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav active="home" />
    </div>
  );
}
