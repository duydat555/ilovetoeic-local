import { AiSourcePreference } from '../types';

const STORAGE_KEY = 'toeic_ai_source_preference';
export const AI_PREFERENCE_CHANGED_EVENT = 'toeic:ai-preference-changed';

export const aiPreferenceService = {
  get(): AiSourcePreference {
    if (typeof window === 'undefined') return 'local';
    try {
      return localStorage.getItem(STORAGE_KEY) === 'gemini' ? 'gemini' : 'local';
    } catch {
      return 'local';
    }
  },

  set(preference: AiSourcePreference) {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Keep the in-page preference usable even when it cannot be persisted.
    }
    window.dispatchEvent(new CustomEvent(AI_PREFERENCE_CHANGED_EVENT, {
      detail: { preference },
    }));
  },
};
