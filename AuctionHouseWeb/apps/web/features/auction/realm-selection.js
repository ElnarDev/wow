/**
 * A realm id comes from a PostgreSQL BIGINT, so it may reach the browser as a
 * string. Keep the conversion at this boundary and reject values that cannot
 * safely be used by the rest of the UI.
 */
export function parseRealmId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;

  const id = Number(text);
  return Number.isSafeInteger(id) && id >= 0 ? id : null;
}

export function normalizeRealms(value) {
  if (!Array.isArray(value)) return [];

  const ids = new Set();
  return value.flatMap((candidate) => {
    if (typeof candidate !== 'object' || candidate === null) return [];
    const id = parseRealmId(candidate.id);
    const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
    if (id === null || !name || ids.has(id)) return [];
    ids.add(id);
    return [{ id, name, isDefault: candidate.isDefault === true }];
  });
}

/**
 * URL is an explicit shareable choice and has precedence over the saved
 * preference. Invalid URL values deliberately fall back, but remain visible
 * to the caller so it can explain what happened instead of showing an empty
 * selector.
 */
export function selectInitialRealm(realms, urlValue, savedValue) {
  const urlId = parseRealmId(urlValue);
  const hasUrlValue = typeof urlValue === 'string' && urlValue.trim() !== '';
  const urlRealm = urlId === null ? undefined : realms.find((realm) => realm.id === urlId);
  if (urlRealm) return { realmId: urlRealm.id, source: 'url', invalidUrl: false };

  const savedId = parseRealmId(savedValue);
  const savedRealm = savedId === null ? undefined : realms.find((realm) => realm.id === savedId);
  if (savedRealm) return { realmId: savedRealm.id, source: 'saved', invalidUrl: hasUrlValue };

  const fallback = realms.find((realm) => realm.isDefault) ?? realms[0];
  return {
    realmId: fallback?.id ?? null,
    source: fallback ? 'default' : 'none',
    invalidUrl: hasUrlValue,
  };
}
