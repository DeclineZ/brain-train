// Re-export constants first (before importing GameScene to avoid circular dep)
export { PolybridgeGameConstants } from './constants';

import { Types } from 'phaser';
import { PolybridgeGameScene } from './GameScene';

export const PolybridgeGameConfig: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#87CEEB', // Sky blue
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [PolybridgeGameScene],
};
