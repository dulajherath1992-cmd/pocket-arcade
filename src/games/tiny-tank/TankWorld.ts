export type Direction = 0 | 1 | 2 | 3;
export const vectors = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
export interface Tank { x: number; y: number; dir: Direction; hp: number; cooldown: number; think: number }
export interface Bullet { x: number; y: number; dir: Direction; enemy: boolean; active: boolean }
export interface Wall { x: number; y: number; hp: number; steel: boolean }
export interface Pickup { x: number; y: number; kind: 'coin' | 'heal' | 'rapid'; ttl: number }
export interface WorldEvent { kind: 'fire' | 'hit' | 'coin' | 'wave' | 'hurt'; x: number; y: number }
export interface Input { direction: Direction | null; fire: boolean }
export const FIELD = { left: 20, right: 340, top: 100, bottom: 452 };
export const BASE = { x: 180, y: 432 };
const touches = (x: number, y: number, tx: number, ty: number, radius: number) =>
  Math.abs(x - tx) < radius && Math.abs(y - ty) < radius;

// Simulation has no Phaser, DOM, audio or storage dependency; it can be tested in Node.
export class TankWorld {
  player: Tank = { x: 180, y: 388, dir: 0, hp: 3, cooldown: 0, think: 0 };
  enemies: Tank[] = [];
  walls: Wall[] = [];
  bullets: Bullet[] = Array.from({ length: 64 }, () => ({ x: 0, y: 0, dir: 0, enemy: false, active: false }));
  pickups: Pickup[] = [];
  events: WorldEvent[] = [];
  score = 0;
  coins = 0;
  wave = 0;
  baseHP = 3;
  remaining = 0;
  kills = 0;
  invulnerable = 2;
  rapid = 0;
  spawnTimer = 0;
  nextWaveTimer = 1;
  state: 'playing' | 'won' | 'lost' = 'playing';
  private spawnLane = 0;

  constructor(private readonly random: () => number = Math.random) {
    for (const y of [180, 276, 356]) {
      for (const x of [68, 84, 100, 132, 148, 212, 228, 260, 276, 292]) {
        this.walls.push({ x, y, hp: 2, steel: y === 276 && (x === 132 || x === 228) });
      }
    }
    for (const x of [156, 204]) this.walls.push({ x, y: 428, hp: 3, steel: false });
  }

  get activeEnemies(): number { return this.remaining + this.enemies.length; }

  step(dt: number, input: Input): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    dt = Math.min(Math.max(dt, 0), 0.05);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.rapid = Math.max(0, this.rapid - dt);
    this.player.cooldown -= dt;
    if (input.direction !== null) {
      this.player.dir = input.direction;
      this.move(this.player, 112 * dt);
    }
    if (input.fire) this.shoot(this.player, false);

    if (this.activeEnemies === 0) {
      this.nextWaveTimer -= dt;
      if (this.nextWaveTimer <= 0) {
        if (this.wave === 5) { this.state = 'won'; return; }
        this.wave++;
        this.remaining = 3 + this.wave;
        this.spawnTimer = 0;
        this.nextWaveTimer = 1.5;
        this.emit('wave', BASE.x, BASE.y);
      }
    }
    this.spawnTimer -= dt;
    if (this.remaining > 0 && this.enemies.length < 3 && this.spawnTimer <= 0) {
      const x = [44, 180, 316][this.spawnLane++ % 3];
      if (!this.enemies.some(e => touches(x, 116, e.x, e.y, 25))
        && !touches(x, 116, this.player.x, this.player.y, 25)) {
        this.enemies.push({ x, y: 116, hp: this.wave >= 4 ? 2 : 1, dir: 2, cooldown: 1, think: 0.6 });
        this.remaining--;
      }
      this.spawnTimer = 0.9;
    }

    for (const enemy of this.enemies) {
      enemy.cooldown -= dt;
      enemy.think -= dt;
      if (enemy.think <= 0) {
        const target = this.random() < 0.65 ? this.player : BASE;
        const dx = target.x - enemy.x, dy = target.y - enemy.y;
        enemy.dir = this.random() < 0.22 ? Math.floor(this.random() * 4) as Direction
          : Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 1 : 3 : dy > 0 ? 2 : 0;
        enemy.think = 0.6 + this.random() * 0.6;
      }
      if (!this.move(enemy, (30 + this.wave * 5) * dt)) {
        enemy.think = Math.min(enemy.think, 0.12);
      }
      this.shoot(enemy, true);
    }

    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      // Small substeps prevent fast shots passing through thin walls.
      const distance = (bullet.enemy ? 165 : 280) * dt;
      const steps = Math.max(1, Math.ceil(distance / 4));
      for (let i = 0; i < steps && bullet.active; i++) {
        const v = vectors[bullet.dir];
        bullet.x += v.x * distance / steps;
        bullet.y += v.y * distance / steps;
        this.collide(bullet);
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.ttl -= dt;
      if (touches(p.x, p.y, this.player.x, this.player.y, 19)) {
        if (p.kind === 'coin') { this.coins++; this.score += 25; }
        if (p.kind === 'heal') this.player.hp = Math.min(3, this.player.hp + 1);
        if (p.kind === 'rapid') this.rapid = 8;
        this.emit('coin', p.x, p.y);
        this.pickups.splice(i, 1);
      } else if (p.ttl <= 0) this.pickups.splice(i, 1);
    }
    if (this.player.hp <= 0 || this.baseHP <= 0) this.state = 'lost';
  }

  private move(tank: Tank, distance: number): boolean {
    const v = vectors[tank.dir];
    const x = tank.x + v.x * distance, y = tank.y + v.y * distance;
    if (x < FIELD.left + 11 || x > FIELD.right - 11 || y < FIELD.top + 11 || y > FIELD.bottom - 11) return false;
    if (touches(x, y, BASE.x, BASE.y, 24)) return false;
    if (this.walls.some(w => touches(x, y, w.x, w.y, 18))) return false;
    if (tank !== this.player && touches(x, y, this.player.x, this.player.y, 22)) return false;
    if (this.enemies.some(e => e !== tank && touches(x, y, e.x, e.y, 22))) return false;
    tank.x = x; tank.y = y;
    return true;
  }

  private shoot(tank: Tank, enemy: boolean): void {
    if (tank.cooldown > 0) return;
    const bullet = this.bullets.find(b => !b.active);
    if (!bullet) return;
    const v = vectors[tank.dir];
    Object.assign(bullet, { x: tank.x + v.x * 13, y: tank.y + v.y * 13, dir: tank.dir, enemy, active: true });
    tank.cooldown = enemy ? Math.max(0.7, 2 - this.wave * 0.2) + this.random() * 0.5 : this.rapid > 0 ? 0.13 : 0.32;
    if (!enemy) this.emit('fire', tank.x, tank.y);
  }

  private collide(b: Bullet): void {
    if (b.x < FIELD.left || b.x > FIELD.right || b.y < FIELD.top || b.y > FIELD.bottom) { b.active = false; return; }
    const wi = this.walls.findIndex(w => touches(b.x, b.y, w.x, w.y, 10));
    if (wi >= 0) {
      const wall = this.walls[wi];
      b.active = false;
      if (!wall.steel && --wall.hp <= 0) { this.walls.splice(wi, 1); this.emit('hit', wall.x, wall.y); }
      return;
    }
    if (touches(b.x, b.y, BASE.x, BASE.y, 15)) {
      b.active = false;
      if (b.enemy) { this.baseHP--; this.emit('hurt', BASE.x, BASE.y); }
      return;
    }
    if (b.enemy) {
      if (touches(b.x, b.y, this.player.x, this.player.y, 12)) {
        b.active = false;
        if (this.invulnerable <= 0) {
          this.player.hp--; this.invulnerable = 1.2;
          this.emit('hurt', this.player.x, this.player.y);
        }
      }
    } else {
      const ei = this.enemies.findIndex(e => touches(b.x, b.y, e.x, e.y, 12));
      if (ei >= 0) {
        b.active = false;
        const enemy = this.enemies[ei];
        if (--enemy.hp <= 0) {
          this.enemies.splice(ei, 1); this.score += 100; this.kills++;
          this.emit('hit', enemy.x, enemy.y);
          this.pickups.push({ x: enemy.x, y: enemy.y, kind: 'coin', ttl: 20 });
          if (this.kills % 4 === 0) this.pickups.push({
            x: enemy.x, y: Math.min(enemy.y + 22, 434), kind: this.kills % 8 === 0 ? 'rapid' : 'heal', ttl: 15,
          });
          if (this.activeEnemies === 0) {
            this.score += this.wave * 100;
            // Do not leave the last enemy's stray shot to decide a completed wave.
            for (const shot of this.bullets) if (shot.enemy) shot.active = false;
          }
        }
      }
    }
  }

  private emit(kind: WorldEvent['kind'], x: number, y: number): void { this.events.push({ kind, x, y }); }
}
