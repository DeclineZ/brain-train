'use client';
import { useEffect, useRef, useState } from 'react';
import type { Game } from 'phaser';

interface GameCanvasProps {
  gameId: string;
  level?: number; // <--- 1. We define the type here
  onGameOver?: (data: any) => void;
}

// <--- 2. WE DESTRUCTURE 'level' HERE so it exists in the function
export default function GameCanvas({ gameId, level = 1, onGameOver }: GameCanvasProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<any>(null);

  // React State for UI Overlay
  const [timerData, setTimerData] = useState<any>(0); // number or { remaining, total }
  const [currentLevel, setCurrentLevel] = useState(level);

  useEffect(() => {
    // Reset state on new level/game
    setCurrentLevel(level);
    setTimerData(0);

    async function initGame() {
      // Dynamic imports to avoid SSR issues
      const Phaser = await import('phaser');
      const { GameRegistry } = await import('@/games/registry');

      const selectedConfig = GameRegistry[gameId];

      if (!selectedConfig) {
        console.error(`Game ID "${gameId}" not found in registry!`);
        return;
      }

      // Destroy old instance if it exists (prevents duplicates)
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
      }

      const newGame = new Phaser.Game({
        ...selectedConfig,
        parent: gameRef.current || 'game-container',
        // High-DPI & Sharpness Settings
        resolution: window.devicePixelRatio,
        render: {
          pixelArt: false,
          antialias: true,
          roundPixels: false
        },
        callbacks: {
          preBoot: (game: Game) => {
            // 1. Pass the React Callback to the Registry
            game.registry.set('onGameOver', onGameOver);

            // 2. Set Level in Registry (Most reliable way to pass config)
            game.registry.set('level', level);
            console.log("Game initialized with level:", level);
          }
        }
      } as any);

      gameInstance.current = newGame;

      // Listen for Timer Updates from Phaser
      // We expect the scene to emit: this.game.events.emit('timer-update', seconds);
      newGame.events.on('timer-update', (data: any) => {
        setTimerData(data);
      });
    }

    // Initialize
    initGame();

    // Cleanup
    return () => {
      if (gameInstance.current) {
        gameInstance.current.events.off('timer-update'); // Clean listener
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, [gameId, level, onGameOver]);

  const renderTimer = () => {
    if (typeof timerData === 'number') {
      return null;
    }

    // Progress Bar Mode
    const pct = Math.max(0, Math.min(100, (timerData.remaining / timerData.total) * 100));
    const isWarning = pct < 25;

    return { pct, isWarning };
  };

  const timerState = renderTimer();

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl">

      {/* GLOBAL WARNING FLASH OVERLAY */}
      {timerState && timerState.isWarning && (
        <div className="absolute inset-0 z-0 pointer-events-none bg-red-500/20 animate-pulse" />
      )}

      {/* React UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between items-center p-6">

        {/* Top: Level Indicator (Centered) */}
        <div className="text-[#8B4513] font-bold text-3xl font-sans drop-shadow-sm bg-white/50 px-6 py-2 rounded-full border border-[#8B4513]/10 backdrop-blur-sm shadow-sm mt-2">
          LEVEL {currentLevel}
        </div>

        {/* Bottom: Timer Bar - MOVED TO PHASER */}
        {/* Placeholder if needed for spacing, but removing for now */}
      </div>

      {/* Phaser Container */}
      <div
        id="game-container"
        ref={gameRef}
        className="w-full h-full"
      />
    </div>
  );
}