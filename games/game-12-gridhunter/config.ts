import { GridHunterGameScene } from './GameScene';
import { TutorialScene } from './TutorialScene';

export const GridHunterGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#FFB5A7', // Warm coral - matches new theme
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: 800,
        height: 600,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [TutorialScene, GridHunterGameScene]
};
