import { BilliardsGameScene } from './GameScene';
import { TutorialScene } from './TutorialScene';

export const BilliardsGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#F5F5DC', // Light cream/beige pool table felt color
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
    scene: [BilliardsGameScene, TutorialScene]
};
