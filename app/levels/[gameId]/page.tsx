import { hasUserPlayed, getGames } from '@/lib/api';
import { getGameLevelsFromSource } from '@/lib/levelLoader';
import { createClient } from '@/utils/supabase/server';
import LevelSelectionClient from '@/components/LevelSelectionClient';
import { notFound } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { Home, Play, Trophy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ gameId: string }>;
}

function NoLevelsUI({ game }: { game: any }) {
  return (
    <div className="h-auto bg-cream flex flex-col justify-between min-h-screen">
      {/* Header (15%) */}
      <header className="h-[15vh] flex items-center justify-center px-4 relative">
        {/* Back Button - Top Left */}
        <Link href="/allgames" className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg hover:bg-white hover:scale-105 transition-all duration-200 active:scale-95">
          <ArrowLeft className="w-5 h-5 text-brown-darkest" />
        </Link>

        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-brown-darkest mb-2">
            {game?.title || 'เกม'}
          </h1>
          <p className="text-brown-medium">โหมดเล่นอิสระ</p>
        </div>
      </header>

      {/* Content Area (70%) */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Empty State Illustration */}
          <div className="text-center mb-8">
            <div className="mx-auto w-32 h-32 bg-tan-light rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Trophy className="w-16 h-16 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-brown-darkest mb-2">
              โหมดเล่นอิสระ
            </h2>
            <p className="text-brown-medium mb-6">
              เกมนี้ไม่มีด่าน คุณสามารถเล่นได้ทันที!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Link href={`/play/${game?.gameId}?from=levels`}>
              <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-3">
                <Play className="w-6 h-6" />
                <span>เริ่มเล่นเลย</span>
              </button>
            </Link>

            <Link href="/">
              <button className="w-full bg-brown-primary hover:bg-brown-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-3">
                <Home className="w-6 h-6" />
                <span>กลับหน้าหลัก</span>
              </button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-8 p-4 bg-tan-light rounded-xl">
            <div className="text-center">
              <p className="text-sm text-brown-medium mb-2">
                ประเภทเกม: {game?.category || 'ไม่ระบุ'}
              </p>
              <p className="text-xs text-brown-mute">
                เล่นได้ทุกเวลา ไม่มีการจำกัดด่าน
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer (15%) */}
      <footer className="h-[15vh] flex items-end justify-center pb-4">
        <div className="text-center">
          <p className="text-xs text-brown-mute">
            ขอให้สนุกกับการเล่นเกม!
          </p>
        </div>
      </footer>
    </div>
  );
}

function NotFoundUI() {
  return (
    <div className="h-auto bg-cream flex flex-col justify-between min-h-screen">
      {/* Header (15%) */}
      <header className="h-[15vh] flex items-center justify-center px-4 relative">
        {/* Back Button - Top Left */}
        <Link href="/allgames" className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg hover:bg-white hover:scale-105 transition-all duration-200 active:scale-95">
          <ArrowLeft className="w-5 h-5 text-brown-darkest" />
        </Link>

        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-brown-darkest mb-2">
            ไม่พบเกมนี้
          </h1>
          <p className="text-brown-medium">ไม่พบข้อมูลเกมในระบบ</p>
        </div>
      </header>

      {/* Content Area (70%) */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Empty State Illustration */}
          <div className="text-center mb-8">
            <div className="mx-auto w-32 h-32 bg-tan-light rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Trophy className="w-16 h-16 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-brown-darkest mb-2">
              ไม่พบข้อมูลเกม
            </h2>
            <p className="text-brown-medium mb-6">
              กรุณาลองอีกครั้ง หรือกลับไปหน้าเกมทั้งหมด
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Link href="/allgames">
              <button className="w-full bg-brown-primary hover:bg-brown-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-3">
                <Home className="w-6 h-6" />
                <span>กลับหน้าเกมทั้งหมด</span>
              </button>
            </Link>

            <Link href="/">
              <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-3">
                <Play className="w-6 h-6" />
                <span>กลับหน้าหลัก</span>
              </button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-8 p-4 bg-tan-light rounded-xl">
            <div className="text-center">
              <p className="text-sm text-brown-medium mb-2">
                ตรวจสอบว่าเกมนี้มีอยู่จริงในระบบ
              </p>
              <p className="text-xs text-brown-mute">
                หากปัญหายังคงอยู่ กรุณาติดต่อทีมงาน
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer (15%) */}
      <footer className="h-[15vh] flex items-end justify-center pb-4">
        <div className="text-center">
          <p className="text-xs text-brown-mute">
            ขออภัยในความไม่สะดวก
          </p>
        </div>
      </footer>
    </div>
  );
}

export default async function LevelSelectionPage({ params }: PageProps) {
  const { gameId } = await params;
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Run all fetches in parallel, passing user.id if available
    const [levels, games, hasPlayed] = await Promise.all([
      getGameLevelsFromSource(gameId, user?.id),
      getGames(user?.id),
      hasUserPlayed(gameId, user?.id)
    ]);

    const game = games.find((g: any) => g.gameId === gameId);

    if (!games || games.length === 0 || !game) {
      return (
        <>
          <NotFoundUI />
          <BottomNav active='all' />
        </>
      );
    }

    return (
      <>
        {game.have_level ? (
          <LevelSelectionClient
            gameId={gameId}
            levels={levels}
            game={game}
            hasPlayedBefore={hasPlayed}
          />
        ) : (
          <NoLevelsUI game={game} />
        )}
        <BottomNav active='all' />
      </>
    );
  } catch (error) {
    console.error('Error loading level data:', error);
    return (
      <>
        <NotFoundUI />
        <BottomNav active='all' />
      </>
    );
  }
}
