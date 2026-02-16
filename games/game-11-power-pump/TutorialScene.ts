import * as Phaser from 'phaser';

export class PowerPumpTutorialScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PowerPumpTutorialScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0xF4F7FB);

    this.add.text(width / 2, height * 0.3, 'Power Pump', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '32px',
      color: '#0F172A',
      fontStyle: '700'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.45, 'Tap tiles to rotate\nBuild pipes first\nConnect wire to pump last for 3★', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '20px',
      color: '#334155',
      align: 'center'
    }).setOrigin(0.5);

    const cta = this.add.text(width / 2, height * 0.72, 'Tap to start', {
      fontFamily: 'Sarabun, Arial, sans-serif',
      fontSize: '20px',
      color: '#0F172A',
      backgroundColor: '#E2E8F0',
      padding: { left: 14, right: 14, top: 8, bottom: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: cta,
      alpha: 0.4,
      duration: 700,
      yoyo: true,
      repeat: -1
    });

    this.input.once('pointerdown', () => {
      const onTutorialComplete = this.registry.get('onTutorialComplete');
      if (onTutorialComplete) {
        onTutorialComplete();
      } else {
        this.scene.start('PowerPumpGameScene', { level: this.registry.get('level') || 1 });
      }
    });
  }
}
