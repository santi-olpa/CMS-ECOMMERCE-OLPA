import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useStorefront } from '@/contexts/StorefrontContext';

const STOREFRONT_OPEN_CART = 'storefront-open-cart';

export function emitOpenCart() {
  window.dispatchEvent(new CustomEvent(STOREFRONT_OPEN_CART));
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
  const { items, itemCount, subtotal, updateQuantity, removeItem } = useCart();
  const { settings } = useStorefront();
  const navigate = useNavigate();

  const palette = settings?.colorPalette ?? {
    pageBackground: '#0f172a',
    cardBackground: '#1e293b',
    primaryAction: '#0d9488',
    primaryActionText: '#ffffff',
  };
  const cardBg = palette.cardBackground;
  const primary = palette.primaryAction ?? '#0d9488';
  const primaryText = palette.primaryActionText ?? '#ffffff';

  if (!isOpen) return null;

  const handleGoToCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md flex flex-col shadow-xl border-l border-white/10"
        style={{ backgroundColor: cardBg }}
        aria-modal="true"
        aria-label="Carrito"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Carrito {itemCount > 0 && `(${itemCount})`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-white/60 text-sm py-8">Tu carrito está vacío.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const key = item.variationId ? `${item.productId}:${item.variationId}` : item.productId;
                return (
                  <li
                    key={key}
                    className="flex gap-3 rounded-xl border border-white/10 p-3"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-white/5">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white/40 text-2xl">📦</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{item.name}</p>
                      <p className="text-sm font-semibold text-white/90 mt-0.5">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center rounded-lg border border-white/20 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.productId, Math.max(0, item.quantity - 1), item.variationId)
                            }
                            className="w-8 h-8 flex items-center justify-center text-white/80 hover:bg-white/10"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm text-white">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1, item.variationId)
                            }
                            className="w-8 h-8 flex items-center justify-center text-white/80 hover:bg-white/10"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.variationId)}
                          className="text-xs text-rose-400 hover:text-rose-300"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-white/10 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Subtotal</span>
              <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={handleGoToCheckout}
              className="w-full rounded-xl py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: primary, color: primaryText }}
            >
              Ir al Checkout
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
