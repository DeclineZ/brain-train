"use client";

import { useState, useEffect } from "react";
import { UserPlus, Inbox, Trophy, ChevronDown, ChevronUp, Star, Users } from "lucide-react";
import AddFriendModal from "./AddFriendModal";
import FriendRequestsModal from "./FriendRequestsModal";
import LeaderboardCard from "./LeaderboardCard";
import type { FriendProfile, LeaderboardEntry, GameLeaderboardEntry } from "@/lib/server/friendActions";
import type { Game } from "@/types/game";

interface FriendsPageClientProps {
    userId: string;
    friends: FriendProfile[];
    friendCode: string;
    pendingCount: number;
    initialLeaderboard: LeaderboardEntry[];
    games: Game[];
}

export default function FriendsPageClient({
    userId,
    friends: initialFriends,
    friendCode,
    pendingCount: initialPendingCount,
    initialLeaderboard,
    games,
}: FriendsPageClientProps) {
    const [friends, setFriends] = useState(initialFriends);
    const [pendingCount, setPendingCount] = useState(initialPendingCount);
    const [overallLeaderboard, setOverallLeaderboard] = useState(initialLeaderboard);
    const [gameLeaderboards, setGameLeaderboards] = useState<Record<string, GameLeaderboardEntry[]>>({});
    const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
    const [showAddFriendModal, setShowAddFriendModal] = useState(false);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [loadingGameId, setLoadingGameId] = useState<string | null>(null);

    const hasFriends = friends.length > 0;

    // Fetch game leaderboard data
    const fetchGameLeaderboard = async (gameId: string) => {
        if (gameLeaderboards[gameId]) return; // Already fetched
        setLoadingGameId(gameId);
        try {
            const res = await fetch(`/api/friends/leaderboard?gameId=${gameId}`);
            const json = await res.json();
            if (json.ok) {
                setGameLeaderboards(prev => ({ ...prev, [gameId]: json.data }));
            }
        } catch (err) {
            console.error('Failed to fetch game leaderboard:', err);
        }
        setLoadingGameId(null);
    };

    // Toggle expanded state for a game
    const toggleGameExpand = (gameId: string) => {
        const newExpanded = new Set(expandedGames);
        if (newExpanded.has(gameId)) {
            newExpanded.delete(gameId);
        } else {
            newExpanded.add(gameId);
            fetchGameLeaderboard(gameId);
        }
        setExpandedGames(newExpanded);
    };

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
            // Clear game leaderboard cache to force refresh
            setGameLeaderboards({});
        } catch (err) {
            console.error('Failed to refresh data:', err);
        }
    };

    // Filter games that have been played by anyone (have stars in leaderboard)
    const playedGames = games.filter(g => g.currentLevel > 0);

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

            {/* ── Leaderboard ── */}
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
                            {overallLeaderboard.map((entry, idx) => (
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

                    {/* Per-Game Leaderboards */}
                    {playedGames.map((game) => {
                        const isExpanded = expandedGames.has(game.gameId);
                        const gameData = gameLeaderboards[game.gameId];
                        const isLoading = loadingGameId === game.gameId;
                        const top3 = gameData?.slice(0, 3) || [];

                        return (
                            <div
                                key={game.gameId}
                                className="rounded-2xl border-2 border-brown-border overflow-hidden shadow-sm relative"
                            >
                                {/* Faded game image background */}
                                {game.image && (
                                    <div
                                        className="absolute inset-0 z-0 opacity-[0.08] bg-cover bg-center"
                                        style={{ backgroundImage: `url(${game.image})` }}
                                    />
                                )}

                                {/* Game Header - Clickable */}
                                <button
                                    onClick={() => toggleGameExpand(game.gameId)}
                                    className="w-full relative z-10 px-4 py-3 flex items-center justify-between bg-cream/80 backdrop-blur-sm hover:bg-cream/90 transition-colors border-b border-brown-border"
                                >
                                    <div className="flex items-center gap-3">
                                        {game.image && (
                                            <img
                                                src={game.image}
                                                alt={game.title}
                                                className="w-10 h-10 rounded-lg object-cover shadow-sm border border-brown-border"
                                            />
                                        )}
                                        <h3 className="font-bold text-brown-darkest text-sm">
                                            {game.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-1 text-brown-medium">
                                        <span className="text-xs font-medium">
                                            {isExpanded ? 'ย่อ' : 'ดูเพิ่มเติม'}
                                        </span>
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="relative z-10 p-3 bg-cream/60 backdrop-blur-sm">
                                        {isLoading ? (
                                            <div className="flex items-center justify-center py-6">
                                                <div className="w-6 h-6 border-2 border-orange-action border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : gameData ? (
                                            <div className="space-y-2">
                                                {(expandedGames.has(game.gameId + '_full') ? gameData : top3).map((entry) => (
                                                    <LeaderboardCard
                                                        key={entry.user_id}
                                                        rank={entry.rank}
                                                        avatarUrl={entry.avatar_url}
                                                        displayName={entry.display_name}
                                                        value={entry.game_stars}
                                                        valueLabel="ดาว"
                                                        secondaryValue={entry.high_score}
                                                        secondaryLabel="คะแนน"
                                                        isSelf={entry.is_self}
                                                        isTopThree={entry.rank <= 3}
                                                    />
                                                ))}
                                                {gameData.length > 3 && !expandedGames.has(game.gameId + '_full') && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedGames(prev => {
                                                                const newSet = new Set(prev);
                                                                newSet.add(game.gameId + '_full');
                                                                return newSet;
                                                            });
                                                        }}
                                                        className="w-full text-center py-2 text-sm font-bold text-orange-action hover:text-orange-hover transition-colors"
                                                    >
                                                        ดูเพิ่มเติม ({gameData.length - 3} คนเพิ่มเติม)
                                                    </button>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
                    onRequestHandled={() => {
                        refreshData();
                    }}
                />
            )}
        </div>
    );
}

