import type { SearchState } from './types';

export const pageSize = 500;
export const favoritesStorageKey = 'auction-house-favorites';

export const statNames: Record<number, string> = {
  61: 'Speed',
  62: 'Leech',
  63: 'Avoidance',
  64: 'Indestructible',
};

export const expansions = [
  'Classic',
  'The Burning Crusade',
  'Wrath of the Lich King',
  'Cataclysm',
  'Mists of Pandaria',
  'Warlords of Draenor',
  'Legion',
  'Battle for Azeroth',
  'Shadowlands',
  'Dragonflight',
  'The War Within',
  'Midnight',
];

export const qualities = ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Artifact', 'Heirloom'];

export const qualityColors: Record<string, string> = {
  POOR: '#9d9d9d',
  COMMON: '#ffffff',
  UNCOMMON: '#1eff00',
  RARE: '#0070dd',
  EPIC: '#a335ee',
  LEGENDARY: '#ff8000',
  ARTIFACT: '#e6cc80',
  HEIRLOOM: '#00ccff',
};

const categoryPaths: Record<string, string> = {
  'WoW Token': 'wow-token',
  Miscellaneous: 'miscellaneous',
  'Quest Items': 'quest-items',
  'Battle Pets': 'battle-pets',
  Housing: 'housing',
  'Profession Equipment': 'profession-equipment',
  Recipes: 'recipes',
  'Trade Goods': 'trade-goods',
  Glyphs: 'glyphs',
  Consumables: 'consumables',
  'Item Enhancements': 'enhancements',
  Gems: 'gems',
  Containers: 'containers',
  Weapons: 'weapons',
  Armor: 'armor',
};

const categoriesByItemClass: Record<number, string> = {
  0: 'Consumables',
  1: 'Containers',
  2: 'Weapons',
  3: 'Gems',
  4: 'Armor',
  7: 'Trade Goods',
  8: 'Item Enhancements',
  9: 'Recipes',
  12: 'Quest Items',
  15: 'Miscellaneous',
  16: 'Glyphs',
  17: 'Battle Pets',
  18: 'WoW Token',
  19: 'Profession Equipment',
  20: 'Housing',
};

export const categories = Object.keys(categoryPaths);
export const supportedCategories = new Set(categories);

export const categoryPath = (category: string) => categoryPaths[category] ?? 'armor';
export const categoryForItemClass = (itemClassId: number | null | undefined) => categoriesByItemClass[Number(itemClassId)] ?? 'Armor';

export const initialSearch: SearchState = {
  category: '',
  query: '',
  group: null,
  leaf: null,
  subclasses: [],
  inventoryTypes: [],
  expansionId: null,
  minLevel: null,
  maxLevel: null,
  minQuality: null,
  maxQuality: null,
  includeOutOfStock: false,
  sort: 'name',
  direction: 'asc',
};
