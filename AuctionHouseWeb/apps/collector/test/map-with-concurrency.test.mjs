import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapWithConcurrency } from '../src/utils/map-with-concurrency.mjs';

test('mapWithConcurrency preserves input order and respects its limit', async () => {
  let active = 0;
  let peak = 0;
  const values = [30, 5, 20, 1];

  const results = await mapWithConcurrency(values, 2, async (delay, index) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, delay));
    active -= 1;
    return `${index}:${delay}`;
  });

  assert.deepEqual(results, ['0:30', '1:5', '2:20', '3:1']);
  assert.equal(peak, 2);
});

test('mapWithConcurrency handles an empty collection', async () => {
  assert.deepEqual(await mapWithConcurrency([], 4, async (value) => value), []);
});
