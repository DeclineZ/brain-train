import { getGames } from "@/lib/api";
import TopCard from "@/components/TopCard";
import MainGameCard from "@/components/MainGameCard";
import BottomNav from "@/components/BottomNav";
import WoodBoard from "@/components/WoodBoard";
import Link from "next/link";

export default async function Home() {
  const games = await getGames();
  // Filter games that have GIFs for the main page (featured games)
  const featuredGames = games.filter(game => game.featured);

  return (
    <div className="min-h-screen bg-[#FFFDF7]">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6">
        {/* TopCard */}
        <TopCard />

        {/* Turn "Today's Games" into a Quest Board */}
        <WoodBoard
          title="ภารกิจวันนี้ (3 เกมส์)"
          action={
            <Link
              href="#"
              className="bg-[#D75931] text-white px-5 py-2 rounded-xl text-sm font-bold shadow-[0_4px_0_#9E3C1E] active:shadow-none active:translate-y-1 transition-all"
            >
              เริ่มเลย
            </Link>
          }
        >
          {/* Game Cards Grid - Making it look like cards pinned to the board */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        </WoodBoard>
      </div>

      {/* Bottom Navigation */}
      <BottomNav active="home" />
    </div>
  );
}
