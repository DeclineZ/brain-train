import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getGames } from "@/lib/api";
import {
    getFriendsList,
    getFriendCode,
    getPendingRequestCount,
    getOverallLeaderboard,
    getTop1Games,
} from "@/lib/server/friendActions";
import BottomNav from "@/components/BottomNav";
import FriendsPageClient from "@/components/friends/FriendsPageClient";

export default async function FriendsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch games first (needed for top1 check)
    const games = await getGames(user.id);

    // Build have_level map
    const haveLevelMap: Record<string, boolean> = {};
    const gameIds: string[] = [];
    games.forEach(g => {
        haveLevelMap[g.gameId] = g.have_level;
        gameIds.push(g.gameId);
    });

    // Parallel data fetching
    const [friendsResult, codeResult, pendingCount, leaderboardResult, top1Result] = await Promise.all([
        getFriendsList(user.id),
        getFriendCode(user.id),
        getPendingRequestCount(user.id),
        getOverallLeaderboard(user.id),
        getTop1Games(user.id, gameIds, haveLevelMap),
    ]);

    const friends = friendsResult.ok ? friendsResult.data : [];
    const friendCode = codeResult.ok ? codeResult.data : "";
    const leaderboard = leaderboardResult.ok ? leaderboardResult.data : [];
    const top1Games = top1Result.ok ? top1Result.data : [];

    return (
        <div className="min-h-screen bg-cream">
            <FriendsPageClient
                userId={user.id}
                friends={friends}
                friendCode={friendCode}
                pendingCount={pendingCount}
                initialLeaderboard={leaderboard}
                games={games}
                top1Games={top1Games}
            />
            <BottomNav active="friends" />
        </div>
    );
}
