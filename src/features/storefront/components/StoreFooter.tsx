import { Link } from 'react-router-dom';
import { useStorefront } from '@/contexts/StorefrontContext';
import type {
  FooterColumn,
  FooterWidget,
  FooterHtmlWidget,
  FooterMenuWidget,
  FooterImageWidget,
  FooterContactWidget,
} from '@/services/settings';

export const StoreFooter = () => {
  const { settings } = useStorefront();
  const columns = settings?.footerColumns ?? [];
  const copyright = settings?.footerCopyright?.trim() ?? '';
  const palette = settings?.colorPalette;
  const cardBg = palette?.cardBackground ?? '#1e293b';
  const primary = palette?.primaryAction ?? '#0d9488';

  if (columns.length === 0 && !copyright) return null;

  const renderWidget = (widget: FooterWidget) => {
    switch (widget.type) {
      case 'html':
        return (
          <div
            className="footer-widget-html text-sm text-white/80 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: (widget as FooterHtmlWidget).content || '' }}
          />
        );
      case 'menu': {
        const w = widget as FooterMenuWidget;
        return (
          <div className="space-y-2">
            {w.title && (
              <p className="text-xs font-semibold uppercase tracking-wide text-white/90">{w.title}</p>
            )}
            <ul className="space-y-1.5">
              {(w.items ?? []).map((item, i) => (
                <li key={i}>
                  {item.href?.startsWith('/') ? (
                    <Link
                      to={item.href}
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      href={item.href || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      }
      case 'image': {
        const w = widget as FooterImageWidget;
        const img = (
          <img
            src={w.imageUrl}
            alt={w.alt || ''}
            className="max-h-12 w-auto object-contain"
          />
        );
        return (
          <div className="footer-widget-image">
            {w.link ? (
              w.link.startsWith('/') ? (
                <Link to={w.link} className="inline-block">{img}</Link>
              ) : (
                <a href={w.link} target="_blank" rel="noopener noreferrer" className="inline-block">
                  {img}
                </a>
              )
            ) : (
              img
            )}
          </div>
        );
      }
      case 'contact': {
        const w = widget as FooterContactWidget;
        return (
          <div className="space-y-2">
            {w.title && (
              <p className="text-xs font-semibold uppercase tracking-wide text-white/90">{w.title}</p>
            )}
            <div className="text-sm text-white/70 space-y-1.5">
              {w.address && <p className="flex items-start gap-2"><span className="text-white/50">📍</span>{w.address}</p>}
              {w.phone && <p><a href={`tel:${w.phone.replace(/\s/g, '')}`} className="hover:text-white transition-colors">📞 {w.phone}</a></p>}
              {w.email && <p><a href={`mailto:${w.email}`} className="hover:text-white transition-colors">✉️ {w.email}</a></p>}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <footer
      className="border-t border-white/10 mt-auto"
      style={{ backgroundColor: cardBg }}
    >
      {columns.length > 0 && (
        <div className="mx-auto px-4 py-10 md:py-12" style={{ maxWidth: settings?.menuMaxWidth ?? '1280px' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {columns.map((col: FooterColumn) => (
              <div key={col.id} className="space-y-4">
                {col.title && (
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/90">
                    {col.title}
                  </h3>
                )}
                <div className="space-y-4">
                  {col.widgets.map((widget) => (
                    <div key={widget.id}>{renderWidget(widget)}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {copyright && (
        <div
          className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/50"
          style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
        >
          <span dangerouslySetInnerHTML={{ __html: copyright }} />
        </div>
      )}
    </footer>
  );
};
