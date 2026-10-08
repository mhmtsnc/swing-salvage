// Gerçek kimlikler yayından önce kullanıcı tarafından doldurulur.
export const ADS_TEST_MODE = true;

const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

// DOLDUR (yayından önce): gerçek AdMob kimlikleri
const REAL_APP_ID = '';
const REAL_REWARDED_ID = '';
const REAL_INTERSTITIAL_ID = '';

export const AD_IDS = {
  appId: ADS_TEST_MODE ? TEST_APP_ID : REAL_APP_ID,
  rewarded: ADS_TEST_MODE ? TEST_REWARDED_ID : REAL_REWARDED_ID,
  interstitial: ADS_TEST_MODE ? TEST_INTERSTITIAL_ID : REAL_INTERSTITIAL_ID,
} as const;
