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
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.08 }}
        whileHover={{ scale: 1.015, y: -3 }}
        whileTap={{ scale: 0.985 }}
        className="relative rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden h-48 cursor-pointer group border border-brown-border/20"
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url(${image})` }}
        />

        {/* High-contrast gradient scrim for crystal clear readability */}
        <div
          className={`absolute inset-0 bg-gradient-to-t transition-all duration-500 ${isCompleted
            ? "from-black/90 via-black/60 to-black/30"
            : "from-black/85 via-black/35 to-transparent"
            }`}
        />

        {/* Level Badge on top right */}
        <LevelBadge
          level={currentLevel}
          isEndless={!haveLevel}
          totalStars={haveLevel ? totalStars : undefined}
        />

        {/* Content - Bottom pinned info & top tag */}
        <div className="relative h-full flex flex-col justify-between p-4 z-20 pointer-events-none">
          {/* Top Mission Tag */}
          <div className="flex items-center gap-2">
            <span className="bg-orange-action text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs">
              ภารกิจ
            </span>
          </div>

          {/* Game Title & Duration */}
          <div>
            <h3 className="text-white font-bold text-lg md:text-xl leading-tight mb-1.5 drop-shadow-md">
              {gameName}
            </h3>
            <div className="flex items-center gap-1.5 text-white/90">
              <Clock className="w-4 h-4 text-orange-200" />
              <span className="text-xs md:text-sm font-semibold">{durationMin} นาที</span>
            </div>
          </div>
        </div>

        {/* Completed Overlay - Refined Achievement Badge */}
        {isCompleted && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none p-4">
            {/* Completed Badge */}
            <m.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 20,
              }}
              className="bg-white/95 text-green-800 border-2 border-green-500/80 px-5 py-2 rounded-2xl shadow-xl backdrop-blur-md flex flex-col items-center gap-0.5 -mt-6"
            >
              <div className="flex items-center gap-1.5">
                <Check className="w-5 h-5 text-green-600 stroke-[3]" />
                <span className="text-base font-black tracking-wide">
                  ภารกิจสำเร็จ!
                </span>
              </div>
            </m.div>

            {/* Play Again Button */}
            <div className="absolute bottom-3.5 right-3.5 pointer-events-auto">
              <div className="bg-white hover:bg-orange-50 text-orange-action px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 transition-all">
                <span>เล่นอีกครั้ง</span>
                <span className="text-xs">→</span>
              </div>
            </div>
          </div>
        )}
      </m.div>
    </div>
  );
}
