"use client";

import Image from "next/image";
import { Lock, Grid3x3, Play, BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Game } from "@/types/game";
import LevelBadge from "./LevelBadge";
import { useState, useEffect, useRef } from "react";

interface GameTileProps {
  game: Game;
  totalStars?: number;
}

// Thai translation mapping for game categories
const categoryTranslations: Record<string, string> = {
  reasoning: "การใช้เหตุผล",
  data_processing: "การประมวลผลข้อมูล",
  matching: "การจับคู่",
  pattern_recognition: "การจดจำรูปแบบ",
  logic: "ตรรกะ",
  calculation: "การคำนวณ",
  attention: "การใช้สมาธิ"
};

const getCategoryInThai = (category: string): string => {
  return categoryTranslations[category] || category;
};

export default function GameTile({ game, totalStars }: GameTileProps) {
  // Unlocked game - with button overlay
  const [showOverlay, setShowOverlay] = useState(false);
  const router = useRouter();
  const tileRef = useRef<HTMLDivElement>(null);

  // Close overlay when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tileRef.current && !tileRef.current.contains(event.target as Node)) {
        setShowOverlay(false);
      }
    };

    if (showOverlay) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOverlay]);

  const isLocked = game.locked;

  if (isLocked) {
    // Locked game - non-clickable
    return (
      <div className="relative bg-white/60 rounded-2xl overflow-hidden shadow-xs opacity-75 cursor-not-allowed h-52 flex flex-col border border-brown-border/30">
        {/* Game Image */}
        <div className="relative h-34 w-full bg-gray-100">
          {game.image && (
            <Image
              src={game.image}
              alt={game.title}
              fill
              className="object-cover grayscale"
            />
          )}

          {/* Lock badge */}
          <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md rounded-full p-2 text-white">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Game Info */}
        <div className="p-3 flex-1 flex flex-col justify-center bg-white/70">
          <h3 className="font-bold text-brown-darkest text-sm md:text-base mb-0.5 truncate">{game.title}</h3>
          <p className="text-xs text-brown-mute font-medium">{getCategoryInThai(game.category)}</p>
        </div>
      </div>
    );
  }

  const handleTileClick = () => {
    setShowOverlay(true);
  };

  const handlePlayNow = () => {
    router.push(`/play/${game.gameId}`);
  };

  const handleSelectLevel = () => {
    router.push(`/levels/${game.gameId}`);
  };

  const handleTutorial = () => {
    router.push(`/play/${game.gameId}?level=0`);
  };

  return (
    <div ref={tileRef} className="relative">
      {/* Game Tile */}
      <div
        onClick={handleTileClick}
        className="relative bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer h-52 flex flex-col border border-brown-border/30 group"
      >
        {/* Game Image */}
        <div className="relative h-34 w-full bg-cream overflow-hidden">
          {game.image && (
            <Image
              src={game.image}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}

          {/* Scrim gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

          {/* Level Badge */}
          <LevelBadge
            level={game.currentLevel || 1}
            isEndless={!game.have_level}
            totalStars={game.have_level ? totalStars : undefined}
            isLoading={false}
          />
        </div>

        {/* Game Info */}
        <div className="p-3 flex-1 flex flex-col justify-between bg-white/90">
          <h3 className="font-bold text-brown-darkest text-sm md:text-base leading-tight line-clamp-1 group-hover:text-orange-action transition-colors">
            {game.title}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] font-bold text-brown-mute bg-tan-light/50 px-2 py-0.5 rounded-md">
              {getCategoryInThai(game.category)}
            </span>
            <span className="text-xs font-bold text-orange-action group-hover:translate-x-0.5 transition-transform">
              เล่นเลย →
            </span>
          </div>
        </div>
      </div>

      {/* Button Overlay */}
      {showOverlay && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm rounded-2xl flex flex-col justify-between p-4 z-30 animate-in fade-in duration-200 shadow-2xl border border-white/20">
          {/* Top area - title */}
          <div className="text-center pt-2">
            <h3 className="font-bold text-white text-base md:text-lg leading-tight line-clamp-2">{game.title}</h3>
            <p className="text-xs text-orange-200 font-medium mt-1">{getCategoryInThai(game.category)}</p>
          </div>

          {/* Middle area - senior-friendly buttons */}
          <div className="flex flex-col gap-2.5 my-auto">
            <button
              onClick={handlePlayNow}
              className="bg-orange-action hover:bg-orange-hover-2 text-white font-bold py-2.5 px-4 rounded-xl text-sm md:text-base transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>เล่นเลย</span>
            </button>

            {game.have_level ? (
              <button
                onClick={handleSelectLevel}
                className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-xl text-xs md:text-sm transition-colors flex items-center justify-center gap-2 border border-white/20"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                <span>เลือกด่าน</span>
              </button>
            ) : (
              <button
                onClick={handleTutorial}
                className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-xl text-xs md:text-sm transition-colors flex items-center justify-center gap-2 border border-white/20"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>วิธีเล่น</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
