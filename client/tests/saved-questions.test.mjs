import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSavedQuestions, toggleSavedQuestion } from '../src/utils/savedQuestions.ts';

test('corrupt or incompatible bookmarks cannot be overwritten by a toggle', () => {
  for (const raw of ['broken', 'null', '[]', '{"q":"true"}']) {
    let writes = 0;
    const storage = { getItem: () => raw, setItem: () => writes++ };
    assert.throws(() => toggleSavedQuestion(storage, 'key', 'new-question'));
    assert.equal(writes, 0);
  }
});

test('each toggle reads the latest list and preserves other questions/accounts', () => {
  const data = new Map([['other-account', '{"other":true}']]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, raw) => data.set(key, raw) };
  toggleSavedQuestion(storage, 'account', 'a');
  toggleSavedQuestion(storage, 'account', 'b');
  toggleSavedQuestion(storage, 'account', 'a');
  assert.deepEqual(JSON.parse(data.get('account')), { b: true });
  assert.equal(data.get('other-account'), '{"other":true}');
});

test('prototype-like question IDs are normal IDs; failed writes report failure', () => {
  const parsed = parseSavedQuestions('{"__proto__":true,"constructor":true,"old":false}');
  assert.equal(Object.getPrototypeOf(parsed), null);
  assert.equal(parsed.__proto__, true);
  assert.equal(parsed.toString, undefined);
  assert.equal(parsed.old, undefined);
  assert.throws(() => toggleSavedQuestion({ getItem: () => '{}', setItem: () => { throw Error('quota'); } }, 'account', 'q'), /quota/);
});
