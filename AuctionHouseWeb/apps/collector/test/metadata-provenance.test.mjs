import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('A04 identifies the build and source used for effective item level', async () => {
  const [domain, collector] = await Promise.all([
    readFile(new URL('../src/domain/item-variants.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../src/index.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(domain, /itemLevelDataSource = 'lib-bonus-id'/);
  assert.match(collector, /itemLevel: \{ source: itemLevelDataSource, build: itemLevelDataBuild \}/);
  assert.match(collector, /item: \{ source: credentialsPresent \? 'blizzard-static-api' : 'fixture' \}/);
});

test('A04 no longer infers crafting tier from items sharing a name', async () => {
  const collector = await readFile(new URL('../src/index.mjs', import.meta.url), 'utf8');
  const dashboard = await readFile(new URL('../../web/app/auction-dashboard.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(collector, /COUNT\(DISTINCT sibling\.item_level\)/);
  assert.doesNotMatch(dashboard, /craftingQualityByItem/);
});
