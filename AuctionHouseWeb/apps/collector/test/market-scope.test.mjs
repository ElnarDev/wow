import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('A03 persists connected and regional markets as distinct complete runs', async () => {
  const source = await readFile(new URL('../src/index.mjs', import.meta.url), 'utf8');
  assert.match(source, /market_scope TEXT NOT NULL DEFAULT 'connected'/);
  assert.match(source, /processed_at TIMESTAMPTZ/);
  assert.match(source, /is_complete BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(source, /collectMarket\('regional', commodities\)/);
  assert.match(source, /collectMarket\('connected', auctions\)/);
  assert.match(source, /status='succeeded',processed_at=NOW\(\),is_complete=TRUE/);
});

test('A03 keeps a regional snapshot out of connected-realm freshness checks', async () => {
  const source = await readFile(new URL('../src/index.mjs', import.meta.url), 'utf8');
  assert.match(source, /WHERE connected_realm_id=\$1 AND market_scope=\$2 AND status='succeeded'/);
  assert.match(source, /market_scope='connected' AND connected_realm_id=\$1\) OR market_scope='regional'/);
});

test('summary migration backfills the latest successful capture of every market', async () => {
  const source = await readFile(new URL('../src/index.mjs', import.meta.url), 'utf8');
  const migration = source.slice(
    source.indexOf('INSERT INTO market_item_summaries'),
    source.indexOf('const missingLevels'),
  );
  assert.match(migration, /WHERE p\.ingestion_run_id IN \(/);
  assert.match(migration, /SELECT DISTINCT ON \(market_scope,connected_realm_id\) id FROM ingestion_runs/);
  assert.match(migration, /WHERE status='succeeded' ORDER BY market_scope,connected_realm_id,started_at DESC/);
  assert.match(migration, /NOT EXISTS \(SELECT 1 FROM market_item_summaries/);
  assert.match(migration, /ON CONFLICT DO NOTHING/);
});
