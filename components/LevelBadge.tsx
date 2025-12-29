interface LevelBadgeProps {
  level: number;
  isLoading?: boolean;
  error?: boolean;
}

export default function LevelBadge({ level, isLoading = false, error = false }: LevelBadgeProps) {
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

  // Ensure level is a valid number, default to 1 if invalid
  const displayLevel = typeof level === 'number' && level > 0 ? level : 1;
  
  return (
    <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-700 to-blue-800/90 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm min-w-[60px] text-center">
      Level {displayLevel}
    </div>
  );
}
