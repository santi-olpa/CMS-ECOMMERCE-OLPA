import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { CartDrawer } from '@/features/storefront/components/CartDrawer';
import { FavoritesDrawer } from '@/features/storefront/components/FavoritesDrawer';
import { StoreFooter } from '@/features/storefront/components/StoreFooter';
import type { NavMenuItem } from '@/services/settings';

export const StoreLayout = () => {
  const navigate = useNavigate();
  const { settings, loading, error } = useStorefront();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { count: favoritesCount } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/tienda?q=${encodeURIComponent(q)}`);
    else navigate('/tienda');
  };
  const [cartOpen, setCartOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [expandedMobileId, setExpandedMobileId] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const dropdownCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDropdownTimer = () => {
    if (dropdownCloseTimerRef.current) {
      clearTimeout(dropdownCloseTimerRef.current);
      dropdownCloseTimerRef.current = null;
    }
  };
  const scheduleCloseDropdown = () => {
    clearDropdownTimer();
    dropdownCloseTimerRef.current = setTimeout(() => setOpenDropdownId(null), 120);
  };
  const keepDropdownOpen = () => {
    clearDropdownTimer();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const openCart = () => setCartOpen(true);
    window.addEventListener('storefront-open-cart', openCart);
    return () => window.removeEventListener('storefront-open-cart', openCart);
  }, []);
  useEffect(() => {
    const openFavorites = () => setFavoritesOpen(true);
    window.addEventListener('storefront-open-favorites', openFavorites);
    return () => window.removeEventListener('storefront-open-favorites', openFavorites);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0f172a' }}>
        <p className="text-slate-300">{error}</p>
      </div>
    );
  }

  const palette = settings?.colorPalette ?? {
    pageBackground: '#0f172a',
    cardBackground: '#1e293b',
    primaryAction: '#0d9488',
    primaryActionText: '#ffffff',
    accent: '#2dd4bf',
  };

  const inlineStyles = {
    '--store-bg': palette.pageBackground,
    '--store-card': palette.cardBackground,
    '--store-primary': palette.primaryAction,
    '--store-primary-text': palette.primaryActionText,
    '--store-accent': palette.accent,
  } as React.CSSProperties;

  const marqueeMessage = settings?.marqueeMessage?.trim() ?? '';
  const logoUrl = settings?.logoUrl ?? '';
  const logoTagline = settings?.logoTagline?.trim() ?? '';
  const searchPlaceholder = settings?.searchPlaceholder?.trim() || 'Buscar productos...';
  const mainCtas = settings?.mainHeaderCtas ?? [];
  const navMenu = settings?.navMenu ?? [];
  const ctaButtons = settings?.ctaButtons ?? [];
  const headerBg = settings?.headerBackgrounds;
  const topHeaderBg = headerBg?.topHeader ?? palette.cardBackground;
  const mainHeaderBg = headerBg?.mainHeader ?? palette.cardBackground;
  const bottomHeaderBg = headerBg?.bottomHeader ?? palette.cardBackground;
  const menuMaxWidth = settings?.menuMaxWidth ?? '1280px';

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ ...inlineStyles, backgroundColor: 'var(--store-bg)' }}>
      {/* Top Header: solo marquesina (HTML permitido) */}
      {marqueeMessage.length > 0 && (
        <header
          className="relative flex overflow-hidden border-b border-white/10 text-xs font-medium text-white/90 px-4 py-2 md:px-6"
          style={{ backgroundColor: topHeaderBg }}
        >
          <div className="animate-marquee flex whitespace-nowrap">
            <span className="mx-3 marquee-content" dangerouslySetInnerHTML={{ __html: marqueeMessage }} />
            <span className="mx-3 marquee-content" dangerouslySetInnerHTML={{ __html: marqueeMessage }} />
            <span className="mx-3 marquee-content" dangerouslySetInnerHTML={{ __html: marqueeMessage }} />
          </div>
        </header>
      )}

      {/* Main Header: desktop = logo | search | CTAs + fav + cart + user; mobile = logo + cart + hamburger */}
      <header
        className="sticky top-0 z-30 border-b border-white/10 px-4 py-3 md:px-6"
        style={{ backgroundColor: mainHeaderBg }}
      >
        <div className="mx-auto flex items-center justify-between gap-4" style={{ maxWidth: menuMaxWidth }}>
          <Link to="/" className="shrink-0 flex flex-col" onClick={closeMobileMenu}>
            {logoUrl ? (
              <>
                <img src={logoUrl} alt="Logo" className="h-9 md:h-11 object-contain object-left" />
                {logoTagline && (
                  <span className="text-[10px] md:text-xs font-medium text-white/70 mt-0.5 hidden sm:block">
                    {logoTagline}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-xl font-bold" style={{ color: 'var(--store-accent)' }}>
                  Tienda
                </span>
                {logoTagline && (
                  <span className="text-[10px] text-white/60 mt-0.5 hidden sm:block">{logoTagline}</span>
                )}
              </>
            )}
          </Link>

          {/* Desktop: búsqueda central */}
          <form className="flex-1 hidden md:flex justify-center max-w-2xl mx-4" onSubmit={handleSearchSubmit}>
            <div className="w-full flex rounded-full overflow-hidden border border-white/20 bg-white/5">
              <input
                type="search"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-0 px-4 py-2.5 pl-4 text-sm text-white placeholder:text-white/50 bg-transparent focus:outline-none focus:ring-0"
              />
              <button
                type="submit"
                className="shrink-0 px-4 md:px-5 py-2.5 text-white font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--store-primary)', color: 'var(--store-primary-text)' }}
                aria-label="Buscar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Desktop: CTAs + Favoritos + Carrito + Mi cuenta (orden solicitado) */}
          <div className="hidden md:flex shrink-0 items-center gap-2 lg:gap-3">
            {mainCtas.map((cta) =>
              cta.style === 'button' ? (
                <a
                  key={cta.id}
                  href={cta.href}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--store-accent)', color: 'var(--store-bg)' }}
                >
                  {cta.label}
                </a>
              ) : (
                <a
                  key={cta.id}
                  href={cta.href}
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {cta.label}
                </a>
              ),
            )}

            <button
              type="button"
              onClick={() => setFavoritesOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full text-white/80 hover:bg-white/10 hover:text-white transition-colors relative"
              title="Favoritos"
              aria-label={`Favoritos ${favoritesCount > 0 ? `(${favoritesCount})` : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {favoritesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-white/90 text-[10px] font-bold flex items-center justify-center text-slate-800">
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full text-white/90 hover:bg-white/10 transition-colors relative"
              style={{ backgroundColor: 'var(--store-primary)' }}
              title="Carrito"
              aria-label={`Carrito ${itemCount} productos`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-white text-[10px] font-bold flex items-center justify-center" style={{ color: 'var(--store-primary)' }}>
                {itemCount}
              </span>
            </button>

            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center justify-center w-10 h-10 rounded-full text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="Mi cuenta"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl z-50"
                  role="menu"
                >
                  {user ? (
                    <Link
                      to="/mi-cuenta"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                      role="menuitem"
                    >
                      Mi cuenta
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                        role="menuitem"
                      >
                        Iniciar sesión
                      </Link>
                      <Link
                        to="/registro"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                        role="menuitem"
                      >
                        Registrarse
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile: carrito + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full text-white/90 relative"
              style={{ backgroundColor: 'var(--store-primary)' }}
              aria-label={`Carrito ${itemCount} productos`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-white text-[10px] font-bold flex items-center justify-center" style={{ color: 'var(--store-primary)' }}>
                  {itemCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="flex items-center justify-center w-10 h-10 rounded-full text-white/90 hover:bg-white/10"
              aria-label="Menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Header: solo desktop */}
      <nav
        className="hidden md:block border-b-2 px-4 py-2.5 md:px-6"
        style={{
          backgroundColor: bottomHeaderBg,
          borderBottomColor: 'var(--store-primary)',
        }}
      >
        <div className="mx-auto flex flex-wrap items-center gap-x-4 gap-y-2" style={{ maxWidth: menuMaxWidth }}>
          {ctaButtons.filter((b) => b.highlight).map((btn) => (
            <a
              key={btn.id}
              href={btn.href}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--store-primary)', color: 'var(--store-primary-text)' }}
            >
              {btn.label}
            </a>
          ))}
          {navMenu.map((item) => {
            const hasSub = (item.children?.length ?? 0) > 0;
            const isOpen = openDropdownId === item.id;
            const triggerClass = 'rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors inline-flex items-center gap-1';
            const trigger =
              item.type === 'link' ? (
                <a href={item.href} className={triggerClass}>{item.label}{hasSub && <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}</a>
              ) : (
                <Link to={`/categoria/${item.categorySlug}`} className={triggerClass}>{item.label}{hasSub && <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}</Link>
              );
            if (!hasSub) {
              return item.type === 'link' ? (
                <a key={item.id} href={item.href} className="rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">{item.label}</a>
              ) : (
                <Link key={item.id} to={`/categoria/${item.categorySlug}`} className="rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">{item.label}</Link>
              );
            }
            const isMega = item.dropdownType === 'mega';
            const panelStyle = isMega && item.megaMenuMaxWidth ? { maxWidth: item.megaMenuMaxWidth } : undefined;
            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => { keepDropdownOpen(); setOpenDropdownId(item.id); }}
                onMouseLeave={scheduleCloseDropdown}
              >
                {trigger}
                {isOpen && (
                  <div
                    className="absolute left-0 top-full pt-1 z-50 min-w-[180px]"
                    onMouseEnter={keepDropdownOpen}
                    onMouseLeave={scheduleCloseDropdown}
                  >
                    <div
                      className="rounded-lg border border-white/10 shadow-xl py-2 overflow-hidden"
                      style={{ backgroundColor: 'var(--store-card)', ...panelStyle }}
                    >
                      <div className={isMega ? 'grid gap-1 p-2 grid-cols-3' : 'flex flex-col py-1'}>
                        {item.children!.map((child: NavMenuItem) =>
                          child.type === 'link' ? (
                            <a key={child.id} href={child.href} className="block px-4 py-2 text-sm text-white/90 hover:bg-white/10 truncate">
                              {child.label}
                            </a>
                          ) : (
                            <Link key={child.id} to={`/categoria/${child.categorySlug}`} className="block px-4 py-2 text-sm text-white/90 hover:bg-white/10 truncate">
                              {child.label}
                            </Link>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {ctaButtons.filter((b) => !b.highlight).map((btn) => (
            <a key={btn.id} href={btn.href} className="rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors ml-auto">
              {btn.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={closeMobileMenu} aria-hidden />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-full max-w-sm flex flex-col bg-slate-900 border-r border-slate-700 shadow-xl md:hidden"
            aria-modal="true"
            aria-label="Menú"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <span className="font-semibold text-slate-100">Menú</span>
              <button type="button" onClick={closeMobileMenu} className="p-2 text-slate-400 hover:text-white rounded-full" aria-label="Cerrar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <form onSubmit={(e) => { handleSearchSubmit(e); closeMobileMenu(); }} className="flex rounded-full overflow-hidden border border-slate-600 bg-slate-800/50">
                <input
                  type="search"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-0 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 bg-transparent"
                />
                <button type="submit" className="flex items-center px-3 text-slate-400 hover:text-white" aria-label="Buscar">🔍</button>
              </form>
              <nav className="space-y-1">
                {navMenu.map((item) => {
                  const hasSub = (item.children?.length ?? 0) > 0;
                  const isExpanded = expandedMobileId === item.id;
                  if (!hasSub) {
                    return item.type === 'link' ? (
                      <a key={item.id} href={item.href} onClick={closeMobileMenu} className="block rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                        {item.label}
                      </a>
                    ) : (
                      <Link key={item.id} to={`/categoria/${item.categorySlug}`} onClick={closeMobileMenu} className="block rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                        {item.label}
                      </Link>
                    );
                  }
                  return (
                    <div key={item.id}>
                      <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                        {item.type === 'link' ? (
                          <a href={item.href} onClick={closeMobileMenu} className="flex-1">{item.label}</a>
                        ) : (
                          <Link to={`/categoria/${item.categorySlug}`} onClick={closeMobileMenu} className="flex-1">{item.label}</Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedMobileId((id) => (id === item.id ? null : item.id))}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          aria-expanded={isExpanded}
                        >
                          <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="pl-4 mt-1 space-y-1 border-l border-slate-600">
                          {item.children!.map((child: NavMenuItem) =>
                            child.type === 'link' ? (
                              <a key={child.id} href={child.href} onClick={closeMobileMenu} className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
                                {child.label}
                              </a>
                            ) : (
                              <Link key={child.id} to={`/categoria/${child.categorySlug}`} onClick={closeMobileMenu} className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
                                {child.label}
                              </Link>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
              <div className="border-t border-slate-700 pt-4 space-y-1">
                <button type="button" onClick={() => { setCartOpen(true); closeMobileMenu(); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                  <span className="text-lg">🛒</span> Carrito {itemCount > 0 && `(${itemCount})`}
                </button>
                {user ? (
                  <Link to="/mi-cuenta" onClick={closeMobileMenu} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                    <span className="text-lg">👤</span> Mi cuenta
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={closeMobileMenu} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                      <span className="text-lg">🔑</span> Iniciar sesión
                    </Link>
                    <Link to="/registro" onClick={closeMobileMenu} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                      <span className="text-lg">📝</span> Registrarse
                    </Link>
                  </>
                )}
                <Link to="/favoritos" onClick={closeMobileMenu} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                  <span className="text-lg">♡</span> Favoritos
                </Link>
              </div>
            </div>
          </aside>
        </>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <StoreFooter />

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <FavoritesDrawer isOpen={favoritesOpen} onClose={() => setFavoritesOpen(false)} />
    </div>
  );
};
