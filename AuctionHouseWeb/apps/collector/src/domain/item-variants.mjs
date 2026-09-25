import { createHash } from 'node:crypto';
import bonusIdData from '../vendor/lib-bonus-id/addon_data.json' with { type: 'json' };
import { Calculator as BonusIdCalculator } from '../vendor/lib-bonus-id/calculator.js';

const bonusIdCalculator = new BonusIdCalculator(bonusIdData);

const tertiaryBonusIds = new Map([
  [61, new Set([42, 6408, 6674, 9622, 10814, 10820, 10971, 11206, 12545])],
  [62, new Set([41, 6409, 6673, 9620, 10812, 10818, 10969, 11204, 12544])],
  [63, new Set([40, 6410, 6675, 7886, 10965, 11200, 12543])],
  [64, new Set([43, 5803, 6411, 8975])],
]);

export const itemLevelDataBuild = bonusIdData.build;

export function normalizeVariant(auctionItem = {}) {
  const bonusListIds = [...new Set(auctionItem.bonus_lists ?? [])]
    .map(Number)
    .filter((bonusId) => Number.isSafeInteger(bonusId) && bonusId > 0)
    .sort((left, right) => left - right);
  const modifiers = (auctionItem.modifiers ?? [])
    .map((modifier) => ({ type: Number(modifier.type), value: Number(modifier.value) }))
    .filter((modifier) => Number.isSafeInteger(modifier.type) && Number.isFinite(modifier.value))
    .sort((left, right) => left.type - right.type || left.value - right.value);
  const itemContext = Number.isSafeInteger(Number(auctionItem.context)) ? Number(auctionItem.context) : null;
  const tertiaryStats = [...tertiaryBonusIds]
    .filter(([, ids]) => bonusListIds.some((id) => ids.has(id)))
    .map(([stat]) => stat);
  const canonical = JSON.stringify({ itemContext, bonusListIds, modifiers });
  return { variantKey: createHash('sha256').update(canonical).digest('hex'), itemContext, bonusListIds, modifiers, tertiaryStats };
}

export function effectiveItemLevel(itemId, bonusListIds = [], modifiers = []) {
  const modifierValue = (type) => Number(modifiers.find((modifier) => Number(modifier.type) === type)?.value ?? 0);
  try {
    return bonusIdCalculator.calculate(Number(itemId), bonusListIds.map(Number), modifierValue(9), modifierValue(28));
  } catch (error) {
    console.warn(`item_level_calculation_failed item=${itemId}: ${error.message}`);
    return null;
  }
}
