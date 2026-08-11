import type { Question } from '../types';

export type WrongSourceType = 'test' | 'level';

export interface LocalWrongQuestion {
  questionId: string;
  sourceType: WrongSourceType;
  testId?: string;
  part: number;
  level?: number;
  updatedAt: string;
}

const storageKey = (userId: string) => `toeic-local-wrong-questions:${userId}`;

export const readLocalWrongQuestions = (userId?: string | null): LocalWrongQuestion[] => {
  if (!userId) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalWrongQuestions = (userId: string, items: LocalWrongQuestion[]) => {
  localStorage.setItem(storageKey(userId), JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
};

export const updateLocalWrongQuestions = (
  userId: string,
  sourceType: WrongSourceType,
  context: { testId?: string; level?: number },
  questions: Question[],
  answers: Record<string, string>,
) => {
  const next = readLocalWrongQuestions(userId);
  questions.forEach((question) => {
    const index = next.findIndex((item) => (
      item.questionId === question.id && item.sourceType === sourceType
    ));
    const isWrong = Boolean(answers[question.id]) && answers[question.id] !== question.correctAnswer;
    if (!isWrong) {
      if (index >= 0) next.splice(index, 1);
      return;
    }
    const item: LocalWrongQuestion = {
      questionId: question.id,
      sourceType,
      testId: context.testId,
      part: question.partId,
      level: context.level,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) next[index] = item;
    else next.push(item);
  });
  writeLocalWrongQuestions(userId, next);
};

export const clearSyncedLocalWrongQuestions = (
  userId: string,
  sourceType: WrongSourceType,
  questionIds: string[],
) => {
  const ids = new Set(questionIds);
  const next = readLocalWrongQuestions(userId).filter((item) => (
    item.sourceType !== sourceType || !ids.has(item.questionId)
  ));
  writeLocalWrongQuestions(userId, next);
};

export const deleteLocalWrongQuestions = (
  userId: string,
  sourceType: WrongSourceType,
  filters: { testId?: string; part?: number; level?: number },
) => {
  const current = readLocalWrongQuestions(userId);
  const next = current.filter((item) => !(
    item.sourceType === sourceType
    && (sourceType !== 'test' || item.testId === filters.testId)
    && (sourceType !== 'level' || (item.part === filters.part && item.level === filters.level))
  ));
  const deletedCount = current.length - next.length;
  writeLocalWrongQuestions(userId, next);
  return deletedCount;
};
