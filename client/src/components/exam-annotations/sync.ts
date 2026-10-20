import { deserialize, emptyDocument, serialize } from './model.ts';
import type { AnnotationDocument } from './model';

export function canonical(document: AnnotationDocument): string {
  deserialize(serialize(document));
  const sorted = (value: unknown): unknown => Array.isArray(value) ? value.map(sorted)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sorted(child)])) : value;
  return JSON.stringify(sorted(document));
}

export interface RemoteDocument { document: AnnotationDocument | null; revision: number }
export interface AnnotationTransport {
  read(): Promise<RemoteDocument>;
  write(document: AnnotationDocument, revision: number, mutationId: string): Promise<{ revision: number }>;
}
export interface SyncSnapshot { status: 'loading' | 'saving' | 'saved' | 'offline' | 'conflict'; message: string; dirty: boolean; document: AnnotationDocument; generation: number }
interface Metadata { revision: number; acknowledged: string | null; mutation?: { id: string; raw: string; revision: number } }
/** One serial queue per account/scope/group, surviving component unmounts. */
export class AnnotationSync {
  get revision() { return this.meta.revision; }
  private meta: Metadata = { revision: 0, acknowledged: null };
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private ready = false;
  private existsLocally: boolean;
  private key: string;
  private storage: Pick<Storage, 'getItem' | 'setItem'>;
  private transport: AnnotationTransport;
  private uuid: () => string;
  snapshot: SyncSnapshot;
  constructor(key: string, initial: AnnotationDocument, existsLocally: boolean,
    storage: Pick<Storage, 'getItem' | 'setItem'>, transport: AnnotationTransport, uuid: () => string) {
    this.key = key; this.storage = storage; this.transport = transport; this.uuid = uuid;
    this.existsLocally = existsLocally;
    this.snapshot = { status: 'loading', message: 'Đang tải chú thích đã lưu…', dirty: false, document: initial, generation: 0 };
    try {
      const value = JSON.parse(storage.getItem(`${key}:sync`) || 'null');
      if (value && Number.isSafeInteger(value.revision) && value.revision >= 0 && (value.acknowledged === null || typeof value.acknowledged === 'string')) {
        if (value.acknowledged !== null) deserialize(value.acknowledged);
        if (value.mutation) {
          deserialize(value.mutation.raw);
          if (typeof value.mutation.id !== 'string' || !Number.isSafeInteger(value.mutation.revision)) throw Error('bad metadata');
        }
        this.meta = value;
      }
    } catch { /* Missing/corrupt sync metadata never authorizes an overwrite of remote data. */ }
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(patch: Partial<SyncSnapshot>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(fn => fn()); }
  private remember() { try { this.storage.setItem(`${this.key}:sync`, JSON.stringify(this.meta)); } catch { /* GET/revision checks still protect remote data. */ } }
  change(document: AnnotationDocument) {
    this.existsLocally = true;
    this.emit({ document, dirty: true, ...(this.snapshot.status === 'conflict' ? {} : { status: 'saving' as const, message: 'Đang lưu chú thích…' }) });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 600);
  }
  async start() {
    if (this.running) return;
    this.running = true;
    try {
      const remote = await this.transport.read();
      if (!Number.isSafeInteger(remote.revision) || remote.revision < 0) throw Error('invalid revision');
      const remoteRaw = remote.document === null ? null : canonical(remote.document);
      const localRaw = canonical(this.snapshot.document);
      const meaningfulLocal = !!this.snapshot.document.items.length || !!this.snapshot.document.note || this.snapshot.document.review;
      const localChanged = this.snapshot.dirty || (this.existsLocally && (this.meta.acknowledged === null ? meaningfulLocal : localRaw !== this.meta.acknowledged));
      if (remoteRaw === localRaw || !localChanged) {
        const document = remote.document || this.snapshot.document;
        this.meta = { revision: remote.revision, acknowledged: remoteRaw };
        this.ready = true; this.remember();
        this.emit({ document, generation: this.snapshot.generation + 1, status: 'saved', message: remote.document ? 'Đã lưu theo tài khoản.' : 'Chú thích sẽ được lưu theo tài khoản.', dirty: false });
      } else if ((!remote.document && remote.revision === 0 && this.meta.revision === 0)
        || (remote.revision === this.meta.revision && this.meta.acknowledged === remoteRaw)) {
        this.ready = true;
        this.emit({ dirty: true });
      } else {
        this.emit({ status: 'conflict', message: 'Chú thích đã thay đổi trên thiết bị khác. Bản của bạn vẫn được giữ; tải bản sao trước khi đọc bản máy chủ.', dirty: true });
        return;
      }
    } catch {
      this.emit({ status: 'offline', message: 'Chưa kết nối được để tải chú thích. Bản trên thiết bị vẫn được giữ.', dirty: this.snapshot.dirty || this.existsLocally });
      return;
    } finally { this.running = false; }
    if (this.snapshot.dirty) void this.flush();
  }
  async flush() {
    if (this.running || this.snapshot.status === 'conflict') return;
    if (!this.ready) { await this.start(); return; }
    if (!this.snapshot.dirty) return;
    this.running = true;
    const document = this.snapshot.document, raw = canonical(document);
    const mutation = this.meta.mutation?.raw === raw && this.meta.mutation.revision === this.meta.revision
      ? this.meta.mutation : { id: this.uuid(), raw, revision: this.meta.revision };
    this.meta.mutation = mutation; this.remember();
    this.emit({ status: 'saving', message: 'Đang lưu chú thích…' });
    let again = false;
    try {
      const response = await this.transport.write(document, mutation.revision, mutation.id);
      if (!Number.isSafeInteger(response.revision) || response.revision <= mutation.revision) throw Error('invalid revision');
      this.meta = { revision: response.revision, acknowledged: raw }; this.remember();
      again = canonical(this.snapshot.document) !== raw;
      this.emit({ dirty: again, status: again ? 'saving' : 'saved', message: again ? 'Đang lưu chú thích…' : 'Đã lưu theo tài khoản.' });
    } catch (error) {
      const status = (error as { status?: number }).status;
      this.emit({ status: status === 409 ? 'conflict' : 'offline', dirty: true,
        message: status === 409 ? 'Chú thích đã thay đổi trên thiết bị khác. Bản của bạn vẫn được giữ; tải bản sao trước khi đọc bản máy chủ.' : 'Chưa lưu được lên tài khoản. Bản trên thiết bị vẫn được giữ để thử lại.' });
    } finally { this.running = false; }
    if (again) void this.flush();
  }
  retry = async () => {
    if (this.snapshot.status === 'conflict') return;
    if (this.ready) await this.flush(); else await this.start();
  };
  async loadServer() {
    if (this.running) return;
    this.running = true;
    const before = canonical(this.snapshot.document);
    try {
      const remote = await this.transport.read();
      if (canonical(this.snapshot.document) !== before) throw Error('edited while loading');
      const document = remote.document ? deserialize(serialize(remote.document)) : emptyDocument();
      // Keep a recoverable copy before replacing a dirty local document.
      this.storage.setItem(`${this.key}:recovery`, serialize(this.snapshot.document));
      this.meta = { revision: remote.revision, acknowledged: remote.document ? canonical(document) : null };
      this.remember(); this.ready = true; this.existsLocally = true;
      this.emit({ document, generation: this.snapshot.generation + 1, dirty: false, status: 'saved', message: 'Đã tải bản theo tài khoản; bản trước được giữ trên thiết bị.' });
    } catch { this.emit({ status: 'offline', message: 'Chưa đọc được bản máy chủ hoặc chưa giữ được bản sao. Chú thích hiện tại được giữ nguyên.' }); }
    finally { this.running = false; }
  }
}
