import Phaser from 'phaser';
import { LevelLoader } from './systems/LevelLoader';
import { GraphSystem } from './systems/GraphSystem';
import { SwitchSystem } from './systems/SwitchSystem';
import { TrapSystem } from './systems/TrapSystem';
import { WinLoseSystem } from './systems/WinLoseSystem';
import { ScoringSystem } from './systems/ScoringSystem';
import { WormSystem } from './systems/WormSystem';

import { WormVisual } from './visuals/WormVisual';
import { JunctionVisual } from './visuals/JunctionVisual';
import { GraphVisual } from './visuals/GraphVisual';
import { TrapVisual } from './visuals/TrapVisual';
import { ResultPopup } from './visuals/ResultPopup';


export default class GameScene extends Phaser.Scene {
  // Systems
  public levelLoader!: LevelLoader;
  public graphSystem!: GraphSystem;
  public switchSystem!: SwitchSystem;
  public trapSystem!: TrapSystem;
  public winLoseSystem!: WinLoseSystem;
  public scoringSystem!: ScoringSystem;
  public wormSystem!: WormSystem;

  // Visuals
  public graphVisual!: GraphVisual;
  public junctionVisual!: JunctionVisual;
  public wormVisual!: WormVisual;
  public trapVisual!: TrapVisual;
  public resultPopup!: ResultPopup;

  // State
  public gameOver: boolean = false;

  constructor() {
    super({ key: 'WormTrainGame' });
  }

  preload() {
    // Load game assets
    this.load.image('hole', '/games/game-05-wormtrain/hole.png');
    this.load.image('spawn', '/games/game-05-wormtrain/spawn.png');
    // Color-specific holes
    this.load.image('hole_orange', '/games/game-05-wormtrain/orangehole.png');
    this.load.image('hole_blue', '/games/game-05-wormtrain/bluehole.png');
  }

  create() {
    console.log('Worm Train Game Started');

    // Initialize Systems - Order Matters
    this.levelLoader = new LevelLoader();
    this.graphSystem = new GraphSystem(this);
    this.switchSystem = new SwitchSystem(this);
    this.trapSystem = new TrapSystem(this);
    this.winLoseSystem = new WinLoseSystem(this);
    this.scoringSystem = new ScoringSystem(this);
    this.wormSystem = new WormSystem(this);

    // Initialize Visuals
    this.graphVisual = new GraphVisual(this);
    this.junctionVisual = new JunctionVisual(this);
    this.wormVisual = new WormVisual(this, this.wormSystem);
    this.trapVisual = new TrapVisual(this);
    this.resultPopup = new ResultPopup(this);

    // Load Level 1
    const levelData = this.levelLoader.loadLevel(1);

    // Init Systems with Data
    this.graphSystem.init(levelData);
    this.switchSystem.init(levelData);
    this.trapSystem.init(levelData);
    this.winLoseSystem.init(levelData);
    this.scoringSystem.init();
    this.wormSystem.init(levelData);

    // Init Visuals
    this.graphVisual.init(levelData);
    this.junctionVisual.init(levelData);
    this.trapVisual.init(levelData);
  }

  update(time: number, delta: number) {
    if (this.gameOver) return; // Simple stop

    // Logical Systems
    this.wormSystem.update(time, delta);
    this.trapSystem.update(time, delta);

    // Visuals
    this.wormVisual.update(time, delta);
  }
}
