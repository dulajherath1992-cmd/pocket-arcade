import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SetupScene } from './scenes/SetupScene';
import './style.css';

try {
  const game = new Phaser.Game({ ...gameConfig, scene: [BootScene, PreloadScene, SetupScene] });
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
