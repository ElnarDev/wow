import type {
  AuctionItem,
  CollectorHealth,
  ComparisonData,
  HistoryData,
  ItemDetail,
  Locale,
  Realm,
  SearchState,
  WowTokenData,
} from './types';

const collectorUrl = 'http://localhost:3501';

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${collectorUrl}${path}`);
  if (!response.ok) throw new Error(`Collector request failed: ${response.status} ${path}`);
  return response.json() as Promise<T>;
}

export const auctionApi = {
  health: () => getJson<CollectorHealth>('/healthz'),
  realms: () => getJson<{ realms: Realm[] }>('/api/realms'),
  wowToken: () => getJson<WowTokenData>('/api/wow-token'),
  favorites(realmId: number, locale: Locale, itemIds: number[]) {
    const params = new URLSearchParams({ realmId: String(realmId), locale, ids: itemIds.join(',') });
    return getJson<{ items: AuctionItem[] }>(`/api/favorites?${params}`);
  },
  search(path: string, realmId: number, state: SearchState, page: number, limit: number, locale: Locale) {
    const params = new URLSearchParams({ realmId: String(realmId), page: String(page), limit: String(limit), sort: state.sort, direction: state.direction, locale });
    if (state.query) params.set('q', state.query);
    if (state.bonusStat) params.set('bonusStat', String(state.bonusStat));
    if (state.subclasses.length) params.set('subclasses', state.subclasses.join(','));
    if (state.inventoryTypes.length) params.set('inventoryTypes', state.inventoryTypes.join(','));
    if (state.expansionId !== null) params.set('expansions', String(state.expansionId));
    if (state.minLevel !== null) params.set('minLevel', String(state.minLevel));
    if (state.maxLevel !== null) params.set('maxLevel', String(state.maxLevel));
    if (state.minQuality !== null) params.set('minQuality', String(state.minQuality));
    if (state.maxQuality !== null) params.set('maxQuality', String(state.maxQuality));
    if (state.includeOutOfStock) params.set('includeOutOfStock', 'true');
    return getJson<{ items: AuctionItem[]; total: number; page: number; pages: number }>(`/api/${path}?${params}`);
  },
  item(path: string, itemId: number, realmId: number, locale: Locale) {
    const params = new URLSearchParams({ realmId: String(realmId), locale });
    return getJson<ItemDetail>(`/api/${path}/${itemId}?${params}`);
  },
  comparison(path: string, itemId: number) {
    return getJson<ComparisonData>(`/api/${path}/${itemId}/comparison`);
  },
  history(path: string, itemId: number, realmId: number, days: number, variantKey?: string) {
    const params = new URLSearchParams({ realmId: String(realmId), days: String(days) });
    if (variantKey) params.set('variantKey', variantKey);
    return getJson<HistoryData>(`/api/${path}/${itemId}/history?${params}`);
  },
};
