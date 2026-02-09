import { WordRecognizeGameScene } from './GameScene';

export const WordRecognizeGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#4ecdc4',
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: 800,
        height: 600,
    },
    scene: [WordRecognizeGameScene]
};
