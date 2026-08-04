export const ALL_TEST_PARTS = [1, 2, 3, 4, 5, 6, 7] as const;
export const LISTENING_TEST_PARTS = [1, 2, 3, 4] as const;
export const READING_TEST_PARTS = [5, 6, 7] as const;

const PART_DURATIONS_SECONDS: Record<number, number> = {
  1: 5 * 60,
  2: 10 * 60,
  3: 17 * 60,
  4: 13 * 60,
  5: 20 * 60,
  6: 10 * 60,
  7: 45 * 60,
};

const VALID_PARTS = new Set<number>(ALL_TEST_PARTS);

export const normalizeTestParts = (parts: readonly number[]) => (
  [...new Set(parts)]
    .filter((part) => VALID_PARTS.has(part))
    .sort((a, b) => a - b)
);

export const parseTestPartScope = (value?: string | null): number[] => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === 'all') return [...ALL_TEST_PARTS];
  if (normalized === 'listening') return [...LISTENING_TEST_PARTS];
  if (normalized === 'reading') return [...READING_TEST_PARTS];

  const parts = normalizeTestParts(
    normalized.split(',').map((part) => Number.parseInt(part.trim(), 10)),
  );
  return parts.length > 0 ? parts : [...ALL_TEST_PARTS];
};

export const serializeTestPartScope = (parts: readonly number[]) => {
  const normalized = normalizeTestParts(parts);
  return normalized.length === ALL_TEST_PARTS.length ? 'all' : normalized.join(',');
};

const matchesGroup = (parts: readonly number[], group: readonly number[]) => (
  parts.length === group.length && group.every((part) => parts.includes(part))
);

export const getTestPartScopeLabel = (parts: readonly number[]) => {
  const normalized = normalizeTestParts(parts);
  if (matchesGroup(normalized, ALL_TEST_PARTS)) return 'Toàn bộ 7 Part';
  if (matchesGroup(normalized, LISTENING_TEST_PARTS)) return 'Toàn bộ Listening';
  if (matchesGroup(normalized, READING_TEST_PARTS)) return 'Toàn bộ Reading';
  return normalized.map((part) => `Part ${part}`).join(' + ');
};

export const getExamDurationSeconds = (parts: readonly number[]) => (
  normalizeTestParts(parts).reduce(
    (total, part) => total + (PART_DURATIONS_SECONDS[part] || 0),
    0,
  )
);
