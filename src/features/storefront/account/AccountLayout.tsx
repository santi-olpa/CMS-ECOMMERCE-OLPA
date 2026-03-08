import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStorefront } from '@/contexts/StorefrontContext';

export const AccountLayout = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useStorefront();

  const palette = settings?.colorPalette ?? { primaryAction: '#0d9488' };
  const primary = palette.primaryAction ?? '#0d9488';

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-white">Mi Cuenta</h1>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Menú de cuenta">
          <Link
            to="/mi-cuenta/pedidos"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/mi-cuenta' || location.pathname === '/mi-cuenta/pedidos'
                ? 'text-white'
                : 'text-white/70 hover:text-white'
            }`}
            style={
              location.pathname === '/mi-cuenta' || location.pathname === '/mi-cuenta/pedidos'
                ? { backgroundColor: primary }
                : undefined
            }
          >
            Panel / Mis Pedidos
          </Link>
          <Link
            to="/mi-cuenta/datos"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/mi-cuenta/datos' ? 'text-white' : 'text-white/70 hover:text-white'
            }`}
            style={
              location.pathname === '/mi-cuenta/datos' ? { backgroundColor: primary } : undefined
            }
          >
            Mis Datos
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors border border-white/20"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>

      <Outlet />
    </div>
  );
};
