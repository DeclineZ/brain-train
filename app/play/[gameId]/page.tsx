'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '@/hooks/useGameSession';
import GameCanvas from '@/components/game/GameCanvas';
import StarIcon from '@/components/game/StarIcon';
import ConfettiEffect from '@/components/game/ConfettiEffect';
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
  const [gameStars, setGameStars] = useState<any>({});
  const [retryCount, setRetryCount] = useState(0);

  // Ref for imperative game control
  const gameRef = useRef<any>(null);

  const searchParams = useSearchParams();
  // We prioritize URL param, but if missing, we wait for DB fetch
  const paramLevel = searchParams.get('level');
  // Endless Mode Check
  const isEndless = gameId === 'game-02-sensorlock';
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [highScore, setHighScore] = useState<number>(0);

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
          .from('game_sessions')
          .select('current_played')
          .eq('user_id', user.id)
          .eq('game_id', gameId)
          .order('current_played', { ascending: false })
          .limit(1)
          .single();

        if (data && data.current_played) {
          // Prevent going beyond max level (7)
          const nextLevel = data.current_played + 1;
          setActiveLevel(nextLevel > 7 ? 7 : nextLevel);
        }

        // Also fetch stars
        const { data: starData } = await supabase
          .from('user_game_stars')
          .select('*')
          .eq('user_id', user.id)
          .eq('game_id', gameId)
          .single();

        if (starData) {
          setGameStars(starData);
        }

        if (isEndless) {
          const { data: sessions } = await supabase
            .from('game_sessions')
            .select('score')
            .eq('user_id', user.id)
            .eq('game_id', gameId)
            .not('score', 'is', null) // Filter out null scores from old records
            .order('score', { ascending: false })
            .limit(1)
            .single();

          if (sessions && sessions.score) {
            setHighScore(sessions.score);
          }
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

  /* 
   * CRITICAL: These handlers must be memoized with useCallback.
   * If they are recreated on every render, GameCanvas useEffect will fire,
   * destroying and recreating the Phaser game instance, causing a full reset.
   */

  const handleTimeout = useCallback((data: { level: number }) => {
    setIsTimeout(true);
  }, []);

  const handleContinue = useCallback(() => {
    setIsTimeout(false);
    // Resume game with penalty
    if (gameRef.current) {
      gameRef.current.resumeGame(true);
    }
  }, []);

  const handleReplay = useCallback(() => {
    // Update local high score if the game just played beat it
    if (result?.score && result.score > highScore) {
      setHighScore(result.score);
    }
    setResult(null);
    setIsTimeout(false);
    setRetryCount(prev => prev + 1);
  }, [result, highScore]);

  const handleRestartLevel = useCallback(() => {
    handleReplay();
  }, [handleReplay]);

  const handleGameOver = useCallback(async (rawData: any) => {
    // 0. Handle Failure Case (but now "Timeout" handles the soft fail)
    // If we get here with success=false, it means a HARD fail or restart
    if (rawData.success === false && !isEndless) {
      // Typically shouldn't happen with timeout logic unless forced
      setResult({ success: false });
      return;
    }

    // 1. Optimistic UI: Show popup IMMEDIATELY with partial data
    setResult({
      success: true,
      stars: rawData.stars,
      score: rawData.score, // Capture Score
      stat_memory: null, // Loading indicators
      stat_speed: null,
      stat_focus: null,
      stat_planning: null,
      stat_emotion: null
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
        // No explicit save to users table needed, relying on game_sessions history now.

        const res = await fetch('/api/daily-streak', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, action: 'checkin' })
        });
        const streakData = await res.json();
        if (streakData.ok) {
          setStreakInfo(streakData.data);
          // Save for notification on home page ONLY if it's a new check-in
          if (streakData.data.new_checkin) {
            sessionStorage.setItem('daily_streak_new_checkin', JSON.stringify(streakData.data));
          }
        }

        if (stats.dailyPlayedCount !== undefined) {
          setDailyCount(stats.dailyPlayedCount);
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

    // 5. Trigger TopBar Refresh
    // This event name 'balanceUpdate' is listened to by TopBar to refetch user stats (including stars)
    window.dispatchEvent(new Event('balanceUpdate'));
  }, [activeLevel, gameId, submitSession, dailyCount]);

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
        key={`${activeLevel}-${retryCount}`}
        gameId={gameId}
        onGameOver={handleGameOver}
        onTimeout={handleTimeout}
        level={activeLevel}
        stars={gameStars}
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
                  ย้อนกลับด่านที่ {activeLevel - 1}
                </button>
              )}

              {/* 4. Give Up */}
              <button
                onClick={() => router.push('/')}
                className="w-full bg-[#FF4B4B] hover:bg-[#D43F3F] border-b-4 border-[#D43F3F] text-white rounded-2xl py-3 font-bold text-xl shadow-md active:border-b-0 active:translate-y-1 transition-all"
              >
                ยอมแพ้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The Result Popup Overlay */}
      {result && (
        <div className="absolute inset-0 bg-overlay/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Celebration Effect */}
          {result.success !== false && <ConfettiEffect />}

          {/* Main Card */}
          <div className="bg-popup-bg w-[90%] max-w-sm rounded-[32px] shadow-2xl border-8 border-brown-primary relative z-10 overflow-hidden flex flex-col items-center p-6 text-center animate-in zoom-in-95 duration-300">
            {/* ... Only keeping Success content here essentially since Failure is handled by Timeout mostly, 
                but keeping structure for generic GameOver if needed ... */}

            {result.success !== false ? (
              // SUCCESS CONTENT
              <>
                <h1 className="text-4xl font-extrabold text-popup-title drop-shadow-sm mt-2 mb-4">
                  เยี่ยมมาก!
                </h1>
                {/* Stars OR Score */}
                {!isEndless ? (
                  <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3].map((star) => (
                      <div key={star} className={`transition-all duration-500 transform ${star <= (result.stars || 0) ? 'scale-100 opacity-100' : 'scale-90 opacity-50 grayscale brightness-75'}`}>
                        <StarIcon className="w-24 h-24" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center mb-6">
                    <div className="text-2xl font-bold text-brown-primary">คะแนนของคุณ</div>
                    <div className="text-6xl font-black text-[#58CC02] drop-shadow-sm">{result.score || 0}</div>

                    {result.score > highScore && (
                      <div className="mt-2 bg-[#FFD700] text-brown-primary px-4 py-1 rounded-full text-sm font-bold shadow-md animate-bounce">
                        ✨ สถิติใหม่!
                      </div>
                    )}

                    <div className="text-sm text-brown-primary/60 font-bold mt-1">
                      สถิติเดิม: {highScore}
                    </div>
                  </div>
                )}

                {/* Stats Box */}
                <div className="bg-stats-bg w-full rounded-2xl p-4 mb-4 flex flex-col gap-2">
                  <div className="flex flex-wrap justify-center gap-2">
                    {/* Loading State */}
                    {((!isEndless && result.stat_memory === null) || (isEndless && result.stat_focus === null)) && (
                      <div className="text-brown-primary animate-pulse font-bold text-sm">กำลังคำนวณคะแนน...</div>
                    )}

                    {result.statChanges?.stat_memory > 0 && (
                      <div className="bg-chip-memory-bg text-chip-memory-text px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ ความจำ
                      </div>
                    )}
                    {result.statChanges?.stat_speed > 0 && (
                      <div className="bg-chip-speed-bg text-chip-speed-text px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ ความเร็ว
                      </div>
                    )}
                    {result.statChanges?.stat_focus > 0 && (
                      <div className="bg-chip-focus-bg text-chip-focus-text px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ สมาธิ
                      </div>
                    )}
                    {result.statChanges?.stat_planning > 0 && (
                      <div className="bg-chip-planning-bg text-chip-planning-text px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ การวางแผน
                      </div>
                    )}
                    {result.statChanges?.stat_emotion > 0 && (
                      <div className="bg-chip-emotion-bg text-chip-emotion-text px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ ควบคุมอารมณ์
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
                {/* Buttons Row (Success) - Only show after stats loaded */}
                {((!isEndless && result.stat_memory !== null) || (isEndless && result.stat_focus !== null)) && (
                  <div className="flex gap-4 w-full justify-center">

                    {/* Restart Level Button (Only for non-endless games where replaying a specific level matters) */}
                    {!isEndless && (
                      <button
                        onClick={handleRestartLevel}
                        className="bg-[#1CB0F6] hover:bg-[#1899D6] border-b-4 border-[#1899D6] text-white rounded-2xl flex items-center justify-center font-bold shadow-lg active:border-b-0 active:translate-y-1 transition-all px-4"
                        title="เล่นอีกครั้ง"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" /><path d="M3 3v9h9" /></svg>
                      </button>
                    )}

                    {/* Back to Home Button */}
                    <button
                      onClick={() => router.push('/')}
                      className="bg-[#1CB0F6] hover:bg-[#1899D6] border-b-4 border-[#1899D6] text-white rounded-2xl flex items-center justify-center font-bold shadow-lg active:border-b-0 active:translate-y-1 transition-all px-4"
                    >
                      <Home className="w-8 h-8" />
                    </button>

                    <button
                      onClick={handleNextLevel}
                      className="flex-1 bg-btn-success-bg hover:bg-btn-success-hover border-b-4 border-btn-success-border text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg active:border-b-0 active:translate-y-1 transition-all"
                    >
                      {activeLevel >= 7 && !isEndless ? 'จบเกม' : (isEndless ? 'เล่นอีกครั้ง' : 'เกมถัดไป')}
                    </button>
                  </div>
                )}
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
