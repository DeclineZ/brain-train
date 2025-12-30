"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LevelBadge from "./LevelBadge";
import { useState, useEffect, useRef } from "react";

interface MainGameCardProps {
  gameName: string;
  image: string;
  index: number;
  durationMin: number;
  gameId: string;
  currentLevel: number;
}

export default function MainGameCard({ gameName, image, index, durationMin, gameId, currentLevel }: MainGameCardProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  // Close overlay when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
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

  const handleCardClick = () => {
    setShowOverlay(true);
  };

  const handlePlayNow = () => {
    router.push(`/play/${gameId}`);
  };

  const handleSelectLevel = () => {
    router.push(`/levels/${gameId}`);
  };

  return (
    <div ref={cardRef} className="relative">
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
        <LevelBadge level={currentLevel} />

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
      </motion.div>

      {/* Button Overlay */}
      {showOverlay && (
        <div className="absolute inset-0 bg-black/80 rounded-2xl flex flex-col justify-between p-4 z-10 animate-in fade-in duration-200">
          {/* Top area - title */}
          <div className="text-center pt-8">
            <h3 className="font-bold text-white text-lg">{gameName}</h3>
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
