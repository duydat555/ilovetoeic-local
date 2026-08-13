import { useCallback, useEffect, useRef } from 'react';
import {
  enqueueQuestionActivity,
  flushPendingQuestionActivity,
  QuestionActivityContext,
} from '../utils/questionActivityQueue';

const IDLE_FLUSH_DELAY_MS = 12_000;
const PERIODIC_FLUSH_DELAY_MS = 60_000;

export const useQuestionActivityBatch = (context: QuestionActivityContext | null) => {
  const contextRef = useRef(context);
  const idleTimerRef = useRef<number>();
  contextRef.current = context;

  const flush = useCallback((keepalive = false) => {
    const current = contextRef.current;
    return current ? flushPendingQuestionActivity(current.userId, keepalive) : Promise.resolve(true);
  }, []);

  const enqueue = useCallback((questionId: string, selectedAnswer: string) => {
    const current = contextRef.current;
    if (!current) return;
    enqueueQuestionActivity(current, questionId, selectedAnswer);
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => void flush(), IDLE_FLUSH_DELAY_MS);
  }, [flush]);

  useEffect(() => {
    if (!context) return undefined;
    void flush();
    const periodicTimer = window.setInterval(() => void flush(), PERIODIC_FLUSH_DELAY_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void flush(true);
    };
    const handlePageHide = () => { void flush(true); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.clearTimeout(idleTimerRef.current);
      window.clearInterval(periodicTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      void flush(true);
    };
  }, [context?.userId, flush]);

  return { enqueue, flush };
};
