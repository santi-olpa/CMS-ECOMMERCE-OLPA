import { useEffect, useState } from 'react';
import { createPriceList, deletePriceList, getPriceLists, updatePriceList } from '@/services/priceLists';
import { PriceList, PriceListOperation, PriceListValueType } from './types';
import { ROLE_LABELS } from '@/features/auth/types';
import type { Role } from '@/features/auth/types';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

const ROLES_OPTIONS: { value: Role | ''; label: string }[] = [
  { value: '', label: 'Todos (general)' },
  ...(Object.entries(ROLE_LABELS) as [Role, string][]).map(([value, label]) => ({ value, label })),
];

const emptyForm: Omit<PriceList, 'id'> = {
  name: '',
  operation: 'increase',
  valueType: 'percentage',
  value: 0,
  isActive: true,
  role: '',
};

export const PriceListPage = () => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<PriceList, 'id'>>(emptyForm);

  const isLoading = loadingState === 'loading' || loadingState === 'idle';

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoadingState('loading');
      setError(null);
      try {
        const data = await getPriceLists();
        if (!isMounted) return;
        setPriceLists(data);
        setLoadingState('success');
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Ha ocurrido un error al cargar las listas de precios.';
        setError(message);
        setLoadingState('error');
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (priceList: PriceList) => {
    const { id, ...rest } = priceList;
    setEditingId(id ?? null);
    setForm({ ...rest, role: rest.role ?? '' });
    setIsFormOpen(true);
  };

  const handleChange = (patch: Partial<Omit<PriceList, 'id'>>) => {
    setForm((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre de la lista de precios es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await updatePriceList(editingId, form);
        setPriceLists((prev) =>
          prev.map((pl) => (pl.id === editingId ? { ...pl, ...form } : pl)),
        );
      } else {
        const id = await createPriceList(form);
        setPriceLists((prev) => [...prev, { ...form, id }]);
      }
      setIsFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Ha ocurrido un error al guardar la lista de precios.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    const confirmed = window.confirm('¿Seguro que deseas eliminar esta lista de precios?');
    if (!confirmed) return;

    setDeletingId(id);
    setError(null);
    try {
      await deletePriceList(id);
      setPriceLists((prev) => prev.filter((pl) => pl.id !== id));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Ha ocurrido un error al eliminar la lista de precios.';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Listas de precios
        </h1>
        <p className="text-sm text-slate-400">
          Define reglas financieras para ajustar precios por canal, segmento o tipo de cliente.
        </p>
      </div>

      <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="text-xs text-slate-400">
            {isLoading && 'Cargando listas de precios...'}
            {!isLoading && priceLists.length === 0 && 'No hay listas de precios creadas aún.'}
            {!isLoading &&
              priceLists.length > 0 &&
              `${priceLists.length} lista(s) de precios configuradas.`}
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Nueva lista de precios
          </button>
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
                  Nombre
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Operación
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Valor
                </th>
                <th className="px-4 py-3 font-medium text-slate-400 uppercase tracking-wide text-[11px]">
                  Rol
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
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-3 w-32 rounded-full bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-24 rounded-full bg-slate-800" />
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
                priceLists.map((pl) => (
                  <tr key={pl.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="px-4 py-3 align-middle">
                      <span className="text-xs font-medium text-slate-100">{pl.name}</span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-[11px] text-slate-300">
                        {pl.operation === 'increase'
                          ? 'Aumento sobre costo'
                          : 'Descuento sobre precio'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-xs text-slate-100">
                        {pl.valueType === 'percentage'
                          ? `${pl.value.toFixed(2)}%`
                          : `$${pl.value.toFixed(2)}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-[11px] text-slate-300">
                        {pl.role ? ROLE_LABELS[pl.role as Role] : 'Todos'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          pl.isActive
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-700/40 text-slate-300 border border-slate-600'
                        }`}
                      >
                        {pl.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(pl)}
                          className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-50 hover:bg-slate-800"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(pl.id)}
                          disabled={deletingId === pl.id}
                          className="inline-flex items-center rounded-md border border-rose-700/70 bg-rose-950/40 px-2.5 py-1.5 text-[11px] font-medium text-rose-100 hover:bg-rose-900/70 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {deletingId === pl.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                {editingId ? 'Editar lista de precios' : 'Nueva lista de precios'}
              </h2>
              <p className="text-xs text-slate-500">
                Configura cómo se ajustarán los precios de los productos según esta lista.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
              className="text-[11px] text-slate-400 hover:text-slate-100"
            >
              Cerrar
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => handleChange({ name: e.target.value })}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  placeholder="Ej: Mayorista VIP"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Operación</label>
                <select
                  value={form.operation}
                  onChange={(e) =>
                    handleChange({ operation: e.target.value as PriceListOperation })
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
                >
                  <option value="increase">Aumento sobre el costo</option>
                  <option value="decrease">Descuento sobre el precio</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Tipo de valor</label>
                <select
                  value={form.valueType}
                  onChange={(e) =>
                    handleChange({ valueType: e.target.value as PriceListValueType })
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo ($)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Valor</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-xs text-slate-500">
                    {form.valueType === 'percentage' ? '%' : '$'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.value}
                    onChange={(e) => handleChange({ value: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Aplica a rol</label>
                <select
                  value={form.role ?? ''}
                  onChange={(e) =>
                    handleChange({ role: (e.target.value || '') as Role | '' })
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
                >
                  {ROLES_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">Activo</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange({ isActive: !form.isActive })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full border ${
                      form.isActive
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-slate-800 border-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        form.isActive ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-[11px] text-slate-300">
                    {form.isActive ? 'Regla activa' : 'Regla inactiva'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear lista'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

