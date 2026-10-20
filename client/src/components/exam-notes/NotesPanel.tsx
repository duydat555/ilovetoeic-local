import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Pin, PinOff, X, Trash2, BookOpen, Download, Check, Clock3, AlertCircle } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { NotesContentSkeleton } from './NotesContentSkeleton';
import { currentNote, useExamNotes } from './ExamNotesWorkspace';
import { emptyNote, sanitizeNote } from './model';
import NotesEditor from './NotesEditor';

export default function NotesPanel() {
  const context = useExamNotes()!;
  const { ui, dispatch, store, questions, title, annotation } = context;
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [filter, setFilter] = useState<'all' | 'note' | 'highlight' | 'drawing'>('all');
  const [deleteRequest, setDeleteRequest] = useState<{ group: string; id: string }>();
  const confirmDelete = deleteRequest?.group === ui.group ? deleteRequest.id : undefined;
  const setConfirmDelete = (id?: string) => setDeleteRequest(id ? { group: ui.group, id } : undefined);
  const reduced = useReducedMotion();
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 1023px)').matches);
  const close = () => { void store.flush(); dispatch({ type: 'close' }); };
  const note = currentNote(context);
  const conflict = state.entries[ui.selected]?.conflict;
  const allConflicts = Object.values(state.entries).some(e => e.conflict);
  const pending = Object.values(state.entries).some(e => e.dirty);
  const textNotes = questions.filter(q => state.entries[q.id]?.document.html);
  const marks = annotation?.document.items || [];
  const highlights = marks.filter(m => m.kind === 'highlight' || m.kind === 'underline');
  const drawings = marks.filter(m => m.kind !== 'highlight' && m.kind !== 'underline');
  const legacy = annotation?.document.note || '';
  const total = textNotes.length + marks.length + Number(!!legacy.trim());
  const filteredCount = filter === 'all' ? total : filter === 'note' ? textNotes.length + Number(!!legacy.trim()) : filter === 'highlight' ? highlights.length : drawings.length;
  const needsAttention = !!(state.error || state.blocked || allConflicts || state.localError);
  const saveStatus = !state.loaded ? 'Đang tải ghi chú…' : needsAttention ? 'Ghi chú chưa đồng bộ. Kiểm tra thông báo phía trên.'
    : pending ? (state.saving ? 'Đang lưu…' : 'Có thay đổi chờ lưu.') : 'Đã lưu theo tài khoản.';
  useBodyScrollLock(mobile);
  useEffect(() => {
    const media = matchMedia('(max-width: 1023px)');
    const changed = () => setMobile(media.matches);
    media.addEventListener('change', changed); return () => media.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    // StrictMode replays effects after focus has already moved into the panel.
    if (!trigger.current && document.activeElement instanceof HTMLElement) {
      trigger.current = document.activeElement.closest('.exam-notes-panel')
        ? document.querySelector<HTMLElement>('.exam-notes-trigger') : document.activeElement;
    }
    panel.current?.querySelector<HTMLButtonElement>('[data-close-notes]')?.focus();
    return () => { requestAnimationFrame(() => {
      if (!document.querySelector('.exam-notes-panel') && trigger.current?.isConnected) trigger.current.focus();
    }); };
  }, []);
  useEffect(() => () => { void store.flush(); }, [store]);
  useEffect(() => { setDeleteRequest(undefined); }, [ui.group]);
  useEffect(() => {
    if (!mobile) return;
    const workspace = document.querySelector<HTMLElement>('.exam-notes-workspace');
    const wasInert = workspace?.hasAttribute('inert');
    workspace?.setAttribute('inert', '');
    return () => { if (!wasInert) workspace?.removeAttribute('inert'); };
  }, [mobile]);
  const download = () => {
    const blob = new Blob([JSON.stringify({ version: 1, notes: Object.entries(state.entries) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'ghi-chu-bai-thi.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const range = questions.length > 1 ? `${questions[0].questionNumber}–${questions[questions.length - 1].questionNumber}` : questions[0]?.questionNumber;
  return createPortal(<motion.aside ref={panel} className="exam-notes-panel" role={mobile ? 'dialog' : 'complementary'} aria-modal={mobile || undefined}
    aria-label="Ghi chú" data-no-translate data-pinned={ui.pinned || undefined}
    initial={{ x: reduced ? 0 : '100%' }} animate={{ x: 0 }} exit={{ x: reduced ? 0 : '100%' }}
    transition={{ duration: reduced ? 0 : .35, ease: [.32, .72, 0, 1] }} onKeyDown={e => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Escape') { e.stopPropagation(); if (confirmDelete) setConfirmDelete(undefined); else close(); }
      if (mobile && e.key === 'Tab') {
        const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[href],[tabindex="0"], [contenteditable="true"]') || []).filter(n => n.getClientRects().length);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (!panel.current?.contains(document.activeElement)) { e.preventDefault(); first?.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}>
    <header className="exam-notes-header"><h2><span className="exam-notes-title-icon"><BookOpen size={20} /></span>Ghi chú</h2><div>
      <button type="button" aria-pressed={ui.pinned} aria-label={ui.pinned ? 'Bỏ ghim ghi chú' : 'Ghim ghi chú khi đổi nhóm câu'} title={ui.pinned ? 'Bỏ ghim' : 'Giữ mở khi đổi nhóm'} onClick={() => dispatch({ type: 'pin' })}>{ui.pinned ? <PinOff size={17} /> : <Pin size={17} />}</button>
      <button type="button" data-close-notes aria-label="Đóng ghi chú" title="Đóng ghi chú (Esc)" onClick={close}><X size={20} /></button>
    </div></header>
    <div role="tablist" aria-label="Ghi chú và sổ" className="exam-notes-tabs" onKeyDown={e => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const tab = e.key === 'Home' ? 'note' : e.key === 'End' ? 'book' : ui.tab === 'note' ? 'book' : 'note'; dispatch({ type: 'tab', tab }); panel.current?.querySelector<HTMLButtonElement>(`#exam-notes-${tab}-tab`)?.focus(); }
    }}>
      <button id="exam-notes-note-tab" role="tab" aria-controls="exam-notes-note-panel" aria-selected={ui.tab === 'note'} tabIndex={ui.tab === 'note' ? 0 : -1} onClick={() => dispatch({ type: 'tab', tab: 'note' })}>Ghi chú</button>
      <button id="exam-notes-book-tab" role="tab" aria-controls="exam-notes-book-panel" aria-selected={ui.tab === 'book'} tabIndex={ui.tab === 'book' ? 0 : -1} onClick={() => dispatch({ type: 'tab', tab: 'book' })}>Sổ <span>{total}</span></button>
    </div>
    <div className="exam-notes-context"><p>{title} · Part {questions[0]?.partId} · Câu {range}</p>
      {ui.pinned && <span className="exam-notes-pinned-label"><Pin size={12} aria-hidden="true" /> Đã ghim</span>}</div>
    {(state.error || state.blocked || allConflicts || state.localError) && <div className="exam-notes-error" role="alert">
      <p>{state.error || (allConflicts ? 'Có ghi chú đã thay đổi trên thiết bị khác. Bản của bạn vẫn được giữ.' : 'Chưa lưu được bản sao trên thiết bị. Giữ trang mở đến khi lưu xong.')}</p>
      <div className="exam-notes-actions"><button onClick={download}><Download size={14} /> Tải bản sao</button>
        {!state.blocked && !allConflicts && <button onClick={() => void store.flush()}>Thử lưu lại</button>}
        <button onClick={() => void store.restore()}>Đọc bản theo tài khoản</button></div>
    </div>}
    {!state.loaded ? <NotesContentSkeleton /> : <>
      <section id="exam-notes-note-panel" role="tabpanel" aria-labelledby="exam-notes-note-tab" hidden={ui.tab !== 'note'} className="exam-notes-note-tab">
        <div role="group" aria-label="Chọn câu để ghi chú" className="exam-note-chips" onKeyDown={e => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
          e.preventDefault(); const i = questions.findIndex(q => q.id === ui.selected);
          const next = e.key === 'Home' ? 0 : e.key === 'End' ? questions.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + questions.length) % questions.length;
          void store.flush(); dispatch({ type: 'select', id: questions[next].id }); (e.currentTarget.children[next] as HTMLElement)?.focus();
        }}>{questions.map(q => <button type="button" key={q.id} aria-label={`Câu ${q.questionNumber} — ${state.entries[q.id]?.document.html ? 'đã có' : 'chưa có'} ghi chú`} aria-pressed={q.id === ui.selected}
          tabIndex={q.id === ui.selected ? 0 : -1} onClick={() => { void store.flush(); dispatch({ type: 'select', id: q.id }); }}>{q.questionNumber}{state.entries[q.id]?.document.html && <span aria-hidden="true" />}</button>)}</div>
        <NotesEditor key={JSON.stringify([ui.group, ui.selected])} value={note} disabled={state.blocked || !!conflict} onChange={doc => store.change(ui.selected, doc)} onFlush={() => void store.flush()} />
      </section>
      <section id="exam-notes-book-panel" role="tabpanel" aria-labelledby="exam-notes-book-tab" hidden={ui.tab !== 'book'} className="exam-notes-book-tab">
        <div className="exam-note-filters" role="group" aria-label="Lọc theo loại">
          {([['all', 'Tất cả', total], ['note', 'Ghi chú', textNotes.length + Number(!!legacy.trim())], ['highlight', 'Tô sáng', highlights.length], ['drawing', 'Nét vẽ', drawings.length]] as const).map(([key, label, count]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} <span>{count}</span></button>)}
        </div>
        <h3>Câu {range} <span>· Part {questions[0]?.partId}</span></h3>
        {(filter === 'all' || filter === 'note') && <>
          {textNotes.map(q => <article className="exam-note-entry" key={q.id}>
            <div><button className="exam-note-entry-title" onClick={() => dispatch({ type: 'select', id: q.id })}>Ghi chú câu {q.questionNumber}</button>
              <button aria-label={`Xoá ghi chú câu ${q.questionNumber}`} onClick={() => setConfirmDelete(q.id)} disabled={state.blocked || !!state.entries[q.id]?.conflict}><Trash2 size={15} /></button></div>
            <div className="exam-note-rich" dangerouslySetInnerHTML={{ __html: sanitizeNote(state.entries[q.id].document.html) }} />
          </article>)}
          {legacy.trim() && <article className="exam-note-entry"><strong>Ghi chú nhóm trước đây</strong><p className="whitespace-pre-wrap">{legacy}</p></article>}
        </>}
        {(filter === 'all' ? marks : filter === 'highlight' ? highlights : filter === 'drawing' ? drawings : []).map(mark => <article className="exam-note-entry" key={mark.id}>
          <div><strong>{({ highlight: 'Tô sáng', underline: 'Gạch chân', pen: 'Nét bút', rectangle: 'Khoanh vùng', arrow: 'Mũi tên', text: 'Hộp chữ', sticky: 'Giấy nhớ' })[mark.kind]}</strong>
            <button aria-label="Xoá chú thích này" onClick={() => annotation?.remove(mark.id)}><Trash2 size={15} /></button></div>
          <p>{mark.anchor?.quote || mark.text || 'Chú thích trên bài đọc của nhóm này.'}</p>
        </article>)}
        {filteredCount === 0 && <p className="exam-notes-empty">{total === 0 ? 'Chưa có ghi chú trong nhóm này. Chọn một câu để bắt đầu.' : 'Chưa có mục nào thuộc loại này trong nhóm câu hiện tại.'}</p>}
      </section>
    </>}
    {confirmDelete && <div className="exam-notes-delete" role="alertdialog" aria-label="Xoá ghi chú này?">
      <p>Xoá ghi chú câu {questions.find(q => q.id === confirmDelete)?.questionNumber}?</p><button autoFocus onClick={() => setConfirmDelete(undefined)}>Giữ lại</button>
      <button onClick={() => { store.change(confirmDelete, emptyNote()); void store.flush(); setConfirmDelete(undefined); }}>Xoá ghi chú</button>
    </div>}
    <footer className="exam-notes-footer">
      <p className="exam-notes-save-status" role="status">{needsAttention ? <AlertCircle size={14} aria-hidden="true" /> : pending || !state.loaded ? <Clock3 size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
        {saveStatus}</p>
      <p className="exam-notes-shortcuts"><span><kbd>Ctrl B</kbd> đậm</span><span><kbd>Ctrl I</kbd> nghiêng</span><span><kbd>Ctrl U</kbd> gạch chân</span></p>
    </footer>
  </motion.aside>, document.fullscreenElement || document.body);
}
