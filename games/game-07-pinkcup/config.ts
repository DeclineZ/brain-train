import { PinkCupGameScene } from './GameScene';
import { PinkCupTutorialScene } from './TutorialScene';

export const PinkCupGameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#F0F4F8', // Light blue-gray background
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
  scene: [PinkCupTutorialScene, PinkCupGameScene]
};
