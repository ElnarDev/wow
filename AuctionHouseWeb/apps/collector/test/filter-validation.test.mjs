import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOptionalInteger, validRange } from '../../web/features/auction/filter-validation.js';

test('B03 validates optional numeric filters and rejects inverted ranges', () => {
  assert.equal(parseOptionalInteger(''), null);
  assert.equal(parseOptionalInteger('650'), 650);
  assert.equal(parseOptionalInteger('1.5'), null);
  assert.equal(validRange(650, 600), false);
  assert.equal(validRange(null, 600), true);
});
