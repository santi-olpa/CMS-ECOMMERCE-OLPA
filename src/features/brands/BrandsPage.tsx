import { useEffect, useState } from 'react';
import {
  createBrand,
  deleteBrand,
  getBrands,
  updateBrand,
} from '@/services/brands';
import type { Brand } from '@/services/brands';
import { MediaLibraryModal } from '@/components/MediaLibraryModal';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export const BrandsPage = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [mediaTarget, setMediaTarget] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getBrands();
      setBrands(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar marcas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
        await updateBrand(editingId, { name: trimmed, slug });
        setBrands((prev) =>
          prev.map((b) =>
            b.id === editingId ? { ...b, name: trimmed, slug } : b,
          ),
        );
        setEditingId(null);
        setEditName('');
      } else {
        const id = await createBrand({ name: trimmed, slug });
        setBrands((prev) => [...prev, { id, name: trimmed, slug }]);
      }
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta marca?')) return;
    setDeletingId(id);
    try {
      await deleteBrand(id);
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogoSelect = (url: string) => {
    if (!mediaTarget) return;
    setMediaTarget(null);
    if (mediaTarget === 'new') {
      setEditLogoUrl(url);
      return;
    }
    setSaving(true);
    updateBrand(mediaTarget, { logoUrl: url })
      .then(() => {
        setBrands((prev) =>
          prev.map((b) => (b.id === mediaTarget ? { ...b, logoUrl: url } : b)),
        );
      })
      .catch(() => setError('Error al actualizar logo.'))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Marcas</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gestiona las marcas para el catálogo (rubro automotor).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 flex flex-wrap items-end gap-4"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
            Nombre de la marca
          </label>
          <input
            type="text"
            value={editingId ? editName : name}
            onChange={(e) =>
              editingId ? setEditName(e.target.value) : setName(e.target.value)
            }
            placeholder="Ej: Michelin, Pirelli"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {editingId ? 'Guardar' : 'Crear'} marca
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setEditName('');
                setEditLogoUrl('');
              }}
              className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <ul className="divide-y divide-slate-800">
          {brands.length === 0 ? (
            <li className="px-5 py-8 text-center text-slate-500 text-sm">
              No hay marcas. Crea una arriba.
            </li>
          ) : (
            brands.map((brand) => (
              <li
                key={brand.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-900/50"
              >
                <div className="h-12 w-12 shrink-0 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center">
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-500 text-lg">🏷</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-100">{brand.name}</p>
                  <p className="text-xs text-slate-500">{brand.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaTarget(brand.id!)}
                    className="rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    {brand.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(brand.id!);
                      setEditName(brand.name);
                    }}
                    className="rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(brand.id!)}
                    disabled={deletingId === brand.id}
                    className="rounded-md border border-rose-800 px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-950/50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <MediaLibraryModal
        isOpen={!!mediaTarget}
        onClose={() => setMediaTarget(null)}
        onSelect={handleLogoSelect}
      />
    </div>
  );
};
