"use client";

import { motion } from "framer-motion";
import { Clock, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LevelBadge from "./LevelBadge";
import { useRef } from "react";

interface MainGameCardProps {
  gameName: string;
  image: string;
  index: number;
  durationMin: number;
  gameId: string;
  currentLevel: number;
  haveLevel?: boolean;
  totalStars?: number;
  isCompleted?: boolean;
}

export default function MainGameCard({ gameName, image, index, durationMin, gameId, currentLevel, haveLevel = true, totalStars, isCompleted }: MainGameCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/play/${gameId}`);
  };

  return (
    <div className="relative">
      <motion.div
        onClick={handleCardClick}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ scale: 1.01, y: -5 }}
        whileTap={{ scale: 0.98 }}
        className="relative rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden h-48 cursor-pointer group"
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url(${image})` }}
        />

        {/* Modern Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />

        {/* Level Badge */}
        <LevelBadge
          level={currentLevel}
          isEndless={!haveLevel}
          totalStars={haveLevel ? totalStars : undefined}
        />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-4">
          {/* Chips at top */}
          <div className="flex gap-2">
            <span className="bg-orange-500/90 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
              ภารกิจ
            </span>
          </div>

          {/* Game name at bottom */}
          <div>
            <h3 className="text-white font-bold text-lg leading-tight mb-1 drop-shadow-sm">{gameName}</h3>
            <div className="flex items-center gap-1.5 opacity-90">
              <Clock className="w-3.5 h-3.5 text-white/80" />
              <span className="text-white/90 text-xs font-medium">{durationMin} นาที</span>
            </div>
          </div>
        </div>
        {/* Completed Overlay */}
        {isCompleted && (
          <div className="absolute inset-0 bg-green-500/30 z-20 flex items-center justify-center backdrop-blur-sm transition-all duration-500">
            <div className="bg-white rounded-full p-3 shadow-lg transform transition-transform animate-in zoom-in duration-300">
              <Check className="w-8 h-8 text-green-600" strokeWidth={4} />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
