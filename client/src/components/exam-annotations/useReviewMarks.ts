import { useEffect, useMemo, useReducer, useState } from 'react';
import { authFetch } from '../../services/backend';
import { annotationReviewOverrides, subscribeAnnotationReviews } from './syncRegistry';
import { loadReviewStatus } from './reviewStatus';
import type { ReviewStatus } from './reviewStatus';

interface ReviewGroup { questions: { id: string }[] }
export function useReviewMarks(userId: string | undefined, scope: string, groups: ReviewGroup[], open: boolean) {
  const enabled = import.meta.env.VITE_EXAM_ANNOTATIONS_V2 === 'true' && !!userId;
  const identities = useMemo(() => groups.map(g => g.questions.map(q => q.id).join(':')), [groups]);
  const key = JSON.stringify([userId, scope, identities]);
  const [remote, setRemote] = useState<{ key: string; marks: Record<string, { review: boolean; revision: number }> }>({ key: '', marks: {} });
  const [status, setStatus] = useState({ key: '', loading: false, error: '' });
  const [attempt, retry] = useReducer(n => n + 1, 0);
  const [localVersion, refresh] = useReducer(n => n + 1, 0);
  useEffect(() => subscribeAnnotationReviews(refresh), []);
  useEffect(() => {
    if (!enabled) return;
    const prefix = `ilovetoeic.annotations.v1:${encodeURIComponent(userId!)}:${encodeURIComponent(scope)}:`;
    const changed = (event: StorageEvent) => { if (event.key === null || event.key.startsWith(prefix)) refresh(); };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [enabled, userId, scope]);
  useEffect(() => {
    if (!enabled || !open || !identities.length) return;
    let alive = true;
    const controller = new AbortController();
    setStatus({ key, loading: true, error: '' });
    loadReviewStatus(identities, batch => authFetch<{ groups: ReviewStatus[] }>('/exam-annotations/review-status', {
      method: 'POST', cache: 'no-store', signal: controller.signal,
      body: JSON.stringify({ userId, scope, groups: batch }),
    })).then(records => {
      if (alive) { setRemote({ key, marks: Object.fromEntries(records.map(g => [g.group, { review: g.review, revision: g.revision }])) }); setStatus({ key, loading: false, error: '' }); }
    }).catch(error => { if (alive) setStatus({ key, loading: false,
      error: `Chưa tải được đầy đủ dấu xem lại. Các dấu trên thiết bị vẫn được giữ.${error instanceof Error ? ` ${error.message}` : ''}` }); });
    return () => { alive = false; controller.abort(); };
  }, [enabled, open, key, attempt]);
  const local = useMemo(() => enabled && open ? annotationReviewOverrides(userId!, scope, identities) : new Map(), [enabled, open, key, localVersion]);
  const reviewedQuestionIds = new Set<string>();
  groups.forEach((group, i) => {
    const cached = local.get(identities[i]);
    const persisted = remote.key === key ? remote.marks[identities[i]] : undefined;
    const marked = cached && (cached.dirty || !persisted || cached.revision >= persisted.revision) ? cached.review : persisted?.review;
    if (marked) group.questions.forEach(q => reviewedQuestionIds.add(q.id));
  });
  return { reviewedQuestionIds: enabled ? reviewedQuestionIds : undefined,
    loading: status.key === key && status.loading, error: status.key === key ? status.error : '', retry };
}
