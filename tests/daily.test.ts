import { describe, expect, it } from 'vitest';
import { dailyInfo, finishAttempt, previousDay, rollover, startAttempt, triesLeft, utcDateString } from '../src/core/daily';
import type { DailyState } from '../src/core/storage';

const empty = (): DailyState => ({ date: '', attemptsUsed: 0, best: 0, playedDays: [], streak: 0 });

describe('daily', () => {
  it('UTC tarih ve Daily #N', () => {
    expect(utcDateString(new Date(Date.UTC(2026, 10, 12, 23, 59)))).toBe('2026-11-12');
    const i = dailyInfo(new Date(Date.UTC(2026, 10, 12, 5)), '2026-11-01');
    expect(i.date).toBe('2026-11-12');
    expect(i.number).toBe(12);
    expect(i.seed).toBe(dailyInfo(new Date(Date.UTC(2026, 10, 12, 20)), '2026-11-01').seed);
    expect(i.seed).not.toBe(dailyInfo(new Date(Date.UTC(2026, 10, 13)), '2026-11-01').seed);
  });
  it('günde 3 deneme', () => {
    let s = empty();
    expect(triesLeft(s, '2026-11-12', 3)).toBe(3);
    for (let n = 0; n < 3; n++) s = startAttempt(s, '2026-11-12');
    expect(triesLeft(s, '2026-11-12', 3)).toBe(0);
    expect(triesLeft(s, '2026-11-13', 3)).toBe(3);
  });
  it('günün en iyisi yeni günde sıfırlanır, oynanan günler kalır', () => {
    let s = startAttempt(empty(), '2026-11-12');
    s = finishAttempt(s, '2026-11-12', 20);
    s = finishAttempt(s, '2026-11-12', 12);
    expect(s.best).toBe(20);
    const next = rollover(s, '2026-11-13');
    expect(next.best).toBe(0);
    expect(next.playedDays).toEqual(['2026-11-12']);
  });
  it('seri: art arda günler artar, boşlukta 1e döner', () => {
    let s = startAttempt(empty(), '2026-11-10');
    s = startAttempt(s, '2026-11-10');
    expect(s.streak).toBe(1);
    s = startAttempt(s, '2026-11-11');
    s = startAttempt(s, '2026-11-12');
    expect(s.streak).toBe(3);
    s = startAttempt(s, '2026-11-15');
    expect(s.streak).toBe(1);
    expect(s.playedDays).toHaveLength(4);
  });
  it('previousDay ay sonunu aşar', () => {
    expect(previousDay('2026-12-01')).toBe('2026-11-30');
  });
});
