import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeSearchState } from '../../web/features/auction/navigation-state.js';

test('B05 serializes realm and active filters without empty parameters', () => {
  const url = writeSearchState(new URL('https://example.test/'), 3676, { category: 'Armor', query: 'helm', group: null, leaf: null, expansionId: 10, minLevel: 600, maxLevel: null, minQuality: 3, maxQuality: null, includeOutOfStock: false, sort: 'price', direction: 'asc' });
  assert.equal(url.searchParams.get('realm'), '3676');
  assert.equal(url.searchParams.get('category'), 'Armor');
  assert.equal(url.searchParams.get('minLevel'), '600');
  assert.equal(url.searchParams.has('maxLevel'), false);
});
