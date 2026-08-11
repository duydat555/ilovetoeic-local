const PRACTICE_SESSION_PREFIX = 'toeic-practice:';

const readPracticeSessionKeys = () => {
  try {
    return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => Boolean(key));
  } catch {
    return [];
  }
};

const matchingPracticeSessionKeys = (matches: (key: string) => boolean) => (
  readPracticeSessionKeys().filter((key) => (
    key.startsWith(PRACTICE_SESSION_PREFIX) && matches(key)
  ))
);

const deleteMatchingPracticeSessions = (matches: (key: string) => boolean) => {
  const keys = matchingPracticeSessionKeys(matches);
  try {
    keys.forEach((key) => localStorage.removeItem(key));
    return keys.length;
  } catch {
    // Database history can still be deleted when browser storage is unavailable.
    return 0;
  }
};

const testSessionMatcher = (testId: string) => {
  const encodedId = String(testId);
  return (key: string) => (
    key.startsWith(`${PRACTICE_SESSION_PREFIX}${encodedId}:`)
    || key.startsWith(`${PRACTICE_SESSION_PREFIX}test-${encodedId}:`)
    || key.startsWith(`${PRACTICE_SESSION_PREFIX}wrong-test-${encodedId}:`)
  );
};

const levelSessionMatcher = (part: number, level: number) => {
  const normalSessionKey = `${PRACTICE_SESSION_PREFIX}level-${level}:${part}`;
  const retrySessionPrefix = `${PRACTICE_SESSION_PREFIX}wrong-level-${part}-${level}:`;
  return (key: string) => key === normalSessionKey || key.startsWith(retrySessionPrefix);
};

export const deleteTestPracticeSessions = (testId: string) => {
  return deleteMatchingPracticeSessions(testSessionMatcher(testId));
};

export const deleteLevelPracticeSessions = (part: number, level: number) => {
  return deleteMatchingPracticeSessions(levelSessionMatcher(part, level));
};

export const countTestPracticeSessions = (testId: string) => (
  matchingPracticeSessionKeys(testSessionMatcher(testId)).length
);

export const countLevelPracticeSessions = (part: number, level: number) => (
  matchingPracticeSessionKeys(levelSessionMatcher(part, level)).length
);
