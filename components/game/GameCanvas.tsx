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
  const [trapWarning, setTrapWarning] = useState<string | null>(null);

  // Intro Popup State
  const [showIntroPopup, setShowIntroPopup] = useState(false);
  const [introData, setIntroData] = useState<{ title: string; description: string; imageKey?: string } | null>(null);

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
      if (mode === 'tutorial') {
        if (gameId === 'game-01-cardmatch') {
          const { TutorialScene } = await import('@/games/game-01-cardmatch/TutorialScene');
          config.scene = TutorialScene;
        } else if (gameId === 'game-02-sensorlock') {
          const { TutorialScene } = await import('@/games/game-02-sensorlock/TutorialScene');
          config.scene = TutorialScene;
        } else if (gameId === 'game-03-billiards-math') {
          const { TutorialScene } = await import('@/games/game-03-billiards-math/TutorialScene');
          config.scene = TutorialScene;
        } else if (gameId === 'game-04-floating-ball-math') {
          const { TutorialScene } = await import('@/games/game-04-floating-ball-math/TutorialScene');
          config.scene = TutorialScene;
        } else if (gameId === 'game-06-dreamdirect') {
          const { TutorialScene } = await import('@/games/game-06-dreamdirect/TutorialScene');
          config.scene = TutorialScene;
        } else if (gameId === 'game-07-pinkcup') {
          const { PinkCupTutorialScene } = await import('@/games/game-07-pinkcup/TutorialScene');
          config.scene = PinkCupTutorialScene;
        } else if (gameId === 'game-08-mysterysound') {
          const { TutorialScene } = await import('@/games/game-08-mysterysound/TutorialScene');
          config.scene = TutorialScene;
        } else if (gameId === 'game-12-gridhunter') {
          const { TutorialScene } = await import('@/games/game-12-gridhunter/TutorialScene');
          config.scene = TutorialScene;
        }
      } else if (gameId === 'game-07-pinkcup') {
        const { PinkCupGameScene } = await import('@/games/game-07-pinkcup/GameScene');
        config.scene = [PinkCupGameScene];
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
          roundPixels: true
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

      // Listen for Trap Warning Event (for wormtrain game)
      newGame.events.on('trap-warning', (data: { message: string }) => {
        setTrapWarning(data.message);
        // Auto-hide after 2 seconds
        setTimeout(() => setTrapWarning(null), 2000);
      });

      // Listen for Level Intro (Start Pause)
      newGame.events.on('SHOW_INTRO', (data: any) => {
        setIntroData(data);
        setShowIntroPopup(true);
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
        gameInstance.current.events.off('trap-warning');
        gameInstance.current.events.off('SHOW_INTRO');
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, [gameId, level, mode]); // Removed 'stars' to prevent re-init on async fetch

  // Sync Stars to Registry without restarting game
  useEffect(() => {
    if (gameInstance.current) {
      gameInstance.current.registry.set('stars', stars);
    }
  }, [stars]);

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

  // Get game-specific background color to fill any gaps from FIT mode scaling
  const getContainerBackground = () => {
    if (gameId === 'game-05-wormtrain') return '#4a7c4e'; // Match Phaser bg
    return 'transparent';
  };

  return (
    <div
      className="relative w-full h-full"
      style={{ backgroundColor: getContainerBackground() }}
    >



      {/* Phaser Container - Background Layer */}
      <div
        id="game-container"
        ref={gameRef}
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* React UI Overlay - Top Layer */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between items-center p-6">

        {/* Tutorial Mode Indicator - Only show tutorial badge */}
        {mode === 'tutorial' && (
          <div className={`font-bold text-3xl font-sans drop-shadow-sm px-6 py-2 rounded-full backdrop-blur-sm shadow-sm mt-2 ${gameId === 'game-08-mysterysound'
            ? 'text-white bg-white/30 border border-white/50'
            : gameId === 'game-05-wormtrain'
              ? 'text-[#594032] bg-white border border-[#594032]/20' // Solid white background, brown text
              : 'text-[#58CC02] bg-white/50 border border-[#58CC02]/20'
            }`}>
            โหมดฝึกสอน
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
            จำได้แล้ว
          </button>
        )}

        {/* Bottom: Timer Bar - MOVED TO PHASER */}
        {/* Placeholder if needed for spacing, but removing for now */}

        {/* Intro Popup (for new mechanics) */}
        {trapWarning && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-red-600/90 text-white text-3xl font-black px-8 py-4 rounded-2xl shadow-2xl animate-pulse border-4 border-white/50">
              {trapWarning}
            </div>
          </div>
        )}

        {/* Intro / Tutorial Popup */}
        {showIntroPopup && introData && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white pointer-events-auto w-[90%] max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border-8 border-[#58CC02]">
              {/* Header Image Area */}
              <div className="w-full h-48 bg-[#e5e5e5] flex items-center justify-center relative overflow-hidden">
                {introData.imageKey ? (
                  <img
                    src={introData.imageKey.startsWith('http') || introData.imageKey.startsWith('/') ? introData.imageKey : `/games/game-05-wormtrain/${introData.imageKey}.webp`}
                    alt={introData.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-6xl">💡</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                  <h2 className="text-3xl font-black text-white drop-shadow-md">
                    {introData.title}
                  </h2>
                </div>
              </div>

              <div className="p-8 flex flex-col items-center text-center">
                <p className="text-gray-600 text-lg font-bold mb-8 leading-relaxed whitespace-pre-line">
                  {introData.description}
                </p>

                <button
                  onClick={() => {
                    setShowIntroPopup(false);
                    if (gameInstance.current) {
                      gameInstance.current.events.emit('START_LEVEL');
                    }
                  }}
                  className="w-full bg-[#58CC02] hover:bg-[#46A302] border-b-4 border-[#46A302] text-white text-2xl font-bold py-4 rounded-2xl shadow-lg active:border-b-0 active:translate-y-1 transition-all"
                >
                  เริ่มกันเลย!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

GameCanvas.displayName = 'GameCanvas';

export default GameCanvas;
