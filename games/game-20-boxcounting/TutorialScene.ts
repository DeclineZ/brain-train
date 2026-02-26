import * as Phaser from 'phaser';
import { CUBE_COLORS, type Block3D, type Puzzle3D } from './levels';

// ─── Thai-safe text style helper ───
const FONT_FAMILY = "'Noto Sans Thai', 'Segoe UI', sans-serif";
function thaiStyle(overrides: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
    return {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: '#333333',
        align: 'center',
        padding: { top: 10, bottom: 8, left: 6, right: 6 },
        ...overrides,
    };
}

// ─── Tutorial puzzle data ───
const TUTORIAL_PUZZLES: Puzzle3D[] = [
    {
        blocks: [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 },
        ],
        answer: 3,
    },
    {
        blocks: [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 },
            { x: 0, y: 0, z: 1 },
        ],
        answer: 5,
    },
];

// ─── Colors ───
const COLORS = {
    BG: 0xFAFAFA,
    GREEN: 0x58CC02,
    GREEN_DARK: 0x46A302,
    RED: 0xFF3B30,
    WHITE: 0xFFFFFF,
    OVERLAY: 0x000000,
    BADGE_BG: 0xFFF7ED,
    BADGE_BORDER: 0xFB923C,
};

export class BoxCountingTutorialScene extends Phaser.Scene {
    private currentStep = 0;
    // Steps: 0=welcome, 1=showQ1, 2=waitQ1, 3=showQ2, 4=waitQ2, 5=finish
    private currentPuzzleIndex = 0;
    private currentAnswer = 0;
    private optionButtons: Phaser.GameObjects.Container[] = [];
    private isInputLocked = false;

    constructor() {
        super('BoxCountingTutorialScene');
    }

    preload() {
        const soundBase = '/assets/sounds';
        if (!this.cache.audio.exists('bc-correct')) {
            this.load.audio('bc-correct', `${soundBase}/match-success.mp3`);
        }
        if (!this.cache.audio.exists('bc-wrong')) {
            this.load.audio('bc-wrong', `${soundBase}/match-fail.mp3`);
        }
        if (!this.cache.audio.exists('bc-complete')) {
            this.load.audio('bc-complete', `${soundBase}/success.mp3`);
        }
        if (!this.cache.audio.exists('bc-bgm')) {
            this.load.audio('bc-bgm', '/assets/game-20-boxcounting/bgm.mp3');
        }
    }

    create() {
        this.currentStep = 0;
        this.currentPuzzleIndex = 0;
        this.isInputLocked = false;

        // Start BGM
        try {
            const bgm = this.sound.add('bc-bgm', { volume: 0.25, loop: true });
            bgm.play();
        } catch (e) { /* ignore */ }

        this.showWelcome();
    }

    // ==========================================
    // STEP 0: WELCOME
    // ==========================================
    private showWelcome() {
        this.children.removeAll(true);
        const w = this.scale.width;
        const h = this.scale.height;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(COLORS.BG, 1);
        bg.fillRect(0, 0, w, h);

        // Overlay
        bg.fillStyle(COLORS.OVERLAY, 0.3);
        bg.fillRect(0, 0, w, h);

        // Card
        const cardW = w * 0.85;
        const cardH = h * 0.45;
        const cardX = (w - cardW) / 2;
        const cardY = (h - cardH) / 2.5;

        const card = this.add.graphics();
        card.fillStyle(COLORS.WHITE, 1);
        card.fillRoundedRect(cardX, cardY, cardW, cardH, 24);

        // Emoji
        this.add.text(w / 2, cardY + cardH * 0.15, '🧊', thaiStyle({
            fontSize: '56px',
        })).setOrigin(0.5);

        // Title
        this.add.text(w / 2, cardY + cardH * 0.38, 'นับลูกบาศก์', thaiStyle({
            fontSize: `${Math.min(28, w * 0.06)}px`,
            fontStyle: 'bold',
            color: '#333333',
        })).setOrigin(0.5);

        // Description
        this.add.text(w / 2, cardY + cardH * 0.58, 'สังเกตภาพดีๆ\nลองนับดูว่ามีลูกบาศก์กี่อัน\nแล้วเลือกคำตอบที่ถูกต้อง', thaiStyle({
            fontSize: `${Math.min(18, w * 0.04)}px`,
            color: '#666666',
            lineSpacing: 8,
        })).setOrigin(0.5);

        // Start button
        const btnW = cardW * 0.7;
        const btnH = 56;
        const btnX = w / 2;
        const btnY = cardY + cardH * 0.85;

        const btnContainer = this.add.container(btnX, btnY);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(COLORS.GREEN, 1);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
        // Shadow border
        btnBg.fillStyle(COLORS.GREEN_DARK, 1);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2 + btnH - 6, btnW, 6, { bl: 16, br: 16, tl: 0, tr: 0 });

        const btnText = this.add.text(0, -2, 'เริ่มเลย!', thaiStyle({
            fontSize: `${Math.min(22, w * 0.05)}px`,
            fontStyle: 'bold',
            color: '#FFFFFF',
        })).setOrigin(0.5);

        btnContainer.add([btnBg, btnText]);

        const hitArea = new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH);
        btnContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        btnContainer.on('pointerdown', () => {
            this.showQuestionStep(0);
        });
    }

    // ==========================================
    // QUESTION STEPS
    // ==========================================
    private showQuestionStep(puzzleIndex: number) {
        this.currentPuzzleIndex = puzzleIndex;
        this.isInputLocked = false;
        this.optionButtons = [];
        this.children.removeAll(true);

        const w = this.scale.width;
        const h = this.scale.height;
        const puzzle = TUTORIAL_PUZZLES[puzzleIndex];
        this.currentAnswer = puzzle.answer;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(COLORS.BG, 1);
        bg.fillRect(0, 0, w, h);

        // Instruction text above question
        const instrFontSize = Math.min(16, w * 0.035);
        if (puzzleIndex === 0) {
            this.add.text(w / 2, h * 0.08, '👀 สังเกตดีๆ นับกล่องให้ครบ!', thaiStyle({
                fontSize: `${instrFontSize}px`,
                color: '#FF9500',
                fontStyle: 'bold',
            })).setOrigin(0.5, 0);
        } else {
            this.add.text(w / 2, h * 0.08, '🤔 อย่าลืมนับกล่องที่ซ้อนกันด้วยนะ!', thaiStyle({
                fontSize: `${instrFontSize}px`,
                color: '#FF9500',
                fontStyle: 'bold',
            })).setOrigin(0.5, 0);
        }

        // Question text
        const fontSize = Math.min(24, w * 0.05);
        this.add.text(w / 2, h * 0.14, 'มีลูกบาศก์อยู่ในภาพกี่อัน?', thaiStyle({
            fontSize: `${fontSize}px`,
            fontStyle: 'bold',
        })).setOrigin(0.5, 0);

        // Question counter
        this.add.text(w / 2, h * 0.19, `ข้อ ${puzzleIndex + 1} / 2`, thaiStyle({
            fontSize: `${Math.min(14, w * 0.03)}px`,
            color: '#999999',
        })).setOrigin(0.5, 0);

        // Draw the 3D isometric scene
        this.drawIsometricScene(w / 2, h * 0.42, h * 0.35, puzzle.blocks, 3);

        // Options
        this.drawOptions(w, h * 0.70, h, puzzle.answer);

        // Progress dots
        this.drawProgressDots(w, h, puzzleIndex);
    }

    // ==========================================
    // 3D RENDERING (copied from GameScene)
    // ==========================================
    private drawIsometricScene(centerX: number, centerY: number, maxSize: number, blocks: Block3D[], gridSize: number) {
        const cellSize = maxSize / (gridSize * 1.4);
        const halfCell = cellSize / 2;

        const toIsoX = (gx: number, gy: number) => (gx - gy) * halfCell;
        const toIsoY = (gx: number, gy: number, gz: number = 0) =>
            (gx + gy) * halfCell * 0.5 - gz * cellSize * 0.6;

        const gridCenterX = toIsoX(gridSize / 2, gridSize / 2);
        const gridCenterY = toIsoY(gridSize / 2, gridSize / 2);
        const offsetX = centerX - gridCenterX;
        const offsetY = centerY - gridCenterY;

        // Grid lines
        const gridGraphics = this.add.graphics();
        gridGraphics.lineStyle(1.5, 0xAAAAAA, 1);

        for (let i = 0; i <= gridSize; i++) {
            const x1 = toIsoX(i, 0) + offsetX;
            const y1 = toIsoY(i, 0) + offsetY;
            const x2 = toIsoX(i, gridSize) + offsetX;
            const y2 = toIsoY(i, gridSize) + offsetY;
            this.drawDottedLine(gridGraphics, x1, y1, x2, y2, 5, 5);

            const x3 = toIsoX(0, i) + offsetX;
            const y3 = toIsoY(0, i) + offsetY;
            const x4 = toIsoX(gridSize, i) + offsetX;
            const y4 = toIsoY(gridSize, i) + offsetY;
            this.drawDottedLine(gridGraphics, x3, y3, x4, y4, 5, 5);
        }

        const sortedBlocks = [...blocks].sort((a, b) => {
            return (a.x + a.y + a.z * 0.1) - (b.x + b.y + b.z * 0.1);
        });

        for (const block of sortedBlocks) {
            const isoX = toIsoX(block.x + 0.5, block.y + 0.5) + offsetX;
            const isoY = toIsoY(block.x + 0.5, block.y + 0.5, block.z) + offsetY;
            const colorIdx = Math.min(block.z, CUBE_COLORS.length - 1);
            this.drawIsometricBox(isoX, isoY, cellSize, halfCell, CUBE_COLORS[colorIdx]);
        }
    }

    private drawDottedLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, dashLen: number, gapLen: number) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / dist;
        const uy = dy / dist;
        let drawn = 0;
        let drawing = true;
        let cx = x1, cy = y1;
        while (drawn < dist) {
            const segLen = drawing ? dashLen : gapLen;
            const len = Math.min(segLen, dist - drawn);
            if (drawing) {
                g.beginPath();
                g.moveTo(cx, cy);
                g.lineTo(cx + ux * len, cy + uy * len);
                g.strokePath();
            }
            cx += ux * len;
            cy += uy * len;
            drawn += len;
            drawing = !drawing;
        }
    }

    private drawIsometricBox(cx: number, cy: number, cellSize: number, halfCell: number, colors: { top: number; left: number; right: number }) {
        const half = halfCell * 0.92;
        const quarterH = half * 0.5;
        const boxHeight = cellSize * 0.55;
        const g = this.add.graphics();

        const baseTop = { x: cx, y: cy - quarterH };
        const baseRight = { x: cx + half, y: cy };
        const baseBottom = { x: cx, y: cy + quarterH };
        const baseLeft = { x: cx - half, y: cy };

        // Top face
        g.fillStyle(colors.top, 1);
        g.beginPath();
        g.moveTo(baseTop.x, baseTop.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y - boxHeight);
        g.lineTo(baseBottom.x, baseBottom.y - boxHeight);
        g.lineTo(baseLeft.x, baseLeft.y - boxHeight);
        g.closePath(); g.fillPath();

        // Left face
        g.fillStyle(colors.left, 1);
        g.beginPath();
        g.moveTo(baseLeft.x, baseLeft.y - boxHeight);
        g.lineTo(baseBottom.x, baseBottom.y - boxHeight);
        g.lineTo(baseBottom.x, baseBottom.y);
        g.lineTo(baseLeft.x, baseLeft.y);
        g.closePath(); g.fillPath();

        // Right face
        g.fillStyle(colors.right, 1);
        g.beginPath();
        g.moveTo(baseBottom.x, baseBottom.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y);
        g.lineTo(baseBottom.x, baseBottom.y);
        g.closePath(); g.fillPath();

        // Outlines
        g.lineStyle(1.5, 0x000000, 0.2);
        g.beginPath();
        g.moveTo(baseTop.x, baseTop.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y - boxHeight);
        g.lineTo(baseBottom.x, baseBottom.y - boxHeight);
        g.lineTo(baseLeft.x, baseLeft.y - boxHeight);
        g.closePath(); g.strokePath();
        g.beginPath();
        g.moveTo(baseLeft.x, baseLeft.y - boxHeight);
        g.lineTo(baseLeft.x, baseLeft.y);
        g.lineTo(baseBottom.x, baseBottom.y);
        g.lineTo(baseBottom.x, baseBottom.y - boxHeight);
        g.strokePath();
        g.beginPath();
        g.moveTo(baseRight.x, baseRight.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y);
        g.lineTo(baseBottom.x, baseBottom.y);
        g.strokePath();
    }

    // ==========================================
    // OPTIONS
    // ==========================================
    private drawOptions(w: number, startY: number, h: number, correct: number) {
        const options = this.generateOptions(correct);

        const buttonW = Math.min(w * 0.35, 140);
        const buttonH = Math.min(h * 0.08, 56);
        const gapX = Math.min(w * 0.05, 24);
        const gapY = Math.min(h * 0.02, 14);

        const gridW = buttonW * 2 + gapX;
        const gridStartX = (w - gridW) / 2;

        options.forEach((value, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = gridStartX + col * (buttonW + gapX) + buttonW / 2;
            const y = startY + row * (buttonH + gapY) + buttonH / 2;

            const container = this.add.container(x, y);
            const radius = 16;

            const btnBg = this.add.graphics();
            btnBg.fillStyle(0x000000, 0.08);
            btnBg.fillRoundedRect(-buttonW / 2, -buttonH / 2 + 4, buttonW, buttonH, radius);
            btnBg.fillStyle(0xFFFFFF, 1);
            btnBg.fillRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, radius);
            btnBg.lineStyle(2.5, 0xE0E0E0, 1);
            btnBg.strokeRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, radius);
            container.add(btnBg);

            const numText = this.add.text(0, 0, `${value}`, thaiStyle({
                fontSize: `${Math.min(30, w * 0.06)}px`,
                fontStyle: 'bold',
            })).setOrigin(0.5);
            container.add(numText);

            // If correct answer, pulse it gently as a hint
            if (value === correct) {
                this.tweens.add({
                    targets: container,
                    scaleX: 1.06,
                    scaleY: 1.06,
                    duration: 600,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }

            const hitArea = new Phaser.Geom.Rectangle(-buttonW / 2, -buttonH / 2, buttonW, buttonH);
            container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

            container.on('pointerdown', () => {
                if (!this.isInputLocked) {
                    this.handleTutorialAnswer(value, options, container);
                }
            });

            this.optionButtons.push(container);
        });
    }

    private generateOptions(correct: number): number[] {
        const options = new Set<number>();
        options.add(correct);
        [correct + 1, correct - 1, correct + 2, correct - 2].filter(d => d > 0).forEach(d => {
            if (options.size < 4) options.add(d);
        });
        let fb = 1;
        while (options.size < 4) {
            if (!options.has(fb)) options.add(fb);
            fb++;
        }
        const arr = Array.from(options);
        Phaser.Utils.Array.Shuffle(arr);
        return arr;
    }

    // ==========================================
    // PROGRESS DOTS
    // ==========================================
    private drawProgressDots(w: number, h: number, activeIndex: number) {
        const dotSize = 10;
        const gap = 8;
        const total = 2;
        const totalW = dotSize * total + gap * (total - 1);
        const startX = (w - totalW) / 2;
        const y = h * 0.96;

        for (let i = 0; i < total; i++) {
            const g = this.add.graphics();
            const x = startX + (dotSize + gap) * i + dotSize / 2;
            if (i < activeIndex) {
                g.fillStyle(0x4CD964, 1);
            } else if (i === activeIndex) {
                g.fillStyle(0x5AC8FA, 1);
            } else {
                g.fillStyle(0xDDDDDD, 1);
            }
            g.fillCircle(x, y, dotSize / 2);
        }
    }

    // ==========================================
    // ANSWER HANDLING
    // ==========================================
    private handleTutorialAnswer(value: number, options: number[], button: Phaser.GameObjects.Container) {
        if (this.isInputLocked) return;
        const isCorrect = value === this.currentAnswer;

        if (!isCorrect) {
            // Shake the button, DON'T lock input — let them try again
            try { this.sound.play('bc-wrong', { volume: 0.5 }); } catch (e) { /* */ }

            this.tweens.add({
                targets: button,
                x: button.x - 8,
                duration: 50,
                yoyo: true,
                repeat: 5,
                ease: 'Linear',
            });
            return;
        }

        // Correct!
        this.isInputLocked = true;
        try { this.sound.play('bc-correct', { volume: 0.5 }); } catch (e) { /* */ }

        // Show feedback
        this.showCorrectFeedback(value, options);

        this.time.delayedCall(1200, () => {
            if (this.currentPuzzleIndex < 1) {
                // Next question
                this.showQuestionStep(1);
            } else {
                // Finish tutorial
                this.finishTutorial();
            }
        });
    }

    private showCorrectFeedback(selectedValue: number, options: number[]) {
        const w = this.scale.width;
        const h = this.scale.height;

        this.optionButtons.forEach((btn, idx) => {
            const val = options[idx];
            const btnW = Math.min(w * 0.35, 140);
            const btnH = Math.min(h * 0.08, 56);
            const radius = 16;

            this.tweens.killTweensOf(btn); // Stop pulse
            btn.setScale(1);

            const newBg = this.add.graphics();
            if (val === this.currentAnswer) {
                newBg.fillStyle(0x4CD964, 1);
                newBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
                (btn.getAt(1) as Phaser.GameObjects.Text).setColor('#FFFFFF');
            } else {
                newBg.fillStyle(0xF0F0F0, 1);
                newBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
                (btn.getAt(1) as Phaser.GameObjects.Text).setColor('#BBBBBB');
            }

            const oldBg = btn.getAt(0);
            btn.addAt(newBg, 0);
            (oldBg as Phaser.GameObjects.Graphics).destroy();
            btn.disableInteractive();
        });

        // Feedback text
        const feedback = this.add.text(w / 2, h * 0.66, '✓ ถูกต้อง! เก่งมาก!', thaiStyle({
            fontSize: `${Math.min(22, w * 0.05)}px`,
            fontStyle: 'bold',
            color: '#4CD964',
        })).setOrigin(0.5);

        this.tweens.add({
            targets: feedback,
            alpha: { from: 0, to: 1 },
            y: feedback.y - 10,
            duration: 300,
            ease: 'Back.easeOut',
        });
    }

    // ==========================================
    // FINISH
    // ==========================================
    private finishTutorial() {
        try { this.sound.play('bc-complete', { volume: 0.6 }); } catch (e) { /* */ }

        // Stop all sounds
        this.sound.stopAll();

        const onTutorialComplete = this.game.registry.get('onTutorialComplete');
        if (onTutorialComplete) {
            onTutorialComplete();
        }
    }
}
