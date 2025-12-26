'use client';

import { use, useState, useEffect } from 'react';
import { useGameSession } from '@/hooks/useGameSession';
import GameCanvas from '@/components/game/GameCanvas';
import StarIcon from '@/components/game/StarIcon';
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
    // 0. Handle Failure Case
    if (rawData.success === false) {
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

    // 2. Submit Game Stats (Async)
    const stats = await submitSession(gameId, rawData);

    // 3. Perform Daily Check-in & Get Streak
    setLoadingStreak(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {

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
    if (level >= 3) {
      router.push('/allgames');
    } else {
      router.push(`/play/${gameId}?level=${level + 1}`);
    }
  };

  const handleReplay = () => {
    window.location.reload();
  };

  const handlePreviousLevel = () => {
    router.push(`/play/${gameId}?level=${level - 1}`);
  };

  // Calculate stats progress
  const targetDaily = 3;
  const progressPercent = Math.min(100, Math.round((dailyCount / targetDaily) * 100));

  return (
    <div className="w-full h-screen relative bg-[#FDF6E3] overflow-hidden">
      {/* Header with Back Button */}
      <div className="absolute top-4 left-4 z-10 transition-transform hover:scale-105 active:scale-95">
        <a href="/" className="bg-white/90 p-3 rounded-full shadow-lg border-2 border-[#8B4513]/20 flex items-center justify-center">
          <span className="text-xl">🏠</span>
        </a>
      </div>

      {/* The Game */}
      {/* The Game - Force remount on level change */}
      <GameCanvas key={level} gameId={gameId} onGameOver={handleGameOver} level={level} />

      {/* The Result Popup Overlay */}
      {result && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Main Card */}
          <div className="bg-[#FFF9F0] w-[90%] max-w-sm rounded-[32px] shadow-2xl border-8 border-[#8B4513] relative overflow-hidden flex flex-col items-center p-6 text-center animate-in zoom-in-95 duration-300">

            {result.success !== false ? (
              // SUCCESS CONTENT
              <>
                <h1 className="text-4xl font-extrabold text-[#754E29] drop-shadow-sm mt-2 mb-4">
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
                <div className="bg-[#FFF4E0] w-full rounded-2xl p-4 mb-4 flex flex-col gap-2">
                  <div className="flex flex-wrap justify-center gap-2">
                    {/* Loading State */}
                    {result.stat_memory === null && (
                      <div className="text-[#8B4513] animate-pulse font-bold text-sm">กำลังคำนวณคะแนน...</div>
                    )}

                    {result.stat_memory !== null && (
                      <div className="bg-[#A8E6CF] text-[#1B5E20] px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ ความจำ
                      </div>
                    )}
                    {result.stat_speed !== null && (
                      <div className="bg-[#FFD3B6] text-[#BF360C] px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ ความเร็ว
                      </div>
                    )}
                    {result.stat_focus !== null && (
                      <div className="bg-[#D1C4E9] text-[#4527A0] px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ สมาธิ
                      </div>
                    )}
                    {result.stat_planning !== null && (
                      <div className="bg-[#B3E5FC] text-[#01579B] px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        ^ การวางแผน
                      </div>
                    )}
                  </div>
                </div>

                {/* Streak Progress */}
                <div className="w-full mb-6 relative">
                  <div className="flex justify-between text-[#8B4513] font-bold text-sm mb-1 px-2">
                    <span>วันนี้เล่นไปแล้ว</span>
                    <span>{dailyCount}/{targetDaily}</span>
                  </div>
                  <div className="w-full h-8 bg-[#8B4513]/20 rounded-full relative overflow-hidden">
                    {/* Fill */}
                    <div
                      className="h-full bg-[#FFD700] rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                    {/* Text Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center text-[#5A3E2B] font-bold shadow-sm text-xs">
                      {streakInfo ? `Streak ${streakInfo.streak_count} วัน!` : 'กำลังบันทึก...'}
                    </div>
                  </div>
                </div>

                {/* Buttons Row (Success) */}
                <div className="flex gap-4 w-full justify-center">
                  <button
                    onClick={handleReplay}
                    className="w-16 h-16 bg-white border-4 border-[#E0E0E0] rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-[#8B4513] p-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className="w-full h-full">
                      <path d="M263.09 50 a205.803 205.803 0 0 0-35.857 3.13 C142.026 68.156 75.156 135.026 60.13 220.233 45.108 305.44 85.075 391.15 160.005 434.41 c32.782 18.927 69.254 27.996 105.463 27.553 46.555-.57 92.675-16.865 129.957-48.15 l-30.855-36.768 a157.846 157.846 0 0 1-180.566 15.797 a157.846 157.846 0 0 1-76.603-164.274 A157.848 157.848 0 0 1 235.571 100.4 a157.84 157.84 0 0 1 139.17 43.862 L327 192h128V64l-46.34 46.342 C370.242 71.962 317.83 50.03 263.09 50z" />
                    </svg>
                  </button>

                  <button
                    onClick={handleNextLevel}
                    className="flex-1 bg-[#76D13D] hover:bg-[#65B731] border-b-4 border-[#529427] text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg active:border-b-0 active:translate-y-1 transition-all"
                  >
                    {level >= 3 ? 'กลับหน้าหลัก' : 'เกมถัดไป'}
                  </button>
                </div>
              </>
            ) : (
              // FAILURE CONTENT
              <>
                <h1 className="text-4xl font-extrabold text-[#D32F2F] drop-shadow-sm mt-2 mb-4">
                  หมดเวลา!
                </h1>

                <div className="text-[#8B4513] font-medium text-lg mb-8 px-4">
                  ไม่เป็นไรนะ ลองใหม่อีกครั้ง
                  <br />พยายามเข้านะ!
                </div>

                <div className="flex gap-4 w-full justify-center">
                  {level === 1 ? (
                    // LEVEL 1: Only Replay (Large)
                    <button
                      onClick={handleReplay}
                      className="flex-1 bg-[#4DA6FF] hover:bg-[#2B83DD] border-b-4 border-[#2568BA] text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg active:border-b-0 active:translate-y-1 transition-all py-3"
                    >
                      เล่นอีกครั้ง
                    </button>
                  ) : (
                    // LEVEL > 1: Replay (Small) + Previous Level (Large)
                    <>
                      <button
                        onClick={handleReplay}
                        className="w-16 h-16 bg-white border-4 border-[#E0E0E0] rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-[#8B4513] p-3"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 512 512"
                          fill="currentColor"
                          className="w-full h-full"
                        >
                          <path
                            d="M263.09 50
                                   a205.803 205.803 0 0 0-35.857 3.13
                                   C142.026 68.156 75.156 135.026 60.13 220.233
                                   45.108 305.44 85.075 391.15 160.005 434.41
                                   c32.782 18.927 69.254 27.996 105.463 27.553
                                   46.555-.57 92.675-16.865 129.957-48.15
                                   l-30.855-36.768
                                   a157.846 157.846 0 0 1-180.566 15.797
                                   a157.846 157.846 0 0 1-76.603-164.274
                                   A157.848 157.848 0 0 1 235.571 100.4
                                   a157.84 157.84 0 0 1 139.17 43.862
                                   L327 192h128V64l-46.34 46.342
                                   C370.242 71.962 317.83 50.03 263.09 50z"
                          />
                        </svg>
                      </button>

                      <button
                        onClick={handlePreviousLevel}
                        className="flex-1 bg-[#FFB74D] hover:bg-[#F57C00] border-b-4 border-[#E65100] text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg active:border-b-0 active:translate-y-1 transition-all py-3"
                      >
                        ย้อนกลับด่านเดิม
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}