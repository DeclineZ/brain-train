import { DoorGuardianGameScene } from './GameScene';
import { DoorGuardianTutorialScene } from './TutorialScene';

export const DoorGuardianGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#FFF8E7', // Warm cream background
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: 800,
        height: 600,
    },
    scene: [DoorGuardianGameScene, DoorGuardianTutorialScene]
};
