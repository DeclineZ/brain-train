import type { Game } from "@/types/game";
import { createClient } from "@/utils/supabase/server";
import { getUserStars, getGameStars } from "@/lib/stars";

export interface GameLevel {
  level: number;
  unlocked: boolean;
  stars: number; // 0-3 stars
  completed: boolean;
}

export async function getGames(userId?: string): Promise<Game[]> {
  try {
    const supabase = await createClient();

    let currentUserId = userId;
    let user = null;

    if (!currentUserId) {
      // Get current user (don't fail if no user, just return empty levels)
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.log("No authenticated user found, using default levels");
      } else if (authUser) {
        currentUserId = authUser.id;
        user = authUser;
      }
    } else {
      // We have the ID, but for the logic below strictly we just need the ID for the query.
      // However, the logic below checks "if (user)".
      // Let's just set a dummy user object if we need compatibility with existing logic, or just key off ID.
      // The logic uses: .eq('user_id', user.id);
      // So we just need currentUserId.
    }


    // Fetch games
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id,game_id, title, category,have_level, image, duration_min")
      .order("id", { ascending: true });


    if (gamesError) {
      console.error("Games fetch error:", gamesError);
      throw new Error("Failed to fetch games");
    }

    // Fetch user levels for all games in one efficient query using raw SQL
    let levelsByGame: Record<string, number> = {};
    if (currentUserId) {
      const { data: levels, error: levelsError } = await supabase
        .from('game_sessions')
        .select('game_id, current_played')
        .eq('user_id', currentUserId);
      if (!levelsError && levels) {
        // Group by game_id and get max level for each game
        levelsByGame = levels.reduce((acc: Record<string, number>, session: any) => {
          const gameId = session.game_id;
          const currentLevel = session.current_played || 1;
          acc[gameId] = Math.max(acc[gameId] || 1, currentLevel);
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Transform data to match expected format with levels
    const transformedGames = games?.map((game, index) => ({
      id: game.id, // Use the actual database ID
      gameId: game.game_id,
      title: game.title,
      category: game.category,
      have_level: game.have_level,
      image: game.image,
      durationMin: game.duration_min,
      featured: true, // First game is featured
      locked: false, // All games unlocked by default
      currentLevel: levelsByGame[game.game_id] || 0, // User's current level or default 1
      gif: "" // No gif field in database
    })) || [];

    return transformedGames;
  } catch (error) {
    console.error("Games API error:", error);
    // Return empty array as fallback
    return [];
  }
}

export async function getGameLevels(gameId: string, userId?: string): Promise<GameLevel[]> {
  try {
    const supabase = await createClient();

    let currentUserId = userId;
    let user = null;

    // Determine total levels based on gameId
    const totalLevels = getDefaultLevelCount(gameId);

    if (!currentUserId) {
      // Get current user
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        console.log("No authenticated user found, returning default levels");
        // Return default levels without user progress
        return Array.from({ length: totalLevels }, (_, i) => ({
          level: i + 1,
          unlocked: i === 0, // Only first level unlocked
          stars: 0,
          completed: false
        }));
      }
      currentUserId = authUser.id;
      user = authUser;
    } else {
      // We assume valid userId passed, so we construct a minimal user object if needed or just use ID
      // The logic below uses user.id for stars fetch, so currentUserId is enough.
    }

    // Fetch user's current level for this game
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('current_played')
      .eq('user_id', currentUserId)
      .eq('game_id', gameId)
      .order('current_played', { ascending: false })
      .limit(1)
      .single();

    let userCurrentLevel = 0;
    if (session && session.current_played) {
      userCurrentLevel = session.current_played;
    }

    // Fetch user's stars for this game
    const userStars = await getGameStars(currentUserId, gameId);

    // Get the correct number of levels for this game
    const levelCount = getDefaultLevelCount(gameId);

    // Generate levels with real star data
    const levels: GameLevel[] = Array.from({ length: totalLevels }, (_, i) => {
      const levelNum = i + 1;
      const isUnlocked = levelNum <= userCurrentLevel + 1; // Current level + next level
      const isCompleted = levelNum <= userCurrentLevel;

      // Get real stars from database, default to 0 if not found
      const stars = userStars[`level_${levelNum}_stars`] || 0;

      return {
        level: levelNum,
        unlocked: isUnlocked,
        stars: stars, // Real star data from user_game_stars table
        completed: isCompleted
      };
    });

    return levels;
  } catch (error) {
    console.error("Game levels API error:", error);
    // Return default levels as fallback
    const totalLevels = gameId === 'game-01-cardmatch' ? 30 : 12;
    return Array.from({ length: totalLevels }, (_, i) => ({
      level: i + 1,
      unlocked: i === 0, // Only first level unlocked
      stars: 0,
      completed: false
    }));
  }
}

// Helper function to get default level count based on game
function getDefaultLevelCount(gameId: string): number {
  switch (gameId) {
    case 'game-03-billiards-math':
      return 60; // Billiards has 60 levels
    case 'game-04-floating-ball-math':
      return 50; // Floating Pool Balls has 50 levels
    case 'game-06-dreamdirect':
      return 35;
    case 'game-07-pinkcup':
      return 30; // Pinkcup has 30 levels
    default:
      return 12; // Default for other games
  }
}

export async function hasUserPlayed(gameId: string, userId?: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    let currentUserId = userId;

    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      currentUserId = user.id;
    }

    // Check game sessions
    const { count: sessionCount } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUserId)
      .eq('game_id', gameId);

    if (sessionCount && sessionCount > 0) return true;

    // Check stars (just in case session is missing but stars exist)
    const { count: starCount } = await supabase
      .from('user_game_stars')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUserId)
      .eq('game_id', gameId);

    return (starCount || 0) > 0;
  } catch (error) {
    console.error("Error checking play status:", error);
    return false;
  }
}
