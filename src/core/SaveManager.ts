export interface SaveData {
  version: 1;
  coins: number;
  highScore: number;
  runs: number;
  wins: number;
  music: boolean;
  sfx: boolean;
  haptics: boolean;
}

const defaults: SaveData = {
  version: 1, coins: 0, highScore: 0, runs: 0, wins: 0,
  music: false, sfx: true, haptics: true,
};

class SaveManager {
  readonly data: SaveData = { ...defaults };
  persistent = true;

  constructor() {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem('pocket-arcade-v1') ?? 'null');
      if (!raw || typeof raw !== 'object') return;
      const value = raw as Record<string, unknown>;
      if (value.version !== 1) return;
      for (const key of ['coins', 'highScore', 'runs', 'wins'] as const) {
        const n = value[key];
        if (typeof n === 'number' && Number.isSafeInteger(n) && n >= 0) this.data[key] = n;
      }
      for (const key of ['music', 'sfx', 'haptics'] as const) {
        if (typeof value[key] === 'boolean') this.data[key] = value[key];
      }
    } catch { this.persistent = false; }
  }

  write(): void {
    try {
      localStorage.setItem('pocket-arcade-v1', JSON.stringify(this.data));
      this.persistent = true;
    } catch { this.persistent = false; }
  }

  finish(score: number, coins: number, won: boolean): void {
    this.data.highScore = Math.max(this.data.highScore, score);
    this.data.coins += coins;
    this.data.runs++;
    if (won) this.data.wins++;
    this.write();
  }
}

export const saves = new SaveManager();
