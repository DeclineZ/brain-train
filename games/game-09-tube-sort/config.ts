import { Types } from 'phaser';
import { TubeSortGameScene } from './GameScene';

export const TubeSortGameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#F6F8FB',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: 800,
    height: 600
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scene: [TubeSortGameScene]
};