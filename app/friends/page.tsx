import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getGames } from "@/lib/api";
import {
    getFriendsList,
    getFriendCode,
    getPendingRequestCount,
    getOverallLeaderboard,
} from "@/lib/server/friendActions";
import BottomNav from "@/components/BottomNav";
import FriendsPageClient from "@/components/friends/FriendsPageClient";

export default async function FriendsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Parallel data fetching
    const [friendsResult, codeResult, pendingCount, leaderboardResult, games] = await Promise.all([
        getFriendsList(user.id),
        getFriendCode(user.id),
        getPendingRequestCount(user.id),
        getOverallLeaderboard(user.id),
        getGames(user.id),
    ]);

    const friends = friendsResult.ok ? friendsResult.data : [];
    const friendCode = codeResult.ok ? codeResult.data : "";
    const leaderboard = leaderboardResult.ok ? leaderboardResult.data : [];

    return (
        <div className="min-h-screen bg-cream">
            <FriendsPageClient
                userId={user.id}
                friends={friends}
                friendCode={friendCode}
                pendingCount={pendingCount}
                initialLeaderboard={leaderboard}
                games={games}
            />
            <BottomNav active="friends" />
        </div>
    );
}
