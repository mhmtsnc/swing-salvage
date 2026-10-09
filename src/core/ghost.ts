import type { GhostData } from './storage';

const MAX_SAMPLES = 1500; // 0,2 sn aralıkla 5 dakika

/** Koşu boyunca helikopter yolunu ve skor zaman çizelgesini kaydeder (saf). */
export class GhostRecorder {
  private samples: number[] = [];
  private scores: [number, number][] = [];
  private next = 0;

  constructor(private dt: number) {}

  reset(): void {
    this.samples = [];
    this.scores = [];
    this.next = 0;
  }

  /** `t`: koşu süresi (sn). Aralık dolduysa örnek ekler. */
  tick(t: number, x: number, y: number, facing: number): void {
    if (t < this.next || this.samples.length >= MAX_SAMPLES * 3) return;
    this.samples.push(Math.round(x), Math.round(y), facing >= 0 ? 1 : -1);
    this.next += this.dt;
  }

  score(t: number, score: number): void {
    this.scores.push([Math.round(t * 10) / 10, score]);
  }

  data(finalScore: number): GhostData {
    return { score: finalScore, dt: this.dt, samples: this.samples.slice(), scores: this.scores.slice() };
  }
}

export interface GhostPose { x: number; y: number; facing: number }

/** Kaydedilen yoldan `t` anındaki poz (lineer). Kayıt bittiyse null. */
export function ghostPoseAt(g: GhostData, t: number): GhostPose | null {
  const n = g.samples.length / 3;
  if (n < 2) return null;
  const f = t / g.dt;
  if (f < 0 || f > n - 1) return null;
  const i = Math.floor(f);
  const k = f - i;
  const a = i * 3;
  const b = Math.min(n - 1, i + 1) * 3;
  return {
    x: g.samples[a] + (g.samples[b] - g.samples[a]) * k,
    y: g.samples[a + 1] + (g.samples[b + 1] - g.samples[a + 1]) * k,
    facing: g.samples[a + 2],
  };
}

/** `t` anında hayaletin skoru. */
export function ghostScoreAt(g: GhostData, t: number): number {
  let s = 0;
  for (const [ts, sc] of g.scores) {
    if (ts <= t) s = sc;
    else break;
  }
  return s;
}
