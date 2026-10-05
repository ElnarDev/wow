import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeRealms,
  parseRealmId,
  selectInitialRealm,
} from '../../web/features/auction/realm-selection.js';

const realms = [
  { id: 3676, name: 'Area 52', isDefault: true },
  { id: 3721, name: 'Stormrage', isDefault: false },
];

test('A02 normalizes PostgreSQL BIGINT realm IDs without accepting invalid values', () => {
  assert.equal(parseRealmId('3676'), 3676);
  assert.equal(parseRealmId(''), null);
  assert.equal(parseRealmId('3.5'), null);
  assert.equal(parseRealmId('-1'), null);
  assert.equal(parseRealmId('9007199254740992'), null);
  assert.deepEqual(normalizeRealms([
    { id: '3676', name: ' Area 52 ', isDefault: true },
    { id: '3676', name: 'Duplicate', isDefault: false },
    { id: 'bad', name: 'Invalid', isDefault: false },
  ]), [{ id: 3676, name: 'Area 52', isDefault: true }]);
});

test('A02 initializes realms in URL, saved-preference, default order', () => {
  assert.deepEqual(selectInitialRealm(realms, '3721', '3676'), {
    realmId: 3721, source: 'url', invalidUrl: false,
  });
  assert.deepEqual(selectInitialRealm(realms, null, '3721'), {
    realmId: 3721, source: 'saved', invalidUrl: false,
  });
  assert.deepEqual(selectInitialRealm(realms, null, 'missing'), {
    realmId: 3676, source: 'default', invalidUrl: false,
  });
});

test('A02 falls back with an explanation signal for an invalid explicit URL realm', () => {
  assert.deepEqual(selectInitialRealm(realms, '9999', '3721'), {
    realmId: 3721, source: 'saved', invalidUrl: true,
  });
  assert.deepEqual(selectInitialRealm([], '9999', '3721'), {
    realmId: null, source: 'none', invalidUrl: true,
  });
});
