import type { Game } from "@/types/game";
import { createClient } from "@/utils/supabase/server";
import { console } from "inspector";

export async function getGames(): Promise<Game[]> {
  try {
    const supabase = await createClient();
    
    // Get current user (don't fail if no user, just return empty levels)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log("No authenticated user found, using default levels");
    }

    // Fetch games
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id,game_id, title, category, image, duration_min")
      .order("id", { ascending: true });

    if (gamesError) {
      console.error("Games fetch error:", gamesError);
      throw new Error("Failed to fetch games");
    }

    // Fetch user levels for all games in one efficient query using raw SQL
    let levelsByGame: Record<string, number> = {};
    if (user) {
      const { data: levels, error: levelsError } = await supabase
        .from('game_sessions')
        .select('game_id, current_played')
        .eq('user_id', user.id);
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
      image: game.image,
      durationMin: game.duration_min,
      featured: index === 0, // First game is featured
      locked: false, // All games unlocked by default
      currentLevel: levelsByGame[game.game_id] || 0, // User's current level or default 1
      gif: "" // No gif field in database
    })) || [];
    console.log("Transformed games data:", transformedGames);

    return transformedGames;
  } catch (error) {
    console.error("Games API error:", error);
    // Return empty array as fallback
    return [];
  }
}
