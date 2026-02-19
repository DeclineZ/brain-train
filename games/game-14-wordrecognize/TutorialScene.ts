import { WordRecognizeGameScene } from './GameScene';

export class WordRecognizeTutorialScene extends WordRecognizeGameScene {
    private tutorialStep = 0;
    private instructionText!: Phaser.GameObjects.Text;
    private pulseTween: Phaser.Tweens.Tween | null = null;
    private readonly TUTORIAL_SCRIPT = [
        { word: 'กิน', isNew: true, correctBtn: 'new', instruction: 'คำนี้เพิ่งขึ้นครั้งแรก\nกดปุ่ม "ใหม่"' },
        { word: 'นอน', isNew: true, correctBtn: 'new', instruction: 'อีกคำใหม่!\nจำไว้ให้ดีนะ กดปุ่ม "ใหม่"' },
        { word: 'กิน', isNew: false, correctBtn: 'seen', instruction: 'คำนี้เคยเห็นแล้ว!\nกดปุ่ม "เคยเห็น"' },
    ];

    constructor() {
        super('WordRecognizeTutorialScene');
    }

    create() {
        super.create();

        // Hide score and hearts for tutorial
        if (this.scoreText) this.scoreText.setVisible(false);
        if (this.heartsContainer) this.heartsContainer.setVisible(false);

        // Create instruction text — positioned above the card
        const { width, height } = this.scale;
        const cardH = 250;
        const cardTopY = height / 2 - cardH / 2; // card container Y
        this.instructionText = this.add.text(width / 2, cardTopY - 20, '', {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4,
            wordWrap: { width: width * 0.85 },
            padding: { top: 12, bottom: 16, left: 10, right: 10 }
        }).setOrigin(0.5, 1).setDepth(200);
    }

    // Override startGame to run scripted tutorial
    protected startGame() {
        this.tutorialStep = 0;
        this.score = 0;
        this.lives = 99; // Don't die in tutorial
        this.gameActive = true;
        this.seenItems.clear();
        this.itemStartTime = 0;

        this.runTutorialStep();
    }

    private async runTutorialStep() {
        if (this.tutorialStep >= this.TUTORIAL_SCRIPT.length) {
            this.finishTutorial();
            return;
        }

        const step = this.TUTORIAL_SCRIPT[this.tutorialStep];
        this.isInputLocked = true;

        // Set up the item display
        this.currentItem = step.word;
        this.isNewItem = step.isNew;
        this.currentItemType = 'text';

        // Show the word on card
        if (this.itemImage) this.itemImage.setVisible(false);
        this.itemText.setVisible(true);
        this.itemText.setText(step.word);

        // Disable timer for tutorial
        this.timeLimit = 999999;
        this.itemStartTime = Date.now();

        // Animate card pop-in
        this.cardContainer.setScale(0.8);
        this.cardContainer.setAlpha(0);
        this.tweens.add({
            targets: this.cardContainer,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.out'
        });

        // Wait a moment then show instruction
        await this.delay(800);

        // Show instruction text
        this.instructionText.setText(step.instruction);
        this.instructionText.setAlpha(0);
        this.tweens.add({
            targets: this.instructionText,
            alpha: 1,
            duration: 300
        });

        // Pulse the correct button, disable the wrong one
        if (step.correctBtn === 'seen') {
            this.startPulse(this.seenButton);
            this.disableButton(this.newHit);
            this.enableButton(this.seenHit);
        } else {
            this.startPulse(this.newButton);
            this.disableButton(this.seenHit);
            this.enableButton(this.newHit);
        }

        // Unlock input
        this.isInputLocked = false;
    }

    private startPulse(btn: Phaser.GameObjects.Container) {
        this.stopPulse();
        this.pulseTween = this.tweens.add({
            targets: btn,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private stopPulse() {
        if (this.pulseTween) {
            this.pulseTween.stop();
            this.pulseTween = null;
        }
        // Reset scale
        if (this.seenButton) this.seenButton.setScale(1);
        if (this.newButton) this.newButton.setScale(1);
    }

    private disableButton(hitArea: Phaser.GameObjects.Rectangle) {
        hitArea.disableInteractive();
        hitArea.setAlpha(0.3);
    }

    private enableButton(hitArea: Phaser.GameObjects.Rectangle) {
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.setAlpha(1);
    }

    // Override handleInput for tutorial flow
    protected handleInput(saidSeen: boolean) {
        if (this.isInputLocked) return;
        this.isInputLocked = true;

        const step = this.TUTORIAL_SCRIPT[this.tutorialStep];
        const isCorrect = (saidSeen && step.correctBtn === 'seen') ||
            (!saidSeen && step.correctBtn === 'new');

        if (isCorrect) {
            this.soundSuccess.play();
            this.stopPulse();

            // Brief success feedback
            this.instructionText.setText('ถูกต้อง! 🎉');

            // Re-enable both buttons
            this.enableButton(this.seenHit);
            this.enableButton(this.newHit);

            this.tutorialStep++;

            this.time.delayedCall(1200, () => {
                this.runTutorialStep();
            });
        } else {
            // Wrong button (shouldn't normally happen since wrong is disabled,
            // but as safeguard)
            this.soundFail.play();
            this.cameras.main.shake(200, 0.01);
            this.isInputLocked = false;
        }
    }

    // Override handleCorrect/handleMistake to prevent normal game logic
    protected handleCorrect() { }
    protected handleMistake() { }

    private finishTutorial() {
        this.stopPulse();
        this.enableButton(this.seenHit);
        this.enableButton(this.newHit);

        // Stop BGM
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.stop();
        }

        this.instructionText.setText('เยี่ยมมาก! พร้อมเล่นจริงแล้ว 🎊');

        this.time.delayedCall(1800, () => {
            const onTutorialComplete = this.registry.get('onTutorialComplete');
            if (onTutorialComplete) {
                onTutorialComplete();
            }
        });
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => {
            this.time.delayedCall(ms, resolve);
        });
    }
}
