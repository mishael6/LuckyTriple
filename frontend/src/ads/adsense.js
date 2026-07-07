let scriptPromise = null;

export const loadAdSenseScript = (clientId) => {
  if (typeof window === 'undefined' || !clientId) {
    return Promise.resolve(false);
  }

  if (window.adsbygoogle) {
    return Promise.resolve(true);
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
};

export const pushAd = (element) => {
  if (!element || typeof window === 'undefined') return;

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (error) {
    console.warn('AdSense push failed:', error);
  }
};
