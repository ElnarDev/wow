'use client';

import { useEffect, useMemo, useState } from 'react';

type Realm = { id: number; name: string; isDefault: boolean };
type Modifier = { type: number; value: number };
type ArmorItem = { id: number; name: string; subclassId: number | null; inventoryType: string | null; variantKey: string; tertiaryStats: number[]; minBuyoutCopper: number; quantity: number; listingCount: number; capturedAt: string };
type Variant = { variantKey: string; context: number | null; bonusListIds: number[]; modifiers: Modifier[]; tertiaryStats: number[]; minBuyoutCopper: number; quantity: number; listingCount: number };
type PriceLevel = { variantKey: string; unitPriceCopper: number; quantity: number; listingCount: number };
type ItemDetail = { id: number; name: string; subclassId: number | null; inventoryType: string | null; capturedAt: string; realm: string; summary: { min_buyout_copper: number; quantity: number; listing_count: number }; variants: Variant[]; priceLevels: PriceLevel[] };
type HistoryPoint = { capturedAt: string; minBuyoutCopper: number; quantity: number; listingCount: number };
type HistoryData = { points: HistoryPoint[]; stats: { captures: number; lowCopper: number | null; highCopper: number | null; medianCopper: number | null; changePercent: number | null } };
type RealmPrice = { connectedRealmId: number; name: string; minBuyoutCopper: number; quantity: number; listingCount: number; capturedAt: string };
type ComparisonData = { realms: RealmPrice[]; coverage: { monitored: number; total: number; targeted: number; targetMonitored: number } };
type ArmorLeaf = { label: string; subclassIds: number[]; types?: string[]; kind?: 'special' | 'tertiary'; bonusStat?: number };
type ArmorGroup = { label: string; subclassIds: number[]; leaves: ArmorLeaf[] };
type SearchState = { query: string; group: string | null; leaf: string | null; bonusStat?: number; subclasses: number[]; inventoryTypes: string[]; sort: string; direction: 'asc' | 'desc' };

const collectorUrl = 'http://localhost:3501';
const pageSize = 50;
const armorTypes: Record<number, string> = { 1: 'Cloth', 2: 'Leather', 3: 'Mail', 4: 'Plate', 5: 'Cosmetic', 6: 'Shields' };
const statNames: Record<number, string> = { 61: 'Speed', 62: 'Leech', 63: 'Avoidance', 64: 'Indestructible' };
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
const initialSearch: SearchState = { query: '', group: null, leaf: null, subclasses: [], inventoryTypes: [], sort: 'name', direction: 'asc' };

function formatGold(copper: number) {
  const value = Number(copper); const gold = Math.floor(value / 10_000); const silver = Math.floor((value % 10_000) / 100); const rest = value % 100;
  return <span className="whitespace-nowrap"><b className="text-[#f6d449]">{gold.toLocaleString()}</b><small>g</small> <b>{silver}</b><small>s</small> <b className="text-[#c77a4c]">{rest}</b><small>c</small></span>;
}

function variantLabel(variant: Variant, index: number) {
  const stats = variant.tertiaryStats.map((stat) => statNames[stat]).filter(Boolean);
  return stats.length ? stats.join(' · ') : `Variant ${index + 1} · ${variant.bonusListIds.length} bonuses`;
}

function PriceHistoryChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) return <div className="grid h-36 place-items-center rounded border border-dashed border-[#514a45] text-sm text-[#9d968e]">More captures are needed to draw a trend.</div>;
  const values = points.map((point) => Number(point.minBuyoutCopper)); const min = Math.min(...values); const max = Math.max(...values); const span = Math.max(1, max - min);
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${8 + (index / (points.length - 1)) * 584} ${132 - ((Number(point.minBuyoutCopper) - min) / span) * 116}`).join(' ');
  return <div className="rounded border border-[#4d453f] bg-[#171413] p-2"><svg viewBox="0 0 600 140" role="img" aria-label="Minimum price history" className="h-40 w-full overflow-visible"><path d="M 8 16 H 592 M 8 74 H 592 M 8 132 H 592" stroke="#312c29"/><path d={path} fill="none" stroke="#e8c94d" strokeWidth="3" strokeLinejoin="round"/><circle cx="592" cy={132 - ((values.at(-1)! - min) / span) * 116} r="4" fill="#fff17a"/></svg><div className="flex justify-between text-xs text-[#8f8983]"><span>{new Date(points[0].capturedAt).toLocaleDateString()}</span><span>{new Date(points.at(-1)!.capturedAt).toLocaleDateString()}</span></div></div>;
}

export function AuctionDashboard() {
  const [realms, setRealms] = useState<Realm[]>([]); const [realmId, setRealmId] = useState<number | null>(null);
  const [items, setItems] = useState<ArmorItem[]>([]); const [query, setQuery] = useState('');
  const [activeRoot, setActiveRoot] = useState('Armor'); const [armorGroup, setArmorGroup] = useState<string | null>(null); const [armorLeaf, setArmorLeaf] = useState<string | null>(null);
  const [applied, setApplied] = useState<SearchState>(initialSearch); const [page, setPage] = useState(1); const [pages, setPages] = useState(1); const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<ItemDetail | null>(null); const [selectedVariant, setSelectedVariant] = useState(''); const [wantedQuantity, setWantedQuantity] = useState(1);
  const [history, setHistory] = useState<HistoryData | null>(null); const [comparison, setComparison] = useState<ComparisonData | null>(null); const [historyDays, setHistoryDays] = useState(30);
  const [loading, setLoading] = useState(true); const [detailLoading, setDetailLoading] = useState(false); const [error, setError] = useState('');

  const loadArmor = async (targetRealmId: number, state: SearchState, targetPage = 1) => {
    setLoading(true); setError('');
    const params = new URLSearchParams({ realmId: String(targetRealmId), page: String(targetPage), limit: String(pageSize), sort: state.sort, direction: state.direction });
    if (state.query) params.set('q', state.query); if (state.bonusStat) params.set('bonusStat', String(state.bonusStat));
    if (state.subclasses.length) params.set('subclasses', state.subclasses.join(',')); if (state.inventoryTypes.length) params.set('inventoryTypes', state.inventoryTypes.join(','));
    try {
      const response = await fetch(`${collectorUrl}/api/armor?${params}`); if (!response.ok) throw new Error();
      const data = await response.json() as { items: ArmorItem[]; total: number; page: number; pages: number };
      setItems(data.items); setTotal(data.total); setPage(data.page); setPages(Math.max(1, data.pages));
    } catch { setItems([]); setTotal(0); setError('Unable to load auction data.'); } finally { setLoading(false); }
  };

  const closeDetail = () => { setDetail(null); setSelectedVariant(''); setHistory(null); setComparison(null); const url = new URL(window.location.href); url.searchParams.delete('item'); window.history.replaceState(null, '', url); };
  const openDetail = async (itemId: number, targetRealmId = realmId) => {
    if (targetRealmId === null) return; setDetailLoading(true); setError('');
    try {
      const response = await fetch(`${collectorUrl}/api/armor/${itemId}?realmId=${targetRealmId}`); if (!response.ok) throw new Error();
      const data = await response.json() as ItemDetail; setDetail(data); setSelectedVariant(data.variants[0]?.variantKey ?? ''); setWantedQuantity(1);
      const url = new URL(window.location.href); url.searchParams.set('item', String(itemId)); url.searchParams.set('realm', String(targetRealmId)); window.history.replaceState(null, '', url);
      fetch(`${collectorUrl}/api/armor/${itemId}/comparison`).then((value) => value.ok ? value.json() : Promise.reject()).then(setComparison).catch(() => setComparison(null));
    } catch { setError('Unable to load item details.'); } finally { setDetailLoading(false); }
  };

  useEffect(() => { fetch(`${collectorUrl}/api/realms`).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ realms: Realm[] }>; }).then((data) => {
    setRealms(data.realms); const urlRealm = Number(new URL(window.location.href).searchParams.get('realm')); const saved = Number(window.localStorage.getItem('auction-house-realm-id'));
    setRealmId((data.realms.find((realm) => realm.id === urlRealm) ?? data.realms.find((realm) => realm.id === saved) ?? data.realms.find((realm) => realm.isDefault) ?? data.realms[0])?.id ?? null);
  }).catch(() => { setError('Unable to load realms.'); setLoading(false); }); }, []);

  useEffect(() => { if (realmId === null) return; const deepItemId = Number(new URL(window.location.href).searchParams.get('item')); window.localStorage.setItem('auction-house-realm-id', String(realmId)); setApplied(initialSearch); setQuery(''); closeDetail();
    void loadArmor(realmId, initialSearch).then(() => { if (Number.isSafeInteger(deepItemId) && deepItemId > 0) void openDetail(deepItemId, realmId); });
    // Realm changes intentionally reset list filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realmId]);

  const buildSearch = (sort = applied.sort, direction = applied.direction): SearchState => {
    const group = armorGroups.find((entry) => entry.label === armorGroup); const leaf = group?.leaves.find((entry) => entry.label === armorLeaf);
    return { query: query.trim(), group: armorGroup, leaf: armorLeaf, bonusStat: leaf?.bonusStat, subclasses: leaf?.subclassIds.length ? leaf.subclassIds : group?.subclassIds ?? [], inventoryTypes: leaf?.types ?? [], sort, direction };
  };
  const search = () => { if (realmId === null) return; const state = buildSearch(); setApplied(state); closeDetail(); if (armorGroups.find((group) => group.label === armorGroup)?.leaves.find((leaf) => leaf.label === armorLeaf)?.kind === 'special') { setItems([]); setTotal(0); setError('Runecarving is not available yet.'); return; } void loadArmor(realmId, state); };
  const changePage = (next: number) => { if (realmId !== null && next >= 1 && next <= pages) void loadArmor(realmId, applied, next); };
  const changeSort = (sort: string) => { if (realmId === null) return; const direction = applied.sort === sort && applied.direction === 'asc' ? 'desc' : 'asc'; const state = { ...applied, sort, direction } as SearchState; setApplied(state); void loadArmor(realmId, state); };

  const activeVariant = detail?.variants.find((variant) => variant.variantKey === selectedVariant) ?? detail?.variants[0];
  useEffect(() => { if (!detail || realmId === null) return; setHistory(null); const params = new URLSearchParams({ realmId: String(realmId), days: String(historyDays) }); if (activeVariant?.variantKey) params.set('variantKey', activeVariant.variantKey);
    fetch(`${collectorUrl}/api/armor/${detail.id}/history?${params}`).then((value) => value.ok ? value.json() : Promise.reject()).then(setHistory).catch(() => setHistory(null));
  }, [detail?.id, realmId, activeVariant?.variantKey, historyDays]);
  const activeLevels = useMemo(() => detail?.priceLevels.filter((level) => level.variantKey === activeVariant?.variantKey).sort((a, b) => Number(a.unitPriceCopper) - Number(b.unitPriceCopper)) ?? [], [detail, activeVariant?.variantKey]);
  const bulk = useMemo(() => { let remaining = Math.max(0, wantedQuantity); let cost = 0; for (const level of activeLevels) { const take = Math.min(remaining, Number(level.quantity)); cost += take * Number(level.unitPriceCopper); remaining -= take; if (!remaining) break; } const bought = wantedQuantity - remaining; return { bought, cost, unit: bought ? Math.round(cost / bought) : 0 }; }, [activeLevels, wantedQuantity]);

  return <main className="h-dvh overflow-hidden bg-[#3b3531] p-1.5 font-[Tahoma,Arial,sans-serif] text-[#e7e2d8]">
    <div className="mx-auto flex h-full max-w-[1440px] flex-col gap-1.5 overflow-hidden rounded-[7px] border border-[#514a45] bg-[#272220] p-1.5 shadow-[0_0_0_1px_#171413,0_8px_30px_rgba(0,0,0,.45)]">
      <header className="flex min-h-9 flex-wrap items-center gap-2 rounded-[5px] bg-[#211c1a] px-1.5 py-1 shadow-inner shadow-black/70">
        <label className="sr-only" htmlFor="realm">Choose a realm</label><select id="realm" value={realmId ?? ''} onChange={(event) => setRealmId(Number(event.target.value))} className="h-7 w-48 rounded border border-[#77706b] bg-[#292624] px-2 text-xs outline-none focus:border-[#d0b860]">{realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}</select>
        <button aria-label="Favorites" className="grid size-7 place-items-center rounded border border-[#111] bg-[#373332] text-[#807d77]">★</button><button aria-label="Deals" className="grid size-7 place-items-center rounded border border-[#111] bg-[#373332] text-[#f0d64c]">✿</button>
        <label className="relative min-w-44 flex-1"><span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[#827b76]">⌕</span><span className="sr-only">Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') search(); }} placeholder="Search" className="h-7 w-full rounded border border-[#080706] bg-[#171514] pl-6 pr-2 text-xs outline-none placeholder:text-[#7e7873]" /></label>
        <button className="flex h-7 w-28 items-center justify-between rounded border border-[#171311] bg-[#332d2a] px-3 text-xs">Filter <span className="text-[#f0cc22]">▶</span></button><button onClick={search} className="h-7 w-[116px] rounded border border-[#d07140] bg-gradient-to-b from-[#b10d0d] to-[#680000] font-serif text-sm text-[#ffe759] shadow-[inset_0_1px_#df4545,0_0_0_1px_#160000]">Search</button>
      </header>
      <div className="grid min-h-0 flex-1 gap-1.5 lg:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="overflow-y-auto rounded-[5px] border border-[#151312] bg-[#181514] p-1.5 shadow-inner shadow-black/80">{categories.map((category) => <div key={category} className="mb-1">
          <button onClick={() => { setActiveRoot(activeRoot === category ? '' : category); setArmorGroup(null); setArmorLeaf(null); }} className={`block w-full rounded-[4px] border px-2 py-1 text-left font-serif text-sm leading-4 ${activeRoot === category ? 'border-[#d4ce63] bg-[#353127] text-[#f8e95c] shadow-[inset_0_0_10px_#b6b43b]' : 'border-[#292522] bg-[#2c2826] text-[#f3ce49] hover:bg-[#383230]'}`}>{category}</button>
          {activeRoot === 'Armor' && category === 'Armor' && armorGroups.map((group) => { const selected = armorGroup === group.label; return <div key={group.label}><button onClick={() => { setArmorGroup(selected ? null : group.label); setArmorLeaf(null); }} className={`mt-0.5 ml-3 block w-[calc(100%-0.75rem)] rounded border px-2 py-0.5 text-left font-serif text-[13px] ${selected ? 'border-[#d4ce63] bg-[#353127] text-[#f8e95c] shadow-[inset_0_0_8px_#b6b43b]' : 'border-[#292522] bg-[#2c2826] text-[#e4e0d8] hover:border-[#aaa4df]'}`}>{group.label}</button>
            {selected && group.leaves.map((leaf) => <button key={leaf.label} title={leaf.kind === 'special' ? 'Filter pending verified Runecarving data.' : undefined} onClick={() => setArmorLeaf(armorLeaf === leaf.label ? null : leaf.label)} className={`relative ml-5 block w-[calc(100%-1.25rem)] py-0.5 pl-4 pr-1 text-left font-serif text-[13px] before:absolute before:left-0 before:text-[#6f6862] before:content-['└'] ${armorLeaf === leaf.label ? 'bg-gradient-to-r from-[#56518e] via-[#45406f] to-transparent text-white' : leaf.kind === 'special' ? 'text-[#18c9ff]' : leaf.kind === 'tertiary' ? 'text-[#32ff2b]' : 'text-[#ddd8cf]'}`}>{leaf.label}</button>)}</div>; })}
        </div>)}</aside>

        <section className="min-h-0 overflow-hidden rounded-[5px] border border-[#151312] bg-[#151211] shadow-inner shadow-black/80">
          {detail || detailLoading ? <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-3 border-b border-[#413b36] bg-[#211d1b] px-3 py-1.5"><button onClick={closeDetail} className="rounded border border-[#514a45] bg-[#332d2a] px-3 py-1 font-serif text-sm text-[#f3ce49]">Back</button><span className="text-xs text-[#8f8983]">{detailLoading ? 'Loading item…' : `${detail?.realm} · updated ${new Date(detail?.capturedAt ?? '').toLocaleString()}`}</span></div>
            {detail && <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="min-h-0 overflow-y-auto p-4"><h1 className="font-serif text-xl text-[#f0d9a6]">{detail.name}</h1><p className="mt-1 text-xs text-[#8f8983]">{armorTypes[Number(detail.subclassId)] ?? 'Armor'} · {detail.inventoryType ?? 'Unknown slot'} · Item {detail.id}</p>
                <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3"><h2 className="font-serif text-[#e6ca68]">Base Stats</h2><dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm"><dt>Available</dt><dd>{Number(detail.summary.quantity).toLocaleString()}</dd><dt>Auctions</dt><dd>{Number(detail.summary.listing_count).toLocaleString()}</dd><dt>Current</dt><dd>{formatGold(detail.summary.min_buyout_copper)}</dd><dt>Variants</dt><dd>{detail.variants.length.toLocaleString()}</dd></dl></section>
                <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3"><h2 className="font-serif text-[#e6ca68]">Variants</h2><div className="mt-2 grid gap-2 sm:grid-cols-2">{detail.variants.map((variant, index) => <button key={variant.variantKey} onClick={() => { setSelectedVariant(variant.variantKey); setWantedQuantity(1); }} className={`rounded border p-2 text-left text-xs ${activeVariant?.variantKey === variant.variantKey ? 'border-[#aaa4df] bg-[#4a456f]' : 'border-[#413b36] bg-[#181514] hover:bg-[#302b28]'}`}><b className="block text-[#f0d9a6]">{variantLabel(variant, index)}</b><span>{formatGold(variant.minBuyoutCopper)} · {Number(variant.quantity).toLocaleString()} available</span></button>)}</div></section>
                <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3"><h2 className="font-serif text-[#e6ca68]">Bulk Pricing</h2><div className="mt-2 grid max-w-md grid-cols-2 gap-2 text-sm"><label htmlFor="quantity">Quantity</label><input id="quantity" type="number" min="1" max={activeVariant?.quantity ?? 1} value={wantedQuantity} onChange={(event) => setWantedQuantity(Math.max(1, Math.min(Number(activeVariant?.quantity ?? 1), Number(event.target.value) || 1)))} className="rounded border border-[#514a45] bg-[#171514] px-2 py-1"/><span>Unit Price</span><span>{formatGold(bulk.unit)}</span><span>Total Price</span><span>{formatGold(bulk.cost)}</span></div></section>
                <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3"><div className="flex items-center justify-between gap-3"><h2 className="font-serif text-[#e6ca68]">Price History</h2><select aria-label="History range" value={historyDays} onChange={(event) => setHistoryDays(Number(event.target.value))} className="rounded border border-[#514a45] bg-[#171514] px-2 py-1 text-sm"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>1 year</option></select></div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><span>Low<br/>{formatGold(history?.stats.lowCopper ?? 0)}</span><span>Median<br/>{formatGold(history?.stats.medianCopper ?? 0)}</span><span>High<br/>{formatGold(history?.stats.highCopper ?? 0)}</span><span>Change<br/><b className={(history?.stats.changePercent ?? 0) <= 0 ? 'text-[#65dc76]' : 'text-[#ff7770]'}>{history?.stats.changePercent == null ? '—' : `${history.stats.changePercent >= 0 ? '+' : ''}${history.stats.changePercent.toFixed(1)}%`}</b></span></div><div className="mt-3"><PriceHistoryChart points={history?.points ?? []}/></div><p className="mt-2 text-xs text-[#8f8983]">{history?.stats.captures ?? 0} stored captures for this variant.</p>
                </section>
                <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3"><h2 className="font-serif text-[#e6ca68]">US Realm Comparison</h2><p className="mt-1 text-xs text-[#8f8983]">Collection queue: {comparison?.coverage.targetMonitored ?? 0} of {comparison?.coverage.targeted ?? 0} target auction houses · US catalog: {comparison?.coverage.total ?? 0}.</p><div className="mt-2 overflow-x-auto"><div className="min-w-[520px] text-sm"><div className="grid grid-cols-[1fr_130px_80px] border-b border-[#504841] py-1 text-[#dac364]"><span>Realm</span><span>Price</span><span>Available</span></div>{comparison?.realms.map((entry) => <div key={entry.connectedRealmId} className="grid grid-cols-[1fr_130px_80px] border-b border-[#302b28] py-1.5"><span className="truncate pr-3" title={entry.name}>{entry.name}</span><span>{formatGold(entry.minBuyoutCopper)}</span><span>{Number(entry.quantity).toLocaleString()}</span></div>)}{comparison && comparison.realms.length === 0 && <p className="py-4 text-[#9d968e]">No monitored realm currently lists this item.</p>}</div></div></section>
              </div>
              <aside className="min-h-0 overflow-y-auto border-l border-[#413b36] bg-[#181514]"><div className="sticky top-0 grid grid-cols-[1fr_76px_62px] border-b border-[#504841] bg-[#2b2623] px-3 py-2 text-xs text-[#dac364]"><span>Unit Price</span><span>Available</span><span>Auctions</span></div>{activeLevels.map((level) => <div key={`${level.variantKey}-${level.unitPriceCopper}`} className="grid grid-cols-[1fr_76px_62px] border-b border-[#292421] px-3 py-2 text-xs"><span>{formatGold(level.unitPriceCopper)}</span><span>{Number(level.quantity).toLocaleString()}</span><span>{Number(level.listingCount).toLocaleString()}</span></div>)}</aside>
            </div>}
          </div> : <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center border-b border-[#413b36] bg-[#211d1b] px-3 py-1.5 text-xs text-[#8f8983]"><span>{loading ? 'Loading…' : `${total.toLocaleString()} results`}</span><span className="ml-auto">Page {page} of {pages}</span></div>
            <div className="grid grid-cols-[minmax(0,1fr)_145px_96px_84px] border-b border-[#504841] bg-[#2b2623] px-3 py-1 text-xs text-[#dac364]"><button className="text-left" onClick={() => changeSort('name')}>Item</button><button className="text-left" onClick={() => changeSort('price')}>Unit Price</button><button className="text-left" onClick={() => changeSort('quantity')}>Available</button><button className="text-left" onClick={() => changeSort('listings')}>Auctions</button></div>
            <div className="min-h-0 flex-1 overflow-y-auto">{items.map((item, index) => <button key={`${item.id}-${item.variantKey}`} onClick={() => void openDetail(item.id)} className={`grid w-full grid-cols-[minmax(0,1fr)_145px_96px_84px] items-center border-b border-[#292421] px-3 py-2 text-left text-[13px] ${index % 2 ? 'bg-[#211d1b]' : 'bg-[#1c1917]'} hover:bg-[#38312b]`}><span className="min-w-0"><b className="block truncate font-normal text-[#e4d6b9]">{item.name}</b><small className="block truncate text-[#8b857f]">{armorTypes[Number(item.subclassId)] ?? 'Armor'}{item.inventoryType ? ` · ${item.inventoryType}` : ''}{item.tertiaryStats.map((stat) => ` · ${statNames[stat]}`).join('')}</small></span><span>{formatGold(item.minBuyoutCopper)}</span><span>{Number(item.quantity).toLocaleString()}</span><span>{Number(item.listingCount).toLocaleString()}</span></button>)}{!loading && items.length === 0 && <p className="p-6 text-center text-sm text-[#b5aea4]">{error || 'No results found.'}</p>}</div>
            <div className="flex items-center justify-center gap-3 border-t border-[#413b36] bg-[#211d1b] p-1.5"><button disabled={page <= 1 || loading} onClick={() => changePage(page - 1)} className="rounded border border-[#514a45] bg-[#332d2a] px-4 py-1 text-xs disabled:opacity-40">Previous</button><span className="text-xs">{page} / {pages}</span><button disabled={page >= pages || loading} onClick={() => changePage(page + 1)} className="rounded border border-[#514a45] bg-[#332d2a] px-4 py-1 text-xs disabled:opacity-40">Next</button></div>
          </div>}
        </section>
      </div>
      <footer className="flex h-4 items-center gap-3 px-1 text-xs text-[#c9c2b9]"><button className="rounded bg-[#26211f] px-1.5">English (US)⌄</button><span>Home</span><span>Terms</span><span>Privacy</span><span>API</span></footer>
    </div>
  </main>;
}
