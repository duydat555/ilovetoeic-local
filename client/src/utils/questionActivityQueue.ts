import { backendService } from '../services/backend';

export type QuestionActivitySource = 'test' | 'level' | 'grammar';

export interface QuestionActivityContext {
  userId: string;
  attemptId: string;
  sourceType: QuestionActivitySource;
  testId?: string;
  level?: number;
}

interface QueuedAnswer {
  selectedAnswer: string;
  answeredAt: string;
}

interface QuestionActivityQueueRecord extends QuestionActivityContext {
  answers: Record<string, QueuedAnswer>;
}

const STORAGE_PREFIX = 'toeic-question-activity-queue:';
const MAX_BATCH_SIZE = 20;
const activeFlushes = new Map<string, Promise<boolean>>();

const storageKey = (context: QuestionActivityContext) => (
  `${STORAGE_PREFIX}${context.userId}:${context.attemptId}:${context.sourceType}`
);

const readRecord = (key: string): QuestionActivityQueueRecord | null => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value) as QuestionActivityQueueRecord;
    return parsed?.userId && parsed?.attemptId && parsed?.sourceType && parsed?.answers
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const writeRecord = (key: string, record: QuestionActivityQueueRecord) => {
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // The current page remains usable if persistent browser storage is blocked.
  }
};

export const enqueueQuestionActivity = (
  context: QuestionActivityContext,
  questionId: string,
  selectedAnswer: string,
) => {
  const key = storageKey(context);
  const record = readRecord(key) || { ...context, answers: {} };
  record.answers[questionId] = {
    selectedAnswer,
    answeredAt: new Date().toISOString(),
  };
  writeRecord(key, record);
};

const removeSyncedAnswers = (
  key: string,
  sentAnswers: Array<[string, QueuedAnswer]>,
) => {
  const latest = readRecord(key);
  if (!latest) return;
  sentAnswers.forEach(([questionId, sent]) => {
    const current = latest.answers[questionId];
    if (
      current?.selectedAnswer === sent.selectedAnswer
      && current.answeredAt === sent.answeredAt
    ) {
      delete latest.answers[questionId];
    }
  });
  if (Object.keys(latest.answers).length === 0) {
    try {
      localStorage.removeItem(key);
    } catch {
      // A later visit can safely retry the idempotent upsert.
    }
  } else {
    writeRecord(key, latest);
  }
};

const flushRecord = (key: string, keepalive: boolean): Promise<boolean> => {
  const running = activeFlushes.get(key);
  if (running) return running;

  const operation = (async () => {
    const record = readRecord(key);
    if (!record) return true;
    const entries = Object.entries(record.answers);
    let allSaved = true;
    for (let offset = 0; offset < entries.length; offset += MAX_BATCH_SIZE) {
      const batch = entries.slice(offset, offset + MAX_BATCH_SIZE);
      const saved = await backendService.saveQuestionActivity({
        attemptId: record.attemptId,
        sourceType: record.sourceType,
        testId: record.testId,
        level: record.level,
        answers: batch.map(([questionId, answer]) => ({ questionId, ...answer })),
        answeredAt: batch[batch.length - 1][1].answeredAt,
      }, { keepalive });
      if (!saved) {
        allSaved = false;
        break;
      }
      removeSyncedAnswers(key, batch);
    }
    return allSaved;
  })().finally(() => activeFlushes.delete(key));

  activeFlushes.set(key, operation);
  return operation;
};

export const flushPendingQuestionActivity = async (
  userId: string,
  keepalive = false,
) => {
  const prefix = `${STORAGE_PREFIX}${userId}:`;
  const keys: string[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
  } catch {
    return false;
  }
  const results = await Promise.all(keys.map((key) => flushRecord(key, keepalive)));
  return results.every(Boolean);
};
