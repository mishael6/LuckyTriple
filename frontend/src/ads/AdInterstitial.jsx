import { useEffect, useRef, useState } from 'react';
import { adConfig, hasInterstitialSlot, isAdsConfigured } from './adConfig';
import { loadAdSenseScript, pushAd } from './adsense';

export const AdInterstitial = ({ open, onClose }) => {
  const adRef = useRef(null);
  const pushedRef = useRef(false);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!open) {
      setCanSkip(false);
      pushedRef.current = false;
      return undefined;
    }

    const timer = window.setTimeout(() => setCanSkip(true), 3000);

    if (!isAdsConfigured() || !hasInterstitialSlot()) {
      onClose();
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;

    const mountAd = async () => {
      const loaded = await loadAdSenseScript(adConfig.clientId);
      if (!loaded || cancelled || !adRef.current || pushedRef.current) {
        if (!cancelled) onClose();
        return;
      }

      pushedRef.current = true;
      pushAd(adRef.current);
    };

    mountAd();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open || !isAdsConfigured() || !hasInterstitialSlot()) {
    return null;
  }

  return (
    <div className="ad-interstitial-overlay" role="dialog" aria-modal="true" aria-label="Advertisement">
      <div className="ad-interstitial-card">
        <div className="ad-interstitial-header">
          <span>Advertisement</span>
          {canSkip && (
            <button type="button" className="ad-interstitial-skip" onClick={onClose}>
              Continue
            </button>
          )}
        </div>
        <ins
          ref={adRef}
          className="adsbygoogle ad-interstitial-slot"
          style={{ display: 'block' }}
          data-ad-client={adConfig.clientId}
          data-ad-slot={adConfig.interstitialSlot}
          data-ad-format="rectangle"
          data-full-width-responsive="true"
          {...(adConfig.testMode ? { 'data-adtest': 'on' } : {})}
        />
      </div>
    </div>
  );
};
