import { useCallback, useEffect, useRef, useState } from 'react';
import { deserialize, emptyDocument, historyStep, serialize } from './model';
import type { AnnotationDocument, History } from './model';
import { getAnnotationSync } from './syncRegistry';

// Keep failed writes across group switches within this page session, scoped by account.
const pendingDocuments = new Map<string, { raw: string | null; document: AnnotationDocument }>();
const warnPending = (event: BeforeUnloadEvent) => {
  if (pendingDocuments.size) { event.preventDefault(); event.returnValue = ''; }
};
const rememberPending = (key: string, raw: string | null, document: AnnotationDocument) => {
  if (!pendingDocuments.size) window.addEventListener('beforeunload', warnPending);
  pendingDocuments.set(key, { raw, document });
};
const forgetPending = (key: string) => {
  pendingDocuments.delete(key);
  if (!pendingDocuments.size) window.removeEventListener('beforeunload', warnPending);
};

export function useAnnotationDocument(key: string, initial: AnnotationDocument) {
  const [loaded] = useState(() => {
    const pending = pendingDocuments.get(key);
    if (pending) return { ...pending, blocked: false, error: 'Có ghi chú chưa lưu. Hãy thử lưu lại hoặc tải bản sao.' };
    try {
      const raw = localStorage.getItem(key);
      return { raw, document: raw === null ? initial : deserialize(raw), blocked: false, error: '' };
    } catch {
      return { raw: null, document: emptyDocument(), blocked: true, error: 'Không đọc được ghi chú đã lưu. Bản lưu được giữ nguyên; hãy kiểm tra quyền lưu trữ của trình duyệt.' };
    }
  });
  const [history, setHistory] = useState<History>({ past: [], present: loaded.document, future: [] });
  const historyRef = useRef(history);
  const rawRef = useRef(loaded.raw);
  const blockedRef = useRef(loaded.blocked);
  const [error, setError] = useState(loaded.error);
  const [unsaved, setUnsaved] = useState(() => pendingDocuments.has(key));
  const [sync] = useState(() => getAnnotationSync(key, loaded.document,
    loaded.raw !== null || pendingDocuments.has(key) || !!loaded.document.items.length || !!loaded.document.note || loaded.document.review));
  const [remote, setRemote] = useState(sync.snapshot);
  const generationRef = useRef(sync.snapshot.status === 'saved' ? -1 : sync.snapshot.generation);
  const replace = (next: History) => { historyRef.current = next; setHistory(next); };
  const save = useCallback((next: History) => {
    if (blockedRef.current) return false;
    let raw: string;
    try { raw = serialize(next.present); } catch { setError('Ghi chú quá lớn hoặc không hợp lệ. Hãy giảm số nét hoặc độ dài nội dung.'); return false; }
    try {
      const current = localStorage.getItem(key);
      if (current !== rawRef.current) {
        blockedRef.current = true;
        setError('Ghi chú đã thay đổi ở thẻ khác. Đọc bản mới để tiếp tục.');
        return false;
      }
      localStorage.setItem(key, raw);
      rawRef.current = raw;
      forgetPending(key);
      setError(''); setUnsaved(false);
    } catch {
      rememberPending(key, rawRef.current, next.present);
      setError('Chưa lưu được trên thiết bị. Giữ trang này mở và thử lưu lại.'); setUnsaved(true);
    }
    replace(next);
    sync.change(next.present);
    return true;
  }, [key, sync]);
  const edit = useCallback((document: AnnotationDocument) => save(historyStep(historyRef.current, { type: 'edit', document })), [save]);
  const undo = useCallback(() => save(historyStep(historyRef.current, { type: 'undo' })), [save]);
  const redo = useCallback(() => save(historyStep(historyRef.current, { type: 'redo' })), [save]);
  const retry = useCallback(() => { if (unsaved) save(historyRef.current); void sync.retry(); }, [save, sync, unsaved]);
  const reload = useCallback(() => {
    try {
      const raw = localStorage.getItem(key);
      const document = raw === null ? emptyDocument() : deserialize(raw);
      rawRef.current = raw; blockedRef.current = false;
      forgetPending(key);
      replace({ past: [], present: document, future: [] }); setError(''); setUnsaved(false);
    } catch { setError('Không đọc được bản lưu. Bản lưu được giữ nguyên.'); }
  }, [key]);
  const loadServer = useCallback(async () => {
    try {
      const previous = localStorage.getItem(key);
      if (previous !== null) localStorage.setItem(`${key}:recovery-local`, previous);
      rawRef.current = previous; blockedRef.current = false; setError('');
      await sync.loadServer();
    } catch { setError('Chưa giữ được bản sao trên thiết bị. Chú thích hiện tại được giữ nguyên.'); }
  }, [key, sync]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === key || event.key === null)) {
        blockedRef.current = true; setError('Ghi chú đã thay đổi ở thẻ khác. Đọc bản mới để tiếp tục.');
      }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [key]);
  useEffect(() => {
    const changed = () => {
      const snapshot = sync.snapshot;
      setRemote(snapshot);
      if (generationRef.current !== snapshot.generation && snapshot.status === 'saved' && !blockedRef.current) {
        generationRef.current = snapshot.generation;
        const document = snapshot.document;
        try {
          const raw = serialize(document);
          if (localStorage.getItem(key) !== rawRef.current) throw Error('local conflict');
          localStorage.setItem(key, raw); rawRef.current = raw; forgetPending(key); setUnsaved(false); setError('');
        } catch {
          rememberPending(key, rawRef.current, document); setUnsaved(true);
          setError('Chưa lưu được bản sao trên thiết bị. Bản theo tài khoản vẫn được giữ.');
        }
        replace({ past: [], present: document, future: [] });
      }
    };
    const unsubscribe = sync.subscribe(changed);
    changed();
    if (sync.snapshot.status === 'loading') void sync.start();
    return () => { unsubscribe(); void sync.flush(); };
  }, [key, sync]);
  return { document: history.present, canUndo: history.past.length > 0, canRedo: history.future.length > 0, edit, undo, redo,
    error: error || (remote.status === 'offline' || remote.status === 'conflict' ? remote.message : ''), retry, reload,
    unsaved: unsaved || remote.dirty, syncStatus: remote.message, conflict: remote.status === 'conflict',
    needsRemoteRetry: remote.status === 'offline', loadServer };
}
