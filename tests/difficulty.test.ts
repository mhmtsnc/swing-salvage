import { describe, expect, it } from 'vitest';
import { difficultyAt, difficultyEndless } from '../src/game/Difficulty';
import { TUNING } from '../src/config/tuning';

describe('difficultyAt', () => {
  it('0 puanda ilk anahtar kare', () => {
    const d = difficultyAt(0);
    expect(d.windBase).toBe(0);
    expect(d.rollAmpDeg).toBe(1.5);
    expect(d.waveAmp).toBe(5);
  });
  it('2.5 puanda 0 ile 5 arasının ortası', () => {
    const d = difficultyAt(2.5);
    expect(d.windBase).toBeCloseTo(0.05);
    expect(d.rollAmpDeg).toBeCloseTo(2.0);
    expect(d.rain).toBeCloseTo(0.3);
    expect(d.gustInterval).toBeCloseTo(9.0);
  });
  it('60 ve üstünde sabit', () => {
    const a = difficultyAt(60);
    expect(a.windBase).toBe(0.4);
    expect(difficultyAt(100)).toEqual(a);
  });
  it('anahtar karede tam değeri verir', () => {
    expect(difficultyAt(10).waveAmp).toBeCloseTo(11);
    expect(difficultyAt(20).gustForce).toBeCloseTo(1.2);
  });
});

describe('difficultyAt ara değerler', () => {
  it('7.5 puanda 5 ile 10 arasının ortası', () => {
    const d = difficultyAt(7.5);
    expect(d.windBase).toBeCloseTo(0.14);
    expect(d.gustInterval).toBeCloseTo(8.25);
    expect(d.rain).toBeCloseTo(0.5);
  });
  it('yalpa periyodu skorla azalır, monoton', () => {
    let prev = Infinity;
    for (let s = 0; s <= 70; s += 5) {
      const p = difficultyAt(s).rollPeriod;
      expect(p).toBeLessThanOrEqual(prev);
      prev = p;
    }
  });
});

describe('difficultyEndless', () => {
  it('60 puana kadar difficultyAt ile aynı', () => {
    for (const s of [0, 12, 40, 60]) expect(difficultyEndless(s)).toEqual(difficultyAt(s));
  });
  it('60 üstünde monoton artar ve tavanda durur', () => {
    const a = difficultyEndless(100);
    const b = difficultyEndless(160);
    expect(b.windBase).toBeGreaterThan(a.windBase);
    expect(b.gustForce).toBeGreaterThan(a.gustForce);
    expect(b.rollAmpDeg).toBeGreaterThan(a.rollAmpDeg);
    expect(b.gustInterval).toBeLessThan(a.gustInterval);
    const cap = difficultyEndless(60 + TUNING.endless.span);
    expect(cap.windBase).toBeCloseTo(TUNING.endless.windBase);
    expect(difficultyEndless(5000)).toEqual(cap);
  });
});
