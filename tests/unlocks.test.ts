import { describe, expect, it } from 'vitest';
import { evaluateUnlocks, nextUnlockProgress, paintRequirement } from '../src/core/unlocks';

const stats = (crates: number, platinum = 0) => ({
  cratesLifetime: crates,
  medals: { bronze: 0, silver: 0, gold: 0, platinum },
});
const daily = (days: string[] = []) => ({ playedDays: days });

describe('evaluateUnlocks', () => {
  it('başlangıçta sadece rescue', () => {
    expect(evaluateUnlocks(stats(0), daily())).toEqual(['rescue']);
  });
  it('sandık eşikleri 30 / 100 / 250', () => {
    expect(evaluateUnlocks(stats(29), daily())).not.toContain('sunny');
    expect(evaluateUnlocks(stats(30), daily())).toContain('sunny');
    expect(evaluateUnlocks(stats(100), daily())).toContain('mint');
    expect(evaluateUnlocks(stats(249), daily())).not.toContain('navy');
    expect(evaluateUnlocks(stats(250), daily())).toContain('navy');
  });
  it('paper: 5 farklı gün (tekrarlar sayılmaz)', () => {
    expect(evaluateUnlocks(stats(0), daily(['a', 'b', 'c', 'd', 'd']))).not.toContain('paper');
    expect(evaluateUnlocks(stats(0), daily(['a', 'b', 'c', 'd', 'e']))).toContain('paper');
  });
  it('gold: platin madalya', () => {
    expect(evaluateUnlocks(stats(0, 1), daily())).toContain('gold');
  });
});

describe('nextUnlockProgress', () => {
  it('bir sonraki sandık kilidini ve kalanı verir', () => {
    expect(nextUnlockProgress({ cratesLifetime: 82 })).toEqual({ paint: 'mint', remaining: 18 });
    expect(nextUnlockProgress({ cratesLifetime: 0 })).toEqual({ paint: 'sunny', remaining: 30 });
  });
  it('hepsi açıksa null', () => {
    expect(nextUnlockProgress({ cratesLifetime: 250 })).toBeNull();
  });
});

describe('paintRequirement', () => {
  it('açık boya için null, kilitli için ilerleme', () => {
    expect(paintRequirement('rescue', stats(0), daily())).toBeNull();
    expect(paintRequirement('mint', stats(42), daily())).toEqual({ text: '100 crates', have: 42, need: 100 });
  });
});
