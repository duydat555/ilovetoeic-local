import React, { createContext, lazy, Suspense, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useState, useSyncExternalStore } from 'react';
import { BookOpen, X } from 'lucide-react';
import { NotesContentSkeleton } from './NotesContentSkeleton';
import { emptyNote, groupIdentity, notesReducer, plainToNote } from './model';
import type { NoteQuestion, NotesUI } from './model';
import { notesStore } from './registry';
import type { NotesStore } from './store';
import { AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import './notes.css';
import { AnnotationDockWorkspace } from './AnnotationDock';

export const EXAM_NOTES_ENABLED = import.meta.env.VITE_EXAM_NOTES_V2 === 'true';
const Panel = lazy(() => import('./NotesPanel'));
interface NotebookMark {
  id: string; kind: 'highlight' | 'underline' | 'pen' | 'rectangle' | 'arrow' | 'text' | 'sticky';
  anchor?: { quote: string }; text?: string;
}
export interface AnnotationNotebook { document: { note: string; items: NotebookMark[] }; remove: (id: string) => void }
interface NotesContextValue {
  ui: NotesUI; dispatch: React.Dispatch<Parameters<typeof notesReducer>[1]>; store: NotesStore;
  count: number; questions: NoteQuestion[]; title: string; annotation?: AnnotationNotebook;
  publish: (value: AnnotationNotebook | undefined) => void;
}
const NotesContext = createContext<NotesContextValue | null>(null);
export const useExamNotes = () => useContext(NotesContext);
interface Props { userId?: string; scope: string; questions: NoteQuestion[]; title?: string; legacyNotes?: Record<string, string>; children: React.ReactNode }
export function ExamNotesWorkspace(props: Props) {
  if (!EXAM_NOTES_ENABLED || !props.userId) return import.meta.env.VITE_EXAM_ANNOTATIONS_V2 === 'true' && props.userId
    ? <AnnotationDockWorkspace>{props.children}</AnnotationDockWorkspace> : <>{props.children}</>;
  return <Workspace key={JSON.stringify([props.userId, props.scope])} {...props} userId={props.userId} />;
}
function Workspace({ userId, scope, questions, title = 'Đề thi TOEIC', legacyNotes, children }: Props & { userId: string }) {
  const group = groupIdentity(questions);
  const store = useMemo(() => notesStore(userId, scope, group, questions), [userId, scope, group]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [ui, dispatch] = useReducer(notesReducer, { open: false, pinned: false, tab: 'note', selected: questions[0]?.id || '', group });
  const [published, setPublished] = useState<{ group: string; value: AnnotationNotebook | undefined }>();
  const [testTitle, setTestTitle] = useState(title);
  useEffect(() => {
    let alive = true;
    if (title === 'Đề thi TOEIC' && scope.startsWith('test:')) void apiService.getTestDetail(scope.slice(5)).then(test => {
      if (alive && (test?.name || test?.title)) setTestTitle(test.name || test.title || title);
    });
    return () => { alive = false; };
  }, [scope, title]);
  const publish = React.useCallback((value: AnnotationNotebook | undefined) => setPublished({ group, value }), [group]);
  useEffect(() => { dispatch({ type: 'group', group, first: questions[0]?.id || '' }); }, [group]);
  useEffect(() => {
    if (questions.length) void store.start().then(() => store.flush());
    return () => { void store.flush(); };
  }, [store]);
  useEffect(() => {
    if (!snapshot.loaded || snapshot.blocked || !legacyNotes) return;
    // Empty server tombstones count as existing: never re-import deliberately deleted notes.
    for (const q of questions) if (!snapshot.entries[q.id] && legacyNotes[q.id]?.trim()) store.change(q.id, plainToNote(legacyNotes[q.id]));
  }, [store, snapshot.loaded, legacyNotes]);
  const count = questions.filter(q => snapshot.entries[q.id]?.document.html).length;
  const visibleUI = ui.group === group ? ui : { ...ui, group, selected: questions[0]?.id || '', open: ui.pinned && ui.open };
  const [panelPresent, setPanelPresent] = useState(false);
  useLayoutEffect(() => { if (visibleUI.open) setPanelPresent(true); }, [visibleUI.open]);
  const value = { ui: visibleUI, dispatch, store, count, questions, title: testTitle,
    annotation: published?.group === group ? published.value : undefined, publish };
  return <NotesContext.Provider value={value}>
    <AnnotationDockWorkspace className={visibleUI.open || panelPresent ? 'exam-notes-open' : ''}>{children}</AnnotationDockWorkspace>
    <AnimatePresence onExitComplete={() => { if (!visibleUI.open) setPanelPresent(false); }}>{visibleUI.open && <PanelBoundary key="notes-panel" onClose={() => dispatch({ type: 'close' })}>
      <Suspense fallback={<aside className="exam-notes-loading" aria-label="Đang mở ghi chú">
        <header className="exam-notes-header"><h2><span className="exam-notes-title-icon"><BookOpen size={20} /></span>Ghi chú</h2>
          <button aria-label="Đóng ghi chú" onClick={() => dispatch({ type: 'close' })}><X size={20} /></button></header>
        <NotesContentSkeleton />
      </aside>}>
        <Panel />
      </Suspense>
    </PanelBoundary>}</AnimatePresence>
  </NotesContext.Provider>;
}
class PanelBoundary extends React.Component<{ children: React.ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <aside className="exam-notes-loading" role="alert">Chưa mở được ghi chú. Bạn vẫn có thể tiếp tục làm bài.<button onClick={this.props.onClose}>Đóng</button></aside> : this.props.children; }
}
export function ExamNotesButton() {
  const notes = useExamNotes();
  if (!notes) return null;
  return <button type="button" className="exam-notes-trigger inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-400 hover:bg-brand-50/50 dark:border-line dark:bg-surface-elevated dark:text-content dark:hover:bg-surface-hover" aria-label={`Ghi chú (${notes.count})`} aria-expanded={notes.ui.open}
    onClick={() => notes.dispatch({ type: 'toggle' })}><BookOpen className="size-4 text-brand-600 dark:text-brand-300" /><span className="hidden sm:inline">Ghi chú</span>
    {notes.count > 0 && <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-extrabold text-brand-700 dark:bg-brand-950 dark:text-brand-200">{notes.count}</span>}</button>;
}

export function currentNote(context: NotesContextValue) {
  return context.store.snapshot.entries[context.ui.selected]?.document || emptyNote();
}
