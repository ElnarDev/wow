import type { AuctionItem, Locale } from '../types';
import { wowheadData, wowheadHref } from '../wowhead';
import { ItemQualityBadge } from './item-quality-badge';

type Props = {
  item: AuctionItem;
  locale: Locale;
  qualityColor: (quality: string | null) => string;
  qualityTier?: number;
};

export function ItemIdentity({ item, locale, qualityColor, qualityTier }: Props) {
  const color = qualityColor(item.qualityType);
  return <span className="flex min-w-0 items-center gap-1.5">
    <a href={wowheadHref(item.id, item.bonusListIds, item.modifiers, item.effectiveItemLevel, locale)} data-wowhead={wowheadData(item.id, item.bonusListIds, item.modifiers, item.effectiveItemLevel, locale)} data-wh-icon-size="medium" onClick={(event) => event.preventDefault()} className="auction-result-link min-w-0 truncate font-normal no-underline" style={{ color }}>{item.name}</a>
    <ItemQualityBadge tier={qualityTier}/>
  </span>;
}
