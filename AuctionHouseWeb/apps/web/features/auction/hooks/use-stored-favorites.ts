import { useEffect, useState } from 'react';
import { favoritesStorageKey } from '../catalog';
import { parseStoredFavorites, serializeFavorites } from '../market-identity';
import type { Favorite } from '../types';

export function useStoredFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      setFavorites(parseStoredFavorites(window.localStorage.getItem(favoritesStorageKey)) as Favorite[]);
    } catch {
      setStorageError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || storageError) return;
    try {
      window.localStorage.setItem(favoritesStorageKey, serializeFavorites(favorites));
    } catch {
      setStorageError(true);
    }
  }, [favorites, loaded, storageError]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== favoritesStorageKey || event.storageArea !== window.localStorage) return;
      try {
        setFavorites(parseStoredFavorites(event.newValue) as Favorite[]);
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  return { favorites, setFavorites, loaded, storageError };
}
