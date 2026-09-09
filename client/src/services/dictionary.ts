import { DictionaryDetailResult, DictionaryDetailSection, WordTranslation } from '../types';
import { aiPreferenceService } from './aiPreference';
import { apiService } from './api';
import { chromeAiService } from './chromeAi';

const MAX_CLIENT_CACHE_ENTRIES = 500;
const translationClientCache = new Map<string, WordTranslation>();
const detailClientCache = new Map<string, DictionaryDetailResult>();
const passageCache = new Map<string, Record<string, WordTranslation>>();
const pendingPassagePrewarms = new Map<string, Promise<void>>();

const setCacheEntry = <T>(cache: Map<string, T>, key: string, value: T) => {
  if (cache.size >= MAX_CLIENT_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, value);
};

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

  async prewarmPassage(passageId: string): Promise<void> {
    const cleanId = passageId.trim();
    if (!cleanId || passageCache.has(cleanId)) return;
    if (pendingPassagePrewarms.has(cleanId)) {
      return pendingPassagePrewarms.get(cleanId);
    }
    const promise = (async () => {
      try {
        const words = await apiService.getPassageVocabulary(cleanId);
        passageCache.set(cleanId, words);
        // Pre-fill client cache with all words in passage for instant 0ms access
        Object.entries(words).forEach(([key, value]) => {
          if (!translationClientCache.has(key)) {
            setCacheEntry(translationClientCache, key, value);
          }
        });
      } catch (error) {
        console.warn(`[AI Dictionary] Failed to prewarm passage ${cleanId}:`, error);
      } finally {
        pendingPassagePrewarms.delete(cleanId);
      }
    })();
    pendingPassagePrewarms.set(cleanId, promise);
    return promise;
  },

  async translateWord(word: string, context = '', signal?: AbortSignal): Promise<WordTranslation> {
    const cacheKey = word.trim().toLowerCase();
    if (cacheKey && translationClientCache.has(cacheKey)) {
      return translationClientCache.get(cacheKey)!;
    }

    let result: WordTranslation;
    if (await canTryLocal()) {
      try {
        result = await chromeAiService.translateWord(word, context, signal);
        if (cacheKey) setCacheEntry(translationClientCache, cacheKey, result);
        return result;
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) throw error;
        console.warn('[AI Dictionary] AI Local failed, falling back to Gemini API:', error);
      }
    }
    result = await apiService.translateWord(word, context, signal);
    if (cacheKey) setCacheEntry(translationClientCache, cacheKey, result);
    return result;
  },

  async getDetail(
    word: string,
    section: DictionaryDetailSection,
    context = '',
    signal?: AbortSignal,
  ): Promise<DictionaryDetailResult> {
    const cacheKey = `${word.trim().toLowerCase()}::${section}`;
    if (cacheKey && detailClientCache.has(cacheKey)) {
      return detailClientCache.get(cacheKey)!;
    }

    let result: DictionaryDetailResult;
    if (await canTryLocal()) {
      try {
        result = await chromeAiService.getDetail(word, section, context, signal);
        if (cacheKey) setCacheEntry(detailClientCache, cacheKey, result);
        return result;
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) throw error;
        console.warn(`[AI Dictionary] AI Local failed for ${section}, falling back to Gemini API:`, error);
      }
    }
    result = await apiService.translateWordDetail(word, section, context, signal);
    if (cacheKey) setCacheEntry(detailClientCache, cacheKey, result);
    return result;
  },

  clearClientCache() {
    translationClientCache.clear();
    detailClientCache.clear();
    passageCache.clear();
    pendingPassagePrewarms.clear();
  },
};
