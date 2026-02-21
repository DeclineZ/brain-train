import * as Phaser from 'phaser';
import { FloatingMarketScene } from './GameScene';
import type { MarketItem } from './types';

export class FloatingMarketTutorialScene extends FloatingMarketScene {
    private tutorialPhase = 0;
    private obstacleSpawned = false;
    private mangoSpawned = false;
    private instructionOverlay!: Phaser.GameObjects.Container;
    private instructionText!: Phaser.GameObjects.Text;
    private instructionPanel!: Phaser.GameObjects.Graphics;

    // Override starting behavior to run scripted tutorial
    constructor() {
        super();
        // Change key so phaser knows it's a different scene, or use a specific key in config.
        // But since we extend FloatingMarketScene, we should give it a unique key in constructor if we want, OR just override key in config.
        // Actually, Phaser Scene constructor takes a config object.
        Phaser.Scene.call(this, { key: 'FloatingMarketTutorialScene' });
    }

    create() {
        // Initialize instruction overlay BEFORE super.create() invokes showTapToStart -> startGame
        this.createInstructionOverlay();

        super.create();

        // Hide game UI for tutorial
        if (this.ruleBannerBg) this.ruleBannerBg.setVisible(false);
        if (this.ruleBanner) this.ruleBanner.setVisible(false);
        if (this.progressBar) this.progressBar.setVisible(false);
        if (this.coinCountText) this.coinCountText.setVisible(false);
        if (this.sackIcon) this.sackIcon.setVisible(false);
        if (this.sackCountText) this.sackCountText.setVisible(false);
    }

    private createInstructionOverlay() {
        const { width, height } = this.scale;

        this.instructionOverlay = this.add.container(0, 0);
        this.instructionOverlay.setDepth(400);

        const panelWidth = Math.min(width * 0.9, 450);
        const panelHeight = 140;
        const panelX = width / 2 - panelWidth / 2;
        const panelY = height / 2 - panelHeight / 2; // Exact center avoids overlapping React pill

        this.instructionPanel = this.add.graphics();
        this.instructionPanel.fillStyle(0x000000, 0.85);
        this.instructionPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);
        this.instructionPanel.lineStyle(3, 0xFFD700, 1);
        this.instructionPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);

        this.instructionText = this.add.text(width / 2, panelY + panelHeight / 2, '', {
            fontFamily: "'Noto Sans Thai', sans-serif",
            fontSize: '24px',
            color: '#FFFFFF',
            align: 'center',
            wordWrap: { width: panelWidth - 40 },
            lineSpacing: 8,
            padding: { top: 12, bottom: 20, left: 10, right: 10 }
        }).setOrigin(0.5).setDepth(401);

        this.instructionOverlay.add([this.instructionPanel, this.instructionText]);
        this.instructionOverlay.setVisible(false);
    }

    private showInstruction(text: string) {
        this.instructionText.setText(text);
        this.instructionOverlay.setVisible(true);
        this.instructionOverlay.setAlpha(0);
        this.tweens.add({
            targets: this.instructionOverlay,
            alpha: 1,
            duration: 300
        });
    }

    private hideInstruction() {
        this.tweens.add({
            targets: this.instructionOverlay,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                this.instructionOverlay.setVisible(false);
            }
        });
    }

    // Override to skip the standard intro popup since the tutorial explains everything
    protected showTapToStart(width: number, height: number) {
        // Just start the tutorial script immediately
        this.startGame();
    }

    // Override startGame to start tutorial script
    public startGame() {
        this.gameStarted = true;
        this.gameStartTime = Date.now();
        const { width, height } = this.scale;

        this.setupInput(width, height);

        this.physics.add.overlap(this.boat, this.obstacleGroup, this.handleObstacleCollision, undefined, this);
        this.physics.add.overlap(this.boat, this.coinGroup, this.handleCoinCollect, undefined, this);
        this.physics.add.overlap(this.boat, this.itemGroup, this.handleItemCollect, undefined, this);

        // Custom tutorial state
        this.tutorialPhase = 1;
        this.totalItemsSpawned = 999; // Prevent normal spawns

        this.startPhase1();
    }

    update(time: number, delta: number) {
        if (!this.gameStarted || this.gameOver) return;
        const dt = delta / 1000;

        // Custom update logic for tutorial: allow moving, scroll background, but no random object spawner
        this.moveBoat(dt);
        this.scrollY += this.scrollSpeed * dt;
        this.moveScrollables(dt);
        this.updateWaterEffects(dt);

        // Evaluate tutorial phases
        this.evaluateTutorialState();
    }

    private evaluateTutorialState() {
        // Phase 1: Wait until they tilt left & right a bit
        if (this.tutorialPhase === 1) {
            // Check if boat moved significantly from center
            const center = this.scale.width / 2;
            if (this.boat.x < center - 60 || this.boat.x > center + 60) {
                this.tutorialPhase = 1.5;
                this.hideInstruction();
                this.time.delayedCall(1000, () => this.startPhase2());
            }
        }

        // Phase 2: Dodging. Wait until obstacle passes
        if (this.tutorialPhase === 2 && this.obstacleSpawned) {
            // Check if obstacle passed boat
            if (this.obstacles.length > 0) {
                const obs = this.obstacles[0];
                if (obs.sprite.y > this.boat.y + 100) {
                    this.tutorialPhase = 2.5;
                    this.hideInstruction();
                    this.time.delayedCall(1000, () => this.startPhase3());
                }
            } else if (this.obstacles.length === 0 && this.obstacleGroup.countActive(true) === 0) {
                // In case it was somehow destroyed early
                this.tutorialPhase = 2.5;
                this.hideInstruction();
                this.time.delayedCall(1000, () => this.startPhase3());
            }
        }

        // Phase 3: Collecting. Wait until item is collected
        if (this.tutorialPhase === 3 && this.mangoSpawned) {
            if (this.floatingItems.length === 0 && this.correctCollections > 0) {
                this.tutorialPhase = 4;
                this.hideInstruction();
                this.finishTutorial();
            } else if (this.floatingItems.length === 0 && this.correctCollections === 0) {
                // User missed the mango! Respawn it.
                this.tutorialPhase = 3.5; // temporary state to prevent multiple respawns
                this.showInstruction('อ้าว! เลยไปแล้ว\nลองเก็บมะม่วงใหม่นะ 🥭');
                this.time.delayedCall(2000, () => this.startPhase3(true));
            }
        }
    }

    private startPhase1() {
        let isSecureContext = false;
        if (typeof window !== 'undefined') {
            isSecureContext = window.isSecureContext;
        }

        const msg = (this.useTilt && isSecureContext)
            ? 'ยินดีต้อนรับสู่ตลาดน้ำ!\nเอียงโทรศัพท์ซ้าย-ขวา\nเพื่อบังคับเรือดูสิ 🚤'
            : 'ยินดีต้อนรับสู่ตลาดน้ำ!\nกดซ้าย-ขวาที่หน้าจอ\nเพื่อบังคับเรือดูสิ 🚤';

        this.showInstruction(msg);
    }

    private startPhase2() {
        this.tutorialPhase = 2;
        this.obstacleSpawned = false;
        this.showInstruction('ระวังสิ่งกีดขวาง! 🪵\nบังคับเรือหลบอย่าให้ชนนะ!');

        // Spawn an obstacle directly ahead
        this.time.delayedCall(1500, () => {
            this.obstacleSpawned = true;
            // Override obstacle spawn to put one in middle
            const yPos = -100;
            const xPos = this.scale.width / 2;

            // Create log container
            const container = this.add.container(xPos, yPos);
            container.setDepth(20);
            const sprite = this.add.sprite(0, 0, 'obs_rock');
            sprite.setDisplaySize(70, 70);
            container.add(sprite);
            container.setSize(70, 70);

            this.physics.add.existing(container);
            const body = container.body as Phaser.Physics.Arcade.Body;
            body.setSize(56, 56);
            body.setImmovable(true);

            this.obstacleGroup.add(container);
            this.obstacles.push({
                sprite: container,
                body: body,
                width: 70,
                height: 70,
                type: 'rock'
            });
        });
    }

    private startPhase3(isRetry: boolean = false) {
        this.tutorialPhase = 3;
        this.mangoSpawned = false;
        // Turn on banner for picking up to show them where instruction usually is
        if (this.ruleBannerBg) this.ruleBannerBg.setVisible(true);
        if (this.ruleBanner) {
            this.ruleBanner.setVisible(true);
            this.ruleBanner.setText('เก็บ มะม่วง');
        }

        if (!isRetry) {
            this.showInstruction('เยี่ยมมาก! 👏\nคราวนี้ลองบังคับเรือไปเก็บ\n"มะม่วง" ดูสิ 🥭');
        }

        // Spawn a mango to collect
        this.time.delayedCall(1500, () => {
            this.mangoSpawned = true;
            const yPos = -100;
            const xPos = this.scale.width / 2 + 80;

            const container = this.add.container(xPos, yPos);
            container.setDepth(20);

            const shadow = this.add.graphics();
            shadow.fillStyle(0x000000, 0.3);
            shadow.fillEllipse(5, 50, 40, 20);

            const sprite = this.add.sprite(0, 0, 'item_mango');
            sprite.setDisplaySize(80, 80);

            const floatTween = this.tweens.add({
                targets: sprite,
                y: -10,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            container.add([shadow, sprite]);
            container.setSize(80, 80);

            this.physics.add.existing(container);
            const body = container.body as Phaser.Physics.Arcade.Body;
            body.setSize(64, 64);
            body.setImmovable(true);

            // Add floating item logic
            this.itemGroup.add(container);

            // Dummy item mango
            const mangoItem: MarketItem = { id: 'mango', nameThai: 'มะม่วง', category: 'fruit', color: 0xFFCC02, shape: 'oval' };

            this.floatingItems.push({
                sprite: container,
                body: body,
                item: mangoItem,
                collected: false
            });
            this.activeRule = {
                instructionThai: 'เก็บ มะม่วง',
                filterByItemId: true,
                collectFilter: ['mango']
            } as any;
        });
    }

    private finishTutorial() {
        this.showInstruction('คุณเก่งมาก! 🎉\nพร้อมลุยตลาดน้ำของจริงแล้วล่ะ');

        // Allow user to leave
        this.time.delayedCall(2500, () => {
            const onTutorialComplete = this.registry.get('onTutorialComplete');
            if (onTutorialComplete) {
                onTutorialComplete();
            }
        });
    }

    // Override collision safely:
    public handleObstacleCollision(boatObj: any, obstacleObj: any) {
        // Just shake camera but don't deduct anything or cause game over.
        if (this.collisionCooldown > 0) return;
        this.collisionCooldown = 1.0;

        try { this.sound.play('collision'); } catch (e) { }
        this.cameras.main.shake(200, 0.02);

        // Flash boat red
        this.tweens.add({
            targets: this.boat,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 5,
            onComplete: () => { this.boat.setAlpha(1); }
        });
    }

    // Since FloatingMarketScene uses protected for handleItemCollect, we override it to handle tutorial constraints?
    // Wait, by making activeRule target mango explicitly, FloatingMarketScene's handleItemCollect will work correctly.
    // It will increment this.correctCollections if they get mango.

    public endGame(success: boolean) {
        // override so we don't accidentally send results before tutorial complete
    }

}
