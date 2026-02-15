import * as Phaser from 'phaser';
import { FLOATING_MARKET_LEVELS } from './levels';
import type { FloatingMarketLevelConfig, Encounter, EncounterResult, QuestionType } from './types';

// ==================== QUESTION GENERATORS ====================

interface MenuItem {
    name: string;
    price: number;
}

const MENU_ITEMS: MenuItem[] = [
    { name: 'ทุเรียน', price: 10 },
    { name: 'มะม่วง', price: 15 },
    { name: 'ส้มตำ', price: 40 },
    { name: 'ข้าวเหนียว', price: 20 },
    { name: 'น้ำเปล่า', price: 5 },
    { name: 'น้ำมะพร้าว', price: 25 },
    { name: 'ขนมจีน', price: 30 },
    { name: 'กล้วยทอด', price: 10 },
    { name: 'ลูกชิ้น', price: 15 },
    { name: 'ไอศกรีม', price: 20 },
    { name: 'ปลาหมึกย่าง', price: 35 },
    { name: 'แตงโม', price: 10 },
    { name: 'มะพร้าวเผา', price: 30 },
    { name: 'ข้าวต้ม', price: 25 },
    { name: 'ผัดไทย', price: 45 },
];

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generateWrongAnswer(correct: number, min: number = 5, max: number = 200): number {
    const offsets = [5, 10, 15, 20, -5, -10, -15, -20, 25, -25, 30];
    let wrong: number;
    let attempts = 0;
    do {
        wrong = correct + pickRandom(offsets);
        attempts++;
    } while ((wrong === correct || wrong < min || wrong > max) && attempts < 20);
    if (wrong === correct || wrong < min) wrong = correct + 10;
    return wrong;
}

function generateIdentifyQuestion(): Encounter {
    const item = pickRandom(MENU_ITEMS);
    const correctAnswer = item.price;
    const wrong1 = generateWrongAnswer(correctAnswer);
    let wrong2 = generateWrongAnswer(correctAnswer);
    while (wrong2 === wrong1) wrong2 = generateWrongAnswer(correctAnswer);

    // User feedback: Don't test memory of prices. Test steering.
    // Question: "Durian (10 Baht)" -> Options: "10 Baht", "20 Baht", ...
    return {
        questionText: `${item.name} (${item.price} บาท)`,
        correctAnswer,
        options: shuffleArray([
            { label: `${correctAnswer} บาท`, value: correctAnswer },
            { label: `${wrong1} บาท`, value: wrong1 },
            { label: `${wrong2} บาท`, value: wrong2 },
        ]),
        questionType: 'identify',
        chatText: `อยากกิน${item.name}จัง!`
    };
}

function generateAdditionQuestion(): Encounter {
    const item1 = pickRandom(MENU_ITEMS);
    let item2 = pickRandom(MENU_ITEMS);
    while (item2.name === item1.name) item2 = pickRandom(MENU_ITEMS);

    const correctAnswer = item1.price + item2.price;
    const wrong1 = generateWrongAnswer(correctAnswer);
    let wrong2 = generateWrongAnswer(correctAnswer);
    while (wrong2 === wrong1) wrong2 = generateWrongAnswer(correctAnswer);

    return {
        questionText: `ซื้อ${item1.name} ${item1.price}บ. และ${item2.name} ${item2.price}บ. รวมเป็น?`,
        correctAnswer,
        options: shuffleArray([
            { label: `${correctAnswer} บาท`, value: correctAnswer },
            { label: `${wrong1} บาท`, value: wrong1 },
            { label: `${wrong2} บาท`, value: wrong2 },
        ]),
        questionType: 'addition',
        chatText: `ป้าๆ เอา${item1.name}กับ${item2.name}หน่อยจ้า`
    };
}

function generateChangeQuestion(): Encounter {
    const item = pickRandom(MENU_ITEMS);
    // Payment amounts: round up to nearest 10 or 50 or 100
    const payOptions = [50, 100, 20, 200];
    const payment = payOptions.find(p => p > item.price) || 100;
    const correctAnswer = payment - item.price;
    const wrong1 = generateWrongAnswer(correctAnswer, 1);
    let wrong2 = generateWrongAnswer(correctAnswer, 1);
    while (wrong2 === wrong1 || wrong2 === correctAnswer) wrong2 = generateWrongAnswer(correctAnswer, 1);

    return {
        questionText: `ซื้อ${item.name} ${item.price}บ. ให้เงิน ${payment}บ. ทอนเท่าไร?`,
        correctAnswer,
        options: shuffleArray([
            { label: `${correctAnswer} บาท`, value: correctAnswer },
            { label: `${wrong1} บาท`, value: wrong1 },
            { label: `${wrong2} บาท`, value: wrong2 },
        ]),
        questionType: 'change',
        chatText: `ซื้อ${item.name} จ่ายแบงก์ ${payment} นะ`
    };
}

function generateMultiplicationQuestion(): Encounter {
    const item = pickRandom(MENU_ITEMS);
    const quantity = Math.floor(Math.random() * 4) + 2; // 2-5
    const correctAnswer = item.price * quantity;
    const wrong1 = generateWrongAnswer(correctAnswer);
    let wrong2 = generateWrongAnswer(correctAnswer);
    while (wrong2 === wrong1 || wrong2 === correctAnswer) wrong2 = generateWrongAnswer(correctAnswer);

    return {
        questionText: `ซื้อ${item.name} ${quantity} ชิ้น ชิ้นละ ${item.price}บ. ต้องจ่ายกี่บาท?`,
        correctAnswer,
        options: shuffleArray([
            { label: `${correctAnswer} บาท`, value: correctAnswer },
            { label: `${wrong1} บาท`, value: wrong1 },
            { label: `${wrong2} บาท`, value: wrong2 },
        ]),
        questionType: 'multiplication',
        chatText: `เหมา${item.name} ${quantity} ชิ้นเลย!`
    };
}

function generateEncounter(type: QuestionType, optionCount: number): Encounter {
    let encounter: Encounter;

    if (type === 'mixed') {
        const subType = pickRandom(['addition', 'change', 'multiplication'] as QuestionType[]);
        encounter = subType === 'addition' ? generateAdditionQuestion()
            : subType === 'change' ? generateChangeQuestion()
                : generateMultiplicationQuestion();
    } else if (type === 'identify') {
        encounter = generateIdentifyQuestion();
    } else if (type === 'addition') {
        encounter = generateAdditionQuestion();
    } else if (type === 'change') {
        encounter = generateChangeQuestion();
    } else {
        encounter = generateMultiplicationQuestion();
    }

    // Trim to optionCount
    if (optionCount === 2) {
        const correctOpt = encounter.options.find(o => o.value === encounter.correctAnswer)!;
        const wrongOpt = encounter.options.find(o => o.value !== encounter.correctAnswer)!;
        encounter.options = shuffleArray([correctOpt, wrongOpt]);
    }

    return encounter;
}

// ==================== OBSTACLE / VISUAL TYPES ====================

interface ObstacleObj {
    sprite: Phaser.GameObjects.Container;
    body: Phaser.Physics.Arcade.Body;
    width: number;
    height: number;
}

interface CoinObj {
    sprite: Phaser.GameObjects.Container;
    body: Phaser.Physics.Arcade.Body;
    collected: boolean;
}

interface AnswerGate {
    sprite: Phaser.GameObjects.Container;
    body: Phaser.Physics.Arcade.Body;
    value: number;
    label: string;
    triggered: boolean;
}

// ==================== MAIN SCENE ====================

export class FloatingMarketScene extends Phaser.Scene {
    // Config
    private levelConfig!: FloatingMarketLevelConfig;

    // River dimensions
    private riverLeft = 0;
    private riverRight = 0;
    private riverWidth = 0;

    // Boat
    private boat!: Phaser.GameObjects.Container;
    private boatBody!: Phaser.Physics.Arcade.Body;
    private boatWidth = 40;
    private boatHeight = 60;
    // Boat Physics
    private currentSpeedX = 0;
    private maxSpeedX = 350;
    private accelX = 800;
    private dragX = 0.92; // Friction per frame


    // Input
    private useTilt = false;
    private tiltGamma = 0; // -90 to 90
    private touchLeft = false;
    private touchRight = false;
    private leftZone!: Phaser.GameObjects.Rectangle;
    private rightZone!: Phaser.GameObjects.Rectangle;

    // Scrolling
    private scrollSpeed = 0;
    private scrollY = 0;
    private riverBgTiles: Phaser.GameObjects.TileSprite[] = [];

    // Market stalls (decorative)
    private marketStallsLeft: Phaser.GameObjects.Rectangle[] = [];
    private marketStallsRight: Phaser.GameObjects.Rectangle[] = [];

    // Obstacles
    private obstacles: ObstacleObj[] = [];
    private obstacleTimer = 0;
    private obstacleGroup!: Phaser.Physics.Arcade.Group;

    // Coins
    private coins: CoinObj[] = [];
    private coinTimer = 0;
    private coinGroup!: Phaser.Physics.Arcade.Group;

    // Encounters
    private encounters: Encounter[] = [];
    private encounterResults: EncounterResult[] = [];
    private currentEncounterIndex = 0;
    private encounterActive = false;
    private encounterStartTime = 0;
    private encounterFirstTiltDirection: number | null = null;
    private answerGates: AnswerGate[] = [];
    private answerGateGroup!: Phaser.Physics.Arcade.Group;
    private chatBubbles: { sprite: Phaser.GameObjects.Container; age: number }[] = [];
    private questionText!: Phaser.GameObjects.Text;
    private questionBg!: Phaser.GameObjects.Rectangle;
    private encounterDistanceCounter = 0;
    private nextEncounterDistance = 0;

    // Stats tracking
    private reactionTimes: number[] = [];
    private hesitationCount = 0;
    private totalCollisions = 0;
    private correctAnswers = 0;
    private changeQuestionCorrect = 0;
    private changeQuestionTotal = 0;
    private bonusCoins = 0;

    // Game state
    private gameStartTime = 0;
    private gameOver = false;
    private distanceTraveled = 0;
    private totalDistanceNeeded = 0;
    private progressBar!: Phaser.GameObjects.Graphics;
    private coinCountText!: Phaser.GameObjects.Text;

    // Collision cooldown
    private collisionCooldown = 0;

    // Water decoration
    private waterGraphics!: Phaser.GameObjects.Graphics;
    private waterParticleTimer = 0;
    private waterRipples: { x: number; y: number; age: number; maxAge: number }[] = [];

    // Compatibility alert
    private alertShown = false;

    constructor() {
        super({ key: 'FloatingMarketScene' });
    }

    init(data: { level: number }) {
        const regLevel = this.registry.get('level');
        const level = data.level || regLevel || 1;
        this.levelConfig = FLOATING_MARKET_LEVELS[level] || FLOATING_MARKET_LEVELS[1];

        // Reset all state
        this.obstacles = [];
        this.coins = [];
        this.answerGates = [];
        this.encounters = [];
        this.encounterResults = [];
        this.currentEncounterIndex = 0;
        this.encounterActive = false;
        this.reactionTimes = [];
        this.hesitationCount = 0;
        this.totalCollisions = 0;
        this.correctAnswers = 0;
        this.changeQuestionCorrect = 0;
        this.changeQuestionTotal = 0;
        this.bonusCoins = 0;
        this.gameOver = false;
        this.distanceTraveled = 0;
        this.obstacleTimer = 0;
        this.coinTimer = 0;
        this.tiltGamma = 0;
        this.touchLeft = false;
        this.touchRight = false;
        this.encounterDistanceCounter = 0;
        this.collisionCooldown = 0;
        this.scrollY = 0;
        this.waterRipples = [];
        this.encounterFirstTiltDirection = null;
        this.alertShown = false;
    }

    preload() {
        // Load audio
        this.load.audio('coin-collect', '/assets/sounds/global/level-pass.mp3');
        this.load.audio('collision', '/assets/sounds/cardmatch/match-fail.mp3');
        this.load.audio('correct', '/assets/sounds/cardmatch/match-success.mp3');
        this.load.audio('wrong', '/assets/sounds/cardmatch/match-fail.mp3');
        this.load.audio('level-pass', '/assets/sounds/global/level-pass.mp3');
    }

    create() {
        const { width, height } = this.scale;

        // Calculate river boundaries
        this.riverWidth = width * this.levelConfig.riverWidthRatio;
        this.riverLeft = (width - this.riverWidth) / 2;
        this.riverRight = this.riverLeft + this.riverWidth;

        // Scroll speed from level config
        this.scrollSpeed = this.levelConfig.boatSpeed;

        // Total distance for level completion
        const totalTime = this.levelConfig.timeLimitSeconds;
        this.totalDistanceNeeded = this.scrollSpeed * (totalTime * 0.6); // ~60% of max time
        this.nextEncounterDistance = this.totalDistanceNeeded / (this.levelConfig.encounterCount + 1);

        // Generate encounters
        for (let i = 0; i < this.levelConfig.encounterCount; i++) {
            this.encounters.push(
                generateEncounter(this.levelConfig.questionType, this.levelConfig.optionCount)
            );
        }

        // --- Draw scene ---
        this.drawBackground(width, height);
        this.drawMarketStalls(width, height);
        this.createBoat(width, height);
        this.createUI(width, height);

        // Physics groups
        this.obstacleGroup = this.physics.add.group();
        this.coinGroup = this.physics.add.group();
        this.answerGateGroup = this.physics.add.group();

        // --- Input Setup ---
        this.setupInput(width, height);

        // --- Collisions ---
        this.physics.add.overlap(this.boat, this.obstacleGroup, this.handleObstacleCollision, undefined, this);
        this.physics.add.overlap(this.boat, this.coinGroup, this.handleCoinCollect, undefined, this);
        this.physics.add.overlap(this.boat, this.answerGateGroup, this.handleAnswerGateHit, undefined, this);

        // Water decoration graphics
        this.waterGraphics = this.add.graphics();
        this.waterGraphics.setDepth(1);

        // Start timer
        this.gameStartTime = Date.now();

        // Handle resize
        this.scale.on('resize', () => {
            this.handleResize();
        });
    }

    // ==================== DRAWING ====================

    drawBackground(width: number, height: number) {
        // Sky/water gradient
        const bg = this.add.graphics();
        bg.setDepth(0);

        // River water
        bg.fillStyle(0x4A90A4, 1);
        bg.fillRect(this.riverLeft, 0, this.riverWidth, height);

        // Market/bank areas (left and right of river)
        bg.fillStyle(0x8B6914, 1); // Wooden dock color
        bg.fillRect(0, 0, this.riverLeft, height);
        bg.fillRect(this.riverRight, 0, width - this.riverRight, height);

        // River edge lines
        bg.lineStyle(3, 0x365F6D, 0.8);
        bg.moveTo(this.riverLeft, 0);
        bg.lineTo(this.riverLeft, height);
        bg.moveTo(this.riverRight, 0);
        bg.lineTo(this.riverRight, height);
        bg.strokePath();
    }

    drawMarketStalls(width: number, height: number) {
        // Decorative market stalls on the banks
        const stallColors = [0xC0392B, 0xE67E22, 0x27AE60, 0x2980B9, 0x8E44AD, 0xD4AC0D];
        const stallH = 60;
        const count = Math.ceil(height / stallH) + 2;

        for (let i = -1; i < count; i++) {
            const y = i * stallH;
            
            // Left Bank Stalls
            const leftColor = pickRandom(stallColors);
            const leftStall = this.add.rectangle(
                this.riverLeft / 2, y,
                this.riverLeft - 10, stallH, // Slight gap from edge
                leftColor, 1
            );
            // Add slight bevel/border
            leftStall.setStrokeStyle(2, 0x000000, 0.2);
            leftStall.setDepth(0);
            this.marketStallsLeft.push(leftStall);

            // Right Bank Stalls
            const rightColor = pickRandom(stallColors);
            const rightStall = this.add.rectangle(
                this.riverRight + (width - this.riverRight) / 2, y,
                (width - this.riverRight) - 10, stallH,
                rightColor, 1
            );
            rightStall.setStrokeStyle(2, 0x000000, 0.2);
            rightStall.setDepth(0);
            this.marketStallsRight.push(rightStall);
        }
    }

    createBoat(width: number, height: number) {
        const boatX = width / 2;
        const boatY = height - 120;

        // Boat as container with shapes
        this.boat = this.add.container(boatX, boatY);
        this.boat.setDepth(10);

        // Hull
        const hull = this.add.rectangle(0, 0, this.boatWidth, this.boatHeight, 0x8B4513);
        hull.setStrokeStyle(2, 0x5D3612);

        // Bow (pointed front)
        const bow = this.add.triangle(0, -this.boatHeight / 2 - 10,
            -this.boatWidth / 2, 10,
            this.boatWidth / 2, 10,
            0, -15,
            0x8B4513
        );
        bow.setStrokeStyle(2, 0x5D3612);

        // Passenger (circle head)
        const head = this.add.circle(0, -10, 10, 0xFFDBAC);
        head.setStrokeStyle(1, 0x333333);

        // Hat
        const hat = this.add.ellipse(0, -20, 28, 10, 0xD4AC0D);

        this.boat.add([hull, bow, head, hat]);
        this.boat.setSize(this.boatWidth, this.boatHeight + 20);

        // Physics
        this.physics.add.existing(this.boat);
        this.boatBody = this.boat.body as Phaser.Physics.Arcade.Body;
        this.boatBody.setCollideWorldBounds(false);
        this.boatBody.setSize(this.boatWidth - 4, this.boatHeight);
    }

    createUI(_width: number, _height: number) {
        const width = this.scale.width;

        // Progress bar
        this.progressBar = this.add.graphics();
        this.progressBar.setDepth(100);

        // Question text background (use Graphics for rounded corners)
        this.questionBg = this.add.rectangle(width / 2, 110, width * 0.85, 70, 0x000000, 0.7);
        this.questionBg.setDepth(99);
        this.questionBg.setVisible(false);
        this.questionText = this.add.text(width / 2, 110, '', {
            fontSize: '22px',
            fontFamily: "'Noto Sans Thai', sans-serif",
            color: '#FFFFFF',
            align: 'center',
            wordWrap: { width: width * 0.8 },
        });
        this.questionText.setOrigin(0.5);
        this.questionText.setDepth(100);
        this.questionText.setVisible(false);

        // Coin counter
        this.coinCountText = this.add.text(width - 20, 20, '🪙 0', {
            fontSize: '20px',
            fontFamily: "'Noto Sans Thai', sans-serif",
            color: '#FFD700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        });
        this.coinCountText.setOrigin(1, 0);
        this.coinCountText.setDepth(100);
    }

    // ==================== INPUT ====================

    setupInput(width: number, height: number) {
        // Check for tilt support
        if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
            // Try requesting permission (iOS 13+)
            const DeviceOrientationEventTyped = DeviceOrientationEvent as any;
            if (typeof DeviceOrientationEventTyped.requestPermission === 'function') {
                DeviceOrientationEventTyped.requestPermission()
                    .then((state: string) => {
                        if (state === 'granted') {
                            this.enableTilt();
                        } else {
                            this.enableTouchFallback(width, height);
                        }
                    })
                    .catch(() => {
                        this.enableTouchFallback(width, height);
                    });
            } else {
                // Non-iOS - test if events actually fire
                let tiltTestReceived = false;
                const testHandler = (e: DeviceOrientationEvent) => {
                    if (e.gamma !== null && e.gamma !== undefined) {
                        tiltTestReceived = true;
                        window.removeEventListener('deviceorientation', testHandler);
                        this.enableTilt();
                    }
                };
                window.addEventListener('deviceorientation', testHandler);

                // Fallback if no tilt data within 1.5 seconds
                this.time.delayedCall(1500, () => {
                    if (!tiltTestReceived) {
                        window.removeEventListener('deviceorientation', testHandler);
                        this.enableTouchFallback(width, height);
                    }
                });

                // Always enable touch as a parallel option
                this.setupTouchZones(width, height);
            }
        } else {
            this.enableTouchFallback(width, height);
        }
    }

    enableTilt() {
        this.useTilt = true;
        window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
            if (e.gamma !== null) {
                this.tiltGamma = e.gamma;
            }
        });
        // Also set up touch zones as secondary
        this.setupTouchZones(this.scale.width, this.scale.height);
    }

    enableTouchFallback(width: number, height: number) {
        if (!this.alertShown) {
            this.alertShown = true;
            // Show in-game alert (Thai)
            const alertBg = this.add.rectangle(width / 2, height / 2, width * 0.85, 120, 0x000000, 0.85);
            // rounded corners not available on Rectangle; skip
            alertBg.setDepth(200);

            const alertText = this.add.text(width / 2, height / 2,
                'อุปกรณ์ไม่รองรับการเอียง\nกรุณากดค้างซ้าย-ขวาที่หน้าจอแทน', {
                fontSize: '18px',
                fontFamily: "'Noto Sans Thai', sans-serif",
                color: '#FFFFFF',
                align: 'center',
            });
            alertText.setOrigin(0.5);
            alertText.setDepth(201);

            // Auto-dismiss after 3 seconds
            this.time.delayedCall(3000, () => {
                this.tweens.add({
                    targets: [alertBg, alertText],
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        alertBg.destroy();
                        alertText.destroy();
                    }
                });
            });
        }

        this.setupTouchZones(width, height);
    }

    setupTouchZones(width: number, height: number) {
        if (this.leftZone) return; // Already set up

        // Left touch zone
        this.leftZone = this.add.rectangle(width / 4, height / 2, width / 2, height, 0x000000, 0);
        this.leftZone.setDepth(50);
        this.leftZone.setInteractive();
        this.leftZone.on('pointerdown', () => { this.touchLeft = true; });
        this.leftZone.on('pointerup', () => { this.touchLeft = false; });
        this.leftZone.on('pointerout', () => { this.touchLeft = false; });

        // Right touch zone
        this.rightZone = this.add.rectangle(width * 3 / 4, height / 2, width / 2, height, 0x000000, 0);
        this.rightZone.setDepth(50);
        this.rightZone.setInteractive();
        this.rightZone.on('pointerdown', () => { this.touchRight = true; });
        this.rightZone.on('pointerup', () => { this.touchRight = false; });
        this.rightZone.on('pointerout', () => { this.touchRight = false; });

        // Keyboard fallback for desktop testing
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-LEFT', () => { this.touchLeft = true; });
            this.input.keyboard.on('keyup-LEFT', () => { this.touchLeft = false; });
            this.input.keyboard.on('keydown-RIGHT', () => { this.touchRight = true; });
            this.input.keyboard.on('keyup-RIGHT', () => { this.touchRight = false; });
        }
    }

    // ==================== UPDATE LOOP ====================

    update(_time: number, delta: number) {
        if (this.gameOver) return;

        const dt = delta / 1000; // Convert to seconds

        // --- Move boat ---
        this.moveBoat(dt);

        // --- Scroll river ---
        this.scrollY += this.scrollSpeed * dt;
        this.distanceTraveled += this.scrollSpeed * dt;
        this.encounterDistanceCounter += this.scrollSpeed * dt;

        // --- Spawn obstacles ---
        this.obstacleTimer += dt;
        if (this.obstacleTimer >= this.levelConfig.obstacleFrequency) {
            this.obstacleTimer = 0;
            this.spawnObstacle();
        }

        // --- Spawn coins ---
        if (this.levelConfig.coinFrequency > 0) {
            this.coinTimer += dt;
            if (this.coinTimer >= this.levelConfig.coinFrequency) {
                this.coinTimer = 0;
                this.spawnCoin();
            }
        }

        // --- Move obstacles & coins down ---
        this.moveScrollables(dt);

        // --- Encounter trigger ---
        if (!this.encounterActive && this.currentEncounterIndex < this.encounters.length) {
            if (this.encounterDistanceCounter >= this.nextEncounterDistance) {
                this.encounterDistanceCounter = 0;
                this.triggerEncounter();
            }
        }

        // --- Collision cooldown ---
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= dt;
        }

        // --- Water ripples ---
        this.updateWaterEffects(dt);

        // --- Progress check ---
        this.drawProgress();

        // --- Check level complete ---
        if (this.distanceTraveled >= this.totalDistanceNeeded && !this.encounterActive) {
            this.endGame(true);
        }

        // --- Time limit ---
        const elapsed = (Date.now() - this.gameStartTime) / 1000;
        if (elapsed >= this.levelConfig.timeLimitSeconds) {
            this.endGame(false);
        }
    }

    // ==================== BOAT MOVEMENT ====================

    moveBoat(dt: number) {
        // ==================== BOAT MOVEMENT (PHYSICS) ====================
        
        let targetDirection = 0; // -1 (left), 0 (none), 1 (right)
        // Tilt input
        if (this.useTilt && Math.abs(this.tiltGamma) > 3) {
            // Deadzone of 3 degrees
            // Map tilt to direction intensity (-1 to 1)
            targetDirection = Phaser.Math.Clamp(this.tiltGamma / 25, -1, 1);
        }

        // Touch input (overrides tilt if active)
        if (this.touchLeft) targetDirection = -1;
        if (this.touchRight) targetDirection = 1;

        // Apply Acceleration
        if (targetDirection !== 0) {
            this.currentSpeedX += targetDirection * this.accelX * dt;
        } else {
            // Apply Drag (Friction) when no input
            // Using frame-rate independent friction approximation
            // v = v * (drag ^ (dt * 60))
            this.currentSpeedX *= Math.pow(this.dragX, dt * 60);
            
            // Snap to 0 if very slow
            if (Math.abs(this.currentSpeedX) < 10) this.currentSpeedX = 0;
        }

        // Clamp Speed
        this.currentSpeedX = Phaser.Math.Clamp(this.currentSpeedX, -this.maxSpeedX, this.maxSpeedX);

        // Update Position
        const newX = this.boat.x + this.currentSpeedX * dt;

        // Clamp to River Bounds
        const halfBoat = this.boatWidth / 2;
        // Bounce off walls slightly
        if (newX <= this.riverLeft + halfBoat + 5 || newX >= this.riverRight - halfBoat - 5) {
             this.currentSpeedX *= -0.5; // Bounce back
             this.boat.x = Phaser.Math.Clamp(newX, this.riverLeft + halfBoat + 6, this.riverRight - halfBoat - 6);
             
             // Trigger collision logic if hitting hard
             if (this.collisionCooldown <= 0 && Math.abs(this.currentSpeedX) > 50) {
                 this.handleBankCollision();
             }
        } else {
            this.boat.x = newX;
        }

        // Visual Lean (Rotation)
        // Max lean 15 degrees based on speed ratio
        const targetAngle = (this.currentSpeedX / this.maxSpeedX) * 15;
        this.boat.setAngle(targetAngle);

        // Hesitation Tracking for Stats
        if (this.encounterActive && Math.abs(this.currentSpeedX) > 50) {
            const direction = this.currentSpeedX > 0 ? 1 : -1;
            if (this.encounterFirstTiltDirection === null) {
                this.encounterFirstTiltDirection = direction;
                // Record reaction time
                const reactionTime = Date.now() - this.encounterStartTime;
                this.reactionTimes.push(reactionTime);
            } else if (this.encounterFirstTiltDirection !== direction) {
                // Changed direction = hesitation!
                this.hesitationCount++;
                this.encounterFirstTiltDirection = direction; 
            }
        }
    }

    // ==================== OBSTACLES ====================

    spawnObstacle() {
        const { width } = this.scale;
        const padding = 30;
        const x = Phaser.Math.Between(
            this.riverLeft + padding,
            this.riverRight - padding
        );

        const obstacleTypes = ['rock', 'log', 'boat'];
        const type = pickRandom(obstacleTypes);

        const container = this.add.container(x, -50);
        container.setDepth(5);

        let w = 30, h = 30;

        if (type === 'rock') {
            w = Phaser.Math.Between(25, 40);
            h = Phaser.Math.Between(25, 35);
            const rock = this.add.ellipse(0, 0, w, h, 0x696969);
            rock.setStrokeStyle(2, 0x444444);
            // Add some texture dots
            const dot1 = this.add.circle(-5, -3, 3, 0x888888);
            const dot2 = this.add.circle(5, 4, 2, 0x555555);
            container.add([rock, dot1, dot2]);
        } else if (type === 'log') {
            w = Phaser.Math.Between(50, 80);
            h = 18;
            const log = this.add.rectangle(0, 0, w, h, 0x8B6914);
            log.setStrokeStyle(2, 0x5D4614);
            // Wood grain lines
            const line1 = this.add.rectangle(-10, 0, 1, h - 4, 0x725510);
            const line2 = this.add.rectangle(10, 0, 1, h - 4, 0x725510);
            container.add([log, line1, line2]);
        } else {
            // Other boat
            w = 30;
            h = 50;
            const otherHull = this.add.rectangle(0, 0, w, h, 0x654321);
            otherHull.setStrokeStyle(2, 0x4A3015);
            const otherBow = this.add.triangle(0, -h / 2 - 8, -w / 2, 8, w / 2, 8, 0, -12, 0x654321);
            container.add([otherHull, otherBow]);
        }

        container.setSize(w, h);
        this.physics.add.existing(container);
        const body = container.body as Phaser.Physics.Arcade.Body;
        body.setSize(w - 4, h - 4);
        body.setImmovable(true);

        this.obstacleGroup.add(container);
        this.obstacles.push({ sprite: container, body, width: w, height: h });
    }

    spawnCoin() {
        const padding = 40;
        const x = Phaser.Math.Between(
            this.riverLeft + padding,
            this.riverRight - padding
        );

        const container = this.add.container(x, -30);
        container.setDepth(6);

        // Coin visual
        const coinCircle = this.add.circle(0, 0, 12, 0xFFD700);
        coinCircle.setStrokeStyle(2, 0xDAA520);
        const coinText = this.add.text(0, 0, '฿', {
            fontSize: '12px',
            color: '#8B6914',
            fontStyle: 'bold',
        });
        coinText.setOrigin(0.5);

        container.add([coinCircle, coinText]);
        container.setSize(24, 24);

        this.physics.add.existing(container);
        const body = container.body as Phaser.Physics.Arcade.Body;
        body.setSize(20, 20);
        body.setImmovable(true);

        this.coinGroup.add(container);
        this.coins.push({ sprite: container, body, collected: false });
    }

    moveScrollables(dt: number) {
        const speed = this.scrollSpeed * dt;
        const { height } = this.scale;
        // Update visuals
        this.moveStalls(dt, speed);
        this.updateWater(dt);

        // Move obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.sprite.y += speed;
            if (obs.sprite.y > height + 60) {
                obs.sprite.destroy();
                this.obstacles.splice(i, 1);
            }
        }

        // Move coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.sprite.y += speed;
            if (coin.sprite.y > height + 60) {
                coin.sprite.destroy();
                this.coins.splice(i, 1);
            }
        }

        // Move answer gates
        for (let i = this.answerGates.length - 1; i >= 0; i--) {
            const gate = this.answerGates[i];
            gate.sprite.y += speed;
            if (gate.sprite.y > height + 100) {
                gate.sprite.destroy();
                this.answerGates.splice(i, 1);
            }
        }

        // Move Chat Bubbles
        for (let i = this.chatBubbles.length - 1; i >= 0; i--) {
            const bubble = this.chatBubbles[i];
            bubble.sprite.y += speed;
            bubble.age += dt;
            
            // Fade out
            if (bubble.age > 3.5) {
                bubble.sprite.alpha -= dt;
            }

            if (bubble.sprite.y > height + 80 || bubble.sprite.alpha <= 0) {
                bubble.sprite.destroy();
                this.chatBubbles.splice(i, 1);
            }
        }
    }

    moveStalls(dt: number, speed: number) {
        const { height } = this.scale;
        const stallH = 60;
        const stallColors = [0xC0392B, 0xE67E22, 0x27AE60, 0x2980B9, 0x8E44AD, 0xD4AC0D];

        // Combine arrays for iteration
        const allStalls = [...this.marketStallsLeft, ...this.marketStallsRight];
        
        allStalls.forEach(stall => {
            stall.y += speed;
            if (stall.y > height + stallH / 2) {
                // Recycle to top
                stall.y = -stallH * 1.5;
                stall.fillColor = pickRandom(stallColors);
            }
        });
    }

    updateWater(dt: number) {
        this.waterGraphics.clear();
        this.waterParticleTimer += dt;
        const { height } = this.scale;
        const time = Date.now() * 0.001;

        // Draw sine wave currents
        this.waterGraphics.lineStyle(2, 0xFFFFFF, 0.15);
        for (let i = 0; i < 4; i++) {
            const xOffset = i * (this.riverWidth / 4);
            const speed = (i % 2 === 0 ? 1 : 1.2);
            const phase = i * 2;
            
            this.waterGraphics.beginPath();
            for (let y = -50; y < height + 50; y += 50) {
                 const x = this.riverLeft + 20 + xOffset + Math.sin(y * 0.01 + time * speed + phase) * 15;
                 if (y === -50) this.waterGraphics.moveTo(x, y);
                 else this.waterGraphics.lineTo(x, y);
            }
            this.waterGraphics.strokePath();
        }

        // Wake particles
        if (this.waterParticleTimer > 0.08) {
            this.waterParticleTimer = 0;
            const p = { 
                x: this.boat.x + (Math.random() - 0.5) * 20, 
                y: this.boat.y + 35, 
                age: 0, 
                maxAge: 1.2 
            };
            this.waterRipples.push(p);
        }

        // Draw particles
        for (let i = this.waterRipples.length - 1; i >= 0; i--) {
            const p = this.waterRipples[i];
            p.y += this.scrollSpeed * dt; 
            p.age += dt;
            if (p.age > p.maxAge) {
                this.waterRipples.splice(i, 1);
            } else {
                const life = p.age / p.maxAge;
                const alpha = (1 - life) * 0.6;
                const size = 5 + (life * 25);
                this.waterGraphics.fillStyle(0xFFFFFF, alpha);
                this.waterGraphics.fillCircle(p.x, p.y, size);
                this.waterGraphics.lineStyle(1, 0xFFFFFF, alpha);
                this.waterGraphics.strokeCircle(p.x, p.y, size);
            }
        }
    }


    showChatBubble(text?: string) {
        if (!text) return;
        const { width } = this.scale;
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const isMobile = width < 600;
        const bubbleW = isMobile ? Math.min(200, width * 0.55) : 240;
        const fontSize = isMobile ? 16 : 20;
        const margin = 10;
        const x = side === 'left' ? this.riverLeft + margin : this.riverRight - margin;
        const y = -80; 
        const container = this.add.container(x, y);
        container.setDepth(20);
        const chatText = this.add.text(0, 0, text, {
            fontSize: `${fontSize}px`,
            fontFamily: "'Noto Sans Thai', sans-serif",
            color: '#000000',
            align: 'center',
            wordWrap: { width: bubbleW - 24 },
            fontStyle: 'bold'
        });
        chatText.setOrigin(0.5);
        const textBounds = chatText.getBounds();
        const bubbleH = textBounds.height + 24; 

        const graphics = this.add.graphics();
        
        // Calculate Positions
        let bodyX = 0;
        if (side === 'left') {
            bodyX = 15;
            chatText.setPosition(bodyX + bubbleW/2, 0);
        } else {
            bodyX = -15 - bubbleW;
            chatText.setPosition(bodyX + bubbleW/2, 0);
        }
        // Shadow
        graphics.fillStyle(0x000000, 0.25);
            const shadowOffset = 5;
        if (side === 'left') {
             graphics.fillRoundedRect(bodyX + shadowOffset, -bubbleH/2 + shadowOffset, bubbleW, bubbleH, 16);
             graphics.fillTriangle(shadowOffset, shadowOffset, 16 + shadowOffset, -8 + shadowOffset, 16 + shadowOffset, 8 + shadowOffset);
        } else {
             graphics.fillRoundedRect(bodyX + shadowOffset, -bubbleH/2 + shadowOffset, bubbleW, bubbleH, 16);
             graphics.fillTriangle(shadowOffset, shadowOffset, -16 + shadowOffset, -8 + shadowOffset, -16 + shadowOffset, 8 + shadowOffset);
        }

        // Main Bubble - Body
        graphics.fillStyle(0xFFFFFF, 1);
        graphics.lineStyle(2, 0x000000, 1);
        graphics.fillRoundedRect(bodyX, -bubbleH/2, bubbleW, bubbleH, 16);
        graphics.strokeRoundedRect(bodyX, -bubbleH/2, bubbleW, bubbleH, 16);

        // Main Bubble - Pointer
        graphics.fillStyle(0xFFFFFF, 1);
        if (side === 'left') {
            graphics.fillTriangle(0, 0, 16, -8, 16, 8);
        } else {
            graphics.fillTriangle(0, 0, -16, -8, -16, 8);
        }
        container.add([graphics, chatText]);
        this.chatBubbles.push({ sprite: container, age: 0 });
    }

    // ==================== ENCOUNTERS ====================

    triggerEncounter() {
        if (this.currentEncounterIndex >= this.encounters.length) return;

        const encounter = this.encounters[this.currentEncounterIndex];
        this.encounterActive = true;
        this.encounterStartTime = Date.now();
        this.encounterFirstTiltDirection = null;

        // Show question
        this.questionText.setText(encounter.questionText);
        this.questionText.setVisible(true);
        this.questionBg.setVisible(true);
        // Show chat bubble
        this.showChatBubble(encounter.chatText);

        // Resize question background to fit text
        const textBounds = this.questionText.getBounds();
        this.questionBg.setSize(textBounds.width + 40, textBounds.height + 24);

        // Spawn answer gates
        const optCount = encounter.options.length;
        const gateWidth = (this.riverWidth - 20) / optCount;
        const gateHeight = 70;
        const gateY = -350; // Spawn further up to create delay (approx 3-5s)

        encounter.options.forEach((opt, idx) => {
            const gateX = this.riverLeft + 10 + gateWidth * idx + gateWidth / 2;

            const container = this.add.container(gateX, gateY);
            container.setDepth(8);

            // Gate background
            const isCorrect = opt.value === encounter.correctAnswer;
            const gateBg = this.add.rectangle(0, 0, gateWidth - 8, gateHeight, 0x2C3E50, 0.85);
            gateBg.setStrokeStyle(3, 0xECF0F1);
            // gateBg.setRoundedRectRadius(12); // skip

            // Gate label
            const gateLabel = this.add.text(0, 0, opt.label, {
                fontSize: '20px',
                fontFamily: "'Noto Sans Thai', sans-serif",
                color: '#FFFFFF',
                fontStyle: 'bold',
                align: 'center',
                wordWrap: { width: gateWidth - 20 },
            });
            gateLabel.setOrigin(0.5);

            container.add([gateBg, gateLabel]);
            container.setSize(gateWidth - 8, gateHeight);

            this.physics.add.existing(container);
            const body = container.body as Phaser.Physics.Arcade.Body;
            body.setSize(gateWidth - 12, gateHeight - 4);
            body.setImmovable(true);

            this.answerGateGroup.add(container);
            this.answerGates.push({
                sprite: container,
                body,
                value: opt.value,
                label: opt.label,
                triggered: false,
            });
        });
    }

    // ==================== COLLISION HANDLERS ====================

    handleObstacleCollision(_boat: any, obstacle: any) {
        if (this.collisionCooldown > 0) return;
        this.collisionCooldown = 1.0; // 1 second cooldown

        this.totalCollisions++;

        // Visual feedback
        this.cameras.main.shake(200, 0.01);
        this.boat.setAlpha(0.5);
        this.time.delayedCall(300, () => {
            if (this.boat) this.boat.setAlpha(1);
        });

        try {
            this.sound.play('collision', { volume: 0.5 });
        } catch (e) { /* ignore audio errors */ }
    }

    handleBankCollision() {
        if (this.collisionCooldown > 0) return;
        this.collisionCooldown = 0.5;

        this.totalCollisions++;

        // Gentle shake
        this.cameras.main.shake(100, 0.005);
        this.boat.setAlpha(0.7);
        this.time.delayedCall(200, () => {
            if (this.boat) this.boat.setAlpha(1);
        });
    }

    handleCoinCollect(_boat: any, coinSprite: any) {
        // Find the coin in our array
        const coinIndex = this.coins.findIndex(c => c.sprite === coinSprite || c.body === coinSprite.body);
        if (coinIndex === -1) return;

        const coin = this.coins[coinIndex];
        if (coin.collected) return;
        coin.collected = true;

        this.bonusCoins++;
        this.coinCountText.setText(`🪙 ${this.bonusCoins}`);

        // Animate coin collection
        this.tweens.add({
            targets: coin.sprite,
            y: coin.sprite.y - 30,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 300,
            onComplete: () => {
                coin.sprite.destroy();
                this.coins.splice(this.coins.indexOf(coin), 1);
            }
        });

        try {
            this.sound.play('coin-collect', { volume: 0.3, rate: 1.5 });
        } catch (e) { /* ignore */ }
    }

    handleAnswerGateHit(_boat: any, gateSprite: any) {
        // Find the gate
        const gate = this.answerGates.find(g => g.sprite === gateSprite || (g.body as any) === gateSprite.body);
        if (!gate || gate.triggered) return;

        // Mark all gates as triggered to prevent double-hits
        this.answerGates.forEach(g => g.triggered = true);

        const encounter = this.encounters[this.currentEncounterIndex];
        const isCorrect = gate.value === encounter.correctAnswer;

        // Record result
        const reactionTime = this.reactionTimes.length > 0
            ? this.reactionTimes[this.reactionTimes.length - 1]
            : Date.now() - this.encounterStartTime;

        const result: EncounterResult = {
            reactionTimeMs: reactionTime,
            hesitated: this.encounterFirstTiltDirection !== null && this.hesitationCount > 0,
            correct: isCorrect,
            questionType: encounter.questionType,
        };
        this.encounterResults.push(result);

        if (isCorrect) {
            this.correctAnswers++;
            if (encounter.questionType === 'change') {
                this.changeQuestionCorrect++;
            }
        }
        if (encounter.questionType === 'change') {
            this.changeQuestionTotal++;
        }

        // Visual feedback on gates
        this.answerGates.forEach(g => {
            const bg = g.sprite.list[0] as Phaser.GameObjects.Rectangle;
            if (g.value === encounter.correctAnswer) {
                bg.setFillStyle(0x27AE60, 0.9); // Green = correct
            } else if (g === gate && !isCorrect) {
                bg.setFillStyle(0xE74C3C, 0.9); // Red = wrong choice
            }
        });

        try {
            this.sound.play(isCorrect ? 'correct' : 'wrong', { volume: 0.5 });
        } catch (e) { /* ignore */ }

        // Flash feedback text
        const feedbackText = this.add.text(this.scale.width / 2, this.scale.height / 2,
            isCorrect ? '✓ ถูกต้อง!' : '✗ ผิด!', {
            fontSize: '36px',
            fontFamily: "'Noto Sans Thai', sans-serif",
            color: isCorrect ? '#2ECC71' : '#E74C3C',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
        });
        feedbackText.setOrigin(0.5);
        feedbackText.setDepth(120);

        this.tweens.add({
            targets: feedbackText,
            y: feedbackText.y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => feedbackText.destroy(),
        });

        // Clean up encounter after delay
        this.time.delayedCall(1200, () => {
            this.questionText.setVisible(false);
            this.questionBg.setVisible(false);

            // Destroy remaining gates
            this.answerGates.forEach(g => {
                this.tweens.add({
                    targets: g.sprite,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => g.sprite.destroy(),
                });
            });
            this.answerGates = [];

            this.encounterActive = false;
            this.currentEncounterIndex++;
            this.encounterFirstTiltDirection = null;
        });
    }

    // ==================== WATER EFFECTS ====================

    updateWaterEffects(dt: number) {
        this.waterParticleTimer += dt;

        // Spawn ripples near boat
        if (this.waterParticleTimer > 0.3) {
            this.waterParticleTimer = 0;
            this.waterRipples.push({
                x: this.boat.x + Phaser.Math.Between(-15, 15),
                y: this.boat.y + this.boatHeight / 2 + 5,
                age: 0,
                maxAge: 1.5,
            });
        }

        // Update & draw ripples
        this.waterGraphics.clear();
        for (let i = this.waterRipples.length - 1; i >= 0; i--) {
            const r = this.waterRipples[i];
            r.age += dt;
            r.y += this.scrollSpeed * dt * 0.3;

            if (r.age >= r.maxAge) {
                this.waterRipples.splice(i, 1);
                continue;
            }

            const progress = r.age / r.maxAge;
            const alpha = 1 - progress;
            const radius = 5 + progress * 20;

            this.waterGraphics.lineStyle(1, 0xADD8E6, alpha * 0.5);
            this.waterGraphics.strokeCircle(r.x, r.y, radius);
        }
    }

    // ==================== PROGRESS & UI ====================

    drawProgress() {
        const { width } = this.scale;
        this.progressBar.clear();

        const barW = width * 0.3;
        const barH = 8;
        const barX = 15;
        const barY = 15;
        const progress = Math.min(1, this.distanceTraveled / this.totalDistanceNeeded);

        // Background
        this.progressBar.fillStyle(0x000000, 0.3);
        this.progressBar.fillRoundedRect(barX, barY, barW, barH, 4);

        // Fill
        this.progressBar.fillStyle(0x2ECC71, 1);
        this.progressBar.fillRoundedRect(barX, barY, barW * progress, barH, 4);

        // Border
        this.progressBar.lineStyle(1, 0xFFFFFF, 0.5);
        this.progressBar.strokeRoundedRect(barX, barY, barW, barH, 4);
    }

    // ==================== END GAME ====================

    endGame(success: boolean) {
        if (this.gameOver) return;
        this.gameOver = true;

        const totalTimeMs = Date.now() - this.gameStartTime;
        const stars = this.calculateStars();

        const onGameOver = this.registry.get('onGameOver');
        if (onGameOver) {
            onGameOver({
                current_played: this.levelConfig.level,
                difficultyMultiplier: this.levelConfig.difficultyMultiplier,
                reactionTimes: this.reactionTimes,
                hesitationCount: this.hesitationCount,
                totalCollisions: this.totalCollisions,
                correctAnswers: this.correctAnswers,
                totalEncounters: this.encounters.length,
                changeQuestionCorrect: this.changeQuestionCorrect,
                changeQuestionTotal: this.changeQuestionTotal,
                bonusCoins: this.bonusCoins,
                stars,
                success,
                totalTimeMs,
                starHint: stars < 3 ? this.getStarHint() : null,
            });

            try {
                this.sound.play(success ? 'level-pass' : 'collision', { volume: 0.6 });
            } catch (e) { /* ignore */ }
        }
    }

    calculateStars(): number {
        const isObstacleOnly = this.levelConfig.encounterCount === 0;

        if (isObstacleOnly) {
            // Star based on collision count
            if (this.totalCollisions === 0) return 3;
            if (this.totalCollisions <= 2) return 2;
            return 1;
        }

        // Math levels: based on accuracy + collisions
        const accuracy = this.encounters.length > 0
            ? this.correctAnswers / this.encounters.length
            : 1;

        if (accuracy >= 0.9 && this.totalCollisions <= 1) return 3;
        if (accuracy >= 0.7 && this.totalCollisions <= 3) return 2;
        return 1;
    }

    getStarHint(): string {
        const isObstacleOnly = this.levelConfig.encounterCount === 0;

        if (isObstacleOnly) {
            if (this.totalCollisions > 2) {
                return 'พยายามหลบสิ่งกีดขวางให้มากขึ้น!';
            }
            return 'หลบให้เก่งขึ้นอีกนิด!';
        }

        const accuracy = this.encounters.length > 0
            ? this.correctAnswers / this.encounters.length
            : 1;

        if (accuracy < 0.7) {
            return 'ตอบให้ถูกมากขึ้น คิดเลขให้ดีก่อนเอียง!';
        }
        if (this.totalCollisions > 3) {
            return 'หลบสิ่งกีดขวางให้มากขึ้น!';
        }
        return 'เร็วขึ้นอีกนิดแล้วจะได้ 3 ดาว!';
    }

    // ==================== RESIZE HANDLER ====================

    handleResize() {
        const { width, height } = this.scale;

        // Recalculate river bounds
        this.riverWidth = width * this.levelConfig.riverWidthRatio;
        this.riverLeft = (width - this.riverWidth) / 2;
        this.riverRight = this.riverLeft + this.riverWidth;

        // Reposition boat
        this.boat.x = Phaser.Math.Clamp(
            this.boat.x,
            this.riverLeft + this.boatWidth / 2 + 5,
            this.riverRight - this.boatWidth / 2 - 5
        );
        this.boat.y = height - 120;

        // Reposition UI
        this.questionBg.setPosition(width / 2, 60);
        this.questionText.setPosition(width / 2, 60);
        this.coinCountText.setPosition(width - 20, 20);

        // Reposition touch zones
        if (this.leftZone) {
            this.leftZone.setPosition(width / 4, height / 2);
            this.leftZone.setSize(width / 2, height);
        }
        if (this.rightZone) {
            this.rightZone.setPosition(width * 3 / 4, height / 2);
            this.rightZone.setSize(width / 2, height);
        }
    }
}
