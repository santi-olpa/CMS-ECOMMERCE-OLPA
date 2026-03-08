import { useEffect, useState } from 'react';
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
} from '@/services/paymentMethods';
import type {
  PaymentMethod,
  PaymentMethodType,
} from '@/services/paymentMethods';

export const PaymentMethodsPage = () => {
  const [list, setList] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentMethodType>('offline');
  const [instructions, setInstructions] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPaymentMethods();
      setList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setType('offline');
    setInstructions('');
    setIsActive(true);
  };

  const handleEdit = (m: PaymentMethod) => {
    setEditingId(m.id!);
    setName(m.name);
    setType(m.type);
    setInstructions(m.instructions ?? '');
    setIsActive(m.isActive);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updatePaymentMethod(editingId, {
          name: trimmed,
          type,
          instructions: instructions.trim() || undefined,
          isActive,
        });
        setList((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? { ...item, name: trimmed, type, instructions: instructions.trim() || undefined, isActive }
              : item,
          ),
        );
        resetForm();
      } else {
        const id = await createPaymentMethod({
          name: trimmed,
          type,
          instructions: instructions.trim() || undefined,
          isActive,
        });
        setList((prev) => [
          ...prev,
          { id, name: trimmed, type, instructions: instructions.trim() || undefined, isActive },
        ]);
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este medio de pago?')) return;
    setDeletingId(id);
    try {
      await deletePaymentMethod(id);
      setList((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar.');
    } finally {
      setDeletingId(null);
    }
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
        <h1 className="text-xl font-semibold text-slate-100">Medios de pago</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configura transferencia, CBU/Alias y otros medios. Se muestran en el detalle del producto.
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
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Transferencia, Tarjeta"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PaymentMethodType)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="offline">Offline (transferencia, etc.)</option>
              <option value="simulated">Simulado</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
            Instrucciones (CBU / Alias, etc.)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Texto que verá el cliente al elegir este medio"
            rows={2}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-600 bg-slate-900 text-brand-500 focus:ring-brand-600"
          />
          Activo (visible en tienda)
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {editingId ? 'Guardar' : 'Crear'} medio de pago
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <ul className="divide-y divide-slate-800">
          {list.length === 0 ? (
            <li className="px-5 py-8 text-center text-slate-500 text-sm">
              No hay medios de pago. Crea uno arriba.
            </li>
          ) : (
            list.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-900/50"
              >
                <div>
                  <p className="font-medium text-slate-100">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.type} {item.isActive ? '· Activo' : '· Inactivo'}
                  </p>
                  {item.instructions && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.instructions}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id!)}
                    disabled={deletingId === item.id}
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
