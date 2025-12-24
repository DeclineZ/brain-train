import { Types } from 'phaser';
import { MatchingGameScene } from './GameScene';

export const MatchingGameConfig: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#FDF6E3',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 600, // Mobile portrait friendly
        height: 800,
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
        },
    },
    scene: [MatchingGameScene],
    render: {
        pixelArt: false,
        antialias: true,
    }
};
