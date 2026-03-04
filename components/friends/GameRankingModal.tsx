"use client";

import { useState } from "react";
import { X, Search, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Game } from "@/types/game";

interface GameRankingModalProps {
    games: Game[];
    onClose: () => void;
}

export default function GameRankingModal({ games, onClose }: GameRankingModalProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredGames = games.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectGame = (gameId: string) => {
        onClose();
        router.push(`/friends/game/${gameId}`);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-overlay/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-popup-bg rounded-2xl shadow-2xl w-full max-w-md border-2 border-brown-border overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[75vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-action to-orange-dark px-5 py-4 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-white font-bold text-lg">
                        เลือกเกมดูอันดับ
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-brown-border/30 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brown-medium" />
                        <input
                            type="text"
                            placeholder="ค้นหาเกม..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-cream rounded-xl border border-brown-border text-sm text-brown-darkest placeholder:text-brown-lightest focus:outline-none focus:border-orange-action transition-colors"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Game List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredGames.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-brown-medium text-sm">ไม่พบเกม</p>
                        </div>
                    ) : (
                        filteredGames.map((game) => (
                            <button
                                key={game.gameId}
                                onClick={() => handleSelectGame(game.gameId)}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-cream/80 active:bg-cream transition-colors"
                            >
                                {game.image ? (
                                    <img
                                        src={game.image}
                                        alt={game.title}
                                        className="w-12 h-12 rounded-xl object-cover shadow-sm border border-brown-border"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-tan-light border border-brown-border flex items-center justify-center">
                                        <span className="text-lg">🎮</span>
                                    </div>
                                )}
                                <div className="flex-1 text-left">
                                    <p className="font-bold text-brown-darkest text-sm">
                                        {game.title}
                                    </p>
                                    <p className="text-xs text-brown-medium">
                                        {game.have_level ? "จัดอันดับตามดาว" : "จัดอันดับตามคะแนน"}
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-brown-medium" />
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
