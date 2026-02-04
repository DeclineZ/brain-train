import * as Phaser from 'phaser';

export class TutorialScene extends Phaser.Scene {
    // UI Elements
    private messageText!: Phaser.GameObjects.Text;
    private gridContainer!: Phaser.GameObjects.Container;
    private tiles: Phaser.GameObjects.Container[] = [];
    private numbers: number[] = [];
    private highlightTween: Phaser.Tweens.Tween | null = null;

    // State
    private step = 0;
    private isWaitingInput = false;
    private correctTileIndex = -1;
    private trapTileIndex = -1;

    constructor() { super({ key: 'TutorialScene' }); }

    preload() {
        // Reuse assets from main game
        this.load.audio('pop', '/assets/sounds/gridhunter/pop.mp3');
        this.load.audio('wrong', '/assets/sounds/gridhunter/wrong.mp3');
        this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
    }

    create() {
        const { width, height } = this.scale;

        // 1. Background (Same coral theme as GameScene)
        this.createBackground();

        // 2. Grid Container (centered)
        this.gridContainer = this.add.container(width / 2, height / 2);

        // 3. Tutorial Message Text (Top area)
        this.messageText = this.add.text(width / 2, height * 0.15, "ยินดีต้อนรับ!", {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#6D6875',
            align: 'center',
            stroke: '#ffffff',
            strokeThickness: 6,
            wordWrap: { width: width * 0.85 }
        }).setOrigin(0.5).setDepth(20).setPadding(15);

        // 4. Start Tutorial Flow
        this.startTutorial();
    }

    // --- BACKGROUND (Same warm theme as GameScene) ---
    createBackground() {
        const { width, height } = this.scale;

        // Warm coral-to-lavender gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0xFFB5A7, 0xFCD5CE, 0xF8EDEB, 0xE8E8E4, 1);
        bg.fillRect(0, 0, width, height);

        // Add subtle pattern overlay (diagonal stripes)
        const pattern = this.add.graphics();
        pattern.lineStyle(1, 0xffffff, 0.08);
        for (let i = -height; i < width + height; i += 30) {
            pattern.moveTo(i, 0);
            pattern.lineTo(i + height, height);
        }
        pattern.strokePath();

        // Soft glow circles in corners
        const glow1 = this.add.graphics();
        glow1.fillStyle(0xFFB5A7, 0.3);
        glow1.fillCircle(0, 0, 150);

        const glow2 = this.add.graphics();
        glow2.fillStyle(0xB5838D, 0.2);
        glow2.fillCircle(width, height, 180);
    }

    // --- CREATE TUTORIAL GRID ---
    createGrid(numbers: number[], trapIndex: number = -1) {
        // Clear existing tiles
        this.tiles.forEach(t => t.destroy());
        this.tiles = [];
        this.numbers = numbers;

        const gridSize = 3;
        const tileSize = 90;
        const gap = 12;
        const totalSize = gridSize * tileSize + (gridSize - 1) * gap;
        const startOffset = -totalSize / 2 + tileSize / 2;

        for (let i = 0; i < numbers.length; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const x = startOffset + col * (tileSize + gap);
            const y = startOffset + row * (tileSize + gap);

            const tile = this.createTile(x, y, tileSize, numbers[i], i, i === trapIndex);
            this.tiles.push(tile);
            this.gridContainer.add(tile);
        }

        this.trapTileIndex = trapIndex;
    }

    createTile(x: number, y: number, size: number, num: number, index: number, isTrap: boolean): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);

        // Pastel color based on number (warm palette)
        const hue = (num * 7) % 360;
        const baseColor = isTrap ? 0xff6b6b : Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.75).color;

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.1);
        shadow.fillRoundedRect(-size / 2 + 4, -size / 2 + 6, size, size, 16);
        container.add(shadow);

        // Tile background
        const bg = this.add.graphics();
        bg.fillStyle(baseColor, 1);
        bg.fillRoundedRect(-size / 2, -size / 2, size, size, 16);
        bg.lineStyle(4, 0xffffff, 0.5);
        bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 16);
        container.add(bg);

        // Number text
        const fontSize = Math.max(24, size * 0.45);
        const text = this.add.text(0, 0, num.toString(), {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: `${fontSize}px`,
            fontStyle: 'bold',
            color: isTrap ? '#ffffff' : '#2d3436'
        }).setOrigin(0.5);
        container.add(text);

        // Interactive
        const hitArea = this.add.rectangle(0, 0, size, size, 0xffffff, 0).setInteractive({ useHandCursor: true });
        container.add(hitArea);

        hitArea.on('pointerdown', () => this.handleTileTap(index));

        // Trap glow animation
        if (isTrap) {
            this.tweens.add({
                targets: container,
                scale: 1.05,
                duration: 400,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        return container;
    }

    highlightTile(index: number) {
        if (this.highlightTween) {
            this.highlightTween.stop();
            this.tiles.forEach(t => t.setScale(1));
        }

        const tile = this.tiles[index];
        if (tile) {
            this.highlightTween = this.tweens.add({
                targets: tile,
                scale: 1.15,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    stopHighlight() {
        if (this.highlightTween) {
            this.highlightTween.stop();
            this.tiles.forEach(t => t.setScale(1));
            this.highlightTween = null;
        }
    }

    // --- TUTORIAL FLOW ---

    startTutorial() {
        this.time.delayedCall(1000, () => {
            this.messageText.setText("ใน Grid Hunter\nต้องหาเลขที่น้อยที่สุด!");
            this.time.delayedCall(3500, () => {
                this.startStep1();
            });
        });
    }

    startStep1() {
        // Step 1: Basic tap the smallest number
        this.step = 1;
        this.messageText.setText("หาเลขที่น้อยที่สุดแล้วแตะ!");

        // Create grid with clear smallest number
        this.createGrid([15, 3, 28, 42, 7, 19, 31, 9, 25]);
        this.correctTileIndex = 1; // Number 3 is smallest

        // Highlight the correct tile
        this.highlightTile(this.correctTileIndex);
        this.isWaitingInput = true;
    }

    startStep2() {
        // Step 2: Show that number gets replaced
        this.step = 2;
        this.messageText.setText("เยี่ยม! เลขจะถูกแทนที่ด้วยเลขใหม่");

        // Show the replacement effect
        const tile = this.tiles[this.correctTileIndex];
        if (tile) {
            // Pop effect
            this.tweens.add({
                targets: tile,
                scale: 0,
                duration: 200,
                ease: 'Back.in',
                onComplete: () => {
                    // Create new tile with higher number
                    const { x, y } = tile;
                    tile.destroy();
                    const newTile = this.createTile(x, y, 90, 57, this.correctTileIndex, false);
                    this.tiles[this.correctTileIndex] = newTile;
                    this.gridContainer.add(newTile);
                    newTile.setScale(0);

                    this.tweens.add({
                        targets: newTile,
                        scale: 1,
                        duration: 300,
                        ease: 'Back.out',
                        onComplete: () => {
                            this.numbers[this.correctTileIndex] = 57;
                            this.time.delayedCall(2000, () => {
                                this.startStep3();
                            });
                        }
                    });
                }
            });
        }
    }

    startStep3() {
        // Step 3: Practice again
        this.step = 3;
        this.messageText.setText("ลองอีกครั้ง! หาเลขน้อยที่สุด");

        // Now smallest is 7 (index 4)
        this.correctTileIndex = 4;
        this.highlightTile(this.correctTileIndex);
        this.isWaitingInput = true;
    }

    startStep4() {
        // Step 4: Introduce trap/red numbers
        this.step = 4;
        this.messageText.setText("ระวัง! อย่าแตะเลขสีแดง");

        // Clear and create new grid with trap
        this.tiles.forEach(t => t.destroy());
        this.tiles = [];

        this.time.delayedCall(1000, () => {
            // Grid with trap at index 0 (appears lowest but is red)
            this.createGrid([2, 18, 35, 12, 5, 29, 41, 8, 23], 0);
            this.correctTileIndex = 4; // Number 5 is lowest non-trap

            // Highlight the safe choice
            this.time.delayedCall(1500, () => {
                this.messageText.setText("เลข 2 สีแดง! แตะ 5 แทน");
                this.highlightTile(this.correctTileIndex);
                this.isWaitingInput = true;
            });
        });
    }

    startStep5() {
        // Step 5: Completion
        this.step = 5;
        this.stopHighlight();
        this.messageText.setText("เก่งมาก! พร้อมเล่นแล้ว! 🎉");

        // Hide grid with fade
        this.tweens.add({
            targets: this.gridContainer,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.time.delayedCall(2500, () => {
                    this.endTutorial();
                });
            }
        });
    }

    // --- INPUT HANDLING ---

    handleTileTap(index: number) {
        if (!this.isWaitingInput) return;

        // Check if tapped the trap
        if (index === this.trapTileIndex) {
            this.sound.play('wrong');
            this.cameras.main.shake(200, 0.01);
            this.messageText.setText("โอ๊ย! เลขแดงอันตราย!\nแตะเลข 5 แทนนะ");
            return;
        }

        // Check if correct
        if (index === this.correctTileIndex) {
            this.sound.play('pop');
            this.isWaitingInput = false;
            this.stopHighlight();

            // Tile pop effect
            const tile = this.tiles[index];
            this.tweens.add({
                targets: tile,
                scale: 1.3,
                duration: 100,
                yoyo: true,
                ease: 'Back.out'
            });

            // Progress to next step
            if (this.step === 1) {
                this.time.delayedCall(800, () => this.startStep2());
            } else if (this.step === 3) {
                this.messageText.setText("ถูกต้อง!");
                this.time.delayedCall(1500, () => this.startStep4());
            } else if (this.step === 4) {
                this.time.delayedCall(1000, () => this.startStep5());
            }
        } else {
            // Wrong tile
            this.sound.play('wrong');
            this.cameras.main.shake(100, 0.005);
            this.messageText.setText("ลองใหม่! หาเลขน้อยที่สุด");
        }
    }

    endTutorial() {
        this.sound.play('level-pass');
        const onTutorialComplete = this.registry.get('onTutorialComplete');
        if (onTutorialComplete) {
            onTutorialComplete();
        }
    }
}
