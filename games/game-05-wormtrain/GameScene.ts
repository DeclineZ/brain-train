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
    // Preload Small Worm Holes (User provided)
    this.load.image('hole_blue_s', '/games/game-05-wormtrain/sBluehole.webp');
    this.load.image('hole_green_s', '/games/game-05-wormtrain/sGreenhole.webp');
    this.load.image('hole_orange_s', '/games/game-05-wormtrain/sOrangehole.webp');
    this.load.image('hole_pink_s', '/games/game-05-wormtrain/sPinkhole.webp');
    this.load.image('hole_purple_s', '/games/game-05-wormtrain/sPurplehole.webp');
    this.load.image('hole_yellow_s', '/games/game-05-wormtrain/sYellowhole.webp');

    // Traps
    this.load.image('spider_trap', '/games/game-05-wormtrain/SpiderTrap.webp');

    // Preload Worm Heads (Base white, to be tinted)
    this.load.image('worm_head_s', '/games/game-05-wormtrain/worm_head_s.png');
    this.load.image('worm_head_m', '/games/game-05-wormtrain/worm_head_m.png');

    // Audio Assets
    this.load.audio('bg-music', '/games/game-05-wormtrain/bg-music.mp3');
    this.load.audio('rotate', '/games/game-05-wormtrain/rotate.mp3');
    this.load.audio('match-success', '/games/game-05-wormtrain/match-success.mp3');
    this.load.audio('match-fail', '/games/game-05-wormtrain/match-fail.mp3');
    this.load.audio('level-pass', '/games/game-05-wormtrain/level-pass.mp3');
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

    // Audio System
    this.sound.stopAll(); // Ensure clean slate
    const bgMusic = this.sound.add('bg-music', { loop: true, volume: 0.2 }); // Lowered BGM
    bgMusic.play();

    // Sound Event Listeners
    this.events.on('JUNCTION_SWITCHED', (data: any) => {
      if (data.source === 'USER') { // Only user interaction makes sound
        this.sound.play('rotate', { volume: 0.5 });
      }
    });

    this.events.on('WORM_RESOLVED', (data: any) => {
      const { x, y, success } = data;

      // Sound
      if (success) {
        this.sound.play('match-success', { volume: 0.7 });
      } else {
        this.sound.play('match-fail', { volume: 1.5 });
      }

      // Float Text
      const textStr = success ? 'GOOD' : 'MISS';
      const textColor = success ? '#44ff44' : '#ff4444';

      const label = this.add.text(x, y - 60, textStr, { // Start higher
        fontSize: '32px',
        color: textColor,
        stroke: '#000000',
        strokeThickness: 4,
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(200); // Ensure on top

      this.tweens.add({
        targets: label,
        y: y - 150, // Floating higher
        alpha: 0,
        duration: 1000,
        onComplete: () => label.destroy()
      });
    });

    this.events.on('GAME_WIN', () => {
      bgMusic.stop();
      this.sound.play('level-pass', { volume: 0.8 });
    });

    // Cleanup
    this.events.on('shutdown', () => {
      this.sound.stopAll();
    });

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
