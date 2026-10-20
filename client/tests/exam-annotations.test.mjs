import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptLegacy, deserialize, emptyDocument, historyStep, resolveQuote, serialize, storageKeyFor, MAX_ITEMS } from '../src/components/exam-annotations/model.ts';

const highlight = { id: 'one', kind: 'highlight', color: '#fbbf24', width: 2,
  anchor: { start: 0, end: 5, quote: 'Hello', prefix: '', suffix: ' world' } };
test('undo/redo restores whole edits; a new edit drops redo', () => {
  let state = { past: [], present: emptyDocument(), future: [] };
  state = historyStep(state, { type: 'edit', document: { ...state.present, items: [highlight] } });
  state = historyStep(state, { type: 'edit', document: { ...state.present, items: [] } });
  state = historyStep(state, { type: 'undo' });
  assert.equal(state.present.items.length, 1);
  state = historyStep(state, { type: 'undo' });
  assert.equal(state.present.items.length, 0);
  state = historyStep(state, { type: 'redo' });
  assert.equal(state.present.items.length, 1);
  state = historyStep(state, { type: 'edit', document: { ...state.present, note: 'Remember', review: true } });
  assert.equal(state.future.length, 0);
  assert.deepEqual(deserialize(serialize(state.present)), state.present);
});
test('corrupt, future, oversized and unsafe documents are refused', () => {
  for (const raw of ['{', JSON.stringify({ ...emptyDocument(), version: 2 }),
    JSON.stringify({ ...emptyDocument(), items: [highlight, highlight] }),
    JSON.stringify({ ...emptyDocument(), items: [{ ...highlight, color: 'url(x)' }] }),
    JSON.stringify({ ...emptyDocument(), items: Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({ ...highlight, id: `${i}` })) }),
    JSON.stringify({ ...emptyDocument(), items: [{ id: 'bad', kind: 'pen', color: '#123456', width: 2, block: { index: 0, fingerprint: 'x' }, points: [{ x: null, y: 0 }, { x: 1, y: 1 }] }] })]) {
    assert.throws(() => deserialize(raw));
  }
});
test('context recovers a shifted quote and refuses ambiguous relocation', () => {
  const anchor = { start: 1, end: 6, quote: 'Hello', prefix: '', suffix: ' world' };
  assert.deepEqual(resolveQuote('New: Hello world', anchor), [5, 10]);
  assert.equal(resolveQuote('Hello world Hello world', anchor), null);
  assert.equal(resolveQuote('Goodbye', anchor), null);
});
test('legacy import is read only and invalid offsets are ignored', () => {
  const legacy = [{ id: 'old', start: 0, end: 5, text: 'Hello', type: 'underline' }];
  const copy = structuredClone(legacy);
  const adapted = adaptLegacy(legacy);
  assert.equal(adapted[0].kind, 'underline');
  assert.deepEqual(legacy, copy);
  assert.equal(adaptLegacy([{ ...legacy[0], end: -1 }]).length, 0);
});
test('accounts, groups and scopes cannot collide through separators', () => {
  const keys = [storageKeyFor('a:b', 'c', 'd'), storageKeyFor('a', 'b:c', 'd'),
    storageKeyFor('a', 'b', 'c:d'), storageKeyFor('other', 'b', 'c:d')];
  assert.equal(new Set(keys).size, keys.length);
});
test('history is bounded and empty undo/redo is stable', () => {
  let state = { past: [], present: emptyDocument(), future: [] };
  assert.equal(historyStep(state, { type: 'undo' }), state);
  for (let i = 0; i < 100; i++) state = historyStep(state, { type: 'edit', document: { ...state.present, note: `${i}` } });
  assert.equal(state.past.length, 80);
});
