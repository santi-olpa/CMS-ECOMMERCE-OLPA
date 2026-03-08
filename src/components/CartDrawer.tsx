import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Estilos CSS variables del store (primary, etc.) */
  primaryColor?: string;
  primaryTextColor?: string;
}

export const CartDrawer = ({ isOpen, onClose, primaryColor, primaryTextColor }: CartDrawerProps) => {
  const { items, itemCount, subtotal, updateQuantity, removeItem } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md flex flex-col bg-slate-900 border-l border-slate-700 shadow-xl"
        aria-modal="true"
        aria-label="Carrito"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">
            Carrito {itemCount > 0 && `(${itemCount})`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-slate-400 text-sm py-8">Tu carrito está vacío.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const key = item.variationId ? `${item.productId}:${item.variationId}` : item.productId;
                return (
                  <li
                    key={key}
                    className="flex gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                  >
                    <div className="h-16 w-16 shrink-0 rounded-md bg-slate-700 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-500 text-2xl">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-100 truncate">{item.name}</p>
                      <p className="text-sm font-semibold text-slate-200 mt-0.5">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center rounded border border-slate-600 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                Math.max(0, item.quantity - 1),
                                item.variationId,
                              )
                            }
                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-700"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm text-slate-100">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1, item.variationId)
                            }
                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-700"
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
          <div className="border-t border-slate-700 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-semibold text-slate-100">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <Link
                to="/carrito"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-600 py-2.5 text-center text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Ver carrito
              </Link>
              <Link
                to="/checkout"
                onClick={onClose}
                className="flex-1 rounded-lg py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: primaryColor ?? '#0d9488',
                  color: primaryTextColor ?? '#fff',
                }}
              >
                Finalizar compra
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
