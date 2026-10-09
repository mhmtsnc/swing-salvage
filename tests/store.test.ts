import { describe, expect, it } from 'vitest';
import { getItem } from '../src/core/storage';
import { initMeta, loadMeta, markSeen, openCrate, saveMeta, setTrail, unlockedPaints, unlockedTrails } from '../src/meta/store';

describe('meta store (bellek yedeğiyle)', () => {
  it('açılış: 3 görev, günlük görev, ilk gün hediye kasası', () => {
    const { meta, login } = initMeta(new Date(Date.UTC(2026, 10, 12, 10)));
    expect(meta.missions).toHaveLength(3);
    expect(meta.daily?.date).toBe('2026-11-12');
    expect(login.giftCrates).toBe(1);
    expect(meta.crates).toBe(1);
    // aynı gün ikinci açılışta hediye yok, görevler korunur
    const again = initMeta(new Date(Date.UTC(2026, 10, 12, 20)));
    expect(again.login.giftCrates).toBe(0);
    expect(again.meta.crates).toBe(1);
    expect(again.meta.missions).toEqual(meta.missions);
  });
  it('ertesi gün seri artar ve yeni kasa gelir', () => {
    const r = initMeta(new Date(Date.UTC(2026, 10, 13, 9)));
    expect(r.meta.login.streak).toBe(2);
    expect(r.meta.crates).toBe(2);
  });
  it('kasa aç: kozmetik edinilir, NEW rozeti, kasa azalır', () => {
    const before = loadMeta();
    const r = openCrate(7);
    expect(r).not.toBeNull();
    expect(r!.meta.crates).toBe(before.crates - 1);
    if (r!.reward.kind === 'cosmetic') {
      const id = r!.reward.item.id;
      expect(loadMeta().owned).toContain(id);
      expect(loadMeta().fresh).toContain(id);
      markSeen(id);
      expect(loadMeta().fresh).not.toContain(id);
      if (r!.reward.item.kind === 'paint') expect(unlockedPaints()).toContain(id);
      else expect(unlockedTrails()).toContain(id);
    }
  });
  it('kasa yoksa açılmaz; iz seçimi kaydedilir', () => {
    const m = loadMeta();
    m.crates = 0;
    saveMeta(m);
    expect(openCrate()).toBeNull();
    setTrail('sparks');
    expect(loadMeta().trail).toBe('sparks');
    expect(getItem('ss.meta').trail).toBe('sparks');
  });
});
