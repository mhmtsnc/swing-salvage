import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { createRng } from '../src/core/rng';
import { Run } from '../src/game/Run';
import { Spawner } from '../src/game/Spawner';

describe('Run puanlama', () => {
  it('normal yerleştirme tip puanı verir, seriyi sıfırlar', () => {
    const r = new Run(TUNING);
    r.reset('PLAYING');
    r.onStacked(1, true);
    const x = r.onStacked(2, false);
    expect(x.gained).toBe(2);
    expect(r.streak).toBe(0);
    expect(r.score).toBe(1 + 1 + 2);
  });
  it('PERFECT +1, her 5. ardışık PERFECT +3 STEADY', () => {
    const r = new Run(TUNING);
    r.reset('PLAYING');
    const gains = [1, 2, 3, 4, 5].map(() => r.onStacked(1, true));
    expect(gains.map((g) => g.gained)).toEqual([2, 2, 2, 2, 5]);
    expect(gains[4].steady).toBe(true);
    expect(r.perfects).toBe(5);
  });
  it('kota 5,6,7 sonra hep 7; gemi bonusu +2', () => {
    const r = new Run(TUNING);
    r.reset('PLAYING');
    const q: number[] = [];
    for (let i = 0; i < 5; i++) { q.push(r.quota); r.beginSwap(); r.endSwap(); }
    expect(q).toEqual([5, 6, 7, 7, 7]);
    expect(r.score).toBe(10);
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
