'use client';

import { use, useState } from 'react'; // <--- 1. Import 'use'
import { useGameSession } from '@/hooks/useGameSession';
import GameCanvas from '@/components/game/GameCanvas';
import { useSearchParams } from 'next/navigation';

// 2. Update the Type Definition
interface PageProps {
  params: Promise<{ gameId: string }>;
}

export default function GamePage({ params }: PageProps) {
  // 3. Unwrap the Promise using 'use()'
  // This extracts the actual string "game-05-memory" from the promise
  const { gameId } = use(params); 

  const { submitSession } = useGameSession();
  const [result, setResult] = useState<any>(null);

  const searchParams = useSearchParams(); // <--- YOU MISSING THIS LINE
  const level = Number(searchParams.get('level')) || 1;

  const handleGameOver = async (rawData: any) => {
    // Now 'gameId' is a valid string, so this will work
    const stats = await submitSession(gameId, rawData);
    setResult(stats);
  };

  return (
    <div className="w-full h-screen relative bg-[#FDF6E3]">
       {/* Header with Back Button (Optional) */}
       <div className="absolute top-4 left-4 z-10">
         <a href="/dashboard" className="bg-white/80 p-2 rounded-full shadow hover:bg-white">
           ⬅ Back
         </a>
       </div>

       {/* The Game */}
       {/* We pass the unwrapped 'gameId' here */}
       <GameCanvas gameId={gameId} onGameOver={handleGameOver} level={level}/>

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