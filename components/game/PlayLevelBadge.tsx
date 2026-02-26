import { MATCHING_LEVELS } from "@/games/game-01-cardmatch/levels";
import { FLOATING_BALL_MATH_LEVELS } from "@/games/game-04-floating-ball-math/levels";
import { CASHIER_LEVELS } from "@/games/game-19-cashier/levels";

interface PlayLevelBadgeProps {
  gameId: string;
  activeLevel: number;
  isLoadingLevel: boolean;
}

const getDifficultyVisuals = (tier?: string) => {
  switch (tier) {
    case "easy":
      return "bg-green-100 text-green-700 border-green-300";
    case "normal":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "hard":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "nightmare":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

const getCurrentTier = (gameId: string, activeLevel: number): string | undefined => {
  if (gameId === "game-01-cardmatch") {
    return MATCHING_LEVELS[activeLevel]?.difficultyTier;
  }
  if (gameId === "game-04-floating-ball-math") {
    return FLOATING_BALL_MATH_LEVELS[activeLevel]?.difficultyTier;
  }
  if (gameId === "game-19-cashier") {
    return CASHIER_LEVELS[activeLevel]?.difficultyTier;
  }
  if (gameId === "game-07-pinkcup") {
    if (activeLevel <= 5) return "easy";
    if (activeLevel <= 10) return "normal";
    if (activeLevel <= 15) return "hard";
    return "nightmare";
  }
  if (gameId === "game-09-tube-sort" || gameId === "game-10-miner") {
    if (activeLevel <= 10) return "easy";
    if (activeLevel <= 20) return "normal";
    return "hard";
  }
  if (gameId === "game-11-pipe-patch") {
    if (activeLevel <= 10) return "easy";
    if (activeLevel <= 20) return "normal";
    return "hard";
  }
  return undefined;
};

const BASE_BADGE_CLASS =
  "absolute top-4 left-1/2 -translate-x-1/2 z-10 px-6 py-2 rounded-full border-4 font-black shadow-lg flex items-center gap-2 transition-all duration-300 animate-in slide-in-from-top-4";

export default function PlayLevelBadge({ gameId, activeLevel, isLoadingLevel }: PlayLevelBadgeProps) {
  if (isLoadingLevel || activeLevel <= 0) return null;

  const tierColor = getDifficultyVisuals(getCurrentTier(gameId, activeLevel));

  if (gameId === "game-13-boxpattern") {
    return (
      <div className={`${BASE_BADGE_CLASS} bg-teal-100 text-teal-700 border-teal-300 whitespace-nowrap`}>
        <span className="text-2xl">Box Pattern</span>
      </div>
    );
  }

  if (gameId === "game-14-wordrecognize") {
    return (
      <div className={`${BASE_BADGE_CLASS} bg-purple-100 text-purple-700 border-purple-300 whitespace-nowrap`}>
        <span className="text-2xl">จดจำคำ</span>
      </div>
    );
  }

  const colorByGame: Record<string, string> = {
    "game-05-wormtrain": "bg-amber-100 text-amber-700 border-amber-300",
    "game-08-mysterysound": "bg-amber-100 text-amber-700 border-amber-300",
    "game-15-taxidriver": "bg-yellow-100 text-yellow-800 border-yellow-400",
    "game-17-floatingmarket": "bg-cyan-100 text-cyan-800 border-cyan-400",
    "game-20-boxcounting": "bg-orange-100 text-orange-800 border-orange-400",
    "game-21-parking-jam": "bg-sky-100 text-sky-800 border-sky-400",
  };

  const tierBasedGames = new Set([
    "game-01-cardmatch",
    "game-04-floating-ball-math",
    "game-07-pinkcup",
    "game-09-tube-sort",
    "game-10-miner",
    "game-11-pipe-patch",
    "game-19-cashier",
  ]);

  const visualClass = tierBasedGames.has(gameId) ? tierColor : colorByGame[gameId];
  if (!visualClass) return null;

  return (
    <div className={`${BASE_BADGE_CLASS} ${visualClass}`}>
      <span className="text-3xl">LEVEL {activeLevel}</span>
    </div>
  );
}
