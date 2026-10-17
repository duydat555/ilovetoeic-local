import { authFetch } from '../../services/backend';
import { createClientId } from '../../utils/id';
import { NotesStore } from './store';
import type { RemoteNote } from './store';
import type { NoteDocument, NoteQuestion } from './model';

const stores = new Map<string, NotesStore>();
let listening = false;
export function notesStore(userId: string, scope: string, group: string, questions: NoteQuestion[]) {
  const key = `ilovetoeic.notes.v1:${encodeURIComponent(userId)}:${encodeURIComponent(scope)}:${encodeURIComponent(group)}`;
  let store = stores.get(key);
  if (!store) {
    store = new NotesStore(key, { getItem: k => localStorage.getItem(k), setItem: (k, v) => localStorage.setItem(k, v) }, {
      read: () => authFetch<{ notes: RemoteNote[] }>(`/exam-notes?${new URLSearchParams({ userId, scope, group })}`, { cache: 'no-store' }),
      write: (q, document, baseRevision, mutationId) => authFetch<{ revision: number; document: NoteDocument }>('/exam-notes', {
        method: 'PUT', body: JSON.stringify({ userId, scope, group, questionId: q.id, questionNumber: q.questionNumber,
          part: q.partId, document, baseRevision, mutationId }),
      }),
    }, questions, createClientId);
    stores.set(key, store);
  }
  if (!listening) {
    listening = true;
    window.addEventListener('online', () => stores.forEach(s => { if (Object.values(s.snapshot.entries).some(e => e.dirty)) void s.flush(); }));
    window.addEventListener('storage', e => stores.forEach(s => { if (e.storageArea === localStorage && (e.key === null || e.key === s.key)) s.changedElsewhere(); }));
    window.addEventListener('beforeunload', e => {
      if ([...stores.values()].some(s => s.snapshot.localError || Object.values(s.snapshot.entries).some(n => n.dirty))) { e.preventDefault(); e.returnValue = ''; }
    });
    window.addEventListener('pagehide', () => stores.forEach(s => void s.flush()));
  }
  return store;
}
/** Limit waiting before submit; queues/outboxes continue independently. */
export async function flushExamNotes(userId?: string, scope?: string) {
  const selected = [...stores.values()].filter(s => !userId || s.key.startsWith(`ilovetoeic.notes.v1:${encodeURIComponent(userId)}:${encodeURIComponent(scope || '')}:`));
  let timeout: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([Promise.all(selected.map(s => s.flush())), new Promise(r => { timeout = setTimeout(r, 2000); })]);
  clearTimeout(timeout);
  return selected.every(s => !Object.values(s.snapshot.entries).some(e => e.dirty));
}
