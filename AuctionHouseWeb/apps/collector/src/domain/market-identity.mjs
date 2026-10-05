const marketKeyPattern = /^(\d+):([a-f0-9]{64}|\*)$/i;

export function favoriteRequestsParam(searchParams, key = 'favorites') {
  const value = searchParams.get(key);
  if (!value) return [];

  const seen = new Set();
  return value.split(',').slice(0, 100).flatMap((entry, ordinal) => {
    const match = marketKeyPattern.exec(entry.trim());
    if (!match) return [];
    const itemId = Number(match[1]);
    const variantKey = match[2] === '*' ? null : match[2].toLowerCase();
    const marketKey = `${itemId}:${variantKey ?? '*'}`;
    if (!Number.isSafeInteger(itemId) || itemId <= 0 || seen.has(marketKey)) return [];
    seen.add(marketKey);
    return [{ ordinal, itemId, variantKey }];
  });
}
