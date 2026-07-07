import { useEffect, useRef } from 'react';
import { adConfig, hasBannerSlot, isAdsConfigured } from './adConfig';
import { loadAdSenseScript, pushAd } from './adsense';

export const AdBanner = ({ className = '' }) => {
  const adRef = useRef(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!isAdsConfigured() || !hasBannerSlot()) return undefined;

    let cancelled = false;

    const mountAd = async () => {
      const loaded = await loadAdSenseScript(adConfig.clientId);
      if (!loaded || cancelled || !adRef.current || pushedRef.current) return;

      pushedRef.current = true;
      pushAd(adRef.current);
    };

    mountAd();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdsConfigured() || !hasBannerSlot()) {
    return null;
  }

  return (
    <div className={`ad-banner-wrap ${className}`.trim()}>
      <div className="ad-banner-label">Advertisement</div>
      <ins
        ref={adRef}
        className="adsbygoogle ad-banner-slot"
        style={{ display: 'block' }}
        data-ad-client={adConfig.clientId}
        data-ad-slot={adConfig.bannerSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        {...(adConfig.testMode ? { 'data-adtest': 'on' } : {})}
      />
    </div>
  );
};
