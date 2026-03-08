import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const redirectUrl = searchParams.get('redirect');
  const fromState = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const from = redirectUrl ?? fromState ?? '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesión. Revisa email y contraseña.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
            OL
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-50">OLPA CMS</h1>
          <p className="mt-1 text-sm text-slate-400">Inicia sesión para continuar</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 space-y-4"
        >
          {error && (
            <div className="rounded-md border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-200">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
              placeholder="admin@ejemplo.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-200">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-500">
          Usa una cuenta de Firebase Auth configurada en tu proyecto.
        </p>
      </div>
    </div>
  );
};
