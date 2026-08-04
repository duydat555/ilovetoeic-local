import type { HomeworkAssignment } from '../types/management';

const HOMEWORK_STORAGE_KEY = 'ilovetoeic_homework_assignments_v1';
const RETIRED_MOCK_TEST_IDS = new Set([
  'test_full_1',
  'test_full_2',
  'test_mini_1',
  'test_lis_1',
  'test_read_1',
]);

const isHomeworkAssignment = (value: unknown): value is HomeworkAssignment => {
  if (!value || typeof value !== 'object') return false;
  const assignment = value as Partial<HomeworkAssignment>;
  return (
    typeof assignment.id === 'string' &&
    Array.isArray(assignment.classIds) &&
    typeof assignment.testId === 'string' &&
    (assignment.scope === 'full' || assignment.scope === 'parts') &&
    Array.isArray(assignment.selectedParts) &&
    typeof assignment.deadline === 'string' &&
    typeof assignment.allowLate === 'boolean' &&
    typeof assignment.createdAt === 'string'
  );
};

export const getHomeworkAssignments = (): HomeworkAssignment[] => {
  if (typeof window === 'undefined') return [];

  try {
    const saved = window.localStorage.getItem(HOMEWORK_STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const validAssignments = parsed.filter(isHomeworkAssignment);
    if (validAssignments.length !== parsed.length) return [];

    const activeAssignments = validAssignments.filter(
      (assignment) => !RETIRED_MOCK_TEST_IDS.has(assignment.testId),
    );
    if (activeAssignments.length !== validAssignments.length) {
      window.localStorage.setItem(HOMEWORK_STORAGE_KEY, JSON.stringify(activeAssignments));
    }
    return activeAssignments;
  } catch {
    return [];
  }
};

const persistHomeworkAssignments = (assignments: HomeworkAssignment[]) => {
  try {
    window.localStorage.setItem(HOMEWORK_STORAGE_KEY, JSON.stringify(assignments));
  } catch {
    // The current in-memory screen still works when storage is unavailable.
  }
};

export const upsertHomeworkAssignment = (assignment: HomeworkAssignment) => {
  const current = getHomeworkAssignments();
  const existingIndex = current.findIndex((item) => item.id === assignment.id);
  const next = [...current];

  if (existingIndex >= 0) {
    next[existingIndex] = assignment;
  } else {
    next.unshift(assignment);
  }

  persistHomeworkAssignments(next);
  return next;
};

export const cancelHomeworkAssignment = (assignmentId: string) => {
  const next = getHomeworkAssignments().filter((item) => item.id !== assignmentId);
  persistHomeworkAssignments(next);
  return next;
};
