import type { Tuning } from '../config/tuning';
import type { Rng } from '../core/rng';
import type { DifficultyParams } from './Difficulty';

export type GustPhase = 'IDLE' | 'WARN' | 'ACTIVE';

export interface WeatherEvents {
  onGustWarn?(dir: number): void;
  onGustStart?(dir: number): void;
  onGustEnd?(): void;
  /** Şimşek çaktı (x: 0..1 ekran oranı) */
  onLightning?(xFrac: number): void;
  /** Şimşekten 300 ms sonra */
  onThunder?(): void;
}

const THUNDER_DELAY = 0.3;

/** Rüzgâr, ani rüzgâr (gust) ve şimşek zamanlaması. Saf mantık, `weatherRng`'den beslenir. */
export class Weather {
  phase: GustPhase = 'IDLE';
  /** Aktif/uyarılan ani rüzgârın yönü: +1 sağa eser (soldan gelir), −1 sola */
  gustDir = 1;
  /** Gemi başına temel rüzgâr yönü */
  baseDir = 1;
  private gustForce = 0;
  private phaseT = 0;
  private gustTimer = -1;
  private lightningTimer = -1;
  private thunderIn = -1;
  private windT = 0;
  private veerPhase = 0;

  constructor(private rng: Rng, private t: Tuning, private ev: WeatherEvents = {}) {
    this.newShip();
  }

  setEvents(ev: WeatherEvents): void {
    this.ev = ev;
  }

  newShip(): void {
    this.baseDir = this.rng.next() < 0.5 ? -1 : 1;
    this.veerPhase = this.rng.next() * Math.PI * 2;
  }

  /**
   * Temel rüzgârın yönü ve oranı (−1..1). İlerleme `veerFromScore`'a varınca yön sinüsle değişir
   * (geçişte `baseDir`'den yumuşak karışım), böylece rüzgâr zaman zaman sakinleşir ve yön çevirir.
   */
  windSign(score: number): number {
    const w = this.t.weather;
    const k = Math.min(1, Math.max(0, (score - w.veerFromScore) / 6));
    if (k <= 0) return this.baseDir;
    const veer = Math.cos((2 * Math.PI * this.windT) / w.veerPeriod + this.veerPhase);
    return this.baseDir * (1 - k) + veer * k;
  }

  /** Temel rüzgâr ivmesi (px/s², işaretli). Kargo ve kanca bunu alır; helikopter windResponse katını. */
  baseAccel(d: DifficultyParams, score = 0): number {
    return this.windSign(score) * d.windBase * this.t.weather.windAccelPerUnit;
  }

  /** Ani rüzgâr zarfı: gustRamp ile yumuşak giriş ve çıkış (0..1). */
  envelope(): number {
    if (this.phase !== 'ACTIVE') return 0;
    const w = this.t.weather;
    const ramp = Math.max(1e-6, w.gustRamp);
    return Math.max(0, Math.min(1, this.phaseT / ramp, (w.gustDuration - this.phaseT) / ramp));
  }

  /** Ani rüzgâr ivmesi (px/s², işaretli). */
  gustAccel(): number {
    return this.gustDir * this.gustForce * this.t.weather.gustAccelPerUnit * this.envelope();
  }

  /** Uyarı ilerlemesi 0..1 (görsel için). */
  warnProgress(): number {
    return this.phase === 'WARN' ? Math.min(1, this.phaseT / this.t.weather.gustTelegraph) : 0;
  }

  private delay(interval: number): number {
    const j = this.t.weather.gustIntervalJitter;
    return interval * (1 + j * (this.rng.next() * 2 - 1));
  }

  /** `frozen`: gemi değişimi sırasında aralık sayacı durur (devam eden ani rüzgâr biter). */
  step(dt: number, d: DifficultyParams, score: number, frozen: boolean): void {
    const w = this.t.weather;
    this.windT += dt;

    if (this.phase === 'IDLE') {
      if (score >= w.gustFromScore && !frozen) {
        if (this.gustTimer < 0) this.gustTimer = this.delay(d.gustInterval);
        this.gustTimer -= dt;
        if (this.gustTimer <= 0) {
          this.phase = 'WARN';
          this.phaseT = 0;
          this.gustDir = this.rng.next() < 0.5 ? -1 : 1;
          this.gustForce = d.gustForce;
          this.ev.onGustWarn?.(this.gustDir);
        }
      }
    } else if (this.phase === 'WARN') {
      this.phaseT += dt;
      if (this.phaseT >= w.gustTelegraph) {
        this.phase = 'ACTIVE';
        this.phaseT = 0;
        this.ev.onGustStart?.(this.gustDir);
      }
    } else {
      this.phaseT += dt;
      if (this.phaseT >= w.gustDuration) {
        this.phase = 'IDLE';
        this.phaseT = 0;
        this.gustTimer = this.delay(d.gustInterval);
        this.ev.onGustEnd?.();
      }
    }

    if (score >= w.lightningFromScore) {
      if (this.lightningTimer < 0) this.lightningTimer = this.rng.range(w.lightningMin, w.lightningMax);
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = this.rng.range(w.lightningMin, w.lightningMax);
        this.thunderIn = THUNDER_DELAY;
        this.ev.onLightning?.(this.rng.next());
      }
    }
    if (this.thunderIn >= 0) {
      this.thunderIn -= dt;
      if (this.thunderIn < 0) this.ev.onThunder?.();
    }
  }
}
