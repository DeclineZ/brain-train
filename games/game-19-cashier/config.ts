import { CashierGameScene } from './GameScene';
import { CashierTutorialScene } from './TutorialScene';

export const CashierGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#8b9bb4', // Match GameScene supermarket wall
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
    scene: [CashierGameScene, CashierTutorialScene]
};
