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
  const dataProcessingGames = games.filter(game => game.category === "data_processing");
  const calculationGames = games.filter(game => game.category === "calculation");
  const attentionGames = games.filter(game => game.category === "attention");

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6">
        {/* Title */}
        <h1 className="text-2xl font-bold text-brown-darkest mb-6">เกมทั้งหมด</h1>

        {/* Category Sections */}
        {reasoningGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brown-darkest mb-4">การใช้เหตุผล</h2>
            <div className="grid grid-cols-2 gap-4 items-stretch">
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
            <div className="grid grid-cols-2 gap-4 items-stretch">
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
            <div className="grid grid-cols-2 gap-4 items-stretch">
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
            <div className="grid grid-cols-2 gap-4 items-stretch">
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

        {/* No Games */}
        {games.length === 0 && (
          <div className="text-center py-8">
            <p className="text-brown-medium">ไม่พบเกม</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav active="all" />
    </div>
  );
}
