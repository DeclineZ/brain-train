"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import Link from "next/link";

interface MainGameCardProps {
  gameName: string;
  gif: string;
  index: number;
  durationMin: number;
  gameId: string;
}

export default function MainGameCard({ gameName, gif, index, durationMin, gameId }: MainGameCardProps) {
  return (
    <Link href={`/play/${gameId}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ scale: 1.05, rotate: -1 }}
        whileTap={{ scale: 0.98 }}
        className="relative rounded-2xl shadow-xl overflow-hidden h-48 cursor-pointer border-4 border-white group"
      >
        {/* Background GIF */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
          style={{ backgroundImage: `url(${gif})` }}
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-4">
          {/* Chips at top */}
          <div className="flex gap-2">
            <span className="bg-[#D75931] text-white text-xs px-2 py-1 rounded-lg font-bold shadow-sm border border-[#fff]/20 backdrop-blur-sm">
              ภารกิจ
            </span>
          </div>

          {/* Game name at bottom */}
          <div className="flex justify-between items-end">
            <h3 className="text-white font-bold text-xl drop-shadow-md">{gameName}</h3>
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg px-2 py-1 border border-white/10">
              <Clock className="w-3 h-3 text-[#FFC107]" />
              <span className="text-white text-xs font-medium">{durationMin} น.</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
