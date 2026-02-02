import * as Phaser from 'phaser';

export class TubeSortTutorialScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TubeSortTutorialScene' });
  }

  create(data: { level?: number }) {
    const { width, height } = this.scale;
    const regLevel = this.registry.get('level');
    const level = data.level || regLevel || 1;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000)
      .setAlpha(0.7)
      .setDepth(10)
      .setInteractive();

    const panelWidth = width * 0.8;
    const panelHeight = 300;
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0xFFFFFF)
      .setAlpha(0.98)
      .setDepth(11);

    const text = this.add.text(width / 2, height / 2 - 40,
      'วิธีเล่น\n\n1) แตะหลอดต้นทาง\n2) แตะหลอดปลายทาง\n3) เทได้เมื่อสีบนสุดเหมือนกันหรือหลอดว่าง\n\nจัดเรียงให้แต่ละหลอดมีสีเดียวกัน',
      {
        fontFamily: 'Sarabun, sans-serif',
        fontSize: '22px',
        color: '#2C3E50',
        align: 'center',
        padding: { top: 8, bottom: 8, left: 16, right: 16 },
        wordWrap: { width: panelWidth - 48 }
      }
    ).setOrigin(0.5).setDepth(12);

    const tapText = this.add.text(width / 2, height / 2 + 120, 'แตะเพื่อเริ่ม', {
      fontFamily: 'Sarabun, sans-serif',
      fontSize: '20px',
      color: '#888888',
      padding: { top: 4, bottom: 4, left: 10, right: 10 }
    }).setOrigin(0.5).setDepth(12);

    this.tweens.add({
      targets: tapText,
      alpha: 0.5,
      duration: 700,
      yoyo: true,
      repeat: -1
    });

    overlay.on('pointerdown', () => {
      this.scene.start('TubeSortGameScene', { level });
    });
    panel.on('pointerdown', () => {
      this.scene.start('TubeSortGameScene', { level });
    });
    text.on('pointerdown', () => {
      this.scene.start('TubeSortGameScene', { level });
    });
  }
}