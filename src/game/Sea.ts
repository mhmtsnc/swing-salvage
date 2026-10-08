import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';

interface Layer {
  offsetY: number;
  ampMul: number;
  phase: number;
  color: string;
  depth: number;
}

// §10.3: arka −112 ×0.5, orta −46 ×0.7, ön 0 ×1, derin +110 ×0.4. Faz kaydırma görsel çeşitlilik için.
const BACK: Layer = { offsetY: -112, ampMul: 0.5, phase: 1.7, color: PALETTE.seaBack, depth: 6 };
const MID: Layer = { offsetY: -46, ampMul: 0.7, phase: 0.9, color: PALETTE.seaMid, depth: 8 };
const FRONT: Layer = { offsetY: 0, ampMul: 1, phase: 0, color: PALETTE.seaFront, depth: 10 };
const DEEP: Layer = { offsetY: 110, ampMul: 0.4, phase: 2.4, color: PALETTE.seaDeep, depth: 11 };

function surface(x: number, t: number, seaY: number, amp: number): number {
  return seaY + amp * (0.6 * Math.sin(0.018 * x - 1.3 * t) + 0.4 * Math.sin(0.041 * x + 0.9 * t));
}

/** Ön dalga yüzeyi: render ve fizik kontrolü aynı fonksiyonu kullanır. */
export function waterY(x: number, t: number, seaY: number, amp: number): number {
  return surface(x, t, seaY, amp);
}

/** Orta katman yüzeyi (SETTLING/STACKED kargonun SPLASH kontrolü). */
export function waterYMid(x: number, t: number, seaY: number, amp: number): number {
  return surface(x, t + MID.phase, seaY + MID.offsetY, amp * MID.ampMul);
}

const STEP_X = 12;

export class Sea {
  private layers: { def: Layer; g: Phaser.GameObjects.Graphics }[];

  constructor(scene: Phaser.Scene) {
    this.layers = [BACK, MID, FRONT, DEEP].map((def) => ({
      def,
      g: scene.add.graphics().setDepth(def.depth),
    }));
  }

  draw(t: number, seaY: number, amp: number, W: number, H: number): void {
    for (const { def, g } of this.layers) {
      g.clear();
      g.fillStyle(hex(def.color), 1);
      g.beginPath();
      g.moveTo(0, H + 20);
      for (let x = 0; x <= W + STEP_X; x += STEP_X) {
        g.lineTo(x, surface(x, t + def.phase, seaY + def.offsetY, amp * def.ampMul));
      }
      g.lineTo(W + STEP_X, H + 20);
      g.closePath();
      g.fillPath();
    }
  }

  destroy(): void {
    for (const { g } of this.layers) g.destroy();
  }
}
