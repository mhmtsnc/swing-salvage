import Phaser from 'phaser';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const start = (): void => {
      if (new URLSearchParams(location.search).get('debug') === 'stack') {
        this.scene.launch('StackDebugScene');
      } else {
        this.scene.launch('GameScene');
        this.scene.launch('UIScene');
      }
      this.scene.stop();
    };
    Promise.all([
      document.fonts.load('500 32px Fredoka'),
      document.fonts.load('600 32px Fredoka'),
      document.fonts.load('700 32px Fredoka'),
    ]).then(start, start);
  }
}
