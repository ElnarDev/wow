'use client';

import type { AuctionItem, Locale, SearchState } from '../types';
import { wowheadData, wowheadHref } from '../wowhead';
import { ItemQualityBadge } from './item-quality-badge';
import { Money } from './money';

type ResultsTableProps = {
  items: AuctionItem[];
  locale: Locale;
  statusText: string;
  showHeader: boolean;
  loading: boolean;
  emptyText: string;
  sort: Pick<SearchState, 'sort' | 'direction'>;
  labels: { price: string; item: string; level: string; available: string; auctions: string };
  qualityColor: (quality: string | null) => string;
  qualityTier: (item: AuctionItem) => number | undefined;
  isFavorite: (itemId: number) => boolean;
  onSort: (key: string) => void;
  onOpen: (item: AuctionItem) => void;
  onToggleFavorite: (item: AuctionItem) => void;
};

function SortHeader({ field, title, sort, onSort }: { field: string; title: string; sort: Pick<SearchState, 'sort' | 'direction'>; onSort: (field: string) => void }) {
  const active = sort.sort === field;
  return <span role="columnheader" aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className={`flex w-full items-center gap-1 text-left hover:text-[#fff17a] ${active ? 'text-[#fff17a]' : ''}`} onClick={() => onSort(field)}>{title}<span aria-hidden="true" className={active ? '' : 'opacity-35'}>{active && sort.direction === 'desc' ? '▼' : '▲'}</span></button></span>;
}

export function ResultsTable({ items, locale, statusText, showHeader, loading, emptyText, sort, labels, qualityColor, qualityTier, isFavorite, onSort, onOpen, onToggleFavorite }: ResultsTableProps) {
  const headers: Array<[string, string]> = [['price', labels.price], ['name', labels.item], ['level', labels.level], ['quantity', labels.available], ['listings', labels.auctions]];

  return <div className="flex h-full min-h-0 flex-col">
    <div className="flex items-center border-b border-[#413b36] bg-[#211d1b] px-3 py-1.5 text-xs text-[#8f8983]"><span>{statusText}</span></div>
    {showHeader && <div role="row" className="grid grid-cols-[145px_minmax(0,1fr)_56px_96px_84px] border-b border-[#504841] bg-[#2b2623] px-3 py-1 text-xs text-[#dac364]">{headers.map(([field, title]) => <SortHeader key={field} field={field} title={title} sort={sort} onSort={onSort}/>)}</div>}
    <div className="min-h-0 flex-1 overflow-y-auto">
      {items.map((item, index) => <div key={`${item.id}-${item.variantKey}`} role="button" tabIndex={0} onClick={() => onOpen(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(item); } }} className={`grid w-full cursor-pointer grid-cols-[145px_minmax(0,1fr)_56px_96px_84px] items-center border-b border-[#292421] px-3 py-2 text-left text-[13px] outline-none ${index % 2 ? 'bg-[#211d1b]' : 'bg-[#1c1917]'} hover:bg-[#38312b] focus:bg-[#38312b]`}>
        <Money copper={item.minBuyoutCopper}/>
        <span className="flex min-w-0 items-center gap-1.5"><a href={wowheadHref(item.id, item.bonusListIds, item.modifiers, item.effectiveItemLevel, locale)} data-wowhead={wowheadData(item.id, item.bonusListIds, item.modifiers, item.effectiveItemLevel, locale)} data-wh-icon-size="medium" onClick={(event) => event.preventDefault()} className="auction-result-link min-w-0 truncate font-normal no-underline" style={{ color: qualityColor(item.qualityType) }}>{item.name}</a><ItemQualityBadge tier={qualityTier(item)}/></span>
        <span>{item.effectiveItemLevel ?? item.itemLevel ?? '—'}</span>
        <span>{Number(item.quantity).toLocaleString()}</span>
        <span className="flex items-center justify-between gap-2">{Number(item.listingCount).toLocaleString()}<button aria-pressed={isFavorite(item.id)} aria-label={isFavorite(item.id) ? (locale === 'es-MX' ? 'Quitar de favoritos' : 'Remove from favorites') : (locale === 'es-MX' ? 'Añadir a favoritos' : 'Add to favorites')} onClick={(event) => { event.stopPropagation(); onToggleFavorite(item); }} className={`shrink-0 text-base leading-none ${isFavorite(item.id) ? 'text-[#fff17a]' : 'text-[#6f6862] hover:text-[#fff17a]'}`}>★</button></span>
      </div>)}
      {!loading && items.length === 0 && <p className="p-6 text-center text-sm text-[#b5aea4]">{emptyText}</p>}
    </div>
  </div>;
}
