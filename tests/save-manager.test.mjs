import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/core/SaveManager.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
let instance = 0;
async function load(storage) {
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  return (await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}#${instance++}`)).saves;
}

test('run results survive reload and high score never decreases', async () => {
  let stored = null;
  const storage = { getItem: () => stored, setItem: (_key, value) => { stored = value; } };
  const first = await load(storage);
  first.finish(700, 3, true); first.finish(100, 1, false);
  const reloaded = await load(storage);
  assert.equal(reloaded.data.highScore, 700); assert.equal(reloaded.data.coins, 4);
  assert.equal(reloaded.data.runs, 2); assert.equal(reloaded.data.wins, 1);
});

test('invalid saved values are not accepted', async () => {
  const manager = await load({ getItem: () => JSON.stringify({ version: 1, coins: -10, highScore: 'bad', sfx: 'yes', wins: 2.5 }), setItem() {} });
  assert.equal(manager.data.coins, 0); assert.equal(manager.data.highScore, 0);
  assert.equal(manager.data.sfx, true); assert.equal(manager.data.wins, 0);
});

test('unavailable storage retains session-only results without crashing', async () => {
  const manager = await load({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  manager.finish(300, 2, false);
  assert.equal(manager.persistent, false); assert.equal(manager.data.highScore, 300);
});

test('settings persist independently from run results', async () => {
  let stored = null;
  const storage = { getItem: () => stored, setItem: (_key, value) => { stored = value; } };
  const manager = await load(storage);
  manager.data.music = true; manager.data.haptics = false; manager.write();
  const reloaded = await load(storage);
  assert.equal(reloaded.data.music, true); assert.equal(reloaded.data.haptics, false);
});
