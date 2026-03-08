import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import {
  ProductAttribute,
  ProductPayload,
  ProductType,
  ProductVariation,
  VariableProduct,
} from './types';
import { getProductById, updateProduct } from '@/services/products';
import { getPriceLists } from '@/services/priceLists';
import { createCategory, getCategories } from '@/services/categories';
import { createBrand, getBrands } from '@/services/brands';
import { getAttributes } from '@/services/attributes';
import type { Category } from '@/features/categories/types';
import type { Brand } from '@/services/brands';
import type { GlobalAttribute } from '@/services/attributes';
import type { ProductStatus } from './types';
import { PriceList } from '@/features/priceLists/types';
import { calculateSimulatedPrice } from '@/utils/priceSimulator';
import { MediaLibraryModal } from '@/components/MediaLibraryModal';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export const ProductEditPage = () => {
  const { productId } = useParams<{ productId: string }>();

  const [type, setType] = useState<ProductType>('simple');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [status, setStatus] = useState<ProductStatus>('borrador');
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [crossSellSkus, setCrossSellSkus] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activePriceLists, setActivePriceLists] = useState<PriceList[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [brandList, setBrandList] = useState<Brand[]>([]);
  const [globalAttributeList, setGlobalAttributeList] = useState<GlobalAttribute[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<
    | { kind: 'featured' }
    | { kind: 'gallery' }
    | { kind: 'variation'; variationId: string }
    | null
  >(null);

  useEffect(() => {
    const load = async () => {
      if (!productId) {
        setError('No se ha proporcionado un ID de producto válido.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const product = await getProductById(productId);

        setType(product.type);
        setSku(product.sku);
        setName(product.name);
        setDescription(product.description);
        setCostPrice(
          typeof product.costPrice === 'number' ? product.costPrice.toString() : '',
        );
        setRegularPrice(product.regularPrice.toString());
        setSalePrice(
          typeof product.salePrice === 'number' ? product.salePrice.toString() : '',
        );
        setStatus(
          product.status === 'pendiente'
            ? 'borrador'
            : ((product.status as ProductStatus) ?? 'borrador'),
        );
        setFeaturedImage((product as any).featuredImage ?? null);
        setGallery(
          (product as any).gallery ??
            (Array.isArray((product as any).images)
              ? ((product as any).images as string[])
              : []),
        );
        setCategories(product.categories ?? []);
        setBrandId((product as { brandId?: string }).brandId ?? null);
        setTags(product.tags ?? []);
        setCrossSellSkus(product.crossSellSkus ?? []);
        // Inicializamos valuesText para no romper el input controlado
        setAttributes(
          (product.attributes ?? []).map((attr) => ({
            ...attr,
            valuesText: attr.values?.join(', ') ?? '',
          })),
        );

        if (product.type === 'variable') {
          const variable = product as VariableProduct;
          setVariations(variable.variations ?? []);
        } else {
          setVariations([]);
        }

        setLoading(false);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Ha ocurrido un error al cargar el producto.';
        setError(message);
        setLoading(false);
      }
    };

    load();
  }, [productId]);

  useEffect(() => {
    const loadPriceLists = async () => {
      try {
        const lists = await getPriceLists();
        setActivePriceLists(lists.filter((pl) => pl.isActive));
      } catch {
        setActivePriceLists([]);
      }
    };
    loadPriceLists();
  }, []);

  useEffect(() => {
    Promise.all([getCategories(), getBrands(), getAttributes()]).then(([cats, brands, attrs]) => {
      setCategoryList(cats);
      setBrandList(brands);
      setGlobalAttributeList(attrs);
    }).catch(() => {});
  }, []);

  const toggleCategory = (slug: string) => {
    setCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const handleCreateBrand = async () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) return;
    const slug = slugify(trimmed);
    if (!slug) return;
    setCreatingBrand(true);
    try {
      const id = await createBrand({ name: trimmed, slug });
      const list = await getBrands();
      setBrandList(list);
      setBrandId(id);
      setNewBrandName('');
      setShowNewBrand(false);
    } catch {
      setError('No se pudo crear la marca.');
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const slug = slugify(trimmed);
    if (!slug) return;
    setCreatingCategory(true);
    try {
      await createCategory({ name: trimmed, slug, parentId: null });
      const list = await getCategories();
      setCategoryList(list);
      const newCat = list.find((c) => c.slug === slug);
      if (newCat?.slug) {
        setCategories((prev) => (prev.includes(newCat.slug) ? prev : [...prev, newCat.slug]));
      }
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch {
      setError('No se pudo crear la categoría.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const openFeaturedPicker = () => {
    setMediaTarget({ kind: 'featured' });
    setIsMediaModalOpen(true);
  };

  const openGalleryPicker = () => {
    setMediaTarget({ kind: 'gallery' });
    setIsMediaModalOpen(true);
  };

  const openVariationPicker = (variationId: string) => {
    setMediaTarget({ kind: 'variation', variationId });
    setIsMediaModalOpen(true);
  };

  const handleMediaSelect = (url: string) => {
    if (!mediaTarget) return;

    if (mediaTarget.kind === 'featured') {
      setFeaturedImage(url);
    } else if (mediaTarget.kind === 'gallery') {
      setGallery((prev) =>
        prev.includes(url) ? prev : [...prev, url],
      );
    } else if (mediaTarget.kind === 'variation') {
      setVariations((prev) =>
        prev.map((v) =>
          v.id === mediaTarget.variationId ? { ...v, imageUrl: url } : v,
        ),
      );
    }

    setMediaTarget(null);
    setIsMediaModalOpen(false);
  };

  const getPriceListRuleDescription = (pl: PriceList): string => {
    const op = pl.operation === 'increase' ? '+' : '−';
    const val =
      pl.valueType === 'percentage'
        ? `${pl.value}%`
        : `$${pl.value.toFixed(2)}`;
    const sobre = pl.operation === 'increase' ? 'sobre costo' : 'sobre precio';
    return `${op}${val} ${sobre}`;
  };

  const handleCommaSeparatedChange = (value: string, setter: (values: string[]) => void) => {
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    setter(items);
  };

  const handleAddAttribute = () => {
    setAttributes((prev) => [
      ...prev,
      {
        id: uuid(),
        name: '',
        createsVariation: false,
        values: [],
        valuesText: '',
      },
    ]);
  };

  const handleAddAttributeFromCatalog = (globalAttr: GlobalAttribute) => {
    setAttributes((prev) => [
      ...prev,
      {
        id: uuid(),
        name: globalAttr.name,
        createsVariation: false,
        values: [...(globalAttr.terms || [])],
        valuesText: (globalAttr.terms || []).join(', '),
      },
    ]);
  };

  const handleAttributeChange = (id: string, patch: Partial<ProductAttribute>) => {
    setAttributes((prev) => prev.map((attr) => (attr.id === id ? { ...attr, ...patch } : attr)));
  };

  const handleDeleteAttribute = (id: string) => {
    setAttributes((prev) => prev.filter((attr) => attr.id !== id));
  };

  const handleAddVariation = () => {
    setVariations((prev) => [
      ...prev,
      {
        id: uuid(),
        price: 0,
        stock: 0,
        attributes: {},
      },
    ]);
  };

  const handleVariationChange = (id: string, patch: Partial<ProductVariation>) => {
    setVariations((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const handleVariationAttributeChange = (variationId: string, attributeName: string, value: string) => {
    setVariations((prev) =>
      prev.map((v) =>
        v.id === variationId
          ? {
              ...v,
              attributes: {
                ...v.attributes,
                [attributeName]: value,
              },
            }
          : v,
      ),
    );
  };

  const handleDeleteVariation = (id: string) => {
    setVariations((prev) => prev.filter((v) => v.id !== id));
  };

  const generateVariationsFromAttributes = () => {
    const variationAttributes = attributes.filter(
      (attr) => attr.createsVariation && attr.name.trim() && attr.values.length > 0,
    );

    if (variationAttributes.length === 0) {
      return;
    }

    type Combo = Record<string, string>;
    let combos: Combo[] = [{}];

    variationAttributes.forEach((attr) => {
      const next: Combo[] = [];
      combos.forEach((combo) => {
        attr.values.forEach((value) => {
          next.push({
            ...combo,
            [attr.name]: value,
          });
        });
      });
      combos = next;
    });

    setVariations(
      combos.map((combo) => ({
        id: uuid(),
        price: 0,
        costPrice: 0,
        stock: 0,
        attributes: combo,
      })),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!productId) {
      setError('No se ha proporcionado un ID de producto válido.');
      return;
    }

    if (!sku || !name) {
      setError('SKU y nombre son obligatorios.');
      return;
    }

    const base: Omit<ProductPayload, 'type' | 'variations'> & { type: ProductType } = {
      sku,
      name,
      description,
      costPrice: costPrice ? Number(costPrice) : 0,
      regularPrice: regularPrice === '' ? 0 : Number(regularPrice),
      salePrice: salePrice ? Number(salePrice) : undefined,
      brandId: brandId ?? undefined,
      categories,
      tags,
      crossSellSkus,
      status,
      featuredImage: featuredImage ?? undefined,
      gallery,
      type,
      attributes,
    };

    let payload: ProductPayload;

    if (type === 'simple') {
      payload = {
        ...(base as any),
        type: 'simple',
      };
    } else {
      payload = {
        ...(base as any),
        type: 'variable',
        variations,
      };
    }

    setSubmitting(true);

    try {
      await updateProduct(productId, payload);
      setSuccess('Producto actualizado correctamente.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Ha ocurrido un error inesperado al actualizar el producto.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 rounded-md bg-slate-800 animate-pulse" />
        <div className="h-5 w-64 rounded-md bg-slate-800 animate-pulse" />
        <div className="h-[320px] w-full rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Editar producto</h1>
        <p className="text-sm text-slate-400">
          Actualiza la información de un producto existente. Los cambios se aplicarán inmediatamente en tienda.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-[2fr,1.2fr] gap-6"
      >
        {/* Reutilizamos la misma estructura visual que en ProductCreatePage */}
        <section className="space-y-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Información básica</h2>
                <p className="text-xs text-slate-500">
                  Datos generales que verán los clientes en la tienda.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs">
                <span className="text-slate-400">Tipo de producto</span>
                <div className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 p-1">
                  <button
                    type="button"
                    onClick={() => setType('simple')}
                    className={`px-3 py-1 rounded-full ${
                      type === 'simple'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('variable')}
                    className={`px-3 py-1 rounded-full ${
                      type === 'variable'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Variable
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">
                  SKU <span className="text-rose-400">*</span>
                </label>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  placeholder="SKU interno, por ejemplo, OL-TSHIRT-001"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">
                  Nombre <span className="text-rose-400">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  placeholder="Nombre visible del producto"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-200">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600 resize-none"
                placeholder="Describe los beneficios, materiales, cuidados, etc."
              />
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Precios</h2>
                <p className="text-xs text-slate-500">
                  Define el precio base y opcionalmente un precio de oferta.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">
                  Precio regular
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-xs text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={regularPrice}
                    onChange={(e) => setRegularPrice(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Opcional si usas lista de precios. {costPrice && regularPrice && Number(regularPrice) > 0
                    ? `Margen estimado: ${Math.max(
                        0,
                        ((Number(regularPrice) - Number(costPrice)) / Number(regularPrice)) * 100,
                      ).toFixed(1)}%`
                    : 'Margen estimado: —'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Precio de oferta</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-xs text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Costo (base)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-xs text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                    placeholder="Costo unitario"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Imágenes</h2>
                <p className="text-xs text-slate-500">
                  Gestiona la imagen destacada y la galería del producto.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-[11px] font-medium text-slate-200 uppercase tracking-wide">
                  Imagen destacada
                </h3>
                {featuredImage ? (
                  <div className="space-y-2">
                    <div className="relative w-full aspect-video max-w-xs overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                      <img
                        src={featuredImage}
                        alt="Imagen destacada"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={openFeaturedPicker}
                        className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-800"
                      >
                        Cambiar imagen
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeaturedImage(null)}
                        className="inline-flex items-center rounded-md border border-rose-700/70 bg-rose-950/40 px-3 py-1.5 text-[11px] font-medium text-rose-100 hover:bg-rose-900/70"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openFeaturedPicker}
                    className="flex h-28 w-full max-w-xs flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/60 text-[11px] text-slate-400 hover:border-brand-500 hover:text-brand-300"
                  >
                    <span className="text-xl mb-1">＋</span>
                    Seleccionar imagen destacada
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-[11px] font-medium text-slate-200 uppercase tracking-wide">
                  Galería
                </h3>
                <div className="flex flex-wrap gap-2">
                  {gallery.map((url) => (
                    <div
                      key={url}
                      className="relative h-16 w-16 overflow-hidden rounded-md border border-slate-700 bg-slate-900"
                    >
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setGallery((prev) => prev.filter((u) => u !== url))
                        }
                        className="absolute -top-1 -right-1 rounded-full bg-slate-950/90 px-1 text-[10px] text-slate-200 hover:bg-rose-700 hover:text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={openGalleryPicker}
                    className="flex h-16 w-16 flex-col items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-950/60 text-[11px] text-slate-400 hover:border-brand-500 hover:text-brand-300"
                  >
                    <span className="text-lg leading-none mb-0.5">＋</span>
                    Añadir
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Simulador de Precios (ERP)</h2>
              <p className="text-xs text-slate-500">
                Precio final simulado según cada lista de precios activa. Para productos variables se usa el precio y costo base del producto.
              </p>
            </div>
            {activePriceLists.length === 0 ? (
              <p className="text-xs text-slate-500">
                No hay listas de precios activas. Crea y activa listas en Listas de precios.
              </p>
            ) : (
              <div className="space-y-3">
                {activePriceLists.map((pl) => {
                  const reg = Number(regularPrice) || 0;
                  const cost = Number(costPrice) || 0;
                  const simulated = calculateSimulatedPrice(reg, cost, pl);
                  return (
                    <div
                      key={pl.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
                    >
                      <div>
                        <span className="text-xs font-medium text-slate-100">{pl.name}</span>
                        <span className="ml-2 text-[11px] text-slate-400">
                          {getPriceListRuleDescription(pl)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-300">
                        ${simulated.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Atributos</h2>
                <p className="text-xs text-slate-500">
                  Define propiedades como color, talla, material. Marca cuáles generan variaciones.
                </p>
              </div>
              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const attr = globalAttributeList.find((a) => a.id === id);
                  if (attr) handleAddAttributeFromCatalog(attr);
                  e.target.value = '';
                }}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                <option value="">Añadir desde catálogo</option>
                {globalAttributeList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.terms?.length ?? 0} términos)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddAttribute}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
              >
                <span className="text-base leading-none">＋</span>
                Añadir atributo nuevo
              </button>
            </div>

            {attributes.length === 0 && (
              <p className="text-xs text-slate-500">
                Todavía no hay atributos. Usa el catálogo o crea uno nuevo (ej: Color, Talla).
              </p>
            )}

            <div className="space-y-3">
              {attributes.map((attr) => (
                <div
                  key={attr.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 space-y-2"
                >
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[11px] font-medium text-slate-200 uppercase tracking-wide">
                        Nombre del atributo
                      </label>
                      <input
                        value={attr.name}
                        onChange={(e) =>
                          handleAttributeChange(attr.id, {
                            name: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                        placeholder="Ej: Color, Talla, Material"
                      />
                    </div>

                    <div className="flex flex-col justify-between items-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteAttribute(attr.id)}
                        className="text-[11px] text-slate-500 hover:text-rose-400"
                      >
                        Eliminar
                      </button>
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300">
                        <input
                          type="checkbox"
                          checked={attr.createsVariation}
                          onChange={(e) =>
                            handleAttributeChange(attr.id, {
                              createsVariation: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-brand-500 focus:ring-brand-600"
                        />
                        Genera variaciones
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-200 uppercase tracking-wide">
                      Valores (separados por coma)
                    </label>
                    <input
                      value={attr.valuesText ?? attr.values.join(', ')}
                      onChange={(e) => {
                        const text = e.target.value;
                        handleAttributeChange(attr.id, {
                          valuesText: text,
                          values: text
                            .split(',')
                            .map((v) => v.trim())
                            .filter(Boolean),
                        });
                      }}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                      placeholder="Ej: Rojo, Azul, Verde"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {type === 'variable' && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">Variaciones</h2>
                  <p className="text-xs text-slate-500">
                    Crea combinaciones de atributos con su propio precio, stock e imagen.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={generateVariationsFromAttributes}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
                  >
                    <span className="text-base leading-none">⟳</span>
                    Generar desde atributos
                  </button>
                  <button
                    type="button"
                    onClick={handleAddVariation}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
                  >
                    <span className="text-base leading-none">＋</span>
                    Añadir variación
                  </button>
                </div>
              </div>

              {variations.length === 0 && (
                <p className="text-xs text-slate-500">
                  Todavía no hay variaciones. Genera desde atributos o añade una manualmente.
                </p>
              )}

              <div className="space-y-3">
                {variations.map((variation) => (
                  <div
                    key={variation.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 space-y-3"
                  >
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-slate-400">
                        Variación #{variation.id.slice(0, 6).toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteVariation(variation.id)}
                        className="text-[11px] text-slate-500 hover:text-rose-400"
                      >
                        Eliminar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-200 uppercase tracking-wide">
                          SKU variación
                        </label>
                        <input
                          value={variation.sku ?? ''}
                          onChange={(e) =>
                            handleVariationChange(variation.id, { sku: e.target.value })
                          }
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                          placeholder="Opcional"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-200 uppercase tracking-wide">
                          Precio
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={variation.price}
                          onChange={(e) =>
                            handleVariationChange(variation.id, {
                              price: Number(e.target.value),
                            })
                          }
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-200 uppercase tracking-wide">
                          Costo
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={variation.costPrice}
                          onChange={(e) =>
                            handleVariationChange(variation.id, {
                              costPrice: Number(e.target.value),
                            })
                          }
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-200 uppercase tracking-wide">
                          Stock
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={variation.stock}
                          onChange={(e) =>
                            handleVariationChange(variation.id, {
                              stock: Number(e.target.value),
                            })
                          }
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-200 uppercase tracking-wide">
                          Imagen
                        </label>
                        <div className="flex items-center gap-2">
                          {variation.imageUrl && (
                            <div className="h-10 w-10 overflow-hidden rounded border border-slate-700 bg-slate-900">
                              <img
                                src={variation.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => openVariationPicker(variation.id)}
                            className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-800"
                          >
                            {variation.imageUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}
                          </button>
                          {variation.imageUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                handleVariationChange(variation.id, { imageUrl: undefined })
                              }
                              className="text-[10px] text-rose-300 hover:text-rose-200"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {attributes.filter((a) => a.createsVariation).length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                        {attributes
                          .filter((a) => a.createsVariation)
                          .map((attr) => (
                            <div key={attr.id} className="space-y-1.5">
                              <label className="text-[11px] font-medium text-slate-200 uppercase tracking-wide">
                                {attr.name || 'Atributo'}
                              </label>
                              <select
                                value={variation.attributes[attr.name] ?? ''}
                                onChange={(e) =>
                                  handleVariationAttributeChange(
                                    variation.id,
                                    attr.name,
                                    e.target.value,
                                  )
                                }
                                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
                              >
                                <option value="">Seleccionar</option>
                                {attr.values.map((value) => (
                                  <option key={value} value={value}>
                                    {value}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Organización</h2>
              <p className="text-xs text-slate-500">
                Categorías, etiquetas y productos sugeridos para cross-selling.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Marca</label>
                <select
                  value={brandId ?? ''}
                  onChange={(e) => setBrandId(e.target.value || null)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
                >
                  <option value="">Sin marca</option>
                  {brandList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {showNewBrand ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="Nombre de la marca"
                      className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateBrand()}
                    />
                    <button
                      type="button"
                      onClick={handleCreateBrand}
                      disabled={creatingBrand || !newBrandName.trim()}
                      className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                    >
                      {creatingBrand ? '…' : 'Crear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewBrand(false); setNewBrandName(''); }}
                      className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewBrand(true)}
                    className="mt-1 inline-flex items-center gap-1 rounded-md border border-dashed border-slate-600 px-2 py-1 text-[11px] text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  >
                    ＋ Nueva marca
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Categorías</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800"
                  >
                    <span className="truncate text-left">
                      {categories.length === 0 &&
                        (categoryList.length === 0
                          ? 'Sin categorías (crea algunas o usa el desplegable)'
                          : 'Seleccionar categorías')}
                      {categories.length > 0 &&
                        categories
                          .map((slug) => {
                            const found = categoryList.find((c) => c.slug === slug);
                            return found ? found.name : slug;
                          })
                          .join(', ')}
                    </span>
                    <span
                      className={`ml-2 text-[10px] text-slate-400 transition-transform ${
                        isCategoryDropdownOpen ? 'rotate-180' : ''
                      }`}
                    >
                      ▼
                    </span>
                  </button>
                  {isCategoryDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-slate-700 bg-slate-950 shadow-lg">
                      {categoryList.length > 0 && categoryList.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={categories.includes(cat.slug)}
                            onChange={() => toggleCategory(cat.slug)}
                            className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-brand-500 focus:ring-brand-600"
                          />
                          <span>{cat.name}</span>
                        </label>
                      ))}
                      {showNewCategory ? (
                        <div className="flex gap-2 p-2 border-t border-slate-700">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nombre categoría"
                            className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                          />
                          <button
                            type="button"
                            onClick={handleCreateCategory}
                            disabled={creatingCategory || !newCategoryName.trim()}
                            className="rounded bg-brand-600 px-2 py-1 text-[11px] text-white hover:bg-brand-500 disabled:opacity-50"
                          >
                            {creatingCategory ? '…' : 'Crear'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                            className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowNewCategory(true)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-400 hover:bg-slate-800 border-t border-slate-700"
                        >
                          ＋ Crear categoría
                        </button>
                      )}
                    </div>
                  )}
                  {categoryList.length === 0 && !showNewCategory && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      No hay categorías. Abre el desplegable y usa «Crear categoría» o créalas en Organización → Categorías.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Etiquetas</label>
                <input
                  value={tags.join(', ')}
                  onChange={(e) => handleCommaSeparatedChange(e.target.value, setTags)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  placeholder="Ej: sostenible, edición limitada, rebajas"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Cross-selling (SKUs relacionados)</label>
                <input
                  value={crossSellSkus.join(', ')}
                  onChange={(e) => handleCommaSeparatedChange(e.target.value, setCrossSellSkus)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  placeholder="Ej: OL-PANT-001, OL-CAP-002"
                />
                <p className="text-[11px] text-slate-500">
                  SKUs de otros productos que se sugerirán junto a este.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Resumen y guardado</h2>
                <p className="text-xs text-slate-500">
                  Revisa los datos antes de guardar. Los cambios se guardarán en Firebase.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-[11px]">
                <span className="text-slate-400">Estado</span>
                <div className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 p-1">
                  {(['publicado', 'borrador', 'papelera'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`px-3 py-1 rounded-full capitalize ${
                        status === s
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {s === 'publicado'
                        ? 'Publicado'
                        : s === 'borrador'
                          ? 'Borrador'
                          : 'Papelera'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">
                {success}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando cambios...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </section>
      </form>
      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => {
          setIsMediaModalOpen(false);
          setMediaTarget(null);
        }}
        onSelect={handleMediaSelect}
      />
    </div>
  );
};

