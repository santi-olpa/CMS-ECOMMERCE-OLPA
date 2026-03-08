import { useEffect, useState } from 'react';
import {
  createAttribute,
  deleteAttribute,
  getAttributes,
  updateAttribute,
} from '@/services/attributes';
import type { GlobalAttribute } from '@/services/attributes';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export const AttributesPage = () => {
  const [attributes, setAttributes] = useState<GlobalAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [termsText, setTermsText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTermsText, setEditTermsText] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getAttributes();
      setAttributes(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar atributos.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const termsFromText = (text: string) =>
    text
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre es obligatorio.');
      return;
    }
    const terms = termsFromText(termsText);
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateAttribute(editingId, {
          name: trimmed,
          slug: slugify(trimmed),
          terms,
        });
        setAttributes((prev) =>
          prev.map((a) =>
            a.id === editingId
              ? { ...a, name: trimmed, slug: slugify(trimmed), terms }
              : a,
          ),
        );
        setEditingId(null);
        setEditName('');
        setEditTermsText('');
      } else {
        const id = await createAttribute({
          name: trimmed,
          slug: slugify(trimmed),
          terms,
        });
        setAttributes((prev) => [
          ...prev,
          { id, name: trimmed, slug: slugify(trimmed), terms },
        ]);
      }
      setName('');
      setTermsText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este atributo?')) return;
    setDeletingId(id);
    try {
      await deleteAttribute(id);
      setAttributes((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar.');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (a: GlobalAttribute) => {
    setEditingId(a.id!);
    setEditName(a.name);
    setEditTermsText(a.terms.join(', '));
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
        <h1 className="text-xl font-semibold text-slate-100">Atributos</h1>
        <p className="text-sm text-slate-400 mt-1">
          Crea atributos con sus términos (ej: Color → Rojo, Azul). Luego podrás usarlos en los productos.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
              Nombre del atributo
            </label>
            <input
              type="text"
              value={editingId ? editName : name}
              onChange={(e) =>
                editingId ? setEditName(e.target.value) : setName(e.target.value)
              }
              placeholder="Ej: Color, Talla, Medida"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
              Términos (separados por coma)
            </label>
            <input
              type="text"
              value={editingId ? editTermsText : termsText}
              onChange={(e) =>
                editingId
                  ? setEditTermsText(e.target.value)
                  : setTermsText(e.target.value)
              }
              placeholder="Ej: Rojo, Azul, Verde, Negro"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {editingId ? 'Guardar' : 'Crear'} atributo
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setEditName('');
                setEditTermsText('');
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
          {attributes.length === 0 ? (
            <li className="px-5 py-8 text-center text-slate-500 text-sm">
              No hay atributos. Crea uno arriba.
            </li>
          ) : (
            attributes.map((attr) => (
              <li
                key={attr.id}
                className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-900/50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-100">{attr.name}</p>
                  <p className="text-xs text-slate-500">
                    {attr.terms.length > 0
                      ? attr.terms.join(', ')
                      : 'Sin términos'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(attr)}
                    className="rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(attr.id!)}
                    disabled={deletingId === attr.id}
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
    </div>
  );
};
