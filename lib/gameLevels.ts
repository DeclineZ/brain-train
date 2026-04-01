const GAME_LEVEL_COUNTS = {
  'game-00-example': 12,
  'game-01-cardmatch': 45,
  'game-04-floating-ball-math': 50,
  'game-03-billiards-math': 35,
  'game-05-wormtrain': 15,
  'game-06-dreamdirect': 40,
  'game-07-pinkcup': 30,
  'game-08-mysterysound': 20,
  'game-09-tube-sort': 30,
  'game-10-miner': 30,
  'game-11-pipe-patch': 30,
  'game-15-taxidriver': 35,
  'game-16-doorguardian': 15,
  'game-17-floatingmarket': 35,
  'game-19-cashier': 30,
  'game-20-boxcounting': 30,
  'game-21-parking-jam': 24,
} as const;

const ENDLESS_GAME_IDS = new Set([
  'game-02-sensorlock',
  'game-12-gridhunter',
  'game-13-boxpattern',
  'game-14-wordrecognize',
  'game-18-runforyourlife',
]);

export function isEndlessGame(gameId: string): boolean {
  return ENDLESS_GAME_IDS.has(gameId);
}

export function getGameMaxLevel(gameId: string): number {
  return GAME_LEVEL_COUNTS[gameId as keyof typeof GAME_LEVEL_COUNTS] ?? 12;
}

export function clampGameLevel(gameId: string, level: number): number {
  if (isEndlessGame(gameId)) {
    return Math.max(0, level);
  }
  const maxLevel = getGameMaxLevel(gameId);
  return Math.max(0, Math.min(level, maxLevel));
}

export function getAllFixedGameLevelCounts() {
  return GAME_LEVEL_COUNTS;
}
