import { saves } from './SaveManager';

// Original synthesized placeholders: no downloaded music or samples.
class AudioManager {
  private context?: AudioContext;
  private timer?: ReturnType<typeof setInterval>;
  private note = 0;

  unlock(): void {
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => undefined);
    } catch { /* Gameplay remains usable without audio. */ }
  }

  private tone(frequency: number, duration: number, gain: number, slide = frequency): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const osc = ctx.createOscillator();
    const volume = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + duration);
    volume.gain.setValueAtTime(gain, ctx.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(volume).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => { osc.disconnect(); volume.disconnect(); };
  }

  play(kind: 'fire' | 'hit' | 'coin' | 'wave' | 'menu' | 'hurt'): void {
    if (!saves.data.sfx) return;
    const sounds = {
      fire: [180, 0.07, 0.035, 55], hit: [85, 0.18, 0.06, 25],
      coin: [880, 0.12, 0.04, 1320], wave: [330, 0.4, 0.04, 660],
      menu: [440, 0.06, 0.025, 660], hurt: [130, 0.24, 0.06, 35],
    } as const;
    const [frequency, duration, gain, slide] = sounds[kind];
    this.tone(frequency, duration, gain, slide);
  }

  music(): void {
    this.stop();
    if (!saves.data.music) return;
    this.note = 0;
    const melody = [220, 0, 330, 294, 0, 440, 330, 196, 262, 0, 392, 330, 294, 0, 247, 196];
    this.timer = setInterval(() => {
      const frequency = melody[this.note++ % melody.length];
      if (frequency) this.tone(frequency, 0.13, 0.012);
    }, 190);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
export const audio = new AudioManager();
