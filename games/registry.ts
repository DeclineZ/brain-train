import { MemoryGameConfig } from './game-00-example/config';
import { MatchingGameConfig } from './game-01-cardmatch/config';

export const GameRegistry: Record<string, any> = {
  'game-00-example': MemoryGameConfig,
  'game-01-cardmatch': MatchingGameConfig,
};