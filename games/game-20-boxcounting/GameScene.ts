import * as Phaser from 'phaser';
import {
    BOXCOUNTING_LEVELS,
    SHAPE_COLORS,
    COLOR_KEYS,
    type BoxCountingLevelConfig,
    type ShapeType,
    type ColorKey,
} from './levels';

// --- Types ---
interface PlacedShape {
    gridX: number;
    gridY: number;
    gridZ: number; // stack level (0 = ground)
    shape: 'box' | 'triangle';
    color: ColorKey;
}

interface QuestionData {
    shapes: PlacedShape[];
    correctAnswer: number;
    askText: string;
    choiceLabel: string;       // always present — shown above choices
    choiceLabelColor?: string; // hex color for the label (if color-specific)
    options: number[];
    askColor?: ColorKey;
    askShape?: 'box' | 'triangle';
}

// --- Constants ---
const FONT_FAMILY = "'Noto Sans Thai', 'Segoe UI', sans-serif";

export class BoxCountingGameScene extends Phaser.Scene {
    // State
    private levelConfig!: BoxCountingLevelConfig;
    private currentQuestionIndex = 0;
    private totalQuestions = 2;
    private correctCount = 0;
    private score = 0;
    private isInputLocked = false;

    // Timer
    private timerEvent?: Phaser.Time.TimerEvent;
    private timerBar?: Phaser.GameObjects.Graphics;
    private timerBg?: Phaser.GameObjects.Graphics;
    private timeRemaining = 0;
    private timeTotal = 0;

    // Current question
    private questionData?: QuestionData;

    // Display objects
    private questionText?: Phaser.GameObjects.Text;
    private questionSubText?: Phaser.GameObjects.Text;
    private gridContainer?: Phaser.GameObjects.Container;
    private optionButtons: Phaser.GameObjects.Container[] = [];
    private feedbackContainer?: Phaser.GameObjects.Container;
    private progressDots: Phaser.GameObjects.Graphics[] = [];
    private questionCountText?: Phaser.GameObjects.Text;

    // Audio
    private soundCorrect?: Phaser.Sound.BaseSound;
    private soundWrong?: Phaser.Sound.BaseSound;
    private soundComplete?: Phaser.Sound.BaseSound;

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
        // Load sound effects if available
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
    }

    create() {
        // Setup audio
        try {
            this.soundCorrect = this.sound.add('bc-correct', { volume: 0.5 });
            this.soundWrong = this.sound.add('bc-wrong', { volume: 0.5 });
            this.soundComplete = this.sound.add('bc-complete', { volume: 0.6 });
        } catch (e) { /* audio not loaded, skip */ }

        this.scale.on('resize', this.handleResize, this);
        this.startQuestion();
    }

    private handleResize() {
        // Re-render on resize
        if (this.questionData) {
            this.renderQuestion();
        }
    }

    // ==========================================
    // QUESTION FLOW
    // ==========================================

    private startQuestion() {
        this.isInputLocked = false;
        this.questionData = this.generateQuestion();
        this.renderQuestion();
        this.startTimer();
    }

    private generateQuestion(): QuestionData {
        const cfg = this.levelConfig;
        const totalShapes = Phaser.Math.Between(cfg.minShapes, cfg.maxShapes);

        // Determine colors to use
        const availableColors = [...COLOR_KEYS];
        Phaser.Utils.Array.Shuffle(availableColors);
        const colors = availableColors.slice(0, cfg.colorCount);

        // Determine shape types for this question
        let shapePool: ('box' | 'triangle')[] = [];
        if (cfg.shapeTypes === 'box') shapePool = ['box'];
        else if (cfg.shapeTypes === 'triangle') shapePool = ['triangle'];
        else shapePool = ['box', 'triangle'];

        // Place shapes on grid
        const shapes: PlacedShape[] = [];
        const occupiedPositions: Map<string, number> = new Map(); // "x,y" -> current stack height

        for (let i = 0; i < totalShapes; i++) {
            let gridX: number, gridY: number, gridZ: number;
            const maxAttempts = 50;
            let attempt = 0;

            // Try to place: either on empty cell or stack on existing
            do {
                gridX = Phaser.Math.Between(0, cfg.gridSize - 1);
                gridY = Phaser.Math.Between(0, cfg.gridSize - 1);
                const key = `${gridX},${gridY}`;
                const currentHeight = occupiedPositions.get(key) || 0;

                if (currentHeight < cfg.maxStack) {
                    gridZ = currentHeight;
                    occupiedPositions.set(key, currentHeight + 1);
                    break;
                }
                attempt++;
            } while (attempt < maxAttempts);

            if (attempt >= maxAttempts) {
                // Fallback: find any available cell
                let placed = false;
                for (let x = 0; x < cfg.gridSize && !placed; x++) {
                    for (let y = 0; y < cfg.gridSize && !placed; y++) {
                        const key = `${x},${y}`;
                        const h = occupiedPositions.get(key) || 0;
                        if (h < cfg.maxStack) {
                            gridX = x;
                            gridY = y;
                            gridZ = h;
                            occupiedPositions.set(key, h + 1);
                            placed = true;
                        }
                    }
                }
                if (!placed) break; // grid full
            }

            const shape = shapePool[Phaser.Math.Between(0, shapePool.length - 1)];
            const color = colors[Phaser.Math.Between(0, colors.length - 1)];

            shapes.push({ gridX: gridX!, gridY: gridY!, gridZ: gridZ!, shape, color });
        }

        // Determine what to count
        let correctAnswer = 0;
        let askText = '';
        let choiceLabel = '';
        let choiceLabelColor: string | undefined;
        let askColor: ColorKey | undefined;
        let askShape: 'box' | 'triangle' | undefined;

        if (cfg.askType === 'count_all') {
            correctAnswer = shapes.length;
            if (cfg.shapeTypes === 'box') {
                askText = 'มีกล่องทั้งหมดกี่ชิ้น?';
                choiceLabel = 'นับกล่อง';
            } else if (cfg.shapeTypes === 'triangle') {
                askText = 'มีสามเหลี่ยมทั้งหมดกี่ชิ้น?';
                choiceLabel = 'นับสามเหลี่ยม';
            } else {
                askText = 'มีรูปทรงทั้งหมดกี่ชิ้น?';
                choiceLabel = 'นับรูปทรงทั้งหมด';
            }
        } else if (cfg.askType === 'count_color') {
            // Pick a color to ask about
            askColor = colors[Phaser.Math.Between(0, colors.length - 1)];
            correctAnswer = shapes.filter(s => s.color === askColor).length;

            // Ensure we have at least 1 of that color
            if (correctAnswer === 0) {
                const count = Phaser.Math.Between(1, Math.ceil(shapes.length / 2));
                for (let i = 0; i < count && i < shapes.length; i++) {
                    shapes[i].color = askColor;
                }
                correctAnswer = count;
            }

            const colorName = SHAPE_COLORS[askColor].name;
            const colorHex = '#' + SHAPE_COLORS[askColor].hex.toString(16).padStart(6, '0');
            askText = `มี${colorName}ทั้งหมดกี่ชิ้น?`;
            choiceLabel = `นับ${colorName}กี่อัน?`;
            choiceLabelColor = colorHex;
        } else if (cfg.askType === 'count_shape') {
            // Pick a shape type to ask about
            askShape = shapePool[Phaser.Math.Between(0, shapePool.length - 1)];
            correctAnswer = shapes.filter(s => s.shape === askShape).length;

            // Ensure at least 1
            if (correctAnswer === 0) {
                const count = Phaser.Math.Between(1, Math.ceil(shapes.length / 2));
                for (let i = 0; i < count && i < shapes.length; i++) {
                    shapes[i].shape = askShape;
                }
                correctAnswer = count;
            }

            const shapeName = askShape === 'box' ? 'สี่เหลี่ยม' : 'สามเหลี่ยม';
            askText = `มี${shapeName}กี่ชิ้น?`;
            choiceLabel = `นับ${shapeName}`;
        } else if (cfg.askType === 'count_shape_color') {
            // Pick both a shape AND a color to ask about
            askShape = shapePool[Phaser.Math.Between(0, shapePool.length - 1)];
            askColor = colors[Phaser.Math.Between(0, colors.length - 1)];
            correctAnswer = shapes.filter(s => s.shape === askShape && s.color === askColor).length;

            // Ensure at least 1 matching shape+color
            if (correctAnswer === 0) {
                const count = Phaser.Math.Between(1, Math.ceil(shapes.length / 3));
                for (let i = 0; i < count && i < shapes.length; i++) {
                    shapes[i].shape = askShape;
                    shapes[i].color = askColor;
                }
                correctAnswer = count;
            }

            const shapeName = askShape === 'box' ? 'สี่เหลี่ยม' : 'สามเหลี่ยม';
            const colorName = SHAPE_COLORS[askColor].name;
            const colorHex = '#' + SHAPE_COLORS[askColor].hex.toString(16).padStart(6, '0');
            askText = `มี${shapeName}${colorName}กี่ชิ้น?`;
            choiceLabel = `นับ${shapeName}${colorName}`;
            choiceLabelColor = colorHex;
        }

        // Generate 4 options using contextual distractors from the scene
        const options = this.generateOptions(correctAnswer, shapes, askColor, askShape);

        return { shapes, correctAnswer, askText, choiceLabel, choiceLabelColor, options, askColor, askShape };
    }

    private generateOptions(
        correct: number,
        shapes: PlacedShape[],
        askColor?: ColorKey,
        askShape?: 'box' | 'triangle'
    ): number[] {
        const options = new Set<number>();
        options.add(correct);

        // Collect contextual distractor counts from the scene
        const distractors: number[] = [];

        // Count by each color
        const colorCounts = new Map<string, number>();
        for (const s of shapes) {
            colorCounts.set(s.color, (colorCounts.get(s.color) || 0) + 1);
        }
        for (const [color, count] of colorCounts) {
            if (count !== correct) distractors.push(count);
        }

        // Count by each shape type
        const boxCount = shapes.filter(s => s.shape === 'box').length;
        const triCount = shapes.filter(s => s.shape === 'triangle').length;
        if (boxCount > 0 && boxCount !== correct) distractors.push(boxCount);
        if (triCount > 0 && triCount !== correct) distractors.push(triCount);

        // Count by shape+color combos (for count_shape_color distractors)
        if (askColor || askShape) {
            for (const [color, _] of colorCounts) {
                const boxOfColor = shapes.filter(s => s.shape === 'box' && s.color === color).length;
                const triOfColor = shapes.filter(s => s.shape === 'triangle' && s.color === color).length;
                if (boxOfColor > 0 && boxOfColor !== correct) distractors.push(boxOfColor);
                if (triOfColor > 0 && triOfColor !== correct) distractors.push(triOfColor);
            }
        }

        // Total shapes
        if (shapes.length !== correct) distractors.push(shapes.length);

        // Add ±1 of correct as close distractors
        if (correct + 1 > 0) distractors.push(correct + 1);
        if (correct - 1 > 0) distractors.push(correct - 1);

        // Shuffle and pick unique distractors
        Phaser.Utils.Array.Shuffle(distractors);
        for (const d of distractors) {
            if (options.size >= 4) break;
            if (d > 0) options.add(d);
        }

        // Fill remaining with ±2, ±3 if still needed
        const fallbacks = [correct + 2, correct - 2, correct + 3, correct - 3];
        Phaser.Utils.Array.Shuffle(fallbacks);
        for (const f of fallbacks) {
            if (options.size >= 4) break;
            if (f > 0) options.add(f);
        }

        // Last resort
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
    // RENDERING
    // ==========================================

    private renderQuestion() {
        // Clear previous
        this.children.removeAll(true);
        this.optionButtons = [];
        this.progressDots = [];

        const w = this.scale.width;
        const h = this.scale.height;

        if (!this.questionData) return;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0xFAFAFA, 1);
        bg.fillRect(0, 0, w, h);

        // Layout proportions
        const questionAreaY = h * 0.08;
        const gridAreaY = h * 0.15;
        const gridAreaHeight = h * 0.53;
        const optionsAreaY = h * 0.70;

        // Question text — with color highlighting if asking about a specific color
        const fontSize = Math.min(28, w * 0.06);
        if (this.questionData.askColor) {
            const colorKey = this.questionData.askColor;
            const colorName = SHAPE_COLORS[colorKey].name;
            const colorHex = '#' + SHAPE_COLORS[colorKey].hex.toString(16).padStart(6, '0');
            // Split: "มี" + colorName + "ทั้งหมดกี่ชิ้น?"
            const prefix = 'มี';
            const suffix = 'ทั้งหมดกี่ชิ้น?';
            const prefixText = this.add.text(0, 0, prefix, {
                fontFamily: FONT_FAMILY, fontSize: `${fontSize}px`, color: '#333333', fontStyle: 'bold',
                padding: { top: 10, bottom: 6 },
            });
            const colorText = this.add.text(0, 0, colorName, {
                fontFamily: FONT_FAMILY, fontSize: `${fontSize}px`, color: colorHex, fontStyle: 'bold',
                padding: { top: 10, bottom: 6 },
            });
            const suffixText = this.add.text(0, 0, suffix, {
                fontFamily: FONT_FAMILY, fontSize: `${fontSize}px`, color: '#333333', fontStyle: 'bold',
                padding: { top: 10, bottom: 6 },
            });
            // Position them side by side, centered
            const totalW = prefixText.width + colorText.width + suffixText.width;
            const startX = w / 2 - totalW / 2;
            const textY = questionAreaY + h * 0.02;
            prefixText.setPosition(startX, textY);
            colorText.setPosition(startX + prefixText.width, textY);
            suffixText.setPosition(startX + prefixText.width + colorText.width, textY);
        } else {
            this.questionText = this.add.text(w / 2, questionAreaY + h * 0.02, this.questionData.askText, {
                fontFamily: FONT_FAMILY,
                fontSize: `${fontSize}px`,
                color: '#333333',
                fontStyle: 'bold',
                align: 'center',
                padding: { top: 10, bottom: 6, left: 4, right: 4 },
            }).setOrigin(0.5, 0);
        }

        // Question counter
        this.questionCountText = this.add.text(w / 2, questionAreaY + h * 0.07, `ข้อ ${this.currentQuestionIndex + 1} / ${this.totalQuestions}`, {
            fontFamily: FONT_FAMILY,
            fontSize: `${Math.min(16, w * 0.035)}px`,
            color: '#999999',
            align: 'center',
            padding: { top: 10, bottom: 6 },
        }).setOrigin(0.5, 0);

        // Draw isometric grid with shapes
        this.drawIsometricScene(w / 2, gridAreaY + gridAreaHeight * 0.45, gridAreaHeight * 0.8);

        // Draw option buttons (with label if color question)
        this.drawOptions(w, optionsAreaY, h);

        // Draw timer bar
        this.drawTimerBar(w, h);

        // Progress dots
        this.drawProgressDots(w, h);
    }

    private drawIsometricScene(centerX: number, centerY: number, maxSize: number) {
        if (!this.questionData) return;

        const cfg = this.levelConfig;
        const gridSize = cfg.gridSize;

        // Calculate cell size to fit in area — no fixed cap, let it scale to fit
        const cellSize = maxSize / (gridSize * 1.2);
        const halfCell = cellSize / 2;

        // Isometric conversion helpers
        // A cell at (gx, gy) occupies the diamond from (gx,gy) to (gx+1,gy+1)
        // Its center is at (gx+0.5, gy+0.5)
        const toIsoX = (gx: number, gy: number) => (gx - gy) * halfCell;
        const toIsoY = (gx: number, gy: number, gz: number = 0) => (gx + gy) * halfCell * 0.5 - gz * cellSize * 0.6;

        // Center offset
        const gridCenterX = toIsoX(gridSize / 2, gridSize / 2);
        const gridCenterY = toIsoY(gridSize / 2, gridSize / 2);
        const offsetX = centerX - gridCenterX;
        const offsetY = centerY - gridCenterY;

        // Draw grid lines (dotted)
        const gridGraphics = this.add.graphics();
        gridGraphics.lineStyle(1.5, 0xAAAAAA, 1);

        for (let i = 0; i <= gridSize; i++) {
            // Lines along X axis
            const x1 = toIsoX(i, 0) + offsetX;
            const y1 = toIsoY(i, 0) + offsetY;
            const x2 = toIsoX(i, gridSize) + offsetX;
            const y2 = toIsoY(i, gridSize) + offsetY;
            this.drawDottedLine(gridGraphics, x1, y1, x2, y2, 5, 5);

            // Lines along Y axis
            const x3 = toIsoX(0, i) + offsetX;
            const y3 = toIsoY(0, i) + offsetY;
            const x4 = toIsoX(gridSize, i) + offsetX;
            const y4 = toIsoY(gridSize, i) + offsetY;
            this.drawDottedLine(gridGraphics, x3, y3, x4, y4, 5, 5);
        }

        // Sort shapes for correct draw order (back to front, bottom to top)
        const sortedShapes = [...this.questionData.shapes].sort((a, b) => {
            const depthA = a.gridX + a.gridY + a.gridZ * 0.1;
            const depthB = b.gridX + b.gridY + b.gridZ * 0.1;
            return depthA - depthB;
        });

        // Draw shapes — use full cellSize so boxes fill the grid cell exactly
        for (const shape of sortedShapes) {
            // Cell center in isometric
            const isoX = toIsoX(shape.gridX + 0.5, shape.gridY + 0.5) + offsetX;
            // Base Y = cell center on the ground plane, not elevated
            const isoY = toIsoY(shape.gridX + 0.5, shape.gridY + 0.5, shape.gridZ) + offsetY;

            if (shape.shape === 'box') {
                this.drawIsometricBox(isoX, isoY, cellSize, halfCell, shape.color);
            } else {
                this.drawIsometricTriangle(isoX, isoY, cellSize, halfCell, shape.color, shape.gridZ);
            }
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

    private drawIsometricBox(cx: number, cy: number, cellSize: number, halfCell: number, colorKey: ColorKey) {
        const color = SHAPE_COLORS[colorKey];
        // Box base = isometric diamond matching the grid cell
        // half = horizontal extent of the diamond
        const half = halfCell * 0.92; // slightly smaller than cell to show grid lines
        const quarterH = half * 0.5;  // vertical extent of diamond half
        const boxHeight = cellSize * 0.55; // how tall the box is

        const g = this.add.graphics();

        // The 4 corners of the base diamond (at cy level)
        const baseTop = { x: cx, y: cy - quarterH };      // back corner
        const baseRight = { x: cx + half, y: cy };         // right corner
        const baseBottom = { x: cx, y: cy + quarterH };    // front corner
        const baseLeft = { x: cx - half, y: cy };          // left corner

        // Top face (raised by boxHeight)
        g.fillStyle(color.top, 1);
        g.beginPath();
        g.moveTo(baseTop.x, baseTop.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y - boxHeight);
        g.lineTo(baseBottom.x, baseBottom.y - boxHeight);
        g.lineTo(baseLeft.x, baseLeft.y - boxHeight);
        g.closePath();
        g.fillPath();

        // Left face (from baseLeft-baseBottom up to top)
        g.fillStyle(color.left, 1);
        g.beginPath();
        g.moveTo(baseLeft.x, baseLeft.y - boxHeight);
        g.lineTo(baseBottom.x, baseBottom.y - boxHeight);
        g.lineTo(baseBottom.x, baseBottom.y);
        g.lineTo(baseLeft.x, baseLeft.y);
        g.closePath();
        g.fillPath();

        // Right face (from baseBottom-baseRight up to top)
        g.fillStyle(color.right, 1);
        g.beginPath();
        g.moveTo(baseBottom.x, baseBottom.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y);
        g.lineTo(baseBottom.x, baseBottom.y);
        g.closePath();
        g.fillPath();

        // Outlines
        g.lineStyle(1.5, 0x000000, 0.2);
        // Top face outline
        g.beginPath();
        g.moveTo(baseTop.x, baseTop.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y - boxHeight);
        g.lineTo(baseBottom.x, baseBottom.y - boxHeight);
        g.lineTo(baseLeft.x, baseLeft.y - boxHeight);
        g.closePath();
        g.strokePath();
        // Left face outline
        g.beginPath();
        g.moveTo(baseLeft.x, baseLeft.y - boxHeight);
        g.lineTo(baseLeft.x, baseLeft.y);
        g.lineTo(baseBottom.x, baseBottom.y);
        g.lineTo(baseBottom.x, baseBottom.y - boxHeight);
        g.strokePath();
        // Right face outline
        g.beginPath();
        g.moveTo(baseRight.x, baseRight.y - boxHeight);
        g.lineTo(baseRight.x, baseRight.y);
        g.lineTo(baseBottom.x, baseBottom.y);
        g.strokePath();
    }

    private drawIsometricTriangle(cx: number, cy: number, cellSize: number, halfCell: number, colorKey: ColorKey, stackZ: number) {
        const color = SHAPE_COLORS[colorKey];
        const half = halfCell * 0.92;
        const quarterH = half * 0.5;
        const triHeight = cellSize * 0.55; // same height as box for clean stacking
        const isInverted = stackZ % 2 === 1; // odd layers = inverted

        const g = this.add.graphics();

        if (!isInverted) {
            // === UPRIGHT PYRAMID (apex up) ===
            // Base diamond corners at cy level
            const baseTop = { x: cx, y: cy - quarterH };
            const baseRight = { x: cx + half, y: cy };
            const baseBottom = { x: cx, y: cy + quarterH };
            const baseLeft = { x: cx - half, y: cy };
            const apex = { x: cx, y: cy - triHeight };

            // Front-left face
            g.fillStyle(color.left, 1);
            g.beginPath();
            g.moveTo(apex.x, apex.y);
            g.lineTo(baseLeft.x, baseLeft.y);
            g.lineTo(baseBottom.x, baseBottom.y);
            g.closePath();
            g.fillPath();

            // Front-right face
            g.fillStyle(color.right, 1);
            g.beginPath();
            g.moveTo(apex.x, apex.y);
            g.lineTo(baseBottom.x, baseBottom.y);
            g.lineTo(baseRight.x, baseRight.y);
            g.closePath();
            g.fillPath();

            // Back-left face
            g.fillStyle(color.top, 0.7);
            g.beginPath();
            g.moveTo(apex.x, apex.y);
            g.lineTo(baseTop.x, baseTop.y);
            g.lineTo(baseLeft.x, baseLeft.y);
            g.closePath();
            g.fillPath();

            // Back-right face
            g.fillStyle(color.top, 0.5);
            g.beginPath();
            g.moveTo(apex.x, apex.y);
            g.lineTo(baseRight.x, baseRight.y);
            g.lineTo(baseTop.x, baseTop.y);
            g.closePath();
            g.fillPath();

            // Outlines
            g.lineStyle(1.5, 0x000000, 0.2);
            g.beginPath();
            g.moveTo(apex.x, apex.y);
            g.lineTo(baseLeft.x, baseLeft.y);
            g.lineTo(baseBottom.x, baseBottom.y);
            g.lineTo(baseRight.x, baseRight.y);
            g.lineTo(apex.x, apex.y);
            g.strokePath();
            g.beginPath();
            g.moveTo(apex.x, apex.y);
            g.lineTo(baseTop.x, baseTop.y);
            g.strokePath();
            g.beginPath();
            g.moveTo(baseLeft.x, baseLeft.y);
            g.lineTo(baseTop.x, baseTop.y);
            g.lineTo(baseRight.x, baseRight.y);
            g.strokePath();
        } else {
            // === INVERTED PYRAMID (apex down) ===
            // Top diamond corners (flat face up, raised)
            const topBack = { x: cx, y: cy - triHeight - quarterH };
            const topRight = { x: cx + half, y: cy - triHeight };
            const topFront = { x: cx, y: cy - triHeight + quarterH };
            const topLeft = { x: cx - half, y: cy - triHeight };
            const apex = { x: cx, y: cy }; // apex points down

            // Top face (flat diamond)
            g.fillStyle(color.top, 1);
            g.beginPath();
            g.moveTo(topBack.x, topBack.y);
            g.lineTo(topRight.x, topRight.y);
            g.lineTo(topFront.x, topFront.y);
            g.lineTo(topLeft.x, topLeft.y);
            g.closePath();
            g.fillPath();

            // Front-left face (topLeft → topFront → apex)
            g.fillStyle(color.left, 1);
            g.beginPath();
            g.moveTo(topLeft.x, topLeft.y);
            g.lineTo(topFront.x, topFront.y);
            g.lineTo(apex.x, apex.y);
            g.closePath();
            g.fillPath();

            // Front-right face (topFront → topRight → apex)
            g.fillStyle(color.right, 1);
            g.beginPath();
            g.moveTo(topFront.x, topFront.y);
            g.lineTo(topRight.x, topRight.y);
            g.lineTo(apex.x, apex.y);
            g.closePath();
            g.fillPath();

            // Outlines
            g.lineStyle(1.5, 0x000000, 0.2);
            // Top diamond
            g.beginPath();
            g.moveTo(topBack.x, topBack.y);
            g.lineTo(topRight.x, topRight.y);
            g.lineTo(topFront.x, topFront.y);
            g.lineTo(topLeft.x, topLeft.y);
            g.closePath();
            g.strokePath();
            // Edges to apex
            g.beginPath();
            g.moveTo(topLeft.x, topLeft.y);
            g.lineTo(apex.x, apex.y);
            g.lineTo(topFront.x, topFront.y);
            g.strokePath();
            g.beginPath();
            g.moveTo(topRight.x, topRight.y);
            g.lineTo(apex.x, apex.y);
            g.strokePath();
        }
    }

    private drawOptions(w: number, startY: number, h: number) {
        if (!this.questionData) return;

        // Show label above choices for ALL levels
        if (this.questionData.choiceLabel) {
            const labelColor = this.questionData.choiceLabelColor || '#555555';
            const label = this.add.text(w / 2, startY - h * 0.03, this.questionData.choiceLabel, {
                fontFamily: FONT_FAMILY,
                fontSize: `${Math.min(20, w * 0.045)}px`,
                color: labelColor,
                fontStyle: 'bold',
                align: 'center',
                padding: { top: 10, bottom: 6 },
            }).setOrigin(0.5, 1);
        }

        // 2×2 grid layout
        const buttonW = Math.min(w * 0.35, 140);
        const buttonH = Math.min(h * 0.08, 56);
        const gapX = Math.min(w * 0.05, 24);
        const gapY = Math.min(h * 0.02, 14);

        // Center the 2×2 grid
        const gridW = buttonW * 2 + gapX;
        const gridStartX = (w - gridW) / 2;

        this.questionData.options.forEach((value, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = gridStartX + col * (buttonW + gapX) + buttonW / 2;
            const y = startY + row * (buttonH + gapY) + buttonH / 2;

            const container = this.add.container(x, y);

            // Button background
            const bg = this.add.graphics();
            const radius = 16;

            // Shadow
            bg.fillStyle(0x000000, 0.08);
            bg.fillRoundedRect(-buttonW / 2, -buttonH / 2 + 4, buttonW, buttonH, radius);

            // Main button
            bg.fillStyle(0xFFFFFF, 1);
            bg.fillRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, radius);

            // Border
            bg.lineStyle(2.5, 0xE0E0E0, 1);
            bg.strokeRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, radius);

            container.add(bg);

            // Number text
            const numText = this.add.text(0, 0, `${value}`, {
                fontFamily: FONT_FAMILY,
                fontSize: `${Math.min(30, w * 0.06)}px`,
                color: '#333333',
                fontStyle: 'bold',
            }).setOrigin(0.5);
            container.add(numText);

            // Make interactive
            const hitArea = new Phaser.Geom.Rectangle(-buttonW / 2, -buttonH / 2, buttonW, buttonH);
            container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

            container.on('pointerdown', () => {
                if (!this.isInputLocked) {
                    this.handleAnswer(value, container);
                }
            });

            container.on('pointerover', () => {
                if (!this.isInputLocked) {
                    container.setScale(1.05);
                }
            });
            container.on('pointerout', () => {
                container.setScale(1.0);
            });

            this.optionButtons.push(container);
        });
    }

    private drawTimerBar(w: number, h: number) {
        const barW = w * 0.7;
        const barH = 8;
        const x = (w - barW) / 2;
        const y = h * 0.88;

        // Background
        this.timerBg = this.add.graphics();
        this.timerBg.fillStyle(0xEEEEEE, 1);
        this.timerBg.fillRoundedRect(x, y, barW, barH, barH / 2);

        // Fill
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
        const y = h * 0.88;

        const pct = this.timeTotal > 0 ? Math.max(0, this.timeRemaining / this.timeTotal) : 1;
        const fillW = barW * pct;

        this.timerBar.clear();

        // Color based on remaining time
        let barColor = 0x4CD964; // green
        if (pct < 0.25) barColor = 0xFF3B30; // red
        else if (pct < 0.5) barColor = 0xFF9500; // orange

        this.timerBar.fillStyle(barColor, 1);
        if (fillW > 0) {
            this.timerBar.fillRoundedRect(x, y, fillW, barH, barH / 2);
        }
    }

    private drawProgressDots(w: number, h: number) {
        const dotSize = 10;
        const gap = 8;
        const totalW = dotSize * this.totalQuestions + gap * (this.totalQuestions - 1);
        const startX = (w - totalW) / 2;
        const y = h * 0.93;

        for (let i = 0; i < this.totalQuestions; i++) {
            const g = this.add.graphics();
            const x = startX + (dotSize + gap) * i + dotSize / 2;

            if (i < this.currentQuestionIndex) {
                // Completed
                g.fillStyle(0x4CD964, 1);
                g.fillCircle(x, y, dotSize / 2);
            } else if (i === this.currentQuestionIndex) {
                // Current
                g.fillStyle(0x5AC8FA, 1);
                g.fillCircle(x, y, dotSize / 2);
            } else {
                // Pending
                g.fillStyle(0xDDDDDD, 1);
                g.fillCircle(x, y, dotSize / 2);
            }

            this.progressDots.push(g);
        }
    }

    // ==========================================
    // TIMER
    // ==========================================

    private startTimer() {
        this.timeTotal = this.levelConfig.timeLimitSeconds;
        this.timeRemaining = this.timeTotal;

        if (this.timerEvent) {
            this.timerEvent.destroy();
        }

        this.timerEvent = this.time.addEvent({
            delay: 100, // tick every 100ms
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

    private handleAnswer(value: number, button: Phaser.GameObjects.Container) {
        if (!this.questionData || this.isInputLocked) return;
        this.isInputLocked = true;
        this.stopTimer();

        const isCorrect = value === this.questionData.correctAnswer;

        if (isCorrect) {
            this.correctCount++;
            this.score += 100 + Math.round(this.timeRemaining * 10);
            try { this.soundCorrect?.play(); } catch (e) { /* ignore */ }
        } else {
            try { this.soundWrong?.play(); } catch (e) { /* ignore */ }
        }

        // Show feedback on buttons
        this.showAnswerFeedback(value, isCorrect);

        // After delay, go to next question or complete
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

        // Show correct answer
        if (this.questionData) {
            this.showAnswerFeedback(-1, false); // -1 = no answer selected
        }

        this.time.delayedCall(1500, () => {
            this.currentQuestionIndex++;

            if (this.currentQuestionIndex >= this.totalQuestions) {
                this.onLevelComplete();
            } else {
                this.startQuestion();
            }
        });
    }

    private showAnswerFeedback(selectedValue: number, isCorrect: boolean) {
        if (!this.questionData) return;

        const w = this.scale.width;
        const h = this.scale.height;

        // Highlight buttons
        this.optionButtons.forEach(btn => {
            const idx = this.optionButtons.indexOf(btn);
            const val = this.questionData!.options[idx];

            // Clear old graphics and redraw
            const btnW = Math.min(w * 0.35, 140);
            const btnH = Math.min(h * 0.08, 56);
            const radius = 16;

            const newBg = this.add.graphics();

            if (val === this.questionData!.correctAnswer) {
                // Correct answer - green
                newBg.fillStyle(0x4CD964, 1);
                newBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);

                // Update text color
                const textChild = btn.getAt(1) as Phaser.GameObjects.Text;
                textChild.setColor('#FFFFFF');
            } else if (val === selectedValue && !isCorrect) {
                // Wrong selected - red
                newBg.fillStyle(0xFF3B30, 1);
                newBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);

                const textChild = btn.getAt(1) as Phaser.GameObjects.Text;
                textChild.setColor('#FFFFFF');
            } else {
                // Other - dim
                newBg.fillStyle(0xF0F0F0, 1);
                newBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, radius);

                const textChild = btn.getAt(1) as Phaser.GameObjects.Text;
                textChild.setColor('#BBBBBB');
            }

            // Replace background graphics (index 0)
            const oldBg = btn.getAt(0);
            btn.addAt(newBg, 0);
            (oldBg as Phaser.GameObjects.Graphics).destroy();

            btn.disableInteractive();
        });

        // Show correct answer number in center
        const feedbackText = isCorrect ? '✓ ถูกต้อง!' : `✗ คำตอบคือ ${this.questionData.correctAnswer}`;
        const feedbackColor = isCorrect ? '#4CD964' : '#FF3B30';

        const feedback = this.add.text(w / 2, h * 0.50, feedbackText, {
            fontFamily: FONT_FAMILY,
            fontSize: `${Math.min(24, w * 0.05)}px`,
            color: feedbackColor,
            fontStyle: 'bold',
            align: 'center',
            padding: { top: 10, bottom: 6 },
        }).setOrigin(0.5);

        // Animate feedback
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

    // Clinical stats estimation
    private calculateStatFocus(): number {
        // Based on accuracy and time management
        const accuracyRatio = this.correctCount / this.totalQuestions;
        return Math.round(40 + accuracyRatio * 60);
    }

    private calculateStatVisual(): number {
        // Based on ability to count/perceive shapes
        const accuracyRatio = this.correctCount / this.totalQuestions;
        const levelBonus = Math.min(this.levelConfig.level * 2, 30);
        return Math.round(30 + accuracyRatio * 40 + levelBonus);
    }
}
