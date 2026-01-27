import { BilliardsGameScene } from './GameScene';
import { TutorialScene } from './TutorialScene';

export const BilliardsGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#F5F5DC', // Light cream/beige pool table felt color
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%',
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

