"use client";

import { useState } from "react";
import { UserPlus, Inbox, Trophy, Star, Users, Crown, Gamepad2 } from "lucide-react";
import AddFriendModal from "./AddFriendModal";
import FriendRequestsModal from "./FriendRequestsModal";
import GameRankingModal from "./GameRankingModal";
import LeaderboardCard from "./LeaderboardCard";
import type { FriendProfile, LeaderboardEntry, Top1GameInfo } from "@/lib/server/friendActions";
import type { Game } from "@/types/game";

interface FriendsPageClientProps {
    userId: string;
    friends: FriendProfile[];
    friendCode: string;
    pendingCount: number;
    initialLeaderboard: LeaderboardEntry[];
    games: Game[];
    top1Games: Top1GameInfo[];
}

export default function FriendsPageClient({
    userId,
    friends: initialFriends,
    friendCode,
    pendingCount: initialPendingCount,
    initialLeaderboard,
    games,
    top1Games,
}: FriendsPageClientProps) {
    const [friends, setFriends] = useState(initialFriends);
    const [pendingCount, setPendingCount] = useState(initialPendingCount);
    const [overallLeaderboard, setOverallLeaderboard] = useState(initialLeaderboard);
    const [showAddFriendModal, setShowAddFriendModal] = useState(false);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [showGameRankingModal, setShowGameRankingModal] = useState(false);

    const hasFriends = friends.length > 0;

    // Refresh data after friend actions
    const refreshData = async () => {
        try {
            const [friendsRes, leaderboardRes] = await Promise.all([
                fetch('/api/friends'),
                fetch('/api/friends/leaderboard'),
            ]);
            const friendsJson = await friendsRes.json();
            const leaderboardJson = await leaderboardRes.json();

            if (friendsJson.ok) {
                setFriends(friendsJson.data.friends || []);
                setPendingCount(friendsJson.data.pendingCount || 0);
            }
            if (leaderboardJson.ok) {
                setOverallLeaderboard(leaderboardJson.data || []);
            }
        } catch (err) {
            console.error('Failed to refresh data:', err);
        }
    };

    // Match top1 game IDs to game data
    const top1GameDetails = top1Games
        .map(t1 => {
            const game = games.find(g => g.gameId === t1.game_id);
            return game ? { ...t1, game } : null;
        })
        .filter(Boolean) as (Top1GameInfo & { game: Game })[];

    return (
        <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6 pb-28">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-brown-darkest">เพื่อน</h1>

                {/* Top-right buttons */}
                <div className="flex items-center gap-2">
                    {/* Friend Requests Button */}
                    <button
                        onClick={() => setShowRequestsModal(true)}
                        className="relative p-2.5 bg-tan-light rounded-xl border-2 border-brown-border hover:bg-gray-medium transition-all duration-200 active:scale-95"
                        aria-label="คำขอเป็นเพื่อน"
                    >
                        <Inbox className="w-5 h-5 text-brown-medium" />
                        {pendingCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red rounded-full flex items-center justify-center text-white text-[10px] font-bold animate-pulse">
                                {pendingCount > 9 ? '9+' : pendingCount}
                            </span>
                        )}
                    </button>

                    {/* Add Friend Button */}
                    <button
                        onClick={() => setShowAddFriendModal(true)}
                        className="p-2.5 bg-orange-action rounded-xl hover:bg-orange-hover transition-all duration-200 active:scale-95 shadow-md"
                        aria-label="เพิ่มเพื่อน"
                    >
                        <UserPlus className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>

            {/* ── Empty State ── */}
            {!hasFriends && (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                    <div className="w-24 h-24 rounded-full bg-tan-light flex items-center justify-center mb-6 border-2 border-brown-border">
                        <Users className="w-12 h-12 text-brown-lightest" />
                    </div>
                    <p className="text-xl font-bold text-brown-darkest mb-2">โปรดเพิ่มเพื่อน</p>
                    <p className="text-sm text-brown-medium mb-6 text-center">
                        เพิ่มเพื่อนเพื่อดู Leaderboard และแข่งขันกัน!
                    </p>
                    <button
                        onClick={() => setShowAddFriendModal(true)}
                        className="flex items-center gap-2 bg-orange-action text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-orange-hover active:translate-y-0.5 transition-all duration-200"
                    >
                        <UserPlus className="w-5 h-5" />
                        เพิ่มเพื่อน
                    </button>
                </div>
            )}

            {/* ── Leaderboard Content ── */}
            {hasFriends && (
                <div className="space-y-6">
                    {/* Overall Leaderboard */}
                    <div className="bg-tan-light rounded-2xl border-2 border-brown-border overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-gradient-to-r from-yellow-highlight to-yellow-highlight2 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-white drop-shadow" />
                            <h2 className="text-white font-bold text-lg drop-shadow">
                                อันดับรวม
                            </h2>
                        </div>
                        <div className="p-3 space-y-2">
                            {overallLeaderboard.map((entry) => (
                                <LeaderboardCard
                                    key={entry.user_id}
                                    rank={entry.rank}
                                    avatarUrl={entry.avatar_url}
                                    displayName={entry.display_name}
                                    value={entry.total_stars}
                                    valueLabel="ดาว"
                                    isSelf={entry.is_self}
                                    isTopThree={entry.rank <= 3}
                                />
                            ))}
                        </div>
                    </div>

                    {/* ── Top 1 Games Section ── */}
                    {top1GameDetails.length > 0 && (
                        <div className="bg-tan-light rounded-2xl border-2 border-brown-border overflow-hidden shadow-sm">
                            <div className="px-4 py-3 bg-gradient-to-r from-orange-action to-orange-dark flex items-center gap-2">
                                <Crown className="w-5 h-5 text-white drop-shadow" />
                                <h2 className="text-white font-bold text-lg drop-shadow">
                                    เกมที่คุณเป็นอันดับ 1
                                </h2>
                            </div>
                            <div className="p-3 space-y-2">
                                {top1GameDetails.map(({ game_id, game, user_value, metric }) => (
                                    <div
                                        key={game_id}
                                        className="flex items-center gap-3 bg-gradient-to-r from-yellow-highlight/10 to-orange-action/5 rounded-xl px-3 py-3 border border-yellow-highlight/30"
                                    >
                                        {/* Game Image */}
                                        {game.image ? (
                                            <img
                                                src={game.image}
                                                alt={game.title}
                                                className="w-11 h-11 rounded-xl object-cover shadow-sm border border-brown-border"
                                            />
                                        ) : (
                                            <div className="w-11 h-11 rounded-xl bg-cream border border-brown-border flex items-center justify-center">
                                                <Gamepad2 className="w-5 h-5 text-brown-medium" />
                                            </div>
                                        )}

                                        {/* Game Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-brown-darkest text-sm truncate">
                                                {game.title}
                                            </p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Crown className="w-3 h-3 text-yellow-highlight" />
                                                <span className="text-xs font-bold text-yellow-highlight">
                                                    อันดับ 1
                                                </span>
                                            </div>
                                        </div>

                                        {/* Value */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {metric === 'stars' ? (
                                                <Star className="w-4 h-4 text-yellow-highlight fill-yellow-highlight" />
                                            ) : (
                                                <Trophy className="w-4 h-4 text-blue" />
                                            )}
                                            <span className="text-sm font-bold text-brown-darkest">
                                                {user_value.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Browse Game Rankings Button ── */}
                    <button
                        onClick={() => setShowGameRankingModal(true)}
                        className="w-full flex items-center justify-center gap-3 bg-cream rounded-2xl border-2 border-brown-border px-4 py-4 hover:bg-tan-light active:scale-[0.98] transition-all duration-200 shadow-sm"
                    >
                        <Gamepad2 className="w-6 h-6 text-orange-action" />
                        <span className="font-bold text-brown-darkest">ดูอันดับแต่ละเกม</span>
                    </button>
                </div>
            )}

            {/* ── Modals ── */}
            {showAddFriendModal && (
                <AddFriendModal
                    friendCode={friendCode}
                    onClose={() => setShowAddFriendModal(false)}
                    onFriendAdded={refreshData}
                />
            )}

            {showRequestsModal && (
                <FriendRequestsModal
                    onClose={() => setShowRequestsModal(false)}
                    onRequestHandled={refreshData}
                />
            )}

            {showGameRankingModal && (
                <GameRankingModal
                    games={games}
                    onClose={() => setShowGameRankingModal(false)}
                />
            )}
        </div>
    );
}
