'use client';

import { useEffect, useMemo, useState } from 'react';

type Realm = { id: number; name: string; isDefault: boolean };
type Modifier = { type: number; value: number };
type ArmorItem = { id: number; name: string; subclassId: number | null; inventoryType: string | null; itemLevel: number | null; effectiveItemLevel: number | null; qualityType: string | null; qualityRank: number | null; expansionId: number | null; variantKey: string; context: number | null; bonusListIds: number[]; modifiers: Modifier[]; tertiaryStats: number[]; minBuyoutCopper: number; quantity: number; listingCount: number; capturedAt: string };
type Variant = { variantKey: string; context: number | null; bonusListIds: number[]; modifiers: Modifier[]; tertiaryStats: number[]; effectiveItemLevel: number | null; minBuyoutCopper: number; quantity: number; listingCount: number };
type PriceLevel = { variantKey: string; unitPriceCopper: number; quantity: number; listingCount: number };
type ItemDetail = { id: number; name: string; subclassId: number | null; inventoryType: string | null; capturedAt: string; realm: string; summary: { min_buyout_copper: number; quantity: number; listing_count: number }; variants: Variant[]; priceLevels: PriceLevel[] };
type HistoryPoint = { capturedAt: string; minBuyoutCopper: number; quantity: number; listingCount: number };
type HistoryData = { points: HistoryPoint[]; stats: { captures: number; lowCopper: number | null; highCopper: number | null; medianCopper: number | null; changePercent: number | null } };
type RealmPrice = { connectedRealmId: number; name: string; minBuyoutCopper: number; quantity: number; listingCount: number; capturedAt: string };
type ComparisonData = { realms: RealmPrice[]; coverage: { monitored: number; total: number; targeted: number; targetMonitored: number } };
type ArmorLeaf = { label: string; subclassIds: number[]; types?: string[]; kind?: 'special' | 'tertiary'; bonusStat?: number };
type ArmorGroup = { label: string; subclassIds: number[]; leaves: ArmorLeaf[] };
type SearchState = { query: string; group: string | null; leaf: string | null; bonusStat?: number; subclasses: number[]; inventoryTypes: string[]; expansionId: number | null; minLevel: number | null; maxLevel: number | null; minQuality: number | null; maxQuality: number | null; sort: string; direction: 'asc' | 'desc' };
type Locale = 'en-US' | 'es-MX';

const collectorUrl = 'http://localhost:3501';
const pageSize = 50;
const armorTypes: Record<number, string> = { 1: 'Cloth', 2: 'Leather', 3: 'Mail', 4: 'Plate', 5: 'Cosmetic', 6: 'Shields' };
const statNames: Record<number, string> = { 61: 'Speed', 62: 'Leech', 63: 'Avoidance', 64: 'Indestructible' };
const expansions = ['Classic', 'The Burning Crusade', 'Wrath of the Lich King', 'Cataclysm', 'Mists of Pandaria', 'Warlords of Draenor', 'Legion', 'Battle for Azeroth', 'Shadowlands', 'Dragonflight', 'The War Within', 'Midnight'];
const qualities = ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Artifact', 'Heirloom'];
const qualityColors: Record<string, string> = { POOR: '#9d9d9d', COMMON: '#ffffff', UNCOMMON: '#1eff00', RARE: '#0070dd', EPIC: '#a335ee', LEGENDARY: '#ff8000', ARTIFACT: '#e6cc80', HEIRLOOM: '#00ccff' };
const spanishLabels: Record<string, string> = { Weapons: 'Armas', Armor: 'Armadura', Plate: 'Placas', Mail: 'Malla', Leather: 'Cuero', Cloth: 'Tela', Miscellaneous: 'Miscelánea', Cosmetic: 'Cosmético', Containers: 'Contenedores', Gems: 'Gemas', 'Item Enhancements': 'Mejoras de objetos', Consumables: 'Consumibles', Glyphs: 'Glifos', 'Trade Goods': 'Componentes', Recipes: 'Recetas', 'Profession Equipment': 'Equipo de profesión', Housing: 'Viviendas', 'Battle Pets': 'Mascotas de duelo', 'Quest Items': 'Objetos de misión', Head: 'Cabeza', Shoulder: 'Hombro', Chest: 'Pecho', Waist: 'Cintura', Legs: 'Piernas', Feet: 'Pies', Wrist: 'Muñecas', Hands: 'Manos', Shields: 'Escudos', Neck: 'Cuello', Back: 'Espalda', Finger: 'Dedo', Trinket: 'Abalorio', 'Held In Off-hand': 'Mano izquierda', Shirt: 'Camisa', HOLDABLE: 'Sujetable con la mano izquierda', Speed: 'Velocidad', Leech: 'Robo de vida', Avoidance: 'Evasión', Indestructible: 'Indestructible', Runecarving: 'Tallado rúnico', Poor: 'Pobre', Common: 'Común', Uncommon: 'Inusual', Rare: 'Raro', Epic: 'Épico', Legendary: 'Legendario', Artifact: 'Artefacto', Heirloom: 'Reliquia' };
const uiCopy = {
  'en-US': { search: 'Search', filter: 'Filter', apply: 'Apply', reset: 'Reset', levelRange: 'Level Range', rarity: 'Rarity', era: 'Era', any: 'Any', item: 'Item', unitPrice: 'Unit Price', available: 'Available', auctions: 'Auctions', noResults: 'No results found.', previous: 'Previous', next: 'Next', results: 'results', loading: 'Loading…', loadingItem: 'Loading item…', back: 'Back', updated: 'updated', baseStats: 'Base Stats', current: 'Current', variants: 'Variants', bulkPricing: 'Bulk Pricing', quantity: 'Quantity', totalPrice: 'Total Price', priceHistory: 'Price History', low: 'Low', median: 'Median', high: 'High', change: 'Change', bonuses: 'bonuses', days: 'days', year: 'year', home: 'Home', terms: 'Terms', privacy: 'Privacy', api: 'API' },
  'es-MX': { search: 'Buscar', filter: 'Filtro', apply: 'Aplicar', reset: 'Restablecer', levelRange: 'Rango de nivel', rarity: 'Rareza', era: 'Expansión', any: 'Cualquiera', item: 'Objeto', unitPrice: 'Precio unitario', available: 'Disponible', auctions: 'Subastas', noResults: 'No se encontraron resultados.', previous: 'Anterior', next: 'Siguiente', results: 'resultados', loading: 'Cargando…', loadingItem: 'Cargando objeto…', back: 'Volver', updated: 'actualizado', baseStats: 'Estadísticas base', current: 'Actual', variants: 'Variantes', bulkPricing: 'Precio por cantidad', quantity: 'Cantidad', totalPrice: 'Precio total', priceHistory: 'Historial de precios', low: 'Mínimo', median: 'Mediana', high: 'Máximo', change: 'Cambio', bonuses: 'bonus', days: 'días', year: 'año', home: 'Inicio', terms: 'Términos', privacy: 'Privacidad', api: 'API' },
} as const;
const standardLeaves: ArmorLeaf[] = [
  { label: 'Runecarving', subclassIds: [], kind: 'special' }, { label: 'Head', subclassIds: [], types: ['HEAD'] },
  { label: 'Shoulder', subclassIds: [], types: ['SHOULDER'] }, { label: 'Chest', subclassIds: [], types: ['CHEST', 'ROBE'] },
  { label: 'Waist', subclassIds: [], types: ['WAIST'] }, { label: 'Legs', subclassIds: [], types: ['LEGS'] },
  { label: 'Feet', subclassIds: [], types: ['FEET'] }, { label: 'Wrist', subclassIds: [], types: ['WRIST'] }, { label: 'Hands', subclassIds: [], types: ['HANDS'] },
  { label: 'Speed', subclassIds: [], kind: 'tertiary', bonusStat: 61 }, { label: 'Leech', subclassIds: [], kind: 'tertiary', bonusStat: 62 },
  { label: 'Avoidance', subclassIds: [], kind: 'tertiary', bonusStat: 63 }, { label: 'Indestructible', subclassIds: [], kind: 'tertiary', bonusStat: 64 },
];
const leavesFor = (id: number) => standardLeaves.map((leaf) => ({ ...leaf, subclassIds: [id] }));
const armorGroups: ArmorGroup[] = [
  { label: 'Plate', subclassIds: [4], leaves: leavesFor(4) }, { label: 'Mail', subclassIds: [3], leaves: leavesFor(3) },
  { label: 'Leather', subclassIds: [2], leaves: leavesFor(2) }, { label: 'Cloth', subclassIds: [1], leaves: leavesFor(1) },
  { label: 'Miscellaneous', subclassIds: [0], leaves: [
    { label: 'Runecarving', subclassIds: [0], kind: 'special' }, { label: 'Neck', subclassIds: [0], types: ['NECK'] },
    { label: 'Back', subclassIds: [1], types: ['CLOAK'] }, { label: 'Finger', subclassIds: [0], types: ['FINGER'] },
    { label: 'Trinket', subclassIds: [0], types: ['TRINKET'] }, { label: 'Held In Off-hand', subclassIds: [0], types: ['HOLDABLE'] },
    { label: 'Shields', subclassIds: [6] }, { label: 'Shirt', subclassIds: [0], types: ['BODY'] }, { label: 'Head', subclassIds: [0], types: ['HEAD'] },
    { label: 'Speed', subclassIds: [0, 6], kind: 'tertiary', bonusStat: 61 }, { label: 'Leech', subclassIds: [0, 6], kind: 'tertiary', bonusStat: 62 },
    { label: 'Avoidance', subclassIds: [0, 6], kind: 'tertiary', bonusStat: 63 }, { label: 'Indestructible', subclassIds: [0, 6], kind: 'tertiary', bonusStat: 64 },
  ] }, { label: 'Cosmetic', subclassIds: [5], leaves: [] },
];
const categories = ['Weapons', 'Armor', 'Containers', 'Gems', 'Item Enhancements', 'Consumables', 'Glyphs', 'Trade Goods', 'Recipes', 'Profession Equipment', 'Housing', 'Battle Pets', 'Quest Items', 'Miscellaneous', 'WoW Token'];
const initialSearch: SearchState = { query: '', group: null, leaf: null, subclasses: [], inventoryTypes: [], expansionId: null, minLevel: null, maxLevel: null, minQuality: null, maxQuality: null, sort: 'name', direction: 'asc' };

function formatGold(copper: number) {
  const value = Number(copper); const gold = Math.floor(value / 10_000); const silver = Math.floor((value % 10_000) / 100); const rest = value % 100;
  return <span className="whitespace-nowrap"><b className="text-[#f6d449]">{gold.toLocaleString()}</b><small>g</small> <b>{silver}</b><small>s</small> <b className="text-[#c77a4c]">{rest}</b><small>c</small></span>;
}

function variantLabel(variant: Variant, index: number) {
  const stats = variant.tertiaryStats.map((stat) => statNames[stat]).filter(Boolean);
  const level = variant.effectiveItemLevel ? `Niv ${variant.effectiveItemLevel}` : `Variant ${index + 1}`;
  return stats.length ? `${level} · ${stats.join(' · ')}` : `${level} · ${variant.bonusListIds.length} bonuses`;
}

function wowheadData(itemId: number, bonusListIds: number[], modifiers: Modifier[], itemLevel?: number | null) {
  const playerLevel = modifiers.find((modifier) => modifier.type === 9)?.value;
  return [`item=${itemId}`, bonusListIds.length ? `bonus=${bonusListIds.join(':')}` : '', playerLevel ? `lvl=${playerLevel}` : '', itemLevel ? `ilvl=${itemLevel}` : ''].filter(Boolean).join('&');
}

function wowheadHref(itemId: number, bonusListIds: number[], modifiers: Modifier[], itemLevel?: number | null) {
  const parameters = new URLSearchParams();
  if (bonusListIds.length) parameters.set('bonus', bonusListIds.join(':'));
  const playerLevel = modifiers.find((modifier) => modifier.type === 9)?.value;
  if (playerLevel) parameters.set('lvl', String(playerLevel));
  if (itemLevel) parameters.set('ilvl', String(itemLevel));
  return `https://www.wowhead.com/item=${itemId}${parameters.size ? `?${parameters}` : ''}`;
}

function PriceHistoryChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) return <div className="grid h-36 place-items-center rounded border border-dashed border-[#514a45] text-sm text-[#9d968e]">More captures are needed to draw a trend.</div>;
  const values = points.map((point) => Number(point.minBuyoutCopper)); const min = Math.min(...values); const max = Math.max(...values); const span = Math.max(1, max - min);
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${8 + (index / (points.length - 1)) * 584} ${132 - ((Number(point.minBuyoutCopper) - min) / span) * 116}`).join(' ');
  return <div className="rounded border border-[#4d453f] bg-[#171413] p-2"><svg viewBox="0 0 600 140" role="img" aria-label="Minimum price history" className="h-40 w-full overflow-visible"><path d="M 8 16 H 592 M 8 74 H 592 M 8 132 H 592" stroke="#312c29"/><path d={path} fill="none" stroke="#e8c94d" strokeWidth="3" strokeLinejoin="round"/><circle cx="592" cy={132 - ((values.at(-1)! - min) / span) * 116} r="4" fill="#fff17a"/></svg><div className="flex justify-between text-xs text-[#8f8983]"><span>{new Date(points[0].capturedAt).toLocaleDateString()}</span><span>{new Date(points.at(-1)!.capturedAt).toLocaleDateString()}</span></div></div>;
}

export function AuctionDashboard() {
  const [locale, setLocale] = useState<Locale>('en-US');
  const [realms, setRealms] = useState<Realm[]>([]); const [realmId, setRealmId] = useState<number | null>(null);
  const [items, setItems] = useState<ArmorItem[]>([]); const [query, setQuery] = useState('');
  const [activeRoot, setActiveRoot] = useState('Armor'); const [armorGroup, setArmorGroup] = useState<string | null>(null); const [armorLeaf, setArmorLeaf] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false); const [expansionId, setExpansionId] = useState<number | null>(null); const [minLevel, setMinLevel] = useState(''); const [maxLevel, setMaxLevel] = useState(''); const [minQuality, setMinQuality] = useState<number | null>(null); const [maxQuality, setMaxQuality] = useState<number | null>(null);
  const [applied, setApplied] = useState<SearchState>(initialSearch); const [page, setPage] = useState(1); const [pages, setPages] = useState(1); const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<ItemDetail | null>(null); const [selectedVariant, setSelectedVariant] = useState(''); const [wantedQuantity, setWantedQuantity] = useState(1);
  const [history, setHistory] = useState<HistoryData | null>(null); const [comparison, setComparison] = useState<ComparisonData | null>(null); const [historyDays, setHistoryDays] = useState(30);
  const [loading, setLoading] = useState(true); const [detailLoading, setDetailLoading] = useState(false); const [error, setError] = useState('');
  const copy = uiCopy[locale]; const label = (value: string) => locale === 'es-MX' ? (spanishLabels[value] ?? value) : value;

  const loadArmor = async (targetRealmId: number, state: SearchState, targetPage = 1, targetLocale = locale) => {
    setLoading(true); setError('');
    const params = new URLSearchParams({ realmId: String(targetRealmId), page: String(targetPage), limit: String(pageSize), sort: state.sort, direction: state.direction, locale: targetLocale });
    if (state.query) params.set('q', state.query); if (state.bonusStat) params.set('bonusStat', String(state.bonusStat));
    if (state.subclasses.length) params.set('subclasses', state.subclasses.join(',')); if (state.inventoryTypes.length) params.set('inventoryTypes', state.inventoryTypes.join(','));
    if (state.expansionId !== null) params.set('expansions', String(state.expansionId)); if (state.minLevel !== null) params.set('minLevel', String(state.minLevel)); if (state.maxLevel !== null) params.set('maxLevel', String(state.maxLevel));
    if (state.minQuality !== null) params.set('minQuality', String(state.minQuality)); if (state.maxQuality !== null) params.set('maxQuality', String(state.maxQuality));
    try {
      const response = await fetch(`${collectorUrl}/api/armor?${params}`); if (!response.ok) throw new Error();
      const data = await response.json() as { items: ArmorItem[]; total: number; page: number; pages: number };
      setItems(data.items); setTotal(data.total); setPage(data.page); setPages(Math.max(1, data.pages));
    } catch { setItems([]); setTotal(0); setError('Unable to load auction data.'); } finally { setLoading(false); }
  };

  const closeDetail = () => { setDetail(null); setSelectedVariant(''); setHistory(null); setComparison(null); const url = new URL(window.location.href); url.searchParams.delete('item'); window.history.replaceState(null, '', url); };
  const openDetail = async (itemId: number, targetRealmId = realmId, targetVariantKey = '', targetLocale = locale) => {
    if (targetRealmId === null) return; setDetailLoading(true); setError('');
    try {
      const response = await fetch(`${collectorUrl}/api/armor/${itemId}?realmId=${targetRealmId}&locale=${targetLocale}`); if (!response.ok) throw new Error();
      const data = await response.json() as ItemDetail; setDetail(data); setSelectedVariant(data.variants.some((variant) => variant.variantKey === targetVariantKey) ? targetVariantKey : data.variants[0]?.variantKey ?? ''); setWantedQuantity(1);
      const url = new URL(window.location.href); url.searchParams.set('item', String(itemId)); url.searchParams.set('realm', String(targetRealmId)); window.history.replaceState(null, '', url);
      void fetch(`${collectorUrl}/api/armor/${itemId}/comparison`).then(async (value) => { if (!value.ok) throw new Error(); return value.json() as Promise<ComparisonData>; }).then((data) => setComparison(data)).catch(() => setComparison(null));
    } catch { setError('Unable to load item details.'); } finally { setDetailLoading(false); }
  };

  useEffect(() => { const savedLocale = window.localStorage.getItem('auction-house-locale'); if (savedLocale === 'es-MX' || savedLocale === 'en-US') setLocale(savedLocale); fetch(`${collectorUrl}/api/realms`).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ realms: Realm[] }>; }).then((data) => {
    setRealms(data.realms); const urlRealm = Number(new URL(window.location.href).searchParams.get('realm')); const saved = Number(window.localStorage.getItem('auction-house-realm-id')); const savedRealm = data.realms.find((realm) => realm.id === saved); const defaultRealm = data.realms.find((realm) => realm.isDefault);
    setRealmId((data.realms.find((realm) => realm.id === urlRealm) ?? (savedRealm?.id === 0 && !savedRealm.isDefault ? undefined : savedRealm) ?? defaultRealm ?? data.realms[0])?.id ?? null);
  }).catch(() => { setError('Unable to load realms.'); setLoading(false); }); }, []);
  const changeLocale = (nextLocale: Locale) => { setLocale(nextLocale); window.localStorage.setItem('auction-house-locale', nextLocale); if (realmId !== null) void loadArmor(realmId, applied, page, nextLocale); if (detail && realmId !== null) void openDetail(detail.id, realmId, selectedVariant, nextLocale); };

  useEffect(() => { if (realmId === null) return; const deepItemId = Number(new URL(window.location.href).searchParams.get('item')); window.localStorage.setItem('auction-house-realm-id', String(realmId)); setApplied(initialSearch); setQuery(''); setExpansionId(null); setMinLevel(''); setMaxLevel(''); setMinQuality(null); setMaxQuality(null); setFilterOpen(false); closeDetail();
    void loadArmor(realmId, initialSearch).then(() => { if (Number.isSafeInteger(deepItemId) && deepItemId > 0) void openDetail(deepItemId, realmId); });
    // Realm changes intentionally reset list filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realmId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const tooltipWindow = window as Window & { WH?: { Tooltips?: { refreshLinks?: () => void } }; $WowheadPower?: { refreshLinks?: () => void } };
      tooltipWindow.WH?.Tooltips?.refreshLinks?.();
      tooltipWindow.$WowheadPower?.refreshLinks?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [items, detail]);

  const buildSearch = (sort = applied.sort, direction = applied.direction): SearchState => {
    const group = armorGroups.find((entry) => entry.label === armorGroup); const leaf = group?.leaves.find((entry) => entry.label === armorLeaf);
    return { query: query.trim(), group: armorGroup, leaf: armorLeaf, bonusStat: leaf?.bonusStat, subclasses: leaf?.subclassIds.length ? leaf.subclassIds : group?.subclassIds ?? [], inventoryTypes: leaf?.types ?? [], expansionId, minLevel: minLevel === '' ? null : Number(minLevel), maxLevel: maxLevel === '' ? null : Number(maxLevel), minQuality, maxQuality, sort, direction };
  };
  useEffect(() => {
    if (!filterOpen || realmId === null) return;
    const timer = window.setTimeout(() => {
      const state = buildSearch();
      setApplied(state);
      void loadArmor(realmId, state);
    }, 300);
    return () => window.clearTimeout(timer);
  // Filter fields are intentionally applied immediately; the top search box remains explicit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOpen, realmId, expansionId, minLevel, maxLevel, minQuality, maxQuality]);
  const search = () => { if (realmId === null) return; const state = buildSearch(); setApplied(state); closeDetail(); if (armorGroups.find((group) => group.label === armorGroup)?.leaves.find((leaf) => leaf.label === armorLeaf)?.kind === 'special') { setItems([]); setTotal(0); setError('Runecarving is not available yet.'); return; } void loadArmor(realmId, state); };
  const changePage = (next: number) => { if (realmId !== null && next >= 1 && next <= pages) void loadArmor(realmId, applied, next); };
  const changeSort = (sort: string) => { if (realmId === null) return; const direction = applied.sort === sort && applied.direction === 'asc' ? 'desc' : 'asc'; const state = { ...applied, sort, direction } as SearchState; setApplied(state); void loadArmor(realmId, state); };

  const activeVariant = detail?.variants.find((variant) => variant.variantKey === selectedVariant) ?? detail?.variants[0];
  const detailId = detail?.id;
  useEffect(() => { if (!detailId || realmId === null) return; setHistory(null); const params = new URLSearchParams({ realmId: String(realmId), days: String(historyDays) }); if (activeVariant?.variantKey) params.set('variantKey', activeVariant.variantKey);
    void fetch(`${collectorUrl}/api/armor/${detailId}/history?${params}`).then(async (value) => { if (!value.ok) throw new Error(); return value.json() as Promise<HistoryData>; }).then((data) => setHistory(data)).catch(() => setHistory(null));
  }, [detailId, realmId, activeVariant?.variantKey, historyDays]);
  const activeLevels = useMemo(() => detail?.priceLevels.filter((level) => level.variantKey === activeVariant?.variantKey).sort((a, b) => Number(a.unitPriceCopper) - Number(b.unitPriceCopper)) ?? [], [detail, activeVariant?.variantKey]);
  const bulk = useMemo(() => { let remaining = Math.max(0, wantedQuantity); let cost = 0; for (const level of activeLevels) { const take = Math.min(remaining, Number(level.quantity)); cost += take * Number(level.unitPriceCopper); remaining -= take; if (!remaining) break; } const bought = wantedQuantity - remaining; return { bought, cost, unit: bought ? Math.round(cost / bought) : 0 }; }, [activeLevels, wantedQuantity]);

  return <main className="h-dvh overflow-hidden bg-[#3b3531] p-1.5 font-[Tahoma,Arial,sans-serif] text-[#e7e2d8]">
    <div className="mx-auto flex h-full max-w-[1440px] flex-col gap-1.5 overflow-hidden rounded-[7px] border border-[#514a45] bg-[#272220] p-1.5 shadow-[0_0_0_1px_#171413,0_8px_30px_rgba(0,0,0,.45)]">
      <header className="relative flex min-h-9 flex-wrap items-center gap-2 rounded-[5px] bg-[#211c1a] px-1.5 py-1 shadow-inner shadow-black/70">
        <label className="sr-only" htmlFor="realm">Choose a realm</label><select id="realm" value={realmId ?? ''} onChange={(event) => setRealmId(Number(event.target.value))} className="h-7 w-48 rounded border border-[#77706b] bg-[#292624] px-2 text-xs outline-none focus:border-[#d0b860]">{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select>
        <button aria-label="Favorites" className="grid size-7 place-items-center rounded border border-[#111] bg-[#373332] text-[#807d77]">★</button><button aria-label="Deals" className="grid size-7 place-items-center rounded border border-[#111] bg-[#373332] text-[#f0d64c]">✿</button>
        <label className="relative min-w-44 flex-1"><span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[#827b76]">⌕</span><span className="sr-only">{copy.search}</span><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') search(); }} placeholder={copy.search} className="h-7 w-full rounded border border-[#080706] bg-[#171514] pl-6 pr-2 text-xs outline-none placeholder:text-[#7e7873]" /></label>
        <button aria-expanded={filterOpen} onClick={() => setFilterOpen((value) => !value)} className={`flex h-7 w-28 items-center justify-between rounded border px-3 text-xs ${filterOpen ? 'border-[#aaa4df] bg-[#4a456f]' : 'border-[#171311] bg-[#332d2a]'}`}>{copy.filter} <span className="text-[#f0cc22]">▶</span></button><button onClick={() => { setFilterOpen(false); search(); }} className="h-7 w-[116px] rounded border border-[#d07140] bg-gradient-to-b from-[#b10d0d] to-[#680000] font-serif text-sm text-[#ffe759] shadow-[inset_0_1px_#df4545,0_0_0_1px_#160000]">{copy.search}</button>
        {filterOpen && <div className="absolute right-[122px] top-[34px] z-50 w-72 rounded border border-[#76718d] bg-[#090b19] p-3 text-sm shadow-[0_8px_24px_#000]">
          <div className="mb-3"><p className="block font-serif text-[#e9cc46]">{copy.levelRange}</p><div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><input aria-label="Minimum item level" inputMode="numeric" value={minLevel} onChange={(event) => setMinLevel(event.target.value.replace(/\D/g, ''))} className="min-w-0 rounded border border-[#343238] bg-[#211f21] px-2 py-1"/><span>–</span><input aria-label="Maximum item level" inputMode="numeric" value={maxLevel} onChange={(event) => setMaxLevel(event.target.value.replace(/\D/g, ''))} className="min-w-0 rounded border border-[#343238] bg-[#211f21] px-2 py-1"/></div></div>
          <div className="mb-3"><p className="block font-serif text-[#e9cc46]">{copy.rarity}</p><div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><select aria-label="Minimum rarity" value={minQuality ?? ''} onChange={(event) => setMinQuality(event.target.value === '' ? null : Number(event.target.value))} className="min-w-0 rounded border border-[#343238] bg-[#211f21] px-1 py-1"><option value="">{copy.any}</option>{qualities.map((quality, index) => <option key={quality} value={index} style={{ color: qualityColors[quality.toUpperCase()] }}>{label(quality)}</option>)}</select><span>to</span><select aria-label="Maximum rarity" value={maxQuality ?? ''} onChange={(event) => setMaxQuality(event.target.value === '' ? null : Number(event.target.value))} className="min-w-0 rounded border border-[#343238] bg-[#211f21] px-1 py-1"><option value="">{copy.any}</option>{qualities.map((quality, index) => <option key={quality} value={index} style={{ color: qualityColors[quality.toUpperCase()] }}>{label(quality)}</option>)}</select></div></div>
          <div className="mb-4"><label htmlFor="era" className="block font-serif text-[#e9cc46]">{copy.era}</label><select id="era" value={expansionId ?? ''} onChange={(event) => setExpansionId(event.target.value === '' ? null : Number(event.target.value))} className="mt-1 w-full rounded border border-[#343238] bg-[#211f21] px-2 py-1"><option value="">{locale === 'es-MX' ? 'Todas las expansiones' : 'All expansions'}</option>{expansions.map((expansion, index) => <option key={expansion} value={index}>{expansion}</option>)}</select></div>
        </div>}
      </header>
      <div className="grid min-h-0 flex-1 gap-1.5 lg:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="overflow-y-auto rounded-[5px] border border-[#151312] bg-[#181514] p-1.5 shadow-inner shadow-black/80">{categories.map((category) => <div key={category} className="mb-1">
          <button onClick={() => { setActiveRoot(activeRoot === category ? '' : category); setArmorGroup(null); setArmorLeaf(null); }} className={`block w-full rounded-[4px] border px-2 py-1 text-left font-serif text-sm leading-4 ${activeRoot === category ? 'border-[#d4ce63] bg-[#353127] text-[#f8e95c] shadow-[inset_0_0_10px_#b6b43b]' : 'border-[#292522] bg-[#2c2826] text-[#f3ce49] hover:bg-[#383230]'}`}>{label(category)}</button>
          {activeRoot === 'Armor' && category === 'Armor' && armorGroups.map((group) => { const selected = armorGroup === group.label; return <div key={group.label}><button onClick={() => { setArmorGroup(selected ? null : group.label); setArmorLeaf(null); }} className={`mt-0.5 ml-3 block w-[calc(100%-0.75rem)] rounded border px-2 py-0.5 text-left font-serif text-[13px] ${selected ? 'border-[#d4ce63] bg-[#353127] text-[#f8e95c] shadow-[inset_0_0_8px_#b6b43b]' : 'border-[#292522] bg-[#2c2826] text-[#e4e0d8] hover:border-[#aaa4df]'}`}>{label(group.label)}</button>
            {selected && group.leaves.map((leaf) => <button key={leaf.label} title={leaf.kind === 'special' ? 'Filter pending verified Runecarving data.' : undefined} onClick={() => setArmorLeaf(armorLeaf === leaf.label ? null : leaf.label)} className={`relative ml-5 block w-[calc(100%-1.25rem)] py-0.5 pl-4 pr-1 text-left font-serif text-[13px] before:absolute before:left-0 before:text-[#6f6862] before:content-['└'] ${armorLeaf === leaf.label ? 'bg-gradient-to-r from-[#56518e] via-[#45406f] to-transparent text-white' : leaf.kind === 'special' ? 'text-[#18c9ff]' : leaf.kind === 'tertiary' ? 'text-[#32ff2b]' : 'text-[#ddd8cf]'}`}>{label(leaf.label)}</button>)}</div>; })}
        </div>)}</aside>

        <section className="min-h-0 overflow-hidden rounded-[5px] border border-[#151312] bg-[#151211] shadow-inner shadow-black/80">
          {detail || detailLoading ? <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-3 border-b border-[#413b36] bg-[#211d1b] px-3 py-1.5"><button onClick={closeDetail} className="rounded border border-[#514a45] bg-[#332d2a] px-3 py-1 font-serif text-sm text-[#f3ce49]">{copy.back}</button><span className="text-xs text-[#8f8983]">{detailLoading ? copy.loadingItem : `${detail?.realm} · ${copy.updated} ${new Date(detail?.capturedAt ?? '').toLocaleString(locale)}`}</span></div>
            {detail && <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="min-h-0 overflow-y-auto p-4"><h1 className="font-serif text-xl text-[#f0d9a6]">{detail.name}</h1><p className="mt-1 text-xs text-[#8f8983]">{armorTypes[Number(detail.subclassId)] ?? 'Armor'} · {detail.inventoryType ?? 'Unknown slot'} · Item {detail.id}</p>
                <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3"><h2 className="font-serif text-[#e6ca68]">{copy.baseStats}</h2><dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm"><dt>{copy.available}</dt><dd>{Number(detail.summary.quantity).toLocaleString()}</dd><dt>{copy.auctions}</dt><dd>{Number(detail.summary.listing_count).toLocaleString()}</dd><dt>{copy.current}</dt><dd>{formatGold(detail.summary.min_buyout_copper)}</dd><dt>{copy.variants}</dt><dd>{detail.variants.length.toLocaleString()}</dd></dl></section>
                <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3"><h2 className="font-serif text-[#e6ca68]">{copy.variants}</h2><div className="mt-2 grid gap-2 sm:grid-cols-2">{detail.variants.map((variant, index) => <button key={variant.variantKey} onClick={() => { setSelectedVariant(variant.variantKey); setWantedQuantity(1); }} className={`rounded border p-2 text-left text-xs ${activeVariant?.variantKey === variant.variantKey ? 'border-[#aaa4df] bg-[#4a456f]' : 'border-[#413b36] bg-[#181514] hover:bg-[#302b28]'}`}><b className="block text-[#f0d9a6]">{variantLabel(variant, index)}</b><span>{formatGold(variant.minBuyoutCopper)} · {Number(variant.quantity).toLocaleString()} {copy.available.toLowerCase()}</span></button>)}</div></section>
                <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3"><h2 className="font-serif text-[#e6ca68]">{copy.bulkPricing}</h2><div className="mt-2 grid max-w-md grid-cols-2 gap-2 text-sm"><label htmlFor="quantity">{copy.quantity}</label><input id="quantity" type="number" min="1" max={activeVariant?.quantity ?? 1} value={wantedQuantity} onChange={(event) => setWantedQuantity(Math.max(1, Math.min(Number(activeVariant?.quantity ?? 1), Number(event.target.value) || 1)))} className="rounded border border-[#514a45] bg-[#171514] px-2 py-1"/><span>{copy.unitPrice}</span><span>{formatGold(bulk.unit)}</span><span>{copy.totalPrice}</span><span>{formatGold(bulk.cost)}</span></div></section>
                <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3"><div className="flex items-center justify-between gap-3"><h2 className="font-serif text-[#e6ca68]">{copy.priceHistory}</h2><select aria-label="History range" value={historyDays} onChange={(event) => setHistoryDays(Number(event.target.value))} className="rounded border border-[#514a45] bg-[#171514] px-2 py-1 text-sm"><option value={7}>7 {copy.days}</option><option value={30}>30 {copy.days}</option><option value={90}>90 {copy.days}</option><option value={365}>1 {copy.year}</option></select></div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><span>Low<br/>{formatGold(history?.stats.lowCopper ?? 0)}</span><span>Median<br/>{formatGold(history?.stats.medianCopper ?? 0)}</span><span>High<br/>{formatGold(history?.stats.highCopper ?? 0)}</span><span>Change<br/><b className={(history?.stats.changePercent ?? 0) <= 0 ? 'text-[#65dc76]' : 'text-[#ff7770]'}>{history?.stats.changePercent == null ? '—' : `${history.stats.changePercent >= 0 ? '+' : ''}${history.stats.changePercent.toFixed(1)}%`}</b></span></div><div className="mt-3"><PriceHistoryChart points={history?.points ?? []}/></div><p className="mt-2 text-xs text-[#8f8983]">{history?.stats.captures ?? 0} stored captures for this variant.</p>
                </section>
                <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3"><h2 className="font-serif text-[#e6ca68]">US Realm Comparison</h2><p className="mt-1 text-xs text-[#8f8983]">Collection queue: {comparison?.coverage.targetMonitored ?? 0} of {comparison?.coverage.targeted ?? 0} target auction houses · US catalog: {comparison?.coverage.total ?? 0}.</p><div className="mt-2 overflow-x-auto"><div className="min-w-[520px] text-sm"><div className="grid grid-cols-[1fr_130px_80px] border-b border-[#504841] py-1 text-[#dac364]"><span>Realm</span><span>Price</span><span>Available</span></div>{comparison?.realms.map((entry) => <div key={entry.connectedRealmId} className="grid grid-cols-[1fr_130px_80px] border-b border-[#302b28] py-1.5"><span className="truncate pr-3" title={entry.name}>{entry.name}</span><span>{formatGold(entry.minBuyoutCopper)}</span><span>{Number(entry.quantity).toLocaleString()}</span></div>)}{comparison && comparison.realms.length === 0 && <p className="py-4 text-[#9d968e]">No monitored realm currently lists this item.</p>}</div></div></section>
              </div>
              <aside className="min-h-0 overflow-y-auto border-l border-[#413b36] bg-[#181514]"><div className="sticky top-0 grid grid-cols-[1fr_76px_62px] border-b border-[#504841] bg-[#2b2623] px-3 py-2 text-xs text-[#dac364]"><span>{copy.unitPrice}</span><span>{copy.available}</span><span>{copy.auctions}</span></div>{activeLevels.map((level) => <div key={`${level.variantKey}-${level.unitPriceCopper}`} className="grid grid-cols-[1fr_76px_62px] border-b border-[#292421] px-3 py-2 text-xs"><span>{formatGold(level.unitPriceCopper)}</span><span>{Number(level.quantity).toLocaleString()}</span><span>{Number(level.listingCount).toLocaleString()}</span></div>)}</aside>
            </div>}
          </div> : <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center border-b border-[#413b36] bg-[#211d1b] px-3 py-1.5 text-xs text-[#8f8983]"><span>{loading ? copy.loading : `${total.toLocaleString()} ${copy.results}`}</span><span className="ml-auto">{locale === 'es-MX' ? `Página ${page} de ${pages}` : `Page ${page} of ${pages}`}</span></div>
            <div className="grid grid-cols-[minmax(0,1fr)_145px_96px_84px] border-b border-[#504841] bg-[#2b2623] px-3 py-1 text-xs text-[#dac364]"><button className="text-left" onClick={() => changeSort('name')}>{copy.item}</button><button className="text-left" onClick={() => changeSort('price')}>{copy.unitPrice}</button><button className="text-left" onClick={() => changeSort('quantity')}>{copy.available}</button><button className="text-left" onClick={() => changeSort('listings')}>{copy.auctions}</button></div>
            <div className="min-h-0 flex-1 overflow-y-auto">{items.map((item, index) => <div key={`${item.id}-${item.variantKey}`} role="button" tabIndex={0} onClick={() => void openDetail(item.id, realmId, item.variantKey)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void openDetail(item.id, realmId, item.variantKey); } }} className={`grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_145px_96px_84px] items-center border-b border-[#292421] px-3 py-2 text-left text-[13px] outline-none ${index % 2 ? 'bg-[#211d1b]' : 'bg-[#1c1917]'} hover:bg-[#38312b] focus:bg-[#38312b]`}><span className="min-w-0"><a href={wowheadHref(item.id, item.bonusListIds, item.modifiers, item.effectiveItemLevel)} data-wowhead={wowheadData(item.id, item.bonusListIds, item.modifiers, item.effectiveItemLevel)} data-wh-icon-size="tiny" onClick={(event) => event.preventDefault()} className="block truncate font-normal no-underline" style={{ color: qualityColors[item.qualityType ?? ''] ?? '#e4d6b9' }}>{item.name}</a><small className="block truncate text-[#8b857f]">{label(armorTypes[Number(item.subclassId)] ?? 'Armor')}{item.inventoryType ? ` · ${item.inventoryType}` : ''}{item.effectiveItemLevel !== null ? ` · ${locale === 'es-MX' ? 'Niv' : 'Lvl'} ${item.effectiveItemLevel}` : item.itemLevel !== null ? ` · ${locale === 'es-MX' ? 'Base' : 'Base'} ${item.itemLevel}` : ''}{item.tertiaryStats.map((stat) => ` · ${label(statNames[stat])}`).join('')}</small></span><span>{formatGold(item.minBuyoutCopper)}</span><span>{Number(item.quantity).toLocaleString()}</span><span>{Number(item.listingCount).toLocaleString()}</span></div>)}{!loading && items.length === 0 && <p className="p-6 text-center text-sm text-[#b5aea4]">{error || copy.noResults}</p>}</div>
            <div className="flex items-center justify-center gap-3 border-t border-[#413b36] bg-[#211d1b] p-1.5"><button disabled={page <= 1 || loading} onClick={() => changePage(page - 1)} className="rounded border border-[#514a45] bg-[#332d2a] px-4 py-1 text-xs disabled:opacity-40">{copy.previous}</button><span className="text-xs">{page} / {pages}</span><button disabled={page >= pages || loading} onClick={() => changePage(page + 1)} className="rounded border border-[#514a45] bg-[#332d2a] px-4 py-1 text-xs disabled:opacity-40">{copy.next}</button></div>
          </div>}
        </section>
      </div>
      <footer className="flex h-4 items-center gap-3 px-1 text-xs text-[#c9c2b9]"><select aria-label="Language" value={locale} onChange={(event) => changeLocale(event.target.value as Locale)} className="rounded border-0 bg-[#26211f] px-1.5 text-xs text-[#c9c2b9]"><option value="en-US">English (US)</option><option value="es-MX">Español (MX)</option></select><span>{copy.home}</span><span>{copy.terms}</span><span>{copy.privacy}</span><span>{copy.api}</span></footer>
    </div>
  </main>;
}
