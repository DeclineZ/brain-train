import type { GameLevel } from './api';
import { createClient } from '@/utils/supabase/server';
import { getGameStars } from './stars';

// Dynamic imports for game levels
const gameLevelModules = {
  'game-00-example': () => import('@/games/game-00-example/levels'),
  'game-01-cardmatch': () => import('@/games/game-01-cardmatch/levels'),
  'game-03-billiards-math': () => import('@/games/game-03-billiards-math/levels'),
  'game-05-wormtrain': () => import('@/games/game-05-wormtrain/levels'),
  'game-04-floating-ball-math': () => import('@/games/game-04-floating-ball-math/levels'),
  'game-07-pinkcup': () => import('@/games/game-07-pinkcup/levels'),
} as const;

type GameId = keyof typeof gameLevelModules;

// Games that don't have levels (no level file exists)
const gamesWithoutLevels: string[] = [
  'game-02-sensorlock'
];

/**
 * Check if a game ID has levels available
 */
export function hasGameLevels(gameId: string): gameId is GameId {
  return gameId in gameLevelModules;
}

/**
 * Get levels directly from game's levels.ts file with user progress
 */
export async function getGameLevelsFromSource(gameId: string, userId?: string): Promise<GameLevel[]> {
  try {
    // Check if game has levels
    if (!hasGameLevels(gameId)) {
      console.warn(`Game ${gameId} does not have levels configured`);
      return [];
    }

    // Dynamically import the game's levels
    const levelModule = await gameLevelModules[gameId]();

    // Extract levels from the module (each game exports different level object names)
    let levelConfigs: Record<number, any> = {};

    if (gameId === 'game-00-example' && 'MEMORY_LEVELS' in levelModule) {
      levelConfigs = levelModule.MEMORY_LEVELS;
    } else if (gameId === 'game-01-cardmatch' && 'MATCHING_LEVELS' in levelModule) {
      levelConfigs = levelModule.MATCHING_LEVELS;
    } else if (gameId === 'game-03-billiards-math' && 'BILLIARDS_LEVELS' in levelModule) {
      levelConfigs = levelModule.BILLIARDS_LEVELS;
    } else if (gameId === 'game-05-wormtrain' && 'LEVELS' in levelModule) {
      // Wormtrain exports LEVELS as an array with levelId property
      const levelsArray = levelModule.LEVELS as any[];
      levelsArray.forEach((level: any) => {
        if (typeof level.levelId === 'number') {
          levelConfigs[level.levelId] = level;
        }
      });
    } else if (gameId === 'game-04-floating-ball-math' && 'FLOATING_BALL_MATH_LEVELS' in levelModule) {
      levelConfigs = levelModule.FLOATING_BALL_MATH_LEVELS;
    } else if (gameId === 'game-07-pinkcup' && 'PINKCUP_LEVELS' in levelModule) {
      levelConfigs = levelModule.PINKCUP_LEVELS;
    } else {
      // Fallback: try to find any exported levels object
      const possibleNames = ['LEVELS', 'GAME_LEVELS', 'MEMORY_LEVELS', 'MATCHING_LEVELS', 'BILLIARDS_LEVELS', 'FLOATING_BALL_MATH_LEVELS'];
      for (const name of possibleNames) {
        if (name in levelModule) {
          levelConfigs = (levelModule as any)[name];
          break;
        }
      }
    }

    if (!levelConfigs || Object.keys(levelConfigs).length === 0) {
      console.warn(`No levels found for game ${gameId}`);
      return [];
    }

    // Get user progress
    const userProgress = await getUserProgressForGame(gameId, userId);

    // Convert to GameLevel format with user progress
    const levels: GameLevel[] = [];
    const levelNumbers = Object.keys(levelConfigs)
      .map(key => parseInt(key))
      .filter(num => !isNaN(num) && num > 0) // Skip tutorial level 0, only include positive numbers
      .sort((a, b) => a - b);

    for (const levelNum of levelNumbers) {
      const isUnlocked = levelNum <= userProgress.currentLevel + 1;
      const isCompleted = levelNum <= userProgress.currentLevel;
      const stars = userProgress.stars[`level_${levelNum}_stars`] || 0;

      levels.push({
        level: levelNum,
        unlocked: isUnlocked,
        stars,
        completed: isCompleted
      });
    }

    return levels;
  } catch (error) {
    console.error(`Error loading levels for game ${gameId}:`, error);
    return [];
  }
}

/**
 * Get specific level configuration from game's levels.ts
 */
export async function getLevelConfig(gameId: string, levelNumber: number) {
  try {
    if (!hasGameLevels(gameId)) {
      return null;
    }

    const levelModule = await gameLevelModules[gameId]();

    // Extract level config based on game type
    if (gameId === 'game-00-example' && 'MEMORY_LEVELS' in levelModule) {
      return levelModule.MEMORY_LEVELS[levelNumber] || null;
    } else if (gameId === 'game-01-cardmatch' && 'MATCHING_LEVELS' in levelModule) {
      return levelModule.MATCHING_LEVELS[levelNumber] || null;
    } else if (gameId === 'game-03-billiards-math' && 'BILLIARDS_LEVELS' in levelModule) {
      return levelModule.BILLIARDS_LEVELS[levelNumber] || null;
    } else if (gameId === 'game-05-wormtrain' && 'LEVELS' in levelModule) {
      // Wormtrain exports LEVELS as an array with levelId property
      const levelsArray = levelModule.LEVELS as any[];
      return levelsArray.find((l: any) => l.levelId === levelNumber) || null;
    } else if (gameId === 'game-04-floating-ball-math' && 'FLOATING_BALL_MATH_LEVELS' in levelModule) {
      return levelModule.FLOATING_BALL_MATH_LEVELS[levelNumber] || null;
    } else if (gameId === 'game-07-pinkcup' && 'PINKCUP_LEVELS' in levelModule) {
      return levelModule.PINKCUP_LEVELS[levelNumber] || null;
    }

    return null;
  } catch (error) {
    console.error(`Error loading level config for ${gameId} level ${levelNumber}:`, error);
    return null;
  }
}

/**
 * Get user progress for a specific game
 */
async function getUserProgressForGame(gameId: string, userId?: string) {
  try {
    const supabase = await createClient();

    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { currentLevel: 0, stars: {} };
      }
      currentUserId = user.id;
    }

    // Get current level from game sessions
    const { data: session } = await supabase
      .from('game_sessions')
      .select('current_played')
      .eq('user_id', currentUserId)
      .eq('game_id', gameId)
      .order('current_played', { ascending: false })
      .limit(1)
      .single();

    const currentLevel = session?.current_played || 0;

    // Get stars
    const stars = await getGameStars(currentUserId, gameId);

    return { currentLevel, stars };
  } catch (error) {
    console.error(`Error getting user progress for ${gameId}:`, error);
    return { currentLevel: 0, stars: {} };
  }
}

/**
 * Get total number of levels for a game
 */
export async function getTotalLevelsForGame(gameId: string): Promise<number> {
  try {
    if (!hasGameLevels(gameId)) {
      return 0;
    }

    const levelModule = await gameLevelModules[gameId]();
    let levelConfigs: Record<number, any> = {};

    // Extract level configs based on game type
    if (gameId === 'game-00-example' && 'MEMORY_LEVELS' in levelModule) {
      levelConfigs = levelModule.MEMORY_LEVELS;
    } else if (gameId === 'game-01-cardmatch' && 'MATCHING_LEVELS' in levelModule) {
      levelConfigs = levelModule.MATCHING_LEVELS;
    } else if (gameId === 'game-03-billiards-math' && 'BILLIARDS_LEVELS' in levelModule) {
      levelConfigs = levelModule.BILLIARDS_LEVELS;
    } else if (gameId === 'game-05-wormtrain' && 'LEVELS' in levelModule) {
      // Wormtrain exports LEVELS as an array with levelId property
      const levelsArray = levelModule.LEVELS as any[];
      levelsArray.forEach((level: any) => {
        if (typeof level.levelId === 'number') {
          levelConfigs[level.levelId] = level;
        }
      });
    } else if (gameId === 'game-04-floating-ball-math' && 'FLOATING_BALL_MATH_LEVELS' in levelModule) {
      levelConfigs = levelModule.FLOATING_BALL_MATH_LEVELS;
    } else if (gameId === 'game-07-pinkcup' && 'PINKCUP_LEVELS' in levelModule) {
      levelConfigs = levelModule.PINKCUP_LEVELS;
    }

    // Count only positive level numbers (skip tutorial level 0)
    const levelNumbers = Object.keys(levelConfigs)
      .map(key => parseInt(key))
      .filter(num => !isNaN(num) && num > 0);

    return levelNumbers.length;
  } catch (error) {
    console.error(`Error getting total levels for ${gameId}:`, error);
    return 0;
  }
}

/**
 * Check if a game has a tutorial level (level 0)
 */
export async function hasTutorialLevel(gameId: string): Promise<boolean> {
  try {
    const config = await getLevelConfig(gameId, 0);
    return config !== null;
  } catch (error) {
    return false;
  }
}
