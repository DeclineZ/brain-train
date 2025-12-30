"use client";

import Image from "next/image";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Game } from "@/types/game";
import LevelBadge from "./LevelBadge";
import { useState, useEffect, useRef } from "react";

interface GameTileProps {
  game: Game;
}

// Thai translation mapping for game categories
const categoryTranslations: Record<string, string> = {
  reasoning: "การใช้เหตุผล",
  data_processing: "การประมวลผลข้อมูล",
  matching: "การจับคู่",
  pattern_recognition: "การจดจำรูปแบบ",
  logic: "ตรรกะ",
  calculation: "การคำนวณ"
};

const getCategoryInThai = (category: string): string => {
  return categoryTranslations[category] || category;
};

export default function GameTile({ game }: GameTileProps) {
  const isLocked = game.locked;
  
  if (isLocked) {
    // Locked game - non-clickable
    return (
      <div className="relative bg-tan-light rounded-xl overflow-hidden shadow-sm opacity-75 cursor-not-allowed h-48 flex flex-col">
        {/* Game Image */}
        <div className="relative h-32">
          {game.image && (
            <Image
              src={game.image}
              alt={game.title}
              fill
              className="object-cover"
            />
          )}
          
          {/* Lock badge */}
          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-2">
            <Lock className="w-4 h-4 text-white" />
          </div>
        </div>
        
        {/* Game Info */}
        <div className="p-3 flex-1">
          <h3 className="font-semibold text-brown-darkest text-sm mb-1">{game.title}</h3>
          <p className="text-xs text-brown-medium">{getCategoryInThai(game.category)}</p>
        </div>
      </div>
    );
  }

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

  const handleTileClick = () => {
    setShowOverlay(true);
  };

  const handlePlayNow = () => {
    router.push(`/play/${game.gameId}`);
  };

  const handleSelectLevel = () => {
    router.push(`/levels/${game.gameId}`);
  };

  return (
    <div ref={tileRef} className="relative">
      {/* Game Tile */}
      <div 
        onClick={handleTileClick}
        className="relative bg-tan-light rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer h-48 flex flex-col"
      >
        {/* Game Image */}
        <div className="relative h-32">
          {game.image && (
            <Image
              src={game.image}
              alt={game.title}
              fill
              className="object-cover"
            />
          )}
          
          {/* Level Badge */}
          <LevelBadge level={game.currentLevel || 1} />
        </div>
        
        {/* Game Info */}
        <div className="p-3 flex-1">
          <h3 className="font-semibold text-brown-darkest text-sm mb-1">{game.title}</h3>
          <p className="text-xs text-brown-medium">{getCategoryInThai(game.category)}</p>
        </div>
      </div>

      {/* Button Overlay */}
      {showOverlay && (
        <div className="absolute inset-0 bg-black/80 rounded-xl flex flex-col justify-between p-3 z-10 animate-in fade-in duration-200">
          {/* Top area - title */}
          <div className="text-center pt-8">
            <h3 className="font-bold text-white text-lg">{game.title}</h3>
          </div>
          
          {/* Middle area - buttons */}
          <div className="flex flex-col gap-3 px-4">
            <button
              onClick={handleSelectLevel}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              เลือกด่าน
            </button>
            <button
              onClick={handlePlayNow}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              เล่นเลย
            </button>
          </div>
          
          {/* Bottom area - empty for spacing */}
          <div></div>
        </div>
      )}
    </div>
  );
}
