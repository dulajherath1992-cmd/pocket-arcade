import Phaser from 'phaser';
import { TankWorld, vectors, BASE } from './TankWorld';
import type { Direction, Tank } from './TankWorld';
import { audio } from '../../core/AudioManager';
import { saves } from '../../core/SaveManager';
import { haptics } from '../../core/HapticManager';
import { action, overlay } from '../../shared/ui/Overlay';

export class TinyTankScene extends Phaser.Scene {
  private world!: TankWorld;
  private art!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private paused = false;
  private settled = false;
  private panel?: HTMLDivElement;
  private held = new Map<number, string>();
  private particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  private clock = 0;

  constructor() { super('tiny-tank'); }

  create(): void {
    this.world = new TankWorld();
    this.paused = false; this.settled = false; this.held.clear();
    this.particles = []; this.clock = 0;
    this.art = this.add.graphics();
    this.add.text(20, 19, 'TINY TANK', { fontFamily: 'monospace', fontSize: '22px', color: '#d9edbe' });
    this.hud = this.add.text(20, 53, '', { fontFamily: 'monospace', fontSize: '14px', color: '#d9edbe', lineSpacing: 4 });
    this.hint = this.add.text(180, 475, 'PROTECT THE BASE • 5 WAVES', {
      fontFamily: 'monospace', fontSize: '13px', color: '#8fa89c',
    }).setOrigin(0.5);
    const pause = this.add.text(286, 14, 'Ⅱ', {
      fontFamily: 'monospace', fontSize: '26px', color: '#e7b94f',
      backgroundColor: '#263a36', padding: { x: 14, y: 7 },
    }).setInteractive({ useHandCursor: true });
    pause.on('pointerdown', () => this.pauseGame());
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    const control = (x: number, y: number, label: string, code: string, width = 46, height = 46) => {
      const box = this.add.rectangle(x, y, width, height, code === 'fire' ? 0xd9a63d : 0x263a36)
        .setStrokeStyle(2, code === 'fire' ? 0xf8d276 : 0x45645a).setInteractive();
      this.add.text(x, y, label, {
        fontFamily: 'monospace', fontSize: code === 'fire' ? '20px' : '22px',
        color: code === 'fire' ? '#101e1d' : '#c6d8cc',
      }).setOrigin(0.5);
      box.on('pointerdown', (p: Phaser.Input.Pointer) => { this.held.set(p.id, code); box.setAlpha(0.65); });
      const release = (p: Phaser.Input.Pointer) => { this.held.delete(p.id); box.setAlpha(1); };
      box.on('pointerup', release); box.on('pointerout', release);
    };
    control(86, 522, '▲', 'up'); control(38, 570, '◀', 'left');
    control(86, 570, '▼', 'down'); control(134, 570, '▶', 'right');
    control(282, 554, 'FIRE', 'fire', 96, 82);
    this.add.text(180, 617, 'WASD / ARROWS + SPACE • ESC TO PAUSE', {
      fontFamily: 'monospace', fontSize: '11px', color: '#8fa89c',
    }).setOrigin(0.5);
    const releaseAll = () => this.held.clear();
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.held.delete(p.id));
    this.input.on('gameout', releaseAll);
    const blur = () => this.pauseGame();
    this.game.events.on(Phaser.Core.Events.BLUR, blur);
    this.game.events.on(Phaser.Core.Events.HIDDEN, blur);
    audio.music();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, blur);
      this.game.events.off(Phaser.Core.Events.HIDDEN, blur);
      this.panel?.remove(); this.panel = undefined;
      this.held.clear(); audio.stop();
    });
    this.draw();
  }

  update(_time: number, delta: number): void {
    if (this.keys?.ESC && Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      if (this.paused && !this.settled) this.resumeGame(); else this.pauseGame();
    }
    if (this.paused || this.settled) return;
    const held = (name: string) => [...this.held.values()].includes(name);
    const down = (...names: string[]) => names.some(name => this.keys?.[name]?.isDown);
    let direction: Direction | null = null;
    if (held('up') || down('W', 'UP')) direction = 0;
    else if (held('right') || down('D', 'RIGHT')) direction = 1;
    else if (held('down') || down('S', 'DOWN')) direction = 2;
    else if (held('left') || down('A', 'LEFT')) direction = 3;
    const dt = Math.min(delta / 1000, 0.05);
    this.clock += dt;
    this.world.step(dt, { direction, fire: held('fire') || down('SPACE') });
    for (const event of this.world.events) {
      audio.play(event.kind);
      if (event.kind === 'hurt') { haptics.pulse('heavy'); this.cameras.main.shake(110, 0.006); }
      if (event.kind === 'coin') haptics.pulse('light');
      if (event.kind === 'wave') haptics.pulse('success');
      if (event.kind === 'hit' || event.kind === 'hurt') {
        for (let i = 0; i < 10 && this.particles.length < 80; i++) {
          this.particles.push({ x: event.x, y: event.y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.35 });
        }
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    this.draw();
    if (this.world.state !== 'playing') this.finish();
  }

  private drawTank(tank: Tank, color: number): void {
    const g = this.art, x = Math.round(tank.x), y = Math.round(tank.y), v = vectors[tank.dir];
    g.fillStyle(0x0d1716).fillRect(x - 12, y - 10, 25, 24);
    g.fillStyle(0x64776a);
    if (tank.dir % 2 === 0) { g.fillRect(x - 11, y - 11, 5, 22); g.fillRect(x + 6, y - 11, 5, 22); }
    else { g.fillRect(x - 11, y - 11, 22, 5); g.fillRect(x - 11, y + 6, 22, 5); }
    g.fillStyle(color).fillRect(x - 7, y - 7, 14, 14);
    g.fillStyle(0xe8dfb7).fillRect(x - 4, y - 4, 8, 8);
    g.lineStyle(5, color).lineBetween(x, y, x + v.x * 15, y + v.y * 15);
    if (tank.hp > 1 && tank !== this.world.player) g.fillStyle(0xffffff).fillRect(x - 2, y - 2, 4, 4);
  }

  private draw(): void {
    const w = this.world, g = this.art;
    g.clear().fillStyle(0x1a2d29).fillRect(20, 100, 320, 352);
    g.lineStyle(1, 0x233a32);
    for (let x = 20; x <= 340; x += 16) g.lineBetween(x, 100, x, 452);
    for (let y = 100; y <= 452; y += 16) g.lineBetween(20, y, 340, y);
    for (const wall of w.walls) {
      g.fillStyle(wall.steel ? 0x78918b : wall.hp === 1 ? 0x795138 : 0xa47649).fillRect(wall.x - 8, wall.y - 8, 16, 16);
      g.lineStyle(1, 0x263b31).strokeRect(wall.x - 8, wall.y - 8, 16, 16);
      g.lineBetween(wall.x - 7, wall.y, wall.x + 7, wall.y);
      if (!wall.steel) g.lineBetween(wall.x, wall.y - 7, wall.x, wall.y);
    }
    g.fillStyle(0x0c1715).fillRect(BASE.x - 16, BASE.y - 16, 32, 32);
    g.lineStyle(2, w.baseHP > 1 ? 0xd9b55b : 0xff715b).strokeRect(BASE.x - 14, BASE.y - 14, 28, 28);
    g.fillStyle(0xd9b55b).fillRect(BASE.x - 8, BASE.y - 3, 16, 6).fillRect(BASE.x - 3, BASE.y - 8, 6, 16);
    for (const pickup of w.pickups) {
      g.fillStyle(pickup.kind === 'coin' ? 0xf3c859 : pickup.kind === 'heal' ? 0x8de4b0 : 0x77c9ff);
      g.fillRect(pickup.x - 5, pickup.y - 5, 10, 10);
      g.fillStyle(0x24352c);
      if (pickup.kind === 'heal') g.fillRect(pickup.x - 3, pickup.y - 1, 6, 2).fillRect(pickup.x - 1, pickup.y - 3, 2, 6);
      else g.fillRect(pickup.x - 1, pickup.y - 3, 2, 6);
    }
    for (const enemy of w.enemies) this.drawTank(enemy, 0xec7958);
    if (w.invulnerable <= 0 || Math.floor(this.clock * 12) % 2 === 0) this.drawTank(w.player, 0xb5ee71);
    for (const b of w.bullets) if (b.active) g.fillStyle(b.enemy ? 0xff775e : 0xffeea1).fillRect(b.x - 2, b.y - 2, 4, 4);
    for (const p of this.particles) g.fillStyle(0xffc85b, p.life / 0.35).fillRect(p.x, p.y, 4, 4);
    this.hud.setText(`SCORE ${String(w.score).padStart(5, '0')}   WAVE ${w.wave || 1}/5\nHP ${'♥'.repeat(Math.max(0, w.player.hp))}  BASE ${w.baseHP}  COINS ${w.coins}  FOES ${w.activeEnemies}`);
    this.hint.setText(w.rapid > 0 ? `RAPID FIRE • ${Math.ceil(w.rapid)}s` : w.activeEnemies === 0 ? 'WAVE CLEAR • STAY READY' : 'GOLD: COIN   GREEN: REPAIR   BLUE: RAPID');
  }

  private pauseGame(): void {
    if (this.paused || this.settled) return;
    this.paused = true; this.held.clear(); this.input.keyboard?.resetKeys(); audio.stop();
    this.panel = overlay(this, `<section class="dialog"><p class="eyebrow">TAKE A BREATHER</p><h2>PAUSED</h2>
      <button id="resume" class="primary">RESUME MISSION</button><button id="quit" class="secondary">END RUN & RETURN</button>
      <p class="muted">Ending the run banks your current score and collected coins.</p></section>`);
    action(this.panel, 'resume', () => this.resumeGame());
    action(this.panel, 'quit', () => { this.bank(false); this.scene.start('main-menu'); });
  }

  private resumeGame(): void {
    this.panel?.remove(); this.panel = undefined;
    this.held.clear(); this.input.keyboard?.resetKeys(); this.paused = false;
    audio.unlock(); audio.music();
  }

  private bank(won: boolean): void {
    if (this.settled) return;
    this.settled = true;
    saves.finish(this.world.score, this.world.coins, won);
  }

  private finish(): void {
    const won = this.world.state === 'won', record = this.world.score > saves.data.highScore;
    this.bank(won); audio.stop(); this.held.clear();
    haptics.pulse(won ? 'success' : 'heavy');
    this.panel = overlay(this, `<section class="dialog"><p class="eyebrow">${won ? 'ALL FIVE WAVES CLEARED' : this.world.baseHP <= 0 ? 'YOUR BASE WAS DESTROYED' : 'YOUR TANK WAS DESTROYED'}</p>
      <h2>${won ? 'MISSION<br>COMPLETE' : 'GAME OVER'}</h2><p class="result-score">${this.world.score.toLocaleString()}</p>
      <p class="muted">${record ? 'NEW PERSONAL BEST · ' : ''}+${this.world.coins} coins collected</p>
      <button id="restart" class="primary">PLAY AGAIN</button><button id="arcade" class="secondary">RETURN TO ARCADE</button>
      ${saves.persistent ? '' : '<p class="muted">Storage unavailable: this result is saved for this session only.</p>'}</section>`);
    action(this.panel, 'restart', () => { audio.unlock(); this.scene.restart(); });
    action(this.panel, 'arcade', () => this.scene.start('main-menu'));
  }
}
