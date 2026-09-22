import { API_BASE_URL } from '../services/backend';

const getBackendOrigin = () => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
};

const extractGoogleDriveFileId = (url: URL) => {
  if (
    url.hostname === 'drive.google.com'
    || url.hostname === 'drive.usercontent.google.com'
    || url.hostname === 'docs.google.com'
  ) {
    const pathMatch = url.pathname.match(/\/d\/([^/]+)/);
    return pathMatch?.[1] || url.searchParams.get('id');
  }
  return null;
};

export const normalizeMediaUrl = (rawUrl?: string | null): string | undefined => {
  const value = rawUrl?.trim();
  if (!value) return undefined;

  const backendOrigin = getBackendOrigin();

  try {
    const parsed = new URL(value, backendOrigin || undefined);
    const driveFileId = extractGoogleDriveFileId(parsed);
    if (driveFileId) {
      return `${API_BASE_URL}/audio?id=${encodeURIComponent(driveFileId)}`;
    }

    if (parsed.protocol === 'http:' && typeof window !== 'undefined' && window.location.protocol === 'https:') {
      const backendHost = new URL(backendOrigin).hostname;
      if (parsed.hostname === backendHost || parsed.hostname === window.location.hostname) {
        parsed.protocol = 'https:';
        parsed.port = '';
      }
    }

    return parsed.toString();
  } catch {
    return value;
  }
};
