export type GameCategory = "การใช้เหตุผล" | "การประมวลผลข้อมูล";

export interface Game {
  id: string;
  gameId: string;        // for navigation to /play/gameId
  title: string;
  category: GameCategory;
  image?: string;        // for AllGames tiles
  gif?: string;          // for Main cards
  durationMin: number;   // display "5 นาที"
  locked?: boolean;
  featured?: boolean;    // for "เกมวันนี้"
}
