// Web ads use Google AdSense (same publisher account as AdMob).
// Publisher ID format: ca-pub-XXXXXXXXXXXXXXXX

const normalizePublisherId = (id) => {
  if (!id) return '';
  if (id.startsWith('ca-pub-')) return id;
  if (id.startsWith('pub-')) return `ca-${id}`;
  return id;
};

export const adConfig = {
  enabled: import.meta.env.VITE_ADS_ENABLED === 'true',
  clientId: normalizePublisherId(import.meta.env.VITE_ADSENSE_CLIENT_ID || ''),
  bannerSlot: import.meta.env.VITE_ADSENSE_BANNER_SLOT || '',
  interstitialSlot: import.meta.env.VITE_ADSENSE_INTERSTITIAL_SLOT || '',
  testMode: import.meta.env.DEV || import.meta.env.VITE_ADS_TEST_MODE === 'true',
};

export const isAdsConfigured = () =>
  adConfig.enabled && adConfig.clientId.startsWith('ca-pub-');

export const hasBannerSlot = () => Boolean(adConfig.bannerSlot);
export const hasInterstitialSlot = () => Boolean(adConfig.interstitialSlot);

export const INTERSTITIAL_FREQUENCY = 3;
