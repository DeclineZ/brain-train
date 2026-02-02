import { Types } from 'phaser';
import { TubeSortGameScene } from './GameScene';
import { TubeSortTutorialScene } from './TutorialScene';

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
  scene: [TubeSortTutorialScene, TubeSortGameScene]
};