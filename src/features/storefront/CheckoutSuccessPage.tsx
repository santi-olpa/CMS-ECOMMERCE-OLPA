import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getOrderById } from '@/services/orders';
import { getPaymentMethodById } from '@/services/paymentMethods';
import { useStorefront } from '@/contexts/StorefrontContext';
import type { Order } from '@/services/orders';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente de pago',
  cancelled: 'Cancelado',
  shipped: 'Enviado',
  completed: 'Completado',
};

export const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { settings } = useStorefront();
  const palette = settings?.colorPalette ?? {
    cardBackground: '#1e293b',
    primaryAction: '#0d9488',
  };
  const cardBg = palette.cardBackground;
  const primary = palette.primaryAction ?? '#0d9488';

  useEffect(() => {
    if (!orderId) {
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
  }, [orderId]);

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
        <Link to="/" className="text-white font-medium" style={{ color: primary }}>
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div
        className="rounded-xl border border-white/10 p-6 md:p-8 space-y-6"
        style={{ backgroundColor: cardBg }}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 text-2xl mb-4">
            ✓
          </div>
          <h1 className="text-2xl font-semibold text-white">¡Pedido realizado!</h1>
          <p className="text-white/70 mt-1">
            Número de orden: <span className="font-mono font-semibold text-white">{order.id}</span>
          </p>
          <p className="mt-2 text-sm text-white/70">
            Estado: <span className="font-medium text-white">{STATUS_LABELS[order.status] ?? order.status}</span>
          </p>
        </div>

        <div className="border-t border-white/10 pt-4">
            <h2 className="text-sm font-semibold text-white mb-2">Productos</h2>
            <ul className="space-y-2 mb-4">
              {order.items?.map((item, i) => (
                <li key={i} className="flex justify-between items-center text-sm text-white/90">
                  <span>{item.name} × {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 text-sm text-white/80">
              <p><strong>Cliente:</strong> {order.customerInfo.nombre} · {order.customerInfo.email}</p>
              <p><strong>Envío:</strong> {order.shippingInfo.direccion}, {order.shippingInfo.ciudad}, {order.shippingInfo.provincia} {order.shippingInfo.codigoPostal}</p>
              <p><strong>Medio de pago:</strong> {order.paymentMethod.name}</p>
              <p className="text-lg font-semibold text-white pt-2">
                Total: <span style={{ color: primary }}>${order.total.toFixed(2)}</span>
              </p>
            </div>
          </div>

        {instructions && (
          <div className="rounded-lg border border-white/20 bg-white/5 p-4">
            <h2 className="text-sm font-semibold text-white mb-2">Instrucciones de pago</h2>
            <p className="text-sm text-white/80 whitespace-pre-wrap">{instructions}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link
            to="/"
            className="rounded-xl py-2.5 text-center font-medium text-white border border-white/20 hover:bg-white/10 transition-colors"
          >
            Seguir comprando
          </Link>
          <Link
            to="/mi-cuenta"
            className="rounded-xl py-2.5 text-center font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            Mi cuenta · Pedidos
          </Link>
        </div>
      </div>
    </div>
  );
};
