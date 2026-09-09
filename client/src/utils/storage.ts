import { TestResultData } from '../types';

const KEYS = {
  EXAM_DRAFT: 'toeic_exam_draft_',
  EXAM_HISTORY: 'toeic_exam_history',
  USER_PROGRESS: 'toeic_user_progress',
  BOOKMARKED_WORDS: 'toeic_bookmarked_words',
  STUDY_STREAK: 'toeic_study_streak_',
};

export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const daysBetween = (from: string, to: string) => {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  const fromDate = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toDate = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((toDate - fromDate) / 86_400_000);
};

const saveStudyStreak = (userId: string, streak: StudyStreak) => {
  try {
    localStorage.setItem(`${KEYS.STUDY_STREAK}${userId}`, JSON.stringify(streak));
  } catch (e) {
    console.warn('[!] Failed to save study streak', e);
  }
};

const expireMissedStreak = (streak: StudyStreak): StudyStreak => {
  if (!streak.lastStudyDate || daysBetween(streak.lastStudyDate, getLocalDateKey()) <= 1) {
    return streak;
  }
  return {
    currentStreak: 0,
    longestStreak: Math.max(streak.longestStreak || 0, streak.currentStreak || 0),
    lastStudyDate: streak.lastStudyDate,
  };
};

export const storage = {
  // Save active exam draft to Local Storage
  saveExamDraft(testId: string, answers: Record<string, string>, timeSpentSeconds: number) {
    try {
      const payload = {
        testId,
        answers,
        timeSpentSeconds,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`${KEYS.EXAM_DRAFT}${testId}`, JSON.stringify(payload));
    } catch (e) {
      console.warn('[!] Failed to save exam draft to Local Storage', e);
    }
  },

  // Get saved exam draft from Local Storage
  getExamDraft(testId: string): { answers: Record<string, string>; timeSpentSeconds: number } | null {
    try {
      const data = localStorage.getItem(`${KEYS.EXAM_DRAFT}${testId}`);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('[!] Failed to get exam draft from Local Storage', e);
    }
    return null;
  },

  // Clear exam draft after submitting
  clearExamDraft(testId: string) {
    try {
      localStorage.removeItem(`${KEYS.EXAM_DRAFT}${testId}`);
    } catch (e) {
      console.warn('[!] Failed to clear exam draft', e);
    }
  },

  // Save completed test result history
  saveTestResult(result: TestResultData) {
    try {
      const history = this.getTestHistory();
      history.unshift(result);
      localStorage.setItem(KEYS.EXAM_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn('[!] Failed to save test history', e);
    }
  },

  // Get test result history
  getTestHistory(): TestResultData[] {
    try {
      const data = localStorage.getItem(KEYS.EXAM_HISTORY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('[!] Failed to get test history', e);
    }
    return [];
  },

  deleteTestHistory(testId: string) {
    try {
      const history = this.getTestHistory();
      const remaining = history.filter((result) => String(result.testId) !== String(testId));
      localStorage.setItem(KEYS.EXAM_HISTORY, JSON.stringify(remaining));
      return history.length - remaining.length;
    } catch (e) {
      console.warn('[!] Failed to delete test history', e);
      return 0;
    }
  },

  deleteSingleAttempt(attemptId: string) {
    try {
      const history = this.getTestHistory();
      const remaining = history.filter((result) => result.attemptId !== attemptId);
      localStorage.setItem(KEYS.EXAM_HISTORY, JSON.stringify(remaining));
      return history.length - remaining.length;
    } catch (e) {
      console.warn('[!] Failed to delete single attempt', e);
      return 0;
    }
  },

  clearAllTestHistory() {
    try {
      localStorage.removeItem(KEYS.EXAM_HISTORY);
    } catch (e) {
      console.warn('[!] Failed to clear all test history', e);
    }
  },

  getStudyStreak(
    userId: string,
    fallbackStreak = 0,
    fallbackLastStudyDate: string | null = null,
    fallbackLongestStreak = fallbackStreak
  ): StudyStreak {
    try {
      const data = localStorage.getItem(`${KEYS.STUDY_STREAK}${userId}`);
      if (data) {
        const parsed = JSON.parse(data) as StudyStreak;
        const activeStreak = expireMissedStreak(parsed);
        if (activeStreak.currentStreak !== parsed.currentStreak) {
          saveStudyStreak(userId, activeStreak);
        }
        return activeStreak;
      }
    } catch (e) {
      console.warn('[!] Failed to get study streak', e);
    }
    const fallback: StudyStreak = {
      currentStreak: fallbackStreak,
      longestStreak: Math.max(fallbackLongestStreak, fallbackStreak),
      lastStudyDate: fallbackLastStudyDate,
    };
    const activeFallback = expireMissedStreak(fallback);
    saveStudyStreak(userId, activeFallback);
    return activeFallback;
  },

  syncStudyStreak(
    userId: string,
    serverStreak: number,
    serverLastStudyDate: string | null = null,
    serverLongestStreak = serverStreak,
  ): StudyStreak {
    const local = this.getStudyStreak(
      userId,
      serverStreak,
      serverLastStudyDate,
      serverLongestStreak,
    );
    const server = expireMissedStreak({
      currentStreak: Math.max(0, serverStreak),
      longestStreak: Math.max(serverLongestStreak, serverStreak),
      lastStudyDate: serverLastStudyDate,
    });

    // Keep a newer optimistic local activity if the API request has not reached the server yet.
    // For the same date, the server is authoritative and corrects stale or duplicated local values.
    const localDate = local.lastStudyDate || '';
    const serverDate = server.lastStudyDate || '';
    const preferred = localDate > serverDate ? local : server;
    const synced = {
      ...preferred,
      longestStreak: Math.max(local.longestStreak, server.longestStreak),
    };
    saveStudyStreak(userId, synced);
    return synced;
  },

  recordStudyActivity(userId: string): StudyStreak {
    const current = this.getStudyStreak(userId);
    const today = getLocalDateKey();

    if (current.lastStudyDate === today) {
      return current;
    }

    const continuedFromYesterday =
      current.lastStudyDate !== null && daysBetween(current.lastStudyDate, today) === 1;
    const currentStreak = continuedFromYesterday ? current.currentStreak + 1 : 1;
    const next: StudyStreak = {
      currentStreak,
      longestStreak: Math.max(current.longestStreak, currentStreak),
      lastStudyDate: today,
    };

    saveStudyStreak(userId, next);
    return next;
  }
};
