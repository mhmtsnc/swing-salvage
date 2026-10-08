import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { RAIN_TILE } from '../art/textures';
import { MOCKUP_SCALE } from '../art/paths';
import type { Weather } from './Weather';

const STREAKS = 7;
const RAIN_A = { vx: -90, vy: 520, k: 1.0 };
const RAIN_B = { vx: -60, vy: 380, k: 0.6 };
const BOLT_MS = 180;
const FLASH_MS = 250;
const FLASH_ALPHA = 0.35;
const CLOUD_W = 430 * MOCKUP_SCALE;
const CLOUD_X = -20 * MOCKUP_SCALE;

/** Gökyüzü katmanları, ani rüzgâr uyarısı, yağmur ve şimşek görselleri. */
export class WeatherFx {
  private cloudBack: Phaser.GameObjects.Image;
  private cloudFront: Phaser.GameObjects.Image;
  private rainA: Phaser.GameObjects.TileSprite;
  private rainB: Phaser.GameObjects.TileSprite;
  private strips: Phaser.GameObjects.Image[];
  private tag: Phaser.GameObjects.Container;
  private bolt: Phaser.GameObjects.Image;
  private flash: Phaser.GameObjects.Rectangle;
  private rain = 0;
  private seeds = Array.from({ length: STREAKS }, (_, i) => ({
    y: (i + 0.5) / STREAKS,
    speed: 0.8 + ((i * 37) % 10) / 25,
    off: (i * 0.31) % 1,
  }));

  constructor(private scene: Phaser.Scene) {
    this.cloudBack = scene.add.image(CLOUD_X, 0, 'cloud_back').setOrigin(0, 0).setDepth(2);
    this.bolt = scene.add.image(0, 120, 'bolt').setOrigin(0.5, 0).setDepth(3).setVisible(false);
    this.cloudFront = scene.add.image(CLOUD_X, 0, 'cloud_front').setOrigin(0, 0).setDepth(4);
    this.rainA = scene.add.tileSprite(0, 0, 10, 10, 'rain_a').setOrigin(0, 0).setDepth(17).setAlpha(0);
    this.rainB = scene.add.tileSprite(0, 0, 10, 10, 'rain_b').setOrigin(0, 0).setDepth(17).setAlpha(0);
    this.flash = scene.add.rectangle(0, 0, 10, 10, 0xffffff).setOrigin(0, 0).setDepth(18).setAlpha(0);
    this.strips = Array.from({ length: STREAKS }, () =>
      scene.add.image(0, 0, 'paper_strip').setDepth(5).setVisible(false),
    );

    // "≫" etiketi: kâğıt kart + çizgi ikon (yön için scaleX çevrilir)
    const card = scene.add.graphics();
    card.fillStyle(hex(PALETTE.shadow), 0.18).fillRoundedRect(-27, -14, 54, 36, 10);
    card.fillStyle(hex(PALETTE.uiPaper), 1).fillRoundedRect(-27, -19, 54, 36, 10);
    const icon = scene.add.graphics();
    icon.lineStyle(2.2, hex(PALETTE.uiText), 1);
    icon.beginPath();
    icon.moveTo(-12, -8).lineTo(-5, 0).lineTo(-12, 8);
    icon.moveTo(3, -8).lineTo(10, 0).lineTo(3, 8);
    icon.strokePath();
    this.tag = scene.add.container(0, 0, [card, icon]).setDepth(19).setVisible(false);
  }

  /** Hedef yağmur yoğunluğu (0..1) — çağıran yumuşatır. */
  setRain(r: number): void {
    this.rain = r;
  }

  lightning(xFrac: number, W: number): void {
    this.bolt.setPosition(W * (0.12 + 0.76 * xFrac), 120).setVisible(true);
    this.scene.time.delayedCall(BOLT_MS, () => this.bolt.setVisible(false));
    this.flash.setAlpha(FLASH_ALPHA);
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: FLASH_MS });
  }

  update(weather: Weather, W: number, H: number, dtSec: number): void {
    const stretch = Math.max(1, (W - 2 * CLOUD_X) / CLOUD_W);
    this.cloudBack.setScale(stretch, 1);
    this.cloudFront.setScale(stretch, 1);
    this.flash.setSize(W, H);
    for (const [tile, cfg] of [[this.rainA, RAIN_A], [this.rainB, RAIN_B]] as const) {
      tile.setSize(W, H).setAlpha(this.rain * cfg.k);
      tile.tilePositionX = (tile.tilePositionX - cfg.vx * dtSec) % RAIN_TILE;
      tile.tilePositionY = (tile.tilePositionY - cfg.vy * dtSec) % RAIN_TILE;
    }

    const p = weather.phase;
    if (p === 'IDLE') {
      this.tag.setVisible(false);
      for (const s of this.strips) s.setVisible(false);
      return;
    }
    const fromLeft = weather.gustDir > 0;
    const t = p === 'WARN' ? weather.warnProgress() : 1;
    // Şeritler kenardan içeri akar; uyarı boyunca ekranı kat eder.
    this.strips.forEach((img, i) => {
      const s = this.seeds[i];
      const prog = (t * s.speed * 0.9 + s.off) % 1;
      const x = fromLeft ? -80 + prog * (W + 160) : W + 80 - prog * (W + 160);
      img.setVisible(true).setPosition(x, H * 0.18 + s.y * H * 0.5).setAlpha(0.85);
    });
    const pulse = 0.65 + 0.35 * Math.sin(this.scene.time.now / 90);
    this.tag.setVisible(true).setPosition(fromLeft ? 40 : W - 40, H * 0.5).setScale(fromLeft ? 1 : -1, 1).setAlpha(pulse);
  }

  destroy(): void {
    for (const o of [this.cloudBack, this.cloudFront, this.rainA, this.rainB, this.bolt, this.flash, this.tag, ...this.strips]) o.destroy();
  }
}
