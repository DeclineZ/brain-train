import { BoxCountingGameScene } from './GameScene';

export const BoxCountingGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#FFFFFF',
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: 800,
        height: 600,
    },
    scene: [BoxCountingGameScene]
};
