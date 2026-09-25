import { useEffect, useState } from 'react';
import { favoritesStorageKey } from '../catalog';
import type { Favorite } from '../types';

function parseFavorites(value: string | null): Favorite[] {
  const parsed = JSON.parse(value ?? '[]') as unknown;
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((favorite) => {
    if (typeof favorite !== 'object' || favorite === null) return [];
    const candidate = favorite as Favorite;
    const itemId = Number(candidate.itemId);
    const valid = Number.isSafeInteger(itemId)
      && itemId > 0
      && typeof candidate.category === 'string'
      && typeof candidate.name === 'string'
      && typeof candidate.addedAt === 'string';
    return valid ? [{ ...candidate, itemId }] : [];
  }).slice(0, 100);
}

export function useStoredFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setFavorites(parseFavorites(window.localStorage.getItem(favoritesStorageKey)));
    } catch {
      window.localStorage.removeItem(favoritesStorageKey);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(favoritesStorageKey, JSON.stringify(favorites));
  }, [favorites, loaded]);

  return { favorites, setFavorites, loaded };
}
