import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPublishedProducts, type ProductWithId } from '@/services/products';
import { getCategories } from '@/services/categories';
import { getAttributes, type GlobalAttribute } from '@/services/attributes';
import { getBrands } from '@/services/brands';
import { getPriceLists } from '@/services/priceLists';
import { useStorefront } from '@/contexts/StorefrontContext';
import { ProductCard } from './components/ProductCard';
import type { PriceList } from '@/features/priceLists/types';
import type { VariableProduct } from '@/features/products/types';
import type { ShopFiltersConfig } from '@/services/settings';

/** Precio efectivo mínimo de un producto (para filtro) */
function getProductMinPrice(p: ProductWithId): number {
  if (p.type === 'simple') {
    const price = (p as { salePrice?: number }).salePrice ?? p.regularPrice;
    return price;
  }
  const v = p as VariableProduct;
  if (!v.variations?.length) return p.regularPrice;
  return Math.min(...v.variations.map((x) => x.price));
}

/** Precio efectivo máximo de un producto (para filtro) */
function getProductMaxPrice(p: ProductWithId): number {
  if (p.type === 'simple') {
    const price = (p as { salePrice?: number }).salePrice ?? p.regularPrice;
    return price;
  }
  const v = p as VariableProduct;
  if (!v.variations?.length) return p.regularPrice;
  return Math.max(...v.variations.map((x) => x.price));
}

/** Producto tiene al menos uno de los valores seleccionados para el atributo (por nombre) */
function productMatchesAttribute(
  p: ProductWithId,
  attributeName: string,
  selectedValues: string[],
): boolean {
  if (!selectedValues.length) return true;
  const values = new Set(selectedValues.map((v) => v.trim().toLowerCase()));

  const baseAttr = p.attributes?.find((a) => a.name.toLowerCase() === attributeName.toLowerCase());
  if (baseAttr?.values?.length) {
    const hasMatch = baseAttr.values.some((v) => values.has(v.trim().toLowerCase()));
    if (hasMatch) return true;
  }

  if (p.type === 'variable') {
    const vp = p as VariableProduct;
    for (const v of vp.variations ?? []) {
      const val = v.attributes?.[attributeName];
      if (val != null && values.has(String(val).trim().toLowerCase())) return true;
    }
  }
  return false;
}

const PARAM_Q = 'q';
const PARAM_CATEGORY = 'category';
const PARAM_BRAND = 'brand';
const PARAM_MIN = 'minPrice';
const PARAM_MAX = 'maxPrice';
const ATTR_PREFIX = 'attr_';

export const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useStorefront();
  const config: ShopFiltersConfig = settings?.shopFilters ?? {
    showPriceFilter: true,
    showCategoryFilter: true,
    showBrandFilter: true,
    attributeSlugs: [],
  };

  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof getCategories>>>([]);
  const [globalAttributes, setGlobalAttributes] = useState<GlobalAttribute[]>([]);
  const [brands, setBrands] = useState<Awaited<ReturnType<typeof getBrands>>>([]);
  const [activePriceLists, setActivePriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Form state (solo se aplica al hacer clic en "Filtrar")
  const [formQ, setFormQ] = useState('');
  const [formCategories, setFormCategories] = useState<string[]>([]);
  const [formBrandIds, setFormBrandIds] = useState<string[]>([]);
  const [formMinPrice, setFormMinPrice] = useState('');
  const [formMaxPrice, setFormMaxPrice] = useState('');
  const [formAttrValues, setFormAttrValues] = useState<Record<string, string[]>>({});

  // Inicializar formulario desde URL
  useEffect(() => {
    const q = searchParams.get(PARAM_Q) ?? '';
    const cat = searchParams.get(PARAM_CATEGORY);
    const categorySlugs = cat ? cat.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const brandParam = searchParams.get(PARAM_BRAND);
    const brandIds = brandParam ? brandParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const min = searchParams.get(PARAM_MIN) ?? '';
    const max = searchParams.get(PARAM_MAX) ?? '';
    const attr: Record<string, string[]> = {};
    config.attributeSlugs.forEach((slug) => {
      const v = searchParams.get(ATTR_PREFIX + slug);
      if (v) attr[slug] = v.split(',').map((s) => s.trim()).filter(Boolean);
    });
    setFormQ(q);
    setFormCategories(categorySlugs);
    setFormBrandIds(brandIds);
    setFormMinPrice(min);
    setFormMaxPrice(max);
    setFormAttrValues(attr);
  }, [searchParams, config.attributeSlugs]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getPublishedProducts(),
      getCategories(),
      getAttributes(),
      getBrands(),
      getPriceLists().then((lists) => lists.filter((pl) => pl.isActive)),
    ])
      .then(([list, cats, attrs, brandList, priceLists]) => {
        if (!isMounted) return;
        setProducts(list);
        setCategories(cats);
        setGlobalAttributes(attrs);
        setBrands(brandList);
        setActivePriceLists(priceLists);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const brandNameById = useMemo(() => {
    const m: Record<string, string> = {};
    brands.forEach((b) => {
      if (b.id) m[b.id] = b.name;
    });
    return m;
  }, [brands]);

  const categorySlugsWithProducts = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      (p.categories ?? []).forEach((slug: string) => set.add(slug));
    });
    return set;
  }, [products]);

  const categoriesForFilter = useMemo(
    () => categories.filter((c) => c.slug && categorySlugsWithProducts.has(c.slug)),
    [categories, categorySlugsWithProducts],
  );

  const brandIdsWithProducts = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const bid = (p as { brandId?: string }).brandId;
      if (bid) set.add(bid);
    });
    return set;
  }, [products]);

  const brandsForFilter = useMemo(
    () => brands.filter((b) => b.id && brandIdsWithProducts.has(b.id)),
    [brands, brandIdsWithProducts],
  );

  const attributeTermsWithProducts = useMemo(() => {
    const bySlug: Record<string, { name: string; terms: string[] }> = {};
    for (const slug of config.attributeSlugs) {
      const attr = globalAttributes.find((a) => a.slug === slug);
      if (!attr) continue;
      const termsSet = new Set<string>();
      products.forEach((p) => {
        const pa = p.attributes?.find((a) => a.name.toLowerCase() === attr.name.toLowerCase());
        if (pa?.values?.length) pa.values.forEach((v) => termsSet.add(v.trim()));
        if (p.type === 'variable') {
          const vp = p as VariableProduct;
          (vp.variations ?? []).forEach((v) => {
            const val = v.attributes?.[attr.name];
            if (val != null) termsSet.add(String(val).trim());
          });
        }
      });
      if (termsSet.size) bySlug[slug] = { name: attr.name, terms: Array.from(termsSet).sort() };
    }
    return bySlug;
  }, [products, config.attributeSlugs, globalAttributes]);

  const appliedQ = searchParams.get(PARAM_Q) ?? '';
  const appliedCategories = (searchParams.get(PARAM_CATEGORY) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const appliedBrandIds = (searchParams.get(PARAM_BRAND) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const appliedMin = searchParams.get(PARAM_MIN);
  const appliedMax = searchParams.get(PARAM_MAX);
  const appliedAttr: Record<string, string[]> = {};
  config.attributeSlugs.forEach((slug) => {
    const v = searchParams.get(ATTR_PREFIX + slug);
    if (v) appliedAttr[slug] = v.split(',').map((s) => s.trim()).filter(Boolean);
  });

  const filteredProducts = useMemo(() => {
    let list = [...products];

    const q = appliedQ.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = (p.name ?? '').toLowerCase();
        const desc = (p.description ?? '').toLowerCase();
        const sku = (p.sku ?? '').toLowerCase();
        return name.includes(q) || desc.includes(q) || sku.includes(q);
      });
    }

    if (appliedCategories.length) {
      list = list.filter((p) =>
        (p.categories ?? []).some((c: string) => appliedCategories.includes(c)),
      );
    }

    if (appliedBrandIds.length) {
      list = list.filter((p) => {
        const bid = (p as { brandId?: string }).brandId;
        return bid && appliedBrandIds.includes(bid);
      });
    }

    const minNum = appliedMin ? Number(appliedMin) : null;
    const maxNum = appliedMax ? Number(appliedMax) : null;
    if (minNum != null && !Number.isNaN(minNum)) {
      list = list.filter((p) => getProductMaxPrice(p) >= minNum);
    }
    if (maxNum != null && !Number.isNaN(maxNum)) {
      list = list.filter((p) => getProductMinPrice(p) <= maxNum);
    }

    for (const slug of config.attributeSlugs) {
      const selected = appliedAttr[slug];
      if (!selected?.length) continue;
      const info = attributeTermsWithProducts[slug];
      if (!info) continue;
      list = list.filter((p) => productMatchesAttribute(p, info.name, selected));
    }

    return list;
  }, [products, appliedQ, appliedCategories, appliedBrandIds, appliedMin, appliedMax, appliedAttr, config.attributeSlugs, attributeTermsWithProducts]);

  const applyFilters = useCallback(() => {
    const next = new URLSearchParams();
    if (formQ.trim()) next.set(PARAM_Q, formQ.trim());
    if (formCategories.length) next.set(PARAM_CATEGORY, formCategories.join(','));
    if (formBrandIds.length) next.set(PARAM_BRAND, formBrandIds.join(','));
    if (formMinPrice.trim()) next.set(PARAM_MIN, formMinPrice.trim());
    if (formMaxPrice.trim()) next.set(PARAM_MAX, formMaxPrice.trim());
    Object.entries(formAttrValues).forEach(([slug, vals]) => {
      if (vals.length) next.set(ATTR_PREFIX + slug, vals.join(','));
    });
    setSearchParams(next, { replace: true });
    setFiltersOpen(false);
  }, [formQ, formCategories, formBrandIds, formMinPrice, formMaxPrice, formAttrValues, setSearchParams]);

  const clearFilters = useCallback(() => {
    setFormQ('');
    setFormCategories([]);
    setFormBrandIds([]);
    setFormMinPrice('');
    setFormMaxPrice('');
    setFormAttrValues({});
    setSearchParams({}, { replace: true });
    setFiltersOpen(false);
  }, [setSearchParams]);

  const toggleCategory = (slug: string) => {
    setFormCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const toggleBrand = (brandId: string) => {
    setFormBrandIds((prev) =>
      prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId],
    );
  };

  const toggleAttrValue = (attrSlug: string, value: string) => {
    setFormAttrValues((prev) => {
      const arr = prev[attrSlug] ?? [];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      const nextState = { ...prev };
      if (next.length) nextState[attrSlug] = next;
      else delete nextState[attrSlug];
      return nextState;
    });
  };

  const palette = settings?.colorPalette;
  const primary = palette?.primaryAction ?? '#0d9488';
  const primaryText = palette?.primaryActionText ?? '#ffffff';
  const cardBg = palette?.cardBackground ?? '#1e293b';

  const filterPanel = (
    <div className="space-y-6">
      {config.showPriceFilter && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Precio</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Mín"
              value={formMinPrice}
              onChange={(e) => setFormMinPrice(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder:text-slate-400"
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Máx"
              value={formMaxPrice}
              onChange={(e) => setFormMaxPrice(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder:text-slate-400"
            />
          </div>
        </div>
      )}

      {config.showCategoryFilter && categoriesForFilter.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Categorías</h3>
          <div className="space-y-1.5">
            {categoriesForFilter.map((c) => (
              <label key={c.id ?? c.slug} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formCategories.includes(c.slug)}
                  onChange={() => toggleCategory(c.slug)}
                  className="rounded border-slate-500 text-teal-500 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-300">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {config.showBrandFilter && brandsForFilter.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Marcas</h3>
          <div className="space-y-1.5">
            {brandsForFilter.map((b) => (
              <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formBrandIds.includes(b.id!)}
                  onChange={() => toggleBrand(b.id!)}
                  className="rounded border-slate-500 text-teal-500 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-300">{b.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {config.attributeSlugs.map((slug) => {
        const info = attributeTermsWithProducts[slug];
        if (!info?.terms.length) return null;
        const selected = formAttrValues[slug] ?? [];
        return (
          <div key={slug}>
            <h3 className="text-sm font-semibold text-slate-200 mb-2">{info.name}</h3>
            <div className="space-y-1.5">
              {info.terms.map((term) => (
                <label key={term} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(term)}
                    onChange={() => toggleAttrValue(slug, term)}
                    className="rounded border-slate-500 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-300">{term}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={applyFilters}
          className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: primary, color: primaryText }}
        >
          Filtrar
        </button>
        <button
          type="button"
          onClick={clearFilters}
          className="w-full rounded-lg py-2.5 text-sm font-medium text-slate-300 border border-slate-600 hover:bg-slate-800 transition-colors"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-6 md:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Tienda</h1>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="md:hidden flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border border-slate-600 text-slate-200 hover:bg-slate-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros
        </button>
      </div>

      <div className="flex gap-8">
        {/* Sidebar desktop */}
        <aside className="hidden md:block w-64 shrink-0">
          <div
            className="sticky top-4 rounded-xl border border-white/10 p-4"
            style={{ backgroundColor: cardBg }}
          >
            {filterPanel}
          </div>
        </aside>

        {/* Listado */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="rounded-xl h-72 animate-pulse" style={{ backgroundColor: cardBg }} />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-slate-400 py-8">No hay productos que coincidan con los filtros.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  brandName={p.brandId ? brandNameById[p.brandId] ?? null : null}
                  activePriceLists={activePriceLists}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawer móvil */}
      {filtersOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setFiltersOpen(false)} aria-hidden />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm flex flex-col border-l border-slate-700 shadow-xl md:hidden overflow-y-auto" style={{ backgroundColor: cardBg }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <span className="font-semibold text-slate-100">Filtros</span>
              <button type="button" onClick={() => setFiltersOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-full" aria-label="Cerrar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4">{filterPanel}</div>
          </aside>
        </>
      )}
    </div>
  );
};
