import { Types } from 'phaser';
import { MemoryGameScene } from './GameScene'; // Make sure this matches your file name

export const MemoryGameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#FDF6E3', // Matches your beige theme
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [MemoryGameScene], // <--- Loads the scene we wrote
};