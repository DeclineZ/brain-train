export type GameCategory = "reasoning" | "data_processing" | "matching" | "pattern_recognition" | "logic" | "calculation";

export interface Game {
  id: string;
  gameId: string;        // for navigation to /play/gameId
  title: string;
  category: GameCategory;
  image: string;         // cover image URL or path (NOT NULL in database)
  durationMin: number;    // must be > 0
  locked?: boolean;
  featured?: boolean;      // for "เกมวันนี้"
  currentLevel: number;   // user's current level for this game (default 1)
}
