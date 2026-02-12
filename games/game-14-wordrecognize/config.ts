import { WordRecognizeGameScene } from './GameScene';
import { WordRecognizeTutorialScene } from './TutorialScene';

export const WordRecognizeGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#FFD93D',
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: 800,
        height: 600,
    },
    scene: [WordRecognizeGameScene, WordRecognizeTutorialScene]
};
