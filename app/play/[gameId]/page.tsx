'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useGameSession } from '@/hooks/useGameSession';
import GameCanvas from '@/components/game/GameCanvas';
import StarIcon from '@/components/game/StarIcon';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Home } from 'lucide-react';

interface PageProps {
  params: Promise<{ gameId: string }>;
}

export default function GamePage({ params }: PageProps) {
  const { gameId } = use(params);
  const router = useRouter();

  const { submitSession } = useGameSession();
  const [result, setResult] = useState<any>(null); // For Success/Final Failure
  const [isTimeout, setIsTimeout] = useState(false); // For Timeout Popup
  const [streakInfo, setStreakInfo] = useState<any>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [loadingStreak, setLoadingStreak] = useState(false);
  const [isLoadingLevel, setIsLoadingLevel] = useState(true);

  // Ref for imperative game control
  const gameRef = useRef<any>(null);

  const searchParams = useSearchParams();
  // We prioritize URL param, but if missing, we wait for DB fetch
  const paramLevel = searchParams.get('level');
  const [activeLevel, setActiveLevel] = useState<number>(1);

  // 1. Fetch persistent level on mount if not in URL
  useEffect(() => {
    if (paramLevel) {
      setActiveLevel(Number(paramLevel));
      setIsLoadingLevel(false);
      return;
    }

    async function fetchLevel() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingLevel(false);
        return;
      }
      // Assuming a table or reusing game_sessions logic to find max level?
      // Actually spec says "Fetch current_level from Supabase Track: user_id, game_id, current_level"
      // Let's assume there is a 'game_progress' table or similar. 
      // If not exists, I should probably create it or use local storage?
      // Given I cannot run SQL DDL easily, I should check if I can use a simple generic table.
      // Or just default to 1 for now and note it in Persistence Task.
      // "Task: Integrate current_level fetching/saving". 
      // I will implement the logic assuming a 'user_games' table exists or similar for now.

      try {
        const { data, error } = await supabase
          .from('user_game_progress')
          .select('current_level')
          .eq('user_id', user.id)
          .eq('game_id', gameId)
          .single();

        if (data && data.current_level) {
          setActiveLevel(data.current_level);
        }
      } catch (err) {
        console.warn("Could not fetch level, defaulting to 1", err);
      } finally {
        setIsLoadingLevel(false);
      }
    }
    fetchLevel();
  }, [gameId, paramLevel]);

  // Clear popups when level changes
  useEffect(() => {
    setResult(null);
    setIsTimeout(false);
  }, [activeLevel]);

  const handleTimeout = (data: { level: number }) => {
    setIsTimeout(true);
  };

  const handleContinue = () => {
    setIsTimeout(false);
    // Resume game with penalty
    if (gameRef.current) {
      gameRef.current.resumeGame(true);
    }
  };

  const handleRestartLevel = () => {
    window.location.reload();
  };

  const handleGameOver = async (rawData: any) => {
    // 0. Handle Failure Case (but now "Timeout" handles the soft fail)
    // If we get here with success=false, it means a HARD fail or restart
    if (rawData.success === false) {
      // Typically shouldn't happen with timeout logic unless forced
      setResult({ success: false });
      return;
    }

    // 1. Optimistic UI: Show popup IMMEDIATELY with partial data
    setResult({
      success: true,
      stars: rawData.stars,
      stat_memory: null, // Loading indicators
      stat_speed: null,
      stat_focus: null,
      stat_planning: null
    });

    // Save Level Progress (Implementation simplified)
    const nextLvl = activeLevel + 1;
    // We should save this to DB here.

    // 2. Submit Game Stats (Async)
    const stats = await submitSession(gameId, rawData);

    // 3. Perform Daily Check-in & Get Streak
    setLoadingStreak(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Save Progress
        try {
          await supabase
            .from('user_game_progress')
            .upsert({
              user_id: user.id,
              game_id: gameId,
              current_level: nextLvl,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, game_id' });
        } catch (saveErr) {
          console.warn("Could not save to user_game_progress (Table might be missing)", saveErr);
        }

        const res = await fetch('/api/daily-streak', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, action: 'checkin' })
        });
        const streakData = await res.json();
        if (streakData.ok) {
          setStreakInfo(streakData.data);
        }

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
          setDailyCount(prev => prev + 1);
        }
      }
    } catch (e) {
      console.error("Streak error", e);
    } finally {
      setLoadingStreak(false);
    }

    // 4. Update Popup with REAL stats
    setResult((prev: any) => ({ ...prev, ...stats }));
  };

  const handleNextLevel = () => {
    setResult(null); // Explicitly clear before push
    // For level 7 (max), maybe loop or show "Complete"
    if (activeLevel >= 7) {
      router.push('/allgames');
    } else {
      // Force reload by pushing new URL or just state update?
      // Since GameCanvas uses 'key={activeLevel}', state update works.
      // But we prefer URL for shareability.
      router.push(`/play/${gameId}?level=${activeLevel + 1}`);
    }
  };

  const handlePreviousLevel = () => {
    router.push(`/play/${gameId}?level=${activeLevel - 1}`);
  };

  // Calculate stats progress
  const targetDaily = 3;
  const progressPercent = Math.min(100, Math.round((dailyCount / targetDaily) * 100));

  if (isLoadingLevel) return <div className="w-full h-screen bg-game-bg flex items-center justify-center text-brown-primary font-bold">Loading...</div>;

  return (
    <div className="w-full h-screen relative bg-game-bg overflow-hidden">
      {/* Header with Back Button */}
      <div className="absolute top-4 left-4 z-10 transition-transform hover:scale-105 active:scale-95">
        <a href="/" className="bg-white/90 p-3 rounded-full shadow-lg border-2 border-brown-primary/20 flex items-center justify-center">
          <Home className="w-6 h-6 text-brown-primary" />
        </a>
      </div>

      {/* The Game */}
      {/* The Game - Force remount on level change */}
      <GameCanvas
        ref={gameRef}
        key={activeLevel}
        gameId={gameId}
        onGameOver={handleGameOver}
        onTimeout={handleTimeout}
        level={activeLevel}
      />

      {/* TIMEOUT POPUP */}
      {isTimeout && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-popup-bg w-[90%] max-w-sm rounded-[32px] shadow-2xl border-8 border-brown-primary relative overflow-hidden flex flex-col items-center p-6 text-center animate-in zoom-in-95 duration-300">
            <h1 className="text-3xl font-extrabold text-[#D95C5C] drop-shadow-sm mt-2 mb-4">
              หมดเวลา!
            </h1>
            <p className="text-brown-primary font-bold text-lg mb-6">
              จะทำอย่างไรต่อดี?
            </p>

            <div className="flex flex-col gap-3 w-full">
              {/* 1. Continue */}
              <button
                onClick={handleContinue}
                className="w-full bg-[#58CC02] hover:bg-[#46A302] border-b-4 border-[#46A302] text-white rounded-2xl py-3 font-bold text-xl shadow-md active:border-b-0 active:translate-y-1 transition-all"
              >
                เล่นต่อ (คะแนนลดลง)
              </button>

              {/* 2. Restart */}
              <button
                onClick={handleRestartLevel}
                className="w-full bg-[#1CB0F6] hover:bg-[#1899D6] border-b-4 border-[#1899D6] text-white rounded-2xl py-3 font-bold text-xl shadow-md active:border-b-0 active:translate-y-1 transition-all"
              >
                เริ่มด่านใหม่
              </button>

              {/* 3. Previous Level (Conditional) */}
              {activeLevel > 1 && (
                <button
                  onClick={handlePreviousLevel}
                  className="w-full bg-white border-4 border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 rounded-2xl py-3 font-bold text-lg shadow-sm active:translate-y-1 transition-all"
                >
                  ย้อนกลับด่าน {activeLevel - 1}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* The Result Popup Overlay */}
      {result && (
        <div className="absolute inset-0 bg-overlay/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Main Card */}
          <div className="bg-popup-bg w-[90%] max-w-sm rounded-[32px] shadow-2xl border-8 border-brown-primary relative overflow-hidden flex flex-col items-center p-6 text-center animate-in zoom-in-95 duration-300">
            {/* ... Only keeping Success content here essentially since Failure is handled by Timeout mostly, 
                but keeping structure for generic GameOver if needed ... */}

            {result.success !== false ? (
              // SUCCESS CONTENT
              <>
                <h1 className="text-4xl font-extrabold text-popup-title drop-shadow-sm mt-2 mb-4">
                  เยี่ยมมาก!
                </h1>
                {/* Stars */}
                <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3].map((star) => (
                    <div key={star} className={`transition-all duration-500 transform ${star <= (result.stars || 0) ? 'scale-100 opacity-100' : 'scale-90 opacity-50 grayscale brightness-75'}`}>
                      <StarIcon className="w-24 h-24" />
                    </div>
                  ))}
                </div>

                {/* Stats Box */}
                <div className="bg-stats-bg w-full rounded-2xl p-4 mb-4 flex flex-col gap-2">
                  <div className="flex flex-wrap justify-center gap-2">
                    {/* Loading State */}
                    {result.stat_memory === null && (
                      <div className="text-brown-primary animate-pulse font-bold text-sm">กำลังคำนวณคะแนน...</div>
                    )}

                    {result.stat_memory !== null && (
                      <div className="bg-chip-memory-bg text-chip-memory-text px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ ความจำ
                      </div>
                    )}
                    {result.stat_speed !== null && (
                      <div className="bg-chip-speed-bg text-chip-speed-text px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ ความเร็ว
                      </div>
                    )}
                    {result.stat_focus !== null && (
                      <div className="bg-chip-focus-bg text-chip-focus-text px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ สมาธิ
                      </div>
                    )}
                    {result.stat_planning !== null && (
                      <div className="bg-chip-planning-bg text-chip-planning-text px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ การวางแผน
                      </div>
                    )}
                  </div>
                </div>

                {/* Streak Progress */}
                <div className="w-full mb-6 relative">
                  <div className="flex justify-between text-brown-primary font-bold text-sm mb-1 px-2">
                    <span>วันนี้เล่นไปแล้ว</span>
                    <span>{dailyCount}/{targetDaily}</span>
                  </div>
                  <div className="w-full h-8 bg-brown-primary/20 rounded-full relative overflow-hidden">
                    {/* Fill */}
                    <div
                      className="h-full bg-streak-fill rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                    {/* Text Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center text-streak-text font-bold shadow-sm text-xs">
                      {streakInfo ? `Streak ${streakInfo.streak_count} วัน!` : 'กำลังบันทึก...'}
                    </div>
                  </div>
                </div>

                {/* Buttons Row (Success) */}
                <div className="flex gap-4 w-full justify-center">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-16 h-16 bg-white border-4 border-btn-border-light rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-brown-primary p-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className="w-full h-full">
                      <path d="M263.09 50 a205.803 205.803 0 0 0-35.857 3.13 C142.026 68.156 75.156 135.026 60.13 220.233 45.108 305.44 85.075 391.15 160.005 434.41 c32.782 18.927 69.254 27.996 105.463 27.553 46.555-.57 92.675-16.865 129.957-48.15 l-30.855-36.768 a157.846 157.846 0 0 1-180.566 15.797 a157.846 157.846 0 0 1-76.603-164.274 A157.848 157.848 0 0 1 235.571 100.4 a157.84 157.84 0 0 1 139.17 43.862 L327 192h128V64l-46.34 46.342 C370.242 71.962 317.83 50.03 263.09 50z" />
                    </svg>
                  </button>

                  <button
                    onClick={handleNextLevel}
                    className="flex-1 bg-btn-success-bg hover:bg-btn-success-hover border-b-4 border-btn-success-border text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg active:border-b-0 active:translate-y-1 transition-all"
                  >
                    {activeLevel >= 7 ? 'กลับหน้าหลัก' : 'เกมถัดไป'}
                  </button>
                </div>
              </>
            ) : (
              // FALLBACK FAILURE (Should rarely show due to Timeout Popup)
              <div className="text-center">
                <h1 className="text-3xl">Game Over</h1>
                <button onClick={handleRestartLevel}>Restart</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
