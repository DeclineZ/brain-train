import Image from "next/image";
import { Lock } from "lucide-react";
import Link from "next/link";
import type { Game } from "@/types";

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

  // Unlocked game - clickable
  return (
    <Link href={`/play/${game.gameId}`}>
      <div className="relative bg-tan-light rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer h-48 flex flex-col">
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
        </div>
        
        {/* Game Info */}
        <div className="p-3 flex-1">
          <h3 className="font-semibold text-brown-darkest text-sm mb-1">{game.title}</h3>
          <p className="text-xs text-brown-medium">{getCategoryInThai(game.category)}</p>
        </div>
      </div>
    </Link>
  );
}
