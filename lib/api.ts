import type { Game } from "@/types";

export async function getGames(): Promise<Game[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/games`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch games: ${response.statusText}`);
    }

    const { games } = await response.json();
    return games;
  } catch (error) {
    console.error("Error fetching games:", error);
    // Return mock data as fallback
    return [
     
    ];
  }
}
