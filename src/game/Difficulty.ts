import { TUNING } from '../config/tuning';

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
