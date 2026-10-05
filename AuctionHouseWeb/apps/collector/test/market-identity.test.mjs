import assert from 'node:assert/strict';
import { test } from 'node:test';
import { favoriteRequestsParam } from '../src/domain/market-identity.mjs';
import { favoritesStorageVersion, marketKeyFor, parseStoredFavorites, serializeFavorites } from '../../web/features/auction/market-identity.js';

const firstVariant = 'a'.repeat(64);
const secondVariant = 'b'.repeat(64);

test('A01 gives independent technical identities to variants of the same item', () => {
  assert.notEqual(marketKeyFor(19019, firstVariant), marketKeyFor(19019, secondVariant));
  assert.equal(marketKeyFor(19019, firstVariant), `19019:${firstVariant}`);
});

test('A01 migrates an item-only favorite without dropping it', () => {
  const favorites = parseStoredFavorites(JSON.stringify([
    { itemId: 19019, category: 'Weapons', name: 'Thunderfury', addedAt: '2026-09-26T00:00:00.000Z' },
  ]));
  assert.deepEqual(favorites, [{
    itemId: 19019,
    variantKey: null,
    marketKey: '19019:*',
    category: 'Weapons',
    name: 'Thunderfury',
    addedAt: '2026-09-26T00:00:00.000Z',
  }]);
});

test('A01 retains two variants and the collector accepts their exact identities', () => {
  const favorites = parseStoredFavorites(JSON.stringify([
    { itemId: 19019, variantKey: firstVariant, category: 'Weapons', name: 'Thunderfury', addedAt: '2026-09-26T00:00:00.000Z' },
    { itemId: 19019, variantKey: secondVariant, category: 'Weapons', name: 'Thunderfury', addedAt: '2026-09-26T00:00:01.000Z' },
  ]));
  assert.equal(favorites.length, 2);
  const requests = favoriteRequestsParam(new URLSearchParams({ favorites: favorites.map((favorite) => favorite.marketKey).join(',') }));
  assert.deepEqual(requests.map(({ itemId, variantKey }) => ({ itemId, variantKey })), [
    { itemId: 19019, variantKey: firstVariant },
    { itemId: 19019, variantKey: secondVariant },
  ]);
});

test('B01 stores favorites in a versioned envelope while retaining legacy arrays', () => {
  const favorite = { itemId: 19019, variantKey: firstVariant, category: 'Weapons', name: 'Thunderfury', addedAt: '2026-09-26T00:00:00.000Z' };
  const serialized = serializeFavorites(parseStoredFavorites(JSON.stringify([favorite])));
  assert.equal(JSON.parse(serialized).version, favoritesStorageVersion);
  assert.equal(parseStoredFavorites(serialized)[0].marketKey, `19019:${firstVariant}`);
  assert.equal(parseStoredFavorites(JSON.stringify([favorite]))[0].marketKey, `19019:${firstVariant}`);
});
