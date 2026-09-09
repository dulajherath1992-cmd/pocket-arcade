import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import './style.css';

// Temporary rendering check. Boot and Preload scenes arrive in Phase 3.
class SetupScene extends Phaser.Scene {
  constructor() {
    super('setup');
  }

  create(): void {
    const text = (y: number, value: string, size: number, color: string) =>
      this.add.text(180, y, value, {
        fontFamily: 'monospace', fontSize: `${size}px`, color,
        align: 'center',
      }).setOrigin(0.5);

    this.add.rectangle(180, 320, 324, 568, 0x171e36)
      .setStrokeStyle(2, 0x364362);
    text(122, 'POCKET', 40, '#f5f3df');
    text(169, 'ARCADE', 40, '#b5f36a');
    text(224, 'PHASE 01 / SYSTEM CHECK', 14, '#aab6d3');

    const marker = this.add.rectangle(80, 320, 24, 24, 0xb5f36a);
    this.tweens.add({
      targets: marker, x: 280, duration: 1300,
      ease: 'Sine.inOut', yoyo: true, repeat: -1,
    });

    text(416, 'Phaser + TypeScript + Vite', 16, '#f5f3df');
    text(450, 'WebGL is running', 16, '#b5f36a');
    text(536, 'Your arcade starts here.', 14, '#aab6d3');
  }
}

try {
  const game = new Phaser.Game({ ...gameConfig, scene: [SetupScene] });
  if (import.meta.hot) {
    import.meta.hot.dispose(() => game.destroy(true));
  }
} catch (error) {
  console.error('Pocket Arcade failed to initialize.', error);
  const root = document.getElementById('game');
  if (root) {
    root.className = 'error';
    root.textContent = 'Pocket Arcade could not start. Enable WebGL / hardware acceleration in your browser and reload.';
  }
}
