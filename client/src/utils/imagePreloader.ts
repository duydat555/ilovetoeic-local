/**
 * Smart Network-Aware Image Preloader
 * Caching and background prefetching for TOEIC question images.
 */

const preloadedUrls = new Set<string>();

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
};

/**
 * Detect network quality to determine how many upcoming images to prefetch
 */
export const getPrefetchCountForConnection = (): number => {
  if (typeof navigator === 'undefined') return 2;

  const connection = (navigator as unknown as { connection?: NetworkInformation }).connection;
  if (!connection) return 3; // Default (Fast/WiFi)

  if (connection.saveData) return 1; // User enabled Data Saver

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 1;
    case '3g':
      return 2;
    case '4g':
    default:
      return 3;
  }
};

/**
 * Prefetches a single image URL into the browser cache
 */
export const prefetchImage = (url?: string | null): Promise<void> => {
  if (!url || typeof window === 'undefined') return Promise.resolve();

  const trimmed = url.trim();
  if (!trimmed || preloadedUrls.has(trimmed)) {
    return Promise.resolve();
  }

  preloadedUrls.add(trimmed);

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve();
    img.onerror = () => {
      // Allow retry later if it failed
      preloadedUrls.delete(trimmed);
      resolve();
    };
    img.src = trimmed;
  });
};

/**
 * Prefetches multiple image URLs in the background using idle time
 */
export const prefetchImagesIdle = (urls: (string | undefined | null)[]): void => {
  if (typeof window === 'undefined') return;

  const validUrls = urls.filter((u): u is string => Boolean(u && u.trim()));
  if (validUrls.length === 0) return;

  const runPrefetch = () => {
    validUrls.forEach((url) => {
      void prefetchImage(url);
    });
  };

  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(runPrefetch, { timeout: 1500 });
  } else {
    setTimeout(runPrefetch, 200);
  }
};
