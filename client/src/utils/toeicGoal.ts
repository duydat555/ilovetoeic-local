import { StudyAttempt } from '../types';

export const FULL_TOEIC_QUESTION_COUNT = 200;

/** Only fully answered, non-Part 200-question exams contribute to the goal. */
export const isToeicGoalAttempt = (attempt: StudyAttempt): boolean => (
  attempt.mode === 'exam'
  && attempt.part == null
  && attempt.totalQuestions === FULL_TOEIC_QUESTION_COUNT
  && attempt.answeredQuestions === FULL_TOEIC_QUESTION_COUNT
  && attempt.metadata?.is_partial !== true
);

export const getBestToeicGoalScore = (attempts: StudyAttempt[]): number => (
  attempts
    .filter(isToeicGoalAttempt)
    .reduce((best, attempt) => Math.max(best, Number(attempt.totalScore) || 0), 0)
);
