import { useEffect, useState } from 'react';
import {
  createPromotion,
  deletePromotion,
  getPromotions,
  updatePromotion,
} from '@/services/promotions';
import { getPaymentMethods } from '@/services/paymentMethods';
import type {
  Promotion,
  PromotionType,
  PromotionTarget,
} from '@/services/promotions';
import type { PaymentMethod } from '@/services/paymentMethods';

const TYPE_LABELS: Record<PromotionType, string> = {
  discount: 'Descuento',
  surcharge: 'Recargo',
  installments: 'Cuotas',
};

const TARGET_LABELS: Record<PromotionTarget, string> = {
  all: 'Todos los productos',
  category: 'Por categoría',
  product: 'Por producto',
};

export const PromotionsPage = () => {
  const [list, setList] = useState<Promotion[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PromotionType>('discount');
  const [value, setValue] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('');
  const [installmentsWithInterest, setInstallmentsWithInterest] = useState(true);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [target, setTarget] = useState<PromotionTarget>('all');
  const [categorySlug, setCategorySlug] = useState('');
  const [productId, setProductId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [promos, payMethods] = await Promise.all([
        getPromotions(),
        getPaymentMethods(),
      ]);
      setList(promos);
      setMethods(payMethods);
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
    setType('discount');
    setValue('');
    setInstallmentsCount('');
    setInstallmentsWithInterest(true);
    setPaymentMethodId('');
    setTarget('all');
    setCategorySlug('');
    setProductId('');
    setIsActive(true);
  };

  const handleEdit = (p: Promotion) => {
    setEditingId(p.id!);
    setName(p.name);
    setType(p.type);
    setValue(String(p.value));
    setInstallmentsCount(p.installmentsCount ? String(p.installmentsCount) : '');
    setInstallmentsWithInterest(p.installmentsWithInterest !== false);
    setPaymentMethodId(p.paymentMethodId ?? '');
    setTarget(p.target);
    setCategorySlug(p.categorySlug ?? '');
    setProductId(p.productId ?? '');
    setIsActive(p.isActive);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre es obligatorio.');
      return;
    }
    const numValue = parseFloat(value);
    if (Number.isNaN(numValue) || numValue < 0) {
      setError('El valor debe ser un número >= 0.');
      return;
    }
    const installments = type === 'installments'
      ? Math.max(1, parseInt(installmentsCount, 10) || 1)
      : undefined;
    setSaving(true);
    setError(null);
    try {
      const payload: Omit<Promotion, 'id'> = {
        name: trimmed,
        type,
        value: numValue,
        installmentsCount: installments,
        installmentsWithInterest: type === 'installments' ? installmentsWithInterest : undefined,
        paymentMethodId: paymentMethodId || undefined,
        target,
        categorySlug: target === 'category' ? categorySlug.trim() || undefined : undefined,
        productId: target === 'product' ? productId.trim() || undefined : undefined,
        isActive,
      };
      if (editingId) {
        await updatePromotion(editingId, payload);
        setList((prev) =>
          prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item)),
        );
        resetForm();
      } else {
        const id = await createPromotion(payload);
        setList((prev) => [...prev, { id, ...payload }]);
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta promoción?')) return;
    setDeletingId(id);
    try {
      await deletePromotion(id);
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
        <h1 className="text-xl font-semibold text-slate-100">Promociones y recargos</h1>
        <p className="text-sm text-slate-400 mt-1">
          Descuentos, recargos y cuotas por medio de pago. Se aplican en el detalle del producto.
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
              placeholder="Ej: 10% off transferencia"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PromotionType)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              {(['discount', 'surcharge', 'installments'] as const).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
              Valor (%)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ej: 10"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>
          {type === 'installments' && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Nº de cuotas
                </label>
                <input
                  type="number"
                  min={1}
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(e.target.value)}
                  placeholder="Ej: 3"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Tipo de cuotas
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="installmentsInterest"
                      checked={installmentsWithInterest}
                      onChange={() => setInstallmentsWithInterest(true)}
                      className="text-brand-500 focus:ring-brand-600"
                    />
                    Con interés (se aplica el % de arriba al total)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="installmentsInterest"
                      checked={!installmentsWithInterest}
                      onChange={() => setInstallmentsWithInterest(false)}
                      className="text-brand-500 focus:ring-brand-600"
                    />
                    Sin interés
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
            Medio de pago (opcional)
          </label>
          <select
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
          >
            <option value="">Cualquier medio</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
              Alcance
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as PromotionTarget)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              {(['all', 'category', 'product'] as const).map((t) => (
                <option key={t} value={t}>{TARGET_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {target === 'category' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
                Slug categoría
              </label>
              <input
                type="text"
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                placeholder="Ej: neumaticos"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
          )}
          {target === 'product' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
                ID producto
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="ID Firestore del producto"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-600 bg-slate-900 text-brand-500 focus:ring-brand-600"
          />
          Activa (visible en tienda)
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {editingId ? 'Guardar' : 'Crear'} promoción
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
              No hay promociones. Crea una arriba.
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
                    {TYPE_LABELS[item.type]} {item.value}%
                    {item.installmentsCount
                      ? ` · ${item.installmentsCount} cuotas ${item.installmentsWithInterest === false ? 'sin interés' : 'con interés'}`
                      : ''}
                    {' · '}{TARGET_LABELS[item.target]}
                    {item.isActive ? ' · Activa' : ' · Inactiva'}
                  </p>
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
