import { Capacitor } from '@capacitor/core';
import {
  AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { ADS_TEST_MODE, AD_IDS } from '../config/ads';
import { getItem, setItem } from './storage';
import { shouldShowInterstitial } from './pacing';

export interface RunEndInfo {
  /** Biten koşunun süresi, sn */
  lastRunSec: number;
  rewardedWatched: boolean;
}

export interface AdService {
  readonly name: 'admob' | 'noop';
  init(): Promise<void>;
  canOfferRewarded(): boolean;
  /** Ödül kazanıldıysa true. Hata veya ödülsüz kapanışta false. Oyunu asla kilitlemez. */
  showRewarded(): Promise<boolean>;
  /** Her biten koşuda çağrılır (sayaçlar). */
  noteRunFinished(): void;
  /** AGAIN'de: pacing uygunsa geçiş reklamı gösterir; kapanınca çözülür. */
  maybeShowInterstitial(info: RunEndInfo): Promise<void>;
  showPrivacyOptions(): Promise<void>;
}

/** Web'de: ödüllü reklam yok, SECOND CHANCE butonu hiç görünmez. */
class NoopAdService implements AdService {
  readonly name = 'noop' as const;
  async init(): Promise<void> {}
  canOfferRewarded(): boolean {
    return false;
  }
  async showRewarded(): Promise<boolean> {
    return false;
  }
  noteRunFinished(): void {}
  async maybeShowInterstitial(): Promise<void> {}
  async showPrivacyOptions(): Promise<void> {}
}

const SHOW_TIMEOUT_MS = 60_000;

class AdMobService implements AdService {
  readonly name = 'admob' as const;
  private ready = false;
  private rewardedLoaded = false;
  private interstitialLoaded = false;
  private sessionRuns = 0;

  async init(): Promise<void> {
    try {
      // 1) onay bilgisi → 2) gerekirse form → 3) izinliyse SDK başlat → 4) reklamları önceden yükle
      const info = await AdMob.requestConsentInfo();
      let canRequest = info.canRequestAds;
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        const after = await AdMob.showConsentForm();
        canRequest = after.canRequestAds;
      }
      if (!canRequest) return;
      await AdMob.initialize();
      this.ready = true;
      void this.loadRewarded();
      void this.loadInterstitial();
    } catch {
      this.ready = false; // sessizce Noop gibi davran
    }
  }

  private async loadRewarded(): Promise<void> {
    this.rewardedLoaded = false;
    try {
      await AdMob.prepareRewardVideoAd({ adId: AD_IDS.rewarded, isTesting: ADS_TEST_MODE });
      this.rewardedLoaded = true;
    } catch {
      this.rewardedLoaded = false;
    }
  }

  private async loadInterstitial(): Promise<void> {
    this.interstitialLoaded = false;
    try {
      await AdMob.prepareInterstitial({ adId: AD_IDS.interstitial, isTesting: ADS_TEST_MODE });
      this.interstitialLoaded = true;
    } catch {
      this.interstitialLoaded = false;
    }
  }

  canOfferRewarded(): boolean {
    return this.ready && this.rewardedLoaded;
  }

  async showRewarded(): Promise<boolean> {
    if (!this.canOfferRewarded()) return false;
    let earned = false;
    const handles: { remove(): Promise<void> }[] = [];
    try {
      return await new Promise<boolean>((resolve) => {
        const finish = (v: boolean): void => resolve(v);
        const timer = setTimeout(() => finish(earned), SHOW_TIMEOUT_MS);
        const done = (v: boolean): void => {
          clearTimeout(timer);
          finish(v);
        };
        void (async () => {
          handles.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => (earned = true)));
          handles.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => done(earned)));
          handles.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => done(false)));
          try {
            await AdMob.showRewardVideoAd();
          } catch {
            done(earned);
          }
        })();
      });
    } finally {
      for (const h of handles) void h.remove();
      void this.loadRewarded();
    }
  }

  noteRunFinished(): void {
    this.sessionRuns++;
    const s = getItem('ss.ads');
    setItem('ss.ads', { ...s, runsSinceInterstitial: s.runsSinceInterstitial + 1 });
  }

  async maybeShowInterstitial(info: RunEndInfo): Promise<void> {
    if (!this.ready || !this.interstitialLoaded) return;
    const s = getItem('ss.ads');
    const gap = s.lastInterstitialAt > 0 ? (Date.now() - s.lastInterstitialAt) / 1000 : Infinity;
    const show = shouldShowInterstitial({
      sessionRuns: this.sessionRuns,
      runsSinceInterstitial: s.runsSinceInterstitial,
      secondsSinceInterstitial: gap,
      lastRunSec: info.lastRunSec,
      rewardedWatched: info.rewardedWatched,
    });
    if (!show) return;
    const handles: { remove(): Promise<void> }[] = [];
    try {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, SHOW_TIMEOUT_MS);
        const end = (): void => {
          clearTimeout(timer);
          resolve();
        };
        void (async () => {
          handles.push(await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, end));
          handles.push(await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, end));
          try {
            await AdMob.showInterstitial();
            setItem('ss.ads', { lastInterstitialAt: Date.now(), runsSinceInterstitial: 0 });
          } catch {
            end();
          }
        })();
      });
    } finally {
      for (const h of handles) void h.remove();
      void this.loadInterstitial();
    }
  }

  async showPrivacyOptions(): Promise<void> {
    try {
      await AdMob.showPrivacyOptionsForm();
    } catch {
      /* yoksay */
    }
  }
}

export const ads: AdService = Capacitor.isNativePlatform() ? new AdMobService() : new NoopAdService();
