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
// Note: ResultPopup is handled by React layer (page.tsx), not Phaser


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

  // State
  public gameOver: boolean = false;
  public currentLevel: number = 1;

  constructor() {
    super({ key: 'WormTrainGame' });
  }

  preload() {
    // Load game assets (WebP for faster loading)
    this.load.image('hole', '/games/game-05-wormtrain/hole.webp');
    this.load.image('spawn', '/games/game-05-wormtrain/spawn.webp');
    // Color-specific holes
    this.load.image('hole_orange', '/games/game-05-wormtrain/Orangehole.webp');
    this.load.image('hole_blue', '/games/game-05-wormtrain/Bluehole.webp');
    this.load.image('hole_green', '/games/game-05-wormtrain/Greenhole.webp');
    this.load.image('hole_yellow', '/games/game-05-wormtrain/Yellowhole.webp');
    this.load.image('hole_pink', '/games/game-05-wormtrain/Pinkhole.webp');
    this.load.image('hole_purple', '/games/game-05-wormtrain/Purplehole.webp');
  }

  create() {
    // Get level from registry (set by GameCanvas)
    this.currentLevel = this.game.registry.get('level') || 1;
    console.log('Worm Train Game Started - Level', this.currentLevel);

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

    // Load Level from registry
    const levelData = this.levelLoader.loadLevel(this.currentLevel);

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

    // Apply responsive camera zoom to fit content on any screen
    this.setupResponsiveCamera(levelData);

    // Listen for resize events
    this.scale.on('resize', () => {
      this.setupResponsiveCamera(levelData);
    });
  }

  private setupResponsiveCamera(levelData: any) {
    // Calculate bounding box of all nodes
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    levelData.nodes.forEach((node: any) => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    });

    // Add padding for sprites
    const padding = 100;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Calculate content size
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Get screen size
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;

    // Calculate zoom to fit content
    const zoomX = screenWidth / contentWidth;
    const zoomY = screenHeight / contentHeight;
    const zoom = Math.min(zoomX, zoomY) * 0.9; // 0.9 for some margin

    // Center camera on content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(centerX, centerY);
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
