'use client';

import { use, useState, useEffect } from 'react';
import { useGameSession } from '@/hooks/useGameSession';
import GameCanvas from '@/components/game/GameCanvas';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface PageProps {
  params: Promise<{ gameId: string }>;
}

export default function GamePage({ params }: PageProps) {
  const { gameId } = use(params);
  const router = useRouter();

  const { submitSession } = useGameSession();
  const [result, setResult] = useState<any>(null);
  const [streakInfo, setStreakInfo] = useState<any>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [loadingStreak, setLoadingStreak] = useState(false);

  const searchParams = useSearchParams();
  const level = Number(searchParams.get('level')) || 1;

  // Clear popup when level changes
  useEffect(() => {
    setResult(null);
  }, [level]);

  const handleGameOver = async (rawData: any) => {
    // 1. Submit Game Stats
    const stats = await submitSession(gameId, rawData);

    // 2. Perform Daily Check-in & Get Streak & Count Today's Plays
    setLoadingStreak(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check-in
        const res = await fetch('/api/daily-streak', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, action: 'checkin' })
        });
        const streakData = await res.json();
        if (streakData.ok) {
          setStreakInfo(streakData.data);
        }

        // Count plays today (for 1/3 progress bar)
        const todayStr = new Date().toISOString().split('T')[0];
        const { count, error } = await supabase
          .from('game_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', `${todayStr}T00:00:00.000Z`)
          .lte('created_at', `${todayStr}T23:59:59.999Z`);

        if (!error && count !== null) {
          setDailyCount(count);
        } else {
          // Fallback if query fails, at least we just played 1
          setDailyCount(prev => prev + 1);
        }
      }
    } catch (e) {
      console.error("Streak error", e);
    } finally {
      setLoadingStreak(false);
    }

    setResult({ ...stats, stars: rawData.stars });
  };

  const handleNextLevel = () => {
    setResult(null); // Explicitly clear before push
    if (level >= 3) {
      router.push('/allgames');
    } else {
      router.push(`/play/${gameId}?level=${level + 1}`);
    }
  };

  const handleReplay = () => {
    window.location.reload();
  };

  // Calculate stats progress
  const targetDaily = 3;
  const progressPercent = Math.min(100, Math.round((dailyCount / targetDaily) * 100));

  return (
    <div className="w-full h-screen relative bg-[#FDF6E3]">
      {/* Header with Back Button (Optional) */}
      <div className="absolute top-4 left-4 z-10">
        <a href="/" className="bg-white/80 p-2 rounded-full shadow hover:bg-white">
          ⬅ Back
        </a>
      </div>

      {/* The Game */}
      <GameCanvas gameId={gameId} onGameOver={handleGameOver} level={level} />

      {/* The Result Popup Overlay */}
      {result && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#FFF8E7] p-8 rounded-2xl text-center shadow-2xl border-4 border-[#8B4513]">
            <h1 className="text-3xl font-bold text-[#8B4513] mb-2">เยี่ยมมาก!</h1>
            <div className="text-6xl my-4">⭐⭐⭐</div>

            <div className="text-left bg-white/50 p-4 rounded-lg mt-4 text-sm font-mono text-[#5A3E2B]">
              <p>Memory: {result.stat_memory}</p>
              <p>Speed: {result.stat_speed}</p>
              <p>Focus: {result.stat_focus}</p>
              <p>Logic: {result.stat_planning}</p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-[#E86A33] hover:bg-[#D65A22] text-white px-8 py-3 rounded-full text-xl font-bold transition-transform active:scale-95"
            >
              เล่นอีกครั้ง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}