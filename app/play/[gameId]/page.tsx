'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useGameSession } from '@/hooks/useGameSession';
// import GameCanvas from '@/components/game/GameCanvas';

const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-brown-primary font-bold text-xl">Loading Game Engine...</div>
});
import StarIcon from '@/components/game/StarIcon';
import ConfettiEffect from '@/components/game/ConfettiEffect';
import TimeoutPopup from '@/components/game/TimeoutPopup';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Home, ArrowLeft, Coins } from 'lucide-react';

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
  const [showTutorialPopup, setShowTutorialPopup] = useState(false);

  // Ref for imperative game control
  const gameRef = useRef<any>(null);

  const searchParams = useSearchParams();
  // We prioritize URL param, but if missing, we wait for DB fetch
  const paramLevel = searchParams.get('level');
  const tutorialMode = searchParams.get('tutorial_mode');

  // Endless Mode Check
  const isEndless = gameId === 'game-02-sensorlock';
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [resumeLevel, setResumeLevel] = useState<number>(1);
  const [highScore, setHighScore] = useState<number>(0);

  // 1. Fetch persistent level on mount
  useEffect(() => {
    // If param is present, set it immediately so UI doesn't flicker
    if (paramLevel) {
      setActiveLevel(Number(paramLevel));
      // If it's not tutorial, we can stop loading. 
      // If it IS tutorial, we still might want to fetch resumeLevel in background.
      setIsLoadingLevel(false);
    }

    async function fetchLevel() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingLevel(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('game_sessions')
          .select('current_played')
          .eq('user_id', user.id)
          .eq('game_id', gameId)
          .order('current_played', { ascending: false })
          .limit(1)
          .single();

        let nextLevel = 1;
        if (data && data.current_played) {
          // Prevent going beyond max level (7)
          nextLevel = data.current_played + 1;
          if (nextLevel > 7) nextLevel = 7;
        }

        setResumeLevel(nextLevel);

        // Only override activeLevel if no param was provided
        if (!paramLevel) {
          if (data && data.current_played) {
            setActiveLevel(nextLevel);
          } else {
            // No history -> Start Tutorial (Level 0) for cardmatch
            if (gameId === 'game-01-cardmatch' || gameId === 'game-02-sensorlock') {
              setActiveLevel(0);
            }
          }
        }

        // Also fetch stars
        const { data: starRows } = await supabase
          .from('user_game_stars')
          .select('level, star')
          .eq('user_id', user.id)
          .eq('game_id', gameId);

        if (starRows) {
          const formattedStars: any = {};
          let total = 0;
          starRows.forEach((row: any) => {
            formattedStars[`level_${row.level}_stars`] = row.star;
            total += row.star;
          });
          formattedStars.total_stars = total;
          setGameStars(formattedStars);
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

        // Fetch completed daily missions count
        const today = new Date().toISOString().split('T')[0];
        const { count: missionCount } = await supabase
          .from('daily_missions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('date', today)
          .eq('completed', true);

        if (missionCount !== null) {
          setDailyCount(missionCount);
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
    setShowTutorialPopup(false);
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

  const handleTutorialComplete = useCallback(async () => {
    setShowTutorialPopup(true);
    try {
      await submitSession(gameId, { level: 0, score: 0, stars: 3, success: true });
    } catch (e) {
      console.error("Failed to submit tutorial session", e);
    }
  }, [gameId, submitSession]);

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

    // Tutorial Completion is now handled by handleTutorialComplete
    // But keeping this as safeguard if old logic persists
    if (activeLevel === 0) {
      setShowTutorialPopup(true);
      await submitSession(gameId, rawData);
      return;
    }

    // Calculate Earned Coins Optimistically
    let optimisticCoins = 0;
    if (activeLevel > 0) {
      if (gameId === 'game-02-sensorlock') {
        // Match server logic (800 divisor)
        optimisticCoins = Math.max(1, Math.floor((rawData.score || 0) / 800));
      } else {
        // Card Match / Default
        const levelMultiplier = 1 + (activeLevel - 1) * 0.1;
        let baseReward = Math.floor(20 * levelMultiplier);

        // Star Quality Multiplier
        let starMultiplier = 1.0;
        const stars = Number(rawData.stars || 0);
        if (stars === 2) starMultiplier = 0.7;
        if (stars === 1) starMultiplier = 0.5;
        if (stars === 0) starMultiplier = 0.0;

        baseReward = Math.floor(baseReward * starMultiplier);

        // Check Replay (using gameStars state)
        const hasStars = gameStars?.[`level_${activeLevel}_stars`] > 0;
        if (hasStars) {
          baseReward = Math.floor(baseReward * 0.9);
        }
        optimisticCoins = baseReward;
      }
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
      stat_emotion: null,
      starHint: rawData.starHint, // Capture Hint
      earnedCoins: optimisticCoins
    });

    // Save Level Progress (Implementation simplified)
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
  }, [activeLevel, gameId, submitSession, dailyCount, gameStars, isEndless]);

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
  const targetDaily = 2;
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
        onTutorialComplete={handleTutorialComplete}
        mode={activeLevel === 0 ? 'tutorial' : 'normal'}
        level={activeLevel}
        stars={gameStars}
      />

      {/* TIMEOUT POPUP */}
      {isTimeout && (
        <TimeoutPopup
          onContinue={handleContinue}
          onRestart={handleRestartLevel}
          onPreviousLevel={handlePreviousLevel}
          onGiveUp={() => router.push('/')}
          activeLevel={activeLevel}
        />
      )}

      {/* The Result Popup Overlay */}
      {showTutorialPopup && (
        <div className="absolute inset-0 bg-overlay/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-300">
          <ConfettiEffect />
          <div className="bg-popup-bg w-[90%] max-w-sm rounded-[32px] shadow-2xl border-8 border-brown-primary relative z-10 overflow-hidden flex flex-col items-center p-6 text-center animate-in zoom-in-95 duration-300">
            <h1 className="text-3xl font-extrabold text-popup-title drop-shadow-sm mt-2 mb-4">
              คุณเก่งมาก!
            </h1>
            <p className="text-brown-primary font-bold text-lg mb-6">
              เราไปเริ่มเล่นเกมจริงกัน
            </p>
            <div className="flex gap-4 w-full justify-center">
              <button
                onClick={() => {
                  // Tutorial unlikely to trigger all quests complete (since it is level 0), but good practice
                  router.push('/');
                }}
                className="bg-[#1CB0F6] hover:bg-[#1899D6] border-b-4 border-[#1899D6] text-white rounded-2xl flex items-center justify-center font-bold shadow-lg active:border-b-0 active:translate-y-1 transition-all px-4 py-3"
              >
                <Home className="w-8 h-8" />
              </button>
              <button
                onClick={() => {
                  setShowTutorialPopup(false);
                  if (tutorialMode === 'review') {
                    // Manual review -> Go to saved resume level (or max level)
                    setActiveLevel(resumeLevel);
                  } else {
                    // First time tutorial -> Go to Level 1
                    setActiveLevel(1);
                  }
                }}
                className="flex-1 bg-[#58CC02] hover:bg-[#46A302] border-b-4 border-[#46A302] text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg active:border-b-0 active:translate-y-1 transition-all py-3"
              >
                เริ่มเลย
              </button>
            </div>
          </div>
        </div>
      )}

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

                {/* Star Hint Tooltip */}
                {!isEndless && result.stars < 3 && result.starHint && (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 mb-4 animate-pulse">
                    <p className="text-yellow-800 font-bold text-sm text-center leading-relaxed whitespace-pre-line">
                      <span className="mr-1">ตัวช่วย :</span>
                      <span>{result.starHint}</span>
                    </p>
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
                    {result.earnedCoins > 0 && (
                      <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold shadow-sm flex items-center gap-1">
                        <Coins className="w-5 h-5 text-yellow-600 fill-yellow-600/20" />
                        <span>+{result.earnedCoins}</span>
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
                    <span>ภารกิจของวันนี้</span>
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
                      {streakInfo ? (Math.max(0, targetDaily - dailyCount) === 0 ? 'ภารกิจวันนี้เสร็จแล้ว' : `เหลืออีก ${Math.max(0, targetDaily - dailyCount)} ภารกิจ`) : 'กำลังบันทึก...'}
                    </div>
                  </div>
                </div>

                {/* Buttons Row (Success) */}
                {/* Buttons Row (Success) - Only show after stats loaded */}
                {((!isEndless && result.stat_memory !== null) || (isEndless && result.stat_focus !== null)) && (
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex gap-4 w-full justify-center">
                      {/* Restart Level Button */}
                      {!isEndless && (
                        <button
                          onClick={handleRestartLevel}
                          className="w-16 h-16 bg-white border-4 border-btn-border-light rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-brown-primary p-3"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className="w-full h-full">
                            <path d="M263.09 50 a205.803 205.803 0 0 0-35.857 3.13 C142.026 68.156 75.156 135.026 60.13 220.233 45.108 305.44 85.075 391.15 160.005 434.41 c32.782 18.927 69.254 27.996 105.463 27.553 46.555-.57 92.675-16.865 129.957-48.15 l-30.855-36.768 a157.846 157.846 0 0 1-180.566 15.797 a157.846 157.846 0 0 1-76.603-164.274 A157.848 157.848 0 0 1 235.571 100.4 a157.84 157.84 0 0 1 139.17 43.862 L327 192h128V64l-46.34 46.342 C370.242 71.962 317.83 50.03 263.09 50z" />
                          </svg>
                        </button>
                      )}

                      {/* Back to Home Button */}
                      <button
                        onClick={() => {
                          const query = result.allMissionsCompleted ? '?questComplete=true' : '';
                          router.push(`/${query}`);
                        }}
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
      )
      }
    </div>
  );
}

