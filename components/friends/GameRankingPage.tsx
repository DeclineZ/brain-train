"use client";

import { ArrowLeft, Star, Trophy, Gamepad2 } from "lucide-react";
import { useRouter } from "next/navigation";
import LeaderboardCard from "./LeaderboardCard";
import type { GameLeaderboardEntry } from "@/lib/server/friendActions";
import type { Game } from "@/types/game";

interface GameRankingPageProps {
    game: Game | null;
    leaderboard: GameLeaderboardEntry[];
    haveLevel: boolean;
}

export default function GameRankingPage({ game, leaderboard, haveLevel }: GameRankingPageProps) {
    const router = useRouter();

    if (!game) {
        return (
            <div className="mx-auto max-w-md px-4 py-6 pb-28">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-brown-medium hover:text-brown-darkest transition-colors mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">กลับ</span>
                </button>
                <div className="text-center py-16">
                    <p className="text-brown-medium">ไม่พบเกมนี้</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6 pb-28">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-brown-medium hover:text-brown-darkest transition-colors mb-4"
            >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">กลับ</span>
            </button>

            {/* Game Header */}
            <div className="relative rounded-2xl overflow-hidden mb-6">
                {/* Faded background image */}
                {game.image && (
                    <div
                        className="absolute inset-0 opacity-[0.12] bg-cover bg-center"
                        style={{ backgroundImage: `url(${game.image})` }}
                    />
                )}

                <div className="relative z-10 flex items-center gap-4 bg-gradient-to-r from-orange-action/90 to-orange-dark/90 px-5 py-4 backdrop-blur-sm">
                    {game.image ? (
                        <img
                            src={game.image}
                            alt={game.title}
                            className="w-14 h-14 rounded-xl object-cover shadow-md border-2 border-white/30"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                            <Gamepad2 className="w-7 h-7 text-white" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-white drop-shadow">
                            {game.title}
                        </h1>
                        <p className="text-white/80 text-sm flex items-center gap-1 mt-0.5">
                            {haveLevel ? (
                                <>
                                    <Star className="w-3.5 h-3.5" />
                                    จัดอันดับตามดาว
                                </>
                            ) : (
                                <>
                                    <Trophy className="w-3.5 h-3.5" />
                                    จัดอันดับตามคะแนน
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Leaderboard */}
            {leaderboard.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-tan-light flex items-center justify-center mx-auto mb-4 border-2 border-brown-border">
                        <Trophy className="w-10 h-10 text-brown-lightest" />
                    </div>
                    <p className="text-brown-medium text-sm">ไม่มีข้อมูลอันดับสำหรับเกมนี้</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {leaderboard.map((entry) => (
                        <LeaderboardCard
                            key={entry.user_id}
                            rank={entry.rank}
                            avatarUrl={entry.avatar_url}
                            displayName={entry.display_name}
                            value={haveLevel ? entry.game_stars : entry.high_score}
                            valueLabel={haveLevel ? "ดาว" : "คะแนน"}
                            valueIcon={haveLevel ? "star" : "trophy"}
                            isSelf={entry.is_self}
                            isTopThree={entry.rank <= 3}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
