import type { PaintId } from '../config/palette';
import { STRINGS, fmt } from '../config/strings';
import { TUNING } from '../config/tuning';
import { evaluateUnlocks, nextUnlockProgress } from './unlocks';
import type { DailyState, Stats } from './storage';

export type MedalTier = 'bronze' | 'silver' | 'gold' | 'platinum';

const RANK: Record<MedalTier, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };

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
  /** SECOND CHANCE ile devam eden koşuda önceden sayılanlar (çifte sayımı önler) */
  already?: { runCounted: boolean; medal: MedalTier | null };
  /** Son gösterilen mesaj türü: aynı "kıl payı" mesajı art arda tekrar etmesin (Wordle near-miss bulgusu) */
  lastKind?: string;
  /** Sonraki rütbeye kalan XP (varsa mesaj adayı) */
  xpToRank?: { remaining: number; rank: number } | null;
}

export interface Summary {
  stats: Stats;
  medal: MedalTier | null;
  firstMedal: boolean;
  newBest: boolean;
  newPaints: PaintId[];
  unlocked: PaintId[];
  message: string;
  messageKind: string;
}

/** Koşu sonu: istatistik güncellemesi, madalya, yeni kilit ve §11.4 mesaj önceliği (saf). */
export function summarizeRun(i: SummaryInput): Summary {
  const r = i.result;
  const medal = medalFor(r.score);
  const firstMedal = !!medal && i.stats.medals[medal] === 0;
  const stats: Stats = {
    runs: i.stats.runs + (i.already?.runCounted ? 0 : 1),
    cratesLifetime: i.stats.cratesLifetime + r.delivered,
    perfectsLifetime: i.stats.perfectsLifetime + r.perfects,
    bestShip: Math.max(i.stats.bestShip, r.shipsReached),
    medals: { ...i.stats.medals },
  };
  if (medal && (!i.already?.medal || RANK[medal] > RANK[i.already.medal])) stats.medals[medal]++;

  const unlocked = evaluateUnlocks(stats, i.daily);
  const newPaints = unlocked.filter((id) => !i.prevUnlocks.includes(id) && id !== 'rescue');
  const newBest = r.mode === 'normal' && r.score > i.bestNormal;

  const paintName = (id: PaintId): string => STRINGS.paints[id];
  const near = !newBest && r.mode === 'normal' && i.bestNormal > r.score && i.bestNormal - r.score <= Math.max(3, Math.round(i.bestNormal * 0.1)) && r.score > 0;
  const next = nextUnlockProgress(stats);
  // Öncelik sırası; ilk ikisi hep gösterilir, diğerleri son mesajla aynıysa sıradakine geçilir.
  const candidates: { kind: string; text: string; sticky?: boolean }[] = [];
  if (newPaints.length) candidates.push({ kind: 'paint', text: fmt(STRINGS.newPaint, { paint: paintName(newPaints[0]) }), sticky: true });
  if (firstMedal && medal) candidates.push({ kind: 'medal', text: fmt(STRINGS.firstMedal, { medal: STRINGS.medals[medal] }), sticky: true });
  if (near) candidates.push({ kind: 'near', text: fmt(STRINGS.soClose, { n: i.bestNormal - r.score }) });
  if (next) candidates.push({ kind: 'unlock', text: fmt(STRINGS.unlockProgress, { n: next.remaining, paint: paintName(next.paint) }) });
  if (i.xpToRank) candidates.push({ kind: 'xp', text: fmt(STRINGS.xpToRank, { n: i.xpToRank.remaining, rank: i.xpToRank.rank }) });
  candidates.push({ kind: 'delivered', text: fmt(STRINGS.delivered, { n: r.delivered }) });
  const pick = candidates.find((c) => c.sticky || c.kind !== i.lastKind) ?? candidates[0];
  const message = pick.text;
  const messageKind = pick.kind;
  return { stats, medal, firstMedal, newBest, newPaints, unlocked, message, messageKind };
}
