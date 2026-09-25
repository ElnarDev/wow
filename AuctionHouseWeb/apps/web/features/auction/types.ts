export type Locale = 'en-US' | 'es-MX';

export type Realm = { id: number; name: string; isDefault: boolean };
export type Modifier = { type: number; value: number };

export type AuctionItem = {
  id: number;
  name: string;
  itemClassId: number | null;
  subclassId: number | null;
  inventoryType: string | null;
  itemLevel: number | null;
  effectiveItemLevel: number | null;
  qualityType: string | null;
  qualityRank: number | null;
  craftingQualityTier?: number | null;
  expansionId: number | null;
  variantKey: string;
  context: number | null;
  bonusListIds: number[];
  modifiers: Modifier[];
  tertiaryStats: number[];
  minBuyoutCopper: number;
  quantity: number;
  listingCount: number;
  capturedAt: string;
  isAvailable: boolean;
  lastSeenAt: string;
};

export type AuctionVariant = {
  variantKey: string;
  context: number | null;
  bonusListIds: number[];
  modifiers: Modifier[];
  tertiaryStats: number[];
  effectiveItemLevel: number | null;
  minBuyoutCopper: number;
  quantity: number;
  listingCount: number;
};

export type PriceLevel = { variantKey: string; unitPriceCopper: number; quantity: number; listingCount: number };
export type ItemDetail = {
  id: number;
  name: string;
  itemClassId: number | null;
  subclassId: number | null;
  inventoryType: string | null;
  qualityType: string | null;
  qualityRank: number | null;
  capturedAt: string;
  realm: string;
  summary: { min_buyout_copper: number; quantity: number; listing_count: number };
  variants: AuctionVariant[];
  priceLevels: PriceLevel[];
};

export type HistoryPoint = { capturedAt: string; minBuyoutCopper: number; quantity: number; listingCount: number };
export type HistoryData = { points: HistoryPoint[]; stats: { captures: number; lowCopper: number | null; highCopper: number | null; medianCopper: number | null; changePercent: number | null } };
export type WowTokenData = { latest: { currentCopper: number; updatedAt: string } | null; points: Array<Pick<HistoryPoint, 'capturedAt' | 'minBuyoutCopper'>>; stats: { captures: number; medianCopper: number | null; meanCopper: number | null } };
export type RealmPrice = { connectedRealmId: number; name: string; minBuyoutCopper: number; quantity: number; listingCount: number; capturedAt: string };
export type ComparisonData = { realms: RealmPrice[]; coverage: { monitored: number; total: number; targeted: number; targetMonitored: number } };
export type Favorite = { itemId: number; category: string; name: string; addedAt: string };
export type CollectorHealth = { status: 'starting' | 'collecting' | 'ready' | 'error'; processedAt?: string | null; armorListings?: number; detail?: string | null; targetRealm?: string | null; progress?: { stage: string; current: number; total: number } };

export type CategoryLeaf = { label: string; subclassIds: number[]; types?: string[]; kind?: 'special' | 'tertiary'; bonusStat?: number };
export type CategoryGroup = { label: string; subclassIds: number[]; leaves: CategoryLeaf[] };
export type SearchState = { category: string; query: string; group: string | null; leaf: string | null; bonusStat?: number; subclasses: number[]; inventoryTypes: string[]; expansionId: number | null; minLevel: number | null; maxLevel: number | null; minQuality: number | null; maxQuality: number | null; includeOutOfStock: boolean; sort: string; direction: 'asc' | 'desc' };

