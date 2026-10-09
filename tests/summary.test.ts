import { describe, expect, it } from 'vitest';
import { medalFor, summarizeRun, type SummaryInput } from '../src/core/summary';

const stats0 = () => ({
  runs: 0, cratesLifetime: 0, perfectsLifetime: 0, bestShip: 0,
  medals: { bronze: 0, silver: 0, gold: 0, platinum: 0 },
});
const input = (over: Partial<SummaryInput> & { score?: number; delivered?: number } = {}): SummaryInput => ({
  result: { score: over.score ?? 5, delivered: over.delivered ?? 5, perfects: 1, shipsReached: 1, mode: 'normal' },
  stats: over.stats ?? stats0(),
  bestNormal: over.bestNormal ?? 0,
  daily: over.daily ?? { date: '', attemptsUsed: 0, best: 0, playedDays: [], streak: 0 },
  prevUnlocks: over.prevUnlocks ?? ['rescue'],
});

describe('medalFor', () => {
  it('eşikler 20 / 60 / 120 / 200', () => {
    expect([19, 20, 60, 120, 200].map((s) => medalFor(s))).toEqual([null, 'bronze', 'silver', 'gold', 'platinum']);
  });
});

describe('summarizeRun', () => {
  it('istatistikleri günceller', () => {
    const s = summarizeRun(input({ score: 66, delivered: 9 }));
    expect(s.stats.runs).toBe(1);
    expect(s.stats.cratesLifetime).toBe(9);
    expect(s.stats.medals.silver).toBe(1);
    expect(s.medal).toBe('silver');
  });
  it('mesaj önceliği 1: yeni boya, madalyadan önce', () => {
    const st = { ...stats0(), cratesLifetime: 25 };
    const s = summarizeRun(input({ stats: st, score: 22, delivered: 6 }));
    expect(s.newPaints).toEqual(['sunny']);
    expect(s.message).toBe('New paint unlocked: SUNNY!');
  });
  it('mesaj önceliği 2: ilk madalya', () => {
    const s = summarizeRun(input({ score: 22, delivered: 4 }));
    expect(s.firstMedal).toBe(true);
    expect(s.message).toBe('First BRONZE medal!');
  });
  it('ikinci kez aynı madalya "first" değil', () => {
    const st = { ...stats0(), medals: { bronze: 1, silver: 0, gold: 0, platinum: 0 } };
    expect(summarizeRun(input({ stats: st, score: 22 })).firstMedal).toBe(false);
  });
  it('mesaj önceliği 3: kıl payı', () => {
    const st = { ...stats0(), medals: { bronze: 1, silver: 0, gold: 0, platinum: 0 } };
    const s = summarizeRun(input({ stats: st, bestNormal: 8, score: 6 }));
    expect(s.message).toBe('So close! 2 away from your best');
  });
  it('mesaj önceliği 4: kilit ilerlemesi, sonra teslim sayısı', () => {
    const st = { ...stats0(), cratesLifetime: 80 };
    expect(summarizeRun(input({ stats: st, bestNormal: 50, score: 3, delivered: 3, prevUnlocks: ['rescue', 'sunny'] })).message).toBe('17 more crates to unlock MINT');
    const all = { ...stats0(), cratesLifetime: 300, medals: { bronze: 1, silver: 0, gold: 0, platinum: 1 } };
    const s = summarizeRun(input({ stats: all, bestNormal: 50, score: 3, delivered: 3, prevUnlocks: ['rescue', 'sunny', 'mint', 'navy', 'gold'] }));
    expect(s.message).toBe('Crates delivered: 3');
  });
  it('NEW BEST sadece normal modda', () => {
    expect(summarizeRun(input({ bestNormal: 3, score: 5 })).newBest).toBe(true);
    const daily = { ...input({ bestNormal: 3, score: 5 }), result: { score: 5, delivered: 5, perfects: 0, shipsReached: 1, mode: 'daily' as const } };
    expect(summarizeRun(daily).newBest).toBe(false);
  });
  it('platin madalya GOLD boyayı açar', () => {
    const s = summarizeRun(input({ score: 210, delivered: 30 }));
    expect(s.newPaints).toContain('gold');
  });
  it('aynı kıl payı mesajı art arda tekrarlanmaz (varyasyon)', () => {
    const st = { ...stats0(), medals: { bronze: 1, silver: 0, gold: 0, platinum: 0 }, cratesLifetime: 80 };
    const base = input({ stats: st, bestNormal: 8, score: 6, prevUnlocks: ['rescue', 'sunny'] });
    const first = summarizeRun(base);
    expect(first.messageKind).toBe('near');
    const second = summarizeRun({ ...base, lastKind: first.messageKind });
    expect(second.messageKind).toBe('unlock');
    const third = summarizeRun({ ...base, lastKind: 'unlock' });
    expect(third.messageKind).toBe('near');
  });
  it('yeni boya ve ilk madalya mesajları art arda da gösterilir', () => {
    const st = { ...stats0(), cratesLifetime: 25 };
    expect(summarizeRun({ ...input({ stats: st, score: 22, delivered: 6 }), lastKind: 'paint' }).messageKind).toBe('paint');
  });
  it('XP adayı: sonraki rütbeye kalan', () => {
    const st = { ...stats0(), cratesLifetime: 300, medals: { bronze: 1, silver: 0, gold: 0, platinum: 1 } };
    const s2 = summarizeRun({ ...input({ stats: st, bestNormal: 99, score: 3, prevUnlocks: ['rescue', 'sunny', 'mint', 'navy', 'gold'] }), xpToRank: { remaining: 40, rank: 3 } });
    expect(s2.message).toBe('40 XP to rank 3');
  });
});
