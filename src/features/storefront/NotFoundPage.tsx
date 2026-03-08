import { Link } from 'react-router-dom';
import { useStorefront } from '@/contexts/StorefrontContext';

export const NotFoundPage = () => {
  const { settings } = useStorefront();
  const primary = settings?.colorPalette?.primaryAction ?? '#0d9488';
  const primaryText = settings?.colorPalette?.primaryActionText ?? '#ffffff';

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-6xl md:text-8xl font-bold text-white/20">404</h1>
      <p className="mt-4 text-slate-300 text-center">
        La página que buscas no existe o ha sido movida.
      </p>
      <Link
        to="/"
        className="mt-8 rounded-lg px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: primary, color: primaryText }}
      >
        Volver al inicio
      </Link>
    </div>
  );
};
