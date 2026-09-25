export function ItemQualityBadge({ tier }: { tier: number | undefined }) {
  if (!tier) return null;
  const nativeTier = Math.min(2, Math.max(1, tier));
  const label = `Calidad ${nativeTier}`;
  return <span role="img" aria-label={label} title={label} className="item-quality-badge" style={{ backgroundImage: `url(https://wow.zamimg.com/images/wow/TextureAtlas/live/professions-chaticon-quality-12-tier${nativeTier}.webp)` }}/>;
}
