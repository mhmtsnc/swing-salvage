import { describe, expect, it } from 'vitest';
import { difficultyAt } from '../src/game/Difficulty';

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
