import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, updateOrderStatus } from '@/services/orders';
import type { Order, OrderStatus } from '@/services/orders';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente de pago',
  cancelled: 'Cancelado',
  shipped: 'Enviado',
  completed: 'Completado',
};

export const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getOrders();
      setOrders(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    setError(null);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado.');
    } finally {
      setUpdatingId(null);
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
        <h1 className="text-xl font-semibold text-slate-100">Pedidos</h1>
        <p className="text-sm text-slate-400 mt-1">
          Listado de órdenes. Al cancelar se restaura el stock.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        {orders.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-500 text-sm">
            No hay pedidos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="px-4 py-3 font-medium text-slate-300">ID / Fecha</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Cliente</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Total</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Estado</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Acciones</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-900/30">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-slate-400">{order.id}</p>
                      <p className="text-xs text-slate-500">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString('es-AR')
                          : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      <p>{order.customerInfo.nombre}</p>
                      <p className="text-xs text-slate-500">{order.customerInfo.email}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-100">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
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
                    </td>
                    <td className="px-4 py-3">
                      {order.status !== 'cancelled' && order.status !== 'completed' && (
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value as OrderStatus)
                          }
                          disabled={updatingId === order.id}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-600"
                        >
                          <option value="pending">{STATUS_LABELS.pending}</option>
                          <option value="shipped">{STATUS_LABELS.shipped}</option>
                          <option value="completed">{STATUS_LABELS.completed}</option>
                          <option value="cancelled">{STATUS_LABELS.cancelled}</option>
                        </select>
                      )}
                      {order.status === 'completed' && (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                      {order.status === 'cancelled' && (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/pedidos/${order.id}`}
                        className="rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
