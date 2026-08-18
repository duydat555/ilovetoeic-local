import { useEffect } from 'react';
import { getPrefetchCountForConnection, prefetchImagesIdle } from '../utils/imagePreloader';

interface ImageGroup {
  imageUrl?: string | null;
}

/**
 * Hook to automatically prefetch images of upcoming (and optionally previous) question groups
 */
export const usePrefetchImages = (
  groups: ImageGroup[],
  currentIndex: number,
): void => {
  useEffect(() => {
    if (!groups || groups.length === 0) return;

    const count = getPrefetchCountForConnection();
    const urlsToPrefetch: string[] = [];

    // Next N groups
    for (let i = 1; i <= count; i++) {
      const nextIdx = currentIndex + i;
      if (nextIdx < groups.length && groups[nextIdx]?.imageUrl) {
        urlsToPrefetch.push(groups[nextIdx].imageUrl as string);
      }
    }

    // Also prefetch previous 1 group if user navigates back
    if (currentIndex > 0 && groups[currentIndex - 1]?.imageUrl) {
      urlsToPrefetch.push(groups[currentIndex - 1].imageUrl as string);
    }

    if (urlsToPrefetch.length > 0) {
      prefetchImagesIdle(urlsToPrefetch);
    }
  }, [groups, currentIndex]);
};
