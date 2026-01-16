import * as Phaser from 'phaser';
import { MEMORY_LEVELS } from './levels';
import type { MemoryLevelConfig } from '@/types';

export class MemoryGameScene extends Phaser.Scene {
  private currentLevelConfig: MemoryLevelConfig = MEMORY_LEVELS[1];

  // Game State
  private cards: Phaser.GameObjects.Sprite[] = [];
  private openedCards: Phaser.GameObjects.Sprite[] = [];
  private matchedPairs = 0;
  private totalPairs = 0;
  private wrongFlips = 0;
  private consecutiveErrors = 0;
  private currentStreak = 0;
  private repeatedErrors = 0;
  private startTime = 0;
  private isLocked = false;
  private seenCards = new Set<number>();

  constructor() { super({ key: 'MemoryGameScene' }); }

  init(data: { level: number }) {
    const level = data.level || 1;
    this.currentLevelConfig = MEMORY_LEVELS[level] || MEMORY_LEVELS[1];
    this.totalPairs = this.currentLevelConfig.totalPairs;
  }

  preload() {
    this.load.image('card-back', 'https://labs.phaser.io/assets/sprites/card-back.png');
    this.load.spritesheet('card-faces', 'https://labs.phaser.io/assets/sprites/fruitnveg64wh37.png', { frameWidth: 64, frameHeight: 32 });
  }

  create() {
    this.startTime = Date.now();
    this.setupGrid();
    this.add.text(16, 16, `Level ${this.currentLevelConfig.level}`, { fontSize: '24px', color: '#000' });
  }

  setupGrid() {
    const { gridCols, totalPairs } = this.currentLevelConfig;
    const indices = [];
    for (let i = 0; i < totalPairs; i++) indices.push(i, i);
    Phaser.Utils.Array.Shuffle(indices);

    const cardWidth = 64;
    const gap = 10;
    const totalWidth = (gridCols * cardWidth) + ((gridCols - 1) * gap);
    const startX = (this.scale.width - totalWidth) / 2 + 32;

    indices.forEach((val, index) => {
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      const x = startX + (col * (cardWidth + gap));
      const y = 200 + (row * (cardWidth + gap));

      const card = this.add.sprite(x, y, 'card-back').setInteractive();
      card.setData('id', val);
      card.setData('index', index);
      card.setData('isFlipped', false);
      card.on('pointerdown', () => this.handleCardClick(card));
      this.cards.push(card);
    });
  }

  handleCardClick(card: Phaser.GameObjects.Sprite) {
    if (this.isLocked || card.getData('isFlipped')) return;

    card.setTexture('card-faces', card.getData('id'));
    card.setData('isFlipped', true);
    this.openedCards.push(card);

    if (this.openedCards.length === 2) {
      this.isLocked = true;
      this.time.delayedCall(800, () => this.checkForMatch());
    }
  }

  checkForMatch() {
    const [card1, card2] = this.openedCards;
    const match = card1.getData('id') === card2.getData('id');

    if (match) {
      this.matchedPairs++;
      this.currentStreak = 0;
      card1.setAlpha(0.5); card2.setAlpha(0.5);
      if (this.matchedPairs === this.totalPairs) this.endGame();
    } else {
      this.wrongFlips++;
      this.currentStreak++;
      this.consecutiveErrors = Math.max(this.consecutiveErrors, this.currentStreak);
      if (this.seenCards.has(card1.getData('index')) || this.seenCards.has(card2.getData('index'))) this.repeatedErrors++;

      card1.setTexture('card-back'); card1.setData('isFlipped', false);
      card2.setTexture('card-back'); card2.setData('isFlipped', false);
    }
    this.seenCards.add(card1.getData('index'));
    this.seenCards.add(card2.getData('index'));
    this.openedCards = [];
    this.isLocked = false;
  }

  endGame() {
    const endTime = Date.now();
    const onGameOver = this.registry.get('onGameOver');
    if (onGameOver) {
      onGameOver({
        levelPlayed: this.currentLevelConfig.level,
        difficultyMultiplier: this.currentLevelConfig.difficultyMultiplier,
        totalPairs: this.totalPairs,
        wrongFlips: this.wrongFlips,
        consecutiveErrors: this.consecutiveErrors,
        repeatedErrors: this.repeatedErrors,
        userTimeMs: endTime - this.startTime,
        parTimeMs: this.currentLevelConfig.timeLimitSeconds * 1000,
      });
    }
  }
}

//update