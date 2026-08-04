import { DictionaryDetailSection, WordTranslation } from '../types';
import { aiPreferenceService } from './aiPreference';
import { apiService } from './api';
import { chromeAiService } from './chromeAi';

const canTryLocal = async () => {
  if (aiPreferenceService.get() !== 'local') return false;
  const availability = await chromeAiService.getAvailability();
  return availability === 'available'
    || availability === 'downloadable'
    || availability === 'downloading';
};

const isAbortError = (error: unknown) => (
  error instanceof DOMException && error.name === 'AbortError'
);

export const dictionaryService = {
  async prewarm() {
    if (aiPreferenceService.get() !== 'local') return false;
    return chromeAiService.prewarm();
  },

  async translateWord(word: string, context = '', signal?: AbortSignal): Promise<WordTranslation> {
    if (await canTryLocal()) {
      try {
        return await chromeAiService.translateWord(word, context, signal);
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) throw error;
        console.warn('[AI Dictionary] AI Local failed, falling back to Gemini API:', error);
      }
    }
    return apiService.translateWord(word, context, signal);
  },

  async getDetail(
    word: string,
    section: DictionaryDetailSection,
    context = '',
    signal?: AbortSignal,
  ) {
    if (await canTryLocal()) {
      try {
        return await chromeAiService.getDetail(word, section, context, signal);
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) throw error;
        console.warn(`[AI Dictionary] AI Local failed for ${section}, falling back to Gemini API:`, error);
      }
    }
    return apiService.translateWordDetail(word, section, context, signal);
  },
};
