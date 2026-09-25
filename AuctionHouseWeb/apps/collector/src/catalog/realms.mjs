import { blizzardApi, blizzardApiHref, connectedRealmId, localizedName } from '../blizzard/client.mjs';
import { comparisonRealmSlugs, realmSlug, region } from '../config.mjs';
import { pool } from '../database.mjs';
import { mapWithConcurrency } from '../utils/map-with-concurrency.mjs';

const catalogRefreshIntervalMs = 24 * 60 * 60 * 1000;
let lastSynchronizedAt = 0;

export function shouldSynchronizeRealms(now = Date.now()) {
  return !lastSynchronizedAt || now - lastSynchronizedAt > catalogRefreshIntervalMs;
}

export async function synchronizeUsRealms(accessToken) {
  const index = await blizzardApi(
    `/data/wow/connected-realm/index?namespace=dynamic-${region}&locale=en_US`,
    accessToken,
  );

  await pool.query('UPDATE connected_realms SET is_default=FALSE WHERE region=$1', [region]);
  await pool.query('UPDATE realms SET is_default=FALSE WHERE region=$1', [region]);
  const connectedRealms = await mapWithConcurrency(
    index.connected_realms ?? [],
    8,
    (reference) => blizzardApiHref(reference.href, accessToken),
  );

  for (const connectedRealm of connectedRealms) {
    const id = connectedRealmId(connectedRealm._links?.self ?? connectedRealm.key ?? connectedRealm.href);
    if (!id) continue;
    const visibleRealms = connectedRealm.realms ?? [];
    const displayName = localizedName(visibleRealms[0]?.name, `Connected realm ${id}`);
    await pool.query(
      `INSERT INTO connected_realms (id, region, display_name, is_default, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name, is_default=EXCLUDED.is_default, updated_at=NOW()`,
      [id, region, displayName, visibleRealms.some((realm) => realm.slug === realmSlug)],
    );
    for (const realm of visibleRealms) {
      await pool.query(
        `INSERT INTO realms (id, connected_realm_id, region, slug, display_name, is_default, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         ON CONFLICT (id) DO UPDATE SET connected_realm_id=EXCLUDED.connected_realm_id, slug=EXCLUDED.slug, display_name=EXCLUDED.display_name, is_default=EXCLUDED.is_default, updated_at=NOW()`,
        [realm.id, id, region, realm.slug, localizedName(realm.name, realm.slug), realm.slug === realmSlug],
      );
    }
  }

  await pool.query('UPDATE connected_realms SET comparison_enabled=FALSE WHERE region=$1', [region]);
  await pool.query(
    `UPDATE connected_realms SET comparison_enabled=TRUE WHERE id IN (
       SELECT DISTINCT connected_realm_id FROM realms WHERE region=$1 AND slug=ANY($2::TEXT[])
     )`,
    [region, comparisonRealmSlugs],
  );
  lastSynchronizedAt = Date.now();
}
