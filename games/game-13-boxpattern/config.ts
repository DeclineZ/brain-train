import { BoxPatternGameScene } from './GameScene';
import { BoxPatternTutorialScene } from './TutorialScene';

export const BoxPatternGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#ecf0f1', // Clean light grey/white background
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: 800,
        height: 600,
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [BoxPatternGameScene, BoxPatternTutorialScene]
};
