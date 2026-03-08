import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/features/auth/types';
import type { Role } from '@/features/auth/types';

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout } = useAuth();
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [isOrgOpen, setIsOrgOpen] = useState(true);
  const [isFinanceOpen, setIsFinanceOpen] = useState(true);
  const [isSalesOpen, setIsSalesOpen] = useState(true);
  const [isSiteOpen, setIsSiteOpen] = useState(true);
  const isAdmin = profile?.role === 'admin';

  const goTo = (path: string) => {
    navigate(path);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <span className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="h-7 w-7 rounded-lg bg-brand-600 flex items-center justify-center text-xs font-bold">
            OL
          </span>
          <span>OLPA CMS</span>
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
        <div>
          <button
            type="button"
            onClick={() => setIsStoreOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <span className="font-medium">Tienda</span>
            <span
              className={`text-xs transition-transform ${
                isStoreOpen ? 'rotate-90' : ''
              }`}
            >
              ❯
            </span>
          </button>

          {isStoreOpen && (
            <div className="mt-1 space-y-1 pl-3 border-l border-slate-800/60">
              <button
                type="button"
                onClick={() => goTo('/admin/productos')}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs
                  ${
                    isActivePath('/admin/productos')
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <span>Gestión de inventario</span>
              </button>

              <button
                type="button"
                onClick={() => goTo('/admin/productos/nuevo')}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs
                  ${
                    isActivePath('/admin/productos/nuevo')
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <span>Añadir producto</span>
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsOrgOpen((prev) => !prev)}
            className="w-full mt-3 flex items-center justify-between px-3 py-2 rounded-md text-left text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <span className="font-medium">Organización</span>
            <span className={`text-xs transition-transform ${isOrgOpen ? 'rotate-90' : ''}`}>❯</span>
          </button>
          {isOrgOpen && (
            <div className="mt-1 space-y-1 pl-3 border-l border-slate-800/60">
              <button
                type="button"
                onClick={() => goTo('/admin/categorias')}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs
                  ${isActivePath('/admin/categorias') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <span>Categorías</span>
              </button>
              <button
                type="button"
                onClick={() => goTo('/admin/marcas')}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs
                  ${isActivePath('/admin/marcas') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <span>Marcas</span>
              </button>
              <button
                type="button"
                onClick={() => goTo('/admin/atributos')}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs
                  ${isActivePath('/admin/atributos') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <span>Atributos</span>
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsFinanceOpen((prev) => !prev)}
            className="w-full mt-3 flex items-center justify-between px-3 py-2 rounded-md text-left text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <span className="font-medium">Finanzas</span>
            <span className={`text-xs transition-transform ${isFinanceOpen ? 'rotate-90' : ''}`}>❯</span>
          </button>
          {isFinanceOpen && (
            <div className="mt-1 space-y-1 pl-3 border-l border-slate-800/60">
              <button
                type="button"
                onClick={() => goTo('/admin/medios-de-pago')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs ${isActivePath('/admin/medios-de-pago') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <span>Medios de pago</span>
              </button>
              <button
                type="button"
                onClick={() => goTo('/admin/promociones')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs ${isActivePath('/admin/promociones') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <span>Promociones</span>
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsSiteOpen((prev) => !prev)}
            className="w-full mt-3 flex items-center justify-between px-3 py-2 rounded-md text-left text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <span className="font-medium">Sitio Web</span>
            <span className={`text-xs transition-transform ${isSiteOpen ? 'rotate-90' : ''}`}>❯</span>
          </button>
          {isSiteOpen && (
            <div className="mt-1 space-y-1 pl-3 border-l border-slate-800/60">
              <button
                type="button"
                onClick={() => goTo('/admin/paginas')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs ${isActivePath('/admin/paginas') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <span>Páginas</span>
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsSalesOpen((prev) => !prev)}
            className="w-full mt-3 flex items-center justify-between px-3 py-2 rounded-md text-left text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <span className="font-medium">Ventas</span>
            <span className={`text-xs transition-transform ${isSalesOpen ? 'rotate-90' : ''}`}>❯</span>
          </button>
          {isSalesOpen && (
            <div className="mt-1 space-y-1 pl-3 border-l border-slate-800/60">
              <button
                type="button"
                onClick={() => goTo('/admin/pedidos')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs ${isActivePath('/admin/pedidos') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <span>Pedidos</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => goTo('/admin/apariencia')}
          className={`
            w-full mt-3 flex items-center justify-between px-3 py-2 rounded-md text-left text-xs
            ${
              isActivePath('/admin/apariencia')
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }
          `}
        >
          <span>Apariencia</span>
        </button>

        <button
          type="button"
          onClick={() => goTo('/admin/listas-de-precios')}
          className={`
            w-full mt-3 flex items-center justify-between px-3 py-2 rounded-md text-left text-xs
            ${
              isActivePath('/admin/listas-de-precios')
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }
          `}
        >
          <span>Listas de precios</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => goTo('/admin/usuarios')}
            className={`
              w-full mt-3 flex items-center justify-between px-3 py-2 rounded-md text-left text-xs
              ${
                isActivePath('/admin/usuarios')
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }
            `}
          >
            <span>Usuarios</span>
          </button>
        )}
      </nav>
      <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500 space-y-1">
        <p className="truncate text-slate-400" title={user?.email ?? ''}>
          {user?.email ?? '—'}
        </p>
        {profile?.role && (
          <p className="text-[10px] text-slate-500">
            Rol: {ROLE_LABELS[profile.role as Role]}
          </p>
        )}
        <button
          type="button"
          onClick={() => logout()}
          className="text-slate-400 hover:text-rose-300 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
};

