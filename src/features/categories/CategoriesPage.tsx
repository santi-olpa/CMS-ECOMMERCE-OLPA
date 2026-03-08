import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getProductCountsByCategorySlug,
  updateCategory,
} from '@/services/categories';
import type { Category } from './types';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export const CategoriesPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const isLoading = loadingState === 'loading' || loadingState === 'idle';

  const load = useCallback(async () => {
    setLoadingState('loading');
    setError(null);
    try {
      const [list, countMap] = await Promise.all([
        getCategories(),
        getProductCountsByCategorySlug(),
      ]);
      setCategories(list);
      setCounts(countMap);
      setLoadingState('success');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar categorías.',
      );
      setLoadingState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hierarchicalList = useMemo(() => {
    const roots = categories.filter((c) => !c.parentId || c.parentId === '');
    const byParent = new Map<string | null, Category[]>();
    categories.forEach((c) => {
      const key = c.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(c);
    });
    const result: { category: Category; depth: number }[] = [];
    function walk(pid: string | null, depth: number) {
      const children = byParent.get(pid) ?? [];
      children.forEach((cat) => {
        result.push({ category: cat, depth });
        walk(cat.id!, depth + 1);
      });
    }
    walk(null, 0);
    return result;
  }, [categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre es obligatorio.');
      return;
    }
    const slug = slugify(trimmed);
    if (!slug) {
      setError('El nombre debe generar un slug válido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: trimmed,
          slug,
          parentId: parentId || null,
        });
        setCategories((prev) =>
          prev.map((c) =>
            c.id === editingId
              ? { ...c, name: trimmed, slug, parentId: parentId ?? null }
              : c,
          ),
        );
        setEditingId(null);
        setEditName('');
      } else {
        const id = await createCategory({
          name: trimmed,
          slug,
          parentId: parentId || null,
        });
        setCategories((prev) => [...prev, { id, name: trimmed, slug, parentId: parentId ?? null }]);
      }
      setName('');
      setParentId(null);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar la categoría.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta categoría? Los productos no se eliminarán.')) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setEditName('');
        setName('');
        setParentId(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al eliminar la categoría.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id ?? null);
    setEditName(c.name);
    setName(c.name);
    setParentId(c.parentId ?? null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setName('');
    setParentId(null);
  };

  const handleRowClick = (slug: string) => {
    navigate(`/admin/productos?category=${encodeURIComponent(slug)}`);
  };

  const parentOptions = useMemo(() => {
    return categories.filter((c) => c.id !== editingId);
  }, [categories, editingId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Categorías
        </h1>
        <p className="text-sm text-slate-400">
          Categorías jerárquicas para organizar el inventario. Clic en una fila para ver productos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">
            {editingId ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-200">Nombre</label>
              <input
                value={editingId ? editName : name}
                onChange={(e) =>
                  editingId ? setEditName(e.target.value) : setName(e.target.value)
                }
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                placeholder="Ej: Ropa, Electrónica"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-200">
                Subcategoría de
              </label>
              <select
                value={parentId ?? ''}
                onChange={(e) =>
                  setParentId(e.target.value ? e.target.value : null)
                }
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                <option value="">Ninguna (raíz)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? 'Guardando...' : editingId ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 text-xs text-slate-400">
            {isLoading && 'Cargando...'}
            {!isLoading && `${categories.length} categoría(s)`}
          </div>
          {error && (
            <div className="px-4 py-2 text-xs text-rose-100 bg-rose-950/40 border-b border-rose-500/40">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-950/80 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                    Nombre
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                    Slug
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                    Productos
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px] text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3">
                        <div className="h-3 w-24 rounded-full bg-slate-800" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-3 w-20 rounded-full bg-slate-800" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-3 w-12 rounded-full bg-slate-800" />
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))}
                {!isLoading &&
                  hierarchicalList.map(({ category, depth }) => (
                    <tr
                      key={category.id}
                      onClick={() => handleRowClick(category.slug)}
                      className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 align-middle">
                        <span
                          className="text-slate-100"
                          style={{ paddingLeft: `${depth * 16}px` }}
                        >
                          {depth > 0 && '↳ '}
                          {category.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-400 font-mono text-[11px]">
                        {category.slug}
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-300">
                        {counts[category.slug] ?? 0}
                      </td>
                      <td className="px-4 py-3 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          className="text-[11px] text-slate-400 hover:text-slate-100 mr-2"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category.id!)}
                          disabled={deletingId === category.id}
                          className="text-[11px] text-rose-400 hover:text-rose-300 disabled:opacity-60"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
