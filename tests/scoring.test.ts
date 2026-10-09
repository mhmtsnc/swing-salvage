import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import {
  cleanMilestone, scorePlacement, speedBonus, stormMultiplier, streakMilestone, swingBonus,
  type ScoreInput,
} from '../src/game/scoring';

const S = TUNING.scoring;
const none = { closeCall: false, gustHook: false, gustLanding: false, saved: false };
const input = (o: Partial<ScoreInput> = {}): ScoreInput => ({
  base: 1, grade: 'normal', swingDeg: 0, hard: false, sweet: false, risk: none, carrySec: 20,
  perfectStreakBefore: 0, cleanStreakBefore: 0, progress: 0, ...o,
});

describe('scorePlacement', () => {
  it('sıradan iniş: sadece temel puan', () => {
    const r = scorePlacement(input(), S);
    expect(r.gained).toBe(1);
    expect(r.perfectStreak).toBe(0);
    expect(r.cleanStreak).toBe(1);
  });
  it('PERFECT ×2, FLAWLESS ×3', () => {
    expect(scorePlacement(input({ grade: 'perfect' }), S).gained).toBe(2);
    expect(scorePlacement(input({ grade: 'flawless' }), S).gained).toBe(3);
    expect(scorePlacement(input({ grade: 'flawless', base: 3 }), S).gained).toBe(9);
  });
  it('seri çarpanı: ardışık perfect başına +%10, en fazla +%90', () => {
    const r2 = scorePlacement(input({ grade: 'perfect', base: 10, perfectStreakBefore: 1 }), S);
    expect(r2.comboMult).toBeCloseTo(1.1);
    const r20 = scorePlacement(input({ grade: 'perfect', base: 10, perfectStreakBefore: 19 }), S);
    expect(r20.comboMult).toBeCloseTo(1.9);
  });
  it('salınım bonusu eşikleri 15/25/35°; sert inişte yok', () => {
    expect([10, 15, 25, 35, 60].map((d) => swingBonus(d, S))).toEqual([0, 1, 2, 3, 3]);
    expect(scorePlacement(input({ swingDeg: 30, hard: true }), S).parts.some((p) => p.key === 'swing')).toBe(false);
    expect(scorePlacement(input({ swingDeg: 30 }), S).gained).toBe(3);
  });
  it('risk bonusları toplanır', () => {
    const r = scorePlacement(input({ risk: { closeCall: true, gustHook: true, gustLanding: true, saved: true } }), S);
    expect(r.subtotal).toBe(1 + 1 + 1 + 2 + 3);
  });
  it('hızlı teslim: ≤3 sn +3, ≤5 +2, ≤7 +1', () => {
    expect([2, 3.1, 5.5, 8].map((s) => speedBonus(s, S))).toEqual([3, 2, 1, 0]);
  });
  it('nokta atışı bölgesi +2', () => {
    expect(scorePlacement(input({ sweet: true }), S).gained).toBe(3);
  });
  it('fırtına çarpanı ilerlemeyle artar ve 2.5te kesilir', () => {
    expect(stormMultiplier(0, S)).toBe(1);
    expect(stormMultiplier(60, S)).toBeCloseTo(1.5);
    expect(stormMultiplier(9999, S)).toBe(2.5);
    expect(scorePlacement(input({ base: 4, progress: 60 }), S).gained).toBe(6);
  });
  it('mükemmel seri kilometre taşları: 3→+2, 5→+3, 8→+5, 10→+8, 15→+8', () => {
    expect([2, 3, 4, 5, 8, 10, 11, 15].map((n) => streakMilestone(n, S))).toEqual([0, 2, 0, 3, 5, 8, 0, 8]);
    const r = scorePlacement(input({ grade: 'perfect', perfectStreakBefore: 4 }), S);
    expect(r.perfectStreak).toBe(5);
    expect(r.streakBonus).toBe(3);
  });
  it('hasarsız seri: 4→+2, 8→+4, 12→+6, 16→+6; sert iniş seriyi sıfırlar', () => {
    expect([3, 4, 8, 12, 13, 16].map((n) => cleanMilestone(n, S))).toEqual([0, 2, 4, 6, 0, 6]);
    const hard = scorePlacement(input({ hard: true, cleanStreakBefore: 7 }), S);
    expect(hard.cleanStreak).toBe(0);
    expect(hard.damage).toBe(true);
    expect(scorePlacement(input({ cleanStreakBefore: 3 }), S).cleanBonus).toBe(2);
  });
  it('ilerleme (zorluk) eski ölçekte: temel + perfect için +1', () => {
    expect(scorePlacement(input({ base: 2, grade: 'perfect' }), S).progressGain).toBe(3);
    expect(scorePlacement(input({ base: 2 }), S).progressGain).toBe(2);
  });
});
