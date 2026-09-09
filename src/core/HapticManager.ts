import { saves } from './SaveManager';

export const haptics = {
  pulse(strength: 'light' | 'heavy' | 'success'): void {
    if (!saves.data.haptics || !navigator.vibrate) return;
    try { navigator.vibrate(strength === 'light' ? 10 : strength === 'heavy' ? 70 : [25, 40, 25]); }
    catch { /* Unsupported browsers use a silent fallback. */ }
  },
};
