import Phaser from 'phaser';
import { RunForYourLifeGameScene } from './GameScene';

export const RunForYourLifeGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#0a0a2e', // Dark space
    pixelArt: true, // 8-bit crisp pixel rendering
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
        },
    },
    scene: [RunForYourLifeGameScene],
};
