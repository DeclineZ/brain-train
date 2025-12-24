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
          postBoot: (game) => {
            // 1. Pass the React Callback to the Registry
            game.registry.set('onGameOver', onGameOver);

            // 2. Restart the Scene with the Specific Level Data
            // We get the active scene key (e.g., 'MemoryGameScene')
            const sceneKey = game.scene.getScenes(false)[0].sys.settings.key;

            // We force start it again, passing the 'level' variable you fixed
            game.scene.start(sceneKey, { level: level });
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