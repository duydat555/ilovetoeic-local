let fallbackCounter = 0;

const fillFallbackBytes = (bytes: Uint8Array) => {
  fallbackCounter = (fallbackCounter + 1) >>> 0;
  const performanceNow = typeof performance !== 'undefined'
    ? Math.floor(performance.now() * 1000)
    : 0;
  let timestamp = Date.now();
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = timestamp % 256;
    timestamp = Math.floor(timestamp / 256);
  }

  let state = (performanceNow ^ Math.floor(Date.now() / 0x100000000)) >>> 0;
  for (let index = 6; index < 12; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bytes[index] = state & 0xff;
  }

  bytes[12] = (fallbackCounter >>> 24) & 0xff;
  bytes[13] = (fallbackCounter >>> 16) & 0xff;
  bytes[14] = (fallbackCounter >>> 8) & 0xff;
  bytes[15] = fallbackCounter & 0xff;
};

/**
 * Returns an RFC 4122 compatible v4 identifier on both secure and insecure
 * origins. crypto.randomUUID is unavailable on some browsers when the app is
 * opened through a LAN HTTP address, so callers must not use it directly.
 */
export const createClientId = () => {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') {
    try {
      return cryptoApi.randomUUID();
    } catch {
      // Continue with getRandomValues or the time-based compatibility path.
    }
  }

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    fillFallbackBytes(bytes);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
};
