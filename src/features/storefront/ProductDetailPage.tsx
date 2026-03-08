import { useEffect, useState, useMemo } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { getProductById, getProductsBySkus, type ProductWithId } from '@/services/products';
import { getBrandById } from '@/services/brands';
import { getPriceLists } from '@/services/priceLists';
import { getActivePaymentMethods } from '@/services/paymentMethods';
import { getActivePromotions } from '@/services/promotions';
import { getPriceForRole } from '@/utils/priceSimulator';
import { calculatePaymentOptions } from '@/utils/promotionsEngine';
import type { PaymentMethod } from '@/services/paymentMethods';
import type { Promotion } from '@/services/promotions';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useStorefront } from '@/contexts/StorefrontContext';
import { emitOpenCart } from './components/CartDrawer';
import { ProductCard } from './components/ProductCard';
import type { PriceList } from '@/features/priceLists/types';
import type { VariableProduct, ProductVariation } from '@/features/products/types';

export const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { settings } = useStorefront();

  const [product, setProduct] = useState<ProductWithId | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [crossSellProducts, setCrossSellProducts] = useState<ProductWithId[]>([]);
  const [activePriceLists, setActivePriceLists] = useState<PriceList[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  const role = profile?.role;
  const palette = settings?.colorPalette;
  const primary = palette?.primaryAction ?? '#0d9488';
  const primaryText = palette?.primaryActionText ?? '#ffffff';
  const cardBg = palette?.cardBackground ?? '#1e293b';

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Producto no encontrado.');
      return;
    }
    let isMounted = true;
    Promise.all([
      getProductById(id),
      getPriceLists().then((l) => l.filter((pl) => pl.isActive)),
      getActivePaymentMethods(),
      getActivePromotions(),
    ])
      .then(async ([p, lists, methods, promos]) => {
        if (!isMounted) return;
        if (p.status !== 'publicado') {
          setError('Producto no disponible.');
          setProduct(null);
          return;
        }
        setProduct(p);
        setActivePriceLists(lists);
        setPaymentMethods(methods);
        setPromotions(promos);
        if (p.brandId) {
          const brand = await getBrandById(p.brandId);
          if (isMounted && brand) setBrandName(brand.name);
        }
        const skus = p.crossSellSkus ?? [];
        if (skus.length > 0) {
          getProductsBySkus(skus, p.id)
            .then((list) => {
              if (isMounted) setCrossSellProducts(list);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Error al cargar.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  const images = useMemo(() => {
    if (!product) return [];
    const list = [product.featuredImage, ...(product.gallery ?? [])].filter(
      (url): url is string => !!url,
    );
    return list.length ? list : [];
  }, [product]);

  const isVariable = product?.type === 'variable';
  const variableProduct = isVariable ? (product as VariableProduct) : null;
  const variationAttributes = useMemo(
    () =>
      variableProduct?.attributes?.filter((a) => a.createsVariation && a.values?.length) ?? [],
    [variableProduct],
  );

  const selectedVariation = useMemo((): ProductVariation | null => {
    if (!variableProduct?.variations?.length || variationAttributes.length === 0) return null;
    const required = variationAttributes.every((a) => selectedAttributes[a.name]);
    if (!required) return null;
    return (
      variableProduct.variations.find((v) =>
        variationAttributes.every(
          (a) => v.attributes[a.name] === selectedAttributes[a.name],
        ),
      ) ?? null
    );
  }, [variableProduct, variationAttributes, selectedAttributes]);

  const displayPrice = useMemo(() => {
    if (!product) return 0;
    if (product.type === 'simple') {
      const hasSale =
        typeof product.salePrice === 'number' &&
        product.salePrice > 0 &&
        product.salePrice < product.regularPrice;
      const base = hasSale ? product.salePrice! : product.regularPrice;
      const cost = product.costPrice;
      return getPriceForRole(base, cost, role, activePriceLists);
    }
    if (selectedVariation) {
      return getPriceForRole(
        selectedVariation.price,
        selectedVariation.costPrice,
        role,
        activePriceLists,
      );
    }
    return getPriceForRole(
      product.regularPrice,
      product.costPrice,
      role,
      activePriceLists,
    );
  }, [product, selectedVariation, role, activePriceLists]);

  const applicablePromotions = useMemo(() => {
    if (!product) return [];
    return promotions.filter((p) => {
      if (p.target === 'all') return true;
      if (p.target === 'category' && p.categorySlug && product.categories?.includes(p.categorySlug)) return true;
      if (p.target === 'product' && p.productId === product.id) return true;
      return false;
    });
  }, [product, promotions]);

  const paymentOptions = useMemo(
    () => calculatePaymentOptions(displayPrice, paymentMethods, applicablePromotions),
    [displayPrice, paymentMethods, applicablePromotions],
  );

  const promotionOptions = useMemo(
    () => paymentOptions.filter((opt) => opt.promotionId != null),
    [paymentOptions],
  );
  const hasPromotionsBlock = promotionOptions.length > 0;

  const canAddToCart = useMemo(() => {
    if (!product) return false;
    if (product.type === 'simple') {
      const stock = (product as { stock: number }).stock;
      return stock >= quantity;
    }
    if (!selectedVariation) return false;
    return selectedVariation.stock >= quantity;
  }, [product, selectedVariation, quantity]);

  const handleAddToCart = () => {
    if (!product || !canAddToCart) return;
    if (product.type === 'simple') {
      addItem({
        productId: product.id,
        name: product.name,
        price: displayPrice,
        imageUrl: product.featuredImage,
        quantity,
      });
      emitOpenCart();
      return;
    }
    if (selectedVariation) {
      addItem({
        productId: product.id,
        name: `${product.name} (${variationAttributes.map((a) => selectedAttributes[a.name]).join(', ')})`,
        price: displayPrice,
        imageUrl: selectedVariation.imageUrl ?? product.featuredImage,
        quantity,
        variationId: selectedVariation.id,
      });
      emitOpenCart();
    }
  };

  const handleBuyNow = () => {
    if (!product || !canAddToCart) return;
    if (product.type === 'simple') {
      addItem({
        productId: product.id,
        name: product.name,
        price: displayPrice,
        imageUrl: product.featuredImage,
        quantity,
      });
    } else if (selectedVariation) {
      addItem({
        productId: product.id,
        name: `${product.name} (${variationAttributes.map((a) => selectedAttributes[a.name]).join(', ')})`,
        price: displayPrice,
        imageUrl: selectedVariation.imageUrl ?? product.featuredImage,
        quantity,
        variationId: selectedVariation.id,
      });
    }
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !product) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      {/* Layout 3 columnas: imagen | info + promos + detalle | precio + variantes + CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Col 1: Imagen + galería */}
        <div className="lg:col-span-5 space-y-3">
          <div
            className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-slate-800/50"
            style={{ backgroundColor: cardBg }}
          >
            {images.length > 0 ? (
              <img
                src={images[galleryIndex]}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-6xl">
                📦
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryIndex(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === galleryIndex
                      ? 'border-white ring-2 ring-white/30'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: cardBg }}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Col 2: Nombre, promociones, detalle */}
        <div className="lg:col-span-4 flex flex-col">
          {brandName && (
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-1">
              {brandName}
            </p>
          )}
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-100 leading-tight">
            {product.name}
          </h1>

          {hasPromotionsBlock && (
            <div className="mt-4 rounded-xl overflow-hidden border border-white/10" style={{ backgroundColor: cardBg }}>
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2" style={{ color: primary }}>
                <span className="text-lg" aria-hidden>🎁</span>
                <span className="font-semibold text-sm">Promociones</span>
                <span className="text-xs font-medium opacity-90">({promotionOptions.length})</span>
              </div>
              <ul className="px-4 py-3 space-y-2">
                {promotionOptions.map((opt, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-slate-200 text-sm border-l-2"
                    style={{ borderLeftColor: primary, backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    {opt.installmentsCount != null && opt.installmentAmount != null ? (
                      <span>
                        <span className="font-medium">{opt.paymentMethodName}</span>
                        <span className="text-slate-500 mx-1">·</span>
                        <span>{opt.promotionName}</span>
                        <span className="text-slate-500 mx-1">·</span>
                        <span className="font-semibold" style={{ color: primary }}>
                          {opt.installmentsCount} cuotas de ${opt.installmentAmount?.toFixed(2)}
                        </span>
                        <span className="text-slate-500 text-xs ml-1">(total ${opt.finalPrice.toFixed(2)})</span>
                      </span>
                    ) : (
                      <span>
                        <span className="font-medium">{opt.paymentMethodName}</span>
                        <span className="text-slate-500 mx-1">·</span>
                        <span>{opt.promotionName}</span>
                        <span className="ml-2 font-semibold" style={{ color: primary }}>
                          ${opt.finalPrice.toFixed(2)}
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex-1">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">Detalle</h2>
            <p className="text-slate-300 text-sm md:text-base whitespace-pre-wrap leading-relaxed">
              {product.description || 'Sin descripción.'}
            </p>
          </div>
        </div>

        {/* Col 3: Precio, selector variantes, cantidad, Añadir al carrito, Comprar ahora */}
        <div className="lg:col-span-3">
          <div
            className="rounded-xl border border-white/10 p-5 sticky top-24"
            style={{ backgroundColor: cardBg }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-2xl font-bold" style={{ color: primary }}>
                ${displayPrice.toFixed(2)}
              </p>
              <button
                type="button"
                onClick={() => product && toggleFavorite(product.id)}
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={product && isFavorite(product.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              >
                {product && isFavorite(product.id) ? (
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
            {(isVariable && selectedVariation) && (
              <p className="text-xs text-slate-400 mt-0.5">Stock: {selectedVariation.stock}</p>
            )}
            {product.type === 'simple' && (
              <p className="text-xs text-slate-400 mt-0.5">Stock: {(product as { stock: number }).stock}</p>
            )}

            {variationAttributes.length > 0 && (
              <div className="mt-5 space-y-4">
                {variationAttributes.map((attr) => (
                  <div key={attr.id}>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      {attr.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {attr.values.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setSelectedAttributes((prev) => ({
                              ...prev,
                              [attr.name]: value,
                            }))
                          }
                          className={`rounded-md px-3 py-2 text-sm font-medium border transition-colors ${
                            selectedAttributes[attr.name] === value
                              ? 'border-white bg-white/10 text-white'
                              : 'border-slate-600 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {selectedVariation && selectedVariation.stock <= 0 && (
                  <p className="text-amber-400 text-sm">Sin stock para esta combinación.</p>
                )}
              </div>
            )}

            {(!isVariable || selectedVariation) && (
              <div className="mt-5 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-white/20 overflow-hidden bg-white/5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-slate-100 font-medium">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAddToCart}
                className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: primary, color: primaryText }}
              >
                {isVariable && !selectedVariation
                  ? 'Elegí las opciones'
                  : 'Añadir al carrito'}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!canAddToCart}
                className="w-full rounded-lg px-4 py-3 text-sm font-semibold border border-white/30 text-slate-200 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Comprar ahora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-selling */}
      {crossSellProducts.length > 0 && (
        <section className="mt-12 pt-8 border-t border-white/10" aria-labelledby="crosssell-title">
          <h2 id="crosssell-title" className="text-lg font-semibold text-slate-100 mb-4">
            También te puede interesar
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {crossSellProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                activePriceLists={activePriceLists}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
