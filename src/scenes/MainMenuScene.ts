import Phaser from 'phaser';
import { saves } from '../core/SaveManager';
import { audio } from '../core/AudioManager';
import { haptics } from '../core/HapticManager';
import { games } from '../core/GameRegistry';
import { overlay, action } from '../shared/ui/Overlay';

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('main-menu'); }

  create(): void {
    audio.stop();
    const root = overlay(this, '');
    const render = () => {
      const d = saves.data;
      root.innerHTML = `<section class="menu-shell">
        <header class="topline"><span>YOUR POCKET. YOUR ARCADE.</span><span class="coin">● ${d.coins}</span></header>
        <div class="brand"><p class="eyebrow">SMALL GAMES / BIG SCORES</p><h1>POCKET<br><em>ARCADE</em><span class="spark">✦</span></h1><p>One more round?</p></div>
        <div class="section-label"><span>YOUR COLLECTION</span><span>01 GAME</span></div>
        <article class="cartridge"><div class="cartridge-top"><span>01 / ACTION</span><span class="badge">READY TO PLAY</span></div>
          <h2>TINY TANK<br>BATTLE<span class="crosshair">⊕</span></h2><p>${games[0].description}</p>
          <div class="record"><span>PERSONAL BEST</span><strong>${d.highScore.toLocaleString()}</strong></div>
          <button id="play" class="primary">PLAY TINY TANK <span>▶</span></button>
        </article>
        <p class="how-to">Move with arrows / WASD. Hold SPACE to fire.<br>On mobile, hold the direction pad + FIRE.<br>Protect the gold base. Green tank = you.</p>
        <nav class="menu-nav"><button id="profile">MY PROGRESS</button><button id="settings">SETTINGS</button></nav>
        <footer>ORIGINAL GAMES. NO ADS. JUST PLAY.<br>${saves.persistent ? 'Progress saved on this device.' : 'Storage unavailable — progress lasts for this session only.'}</footer>
      </section>`;
      action(root, 'play', () => {
        audio.unlock(); audio.play('menu'); haptics.pulse('light');
        this.scene.start(games[0].scene);
      });
      action(root, 'settings', settings);
      action(root, 'profile', () => {
        root.innerHTML = `<section class="dialog"><p class="eyebrow">PLAYER 01</p><h2>MY PROGRESS</h2>
          <div class="stats"><p>BEST SCORE<strong>${d.highScore}</strong></p><p>COINS<strong>${d.coins}</strong></p><p>RUNS<strong>${d.runs}</strong></p><p>VICTORIES<strong>${d.wins}</strong></p></div>
          <p class="muted">Stored on this device. No account required.</p><button id="back" class="primary">BACK TO ARCADE</button></section>`;
        action(root, 'back', render);
      });
    };
    const settings = () => {
      const d = saves.data;
      root.innerHTML = `<section class="dialog"><p class="eyebrow">MAKE IT YOURS</p><h2>SETTINGS</h2>
        ${(['music', 'sfx', 'haptics'] as const).map(key => `<button class="setting" id="${key}" aria-pressed="${d[key]}"><span>${key === 'sfx' ? 'SOUND EFFECTS' : key.toUpperCase()}</span><strong>${d[key] ? 'ON' : 'OFF'}</strong></button>`).join('')}
        <p class="muted">Vibration works on supported devices. Native iOS haptics will come with the mobile app.</p>
        <button id="back" class="primary">BACK TO ARCADE</button></section>`;
      for (const key of ['music', 'sfx', 'haptics'] as const) {
        action(root, key, () => {
          d[key] = !d[key]; saves.write(); audio.unlock(); audio.play('menu');
          if (key === 'haptics') haptics.pulse('light');
          settings();
        });
      }
      action(root, 'back', render);
    };
    render();
  }
}
