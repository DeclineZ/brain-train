export const GameRegistryLoaders: Record<string, () => Promise<Phaser.Types.Core.GameConfig>> = {
  'game-00-example': async () => (await import('./game-00-example/config')).MemoryGameConfig,
  'game-01-cardmatch': async () => (await import('./game-01-cardmatch/config')).MatchingGameConfig,
  'game-02-sensorlock': async () => (await import('./game-02-sensorlock/config')).SensorLockGameConfig,
  'game-03-billiards-math': async () => (await import('./game-03-billiards-math/config')).BilliardsGameConfig,
  'game-04-floating-ball-math': async () => (await import('./game-04-floating-ball-math/config')).FloatingBallMathConfig,
  'game-05-wormtrain': async () => (await import('./game-05-wormtrain/config')).WormGameConfig,
  'game-06-dreamdirect': async () => (await import('./game-06-dreamdirect/config')).DreamDirectGameConfig,
  'game-07-pinkcup': async () => (await import('./game-07-pinkcup/config')).PinkCupGameConfig,
  'game-08-mysterysound': async () => (await import('./game-08-mysterysound/config')).MysterySoundGameConfig,
  'game-09-tube-sort': async () => (await import('./game-09-tube-sort/config')).TubeSortGameConfig,
  'game-10-miner': async () => (await import('./game-10-miner/config')).MinerGameConfig,
  'game-11-pipe-patch': async () => (await import('./game-11-pipe-patch/config')).PipePatchGameConfig,
  'game-12-gridhunter': async () => (await import('./game-12-gridhunter/config')).GridHunterGameConfig,
  'game-13-boxpattern': async () => (await import('./game-13-boxpattern/config')).BoxPatternGameConfig,
  'game-14-wordrecognize': async () => (await import('./game-14-wordrecognize/config')).WordRecognizeGameConfig,
  'game-15-taxidriver': async () => (await import('./game-15-taxidriver/config')).TaxiDriverGameConfig,
  'game-16-doorguardian': async () => (await import('./game-16-doorguardian/config')).DoorGuardianGameConfig,
  'game-17-floatingmarket': async () => (await import('./game-17-floatingmarket/config')).FloatingMarketGameConfig,
  'game-18-runforyourlife': async () => (await import('./game-18-runforyourlife/config')).RunForYourLifeGameConfig,
  'game-19-cashier': async () => (await import('./game-19-cashier/config')).CashierGameConfig,
  'game-20-boxcounting': async () => (await import('./game-20-boxcounting/config')).BoxCountingGameConfig,
  'game-21-parking-jam': async () => (await import('./game-21-parking-jam/config')).ParkingJamGameConfig,
};

export async function getGameConfig(gameId: string): Promise<Phaser.Types.Core.GameConfig | null> {
  const loader = GameRegistryLoaders[gameId];
  if (!loader) return null;
  return await loader();
}
