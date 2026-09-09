import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/games/tiny-tank/TankWorld.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { TankWorld } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const idle = { direction: null, fire: false };
const step = (w, frames = 1, input = idle) => { for (let i = 0; i < frames; i++) w.step(1 / 60, input); };
const bullet = (w, x, y, enemy = false) => Object.assign(w.bullets[0], { x, y, enemy, active: true, dir: 0 });

test('wave one starts with four enemies including pending spawns', () => {
  const w = new TankWorld(() => 0.5); step(w, 65);
  assert.equal(w.wave, 1); assert.equal(w.activeEnemies, 4);
});

test('player movement respects arena and blocked walls', () => {
  const w = new TankWorld(); w.remaining = 1; w.spawnTimer = 100;
  w.player.x = 32; step(w, 60, { direction: 3, fire: false });
  assert.ok(w.player.x >= 31);
  w.player.x = 68; w.player.y = 208; step(w, 60, { direction: 0, fire: false });
  assert.ok(w.player.y >= 198);
});

test('brick takes two hits; steel survives', () => {
  const w = new TankWorld(); w.remaining = 1; w.spawnTimer = 100;
  bullet(w, 68, 185); step(w); assert.equal(w.walls.find(x => x.x === 68 && x.y === 180).hp, 1);
  bullet(w, 68, 185); step(w); assert.equal(w.walls.find(x => x.x === 68 && x.y === 180), undefined);
  bullet(w, 132, 281); step(w); assert.equal(w.walls.find(x => x.x === 132 && x.y === 276).hp, 2);
});

test('enemy kill awards score, drops a coin and releases the bullet', () => {
  const w = new TankWorld(); w.remaining = 1; w.spawnTimer = 100;
  w.enemies.push({ x: 180, y: 200, dir: 2, hp: 1, think: 100, cooldown: 100 });
  bullet(w, 180, 210); step(w);
  assert.equal(w.score, 100); assert.equal(w.kills, 1);
  assert.equal(w.pickups[0].kind, 'coin'); assert.equal(w.bullets[0].active, false);
});

test('invulnerability prevents repeated damage; zero health ends the run', () => {
  const w = new TankWorld(); w.remaining = 1; w.spawnTimer = 100;
  w.invulnerable = 0;
  bullet(w, 180, 395, true); step(w); assert.equal(w.player.hp, 2);
  bullet(w, 180, 395, true); step(w); assert.equal(w.player.hp, 2);
  w.invulnerable = 0; w.player.hp = 1;
  bullet(w, 180, 395, true); step(w); assert.equal(w.state, 'lost');
  const score = w.score; step(w, 100); assert.equal(w.score, score);
});

test('base damage can end a run, while friendly shots do not damage it', () => {
  const w = new TankWorld(); w.baseHP = 1;
  bullet(w, 180, 440); step(w); assert.equal(w.baseHP, 1);
  bullet(w, 180, 440, true); step(w); assert.equal(w.state, 'lost');
});

test('coin, repair and rapid-fire pickups apply on contact', () => {
  const w = new TankWorld(); w.player.hp = 1;
  w.pickups.push(...['coin', 'heal', 'rapid'].map(kind => ({ x: 180, y: 388, kind, ttl: 10 })));
  step(w); assert.equal(w.coins, 1); assert.equal(w.score, 25);
  assert.equal(w.player.hp, 2); assert.equal(w.rapid, 8); assert.equal(w.pickups.length, 0);
});

test('clearing all five waves leads to victory and restart is fresh', () => {
  const w = new TankWorld();
  for (let wave = 1; wave <= 5; wave++) {
    w.nextWaveTimer = 0; step(w); assert.equal(w.wave, wave);
    w.enemies.length = 0; w.remaining = 0;
  }
  w.nextWaveTimer = 0; step(w); assert.equal(w.state, 'won');
  const fresh = new TankWorld(); assert.equal(fresh.score, 0); assert.equal(fresh.player.hp, 3);
});

test('bullet pool stays bounded during sustained shooting', () => {
  const w = new TankWorld(() => 0.5); step(w, 3600, { direction: null, fire: true });
  assert.equal(w.bullets.length, 64); assert.ok(w.enemies.length <= 3);
});
