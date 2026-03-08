import { Link, useNavigate } from 'react-router-dom';
import { getPriceForRole } from '@/utils/priceSimulator';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useStorefront } from '@/contexts/StorefrontContext';
import { emitOpenCart } from './CartDrawer';
import type { PriceList } from '@/features/priceLists/types';
import type { ProductWithId } from '@/services/products';
import type { VariableProduct } from '@/features/products/types';

interface ProductCardProps {
  product: ProductWithId;
  /** Nombre de la marca si el producto tiene brandId y se resolvió */
  brandName?: string | null;
  /** Listas de precios activas para calcular precio por rol (opcional) */
  activePriceLists?: PriceList[];
}

export const ProductCard = ({
  product,
  brandName,
  activePriceLists = [],
}: ProductCardProps) => {
  const { profile } = useAuth();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { settings } = useStorefront();
  const navigate = useNavigate();
  const favorite = isFavorite(product.id);

  const palette = settings?.colorPalette;
  const primary = palette?.primaryAction ?? '#0d9488';
  const primaryText = palette?.primaryActionText ?? '#ffffff';
  const cardBg = palette?.cardBackground ?? '#1e293b';

  const role = profile?.role;
  const displayPrice = getPriceForRole(
    product.regularPrice,
    product.costPrice,
    role,
    activePriceLists,
  );
  const hasSale =
    typeof product.salePrice === 'number' &&
    product.salePrice > 0 &&
    product.salePrice < product.regularPrice;
  const finalPrice = hasSale
    ? getPriceForRole(
        product.salePrice!,
        product.costPrice,
        role,
        activePriceLists,
      )
    : displayPrice;

  const isVariable = product.type === 'variable';
  const variableProduct = isVariable ? (product as VariableProduct) : null;
  const minVariationPrice =
    variableProduct?.variations?.length &&
    Math.min(
      ...variableProduct.variations.map((v) =>
        getPriceForRole(v.price, v.costPrice, role, activePriceLists),
      ),
    );

  const priceToShow =
    isVariable && minVariationPrice != null ? minVariationPrice : finalPrice;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isVariable) {
      navigate(`/producto/${product.id}`);
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: finalPrice,
      imageUrl: product.featuredImage,
      quantity: 1,
    });
    emitOpenCart();
  };

  return (
    <div
      className="group rounded-xl overflow-hidden border border-white/10 transition-shadow hover:shadow-lg flex flex-col"
      style={{ backgroundColor: cardBg }}
    >
      <Link to={`/producto/${product.id}`} className="block flex-1 relative">
        <div className="aspect-square bg-slate-800/50 overflow-hidden relative">
          {product.featuredImage ? (
            <img
              src={product.featuredImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-4xl">
              📦
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white/90 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          >
            {favorite ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        </div>
        <div className="p-3 md:p-4 flex-1 flex flex-col">
          {brandName && (
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">
              {brandName}
            </p>
          )}
          <h3 className="font-medium text-slate-100 line-clamp-2 text-sm md:text-base">
            {product.name}
          </h3>
          <p className="mt-1 text-sm font-semibold" style={{ color: primary }}>
            {isVariable && (minVariationPrice != null || variableProduct?.variations?.length) ? (
              <>Desde ${Number(priceToShow).toFixed(2)}</>
            ) : (
              <>${Number(priceToShow).toFixed(2)}</>
            )}
          </p>
        </div>
      </Link>
      <div className="p-3 md:p-4 pt-0">
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full rounded-md px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: primary, color: primaryText }}
        >
          {isVariable ? 'Ver opciones' : 'Añadir al carrito'}
        </button>
      </div>
    </div>
  );
};
