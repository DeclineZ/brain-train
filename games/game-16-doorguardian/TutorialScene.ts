import * as Phaser from 'phaser';
import { DoorGuardianGameScene } from './GameScene';
import { CHARACTERS, type CharacterId } from './levels';

export class DoorGuardianTutorialScene extends DoorGuardianGameScene {
    private tutorialStep: 'INTRO' | 'ALLOW_PRACTICE' | 'REJECT_PRACTICE' | 'FINAL_TEST' | 'COMPLETE' = 'INTRO';
    private instructionText!: Phaser.GameObjects.Text;
    private overlay!: Phaser.GameObjects.Rectangle;
    private currentTween: Phaser.Tweens.Tween | null = null;

    constructor() {
        super('DoorGuardianTutorialScene'); // Key is set in super or we can override init
    }

    init(data: { level: number }) {
        // Force tutorial config
        this.levelConfig = {
            level: 0,
            name: 'Tutorial',
            description: 'Tutorial Level', // Added missing property
            totalVisitors: 3,
            allowedCharacters: ['man', 'woman'],
            characterPool: ['man', 'woman'], // Only humans for simplicity
            abnormalChance: 0, // Manual control
            timePerVisitor: 0, // No timer
        };
        this.timePerVisitor = 0;

        // Reset state
        this.score = 0;
        this.lives = 1;
        this.maxLives = 1;
        this.currentVisitorIndex = 0;
        this.visitors = [];
        this.isPlaying = false;
        this.isInputLocked = true;
        this.isAnimating = false;
        this.timerActive = false;
        this.charImageKeys = new Set();

        this.tutorialStep = 'INTRO';
    }

    create() {
        // Add Tutorial UI layer
        const { width, height } = this.scale;

        // Instruction Text (High depth)
        this.instructionText = this.add.text(width / 2, height * 0.25, '', {
            fontFamily: '"Mali", "Sarabun", sans-serif',
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
            wordWrap: { width: width * 0.9 }
        }).setOrigin(0.5).setDepth(1000).setPadding({ top: 20, bottom: 20, left: 20, right: 20 });

        // Hand cursor removed per user request

        super.create();

        // Override startRound to NOT start immediately, but start Flow
        // (super.create calls startRound, so we intercept it there or overwrite the method)
        // Since we extended, super.create() already called startRound().
        // But startRound() sets isPlaying=true and showsVisitor.
        // We will intercept by clearing visitors first in generateVisitors? 
        // Or simply overriding startRound.
    }

    // Override generateVisitors to set up our specific scenario
    protected generateVisitors() {
        this.visitors = [
            // 1. Man Normal (Allow Practice)
            { character: CHARACTERS['man'], isAbnormal: false, isAllowed: true, dialogue: 'สวัสดีครับ ขอเข้าไปหน่อย' },
            // 2. Man Abnormal (Reject Practice)
            { character: CHARACTERS['man'], isAbnormal: true, isAllowed: false, dialogue: 'ขอ...เข้า...หน่อย...' },
            // 3. Woman Normal (Final Test)
            { character: CHARACTERS['woman'], isAbnormal: false, isAllowed: true, dialogue: 'ฉันเองค่ะ เปิดให้หน่อย' }
        ];
    }

    protected startRound() {
        // Start Tutorial Flow instead of normal game
        this.isPlaying = true; // Enable input generally
        this.currentVisitorIndex = 0;

        // Hide standard UI initially if needed, or highlight specific parts
        this.startIntroStep();
    }

    private startIntroStep() {
        this.tutorialStep = 'INTRO';

        // 1. Point to Reference Card
        const cardX = this.cardPanelContainer.x;
        const cardY = this.cardPanelContainer.y;

        this.setInstruction('ดูใบรายชื่อตรงนี้\nเพื่อเช็คว่าใครเข้าได้บ้าง');
        this.pulseObject(this.cardPanelContainer);

        // Add a one-time click listener to the card panel to progress
        // We can attach to the last child which is the hitArea
        const children = this.cardPanelContainer.list;
        const hitArea = children[children.length - 1] as Phaser.GameObjects.Rectangle;

        if (hitArea) {
            const originalCallback = hitArea.listeners('pointerdown')[0]; // Keep original logic (slide)

            hitArea.once('pointerdown', () => {
                this.time.delayedCall(500, () => {
                    this.setInstruction('ลองกดดู... เห็นไหมว่ามันเปลี่ยนได้?');
                    this.time.delayedCall(2000, () => {
                        this.setInstruction('และคอยสังเกต "สิ่งผิดปกติ" ให้ดีนะ!');
                        this.time.delayedCall(2500, () => {
                            this.stopPulse();
                            this.startAllowPractice();
                        });
                    });
                });
            });
        }
    }

    private startAllowPractice() {
        this.tutorialStep = 'ALLOW_PRACTICE';
        // HandCursor removed

        // Show first visitor (Man Normal)
        this.currentVisitorIndex = 0;
        this.showNextVisitor(); // This calls revealVisitor

        this.time.delayedCall(1500, () => {
            this.setInstruction('คนนี้อยู่ในรายการ\nและดูปกติ... ให้กดปุ่ม "ให้เข้า"');
            this.pulseObject(this.acceptBtn);

            // Pulse Green Button
            this.tweens.add({
                targets: this.acceptBtn,
                scale: 1.1,
                duration: 300,
                yoyo: true,
                repeat: -1
            });
        });
    }

    private startRejectPractice() {
        this.tutorialStep = 'REJECT_PRACTICE';
        this.currentVisitorIndex = 1;
        this.showNextVisitor(); // Man Abnormal

        this.time.delayedCall(1500, () => {
            this.setInstruction('คนนี้ดูแปลกๆ! (หรือไม่อยู่ในรายการ)\nห้ามเข้า! กดปุ่ม "ปฏิเสธ"');
            this.pulseObject(this.rejectBtn);

            // Stop Green Pulse
            this.tweens.killTweensOf(this.acceptBtn);
            this.acceptBtn.setScale(1);

            // Pulse Red Button
            this.tweens.add({
                targets: this.rejectBtn,
                scale: 1.1,
                duration: 300,
                yoyo: true,
                repeat: -1
            });
        });
    }

    private startFinalTest() {
        this.tutorialStep = 'FINAL_TEST';
        this.currentVisitorIndex = 2;
        this.showNextVisitor(); // Woman Normal

        this.time.delayedCall(1500, () => {
            this.setInstruction('คนสุดท้าย Try เองนะ!\n(ถ้ากดผิดจะแค่เตือน ไม่ Game Over)');
            this.stopPulse();

            // Stop Red Pulse
            this.tweens.killTweensOf(this.rejectBtn);
            this.rejectBtn.setScale(1);
        });
    }

    // Override handleDecision to enforce tutorial logic
    protected handleDecision(allowIn: boolean) {
        if (!this.isPlaying || this.isInputLocked) return;

        if (this.tutorialStep === 'ALLOW_PRACTICE') {
            if (allowIn) {
                // Correct
                super.handleDecision(allowIn);
                this.time.delayedCall(1000, () => this.startRejectPractice());
            } else {
                // Wrong - Shake head or ignore
                this.cameras.main.shake(200, 0.01);
            }
            return;
        }

        if (this.tutorialStep === 'REJECT_PRACTICE') {
            if (!allowIn) {
                // Correct
                super.handleDecision(allowIn);
                this.time.delayedCall(1000, () => this.startFinalTest());
            } else {
                // Wrong
                this.cameras.main.shake(200, 0.01);
            }
            return;
        }

        if (this.tutorialStep === 'FINAL_TEST') {
            // Check correctness manually
            const visitor = this.visitors[this.currentVisitorIndex];
            const isCorrect = allowIn === visitor.isAllowed;

            if (isCorrect) {
                super.handleDecision(allowIn); // Will trigger handleCorrect -> score etc.
                this.time.delayedCall(1000, () => this.finishTutorial());
            } else {
                // Wrong - DO NOT CALL SUPER (saves life)
                // Just shake and warn
                this.cameras.main.shake(200, 0.02);
                this.setInstruction('ผิดครับ! ลองสังเกตใหม่นะ');
                this.sound.play('match-fail');
            }
            return;
        }
    }

    // Override showNextVisitor to prevent auto-progression in super logic if needed?
    // super.showNextVisitor checks currentVisitorIndex vs visitors.length.
    // We manage index manually in steps.

    private finishTutorial() {
        this.tutorialStep = 'COMPLETE';
        this.setInstruction('ยินดีด้วย! คุณพร้อมแล้ว 🎉');
        this.stopPulse();

        this.time.delayedCall(2000, () => {
            const onTutorialComplete = this.game.registry.get('onTutorialComplete');
            if (onTutorialComplete) onTutorialComplete();
        });
    }

    private setInstruction(text: string) {
        this.instructionText.setText(text);
        // Pop effect
        this.tweens.add({
            targets: this.instructionText,
            scale: { from: 0.5, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 300,
            ease: 'Back.out'
        });
    }

    private pulseObject(target: any) {
        this.stopPulse();
        this.currentTween = this.tweens.add({
            targets: target,
            scale: { from: 1, to: 1.1 },
            alpha: { from: 1, to: 0.8 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private stopPulse() {
        if (this.currentTween) {
            this.currentTween.remove();
            this.currentTween = null;
        }
        // Reset scales just in case
        this.cardPanelContainer.setScale(1);
        this.acceptBtn.setScale(1);
        this.rejectBtn.setScale(1);
        this.cardPanelContainer.setAlpha(1);
        this.acceptBtn.setAlpha(1);
        this.rejectBtn.setAlpha(1);
    }
}
