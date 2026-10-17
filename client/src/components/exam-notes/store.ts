import { deserializeNote, emptyNote, serializeNote } from './model.ts';
import type { NoteDocument, NoteQuestion } from './model';

export interface RemoteNote { questionId: string; questionNumber: number; part: number; document: NoteDocument; revision: number }
interface Entry {
  document: NoteDocument; revision: number; acknowledged: string | null; dirty: boolean;
  mutation?: { id: string; raw: string; revision: number }; conflict?: boolean;
}
export interface NotesSnapshot { entries: Record<string, Entry>; loaded: boolean; saving: boolean; error: string; localError: boolean; blocked: boolean }
export interface NotesTransport {
  read(): Promise<{ notes: RemoteNote[] }>;
  write(question: NoteQuestion, document: NoteDocument, revision: number, mutationId: string): Promise<{ revision: number; document: NoteDocument }>;
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
/** Account/group queue. Each question has its own revision; survives panel/group unmount. */
export class NotesStore {
  snapshot: NotesSnapshot = { entries: Object.create(null), loaded: false, saving: false, error: '', localError: false, blocked: false };
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private task?: Promise<void>;
  private ready = false;
  private raw: string | null = null;
  constructor(readonly key: string, private storage: StorageLike, private transport: NotesTransport,
    readonly questions: NoteQuestion[], private uuid: () => string) {
    try {
      this.raw = storage.getItem(key);
      if (this.raw) {
        const parsed = JSON.parse(this.raw);
        if (parsed.version !== 1 || !Array.isArray(parsed.notes)) throw Error('version');
        for (const [id, e] of parsed.notes) {
          if (!questions.some(q => q.id === id) || !Number.isSafeInteger(e.revision) || e.revision < 0 || typeof e.dirty !== 'boolean') throw Error('record');
          const document = deserializeNote(JSON.stringify(e.document));
          const acknowledged = e.acknowledged === null ? null : serializeNote(deserializeNote(e.acknowledged));
          if (e.mutation && (typeof e.mutation.id !== 'string' || !Number.isSafeInteger(e.mutation.revision) || typeof e.mutation.raw !== 'string')) throw Error('mutation');
          this.snapshot.entries[id] = { ...e, document, acknowledged };
        }
      }
    } catch {
      this.snapshot = { ...this.snapshot, loaded: true, blocked: true, error: 'Chưa đọc được bản trên thiết bị. Dữ liệu cũ được giữ nguyên; tải bản sao trước khi khôi phục.' };
    }
  }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.snapshot;
  private emit(patch: Partial<NotesSnapshot> = {}) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(fn => fn()); }
  private persist() {
    try {
      if (this.storage.getItem(this.key) !== this.raw) {
        this.emit({ blocked: true, error: 'Ghi chú đã đổi ở thẻ khác. Tải bản sao trước khi đọc bản theo tài khoản.' });
        return false;
      }
      this.raw = JSON.stringify({ version: 1, notes: Object.entries(this.snapshot.entries) });
      this.storage.setItem(this.key, this.raw);
      this.emit({ localError: false });
      return true;
    } catch {
      // Preserve memory and try DB; do not claim a durable local copy exists.
      this.raw = (() => { try { return this.storage.getItem(this.key); } catch { return null; } })();
      this.emit({ localError: true });
      return false;
    }
  }
  changedElsewhere() { this.emit({ blocked: true, error: 'Ghi chú đã đổi ở thẻ khác. Tải bản sao trước khi đọc bản theo tài khoản.' }); }
  change(id: string, document: NoteDocument) {
    if (this.snapshot.blocked || !this.questions.some(q => q.id === id)) return false;
    const clean = deserializeNote(serializeNote(document));
    const entry = this.snapshot.entries[id] || { document: emptyNote(), revision: 0, acknowledged: null, dirty: false };
    if (serializeNote(entry.document) === serializeNote(clean)) return true;
    this.snapshot.entries[id] = { ...entry, document: clean, dirty: true };
    this.persist(); this.emit();
    clearTimeout(this.timer); this.timer = setTimeout(() => void this.flush(), 800);
    return true;
  }
  start = (): Promise<void> => {
    if (this.task) return this.task;
    if (this.snapshot.blocked) return Promise.resolve();
    this.task = this.load().finally(() => { this.task = undefined; });
    return this.task;
  };
  private async load() {
    try {
      const result = await this.transport.read();
      const remote = new Map<string, RemoteNote>();
      for (const r of result.notes) {
        if (!this.questions.some(q => q.id === r.questionId) || remote.has(r.questionId) || !Number.isSafeInteger(r.revision) || r.revision < 1) throw Error('response');
        remote.set(r.questionId, { ...r, document: deserializeNote(JSON.stringify(r.document)) });
      }
      for (const q of this.questions) {
        const local = this.snapshot.entries[q.id];
        const r = remote.get(q.id);
        const raw = r ? serializeNote(r.document) : null;
        if (!local?.dirty || (local && serializeNote(local.document) === raw)) {
          if (r) this.snapshot.entries[q.id] = { document: r.document, revision: r.revision, acknowledged: raw, dirty: false };
          else delete this.snapshot.entries[q.id];
        } else if (local.revision !== (r?.revision || 0) || local.acknowledged !== raw) {
          local.conflict = true;
        }
      }
      this.ready = true;
      this.emit({ loaded: true, error: '' }); this.persist(); this.emit();
    } catch {
      this.emit({ loaded: true, error: 'Chưa tải được ghi chú theo tài khoản. Nội dung trên thiết bị được giữ để thử lại.' });
    }
  }
  flush = async (): Promise<void> => {
    clearTimeout(this.timer);
    if (this.task) { await this.task; return this.flush(); }
    if (this.snapshot.blocked) return;
    if (!this.ready) { await this.start(); if (!this.ready) return; }
    this.task = this.save().finally(() => { this.task = undefined; });
    await this.task;
  };
  private async save() {
    this.emit({ saving: true, error: '' });
    try {
      for (const q of this.questions) {
        let e = this.snapshot.entries[q.id];
        // Coalesce edits made while a request is in flight, retaining serial order.
        while (e?.dirty && !e.conflict && !this.snapshot.blocked) {
          const raw = serializeNote(e.document);
          const mutation = e.mutation?.raw === raw && e.mutation.revision === e.revision
            ? e.mutation : { id: this.uuid(), raw, revision: e.revision };
          e.mutation = mutation; this.persist();
          if (this.snapshot.blocked) break;
          try {
            const result = await this.transport.write(q, e.document, mutation.revision, mutation.id);
            if (!Number.isSafeInteger(result.revision) || result.revision <= mutation.revision) throw Error('revision');
            const clean = deserializeNote(JSON.stringify(result.document));
            const current = this.snapshot.entries[q.id];
            const same = serializeNote(current.document) === raw;
            this.snapshot.entries[q.id] = { ...current, document: same ? clean : current.document,
              revision: result.revision, acknowledged: serializeNote(clean), dirty: !same, mutation: undefined };
            this.persist(); this.emit(); e = this.snapshot.entries[q.id];
          } catch (error) {
            if ((error as { status?: number }).status === 409) {
              this.snapshot.entries[q.id].conflict = true; this.persist();
            } else this.emit({ error: 'Chưa lưu được lên tài khoản. Giữ trang mở hoặc thử lại khi có mạng.' });
            break;
          }
        }
      }
    } finally { this.emit({ saving: false }); }
  }
  /** Explicit resolution only, always preserving the previous local bytes first. */
  restore = async () => {
    if (this.task) await this.task;
    this.task = this.restoreRemote().finally(() => { this.task = undefined; });
    await this.task;
  };
  private async restoreRemote() {
    const wasBlocked = this.snapshot.blocked;
    try {
      const backup = JSON.stringify({ version: 1, notes: Object.entries(this.snapshot.entries), original: this.storage.getItem(this.key) });
      this.storage.setItem(`${this.key}:recovery:${this.uuid()}`, backup);
      this.emit({ blocked: true, error: 'Đang đọc bản theo tài khoản…' });
      const remote = await this.transport.read();
      const entries: Record<string, Entry> = Object.create(null);
      for (const r of remote.notes) {
        if (!this.questions.some(q => q.id === r.questionId) || entries[r.questionId] || !Number.isSafeInteger(r.revision) || r.revision < 1) throw Error('response');
        const document = deserializeNote(JSON.stringify(r.document));
        entries[r.questionId] = { document, revision: r.revision, acknowledged: serializeNote(document), dirty: false };
      }
      this.raw = this.storage.getItem(this.key);
      this.snapshot.entries = entries; this.ready = true;
      this.emit({ blocked: false, loaded: true, error: '' }); this.persist();
    } catch { this.emit({ blocked: wasBlocked, error: 'Chưa đọc được bản theo tài khoản hoặc chưa giữ được bản sao. Ghi chú hiện tại được giữ nguyên.' }); }
  }
}
