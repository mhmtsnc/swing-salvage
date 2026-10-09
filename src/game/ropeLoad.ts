import type { Tuning } from '../config/tuning';

const REF_MASS = 8;

/** Halat yükü (g cinsinden): halatın çektiği kuvvet/kütle = |a − g|; durgun asılı kargoda 1 g. */
export class RopeLoad {
  private prevX = 0;
  private prevY = 0;
  private has = false;
  /** Yumuşatılmış yük (g) */
  g = 1;
  private over = 0;

  reset(): void {
    this.has = false;
    this.g = 1;
    this.over = 0;
  }

  /** Ağır kargo halatı daha kolay koparır. */
  static limit(cfg: Tuning['ropeLoad'], mass: number): number {
    return cfg.breakG * Math.min(1.1, Math.max(0.8, Math.pow(REF_MASS / Math.max(mass, 0.001), 0.15)));
  }

  /**
   * Her sabit adımda, `Engine.update` sonrası gövde hızıyla (px/adım) çağrılır.
   * `gravPxS2`: yerçekimi ivmesi (px/s²). Dönüş: kopma oldu mu.
   */
  update(vx: number, vy: number, dt: number, cfg: Tuning['ropeLoad'], gravPxS2: number, mass: number): boolean {
    if (!this.has) {
      this.prevX = vx;
      this.prevY = vy;
      this.has = true;
      return false;
    }
    const ax = (vx - this.prevX) * 3600;
    const ay = (vy - this.prevY) * 3600;
    this.prevX = vx;
    this.prevY = vy;
    const inst = Math.hypot(ax, ay - gravPxS2) / gravPxS2;
    this.g += (inst - this.g) * (1 - Math.exp(-dt / cfg.smoothTau));
    if (this.g > RopeLoad.limit(cfg, mass)) this.over += dt;
    else this.over = Math.max(0, this.over - dt);
    return this.over >= cfg.breakTime;
  }

  /** 0..1+ : sınıra oranı (uyarı rengi için) */
  ratio(cfg: Tuning['ropeLoad'], mass: number): number {
    return this.g / RopeLoad.limit(cfg, mass);
  }
}
