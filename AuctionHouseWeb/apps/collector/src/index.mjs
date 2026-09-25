import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { blizzardApi as api, getAccessToken as token } from './blizzard/client.mjs';
import { hasItemEraData, syncItemEraData } from './catalog/item-era.mjs';
import { getItemMetadata } from './catalog/item-metadata.mjs';
import { shouldSynchronizeRealms, synchronizeUsRealms } from './catalog/realms.mjs';
import { collectWowToken } from './catalog/wow-token.mjs';
import { collectionIntervalMinutes, comparisonRealmSlugs, credentialsPresent, itemMetadataConcurrency, port, realmSlug, region } from './config.mjs';
import { pool } from './database.mjs';
import { effectiveItemLevel, itemLevelDataBuild, normalizeVariant } from './domain/item-variants.mjs';
import { sendJson } from './http/json-response.mjs';
import { boundedIntegerParam, integerListParam, integerParam } from './http/query-params.mjs';
import { mapWithConcurrency } from './utils/map-with-concurrency.mjs';

let latest = { status: 'starting', mode: credentialsPresent ? 'blizzard' : 'fixture', processedAt: null, armorListings: 0, detail: null, targetRealm: null, comparisonTargets: comparisonRealmSlugs.length, progress: { stage: 'Starting collector', current: 0, total: 1 } };
let isCollecting = false;

async function setupSchema() {
  await pool.query(`ALTER TABLE connected_realms ADD COLUMN IF NOT EXISTS comparison_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    CREATE TABLE IF NOT EXISTS realms (id BIGINT PRIMARY KEY, connected_realm_id BIGINT NOT NULL REFERENCES connected_realms(id), region TEXT NOT NULL DEFAULT 'us' CHECK (region = 'us'), slug TEXT NOT NULL, display_name TEXT NOT NULL, is_default BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE UNIQUE INDEX IF NOT EXISTS realms_slug_region_idx ON realms (region, slug);
    CREATE UNIQUE INDEX IF NOT EXISTS one_default_us_visible_realm ON realms (region) WHERE is_default;
    CREATE TABLE IF NOT EXISTS items (id BIGINT PRIMARY KEY, name TEXT NOT NULL, item_class_id INTEGER NOT NULL, item_subclass_id INTEGER, inventory_type TEXT, metadata_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE items ADD COLUMN IF NOT EXISTS item_level INTEGER;
    ALTER TABLE items ADD COLUMN IF NOT EXISTS required_level INTEGER;
    ALTER TABLE items ADD COLUMN IF NOT EXISTS quality_type TEXT;
    ALTER TABLE items ADD COLUMN IF NOT EXISTS quality_rank INTEGER;
    ALTER TABLE items ADD COLUMN IF NOT EXISTS expansion_id INTEGER;
    ALTER TABLE items ADD COLUMN IF NOT EXISTS name_es_mx TEXT;
    CREATE INDEX IF NOT EXISTS items_armor_filters_idx ON items (item_class_id, expansion_id, quality_rank, item_level);
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE INDEX IF NOT EXISTS items_name_es_mx_search_idx ON items USING GIN (name_es_mx gin_trgm_ops);
    CREATE TABLE IF NOT EXISTS price_snapshots (ingestion_run_id BIGINT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE, item_id BIGINT NOT NULL REFERENCES items(id), min_buyout_copper BIGINT NOT NULL, quantity BIGINT NOT NULL, listing_count INTEGER NOT NULL, PRIMARY KEY (ingestion_run_id,item_id));
    CREATE INDEX IF NOT EXISTS price_snapshots_item_run_idx ON price_snapshots (item_id, ingestion_run_id DESC);
    CREATE TABLE IF NOT EXISTS auction_variants (id BIGSERIAL PRIMARY KEY, item_id BIGINT NOT NULL REFERENCES items(id), variant_key TEXT NOT NULL, item_context INTEGER, bonus_list_ids INTEGER[] NOT NULL DEFAULT '{}', modifiers JSONB NOT NULL DEFAULT '[]', tertiary_stats INTEGER[] NOT NULL DEFAULT '{}', UNIQUE(item_id,variant_key));
    ALTER TABLE auction_variants ADD COLUMN IF NOT EXISTS effective_item_level INTEGER;
    CREATE INDEX IF NOT EXISTS auction_variants_effective_level_idx ON auction_variants (effective_item_level);
    CREATE TABLE IF NOT EXISTS variant_price_snapshots (ingestion_run_id BIGINT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE, variant_id BIGINT NOT NULL REFERENCES auction_variants(id), min_buyout_copper BIGINT NOT NULL, quantity BIGINT NOT NULL, listing_count INTEGER NOT NULL, PRIMARY KEY(ingestion_run_id,variant_id));
    CREATE INDEX IF NOT EXISTS variant_price_snapshots_variant_run_idx ON variant_price_snapshots (variant_id, ingestion_run_id DESC);
    CREATE INDEX IF NOT EXISTS auction_variants_tertiary_stats_idx ON auction_variants USING GIN (tertiary_stats);
    CREATE TABLE IF NOT EXISTS variant_price_levels (ingestion_run_id BIGINT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE, variant_id BIGINT NOT NULL REFERENCES auction_variants(id), unit_price_copper BIGINT NOT NULL, quantity BIGINT NOT NULL, listing_count INTEGER NOT NULL, PRIMARY KEY(ingestion_run_id,variant_id,unit_price_copper));
    CREATE INDEX IF NOT EXISTS variant_price_levels_variant_run_idx ON variant_price_levels (variant_id, ingestion_run_id DESC, unit_price_copper);
    CREATE TABLE IF NOT EXISTS market_item_summaries (ingestion_run_id BIGINT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,item_id BIGINT NOT NULL REFERENCES items(id),variant_id BIGINT NOT NULL REFERENCES auction_variants(id),effective_item_level INTEGER,min_buyout_copper BIGINT NOT NULL,quantity BIGINT NOT NULL,listing_count INTEGER NOT NULL,PRIMARY KEY(ingestion_run_id,item_id));
    CREATE INDEX IF NOT EXISTS market_item_summaries_run_sort_idx ON market_item_summaries (ingestion_run_id,min_buyout_copper,quantity,listing_count);
    CREATE TABLE IF NOT EXISTS wow_token_snapshots (id BIGSERIAL PRIMARY KEY,price_copper BIGINT NOT NULL,provider_updated_at TIMESTAMPTZ,captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS wow_token_snapshots_captured_at_idx ON wow_token_snapshots (captured_at DESC);`);
  await pool.query("UPDATE realms SET slug='fixture-area-52', updated_at=NOW() WHERE id=0 AND region='us' AND slug='area-52'");
  await pool.query(`INSERT INTO market_item_summaries (ingestion_run_id,item_id,variant_id,effective_item_level,min_buyout_copper,quantity,listing_count)
    SELECT p.ingestion_run_id,v.item_id,(array_agg(v.id ORDER BY p.min_buyout_copper,v.id))[1],MAX(v.effective_item_level),MIN(p.min_buyout_copper),SUM(p.quantity),SUM(p.listing_count)::INTEGER
    FROM variant_price_snapshots p JOIN auction_variants v ON v.id=p.variant_id
    WHERE p.ingestion_run_id=(SELECT id FROM ingestion_runs WHERE status='succeeded' ORDER BY started_at DESC LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM market_item_summaries s WHERE s.ingestion_run_id=p.ingestion_run_id AND s.item_id=v.item_id)
    GROUP BY p.ingestion_run_id,v.item_id ON CONFLICT DO NOTHING`);
  const missingLevels = await pool.query(`SELECT id,item_id AS "itemId",bonus_list_ids AS "bonusListIds",modifiers FROM auction_variants WHERE effective_item_level IS NULL`);
  const updates = missingLevels.rows.map((variant) => ({ id: variant.id, effective_item_level: effectiveItemLevel(variant.itemId, variant.bonusListIds, variant.modifiers) }));
  for (let offset = 0; offset < updates.length; offset += 5000) await pool.query(`UPDATE auction_variants SET effective_item_level=data.effective_item_level FROM jsonb_to_recordset($1::JSONB) AS data(id BIGINT,effective_item_level INTEGER) WHERE auction_variants.id=data.id`, [JSON.stringify(updates.slice(offset, offset + 5000))]);
}

async function persistSnapshot(realmId, auctions, accessToken, sourceLastModified = null) {
  const run = await pool.query("INSERT INTO ingestion_runs (connected_realm_id,status,source_last_modified) VALUES ($1,'running',$2) RETURNING id", [realmId, sourceLastModified]);
  const aggregate = new Map();
  const variantAggregate = new Map();
  const metadataByItemId = new Map();
  let localizedItemIds = [];
  let newMetadataCount = 0;
  // A category is only trustworthy when every auction item is classified.
  // Resolve the entire unique-item set, using the local cache for prior captures.
  if (accessToken && auctions.length) {
    const itemIds = [...new Set(auctions.map((auction) => Number(auction.item?.id ?? auction.itemId)).filter((id) => Number.isSafeInteger(id) && id > 0))];
    localizedItemIds = itemIds;
    const cached = await pool.query('SELECT id,name,item_class_id AS "itemClassId",item_subclass_id AS "itemSubclassId",inventory_type AS "inventoryType",item_level AS "itemLevel",required_level AS "requiredLevel",quality_type AS "qualityType",quality_rank AS "qualityRank",expansion_id AS "expansionId" FROM items WHERE id=ANY($1::BIGINT[]) AND item_level IS NOT NULL AND quality_type IS NOT NULL', [itemIds]);
    for (const item of cached.rows) metadataByItemId.set(Number(item.id), item);
    const missingIds = itemIds.filter((itemId) => !metadataByItemId.has(itemId));
    let completed = itemIds.length - missingIds.length;
    latest = { ...latest, progress: { stage: 'Hydrating item metadata', current: completed, total: itemIds.length } };
    await mapWithConcurrency(missingIds, itemMetadataConcurrency, async (itemId) => {
      const item = await getItemMetadata(itemId, accessToken);
      metadataByItemId.set(itemId, item);
      newMetadataCount += item ? 1 : 0;
      completed += 1;
      latest = { ...latest, progress: { stage: 'Hydrating item metadata', current: completed, total: itemIds.length } };
    });
  }
  latest = { ...latest, progress: { stage: 'Writing price snapshot', current: 0, total: 1 } };
  for (const auction of auctions) {
    const itemId = auction.item?.id ?? auction.itemId;
    const buyout = auction.buyout ?? 0;
    const quantity = auction.quantity ?? 1;
    const unitPrice = auction.unit_price ?? (buyout ? Math.floor(buyout / quantity) : 0);
    if (!itemId || !unitPrice) continue;
    let item = metadataByItemId.get(itemId);
    if (accessToken && !metadataByItemId.has(itemId)) continue;
    if (!item && accessToken) continue;
    if (!item) {
      item = {
        id: itemId, name: auction.name ?? `Fixture ${itemId}`, itemClassId: auction.itemClassId,
        itemSubclassId: auction.itemSubclassId ?? null, inventoryType: auction.inventoryType ?? null,
        itemLevel: auction.itemLevel ?? null, requiredLevel: auction.requiredLevel ?? null,
        qualityType: auction.qualityType ?? null, qualityRank: auction.qualityRank ?? null,
        expansionId: auction.expansionId ?? null,
      };
      metadataByItemId.set(itemId, item);
    }
    const unit = unitPrice;
    const current = aggregate.get(itemId) ?? { min: unit, quantity: 0, listings: 0 };
    current.min = Math.min(current.min, unit); current.quantity += quantity; current.listings += 1; aggregate.set(itemId, current);
    const variant = normalizeVariant(auction.item ?? { id: itemId });
    const aggregateKey = `${itemId}:${variant.variantKey}`;
    const currentVariant = variantAggregate.get(aggregateKey) ?? { ...variant, itemId, min: unit, quantity: 0, listings: 0, levels: new Map() };
    currentVariant.min = Math.min(currentVariant.min, unit); currentVariant.quantity += quantity; currentVariant.listings += 1;
    const level = currentVariant.levels.get(unit) ?? { unit_price_copper: unit, quantity: 0, listing_count: 0 };
    level.quantity += quantity; level.listing_count += 1; currentVariant.levels.set(unit, level);
    variantAggregate.set(aggregateKey, currentVariant);
    if (!accessToken) await pool.query(`INSERT INTO items (id,name,item_class_id,item_subclass_id,inventory_type,item_level,required_level,quality_type,quality_rank,expansion_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,item_class_id=EXCLUDED.item_class_id,item_subclass_id=EXCLUDED.item_subclass_id,inventory_type=EXCLUDED.inventory_type,item_level=EXCLUDED.item_level,required_level=EXCLUDED.required_level,quality_type=EXCLUDED.quality_type,quality_rank=EXCLUDED.quality_rank,expansion_id=EXCLUDED.expansion_id,metadata_fetched_at=NOW()`, [item.id, item.name, item.itemClassId, item.itemSubclassId, item.inventoryType, item.itemLevel, item.requiredLevel, item.qualityType, item.qualityRank, item.expansionId]);
  }
  for (const [itemId, value] of aggregate) await pool.query('INSERT INTO price_snapshots (ingestion_run_id,item_id,min_buyout_copper,quantity,listing_count) VALUES ($1,$2,$3,$4,$5)', [run.rows[0].id, itemId, value.min, value.quantity, value.listings]);
  const variantRows = [...variantAggregate.values()].map((value) => ({
    item_id: value.itemId, variant_key: value.variantKey, item_context: value.itemContext, bonus_list_ids: value.bonusListIds,
    modifiers: value.modifiers, tertiary_stats: value.tertiaryStats, effective_item_level: effectiveItemLevel(value.itemId, value.bonusListIds, value.modifiers), min_buyout_copper: value.min, quantity: value.quantity, listing_count: value.listings,
    levels: [...value.levels.values()],
  }));
  for (let offset = 0; offset < variantRows.length; offset += 1000) {
    await pool.query(`WITH input AS (
        SELECT * FROM jsonb_to_recordset($2::jsonb) AS x(item_id BIGINT, variant_key TEXT, item_context INTEGER, bonus_list_ids INTEGER[], modifiers JSONB, tertiary_stats INTEGER[], effective_item_level INTEGER, min_buyout_copper BIGINT, quantity BIGINT, listing_count INTEGER, levels JSONB)
      ), saved AS (
        INSERT INTO auction_variants (item_id,variant_key,item_context,bonus_list_ids,modifiers,tertiary_stats,effective_item_level)
        SELECT item_id,variant_key,item_context,bonus_list_ids,modifiers,tertiary_stats,effective_item_level FROM input
        ON CONFLICT (item_id,variant_key) DO UPDATE SET item_context=EXCLUDED.item_context, bonus_list_ids=EXCLUDED.bonus_list_ids, modifiers=EXCLUDED.modifiers, tertiary_stats=EXCLUDED.tertiary_stats, effective_item_level=EXCLUDED.effective_item_level
        RETURNING id,item_id,variant_key
      ), snapshots AS (
        INSERT INTO variant_price_snapshots (ingestion_run_id,variant_id,min_buyout_copper,quantity,listing_count)
        SELECT $1,s.id,i.min_buyout_copper,i.quantity,i.listing_count FROM input i JOIN saved s USING(item_id,variant_key)
        RETURNING variant_id
      ), level_input AS (
        SELECT i.item_id,i.variant_key,(level->>'unit_price_copper')::BIGINT AS unit_price_copper,
          (level->>'quantity')::BIGINT AS quantity,(level->>'listing_count')::INTEGER AS listing_count
        FROM input i CROSS JOIN LATERAL jsonb_array_elements(i.levels) level
      )
      INSERT INTO variant_price_levels (ingestion_run_id,variant_id,unit_price_copper,quantity,listing_count)
      SELECT $1,s.id,l.unit_price_copper,l.quantity,l.listing_count FROM level_input l JOIN saved s USING(item_id,variant_key)`, [run.rows[0].id, JSON.stringify(variantRows.slice(offset, offset + 1000))]);
  }
  await pool.query(`INSERT INTO market_item_summaries (ingestion_run_id,item_id,variant_id,effective_item_level,min_buyout_copper,quantity,listing_count)
    SELECT $1,v.item_id,(array_agg(v.id ORDER BY p.min_buyout_copper,v.id))[1],MAX(v.effective_item_level),MIN(p.min_buyout_copper),SUM(p.quantity),SUM(p.listing_count)::INTEGER
    FROM variant_price_snapshots p JOIN auction_variants v ON v.id=p.variant_id
    WHERE p.ingestion_run_id=$1 GROUP BY v.item_id`, [run.rows[0].id]);
  await pool.query("UPDATE ingestion_runs SET status='succeeded' WHERE id=$1", [run.rows[0].id]);
  if (accessToken && localizedItemIds.length) void syncSpanishItemNames(localizedItemIds, accessToken).catch((error) => console.warn(`spanish_item_index_skipped: ${error.message}`));
  latest = { ...latest, progress: { stage: 'Writing price snapshot', current: 1, total: 1 } };
  return { armorListings: aggregate.size, armorVariants: variantAggregate.size, newMetadataCount };
}

async function collectFixture() {
  const fixture = JSON.parse(await readFile(new URL('../fixtures/area-52-auctions.json', import.meta.url), 'utf8'));
  const realmId = 0;
  await pool.query('UPDATE connected_realms SET is_default=FALSE WHERE region=$1', [region]);
  await pool.query('UPDATE realms SET is_default=FALSE WHERE region=$1', [region]);
  await pool.query("INSERT INTO connected_realms (id,region,display_name,is_default) VALUES (0,'us','Area 52 (fixture)',true) ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name,is_default=EXCLUDED.is_default,updated_at=NOW()");
  await pool.query("INSERT INTO realms (id,connected_realm_id,region,slug,display_name,is_default) VALUES (0,0,'us','fixture-area-52','Area 52 (fixture)',true) ON CONFLICT (id) DO UPDATE SET connected_realm_id=EXCLUDED.connected_realm_id,slug=EXCLUDED.slug,display_name=EXCLUDED.display_name,is_default=EXCLUDED.is_default,updated_at=NOW()");
  return persistSnapshot(realmId, fixture.auctions, null);
}

async function spanishItemName(itemId, fallback, accessToken) {
  const cached = await pool.query('SELECT name_es_mx FROM items WHERE id=$1', [itemId]);
  if (cached.rows[0]?.name_es_mx?.trim()) return cached.rows[0].name_es_mx;
  try {
    const item = await api(`/data/wow/item/${itemId}?namespace=static-${region}&locale=es_MX`, accessToken);
    const name = typeof item.name === 'string' && item.name.trim() ? item.name : fallback;
    await pool.query('UPDATE items SET name_es_mx=$2 WHERE id=$1', [itemId, name]);
    return name;
  } catch (error) {
    console.warn(`spanish_item_name_unavailable item=${itemId}: ${error.message}`);
    return fallback;
  }
}

async function syncSpanishItemNames(itemIds, accessToken) {
  if (!accessToken || !itemIds.length) return;
  const pending = await pool.query(`SELECT id,name FROM items WHERE id=ANY($1::BIGINT[]) AND COALESCE(name_es_mx,'')=''`, [itemIds]);
  let completed = itemIds.length - pending.rowCount;
  latest = { ...latest, progress: { stage: 'Indexing Spanish item names', current: completed, total: itemIds.length } };
  await mapWithConcurrency(pending.rows, itemMetadataConcurrency, async ({ id, name }) => {
    const spanishName = await spanishItemName(id, name, accessToken);
    if (spanishName === name) await pool.query('UPDATE items SET name_es_mx=$2 WHERE id=$1 AND COALESCE(name_es_mx,\'\')=\'\'', [id, name]);
    completed += 1;
    latest = { ...latest, progress: { stage: 'Indexing Spanish item names', current: completed, total: itemIds.length } };
  });
}

async function collectBlizzard() {
  const accessToken = await token();
  try { await collectWowToken(accessToken); } catch (error) { console.warn(`wow_token_sync_skipped: ${error.message}`); }
  if (shouldSynchronizeRealms()) try { await synchronizeUsRealms(accessToken); } catch (error) { console.warn(`realm_catalog_sync_skipped: ${error.message}`); }
  const target = await pool.query(`SELECT candidate.connected_realm_id,candidate.slug,candidate.display_name
    FROM (SELECT DISTINCT ON (connected_realm_id) connected_realm_id,slug,display_name,is_default FROM realms
      WHERE region=$1 AND slug=ANY($2::TEXT[]) ORDER BY connected_realm_id,is_default DESC,display_name) candidate
    LEFT JOIN LATERAL (SELECT MAX(started_at) AS captured_at FROM ingestion_runs WHERE connected_realm_id=candidate.connected_realm_id AND status='succeeded') capture ON TRUE
    ORDER BY candidate.is_default DESC,capture.captured_at ASC NULLS FIRST,candidate.display_name LIMIT 1`, [region, comparisonRealmSlugs]);
  if (!target.rowCount) throw new Error('No configured comparison realm was found in the US catalog');
  const selected = target.rows[0];
  latest = { ...latest, status: 'collecting', targetRealm: selected.display_name, detail: `collecting ${selected.slug} and regional commodities`, progress: { stage: 'Downloading auctions', current: 0, total: 2 } };
  const auctions = await api(`/data/wow/connected-realm/${selected.connected_realm_id}/auctions?namespace=dynamic-${region}&locale=en_US`, accessToken);
  latest = { ...latest, progress: { stage: 'Downloading auctions', current: 1, total: 2 } };
  const commodities = await api(`/data/wow/auctions/commodities?namespace=dynamic-${region}&locale=en_US`, accessToken);
  latest = { ...latest, progress: { stage: 'Downloading auctions', current: 2, total: 2 } };
  const sourceTimestamp = Math.max(Number(auctions.last_modified ?? 0), Number(commodities.last_modified ?? 0));
  const sourceLastModified = sourceTimestamp > 0 ? new Date(sourceTimestamp) : null;
  const previous = await pool.query(`SELECT source_last_modified FROM ingestion_runs WHERE connected_realm_id=$1 AND status='succeeded' ORDER BY started_at DESC LIMIT 1`, [selected.connected_realm_id]);
  if (sourceLastModified && previous.rows[0]?.source_last_modified && new Date(previous.rows[0].source_last_modified).getTime() >= sourceLastModified.getTime()) {
    return { armorListings: latest.armorListings ?? 0, armorVariants: latest.armorVariants ?? 0, newMetadataCount: 0, unchanged: true, realmSlug: selected.slug, realmName: selected.display_name };
  }
  return { ...(await persistSnapshot(selected.connected_realm_id, [...(auctions.auctions ?? []), ...(commodities.auctions ?? [])], accessToken, sourceLastModified)), realmSlug: selected.slug, realmName: selected.display_name };
}

async function collectOnce() {
  if (isCollecting) return;
  isCollecting = true;
  let error;
  try {
    for (let attempt = 1; attempt <= 5; attempt += 1) try {
      await setupSchema();
      if (credentialsPresent && !hasItemEraData()) try { await syncItemEraData(pool); } catch (caught) { console.warn(`item_era_sync_skipped: ${caught.message}`); }
      const result = credentialsPresent ? await collectBlizzard() : await collectFixture();
      latest = { status: 'ready', mode: credentialsPresent ? 'blizzard' : 'fixture', processedAt: new Date().toISOString(), armorListings: result.armorListings, armorVariants: result.armorVariants, detail: credentialsPresent ? `synced ${result.realmSlug}; hydrated ${result.newMetadataCount} new item records` : 'Add Blizzard credentials to enable live data', targetRealm: result.realmName ?? realmSlug, comparisonTargets: comparisonRealmSlugs.length, progress: { stage: 'Ready', current: 1, total: 1 } };
      error = null; break;
    } catch (caught) {
      if (credentialsPresent && /^OAuth failed: (400|401)$/.test(caught.message)) {
        const result = await collectFixture();
        latest = { status: 'ready', mode: 'fixture', processedAt: new Date().toISOString(), armorListings: result.armorListings, armorVariants: result.armorVariants, detail: 'Blizzard credentials were rejected; using fixture data', targetRealm: result.realmName ?? realmSlug, comparisonTargets: comparisonRealmSlugs.length };
        error = null;
        break;
      }
      error = caught;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
    if (error) latest = { ...latest, status: 'error', detail: error.message, processedAt: new Date().toISOString() };
    console.log(JSON.stringify({ event: 'collect_finished', ...latest }));
  } finally { isCollecting = false; }
}

async function restoreLatestSnapshot() {
  const restored = await pool.query(`SELECT r.started_at AS "processedAt",r.connected_realm_id AS "connectedRealmId",cr.display_name AS "realmName",COUNT(p.item_id)::INTEGER AS "armorListings"
    FROM ingestion_runs r JOIN connected_realms cr ON cr.id=r.connected_realm_id JOIN price_snapshots p ON p.ingestion_run_id=r.id
    WHERE r.status='succeeded' GROUP BY r.id,cr.display_name ORDER BY r.started_at DESC LIMIT 1`);
  const snapshot = restored.rows[0];
  if (!snapshot) return;
  latest = { ...latest, status: 'ready', processedAt: snapshot.processedAt, armorListings: snapshot.armorListings, detail: 'serving the last validated snapshot', targetRealm: snapshot.realmName, progress: { stage: 'Ready', current: 1, total: 1 } };
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  if (url.pathname === '/healthz') return sendJson(response, latest.status === 'error' ? 503 : 200, latest);
  try {
    if (url.pathname === '/api/realms') {
      const result = await pool.query(`SELECT id, display_name AS name, is_default AS "isDefault"
        FROM realms
        WHERE region=$1 AND (
          ($2::TEXT='fixture' AND id=0) OR
          ($2::TEXT='blizzard' AND id<>0 AND EXISTS (
            SELECT 1 FROM ingestion_runs run WHERE run.connected_realm_id=realms.connected_realm_id AND run.status='succeeded'
          ))
        )
        ORDER BY is_default DESC, display_name ASC`, [region, latest.mode]);
      return sendJson(response, 200, { realms: result.rows });
    }
    if (url.pathname === '/api/wow-token') {
      const result = await pool.query(`WITH history AS (
          SELECT price_copper AS "minBuyoutCopper",captured_at AS "capturedAt"
          FROM wow_token_snapshots WHERE captured_at >= NOW() - INTERVAL '14 days' ORDER BY captured_at ASC
        ), latest AS (
          SELECT price_copper AS "currentCopper",COALESCE(provider_updated_at,captured_at) AS "updatedAt" FROM wow_token_snapshots ORDER BY captured_at DESC LIMIT 1
        ) SELECT (SELECT row_to_json(latest) FROM latest) AS latest,
          COALESCE((SELECT json_agg(history) FROM history),'[]'::JSON) AS points,
          (SELECT COUNT(*)::INTEGER FROM history) AS captures,
          (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY "minBuyoutCopper") FROM history) AS "medianCopper",
          (SELECT AVG("minBuyoutCopper") FROM history) AS "meanCopper"`);
      const row = result.rows[0];
      return sendJson(response, 200, { latest: row.latest, points: row.points, stats: { captures: row.captures, medianCopper: row.medianCopper == null ? null : Math.round(Number(row.medianCopper)), meanCopper: row.meanCopper == null ? null : Math.round(Number(row.meanCopper)) } });
    }
    if (url.pathname === '/api/favorites') {
      const realmId = Number(url.searchParams.get('realmId'));
      const itemIds = integerListParam(url.searchParams, 'ids', { positive: true, limit: 100 });
      if (!Number.isSafeInteger(realmId)) return sendJson(response, 400, { error: 'Valid realmId is required' });
      if (!itemIds.length) return sendJson(response, 200, { items: [], count: 0 });
      const selectedRealm = await pool.query('SELECT connected_realm_id FROM realms WHERE id=$1 AND region=$2', [realmId, region]);
      if (!selectedRealm.rowCount) return sendJson(response, 404, { error: 'Unknown realm' });
      const useSpanishNames = url.searchParams.get('locale') === 'es-MX';
      const result = await pool.query(`WITH latest_run AS (
          SELECT id,started_at FROM ingestion_runs WHERE connected_realm_id=$1 AND status='succeeded' ORDER BY started_at DESC LIMIT 1
        ), favorite_variants AS (
          SELECT i.id,CASE WHEN $3::BOOLEAN THEN COALESCE(NULLIF(i.name_es_mx,''),i.name) ELSE i.name END AS name,
            i.item_class_id AS "itemClassId",i.item_subclass_id AS "subclassId",i.inventory_type AS "inventoryType",i.item_level AS "itemLevel",
            i.quality_type AS "qualityType",i.quality_rank AS "qualityRank",i.expansion_id AS "expansionId",
            md5(v.bonus_list_ids::TEXT || '|' || v.modifiers::TEXT) AS "variantKey",v.item_context AS context,v.bonus_list_ids AS "bonusListIds",v.modifiers,
            s.effective_item_level AS "effectiveItemLevel",v.tertiary_stats AS "tertiaryStats",s.min_buyout_copper AS "minBuyoutCopper",s.quantity,s.listing_count AS "listingCount",
            latest_run.started_at AS "capturedAt",TRUE AS "isAvailable",latest_run.started_at AS "lastSeenAt"
          FROM latest_run JOIN market_item_summaries s ON s.ingestion_run_id=latest_run.id
          JOIN auction_variants v ON v.id=s.variant_id JOIN items i ON i.id=v.item_id WHERE v.item_id=ANY($2::BIGINT[])
        ) SELECT id,name,"itemClassId","subclassId","inventoryType","itemLevel","qualityType","qualityRank","expansionId",
          CASE WHEN (SELECT COUNT(DISTINCT sibling.item_level) FROM items sibling WHERE sibling.name=(SELECT original.name FROM items original WHERE original.id=favorite_variants.id)) > 1
            THEN LEAST(2,1+(SELECT COUNT(DISTINCT sibling.item_level)::INTEGER FROM items sibling WHERE sibling.name=(SELECT original.name FROM items original WHERE original.id=favorite_variants.id) AND sibling.item_level < favorite_variants."itemLevel"))
            ELSE NULL END AS "craftingQualityTier",
          (array_agg("variantKey" ORDER BY "minBuyoutCopper","variantKey"))[1] AS "variantKey",
          (array_agg(context ORDER BY "minBuyoutCopper","variantKey"))[1] AS context,
          (jsonb_agg(to_jsonb("bonusListIds") ORDER BY "minBuyoutCopper","variantKey"))->0 AS "bonusListIds",
          (jsonb_agg(modifiers ORDER BY "minBuyoutCopper","variantKey"))->0 AS modifiers,
          (jsonb_agg(to_jsonb("tertiaryStats") ORDER BY "minBuyoutCopper","variantKey"))->0 AS "tertiaryStats",
          MAX("effectiveItemLevel") AS "effectiveItemLevel",MIN("minBuyoutCopper") AS "minBuyoutCopper",SUM(quantity) AS quantity,
          SUM("listingCount")::INTEGER AS "listingCount",MAX("capturedAt") AS "capturedAt",TRUE AS "isAvailable",MAX("lastSeenAt") AS "lastSeenAt"
        FROM favorite_variants GROUP BY id,name,"itemClassId","subclassId","inventoryType","itemLevel","qualityType","qualityRank","expansionId"
        ORDER BY name ASC`, [selectedRealm.rows[0].connected_realm_id, itemIds, useSpanishNames]);
      const items = result.rows.map((item) => ({ ...item, effectiveItemLevel: item.effectiveItemLevel ?? effectiveItemLevel(item.id, item.bonusListIds, item.modifiers) }));
      return sendJson(response, 200, { items, count: items.length });
    }
    const historyMatch = url.pathname.match(/^\/api\/(armor|weapons|containers|gems|enhancements|consumables|glyphs|trade-goods|recipes|profession-equipment|housing|battle-pets|quest-items|miscellaneous|wow-token)\/(\d+)\/history$/);
    if (historyMatch) {
      const realmId = Number(url.searchParams.get('realmId'));
      const itemId = Number(historyMatch[2]);
      const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 30));
      const variantKey = url.searchParams.get('variantKey')?.trim() ?? '';
      if (!Number.isSafeInteger(realmId) || !Number.isSafeInteger(itemId)) return sendJson(response, 400, { error: 'Valid realmId and itemId are required' });
      const selectedRealm = await pool.query('SELECT connected_realm_id, display_name FROM realms WHERE id=$1 AND region=$2', [realmId, region]);
      if (!selectedRealm.rowCount) return sendJson(response, 404, { error: 'Unknown realm' });
      const result = variantKey ? await pool.query(`SELECT r.started_at AS "capturedAt",MIN(p.min_buyout_copper) AS "minBuyoutCopper",SUM(p.quantity) AS quantity,SUM(p.listing_count)::INTEGER AS "listingCount"
          FROM ingestion_runs r JOIN variant_price_snapshots p ON p.ingestion_run_id=r.id JOIN auction_variants v ON v.id=p.variant_id
          WHERE r.connected_realm_id=$1 AND r.status='succeeded' AND v.item_id=$2 AND md5(v.bonus_list_ids::TEXT || '|' || v.modifiers::TEXT)=$3 AND r.started_at >= NOW()-($4::TEXT || ' days')::INTERVAL
          GROUP BY r.id,r.started_at ORDER BY r.started_at ASC LIMIT 1000`, [selectedRealm.rows[0].connected_realm_id, itemId, variantKey, days])
        : await pool.query(`SELECT r.started_at AS "capturedAt",p.min_buyout_copper AS "minBuyoutCopper",p.quantity,p.listing_count AS "listingCount"
          FROM ingestion_runs r JOIN price_snapshots p ON p.ingestion_run_id=r.id
          WHERE r.connected_realm_id=$1 AND r.status='succeeded' AND p.item_id=$2 AND r.started_at >= NOW()-($3::TEXT || ' days')::INTERVAL
          ORDER BY r.started_at ASC LIMIT 1000`, [selectedRealm.rows[0].connected_realm_id, itemId, days]);
      const prices = result.rows.map((row) => Number(row.minBuyoutCopper)).sort((a, b) => a - b);
      const median = prices.length ? (prices[Math.floor((prices.length - 1) / 2)] + prices[Math.ceil((prices.length - 1) / 2)]) / 2 : null;
      const first = result.rows[0]; const last = result.rows.at(-1);
      return sendJson(response, 200, { realm: selectedRealm.rows[0].display_name, days, variantKey: variantKey || null, points: result.rows, stats: {
        captures: prices.length, lowCopper: prices.length ? prices[0] : null, highCopper: prices.length ? prices.at(-1) : null, medianCopper: median,
        changePercent: first && last && Number(first.minBuyoutCopper) ? ((Number(last.minBuyoutCopper) - Number(first.minBuyoutCopper)) / Number(first.minBuyoutCopper)) * 100 : null,
      } });
    }
    const comparisonMatch = url.pathname.match(/^\/api\/(armor|weapons|containers|gems|enhancements|consumables|glyphs|trade-goods|recipes|profession-equipment|housing|battle-pets|quest-items|miscellaneous|wow-token)\/(\d+)\/comparison$/);
    if (comparisonMatch) {
      const itemId = Number(comparisonMatch[2]);
      if (!Number.isSafeInteger(itemId)) return sendJson(response, 400, { error: 'Valid itemId is required' });
      const result = await pool.query(`WITH latest AS (
          SELECT DISTINCT ON (connected_realm_id) id,connected_realm_id,started_at FROM ingestion_runs
          WHERE status='succeeded' ORDER BY connected_realm_id,started_at DESC
        ), names AS (
          SELECT connected_realm_id,string_agg(display_name, ', ' ORDER BY display_name) AS name FROM realms WHERE region=$1 GROUP BY connected_realm_id
        )
        SELECT l.connected_realm_id AS "connectedRealmId",n.name,p.min_buyout_copper AS "minBuyoutCopper",p.quantity,p.listing_count AS "listingCount",l.started_at AS "capturedAt"
        FROM latest l JOIN price_snapshots p ON p.ingestion_run_id=l.id JOIN names n USING(connected_realm_id)
        WHERE p.item_id=$2 ORDER BY p.min_buyout_copper ASC`, [region, itemId]);
      const coverage = await pool.query(`SELECT COUNT(DISTINCT realms.connected_realm_id)::INTEGER AS total,
        COUNT(DISTINCT realms.connected_realm_id) FILTER (WHERE EXISTS (SELECT 1 FROM ingestion_runs r WHERE r.connected_realm_id=realms.connected_realm_id AND r.status='succeeded'))::INTEGER AS monitored,
        COUNT(DISTINCT realms.connected_realm_id) FILTER (WHERE connected_realms.comparison_enabled)::INTEGER AS targeted,
        COUNT(DISTINCT realms.connected_realm_id) FILTER (WHERE connected_realms.comparison_enabled AND EXISTS (SELECT 1 FROM ingestion_runs r WHERE r.connected_realm_id=realms.connected_realm_id AND r.status='succeeded'))::INTEGER AS "targetMonitored"
        FROM realms JOIN connected_realms ON connected_realms.id=realms.connected_realm_id WHERE realms.region=$1`, [region]);
      return sendJson(response, 200, { realms: result.rows, coverage: coverage.rows[0] });
    }
    const detailMatch = url.pathname.match(/^\/api\/(armor|weapons|containers|gems|enhancements|consumables|glyphs|trade-goods|recipes|profession-equipment|housing|battle-pets|quest-items|miscellaneous|wow-token)\/(\d+)$/);
    if (detailMatch) {
      const realmId = Number(url.searchParams.get('realmId'));
      const itemId = Number(detailMatch[2]);
      if (!Number.isSafeInteger(realmId) || !Number.isSafeInteger(itemId)) return sendJson(response, 400, { error: 'Valid realmId and itemId are required' });
      const selectedRealm = await pool.query('SELECT connected_realm_id, display_name FROM realms WHERE id=$1 AND region=$2', [realmId, region]);
      if (!selectedRealm.rowCount) return sendJson(response, 404, { error: 'Unknown realm' });
      const result = await pool.query(`WITH latest_run AS (
          SELECT id,started_at FROM ingestion_runs WHERE connected_realm_id=$1 AND status='succeeded' ORDER BY started_at DESC LIMIT 1
        ), item_summary AS (
          SELECT p.min_buyout_copper,p.quantity,p.listing_count FROM latest_run JOIN price_snapshots p ON p.ingestion_run_id=latest_run.id WHERE p.item_id=$2
        ), variants AS (
          SELECT md5(v.bonus_list_ids::TEXT || '|' || v.modifiers::TEXT) AS "variantKey",MIN(v.item_context) AS context,v.bonus_list_ids AS "bonusListIds",v.modifiers,v.tertiary_stats AS "tertiaryStats",MIN(v.effective_item_level) AS "effectiveItemLevel",
            MIN(p.min_buyout_copper) AS "minBuyoutCopper",SUM(p.quantity) AS quantity,SUM(p.listing_count)::INTEGER AS "listingCount"
          FROM latest_run JOIN variant_price_snapshots p ON p.ingestion_run_id=latest_run.id JOIN auction_variants v ON v.id=p.variant_id
          WHERE v.item_id=$2 GROUP BY v.bonus_list_ids,v.modifiers,v.tertiary_stats
        )
        SELECT i.id,i.name,i.item_class_id AS "itemClassId",i.item_subclass_id AS "subclassId",i.inventory_type AS "inventoryType",i.item_level AS "itemLevel",i.required_level AS "requiredLevel",i.quality_type AS "qualityType",i.quality_rank AS "qualityRank",i.expansion_id AS "expansionId",latest_run.started_at AS "capturedAt",
          (SELECT row_to_json(item_summary) FROM item_summary) AS summary,
          COALESCE((SELECT json_agg(variants ORDER BY "minBuyoutCopper", "variantKey") FROM variants),'[]') AS variants,
          COALESCE((SELECT json_agg(levels ORDER BY levels."variantKey",levels."unitPriceCopper") FROM (
            SELECT md5(v.bonus_list_ids::TEXT || '|' || v.modifiers::TEXT) AS "variantKey",l.unit_price_copper AS "unitPriceCopper",SUM(l.quantity) AS quantity,SUM(l.listing_count)::INTEGER AS "listingCount"
            FROM latest_run JOIN variant_price_levels l ON l.ingestion_run_id=latest_run.id JOIN auction_variants v ON v.id=l.variant_id WHERE v.item_id=$2
            GROUP BY md5(v.bonus_list_ids::TEXT || '|' || v.modifiers::TEXT),l.unit_price_copper
          ) levels),'[]') AS "priceLevels"
        FROM latest_run JOIN items i ON i.id=$2`, [selectedRealm.rows[0].connected_realm_id, itemId]);
      if (!result.rowCount || !result.rows[0].summary) return sendJson(response, 404, { error: 'Item is not available in the latest snapshot' });
      const detail = result.rows[0];
      if (url.searchParams.get('locale') === 'es-MX') detail.name = await spanishItemName(itemId, detail.name, await token());
      detail.variants = detail.variants.map((variant) => ({ ...variant, effectiveItemLevel: effectiveItemLevel(detail.id, variant.bonusListIds, variant.modifiers) }));
      return sendJson(response, 200, { ...detail, realm: selectedRealm.rows[0].display_name, itemLevelDataBuild });
    }
    const marketMatch = url.pathname.match(/^\/api\/(search|armor|weapons|containers|gems|enhancements|consumables|glyphs|trade-goods|recipes|profession-equipment|housing|battle-pets|quest-items|miscellaneous|wow-token)$/);
    if (marketMatch) {
      const itemClassId = { consumables: 0, containers: 1, weapons: 2, gems: 3, armor: 4, 'trade-goods': 7, enhancements: 8, recipes: 9, 'quest-items': 12, miscellaneous: 15, glyphs: 16, 'battle-pets': 17, 'wow-token': 18, 'profession-equipment': 19, housing: 20 }[marketMatch[1]] ?? null;
      const realmId = Number(url.searchParams.get('realmId'));
      if (!Number.isSafeInteger(realmId)) return sendJson(response, 400, { error: 'realmId must be a connected realm id' });
      const query = url.searchParams.get('q')?.trim() ?? '';
      const bonusStat = Number(url.searchParams.get('bonusStat'));
      const subclasses = integerListParam(url.searchParams, 'subclasses');
      const inventoryTypes = (url.searchParams.get('inventoryTypes') ?? '').split(',').filter(Boolean);
      const expansions = integerListParam(url.searchParams, 'expansions');
      const minLevel = integerParam(url.searchParams, 'minLevel'); const maxLevel = integerParam(url.searchParams, 'maxLevel'); const minQuality = integerParam(url.searchParams, 'minQuality'); const maxQuality = integerParam(url.searchParams, 'maxQuality');
      const includeOutOfStock = url.searchParams.get('includeOutOfStock') === 'true';
      const useSpanishNames = url.searchParams.get('locale') === 'es-MX';
      const page = boundedIntegerParam(url.searchParams, 'page', { minimum: 1, maximum: Number.MAX_SAFE_INTEGER, fallback: 1 });
      const limit = boundedIntegerParam(url.searchParams, 'limit', { minimum: 10, maximum: 500, fallback: 500 });
      const sortKey = url.searchParams.get('sort') ?? 'name';
      const sortDirection = url.searchParams.get('direction') === 'desc' ? 'DESC' : 'ASC';
      const sortColumns = { name: 'name', level: '"effectiveItemLevel"', price: '"minBuyoutCopper"', quantity: 'quantity', listings: '"listingCount"' };
      const sortColumn = sortColumns[sortKey] ?? sortColumns.name;
      const selectedRealm = await pool.query('SELECT connected_realm_id FROM realms WHERE id=$1 AND region=$2', [realmId, region]);
      if (!selectedRealm.rowCount) return sendJson(response, 404, { error: 'Unknown realm' });
      const hasBonusStatFilter = [61, 62, 63, 64].includes(bonusStat);
      const result = await pool.query(`WITH latest_run AS (
          SELECT id, started_at FROM ingestion_runs
          WHERE connected_realm_id=$1 AND status='succeeded'
          ORDER BY started_at DESC LIMIT 1
        ), available_variants AS (
        SELECT i.id, CASE WHEN $16::BOOLEAN THEN COALESCE(NULLIF(i.name_es_mx,''),i.name) ELSE i.name END AS name, i.item_class_id AS "itemClassId", i.item_subclass_id AS "subclassId", i.inventory_type AS "inventoryType",i.item_level AS "itemLevel",i.quality_type AS "qualityType",i.quality_rank AS "qualityRank",i.expansion_id AS "expansionId",
          md5(v.bonus_list_ids::TEXT || '|' || v.modifiers::TEXT) AS "variantKey", v.item_context AS context, v.bonus_list_ids AS "bonusListIds", v.modifiers,s.effective_item_level AS "effectiveItemLevel",
          v.tertiary_stats AS "tertiaryStats", s.min_buyout_copper AS "minBuyoutCopper", s.quantity,
          s.listing_count AS "listingCount", latest_run.started_at AS "capturedAt",TRUE AS "isAvailable",latest_run.started_at AS "lastSeenAt"
        FROM latest_run
        JOIN market_item_summaries s ON s.ingestion_run_id=latest_run.id
        JOIN auction_variants v ON v.id=s.variant_id
        JOIN items i ON i.id=v.item_id
        WHERE ($12::INTEGER IS NULL OR i.item_class_id=$12) AND ($2='' OR NOT EXISTS (SELECT 1 FROM unnest(regexp_split_to_array($2, '\\s+')) AS term WHERE i.name NOT ILIKE '%' || term || '%' AND COALESCE(i.name_es_mx, '') NOT ILIKE '%' || term || '%')) AND (NOT $3::BOOLEAN OR $4=ANY(v.tertiary_stats))
          AND (cardinality($5::INTEGER[])=0 OR i.item_subclass_id=ANY($5)) AND (cardinality($6::TEXT[])=0 OR i.inventory_type=ANY($6))
          AND (cardinality($7::INTEGER[])=0 OR i.expansion_id=ANY($7)) AND ($8::INTEGER IS NULL OR v.effective_item_level >= $8) AND ($9::INTEGER IS NULL OR v.effective_item_level <= $9)
          AND ($10::INTEGER IS NULL OR i.quality_rank >= $10) AND ($11::INTEGER IS NULL OR i.quality_rank <= $11)
        ), unavailable_variants AS (
          SELECT DISTINCT ON (v.item_id) i.id,CASE WHEN $16::BOOLEAN THEN COALESCE(NULLIF(i.name_es_mx,''),i.name) ELSE i.name END AS name,i.item_class_id AS "itemClassId",i.item_subclass_id AS "subclassId",i.inventory_type AS "inventoryType",i.item_level AS "itemLevel",i.quality_type AS "qualityType",i.quality_rank AS "qualityRank",i.expansion_id AS "expansionId",
            md5(v.bonus_list_ids::TEXT || '|' || v.modifiers::TEXT) AS "variantKey",v.item_context AS context,v.bonus_list_ids AS "bonusListIds",v.modifiers,v.effective_item_level AS "effectiveItemLevel",v.tertiary_stats AS "tertiaryStats",
            p.min_buyout_copper AS "minBuyoutCopper",0::BIGINT AS quantity,0::INTEGER AS "listingCount",r.started_at AS "capturedAt",FALSE AS "isAvailable",r.started_at AS "lastSeenAt"
          FROM ingestion_runs r
          JOIN variant_price_snapshots p ON p.ingestion_run_id=r.id
          JOIN auction_variants v ON v.id=p.variant_id
          JOIN items i ON i.id=v.item_id
          WHERE $15::BOOLEAN AND r.connected_realm_id=$1 AND r.status='succeeded' AND ($12::INTEGER IS NULL OR i.item_class_id=$12) AND ($2='' OR NOT EXISTS (SELECT 1 FROM unnest(regexp_split_to_array($2, '\\s+')) AS term WHERE i.name NOT ILIKE '%' || term || '%' AND COALESCE(i.name_es_mx, '') NOT ILIKE '%' || term || '%')) AND (NOT $3::BOOLEAN OR $4=ANY(v.tertiary_stats))
            AND (cardinality($5::INTEGER[])=0 OR i.item_subclass_id=ANY($5)) AND (cardinality($6::TEXT[])=0 OR i.inventory_type=ANY($6))
            AND (cardinality($7::INTEGER[])=0 OR i.expansion_id=ANY($7)) AND ($8::INTEGER IS NULL OR v.effective_item_level >= $8) AND ($9::INTEGER IS NULL OR v.effective_item_level <= $9)
            AND ($10::INTEGER IS NULL OR i.quality_rank >= $10) AND ($11::INTEGER IS NULL OR i.quality_rank <= $11)
          ORDER BY v.item_id,r.started_at DESC,p.min_buyout_copper ASC,v.id ASC
        ), raw_variants AS (
          SELECT * FROM available_variants
          UNION ALL
          SELECT unavailable_variants.* FROM unavailable_variants WHERE $15::BOOLEAN AND NOT EXISTS (SELECT 1 FROM available_variants WHERE available_variants.id=unavailable_variants.id)
        ), filtered AS (
          SELECT id,name,"itemClassId","subclassId","inventoryType","itemLevel","qualityType","qualityRank","expansionId",
            (array_agg("variantKey" ORDER BY "minBuyoutCopper","variantKey"))[1] AS "variantKey",
            (array_agg(context ORDER BY "minBuyoutCopper","variantKey"))[1] AS context,
            (jsonb_agg(to_jsonb("bonusListIds") ORDER BY "minBuyoutCopper","variantKey"))->0 AS "bonusListIds",
            (jsonb_agg(modifiers ORDER BY "minBuyoutCopper","variantKey"))->0 AS modifiers,
            (jsonb_agg(to_jsonb("tertiaryStats") ORDER BY "minBuyoutCopper","variantKey"))->0 AS "tertiaryStats",MAX("effectiveItemLevel") AS "effectiveItemLevel",MIN("minBuyoutCopper") AS "minBuyoutCopper",
            SUM(quantity) AS quantity,SUM("listingCount")::INTEGER AS "listingCount",MAX("capturedAt") AS "capturedAt",BOOL_OR("isAvailable") AS "isAvailable",MAX("lastSeenAt") AS "lastSeenAt"
          FROM raw_variants
          GROUP BY id,name,"itemClassId","subclassId","inventoryType","itemLevel","qualityType","qualityRank","expansionId"
        ) SELECT *,COUNT(*) OVER() AS "totalCount" FROM filtered ORDER BY "isAvailable" DESC,${sortColumn} ${sortDirection},id ASC,"variantKey" ASC LIMIT $13 OFFSET $14`, [selectedRealm.rows[0].connected_realm_id, query, hasBonusStatFilter, bonusStat, subclasses, inventoryTypes, expansions, minLevel, maxLevel, minQuality, maxQuality, itemClassId, limit, (page - 1) * limit, includeOutOfStock, useSpanishNames]);
      const total = Number(result.rows[0]?.totalCount ?? 0);
      const items = result.rows.map(({ totalCount, ...item }) => ({ ...item, effectiveItemLevel: item.effectiveItemLevel ?? effectiveItemLevel(item.id, item.bonusListIds, item.modifiers) }));
      return sendJson(response, 200, { items, count: items.length, total, page, pages: Math.ceil(total / limit), limit, itemLevelDataBuild });
    }
  } catch (error) {
    console.error('api_error', error.message);
    return sendJson(response, 500, { error: 'Unable to read auction data' });
  }
  return sendJson(response, 404, { error: 'Not found' });
}).listen(port, '0.0.0.0');

void restoreLatestSnapshot().catch((error) => console.warn(`snapshot_restore_skipped: ${error.message}`)).finally(() => void collectOnce());
setInterval(() => void collectOnce(), collectionIntervalMinutes * 60 * 1000).unref();
