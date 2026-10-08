import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { createRng } from '../src/core/rng';
import { difficultyAt } from '../src/game/Difficulty';
import { Weather } from '../src/game/Weather';

interface Log { t: number; e: string }

function simulate(seed: string, score: number, seconds: number, frozen = false): { log: Log[]; w: Weather } {
  const log: Log[] = [];
  let t = 0;
  const w = new Weather(createRng(seed), TUNING, {
    onGustWarn: () => log.push({ t, e: 'warn' }),
    onGustStart: () => log.push({ t, e: 'start' }),
    onGustEnd: () => log.push({ t, e: 'end' }),
    onLightning: () => log.push({ t, e: 'lightning' }),
    onThunder: () => log.push({ t, e: 'thunder' }),
  });
  const d = difficultyAt(score);
  for (let i = 0; i < seconds * 60; i++) {
    t = i / 60;
    w.step(1 / 60, d, score, frozen);
  }
  return { log, w };
}

describe('Weather', () => {
  it('skor < gustFromScore: ani rüzgâr yok', () => {
    expect(simulate('a', 3, 120).log.filter((l) => l.e === 'warn')).toHaveLength(0);
  });
  it('uyarı başlangıçtan tam gustTelegraph sn önce', () => {
    const { log } = simulate('a', 20, 60);
    const warns = log.filter((l) => l.e === 'warn');
    const starts = log.filter((l) => l.e === 'start');
    expect(warns.length).toBeGreaterThan(3);
    warns.forEach((w, i) => expect(starts[i].t - w.t).toBeCloseTo(TUNING.weather.gustTelegraph, 1));
  });
  it('bitiş başlangıçtan gustDuration sonra', () => {
    const { log } = simulate('b', 20, 60);
    const starts = log.filter((l) => l.e === 'start');
    const ends = log.filter((l) => l.e === 'end');
    starts.forEach((s, i) => expect(ends[i].t - s.t).toBeCloseTo(TUNING.weather.gustDuration, 1));
  });
  it('aralık gustInterval·(1±jitter) içinde', () => {
    const d = difficultyAt(20);
    const j = TUNING.weather.gustIntervalJitter;
    const { log } = simulate('c', 20, 400);
    const ends = log.filter((l) => l.e === 'end');
    const warns = log.filter((l) => l.e === 'warn');
    for (let i = 1; i < warns.length; i++) {
      const gap = warns[i].t - ends[i - 1].t;
      expect(gap).toBeGreaterThanOrEqual(d.gustInterval * (1 - j) - 0.05);
      expect(gap).toBeLessThanOrEqual(d.gustInterval * (1 + j) + 0.05);
    }
  });
  it('aynı tohum aynı zamanlama, farklı tohum farklı', () => {
    expect(simulate('x', 20, 90).log).toEqual(simulate('x', 20, 90).log);
    expect(simulate('x', 20, 90).log).not.toEqual(simulate('y', 20, 90).log);
  });
  it('şimşek sadece skor ≥ 10, aralık 10–18 sn, gök gürültüsü 300 ms sonra', () => {
    expect(simulate('l', 9, 200).log.filter((l) => l.e === 'lightning')).toHaveLength(0);
    const { log } = simulate('l', 20, 400);
    const l = log.filter((x) => x.e === 'lightning');
    const th = log.filter((x) => x.e === 'thunder');
    expect(l.length).toBeGreaterThan(10);
    for (let i = 1; i < l.length; i++) {
      expect(l[i].t - l[i - 1].t).toBeGreaterThanOrEqual(TUNING.weather.lightningMin - 0.05);
      expect(l[i].t - l[i - 1].t).toBeLessThanOrEqual(TUNING.weather.lightningMax + 0.05);
    }
    th.forEach((x, i) => expect(x.t - l[i].t).toBeCloseTo(0.3, 1));
  });
  it('dondurulunca (SWAPPING) yeni uyarı başlamaz', () => {
    expect(simulate('f', 20, 120, true).log.filter((l) => l.e === 'warn')).toHaveLength(0);
  });
  it('zarf giriş/çıkışta yumuşak, ortada 1', () => {
    const w = new Weather(createRng('env'), TUNING);
    const d = difficultyAt(60);
    let peak = 0;
    let sawRamp = false;
    for (let i = 0; i < 60 * 40; i++) {
      w.step(1 / 60, d, 60, false);
      const e = w.envelope();
      peak = Math.max(peak, e);
      if (e > 0 && e < 1) sawRamp = true;
      expect(Math.abs(w.gustAccel())).toBeLessThanOrEqual(d.gustForce * TUNING.weather.gustAccelPerUnit + 1e-6);
    }
    expect(peak).toBe(1);
    expect(sawRamp).toBe(true);
  });
});
