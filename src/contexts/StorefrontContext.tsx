import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getStorefrontSettings, type StorefrontSettings } from '@/services/settings';

interface StorefrontContextValue {
  settings: StorefrontSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export const StorefrontProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStorefrontSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <StorefrontContext.Provider value={{ settings, loading, error, refetch: load }}>
      {children}
    </StorefrontContext.Provider>
  );
};

export const useStorefront = (): StorefrontContextValue => {
  const ctx = useContext(StorefrontContext);
  if (!ctx) throw new Error('useStorefront debe usarse dentro de StorefrontProvider');
  return ctx;
};
