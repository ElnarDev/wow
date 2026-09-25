'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auctionApi } from '../features/auction/api';
import {
  categories,
  categoryForItemClass,
  categoryPath,
  initialSearch,
  pageSize,
  qualityColors,
  statNames,
  supportedCategories,
} from '../features/auction/catalog';
import { AuctionHeader } from '../features/auction/components/auction-header';
import { AuctionSidebar } from '../features/auction/components/auction-sidebar';
import { Money } from '../features/auction/components/money';
import { PriceHistoryChart } from '../features/auction/components/price-history-chart';
import { ResultsTable } from '../features/auction/components/results-table';
import { WowTokenView } from '../features/auction/components/wow-token-view';
import { useStoredFavorites } from '../features/auction/hooks/use-stored-favorites';
import type {
  AuctionItem as ArmorItem,
  AuctionVariant as Variant,
  CategoryGroup as ArmorGroup,
  CategoryLeaf as ArmorLeaf,
  CollectorHealth,
  ComparisonData,
  Favorite,
  HistoryData,
  ItemDetail,
  Locale,
  Realm,
  SearchState,
  WowTokenData,
} from '../features/auction/types';
import { wowheadData, wowheadHref } from '../features/auction/wowhead';

const armorTypes: Record<number, string> = {
  1: 'Cloth',
  2: 'Leather',
  3: 'Mail',
  4: 'Plate',
  5: 'Cosmetic',
  6: 'Shields',
};
const containerTypes: Record<number, string> = {
  0: 'General Bags',
  2: 'Herb Bags',
  3: 'Enchanting Bags',
  4: 'Engineering Bags',
  5: 'Gem Bags',
  6: 'Mining Bags',
  7: 'Leatherworking Bags',
  8: 'Inscription Bags',
};
const gemTypes: Record<number, string> = {
  0: 'Intellect',
  1: 'Agility',
  2: 'Strength',
  3: 'Stamina',
  4: 'Spirit',
  5: 'Critical Strike',
  6: 'Mastery',
  7: 'Haste',
  8: 'Versatility',
  9: 'Other Gems',
};
const enhancementTypes: Record<number, string> = {
  0: 'Head',
  1: 'Neck',
  2: 'Shoulder',
  3: 'Cloak',
  4: 'Chest',
  5: 'Wrist',
  6: 'Hands',
  7: 'Waist',
  8: 'Legs',
  9: 'Feet',
  10: 'Finger',
  11: 'Weapon',
  12: 'Two-Handed Weapon',
  13: 'Shield / Off-hand',
  14: 'Miscellaneous',
};
const consumableTypes: Record<number, string> = {
  0: 'Explosives and Devices',
  1: 'Potions',
  2: 'Elixirs',
  3: 'Flasks & Phials',
  4: 'Scrolls',
  5: 'Food & Drink',
  6: 'Item Enhancements',
  7: 'Bandages',
  8: 'Other Consumables',
  9: 'Vantus Runes',
  10: 'Utility Curios',
  11: 'Combat Curios',
};
const glyphTypes: Record<number, string> = {
  1: 'Warrior',
  2: 'Paladin',
  3: 'Hunter',
  4: 'Rogue',
  5: 'Priest',
  6: 'Death Knight',
  7: 'Shaman',
  8: 'Mage',
  9: 'Warlock',
  10: 'Monk',
  11: 'Druid',
  12: 'Demon Hunter',
};
const tradeGoodTypes: Record<number, string> = {
  1: 'Parts',
  4: 'Jewelcrafting',
  5: 'Cloth',
  6: 'Leather',
  7: 'Metal & Stone',
  8: 'Cooking',
  9: 'Herb',
  10: 'Elemental',
  11: 'Other',
  12: 'Enchanting',
  16: 'Inscription',
};
const recipeTypes: Record<number, string> = {
  0: 'Book',
  1: 'Leatherworking',
  2: 'Tailoring',
  3: 'Engineering',
  4: 'Blacksmithing',
  5: 'Cooking',
  6: 'Alchemy',
  7: 'First Aid',
  8: 'Enchanting',
  9: 'Fishing',
  10: 'Jewelcrafting',
  11: 'Inscription',
};
const professionEquipmentTypes: Record<number, string> = {
  0: 'Blacksmithing',
  1: 'Leatherworking',
  2: 'Alchemy',
  3: 'Herbalism',
  4: 'Cooking',
  5: 'Mining',
  6: 'Tailoring',
  7: 'Engineering',
  8: 'Enchanting',
  9: 'Fishing',
  10: 'Skinning',
  11: 'Jewelcrafting',
  12: 'Inscription',
  13: 'Archaeology',
};
const housingTypes: Record<number, string> = { 0: 'Decor', 1: 'Housing Dye' };
const battlePetTypes: Record<number, string> = {
  0: 'Humanoid',
  1: 'Dragonkin',
  2: 'Flying',
  3: 'Undead',
  4: 'Critter',
  5: 'Magic',
  6: 'Elemental',
  7: 'Beast',
  8: 'Aquatic',
  9: 'Mechanical',
};
const questItemTypes: Record<number, string> = { 0: 'Quest' };
const miscellaneousTypes: Record<number, string> = {
  0: 'Junk',
  1: 'Reagent',
  2: 'Companion Pets',
  3: 'Holiday',
  4: 'Other',
  5: 'Mount',
  6: 'Mount Equipment',
};
const wowTokenTypes: Record<number, string> = { 0: 'WoW Token' };
const inventoryTypeSpanishLabels: Record<string, string> = {
  HEAD: 'Cabeza',
  NECK: 'Cuello',
  SHOULDER: 'Hombro',
  CLOAK: 'Capa',
  CHEST: 'Pecho',
  ROBE: 'Toga',
  WAIST: 'Cintura',
  LEGS: 'Piernas',
  FEET: 'Pies',
  WRIST: 'Muñecas',
  HANDS: 'Manos',
  FINGER: 'Dedo',
  TRINKET: 'Abalorio',
  HOLDABLE: 'Mano izquierda',
  SHIELD: 'Escudo',
  BODY: 'Camisa',
};
const weaponSpanishLabels: Record<string, string> = {
  'One-Handed': 'De una mano',
  'Two-Handed': 'De dos manos',
  Ranged: 'A distancia',
  'One-Handed Axes': 'Hachas de una mano',
  'Two-Handed Axes': 'Hachas de dos manos',
  'One-Handed Maces': 'Mazas de una mano',
  'Two-Handed Maces': 'Mazas de dos manos',
  'One-Handed Swords': 'Espadas de una mano',
  'Two-Handed Swords': 'Espadas de dos manos',
  Warglaives: 'Gujas de guerra',
  'Fist Weapons': 'Armas de puño',
  Daggers: 'Dagas',
  Polearms: 'Armas de asta',
  Staves: 'Bastones',
  Bows: 'Arcos',
  Guns: 'Armas de fuego',
  Thrown: 'Arrojadizas',
  Crossbows: 'Ballestas',
  Wands: 'Varitas',
  'Fishing Poles': 'Cañas de pescar',
};
const tradeGoodSpanishLabels: Record<string, string> = {
  'Crafting Materials': 'Materiales de fabricación',
  'Profession Materials': 'Materiales de profesión',
  Parts: 'Componentes',
  Jewelcrafting: 'Joyería',
  'Metal & Stone': 'Metal y piedra',
  Cooking: 'Cocina',
  Herb: 'Hierbas',
  Elemental: 'Elemental',
  Other: 'Otros',
  Enchanting: 'Encantamiento',
  Inscription: 'Inscripción',
};
const professionSpanishLabels: Record<string, string> = {
  Professions: 'Profesiones',
  'Crafting Professions': 'Profesiones de fabricación',
  'Gathering Professions': 'Profesiones de recolección',
  Book: 'Libro',
  Leatherworking: 'Peletería',
  Tailoring: 'Sastrería',
  Engineering: 'Ingeniería',
  Blacksmithing: 'Herrería',
  Alchemy: 'Alquimia',
  Herbalism: 'Herboristería',
  Mining: 'Minería',
  'First Aid': 'Primeros auxilios',
  Fishing: 'Pesca',
  Skinning: 'Desuello',
  Archaeology: 'Arqueología',
};
const specialSpanishLabels: Record<string, string> = {
  'Housing Decor': 'Decoración',
  'All Decor': 'Toda la decoración',
  'Housing Dye': 'Tintes de vivienda',
  Collectibles: 'Coleccionables',
  'Battle Pets': 'Mascotas de duelo',
  Humanoid: 'Humanoide',
  Dragonkin: 'Dragónido',
  Flying: 'Volador',
  Undead: 'No-muerto',
  Critter: 'Alimaña',
  Magic: 'Magia',
  Beast: 'Bestia',
  Aquatic: 'Acuático',
  Mechanical: 'Mecánico',
  Quest: 'Misión',
  Junk: 'Basura',
  Reagent: 'Reactivo',
  'Companion Pets': 'Mascotas de compañía',
  Holiday: 'Festividad',
  Mount: 'Montura',
  'Mount Equipment': 'Equipo de montura',
  'WoW Token': 'Ficha de WoW',
};
const navigationSpanishLabels: Record<string, string> = {
  Bags: 'Bolsas',
  'General Bags': 'Bolsas generales',
  'Profession Bags': 'Bolsas de profesión',
  'Herb Bags': 'Bolsas de herboristería',
  'Enchanting Bags': 'Bolsas de encantamiento',
  'Engineering Bags': 'Bolsas de ingeniería',
  'Gem Bags': 'Bolsas de gemas',
  'Mining Bags': 'Bolsas de minería',
  'Leatherworking Bags': 'Bolsas de peletería',
  'Inscription Bags': 'Bolsas de inscripción',
  Combat: 'Combate',
  Utility: 'Utilidad',
  'General Goods': 'Mercancías generales',
  'Companion Pets': 'Mascotas de compañía',
  'Mount Equipment': 'Equipo de montura',
};
const spanishLabels: Record<string, string> = {
  Weapons: 'Armas',
  Armor: 'Armadura',
  Plate: 'Placas',
  Mail: 'Malla',
  Leather: 'Cuero',
  Cloth: 'Tela',
  Miscellaneous: 'Miscelánea',
  Cosmetic: 'Cosmético',
  Containers: 'Contenedores',
  Gems: 'Gemas',
  Decor: 'Decoración',
  'Primary Stats': 'Estadísticas primarias',
  'Secondary Stats': 'Estadísticas secundarias',
  Intellect: 'Intelecto',
  Agility: 'Agilidad',
  Strength: 'Fuerza',
  Stamina: 'Aguante',
  Spirit: 'Espíritu',
  'Critical Strike': 'Golpe crítico',
  Mastery: 'Maestría',
  Haste: 'Celeridad',
  Versatility: 'Versatilidad',
  'Other Gems': 'Otras gemas',
  'Equipment Slots': 'Ranuras de equipo',
  'Weapon Slots': 'Ranuras de arma',
  Weapon: 'Arma',
  'Two-Handed Weapon': 'Arma de dos manos',
  'Shield / Off-hand': 'Escudo / mano izquierda',
  'Explosives and Devices': 'Explosivos y dispositivos',
  Potions: 'Pociones',
  Elixirs: 'Elixires',
  'Flasks & Phials': 'Frascos y viales',
  Scrolls: 'Pergaminos',
  'Food & Drink': 'Comida y bebida',
  Bandages: 'Vendajes',
  'Other Consumables': 'Otros consumibles',
  'Vantus Runes': 'Runas Vantus',
  'Utility Curios': 'Curiosidades de utilidad',
  'Combat Curios': 'Curiosidades de combate',
  Warrior: 'Guerrero',
  Paladin: 'Paladín',
  Hunter: 'Cazador',
  Rogue: 'Pícaro',
  Priest: 'Sacerdote',
  'Death Knight': 'Caballero de la Muerte',
  Shaman: 'Chamán',
  Mage: 'Mago',
  Warlock: 'Brujo',
  Monk: 'Monje',
  Druid: 'Druida',
  'Demon Hunter': 'Cazador de demonios',
  'Item Enhancements': 'Mejoras de objetos',
  Consumables: 'Consumibles',
  Glyphs: 'Glifos',
  'Trade Goods': 'Componentes',
  Recipes: 'Recetas',
  'Profession Equipment': 'Equipo de profesión',
  Housing: 'Viviendas',
  'Battle Pets': 'Mascotas de duelo',
  'Quest Items': 'Objetos de misión',
  Head: 'Cabeza',
  Neck: 'Cuello',
  Shoulder: 'Hombro',
  Cloak: 'Capa',
  Chest: 'Pecho',
  Waist: 'Cintura',
  Legs: 'Piernas',
  Feet: 'Pies',
  Wrist: 'Muñecas',
  Hands: 'Manos',
  Shields: 'Escudos',
  Back: 'Espalda',
  Finger: 'Dedo',
  Trinket: 'Abalorio',
  'Held In Off-hand': 'Mano izquierda',
  Shirt: 'Camisa',
  HOLDABLE: 'Sujetable con la mano izquierda',
  Speed: 'Velocidad',
  Leech: 'Robo de vida',
  Avoidance: 'Evasión',
  Indestructible: 'Indestructible',
  Runecarving: 'Tallado rúnico',
  Poor: 'Pobre',
  Common: 'Común',
  Uncommon: 'Inusual',
  Rare: 'Raro',
  Epic: 'Épico',
  Legendary: 'Legendario',
  Artifact: 'Artefacto',
  Heirloom: 'Reliquia',
};
const uiCopy = {
  'en-US': {
    search: 'Search',
    filter: 'Filter',
    apply: 'Apply',
    reset: 'Reset',
    levelRange: 'Level Range',
    rarity: 'Rarity',
    era: 'Era',
    any: 'Any',
    item: 'Item',
    unitPrice: 'Unit Price',
    available: 'Available',
    auctions: 'Auctions',
    noResults: 'No results found.',
    searchPrompt: 'Choose filters or enter an item name, then press Search.',
    previous: 'Previous',
    next: 'Next',
    results: 'results',
    loading: 'Loading…',
    loadingItem: 'Loading item…',
    back: 'Back',
    updated: 'updated',
    baseStats: 'Base Stats',
    current: 'Current',
    variants: 'Variants',
    bulkPricing: 'Bulk Pricing',
    quantity: 'Quantity',
    totalPrice: 'Total Price',
    priceHistory: 'Price History',
    low: 'Low',
    median: 'Median',
    high: 'High',
    change: 'Change',
    bonuses: 'bonuses',
    days: 'days',
    year: 'year',
    home: 'Home',
    terms: 'Terms',
    privacy: 'Privacy',
    api: 'API',
  },
  'es-MX': {
    search: 'Buscar',
    filter: 'Filtro',
    apply: 'Aplicar',
    reset: 'Restablecer',
    levelRange: 'Rango de nivel',
    rarity: 'Rareza',
    era: 'Expansión',
    any: 'Cualquiera',
    item: 'Objeto',
    unitPrice: 'Precio unitario',
    available: 'Disponible',
    auctions: 'Subastas',
    noResults: 'No se encontraron resultados.',
    searchPrompt: 'Elige filtros o escribe un objeto y pulsa Buscar.',
    previous: 'Anterior',
    next: 'Siguiente',
    results: 'resultados',
    loading: 'Cargando…',
    loadingItem: 'Cargando objeto…',
    back: 'Volver',
    updated: 'actualizado',
    baseStats: 'Estadísticas base',
    current: 'Actual',
    variants: 'Variantes',
    bulkPricing: 'Precio por cantidad',
    quantity: 'Cantidad',
    totalPrice: 'Precio total',
    priceHistory: 'Historial de precios',
    low: 'Mínimo',
    median: 'Mediana',
    high: 'Máximo',
    change: 'Cambio',
    bonuses: 'bonus',
    days: 'días',
    year: 'año',
    home: 'Inicio',
    terms: 'Términos',
    privacy: 'Privacidad',
    api: 'API',
  },
} as const;
const standardLeaves: ArmorLeaf[] = [
  { label: 'Runecarving', subclassIds: [], kind: 'special' },
  { label: 'Head', subclassIds: [], types: ['HEAD'] },
  { label: 'Shoulder', subclassIds: [], types: ['SHOULDER'] },
  { label: 'Chest', subclassIds: [], types: ['CHEST', 'ROBE'] },
  { label: 'Waist', subclassIds: [], types: ['WAIST'] },
  { label: 'Legs', subclassIds: [], types: ['LEGS'] },
  { label: 'Feet', subclassIds: [], types: ['FEET'] },
  { label: 'Wrist', subclassIds: [], types: ['WRIST'] },
  { label: 'Hands', subclassIds: [], types: ['HANDS'] },
  { label: 'Speed', subclassIds: [], kind: 'tertiary', bonusStat: 61 },
  { label: 'Leech', subclassIds: [], kind: 'tertiary', bonusStat: 62 },
  { label: 'Avoidance', subclassIds: [], kind: 'tertiary', bonusStat: 63 },
  { label: 'Indestructible', subclassIds: [], kind: 'tertiary', bonusStat: 64 },
];
const leavesFor = (id: number) =>
  standardLeaves.map((leaf) => ({ ...leaf, subclassIds: [id] }));
const armorGroups: ArmorGroup[] = [
  { label: 'Plate', subclassIds: [4], leaves: leavesFor(4) },
  { label: 'Mail', subclassIds: [3], leaves: leavesFor(3) },
  { label: 'Leather', subclassIds: [2], leaves: leavesFor(2) },
  { label: 'Cloth', subclassIds: [1], leaves: leavesFor(1) },
  {
    label: 'Miscellaneous',
    subclassIds: [0],
    leaves: [
      { label: 'Runecarving', subclassIds: [0], kind: 'special' },
      { label: 'Neck', subclassIds: [0], types: ['NECK'] },
      { label: 'Back', subclassIds: [1], types: ['CLOAK'] },
      { label: 'Finger', subclassIds: [0], types: ['FINGER'] },
      { label: 'Trinket', subclassIds: [0], types: ['TRINKET'] },
      { label: 'Held In Off-hand', subclassIds: [0], types: ['HOLDABLE'] },
      { label: 'Shields', subclassIds: [6] },
      { label: 'Shirt', subclassIds: [0], types: ['BODY'] },
      { label: 'Head', subclassIds: [0], types: ['HEAD'] },
      { label: 'Speed', subclassIds: [0, 6], kind: 'tertiary', bonusStat: 61 },
      { label: 'Leech', subclassIds: [0, 6], kind: 'tertiary', bonusStat: 62 },
      {
        label: 'Avoidance',
        subclassIds: [0, 6],
        kind: 'tertiary',
        bonusStat: 63,
      },
      {
        label: 'Indestructible',
        subclassIds: [0, 6],
        kind: 'tertiary',
        bonusStat: 64,
      },
    ],
  },
  { label: 'Cosmetic', subclassIds: [5], leaves: [] },
];
const weaponGroups: ArmorGroup[] = [
  {
    label: 'One-Handed',
    subclassIds: [0, 4, 7, 9, 13, 15],
    leaves: [
      { label: 'One-Handed Axes', subclassIds: [0] },
      { label: 'One-Handed Maces', subclassIds: [4] },
      { label: 'One-Handed Swords', subclassIds: [7] },
      { label: 'Warglaives', subclassIds: [9] },
      { label: 'Fist Weapons', subclassIds: [13] },
      { label: 'Daggers', subclassIds: [15] },
      {
        label: 'Speed',
        subclassIds: [0, 4, 7, 9, 13, 15],
        kind: 'tertiary',
        bonusStat: 61,
      },
      {
        label: 'Leech',
        subclassIds: [0, 4, 7, 9, 13, 15],
        kind: 'tertiary',
        bonusStat: 62,
      },
      {
        label: 'Avoidance',
        subclassIds: [0, 4, 7, 9, 13, 15],
        kind: 'tertiary',
        bonusStat: 63,
      },
      {
        label: 'Indestructible',
        subclassIds: [0, 4, 7, 9, 13, 15],
        kind: 'tertiary',
        bonusStat: 64,
      },
    ],
  },
  {
    label: 'Two-Handed',
    subclassIds: [1, 5, 6, 8, 10],
    leaves: [
      { label: 'Two-Handed Axes', subclassIds: [1] },
      { label: 'Two-Handed Maces', subclassIds: [5] },
      { label: 'Polearms', subclassIds: [6] },
      { label: 'Two-Handed Swords', subclassIds: [8] },
      { label: 'Staves', subclassIds: [10] },
    ],
  },
  {
    label: 'Ranged',
    subclassIds: [2, 3, 16, 18, 19],
    leaves: [
      { label: 'Bows', subclassIds: [2] },
      { label: 'Guns', subclassIds: [3] },
      { label: 'Thrown', subclassIds: [16] },
      { label: 'Crossbows', subclassIds: [18] },
      { label: 'Wands', subclassIds: [19] },
    ],
  },
  {
    label: 'Miscellaneous',
    subclassIds: [11, 12, 14, 20],
    leaves: [
      { label: 'Fishing Poles', subclassIds: [20] },
      { label: 'Miscellaneous', subclassIds: [11, 12, 14] },
    ],
  },
];
const containerGroups: ArmorGroup[] = [
  {
    label: 'Bags',
    subclassIds: [0],
    leaves: [{ label: 'General Bags', subclassIds: [0] }],
  },
  {
    label: 'Profession Bags',
    subclassIds: [2, 3, 4, 5, 6, 7, 8],
    leaves: [
      { label: 'Herb Bags', subclassIds: [2] },
      { label: 'Enchanting Bags', subclassIds: [3] },
      { label: 'Engineering Bags', subclassIds: [4] },
      { label: 'Gem Bags', subclassIds: [5] },
      { label: 'Mining Bags', subclassIds: [6] },
      { label: 'Leatherworking Bags', subclassIds: [7] },
      { label: 'Inscription Bags', subclassIds: [8] },
    ],
  },
];
const gemGroups: ArmorGroup[] = [
  {
    label: 'Primary Stats',
    subclassIds: [0, 1, 2, 3, 4],
    leaves: [
      { label: 'Intellect', subclassIds: [0] },
      { label: 'Agility', subclassIds: [1] },
      { label: 'Strength', subclassIds: [2] },
      { label: 'Stamina', subclassIds: [3] },
      { label: 'Spirit', subclassIds: [4] },
    ],
  },
  {
    label: 'Secondary Stats',
    subclassIds: [5, 6, 7, 8, 9],
    leaves: [
      { label: 'Critical Strike', subclassIds: [5] },
      { label: 'Mastery', subclassIds: [6] },
      { label: 'Haste', subclassIds: [7] },
      { label: 'Versatility', subclassIds: [8] },
      { label: 'Other Gems', subclassIds: [9] },
    ],
  },
];
const enhancementGroups: ArmorGroup[] = [
  {
    label: 'Equipment Slots',
    subclassIds: Array.from({ length: 11 }, (_, id) => id),
    leaves: Object.entries(enhancementTypes)
      .slice(0, 11)
      .map(([id, label]) => ({ label, subclassIds: [Number(id)] })),
  },
  {
    label: 'Weapon Slots',
    subclassIds: [11, 12, 13],
    leaves: Object.entries(enhancementTypes)
      .slice(11, 14)
      .map(([id, label]) => ({ label, subclassIds: [Number(id)] })),
  },
  {
    label: 'Miscellaneous',
    subclassIds: [14],
    leaves: [{ label: 'Miscellaneous', subclassIds: [14] }],
  },
];
const consumableGroups: ArmorGroup[] = [
  {
    label: 'Combat',
    subclassIds: [1, 2, 3, 9, 11],
    leaves: [1, 2, 3, 9, 11].map((id) => ({
      label: consumableTypes[id],
      subclassIds: [id],
    })),
  },
  {
    label: 'Utility',
    subclassIds: [0, 4, 5, 6, 7, 8, 10],
    leaves: [0, 4, 5, 6, 7, 8, 10].map((id) => ({
      label: consumableTypes[id],
      subclassIds: [id],
    })),
  },
];
const glyphGroups: ArmorGroup[] = [
  {
    label: 'Glyphs',
    subclassIds: Object.keys(glyphTypes).map(Number),
    leaves: Object.entries(glyphTypes).map(([id, label]) => ({
      label,
      subclassIds: [Number(id)],
    })),
  },
];
const tradeGoodsGroups: ArmorGroup[] = [
  {
    label: 'Crafting Materials',
    subclassIds: [5, 6, 7, 8, 9, 10],
    leaves: [5, 6, 7, 8, 9, 10].map((id) => ({
      label: tradeGoodTypes[id],
      subclassIds: [id],
    })),
  },
  {
    label: 'Profession Materials',
    subclassIds: [1, 4, 11, 12, 16],
    leaves: [1, 4, 11, 12, 16].map((id) => ({
      label: tradeGoodTypes[id],
      subclassIds: [id],
    })),
  },
];
const recipeGroups: ArmorGroup[] = [
  {
    label: 'Professions',
    subclassIds: Array.from({ length: 11 }, (_, id) => id + 1),
    leaves: Object.entries(recipeTypes)
      .slice(1)
      .map(([id, label]) => ({ label, subclassIds: [Number(id)] })),
  },
  {
    label: 'Miscellaneous',
    subclassIds: [0],
    leaves: [{ label: 'Book', subclassIds: [0] }],
  },
];
const professionEquipmentGroups: ArmorGroup[] = [
  {
    label: 'Crafting Professions',
    subclassIds: [0, 1, 2, 4, 6, 7, 8, 11, 12],
    leaves: [0, 1, 2, 4, 6, 7, 8, 11, 12].map((id) => ({
      label: professionEquipmentTypes[id],
      subclassIds: [id],
    })),
  },
  {
    label: 'Gathering Professions',
    subclassIds: [3, 5, 9, 10, 13],
    leaves: [3, 5, 9, 10, 13].map((id) => ({
      label: professionEquipmentTypes[id],
      subclassIds: [id],
    })),
  },
];
const housingGroups: ArmorGroup[] = [
  {
    label: 'Housing Decor',
    subclassIds: [0, 1],
    leaves: [
      { label: 'All Decor', subclassIds: [0] },
      { label: 'Housing Dye', subclassIds: [1] },
    ],
  },
];
const battlePetGroups: ArmorGroup[] = [
  {
    label: 'Battle Pets',
    subclassIds: Object.keys(battlePetTypes).map(Number),
    leaves: Object.entries(battlePetTypes).map(([id, label]) => ({
      label,
      subclassIds: [Number(id)],
    })),
  },
];
const questItemGroups: ArmorGroup[] = [
  {
    label: 'Quest Items',
    subclassIds: [0],
    leaves: [{ label: 'Quest', subclassIds: [0] }],
  },
];
const miscellaneousGroups: ArmorGroup[] = [
  {
    label: 'Collectibles',
    subclassIds: [2, 3, 5, 6],
    leaves: [2, 3, 5, 6].map((id) => ({
      label: miscellaneousTypes[id],
      subclassIds: [id],
    })),
  },
  {
    label: 'Miscellaneous',
    subclassIds: [0, 1, 4],
    leaves: [0, 1, 4].map((id) => ({
      label: miscellaneousTypes[id],
      subclassIds: [id],
    })),
  },
];
const wowTokenGroups: ArmorGroup[] = [
  {
    label: 'WoW Token',
    subclassIds: [0],
    leaves: [{ label: 'WoW Token', subclassIds: [0] }],
  },
];

const formatGold = (copper: number) => <Money copper={copper} />;

function variantLabel(variant: Variant, index: number) {
  const stats = variant.tertiaryStats
    .map((stat) => statNames[stat])
    .filter(Boolean);
  const level = variant.effectiveItemLevel
    ? `Niv ${variant.effectiveItemLevel}`
    : `Variant ${index + 1}`;
  return stats.length
    ? `${level} · ${stats.join(' · ')}`
    : `${level} · ${variant.bonusListIds.length} bonuses`;
}

export function AuctionDashboard() {
  const [locale, setLocale] = useState<Locale>('en-US');
  const [realms, setRealms] = useState<Realm[]>([]);
  const [realmId, setRealmId] = useState<number | null>(null);
  const [items, setItems] = useState<ArmorItem[]>([]);
  const [query, setQuery] = useState('');
  const [activeRoot, setActiveRoot] = useState('');
  const [armorGroup, setArmorGroup] = useState<string | null>(null);
  const [armorLeaf, setArmorLeaf] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expansionId, setExpansionId] = useState<number | null>(null);
  const [minLevel, setMinLevel] = useState('');
  const [maxLevel, setMaxLevel] = useState('');
  const [minQuality, setMinQuality] = useState<number | null>(null);
  const [maxQuality, setMaxQuality] = useState<number | null>(null);
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false);
  const [applied, setApplied] = useState<SearchState>(initialSearch);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [wantedQuantity, setWantedQuantity] = useState(1);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [historyDays, setHistoryDays] = useState(30);
  const [wowToken, setWowToken] = useState<WowTokenData | null>(null);
  const [wowTokenLoading, setWowTokenLoading] = useState(false);
  const {
    favorites,
    setFavorites,
    loaded: favoritesLoaded,
  } = useStoredFavorites();
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoriteItems, setFavoriteItems] = useState<ArmorItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [collectorHealth, setCollectorHealth] =
    useState<CollectorHealth | null>(null);
  const [showCollected, setShowCollected] = useState(false);
  const previousCollectorStatus = useRef<CollectorHealth['status'] | null>(
    null,
  );
  const initialFavoritesOpened = useRef(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const copy = uiCopy[locale];
  const collectorReady =
    collectorHealth?.status === 'ready' ||
    Number(collectorHealth?.armorListings ?? 0) > 0;
  const interactionLocked = !collectorReady;
  const label = (value: string) =>
    locale === 'es-MX'
      ? (spanishLabels[value] ??
        navigationSpanishLabels[value] ??
        weaponSpanishLabels[value] ??
        tradeGoodSpanishLabels[value] ??
        professionSpanishLabels[value] ??
        specialSpanishLabels[value] ??
        inventoryTypeSpanishLabels[value] ??
        value)
      : value;
  const marketPath = categoryPath(activeRoot);
  const resultMarketPath = categoryPath(applied.category);
  const subclassLabel = (
    subclassId: number | null,
    itemClassId?: number | null,
  ) => {
    const encodedClassId =
      subclassId !== null && Number(subclassId) >= 1000
        ? Math.floor(Number(subclassId) / 1000)
        : null;
    const rawSubclassId =
      encodedClassId === null || subclassId === null
        ? subclassId
        : Number(subclassId) % 1000;
    const itemMarketPath =
      itemClassId == null && encodedClassId === null
        ? categoryPath(categoryForItemClass(detail?.itemClassId))
        : categoryPath(categoryForItemClass(itemClassId ?? encodedClassId));
    const labels =
      itemMarketPath === 'wow-token'
        ? wowTokenTypes
        : itemMarketPath === 'miscellaneous'
          ? miscellaneousTypes
          : itemMarketPath === 'quest-items'
            ? questItemTypes
            : itemMarketPath === 'battle-pets'
              ? battlePetTypes
              : itemMarketPath === 'housing'
                ? housingTypes
                : itemMarketPath === 'profession-equipment'
                  ? professionEquipmentTypes
                  : itemMarketPath === 'recipes'
                    ? recipeTypes
                    : itemMarketPath === 'trade-goods'
                      ? tradeGoodTypes
                      : itemMarketPath === 'glyphs'
                        ? glyphTypes
                        : itemMarketPath === 'consumables'
                          ? consumableTypes
                          : itemMarketPath === 'enhancements'
                            ? enhancementTypes
                            : itemMarketPath === 'gems'
                              ? gemTypes
                              : itemMarketPath === 'containers'
                                ? containerTypes
                                : armorTypes;
    return label(
      labels[Number(rawSubclassId)] ??
        categoryForItemClass(itemClassId ?? encodedClassId),
    );
  };
  const activeGroups =
    activeRoot === 'WoW Token'
      ? wowTokenGroups
      : activeRoot === 'Miscellaneous'
        ? miscellaneousGroups
        : activeRoot === 'Quest Items'
          ? questItemGroups
          : activeRoot === 'Battle Pets'
            ? battlePetGroups
            : activeRoot === 'Housing'
              ? housingGroups
              : activeRoot === 'Profession Equipment'
                ? professionEquipmentGroups
                : activeRoot === 'Recipes'
                  ? recipeGroups
                  : activeRoot === 'Trade Goods'
                    ? tradeGoodsGroups
                    : activeRoot === 'Glyphs'
                      ? glyphGroups
                      : activeRoot === 'Consumables'
                        ? consumableGroups
                        : activeRoot === 'Item Enhancements'
                          ? enhancementGroups
                          : activeRoot === 'Gems'
                            ? gemGroups
                            : activeRoot === 'Containers'
                              ? containerGroups
                              : activeRoot === 'Weapons'
                                ? weaponGroups
                                : armorGroups;
  const isFavorite = (itemId: number) =>
    favorites.some((favorite) => favorite.itemId === itemId);
  const toggleFavorite = (
    item: Pick<ArmorItem, 'id' | 'name'> | Pick<ItemDetail, 'id' | 'name'>,
  ) => {
    const itemId = Number(item.id);
    setFavorites((current) =>
      current.some((favorite) => favorite.itemId === itemId)
        ? current.filter((favorite) => favorite.itemId !== itemId)
        : [
            {
              itemId,
              category:
                detail?.id === itemId
                  ? categoryPath(categoryForItemClass(detail.itemClassId))
                  : resultMarketPath,
              name: item.name,
              addedAt: new Date().toISOString(),
            },
            ...current,
          ].slice(0, 100),
    );
    setFavoriteItems((current) =>
      current.filter((favorite) => Number(favorite.id) !== itemId),
    );
  };
  const openWowToken = async () => {
    if (!collectorReady) return;
    setActiveRoot('WoW Token');
    setArmorGroup(null);
    setArmorLeaf(null);
    setHasSearched(false);
    setItems([]);
    setTotal(0);
    setPage(1);
    setFilterOpen(false);
    closeDetail();
    setWowTokenLoading(true);
    setWowToken(null);
    try {
      setWowToken(await auctionApi.wowToken());
    } catch {
      setError('Unable to load WoW Token data.');
    } finally {
      setWowTokenLoading(false);
    }
  };
  const loadFavorites = useCallback(
    async (
      targetRealmId: number | null,
      targetLocale: Locale,
      source: Favorite[],
    ) => {
      if (targetRealmId === null || source.length === 0) {
        setFavoriteItems([]);
        return;
      }
      setFavoritesLoading(true);
      setError('');
      try {
        const data = await auctionApi.favorites(
          targetRealmId,
          targetLocale,
          source.map((favorite) => favorite.itemId),
        );
        setFavoriteItems(
          data.items.map((item) => ({
            ...item,
            id: Number(item.id),
            subclassId:
              item.subclassId === null || item.itemClassId === null
                ? item.subclassId
                : item.itemClassId * 1000 + item.subclassId,
          })),
        );
      } catch {
        setFavoriteItems([]);
        setError(
          targetLocale === 'es-MX'
            ? 'No fue posible cargar los favoritos.'
            : 'Unable to load favorites.',
        );
      } finally {
        setFavoritesLoading(false);
      }
    },
    [],
  );

  const loadArmor = async (
    targetRealmId: number,
    state: SearchState,
    targetPage = 1,
    targetLocale = locale,
  ) => {
    setLoading(true);
    setError('');
    try {
      const data = await auctionApi.search(
        activeRoot ? marketPath : 'search',
        targetRealmId,
        state,
        targetPage,
        pageSize,
        targetLocale,
      );
      setItems(
        data.items.map((sourceItem) => {
          const item = { ...sourceItem, id: Number(sourceItem.id) };
          return item.isAvailable
            ? item
            : {
                ...item,
                inventoryType: [
                  item.inventoryType,
                  targetLocale === 'es-MX'
                    ? `Sin stock · visto ${new Date(item.lastSeenAt).toLocaleDateString(targetLocale)}`
                    : `Out of stock · last seen ${new Date(item.lastSeenAt).toLocaleDateString(targetLocale)}`,
                ]
                  .filter(Boolean)
                  .join(' · '),
              };
        }),
      );
      setTotal(data.total);
      setPage(data.page);
      setItems((current) =>
        current.map((item) =>
          item.subclassId === null || item.itemClassId === null
            ? item
            : {
                ...item,
                subclassId: item.itemClassId * 1000 + item.subclassId,
              },
        ),
      );
    } catch {
      setItems([]);
      setTotal(0);
      setError('Unable to load auction data.');
    } finally {
      setLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setSelectedVariant('');
    setHistory(null);
    setComparison(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('item');
    window.history.replaceState(null, '', url);
  };
  const openDetail = async (
    itemId: number,
    targetRealmId = realmId,
    targetVariantKey = '',
    targetLocale = locale,
    targetPath = marketPath,
  ) => {
    if (targetRealmId === null) return;
    setDetailLoading(true);
    setError('');
    try {
      const sourceData = await auctionApi.item(
        targetPath,
        itemId,
        targetRealmId,
        targetLocale,
      );
      const data = { ...sourceData, id: Number(sourceData.id) };
      setDetail(data);
      setSelectedVariant(
        data.variants.some((variant) => variant.variantKey === targetVariantKey)
          ? targetVariantKey
          : (data.variants[0]?.variantKey ?? ''),
      );
      setWantedQuantity(1);
      setActiveRoot(categoryForItemClass(data.itemClassId));
      setArmorGroup(null);
      setArmorLeaf(null);
      const url = new URL(window.location.href);
      url.searchParams.set('item', String(itemId));
      url.searchParams.set('realm', String(targetRealmId));
      window.history.replaceState(null, '', url);
      void auctionApi
        .comparison(targetPath, itemId)
        .then((data) => setComparison(data))
        .catch(() => setComparison(null));
    } catch {
      setError('Unable to load item details.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (
      initialFavoritesOpened.current ||
      !favoritesLoaded ||
      realmId === null ||
      !collectorReady
    )
      return;
    initialFavoritesOpened.current = true;
    if (favorites.length === 0) return;
    setFavoritesOpen(true);
    void loadFavorites(realmId, locale, favorites);
  }, [
    favoritesLoaded,
    realmId,
    collectorReady,
    favorites,
    locale,
    loadFavorites,
  ]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const health = await auctionApi.health();
        if (active) setCollectorHealth(health);
      } catch {
        if (active)
          setCollectorHealth({
            status: 'error',
            detail: 'Collector unavailable',
          });
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const status = collectorHealth?.status ?? null;
    if (
      status === 'ready' &&
      previousCollectorStatus.current === 'collecting'
    ) {
      setShowCollected(true);
      const timer = window.setTimeout(() => setShowCollected(false), 500);
      previousCollectorStatus.current = status;
      return () => window.clearTimeout(timer);
    }
    previousCollectorStatus.current = status;
  }, [collectorHealth?.status]);
  useEffect(() => {
    const savedLocale = window.localStorage.getItem('auction-house-locale');
    if (savedLocale === 'es-MX' || savedLocale === 'en-US')
      setLocale(savedLocale);
    auctionApi
      .realms()
      .then((data) => {
        setRealms(data.realms);
        const urlRealm = Number(
          new URL(window.location.href).searchParams.get('realm'),
        );
        const saved = Number(
          window.localStorage.getItem('auction-house-realm-id'),
        );
        const savedRealm = data.realms.find((realm) => realm.id === saved);
        const defaultRealm = data.realms.find((realm) => realm.isDefault);
        setRealmId(
          (
            data.realms.find((realm) => realm.id === urlRealm) ??
            (savedRealm?.id === 0 && !savedRealm.isDefault
              ? undefined
              : savedRealm) ??
            defaultRealm ??
            data.realms[0]
          )?.id ?? null,
        );
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load realms.');
        setLoading(false);
      });
  }, []);
  const changeLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    window.localStorage.setItem('auction-house-locale', nextLocale);
    if (favoritesOpen) void loadFavorites(realmId, nextLocale, favorites);
    else if (hasSearched && realmId !== null)
      void loadArmor(realmId, applied, page, nextLocale);
    if (detail && realmId !== null)
      void openDetail(detail.id, realmId, selectedVariant, nextLocale);
  };

  useEffect(() => {
    if (realmId === null) return;
    const deepItemId = Number(
      new URL(window.location.href).searchParams.get('item'),
    );
    window.localStorage.setItem('auction-house-realm-id', String(realmId));
    setApplied(initialSearch);
    setHasSearched(false);
    setItems([]);
    setTotal(0);
    setPage(1);
    setQuery('');
    setExpansionId(null);
    setMinLevel('');
    setMaxLevel('');
    setMinQuality(null);
    setMaxQuality(null);
    setIncludeOutOfStock(false);
    setFilterOpen(false);
    closeDetail();
    setLoading(false);
    if (Number.isSafeInteger(deepItemId) && deepItemId > 0)
      void openDetail(deepItemId, realmId);
    // Realm changes intentionally reset list filters and do not query auction data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realmId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const tooltipWindow = window as Window & {
        WH?: { Tooltips?: { refreshLinks?: () => void } };
        $WowheadPower?: { refreshLinks?: () => void };
      };
      tooltipWindow.WH?.Tooltips?.refreshLinks?.();
      tooltipWindow.$WowheadPower?.refreshLinks?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [items, favoriteItems, detail, locale]);

  const search = (groupLabel = armorGroup, leafLabel = armorLeaf) => {
    if (
      !collectorReady ||
      realmId === null ||
      (!supportedCategories.has(activeRoot) && !query.trim())
    )
      return;
    const group = activeGroups.find((entry) => entry.label === groupLabel);
    const leaf = group?.leaves.find((entry) => entry.label === leafLabel);
    const state: SearchState = {
      category: activeRoot,
      query: query.trim(),
      group: groupLabel,
      leaf: leafLabel,
      bonusStat: leaf?.bonusStat,
      subclasses: leaf?.subclassIds.length
        ? leaf.subclassIds
        : (group?.subclassIds ?? []),
      inventoryTypes: leaf?.types ?? [],
      expansionId,
      minLevel: minLevel === '' ? null : Number(minLevel),
      maxLevel: maxLevel === '' ? null : Number(maxLevel),
      minQuality,
      maxQuality,
      includeOutOfStock,
      sort: applied.sort,
      direction: applied.direction,
    };
    setFavoritesOpen(false);
    setApplied(state);
    setHasSearched(true);
    closeDetail();
    if (leaf?.kind === 'special') {
      setItems([]);
      setTotal(0);
      setError('Runecarving is not available yet.');
      return;
    }
    void loadArmor(realmId, state);
  };
  const changeSort = (sort: string) => {
    if ((!hasSearched && !favoritesOpen) || realmId === null) return;
    const direction =
      applied.sort === sort && applied.direction === 'asc' ? 'desc' : 'asc';
    const state = { ...applied, sort, direction } as SearchState;
    const factor = direction === 'asc' ? 1 : -1;
    const sortRows = (current: ArmorItem[]) =>
      [...current].sort((left, right) => {
        const leftValue =
          sort === 'name'
            ? left.name.localeCompare(right.name, locale)
            : sort === 'level'
              ? Number(left.effectiveItemLevel ?? left.itemLevel ?? -1) -
                Number(right.effectiveItemLevel ?? right.itemLevel ?? -1)
              : sort === 'price'
                ? Number(left.minBuyoutCopper) - Number(right.minBuyoutCopper)
                : sort === 'quantity'
                  ? Number(left.quantity) - Number(right.quantity)
                  : Number(left.listingCount) - Number(right.listingCount);
        return leftValue * factor;
      });
    setApplied(state);
    if (favoritesOpen) {
      setFavoriteItems(sortRows);
      return;
    }
    setItems(sortRows);
    void loadArmor(realmId, state, 1);
  };
  const activeVariant =
    detail?.variants.find(
      (variant) => variant.variantKey === selectedVariant,
    ) ?? detail?.variants[0];
  const detailId = detail?.id;
  useEffect(() => {
    if (!detailId || realmId === null) return;
    setHistory(null);
    void auctionApi
      .history(
        marketPath,
        detailId,
        realmId,
        historyDays,
        activeVariant?.variantKey,
      )
      .then((data) => setHistory(data))
      .catch(() => setHistory(null));
  }, [detailId, realmId, activeVariant?.variantKey, historyDays, marketPath]);
  const activeLevels = useMemo(
    () =>
      detail?.priceLevels
        .filter((level) => level.variantKey === activeVariant?.variantKey)
        .sort(
          (a, b) => Number(a.unitPriceCopper) - Number(b.unitPriceCopper),
        ) ?? [],
    [detail, activeVariant?.variantKey],
  );
  const bulk = useMemo(() => {
    let remaining = Math.max(0, wantedQuantity);
    let cost = 0;
    for (const level of activeLevels) {
      const take = Math.min(remaining, Number(level.quantity));
      cost += take * Number(level.unitPriceCopper);
      remaining -= take;
      if (!remaining) break;
    }
    const bought = wantedQuantity - remaining;
    return { bought, cost, unit: bought ? Math.round(cost / bought) : 0 };
  }, [activeLevels, wantedQuantity]);
  const displayedItems = favoritesOpen ? favoriteItems : items;
  const craftingQualityByItem = useMemo(() => {
    const groups = new Map<string, ArmorItem[]>();
    for (const item of displayedItems)
      groups.set(item.name, [...(groups.get(item.name) ?? []), item]);
    const tiers = new Map<string, number>();
    for (const group of groups.values()) {
      const distinctLevels = [
        ...new Set(
          group.map((item) =>
            Number(item.itemLevel ?? item.effectiveItemLevel ?? 0),
          ),
        ),
      ].sort((left, right) => left - right);
      if (distinctLevels.length < 2) continue;
      for (const item of group)
        tiers.set(
          `${item.id}-${item.variantKey}`,
          distinctLevels.indexOf(
            Number(item.itemLevel ?? item.effectiveItemLevel ?? 0),
          ) + 1,
        );
    }
    return tiers;
  }, [displayedItems]);
  const isCollecting =
    collectorHealth?.status === 'collecting' ||
    collectorHealth?.status === 'starting';
  const progress = collectorHealth?.progress;
  const progressPercent =
    progress && progress.total > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((progress.current / progress.total) * 100)),
        )
      : 0;
  const resultsStatus = favoritesOpen
    ? favoritesLoading
      ? copy.loading
      : `${favoriteItems.length.toLocaleString()} ${locale === 'es-MX' ? 'favoritos' : 'favorites'}`
    : loading
      ? copy.loading
      : hasSearched
        ? total > items.length
          ? locale === 'es-MX'
            ? `Mostrando ${items.length.toLocaleString()} de ${total.toLocaleString()} ${copy.results}`
            : `Showing ${items.length.toLocaleString()} of ${total.toLocaleString()} ${copy.results}`
          : `${total.toLocaleString()} ${copy.results}`
        : '';
  const resultsEmptyText = favoritesOpen
    ? favorites.length === 0
      ? locale === 'es-MX'
        ? 'Marca objetos con la estrella para verlos aquí.'
        : 'Star items to see them here.'
      : error || copy.noResults
    : hasSearched
      ? error || copy.noResults
      : copy.searchPrompt;

  return (
    <main className="auction-dashboard h-dvh overflow-hidden bg-[#3b3531] p-1.5 text-[#e7e2d8]">
      <div className="mx-auto flex h-full max-w-[1440px] flex-col gap-1.5 overflow-hidden rounded-[7px] border border-[#514a45] bg-[#272220] p-1.5 shadow-[0_0_0_1px_#171413,0_8px_30px_rgba(0,0,0,.45)]">
        <AuctionHeader
          locale={locale}
          realms={realms}
          realmId={realmId}
          disabled={interactionLocked}
          favoritesOpen={favoritesOpen}
          filterOpen={filterOpen}
          query={query}
          copy={copy}
          minLevel={minLevel}
          maxLevel={maxLevel}
          minQuality={minQuality}
          maxQuality={maxQuality}
          expansionId={expansionId}
          includeOutOfStock={includeOutOfStock}
          label={label}
          onRealmChange={setRealmId}
          onFavoritesToggle={() => {
            const next = !favoritesOpen;
            setFavoritesOpen(next);
            closeDetail();
            if (next) void loadFavorites(realmId, locale, favorites);
          }}
          onQueryChange={setQuery}
          onFilterToggle={() => setFilterOpen((value) => !value)}
          onSearch={() => {
            setFilterOpen(false);
            search();
          }}
          onMinLevelChange={setMinLevel}
          onMaxLevelChange={setMaxLevel}
          onMinQualityChange={setMinQuality}
          onMaxQualityChange={setMaxQuality}
          onExpansionChange={setExpansionId}
          onIncludeOutOfStockChange={setIncludeOutOfStock}
        />
        <div
          aria-busy={interactionLocked}
          className={`grid min-h-0 flex-1 gap-1.5 lg:grid-cols-[180px_minmax(0,1fr)] ${interactionLocked ? 'pointer-events-none' : ''}`}
        >
          <AuctionSidebar
            categories={categories}
            supportedCategories={supportedCategories}
            activeCategory={activeRoot}
            activeGroup={armorGroup}
            activeLeaf={armorLeaf}
            groups={activeGroups}
            disabled={interactionLocked}
            label={label}
            onCategoryChange={(category) => {
              if (category === 'WoW Token') {
                void openWowToken();
                return;
              }
              setActiveRoot(activeRoot === category ? '' : category);
              setArmorGroup(null);
              setArmorLeaf(null);
            }}
            onGroupChange={(group) => {
              setArmorGroup(group);
              setArmorLeaf(null);
            }}
            onLeafChange={setArmorLeaf}
          />

          <section className="relative min-h-0 overflow-hidden rounded-[5px] border border-[#151312] bg-[#151211] shadow-inner shadow-black/80">
            {detail || detailLoading ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-center gap-3 border-b border-[#413b36] bg-[#211d1b] px-3 py-1.5">
                  <button
                    onClick={closeDetail}
                    className="rounded border border-[#514a45] bg-[#332d2a] px-3 py-1 font-serif text-sm text-[#f3ce49]"
                  >
                    {copy.back}
                  </button>
                  <span className="text-xs text-[#8f8983]">
                    {detailLoading
                      ? copy.loadingItem
                      : `${detail?.realm} · ${copy.updated} ${new Date(detail?.capturedAt ?? '').toLocaleString(locale)}`}
                  </span>
                </div>
                {detail && (
                  <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_330px]">
                    <div className="min-h-0 overflow-y-auto p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h1
                            className="truncate font-serif text-xl"
                            style={{
                              color:
                                qualityColors[detail.qualityType ?? ''] ??
                                '#f0d9a6',
                            }}
                          >
                            {detail.name}
                          </h1>
                          <p className="mt-1 text-xs text-[#8f8983]">
                            {subclassLabel(detail.subclassId)} ·{' '}
                            {detail.inventoryType
                              ? label(detail.inventoryType)
                              : 'Unknown slot'}{' '}
                            · Item {detail.id}
                          </p>
                        </div>
                        <button
                          aria-pressed={isFavorite(detail.id)}
                          aria-label={
                            isFavorite(detail.id)
                              ? locale === 'es-MX'
                                ? 'Quitar de favoritos'
                                : 'Remove from favorites'
                              : locale === 'es-MX'
                                ? 'Añadir a favoritos'
                                : 'Add to favorites'
                          }
                          onClick={() => toggleFavorite(detail)}
                          className={`grid size-8 shrink-0 place-items-center rounded border text-lg ${isFavorite(detail.id) ? 'border-[#d4ce63] bg-[#4b4430] text-[#fff17a]' : 'border-[#514a45] bg-[#332d2a] text-[#8f8983] hover:text-[#fff17a]'}`}
                        >
                          ★
                        </button>
                      </div>
                      <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3">
                        <h2 className="font-serif text-[#e6ca68]">
                          {copy.baseStats}
                        </h2>
                        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <dt>{copy.available}</dt>
                          <dd>
                            {Number(detail.summary.quantity).toLocaleString()}
                          </dd>
                          <dt>{copy.auctions}</dt>
                          <dd>
                            {Number(
                              detail.summary.listing_count,
                            ).toLocaleString()}
                          </dd>
                          <dt>{copy.current}</dt>
                          <dd>
                            {formatGold(detail.summary.min_buyout_copper)}
                          </dd>
                          <dt>{copy.variants}</dt>
                          <dd>{detail.variants.length.toLocaleString()}</dd>
                        </dl>
                      </section>
                      <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3">
                        <h2 className="font-serif text-[#e6ca68]">
                          {copy.variants}
                        </h2>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {detail.variants.map((variant, index) => (
                            <button
                              key={variant.variantKey}
                              onClick={() => {
                                setSelectedVariant(variant.variantKey);
                                setWantedQuantity(1);
                              }}
                              className={`rounded border p-2 text-left text-xs ${activeVariant?.variantKey === variant.variantKey ? 'border-[#aaa4df] bg-[#4a456f]' : 'border-[#413b36] bg-[#181514] hover:bg-[#302b28]'}`}
                            >
                              <b className="block text-[#f0d9a6]">
                                {variantLabel(variant, index)}
                              </b>
                              <span>
                                {formatGold(variant.minBuyoutCopper)} ·{' '}
                                {Number(variant.quantity).toLocaleString()}{' '}
                                {copy.available.toLowerCase()}
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
                      <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3">
                        <h2 className="font-serif text-[#e6ca68]">
                          {copy.bulkPricing}
                        </h2>
                        <div className="mt-2 grid max-w-md grid-cols-2 gap-2 text-sm">
                          <label htmlFor="quantity">{copy.quantity}</label>
                          <input
                            id="quantity"
                            type="number"
                            min="1"
                            max={activeVariant?.quantity ?? 1}
                            value={wantedQuantity}
                            onChange={(event) =>
                              setWantedQuantity(
                                Math.max(
                                  1,
                                  Math.min(
                                    Number(activeVariant?.quantity ?? 1),
                                    Number(event.target.value) || 1,
                                  ),
                                ),
                              )
                            }
                            className="rounded border border-[#514a45] bg-[#171514] px-2 py-1"
                          />
                          <span>{copy.unitPrice}</span>
                          <span>{formatGold(bulk.unit)}</span>
                          <span>{copy.totalPrice}</span>
                          <span>{formatGold(bulk.cost)}</span>
                        </div>
                      </section>
                      <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <h2 className="font-serif text-[#e6ca68]">
                            {copy.priceHistory}
                          </h2>
                          <select
                            aria-label="History range"
                            value={historyDays}
                            onChange={(event) =>
                              setHistoryDays(Number(event.target.value))
                            }
                            className="rounded border border-[#514a45] bg-[#171514] px-2 py-1 text-sm"
                          >
                            <option value={7}>7 {copy.days}</option>
                            <option value={30}>30 {copy.days}</option>
                            <option value={90}>90 {copy.days}</option>
                            <option value={365}>1 {copy.year}</option>
                          </select>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                          <span>
                            Low
                            <br />
                            {formatGold(history?.stats.lowCopper ?? 0)}
                          </span>
                          <span>
                            Median
                            <br />
                            {formatGold(history?.stats.medianCopper ?? 0)}
                          </span>
                          <span>
                            High
                            <br />
                            {formatGold(history?.stats.highCopper ?? 0)}
                          </span>
                          <span>
                            Change
                            <br />
                            <b
                              className={
                                (history?.stats.changePercent ?? 0) <= 0
                                  ? 'text-[#65dc76]'
                                  : 'text-[#ff7770]'
                              }
                            >
                              {history?.stats.changePercent == null
                                ? '—'
                                : `${history.stats.changePercent >= 0 ? '+' : ''}${history.stats.changePercent.toFixed(1)}%`}
                            </b>
                          </span>
                        </div>
                        <div className="mt-3">
                          <PriceHistoryChart
                            points={history?.points ?? []}
                            locale={locale}
                          />
                        </div>
                        <p className="mt-2 text-xs text-[#8f8983]">
                          {history?.stats.captures ?? 0} stored captures for
                          this variant.
                        </p>
                      </section>
                      <section className="mt-4 rounded border border-[#4d453f] bg-[#211d1b] p-3">
                        <h2 className="font-serif text-[#e6ca68]">
                          US Realm Comparison
                        </h2>
                        <p className="mt-1 text-xs text-[#8f8983]">
                          Collection queue:{' '}
                          {comparison?.coverage.targetMonitored ?? 0} of{' '}
                          {comparison?.coverage.targeted ?? 0} target auction
                          houses · US catalog: {comparison?.coverage.total ?? 0}
                          .
                        </p>
                        <div className="mt-2 overflow-x-auto">
                          <div className="min-w-[520px] text-sm">
                            <div className="grid grid-cols-[1fr_130px_80px] border-b border-[#504841] py-1 text-[#dac364]">
                              <span>Realm</span>
                              <span>Price</span>
                              <span>Available</span>
                            </div>
                            {comparison?.realms.map((entry) => (
                              <div
                                key={entry.connectedRealmId}
                                className="grid grid-cols-[1fr_130px_80px] border-b border-[#302b28] py-1.5"
                              >
                                <span
                                  className="truncate pr-3"
                                  title={entry.name}
                                >
                                  {entry.name}
                                </span>
                                <span>{formatGold(entry.minBuyoutCopper)}</span>
                                <span>
                                  {Number(entry.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                            {comparison && comparison.realms.length === 0 && (
                              <p className="py-4 text-[#9d968e]">
                                No monitored realm currently lists this item.
                              </p>
                            )}
                          </div>
                        </div>
                      </section>
                    </div>
                    <aside className="min-h-0 overflow-y-auto border-l border-[#413b36] bg-[#181514]">
                      <div className="sticky top-0 grid grid-cols-[1fr_76px_62px] border-b border-[#504841] bg-[#2b2623] px-3 py-2 text-xs text-[#dac364]">
                        <span>{copy.unitPrice}</span>
                        <span>{copy.available}</span>
                        <span>{copy.auctions}</span>
                      </div>
                      {activeLevels.map((level) => (
                        <div
                          key={`${level.variantKey}-${level.unitPriceCopper}`}
                          className="grid grid-cols-[1fr_76px_62px] border-b border-[#292421] px-3 py-2 text-xs"
                        >
                          <span>{formatGold(level.unitPriceCopper)}</span>
                          <span>{Number(level.quantity).toLocaleString()}</span>
                          <span>
                            {Number(level.listingCount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </aside>
                  </div>
                )}
                {detail && (
                  <a
                    aria-label={detail.name}
                    href={wowheadHref(
                      detail.id,
                      detail.variants[0]?.bonusListIds ?? [],
                      detail.variants[0]?.modifiers ?? [],
                      detail.variants[0]?.effectiveItemLevel,
                      locale,
                    )}
                    data-wowhead={wowheadData(
                      detail.id,
                      detail.variants[0]?.bonusListIds ?? [],
                      detail.variants[0]?.modifiers ?? [],
                      detail.variants[0]?.effectiveItemLevel,
                      locale,
                    )}
                    data-wh-icon-size="large"
                    onClick={(event) => event.preventDefault()}
                    className="wow-detail-icon absolute left-5 top-[58px] z-20 block size-14 overflow-hidden rounded-full border-2 bg-[#111]"
                    style={{
                      borderColor:
                        qualityColors[detail.qualityType ?? ''] ?? '#9d9d9d',
                      boxShadow: `0 0 0 2px #090806, 0 0 14px ${qualityColors[detail.qualityType ?? ''] ?? '#9d9d9d'}`,
                    }}
                  />
                )}
              </div>
            ) : (
              <ResultsTable
                items={displayedItems}
                locale={locale}
                statusText={resultsStatus}
                showHeader={hasSearched || favoritesOpen}
                loading={loading || favoritesLoading}
                emptyText={resultsEmptyText}
                sort={applied}
                labels={{
                  price: copy.unitPrice,
                  item: copy.item,
                  level: locale === 'es-MX' ? 'Niv.' : 'Lvl',
                  available: copy.available,
                  auctions: copy.auctions,
                }}
                qualityColor={(quality) =>
                  qualityColors[quality ?? ''] ?? '#e4d6b9'
                }
                qualityTier={(item) =>
                  item.craftingQualityTier ??
                  craftingQualityByItem.get(`${item.id}-${item.variantKey}`)
                }
                isFavorite={isFavorite}
                onSort={changeSort}
                onOpen={(item) =>
                  void openDetail(
                    item.id,
                    realmId,
                    item.variantKey,
                    locale,
                    categoryPath(categoryForItemClass(item.itemClassId)),
                  )
                }
                onToggleFavorite={toggleFavorite}
              />
            )}
            {activeRoot === 'WoW Token' && (
              <WowTokenView
                data={wowToken}
                loading={wowTokenLoading}
                locale={locale}
                onBack={() => {
                  setActiveRoot('');
                  setWowToken(null);
                }}
              />
            )}
          </section>
        </div>
        {showCollected && (
          <div
            role="status"
            className="fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded border border-[#81c46a] bg-[#1e3b1b] px-4 py-2 text-sm text-[#e7f6d8] shadow-[0_6px_20px_#000]"
          >
            ✓{' '}
            {locale === 'es-MX'
              ? 'Carga completada correctamente'
              : 'Loaded successfully'}
          </div>
        )}
        <footer className="flex h-5 min-w-0 items-center gap-3 px-2 text-[#c9c2b9]">
          {isCollecting && (
            <div
              role="status"
              aria-live="polite"
              className="flex min-w-0 flex-1 items-center gap-1.5"
            >
              <span className="inline-block size-2.5 shrink-0 animate-spin rounded-full border-2 border-[#d7bd3d] border-t-transparent" />
              <span className="shrink-0 text-[#cbc3b7]">
                {locale === 'es-MX' ? 'Actualizando' : 'Updating'}{' '}
                {collectorHealth?.targetRealm ?? ''}
              </span>
              <div className="relative h-1 min-w-12 max-w-72 flex-1 overflow-hidden rounded bg-[#302b28]">
                <div
                  className={
                    progress?.stage === 'Downloading auctions'
                      ? 'h-full w-1/3 animate-[pulse_1s_ease-in-out_infinite] bg-[#d7bd3d]'
                      : 'h-full bg-[#d7bd3d] transition-[width] duration-300'
                  }
                  style={
                    progress?.stage === 'Downloading auctions'
                      ? undefined
                      : { width: `${progressPercent}%` }
                  }
                />
              </div>
              <span className="hidden max-w-32 truncate text-[#8f8983] sm:inline">
                {progress?.stage ?? collectorHealth?.detail ?? ''}
                {progress?.stage === 'Hydrating item metadata'
                  ? ` ${progress?.current}/${progress?.total}`
                  : ''}
              </span>
            </div>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <select
              aria-label="Language"
              value={locale}
              onChange={(event) => changeLocale(event.target.value as Locale)}
              className="rounded border-0 bg-[#26211f] px-1.5 text-[#c9c2b9]"
            >
              <option value="en-US">English (US)</option>
              <option value="es-MX">Español (MX)</option>
            </select>
            <span>{copy.home}</span>
            <span>{copy.terms}</span>
            <span>{copy.privacy}</span>
            <span>{copy.api}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
