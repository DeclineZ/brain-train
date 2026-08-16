import StarIcon from "./game/StarIcon";

interface LevelBadgeProps {
  level?: number;
  isLoading?: boolean;
  error?: boolean;
  isEndless?: boolean;
  totalStars?: number;
}

export default function LevelBadge({ 
  level, 
  isLoading = false, 
  error = false, 
  isEndless = false, 
  totalStars 
}: LevelBadgeProps) {
  if (error) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-bold border border-white/20 shadow-sm min-w-[50px] text-center">
        ...
      </div>
    );
  }

  // For endless mode
  if (isEndless) {
    return (
      <div className="absolute top-2.5 right-2.5 bg-purple-900/80 backdrop-blur-md text-purple-100 text-xs px-2.5 py-1 rounded-full font-bold border border-purple-400/30 shadow-sm min-w-[60px] text-center">
        ไม่รู้จบ
      </div>
    );
  }

  // Ensure level is a valid number, default to 1 if invalid
  const displayLevel = typeof level === 'number' && level > 0 ? level : 1;
  
  // For non-endless games with stars, show both level and stars
  if (totalStars !== undefined) {
    return (
      <div className="absolute top-2.5 right-2.5 bg-black/65 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-bold border border-white/20 shadow-sm flex items-center gap-1.5">
        <span>ด่าน {displayLevel}</span>
        <div className="w-3.5 h-3.5">
          <StarIcon className="w-full h-full" />
        </div>
        <span className="text-yellow-300">{totalStars}</span>
      </div>
    );
  }
  
  return (
    <div className="absolute top-2.5 right-2.5 bg-black/65 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-bold border border-white/20 shadow-sm min-w-[55px] text-center">
      ด่าน {displayLevel}
    </div>
  );
}
