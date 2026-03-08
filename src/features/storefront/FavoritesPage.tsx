import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '@/contexts/FavoritesContext';
import { getProductById, type ProductWithId } from '@/services/products';
import { getPriceLists } from '@/services/priceLists';
import { ProductCard } from './components/ProductCard';
import type { PriceList } from '@/features/priceLists/types';

export const FavoritesPage = () => {
  const { productIds } = useFavorites();
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [activePriceLists, setActivePriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    Promise.all([
      getPriceLists().then((l) => l.filter((pl) => pl.isActive)),
      ...productIds.map((id) => getProductById(id)),
    ])
      .then(([lists, ...items]) => {
        setActivePriceLists(lists);
        setProducts(items.filter((p) => p.status === 'publicado'));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [productIds]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-2">Mis favoritos</h1>
      <p className="text-white/60 text-sm mb-6">
        {productIds.length === 0
          ? 'Aún no tenés productos en favoritos.'
          : `${productIds.length} producto${productIds.length === 1 ? '' : 's'} guardado${productIds.length === 1 ? '' : 's'}.`}
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="text-white/70 mb-4">
            {productIds.length === 0
              ? 'Guardá productos que te gusten para encontrarlos rápido.'
              : 'Algunos productos ya no están disponibles.'}
          </p>
          <Link
            to="/tienda"
            className="inline-flex rounded-lg px-4 py-2 text-sm font-medium text-white border border-white/30 hover:bg-white/10 transition-colors"
          >
            Ir a la tienda
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              activePriceLists={activePriceLists}
            />
          ))}
        </div>
      )}
    </div>
  );
};
