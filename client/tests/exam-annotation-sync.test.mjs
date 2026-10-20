import test from 'node:test';
import assert from 'node:assert/strict';
import { AnnotationSync, canonical } from '../src/components/exam-annotations/sync.ts';
import { emptyDocument } from '../src/components/exam-annotations/model.ts';
const storage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), data };
};
const document = note => ({ ...emptyDocument(), note });
const uuid = () => crypto.randomUUID();
const tick = () => new Promise(r => setTimeout(r, 10));

test('existing local notes upload once without replacing a remote document', async () => {
  let remote = { document: null, revision: 0 }, writes = 0;
  const queue = new AnnotationSync('one', document('local'), true, storage(), {
    read: async () => remote,
    write: async (doc, revision) => { assert.equal(revision, 0); writes++; remote = { document: doc, revision: 1 }; return { revision: 1 }; },
  }, uuid);
  await queue.start(); await tick();
  assert.equal(writes, 1); assert.equal(queue.snapshot.status, 'saved');
  const conflict = new AnnotationSync('two', document('another local'), true, storage(), {
    read: async () => remote, write: async () => { throw Error('must not write'); },
  }, uuid);
  await conflict.start();
  assert.equal(conflict.snapshot.status, 'conflict');
  assert.equal(conflict.snapshot.document.note, 'another local');
});
test('a clean second device restores remote notes and does not write', async () => {
  const queue = new AnnotationSync('new', emptyDocument(), false, storage(), {
    read: async () => ({ document: document('from account'), revision: 5 }), write: async () => { throw Error('must not write'); },
  }, uuid);
  await queue.start();
  assert.equal(queue.snapshot.document.note, 'from account');
  assert.equal(queue.snapshot.dirty, false);
});
test('edits during an in-flight write are serialized and save the latest state', async () => {
  let release;
  const revisions = [];
  const queue = new AnnotationSync('race', emptyDocument(), false, storage(), {
    read: async () => ({ document: null, revision: 0 }),
    write: async (doc, revision) => { revisions.push([doc.note, revision]); if (revision === 0) await new Promise(r => { release = r; }); return { revision: revision + 1 }; },
  }, uuid);
  await queue.start(); queue.change(document('first')); const running = queue.flush();
  queue.change(document('latest')); release(); await running; await tick();
  assert.deepEqual(revisions, [['first', 0], ['latest', 1]]);
  assert.equal(queue.snapshot.dirty, false);
});
test('a failed response retries the identical mutation and does not drop local changes', async () => {
  const ids = []; let fail = true;
  const queue = new AnnotationSync('retry', emptyDocument(), false, storage(), {
    read: async () => ({ document: null, revision: 0 }),
    write: async (_doc, _revision, id) => { ids.push(id); if (fail) throw Error('offline'); return { revision: 1 }; },
  }, uuid);
  await queue.start(); queue.change(document('offline note')); await queue.flush();
  assert.equal(queue.snapshot.status, 'offline'); fail = false; await queue.retry();
  assert.equal(ids[0], ids[1]); assert.equal(queue.snapshot.status, 'saved');
});
test('reload recovers pending local state using acknowledged revision', async () => {
  const store = storage();
  store.setItem('reload:sync', JSON.stringify({ revision: 2, acknowledged: canonical(document('old')) }));
  let base;
  const queue = new AnnotationSync('reload', document('pending'), true, store, {
    read: async () => ({ document: document('old'), revision: 2 }),
    write: async (_doc, revision) => { base = revision; return { revision: 3 }; },
  }, uuid);
  await queue.start(); await tick(); assert.equal(base, 2);
});
test('conflict recovery backs up the local document before reading remote', async () => {
  const store = storage();
  const queue = new AnnotationSync('conflict', document('my local'), true, store, {
    read: async () => ({ document: document('other device'), revision: 7 }), write: async () => { throw Error('must not write'); },
  }, uuid);
  await queue.start(); await queue.loadServer();
  assert.equal(JSON.parse(store.getItem('conflict:recovery')).note, 'my local');
  assert.equal(queue.snapshot.document.note, 'other device');
});
test('JSON key order differences do not create false conflicts', async () => {
  const reordered = { review: false, note: 'same', items: [], version: 1 };
  const queue = new AnnotationSync('ordering', document('same'), true, storage(), {
    read: async () => ({ document: reordered, revision: 1 }), write: async () => { throw Error('must not write'); },
  }, uuid);
  await queue.start(); assert.equal(queue.snapshot.status, 'saved');
});
test('an old empty local cache must not hide annotations from another device', async () => {
  const queue = new AnnotationSync('empty-cache', emptyDocument(), true, storage(), {
    read: async () => ({ document: document('account notes'), revision: 2 }), write: async () => { throw Error('must not write'); },
  }, uuid);
  await queue.start(); assert.equal(queue.snapshot.document.note, 'account notes');
  assert.equal(queue.snapshot.status, 'saved');
});
test('editing while initial download is in flight never silently replaces local edits', async () => {
  let resolve;
  const queue = new AnnotationSync('during-read', emptyDocument(), false, storage(), {
    read: async () => new Promise(r => { resolve = r; }), write: async () => { throw Error('must not write'); },
  }, uuid);
  const downloading = queue.start(); queue.change(document('just typed'));
  resolve({ document: document('another device'), revision: 2 }); await downloading;
  assert.equal(queue.snapshot.document.note, 'just typed'); assert.equal(queue.snapshot.status, 'conflict');
});
