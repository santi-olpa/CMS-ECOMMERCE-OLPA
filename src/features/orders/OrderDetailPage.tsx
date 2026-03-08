import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOrderById, updateOrderStatus } from '@/services/orders';
import { getPaymentMethodById } from '@/services/paymentMethods';
import { getProductById } from '@/services/products';
import type { Order, OrderStatus } from '@/services/orders';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente de pago',
  cancelled: 'Cancelado',
  shipped: 'Enviado',
  completed: 'Completado',
};

export const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [productSkus, setProductSkus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    getOrderById(orderId)
      .then(async (o) => {
        setOrder(o ?? null);
        if (!o) return;
        if (o.paymentMethod?.id) {
          const method = await getPaymentMethodById(o.paymentMethod.id);
          setInstructions(method?.instructions ?? null);
        }
        const ids = [...new Set((o.items ?? []).map((it) => it.productId))];
        const skuMap: Record<string, string> = {};
        await Promise.all(
          ids.map(async (id) => {
            try {
              const p = await getProductById(id);
              skuMap[id] = (p as { sku?: string }).sku ?? '—';
            } catch {
              skuMap[id] = '—';
            }
          }),
        );
        setProductSkus(skuMap);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!orderId || !order) return;
    setSaving(true);
    setError(null);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!orderId || !order) {
    return (
      <div className="space-y-4">
        <p className="text-slate-400">Pedido no encontrado.</p>
        <Link to="/admin/pedidos" className="text-brand-400 hover:underline">Volver a Pedidos</Link>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/admin/pedidos" className="text-sm text-slate-400 hover:text-slate-300 mb-2 inline-block">
            ← Pedidos
          </Link>
          <h1 className="text-xl font-semibold text-slate-100">
            Pedido <span className="font-mono text-slate-400">#{order.id}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {order.createdAt ? new Date(order.createdAt).toLocaleString('es-AR') : '—'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              order.status === 'cancelled'
                ? 'bg-rose-900/50 text-rose-300'
                : order.status === 'completed'
                  ? 'bg-emerald-900/50 text-emerald-300'
                  : order.status === 'shipped'
                    ? 'bg-blue-900/50 text-blue-300'
                    : 'bg-amber-900/50 text-amber-300'
            }`}
          >
            {STATUS_LABELS[order.status]}
          </span>
          {!isCancelled && (
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
              disabled={saving}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="pending">{STATUS_LABELS.pending}</option>
              <option value="shipped">{STATUS_LABELS.shipped}</option>
              <option value="completed">{STATUS_LABELS.completed}</option>
              <option value="cancelled">{STATUS_LABELS.cancelled}</option>
            </select>
          )}
        </div>
      </div>

      {isCancelled && (
        <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-2 text-sm text-amber-200">
          Este pedido está cancelado y no puede cambiar de estado.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Cliente</h2>
          <dl className="space-y-1 text-sm">
            <div><dt className="text-slate-500">Nombre</dt><dd className="text-slate-100">{order.customerInfo.nombre}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd className="text-slate-100">{order.customerInfo.email}</dd></div>
            <div><dt className="text-slate-500">Teléfono</dt><dd className="text-slate-100">{order.customerInfo.telefono}</dd></div>
            <div><dt className="text-slate-500">DNI</dt><dd className="text-slate-100">{order.customerInfo.dni}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Envío</h2>
          <p className="text-sm text-slate-300">
            {order.shippingInfo.direccion}, {order.shippingInfo.ciudad}, {order.shippingInfo.provincia} {order.shippingInfo.codigoPostal}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Productos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-500">
                <th className="pb-2 pr-2 w-14">Imagen</th>
                <th className="pb-2 pr-2">Producto</th>
                <th className="pb-2 pr-2 w-24">SKU</th>
                <th className="pb-2 pr-2 w-20">Cant.</th>
                <th className="pb-2 pr-2 text-right w-24">P. unit.</th>
                <th className="pb-2 pr-2 text-right w-24">Subtotal</th>
                <th className="pb-2 w-20">Link</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, i) => (
                <tr key={i} className="border-b border-slate-800/80 align-middle">
                  <td className="py-2 pr-2">
                    <div className="h-12 w-12 rounded-lg bg-slate-800 overflow-hidden shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-500 text-lg">📦</div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-slate-200">{item.name}</td>
                  <td className="py-2 pr-2 font-mono text-xs text-slate-400">{productSkus[item.productId] ?? '—'}</td>
                  <td className="py-2 pr-2 text-center text-slate-300">{item.quantity}</td>
                  <td className="py-2 pr-2 text-right text-slate-300">${item.price.toFixed(2)}</td>
                  <td className="py-2 pr-2 text-right text-slate-100">${(item.price * item.quantity).toFixed(2)}</td>
                  <td className="py-2">
                    <Link
                      to={`/admin/productos/${item.productId}/editar`}
                      className="text-xs text-brand-400 hover:text-brand-300"
                    >
                      Ver producto
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-2">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">Pago</h2>
        <p className="text-sm text-slate-300">Medio: <strong className="text-slate-100">{order.paymentMethod.name}</strong></p>
        {order.appliedPromotion && (
          <p className="text-sm text-slate-300">
            Promoción aplicada: <strong className="text-slate-100">{order.appliedPromotion.name}</strong>
          </p>
        )}
        {order.discount > 0 && !order.appliedPromotion && (
          <p className="text-sm text-slate-400">Descuento aplicado (pedido anterior sin nombre de promoción)</p>
        )}
        {instructions && (
          <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-400 whitespace-pre-wrap">
            {instructions}
          </div>
        )}
        <div className="flex justify-between text-sm pt-2 border-t border-slate-800 mt-2">
          <span className="text-slate-500">Subtotal</span>
          <span className="text-slate-200">${order.subtotal.toFixed(2)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Descuento</span>
            <span className="text-emerald-400">−${order.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-slate-100 pt-2">
          <span>Total</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
