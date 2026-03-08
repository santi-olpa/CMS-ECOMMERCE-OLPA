import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'storefront-favorites';

interface FavoritesContextValue {
  productIds: string[];
  count: number;
  isFavorite: (productId: string) => boolean;
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (productId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function loadFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveToStorage(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [productIds, setProductIds] = useState<string[]>(loadFromStorage);

  useEffect(() => {
    saveToStorage(productIds);
  }, [productIds]);

  const isFavorite = useCallback(
    (productId: string) => productIds.includes(productId),
    [productIds],
  );

  const addFavorite = useCallback((productId: string) => {
    setProductIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
  }, []);

  const removeFavorite = useCallback((productId: string) => {
    setProductIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    setProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  }, []);

  const value: FavoritesContextValue = {
    productIds,
    count: productIds.length,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextValue => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites debe usarse dentro de FavoritesProvider');
  return ctx;
};
