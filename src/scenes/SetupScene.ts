import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';

// Temporary destination until MainMenuScene arrives in Phase 4.
export class SetupScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.setup);
  }

  create(data: { accent: string }): void {
    const text = (y: number, value: string, size: number, color: string) =>
      this.add.text(180, y, value, {
        fontFamily: 'monospace', fontSize: `${size}px`, color, align: 'center',
      }).setOrigin(0.5);

    this.add.rectangle(180, 320, 324, 568, 0x171e36).setStrokeStyle(2, 0x364362);
    text(122, 'POCKET', 40, '#f5f3df');
    text(169, 'ARCADE', 40, data.accent);
    text(224, 'PHASE 03 / STARTUP READY', 14, '#aab6d3');
    const marker = this.add.rectangle(80, 320, 24, 24, Number.parseInt(data.accent.slice(1), 16));
    this.tweens.add({
      targets: marker, x: 280, duration: 1300,
      ease: 'Sine.inOut', yoyo: true, repeat: -1,
    });
    text(416, 'Shared assets loaded', 16, '#f5f3df');
    text(450, 'WebGL is running', 16, data.accent);
    text(536, 'Next: the arcade main menu', 14, '#aab6d3');
  }
}
