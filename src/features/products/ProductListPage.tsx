import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  deleteProduct,
  getProducts,
  updateProductStatus,
  ProductWithId,
} from '@/services/products';
import { getPriceLists } from '@/services/priceLists';
import { getCategories } from '@/services/categories';
import { useAuth } from '@/contexts/AuthContext';
import { getPriceForRole } from '@/utils/priceSimulator';
import type { ProductStatus } from './types';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';
type StatusTab = 'todos' | 'publicados' | 'borradores' | 'papelera';

const STATUS_LABELS: Record<string, string> = {
  publicado: 'Publicado',
  borrador: 'Borrador',
  pendiente: 'Borrador',
  papelera: 'Papelera',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  publicado:
    'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40',
  borrador: 'bg-amber-500/10 text-amber-300 border border-amber-500/40',
  pendiente: 'bg-amber-500/10 text-amber-300 border border-amber-500/40',
  papelera: 'bg-slate-600/40 text-slate-400 border border-slate-500',
};

export const ProductListPage = () => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const categorySlugFromUrl = searchParams.get('category');

  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [priceLists, setPriceLists] = useState<Awaited<ReturnType<typeof getPriceLists>>>([]);
  const [categoryList, setCategoryList] = useState<Awaited<ReturnType<typeof getCategories>>>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingToTrashId, setMovingToTrashId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('todos');
  const navigate = useNavigate();

  const activePriceLists = useMemo(
    () => priceLists.filter((pl) => pl.isActive),
    [priceLists],
  );

  const slugToName = useMemo(() => {
    const m: Record<string, string> = {};
    categoryList.forEach((c) => {
      m[c.slug] = c.name;
    });
    return m;
  }, [categoryList]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoadingState('loading');
      setError(null);
      try {
        const [result, lists, cats] = await Promise.all([
          getProducts(),
          getPriceLists(),
          getCategories(),
        ]);
        if (!isMounted) return;
        setProducts(result);
        setPriceLists(lists);
        setCategoryList(cats);
        setLoadingState('success');
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Ha ocurrido un error al cargar el listado de productos.';
        setError(message);
        setLoadingState('error');
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleEdit = (product: ProductWithId) => {
    navigate(`/admin/productos/${product.id}/editar`);
  };

  const handleMoveToTrash = async (product: ProductWithId) => {
    try {
      setMovingToTrashId(product.id);
      setError(null);
      await updateProductStatus(product.id, 'papelera');
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: 'papelera' as ProductStatus } : p)),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo mover el producto a la papelera.';
      setError(message);
    } finally {
      setMovingToTrashId(null);
    }
  };

  const handleDelete = async (product: ProductWithId) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar definitivamente "${product.name}" (SKU: ${product.sku})? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(product.id);
      setError(null);
      await deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Ha ocurrido un error al eliminar el producto.';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const isLoading = loadingState === 'loading' || loadingState === 'idle';

  const filteredProducts = useMemo(() => {
    let list = products;

    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((product) => {
        const skuMatch = product.sku.toLowerCase().includes(term);
        const nameMatch = product.name.toLowerCase().includes(term);
        return skuMatch || nameMatch;
      });
    }

    if (categorySlugFromUrl) {
      list = list.filter(
        (p) =>
          Array.isArray(p.categories) && p.categories.includes(categorySlugFromUrl),
      );
    }

    if (statusTab === 'publicados') {
      list = list.filter((p) => p.status === 'publicado');
    } else if (statusTab === 'borradores') {
      list = list.filter(
        (p) => p.status === 'borrador' || p.status === 'pendiente',
      );
    } else if (statusTab === 'papelera') {
      list = list.filter((p) => p.status === 'papelera');
    }

    return list;
  }, [products, search, categorySlugFromUrl, statusTab]);

  const showDeleteButton = statusTab === 'papelera';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Listado de productos
        </h1>
        <p className="text-sm text-slate-400">
          Revisa, edita y gestiona el catálogo de productos de tu ecommerce.
        </p>
      </div>

      <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-3 border-b border-slate-800 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative w-full max-w-xs">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 pr-8 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-500 text-xs">
                ⌕
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/productos/nuevo')}
            className="inline-flex items-center justify-center rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Añadir nuevo producto
          </button>
        </div>

        <div className="flex border-b border-slate-800">
          {(
            [
              ['todos', 'Todos'],
              ['publicados', 'Publicados'],
              ['borradores', 'Borradores'],
              ['papelera', 'Papelera'],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusTab(tab)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                statusTab === tab
                  ? 'border-brand-500 text-brand-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-800">
          {isLoading && 'Cargando productos...'}
          {!isLoading && filteredProducts.length === 0 &&
            'No hay productos que coincidan con los filtros.'}
          {!isLoading && filteredProducts.length > 0 &&
            `${filteredProducts.length} producto(s) encontrados.`}
        </div>

        {error && (
          <div className="px-4 py-2 text-xs text-rose-100 bg-rose-950/40 border-b border-rose-500/40">
            {error}
          </div>
        )}

        <div className="relative overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950/80 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  SKU
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Nombre
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Categoría
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Tipo
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Precio
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Costo base
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Estado
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px] text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-3 w-20 rounded-full bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-32 rounded-full bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-24 rounded-full bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-16 rounded-full bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-16 rounded-full bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-16 rounded-full bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-16 rounded-full bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <div className="h-7 w-16 rounded-md bg-slate-800" />
                        <div className="h-7 w-16 rounded-md bg-slate-800" />
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading &&
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="px-4 py-3 align-middle">
                      <span className="font-mono text-[11px] text-slate-200">
                        {product.sku}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-xs font-medium text-slate-100">
                        {product.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-[11px] text-slate-300">
                        {product.categories?.length
                          ? product.categories
                              .map((slug) => slugToName[slug] ?? slug)
                              .join(', ')
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          product.type === 'simple'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                            : 'bg-sky-500/10 text-sky-300 border border-sky-500/40'
                        }`}
                      >
                        {product.type === 'simple' ? 'Simple' : 'Variable'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-xs text-slate-100">
                        $
                        {getPriceForRole(
                          product.regularPrice,
                          product.costPrice ?? 0,
                          profile?.role,
                          activePriceLists,
                        ).toFixed(2)}
                      </span>
                      {product.salePrice && (
                        <span className="ml-1 text-[11px] text-emerald-300">
                          Oferta: ${product.salePrice.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-xs text-slate-300">
                        ${(product.costPrice ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                          STATUS_BADGE_CLASS[product.status] ??
                          STATUS_BADGE_CLASS.borrador
                        }`}
                      >
                        {STATUS_LABELS[product.status] ?? product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-50 hover:bg-slate-800"
                        >
                          Editar
                        </button>
                        {product.status !== 'papelera' && (
                          <button
                            type="button"
                            onClick={() => handleMoveToTrash(product)}
                            disabled={movingToTrashId === product.id}
                            className="inline-flex items-center rounded-md border border-amber-700/70 bg-amber-950/40 px-2.5 py-1.5 text-[11px] font-medium text-amber-100 hover:bg-amber-900/70 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {movingToTrashId === product.id
                              ? 'Moviendo...'
                              : 'Mover a papelera'}
                          </button>
                        )}
                        {showDeleteButton && (
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            disabled={deletingId === product.id}
                            className="inline-flex items-center rounded-md border border-rose-700/70 bg-rose-950/40 px-2.5 py-1.5 text-[11px] font-medium text-rose-100 hover:bg-rose-900/70 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {deletingId === product.id
                              ? 'Eliminando...'
                              : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
