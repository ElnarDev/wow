import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeVariant } from '../src/domain/item-variants.mjs';

test('normalizeVariant produces the same key for equivalent unordered data', () => {
  const first = normalizeVariant({
    context: 5,
    bonus_lists: [6674, 42, 42],
    modifiers: [{ type: 28, value: 10 }, { type: 9, value: 3 }],
  });
  const second = normalizeVariant({
    context: 5,
    bonus_lists: [42, 6674],
    modifiers: [{ type: 9, value: 3 }, { type: 28, value: 10 }],
  });

  assert.equal(first.variantKey, second.variantKey);
  assert.deepEqual(first.bonusListIds, [42, 6674]);
  assert.deepEqual(first.tertiaryStats, [61]);
});

test('normalizeVariant removes invalid values and keeps a stable empty variant', () => {
  const variant = normalizeVariant({
    context: 'invalid',
    bonus_lists: [null, '7', 'invalid'],
    modifiers: [{ type: 'bad', value: 1 }, { type: 9, value: '2' }],
  });

  assert.equal(variant.itemContext, null);
  assert.deepEqual(variant.bonusListIds, [7]);
  assert.deepEqual(variant.modifiers, [{ type: 9, value: 2 }]);
});
