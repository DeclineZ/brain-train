import { MemoryGameConfig as ExampleGameConfig } from './game-00-example/config';
import { MatchingGameConfig } from './game-01-cardmatch/config';
import { SensorLockGameConfig } from './game-02-sensorlock/config';

export const GameRegistry: Record<string, Phaser.Types.Core.GameConfig> = {
  'game-00-example': ExampleGameConfig,
  'game-01-cardmatch': MatchingGameConfig,
  'game-02-sensorlock': SensorLockGameConfig
};