import { MysterySoundScene } from './GameScene';

export const MysterySoundGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#667eea', // Vibrant purple-blue
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: 800,
        height: 600,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
        },
    },
    scene: [MysterySoundScene],
};
