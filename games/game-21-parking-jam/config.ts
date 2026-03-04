import * as Phaser from 'phaser';
import { ParkingJamGameScene } from './GameScene';

export const ParkingJamGameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#f3f8fb',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 900,
    height: 600,
  },
  scene: [ParkingJamGameScene],
};
