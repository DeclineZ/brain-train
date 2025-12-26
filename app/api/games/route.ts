import { NextResponse } from "next/server";
import type { Game } from "@/types/game";

const games: Game[] = [
  {
    id: "1",
    gameId: "game-01-cardmatch",
    title: "จับคู่การ์ด",
    category: "การใช้เหตุผล",
    image: "/covers/cardmatchcover.webp",
    gif: "",
    durationMin: 5,
    featured: true,
    locked: false,
  },
  {
    id: "2",
    gameId: "game-002",
    title: "จับคู่เร็ว",
    category: "การประมวลผลข้อมูล",
    image: "https://picsum.photos/400/300?random=12",
    gif: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
    durationMin: 5,
    featured: false,
    locked: false,
  },
  {
    id: "3",
    gameId: "game-003",
    title: "นายอุทยานแม่น้ำ",
    category: "การประมวลผลข้อมูล",
    image: "https://picsum.photos/400/300?random=13",
    gif: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
    durationMin: 5,
    featured: false,
    locked: false,
  },
  {
    id: "4",
    gameId: "game-004",
    title: "อันตรายบนทางหลวง",
    category: "การประมวลผลข้อมูล",
    image: "https://picsum.photos/400/300?random=14",
    gif: "https://media.giphy.com/media/3o7TKtnuAOYe4jSGQqg/giphy.gif",
    durationMin: 5,
    featured: false,
    locked: false,
  },
  {
    id: "5",
    gameId: "game-005",
    title: "ความทรงจำเชื่อมโยง",
    category: "การใช้เหตุผล",
    image: "https://picsum.photos/400/300?random=15",
    gif: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    durationMin: 5,
    featured: false,
    locked: false,
  },
  {
    id: "6",
    gameId: "game-006",
    title: "ปฏิกิริยาเร็ว",
    category: "การประมวลผลข้อมูล",
    image: "https://picsum.photos/400/300?random=16",
    gif: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
    durationMin: 5,
    featured: false,
    locked: true,
  },
];

export async function GET() {
  return NextResponse.json({ games });
}
