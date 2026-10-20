import { useCallback, useEffect, useState } from 'react';
import { parseSavedQuestions, toggleSavedQuestion as writeToggle } from '../utils/savedQuestions';

type SavedQuestions = Record<string, boolean>;
const UPDATE_EVENT = 'toeic-saved-questions-updated';

const readSavedQuestions = (key: string): SavedQuestions => {
  try {
    return parseSavedQuestions(localStorage.getItem(key));
  } catch {
    return Object.create(null);
  }
};

/** Bookmarks belong to the learner and question, independently of attempts. */
export const useSavedQuestions = (userId: string | undefined, source: 'toeic' | 'grammar') => {
  const key = `toeic_saved_questions:v1:${encodeURIComponent(userId || 'guest')}:${source}`;
  const [state, setState] = useState(() => ({ key, values: readSavedQuestions(key) }));

  useEffect(() => {
    const refresh = () => setState({ key, values: readSavedQuestions(key) });
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) refresh();
    };
    const onUpdate = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) refresh();
    };
    refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener(UPDATE_EVENT, onUpdate);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(UPDATE_EVENT, onUpdate);
    };
  }, [key]);

  const toggleSavedQuestion = useCallback((questionId: string) => {
    if (!questionId) return;
    // Do not report success if storage is unavailable or full.
    const values = writeToggle(localStorage, key, questionId);
    setState({ key, values });
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: key }));
  }, [key]);

  return {
    savedQuestions: state.key === key ? state.values : readSavedQuestions(key),
    toggleSavedQuestion,
  };
};
