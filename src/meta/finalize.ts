import type { MetaState } from '../core/storage';
import { ACHIEVEMENTS, newlyUnlocked, type AchCtx, type AchDef } from './achievements';
import { gradeFor, type Grade } from './grade';
import {
  advance, dailyMissionId, DAILY_MISSION_XP, progressMissions, targetOf, TIER_CRATES, TIER_XP,
  type CompletedMission,
} from './missions';
import { rankFor, runXp, type RankInfo } from './rank';
import { SUM_KEYS, type RunMetrics } from './tally';

export interface FinalizeInput {
  meta: MetaState;
  /** Bu koşunun (SECOND CHANCE sonrası delta) metrikleri; `runs` ilk bitişte 1 */
  metrics: RunMetrics;
  run: {
    /** Toplam skor / teslimat / perfect (not için) */
    score: number;
    delivered: number;
    perfects: number;
    /** Sadece bu çağrıda yeni eklenenler (XP için) */
    scoreDelta: number;
    deliveredDelta: number;
    perfectsDelta: number;
    mode: 'normal' | 'daily';
    date: string;
    /** Aynı koşunun SECOND CHANCE sonrası ikinci bitişi mi */
    continued: boolean;
    /** Önceki bitişte geçmişe yazılan skor (varsa) */
    prevScore: number | null;
  };
  /** Depolama istatistikleri (bu koşu işlendikten SONRA) */
  stats: { cratesLifetime: number; perfectsLifetime: number; bestShip: number; runs: number };
  bestScore: number;
  dailyDays: number;
}

export interface RunReport {
  grade: Grade;
  xpGained: number;
  rankBefore: RankInfo;
  rankAfter: RankInfo;
  completed: CompletedMission[];
  achievements: AchDef[];
  cratesGained: number;
}

export function achCtx(meta: MetaState, stats: FinalizeInput['stats'], bestScore: number, dailyDays: number): AchCtx {
  const c = meta.counters;
  return {
    delivered: stats.cratesLifetime, perfects: stats.perfectsLifetime, flawless: c.flawless, bestShip: stats.bestShip,
    bestScore, bestStreak: c.bestStreak, bestClean: c.bestClean, sweet: c.sweet, saved: c.saved, closeCall: c.closeCall,
    gustDrops: c.gustDrops, pianos: c.pianos, balls: c.balls, gradeS: c.gradeS, loginBest: meta.login.bestStreak,
    dailyDays, missionsDone: c.missionsDone, rank: rankFor(meta.xp).rank, runs: stats.runs,
  };
}

/** Koşu sonu meta işlemi (saf): görevler, günlük görev, XP/rütbe, sayaçlar, başarımlar, geçmiş ve kasalar. */
export function finalizeRun(i: FinalizeInput): { meta: MetaState; report: RunReport } {
  const meta: MetaState = JSON.parse(JSON.stringify(i.meta)) as MetaState;
  const grade = gradeFor({ score: i.run.score, delivered: i.run.delivered, perfects: i.run.perfects });
  let crates = 0;

  // 1) görevler
  const pm = progressMissions(meta.missions, meta.missionCounter, i.metrics);
  meta.missions = pm.slots;
  meta.missionCounter = pm.counter;
  const completed: CompletedMission[] = [...pm.completed];

  // 2) günlük görev (her modda ilerler)
  if (!meta.daily || meta.daily.date !== i.run.date) {
    meta.daily = { date: i.run.date, id: dailyMissionId(i.run.date), progress: 0, done: false };
  }
  let xpBonus = 0;
  if (!meta.daily.done) {
    meta.daily.progress = advance(meta.daily, i.metrics);
    const target = targetOf({ id: meta.daily.id, tier: 1 });
    if (meta.daily.progress >= target) {
      meta.daily.done = true;
      completed.push({ id: meta.daily.id, tier: 1, target, daily: true });
      xpBonus += DAILY_MISSION_XP;
      crates += 1;
    }
  }
  for (const m of pm.completed) {
    xpBonus += TIER_XP[m.tier];
    crates += TIER_CRATES[m.tier];
  }
  meta.counters.missionsDone += completed.length;

  // 3) XP ve rütbe
  const rankBefore = rankFor(meta.xp);
  const xpGained = runXp(i.run.scoreDelta, i.run.deliveredDelta, i.run.perfectsDelta) + xpBonus;
  meta.xp += xpGained;
  const rankAfter = rankFor(meta.xp);
  crates += rankAfter.rank - rankBefore.rank;

  // 4) ömür boyu sayaçlar
  const m = i.metrics;
  const c = meta.counters;
  for (const k of ['flawless', 'sweet', 'saved', 'closeCall', 'gustDrops', 'swing', 'speedy', 'pianos', 'balls', 'snaps'] as const) {
    c[k] += m[k];
  }
  c.bestStreak = Math.max(c.bestStreak, m.streak);
  c.bestClean = Math.max(c.bestClean, m.clean);
  c.bestScore = Math.max(c.bestScore, i.run.score);
  if (grade === 'S') c.gradeS += i.run.continued ? 0 : 1;

  // 5) başarımlar
  const ach = newlyUnlocked(achCtx(meta, i.stats, i.bestScore, i.dailyDays), meta.achievements);
  for (const a of ach) {
    meta.achievements.push(a.id);
    crates += a.crates;
  }

  // 6) geçmiş: en iyi 5 koşu
  if (i.run.continued && i.run.prevScore !== null) {
    const idx = meta.history.findIndex((h) => h.score === i.run.prevScore);
    if (idx >= 0) meta.history.splice(idx, 1);
  }
  meta.history.push({ score: i.run.score, grade, date: i.run.date, mode: i.run.mode });
  meta.history.sort((a, b) => b.score - a.score);
  meta.history = meta.history.slice(0, 5);

  meta.crates += crates;
  return { meta, report: { grade, xpGained, rankBefore, rankAfter, completed, achievements: ach, cratesGained: crates } };
}

export { ACHIEVEMENTS, SUM_KEYS };
