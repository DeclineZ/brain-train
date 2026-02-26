import * as Phaser from 'phaser';
import {
    BOXCOUNTING_LEVELS,
    CUBE_COLORS,
    type BoxCountingLevelConfig,
    type Block3D,
    type Puzzle3D,
    type Puzzle2D,
} from './levels';

// --- Constants ---
const FONT_FAMILY = "'Noto Sans Thai', 'Segoe UI', sans-serif";

// 2D view cell colors
const CELL_FILLED = 0xFFB3C6;   // pink
const CELL_EMPTY = 0xF0F0F0;    // light gray
const CELL_BORDER = 0x999999;   // darker border for visibility

export class BoxCountingGameScene extends Phaser.Scene {
    // State
    private levelConfig!: BoxCountingLevelConfig;
    private currentQuestionIndex = 0;
    private totalQuestions = 2;
    private correctCount = 0;
    private score = 0;
    private isInputLocked = false;

    // Current puzzle data
    private currentAnswer = 0;

    // Timer
    private timerEvent?: Phaser.Time.TimerEvent;
    private timerBar?: Phaser.GameObjects.Graphics;
    private timerBg?: Phaser.GameObjects.Graphics;
    private timeRemaining = 0;
    private timeTotal = 0;

    // Display objects
    private optionButtons: Phaser.GameObjects.Container[] = [];
    private progressDots: Phaser.GameObjects.Graphics[] = [];

    // Audio
    private soundCorrect?: Phaser.Sound.BaseSound;
    private soundWrong?: Phaser.Sound.BaseSound;
    private soundComplete?: Phaser.Sound.BaseSound;
    private backgroundMusic?: Phaser.Sound.BaseSound;

    constructor() {
        super('BoxCountingGameScene');
    }

    init() {
        const regLevel = this.registry.get('level') || 1;
        this.levelConfig = BOXCOUNTING_LEVELS[regLevel] || BOXCOUNTING_LEVELS[1];
        this.currentQuestionIndex = 0;
        this.correctCount = 0;
        this.score = 0;
        this.isInputLocked = false;
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
        try {
            this.soundCorrect = this.sound.add('bc-correct', { volume: 0.5 });
            this.soundWrong = this.sound.add('bc-wrong', { volume: 0.5 });
            this.soundComplete = this.sound.add('bc-complete', { volume: 0.6 });
        } catch (e) { /* audio not loaded, skip */ }

        // Start BGM
        this.playBackgroundMusic();

        this.scale.on('resize', this.handleResize, this);

        // Level 16 intro for 2D mode (first time seeing orthographic views)
        if (this.levelConfig.level === 16 && this.levelConfig.mode === '2d') {
            this.game.events.emit('SHOW_INTRO', {
                title: 'มุมมองใหม่!',
                description: 'จากนี้ไปจะแสดง 3 มุมมอง:\n\n👆 ด้านบน — มองจากข้างบน\n👀 ด้านหน้า — มองจากด้านหน้า\n👉 ด้านข้าง — มองจากด้านข้าง\n\nช่องสีชมพู = มีกล่อง\nช่องเทา = ไม่มีกล่อง\n\nลองนึกภาพ 3 มิติ แล้วนับกล่องทั้งหมด!',
            });

            // Wait for START_LEVEL event from React popup
            this.game.events.once('START_LEVEL', () => {
                this.startQuestion();
            });
        } else {
            this.startQuestion();
        }
    }

    private handleResize() {
        this.renderScene();
    }

    // ==========================================
    // QUESTION FLOW
    // ==========================================

    private startQuestion() {
        this.isInputLocked = false;

        // Get current puzzle
        const puzzle = this.levelConfig.puzzles[this.currentQuestionIndex];
        if (this.levelConfig.mode === '3d') {
            this.currentAnswer = (puzzle as Puzzle3D).answer;
        } else {
            this.currentAnswer = (puzzle as Puzzle2D).answer;
        }

        this.renderScene();
        this.startTimer();
    }

    // ==========================================
    // MAIN RENDER
    // ==========================================

    private renderScene() {
        this.children.removeAll(true);
        this.optionButtons = [];
        this.progressDots = [];

        const w = this.scale.width;
        const h = this.scale.height;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0xFAFAFA, 1);
        bg.fillRect(0, 0, w, h);

        // Question text — pushed down to avoid LEVEL badge overlap
        const fontSize = Math.min(26, w * 0.055);
        this.add.text(w / 2, h * 0.11, 'มีลูกบาศก์อยู่ในภาพกี่อัน?', {
            fontFamily: FONT_FAMILY,
            fontSize: `${fontSize}px`,
            color: '#333333',
            fontStyle: 'bold',
            align: 'center',
            padding: { top: 10, bottom: 6, left: 4, right: 4 },
        }).setOrigin(0.5, 0);

        // Question counter
        this.add.text(w / 2, h * 0.16, `ข้อ ${this.currentQuestionIndex + 1} / ${this.totalQuestions}`, {
            fontFamily: FONT_FAMILY,
            fontSize: `${Math.min(16, w * 0.035)}px`,
            color: '#999999',
            align: 'center',
            padding: { top: 10, bottom: 6 },
        }).setOrigin(0.5, 0);

        // Get current puzzle
        const puzzle = this.levelConfig.puzzles[this.currentQuestionIndex];

        // Render the visualization based on mode
        if (this.levelConfig.mode === '3d') {
            this.drawIsometricScene(w / 2, h * 0.42, h * 0.36, (puzzle as Puzzle3D).blocks);
        } else {
            this.draw2DViews(w, h, (puzzle as Puzzle2D).heightMap);
        }

        // Options
        this.drawOptions(w, h * 0.73, h);

        // Timer bar
        this.drawTimerBar(w, h);

        // Progress dots
        this.drawProgressDots(w, h);
    }

    // ==========================================
    // 3D ISOMETRIC RENDERER
    // ==========================================

    private drawIsometricScene(centerX: number, centerY: number, maxSize: number, blocks: Block3D[]) {
        if (this.levelConfig.mode !== '3d') return;

        const gridSize = this.levelConfig.gridSize;
        const cellSize = maxSize / (gridSize * 1.4);
        const halfCell = cellSize / 2;

        // Isometric conversion
        const toIsoX = (gx: number, gy: number) => (gx - gy) * halfCell;
        const toIsoY = (gx: number, gy: number, gz: number = 0) =>
            (gx + gy) * halfCell * 0.5 - gz * cellSize * 0.6;

        // Center offset
        const gridCenterX = toIsoX(gridSize / 2, gridSize / 2);
        const gridCenterY = toIsoY(gridSize / 2, gridSize / 2);
        const offsetX = centerX - gridCenterX;
        const offsetY = centerY - gridCenterY;

        // Draw grid lines (dotted)
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

        // Sort blocks for correct draw order
        const sortedBlocks = [...blocks].sort((a, b) => {
            const depthA = a.x + a.y + a.z * 0.1;
            const depthB = b.x + b.y + b.z * 0.1;
            return depthA - depthB;
        });

        // Draw blocks
        for (const block of sortedBlocks) {
            const isoX = toIsoX(block.x + 0.5, block.y + 0.5) + offsetX;
            const isoY = toIsoY(block.x + 0.5, block.y + 0.5, block.z) + offsetY;

            const colorIdx = Math.min(block.z, CUBE_COLORS.length - 1);
            const colors = CUBE_COLORS[colorIdx];
            this.drawIsometricBox(isoX, isoY, cellSize, halfCell, colors);
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
            const remaining = dist - drawn;
            const len = Math.min(segLen, remaining);

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

    private drawIsometricBox(
        cx: number, cy: number,
        cellSize: number, halfCell: number,
        colors: { top: number; left: number; right: number }
    ) {
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
        g.closePath();
        g.fillPath();

        // Left face
        g.fillStyle(colors.left, 1);
        g.beginPath();
        g.moveTo(baseLeft.x, baseLeft.y - boxHeight);
        g.lineTo(baseBottom.x, baseBottom.y - boxHeight);
        g.lineTo(baseBottom.x, baseBottom.y);
        g.lineTo(baseLeft.x, baseLeft.y);
        g.closePath();
        g.fillPath();

        // Right face
        g.fillStyle(colors.right, 1);
        g.beginPath();
        g.moveTo(baseBottom.x, baseBottom.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y);
        g.lineTo(baseBottom.x, baseBottom.y);
        g.closePath();
        g.fillPath();

        // Outlines
        g.lineStyle(1.5, 0x000000, 0.2);
        g.beginPath();
        g.moveTo(baseTop.x, baseTop.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y - boxHeight);
        g.lineTo(baseBottom.x, baseBottom.y - boxHeight);
        g.lineTo(baseLeft.x, baseLeft.y - boxHeight);
        g.closePath();
        g.strokePath();
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
    // 2D ORTHOGRAPHIC VIEWS RENDERER
    // ==========================================

    private draw2DViews(w: number, h: number, heightMap: number[][]) {
        const hm = heightMap;
        const rows = hm.length;
        const cols = hm[0].length;
        const maxH = Math.max(...hm.flat());

        // Compute 3 projection views
        const frontView = this.computeFrontView(hm, rows, cols, maxH);
        const sideView = this.computeSideView(hm, rows, cols, maxH);
        const topView = this.computeTopView(hm, rows, cols);

        // Layout — fill the space between question text and options
        const viewAreaW = w * 0.92;
        const viewAreaH = h * 0.46;

        const topViewW = cols;
        const topViewH = rows;
        const frontViewW = cols;
        const frontViewH = maxH;
        const sideViewW = rows;

        const bottomRowW = frontViewW + 1 + sideViewW;
        const maxRowW = Math.max(topViewW, bottomRowW);
        const totalH = topViewH + 1.5 + Math.max(frontViewH, maxH);

        const cellSize = Math.min(
            viewAreaW / maxRowW,
            viewAreaH / totalH,
            Math.min(w, h) * 0.14  // bigger cap for larger grid cells
        );

        const labelFontSize = Math.min(16, cellSize * 0.55);
        const viewStartY = h * 0.22;

        // --- Top View ---
        const topGridW = topViewW * cellSize;
        const topGridH = topViewH * cellSize;
        const topStartX = w / 2 - topGridW / 2;
        const topStartY = viewStartY;

        this.drawGridView(topStartX, topStartY, topView, cellSize);
        this.add.text(topStartX + topGridW / 2, topStartY - labelFontSize - 4, 'ด้านบน', {
            fontFamily: FONT_FAMILY,
            fontSize: `${labelFontSize}px`,
            color: '#666666',
            fontStyle: 'bold',
            padding: { top: 4, bottom: 2 },
        }).setOrigin(0.5, 0);

        // --- Front View ---
        const bottomRowTotalW = (frontViewW + sideViewW) * cellSize + cellSize * 1.5;
        const frontStartX = w / 2 - bottomRowTotalW / 2;
        const frontStartY = topStartY + topGridH + cellSize * 1.2;
        const frontGridW = frontViewW * cellSize;

        this.drawGridView(frontStartX, frontStartY, frontView, cellSize);
        this.add.text(frontStartX + frontGridW / 2, frontStartY - labelFontSize - 4, 'ด้านหน้า', {
            fontFamily: FONT_FAMILY,
            fontSize: `${labelFontSize}px`,
            color: '#666666',
            fontStyle: 'bold',
            padding: { top: 4, bottom: 2 },
        }).setOrigin(0.5, 0);

        // --- Side View ---
        const sideStartX = frontStartX + frontGridW + cellSize * 1.5;
        const sideStartY = frontStartY;
        const sideGridW = sideViewW * cellSize;

        this.drawGridView(sideStartX, sideStartY, sideView, cellSize);
        this.add.text(sideStartX + sideGridW / 2, sideStartY - labelFontSize - 4, 'ด้านข้าง', {
            fontFamily: FONT_FAMILY,
            fontSize: `${labelFontSize}px`,
            color: '#666666',
            fontStyle: 'bold',
            padding: { top: 4, bottom: 2 },
        }).setOrigin(0.5, 0);
    }

    private computeFrontView(hm: number[][], rows: number, cols: number, maxH: number): boolean[][] {
        const view: boolean[][] = [];
        for (let z = maxH - 1; z >= 0; z--) {
            const row: boolean[] = [];
            for (let x = 0; x < cols; x++) {
                let filled = false;
                for (let y = 0; y < rows; y++) {
                    if (hm[y][x] > z) { filled = true; break; }
                }
                row.push(filled);
            }
            view.push(row);
        }
        return view;
    }

    private computeSideView(hm: number[][], rows: number, cols: number, maxH: number): boolean[][] {
        const view: boolean[][] = [];
        for (let z = maxH - 1; z >= 0; z--) {
            const row: boolean[] = [];
            for (let y = 0; y < rows; y++) {
                let filled = false;
                for (let x = 0; x < cols; x++) {
                    if (hm[y][x] > z) { filled = true; break; }
                }
                row.push(filled);
            }
            view.push(row);
        }
        return view;
    }

    private computeTopView(hm: number[][], _rows: number, _cols: number): boolean[][] {
        return hm.map(row => row.map(h => h > 0));
    }

    private drawGridView(startX: number, startY: number, grid: boolean[][], cellSize: number) {
        const g = this.add.graphics();

        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                const x = startX + c * cellSize;
                const y = startY + r * cellSize;

                g.fillStyle(grid[r][c] ? CELL_FILLED : CELL_EMPTY, 1);
                g.fillRect(x, y, cellSize, cellSize);

                g.lineStyle(2, CELL_BORDER, 1);
                g.strokeRect(x, y, cellSize, cellSize);
            }
        }
    }

    // ==========================================
    // OPTIONS
    // ==========================================

    private drawOptions(w: number, startY: number, h: number) {
        const options = this.generateOptions(this.currentAnswer);

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

            const btnBg = this.add.graphics();
            const radius = 16;

            btnBg.fillStyle(0x000000, 0.08);
            btnBg.fillRoundedRect(-buttonW / 2, -buttonH / 2 + 4, buttonW, buttonH, radius);
            btnBg.fillStyle(0xFFFFFF, 1);
            btnBg.fillRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, radius);
            btnBg.lineStyle(2.5, 0xE0E0E0, 1);
            btnBg.strokeRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, radius);

            container.add(btnBg);

            const numText = this.add.text(0, 0, `${value}`, {
                fontFamily: FONT_FAMILY,
                fontSize: `${Math.min(30, w * 0.06)}px`,
                color: '#333333',
                fontStyle: 'bold',
            }).setOrigin(0.5);
            container.add(numText);

            const hitArea = new Phaser.Geom.Rectangle(-buttonW / 2, -buttonH / 2, buttonW, buttonH);
            container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

            container.on('pointerdown', () => {
                if (!this.isInputLocked) {
                    this.handleAnswer(value, options);
                }
            });

            container.on('pointerover', () => {
                if (!this.isInputLocked) container.setScale(1.05);
            });
            container.on('pointerout', () => {
                container.setScale(1.0);
            });

            this.optionButtons.push(container);
        });
    }

    private generateOptions(correct: number): number[] {
        const options = new Set<number>();
        options.add(correct);

        const distractors = [
            correct + 1, correct - 1,
            correct + 2, correct - 2,
            correct + 3, correct - 3,
        ].filter(d => d > 0);

        Phaser.Utils.Array.Shuffle(distractors);
        for (const d of distractors) {
            if (options.size >= 4) break;
            options.add(d);
        }

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

    private drawProgressDots(w: number, h: number) {
        const dotSize = 10;
        const gap = 8;
        const totalW = dotSize * this.totalQuestions + gap * (this.totalQuestions - 1);
        const startX = (w - totalW) / 2;
        const y = h * 0.96;

        for (let i = 0; i < this.totalQuestions; i++) {
            const g = this.add.graphics();
            const x = startX + (dotSize + gap) * i + dotSize / 2;

            if (i < this.currentQuestionIndex) {
                g.fillStyle(0x4CD964, 1); // completed
            } else if (i === this.currentQuestionIndex) {
                g.fillStyle(0x5AC8FA, 1); // current
            } else {
                g.fillStyle(0xDDDDDD, 1); // pending
            }
            g.fillCircle(x, y, dotSize / 2);
            this.progressDots.push(g);
        }
    }

    // ==========================================
    // TIMER
    // ==========================================

    private drawTimerBar(w: number, h: number) {
        const barW = w * 0.7;
        const barH = 8;
        const x = (w - barW) / 2;
        const y = h * 0.91;

        this.timerBg = this.add.graphics();
        this.timerBg.fillStyle(0xEEEEEE, 1);
        this.timerBg.fillRoundedRect(x, y, barW, barH, barH / 2);

        this.timerBar = this.add.graphics();
        this.updateTimerBar();
    }

    private updateTimerBar() {
        if (!this.timerBar || !this.timerBg) return;

        const w = this.scale.width;
        const h = this.scale.height;
        const barW = w * 0.7;
        const barH = 8;
        const x = (w - barW) / 2;
        const y = h * 0.91;

        const pct = this.timeTotal > 0 ? Math.max(0, this.timeRemaining / this.timeTotal) : 1;
        const fillW = barW * pct;

        this.timerBar.clear();

        let barColor = 0x4CD964;
        if (pct < 0.25) barColor = 0xFF3B30;
        else if (pct < 0.5) barColor = 0xFF9500;

        this.timerBar.fillStyle(barColor, 1);
        if (fillW > 0) {
            this.timerBar.fillRoundedRect(x, y, fillW, barH, barH / 2);
        }
    }

    private startTimer() {
        this.timeTotal = this.levelConfig.timeLimitSeconds;
        this.timeRemaining = this.timeTotal;

        if (this.timerEvent) {
            this.timerEvent.destroy();
        }

        this.timerEvent = this.time.addEvent({
            delay: 100,
            callback: () => {
                this.timeRemaining -= 0.1;
                this.updateTimerBar();

                if (this.timeRemaining <= 0) {
                    this.timeRemaining = 0;
                    this.handleTimeout();
                }
            },
            loop: true,
        });
    }

    private stopTimer() {
        if (this.timerEvent) {
            this.timerEvent.destroy();
            this.timerEvent = undefined;
        }
    }

    // ==========================================
    // ANSWER HANDLING
    // ==========================================

    private handleAnswer(value: number, options: number[]) {
        if (this.isInputLocked) return;
        this.isInputLocked = true;
        this.stopTimer();

        const isCorrect = value === this.currentAnswer;

        if (isCorrect) {
            this.correctCount++;
            this.score += 100 + Math.round(this.timeRemaining * 10);
            try { this.soundCorrect?.play(); } catch (e) { /* ignore */ }
        } else {
            try { this.soundWrong?.play(); } catch (e) { /* ignore */ }
        }

        this.showAnswerFeedback(value, options, isCorrect);

        this.time.delayedCall(1500, () => {
            this.currentQuestionIndex++;

            if (this.currentQuestionIndex >= this.totalQuestions) {
                this.onLevelComplete();
            } else {
                this.startQuestion();
            }
        });
    }

    private handleTimeout() {
        if (this.isInputLocked) return;
        this.isInputLocked = true;
        this.stopTimer();

        try { this.soundWrong?.play(); } catch (e) { /* ignore */ }

        const options = this.optionButtons.map(btn => {
            const textObj = btn.getAt(1) as Phaser.GameObjects.Text;
            return parseInt(textObj.text);
        });
        this.showAnswerFeedback(-1, options, false);

        this.time.delayedCall(1500, () => {
            this.currentQuestionIndex++;

            if (this.currentQuestionIndex >= this.totalQuestions) {
                this.onLevelComplete();
            } else {
                this.startQuestion();
            }
        });
    }

    private showAnswerFeedback(selectedValue: number, options: number[], isCorrect: boolean) {
        const w = this.scale.width;
        const h = this.scale.height;

        this.optionButtons.forEach((btn, idx) => {
            const val = options[idx];
            const btnW = Math.min(w * 0.35, 140);
            const btnH = Math.min(h * 0.08, 56);
            const radius = 16;

            const newBg = this.add.graphics();

            if (val === this.currentAnswer) {
                newBg.fillStyle(0x4CD964, 1);
                newBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
                const textChild = btn.getAt(1) as Phaser.GameObjects.Text;
                textChild.setColor('#FFFFFF');
            } else if (val === selectedValue && !isCorrect) {
                newBg.fillStyle(0xFF3B30, 1);
                newBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
                const textChild = btn.getAt(1) as Phaser.GameObjects.Text;
                textChild.setColor('#FFFFFF');
            } else {
                newBg.fillStyle(0xF0F0F0, 1);
                newBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);
                const textChild = btn.getAt(1) as Phaser.GameObjects.Text;
                textChild.setColor('#BBBBBB');
            }

            const oldBg = btn.getAt(0);
            btn.addAt(newBg, 0);
            (oldBg as Phaser.GameObjects.Graphics).destroy();

            btn.disableInteractive();
        });

        const feedbackText = isCorrect ? '✓ ถูกต้อง!' : `✗ คำตอบคือ ${this.currentAnswer}`;
        const feedbackColor = isCorrect ? '#4CD964' : '#FF3B30';

        const feedback = this.add.text(w / 2, h * 0.66, feedbackText, {
            fontFamily: FONT_FAMILY,
            fontSize: `${Math.min(24, w * 0.05)}px`,
            color: feedbackColor,
            fontStyle: 'bold',
            align: 'center',
            padding: { top: 10, bottom: 6 },
        }).setOrigin(0.5);

        this.tweens.add({
            targets: feedback,
            alpha: { from: 0, to: 1 },
            y: feedback.y - 10,
            duration: 300,
            ease: 'Back.easeOut',
        });
    }

    // ==========================================
    // COMPLETION
    // ==========================================

    private calculateStars(): number {
        if (this.correctCount >= this.totalQuestions) return 3;
        if (this.correctCount >= 1) return 2;
        return 1;
    }

    private onLevelComplete() {
        this.stopTimer();
        this.stopBackgroundMusic();

        const stars = this.calculateStars();
        try { this.soundComplete?.play(); } catch (e) { /* ignore */ }

        this.time.delayedCall(500, () => {
            const onGameOver = this.game.registry.get('onGameOver');
            if (onGameOver) {
                onGameOver({
                    success: true,
                    level: this.levelConfig.level,
                    stars: stars,
                    score: this.score,
                    correctAnswers: this.correctCount,
                    totalQuestions: this.totalQuestions,
                    stat_focus: this.calculateStatFocus(),
                    stat_visual: this.calculateStatVisual(),
                });
            }
        });
    }

    private calculateStatFocus(): number {
        const accuracyRatio = this.correctCount / this.totalQuestions;
        return Math.round(40 + accuracyRatio * 60);
    }

    private calculateStatVisual(): number {
        const accuracyRatio = this.correctCount / this.totalQuestions;
        const levelBonus = Math.min(this.levelConfig.level * 2, 30);
        return Math.round(30 + accuracyRatio * 40 + levelBonus);
    }

    // ==========================================
    // BACKGROUND MUSIC
    // ==========================================

    private playBackgroundMusic() {
        if (this.backgroundMusic?.isPlaying) return;
        try {
            this.backgroundMusic = this.sound.add('bc-bgm', {
                volume: 0.3,
                loop: true,
            });
            this.backgroundMusic.play();
        } catch (e) { /* ignore */ }
    }

    private stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic.destroy();
            this.backgroundMusic = undefined;
        }
    }
}
