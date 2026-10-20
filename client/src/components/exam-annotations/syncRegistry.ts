import { authFetch } from '../../services/backend';
import { createClientId } from '../../utils/id';
import { AnnotationSync } from './sync';
import type { RemoteDocument } from './sync';
import type { AnnotationDocument } from './model';
import { readReviewCache } from './reviewCache';

const queues = new Map<string, AnnotationSync>();
const reviewListeners = new Set<() => void>();
export const subscribeAnnotationReviews = (listener: () => void) => { reviewListeners.add(listener); return () => { reviewListeners.delete(listener); }; };
export function annotationReviewOverrides(userId: string, scope: string, groups: string[]) {
  const prefix = `ilovetoeic.annotations.v1:${encodeURIComponent(userId)}:${encodeURIComponent(scope)}:`;
  const values = readReviewCache(userId, scope, groups, { getItem: key => localStorage.getItem(key) });
  queues.forEach((queue, key) => {
    if (key.startsWith(prefix) && (queue.snapshot.dirty || queue.snapshot.status === 'saved')) values.set(decodeURIComponent(key.slice(prefix.length)), { review: queue.snapshot.document.review, revision: queue.revision, dirty: queue.snapshot.dirty });
  });
  return values;
}
let listening = false;
export function getAnnotationSync(key: string, initial: AnnotationDocument, local: boolean) {
  let queue = queues.get(key);
  if (queue) return queue;
  const [userId, scope, group] = key.slice('ilovetoeic.annotations.v1:'.length).split(':').map(decodeURIComponent);
  queue = new AnnotationSync(key, initial, local, localStorage, {
    read: () => authFetch<RemoteDocument>(`/exam-annotations?${new URLSearchParams({ userId, scope, group })}`, { cache: 'no-store' }),
    write: (document, baseRevision, mutationId) => authFetch<{ revision: number }>('/exam-annotations', {
      method: 'PUT', body: JSON.stringify({ userId, scope, group, baseRevision, mutationId, document }),
    }),
  }, createClientId);
  queues.set(key, queue);
  queue.subscribe(() => reviewListeners.forEach(listener => listener()));
  if (!listening) {
    listening = true;
    window.addEventListener('online', () => queues.forEach(q => { if (q.snapshot.dirty) void q.retry(); }));
    window.addEventListener('beforeunload', event => {
      if ([...queues.values()].some(q => q.snapshot.dirty)) { event.preventDefault(); event.returnValue = ''; }
    });
    window.addEventListener('pagehide', () => queues.forEach(q => { if (q.snapshot.dirty) void q.flush(); }));
  }
  return queue;
}
