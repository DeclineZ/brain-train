import * as Phaser from "phaser";
import type { Equation, ComplexEquation, Ball } from "./types";

// Physics constants (Matched to GameScene)
const PHYSICS_CONFIG = {
    friction: 0.985,
    minVelocity: 0.5,
    maxShootPower: 1200,
    aimLineLength: 120,
    wallBounce: 0.7,
    ballCollisionBounce: 0.9,
    ballRadius: 25,
};

interface PhysicsBall extends Ball {
    sprite: Phaser.Physics.Arcade.Sprite | null;
    velocityX: number;
    velocityY: number;
    isMoving: boolean;
    isHazard?: boolean;
}

interface SlotZone {
    x: number;
    y: number;
    radius: number;
    index: number;
    filled: boolean;
    filledValue: number | null;
    occupiedBall: PhysicsBall | null;
    graphics: Phaser.GameObjects.Container;
    checkmark: Phaser.GameObjects.Text | null;
}

export class TutorialScene extends Phaser.Scene {
    // Game State
    private balls: PhysicsBall[] = [];
    private slots: SlotZone[] = [];
    private obstacles: { list: Phaser.GameObjects.Rectangle[], bodies: Phaser.Geom.Rectangle[] } = { list: [], bodies: [] };
    private currentEquation!: Equation | ComplexEquation;
    private curStep: number = 0;
    private isLocked = true;

    // Physics State
    private aimingBall: PhysicsBall | null = null;
    private aimStartPoint: Phaser.Math.Vector2 | null = null;
    private aimLine: Phaser.GameObjects.Graphics | null = null;
    private powerIndicator: Phaser.GameObjects.Graphics | null = null;
    private tableBounds!: { left: number; right: number; top: number; bottom: number };
    private cueBall: PhysicsBall | null = null;
    private lastMineExplosionTime: number = 0;

    // UI
    private poolTable!: Phaser.GameObjects.Container;
    private equationText!: Phaser.GameObjects.Text;
    private targetText!: Phaser.GameObjects.Text;
    private messageText!: Phaser.GameObjects.Text;
    private headerBg!: Phaser.GameObjects.Graphics;

    // Tutorial Steps
    // Updated steps with new instructions
    private steps = [
        {
            text: "ยินดีต้อนรับ! 🎱\nลากบอลขาวเพื่อเล็ง\nปล่อยเพื่อยิงลูกบอลเลข 2",
            equation: { leftOperand: 0, rightOperand: 2, operator: '+', result: 2 } as any,
            setup: (width: number, height: number) => ({
                balls: [{ value: 2, x: width / 2, y: this.tableBounds.bottom - 150 }]
            })
        },
        {
            text: "เก่งมาก! ทำให้ผลลัพธ์เป็น 5\n(ถ้าผิด กดที่ลูกบอลในช่องเพื่อนำออก)",
            equation: { leftOperand: 2, rightOperand: 3, operator: '+', result: 5 } as any,
            setup: (width: number, height: number) => ({
                balls: [
                    { value: 2, x: width / 2 - 60, y: this.tableBounds.bottom - 150 },
                    { value: 3, x: width / 2 + 60, y: this.tableBounds.bottom - 150 }
                ]
            })
        },
        {
            text: "ระวังลูกระเบิด! 💣\nอย่าชนมันนะ",
            equation: { leftOperand: 5, rightOperand: 1, operator: '-', result: 4 } as any,
            setup: (width: number, height: number) => ({
                balls: [
                    { value: 5, x: width / 2 - 80, y: this.tableBounds.bottom - 150 },
                    { value: 1, x: width / 2 + 80, y: this.tableBounds.bottom - 150 },
                    { value: 99, x: width / 2, y: (this.tableBounds.top + this.tableBounds.bottom) / 2, isHazard: true }
                ]
            })
        }
    ];

    private bgMusic!: Phaser.Sound.BaseSound;
    private soundBallDrop!: Phaser.Sound.BaseSound;
    private soundBallRattle!: Phaser.Sound.BaseSound;
    private soundSuccess!: Phaser.Sound.BaseSound;
    private soundBallClick!: Phaser.Sound.BaseSound;

    constructor() { super({ key: "TutorialScene" }); }

    preload() {
        for (let i = 1; i <= 10; i++) this.load.image(`ball-${i}`, `/assets/images/billiards/ball-${i}.png`);
        this.load.image("goal-ball", "/assets/images/billiards/goal-ball.png");
        this.load.audio("ball-drop", "/assets/sounds/billiards/ball-drop.mp3");
        this.load.image("ball-trap", "/assets/images/billiards/ball-trap.png");
        this.load.audio("ball-rattle", "/assets/sounds/billiards/ball-rattle.mp3");
        this.load.audio("success", "/assets/sounds/billiards/success.mp3");
        this.load.audio("bg-music", "/assets/sounds/billiards/bg-music.mp3");
        this.load.audio("ball-click", "/assets/sounds/billiards/ball-rattle.mp3");
    }

    create() {
        this.createPoolTable();
        this.createUI();

        this.aimLine = this.add.graphics().setDepth(100);
        this.powerIndicator = this.add.graphics().setDepth(100);

        try {
            this.soundBallClick = this.sound.add("ball-click", { volume: 0.5 });
            this.soundBallDrop = this.sound.add("ball-drop", { volume: 0.6 });
            this.soundBallRattle = this.sound.add("ball-rattle", { volume: 0.7 });
            this.soundSuccess = this.sound.add("success", { volume: 0.8 });
            this.bgMusic = this.sound.add("bg-music", { volume: 0.3, loop: true });
            this.bgMusic.play();
        } catch (e) { console.warn(e); }

        this.setupAimingControls();
        this.events.on("update", this.update, this);
        this.scale.on("resize", () => this.scene.restart());

        this.startStep(0);
    }

    startStep(stepIndex: number) {
        if (stepIndex >= this.steps.length) {
            this.completeTutorial();
            return;
        }

        this.curStep = stepIndex;
        const config = this.steps[stepIndex];
        const { width, height } = this.scale;

        this.cleanupBalls();
        this.cleanupSlots();
        this.isLocked = true;
        this.currentEquation = config.equation;

        this.messageText.setText(config.text);

        // Setup Balls
        const setup = config.setup(width, height);
        this.createBalls(setup.balls);

        // Setup UI
        // Step 0: Only Target
        // Step 1+: Slots
        if (this.curStep > 0) {
            this.createSlotZones();
        } else {
            this.targetText.setText(`เป้าหมาย: ${config.equation.result}`);
        }

        this.time.delayedCall(1000, () => this.isLocked = false);
    }

    // --- PHYSICS LOOP ---

    update(time: number, delta: number) {
        this.updateBallPhysics(delta);
        if (this.aimingBall && this.aimStartPoint) {
            this.updateAimLine();
        }
    }

    updateBallPhysics(delta: number) {
        const dt = delta / 16.67;
        const allBalls = this.cueBall ? [this.cueBall, ...this.balls] : this.balls;

        allBalls.forEach((ball) => {
            if (!ball.container || ball.isPlaced) return;

            // Friction
            ball.velocityX *= Math.pow(PHYSICS_CONFIG.friction, dt);
            ball.velocityY *= Math.pow(PHYSICS_CONFIG.friction, dt);

            const speed = Math.sqrt(ball.velocityX ** 2 + ball.velocityY ** 2);
            if (speed < PHYSICS_CONFIG.minVelocity) {
                ball.velocityX = 0;
                ball.velocityY = 0;
                if (ball.isMoving) {
                    ball.isMoving = false;
                    this.checkBallInSlot(ball);
                }
                return;
            }

            ball.isMoving = true;
            let newX = ball.container.x + ball.velocityX * dt;
            let newY = ball.container.y + ball.velocityY * dt;

            // Wall Collision
            const r = PHYSICS_CONFIG.ballRadius;
            if (newX - r < this.tableBounds.left) { newX = this.tableBounds.left + r; ball.velocityX *= -PHYSICS_CONFIG.wallBounce; }
            if (newX + r > this.tableBounds.right) { newX = this.tableBounds.right - r; ball.velocityX *= -PHYSICS_CONFIG.wallBounce; }
            if (newY - r < this.tableBounds.top) { newY = this.tableBounds.top + r; ball.velocityY *= -PHYSICS_CONFIG.wallBounce; }
            if (newY + r > this.tableBounds.bottom) { newY = this.tableBounds.bottom - r; ball.velocityY *= -PHYSICS_CONFIG.wallBounce; }

            ball.container.setPosition(newX, newY);
            ball.x = newX;
            ball.y = newY;
            this.checkObstacleCollision(ball);
        });

        this.checkBallCollisions();
    }

    checkBallCollisions() {
        const allBalls = this.cueBall ? [this.cueBall, ...this.balls] : this.balls;
        const r = PHYSICS_CONFIG.ballRadius;

        for (let i = 0; i < allBalls.length; i++) {
            for (let j = i + 1; j < allBalls.length; j++) {
                const b1 = allBalls[i];
                const b2 = allBalls[j];
                if (b1.isPlaced || b2.isPlaced) continue;

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = r * 2;

                if (dist < minDist && dist > 0) {
                    if (b1.isHazard || b2.isHazard) {
                        this.handleMineExplosion();
                        return;
                    }

                    const nx = dx / dist; const ny = dy / dist;
                    const dvx = b1.velocityX - b2.velocityX;
                    const dvy = b1.velocityY - b2.velocityY;
                    const p = dvx * nx + dvy * ny;

                    if (p > 0) {
                        const impulse = p * PHYSICS_CONFIG.ballCollisionBounce;
                        b1.velocityX -= impulse * nx; b1.velocityY -= impulse * ny;
                        b2.velocityX += impulse * nx; b2.velocityY += impulse * ny;

                        const overlap = (minDist - dist) / 2;
                        b1.x -= overlap * nx; b1.y -= overlap * ny;
                        b2.x += overlap * nx; b2.y += overlap * ny;

                        if (b1.container) b1.container.setPosition(b1.x, b1.y);
                        if (b2.container) b2.container.setPosition(b2.x, b2.y);

                        b1.isMoving = true; b2.isMoving = true;
                        this.soundBallRattle.play();
                    }
                }
            }
        }
    }

    checkObstacleCollision(ball: PhysicsBall) { }

    handleMineExplosion() {
        if (Date.now() - this.lastMineExplosionTime < 1000) return;
        this.lastMineExplosionTime = Date.now();
        this.cameras.main.shake(200, 0.01);
        this.soundBallRattle.play();
        [this.cueBall, ...this.balls].forEach(b => {
            if (b?.container) {
                b.velocityX = Phaser.Math.Between(-200, 200);
                b.velocityY = Phaser.Math.Between(-200, 200);
                b.isMoving = true;
            }
        });
    }

    // --- MECHANICS ---

    checkBallInSlot(ball: PhysicsBall) {
        if (ball.isPlaced || !ball.container || ball.isHazard || ball === this.cueBall) return;

        // Step 0: No visible slots, just pot "2"
        if (this.curStep === 0) {
            // Check if ball fell into any pocket
            // For tutorial "Pockets" are visual, we need logical pockets or just assume table bounds exit?
            // Actually main game has slots ON TABLE.
            // Step 0 we just want them to hit the 2.
            // Let's implement actual pockets for Step 0?
            // Or just make it win if they hit the 2 with cue ball?
            // "shoot ball 2" -> implies potting it?
            // Simplified: If ball 2 moves fast enough after collision, win.
            // Better: If ball 2 hits a wall?
            // Best: Just win if they hit it.
            return;
        }

        for (const slot of this.slots) {
            if (slot.filled) continue;
            const dist = Phaser.Math.Distance.Between(ball.x, ball.y, slot.x, slot.y);
            if (dist < slot.radius * 2.0) {
                this.fillSlot(slot, ball);
                return;
            }
        }
    }

    fillSlot(slot: SlotZone, ball: PhysicsBall) {
        slot.filled = true;
        slot.filledValue = ball.value;
        slot.occupiedBall = ball;
        ball.isPlaced = true;
        this.tweens.add({ targets: ball.container, x: slot.x, y: slot.y, scale: 0.85, duration: 250, ease: "Back.out" });
        const ph = slot.graphics.getAt(2) as Phaser.GameObjects.Text;
        if (ph) ph.setVisible(false);
        this.soundBallDrop.play();
        this.checkAnswer();
    }

    checkAnswer() {
        if (this.curStep === 0) return;
        const filled = this.slots.filter(s => s.filled);
        if (filled.length < this.slots.length) return;

        const vals = filled.sort((a, b) => a.index - b.index).map(s => s.filledValue!);
        const eq = this.currentEquation as any;
        let correct = false;

        // Calc
        const res = eq.operator === '-' ? vals[0] - vals[1] : vals[0] + vals[1];
        if (Math.abs(res - eq.result) < 0.1) correct = true;

        if (correct) {
            this.nextStep();
        } else {
            this.soundBallRattle.play();
            this.cameras.main.shake(100, 0.01);
            this.time.delayedCall(1000, () => this.ejectAll());
        }
    }

    ejectAll() {
        this.slots.forEach(s => {
            if (s.filled && s.occupiedBall) {
                const b = s.occupiedBall;
                b.isPlaced = false; b.isMoving = true;
                b.velocityY = 50; b.velocityX = Phaser.Math.Between(-20, 20);
                s.filled = false; s.occupiedBall = null;
                const ph = s.graphics.getAt(2) as Phaser.GameObjects.Text;
                if (ph) ph.setVisible(true);
                this.tweens.add({ targets: b.container, scale: 1, duration: 200 });
            }
        });
    }

    setupAimingControls() {
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (this.isLocked || !this.cueBall?.container || this.cueBall.isMoving) return;
            const d = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.cueBall.x, this.cueBall.y);
            if (d < 45) {
                this.aimingBall = this.cueBall;
                this.aimStartPoint = new Phaser.Math.Vector2(pointer.x, pointer.y);
                this.soundBallClick.play();
                this.tweens.add({ targets: this.cueBall.container, scale: 1.15, duration: 100 });
            }
        });

        this.input.on("pointerup", () => {
            if (this.aimingBall && this.aimStartPoint) {
                const pointer = this.input.activePointer;
                const dx = this.aimStartPoint.x - pointer.x;
                const dy = this.aimStartPoint.y - pointer.y;
                const len = Math.sqrt(dx * dx + dy * dy);

                // Check Min Drag
                if (len > 15) {
                    // Normalized Power Calc (Match GameScene)
                    const power = Math.min(len / 150, 1);
                    const dirX = dx / len;
                    const dirY = dy / len;

                    // GameScene uses: dir * power * maxShootPower / 60
                    this.aimingBall.velocityX = dirX * power * PHYSICS_CONFIG.maxShootPower / 60;
                    this.aimingBall.velocityY = dirY * power * PHYSICS_CONFIG.maxShootPower / 60;
                    this.aimingBall.isMoving = true;
                    this.soundBallDrop.play(); // "thud"
                }
                this.tweens.add({ targets: this.aimingBall.container, scale: 1, duration: 100 });

                // Step 0 Check: Did we shoot?
                if (this.curStep === 0) {
                    this.time.delayedCall(1500, () => {
                        // Win if we moved ball 2 
                        const b2 = this.balls.find(b => b.value === 2);
                        if (b2 && (b2.x !== b2.originalX || b2.y !== b2.originalY)) {
                            // It moved
                            this.nextStep();
                        }
                    });
                }
            }
            this.aimingBall = null;
            this.aimLine?.clear();
            this.powerIndicator?.clear();
        });
    }

    updateAimLine() {
        if (!this.aimLine || !this.aimingBall || !this.aimStartPoint) return;
        const pointer = this.input.activePointer;
        const ballX = this.aimingBall.container.x;
        const ballY = this.aimingBall.container.y;

        // Reverse drag
        const dx = this.aimStartPoint.x - pointer.x;
        const dy = this.aimStartPoint.y - pointer.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len < 10) { this.aimLine.clear(); return; }

        const power = Math.min(len / 150, 1);
        const aimLen = PHYSICS_CONFIG.aimLineLength * power;
        const dirX = dx / len;
        const dirY = dy / len;

        this.aimLine.clear();
        this.aimLine.lineStyle(4, 0xffffff, 0.9);
        const segs = 8;
        for (let i = 0; i < segs; i++) {
            const start = (i / segs) * aimLen + 20;
            const end = ((i + 0.6) / segs) * aimLen + 20;
            this.aimLine.moveTo(ballX + dirX * start, ballY + dirY * start);
            this.aimLine.lineTo(ballX + dirX * end, ballY + dirY * end);
        }
        this.aimLine.strokePath();

        // Power Ring
        if (this.powerIndicator) {
            this.powerIndicator.clear();
            const r = Math.floor(255 * power);
            const g = Math.floor(255 * (1 - power));
            this.powerIndicator.lineStyle(5, (r << 16) | (g << 8), 0.8);
            this.powerIndicator.strokeCircle(ballX, ballY, 35 + power * 20);
        }
    }

    nextStep() {
        this.soundSuccess.play();
        this.time.delayedCall(1500, () => this.startStep(this.curStep + 1));
    }

    completeTutorial() {
        this.messageText.setText("สมบูรณ์แบบ! 🎉\nพร้อมเล่นจริงแล้ว");
        this.game.events.emit('tutorial-show-next-btn', false);
        this.time.delayedCall(2000, () => {
            const onComplete = this.registry.get('onTutorialComplete');
            if (onComplete) onComplete();
        });
    }

    // --- VISUALS ---

    createPoolTable() {
        const { width, height } = this.scale;

        // Move table SIGNIFICANTLY down to clear top UI
        const tableY = height / 2 + 80;

        this.poolTable = this.add.container(width / 2, tableY);

        const tableWidth = width * 0.85;
        const tableHeight = height * 0.55;
        this.tableBounds = {
            left: width / 2 - tableWidth / 2, right: width / 2 + tableWidth / 2,
            top: tableY - tableHeight / 2, bottom: tableY + tableHeight / 2
        };

        const border = this.add.graphics();
        border.fillStyle(0x8b4513);
        border.fillRoundedRect(-tableWidth / 2 - 15, -tableHeight / 2 - 15, tableWidth + 30, tableHeight + 30, 20);
        this.poolTable.add(border);

        const felt = this.add.graphics();
        felt.fillStyle(0x0d5d3d);
        felt.fillRoundedRect(-tableWidth / 2, -tableHeight / 2, tableWidth, tableHeight, 15);
        this.poolTable.add(felt);
    }

    createUI() {
        const { width, height } = this.scale;

        // Header Card (Lower position to avoid top overlay)
        const headerY = height * 0.20;
        const safeWidth = Math.min(width * 0.9, 600);

        this.headerBg = this.add.graphics();
        this.headerBg.fillStyle(0x2B2115, 0.95);
        this.headerBg.fillRoundedRect(width / 2 - safeWidth / 2, headerY - 50, safeWidth, 100, 16);
        this.headerBg.lineStyle(3, 0x8B7355, 1);
        this.headerBg.strokeRoundedRect(width / 2 - safeWidth / 2, headerY - 50, safeWidth, 100, 16);
        this.headerBg.setDepth(90);

        this.messageText = this.add.text(width / 2, headerY, "", {
            fontFamily: "Sarabun, sans-serif", fontSize: "24px",
            color: "#FFFFFF", fontStyle: "bold", align: 'center',
            wordWrap: { width: safeWidth - 60 },
            padding: { top: 10, bottom: 10 }
        }).setOrigin(0.5).setDepth(100);

        // Equation Header - Attached to Pool Table container (offset from top of felt)
        // Local Y relative to table center (0,0)
        // Table top is roughly -tableHeight/2.
        const tableHeight = height * 0.55;
        const localEqY = (-tableHeight / 2) + 40;

        const headerBgEq = this.add.graphics();
        headerBgEq.fillStyle(0x000000, 0.3); // Semi-transparent
        headerBgEq.fillRoundedRect(-120, localEqY - 22, 240, 44, 12);
        this.poolTable.add(headerBgEq);

        this.targetText = this.add.text(0, localEqY, "", {
            fontFamily: "Arial", fontSize: "28px", color: "#FFF", fontStyle: "bold",
            stroke: "#000", strokeThickness: 3
        }).setOrigin(0.5);
        this.poolTable.add(this.targetText);

        this.game.events.emit('tutorial-show-next-btn', false);
    }

    createBalls(ballsConfig: any[]) {
        const { width } = this.scale;
        this.cueBall = this.createCueBall(width / 2, this.tableBounds.bottom - 60);
        ballsConfig.forEach(b => {
            const ball = this.createPhysicsBall(b.value, b.x, b.y, b.isHazard);
            this.balls.push(ball);
        });
    }

    // --- VISUALS (Methods replaced by createUI replacement above, but keeping helpers here if needed, cleaning up duplicates) ---
    // Wait, I am replacing methods that are defined twice now? No.
    // I need to replace the Existing methods at the bottom of the file with the new logic if I didn't already.
    // The previous tool calls tried to replace content at the bottom.
    // Let's replace the bottom methods: createPoolTable, createUI, createBalls, createCueBall, createPhysicsBall, createSlotZones.

    // Actually, I can just delete the old methods at the bottom and insert the new ones.
    // But `multi_replace` is safer if I target them.

    // I will replace the visual methods at the bottom.

    // Exact copy of visual construction
    createCueBall(x: number, y: number): PhysicsBall {
        const container = this.add.container(x, y);
        const r = PHYSICS_CONFIG.ballRadius;

        // Shadow
        container.add(this.add.circle(3, 3, r, 0x000000, 0.3));
        // White Ball
        container.add(this.add.circle(0, 0, r, 0xffffff).setStrokeStyle(2, 0xcccccc));
        // Dot
        container.add(this.add.circle(0, 0, r * 0.15, 0xdddddd));

        container.setSize(r * 2, r * 2);
        container.setInteractive({ useHandCursor: true });
        container.setDepth(20);

        return {
            id: 0, value: 0, x, y, container, originalX: x, originalY: y,
            isDragging: false, isPlaced: false, velocityX: 0, velocityY: 0, isMoving: false, sprite: null
        };
    }

    createPhysicsBall(value: number, x: number, y: number, isHazard = false): PhysicsBall {
        const container = this.add.container(x, y);
        const r = PHYSICS_CONFIG.ballRadius;

        if (isHazard) {
            const ballImage = this.add.image(0, 0, "ball-trap");
            ballImage.setDisplaySize(r * 2.1, r * 2.1);
            container.add(ballImage);
        } else {
            container.add(this.add.image(0, 0, `ball-${value}`).setDisplaySize(r * 2, r * 2));
        }

        container.setSize(r * 2, r * 2);
        container.setInteractive({ useHandCursor: true });
        container.setDepth(20);

        return {
            id: value, value, x, y, originalX: x, originalY: y,
            container, isDragging: false, isPlaced: false,
            velocityX: 0, velocityY: 0, isMoving: false, sprite: null, isHazard
        };
    }

    createSlotZones() {
        this.cleanupSlots();
        const { width } = this.scale;

        const eq = this.currentEquation as any;
        const count = 2; // Fixed
        const spacing = 120;
        const slotY = this.tableBounds.top + 100; // Moved down to avoid Target text overlap
        const startX = width / 2 - ((count - 1) * spacing) / 2;

        this.targetText.setText(`เป้าหมาย: ${eq.result}`);

        for (let i = 0; i < count; i++) {
            const cx = startX + i * spacing;
            const c = this.add.container(cx, slotY);
            c.setDepth(10); // Slots at depth 10

            // Visuals (Match GameScene)
            c.add(this.add.circle(0, 0, 33, 0x00ffff, 0.25)); // Glow
            c.add(this.add.circle(0, 0, 25, 0x1a1a2e, 0.9).setStrokeStyle(4, 0x00ffff));
            c.add(this.add.text(0, 0, "?", { fontSize: '26px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5));

            if (i < count - 1) {
                const opText = this.add.text(spacing / 2, 0, eq.operator, { fontSize: '32px', color: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
                c.add(opText);
            }

            this.slots.push({
                x: cx, y: slotY, radius: 25, index: i, filled: false, filledValue: null,
                occupiedBall: null, graphics: c, checkmark: null
            });

            const hit = new Phaser.Geom.Circle(0, 0, 25);
            c.setInteractive(hit, Phaser.Geom.Circle.Contains);
            c.on('pointerdown', () => this.ejectBallFromSlot(this.slots[i]));
        }
    }

    ejectBallFromSlot(slot: SlotZone) {
        if (!slot.filled || !slot.occupiedBall) return;
        const ball = slot.occupiedBall;

        slot.filled = false; slot.occupiedBall = null;
        const ph = slot.graphics.getAt(2) as Phaser.GameObjects.Text;
        ph.setVisible(true);

        ball.isPlaced = false; ball.isMoving = true;
        ball.velocityY = 50; ball.velocityX = Phaser.Math.Between(-20, 20);

        this.tweens.add({ targets: ball.container, scale: 1, duration: 200 });
        this.soundBallClick.play();
    }

    cleanupBalls() {
        if (this.cueBall) this.cueBall.container.destroy();
        this.balls.forEach(b => b.container.destroy());
        this.balls = [];
        this.cueBall = null;
    }

    cleanupSlots() {
        this.slots.forEach(s => s.graphics.destroy());
        this.slots = [];
    }
}
