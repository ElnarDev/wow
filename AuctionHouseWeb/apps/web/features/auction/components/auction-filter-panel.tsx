import { expansions, qualities, qualityColors } from '../catalog';
import type { Locale } from '../types';

type Props = {
  locale: Locale;
  levelRangeLabel: string;
  rarityLabel: string;
  eraLabel: string;
  anyLabel: string;
  minLevel: string;
  maxLevel: string;
  minQuality: number | null;
  maxQuality: number | null;
  expansionId: number | null;
  includeOutOfStock: boolean;
  label: (value: string) => string;
  onMinLevelChange: (value: string) => void;
  onMaxLevelChange: (value: string) => void;
  onMinQualityChange: (value: number | null) => void;
  onMaxQualityChange: (value: number | null) => void;
  onExpansionChange: (value: number | null) => void;
  onIncludeOutOfStockChange: (value: boolean) => void;
};

const optionalNumber = (value: string) => value === '' ? null : Number(value);

export function AuctionFilterPanel(props: Props) {
  return <div className="absolute right-[122px] top-[34px] z-50 w-72 rounded border border-[#76718d] bg-[#090b19] p-3 text-sm shadow-[0_8px_24px_#000]">
    <div className="mb-3"><p className="block font-serif text-[#e9cc46]">{props.levelRangeLabel}</p><div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><input aria-label="Minimum item level" inputMode="numeric" value={props.minLevel} onChange={(event) => props.onMinLevelChange(event.target.value.replace(/\D/g, ''))} className="min-w-0 rounded border border-[#343238] bg-[#211f21] px-2 py-1"/><span>–</span><input aria-label="Maximum item level" inputMode="numeric" value={props.maxLevel} onChange={(event) => props.onMaxLevelChange(event.target.value.replace(/\D/g, ''))} className="min-w-0 rounded border border-[#343238] bg-[#211f21] px-2 py-1"/></div></div>
    <div className="mb-3"><p className="block font-serif text-[#e9cc46]">{props.rarityLabel}</p><div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><select aria-label="Minimum rarity" value={props.minQuality ?? ''} onChange={(event) => props.onMinQualityChange(optionalNumber(event.target.value))} className="min-w-0 rounded border border-[#343238] bg-[#211f21] px-1 py-1"><option value="">{props.anyLabel}</option>{qualities.map((quality, index) => <option key={quality} value={index} style={{ color: qualityColors[quality.toUpperCase()] }}>{props.label(quality)}</option>)}</select><span>to</span><select aria-label="Maximum rarity" value={props.maxQuality ?? ''} onChange={(event) => props.onMaxQualityChange(optionalNumber(event.target.value))} className="min-w-0 rounded border border-[#343238] bg-[#211f21] px-1 py-1"><option value="">{props.anyLabel}</option>{qualities.map((quality, index) => <option key={quality} value={index} style={{ color: qualityColors[quality.toUpperCase()] }}>{props.label(quality)}</option>)}</select></div></div>
    <div className="mb-3"><label htmlFor="era" className="block font-serif text-[#e9cc46]">{props.eraLabel}</label><select id="era" value={props.expansionId ?? ''} onChange={(event) => props.onExpansionChange(optionalNumber(event.target.value))} className="mt-1 w-full rounded border border-[#343238] bg-[#211f21] px-2 py-1"><option value="">{props.locale === 'es-MX' ? 'Todas las expansiones' : 'All expansions'}</option>{expansions.map((expansion, index) => <option key={expansion} value={index}>{props.label(expansion)}</option>)}</select></div>
    <label className="flex cursor-pointer items-center gap-2 text-xs text-[#e7e2d8]"><input type="checkbox" checked={props.includeOutOfStock} onChange={(event) => props.onIncludeOutOfStockChange(event.target.checked)} className="accent-[#d7bd3d]"/>{props.locale === 'es-MX' ? 'Incluir agotados' : 'Include out of stock'}</label>
  </div>;
}
