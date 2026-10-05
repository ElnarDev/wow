const variantKeyPattern = /^[a-f0-9]{64}$/i;
export const favoritesStorageVersion = 2;

function itemId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function marketKeyFor(itemIdValue, variantKey) {
  const id = itemId(itemIdValue);
  if (id === null) return null;
  return `${id}:${typeof variantKey === 'string' && variantKeyPattern.test(variantKey) ? variantKey.toLowerCase() : '*'}`;
}

export function parseStoredFavorites(value) {
  const parsed = JSON.parse(value ?? '[]');
  const entries = Array.isArray(parsed)
    ? parsed
    : parsed?.version === favoritesStorageVersion && Array.isArray(parsed.favorites)
      ? parsed.favorites
      : [];

  const keys = new Set();
  return entries.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) return [];
    const id = itemId(candidate.itemId);
    const variantKey = typeof candidate.variantKey === 'string' && variantKeyPattern.test(candidate.variantKey)
      ? candidate.variantKey.toLowerCase()
      : null;
    const marketKey = marketKeyFor(id, variantKey);
    if (id === null || marketKey === null || keys.has(marketKey)
      || typeof candidate.category !== 'string'
      || typeof candidate.name !== 'string'
      || typeof candidate.addedAt !== 'string') return [];
    keys.add(marketKey);
    return [{
      itemId: id,
      variantKey,
      marketKey,
      category: candidate.category,
      name: candidate.name,
      addedAt: candidate.addedAt,
    }];
  }).slice(0, 100);
}

export function serializeFavorites(favorites) {
  return JSON.stringify({ version: favoritesStorageVersion, favorites });
}
