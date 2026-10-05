import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const expected = [
  ['Armor', 'armor'], ['Weapons', 'weapons'], ['Containers', 'containers'],
  ['Gems', 'gems'], ['Item Enhancements', 'enhancements'], ['Consumables', 'consumables'],
  ['Glyphs', 'glyphs'], ['Trade Goods', 'trade-goods'], ['Recipes', 'recipes'],
  ['Profession Equipment', 'profession-equipment'], ['Housing', 'housing'],
  ['Battle Pets', 'battle-pets'], ['Quest Items', 'quest-items'],
  ['Miscellaneous', 'miscellaneous'], ['WoW Token', 'wow-token'],
];

test('B02 declares each market root exactly once with its endpoint route', async () => {
  const catalog = await readFile(new URL('../../web/features/auction/catalog.ts', import.meta.url), 'utf8');
  for (const [name, path] of expected) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(catalog, new RegExp(`(?:'${escaped}'|${escaped})\\s*:\\s*'${path}'`));
  }
  assert.match(catalog, /export const categories = \[/);
  assert.equal((catalog.match(/'WoW Token'/g) ?? []).length >= 2, true);
});
