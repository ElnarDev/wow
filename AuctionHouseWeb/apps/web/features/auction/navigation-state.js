export function writeSearchState(url, realmId, state) {
  url.searchParams.set('realm', String(realmId));
  const values = {
    category: state.category, q: state.query, group: state.group, leaf: state.leaf,
    expansion: state.expansionId, minLevel: state.minLevel, maxLevel: state.maxLevel,
    minQuality: state.minQuality, maxQuality: state.maxQuality,
    outOfStock: state.includeOutOfStock ? '1' : null, sort: state.sort, direction: state.direction,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === '' || value === undefined) url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  return url;
}
