import { getGames } from "@/lib/api";
import { getMultipleGameTotalStars } from "@/lib/stars";
import { createClient } from "@/utils/supabase/server";
import GameTile from "@/components/GameTile";
import BottomNav from "@/components/BottomNav";

export default async function AllGamesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const games = await getGames(user?.id);

  // Fetch total stars for all games at once
  const gameIds = games.map(game => game.gameId);
  const gameStars = await getMultipleGameTotalStars(gameIds, user?.id);

  // Filter by categories
  const reasoningGames = games.filter(game => game.category === "reasoning");
  const attentionGames = games.filter(game => game.category === "attention");
  const dataProcessingGames = games.filter(game => game.category === "data_processing");
  const calculationGames = games.filter(game => game.category === "calculation");

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl px-4 py-6">
        {/* Title */}
        <h1 className="text-2xl font-bold text-brown-darkest mb-6">เกมทั้งหมด</h1>

        {/* Category Sections */}
        {reasoningGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brown-darkest mb-4">การใช้เหตุผล</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 items-stretch">
              {reasoningGames.map((game) => (
                <GameTile
                  key={game.id}
                  game={game}
                  totalStars={game.have_level ? gameStars[game.gameId] : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {attentionGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brown-darkest mb-4">การใช้สมาธิ</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 items-stretch">
              {attentionGames.map((game) => (
                <GameTile
                  key={game.id}
                  game={game}
                  totalStars={game.have_level ? gameStars[game.gameId] : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {dataProcessingGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brown-darkest mb-4">การประมวลผลข้อมูล</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 items-stretch">
              {dataProcessingGames.map((game) => (
                <GameTile
                  key={game.id}
                  game={game}
                  totalStars={game.have_level ? gameStars[game.gameId] : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {calculationGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brown-darkest mb-4">การคำนวณ</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 items-stretch">
              {calculationGames.map((game) => (
                <GameTile
                  key={game.id}
                  game={game}
                  totalStars={game.have_level ? gameStars[game.gameId] : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Games Found State */}
        {games.length === 0 && (
          <div className="text-center py-16 bg-white/60 rounded-3xl border border-brown-border/30">
            <p className="text-brown-medium text-base font-semibold">
              ยังไม่พบรายการเกมในขณะนี้
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav active="all" />
    </div>
  );
}
