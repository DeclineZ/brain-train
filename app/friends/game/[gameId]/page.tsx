import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getGames } from "@/lib/api";
import { getGameLeaderboard } from "@/lib/server/friendActions";
import GameRankingPage from "@/components/friends/GameRankingPage";
import BottomNav from "@/components/BottomNav";

interface PageProps {
    params: Promise<{ gameId: string }>;
}

export default async function FriendsGamePage({ params }: PageProps) {
    const { gameId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch game info and leaderboard in parallel
    const [games, leaderboardResult] = await Promise.all([
        getGames(user.id),
        getGameLeaderboard(user.id, gameId),
    ]);

    const game = games.find(g => g.gameId === gameId);
    const leaderboard = leaderboardResult.ok ? leaderboardResult.data : [];

    // For endless games, re-sort by high_score
    const sortedLeaderboard = game && !game.have_level
        ? [...leaderboard]
            .sort((a, b) => b.high_score - a.high_score)
            .map((entry, idx) => ({ ...entry, rank: idx + 1 }))
        : leaderboard;

    return (
        <div className="min-h-screen bg-cream">
            <GameRankingPage
                game={game || null}
                leaderboard={sortedLeaderboard}
                haveLevel={game?.have_level ?? true}
            />
            <BottomNav active="friends" />
        </div>
    );
}
