import type { Locale, Modifier } from './types';

export function wowheadData(itemId: number, bonusListIds: number[], modifiers: Modifier[], itemLevel?: number | null, locale: Locale = 'en-US') {
  const playerLevel = modifiers.find((modifier) => modifier.type === 9)?.value;
  return [
    `item=${itemId}`,
    locale === 'es-MX' ? 'domain=es' : '',
    bonusListIds.length ? `bonus=${bonusListIds.join(':')}` : '',
    playerLevel ? `lvl=${playerLevel}` : '',
    itemLevel ? `ilvl=${itemLevel}` : '',
  ].filter(Boolean).join('&');
}

export function wowheadHref(itemId: number, bonusListIds: number[], modifiers: Modifier[], itemLevel?: number | null, locale: Locale = 'en-US') {
  const parameters = new URLSearchParams();
  if (bonusListIds.length) parameters.set('bonus', bonusListIds.join(':'));
  const playerLevel = modifiers.find((modifier) => modifier.type === 9)?.value;
  if (playerLevel) parameters.set('lvl', String(playerLevel));
  if (itemLevel) parameters.set('ilvl', String(itemLevel));
  return `https://${locale === 'es-MX' ? 'es' : 'www'}.wowhead.com/item=${itemId}${parameters.size ? `?${parameters}` : ''}`;
}

