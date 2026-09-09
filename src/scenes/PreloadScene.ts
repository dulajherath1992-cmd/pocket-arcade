import Phaser from 'phaser';
import { SceneKeys } from '../config/sceneKeys';

export class PreloadScene extends Phaser.Scene {
  private failed = false;
  private status!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Rectangle;

  constructor() {
    super(SceneKeys.preload);
  }

  init(): void {
    this.failed = false;
  }

  preload(): void {
    this.add.text(180, 230, 'POCKET ARCADE', {
      fontFamily: 'monospace', fontSize: '28px', color: '#b5f36a',
    }).setOrigin(0.5);
    this.add.rectangle(180, 320, 280, 16, 0x364362);
    this.bar = this.add.rectangle(40, 320, 0, 16, 0xb5f36a).setOrigin(0, 0.5);
    this.status = this.add.text(180, 370, 'Loading shared assets… 0%', {
      fontFamily: 'monospace', fontSize: '16px', color: '#f5f3df',
      align: 'center', wordWrap: { width: 300 },
    }).setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, this.onProgress, this);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onLoadError, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    // Vite's base URL also supports deployments inside a subdirectory.
    this.load.json('arcade-theme', `${import.meta.env.BASE_URL}assets/ui/theme.json`);
  }

  create(): void {
    this.cleanup();
    if (this.failed) return;

    const theme: unknown = this.cache.json.get('arcade-theme');
    if (typeof theme !== 'object' || theme === null || !('accent' in theme)
      || typeof theme.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(theme.accent)) {
      this.showFailure('The shared theme is invalid.');
      return;
    }
    this.scene.start('main-menu');
  }

  private onProgress(value: number): void {
    if (this.failed) return;
    this.bar.width = 280 * value;
    this.status.setText(`Loading shared assets… ${Math.round(value * 100)}%`);
  }

  private onLoadError(file: Phaser.Loader.File): void {
    console.error(`Could not load asset: ${file.key}`);
    if (!this.failed) this.showFailure('Could not load shared assets.');
  }

  private showFailure(message: string): void {
    this.failed = true;
    this.status.setText(`${message}\nCheck your connection and reload.`).setColor('#ff9b9b');
    this.add.text(180, 460, 'RELOAD', {
      fontFamily: 'monospace', fontSize: '20px', color: '#101427',
      backgroundColor: '#b5f36a', padding: { x: 28, y: 16 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .once('pointerup', () => window.location.reload());
  }

  private cleanup(): void {
    this.load.off(Phaser.Loader.Events.PROGRESS, this.onProgress, this);
    this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onLoadError, this);
  }
}
