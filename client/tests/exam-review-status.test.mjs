import test from 'node:test';
import assert from 'node:assert/strict';
import { loadReviewStatus, REVIEW_BATCH_SIZE } from '../src/components/exam-annotations/reviewStatus.ts';

test('large Level sessions are split into bounded sequential batches without dropping groups', async () => {
  const groups = Array.from({ length: 503 }, (_, i) => `group-${i}`);
  const batches = []; let active = 0;
  const result = await loadReviewStatus(groups, async batch => {
    active++; assert.equal(active, 1);
    assert.ok(batch.length <= REVIEW_BATCH_SIZE);
    batches.push(batch.length);
    await Promise.resolve(); active--;
    return { groups: batch.map(group => ({ group, review: group === 'group-502', revision: 1 })) };
  });
  assert.deepEqual(batches, [200, 200, 103]);
  assert.equal(result.length, 503);
  assert.equal(result.at(-1).review, true);
});

test('empty lists make no request; duplicate keys are queried only once', async () => {
  assert.deepEqual(await loadReviewStatus([], () => { throw Error('must not request'); }), []);
  const result = await loadReviewStatus(['a', 'a', 'b'], async batch => {
    assert.deepEqual(batch, ['a', 'b']);
    return { groups: batch.map(group => ({ group, review: false, revision: 0 })) };
  });
  assert.equal(result.length, 2);
});

test('failed or incomplete later batches do not appear as a successful partial list', async () => {
  const groups = Array.from({ length: 201 }, (_, i) => `g${i}`);
  await assert.rejects(loadReviewStatus(groups, async batch => {
    if (batch.length === 1) throw Error('offline');
    return { groups: batch.map(group => ({ group, review: false, revision: 0 })) };
  }), /offline/);
  await assert.rejects(loadReviewStatus(['a'], async () => ({ groups: [] })), /Chưa tải đủ/);
  await assert.rejects(loadReviewStatus(['a'], async () => ({ groups: [{ group: 'other', review: false, revision: 0 }] })), /không hợp lệ/);
});
