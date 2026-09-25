import type { Locale, Realm } from '../types';
import { AuctionFilterPanel } from './auction-filter-panel';

type Props = {
  locale: Locale;
  realms: Realm[];
  realmId: number | null;
  disabled: boolean;
  favoritesOpen: boolean;
  filterOpen: boolean;
  query: string;
  copy: { search: string; filter: string; levelRange: string; rarity: string; era: string; any: string };
  minLevel: string;
  maxLevel: string;
  minQuality: number | null;
  maxQuality: number | null;
  expansionId: number | null;
  includeOutOfStock: boolean;
  label: (value: string) => string;
  onRealmChange: (realmId: number) => void;
  onFavoritesToggle: () => void;
  onQueryChange: (query: string) => void;
  onFilterToggle: () => void;
  onSearch: () => void;
  onMinLevelChange: (value: string) => void;
  onMaxLevelChange: (value: string) => void;
  onMinQualityChange: (value: number | null) => void;
  onMaxQualityChange: (value: number | null) => void;
  onExpansionChange: (value: number | null) => void;
  onIncludeOutOfStockChange: (value: boolean) => void;
};

export function AuctionHeader(props: Props) {
  const runSearch = () => props.onSearch();

  return <header aria-busy={props.disabled} className={`relative flex min-h-9 flex-wrap items-center gap-2 rounded-[5px] bg-[#211c1a] px-1.5 py-1 shadow-inner shadow-black/70 ${props.disabled ? 'pointer-events-none' : ''}`}>
    <label className="sr-only" htmlFor="realm">Choose a realm</label>
    <select id="realm" value={props.realmId ?? ''} onChange={(event) => props.onRealmChange(Number(event.target.value))} className="h-7 w-48 rounded border border-[#77706b] bg-[#292624] px-2 text-xs outline-none focus:border-[#d0b860]">
      {props.realms.map((realm) => <option key={realm.id} value={realm.id}>{realm.name}</option>)}
    </select>
    <button aria-label={props.locale === 'es-MX' ? 'Mostrar favoritos' : 'Show favorites'} aria-pressed={props.favoritesOpen} onClick={props.onFavoritesToggle} className={`relative grid size-7 place-items-center rounded border text-lg ${props.favoritesOpen ? 'border-[#d4ce63] bg-[#4b4430] text-[#fff17a]' : 'border-[#111] bg-[#373332] text-[#807d77] hover:text-[#fff17a]'}`}>★</button>
    <button aria-label="Deals" className="grid size-7 place-items-center rounded border border-[#111] bg-[#373332] text-[#f0d64c]">✿</button>
    <label className="relative min-w-44 flex-1"><span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[#827b76]">⌕</span><span className="sr-only">{props.copy.search}</span><input value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); runSearch(); } }} placeholder={props.copy.search} className="h-7 w-full rounded border border-[#080706] bg-[#171514] pl-6 pr-2 text-xs outline-none placeholder:text-[#7e7873]" /></label>
    <button aria-expanded={props.filterOpen} onClick={props.onFilterToggle} className={`flex h-7 w-28 items-center justify-between rounded border px-3 text-xs ${props.filterOpen ? 'border-[#aaa4df] bg-[#4a456f]' : 'border-[#171311] bg-[#332d2a]'}`}>{props.copy.filter} <span className="text-[#f0cc22]">▶</span></button>
    <button onClick={runSearch} className="h-7 w-[116px] rounded border border-[#d07140] bg-gradient-to-b from-[#b10d0d] to-[#680000] font-serif text-sm text-[#ffe759] shadow-[inset_0_1px_#df4545,0_0_0_1px_#160000]">{props.copy.search}</button>
    {props.filterOpen && <AuctionFilterPanel locale={props.locale} levelRangeLabel={props.copy.levelRange} rarityLabel={props.copy.rarity} eraLabel={props.copy.era} anyLabel={props.copy.any} minLevel={props.minLevel} maxLevel={props.maxLevel} minQuality={props.minQuality} maxQuality={props.maxQuality} expansionId={props.expansionId} includeOutOfStock={props.includeOutOfStock} label={props.label} onMinLevelChange={props.onMinLevelChange} onMaxLevelChange={props.onMaxLevelChange} onMinQualityChange={props.onMinQualityChange} onMaxQualityChange={props.onMaxQualityChange} onExpansionChange={props.onExpansionChange} onIncludeOutOfStockChange={props.onIncludeOutOfStockChange} />}
  </header>;
}
