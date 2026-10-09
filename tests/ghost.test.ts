import { describe, expect, it } from 'vitest';
import { GhostRecorder, ghostPoseAt, ghostScoreAt } from '../src/core/ghost';

function record() {
  const r = new GhostRecorder(0.2);
  for (let i = 0; i <= 50; i++) {
    const t = i * 0.1;
    r.tick(t, 100 + t * 50, 200, t < 3 ? 1 : -1);
  }
  r.score(1.5, 3);
  r.score(3.2, 9);
  return r.data(9);
}

describe('ghost', () => {
  it('örnekleme aralığı kadar kayıt alır', () => {
    const g = record();
    expect(g.samples.length / 3).toBeGreaterThanOrEqual(25);
    expect(g.samples.length / 3).toBeLessThanOrEqual(27);
    expect(g.score).toBe(9);
  });
  it('arada lineer enterpolasyon, bitişte null', () => {
    const g = record();
    const p = ghostPoseAt(g, 1.0)!;
    expect(p.x).toBeCloseTo(150, 0);
    expect(p.y).toBe(200);
    expect(ghostPoseAt(g, 0.1)!.x).toBeCloseTo(105, 0);
    expect(ghostPoseAt(g, 99)).toBeNull();
    expect(ghostPoseAt(g, -1)).toBeNull();
  });
  it('skor zaman çizelgesi', () => {
    const g = record();
    expect([0, 1.4, 1.5, 3.1, 3.2, 10].map((t) => ghostScoreAt(g, t))).toEqual([0, 0, 3, 3, 9, 9]);
  });
  it('reset kaydı temizler', () => {
    const r = new GhostRecorder(0.2);
    r.tick(0, 1, 2, 1);
    r.reset();
    expect(r.data(0).samples).toHaveLength(0);
  });
});
