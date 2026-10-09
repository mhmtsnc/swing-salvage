import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { DEFAULTS, type MetaState } from '../src/core/storage';
import { ACHIEVEMENTS, newlyUnlocked } from '../src/meta/achievements';
import { COSMETICS, lockedCrateItems, rollCrate } from '../src/meta/cosmetics';
import { finalizeRun, type FinalizeInput } from '../src/meta/finalize';
import { gradeFor } from '../src/meta/grade';
import { loginUpdate } from '../src/meta/login';
import { newMissionSet } from '../src/meta/missions';
import { rankFor, runXp, xpForRank } from '../src/meta/rank';
import { applyPlacement, deltaMetrics, emptyMetrics, type PlacementEvent } from '../src/meta/tally';

const freshMeta = (): MetaState => {
  const m = JSON.parse(JSON.stringify(DEFAULTS['ss.meta'])) as MetaState;
  const set = newMissionSet(0);
  m.missions = set.slots;
  m.missionCounter = set.counter;
  return m;
};

const baseInput = (meta: MetaState, over: Partial<FinalizeInput> = {}): FinalizeInput => ({
  meta,
  metrics: { ...emptyMetrics(), runs: 1, delivered: 5, perfects: 2, score: 30, ships: 1 },
  run: {
    score: 30, delivered: 5, perfects: 2, scoreDelta: 30, deliveredDelta: 5, perfectsDelta: 2,
    mode: 'normal', date: '2026-11-12', continued: false, prevScore: null,
  },
  stats: { cratesLifetime: 5, perfectsLifetime: 2, bestShip: 1, runs: 1 },
  bestScore: 30,
  dailyDays: 0,
  ...over,
});

describe('rank', () => {
  it('eşikler artar, rütbe XP ile ilerler', () => {
    expect(xpForRank(0)).toBe(100);
    expect(rankFor(0)).toMatchObject({ rank: 0, into: 0, need: 100, title: 'Deckhand' });
    expect(rankFor(99).rank).toBe(0);
    expect(rankFor(100)).toMatchObject({ rank: 1, into: 0, need: 145 });
    expect(rankFor(245).rank).toBe(2);
  });
  it('koşu XP', () => {
    expect(runXp(100, 20, 8)).toBe(40 + 40 + 8);
  });
});

describe('grade', () => {
  it('eşikler ve S için isabet şartı', () => {
    expect(gradeFor({ score: 5, delivered: 2, perfects: 0 })).toBe('D');
    expect(gradeFor({ score: 20, delivered: 4, perfects: 0 })).toBe('C');
    expect(gradeFor({ score: 45, delivered: 8, perfects: 1 })).toBe('B');
    expect(gradeFor({ score: 90, delivered: 12, perfects: 2 })).toBe('A');
    expect(gradeFor({ score: 200, delivered: 20, perfects: 4 })).toBe('A');
    expect(gradeFor({ score: 200, delivered: 20, perfects: 12 })).toBe('S');
  });
});

describe('tally', () => {
  const ev = (o: Partial<PlacementEvent> = {}): PlacementEvent => ({
    type: 'crate', grade: 'normal', sweet: false, saved: false, closeCall: false, gustLanding: false,
    swingPoints: 0, speedyPoints: 0, hard: false, streak: 0, clean: 1, score: 1, ships: 1, ...o,
  });
  it('yerleştirme olayları metrikleri artırır', () => {
    let m = emptyMetrics();
    m = applyPlacement(m, ev({ grade: 'flawless', sweet: true, type: 'piano', streak: 1, swingPoints: 2 }));
    m = applyPlacement(m, ev({ grade: 'perfect', streak: 2, saved: true, speedyPoints: 1, type: 'ball' }));
    expect(m).toMatchObject({ delivered: 2, perfects: 2, flawless: 1, sweet: 1, pianos: 1, balls: 1, swing: 1, saved: 1, speedy: 1, streak: 2 });
  });
  it('delta: toplamlar fark, best güncel', () => {
    const prev = { ...emptyMetrics(), delivered: 4, streak: 3, score: 20 };
    const cur = { ...prev, delivered: 9, streak: 5, score: 41 };
    const d = deltaMetrics(cur, prev);
    expect(d.delivered).toBe(5);
    expect(d.streak).toBe(5);
    expect(d.score).toBe(41);
  });
});

describe('cosmetics / kasa', () => {
  it('kasa sadece kilitli kasa kozmetiği verir, hepsi açıksa XP', () => {
    const owned: string[] = [];
    const rng = createRng('crate');
    const got = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const r = rollCrate(rng, owned);
      if (r.kind === 'xp') break;
      expect(owned).not.toContain(r.item.id);
      owned.push(r.item.id);
      got.add(r.item.id);
    }
    expect(lockedCrateItems(owned)).toHaveLength(0);
    expect(rollCrate(rng, owned)).toEqual({ kind: 'xp', amount: 60 });
    expect(got.size).toBe(COSMETICS.filter((c) => c.source === 'crate').length);
  });
  it('garantili nadirlik daha iyi havuzu seçer', () => {
    for (let s = 0; s < 20; s++) {
      const r = rollCrate(createRng(`g${s}`), [], 'epic');
      expect(r.kind === 'cosmetic' && r.item.rarity === 'epic').toBe(true);
    }
  });
  it('ağırlıklar epik kozmetiği nadir yapar', () => {
    const rng = createRng('dist');
    let epic = 0;
    for (let i = 0; i < 400; i++) {
      const r = rollCrate(rng, []);
      if (r.kind === 'cosmetic' && r.item.rarity === 'epic') epic++;
    }
    expect(epic).toBeLessThan(100);
    expect(epic).toBeGreaterThan(2);
  });
});

describe('login / günlük hediye', () => {
  const start = { last: '', streak: 0, freezes: 0, bestStreak: 0 };
  it('ilk gün: seri 1 ve 1 kasa; aynı gün tekrar yok', () => {
    const r = loginUpdate(start, '2026-11-01');
    expect(r).toMatchObject({ giftCrates: 1, newDay: true });
    expect(r.login.streak).toBe(1);
    expect(loginUpdate(r.login, '2026-11-01')).toMatchObject({ giftCrates: 0, newDay: false });
  });
  it('7. günde +1 kasa ve kalkan', () => {
    let l = start;
    let last = loginUpdate(l, '2026-11-01');
    for (let d = 2; d <= 7; d++) {
      l = last.login;
      last = loginUpdate(l, `2026-11-0${d}`);
    }
    expect(last.login.streak).toBe(7);
    expect(last.giftCrates).toBe(2);
    expect(last.login.freezes).toBe(1);
  });
  it('bir gün kaçırınca kalkan seriyi korur, yoksa seri 1e düşer', () => {
    const withFreeze = { last: '2026-11-10', streak: 5, freezes: 1, bestStreak: 5 };
    const kept = loginUpdate(withFreeze, '2026-11-12');
    expect(kept.usedFreeze).toBe(true);
    expect(kept.login.streak).toBe(6);
    expect(kept.login.freezes).toBe(0);
    const broke = loginUpdate({ ...withFreeze, freezes: 0 }, '2026-11-12');
    expect(broke.login.streak).toBe(1);
    expect(broke.broke).toBe(true);
    expect(loginUpdate(withFreeze, '2026-11-14').login.streak).toBe(1);
  });
});

describe('başarımlar', () => {
  it('hedefi geçenleri ve yenileri listeler', () => {
    const ctx = {
      delivered: 120, perfects: 30, flawless: 0, bestShip: 3, bestScore: 40, bestStreak: 5, bestClean: 0, sweet: 0, saved: 0,
      closeCall: 0, gustDrops: 0, pianos: 0, balls: 0, gradeS: 0, loginBest: 0, dailyDays: 0, missionsDone: 0, rank: 0, runs: 3,
    };
    const ids = newlyUnlocked(ctx, []).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['cargo10', 'cargo100', 'perfect25', 'chain5', 'ship3']));
    expect(ids).not.toContain('cargo500');
    expect(newlyUnlocked(ctx, ids).map((a) => a.id)).toEqual([]);
  });
  it('kimlikler benzersiz', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('finalizeRun', () => {
  it('XP, not, geçmiş ve görev ilerlemesi', () => {
    const r = finalizeRun(baseInput(freshMeta()));
    expect(r.report.grade).toBe('C');
    expect(r.report.xpGained).toBeGreaterThan(0);
    expect(r.meta.xp).toBe(r.report.xpGained);
    expect(r.meta.history).toHaveLength(1);
    expect(r.meta.daily).not.toBeNull();
  });
  it('tamamlanan görev yenisiyle değişir, XP ve zor görevde kasa verir', () => {
    const meta = freshMeta();
    meta.missions = [
      { id: 'deliver', tier: 0, progress: 0 },
      { id: 'perfects', tier: 1, progress: 0 },
      { id: 'score', tier: 2, progress: 0 },
    ];
    const metrics = { ...emptyMetrics(), runs: 1, delivered: 9, perfects: 12, score: 200, ships: 4 };
    const r = finalizeRun(baseInput(meta, { metrics, run: { ...baseInput(meta).run, score: 200, scoreDelta: 200, delivered: 9, deliveredDelta: 9 } }));
    expect(r.report.completed.map((c) => c.id)).toEqual(expect.arrayContaining(['deliver', 'perfects', 'score']));
    expect(r.meta.missions.map((m) => m.tier)).toEqual([0, 1, 2]);
    expect(r.meta.crates).toBeGreaterThanOrEqual(1);
    expect(r.meta.counters.missionsDone).toBeGreaterThanOrEqual(3);
  });
  it('rütbe atlama kasa getirir', () => {
    const meta = freshMeta();
    meta.xp = 95;
    const r = finalizeRun(baseInput(meta));
    expect(r.report.rankAfter.rank).toBeGreaterThan(r.report.rankBefore.rank);
    expect(r.meta.crates).toBeGreaterThanOrEqual(1);
  });
  it('devam eden koşu geçmişte tekrarlanmaz', () => {
    const first = finalizeRun(baseInput(freshMeta()));
    const second = finalizeRun(baseInput(first.meta, { run: { ...baseInput(first.meta).run, score: 55, continued: true, prevScore: 30 } }));
    expect(second.meta.history).toHaveLength(1);
    expect(second.meta.history[0].score).toBe(55);
  });
  it('geçmiş en iyi 5 ile sınırlı ve sıralı', () => {
    let meta = freshMeta();
    for (const s of [10, 50, 30, 70, 20, 90, 5]) {
      const b = baseInput(meta, { run: { ...baseInput(meta).run, score: s, scoreDelta: s } });
      meta = finalizeRun(b).meta;
    }
    expect(meta.history.map((h) => h.score)).toEqual([90, 70, 50, 30, 20]);
  });
});
