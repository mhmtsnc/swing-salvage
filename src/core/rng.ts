export interface Rng {
  next(): number;
  range(a: number, b: number): number;
  /** Ağırlıklara göre indeks seçer. */
  pick(weights: readonly number[]): number;
}

/** mulberry32 tohumlu üreteç, [0, 1) döner. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32 bit string özeti. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createRng(seed: number | string): Rng {
  const f = mulberry32(typeof seed === 'string' ? hashString(seed) : seed);
  return {
    next: f,
    range: (a, b) => a + f() * (b - a),
    pick(weights) {
      let total = 0;
      for (const w of weights) total += w;
      if (total <= 0) return 0;
      let r = f() * total;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r < 0) return i;
      }
      return weights.length - 1;
    },
  };
}

/** `dateStr`: UTC tarih, YYYY-MM-DD. */
export function dailySeed(dateStr: string): number {
  return hashString('SS-' + dateStr);
}

const DAY_MS = 86_400_000;

function utcDayStart(d: Date | string): number {
  if (typeof d === 'string') return Date.parse(d.slice(0, 10) + 'T00:00:00Z');
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Daily #N = max(1, epoch'tan bu yana geçen gün + 1). */
export function dailyNumber(date: Date | string, epoch: string): number {
  const days = Math.floor((utcDayStart(date) - utcDayStart(epoch)) / DAY_MS);
  return Math.max(1, days + 1);
}
