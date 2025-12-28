"use client";

import { useState, useEffect } from "react";
import GameTile from "@/components/GameTile";
import SearchBar from "@/components/SearchBar";
import BottomNav from "@/components/BottomNav";
import { Flame, Zap, Settings } from "lucide-react";
import type { Game } from "@/types";

export default function AllGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGames = async () => {
      try {
        const response = await fetch("/api/games");
        if (!response.ok) {
          throw new Error(`Failed to fetch games: ${response.statusText}`);
        }
        const { games: gamesData } = await response.json();
        setGames(gamesData);
        setFilteredGames(gamesData);
      } catch (error) {
        console.error("Error loading games:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, []);

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredGames(games);
      return;
    }

    const filtered = games.filter(game =>
      game.title.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredGames(filtered);
  };

  // Filter by categories
  const reasoningGames = filteredGames.filter(game => game.category === "reasoning");
  const dataProcessingGames = filteredGames.filter(game => game.category === "data_processing");

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-brown-darkest">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6">
        {/* Title */}
        <h1 className="text-2xl font-bold text-brown-darkest mb-6">เกมทั้งหมด</h1>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Category Sections */}
        {reasoningGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brown-darkest mb-4">การใช้เหตุผล</h2>
            <div className="grid grid-cols-2 gap-4 items-stretch">
              {reasoningGames.map((game) => (
                <GameTile key={game.id} game={game} />
              ))}
            </div>
          </div>
        )}

        {dataProcessingGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brown-darkest mb-4">การประมวลผลข้อมูล</h2>
            <div className="grid grid-cols-2 gap-4 items-stretch">
              {dataProcessingGames.map((game) => (
                <GameTile key={game.id} game={game} />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredGames.length === 0 && (
          <div className="text-center py-8">
            <p className="text-brown-medium">ไม่พบเกมที่ค้นหา</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav active="all" />
    </div>
  );
}
