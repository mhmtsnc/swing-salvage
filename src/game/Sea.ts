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
const SHADOW_DY = -3;
const SHADOW_ALPHA = 0.18;
const FOAM_WIDTH = 4;

interface Foam { alpha: number }
const FOAM: Map<Layer, Foam | null> = new Map([
  [BACK, null],
  [MID, { alpha: 1 }],
  [FRONT, { alpha: 1 }],
  [DEEP, { alpha: 0.6 }],
]);

export class Sea {
  private layers: { def: Layer; g: Phaser.GameObjects.Graphics }[];

  constructor(scene: Phaser.Scene) {
    this.layers = [BACK, MID, FRONT, DEEP].map((def) => ({
      def,
      g: scene.add.graphics().setDepth(def.depth),
    }));
  }

  /** Katmanlı kâğıt dalga (§13 Kural 3): arka katmana gölge, katman rengi, üst kenarda köpük çizgisi. */
  draw(t: number, seaY: number, amp: number, W: number, H: number): void {
    for (const { def, g } of this.layers) {
      const pts: number[] = [];
      for (let x = 0; x <= W + STEP_X; x += STEP_X) {
        pts.push(x, surface(x, t + def.phase, seaY + def.offsetY, amp * def.ampMul));
      }
      g.clear();
      this.fillBody(g, pts, W, H, SHADOW_DY, hex(PALETTE.shadow), SHADOW_ALPHA);
      this.fillBody(g, pts, W, H, 0, hex(def.color), 1);
      const foam = FOAM.get(def);
      if (foam) {
        g.lineStyle(FOAM_WIDTH, hex(PALETTE.foam), foam.alpha);
        g.beginPath();
        g.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
        g.strokePath();
      }
    }
  }

  private fillBody(g: Phaser.GameObjects.Graphics, pts: number[], W: number, H: number, dy: number, color: number, alpha: number): void {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(0, H + 20);
    for (let i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1] + dy);
    g.lineTo(W + STEP_X, H + 20);
    g.closePath();
    g.fillPath();
  }

  destroy(): void {
    for (const { g } of this.layers) g.destroy();
  }
}
