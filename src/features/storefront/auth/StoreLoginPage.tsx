import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStorefront } from '@/contexts/StorefrontContext';

export const StoreLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { settings } = useStorefront();

  const redirectUrl = searchParams.get('redirect');
  const fromState = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const from = redirectUrl ?? fromState ?? '/';

  const palette = settings?.colorPalette ?? {
    cardBackground: '#1e293b',
    primaryAction: '#0d9488',
    primaryActionText: '#ffffff',
  };
  const cardBg = palette.cardBackground;
  const primary = palette.primaryAction ?? '#0d9488';
  const primaryText = palette.primaryActionText ?? '#ffffff';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesión. Revisá email y contraseña.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--store-bg, #0f172a)' }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white">
            <span className="text-xl font-semibold">Mi Cuenta</span>
          </Link>
          <p className="mt-2 text-sm text-white/60">Iniciá sesión para ver tus pedidos y datos</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/10 p-6 space-y-4"
          style={{ backgroundColor: cardBg }}
        >
          {error && (
            <div className="rounded-md border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/80">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/80">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md py-2 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: primary, color: primaryText }}
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-white/50">
          ¿No tenés cuenta?{' '}
          <Link to={redirectUrl ? `/registro?redirect=${encodeURIComponent(redirectUrl)}` : '/registro'} className="font-medium hover:underline" style={{ color: primary }}>
            Registrarse
          </Link>
        </p>
      </div>
    </div>
  );
};
