import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';

interface Particle {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  max: number;
  gravity: number;
  spin: number;
  active: boolean;
  scale0: number;
  fade: boolean;
}

export interface BurstOpts {
  speed?: [number, number];
  /** Yön aralığı, derece (0 = sağ, −90 = yukarı) */
  angle?: [number, number];
  gravity?: number;
  life?: [number, number];
  scale?: [number, number];
  spin?: number;
  fade?: boolean;
  tint?: number;
}

const POOL_SIZE = 160;

/** Havuzlu partiküller, kamera sarsıntısı, ölçek "pop", kırmızı yanıp sönme ve ışıltı halkası. */
export class Fx {
  private pool: Particle[] = [];
  private ring: Phaser.GameObjects.Graphics[] = [];

  constructor(private scene: Phaser.Scene, depth = 16) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const img = scene.add.image(0, 0, 'drop').setDepth(depth).setVisible(false);
      this.pool.push({ img, vx: 0, vy: 0, life: 0, max: 1, gravity: 0, spin: 0, active: false, scale0: 1, fade: true });
    }
    for (let i = 0; i < 4; i++) this.ring.push(scene.add.graphics().setDepth(depth).setVisible(false));
  }

  burst(texture: string, x: number, y: number, count: number, o: BurstOpts = {}): void {
    const [s0, s1] = o.speed ?? [60, 200];
    const [a0, a1] = o.angle ?? [-150, -30];
    const [l0, l1] = o.life ?? [0.4, 0.8];
    const [c0, c1] = o.scale ?? [0.8, 1.3];
    for (let i = 0; i < count; i++) {
      const p = this.pool.find((q) => !q.active);
      if (!p) return;
      const a = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(a0, a1));
      const sp = Phaser.Math.FloatBetween(s0, s1);
      p.active = true;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.max = p.life = Phaser.Math.FloatBetween(l0, l1);
      p.gravity = o.gravity ?? 600;
      p.spin = o.spin ?? 0;
      p.fade = o.fade ?? true;
      p.scale0 = Phaser.Math.FloatBetween(c0, c1);
      p.img.setTexture(texture).setPosition(x, y).setScale(p.scale0).setAlpha(1).setRotation(Phaser.Math.FloatBetween(0, 6.28)).setVisible(true);
      if (o.tint !== undefined) p.img.setTint(o.tint);
      else p.img.clearTint();
    }
  }

  /** Konfeti: palet renklerinde kâğıt parçaları yukarı fışkırır. */
  confetti(x: number, y: number, count = 24): void {
    for (let i = 0; i < count; i++) {
      this.burst(`confetti_${i % 6}`, x, y, 1, {
        speed: [140, 420], angle: [-130, -50], gravity: 700, life: [0.9, 1.6], scale: [0.9, 1.4], spin: 8,
      });
    }
  }

  drops(x: number, y: number, count: number, big = false): void {
    this.burst('drop', x, y, count, {
      speed: big ? [140, 420] : [60, 200], angle: [-140, -40], gravity: 800, life: [0.5, 0.9], scale: big ? [1.1, 2] : [0.7, 1.2],
    });
  }

  dust(x: number, y: number, count: number): void {
    this.burst('dust', x, y, count, { speed: [30, 110], angle: [-170, -10], gravity: 120, life: [0.35, 0.6], scale: [0.7, 1.2], spin: 3 });
  }

  /** Işıltı halkası + ışıltılar (PERFECT). */
  sparkleRing(x: number, y: number): void {
    const g = this.ring.find((r) => !r.visible);
    if (g) {
      g.clear().lineStyle(4, 0xffffff, 1).strokeCircle(0, 0, 18).setPosition(x, y).setScale(0.6).setAlpha(1).setVisible(true);
      this.scene.tweens.add({ targets: g, scale: 2.4, alpha: 0, duration: 420, ease: 'Sine.easeOut', onComplete: () => g.setVisible(false) });
    }
    this.burst('sparkle', x, y, 8, { speed: [60, 200], angle: [-180, 0], gravity: 100, life: [0.4, 0.7], scale: [0.8, 1.4], spin: 4 });
  }

  /** Kamera sarsıntısı (sadece verilen kamera). */
  shake(cam: Phaser.Cameras.Scene2D.Camera, px: number, ms: number, width: number): void {
    cam.shake(ms, px / width);
  }

  /** Ölçek "pop": 1,08 → 1, 80 ms. */
  pop(target: Phaser.GameObjects.Image): void {
    this.scene.tweens.killTweensOf(target);
    target.setScale(1.08);
    this.scene.tweens.add({ targets: target, scale: 1, duration: 80 });
  }

  /** Kırmızı yanıp sönme (3 kez). */
  flashRed(targets: Phaser.GameObjects.Image[], times = 3): void {
    let n = 0;
    const toggle = (): void => {
      const on = n % 2 === 0;
      for (const t of targets) {
        if (!t.active) continue;
        if (on) t.setTint(hex(PALETTE.uiRed)).setTintMode(Phaser.TintModes.FILL);
        else t.clearTint();
      }
      if (++n < times * 2) this.scene.time.delayedCall(110, toggle);
      else for (const t of targets) if (t.active) t.clearTint();
    };
    toggle();
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.img.setVisible(false);
        continue;
      }
      p.vy += p.gravity * dt;
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      p.img.rotation += p.spin * dt;
      const k = p.life / p.max;
      if (p.fade) p.img.setAlpha(Math.min(1, k * 1.6));
    }
  }

  destroy(): void {
    for (const p of this.pool) p.img.destroy();
    for (const r of this.ring) r.destroy();
  }
}
