import type { Tuning } from '../config/tuning';
import type { Rng } from '../core/rng';
import type { CargoType } from './Cargo';

const TYPES: CargoType[] = ['crate', 'wide', 'barrel', 'gold', 'piano'];
const EDGE_PAD = 20;

export interface SpawnPick { type: CargoType; x: number }

/** Tohumlu kargo seçimi (§7.7). Saf mantık: `spawnRng` dışarıdan verilir. */
export class Spawner {
  private goldThisShip = 0;
  private lastX: number | null = null;

  constructor(private rng: Rng, private t: Tuning) {}

  resetShip(): void {
    this.goldThisShip = 0;
  }

  next(score: number, W: number): SpawnPick {
    const c = this.t.cargo;
    const weights = TYPES.map((k) => {
      const d = c[k];
      if (d.minScore > score) return 0;
      if (k === 'gold' && this.goldThisShip >= c.gold.maxPerShip) return 0;
      return d.weight;
    });
    const type = TYPES[this.rng.pick(weights)];
    if (type === 'gold') this.goldThisShip++;
    const w = c[type].w;
    const lo = this.t.ship.bowTipX + EDGE_PAD + w / 2;
    const hi = W - EDGE_PAD - w / 2;
    let x = hi > lo ? this.rng.range(lo, hi) : lo;
    if (this.lastX !== null && Math.abs(x - this.lastX) < this.t.spawn.minSeparation) {
      x = hi > lo ? this.rng.range(lo, hi) : lo; // bir kez yeniden çek
    }
    this.lastX = x;
    return { type, x };
  }
}
