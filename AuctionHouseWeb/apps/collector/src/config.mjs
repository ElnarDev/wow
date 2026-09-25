export const port = Number(process.env.COLLECTOR_PORT ?? 3001);
export const region = process.env.WOW_REGION ?? 'us';
export const realmSlug = process.env.DEFAULT_REALM_SLUG ?? 'area-52';
export const comparisonRealmSlugs = [...new Set([
  realmSlug,
  ...(process.env.COMPARISON_REALM_SLUGS ?? 'stormrage,illidan,tichondrius,sargeras,malganis').split(','),
].map((value) => value.trim()).filter(Boolean))];
export const collectionIntervalMinutes = Math.max(5, Number(process.env.COLLECTION_INTERVAL_MINUTES) || 10);
export const itemMetadataConcurrency = Math.max(1, Number(process.env.ITEM_METADATA_CONCURRENCY) || 6);
export const credentialsPresent = [process.env.BLIZZARD_CLIENT_ID, process.env.BLIZZARD_CLIENT_SECRET]
  .every((value) => typeof value === 'string' && value.trim().length > 0);

