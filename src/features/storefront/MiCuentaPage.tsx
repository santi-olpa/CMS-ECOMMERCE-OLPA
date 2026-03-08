import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStorefront } from '@/contexts/StorefrontContext';
import { getOrdersByUserId } from '@/services/orders';
import type { Order } from '@/services/orders';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente de pago',
  cancelled: 'Cancelado',
  shipped: 'Enviado',
  completed: 'Completado',
};

export const MiCuentaPage = () => {
  const { user } = useAuth();
  const { settings } = useStorefront();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const palette = settings?.colorPalette ?? { cardBackground: '#1e293b', primaryAction: '#0d9488' };
  const cardBg = palette.cardBackground;
  const primary = palette.primaryAction ?? '#0d9488';

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    getOrdersByUserId(user.uid)
      .then((list) => setOrders(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-2">Mi cuenta</h1>
      <p className="text-white/60 text-sm mb-6">{user.email}</p>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Mis pedidos</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div
            className="rounded-xl border border-white/10 p-8 text-center text-white/60"
            style={{ backgroundColor: cardBg }}
          >
            Aún no tienes pedidos.
            <br />
            <Link to="/" className="mt-2 inline-block font-medium" style={{ color: primary }}>
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/mi-cuenta/pedido/${order.id}`}
                className="block rounded-xl border border-white/10 p-4 hover:bg-white/5 transition-colors"
                style={{ backgroundColor: cardBg }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-white/80">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-white/50">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString('es-AR')
                        : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white" style={{ color: primary }}>
                      ${order.total.toFixed(2)}
                    </p>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 ${
                        order.status === 'cancelled'
                          ? 'bg-rose-900/50 text-rose-300'
                          : order.status === 'completed'
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : order.status === 'shipped'
                              ? 'bg-blue-900/50 text-blue-300'
                              : 'bg-amber-900/50 text-amber-300'
                      }`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
