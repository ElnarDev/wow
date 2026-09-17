import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Pool } = pg;
const port = Number(process.env.COLLECTOR_PORT ?? 3001);
const region = process.env.WOW_REGION ?? 'us';
const realmSlug = process.env.DEFAULT_REALM_SLUG ?? 'area-52';
const comparisonRealmSlugs = [...new Set([realmSlug, ...(process.env.COMPARISON_REALM_SLUGS ?? 'stormrage,illidan,tichondrius,sargeras,malganis').split(',')].map((value) => value.trim()).filter(Boolean))];
const collectionIntervalMinutes = Math.max(5, Number(process.env.COLLECTION_INTERVAL_MINUTES) || 10);
const maxNewItemMetadataPerRun = Number(process.env.MAX_NEW_ITEM_METADATA_PER_RUN ?? 250);
const credentialsPresent = Boolean(process.env.BLIZZARD_CLIENT_ID && process.env.BLIZZARD_CLIENT_SECRET);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let latest = { status: 'starting', mode: credentialsPresent ? 'blizzard' : 'fixture', processedAt: null, armorListings: 0, detail: null, targetRealm: null, comparisonTargets: comparisonRealmSlugs.length };
let isCollecting = false;
let catalogSyncedAt = 0;

// Bonus IDs published by Project Shatari's generated bonus dataset.
// WoW stat IDs: 61 Speed, 62 Leech, 63 Avoidance, 64 Indestructible.
const tertiaryBonusIds = new Map([
  [61, new Set([42, 6408, 6674, 9622, 10814, 10820, 10971, 11206, 12545])],
  [62, new Set([41, 6409, 6673, 9620, 10812, 10818, 10969, 11204, 12544])],
  [63, new Set([40, 6410, 6675, 7886, 10965, 11200, 12543])],
  [64, new Set([43, 5803, 6411, 8975])],
]);

function normalizeVariant(auctionItem = {}) {
  const bonusListIds = [...new Set(auctionItem.bonus_lists ?? [])].map(Number).filter(Number.isSafeInteger).sort((a, b) => a - b);
  const modifiers = (auctionItem.modifiers ?? []).map((modifier) => ({ type: Number(modifier.type), value: Number(modifier.value) }))
    .filter((modifier) => Number.isSafeInteger(modifier.type) && Number.isFinite(modifier.value)).sort((a, b) => a.type - b.type || a.value - b.value);
  const itemContext = Number.isSafeInteger(Number(auctionItem.context)) ? Number(auctionItem.context) : null;
  const tertiaryStats = [...tertiaryBonusIds].filter(([, ids]) => bonusListIds.some((id) => ids.has(id))).map(([stat]) => stat);
  const canonical = JSON.stringify({ itemContext, bonusListIds, modifiers });
  return { variantKey: createHash('sha256').update(canonical).digest('hex'), itemContext, bonusListIds, modifiers, tertiaryStats };
}

async function setupSchema() {
  await pool.query(`ALTER TABLE connected_realms ADD COLUMN IF NOT EXISTS comparison_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    CREATE TABLE IF NOT EXISTS realms (id BIGINT PRIMARY KEY, connected_realm_id BIGINT NOT NULL REFERENCES connected_realms(id), region TEXT NOT NULL DEFAULT 'us' CHECK (region = 'us'), slug TEXT NOT NULL, display_name TEXT NOT NULL, is_default BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE UNIQUE INDEX IF NOT EXISTS realms_slug_region_idx ON realms (region, slug);
    CREATE UNIQUE INDEX IF NOT EXISTS one_default_us_visible_realm ON realms (region) WHERE is_default;
    CREATE TABLE IF NOT EXISTS items (id BIGINT PRIMARY KEY, name TEXT NOT NULL, item_class_id INTEGER NOT NULL, item_subclass_id INTEGER, inventory_type TEXT, metadata_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS price_snapshots (ingestion_run_id BIGINT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE, item_id BIGINT NOT NULL REFERENCES items(id), min_buyout_copper BIGINT NOT NULL, quantity BIGINT NOT NULL, listing_count INTEGER NOT NULL, PRIMARY KEY (ingestion_run_id,item_id));
    CREATE INDEX IF NOT EXISTS price_snapshots_item_run_idx ON price_snapshots (item_id, ingestion_run_id DESC);
    CREATE TABLE IF NOT EXISTS auction_variants (id BIGSERIAL PRIMARY KEY, item_id BIGINT NOT NULL REFERENCES items(id), variant_key TEXT NOT NULL, item_context INTEGER, bonus_list_ids INTEGER[] NOT NULL DEFAULT '{}', modifiers JSONB NOT NULL DEFAULT '[]', tertiary_stats INTEGER[] NOT NULL DEFAULT '{}', UNIQUE(item_id,variant_key));
    CREATE TABLE IF NOT EXISTS variant_price_snapshots (ingestion_run_id BIGINT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE, variant_id BIGINT NOT NULL REFERENCES auction_variants(id), min_buyout_copper BIGINT NOT NULL, quantity BIGINT NOT NULL, listing_count INTEGER NOT NULL, PRIMARY KEY(ingestion_run_id,variant_id));
    CREATE INDEX IF NOT EXISTS variant_price_snapshots_variant_run_idx ON variant_price_snapshots (variant_id, ingestion_run_id DESC);
    CREATE INDEX IF NOT EXISTS auction_variants_tertiary_stats_idx ON auction_variants USING GIN (tertiary_stats);
    CREATE TABLE IF NOT EXISTS variant_price_levels (ingestion_run_id BIGINT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE, variant_id BIGINT NOT NULL REFERENCES auction_variants(id), unit_price_copper BIGINT NOT NULL, quantity BIGINT NOT NULL, listing_count INTEGER NOT NULL, PRIMARY KEY(ingestion_run_id,variant_id,unit_price_copper));
    CREATE INDEX IF NOT EXISTS variant_price_levels_variant_run_idx ON variant_price_levels (variant_id, ingestion_run_id DESC, unit_price_copper);`);
}

async function token() {
  const auth = Buffer.from(`${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`https://${region}.battle.net/oauth/token`, { method: 'POST', headers: { authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!response.ok) throw new Error(`OAuth failed: ${response.status}`);
  return (await response.json()).access_token;
}

async function api(path, accessToken) {
  const response = await fetch(`https://${region}.api.blizzard.com${path}`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Blizzard API failed: ${response.status} for ${path}`);
  return response.json();
}

function connectedRealmId(reference) {
  const href = typeof reference === 'string' ? reference : reference?.href ?? reference?.key?.href;
  if (typeof href !== 'string') return null;
  const id = Number(href.match(/connected-realm\/(\d+)/)?.[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function localizedName(value, fallback) {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') return value.en_US ?? value.en_GB ?? Object.values(value).find((entry) => typeof entry === 'string') ?? fallback;
  return fallback;
}

async function apiHref(href, accessToken) {
  const url = new URL(href);
  return api(`${url.pathname}${url.search}`, accessToken);
}

async function mapWithConcurrency(values, limit, mapper) {
  const results = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

async function syncUsCatalog(accessToken) {
  const index = await api(`/data/wow/connected-realm/index?namespace=dynamic-${region}&locale=en_US`, accessToken);
  await pool.query('UPDATE connected_realms SET is_default=FALSE WHERE region=$1', [region]);
  await pool.query('UPDATE realms SET is_default=FALSE WHERE region=$1', [region]);
  const connectedRealms = await mapWithConcurrency(index.connected_realms ?? [], 8, (reference) => apiHref(reference.href, accessToken));
  for (const connectedRealm of connectedRealms) {
    const id = connectedRealmId(connectedRealm._links?.self ?? connectedRealm.key ?? connectedRealm.href);
    if (!id) continue;
    const visibleRealms = connectedRealm.realms ?? [];
    const displayName = localizedName(visibleRealms[0]?.name, `Connected realm ${id}`);
    await pool.query(`INSERT INTO connected_realms (id, region, display_name, is_default, updated_at)
      VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name, is_default=EXCLUDED.is_default, updated_at=NOW()`, [id, region, displayName, visibleRealms.some((realm) => realm.slug === realmSlug)]);
    for (const realm of visibleRealms) await pool.query(`INSERT INTO realms (id, connected_realm_id, region, slug, display_name, is_default, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      ON CONFLICT (id) DO UPDATE SET connected_realm_id=EXCLUDED.connected_realm_id, slug=EXCLUDED.slug, display_name=EXCLUDED.display_name, is_default=EXCLUDED.is_default, updated_at=NOW()`, [realm.id, id, region, realm.slug, localizedName(realm.name, realm.slug), realm.slug === realmSlug]);
  }
  await pool.query('UPDATE connected_realms SET comparison_enabled=FALSE WHERE region=$1', [region]);
  await pool.query(`UPDATE connected_realms SET comparison_enabled=TRUE WHERE id IN (
    SELECT DISTINCT connected_realm_id FROM realms WHERE region=$1 AND slug=ANY($2::TEXT[])
  )`, [region, comparisonRealmSlugs]);
  catalogSyncedAt = Date.now();
}

async function itemMetadata(itemId, accessToken) {
  const cached = await pool.query('SELECT id, name, item_class_id AS "itemClassId", item_subclass_id AS "itemSubclassId", inventory_type AS "inventoryType" FROM items WHERE id=$1', [itemId]);
  if (cached.rowCount) return cached.rows[0];
  let item;
  try { item = await api(`/data/wow/item/${itemId}?namespace=static-${region}&locale=en_US`, accessToken); }
  catch (error) {
    if (error.message.includes('Blizzard API failed: 404')) return null;
    throw error;
  }
  const row = { id: item.id, name: item.name, itemClassId: item.item_class?.id ?? -1, itemSubclassId: item.item_subclass?.id ?? null, inventoryType: item.inventory_type?.type ?? null };
  await pool.query('INSERT INTO items (id,name,item_class_id,item_subclass_id,inventory_type) VALUES ($1,$2,$3,$4,$5)', [row.id, row.name, row.itemClassId, row.itemSubclassId, row.inventoryType]);
  return row;
}

async function persistSnapshot(realmId, auctions, accessToken) {
  const run = await pool.query("INSERT INTO ingestion_runs (connected_realm_id,status) VALUES ($1,'running') RETURNING id", [realmId]);
  const aggregate = new Map();
  const variantAggregate = new Map();
  const metadataByItemId = new Map();
  let newMetadataCount = 0;
  for (const auction of auctions) {
    const itemId = auction.item?.id ?? auction.itemId;
    const buyout = auction.buyout ?? 0;
    const quantity = auction.quantity ?? 1;
    const unitPrice = auction.unit_price ?? (buyout ? Math.floor(buyout / quantity) : 0);
    if (!itemId || !unitPrice) continue;
    let item = metadataByItemId.get(itemId);
    if (accessToken && !metadataByItemId.has(itemId)) {
      const cached = await pool.query('SELECT id, name, item_class_id AS "itemClassId" FROM items WHERE id=$1', [itemId]);
      if (cached.rowCount) item = cached.rows[0];
      else if (newMetadataCount < maxNewItemMetadataPerRun) {
        item = await itemMetadata(itemId, accessToken);
        newMetadataCount += 1;
      } else continue;
      metadataByItemId.set(itemId, item ?? null);
    }
    if (!item && accessToken) continue;
    if (!item) {
      item = { id: itemId, name: `Fixture ${itemId}`, itemClassId: auction.itemClassId };
      metadataByItemId.set(itemId, item);
    }
    if (item.itemClassId !== 4) continue;
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
    if (!accessToken) await pool.query('INSERT INTO items (id,name,item_class_id) VALUES ($1,$2,4) ON CONFLICT (id) DO NOTHING', [itemId, item.name]);
  }
  for (const [itemId, value] of aggregate) await pool.query('INSERT INTO price_snapshots (ingestion_run_id,item_id,min_buyout_copper,quantity,listing_count) VALUES ($1,$2,$3,$4,$5)', [run.rows[0].id, itemId, value.min, value.quantity, value.listings]);
  const variantRows = [...variantAggregate.values()].map((value) => ({
    item_id: value.itemId, variant_key: value.variantKey, item_context: value.itemContext, bonus_list_ids: value.bonusListIds,
    modifiers: value.modifiers, tertiary_stats: value.tertiaryStats, min_buyout_copper: value.min, quantity: value.quantity, listing_count: value.listings,
    levels: [...value.levels.values()],
  }));
  for (let offset = 0; offset < variantRows.length; offset += 1000) {
    await pool.query(`WITH input AS (
        SELECT * FROM jsonb_to_recordset($2::jsonb) AS x(item_id BIGINT, variant_key TEXT, item_context INTEGER, bonus_list_ids INTEGER[], modifiers JSONB, tertiary_stats INTEGER[], min_buyout_copper BIGINT, quantity BIGINT, listing_count INTEGER, levels JSONB)
      ), saved AS (
        INSERT INTO auction_variants (item_id,variant_key,item_context,bonus_list_ids,modifiers,tertiary_stats)
        SELECT item_id,variant_key,item_context,bonus_list_ids,modifiers,tertiary_stats FROM input
        ON CONFLICT (item_id,variant_key) DO UPDATE SET item_context=EXCLUDED.item_context, bonus_list_ids=EXCLUDED.bonus_list_ids, modifiers=EXCLUDED.modifiers, tertiary_stats=EXCLUDED.tertiary_stats
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
  await pool.query("UPDATE ingestion_runs SET status='succeeded' WHERE id=$1", [run.rows[0].id]);
  return { armorListings: aggregate.size, armorVariants: variantAggregate.size, newMetadataCount };
}

async function collectFixture() {
  const fixture = JSON.parse(await readFile(new URL('../fixtures/area-52-auctions.json', import.meta.url), 'utf8'));
  const realmId = 0;
  await pool.query("INSERT INTO connected_realms (id,region,display_name,is_default) VALUES (0,'us','Area 52 (fixture)',true) ON CONFLICT (id) DO NOTHING");
  return persistSnapshot(realmId, fixture.auctions, null);
}

async function collectBlizzard() {
  const accessToken = await token();
  if (!catalogSyncedAt || Date.now() - catalogSyncedAt > 24 * 60 * 60 * 1000) try { await syncUsCatalog(accessToken); } catch (error) { console.warn(`realm_catalog_sync_skipped: ${error.message}`); }
  const target = await pool.query(`SELECT candidate.connected_realm_id,candidate.slug,candidate.display_name
    FROM (SELECT DISTINCT ON (connected_realm_id) connected_realm_id,slug,display_name,is_default FROM realms
      WHERE region=$1 AND slug=ANY($2::TEXT[]) ORDER BY connected_realm_id,is_default DESC,display_name) candidate
    LEFT JOIN LATERAL (SELECT MAX(started_at) AS captured_at FROM ingestion_runs WHERE connected_realm_id=candidate.connected_realm_id AND status='succeeded') capture ON TRUE
    ORDER BY capture.captured_at ASC NULLS FIRST,candidate.is_default DESC,candidate.display_name LIMIT 1`, [region, comparisonRealmSlugs]);
  if (!target.rowCount) throw new Error('No configured comparison realm was found in the US catalog');
  const selected = target.rows[0];
  latest = { ...latest, status: 'collecting', targetRealm: selected.display_name, detail: `collecting ${selected.slug}` };
  const auctions = await api(`/data/wow/connected-realm/${selected.connected_realm_id}/auctions?namespace=dynamic-${region}&locale=en_US`, accessToken);
  return { ...(await persistSnapshot(selected.connected_realm_id, auctions.auctions ?? [], accessToken)), realmSlug: selected.slug, realmName: selected.display_name };
}

async function collectOnce() {
  if (isCollecting) return;
  isCollecting = true;
  let error;
  try {
    for (let attempt = 1; attempt <= 5; attempt += 1) try {
      await setupSchema();
      const result = credentialsPresent ? await collectBlizzard() : await collectFixture();
      latest = { status: 'ready', mode: credentialsPresent ? 'blizzard' : 'fixture', processedAt: new Date().toISOString(), armorListings: result.armorListings, armorVariants: result.armorVariants, detail: credentialsPresent ? `synced ${result.realmSlug}; hydrated ${result.newMetadataCount} new item records` : 'Add Blizzard credentials to enable live data', targetRealm: result.realmName ?? realmSlug, comparisonTargets: comparisonRealmSlugs.length };
      error = null; break;
    } catch (caught) { error = caught; await new Promise((resolve) => setTimeout(resolve, attempt * 1000)); }
    if (error) latest = { ...latest, status: 'error', detail: error.message, processedAt: new Date().toISOString() };
    console.log(JSON.stringify({ event: 'collect_finished', ...latest }));
  } finally { isCollecting = false; }
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'access-control-allow-origin': 'http://localhost:3500', 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(body));
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  if (request.method === 'OPTIONS') return sendJson(response, 204, {});
  if (url.pathname === '/healthz') return sendJson(response, latest.status === 'error' ? 503 : 200, latest);
  try {
    if (url.pathname === '/api/realms') {
      const result = await pool.query(`SELECT id, display_name AS name, is_default AS "isDefault"
        FROM realms WHERE region=$1 ORDER BY is_default DESC, display_name ASC`, [region]);
      return sendJson(response, 200, { realms: result.rows });
    }
    const historyMatch = url.pathname.match(/^\/api\/armor\/(\d+)\/history$/);
    if (historyMatch) {
      const realmId = Number(url.searchParams.get('realmId'));
      const itemId = Number(historyMatch[1]);
      const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 30));
      const variantKey = url.searchParams.get('variantKey')?.trim() ?? '';
      if (!Number.isSafeInteger(realmId) || !Number.isSafeInteger(itemId)) return sendJson(response, 400, { error: 'Valid realmId and itemId are required' });
      const selectedRealm = await pool.query('SELECT connected_realm_id, display_name FROM realms WHERE id=$1 AND region=$2', [realmId, region]);
      if (!selectedRealm.rowCount) return sendJson(response, 404, { error: 'Unknown realm' });
      const result = variantKey ? await pool.query(`SELECT r.started_at AS "capturedAt",p.min_buyout_copper AS "minBuyoutCopper",p.quantity,p.listing_count AS "listingCount"
          FROM ingestion_runs r JOIN variant_price_snapshots p ON p.ingestion_run_id=r.id JOIN auction_variants v ON v.id=p.variant_id
          WHERE r.connected_realm_id=$1 AND r.status='succeeded' AND v.item_id=$2 AND v.variant_key=$3 AND r.started_at >= NOW()-($4::TEXT || ' days')::INTERVAL
          ORDER BY r.started_at ASC LIMIT 1000`, [selectedRealm.rows[0].connected_realm_id, itemId, variantKey, days])
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
    const comparisonMatch = url.pathname.match(/^\/api\/armor\/(\d+)\/comparison$/);
    if (comparisonMatch) {
      const itemId = Number(comparisonMatch[1]);
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
    const detailMatch = url.pathname.match(/^\/api\/armor\/(\d+)$/);
    if (detailMatch) {
      const realmId = Number(url.searchParams.get('realmId'));
      const itemId = Number(detailMatch[1]);
      if (!Number.isSafeInteger(realmId) || !Number.isSafeInteger(itemId)) return sendJson(response, 400, { error: 'Valid realmId and itemId are required' });
      const selectedRealm = await pool.query('SELECT connected_realm_id, display_name FROM realms WHERE id=$1 AND region=$2', [realmId, region]);
      if (!selectedRealm.rowCount) return sendJson(response, 404, { error: 'Unknown realm' });
      const result = await pool.query(`WITH latest_run AS (
          SELECT id,started_at FROM ingestion_runs WHERE connected_realm_id=$1 AND status='succeeded' ORDER BY started_at DESC LIMIT 1
        ), item_summary AS (
          SELECT p.min_buyout_copper,p.quantity,p.listing_count FROM latest_run JOIN price_snapshots p ON p.ingestion_run_id=latest_run.id WHERE p.item_id=$2
        ), variants AS (
          SELECT v.id,v.variant_key AS "variantKey",v.item_context AS context,v.bonus_list_ids AS "bonusListIds",v.modifiers,v.tertiary_stats AS "tertiaryStats",
            p.min_buyout_copper AS "minBuyoutCopper",p.quantity,p.listing_count AS "listingCount"
          FROM latest_run JOIN variant_price_snapshots p ON p.ingestion_run_id=latest_run.id JOIN auction_variants v ON v.id=p.variant_id
          WHERE v.item_id=$2
        )
        SELECT i.id,i.name,i.item_subclass_id AS "subclassId",i.inventory_type AS "inventoryType",latest_run.started_at AS "capturedAt",
          (SELECT row_to_json(item_summary) FROM item_summary) AS summary,
          COALESCE((SELECT json_agg(variants ORDER BY "minBuyoutCopper", "variantKey") FROM variants),'[]') AS variants,
          COALESCE((SELECT json_agg(levels ORDER BY levels."variantKey",levels."unitPriceCopper") FROM (
            SELECT v.variant_key AS "variantKey",l.unit_price_copper AS "unitPriceCopper",l.quantity,l.listing_count AS "listingCount"
            FROM latest_run JOIN variant_price_levels l ON l.ingestion_run_id=latest_run.id JOIN auction_variants v ON v.id=l.variant_id WHERE v.item_id=$2
          ) levels),'[]') AS "priceLevels"
        FROM latest_run JOIN items i ON i.id=$2`, [selectedRealm.rows[0].connected_realm_id, itemId]);
      if (!result.rowCount || !result.rows[0].summary) return sendJson(response, 404, { error: 'Item is not available in the latest snapshot' });
      return sendJson(response, 200, { ...result.rows[0], realm: selectedRealm.rows[0].display_name });
    }
    if (url.pathname === '/api/armor') {
      const realmId = Number(url.searchParams.get('realmId'));
      if (!Number.isSafeInteger(realmId)) return sendJson(response, 400, { error: 'realmId must be a connected realm id' });
      const query = url.searchParams.get('q')?.trim() ?? '';
      const bonusStat = Number(url.searchParams.get('bonusStat'));
      const subclasses = (url.searchParams.get('subclasses') ?? '').split(',').filter(Boolean).map(Number).filter(Number.isSafeInteger);
      const inventoryTypes = (url.searchParams.get('inventoryTypes') ?? '').split(',').filter(Boolean);
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const limit = Math.min(100, Math.max(10, Number(url.searchParams.get('limit')) || 50));
      const sortKey = url.searchParams.get('sort') ?? 'name';
      const sortDirection = url.searchParams.get('direction') === 'desc' ? 'DESC' : 'ASC';
      const sortColumns = { name: 'name', price: '"minBuyoutCopper"', quantity: 'quantity', listings: '"listingCount"' };
      const sortColumn = sortColumns[sortKey] ?? sortColumns.name;
      const selectedRealm = await pool.query('SELECT connected_realm_id FROM realms WHERE id=$1 AND region=$2', [realmId, region]);
      if (!selectedRealm.rowCount) return sendJson(response, 404, { error: 'Unknown realm' });
      const variantMode = [61, 62, 63, 64].includes(bonusStat);
      const result = variantMode ? await pool.query(`WITH latest_run AS (
          SELECT id, started_at FROM ingestion_runs
          WHERE connected_realm_id=$1 AND status='succeeded'
          ORDER BY started_at DESC LIMIT 1
        ), filtered AS (
        SELECT i.id, i.name, i.item_subclass_id AS "subclassId", i.inventory_type AS "inventoryType",
          v.variant_key AS "variantKey", v.item_context AS context, v.bonus_list_ids AS "bonusListIds", v.modifiers,
          v.tertiary_stats AS "tertiaryStats", p.min_buyout_copper AS "minBuyoutCopper", p.quantity,
          p.listing_count AS "listingCount", latest_run.started_at AS "capturedAt"
        FROM latest_run
        JOIN variant_price_snapshots p ON p.ingestion_run_id=latest_run.id
        JOIN auction_variants v ON v.id=p.variant_id
        JOIN items i ON i.id=v.item_id
        WHERE ($2='' OR i.name ILIKE '%' || $2 || '%') AND $3=ANY(v.tertiary_stats)
          AND (cardinality($4::INTEGER[])=0 OR i.item_subclass_id=ANY($4)) AND (cardinality($5::TEXT[])=0 OR i.inventory_type=ANY($5))
        ) SELECT *,COUNT(*) OVER() AS "totalCount" FROM filtered ORDER BY ${sortColumn} ${sortDirection},id ASC LIMIT $6 OFFSET $7`, [selectedRealm.rows[0].connected_realm_id, query, bonusStat, subclasses, inventoryTypes, limit, (page - 1) * limit]) : await pool.query(`WITH latest_run AS (
          SELECT id, started_at FROM ingestion_runs
          WHERE connected_realm_id=$1 AND status='succeeded'
          ORDER BY started_at DESC LIMIT 1
        ), filtered AS (
        SELECT i.id, i.name, i.item_subclass_id AS "subclassId", i.inventory_type AS "inventoryType",
          '' AS "variantKey", NULL::INTEGER AS context, '{}'::INTEGER[] AS "bonusListIds", '[]'::JSONB AS modifiers,
          '{}'::INTEGER[] AS "tertiaryStats", p.min_buyout_copper AS "minBuyoutCopper", p.quantity,
          p.listing_count AS "listingCount", latest_run.started_at AS "capturedAt"
        FROM latest_run JOIN price_snapshots p ON p.ingestion_run_id=latest_run.id JOIN items i ON i.id=p.item_id
        WHERE ($2='' OR i.name ILIKE '%' || $2 || '%')
          AND (cardinality($3::INTEGER[])=0 OR i.item_subclass_id=ANY($3)) AND (cardinality($4::TEXT[])=0 OR i.inventory_type=ANY($4))
        ) SELECT *,COUNT(*) OVER() AS "totalCount" FROM filtered ORDER BY ${sortColumn} ${sortDirection},id ASC LIMIT $5 OFFSET $6`, [selectedRealm.rows[0].connected_realm_id, query, subclasses, inventoryTypes, limit, (page - 1) * limit]);
      const total = Number(result.rows[0]?.totalCount ?? 0);
      const items = result.rows.map(({ totalCount, ...item }) => item);
      return sendJson(response, 200, { items, count: items.length, total, page, pages: Math.ceil(total / limit), limit });
    }
  } catch (error) {
    console.error('api_error', error.message);
    return sendJson(response, 500, { error: 'Unable to read auction data' });
  }
  return sendJson(response, 404, { error: 'Not found' });
}).listen(port, '0.0.0.0');

void collectOnce();
setInterval(() => void collectOnce(), collectionIntervalMinutes * 60 * 1000).unref();
