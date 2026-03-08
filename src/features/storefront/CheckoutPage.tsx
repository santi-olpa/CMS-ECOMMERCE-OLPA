import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStorefront } from '@/contexts/StorefrontContext';
import { getActivePaymentMethods } from '@/services/paymentMethods';
import { getActivePromotions } from '@/services/promotions';
import { createOrder } from '@/services/orders';
import { calculatePaymentOptions } from '@/utils/promotionsEngine';
import type { PaymentOption } from '@/utils/promotionsEngine';
import type { OrderCustomerInfo, OrderShippingInfo, OrderPaymentMethod } from '@/services/orders';

const initialCustomer: OrderCustomerInfo = {
  nombre: '',
  email: '',
  telefono: '',
  dni: '',
};

const initialShipping: OrderShippingInfo = {
  direccion: '',
  ciudad: '',
  provincia: '',
  codigoPostal: '',
};

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { settings } = useStorefront();

  const [customer, setCustomer] = useState<OrderCustomerInfo>(initialCustomer);
  const [shipping, setShipping] = useState<OrderShippingInfo>(initialShipping);
  const [paymentMethods, setPaymentMethods] = useState<Awaited<ReturnType<typeof getActivePaymentMethods>>>([]);
  const [promotions, setPromotions] = useState<Awaited<ReturnType<typeof getActivePromotions>>>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<PaymentOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAutofilledProfile = useRef(false);

  const palette = settings?.colorPalette ?? {
    cardBackground: '#1e293b',
    primaryAction: '#0d9488',
    primaryActionText: '#ffffff',
  };
  const cardBg = palette.cardBackground;
  const primary = palette.primaryAction ?? '#0d9488';
  const primaryText = palette.primaryActionText ?? '#ffffff';

  useEffect(() => {
    Promise.all([getActivePaymentMethods(), getActivePromotions()]).then(
      ([methods, promos]) => {
        setPaymentMethods(methods);
        setPromotions(promos.filter((p) => p.target === 'all'));
      },
    ).finally(() => setLoading(false));
  }, []);

  const paymentOptions = useMemo(
    () => calculatePaymentOptions(subtotal, paymentMethods, promotions),
    [subtotal, paymentMethods, promotions],
  );

  const optionsByMethod = useMemo(() => {
    const map = new Map<string, PaymentOption[]>();
    for (const opt of paymentOptions) {
      const list = map.get(opt.paymentMethodId) ?? [];
      list.push(opt);
      map.set(opt.paymentMethodId, list);
    }
    return map;
  }, [paymentOptions]);

  const uniqueMethodIds = useMemo(
    () => Array.from(new Set(paymentOptions.map((o) => o.paymentMethodId))),
    [paymentOptions],
  );

  const optionsForSelectedMethod = selectedPaymentMethodId
    ? (optionsByMethod.get(selectedPaymentMethodId) ?? [])
    : [];

  const finalTotal = selectedPaymentOption
    ? selectedPaymentOption.finalPrice
    : subtotal;
  const discount = subtotal - finalTotal;

  const canSubmit =
    items.length > 0 &&
    customer.nombre.trim() &&
    customer.email.trim() &&
    customer.telefono.trim() &&
    customer.dni.trim() &&
    shipping.direccion.trim() &&
    shipping.ciudad.trim() &&
    shipping.provincia.trim() &&
    shipping.codigoPostal.trim() &&
    selectedPaymentOption;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const orderId = await createOrder({
        customerInfo: customer,
        shippingInfo: shipping,
        items: items.map((i) => ({
          productId: i.productId,
          variationId: i.variationId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          imageUrl: i.imageUrl,
        })),
        paymentMethod: {
          id: selectedPaymentOption!.paymentMethodId,
          name: selectedPaymentOption!.paymentMethodName,
        },
        subtotal,
        discount,
        total: finalTotal,
        appliedPromotion:
          selectedPaymentOption!.promotionId && selectedPaymentOption!.promotionName
            ? { id: selectedPaymentOption!.promotionId, name: selectedPaymentOption!.promotionName }
            : undefined,
        userId: user?.uid,
      });
      clearCart();
      navigate(`/checkout/success?orderId=${orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!user || !profile || hasAutofilledProfile.current) return;
    hasAutofilledProfile.current = true;
    setCustomer((c) => ({
      ...c,
      email: user.email ?? c.email,
      nombre: profile.displayName?.trim() || c.nombre,
      telefono: profile.phone?.trim() || c.telefono,
    }));
    if (profile.shippingAddress) {
      const sa = profile.shippingAddress;
      setShipping((s) => ({
        direccion: sa.direccion?.trim() || s.direccion,
        ciudad: sa.ciudad?.trim() || s.ciudad,
        provincia: sa.provincia?.trim() || s.provincia,
        codigoPostal: sa.codigoPostal?.trim() || s.codigoPostal,
      }));
    }
  }, [user, profile]);

  if (items.length === 0 && !loading) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-6">Checkout</h1>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section
            className="rounded-xl border border-white/10 p-5 space-y-4"
            style={{ backgroundColor: cardBg }}
          >
            <h2 className="text-lg font-semibold text-white">Cuenta</h2>
            {user ? (
              <p className="text-sm text-white/80">
                Has iniciado sesión como <strong className="text-white">{user.email}</strong>. Tu pedido quedará vinculado a tu cuenta y podrás verlo en Mi cuenta → Pedidos.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-white/80">
                  Iniciá sesión para ver el seguimiento de tus pedidos o continuá como invitado.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/login?redirect=/checkout"
                    state={{ from: { pathname: '/checkout' } }}
                    className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium border border-white/30 text-white hover:bg-white/10 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    to="/registro"
                    className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium border border-white/30 text-white hover:bg-white/10 transition-colors"
                  >
                    Registrarse
                  </Link>
                  <span className="inline-flex items-center rounded-lg px-4 py-2 text-sm text-white/70 border border-white/20 bg-white/5">
                    Continuar como invitado
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Completá tus datos abajo. Después podés crear una cuenta desde Mi cuenta para ver tus pedidos.
                </p>
              </div>
            )}
          </section>

          <section
            className="rounded-xl border border-white/10 p-5 space-y-4"
            style={{ backgroundColor: cardBg }}
          >
            <h2 className="text-lg font-semibold text-white">Datos del comprador</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={customer.nombre}
                  onChange={(e) => setCustomer((c) => ({ ...c, nombre: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={customer.telefono}
                  onChange={(e) => setCustomer((c) => ({ ...c, telefono: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-1">DNI</label>
                <input
                  type="text"
                  value={customer.dni}
                  onChange={(e) => setCustomer((c) => ({ ...c, dni: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
                  placeholder="12345678"
                />
              </div>
            </div>
          </section>

          <section
            className="rounded-xl border border-white/10 p-5 space-y-4"
            style={{ backgroundColor: cardBg }}
          >
            <h2 className="text-lg font-semibold text-white">Datos de envío</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-1">Dirección</label>
                <input
                  type="text"
                  value={shipping.direccion}
                  onChange={(e) => setShipping((s) => ({ ...s, direccion: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
                  placeholder="Calle, número, piso/depto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={shipping.ciudad}
                  onChange={(e) => setShipping((s) => ({ ...s, ciudad: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
                  placeholder="CABA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Provincia</label>
                <input
                  type="text"
                  value={shipping.provincia}
                  onChange={(e) => setShipping((s) => ({ ...s, provincia: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
                  placeholder="Buenos Aires"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Código postal</label>
                <input
                  type="text"
                  value={shipping.codigoPostal}
                  onChange={(e) => setShipping((s) => ({ ...s, codigoPostal: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
                  placeholder="1043"
                />
              </div>
            </div>
          </section>

          <section
            className="rounded-xl border border-white/10 p-5 space-y-4"
            style={{ backgroundColor: cardBg }}
          >
            <h2 className="text-lg font-semibold text-white">Medio de pago</h2>
            {loading ? (
              <p className="text-white/60 text-sm">Cargando opciones...</p>
            ) : (
              <>
                <p className="text-sm text-white/70 mb-3">Elegí primero el medio y después la opción (pago único, cuotas o promoción).</p>
                <div className="space-y-3">
                  {uniqueMethodIds.map((methodId) => {
                    const opts = optionsByMethod.get(methodId) ?? [];
                    const methodName = opts[0]?.paymentMethodName ?? methodId;
                    const isMethodSelected = selectedPaymentMethodId === methodId;
                    return (
                      <div key={methodId} className="rounded-lg border border-white/10 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaymentMethodId(methodId);
                            setSelectedPaymentOption(opts[0] ?? null);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                            isMethodSelected ? 'bg-white/10 border-b border-white/10' : 'hover:bg-white/5'
                          }`}
                        >
                          <span className="font-medium text-white">{methodName}</span>
                          <span className="text-white/60 text-sm">
                            {isMethodSelected && selectedPaymentOption
                              ? `$${selectedPaymentOption.finalPrice.toFixed(2)}`
                              : `${opts.length} opción/es`}
                          </span>
                        </button>
                        {isMethodSelected && (
                          <div className="p-2 space-y-1 bg-white/5">
                            {optionsForSelectedMethod.map((opt, idx) => {
                              const isOptSelected =
                                selectedPaymentOption?.paymentMethodId === opt.paymentMethodId &&
                                selectedPaymentOption?.finalPrice === opt.finalPrice &&
                                selectedPaymentOption?.promotionId === opt.promotionId;
                              return (
                                <label
                                  key={`${opt.paymentMethodId}-${opt.finalPrice}-${idx}`}
                                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                    isOptSelected ? 'bg-white/10' : 'hover:bg-white/5'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <input
                                      type="radio"
                                      name="paymentOption"
                                      checked={!!isOptSelected}
                                      onChange={() => setSelectedPaymentOption(opt)}
                                      className="shrink-0 text-white focus:ring-white/50"
                                    />
                                    <span className="text-sm text-white">
                                      {opt.promotionName ? opt.promotionName : 'Pago único'}
                                    </span>
                                  </div>
                                  <span className="font-semibold text-white shrink-0">${opt.finalPrice.toFixed(2)}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {paymentMethods.length === 0 && !loading && (
                  <p className="text-white/60 text-sm">No hay medios de pago configurados.</p>
                )}
              </>
            )}
          </section>
        </div>

        <div>
          <section
            className="rounded-xl border border-white/10 p-5 sticky top-24"
            style={{ backgroundColor: cardBg }}
          >
            <h2 className="text-lg font-semibold text-white mb-4">Resumen del pedido</h2>
            <ul className="space-y-3 mb-4">
              {items.map((item) => {
                const key = item.variationId ? `${item.productId}:${item.variationId}` : item.productId;
                return (
                  <li key={key} className="flex gap-3 text-sm">
                    <div className="h-12 w-12 shrink-0 rounded-lg bg-white/10 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white/40">📦</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white truncate">{item.name}</p>
                      <p className="text-white/60">
                        {item.quantity} × ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-medium text-white">${(item.quantity * item.price).toFixed(2)}</p>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-white/10 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-white/80">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-white/80">
                  <span>Descuento</span>
                  <span className="text-emerald-400">−${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-white text-lg pt-2">
                <span>Total</span>
                <span style={{ color: primary }}>${finalTotal.toFixed(2)}</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full mt-6 rounded-xl py-3 text-center font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: primary, color: primaryText }}
            >
              {submitting ? 'Procesando…' : 'Finalizar compra'}
            </button>
          </section>
        </div>
      </form>
    </div>
  );
};
