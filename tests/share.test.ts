import { describe, expect, it } from 'vitest';
import { buildShareText, type ShareInput } from '../src/core/share';

const base: ShareInput = {
  mode: 'daily', dailyNumber: 12, score: 23, ships: 3, perfects: 4,
  log: ['c', 'c', 'p', 'c', 'c', 'p', 'c', 'c', 'c', 'p', 'p', 'c'],
  death: 'splash', storeUrl: 'https://store.example/app',
};

describe('buildShareText', () => {
  it('§15.3 daily biçimi', () => {
    expect(buildShareText(base)).toBe(
      'Swing Salvage · Daily Storm #12\n📦 23 pts · 🚢 3 ships · ⭐ 4 perfect\n🟧🟧⭐🟧🟧⭐🟧🟧🟧⭐⭐🟧💦\nhttps://store.example/app',
    );
  });
  it('normal modda başlık "I scored N!"', () => {
    expect(buildShareText({ ...base, mode: 'normal' }).split('\n')[0]).toBe('Swing Salvage · I scored 23!');
  });
  it('20 sembolden fazlası +k olarak yazılır', () => {
    const log = Array.from({ length: 27 }, () => 'c' as const);
    const row = buildShareText({ ...base, log, death: 'crash' }).split('\n')[2];
    expect(row).toBe('🟧'.repeat(20) + '+7💥');
  });
  it('ölüm türü sembolleri ve tekil gemi', () => {
    expect(buildShareText({ ...base, death: 'topple', ships: 1 })).toContain('🙃');
    expect(buildShareText({ ...base, ships: 1 })).toContain('1 ship ·');
  });
  it('kargo yoksa sadece ölüm sembolü', () => {
    expect(buildShareText({ ...base, log: [], score: 0, perfects: 0 }).split('\n')[2]).toBe('💦');
  });
});
