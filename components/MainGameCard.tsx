"use client";

import { m } from "framer-motion";
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
      <m.div
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

        {/* Content - Middle Layer (Pinned to bottom) */}
        <div className="relative h-full flex flex-col justify-between p-4 z-30 pointer-events-none">
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

        {/* Completed Overlay - Stamp Animation */}
        {isCompleted && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
            {/* Top Layer: Stamp (Shifted UP) */}
            <m.div
              initial={{ scale: 2, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: -10 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 15,
                mass: 1
              }}
              className="relative z-40 border-4 border-orange-action text-orange-action bg-white/95 px-6 py-2 rounded-lg shadow-xl transform -rotate-12 backdrop-blur-sm -mt-10"
              style={{
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 20px rgba(232, 76, 28, 0.1)"
              }}
            >
              <div className="flex flex-col items-center">
                <span className="text-xl font-black tracking-widest uppercase border-b-2 border-orange-action/20 pb-1 mb-1">
                  COMPLETED
                </span>
                <span className="text-sm font-bold tracking-wider">
                  ภารกิจสำเร็จ
                </span>
              </div>
            </m.div>

            {/* Middle Layer: Play Again Button (Pinned to bottom right) */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-3 right-3 z-30 bg-white text-orange-action px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 group-hover:scale-105 transition-transform auto-pointer-events"
            >
              <span>เล่นต่อ</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </m.div>
          </div>
        )}
      </m.div>
    </div>
  );
}
