import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { Game } from 'phaser';

export interface GameCanvasHandle {
  resumeGame: (penalty: boolean) => void;
}

interface GameCanvasProps {
  gameId: string;
  level?: number;
  stars?: Record<string, number>; // level_X_stars
  onGameOver?: (data: any) => void;
  onTimeout?: (data: any) => void;
  onTutorialComplete?: () => void;
  mode?: 'normal' | 'tutorial';
}

const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({ gameId, level = 1, stars = {}, onGameOver, onTimeout, onTutorialComplete, mode = 'normal' }, ref) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<any>(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    resumeGame: (penalty: boolean) => {
      if (gameInstance.current) {
        gameInstance.current.events.emit('resume-game', { penalty });
      }
    }
  }));
  // React State for UI Overlay
  const [timerData, setTimerData] = useState<any>(0); // number or { remaining, total }
  const [currentLevel, setCurrentLevel] = useState(level);
  const [showTutorialNextButton, setShowTutorialNextButton] = useState(false);

  // Latest Ref Pattern to prevent game re-initialization when handlers change
  const onGameOverRef = useRef(onGameOver);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Ref for tutorial callback
  const onTutorialCompleteRef = useRef(onTutorialComplete);
  useEffect(() => {
    onTutorialCompleteRef.current = onTutorialComplete;
  }, [onTutorialComplete]);

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

      // Determine Scene Config
      // If mode is tutorial, override the scene config to use TutorialScene
      let config = { ...selectedConfig };
      if (mode === 'tutorial' && gameId === 'game-01-cardmatch') {
        // Dynamic import
        const { TutorialScene } = await import('@/games/game-01-cardmatch/TutorialScene');
        config.scene = TutorialScene;
      }

      // Destroy old instance if it exists (prevents duplicates)
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
      }

      const newGame = new Phaser.Game({
        ...config,
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
            // 1. Pass a STABLE wrapper to the Registry
            // This allows onGameOverRef to update without needing to set registry again
            game.registry.set('onGameOver', (data: any) => {
              if (onGameOverRef.current) {
                onGameOverRef.current(data);
              }
            });

            // 2. Set Level in Registry
            game.registry.set('level', level);
            // 3. Set Stars in Registry
            game.registry.set('stars', stars);

            // 4. Set Tutorial Complete Callback
            game.registry.set('onTutorialComplete', () => {
              if (onTutorialCompleteRef.current) onTutorialCompleteRef.current();
            });

            console.log("Game initialized with level:", level, "stars:", stars, "mode:", mode);
          }
        }
      } as any);

      gameInstance.current = newGame;

      // Listen for Timer Updates from Phaser
      // We expect the scene to emit: this.game.events.emit('timer-update', seconds);
      newGame.events.on('timer-update', (data: any) => {
        setTimerData(data);
      });

      // Listen for Timeout Event
      newGame.events.on('game-timeout', (data: any) => {
        if (onTimeoutRef.current) {
          onTimeoutRef.current(data);
        }
      });

      // Listen for Tutorial Next Button Event
      newGame.events.on('tutorial-show-next-btn', (show: boolean) => {
        setShowTutorialNextButton(show);
      });
    }

    // Initialize
    initGame();

    // Cleanup
    return () => {
      if (gameInstance.current) {
        gameInstance.current.events.off('timer-update'); // Clean listener
        gameInstance.current.events.off('game-timeout');
        gameInstance.current.events.off('tutorial-show-next-btn');
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, [gameId, level, stars, mode]); // CRITICAL: Removed onGameOver/onTimeout from dependencies

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
    <div className="relative w-full h-full">



      {/* React UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between items-center p-6">

        {/* Top: Level Indicator (Centered) */}
        {gameId !== 'game-02-sensorlock' && mode !== 'tutorial' && (
          <div className="text-[#8B4513] font-bold text-3xl font-sans drop-shadow-sm bg-white/50 px-6 py-2 rounded-full border border-[#8B4513]/10 backdrop-blur-sm shadow-sm mt-2">
            LEVEL {currentLevel}
          </div>
        )}

        {mode === 'tutorial' && (
          <div className="text-[#58CC02] font-bold text-3xl font-sans drop-shadow-sm bg-white/50 px-6 py-2 rounded-full border border-[#58CC02]/20 backdrop-blur-sm shadow-sm mt-2">
            TUTORIAL
          </div>
        )}

        {/* Tutorial Next Button */}
        {showTutorialNextButton && (
          <button
            onClick={() => {
              setShowTutorialNextButton(false);
              // Call Phaser Scene Method
              const scene = gameInstance.current?.scene.getScene('TutorialScene');
              if (scene && scene.nextPhase) {
                scene.nextPhase();
              }
            }}
            className="pointer-events-auto bg-[#58CC02] hover:bg-[#46A302] text-white text-2xl font-bold py-3 px-12 rounded-2xl shadow-lg transform transition active:scale-95 border-b-4 border-[#46A302]"
            style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
          >
            ไปต่อ
          </button>
        )}

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
});

GameCanvas.displayName = 'GameCanvas';

export default GameCanvas;