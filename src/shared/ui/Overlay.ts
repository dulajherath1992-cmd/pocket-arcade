import Phaser from 'phaser';

export function overlay(scene: Phaser.Scene, html: string): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'overlay';
  root.innerHTML = html;
  document.body.append(root);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => root.remove());
  return root;
}

export function action(root: HTMLElement, id: string, fn: () => void): void {
  root.querySelector<HTMLButtonElement>(`#${id}`)?.addEventListener('click', fn);
}
