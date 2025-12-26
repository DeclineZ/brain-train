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
  const [timerValue, setTimerValue] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(level);

  useEffect(() => {
    // Reset state on new level/game
    setCurrentLevel(level);
    setTimerValue(0);

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
      newGame.events.on('timer-update', (seconds: number) => {
        setTimerValue(seconds);
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

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl">
      {/* React UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-8 pointer-events-none z-10 flex justify-center items-center gap-16">
        {/* Level Indicator */}
        <div className="text-[#8B4513] font-bold text-3xl font-sans drop-shadow-sm">
          LEVEL {currentLevel}
        </div>

        {/* Timer Indicator */}
        <div className="text-[#E86A33] font-bold text-4xl font-sans drop-shadow-sm">
          {timerValue}s
        </div>
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