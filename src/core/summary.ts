import type { PaintId } from '../config/palette';
import { STRINGS, fmt } from '../config/strings';
import { TUNING } from '../config/tuning';
import { evaluateUnlocks, nextUnlockProgress } from './unlocks';
import type { DailyState, Stats } from './storage';

export type MedalTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export function medalFor(score: number, medals: Record<MedalTier, number> = TUNING.medals): MedalTier | null {
  if (score >= medals.platinum) return 'platinum';
  if (score >= medals.gold) return 'gold';
  if (score >= medals.silver) return 'silver';
  if (score >= medals.bronze) return 'bronze';
  return null;
}

export interface RunResult {
  score: number;
  delivered: number;
  perfects: number;
  /** Ulaşılan gemi numarası (1'den) */
  shipsReached: number;
  mode: 'normal' | 'daily';
}

export interface SummaryInput {
  result: RunResult;
  stats: Stats;
  /** Normal mod rekoru (değişmeden önce) */
  bestNormal: number;
  /** Daily kaydı (bu koşunun sonucu işlendikten SONRAKİ hâli) */
  daily: DailyState;
  /** Daha önce kayıtlı açık boyalar */
  prevUnlocks: readonly string[];
}

export interface Summary {
  stats: Stats;
  medal: MedalTier | null;
  firstMedal: boolean;
  newBest: boolean;
  newPaints: PaintId[];
  unlocked: PaintId[];
  message: string;
}

/** Koşu sonu: istatistik güncellemesi, madalya, yeni kilit ve §11.4 mesaj önceliği (saf). */
export function summarizeRun(i: SummaryInput): Summary {
  const r = i.result;
  const medal = medalFor(r.score);
  const firstMedal = !!medal && i.stats.medals[medal] === 0;
  const stats: Stats = {
    runs: i.stats.runs + 1,
    cratesLifetime: i.stats.cratesLifetime + r.delivered,
    perfectsLifetime: i.stats.perfectsLifetime + r.perfects,
    bestShip: Math.max(i.stats.bestShip, r.shipsReached),
    medals: { ...i.stats.medals },
  };
  if (medal) stats.medals[medal]++;

  const unlocked = evaluateUnlocks(stats, i.daily);
  const newPaints = unlocked.filter((id) => !i.prevUnlocks.includes(id) && id !== 'rescue');
  const newBest = r.mode === 'normal' && r.score > i.bestNormal;

  let message: string;
  const paintName = (id: PaintId): string => STRINGS.paints[id];
  if (newPaints.length) {
    message = fmt(STRINGS.newPaint, { paint: paintName(newPaints[0]) });
  } else if (firstMedal && medal) {
    message = fmt(STRINGS.firstMedal, { medal: STRINGS.medals[medal] });
  } else if (!newBest && r.mode === 'normal' && i.bestNormal > r.score && i.bestNormal - r.score <= Math.max(3, Math.round(i.bestNormal * 0.1)) && r.score > 0) {
    message = fmt(STRINGS.soClose, { n: i.bestNormal - r.score });
  } else {
    const next = nextUnlockProgress(stats);
    message = next
      ? fmt(STRINGS.unlockProgress, { n: next.remaining, paint: paintName(next.paint) })
      : fmt(STRINGS.delivered, { n: r.delivered });
  }
  return { stats, medal, firstMedal, newBest, newPaints, unlocked, message };
}
