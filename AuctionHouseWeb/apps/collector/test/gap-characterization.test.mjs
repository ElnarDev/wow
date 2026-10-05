import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const collectorSource = new URL('../src/index.mjs', import.meta.url);
const webTypesSource = new URL('../../web/features/auction/types.ts', import.meta.url);
const webCatalogSource = new URL('../../web/features/auction/catalog.ts', import.meta.url);

async function sources() {
  const [collector, types, catalog] = await Promise.all([
    readFile(collectorSource, 'utf8'),
    readFile(webTypesSource, 'utf8'),
    readFile(webCatalogSource, 'utf8'),
  ]);
  return { collector, types, catalog };
}

test('A01: stored favorites contain a market identity in addition to their item grouping', async () => {
  const { types } = await sources();

  assert.match(types, /marketKey: string;/);
  assert.match(types, /variantKey: string \| null;/);
});

test('B02 resolves H03: an absent item class has an explicit Miscellaneous fallback', async () => {
  const { catalog } = await sources();

  assert.match(catalog, /itemClassId === null \|\| itemClassId === undefined\) return 'Miscellaneous'/);
});

test('A06 baseline H04: the web contract expects numeric realm IDs while the database exposes BIGINT', async () => {
  const { collector, types } = await sources();

  assert.match(types, /export type Realm = \{ id: number; name: string; isDefault: boolean \};/);
  assert.match(collector, /CREATE TABLE IF NOT EXISTS realms \(id BIGINT PRIMARY KEY/);
  assert.match(collector, /SELECT id, display_name AS name, is_default AS "isDefault"/);
});

test('A06 baseline H06: history is ordered from oldest first and capped at 1000 points', async () => {
  const { collector } = await sources();

  const historyHandler = collector.slice(collector.indexOf('const historyMatch'), collector.indexOf('const comparisonMatch'));
  assert.match(historyHandler, /ORDER BY r\.started_at ASC LIMIT 1000/g);
});

test('A01 resolves H08: an item summary derives level and price from the same cheapest variant', async () => {
  const { collector } = await sources();

  assert.match(collector, /array_agg\(v\.effective_item_level ORDER BY p\.min_buyout_copper,v\.id\)\)\[1\],MIN\(p\.min_buyout_copper\)/);
  assert.doesNotMatch(collector, /MAX\(v\.effective_item_level\),MIN\(p\.min_buyout_copper\)/);
});
