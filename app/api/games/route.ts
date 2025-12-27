import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("games")
      .select("id,game_id, title, category, image, duration_min")
      .order("id", { ascending: true });

    if (error) {
      console.error("Games fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch games" },
        { status: 500 }
      );
    }

    // Transform data to match expected format
    const games = data?.map((game, index) => ({
      id: game.id, // Use the actual database ID
      gameId: game.game_id,
      title: game.title,
      category: game.category,
      image: game.image,
      durationMin: game.duration_min,
      featured: index === 0, // First game is featured
      locked: false, // All games unlocked by default
      gif: "" // No gif field in database
    })) || [];

    return NextResponse.json({ games });
  } catch (error) {
    console.error("Games API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
