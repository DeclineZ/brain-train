
import { BoxPatternGameScene } from './GameScene';
import * as Phaser from 'phaser';

export class BoxPatternTutorialScene extends BoxPatternGameScene {
    private tutorialRound = 0;
    private maxTutorialRounds = 3;
    private instructionText!: Phaser.GameObjects.Text;
    private handIcon!: Phaser.GameObjects.Text;
    private targetOrbIndex = -1;

    constructor() {
        super('BoxPatternTutorialScene');
    }

    create() {
        // IMPORTANT: Create handIcon BEFORE super.create() because startGame() is called there
        // and it calls startTutorialRound() which uses handIcon
        this.handIcon = this.add.text(0, 0, '👆', {
            fontSize: '48px'
        }).setOrigin(0.5).setVisible(false).setDepth(300);

        // Now call parent create (which will call startGame -> startTutorialRound)
        super.create();

        this.tutorialRound = 0;

        // Ensure we are in Phase 1 setup (2x2)
        this.phase = 1;
        this.gridSize = 2;

        // Override initial score/hearts UI visibility
        if (this.scoreText) this.scoreText.setVisible(false);
        if (this.heartsContainer) this.heartsContainer.setVisible(false);

        // Add Instruction Text
        const { width, height } = this.scale;
        this.instructionText = this.add.text(width / 2, height * 0.15, '', {
            fontFamily: '"Sarabun", sans-serif',
            fontSize: '28px',
            color: '#2d3436',
            align: 'center',
            wordWrap: { width: width * 0.9 },
            padding: { top: 15, bottom: 15, left: 10, right: 10 }
        }).setOrigin(0.5);
        this.instructionText.setDepth(200);
    }

    // Override startGame to start custom tutorial flow
    startGame() {
        this.tutorialRound = 0;
        this.gameActive = true;
        this.lives = 3;

        this.gridContainer.removeAll(true);
        this.orbs = [];
        this.generateGrid(2); // Force 2x2

        this.startTutorialRound();
    }

    async startTutorialRound() {
        this.isInputLocked = true;
        this.targetOrbIndex = -1;
        this.hideHandIcon();

        // Wait for instructionText to be created (it's created after super.create)
        await this.delay(100);

        // Show intro message
        if (this.instructionText) {
            this.instructionText.setText("ดูลำดับลูกแก้วให้ดีๆ");
        }
        await this.delay(1800);

        // Generate sequence for this round
        // Each round adds 1 new orb to the existing sequence
        // Round 1: [A], Round 2: [A, B], Round 3: [A, B, C]
        if (this.tutorialRound === 0) {
            // First round - start fresh
            this.sequence = [];
        }
        // Add one new random orb to the sequence
        this.sequence.push(Phaser.Math.Between(0, 3));

        // Play the sequence
        await this.playSequence();

        // Show instruction to tap
        if (this.instructionText) {
            if (this.sequence.length === 1) {
                this.instructionText.setText("ลองกดที่ลูกแก้วที่เพิ่งกระพริบ");
            } else {
                this.instructionText.setText("กดลูกแก้วตามลำดับที่เห็น");
            }
        }

        // Show hand pointing to the FIRST orb in sequence
        this.showHandIcon(this.sequence[0]);

        // Unlock input for player
        this.isInputLocked = false;
    }

    private showHandIcon(orbIndex: number) {
        const orb = this.orbs[orbIndex];
        if (!orb || !this.handIcon) return;

        // Kill any existing tweens
        this.tweens.killTweensOf(this.handIcon);

        // Get world position of the orb
        const worldX = this.gridContainer.x + (orb.x * this.gridContainer.scaleX);
        const worldY = this.gridContainer.y + (orb.y * this.gridContainer.scaleY) + 60;

        this.handIcon.setPosition(worldX, worldY);
        this.handIcon.setVisible(true);
    }

    private hideHandIcon() {
        if (!this.handIcon) return;
        this.tweens.killTweensOf(this.handIcon);
        this.handIcon.setVisible(false);
    }

    // Override handleInput to move hand icon to next orb on correct tap
    protected async handleInput(index: number) {
        // Visual feedback for tap
        this.highlightOrb(index);

        // Check Logic
        const expected = this.sequence[this.playerIndex];

        if (index === expected) {
            // Correct
            this.playerIndex++;
            if (this.playerIndex >= this.sequence.length) {
                // Round Complete
                this.handleRoundPass();
            } else {
                // Move hand icon to next orb in sequence
                this.showHandIcon(this.sequence[this.playerIndex]);
            }
        } else {
            // Incorrect
            this.handleMistake();
        }
    }

    // Override handleMistake to not Game Over, just retry
    protected handleMistake() {
        this.soundFail.play();
        if (this.instructionText) {
            this.instructionText.setText("ผิดครับ ลองใหม่อีกครั้งนะ");
        }
        this.cameras.main.shake(200, 0.01);

        this.isInputLocked = true;
        this.time.delayedCall(1500, async () => {
            if (this.instructionText) {
                this.instructionText.setText("ดูใหม่อีกรอบนะครับ");
            }
            await this.delay(800);
            await this.playSequence();
            if (this.instructionText) {
                if (this.sequence.length === 1) {
                    this.instructionText.setText("ลองกดที่ลูกแก้วที่เพิ่งกระพริบ");
                } else {
                    this.instructionText.setText("กดลูกแก้วตามลำดับที่เห็น");
                }
            }
            this.showHandIcon(this.sequence[0]);
            this.isInputLocked = false;
        });
    }

    // Override handleRoundPass to advance tutorial
    protected handleRoundPass() {
        this.isInputLocked = true;
        this.hideHandIcon();
        this.soundSuccess.play();
        this.tutorialRound++;

        if (this.tutorialRound >= this.maxTutorialRounds) {
            // Tutorial Complete
            this.finishTutorial();
        } else {
            if (this.instructionText) {
                this.instructionText.setText("เก่งมาก! ต่อไป...");
            }
            this.time.delayedCall(1200, () => {
                this.startTutorialRound();
            });
        }
    }

    finishTutorial() {
        // Stop background music before transitioning
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.stop();
        }

        if (this.instructionText) {
            this.instructionText.setText("ยอดเยี่ยม! พร้อมสำหรับของจริงแล้ว");
        }
        this.time.delayedCall(1500, () => {
            // Emit Tutorial Complete Event
            const onTutorialComplete = this.registry.get('onTutorialComplete');
            if (onTutorialComplete) {
                onTutorialComplete();
            } else {
                // Fallback if no registry event (e.g. testing)
                this.scene.start('BoxPatternGameScene');
            }
        });
    }

    handleResize(gameSize: Phaser.Structs.Size) {
        super.handleResize(gameSize);
        if (this.instructionText) {
            this.instructionText.setPosition(gameSize.width / 2, 120);
            this.instructionText.setWordWrapWidth(gameSize.width * 0.9);
        }

        // Update hand icon position if visible
        if (this.handIcon && this.handIcon.visible && this.targetOrbIndex >= 0) {
            this.showHandIcon(this.targetOrbIndex);
        }
    }
}
