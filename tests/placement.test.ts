import { describe, expect, it } from 'vitest';
import { classifyPlacement, findBelow, type PlacementInput } from '../src/game/placement';
import { TUNING } from '../src/config/tuning';

const base = (over: Partial<PlacementInput> = {}): PlacementInput => ({
  cargo: { x: 110, y: 600, w: 72, h: 56, angle: 0 },
  below: null,
  slotCentersX: [110, 210],
  deckAngle: 0,
  impact: 50,
  rules: TUNING.rules,
  ...over,
});

describe('classifyPlacement', () => {
  it('slot merkezinde düzgün iniş PERFECT', () => {
    const r = classifyPlacement(base());
    expect(r.perfect).toBe(true);
    expect(r.hard).toBe(false);
  });
  it('dx sınırı: 7 px içinde perfect, 8 px dışında değil', () => {
    expect(classifyPlacement(base({ cargo: { x: 117, y: 600, w: 72, h: 56, angle: 0 } })).perfect).toBe(true);
    expect(classifyPlacement(base({ cargo: { x: 118, y: 600, w: 72, h: 56, angle: 0 } })).perfect).toBe(false);
  });
  it('açı sınırı 4°', () => {
    const rad = (d: number) => (d * Math.PI) / 180;
    expect(classifyPlacement(base({ cargo: { x: 110, y: 600, w: 72, h: 56, angle: rad(3.9) } })).perfect).toBe(true);
    expect(classifyPlacement(base({ cargo: { x: 110, y: 600, w: 72, h: 56, angle: rad(4.5) } })).perfect).toBe(false);
  });
  it('güverte açısına göreli ölçülür', () => {
    const rad = (d: number) => (d * Math.PI) / 180;
    const r = classifyPlacement(base({ cargo: { x: 110, y: 600, w: 72, h: 56, angle: rad(6) }, deckAngle: rad(5) }));
    expect(r.angleDeg).toBeCloseTo(1);
    expect(r.perfect).toBe(true);
  });
  it('çarpma hızı: 170 üstü perfect değil, 220 ve üstü sert iniş', () => {
    expect(classifyPlacement(base({ impact: 170 })).perfect).toBe(true);
    expect(classifyPlacement(base({ impact: 171 })).perfect).toBe(false);
    expect(classifyPlacement(base({ impact: 219 })).hard).toBe(false);
    expect(classifyPlacement(base({ impact: 220 })).hard).toBe(true);
  });
  it('geniş kargo (≥100) iki slotun ortasını hedefler', () => {
    const wide = { x: 160, y: 600, w: 116, h: 44, angle: 0 };
    expect(classifyPlacement(base({ cargo: wide })).perfect).toBe(true);
    expect(classifyPlacement(base({ cargo: { ...wide, x: 110 } })).perfect).toBe(false);
  });
  it('altında kargo varsa onun merkezine hizalanır', () => {
    const below = { x: 210, y: 650, w: 72, h: 56, angle: 0 };
    const r = classifyPlacement(base({ cargo: { x: 214, y: 594, w: 72, h: 56, angle: 0 }, below }));
    expect(r.alignDx).toBe(4);
    expect(r.perfect).toBe(true);
  });
});

describe('derece ve nokta atışı', () => {
  it('FLAWLESS: dx ≤ 3, açı ≤ 1.5°, çarpma ≤ 90', () => {
    expect(classifyPlacement(base({ cargo: { x: 112, y: 600, w: 72, h: 56, angle: 0 }, impact: 80 })).grade).toBe('flawless');
    expect(classifyPlacement(base({ cargo: { x: 115, y: 600, w: 72, h: 56, angle: 0 }, impact: 80 })).grade).toBe('perfect');
    expect(classifyPlacement(base({ impact: 120 })).grade).toBe('perfect');
    expect(classifyPlacement(base({ impact: 200 })).grade).toBe('normal');
  });
  it('nokta atışı: sıcak slotta ve dx ≤ 14, altında kargo yokken', () => {
    expect(classifyPlacement(base({ hotSlot: 0 })).sweet).toBe(true);
    expect(classifyPlacement(base({ hotSlot: 1 })).sweet).toBe(false);
    expect(classifyPlacement(base({ hotSlot: 0, cargo: { x: 126, y: 600, w: 72, h: 56, angle: 0 } })).sweet).toBe(false);
    const below = { x: 110, y: 650, w: 72, h: 56, angle: 0 };
    expect(classifyPlacement(base({ hotSlot: 0, below })).sweet).toBe(false);
    expect(classifyPlacement(base({ hotSlot: 0, impact: 230 })).sweet).toBe(false);
  });
});

describe('findBelow', () => {
  const a = { x: 110, y: 700, w: 72, h: 56 };
  const b = { x: 110, y: 644, w: 72, h: 56 };
  it('en üstteki örtüşen kargoyu seçer', () => {
    const c = { x: 112, y: 588, w: 72, h: 56 };
    expect(findBelow(c, [a, b])).toBe(b);
  });
  it('yatayda örtüşmüyorsa veya uzaksa null', () => {
    expect(findBelow({ x: 300, y: 588, w: 72, h: 56 }, [a, b])).toBeNull();
    expect(findBelow({ x: 110, y: 500, w: 72, h: 56 }, [a, b])).toBeNull();
  });
});
