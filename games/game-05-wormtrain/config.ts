export const WormGameConstants = {
  // Movement
  DEFAULT_SPEED: 80,
  JAM_SHAKE_INTENSITY: 2,

  // Visuals
  WORM_HEAD_RADIUS: 12,
  WORM_BODY_RADIUS: 10,
  PATH_WIDTH_NORMAL: 24,
  PATH_WIDTH_NARROW: 14,

  // Colors (Hex strings)
  COLORS: {
    RED: 0xff4444,
    BLUE: 0x4444ff,
    GREEN: 0x44ff44,
    YELLOW: 0xffff44,
    PURPLE: 0xaa44ff,
  },

  // Scoring
  SCORE_WEIGHTS: {
    PLANNING: 0.45,
    EFFICIENCY: 0.30,
    ACCURACY: 0.25,
  },

  // Star Ratings
  STARS: {
    THREE: 81,
    TWO: 60,
  },

  // Z-Indices
  DEPTH: {
    GROUND: 0,
    PATH: 10,
    TRAP: 20,
    HOLE: 20,
    ITEM: 30,
    WORM: 40,
    JUNCTION_UI: 50,
    UI: 100,
  }
};

import { Types } from 'phaser';
import GameScene from './GameScene';

export const WormGameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#4a7c4e', // Organic green background (Lumosity-style)
  scale: {
    mode: Phaser.Scale.ENVELOP, // Fill entire screen, may crop edges
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
  scene: [GameScene],
};
