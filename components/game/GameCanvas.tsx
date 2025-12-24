'use client';
import { useEffect, useRef } from 'react';

interface GameCanvasProps {
  gameId: string;
  level?: number; // <--- 1. We define the type here
  onGameOver?: (data: any) => void;
}

// <--- 2. WE DESTRUCTURE 'level' HERE so it exists in the function
export default function GameCanvas({ gameId, level = 1, onGameOver }: GameCanvasProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<any>(null);

  useEffect(() => {
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

      gameInstance.current = new Phaser.Game({
        ...selectedConfig,
        parent: gameRef.current || 'game-container',
        callbacks: {
          preBoot: (game) => {
            // 1. Pass the React Callback to the Registry
            game.registry.set('onGameOver', onGameOver);

            // 2. Set Level in Registry (Most reliable way to pass config)
            game.registry.set('level', level);
            console.log("Game initialized with level:", level);
          }
        }
      });
    }

    // Initialize
    initGame();

    // Cleanup
    return () => {
      gameInstance.current?.destroy(true);
      gameInstance.current = null;
    };
  }, [gameId, level, onGameOver]);

  return (
    <div
      id="game-container"
      ref={gameRef}
      className="w-full h-full rounded-xl overflow-hidden shadow-2xl"
    />
  );
}