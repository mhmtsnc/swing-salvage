import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { makeWeatherTextures, RAIN_TILE } from '../art/textures';
import type { Weather } from './Weather';

const STREAKS = 7;
const RAIN_A = { vx: -90, vy: 520, k: 1.0 };
const RAIN_B = { vx: -60, vy: 380, k: 0.6 };
const BOLT_MS = 180;
const FLASH_MS = 250;
const FLASH_ALPHA = 0.35;

/** Ani rüzgâr uyarısı, yağmur ve şimşek görselleri. */
export class WeatherFx {
  private rainA: Phaser.GameObjects.TileSprite;
  private rainB: Phaser.GameObjects.TileSprite;
  private streaks: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Container;
  private labelText: Phaser.GameObjects.Text;
  private bolt: Phaser.GameObjects.Graphics;
  private flash: Phaser.GameObjects.Rectangle;
  private rain = 0;
  private seeds = Array.from({ length: STREAKS }, (_, i) => ({ y: (i + 0.5) / STREAKS, speed: 0.8 + ((i * 37) % 10) / 25, off: (i * 0.31) % 1 }));

  constructor(private scene: Phaser.Scene) {
    makeWeatherTextures(scene);
    this.rainA = scene.add.tileSprite(0, 0, 10, 10, 'rain_a').setOrigin(0, 0).setDepth(17).setAlpha(0);
    this.rainB = scene.add.tileSprite(0, 0, 10, 10, 'rain_b').setOrigin(0, 0).setDepth(17).setAlpha(0);
    this.streaks = scene.add.graphics().setDepth(5);
    this.bolt = scene.add.graphics().setDepth(3);
    this.flash = scene.add.rectangle(0, 0, 10, 10, 0xffffff).setOrigin(0, 0).setDepth(18).setAlpha(0);
    const bg = scene.add.rectangle(0, 0, 64, 44, hex(PALETTE.uiPaper)).setStrokeStyle(3, hex(PALETTE.uiTeal));
    this.labelText = scene.add
      .text(0, 0, '≫', { fontFamily: 'Fredoka', fontStyle: '700', fontSize: '34px', color: PALETTE.uiRed })
      .setOrigin(0.5);
    this.label = scene.add.container(0, 0, [bg, this.labelText]).setDepth(19).setVisible(false);
  }

  /** Hedef yağmur yoğunluğu (0..1) — çağıran yumuşatır. */
  setRain(r: number): void {
    this.rain = r;
  }

  lightning(xFrac: number, W: number, seaY: number): void {
    const g = this.bolt;
    g.clear();
    g.lineStyle(7, hex(PALETTE.lightning), 1);
    let x = W * (0.12 + 0.76 * xFrac);
    let y = 0;
    g.beginPath();
    g.moveTo(x, y);
    const end = seaY - 140;
    let dir = 1;
    while (y < end) {
      y += 50 + (x * 7) % 30;
      x += dir * (22 + (y * 3) % 18);
      dir = -dir;
      g.lineTo(x, y);
    }
    g.strokePath();
    g.setAlpha(1);
    this.scene.time.delayedCall(BOLT_MS, () => g.clear());
    this.flash.setAlpha(FLASH_ALPHA);
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: FLASH_MS });
  }

  update(weather: Weather, W: number, H: number, dtSec: number): void {
    this.flash.setSize(W, H);
    const a = this.rain;
    for (const [tile, cfg] of [[this.rainA, RAIN_A], [this.rainB, RAIN_B]] as const) {
      tile.setSize(W, H).setAlpha(a * cfg.k);
      tile.tilePositionX -= cfg.vx * dtSec;
      tile.tilePositionY -= cfg.vy * dtSec;
      tile.tilePositionX %= RAIN_TILE;
      tile.tilePositionY %= RAIN_TILE;
    }

    const g = this.streaks;
    g.clear();
    const p = weather.phase;
    if (p === 'IDLE') {
      this.label.setVisible(false);
      return;
    }
    const dir = weather.gustDir;
    const t = p === 'WARN' ? weather.warnProgress() : 1;
    const fromLeft = dir > 0;
    const len = W * 0.35;
    g.lineStyle(5, hex(PALETTE.foam), 0.85);
    for (const s of this.seeds) {
      // Şeritler kenardan içeri akar; uyarı ilerledikçe ekranı kat eder.
      const prog = (t * s.speed * 0.9 + s.off) % 1;
      const x0 = fromLeft ? -len + prog * (W + len) : W + len - prog * (W + len);
      const y = H * 0.18 + s.y * H * 0.5;
      g.beginPath();
      g.moveTo(x0, y);
      g.lineTo(x0 + (fromLeft ? len : -len), y);
      g.strokePath();
    }
    const pulse = 0.6 + 0.4 * Math.sin(this.scene.time.now / 90);
    this.label
      .setVisible(true)
      .setPosition(fromLeft ? 44 : W - 44, H * 0.5)
      .setAlpha(pulse);
    this.labelText.setText(fromLeft ? '≫' : '≪');
  }

  destroy(): void {
    this.rainA.destroy();
    this.rainB.destroy();
    this.streaks.destroy();
    this.bolt.destroy();
    this.flash.destroy();
    this.label.destroy();
  }
}
