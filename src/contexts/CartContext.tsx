import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const CART_STORAGE_KEY = 'storefront-cart';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  /** Para productos variables: identificador de la variación */
  variationId?: string;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (productId: string, quantity: number, variationId?: string) => void;
  removeItem: (productId: string, variationId?: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function itemKey(item: CartItem) {
  return item.variationId ? `${item.productId}:${item.variationId}` : item.productId;
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(loadFromStorage());
  }, []);

  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  const addItem = useCallback((payload: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const quantity = payload.quantity ?? 1;
    setItems((prev) => {
      const key = payload.variationId ? `${payload.productId}:${payload.variationId}` : payload.productId;
      const existing = prev.find(
        (i) => (i.variationId ? `${i.productId}:${i.variationId}` : i.productId) === key,
      );
      if (existing) {
        return prev.map((i) =>
          (i.variationId ? `${i.productId}:${i.variationId}` : i.productId) === key
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { ...payload, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, variationId?: string) => {
    const key = variationId ? `${productId}:${variationId}` : productId;
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => itemKey(i) !== key);
      }
      return prev.map((i) =>
        itemKey(i) === key ? { ...i, quantity } : i,
      );
    });
  }, []);

  const removeItem = useCallback((productId: string, variationId?: string) => {
    const key = variationId ? `${productId}:${variationId}` : productId;
    setItems((prev) => prev.filter((i) => itemKey(i) !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
};
