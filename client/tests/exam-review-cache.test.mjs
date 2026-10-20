import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDocument, serialize, storageKeyFor } from '../src/components/exam-annotations/model.ts';
import { canonical } from '../src/components/exam-annotations/sync.ts';
import { readReviewCache } from '../src/components/exam-annotations/reviewCache.ts';

test('pending review marks in unmounted groups survive reload, including pending unmark', () => {
  const data = new Map();
  for (const [group, review] of [['marked', true], ['unmarked', false]]) {
    const key = storageKeyFor('u', 's', group);
    data.set(key, serialize({ ...emptyDocument(), review }));
    data.set(`${key}:sync`, JSON.stringify({ revision: 4, acknowledged: canonical({ ...emptyDocument(), review: !review }) }));
  }
  const result = readReviewCache('u', 's', ['marked', 'unmarked'], { getItem: key => data.get(key) ?? null });
  assert.deepEqual(result.get('marked'), { review: true, revision: 4, dirty: true });
  assert.deepEqual(result.get('unmarked'), { review: false, revision: 4, dirty: true });
  assert.equal(readReviewCache('other', 's', ['marked'], { getItem: key => data.get(key) ?? null }).size, 0);
});

test('clean cached marks retain revision precedence; corrupt cache is ignored', () => {
  const doc = { ...emptyDocument(), review: true };
  const key = storageKeyFor('u', 's', 'g');
  const data = new Map([[key, serialize(doc)], [`${key}:sync`, JSON.stringify({ revision: 7, acknowledged: canonical(doc) })]]);
  assert.deepEqual(readReviewCache('u', 's', ['g'], { getItem: k => data.get(k) ?? null }).get('g'), { review: true, revision: 7, dirty: false });
  data.set(key, '{bad');
  assert.equal(readReviewCache('u', 's', ['g'], { getItem: k => data.get(k) ?? null }).size, 0);
});
