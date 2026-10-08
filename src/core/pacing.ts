import { TUNING } from '../config/tuning';

export interface PacingCtx {
  /** Bu oturumda biten koşu sayısı (bu dahil) */
  sessionRuns: number;
  /** Son geçiş reklamından beri biten koşu sayısı (bu dahil) */
  runsSinceInterstitial: number;
  /** Son geçiş reklamından beri geçen süre, sn (hiç gösterilmediyse Infinity) */
  secondsSinceInterstitial: number;
  /** Biten koşunun süresi, sn */
  lastRunSec: number;
  /** Bu game over'da ödüllü reklam izlendi mi */
  rewardedWatched: boolean;
}

export type PacingCfg = Pick<
  (typeof TUNING)['ads'],
  'interstitialEveryRuns' | 'interstitialMinGapSec' | 'interstitialMinSessionRuns' | 'interstitialMinRunSec'
>;

/** §16.3: AGAIN'e basıldığında geçiş reklamı gösterilsin mi? Hepsi gerekir (saf fonksiyon). */
export function shouldShowInterstitial(ctx: PacingCtx, cfg: PacingCfg = TUNING.ads): boolean {
  return (
    ctx.sessionRuns >= cfg.interstitialMinSessionRuns &&
    ctx.runsSinceInterstitial >= cfg.interstitialEveryRuns &&
    ctx.secondsSinceInterstitial >= cfg.interstitialMinGapSec &&
    ctx.lastRunSec >= cfg.interstitialMinRunSec &&
    !ctx.rewardedWatched
  );
}
