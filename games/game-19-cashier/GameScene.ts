import Phaser from 'phaser';
import { CASHIER_LEVELS, type CashierLevelConfig } from './levels';

const SHOP_ITEMS = [
    { id: 'apple', name: 'แอปเปิล', key: 'item-apple', basePrice: 2 },
    { id: 'bread', name: 'ขนมปัง', key: 'item-bread', basePrice: 5 },
    { id: 'milk', name: 'นม', key: 'item-milk', basePrice: 4 },
    { id: 'cheese', name: 'ชีส', key: 'item-cheese', basePrice: 6 },
    { id: 'meat', name: 'เนื้อหมู', key: 'item-meat', basePrice: 8 },
    { id: 'carrot', name: 'แครอท', key: 'item-carrot', basePrice: 3 },
];

enum GameState { INIT, PHASE1_TALLY, PHASE2_PAYMENT, PHASE3_CHANGE, GAME_OVER }

export class CashierGameScene extends Phaser.Scene {
    private currentLevel: number = 1;
    private config!: CashierLevelConfig;
    private state: GameState = GameState.INIT;

    // Trackers
    private correct_tallies: number = 1;
    private tally_adjustments: number = 0;
    private forgotten_rules: number = 0;
    private distractor_clicks: number = 0;
    private operator_errors: number = 0;
    private deceptive_errors: number = 0;
    private phase3_start_time: number = 0;
    private visual_hesitation_time_ms: number = 0;
    private score: number = 0;
    private stars: number = 3;

    // Patience Meter Data
    private maxPatience: number = 30000;
    private currentPatience: number = 30000;
    private isPatienceActive: boolean = false;
    private patienceBarBg!: Phaser.GameObjects.Rectangle;
    private patienceBarFill!: Phaser.GameObjects.Rectangle;
    private currentBubbleStage: number = 0; // 0=none, 1=50%, 2=25%, 3=0%
    private speechBubbleTimerEvent?: Phaser.Time.TimerEvent;
    private peopleGroup!: Phaser.GameObjects.Group;
    private firstPersonSprite: Phaser.GameObjects.Image | null = null;
    private personCount: number = 0;

    // Phase 1 Data
    private validTotal: number = 0;

    // Phase 2 Data
    private paymentTargetBalance: number = 0;

    // Phase 3 Data
    private customerGivenAmount: number = 0;
    private changeTarget: number = 0;
    private changeGivenSoFar: number = 0;

    // UI Groups & Elements
    private dynamicItemsGroup!: Phaser.GameObjects.Group;
    private stickyNoteGroup!: Phaser.GameObjects.Group;
    private numpadGroup!: Phaser.GameObjects.Group;
    private cashDrawerGroup!: Phaser.GameObjects.Group;
    private phase1MonitorGroup!: Phaser.GameObjects.Group;
    private posMonitorText!: Phaser.GameObjects.Text;
    private inputDisplay!: Phaser.GameObjects.Text;
    private displayedInput: string = "";

    // Conveyor Belt
    private beltSprite!: Phaser.GameObjects.TileSprite;
    private isBeltMoving = false;

    // Floating Feedback Group
    private feedbackGroup!: Phaser.GameObjects.Group;

    // Background Image
    private bgImage!: Phaser.GameObjects.Image;

    constructor() { super({ key: 'CashierGameScene' }); }

    init(data: { level?: number }) {
        // Essential fix for global GameCanvas registry propagation
        this.currentLevel = this.registry.get('level') || data.level || 1;
        this.config = CASHIER_LEVELS[this.currentLevel] || CASHIER_LEVELS[1];

        this.correct_tallies = 1; this.tally_adjustments = 0; this.forgotten_rules = 0;
        this.distractor_clicks = 0; this.operator_errors = 0; this.deceptive_errors = 0;
        this.visual_hesitation_time_ms = 0; this.score = 100; this.stars = 3;
        this.validTotal = 0; this.displayedInput = "";
        this.changeGivenSoFar = 0;

        this.maxPatience = this.config.patienceDurationMs || 30000;
        this.currentPatience = this.maxPatience;
        this.isPatienceActive = false;
        this.currentBubbleStage = 0;
        this.personCount = 0;
        this.firstPersonSprite = null;
    }

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
        this.load.setPath(''); // Reset path for global sounds
        this.load.audio('sfx-bg-music', '/assets/sounds/cashier/bg-music.mp3');
        this.load.audio('sfx-beep', '/assets/sounds/cashier/beep.mp3');
        this.load.audio('sfx-register', '/assets/sounds/cashier/register.mp3');
        this.load.audio('sfx-pop', '/assets/sounds/gridhunter/pop.mp3');
        this.load.audio('sfx-pass', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('sfx-fail', '/assets/sounds/global/level-fail.mp3');
        this.load.audio('sfx-error', '/assets/sounds/global/error.mp3');
    }

    create() {
        // Hold reference to background to scale it later and place it furthest back
        this.bgImage = this.add.image(400, 600, 'game-bg').setDepth(-3);
        this.bgImage.setTint(0xcccccc); // Darken slightly so foreground pops
        if (this.bgImage.postFX) this.bgImage.postFX.addBlur(2, 2, 1); // True blur if supported

        // Responsive handling (keep game centered within expanding canvas)
        this.scale.on('resize', this.resizeCallback, this);

        // Start background music
        const bgMusic = this.sound.add('sfx-bg-music', { loop: true, volume: 0.3 });
        bgMusic.play();

        this.events.once('shutdown', () => {
            this.scale.off('resize', this.resizeCallback, this);
            bgMusic.stop();
        });
        this.events.once('destroy', () => {
            bgMusic.stop();
        });

        this.dynamicItemsGroup = this.add.group();
        this.stickyNoteGroup = this.add.group();
        this.numpadGroup = this.add.group();
        this.cashDrawerGroup = this.add.group();
        this.feedbackGroup = this.add.group();
        this.phase1MonitorGroup = this.add.group();
        this.peopleGroup = this.add.group();

        this.createEnvironment();
        // Shift Numpad to the left (250 instead of 400) to make room for desk notes
        this.createNumpad(280, 910);
        // Drawer remains centered
        this.createCashDrawer(400, 910);

        // Hide Drawer initially
        this.cashDrawerGroup.setVisible(false);

        this.createPatienceMeter();

        this.resizeCallback(this.scale.gameSize);
        this.startPhase1();
    }

    private resizeCallback(gameSize: Phaser.Structs.Size) {
        const w = gameSize.width;
        const h = gameSize.height;
        // Game logical space is 800x1200
        const zoom = Math.min(w / 800, h / 1200);
        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(400, 600);

        // Dynamically scale background to act like CSS "cover" 
        if (this.bgImage) {
            const scaleX = w / this.bgImage.width;
            const scaleY = h / this.bgImage.height;
            const coverScale = Math.max(scaleX, scaleY) / zoom;
            this.bgImage.setScale(coverScale);
        }
    }

    update(time: number, delta: number) {
        if (this.isBeltMoving && this.beltSprite) {
            this.beltSprite.tilePositionX -= 1.5;
        }

        if (this.isPatienceActive && this.state !== GameState.INIT && this.state !== GameState.GAME_OVER) {
            this.currentPatience -= delta;
            if (this.currentPatience <= 0) {
                this.currentPatience = 0;
                this.isPatienceActive = false; // Stop draining
                this.triggerPatiencePenalty();
            }
            this.updatePatienceVisuals();
        }
    }

    private createEnvironment() {
        // --- Bottom: Cash Register Counter ---
        // A simple elegant counter for the drawer/numpad to sit on
        const registerY = 1600; // Extend deep down to cover any possible height

        this.add.rectangle(400, registerY, 4000, 2000, 0xf5e6d3).setDepth(-1);  // Creamy supermarket counter top
        this.add.rectangle(400, registerY - 940, 4000, 20, 0xdccbb5).setDepth(-1);  // Edge highlight

        // --- Top: POS Monitor ---
        const monitorY = 220; // Shift down to allow bigger size

        // --- Middle: Conveyor Belt ---
        const beltY = 560; // Shifted down
        // Tile sprite so we can animate it moving infinitely. Make it huge so it bleeds off the edges
        this.beltSprite = this.add.tileSprite(400, beltY, 4000, 260, 'bg-conveyor-belt').setDepth(0);
        // Optional rails if the asset doesn't have borders
        this.add.rectangle(400, beltY - 130, 4000, 15, 0x111111).setDepth(0);
        this.add.rectangle(400, beltY + 130, 4000, 15, 0x111111).setDepth(0);

        // Use the new POS monitor asset
        const monitor = this.add.image(400, monitorY + 10, 'ui-pos-monitor').setDepth(-1);
        // Scale it up significantly to fill the horizontal logical view
        monitor.setDisplaySize(790, 440);

        // Screen is white, so use dark green text
        // With a bigger monitor, we can use larger font size and wider wrap
        this.posMonitorText = this.add.text(400 - 200, monitorY - 140, 'POS SYSTEM BOOTING...', {
            fontSize: '28px', color: '#053305', fontFamily: 'monospace', padding: { x: 5, y: 5 }, lineSpacing: 5,
            wordWrap: { width: 400 }
        }).setOrigin(0, 0).setDepth(1);
    }

    private createPatienceMeter() {
        // Position relative to top right
        const mx = 650;
        const my = 50;

        // Clean modern progress bar
        const barFrame = this.add.rectangle(mx - 100, my, 220, 24, 0x000000, 0.4).setOrigin(0, 0.5).setDepth(200);
        barFrame.setStrokeStyle(2, 0xffffff, 0.8);
        this.patienceBarBg = barFrame;

        // Inner track
        this.add.rectangle(mx - 98, my, 216, 20, 0x000000, 0.6).setOrigin(0, 0.5).setDepth(200);

        // Fill
        this.patienceBarFill = this.add.rectangle(mx - 98, my, 216, 20, 0x22c55e).setOrigin(0, 0.5).setDepth(201);
    }

    private updatePatienceVisuals() {
        if (!this.patienceBarFill) return;

        const pct = Math.max(0, this.currentPatience / this.maxPatience);
        this.patienceBarFill.width = 200 * pct;

        if (pct > 0.5) this.patienceBarFill.setFillStyle(0x22c55e); // Green
        else if (pct > 0.25) this.patienceBarFill.setFillStyle(0xeab308); // Yellow
        else this.patienceBarFill.setFillStyle(0xef4444); // Red

        this.updateQueueSilhouettes(pct);
        this.checkSpeechBubbles(pct);
    }

    private updateQueueSilhouettes(pct: number) {
        let targetPeople = 0;
        if (pct <= 0.99) targetPeople = 1; // 1st person appears immediately upon level start
        if (pct <= 0.5) targetPeople = 2; // 2nd person
        if (pct <= 0.25) targetPeople = 3; // 3rd person
        if (pct <= 0.0) targetPeople = 4; // 4th person

        while (this.personCount < targetPeople) {
            this.addPersonSilhouette();
        }
    }

    private addPersonSilhouette() {
        this.personCount++;
        // Position alternately left and right, pushed outside the monitor frame
        const positions = [
            { x: 130, y: 380, scale: 3.5 }, // 1st: Far Left
            { x: 670, y: 380, scale: 3.4 },  // 2nd: Far Right 
            { x: 50, y: 350, scale: 3.2 }, // 3rd: Very Far Left
            { x: 750, y: 350, scale: 3.1 }  // 4th: Very Far Right
        ];

        const pos = positions[(this.personCount - 1) % positions.length];

        const person = this.add.image(pos.x, pos.y, 'person-silhouette').setDepth(-2);
        person.setScale(pos.scale);
        person.setAlpha(0);

        if (this.personCount === 1) {
            this.firstPersonSprite = person;
        }

        this.peopleGroup.add(person);

        this.tweens.add({
            targets: person,
            alpha: 0.85,
            y: pos.y - 15, // stepping forward subtly
            duration: 800,
            ease: 'Power2'
        });
    }

    private checkSpeechBubbles(pct: number) {
        if (pct <= 0.5 && pct > 0.25 && this.currentBubbleStage < 1) {
            this.currentBubbleStage = 1;
            this.showSpeechBubble("แถวเริ่มยาวแล้วนะจ๊ะ...");
        } else if (pct <= 0.25 && pct > 0 && this.currentBubbleStage < 2) {
            this.currentBubbleStage = 2;
            this.showSpeechBubble("มีคนรอคิวอีกนิดหน่อยจ้า...");
        }
    }

    private triggerPatiencePenalty() {
        this.currentBubbleStage = 3;
        this.showSpeechBubble("คิวเริ่มยาวมากแล้วจ้า...", true);

        this.sound.play('sfx-fail', { volume: 0.6 });

        this.score = Math.max(0, this.score - 20);
        this.stars = Math.max(1, this.stars - 1);
        this.operator_errors++; // Consider this an operator pressure error

        this.tweens.add({
            targets: this.patienceBarBg,
            scaleX: 1.1, scaleY: 1.1,
            yoyo: true, repeat: 3, duration: 150
        });
    }

    private showSpeechBubble(text: string, isUrgent: boolean = false) {
        if (this.speechBubbleTimerEvent) this.speechBubbleTimerEvent.remove();

        const existingBubble = this.children.getByName('speech_bubble_group');
        if (existingBubble) existingBubble.destroy();

        // Place below the meter
        const container = this.add.container(600, 140).setName('speech_bubble_group').setDepth(210);
        container.setAlpha(0);

        const bubbleBg = this.add.rectangle(0, 0, 320, 70, 0xffffff).setStrokeStyle(3, isUrgent ? 0xff0000 : 0x000000).setOrigin(0.5);

        // Tail pointing upwards towards timer
        const tailFill = this.add.triangle(30, -35, 0, 0, 20, 0, 10, -20, 0xffffff).setOrigin(0, 0);
        const tailStroke = this.add.triangle(30, -35, 0, 0, 20, 0, 10, -20).setStrokeStyle(3, isUrgent ? 0xff0000 : 0x000000).setOrigin(0, 0);

        const textObj = this.add.text(0, 0, text, { fontSize: '24px', color: isUrgent ? '#ff0000' : '#000000', align: 'center', wordWrap: { width: 300 } }).setOrigin(0.5);

        // Render stroke tail first, then bubble, then fill tail over the bubble border
        container.add([tailStroke, bubbleBg, tailFill, textObj]);

        this.tweens.add({
            targets: container,
            alpha: 1,
            y: 120, // pop down
            duration: 300,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: container,
            y: 125,
            yoyo: true,
            repeat: -1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

        this.speechBubbleTimerEvent = this.time.delayedCall(isUrgent ? 5000 : 3500, () => {
            if (container) {
                this.tweens.add({
                    targets: container,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => container.destroy()
                });
            }
        });
    }

    private createNumpad(sx: number, sy: number) {
        // Numpad Base shadow
        const baseShadow = this.add.rectangle(sx + 5, sy + 50, 340, 460, 0x000000, 0.3);
        const numpadBase = this.add.rectangle(sx, sy + 45, 340, 460, 0x475569).setStrokeStyle(4, 0x334155);
        this.numpadGroup.add(baseShadow);
        this.numpadGroup.add(numpadBase);

        // Display
        const displayBg = this.add.rectangle(sx, sy - 120, 300, 70, 0x223322).setStrokeStyle(3, 0x000);
        this.inputDisplay = this.add.text(sx + 130, sy - 120, "0", { fontSize: '48px', color: '#00ff00', fontFamily: 'monospace', padding: { x: 10, y: 10 } }).setOrigin(1, 0.5);
        this.numpadGroup.add(displayBg);
        this.numpadGroup.add(this.inputDisplay);

        const buttons = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'CLEAR', '0', 'ENTER'];
        let index = 0;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 3; col++) {
                const label = buttons[index];
                const bx = sx - 100 + (col * 100);
                const by = sy - 30 + (row * 80);

                let btnColor = 0xf8fafc; // Off-white
                let btnTxtColor = '#1e293b'; // Dark blue-grey

                if (label === 'CLEAR') { btnColor = 0xef4444; btnTxtColor = '#ffffff'; }
                if (label === 'ENTER') { btnColor = 0x22c55e; btnTxtColor = '#ffffff'; }

                const btnShadow = this.add.rectangle(bx + 3, by + 4, 85, 65, 0x000000, 0.3);
                const btnBg = this.add.rectangle(bx, by, 85, 65, btnColor).setInteractive({ useHandCursor: true });
                btnBg.setStrokeStyle(2, 0x1e293b);

                let textLabel = label;
                if (label === 'CLEAR') textLabel = 'C';
                if (label === 'ENTER') textLabel = 'OK';

                const btnText = this.add.text(bx, by, textLabel, { fontSize: '40px', color: btnTxtColor, fontStyle: 'bold', padding: { x: 5, y: 5 } }).setOrigin(0.5);

                this.numpadGroup.add(btnShadow);
                this.numpadGroup.add(btnBg);
                this.numpadGroup.add(btnText);

                btnBg.on('pointerdown', () => {
                    this.sound.play('sfx-beep', { volume: 0.8 });
                    this.handleNumpadInput(label);
                    btnBg.y += 2; btnText.y += 2; btnShadow.y -= 2; // Press effect
                    this.time.delayedCall(100, () => { btnBg.y -= 2; btnText.y -= 2; btnShadow.y += 2; });
                });
                index++;
            }
        }
    }

    private createCashDrawer(sx: number, sy: number) {
        // Drawer Base
        const drawerBase = this.add.rectangle(sx, sy, 700, 480, 0x444444).setStrokeStyle(6, 0x222222);
        this.cashDrawerGroup.add(drawerBase);

        const innerDrawer = this.add.rectangle(sx, sy, 680, 460, 0x1a1a1a);
        this.cashDrawerGroup.add(innerDrawer);

        // Compartments
        const denominations = [
            { val: 100, key: 'bill-100', type: 'bill' },
            { val: 50, key: 'bill-50', type: 'bill' },
            { val: 20, key: 'bill-20', type: 'bill' },
            { val: 10, key: 'coin-10', type: 'coin' },
            { val: 5, key: 'coin-5', type: 'coin' },
            { val: 2, key: 'coin-2', type: 'coin' },
            { val: 1, key: 'coin-1', type: 'coin' },
        ];

        // Draw Bills (Top row)
        for (let i = 0; i < 4; i++) {
            const bx = sx - 240 + (i * 160);
            const by = sy - 110;
            // Slot
            const slot = this.add.rectangle(bx, by, 140, 200, 0x000000).setStrokeStyle(2, 0x333333);
            this.cashDrawerGroup.add(slot);

            this.addInteractiveCurrencyToDrawer(bx, by, denominations[i]);
        }

        // Draw Coins (Bottom row)
        for (let i = 4; i < 7; i++) {
            const bx = sx - 160 + ((i - 4) * 160);
            const by = sy + 110;
            // Slot (Bowl)
            const bowl = this.add.ellipse(bx, by, 120, 120, 0x000000).setStrokeStyle(2, 0x333333);
            this.cashDrawerGroup.add(bowl);

            this.addInteractiveCurrencyToDrawer(bx, by, denominations[i]);
        }

        // Submit Change Button
        const submitBg = this.add.rectangle(sx, sy + 210, 300, 50, 0x00cc00).setInteractive({ useHandCursor: true });
        const submitText = this.add.text(sx, sy + 210, 'ส่งมอบเงินทอน', { fontSize: '28px', color: '#fff', fontStyle: 'bold', padding: { x: 5, y: 5 } }).setOrigin(0.5);
        this.cashDrawerGroup.add(submitBg);
        this.cashDrawerGroup.add(submitText);

        submitBg.on('pointerdown', () => {
            this.sound.play('sfx-beep', { volume: 0.8 });
            submitBg.setAlpha(0.7);
            this.time.delayedCall(100, () => submitBg.setAlpha(1));
            this.checkPhase3();
        });
    }

    private addInteractiveCurrencyToDrawer(bx: number, by: number, denom: any) {
        let sizeMult = 1;

        let visualTint = 0xffffff;
        if (denom.type === 'bill') {
            // Apply standard tints to grayscale bills (Thai Baht colors)
            if (denom.val === 100) visualTint = 0xff6666; // Red
            if (denom.val === 50) visualTint = 0x6666ff;  // Blue
            if (denom.val === 20) visualTint = 0x66ff66;  // Green
        }

        // Apply natural size variations, then visual deceptions if active (STROOP EFFECT)
        if (this.config.deceptiveCurrency) {
            if (this.config.invertedVisuals) {
                sizeMult = denom.val <= 5 ? 1.8 : 0.6; // Coins huge, bills tiny
                if (denom.type === 'coin') {
                    visualTint = 0x888888; // Make gold coins dull
                } else {
                    visualTint = 0xffd700; // Make bills shiny gold
                }
            } else {
                sizeMult = 1.2;
            }
        } else {
            // Natural variations
            if (denom.type === 'coin') {
                if (denom.val === 1) sizeMult = 1.0;
                if (denom.val === 2) sizeMult = 1.15;
                if (denom.val === 5) sizeMult = 1.35;
                if (denom.val === 10) sizeMult = 1.5;
            }
        }

        const stackVisuals = [];
        // Draw a stack of them for visual flair
        for (let j = 0; j < 3; j++) {
            const offset = denom.type === 'bill' ? j * -3 : j * -2;
            const obj = this.add.image(bx + offset, by + offset, denom.key);
            obj.setScale(sizeMult);
            obj.setTint(visualTint);

            this.cashDrawerGroup.add(obj);
            stackVisuals.push(obj);
        }

        // Top interactive item
        const topObj = stackVisuals[stackVisuals.length - 1];

        // Draw readable value overlays
        const fontColor = denom.type === 'bill' ? '#ffffff' : '#000000';
        const fontSize = denom.type === 'bill' ? '32px' : '28px';
        const strokeColor = denom.type === 'bill' ? '#000000' : '#ffffff';
        const lbl = this.add.text(topObj.x, topObj.y, `${denom.val}`, { fontSize, color: fontColor, fontStyle: 'bold', stroke: strokeColor, strokeThickness: 3 }).setOrigin(0.5);
        this.cashDrawerGroup.add(lbl);

        // Ensure interactive area is large enough
        const hw = denom.type === 'bill' ? 140 : 100;
        const hh = denom.type === 'bill' ? 80 : 100;
        const hitArea = this.add.rectangle(bx, by, hw, hh, 0x000000, 0).setInteractive({ useHandCursor: true });
        this.cashDrawerGroup.add(hitArea);

        hitArea.on('pointerdown', () => {
            this.sound.play('sfx-pop', { volume: 0.5 });
            this.dispenseChangeAnim(denom.key, sizeMult, visualTint, topObj, denom.type, denom.val);
        });
    }

    private dispenseChangeAnim(assetKey: string, scaleMult: number, tint: number, sourceObj: any, cType: string, val: number) {
        // Phase 3 stats and logic
        this.changeGivenSoFar += val;

        if (this.config.deceptiveCurrency) {
            const reactTime = this.time.now - this.phase3_start_time;
            this.visual_hesitation_time_ms += reactTime;
            this.phase3_start_time = this.time.now;
        }

        if (this.changeGivenSoFar > this.changeTarget) {
            if (this.config.deceptiveCurrency) this.deceptive_errors++;
            else this.operator_errors++;

            this.sound.play('sfx-error', { volume: 0.5 });
            this.score = Math.max(0, this.score - 5);
            this.showSpeechBubble("ทอนเกินยอด!", true);
            this.cameras.main.shake(100, 0.01);

            // Clear belt stack and reset — but redraw the hand afterwards
            this.changeGivenSoFar = 0;
            this.dynamicItemsGroup.clear(true, true);
            this.redrawPhase3Hand();
            this.updatePOSForPhase3();
            return;
        }

        this.updatePOSForPhase3();

        // Create a clone to fly to the belt
        const flyingObj = this.add.image(sourceObj.x, sourceObj.y, assetKey);
        flyingObj.setScale(scaleMult);
        flyingObj.setTint(tint);

        const fontColor = cType === 'bill' ? '#ffffff' : '#000000';
        const fontSize = cType === 'bill' ? '32px' : '28px';
        const strokeColor = cType === 'bill' ? '#000000' : '#ffffff';
        const flyingLbl = this.add.text(sourceObj.x, sourceObj.y, `${val}`, { fontSize, color: fontColor, fontStyle: 'bold', stroke: strokeColor, strokeThickness: 3 }).setOrigin(0.5);


        // Random destination on the belt
        const destX = 400 + Phaser.Math.RND.between(-250, 250);
        const destY = 560 + Phaser.Math.RND.between(-50, 50);

        this.tweens.add({
            targets: [flyingObj, flyingLbl],
            x: destX,
            duration: 300,
            ease: 'Cubic.easeOut'
        });
        this.tweens.add({
            targets: [flyingObj, flyingLbl],
            y: destY,
            duration: 300,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.dynamicItemsGroup.add(flyingObj);
                this.dynamicItemsGroup.add(flyingLbl);
                // Slight pop effect
                this.tweens.add({
                    targets: [flyingObj, flyingLbl],
                    scaleX: scaleMult * 1.1, scaleY: scaleMult * 1.1,
                    yoyo: true, duration: 50
                });
            }
        });
    }

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

    private startPhase1() {
        this.state = GameState.PHASE1_TALLY;
        this.numpadGroup.setVisible(true);
        this.cashDrawerGroup.setVisible(false);
        this.isBeltMoving = true;
        this.isPatienceActive = true;

        this.displayedInput = "";
        this.updateDisplay();

        const numItems = this.config.tallyItemsCount;
        const availableItems = Phaser.Utils.Array.Shuffle([...SHOP_ITEMS]);

        this.validTotal = 0;

        // Setup initial text for P1
        this.posMonitorText.setText(">> รวมยอดเงิน\nสินค้าบนสายพาน <<");
        // We will start drawing items centered on the monitor when tapped
        const monitorCenterY = 240; // Shifted UP slightly to fit inside the monitor bezels
        const monitorCenterX = 400;

        const promptText = this.add.text(monitorCenterX, monitorCenterY, "แตะสินค้า\nเพื่อดูราคา", { fontSize: '38px', color: '#053305', align: 'center', fontStyle: 'bold' }).setOrigin(0.5);
        this.phase1MonitorGroup.add(promptText);

        let currentBeltX = Math.max(100, 400 - 250);

        let deskNoteStr = "";
        const hasLimitTrick = this.config.tallyLimitRule;
        if (hasLimitTrick) {
            deskNoteStr += "! สินค้าจำกัด !\nซื้อได้สูงสุด\n2 ชิ้น /รายการ\n";
        }

        let voidItemsStr = "";

        for (let i = 0; i < numItems; i++) {
            const item = availableItems[i];
            let price = item.basePrice;
            if (!this.config.roundNumbers) price = Phaser.Math.RND.pick([3, 7, 9, 13, 17]);
            else price = Phaser.Math.RND.pick([5, 10, 15, 20]);

            const isDistractor = i < this.config.tallyDistractors;
            const isLimitTrick = hasLimitTrick && i === 0;

            let itemVisualQty = 1;

            if (isDistractor && !isLimitTrick) {
                // Add to desk note, do NOT draw it to monitor yet
                voidItemsStr += `- ${item.name}\n`;
            } else if (isLimitTrick) {
                itemVisualQty = 3;
                this.validTotal += (price * 2); // Rule applied behind the scenes
            } else {
                this.validTotal += price;
            }

            // Draw items visually on conveyor belt
            for (let j = 0; j < itemVisualQty; j++) {
                const py = 560 + Phaser.Math.RND.between(-30, 30);

                const itemImg = this.add.image(currentBeltX, py, item.key).setOrigin(0.5).setScale(1.8);
                itemImg.setInteractive({
                    useHandCursor: true,
                    hitArea: new Phaser.Geom.Rectangle(40, -10, itemImg.width, itemImg.height + 20),
                    hitAreaCallback: Phaser.Geom.Rectangle.Contains
                });

                // Add simple box shadow
                const shadow = this.add.image(currentBeltX + 5, py + 5, item.key).setOrigin(0.5).setTintFill(0x000000).setAlpha(0.3).setScale(1.8);

                this.dynamicItemsGroup.add(shadow);
                this.dynamicItemsGroup.add(itemImg);

                // Tap-to-Reveal Mechanic Handle
                itemImg.on('pointerdown', () => {
                    this.sound.play('sfx-pop', { volume: 0.5 });
                    // Visual Tap Feedback
                    itemImg.setY(itemImg.y - 10);
                    itemImg.setScale(1.7);
                    this.time.delayedCall(100, () => {
                        itemImg.setY(itemImg.y + 10);
                        itemImg.setScale(1.5);
                    });

                    // Clear previous item from monitor completely
                    this.phase1MonitorGroup.clear(true, true);

                    // Silently register the distractor tap, but visually treat it identically to a normal item
                    // to force players to use their own memory of the sticky note rules
                    if (isDistractor && !isLimitTrick) {
                        this.distractor_clicks++;
                    }

                    // Dynamically render this item's price on the monitor (regardless of distractor status)
                    const effectiveQty = isLimitTrick ? 3 : 1;
                    const effectivePrice = isLimitTrick ? price * 3 : price;
                    this.drawPhase1MonitorRow(monitorCenterX, monitorCenterY, item.key, effectiveQty, effectivePrice);
                });

                currentBeltX += 60;
                if (currentBeltX > 400 + 350) currentBeltX = 400 - 350; // Wrap around if too many
            }
        }

        if (voidItemsStr.length > 0) {
            deskNoteStr += (deskNoteStr.length > 0 ? "\n" : "") + "! สินค้ายกเลิก !\n" + voidItemsStr;
        }

        if (deskNoteStr.length > 0) {
            this.createDeskStickyNote(deskNoteStr);
        }
    }

    private drawPhase1MonitorRow(cx: number, cy: number, itemKey: string, qty: number, totalPrice: number) {
        // Draw physical item icon centered above the cash
        const iconY = cy - 10; // Shifted down so it doesn't overlap text
        const icon = this.add.image(cx, iconY, itemKey).setOrigin(0.5).setScale(2.0); // Downscaled slightly from 2.5 to fit
        this.phase1MonitorGroup.add(icon);

        if (qty > 1) {
            // Draw quantity text near the icon
            const qtyText = this.add.text(cx + 60, iconY + 50, `x${qty}`, { fontSize: '36px', color: '#053305', fontFamily: 'monospace', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5);
            this.phase1MonitorGroup.add(qtyText);
        }

        // Draw physical cash representations for the price centered below
        const cashBreakdown = this.getDenominationsForAmount(totalPrice);
        const cashY = cy + 100; // Shifted down a bit from 70 to give space between icon and cash

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
            const denomImg = this.add.image(elCenterX, cashY, el.denom.key).setOrigin(0.5);
            denomImg.setScale(el.denom.isCoin ? 1.0 : 0.7);

            // Standard tints
            if (!el.denom.isCoin) {
                if (el.denom.val === 100) denomImg.setTint(0xff6666);
                if (el.denom.val === 50) denomImg.setTint(0x6666ff);
                if (el.denom.val === 20) denomImg.setTint(0x66ff66);
            }

            const fontColor = el.denom.isCoin ? '#000000' : '#ffffff';
            const fontSize = el.denom.isCoin ? '26px' : '30px';
            const strokeColor = el.denom.isCoin ? '#ffffff' : '#000000';
            const lbl = this.add.text(elCenterX, cashY, `${el.denom.val}`, { fontSize, color: fontColor, fontStyle: 'bold', stroke: strokeColor, strokeThickness: 3 }).setOrigin(0.5);

            this.phase1MonitorGroup.add(denomImg);
            this.phase1MonitorGroup.add(lbl);

            startX += el.dw + spacing;
        }
    }

    private createDeskStickyNote(text: string) {
        // Place it on the right side of the numpad
        const nx = 580;
        const ny = 910;

        // Make it a taller rectangular note
        const noteShadow = this.add.rectangle(nx + 5, ny + 5, 220, 300, 0x000000, 0.4).setAngle(-5);
        const note = this.add.rectangle(nx, ny, 220, 300, 0xfceba7).setAngle(-5).setStrokeStyle(1, 0xcca000);
        const pin = this.add.circle(nx, ny - 130, 6, 0xff0000).setAngle(-5);

        const noteText = this.add.text(nx, ny, text, { fontSize: '24px', color: '#d91b1b', fontStyle: 'bold', align: 'center', padding: { x: 5, y: 5 }, lineSpacing: 5 }).setOrigin(0.5).setAngle(-5);

        this.stickyNoteGroup.add(noteShadow);
        this.stickyNoteGroup.add(note);
        this.stickyNoteGroup.add(pin);
        this.stickyNoteGroup.add(noteText);
    }

    private handleNumpadInput(key: string) {
        if (this.state !== GameState.PHASE1_TALLY && this.state !== GameState.PHASE2_PAYMENT) return;

        if (key === 'CLEAR') {
            this.displayedInput = "";
            this.tally_adjustments++;
            this.updateDisplay();
        } else if (key === 'ENTER') {
            if (this.state === GameState.PHASE1_TALLY) this.checkTallyPhase();
            else if (this.state === GameState.PHASE2_PAYMENT) this.checkPaymentPhase();
        } else {
            if (this.displayedInput.length < 4) {
                if (this.displayedInput === "0" || this.displayedInput === "") this.displayedInput = key;
                else this.displayedInput += key;
                this.updateDisplay();
            }
        }
    }

    private updateDisplay() {
        this.inputDisplay.setText(this.displayedInput === "" ? "0" : this.displayedInput);
    }

    private showFloatingFeedback(msg: string, color: number) {
        const text = this.add.text(400, 450, msg, {
            fontSize: '42px', color: '#fff', fontStyle: 'bold', backgroundColor: color === 0x00ff00 ? '#22c55e' : (color === 0xffa500 ? '#f59e0b' : '#ef4444'), padding: { x: 20, y: 15 }
        }).setOrigin(0.5).setDepth(200);

        this.feedbackGroup.add(text);

        this.tweens.add({ targets: text, y: 350, alpha: 0, duration: 1500, onComplete: () => text.destroy() });
    }

    private checkTallyPhase() {
        const guess = parseInt(this.displayedInput || "0");
        if (guess === this.validTotal) {
            this.showFloatingFeedback("ยอดรวมถูกต้อง!", 0x00ff00);
            this.isBeltMoving = false;
            this.time.delayedCall(1200, () => {
                this.dynamicItemsGroup.clear(true, true);
                this.stickyNoteGroup.clear(true, true);
                this.phase1MonitorGroup.clear(true, true); // Clean up the physical cash display
                this.displayedInput = "";
                this.updateDisplay();
                this.sound.play('sfx-register', { volume: 0.7 });
                this.startPhase2();
            });
        } else {
            this.sound.play('sfx-error', { volume: 0.5 });
            this.correct_tallies = 0;
            this.score = Math.max(0, this.score - 20);
            this.stars = Math.max(1, this.stars - 1);
            if (this.config.tallyLimitRule && guess > this.validTotal) this.forgotten_rules++;
            this.showFloatingFeedback("คำนวณผิด! ลองใหม่", 0xff0000);
            this.cameras.main.shake(300, 0.02);
            this.displayedInput = "";
            this.updateDisplay();
        }
    }

    private startPhase2() {
        this.state = GameState.PHASE2_PAYMENT;

        // Clean up Phase 1 visuals just in case
        this.phase1MonitorGroup.clear(true, true);

        let p2MonitorText = ">> กรอกยอดสุทธิใหม่ <<\n\n";
        p2MonitorText += `ยอดรวมเดิม     : ฿${this.validTotal}\n`;

        this.paymentTargetBalance = this.validTotal;
        const additions: number[] = [];
        const subtractions: number[] = [];

        if (this.config.paymentMixed) {
            const numCoupons = Phaser.Math.RND.between(1, 2);
            for (let i = 0; i < numCoupons; i++) subtractions.push(Phaser.Math.RND.pick([2, 3, 5]));
            if (Phaser.Math.RND.frac() > 0.5) additions.push(Phaser.Math.RND.pick([1, 4]));
        } else {
            subtractions.push(Phaser.Math.RND.pick([1, 2]));
        }

        // Draw hand and items on belt
        const handX = 400 + 150;
        const handY = 560;

        // Simple "Arm" and "Hand" Shape
        const arm = this.add.image(handX, handY, 'ui-customer-hand').setOrigin(0.5, 0.5);
        this.dynamicItemsGroup.add(arm);

        let itemX = handX - 100;

        [...additions, ...subtractions].forEach((val, idx) => {
            const isSub = idx >= additions.length;
            const sign = isSub ? '-' : '+';
            this.paymentTargetBalance += isSub ? -val : val;

            const isDisguised = this.config.paymentDisguised;
            let bgColor = isSub ? 0xffaaaa : 0xaaffaa;
            let borderColor = isSub ? 0xcc0000 : 0x00cc00;
            let typeLabel = isSub ? "คูปอง" : "ของเพิ่ม";
            if (isDisguised) {
                bgColor = 0xddddaa;
                borderColor = 0x888844;
                typeLabel = "รายการ";
            }

            p2MonitorText += `${typeLabel.padEnd(10, ' ')} : ${sign}฿${val}\n`;

            // Draw visual on belt in front of hand
            const bgObj = this.add.rectangle(itemX, handY, 120, 70, bgColor).setStrokeStyle(2, borderColor).setAngle(Phaser.Math.RND.between(-15, 15));
            const txtObj = this.add.text(bgObj.x, bgObj.y, `${sign}฿${val}`, { fontSize: '28px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5).setAngle(bgObj.angle);

            this.dynamicItemsGroup.add(bgObj);
            this.dynamicItemsGroup.add(txtObj);

            itemX -= 140; // Next item placed further left
        });

        this.paymentTargetBalance = Math.max(0, this.paymentTargetBalance);

        this.posMonitorText.setText(p2MonitorText);
    }

    private checkPaymentPhase() {
        const guess = parseInt(this.displayedInput || "0");
        if (guess === this.paymentTargetBalance) {
            this.showFloatingFeedback("ยอดสุทธิถูกต้อง!", 0x00ff00);
            this.time.delayedCall(1200, () => {
                this.dynamicItemsGroup.clear(true, true);
                this.displayedInput = "";
                this.sound.play('sfx-register', { volume: 0.7 });
                this.startPhase3();
            });
        } else {
            this.sound.play('sfx-error', { volume: 0.5 });
            this.operator_errors++;
            this.score = Math.max(0, this.score - 20);
            this.stars = Math.max(1, this.stars - 1);
            this.showFloatingFeedback("ผิดแจ่มชัด! ตรวจเครื่องหมาย", 0xff0000);
            this.cameras.main.shake(300, 0.02);
            this.displayedInput = "";
            this.updateDisplay();
        }
    }

    private startPhase3() {
        this.state = GameState.PHASE3_CHANGE;
        this.numpadGroup.setVisible(false);
        this.cashDrawerGroup.setVisible(true);

        const allowedNotes = [10, 20, 50, 100];
        const validNotes = allowedNotes.filter(n => n >= this.paymentTargetBalance);
        this.customerGivenAmount = validNotes.length > 0 ? validNotes[0] : (this.paymentTargetBalance + 10);

        if (this.customerGivenAmount === this.paymentTargetBalance && validNotes.length > 1) {
            this.customerGivenAmount = validNotes[1];
        }

        this.changeTarget = this.customerGivenAmount - this.paymentTargetBalance;
        this.changeGivenSoFar = 0;

        // Draw Customer hand with the cash they gave
        const handX = 400 + 150;
        const handY = 560;
        const arm = this.add.image(handX, handY - 20, 'ui-customer-hand').setOrigin(0.5, 0.5);

        // Paid Bill Graphic
        let paidImgKey = 'bill-100'; // Default
        if (this.customerGivenAmount === 50) paidImgKey = 'bill-50';
        else if (this.customerGivenAmount === 20) paidImgKey = 'bill-20';
        else if (this.customerGivenAmount <= 10) paidImgKey = 'coin-10';

        const paidImg = this.add.image(handX - 80, handY - 20, paidImgKey);

        if (this.customerGivenAmount === 100) paidImg.setTint(0xff6666);
        else if (this.customerGivenAmount === 50) paidImg.setTint(0x6666ff);
        else if (this.customerGivenAmount === 20) paidImg.setTint(0x66ff66);

        const paidTxt = this.add.text(paidImg.x, paidImg.y, `฿${this.customerGivenAmount}`, { fontSize: '32px', color: '#e0e0e0', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);

        this.dynamicItemsGroup.add(arm);
        this.dynamicItemsGroup.add(paidImg);
        this.dynamicItemsGroup.add(paidTxt);

        this.phase3_start_time = this.time.now;

        this.updatePOSForPhase3();
    }

    private redrawPhase3Hand() {
        const handX = 400 + 150;
        const handY = 560;
        const arm = this.add.image(handX, handY - 20, 'ui-customer-hand').setOrigin(0.5, 0.5);

        let paidImgKey = 'bill-100';
        if (this.customerGivenAmount === 50) paidImgKey = 'bill-50';
        else if (this.customerGivenAmount === 20) paidImgKey = 'bill-20';
        else if (this.customerGivenAmount <= 10) paidImgKey = 'coin-10';

        const paidImg = this.add.image(handX - 80, handY - 20, paidImgKey);
        if (this.customerGivenAmount === 100) paidImg.setTint(0xff6666);
        else if (this.customerGivenAmount === 50) paidImg.setTint(0x6666ff);
        else if (this.customerGivenAmount === 20) paidImg.setTint(0x66ff66);

        const paidTxt = this.add.text(paidImg.x, paidImg.y, `฿${this.customerGivenAmount}`, { fontSize: '32px', color: '#e0e0e0', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);

        this.dynamicItemsGroup.add(arm);
        this.dynamicItemsGroup.add(paidImg);
        this.dynamicItemsGroup.add(paidTxt);
    }

    private updatePOSForPhase3() {
        let p3MonitorText = ">> ทอนเงินลูกค้า <<\n\n";
        p3MonitorText += `ยอดสุทธิ  : ฿${this.paymentTargetBalance}\n`;
        p3MonitorText += `รับเงินมา  : ฿${this.customerGivenAmount}\n`;
        p3MonitorText += `ต้องทอนเงิน : ฿${this.changeTarget}\n\n`;
        p3MonitorText += `[ทอนแล้ว: ฿${this.changeGivenSoFar}]`;

        this.posMonitorText.setText(p3MonitorText);
    }

    private checkPhase3() {
        if (this.changeGivenSoFar === this.changeTarget) {
            this.showFloatingFeedback("เงินทอนถูกต้อง!", 0x00ff00);
            this.time.delayedCall(1500, () => this.endGame());
        } else {
            this.sound.play('sfx-error', { volume: 0.5 });
            this.showFloatingFeedback(`ทอนเงินผิด! ยอดรวมคือ ฿${this.changeTarget}`, 0xff0000);
            this.operator_errors++;
            this.score = Math.max(0, this.score - 10);
            this.stars = Math.max(1, this.stars - 1);
            this.changeGivenSoFar = 0;
            this.dynamicItemsGroup.clear(true, true);
            this.redrawPhase3Hand();
            this.updatePOSForPhase3();
        }
    }

    private endGame() {
        this.state = GameState.GAME_OVER;
        this.sound.play('sfx-pass', { volume: 0.6 });
        const rawData = {
            level: this.currentLevel,
            score: this.score,
            stars: this.stars,
            success: true,
            correct_tallies: this.correct_tallies,
            tally_adjustments: this.tally_adjustments,
            forgotten_rules: this.forgotten_rules,
            distractor_clicks: this.distractor_clicks,
            operator_errors: this.operator_errors,
            deceptive_errors: this.deceptive_errors,
            visual_hesitation_time_ms: this.visual_hesitation_time_ms,
            stat_memory: null,
            stat_speed: null,
            stat_visual: null,
            stat_focus: null,
            stat_planning: null,
            stat_emotion: null
        };

        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver(rawData);
        }
    }
}
