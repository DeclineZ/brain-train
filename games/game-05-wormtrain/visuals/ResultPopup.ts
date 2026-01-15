import Phaser from 'phaser';
import GameScene from '../GameScene';
import { WormGameConstants as WormGameConfig } from '../config';

interface PopupData {
    isWin: boolean;
    score: number;
    stars: number;
    message: string;
}

export class ResultPopup {
    private scene: GameScene;
    private container: Phaser.GameObjects.Container;
    private overlay: Phaser.GameObjects.Rectangle;
    private visible: boolean = false;

    constructor(scene: GameScene) {
        this.scene = scene;

        // Create overlay (semi-transparent background)
        this.overlay = this.scene.add.rectangle(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            this.scene.scale.width,
            this.scene.scale.height,
            0x000000, 0.7
        );
        this.overlay.setDepth(WormGameConfig.DEPTH.UI - 1);
        this.overlay.setVisible(false);

        // Create container for popup elements
        this.container = this.scene.add.container(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2
        );
        this.container.setDepth(WormGameConfig.DEPTH.UI);
        this.container.setVisible(false);

        // Subscribe to game events
        this.scene.events.on('GAME_WIN', this.showWin, this);
        this.scene.events.on('GAME_OVER', this.showLose, this);
    }

    private showWin({ arrived }: { arrived: number }) {
        const scoreResult = this.scene.scoringSystem.calculateScore();
        this.show({
            isWin: true,
            score: scoreResult.score,
            stars: scoreResult.stars,
            message: 'ยินดีด้วย!'
        });
    }

    private showLose({ reason }: { reason: string }) {
        const reasonText = this.getFailReasonText(reason);
        this.show({
            isWin: false,
            score: 0,
            stars: 0,
            message: reasonText
        });
    }

    private getFailReasonText(reason: string): string {
        switch (reason) {
            case 'WRONG_HOLE': return 'หนอนเข้าผิดหลุม!';
            case 'TRAP_SPIDER': return 'หนอนโดนแมงมุมจับ!';
            case 'COLLISION': return 'หนอนชนกัน!';
            default: return 'เกมจบ';
        }
    }

    private show(data: PopupData) {
        if (this.visible) return;
        this.visible = true;

        // Clear previous content
        this.container.removeAll(true);

        // Background panel
        const panelWidth = 320;
        const panelHeight = 280;
        const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0xffffff, 1);
        panel.setStrokeStyle(4, data.isWin ? 0x4CAF50 : 0xF44336);
        this.container.add(panel);

        // Title
        const titleColor = data.isWin ? '#4CAF50' : '#F44336';
        const title = this.scene.add.text(0, -100, data.message, {
            fontSize: '28px',
            fontFamily: 'Arial, sans-serif',
            color: titleColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(title);

        if (data.isWin) {
            // Stars
            const starY = -40;
            for (let i = 0; i < 3; i++) {
                const isFilled = i < data.stars;
                const star = this.scene.add.text(-50 + (i * 50), starY, '★', {
                    fontSize: '40px',
                    color: isFilled ? '#FFD700' : '#CCCCCC'
                }).setOrigin(0.5);
                this.container.add(star);
            }

            // Score
            const scoreText = this.scene.add.text(0, 20, `คะแนน: ${data.score}`, {
                fontSize: '24px',
                fontFamily: 'Arial, sans-serif',
                color: '#333333'
            }).setOrigin(0.5);
            this.container.add(scoreText);
        }

        // Buttons
        const buttonY = 80;

        // Retry Button
        const retryBtn = this.createButton(-70, buttonY, 'เล่นใหม่', 0x2196F3, () => {
            this.hide();
            this.scene.scene.restart();
        });
        this.container.add(retryBtn);

        // Home Button
        const homeBtn = this.createButton(70, buttonY, 'กลับหลัก', 0x9E9E9E, () => {
            window.location.href = '/allgames';
        });
        this.container.add(homeBtn);

        // Show with animation
        this.overlay.setVisible(true);
        this.container.setVisible(true);
        this.container.setScale(0.5);
        this.container.setAlpha(0);

        this.scene.tweens.add({
            targets: this.container,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Mark game as over
        this.scene.gameOver = true;
    }

    private createButton(x: number, y: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
        const btnContainer = this.scene.add.container(x, y);

        const bg = this.scene.add.rectangle(0, 0, 120, 40, color, 1);
        bg.setStrokeStyle(2, 0xffffff);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', onClick);
        bg.on('pointerover', () => bg.setFillStyle(color, 0.8));
        bg.on('pointerout', () => bg.setFillStyle(color, 1));

        const text = this.scene.add.text(0, 0, label, {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);

        btnContainer.add([bg, text]);
        return btnContainer;
    }

    private hide() {
        this.visible = false;
        this.overlay.setVisible(false);
        this.container.setVisible(false);
    }
}
