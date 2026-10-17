// Run in a real browser through Vite: await (await import('/tests/exam-notes.browser.ts')).runNotesTests()
import { emptyNote, groupIdentity, notesReducer, plainToNote, sanitizeNote, serializeNote, deserializeNote } from '../src/components/exam-notes/model';
import { NotesStore } from '../src/components/exam-notes/store';

export async function runNotesTests() {
  const results: string[] = [];
  const assert = (condition: unknown, name: string) => { if (!condition) throw Error(name); };
  const test = async (name: string, fn: () => void | Promise<void>) => { await fn(); results.push(name); };
  const q = { id: 'q1', questionNumber: 139, partId: 6 };
  const memory = () => { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, data }; };
  const doc = (text: string) => plainToNote(text);
  await test('sanitize preserves supported marks and strips executable content/attributes', () => {
    const result = sanitizeNote('<p onclick="alert(1)"><strong>B</strong><em>I</em><u>U</u><mark style="x">H</mark><a href="javascript:x">text</a><img src=x onerror=x></p><svg><script>x</script></svg>');
    assert(result === '<p><strong>B</strong><em>I</em><u>U</u><mark>H</mark>text</p>', result);
    assert(sanitizeNote('<p>&nbsp;<br></p>') === '', 'empty rich HTML');
    assert(sanitizeNote(result) === result, 'idempotent');
  });
  await test('versioned serialization, legacy escaping and no 8000-character product limit', () => {
    const note = doc('<script>plain text</script>');
    assert(note.html.includes('&lt;script&gt;'), 'legacy escaped');
    assert(serializeNote(deserializeNote(serializeNote(note))) === serializeNote(note), 'roundtrip');
    let threw = false; try { deserializeNote('{"version":2,"format":"html","html":"x"}'); } catch { threw = true; }
    assert(threw, 'unknown version rejected');
    assert(doc('a'.repeat(10000)).html.length > 10000, 'no 8000 cap');
  });
  await test('reducer pins across groups, closes unpinned and keeps chip/tab state explicit', () => {
    let s = { open: true, pinned: false, tab: 'note' as const, selected: 'q1', group: 'a' };
    assert(!notesReducer(s, { type: 'group', group: 'b', first: 'q2' }).open, 'close');
    const pinned = notesReducer(notesReducer(s, { type: 'pin' }), { type: 'group', group: 'b', first: 'q2' });
    assert(pinned.open && pinned.selected === 'q2', 'pin');
    assert(notesReducer(pinned, { type: 'tab', tab: 'book' }).tab === 'book', 'book');
    assert(groupIdentity([q, { ...q, id: 'q2' }]) === groupIdentity([{ ...q, id: 'q2' }, q]), 'stable ID order');
  });
  await test('remote restore, serialized in-flight edits, deletion and durable cache', async () => {
    const storage = memory(); let release: (() => void) | undefined; const writes: string[] = [];
    const store = new NotesStore('key', storage, { read: async () => ({ notes: [] }), write: async (_, document, revision) => {
      writes.push(document.html); if (revision === 0) await new Promise<void>(r => { release = r; }); return { revision: revision + 1, document };
    } }, [q], crypto.randomUUID.bind(crypto));
    await store.start(); store.change(q.id, doc('first')); const saving = store.flush();
    store.change(q.id, doc('latest')); release!(); await saving;
    assert(writes.length === 2 && writes[1].includes('latest'), 'serial latest');
    assert(!store.snapshot.entries.q1.dirty && store.snapshot.entries.q1.revision === 2, 'acked');
    store.change(q.id, emptyNote()); await store.flush();
    assert(store.snapshot.entries.q1.document.html === '' && store.snapshot.entries.q1.revision === 3, 'revisioned delete');
    const restored = new NotesStore('key', storage, { read: async () => ({ notes: [{ questionId: q.id, questionNumber: 139, part: 6, document: doc('server'), revision: 4 }] }), write: async () => { throw Error('no write'); } }, [q], crypto.randomUUID.bind(crypto));
    await restored.start(); assert(restored.snapshot.entries.q1.document.html.includes('server'), 'remote restore');
  });
  await test('lost response retries same mutation, conflict never overwrites remote', async () => {
    const ids: string[] = []; let fail = true;
    const store = new NotesStore('retry', memory(), { read: async () => ({ notes: [] }), write: async (_, document, revision, id) => {
      ids.push(id); if (fail) { fail = false; throw Error('offline'); } return { document, revision: revision + 1 };
    } }, [q], crypto.randomUUID.bind(crypto));
    await store.start(); store.change(q.id, doc('kept')); await store.flush(); assert(store.snapshot.entries.q1.dirty, 'pending');
    await store.flush(); assert(ids.length === 2 && ids[0] === ids[1], 'same mutation');
    const conflicted = new NotesStore('conflict', memory(), { read: async () => ({ notes: [] }), write: async () => { throw { status: 409 }; } }, [q], crypto.randomUUID.bind(crypto));
    await conflicted.start(); conflicted.change(q.id, doc('mine')); await conflicted.flush(); await conflicted.flush();
    assert(conflicted.snapshot.entries.q1.conflict && conflicted.snapshot.entries.q1.dirty, 'conflict retained');
  });
  await test('offline edits cannot overwrite unseen remote; corrupt storage and tab changes block writes', async () => {
    const storage = memory(); let online = false; let writes = 0;
    const store = new NotesStore('offline', storage, { read: async () => { if (!online) throw Error('offline'); return { notes: [{ questionId: q.id, questionNumber: 139, part: 6, document: doc('other'), revision: 2 }] }; }, write: async (_, document) => { writes++; return { revision: 3, document }; } }, [q], crypto.randomUUID.bind(crypto));
    await store.start(); store.change(q.id, doc('mine')); online = true; await store.flush();
    assert(writes === 0 && store.snapshot.entries.q1.conflict, 'unknown remote protected');
    storage.setItem('broken', 'not json'); const broken = new NotesStore('broken', storage, {} as never, [q], crypto.randomUUID.bind(crypto));
    assert(broken.snapshot.blocked && !broken.change(q.id, doc('no')), 'corrupt blocked');
    store.changedElsewhere(); assert(store.snapshot.blocked && !store.change(q.id, doc('no')), 'tab blocked');
  });
  await test('recovery preserves a dirty draft if remote read fails; disk failures remain visible', async () => {
    const disk = memory(); let offline = false;
    const s = new NotesStore('recovery', disk, { read: async () => { if (offline) throw Error('offline'); return { notes: [] }; },
      write: async () => { throw Error('offline'); } }, [q], crypto.randomUUID.bind(crypto));
    await s.start(); s.change(q.id, doc('draft')); offline = true; await s.restore();
    assert(s.snapshot.entries.q1.document.html.includes('draft') && s.snapshot.entries.q1.dirty, 'draft retained');
    assert([...disk.data.keys()].some(k => k.includes(':recovery:')), 'recovery copy');
    const badDisk = new NotesStore('disk', { getItem: () => null, setItem: () => { throw Error('quota'); } }, {
      read: async () => ({ notes: [] }), write: async (_, document, revision) => ({ document, revision: revision + 1 }),
    }, [q], crypto.randomUUID.bind(crypto));
    await badDisk.start(); badDisk.change(q.id, doc('kept in memory')); await badDisk.flush();
    assert(badDisk.snapshot.localError && !badDisk.snapshot.entries.q1.dirty, 'DB saved, local failure still visible');
    await s.flush();
  });
  return { passed: results.length, results };
}
