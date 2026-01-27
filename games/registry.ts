import { MemoryGameConfig as ExampleGameConfig } from './game-00-example/config';
import { MatchingGameConfig } from './game-01-cardmatch/config';
import { SensorLockGameConfig } from './game-02-sensorlock/config';
import { BilliardsGameConfig } from './game-03-billiards-math/config';
import { WormGameConfig } from './game-05-wormtrain/config';
import { FloatingBallMathConfig } from './game-04-floating-ball-math/config';
import { DreamDirectGameConfig } from './game-06-dreamdirect/config';
import { PolybridgeGameConfig } from './game-07-polybridge/config';
import { MysterySoundGameConfig } from './game-08-mysterysound/config';
import { PinkCupGameConfig } from './game-07-pinkcup/config';

export const GameRegistry: Record<string, Phaser.Types.Core.GameConfig> = {
  'game-00-example': ExampleGameConfig,
  'game-01-cardmatch': MatchingGameConfig,
  'game-02-sensorlock': SensorLockGameConfig,
  'game-03-billiards-math': BilliardsGameConfig,
  'game-05-wormtrain': WormGameConfig,
  'game-04-floating-ball-math': FloatingBallMathConfig,
  'game-06-dreamdirect': DreamDirectGameConfig,
  'game-07-polybridge': PolybridgeGameConfig,
  'game-08-mysterysound': MysterySoundGameConfig,
  'game-07-pinkcup': PinkCupGameConfig
};
