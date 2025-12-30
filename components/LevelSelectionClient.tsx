'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { GameLevel } from '@/lib/api';
import type { Game } from '@/types/game';
import StarIcon from '@/components/game/StarIcon';
import { Lock, ChevronLeft, ChevronRight, Home } from 'lucide-react';

interface LevelSelectionClientProps {
  gameId: string;
  levels: GameLevel[];
  game: Game | null;
}

export default function LevelSelectionClient({ gameId, levels, game }: LevelSelectionClientProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);

  // Dynamic levels per page based on viewport - no fixed constraint
  const [levelsPerPage, setLevelsPerPage] = useState(12);
  
  // Calculate total pages
  const totalPages = Math.ceil(levels.length / levelsPerPage);

  // Responsive levels per page
  useEffect(() => {
    const updateLevelsPerPage = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setLevelsPerPage(9); // 3x3 grid on mobile
      } else if (width < 1024) {
        setLevelsPerPage(12); // 3x4 grid on tablet
      } else {
        setLevelsPerPage(16); // 4x4 grid on desktop
      }
    };

    updateLevelsPerPage();
    window.addEventListener('resize', updateLevelsPerPage);
    return () => window.removeEventListener('resize', updateLevelsPerPage);
  }, []);

  const getCurrentPageLevels = () => {
    const startIndex = currentPage * levelsPerPage;
    const endIndex = startIndex + levelsPerPage;
    return levels.slice(startIndex, endIndex);
  };

  const handleLevelClick = (level: GameLevel) => {
    if (level.unlocked) {
      router.push(`/play/${gameId}?level=${level.level}`);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const renderStars = (stars: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3].map((star) => (
          <div
            key={star}
            className={`transition-all duration-300 ${
              star <= stars ? 'scale-100 opacity-100' : 'scale-90 opacity-30 grayscale'
            }`}
          >
            <StarIcon className="w-6 h-6" />
          </div>
        ))}
      </div>
    );
  };

  const currentPageLevels = getCurrentPageLevels();

  return (
    <div className="h-auto bg-cream flex flex-col justify-between">
      {/* Header (15%) */}
      <header className="h-[15vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-brown-darkest mb-2">
            {game?.title || 'เลือกด่าน'}
          </h1>
          <p className="text-brown-medium">เลือกด่านที่ต้องการเล่น</p>
        </div>
      </header>

      {/* Content Area (70%) */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className=" w-full max-w-4xl">
          {/* Navigation Arrows */}
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 rounded-full p-4 shadow-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-all "
          >
            <ChevronLeft className="w-7 h-7 text-amber-600" />
          </button>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 rounded-full p-4 shadow-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-all "
          >
            <ChevronRight className="w-7 h-7 text-amber-600" />
          </button>

          {/* Level Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 px-2 sm:px-4">
            {currentPageLevels.map((level) => (
              <button
                key={level.level}
                onClick={() => handleLevelClick(level)}
                disabled={!level.unlocked}
                className={`
                  relative bg-white rounded-xl shadow-lg p-4 aspect-square flex flex-col items-center justify-center
                  transition-all duration-300 hover:scale-105 active:scale-95
                  ${level.unlocked 
                    ? 'cursor-pointer border-2 border-amber-500 hover:border-amber-600 hover:shadow-xl hover:bg-amber-50 focus:outline-2 focus:outline-amber-500' 
                    : 'cursor-not-allowed border-2 border-gray-300 opacity-70 bg-gray-50'
                  }
                `}
              >
                {/* Lock Icon for Locked Levels */}
                {!level.unlocked && (
                  <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1">
                    <Lock className="w-4 h-4 text-gray-600" />
                  </div>
                )}

                {/* Level Number */}
                <div className={`text-2xl font-bold mb-2 ${level.unlocked ? 'text-amber-700' : 'text-gray-600'}`}>
                  {level.level}
                </div>

                {/* Stars */}
                <div className="mt-2">
                  {renderStars(level.stars)}
                </div>

                {/* Status Text */}
                <div className={`text-xs font-semibold mt-2 ${level.unlocked ? 'text-amber-600' : 'text-gray-500'}`}>
                  {level.completed ? 'สำเร็จ' : level.unlocked ? 'เล่น' : 'ล็อค'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer (15%) */}
      <footer className="h-auto flex items-end justify-center">
        {/* Page Indicator Dots */}
        <div className="flex gap-2">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`
                w-3 h-3 rounded-full transition-all duration-300
                ${currentPage === index 
                  ? 'bg-brown-primary w-8' 
                  : 'bg-brown-medium hover:bg-brown-primary/60'
                }
              `}
            />
          ))}
        </div>
      </footer>

      {/* Home Button */}
    </div>
  );
}
