/**
 * Dual US/UK Pronunciation Engine for TOEIC Vocabulary Learning
 * Supports Web Speech API with specific accent voices, dictionary audio fallbacks,
 * and customizable playback rate.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const updateVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  updateVoices();
  window.speechSynthesis.onvoiceschanged = updateVoices;
}

export type Accent = 'US' | 'UK';

export interface AudioSettings {
  playbackRate: number; // 0.75 - 1.25
  autoPlay: boolean;
}

const SETTINGS_KEY = 'toeic_vocab_audio_settings';

export const getStoredAudioSettings = (): AudioSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { playbackRate: 0.9, autoPlay: true };
};

export const saveAudioSettings = (settings: Partial<AudioSettings>) => {
  try {
    const current = getStoredAudioSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
  } catch {
    // ignore
  }
};

/**
 * Pronounce word using Web Speech API or fallback audio URL
 */
export const playPronunciation = (
  word: string,
  accent: Accent = 'US',
  customRate?: number,
  fallbackAudioUrl?: string
): Promise<void> => {
  return new Promise((resolve) => {
    const cleanWord = (word || '').trim();
    if (!cleanWord) {
      resolve();
      return;
    }

    // Check if custom audio URL is provided and accessible
    if (fallbackAudioUrl && fallbackAudioUrl.startsWith('http')) {
      try {
        const audio = new Audio(fallbackAudioUrl);
        audio.playbackRate = customRate || getStoredAudioSettings().playbackRate;
        audio.onended = () => resolve();
        audio.onerror = () => {
          // Fallback to speech synthesis if audio link fails
          speakWithWebSpeech(cleanWord, accent, customRate).then(resolve);
        };
        audio.play().catch(() => {
          speakWithWebSpeech(cleanWord, accent, customRate).then(resolve);
        });
        return;
      } catch {
        // Continue to Web Speech API
      }
    }

    speakWithWebSpeech(cleanWord, accent, customRate).then(resolve);
  });
};

const speakWithWebSpeech = (
  text: string,
  accent: Accent = 'US',
  customRate?: number
): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const settings = getStoredAudioSettings();
      utterance.rate = customRate || settings.playbackRate;

      if (cachedVoices.length === 0) {
        cachedVoices = window.speechSynthesis.getVoices();
      }

      if (accent === 'UK') {
        utterance.lang = 'en-GB';
        const ukVoice =
          cachedVoices.find((v) => v.lang === 'en-GB' || v.lang === 'en_GB') ||
          cachedVoices.find((v) => v.name.includes('United Kingdom') || v.name.includes('British')) ||
          cachedVoices.find((v) => v.lang.startsWith('en'));
        if (ukVoice) utterance.voice = ukVoice;
      } else {
        utterance.lang = 'en-US';
        const usVoice =
          cachedVoices.find((v) => v.lang === 'en-US' || v.lang === 'en_US') ||
          cachedVoices.find((v) => v.name.includes('United States') || v.name.includes('Natural')) ||
          cachedVoices.find((v) => v.lang.startsWith('en'));
        if (usVoice) utterance.voice = usVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
};
