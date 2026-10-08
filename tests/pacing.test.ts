import { describe, expect, it } from 'vitest';
import { shouldShowInterstitial, type PacingCtx } from '../src/core/pacing';

const ok: PacingCtx = {
  sessionRuns: 4, runsSinceInterstitial: 3, secondsSinceInterstitial: 150, lastRunSec: 25, rewardedWatched: false,
};

describe('shouldShowInterstitial', () => {
  it('bütün şartlar tam sınırda sağlanınca gösterir', () => {
    expect(shouldShowInterstitial(ok)).toBe(true);
  });
  it('ilk 4 koşuda göstermez (oturum koşusu < 4)', () => {
    expect(shouldShowInterstitial({ ...ok, sessionRuns: 3 })).toBe(false);
    expect(shouldShowInterstitial({ ...ok, sessionRuns: 1, runsSinceInterstitial: 1 })).toBe(false);
  });
  it('son reklamdan beri 3 koşu şartı', () => {
    expect(shouldShowInterstitial({ ...ok, runsSinceInterstitial: 2 })).toBe(false);
  });
  it('en az 150 sn aralık', () => {
    expect(shouldShowInterstitial({ ...ok, secondsSinceInterstitial: 149.9 })).toBe(false);
    expect(shouldShowInterstitial({ ...ok, secondsSinceInterstitial: Infinity })).toBe(true);
  });
  it('kısa koşudan (<25 sn) sonra göstermez', () => {
    expect(shouldShowInterstitial({ ...ok, lastRunSec: 24 })).toBe(false);
  });
  it('ödüllü reklam izlendiyse göstermez', () => {
    expect(shouldShowInterstitial({ ...ok, rewardedWatched: true })).toBe(false);
  });
});
