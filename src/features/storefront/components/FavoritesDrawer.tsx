import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCart } from '@/contexts/CartContext';
import { useStorefront } from '@/contexts/StorefrontContext';
import { getProductById, type ProductWithId } from '@/services/products';
import { getPriceLists } from '@/services/priceLists';
import { getPriceForRole } from '@/utils/priceSimulator';
import { useAuth } from '@/contexts/AuthContext';
import { emitOpenCart } from './CartDrawer';
import type { VariableProduct } from '@/features/products/types';
import type { PriceList } from '@/features/priceLists/types';

const STOREFRONT_OPEN_FAVORITES = 'storefront-open-favorites';

export function emitOpenFavorites() {
  window.dispatchEvent(new CustomEvent(STOREFRONT_OPEN_FAVORITES));
}

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FavoritesDrawer = ({ isOpen, onClose }: FavoritesDrawerProps) => {
  const navigate = useNavigate();
  const { productIds, removeFavorite } = useFavorites();
  const { addItem } = useCart();
  const { profile } = useAuth();
  const { settings } = useStorefront();
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [activePriceLists, setActivePriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(false);

  const palette = settings?.colorPalette ?? {
    cardBackground: '#1e293b',
    primaryAction: '#0d9488',
    primaryActionText: '#ffffff',
  };
  const cardBg = palette.cardBackground;
  const primary = palette.primaryAction ?? '#0d9488';
  const primaryText = palette.primaryActionText ?? '#ffffff';
  const role = profile?.role;

  useEffect(() => {
    if (!isOpen || productIds.length === 0) {
      setProducts([]);
      return;
    }
    setLoading(true);
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
  }, [isOpen, productIds]);

  if (!isOpen) return null;

  const handleAddToCart = (product: ProductWithId) => {
    if (product.type === 'variable') {
      onClose();
      navigate(`/producto/${product.id}`);
      return;
    }
    const price = getPriceForRole(
      (product as { regularPrice: number }).regularPrice,
      product.costPrice,
      role,
      activePriceLists,
    );
    addItem({
      productId: product.id,
      name: product.name,
      price,
      imageUrl: product.featuredImage,
      quantity: 1,
    });
    emitOpenCart();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md flex flex-col shadow-xl border-l border-white/10"
        style={{ backgroundColor: cardBg }}
        aria-modal="true"
        aria-label="Favoritos"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Favoritos {productIds.length > 0 && `(${productIds.length})`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {productIds.length === 0 ? (
            <p className="text-white/60 text-sm py-8">Aún no tenés productos en favoritos.</p>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-white/60 text-sm py-8">No se pudieron cargar los productos.</p>
          ) : (
            <ul className="space-y-4">
              {products.map((product) => {
                const isVariable = product.type === 'variable';
                const variableProduct = isVariable ? (product as VariableProduct) : null;
                const minPrice =
                  variableProduct?.variations?.length
                    ? Math.min(
                        ...variableProduct.variations.map((v) =>
                          getPriceForRole(v.price, v.costPrice, role, activePriceLists),
                        ),
                      )
                    : getPriceForRole(
                        (product as { regularPrice: number }).regularPrice,
                        product.costPrice,
                        role,
                        activePriceLists,
                      );
                return (
                  <li
                    key={product.id}
                    className="flex gap-3 rounded-xl border border-white/10 p-3"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <Link
                      to={`/producto/${product.id}`}
                      onClick={onClose}
                      className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-white/5"
                    >
                      {product.featuredImage ? (
                        <img
                          src={product.featuredImage}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white/40 text-2xl">
                          📦
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/producto/${product.id}`}
                        onClick={onClose}
                        className="text-sm font-medium text-white hover:underline truncate block"
                      >
                        {product.name}
                      </Link>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: primary }}>
                        {isVariable ? `Desde $${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          className="text-xs font-medium rounded-md px-2 py-1.5 text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: primary, color: primaryText }}
                        >
                          {isVariable ? 'Ver opciones' : 'Al carrito'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFavorite(product.id)}
                          className="text-xs text-rose-400 hover:text-rose-300"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {productIds.length > 0 && !loading && products.length > 0 && (
          <div className="border-t border-white/10 p-4">
            <Link
              to="/favoritos"
              onClick={onClose}
              className="block w-full rounded-xl py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90 border border-white/20 text-white"
            >
              Ver lista de favoritos
            </Link>
          </div>
        )}
      </aside>
    </>
  );
};
