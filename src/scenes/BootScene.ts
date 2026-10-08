import Phaser from 'phaser';
import { makeAllTextures } from '../art/textures';
import { getTuning } from '../config/tuning';
import { initAudio, refreshAudioSettings } from '../core/audio';
import { refreshHapticSettings } from '../core/haptics';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const start = (): void => {
      makeAllTextures(this, getTuning());
      initAudio();
      refreshHapticSettings();
      this.game.events.on('ss:settings', () => {
        refreshAudioSettings();
        refreshHapticSettings();
      });
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
