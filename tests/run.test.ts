import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { createRng } from '../src/core/rng';
import { Run } from '../src/game/Run';
import { Spawner } from '../src/game/Spawner';

import { scorePlacement, type ScoreInput } from '../src/game/scoring';

const none = { closeCall: false, gustHook: false, gustLanding: false, saved: false };
const place = (run: Run, o: Partial<ScoreInput> = {}) => {
  const grade = o.grade ?? 'normal';
  const r = scorePlacement({
    base: 1, grade, swingDeg: 0, hard: false, sweet: false, risk: none, carrySec: 20,
    perfectStreakBefore: run.streak, cleanStreakBefore: run.cleanStreak, progress: run.progress, ...o,
  }, TUNING.scoring);
  run.commit(r, grade);
  return r;
};

describe('Run puanlama', () => {
  it('normal yerleştirme tip puanı verir, seriyi sıfırlar', () => {
    const r = new Run(TUNING);
    r.reset('PLAYING');
    place(r, { grade: 'perfect' });
    const x = place(r, { base: 2 });
    expect(x.gained).toBe(2);
    expect(r.streak).toBe(0);
    expect(r.score).toBe(2 + 2);
  });
  it('ilerleme eski ölçekli: temel + perfect için +1', () => {
    const r = new Run(TUNING);
    r.reset('PLAYING');
    place(r, { grade: 'flawless', base: 2 });
    expect(r.progress).toBe(3);
    expect(r.score).toBe(6);
    expect(r.perfects).toBe(1);
    expect(r.log).toEqual(['p']);
  });
  it('ardışık perfect serisi sayaçları ilerletir', () => {
    const r = new Run(TUNING);
    r.reset('PLAYING');
    for (let i = 0; i < 5; i++) place(r, { grade: 'perfect' });
    expect(r.streak).toBe(5);
    expect(r.cleanStreak).toBe(5);
    expect(r.perfects).toBe(5);
  });
  it('kota 5,6,7 sonra hep 7; gemi bonusu +2 (skor ve ilerleme)', () => {
    const r = new Run(TUNING);
    r.reset('PLAYING');
    const q: number[] = [];
    for (let i = 0; i < 5; i++) { q.push(r.quota); r.beginSwap(); r.endSwap(); }
    expect(q).toEqual([5, 6, 7, 7, 7]);
    expect(r.score).toBe(10);
    expect(r.progress).toBe(10);
  });
  it('fail ikinci kez durumu değiştirmez', () => {
    const r = new Run(TUNING);
    r.reset('PLAYING');
    r.fail('splash');
    r.fail('crash');
    expect(r.failKind).toBe('splash');
    expect(r.state).toBe('FAILING');
  });
});

describe('Spawner', () => {
  it('skor 0\'da sadece crate, x aralığı doğru', () => {
    const s = new Spawner(createRng(5), TUNING);
    for (let i = 0; i < 50; i++) {
      const p = s.next(0, 540);
      expect(p.type).toBe('crate');
      expect(p.weightMul).toBeGreaterThanOrEqual(0.85);
      expect(p.weightMul).toBeLessThanOrEqual(1.25);
      expect(p.x).toBeGreaterThanOrEqual(310 + 20 + 36);
      expect(p.x).toBeLessThanOrEqual(540 - 20 - 36);
    }
  });
  it('gold gemi başına en fazla 1, resetShip ile yenilenir', () => {
    const s = new Spawner(createRng(9), TUNING);
    let gold = 0;
    for (let i = 0; i < 300; i++) if (s.next(60, 540).type === 'gold') gold++;
    expect(gold).toBe(1);
    s.resetShip();
    let again = 0;
    for (let i = 0; i < 300; i++) if (s.next(60, 540).type === 'gold') again++;
    expect(again).toBe(1);
  });
  it('aynı tohum aynı dizi', () => {
    const a = new Spawner(createRng(3), TUNING);
    const b = new Spawner(createRng(3), TUNING);
    for (let i = 0; i < 20; i++) expect(a.next(30, 540)).toEqual(b.next(30, 540));
  });
});
