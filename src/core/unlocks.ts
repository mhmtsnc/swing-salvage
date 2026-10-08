import type { PaintId } from '../config/palette';
import { TUNING } from '../config/tuning';
import type { DailyState, Stats } from './storage';

type DailyLike = Pick<DailyState, 'playedDays'>;
type StatsLike = Pick<Stats, 'cratesLifetime' | 'medals'>;

export const CRATE_PAINTS = [
  { id: 'sunny', need: TUNING.unlocks.sunny },
  { id: 'mint', need: TUNING.unlocks.mint },
  { id: 'navy', need: TUNING.unlocks.navy },
] as const satisfies readonly { id: PaintId; need: number }[];

/** Hangar kart durumu için: kilit açıksa null, değilse şart metni ve ilerleme. */
export function paintRequirement(id: PaintId, stats: StatsLike, daily: DailyLike): { text: string; have: number; need: number } | null {
  if (evaluateUnlocks(stats, daily).includes(id)) return null;
  switch (id) {
    case 'sunny':
    case 'mint':
    case 'navy': {
      const need = CRATE_PAINTS.find((p) => p.id === id)!.need;
      return { text: `${need} crates`, have: Math.min(stats.cratesLifetime, need), need };
    }
    case 'paper':
      return { text: `Daily on ${TUNING.unlocks.paperDays} days`, have: Math.min(daily.playedDays.length, TUNING.unlocks.paperDays), need: TUNING.unlocks.paperDays };
    case 'gold':
      return { text: 'Platinum medal', have: stats.medals.platinum > 0 ? 1 : 0, need: 1 };
    default:
      return null;
  }
}

/** Saf: ömür boyu istatistik ve Daily kayıtlarından açık boyalar (rescue her zaman açık). */
export function evaluateUnlocks(stats: StatsLike, daily: DailyLike): PaintId[] {
  const out: PaintId[] = ['rescue'];
  for (const p of CRATE_PAINTS) if (stats.cratesLifetime >= p.need) out.push(p.id);
  if (new Set(daily.playedDays).size >= TUNING.unlocks.paperDays) out.push('paper');
  if (stats.medals.platinum > 0) out.push('gold');
  return out;
}

/** Bir sonraki sandık-bazlı kilide kaç sandık kaldığı (hepsi açıksa null). */
export function nextUnlockProgress(stats: Pick<Stats, 'cratesLifetime'>): { paint: PaintId; remaining: number } | null {
  for (const p of CRATE_PAINTS) {
    if (stats.cratesLifetime < p.need) return { paint: p.id, remaining: p.need - stats.cratesLifetime };
  }
  return null;
}
