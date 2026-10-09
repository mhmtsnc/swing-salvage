import { TUNING, type Tuning } from '../config/tuning';

export type DifficultyPoint = (typeof TUNING.difficulty)[number];
export type DifficultyParams = Omit<DifficultyPoint, 's'>;

/** Skora göre zorluk parametreleri: anahtar kareler arası lineer, uçlarda sabit. */
export function difficultyAt(
  score: number,
  table: readonly DifficultyPoint[] = TUNING.difficulty,
): DifficultyParams {
  const first = table[0];
  const last = table[table.length - 1];
  const pick = (p: DifficultyPoint): DifficultyParams => {
    const { s: _s, ...rest } = p;
    return rest;
  };
  if (score <= first.s) return pick(first);
  if (score >= last.s) return pick(last);
  let i = 0;
  while (i < table.length - 2 && score >= table[i + 1].s) i++;
  const a = table[i];
  const b = table[i + 1];
  const t = (score - a.s) / (b.s - a.s);
  const out: Record<string, number> = {};
  for (const k of Object.keys(a) as (keyof DifficultyPoint)[]) {
    if (k === 's') continue;
    out[k] = a[k] + (b[k] - a[k]) * t;
  }
  return out as unknown as DifficultyParams;
}

export type EndlessCaps = Tuning['endless'];

/**
 * Sonsuz zorluk: 60 puana kadar `difficultyAt`; sonrasında her parametre `endless` sınırlarına doğru
 * `span` puan boyunca lineer yaklaşır ve orada kalır (adil kalması için tavanlıdır).
 */
export function difficultyEndless(
  progress: number,
  table: readonly DifficultyPoint[] = TUNING.difficulty,
  caps: EndlessCaps = TUNING.endless,
): DifficultyParams {
  const base = difficultyAt(progress, table);
  const last = table[table.length - 1];
  if (progress <= last.s) return base;
  const k = Math.min(1, (progress - last.s) / caps.span);
  const out = { ...base } as Record<string, number>;
  for (const key of Object.keys(base) as (keyof DifficultyParams)[]) {
    const from = (base as Record<string, number>)[key];
    const to = (caps as unknown as Record<string, number>)[key];
    out[key] = from + (to - from) * k;
  }
  return out as unknown as DifficultyParams;
}
