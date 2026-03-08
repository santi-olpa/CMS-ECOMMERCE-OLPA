import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStorefront } from '@/contexts/StorefrontContext';
import { getOrderById } from '@/services/orders';
import { getPaymentMethodById } from '@/services/paymentMethods';
import type { Order } from '@/services/orders';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente de pago',
  cancelled: 'Cancelado',
  shipped: 'Enviado',
  completed: 'Completado',
};

export const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const { settings } = useStorefront();
  const [order, setOrder] = useState<Order | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const palette = settings?.colorPalette ?? { cardBackground: '#1e293b', primaryAction: '#0d9488' };
  const cardBg = palette.cardBackground;
  const primary = palette.primaryAction ?? '#0d9488';

  useEffect(() => {
    if (!orderId || !user?.uid) {
      setLoading(false);
      return;
    }
    getOrderById(orderId)
      .then(async (o) => {
        setOrder(o ?? null);
        if (o?.paymentMethod?.id) {
          const method = await getPaymentMethodById(o.paymentMethod.id);
          setInstructions(method?.instructions ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [orderId, user?.uid]);

  if (!user) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (!orderId || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-white/80 mb-4">No se encontró el pedido.</p>
        <Link to="/mi-cuenta" className="font-medium" style={{ color: primary }}>Volver a Mis pedidos</Link>
      </div>
    );
  }

  const orderUserId = (order as Order & { userId?: string }).userId;
  if (orderUserId && orderUserId !== user.uid) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-white/80 mb-4">No tenés acceso a este pedido.</p>
        <Link to="/mi-cuenta" className="font-medium" style={{ color: primary }}>Volver a Mis pedidos</Link>
      </div>
    );
  }

  const statusLabel = STATUS_LABELS[order.status] ?? order.status;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/mi-cuenta" className="text-sm text-white/60 hover:text-white mb-4 inline-block">
        ← Mis pedidos
      </Link>
      <div
        className="rounded-xl border border-white/10 p-6 space-y-6"
        style={{ backgroundColor: cardBg }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-white">
            Pedido <span className="font-mono text-white/80">#{order.id.slice(0, 8)}</span>
          </h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              order.status === 'cancelled'
                ? 'bg-rose-900/50 text-rose-300'
                : order.status === 'completed'
                  ? 'bg-emerald-900/50 text-emerald-300'
                  : order.status === 'shipped'
                    ? 'bg-blue-900/50 text-blue-300'
                    : 'bg-amber-900/50 text-amber-300'
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <p className="text-sm text-white/50">
          {order.createdAt ? new Date(order.createdAt).toLocaleString('es-AR') : '—'}
        </p>

        <section>
          <h2 className="text-sm font-semibold text-white mb-2">Productos</h2>
          <ul className="space-y-2">
            {order.items?.map((item, i) => (
              <li key={i} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0 text-sm">
                <div className="flex gap-3">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover bg-white/10" />
                  )}
                  <div>
                    <p className="text-white">{item.name}</p>
                    <p className="text-white/50">{item.quantity} × ${item.price.toFixed(2)}</p>
                  </div>
                </div>
                <span className="font-medium text-white">${(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-white/10 pt-4 space-y-2 text-sm text-white/80">
          <p><strong className="text-white">Cliente:</strong> {order.customerInfo.nombre}</p>
          <p><strong className="text-white">Email:</strong> {order.customerInfo.email}</p>
          <p><strong className="text-white">Teléfono:</strong> {order.customerInfo.telefono}</p>
          <p><strong className="text-white">DNI:</strong> {order.customerInfo.dni}</p>
        </section>

        <section className="border-t border-white/10 pt-4 space-y-1 text-sm text-white/80">
          <p><strong className="text-white">Envío:</strong></p>
          <p>{order.shippingInfo.direccion}, {order.shippingInfo.ciudad}, {order.shippingInfo.provincia} {order.shippingInfo.codigoPostal}</p>
        </section>

        <section className="border-t border-white/10 pt-4">
          <p className="text-sm text-white/80"><strong className="text-white">Medio de pago:</strong> {order.paymentMethod.name}</p>
          {instructions && (
            <div className="mt-2 rounded-lg bg-white/5 p-3 text-sm text-white/70 whitespace-pre-wrap">
              {instructions}
            </div>
          )}
        </section>

        <div className="border-t border-white/10 pt-4 flex justify-between items-center">
          <span className="text-white/70">Subtotal</span>
          <span>${order.subtotal.toFixed(2)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/70">Descuento</span>
            <span className="text-emerald-400">−${order.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center font-semibold text-white text-lg pt-2">
          <span>Total</span>
          <span style={{ color: primary }}>${order.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
