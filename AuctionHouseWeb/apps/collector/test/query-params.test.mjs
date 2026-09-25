import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boundedIntegerParam, integerListParam, integerParam, positiveIntegerParam } from '../src/http/query-params.mjs';

test('integerParam rejects missing and non-integer values', () => {
  assert.equal(integerParam(new URLSearchParams('value=12'), 'value'), 12);
  assert.equal(integerParam(new URLSearchParams('value=1.5'), 'value'), null);
  assert.equal(integerParam(new URLSearchParams('value=nope'), 'value'), null);
  assert.equal(positiveIntegerParam(new URLSearchParams('value=0'), 'value'), null);
});

test('integerListParam removes invalid values and duplicates', () => {
  const params = new URLSearchParams('ids=4,2,4,-1,bad,8');
  assert.deepEqual(integerListParam(params, 'ids', { positive: true, limit: 2 }), [4, 2]);
});

test('boundedIntegerParam applies fallback and limits', () => {
  const options = { minimum: 10, maximum: 500, fallback: 100 };
  assert.equal(boundedIntegerParam(new URLSearchParams('limit=900'), 'limit', options), 500);
  assert.equal(boundedIntegerParam(new URLSearchParams(), 'limit', options), 100);
});
