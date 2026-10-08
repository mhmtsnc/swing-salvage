import { describe, expect, it } from 'vitest';
import { createRng, dailyNumber, dailySeed } from '../src/core/rng';

const seq = (seed: number | string, n = 8) => {
  const r = createRng(seed);
  return Array.from({ length: n }, () => r.next());
};

describe('rng', () => {
  it('aynı tohum aynı diziyi verir', () => {
    expect(seq(42)).toEqual(seq(42));
    expect(seq('SS-2026-11-01')).toEqual(seq('SS-2026-11-01'));
  });
  it('farklı tohum farklı dizi verir', () => {
    expect(seq(1)).not.toEqual(seq(2));
  });
  it('range ve pick sınırlar içinde kalır', () => {
    const r = createRng(7);
    for (let i = 0; i < 200; i++) {
      const v = r.range(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(5);
      expect([0, 1, 2]).toContain(r.pick([60, 25, 20]));
    }
    expect(createRng(1).pick([0, 0, 5])).toBe(2);
  });
  it('dailySeed tarihe bağlıdır', () => {
    expect(dailySeed('2026-11-01')).toBe(dailySeed('2026-11-01'));
    expect(dailySeed('2026-11-01')).not.toBe(dailySeed('2026-11-02'));
  });
  it('dailyNumber ≥ 1', () => {
    expect(dailyNumber('2026-11-01', '2026-11-01')).toBe(1);
    expect(dailyNumber('2026-11-12', '2026-11-01')).toBe(12);
    expect(dailyNumber('2026-01-01', '2026-11-01')).toBe(1);
    expect(dailyNumber(new Date(Date.UTC(2026, 10, 3, 23, 59)), '2026-11-01')).toBe(3);
  });
});
