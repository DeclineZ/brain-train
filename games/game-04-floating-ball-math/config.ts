import { FloatingBallMathGameScene } from './GameScene';
import { TutorialScene } from './TutorialScene';

export const FloatingBallMathConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#E3F2FD', // Light blue water gradient base
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: 800,
        height: 600,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: true
    },
    input: {
        activePointers: 10, // Support multi-touch for mobile
        keyboard: true,
        mouse: true,
        touch: true,
        smoothFactor: 0  // No smoothing for instant touch response
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [FloatingBallMathGameScene, TutorialScene],
    // Enable proper touch handling for mobile
    callbacks: {
        preBoot: (game) => {
            // Ensure touch events work properly on mobile
            game.input.addPointer(1);
            game.input.addPointer(2);
        }
    }
};
