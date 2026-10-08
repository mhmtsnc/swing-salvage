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

  /** Puan alındığında: PERFECT ışıltısı ve seri perdesi, STEADY HANDS konfetisi. */
  placed(x: number, y: number, perfect: boolean, steady: boolean, streak: number): void {
    if (perfect) {
      this.fx.sparkleRing(x, y);
      play('perfect', { semis: Math.min(MAX_PERFECT_SEMIS, Math.max(0, streak - 1)) });
      haptic('medium');
    }
    if (steady) {
      this.fx.confetti(x, y - 20, 20);
      play('steady');
      haptic('success');
    }
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
