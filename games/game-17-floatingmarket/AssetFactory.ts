import * as Phaser from 'phaser';

export class AssetFactory {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Generates all game textures. Call this inside preload or create.
     */
    public generateTextures() {
        this.createWaterTexture();
        this.createBoatTexture();
        // Stall textures are now loaded as images in preload()
        this.createObstacleTextures();
        this.createParticleTextures();
        this.createItemTextures();
        this.createUITextures();
        this.createDockTexture();
        this.createGrassTexture();
    }

    private createWaterTexture() {
        const width = 512;
        const height = 512;
        const graphics = this.scene.make.graphics({ x: 0, y: 0 });

        graphics.fillStyle(0x006994, 1);
        graphics.fillRect(0, 0, width, height);

        graphics.fillStyle(0x005A80, 0.5);
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const w = 20 + Math.random() * 40;
            const h = 2 + Math.random() * 3;
            graphics.fillEllipse(x, y, w, h);
        }

        graphics.fillStyle(0x40E0D0, 0.3);
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const w = 10 + Math.random() * 20;
            const h = 1 + Math.random() * 2;
            graphics.fillEllipse(x, y, w, h);
        }

        graphics.generateTexture('water_tile', width, height);
        graphics.destroy();
    }

    private createBoatTexture() {
        const width = 120;
        const height = 300;
        const graphics = this.scene.make.graphics({ x: 0, y: 0 });

        // Hull
        graphics.fillStyle(0x8B4513, 1);
        const hullPath = new Phaser.Curves.Path(60, 20);
        hullPath.quadraticBezierTo(110, 100, 100, 220);
        hullPath.lineTo(60, 240);
        hullPath.lineTo(20, 220);
        hullPath.quadraticBezierTo(10, 100, 60, 20);
        hullPath.closePath();
        hullPath.draw(graphics);
        graphics.fill();

        // Inner Deck
        graphics.fillStyle(0xA0522D, 1);
        const deckPath = new Phaser.Curves.Path(60, 35);
        deckPath.quadraticBezierTo(95, 100, 85, 210);
        deckPath.lineTo(60, 225);
        deckPath.lineTo(35, 210);
        deckPath.quadraticBezierTo(25, 100, 60, 35);
        deckPath.closePath();
        deckPath.draw(graphics);
        graphics.fill();

        // Seats
        graphics.fillStyle(0x5D4037, 1);
        [80, 120, 160, 200].forEach(y => {
            graphics.fillRect(40, y, 40, 8);
        });

        // Engine & Long Tail
        graphics.fillStyle(0x34495E, 1);
        graphics.fillRect(50, 220, 20, 30);
        graphics.lineStyle(4, 0x7F8C8D, 1);
        graphics.lineBetween(60, 250, 60, 290);
        graphics.fillStyle(0xBDC3C7, 1);
        graphics.fillCircle(60, 290, 5);

        // Bow decoration ribbons
        [0xFF0055, 0x00FF00, 0xFFFF00, 0x00FFFF].forEach((c, i) => {
            graphics.lineStyle(3, c, 1);
            const rPath = new Phaser.Curves.Path(60, 20);
            const side = i % 2 === 0 ? 1 : -1;
            const spread = (i + 1) * 5;
            rPath.quadraticBezierTo(60 + (side * spread), 40, 60 + (side * spread * 2), 60 + i * 5);
            rPath.draw(graphics);
        });

        graphics.generateTexture('boat_player', width, 300);
        graphics.destroy();
    }

    private createStallTextures() {
        const canopyColors = [
            { main: 0xC0392B, stripe: 0xE74C3C }, // red
            { main: 0xE67E22, stripe: 0xF39C12 }, // orange
            { main: 0x27AE60, stripe: 0x2ECC71 }, // green
            { main: 0x2980B9, stripe: 0x3498DB }, // blue
            { main: 0x8E44AD, stripe: 0x9B59B6 }, // purple
            { main: 0xD4AC0D, stripe: 0xF1C40F }, // gold
        ];
        const W = 160;
        const H = 100;

        canopyColors.forEach(({ main, stripe }, idx) => {
            const g = this.scene.make.graphics({ x: 0, y: 0 });

            // Wooden platform base
            g.fillStyle(0x5D4037, 1);
            g.fillRect(0, 0, W, H);
            // Wood plank lines
            g.lineStyle(1, 0x4E342E, 0.4);
            for (let py = 0; py < H; py += 12) {
                g.beginPath(); g.moveTo(0, py); g.lineTo(W, py); g.strokePath();
            }

            // Counter / table
            g.fillStyle(0x795548, 1);
            g.fillRoundedRect(8, 20, W - 16, H - 40, 4);
            g.fillStyle(0x8D6E63, 1);
            g.fillRoundedRect(10, 22, W - 20, H - 44, 3);

            // Goods on the counter (colorful circles as products)
            const goodColors = [0xFF6B6B, 0xFFD93D, 0x6BCB77, 0x4D96FF, 0xFF8C00, 0xE8A0BF];
            for (let gx = 20; gx < W - 20; gx += 22) {
                for (let gy = 35; gy < H - 25; gy += 18) {
                    const gc = goodColors[Math.floor(Math.random() * goodColors.length)];
                    g.fillStyle(gc, 0.9);
                    g.fillCircle(gx + Math.random() * 6, gy + Math.random() * 4, 5 + Math.random() * 3);
                }
            }

            // Canopy / awning (top section with stripes)
            g.fillStyle(main, 1);
            g.fillRect(0, 0, W, 22);
            // Striped pattern
            g.fillStyle(stripe, 0.7);
            for (let sx = 0; sx < W; sx += 20) {
                g.fillRect(sx, 0, 10, 22);
            }
            // Scalloped awning edge
            g.fillStyle(main, 1);
            for (let sx = 5; sx < W; sx += 12) {
                g.fillCircle(sx, 22, 5);
            }

            // Posts / poles
            g.fillStyle(0x3E2723, 1);
            g.fillRect(3, 0, 5, H);
            g.fillRect(W - 8, 0, 5, H);

            // Hanging lanterns
            const lanternColors = [0xFF6347, 0xFFD700, 0xFF69B4];
            [W * 0.25, W * 0.5, W * 0.75].forEach((lx, li) => {
                g.lineStyle(1, 0x8B4513, 0.6);
                g.beginPath(); g.moveTo(lx, 22); g.lineTo(lx, 30); g.strokePath();
                g.fillStyle(lanternColors[li % lanternColors.length], 0.85);
                g.fillCircle(lx, 33, 4);
                g.fillStyle(0xFFFFFF, 0.4);
                g.fillCircle(lx - 1, 32, 1.5);
            });

            // Light string across top
            g.lineStyle(1, 0xFFD700, 0.5);
            g.beginPath();
            g.moveTo(8, 18);
            for (let bx = 20; bx < W - 10; bx += 15) {
                g.lineTo(bx, 16 + Math.sin(bx * 0.1) * 2);
            }
            g.strokePath();

            // Highlight / sheen on canopy
            g.fillStyle(0xFFFFFF, 0.1);
            g.fillRect(10, 2, W - 20, 8);

            g.generateTexture(`stall_${idx}`, W, H);
            g.destroy();
        });
    }

    private createObstacleTextures() {
        // Rock
        const rockG = this.scene.make.graphics({ x: 0, y: 0 });
        rockG.fillStyle(0x7f8c8d, 1);
        const points = [
            { x: 25, y: 5 }, { x: 45, y: 20 }, { x: 50, y: 40 },
            { x: 35, y: 55 }, { x: 15, y: 50 }, { x: 5, y: 30 }, { x: 15, y: 10 }
        ];
        rockG.fillPoints(points, true);
        rockG.fillStyle(0x95a5a6, 1);
        rockG.fillPoints([points[0], points[1], points[6]], true);
        rockG.fillStyle(0x34495e, 1);
        rockG.fillPoints([points[3], points[4], points[5]], true);
        rockG.generateTexture('obs_rock', 60, 60);
        rockG.destroy();

        // Log
        const logG = this.scene.make.graphics({ x: 0, y: 0 });
        logG.fillStyle(0x5D4037, 1);
        logG.fillRoundedRect(0, 10, 80, 30, 5);
        logG.lineStyle(2, 0x3E2723, 0.7);
        logG.beginPath();
        logG.moveTo(10, 15); logG.lineTo(70, 15);
        logG.moveTo(15, 25); logG.lineTo(65, 25);
        logG.moveTo(5, 35); logG.lineTo(75, 35);
        logG.strokePath();
        logG.fillStyle(0xA1887F, 1);
        logG.fillCircle(5, 25, 10);
        logG.fillStyle(0x5D4037, 1);
        logG.fillCircle(5, 25, 3);
        logG.generateTexture('obs_log', 90, 50);
        logG.destroy();
    }

    private createParticleTextures() {
        const wakeG = this.scene.make.graphics({ x: 0, y: 0 });
        wakeG.fillStyle(0xFFFFFF, 1);
        wakeG.fillCircle(10, 10, 10);
        wakeG.generateTexture('particle_wake', 20, 20);
        wakeG.destroy();

        const splashG = this.scene.make.graphics({ x: 0, y: 0 });
        splashG.fillStyle(0xADD8E6, 0.8);
        splashG.fillCircle(8, 8, 6);
        splashG.generateTexture('particle_splash', 16, 16);
        splashG.destroy();
    }

    // ==================== MARKET ITEM TEXTURES ====================

    private createItemTextures() {
        const S = 44; // Standard item size

        // Only generate procedural textures for items WITHOUT loaded sprites
        // Items with hand-drawn sprites (loaded in preload): apple, banana, coconut,
        // corn, durian, fish, foithong, greenmango, guava, khanomchan, lime, mango,
        // morningglory, orange, papaya, pumpkin, shrimp, squid, thongyod, watermelon

        // --- NOODLE (no sprite) ---
        this.createCircleItem('item_noodle', S, 0xFAEBD7, 0xDDD0B8, 'rectangle');

        // --- LOTUS (Tutorial, no sprite) ---
        this.createLotusTexture(S);

        // --- ROCK item (no sprite) ---
        this.createCircleItem('item_rock', S, 0x808080, 0x606060, 'circle');
    }

    private createCircleItem(
        key: string, size: number, color: number, borderColor: number,
        shape: string, stripeColors?: number[]
    ) {
        const g = this.scene.make.graphics({ x: 0, y: 0 });
        const cx = size / 2;
        const cy = size / 2;
        const r = size / 2 - 3;

        // Shadow
        g.fillStyle(0x000000, 0.2);
        g.fillEllipse(cx + 2, cy + 2, r * 2, r * 2);

        // Main shape
        g.fillStyle(color, 1);
        if (shape === 'circle') {
            g.fillCircle(cx, cy, r);
        } else if (shape === 'oval') {
            g.fillEllipse(cx, cy, r * 2, r * 1.5);
        } else if (shape === 'drop') {
            // Teardrop shape
            g.fillCircle(cx, cy + 3, r * 0.8);
            g.fillTriangle(cx, cy - r, cx - r * 0.5, cy, cx + r * 0.5, cy);
        } else if (shape === 'rectangle') {
            g.fillRoundedRect(cx - r * 0.7, cy - r * 0.8, r * 1.4, r * 1.6, 4);
        } else if (shape === 'curved') {
            // Curved shape (banana/shrimp)
            g.fillEllipse(cx, cy, r * 1.8, r * 1.0);
            g.fillStyle(color, 0.8);
            g.fillEllipse(cx + 2, cy - 3, r * 1.4, r * 0.6);
        } else if (shape === 'spiky') {
            // Spiky (durian)
            g.fillCircle(cx, cy, r * 0.8);
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const sx = cx + Math.cos(angle) * r * 0.6;
                const sy = cy + Math.sin(angle) * r * 0.6;
                const ex = cx + Math.cos(angle) * r;
                const ey = cy + Math.sin(angle) * r;
                g.fillTriangle(sx - 3, sy, sx + 3, sy, ex, ey);
            }
        }

        // Stripes (for watermelon, khanom chan)
        if (stripeColors) {
            stripeColors.forEach((sc, i) => {
                g.lineStyle(2, sc, 0.5);
                const offset = (i + 1) * 4;
                g.beginPath();
                g.moveTo(cx - r + offset, cy - r / 2);
                g.lineTo(cx + r - offset, cy + r / 2);
                g.strokePath();
            });
        }

        // Highlight
        g.fillStyle(0xFFFFFF, 0.3);
        g.fillCircle(cx - r * 0.25, cy - r * 0.25, r * 0.3);

        // Border
        g.lineStyle(2, borderColor, 0.8);
        if (shape === 'circle' || shape === 'spiky') {
            g.strokeCircle(cx, cy, r);
        } else if (shape === 'oval') {
            g.strokeEllipse(cx, cy, r * 2, r * 1.5);
        }

        g.generateTexture(key, size, size);
        g.destroy();
    }

    private createLotusTexture(size: number) {
        const g = this.scene.make.graphics({ x: 0, y: 0 });
        const cx = size / 2;
        const cy = size / 2;

        // Shadow
        g.fillStyle(0x000000, 0.15);
        g.fillCircle(cx + 2, cy + 2, size / 2 - 2);

        // Petals
        const petalCount = 8;
        for (let i = 0; i < petalCount; i++) {
            const angle = (Math.PI * 2 * i) / petalCount - Math.PI / 2;
            const px = cx + Math.cos(angle) * 8;
            const py = cy + Math.sin(angle) * 8;
            g.fillStyle(0xFF69B4, 0.9);
            g.fillEllipse(px, py, 12, 7);
        }

        // Center
        g.fillStyle(0xFFFF00, 1);
        g.fillCircle(cx, cy, 5);

        // Highlight
        g.fillStyle(0xFFFFFF, 0.4);
        g.fillCircle(cx - 2, cy - 2, 3);

        g.generateTexture('item_lotus', size, size);
        g.destroy();
    }

    private createUITextures() {
        // Basket/Sack icon
        const sackSize = 64;
        const sg = this.scene.make.graphics({ x: 0, y: 0 });

        // Shadow
        sg.fillStyle(0x000000, 0.2);
        sg.fillEllipse(sackSize / 2 + 2, sackSize * 0.65 + 2, sackSize * 0.7, sackSize * 0.5);

        // Sack body
        sg.fillStyle(0x8B6914, 1);
        sg.fillEllipse(sackSize / 2, sackSize * 0.65, sackSize * 0.7, sackSize * 0.5);

        // Sack top (gathered)
        sg.fillStyle(0x9B7924, 1);
        sg.fillRoundedRect(sackSize * 0.3, sackSize * 0.2, sackSize * 0.4, sackSize * 0.3, 6);

        // Rope tie
        sg.lineStyle(3, 0x5D4037, 1);
        sg.beginPath();
        sg.moveTo(sackSize * 0.35, sackSize * 0.3);
        sg.lineTo(sackSize * 0.65, sackSize * 0.3);
        sg.strokePath();

        // Highlight
        sg.fillStyle(0xFFFFFF, 0.15);
        sg.fillEllipse(sackSize * 0.4, sackSize * 0.55, sackSize * 0.2, sackSize * 0.2);

        sg.generateTexture('ui_sack', sackSize, sackSize);
        sg.destroy();

        // Warning icon (red X)
        const warnSize = 48;
        const wg = this.scene.make.graphics({ x: 0, y: 0 });
        wg.fillStyle(0xE74C3C, 1);
        wg.fillCircle(warnSize / 2, warnSize / 2, warnSize / 2 - 2);
        wg.lineStyle(4, 0xFFFFFF, 1);
        wg.beginPath();
        wg.moveTo(warnSize * 0.3, warnSize * 0.3);
        wg.lineTo(warnSize * 0.7, warnSize * 0.7);
        wg.moveTo(warnSize * 0.7, warnSize * 0.3);
        wg.lineTo(warnSize * 0.3, warnSize * 0.7);
        wg.strokePath();
        wg.generateTexture('ui_warning', warnSize, warnSize);
        wg.destroy();

        // Checkmark icon
        const checkSize = 48;
        const cg = this.scene.make.graphics({ x: 0, y: 0 });
        cg.fillStyle(0x27AE60, 1);
        cg.fillCircle(checkSize / 2, checkSize / 2, checkSize / 2 - 2);
        cg.lineStyle(4, 0xFFFFFF, 1);
        cg.beginPath();
        cg.moveTo(checkSize * 0.25, checkSize * 0.5);
        cg.lineTo(checkSize * 0.45, checkSize * 0.7);
        cg.lineTo(checkSize * 0.75, checkSize * 0.3);
        cg.strokePath();
        cg.generateTexture('ui_check', checkSize, checkSize);
        cg.destroy();
    }

    private createDockTexture() {
        const S = 256;
        const g = this.scene.make.graphics({ x: 0, y: 0 });

        // Base dark wood
        g.fillStyle(0x3E2723, 1);
        g.fillRect(0, 0, S, S);

        // Horizontal plank lines
        const plankH = 32;
        for (let py = 0; py < S; py += plankH) {
            // Alternating slightly different wood tones
            const tone = py % (plankH * 2) === 0 ? 0x4E342E : 0x3E2723;
            g.fillStyle(tone, 1);
            g.fillRect(0, py, S, plankH - 2);
            // Gap between planks
            g.fillStyle(0x2C1E17, 1);
            g.fillRect(0, py + plankH - 2, S, 2);
        }

        // Subtle vertical grain lines
        g.lineStyle(1, 0x33261D, 0.3);
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * S;
            const y1 = Math.random() * S;
            const y2 = y1 + 20 + Math.random() * 40;
            g.beginPath(); g.moveTo(x, y1); g.lineTo(x + 1, y2); g.strokePath();
        }

        // Knot marks
        g.fillStyle(0x2C1E17, 0.3);
        for (let i = 0; i < 4; i++) {
            g.fillCircle(Math.random() * S, Math.random() * S, 3 + Math.random() * 4);
        }

        g.generateTexture('dock_tile', S, S);
        g.destroy();
    }

    private createGrassTexture() {
        const S = 256;
        const g = this.scene.make.graphics({ x: 0, y: 0 });

        // Smooth green base
        g.fillStyle(0x5B8C4A, 1);
        g.fillRect(0, 0, S, S);

        // Soft tonal rows (like mowed grass stripes)
        for (let row = 0; row < S; row += 32) {
            const shade = row % 64 === 0 ? 0x528243 : 0x639651;
            g.fillStyle(shade, 0.35);
            g.fillRect(0, row, S, 32);
        }

        // Subtle lighter patches
        g.fillStyle(0x6EA05A, 0.2);
        for (let i = 0; i < 8; i++) {
            const px = (i * 73) % S;
            const py = (i * 97) % S;
            g.fillRoundedRect(px, py, 50, 30, 10);
        }

        // Small decorative flowers
        const flowerColors = [0xFFE4B5, 0xFFB6C1, 0xE6E6FA, 0xFFF8DC];
        for (let i = 0; i < 6; i++) {
            const fx = (i * 47 + 20) % S;
            const fy = (i * 61 + 15) % S;
            const fc = flowerColors[i % flowerColors.length];
            // Petals
            g.fillStyle(fc, 0.6);
            g.fillCircle(fx - 2, fy, 2.5);
            g.fillCircle(fx + 2, fy, 2.5);
            g.fillCircle(fx, fy - 2, 2.5);
            g.fillCircle(fx, fy + 2, 2.5);
            // Center
            g.fillStyle(0xFFD700, 0.7);
            g.fillCircle(fx, fy, 1.5);
        }

        // Tiny pebbles near edges
        g.fillStyle(0x9E9E9E, 0.15);
        for (let i = 0; i < 5; i++) {
            g.fillCircle((i * 53 + 10) % S, (i * 41 + 30) % S, 3);
        }

        g.generateTexture('grass_tile', S, S);
        g.destroy();
    }
}
