import Phaser from 'phaser';
import type { Tuning } from '../config/tuning';
import { play } from '../core/audio';
import { haptic } from '../core/haptics';
import type { FailKind } from './Run';
import type { Cargo } from './Cargo';
import type { Fx } from './Fx';

const AREA_REF = 72 * 56;
const MAX_PERFECT_SEMIS = 8;

/** §14 olay → efekt tablosu: ses, titreşim, partikül ve sarsıntı tek yerde. */
export class Feedback {
  constructor(private scene: Phaser.Scene, private fx: Fx, private T: Tuning) {}

  private get cam(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }

  spawned(x: number, y: number): void {
    this.fx.drops(x, y, 5);
    play('spawn');
  }

  hooked(c: Cargo): void {
    this.fx.pop(c.sprite);
    play('pickup');
    haptic('light');
  }

  /** Bırakma + iniş: yumuşak veya sert (≥ hardLandingImpact). */
  released(x: number, y: number, w: number, h: number, hard: boolean): void {
    play('release');
    const semis = Phaser.Math.Clamp(-6 * Math.log2((w * h) / AREA_REF), -8, 6);
    if (hard) {
      this.fx.shake(this.cam, this.T.fx.shakeHard, 120, this.scene.scale.width);
      this.fx.dust(x, y, 8);
      play('land_hard', { semis });
      haptic('medium');
    } else {
      this.fx.dust(x, y, 4);
      play('land', { semis });
      haptic('light');
    }
  }

  /** Puan alındığında: derece ışıltısı, seri perdesi, kilometre taşı konfetisi. */
  placed(x: number, y: number, o: { grade: 'normal' | 'perfect' | 'flawless'; streak: number; milestone: boolean; sweet: boolean }): void {
    if (o.grade !== 'normal') {
      this.fx.sparkleRing(x, y);
      if (o.grade === 'flawless') this.fx.sparkleRing(x, y - 18);
      play('perfect', { semis: Math.min(MAX_PERFECT_SEMIS, Math.max(0, o.streak - 1)) + (o.grade === 'flawless' ? 3 : 0) });
      haptic('medium');
    }
    if (o.sweet) play('sweet');
    if (o.milestone) {
      this.fx.confetti(x, y - 20, 20);
      play('steady');
      haptic('success');
    }
  }

  /** Gerçekçi temas geri bildirimi: şiddete göre ses/toz; `cargo` = başka kargoya çarpma (tahta takırtısı). */
  contact(x: number, y: number, impact: number, cargo: boolean): void {
    const k = Math.min(1, impact / 260);
    if (k < 0.08) return;
    if (cargo) play('clack', { vol: 0.5 + 0.5 * k, semis: Phaser.Math.Between(-2, 2) });
    else play('land', { vol: 0.4 + 0.6 * k, semis: -3 * k });
    this.fx.dust(x, y, Math.max(1, Math.round(5 * k)));
    if (k > 0.6) this.fx.shake(this.cam, 1.5 + 2 * k, 90, this.scene.scale.width);
  }

  creak(): void {
    play('creak');
  }

  snap(x: number, y: number): void {
    play('snap');
    haptic('heavy');
    this.fx.burst('dust', x, y, 8, { speed: [80, 240], angle: [-180, 0], gravity: 500, life: [0.3, 0.6], tint: 0x5a4636 });
    this.fx.shake(this.cam, this.T.fx.shakeHard, 150, this.scene.scale.width);
  }

  waterTouch(x: number, y: number): void {
    this.fx.drops(x, y, 7);
    play('splash_small');
  }

  saved(x: number, y: number): void {
    this.fx.sparkleRing(x, y);
    play('save');
    haptic('medium');
  }

  gustWarn(): void {
    play('gust_warn');
  }

  thunder(): void {
    play('thunder');
  }

  shipFull(x: number, y: number): void {
    this.fx.confetti(x, y, 30);
    play('horn');
    haptic('success');
  }

  /** FAILING: yavaş çekim dışındaki efektler. `culprit` kargo ya da null (helikopter). */
  fail(kind: FailKind, x: number, y: number, culprit: Cargo | null, heli: Phaser.GameObjects.Image[]): void {
    this.fx.shake(this.cam, this.T.fx.shakeFail, 250, this.scene.scale.width);
    haptic('heavy');
    if (kind === 'splash') {
      this.fx.drops(x, y, 22, true);
      play('splash');
    } else if (kind === 'crash') {
      this.fx.dust(x, y, 12);
      this.fx.burst('dust', x, y, 8, { speed: [120, 320], angle: [-180, 0], gravity: 900, life: [0.5, 0.9], tint: 0x34474b });
      play('crash');
    } else {
      play('topple');
    }
    // suçlu kırmızı yanıp söner: devrilen kargo, helikopter, ya da suya düşen kargo
    this.fx.flashRed(culprit ? [culprit.sprite] : heli);
  }

  /** NEW BEST / madalya (UI tarafı da çağırabilir). */
  newBest(): void {
    play('new_best');
    haptic('success');
  }

  medal(): void {
    play('medal');
    haptic('light');
  }
}
