import Phaser from 'phaser';

/**
 * Tutorial Scene for Game-19 Cashier
 *
 * Teaches the player all 3 phases of the cashier game:
 *   Phase 1: Tally items on the conveyor belt
 *   Phase 2: Adjust payment (coupons / additions)
 *   Phase 3: Give correct change from the cash drawer
 *
 * All text is in Thai with padding to prevent สระ clipping.
 * Designed for elderly users — large text, patient pacing, forgiving retries.
 */

// ─── Tutorial Items (simple items with round prices) ───
const TUTORIAL_ITEMS = [
    { id: 'apple', name: 'แอปเปิล', key: 'item-apple', price: 10 },
    { id: 'bread', name: 'ขนมปัง', key: 'item-bread', price: 15 },
];

// ─── Colors ───
const COLORS = {
    COUNTER: 0xf5e6d3,
    COUNTER_EDGE: 0xdccbb5,
    MONITOR_TEXT: '#053305',
    NUMPAD_BASE: 0x475569,
    NUMPAD_STROKE: 0x334155,
    DISPLAY_BG: 0x223322,
    BTN_WHITE: 0xf8fafc,
    BTN_CLEAR: 0xef4444,
    BTN_ENTER: 0x22c55e,
    DRAWER_BASE: 0x444444,
    DRAWER_INNER: 0x1a1a1a,
    BILL_100_TINT: 0xff6666,
    BILL_50_TINT: 0x6666ff,
    BILL_20_TINT: 0x66ff66,
    INSTRUCTION_BG: 0x1a1a2e,
    INSTRUCTION_TEXT: '#ffffff',
    ARROW_COLOR: 0x58CC02,
};

// Thai-safe text style helper — always includes padding
function thaiStyle(overrides: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
    return {
        fontFamily: '"Sarabun", "Mali", sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
        padding: { x: 8, y: 8 },
        wordWrap: { width: 700 },
        lineSpacing: 8,
        ...overrides,
    };
}

export class CashierTutorialScene extends Phaser.Scene {
    // ─── State ───
    private tutorialStep: number = 0;
    private isWaitingInput: boolean = false;

    // ─── Layout refs ───
    private bgImage!: Phaser.GameObjects.Image;
    private beltSprite!: Phaser.GameObjects.TileSprite;
    private posMonitorText!: Phaser.GameObjects.Text;
    private inputDisplay!: Phaser.GameObjects.Text;
    private displayedInput: string = '';

    // ─── Groups ───
    private numpadGroup!: Phaser.GameObjects.Group;
    private cashDrawerGroup!: Phaser.GameObjects.Group;
    private beltItemsGroup!: Phaser.GameObjects.Group;
    private monitorContentGroup!: Phaser.GameObjects.Group;

    // ─── Instruction overlay ───
    private instructionBg!: Phaser.GameObjects.Rectangle;
    private instructionText!: Phaser.GameObjects.Text;
    private instructionContainer!: Phaser.GameObjects.Container;

    // ─── Arrow indicator ───
    private arrowContainer: Phaser.GameObjects.Container | null = null;
    private arrowTween: Phaser.Tweens.Tween | null = null;

    // ─── Next button ───
    private nextBtnContainer: Phaser.GameObjects.Container | null = null;

    // ─── Phase 1 tracking ───
    private phase1Total: number = 0;
    private itemsTapped: number = 0;

    // ─── Phase 2 tracking ───
    private phase2Target: number = 0;

    // ─── Phase 3 tracking ───
    private changeTarget: number = 0;
    private changeGiven: number = 0;

    // ─── Belt animation ───
    private isBeltMoving: boolean = false;

    constructor() {
        super({ key: 'CashierTutorialScene' });
    }

    // ════════════════════════════════════════════════════════════
    //  PRELOAD — reuse all assets from the main game
    // ════════════════════════════════════════════════════════════

    preload() {
        this.load.setPath('/assets/game-19-cashier/');
        this.load.image('item-apple', 'item-apple.png');
        this.load.image('item-bread', 'item-bread.png');
        this.load.image('item-milk', 'item-milk.png');
        this.load.image('item-cheese', 'item-cheese.png');
        this.load.image('item-meat', 'item-meat.png');
        this.load.image('item-carrot', 'item-carrot.png');
        this.load.image('coin-1', 'coin-1.png');
        this.load.image('coin-2', 'coin-2.png');
        this.load.image('coin-5', 'coin-5.png');
        this.load.image('coin-10', 'coin-10.png');
        this.load.image('bill-20', 'bill-20.png');
        this.load.image('bill-50', 'bill-50.png');
        this.load.image('bill-100', 'bill-100.png');
        this.load.image('bg-conveyor-belt', 'bg-conveyor-belt.png');
        this.load.image('ui-pos-monitor', 'ui-pos-monitor.png');
        this.load.image('ui-customer-hand', 'ui-customer-hand.png');
        this.load.image('game-bg', 'game-bg.png');
        this.load.image('person-silhouette', 'person.png');

        // Sounds
        this.load.setPath('');
        this.load.audio('sfx-beep', '/assets/sounds/cashier/beep.mp3');
        this.load.audio('sfx-register', '/assets/sounds/cashier/register.mp3');
        this.load.audio('sfx-pop', '/assets/sounds/gridhunter/pop.mp3');
        this.load.audio('sfx-pass', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('sfx-error', '/assets/sounds/global/error.mp3');
    }

    // ════════════════════════════════════════════════════════════
    //  CREATE
    // ════════════════════════════════════════════════════════════

    create() {
        // Background
        this.bgImage = this.add.image(400, 600, 'game-bg').setDepth(-3);
        this.bgImage.setTint(0xcccccc);
        if (this.bgImage.postFX) this.bgImage.postFX.addBlur(2, 2, 1);

        // Groups
        this.beltItemsGroup = this.add.group();
        this.numpadGroup = this.add.group();
        this.cashDrawerGroup = this.add.group();
        this.monitorContentGroup = this.add.group();

        // Environment (same as GameScene)
        this.createEnvironment();
        this.createNumpad(280, 910);
        this.createCashDrawer(400, 910);

        // Hide both initially
        this.numpadGroup.setVisible(false);
        this.cashDrawerGroup.setVisible(false);

        // Instruction overlay (top area, below the React badge)
        this.createInstructionOverlay();

        // Resize handling
        this.scale.on('resize', this.resizeCallback, this);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.resizeCallback, this);
        });

        this.resizeCallback(this.scale.gameSize);

        // Start tutorial
        this.startWelcome();
    }

    update(_time: number, _delta: number) {
        if (this.isBeltMoving && this.beltSprite) {
            this.beltSprite.tilePositionX -= 1.5;
        }
    }

    // ════════════════════════════════════════════════════════════
    //  ENVIRONMENT — mirrors GameScene layout
    // ════════════════════════════════════════════════════════════

    private createEnvironment() {
        const registerY = 1600;
        this.add.rectangle(400, registerY, 4000, 2000, COLORS.COUNTER).setDepth(-1);
        this.add.rectangle(400, registerY - 940, 4000, 20, COLORS.COUNTER_EDGE).setDepth(-1);

        // POS Monitor
        const monitorY = 220;
        const monitor = this.add.image(400, monitorY + 10, 'ui-pos-monitor').setDepth(-1);
        monitor.setDisplaySize(790, 440);

        this.posMonitorText = this.add.text(400 - 200, monitorY - 140, '', {
            fontSize: '28px', color: COLORS.MONITOR_TEXT, fontFamily: 'monospace',
            padding: { x: 5, y: 5 }, lineSpacing: 5, wordWrap: { width: 400 }
        }).setOrigin(0, 0).setDepth(1);

        // Conveyor belt
        const beltY = 560;
        this.beltSprite = this.add.tileSprite(400, beltY, 4000, 260, 'bg-conveyor-belt').setDepth(0);
        this.add.rectangle(400, beltY - 130, 4000, 15, 0x111111).setDepth(0);
        this.add.rectangle(400, beltY + 130, 4000, 15, 0x111111).setDepth(0);
    }

    // ════════════════════════════════════════════════════════════
    //  INSTRUCTION OVERLAY
    // ════════════════════════════════════════════════════════════

    private createInstructionOverlay() {
        this.instructionContainer = this.add.container(400, 80).setDepth(300);
        this.instructionContainer.setAlpha(0);

        this.instructionBg = this.add.rectangle(0, 0, 760, 110, COLORS.INSTRUCTION_BG, 0.92);
        this.instructionBg.setStrokeStyle(3, 0x58CC02, 0.8);

        // Round corners via postFX if available; otherwise just looks like a clean bar
        this.instructionText = this.add.text(0, 0, '', thaiStyle({
            fontSize: '30px',
            wordWrap: { width: 700 },
        })).setOrigin(0.5);

        this.instructionContainer.add([this.instructionBg, this.instructionText]);
    }

    private showInstruction(text: string, large: boolean = false) {
        this.instructionText.setText(text);
        const fontSize = large ? '34px' : '30px';
        this.instructionText.setStyle(thaiStyle({
            fontSize, wordWrap: { width: 700 },
        }));

        // Auto size the background
        const bounds = this.instructionText.getBounds();
        const padX = 40;
        const padY = 30;
        this.instructionBg.setSize(
            Math.min(780, bounds.width + padX),
            Math.max(80, bounds.height + padY)
        );

        this.instructionContainer.setAlpha(0);
        this.tweens.add({
            targets: this.instructionContainer,
            alpha: 1,
            duration: 400,
            ease: 'Power2',
        });
    }

    private hideInstruction() {
        this.tweens.add({
            targets: this.instructionContainer,
            alpha: 0,
            duration: 300,
        });
    }

    // ════════════════════════════════════════════════════════════
    //  NUMPAD — same as GameScene
    // ════════════════════════════════════════════════════════════

    private createNumpad(sx: number, sy: number) {
        const baseShadow = this.add.rectangle(sx + 5, sy + 50, 340, 460, 0x000000, 0.3);
        const numpadBase = this.add.rectangle(sx, sy + 45, 340, 460, COLORS.NUMPAD_BASE).setStrokeStyle(4, COLORS.NUMPAD_STROKE);
        this.numpadGroup.add(baseShadow);
        this.numpadGroup.add(numpadBase);

        const displayBg = this.add.rectangle(sx, sy - 120, 300, 70, COLORS.DISPLAY_BG).setStrokeStyle(3, 0x000);
        this.inputDisplay = this.add.text(sx + 130, sy - 120, '0', {
            fontSize: '48px', color: '#00ff00', fontFamily: 'monospace',
            padding: { x: 10, y: 10 }
        }).setOrigin(1, 0.5);
        this.numpadGroup.add(displayBg);
        this.numpadGroup.add(this.inputDisplay);

        const buttons = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'CLEAR', '0', 'ENTER'];
        let index = 0;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 3; col++) {
                const label = buttons[index];
                const bx = sx - 100 + (col * 100);
                const by = sy - 30 + (row * 80);

                let btnColor = COLORS.BTN_WHITE;
                let btnTxtColor = '#1e293b';
                if (label === 'CLEAR') { btnColor = COLORS.BTN_CLEAR; btnTxtColor = '#ffffff'; }
                if (label === 'ENTER') { btnColor = COLORS.BTN_ENTER; btnTxtColor = '#ffffff'; }

                const btnShadow = this.add.rectangle(bx + 3, by + 4, 85, 65, 0x000000, 0.3);
                const btnBg = this.add.rectangle(bx, by, 85, 65, btnColor).setInteractive({ useHandCursor: true });
                btnBg.setStrokeStyle(2, 0x1e293b);

                let textLabel = label;
                if (label === 'CLEAR') textLabel = 'C';
                if (label === 'ENTER') textLabel = 'OK';

                const btnText = this.add.text(bx, by, textLabel, {
                    fontSize: '40px', color: btnTxtColor, fontStyle: 'bold',
                    padding: { x: 5, y: 5 }
                }).setOrigin(0.5);

                this.numpadGroup.add(btnShadow);
                this.numpadGroup.add(btnBg);
                this.numpadGroup.add(btnText);

                btnBg.on('pointerdown', () => {
                    if (!this.isWaitingInput) return;
                    this.sound.play('sfx-beep', { volume: 0.8 });
                    this.handleNumpadInput(label);
                    btnBg.y += 2; btnText.y += 2; btnShadow.y -= 2;
                    this.time.delayedCall(100, () => { btnBg.y -= 2; btnText.y -= 2; btnShadow.y += 2; });
                });
                index++;
            }
        }
    }

    // ════════════════════════════════════════════════════════════
    //  CASH DRAWER — same as GameScene (simple denominations)
    // ════════════════════════════════════════════════════════════

    private createCashDrawer(sx: number, sy: number) {
        const drawerBase = this.add.rectangle(sx, sy, 700, 480, COLORS.DRAWER_BASE).setStrokeStyle(6, 0x222222);
        this.cashDrawerGroup.add(drawerBase);

        const innerDrawer = this.add.rectangle(sx, sy, 680, 460, COLORS.DRAWER_INNER);
        this.cashDrawerGroup.add(innerDrawer);

        const denominations = [
            { val: 100, key: 'bill-100', type: 'bill' },
            { val: 50, key: 'bill-50', type: 'bill' },
            { val: 20, key: 'bill-20', type: 'bill' },
            { val: 10, key: 'coin-10', type: 'coin' },
            { val: 5, key: 'coin-5', type: 'coin' },
            { val: 2, key: 'coin-2', type: 'coin' },
            { val: 1, key: 'coin-1', type: 'coin' },
        ];

        // Bills (top row — only show 20 for simplicity)
        for (let i = 0; i < 4; i++) {
            const bx = sx - 240 + (i * 160);
            const by = sy - 110;
            const slot = this.add.rectangle(bx, by, 140, 200, 0x000000).setStrokeStyle(2, 0x333333);
            this.cashDrawerGroup.add(slot);
            this.addTutorialCurrency(bx, by, denominations[i]);
        }

        // Coins (bottom row)
        for (let i = 4; i < 7; i++) {
            const bx = sx - 160 + ((i - 4) * 160);
            const by = sy + 110;
            const bowl = this.add.ellipse(bx, by, 120, 120, 0x000000).setStrokeStyle(2, 0x333333);
            this.cashDrawerGroup.add(bowl);
            this.addTutorialCurrency(bx, by, denominations[i]);
        }

        // Submit Button
        const submitBg = this.add.rectangle(sx, sy + 210, 300, 50, 0x00cc00).setInteractive({ useHandCursor: true });
        const submitText = this.add.text(sx, sy + 210, 'ส่งมอบเงินทอน', {
            fontSize: '28px', color: '#fff', fontStyle: 'bold',
            padding: { x: 5, y: 5 }
        }).setOrigin(0.5);
        this.cashDrawerGroup.add(submitBg);
        this.cashDrawerGroup.add(submitText);

        submitBg.on('pointerdown', () => {
            if (!this.isWaitingInput) return;
            this.sound.play('sfx-beep', { volume: 0.8 });
            submitBg.setAlpha(0.7);
            this.time.delayedCall(100, () => submitBg.setAlpha(1));
            this.checkChangeSubmit();
        });
    }

    private addTutorialCurrency(bx: number, by: number, denom: any) {
        let visualTint = 0xffffff;
        if (denom.type === 'bill') {
            if (denom.val === 100) visualTint = COLORS.BILL_100_TINT;
            if (denom.val === 50) visualTint = COLORS.BILL_50_TINT;
            if (denom.val === 20) visualTint = COLORS.BILL_20_TINT;
        }

        let sizeMult = 1;
        if (denom.type === 'coin') {
            if (denom.val === 1) sizeMult = 1.0;
            if (denom.val === 2) sizeMult = 1.15;
            if (denom.val === 5) sizeMult = 1.35;
            if (denom.val === 10) sizeMult = 1.5;
        }

        // Draw stack
        for (let j = 0; j < 3; j++) {
            const offset = denom.type === 'bill' ? j * -3 : j * -2;
            const obj = this.add.image(bx + offset, by + offset, denom.key);
            obj.setScale(sizeMult);
            obj.setTint(visualTint);
            this.cashDrawerGroup.add(obj);
        }

        // Value label
        const fontColor = denom.type === 'bill' ? '#ffffff' : '#000000';
        const fontSize = denom.type === 'bill' ? '32px' : '28px';
        const strokeColor = denom.type === 'bill' ? '#000000' : '#ffffff';
        const lbl = this.add.text(bx, by, `${denom.val}`, {
            fontSize, color: fontColor, fontStyle: 'bold',
            stroke: strokeColor, strokeThickness: 3,
            padding: { x: 3, y: 3 }
        }).setOrigin(0.5);
        this.cashDrawerGroup.add(lbl);

        // Hit area
        const hw = denom.type === 'bill' ? 140 : 100;
        const hh = denom.type === 'bill' ? 80 : 100;
        const hitArea = this.add.rectangle(bx, by, hw, hh, 0x000000, 0).setInteractive({ useHandCursor: true });
        this.cashDrawerGroup.add(hitArea);

        hitArea.on('pointerdown', () => {
            if (!this.isWaitingInput) return;
            if (this.tutorialStep < 50) return; // Only allow during Phase 3

            this.sound.play('sfx-pop', { volume: 0.5 });
            this.changeGiven += denom.val;

            // Fly animation to belt
            const flyingObj = this.add.image(bx, by, denom.key);
            flyingObj.setScale(sizeMult);
            flyingObj.setTint(visualTint);
            const flyLbl = this.add.text(bx, by, `${denom.val}`, {
                fontSize, color: fontColor, fontStyle: 'bold',
                stroke: strokeColor, strokeThickness: 3,
                padding: { x: 3, y: 3 }
            }).setOrigin(0.5);

            const destX = 400 + Phaser.Math.RND.between(-150, 150);
            const destY = 560 + Phaser.Math.RND.between(-40, 40);

            this.tweens.add({
                targets: [flyingObj, flyLbl],
                x: destX, y: destY,
                duration: 300,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    this.beltItemsGroup.add(flyingObj);
                    this.beltItemsGroup.add(flyLbl);
                }
            });

            // Update monitor
            this.updatePhase3Monitor();

            // Check if over
            if (this.changeGiven > this.changeTarget) {
                this.sound.play('sfx-error', { volume: 0.5 });
                this.showInstruction('ทอนเกินยอด! ลองใหม่นะ');
                this.cameras.main.shake(100, 0.01);
                this.changeGiven = 0;
                this.beltItemsGroup.clear(true, true);
                this.redrawPhase3Hand();
                this.updatePhase3Monitor();
            }
        });
    }

    // ════════════════════════════════════════════════════════════
    //  NUMPAD INPUT HANDLER
    // ════════════════════════════════════════════════════════════

    private handleNumpadInput(key: string) {
        if (key === 'CLEAR') {
            this.displayedInput = '';
            this.updateDisplay();
        } else if (key === 'ENTER') {
            if (this.tutorialStep === 12) {
                this.checkPhase1Answer();
            } else if (this.tutorialStep === 20) {
                this.checkPhase2Answer();
            }
        } else {
            if (this.displayedInput.length < 4) {
                if (this.displayedInput === '0' || this.displayedInput === '') this.displayedInput = key;
                else this.displayedInput += key;
                this.updateDisplay();
            }
        }
    }

    private updateDisplay() {
        this.inputDisplay.setText(this.displayedInput === '' ? '0' : this.displayedInput);
    }

    // ════════════════════════════════════════════════════════════
    //  RESIZE — same as GameScene
    // ════════════════════════════════════════════════════════════

    private resizeCallback(gameSize: Phaser.Structs.Size) {
        const w = gameSize.width;
        const h = gameSize.height;
        const zoom = Math.min(w / 800, h / 1200);
        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(400, 600);

        if (this.bgImage) {
            const scaleX = w / this.bgImage.width;
            const scaleY = h / this.bgImage.height;
            const coverScale = Math.max(scaleX, scaleY) / zoom;
            this.bgImage.setScale(coverScale);
        }
    }

    // ════════════════════════════════════════════════════════════
    //  ARROW INDICATOR
    // ════════════════════════════════════════════════════════════

    private showArrow(x: number, y: number) {
        this.removeArrow();

        this.arrowContainer = this.add.container(x, y - 50).setDepth(250);

        const arrowSize = 22;
        const triangle = this.add.graphics();
        triangle.fillStyle(COLORS.ARROW_COLOR, 1);
        triangle.beginPath();
        triangle.moveTo(0, arrowSize);
        triangle.lineTo(-arrowSize * 0.7, -arrowSize * 0.4);
        triangle.lineTo(arrowSize * 0.7, -arrowSize * 0.4);
        triangle.closePath();
        triangle.fillPath();

        const stem = this.add.graphics();
        stem.fillStyle(COLORS.ARROW_COLOR, 1);
        stem.fillRect(-4, -arrowSize * 0.4 - 16, 8, 16);

        this.arrowContainer.add([stem, triangle]);

        this.arrowTween = this.tweens.add({
            targets: this.arrowContainer,
            y: y - 40,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private removeArrow() {
        if (this.arrowTween) { this.arrowTween.stop(); this.arrowTween = null; }
        if (this.arrowContainer) { this.arrowContainer.destroy(); this.arrowContainer = null; }
    }

    // ════════════════════════════════════════════════════════════
    //  NEXT BUTTON
    // ════════════════════════════════════════════════════════════

    private showNextButton(text: string, callback: () => void) {
        this.removeNextButton();

        const btnX = 400;
        const btnY = 1150;
        this.nextBtnContainer = this.add.container(btnX, btnY).setDepth(300);

        const btnW = 280;
        const btnH = 60;
        const shadowG = this.add.graphics();
        shadowG.fillStyle(0x000000, 0.15);
        shadowG.fillRoundedRect(-btnW / 2 + 3, -btnH / 2 + 4, btnW, btnH, 16);

        const bg = this.add.graphics();
        bg.fillStyle(0x58CC02, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
        bg.lineStyle(3, 0xffffff, 0.3);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);

        const label = this.add.text(0, 0, text, thaiStyle({
            fontSize: '28px', fontStyle: 'bold',
        })).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, btnW, btnH, 0xffffff, 0).setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', () => {
            this.sound.play('sfx-beep', { volume: 0.5 });
            this.removeNextButton();
            callback();
        });

        this.nextBtnContainer.add([shadowG, bg, label, hitArea]);
        this.nextBtnContainer.setScale(0);
        this.tweens.add({
            targets: this.nextBtnContainer,
            scale: 1,
            duration: 300,
            ease: 'Back.out',
        });
    }

    private removeNextButton() {
        if (this.nextBtnContainer) { this.nextBtnContainer.destroy(); this.nextBtnContainer = null; }
    }

    // ════════════════════════════════════════════════════════════
    //  FLOATING FEEDBACK
    // ════════════════════════════════════════════════════════════

    private showFeedback(msg: string, isSuccess: boolean) {
        const bgColor = isSuccess ? '#22c55e' : '#ef4444';
        const text = this.add.text(400, 460, msg, {
            fontSize: '38px', color: '#fff', fontStyle: 'bold',
            backgroundColor: bgColor, padding: { x: 20, y: 12 },
        }).setOrigin(0.5).setDepth(250);

        this.tweens.add({
            targets: text,
            y: 380, alpha: 0,
            duration: 1500,
            onComplete: () => text.destroy(),
        });
    }

    // ════════════════════════════════════════════════════════════
    //  DENOMINATIONS HELPER
    // ════════════════════════════════════════════════════════════

    private getDenominationsForAmount(amount: number): { key: string, val: number, isCoin: boolean }[] {
        let remaining = amount;
        const result: { key: string, val: number, isCoin: boolean }[] = [];
        const denoms = [
            { v: 100, k: 'bill-100', c: false },
            { v: 50, k: 'bill-50', c: false },
            { v: 20, k: 'bill-20', c: false },
            { v: 10, k: 'coin-10', c: true },
            { v: 5, k: 'coin-5', c: true },
            { v: 2, k: 'coin-2', c: true },
            { v: 1, k: 'coin-1', c: true },
        ];
        for (const d of denoms) {
            while (remaining >= d.v) {
                result.push({ key: d.k, val: d.v, isCoin: d.c });
                remaining -= d.v;
            }
        }
        return result;
    }

    // ════════════════════════════════════════════════════════════
    //  TUTORIAL FLOW
    // ════════════════════════════════════════════════════════════

    // ── Step 0: Welcome ──
    private startWelcome() {
        this.tutorialStep = 0;

        this.posMonitorText.setText('POS SYSTEM\n>> TUTORIAL MODE <<');

        this.showInstruction('ยินดีต้อนรับสู่ร้านค้า!\nคุณจะเป็นพนักงานแคชเชียร์', true);

        this.time.delayedCall(3000, () => {
            this.showInstruction('งานของคุณมี 3 ขั้นตอน\nมาเรียนรู้ทีละขั้นกันนะคะ', true);
            this.showNextButton('เริ่มเรียนรู้', () => {
                this.startPhase1Intro();
            });
        });
    }

    // ── Phase 1 Intro: Explain tally ──
    private startPhase1Intro() {
        this.tutorialStep = 10;
        this.removeNextButton();
        this.removeArrow();

        this.showInstruction('ขั้นที่ 1: รวมยอดเงิน\nสินค้าจะวิ่งมาบนสายพาน', true);

        this.isBeltMoving = true;
        this.phase1Total = 0;
        this.itemsTapped = 0;

        // Place tutorial items on belt
        const items = TUTORIAL_ITEMS;
        let beltX = 250;

        for (const item of items) {
            this.phase1Total += item.price;

            const py = 560;
            const itemImg = this.add.image(beltX, py, item.key).setOrigin(0.5).setScale(1.8).setDepth(2);
            itemImg.setInteractive({
                useHandCursor: true,
                hitArea: new Phaser.Geom.Rectangle(40, -10, itemImg.width, itemImg.height + 20),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            });

            const shadow = this.add.image(beltX + 5, py + 5, item.key).setOrigin(0.5).setTintFill(0x000000).setAlpha(0.3).setScale(1.8).setDepth(1);
            this.beltItemsGroup.add(shadow);
            this.beltItemsGroup.add(itemImg);

            const price = item.price;
            const capturedItemKey = item.key;

            itemImg.on('pointerdown', () => {
                this.sound.play('sfx-pop', { volume: 0.5 });
                // Tap effect
                itemImg.setY(itemImg.y - 10);
                itemImg.setScale(1.7);
                this.time.delayedCall(100, () => {
                    itemImg.setY(itemImg.y + 10);
                    itemImg.setScale(1.5);
                });

                // Show price on monitor
                this.monitorContentGroup.clear(true, true);
                this.drawMonitorItem(400, 240, capturedItemKey, 1, price);

                this.itemsTapped++;
                if (this.itemsTapped >= items.length) {
                    // Player has tapped all items — advance
                    this.time.delayedCall(1000, () => {
                        this.startPhase1Entry();
                    });
                }
            });

            beltX += 200;
        }

        // Show monitor prompt
        this.posMonitorText.setText('>> รวมยอดเงิน <<\nสินค้าบนสายพาน');

        // Show arrow on first item
        this.time.delayedCall(1500, () => {
            this.showInstruction('แตะสินค้าแต่ละชิ้น\nเพื่อดูราคาบนหน้าจอ');
            this.showArrow(250, 490);
        });
    }

    // ── Phase 1 Entry: Type the total ──
    private startPhase1Entry() {
        this.tutorialStep = 12;
        this.isWaitingInput = true;
        this.displayedInput = '';
        this.updateDisplay();
        this.removeArrow();
        this.isBeltMoving = false;

        this.numpadGroup.setVisible(true);

        this.showInstruction(
            `ราคารวมทั้งหมดคือ ฿${this.phase1Total}\nพิมพ์ตัวเลขแล้วกด OK`
        );

        this.posMonitorText.setText(`>> รวมยอดเงิน <<`);

        // Point arrow at numpad
        this.showArrow(280, 730);
    }

    private checkPhase1Answer() {
        const guess = parseInt(this.displayedInput || '0');
        if (guess === this.phase1Total) {
            this.isWaitingInput = false;
            this.removeArrow();
            this.sound.play('sfx-register', { volume: 0.7 });
            this.showFeedback('ถูกต้อง! เก่งมาก!', true);

            this.time.delayedCall(1500, () => {
                this.beltItemsGroup.clear(true, true);
                this.monitorContentGroup.clear(true, true);
                this.displayedInput = '';
                this.updateDisplay();
                this.startPhase2Intro();
            });
        } else {
            this.sound.play('sfx-error', { volume: 0.5 });
            this.showFeedback('ลองใหม่นะคะ!', false);
            this.cameras.main.shake(200, 0.01);
            this.showInstruction(
                `คำตอบยังไม่ถูก\nราคารวมคือ ฿${this.phase1Total}\nลองพิมพ์ใหม่อีกครั้ง`
            );
            this.displayedInput = '';
            this.updateDisplay();
        }
    }

    // ── Phase 2 Intro: Adjustments ──
    private startPhase2Intro() {
        this.tutorialStep = 20;
        this.removeArrow();
        this.numpadGroup.setVisible(true);

        // The coupon value
        const couponValue = 5;
        this.phase2Target = this.phase1Total - couponValue;

        this.showInstruction(
            'ขั้นที่ 2: คำนวณยอดสุทธิ\nลูกค้ามีคูปองส่วนลด!', true
        );

        // Draw coupon on belt
        const handX = 550;
        const handY = 560;
        const arm = this.add.image(handX, handY, 'ui-customer-hand').setOrigin(0.5).setDepth(2);
        this.beltItemsGroup.add(arm);

        const couponBg = this.add.rectangle(handX - 100, handY, 120, 70, 0xffaaaa)
            .setStrokeStyle(2, 0xcc0000).setAngle(-8).setDepth(3);
        const couponTxt = this.add.text(couponBg.x, couponBg.y, `-฿${couponValue}`, {
            fontSize: '28px', color: '#000', fontStyle: 'bold',
            padding: { x: 5, y: 5 },
        }).setOrigin(0.5).setAngle(couponBg.angle).setDepth(4);
        this.beltItemsGroup.add(couponBg);
        this.beltItemsGroup.add(couponTxt);

        // Update monitor
        let monitorText = '>> กรอกยอดสุทธิใหม่ <<\n\n';
        monitorText += `ยอดรวมเดิม     : ฿${this.phase1Total}\n`;
        monitorText += `คูปอง          : -฿${couponValue}\n`;
        monitorText += `────────────────\n`;
        monitorText += `ยอดสุทธิที่ต้องกรอก = ?\n`;
        this.posMonitorText.setText(monitorText);

        this.displayedInput = '';
        this.updateDisplay();
        this.isWaitingInput = true;

        this.time.delayedCall(2500, () => {
            this.showInstruction(
                `ยอดเดิม ฿${this.phase1Total} ลบคูปอง ฿${couponValue}\nเท่ากับ ฿${this.phase2Target}\nพิมพ์ตัวเลขแล้วกด OK`
            );
            this.showArrow(280, 730);
        });
    }

    private checkPhase2Answer() {
        const guess = parseInt(this.displayedInput || '0');
        if (guess === this.phase2Target) {
            this.isWaitingInput = false;
            this.removeArrow();
            this.sound.play('sfx-register', { volume: 0.7 });
            this.showFeedback('ยอดสุทธิถูกต้อง!', true);

            this.time.delayedCall(1500, () => {
                this.beltItemsGroup.clear(true, true);
                this.monitorContentGroup.clear(true, true);
                this.numpadGroup.setVisible(false);
                this.displayedInput = '';
                this.updateDisplay();
                this.startPhase3Intro();
            });
        } else {
            this.sound.play('sfx-error', { volume: 0.5 });
            this.showFeedback('ลองใหม่นะคะ!', false);
            this.cameras.main.shake(200, 0.01);
            this.showInstruction(
                `คำตอบยังไม่ถูก\n฿${this.phase1Total} - ฿${this.phase1Total - this.phase2Target} = ฿${this.phase2Target}\nลองพิมพ์ใหม่อีกครั้ง`
            );
            this.displayedInput = '';
            this.updateDisplay();
        }
    }

    // ── Phase 3 Intro: Making change ──
    private startPhase3Intro() {
        this.tutorialStep = 50;
        this.removeArrow();

        // Customer pays with 50 baht note
        const customerPays = 50;
        this.changeTarget = customerPays - this.phase2Target;
        this.changeGiven = 0;

        this.showInstruction(
            'ขั้นที่ 3: ทอนเงินลูกค้า\nลูกค้าจ่ายธนบัตรมา', true
        );

        // Draw customer hand with bill
        const handX = 550;
        const handY = 560;
        const arm = this.add.image(handX, handY - 20, 'ui-customer-hand').setOrigin(0.5).setDepth(2);

        const paidImg = this.add.image(handX - 80, handY - 20, 'bill-50').setDepth(3);
        paidImg.setTint(COLORS.BILL_50_TINT);
        const paidTxt = this.add.text(paidImg.x, paidImg.y, `฿${customerPays}`, {
            fontSize: '32px', color: '#e0e0e0', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4,
            padding: { x: 3, y: 3 },
        }).setOrigin(0.5).setDepth(4);

        this.beltItemsGroup.add(arm);
        this.beltItemsGroup.add(paidImg);
        this.beltItemsGroup.add(paidTxt);

        this.updatePhase3Monitor();

        this.time.delayedCall(2500, () => {
            this.showInstruction(
                `ลูกค้าจ่าย ฿${customerPays}\nต้องทอน ฿${this.changeTarget}\nเลือกเหรียญ/ธนบัตรจากลิ้นชัก`
            );
            this.cashDrawerGroup.setVisible(true);
            this.isWaitingInput = true;

            // Point arrow at drawer
            this.showArrow(400, 640);
        });
    }

    private redrawPhase3Hand() {
        const customerPays = 50;
        const handX = 550;
        const handY = 560;
        const arm = this.add.image(handX, handY - 20, 'ui-customer-hand').setOrigin(0.5).setDepth(2);

        const paidImg = this.add.image(handX - 80, handY - 20, 'bill-50').setDepth(3);
        paidImg.setTint(COLORS.BILL_50_TINT);
        const paidTxt = this.add.text(paidImg.x, paidImg.y, `฿${customerPays}`, {
            fontSize: '32px', color: '#e0e0e0', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4,
            padding: { x: 3, y: 3 },
        }).setOrigin(0.5).setDepth(4);

        this.beltItemsGroup.add(arm);
        this.beltItemsGroup.add(paidImg);
        this.beltItemsGroup.add(paidTxt);
    }

    private updatePhase3Monitor() {
        const customerPays = 50;
        let text = '>> ทอนเงินลูกค้า <<\n\n';
        text += `ยอดสุทธิ    : ฿${this.phase2Target}\n`;
        text += `รับเงินมา    : ฿${customerPays}\n`;
        text += `ต้องทอนเงิน  : ฿${this.changeTarget}\n\n`;
        text += `[ทอนแล้ว: ฿${this.changeGiven}]`;
        this.posMonitorText.setText(text);
    }

    private checkChangeSubmit() {
        if (this.changeGiven === this.changeTarget) {
            this.isWaitingInput = false;
            this.removeArrow();
            this.sound.play('sfx-register', { volume: 0.7 });
            this.showFeedback('เงินทอนถูกต้อง!', true);

            this.time.delayedCall(1500, () => {
                this.finishTutorial();
            });
        } else if (this.changeGiven < this.changeTarget) {
            this.sound.play('sfx-error', { volume: 0.5 });
            this.showFeedback(`ยังไม่ครบ! ต้องทอน ฿${this.changeTarget}`, false);
            this.showInstruction(
                `ยังทอนไม่ครบนะคะ\nต้องทอนทั้งหมด ฿${this.changeTarget}\nทอนแล้ว ฿${this.changeGiven}\nเลือกเพิ่มอีก ฿${this.changeTarget - this.changeGiven}`
            );
        } else {
            // Over — handled in pointerdown already, but just in case
            this.sound.play('sfx-error', { volume: 0.5 });
            this.showFeedback('ทอนเกินยอด! ลองใหม่', false);
            this.changeGiven = 0;
            this.beltItemsGroup.clear(true, true);
            this.redrawPhase3Hand();
            this.updatePhase3Monitor();
        }
    }

    // ── Finish ──
    private finishTutorial() {
        this.tutorialStep = 99;
        this.removeArrow();
        this.removeNextButton();
        this.cashDrawerGroup.setVisible(false);
        this.numpadGroup.setVisible(false);
        this.beltItemsGroup.clear(true, true);
        this.monitorContentGroup.clear(true, true);

        this.posMonitorText.setText('>> TUTORIAL COMPLETE <<\n\nเยี่ยมมาก!');

        this.showInstruction('คุณพร้อมเป็นแคชเชียร์แล้ว!\nมาเริ่มเล่นจริงกันเลย!', true);

        this.time.delayedCall(2500, () => {
            this.sound.play('sfx-pass', { volume: 0.7 });
            const onTutorialComplete = this.registry.get('onTutorialComplete');
            if (onTutorialComplete) {
                onTutorialComplete();
            }
        });
    }

    // ════════════════════════════════════════════════════════════
    //  MONITOR ITEM DISPLAY (same as GameScene.drawPhase1MonitorRow)
    // ════════════════════════════════════════════════════════════

    private drawMonitorItem(cx: number, cy: number, itemKey: string, qty: number, totalPrice: number) {
        const iconY = cy - 10;
        const icon = this.add.image(cx, iconY, itemKey).setOrigin(0.5).setScale(2.0).setDepth(2);
        this.monitorContentGroup.add(icon);

        if (qty > 1) {
            const qtyText = this.add.text(cx + 60, iconY + 50, `x${qty}`, {
                fontSize: '36px', color: COLORS.MONITOR_TEXT, fontFamily: 'monospace',
                fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4,
                padding: { x: 3, y: 3 },
            }).setOrigin(0.5).setDepth(3);
            this.monitorContentGroup.add(qtyText);
        }

        // Cash representations
        const cashBreakdown = this.getDenominationsForAmount(totalPrice);
        const cashY = cy + 100;

        let currentWidth = 0;
        const spacing = 15;
        const elements: any[] = [];

        for (const denom of cashBreakdown) {
            const dummyImg = this.add.image(0, 0, denom.key);
            dummyImg.setScale(denom.isCoin ? 1.0 : 0.7);
            const dw = dummyImg.displayWidth;
            dummyImg.destroy();
            elements.push({ denom, dw });
            currentWidth += dw + spacing;
        }
        currentWidth -= spacing;

        let startX = cx - (currentWidth / 2);

        for (const el of elements) {
            const elCenterX = startX + (el.dw / 2);
            const denomImg = this.add.image(elCenterX, cashY, el.denom.key).setOrigin(0.5).setDepth(2);
            denomImg.setScale(el.denom.isCoin ? 1.0 : 0.7);

            if (!el.denom.isCoin) {
                if (el.denom.val === 100) denomImg.setTint(COLORS.BILL_100_TINT);
                if (el.denom.val === 50) denomImg.setTint(COLORS.BILL_50_TINT);
                if (el.denom.val === 20) denomImg.setTint(COLORS.BILL_20_TINT);
            }

            const fontColor = el.denom.isCoin ? '#000000' : '#ffffff';
            const fontSize = el.denom.isCoin ? '26px' : '30px';
            const strokeColor = el.denom.isCoin ? '#ffffff' : '#000000';
            const lbl = this.add.text(elCenterX, cashY, `${el.denom.val}`, {
                fontSize, color: fontColor, fontStyle: 'bold',
                stroke: strokeColor, strokeThickness: 3,
                padding: { x: 3, y: 3 },
            }).setOrigin(0.5).setDepth(3);

            this.monitorContentGroup.add(denomImg);
            this.monitorContentGroup.add(lbl);

            startX += el.dw + spacing;
        }
    }
}
