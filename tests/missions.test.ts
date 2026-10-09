import { describe, expect, it } from 'vitest';
import { advance, dailyMissionId, MISSIONS, missionText, newMissionSet, pickMission, progressMissions, targetOf, wouldComplete } from '../src/meta/missions';
import { emptyMetrics } from '../src/meta/tally';

describe('missions', () => {
  it('tanımlar tutarlı: hedefler artan, metin {n} içerir', () => {
    for (const m of MISSIONS) {
      expect(m.targets[0]).toBeLessThan(m.targets[1]);
      expect(m.targets[1]).toBeLessThan(m.targets[2]);
      expect(m.text).toContain('{n}');
    }
  });
  it('yeni set: 3 kademe, farklı kimlikler', () => {
    const { slots, counter } = newMissionSet(0);
    expect(slots.map((s) => s.tier)).toEqual([0, 1, 2]);
    expect(new Set(slots.map((s) => s.id)).size).toBe(3);
    expect(counter).toBe(3);
  });
  it('seçim tohumlu: aynı sayaç aynı görev', () => {
    expect(pickMission(5, 1, [])).toBe(pickMission(5, 1, []));
    expect(pickMission(5, 1, ['deliver'])).not.toBe('deliver');
  });
  it('sum ilerler, best en yükseği tutar', () => {
    const m = { ...emptyMetrics(), delivered: 3, streak: 4 };
    expect(advance({ id: 'deliver', progress: 2 }, m)).toBe(5);
    expect(advance({ id: 'streak', progress: 6 }, m)).toBe(6);
    expect(advance({ id: 'streak', progress: 2 }, m)).toBe(4);
  });
  it('biten görev aynı kademeden yenisiyle değişir, diğerleri ilerler', () => {
    const slots = [
      { id: 'deliver', tier: 0 as const, progress: 5 },
      { id: 'perfects', tier: 1 as const, progress: 0 },
      { id: 'score', tier: 2 as const, progress: 0 },
    ];
    const m = { ...emptyMetrics(), delivered: 3, perfects: 2, score: 20 };
    const r = progressMissions(slots, 10, m);
    expect(r.completed).toHaveLength(1);
    expect(r.completed[0]).toMatchObject({ id: 'deliver', tier: 0, target: 8 });
    expect(r.slots[0].tier).toBe(0);
    expect(r.slots[0].id).not.toBe('deliver');
    expect(r.slots[0].progress).toBe(0);
    expect(r.slots[1].progress).toBe(2);
    expect(r.slots[2].progress).toBe(20);
    expect(r.counter).toBe(11);
  });
  it('canlı bildirim: tamamlanacakları listeler', () => {
    const slots = [{ id: 'deliver', tier: 0 as const, progress: 6 }];
    expect(wouldComplete(slots, { ...emptyMetrics(), delivered: 1 })).toEqual([]);
    expect(wouldComplete(slots, { ...emptyMetrics(), delivered: 2 })).toEqual(['deliver']);
  });
  it('metin hedefi yazar; günlük görev gün için sabit', () => {
    expect(missionText({ id: 'deliver', tier: 2 })).toBe('Deliver 50 crates');
    expect(targetOf({ id: 'ships', tier: 1 })).toBe(3);
    expect(dailyMissionId('2026-11-12')).toBe(dailyMissionId('2026-11-12'));
  });
});
