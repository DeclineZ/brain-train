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
    return null; // Hide badge on error
  }

  if (isLoading) {
    return (
      <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-700 to-blue-800/90 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm min-w-[60px] text-center">
        ...
      </div>
    );
  }

  // For endless mode, show "Endless" instead of level
  if (isEndless) {
    return (
      <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-700 to-purple-800/90 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm min-w-[60px] text-center">
        Endless
      </div>
    );
  }

  // Ensure level is a valid number, default to 1 if invalid
  const displayLevel = typeof level === 'number' && level > 0 ? level : 1;
  
  // For non-endless games with stars, show both level and stars
  if (totalStars !== undefined) {
    return (
      <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-700 to-blue-800/90 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm flex items-center gap-1">
        <span>Lv {displayLevel}</span>
        <div className="w-3 h-3">
          <StarIcon className="w-full h-full" />
        </div>
        <span>{totalStars}</span>
      </div>
    );
  }
  
  return (
    <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-700 to-blue-800/90 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm min-w-[60px] text-center">
      Level {displayLevel}
    </div>
  );
}
