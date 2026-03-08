import { useEffect, useState } from 'react';
import { getStorefrontSettings, updateStorefrontSettings } from '@/services/settings';
import type {
  StorefrontSettings,
  NavMenuItem,
  MainHeaderCta,
  BottomHeaderCta,
  ShopFiltersConfig,
  FooterColumn,
  FooterWidget,
  FooterHtmlWidget,
  FooterMenuWidget,
  FooterImageWidget,
  FooterContactWidget,
  FooterLink,
} from '@/services/settings';
import { getCategories } from '@/services/categories';
import { getAttributes, type GlobalAttribute } from '@/services/attributes';
import { MediaLibraryModal } from '@/components/MediaLibraryModal';

const defaultShopFilters: ShopFiltersConfig = {
  showPriceFilter: true,
  showCategoryFilter: true,
  showBrandFilter: true,
  attributeSlugs: [],
};

/** Entrada en lista plana del menú (para mostrar y DnD) */
interface FlatNavEntry {
  path: number[];
  item: NavMenuItem;
  depth: number;
}

function flattenNavMenu(menu: NavMenuItem[], path: number[] = []): FlatNavEntry[] {
  const out: FlatNavEntry[] = [];
  menu.forEach((item, i) => {
    const p = [...path, i];
    out.push({ path: p, item, depth: path.length });
    if (item.children?.length) {
      out.push(...flattenNavMenu(item.children, p));
    }
  });
  return out;
}

function unflattenNavMenu(entries: { item: NavMenuItem; depth: number }[]): NavMenuItem[] {
  const roots: NavMenuItem[] = [];
  const stack: { node: NavMenuItem; depth: number }[] = [];
  for (const { item, depth } of entries) {
    const node: NavMenuItem = { ...item, children: undefined };
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length === 0) {
      roots.push(node);
    } else {
      const parent = stack[stack.length - 1].node;
      const children = parent.children ?? [];
      parent.children = [...children, node];
    }
    stack.push({ node, depth });
  }
  return roots;
}

function pathEquals(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Editor del menú con lista plana, drag-and-drop y subítems */
function NavMenuEditor({
  categories,
  flatEntries,
  onUpdateAtPath,
  onRemoveAtPath,
  onAddSubItemAtPath,
  onMove,
}: {
  categories: Awaited<ReturnType<typeof getCategories>>;
  flatEntries: FlatNavEntry[];
  onUpdateAtPath: (path: number[], updater: (item: NavMenuItem) => NavMenuItem) => void;
  onRemoveAtPath: (path: number[]) => void;
  onAddSubItemAtPath: (path: number[], asLink: boolean) => void;
  onMove: (sourcePath: number[], targetPath: number[], asChild: boolean) => void;
}) {
  const [draggingPath, setDraggingPath] = useState<number[] | null>(null);
  const [dropTarget, setDropTarget] = useState<{ path: number[]; asChild: boolean } | null>(null);

  const handleDragStart = (e: React.DragEvent, path: number[]) => {
    setDraggingPath(path);
    e.dataTransfer.setData('application/json', JSON.stringify(path));
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnd = () => {
    setDraggingPath(null);
    setDropTarget(null);
  };
  const handleDragOver = (e: React.DragEvent, path: number[], asChild: boolean) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    const sourcePath = JSON.parse(raw) as number[];
    if (pathEquals(sourcePath, path) && !asChild) return;
    setDropTarget({ path, asChild });
  };
  const handleDragLeave = () => {
    setDropTarget(null);
  };
  const handleDrop = (e: React.DragEvent, targetPath: number[], asChild: boolean) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    const sourcePath = JSON.parse(raw) as number[];
    onMove(sourcePath, targetPath, asChild);
    setDraggingPath(null);
    setDropTarget(null);
  };

  return (
    <ul className="space-y-1">
      {flatEntries.map(({ path, item, depth }) => {
        const pathKey = path.join('-');
        const isDragging = draggingPath !== null && pathEquals(draggingPath, path);
        const isDropBefore = dropTarget !== null && !dropTarget.asChild && pathEquals(dropTarget.path, path);
        const isDropChild = dropTarget !== null && dropTarget.asChild && pathEquals(dropTarget.path, path);
        const hasChildren = (item.children?.length ?? 0) > 0;

        return (
          <li key={pathKey} className="relative">
            {/* Zona de soltar "antes" */}
            <div
              className={`h-2 -my-1 flex-shrink-0 ${isDropBefore ? 'bg-brand-500/40 rounded' : ''}`}
              onDragOver={(e) => handleDragOver(e, path, false)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, path, false)}
            />
            <div
              className={`flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-3 ${isDragging ? 'opacity-50' : ''} ${isDropChild ? 'ring-2 ring-brand-500' : ''}`}
              style={{ marginLeft: depth * 20 }}
              onDragOver={(e) => handleDragOver(e, path, true)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, path, true)}
            >
              <span
                draggable
                onDragStart={(e) => handleDragStart(e, path)}
                onDragEnd={handleDragEnd}
                className="cursor-grab touch-none text-slate-500 hover:text-slate-400 px-1 -ml-1"
                title="Arrastrar"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 6h2v2H8V6zm0 5h2v2H8v-2zm0 5h2v2H8v-2zm5-10h2v2h-2V6zm0 5h2v2h-2v-2zm0 5h2v2h-2v-2z"/></svg>
              </span>
              {item.type === 'link' ? (
                <>
                  <input
                    value={item.label}
                    onChange={(e) => onUpdateAtPath(path, (n) => ({ ...n, label: e.target.value }))}
                    placeholder="Etiqueta"
                    className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    value={item.href}
                    onChange={(e) => onUpdateAtPath(path, (n) => n.type === 'link' ? { ...n, href: e.target.value } : n)}
                    placeholder="/ruta o https://..."
                    className="flex-1 min-w-0 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                  />
                  <span className="text-[10px] text-slate-500 uppercase">Enlace</span>
                </>
              ) : (
                <>
                  <input
                    value={item.label}
                    onChange={(e) => onUpdateAtPath(path, (n) => ({ ...n, label: e.target.value }))}
                    className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                  />
                  <select
                    value={item.categoryId}
                    onChange={(e) => {
                      const cat = categories.find((c) => c.id === e.target.value);
                      if (cat)
                        onUpdateAtPath(path, (n) => n.type === 'category' ? { ...n, categoryId: cat.id!, categorySlug: cat.slug, label: cat.name } : n);
                    }}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 uppercase">Categoría</span>
                </>
              )}
              {hasChildren && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-500">Desplegable:</span>
                  <select
                    value={item.dropdownType ?? 'simple'}
                    onChange={(e) => onUpdateAtPath(path, (n) => ({ ...n, dropdownType: e.target.value as 'simple' | 'mega' }))}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                  >
                    <option value="simple">Simple</option>
                    <option value="mega">Mega menú</option>
                  </select>
                  {(item.dropdownType === 'mega') && (
                    <input
                      value={item.megaMenuMaxWidth ?? ''}
                      onChange={(e) => onUpdateAtPath(path, (n) => ({ ...n, megaMenuMaxWidth: e.target.value || undefined }))}
                      placeholder="Ancho máx. (ej. 600px)"
                      className="w-28 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                    />
                  )}
                </div>
              )}
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => onAddSubItemAtPath(path, true)}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                  title="Añadir subítem (enlace)"
                >
                  + Sub enlace
                </button>
                <button
                  type="button"
                  onClick={() => onAddSubItemAtPath(path, false)}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                  title="Añadir subítem (categoría)"
                >
                  + Sub cat
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveAtPath(path)}
                  className="text-[11px] text-rose-400 hover:text-rose-300"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type MediaTarget = 'logo' | { type: 'footerImage'; columnIndex: number; widgetIndex: number } | null;

export const AppearancePage = () => {
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof getCategories>>>([]);
  const [attributes, setAttributes] = useState<GlobalAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [mediaTarget, setMediaTarget] = useState<MediaTarget>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getStorefrontSettings(), getCategories(), getAttributes()])
      .then(([s, c, a]) => {
        if (isMounted) {
          setSettings(s);
          setCategories(c);
          setAttributes(a);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveAll = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateStorefrontSettings(settings);
      setMessage({ type: 'ok', text: 'Cambios guardados correctamente.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al guardar.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = (url: string) => {
    const target = mediaTarget;
    setMediaTarget(null);
    if (target === 'logo') {
      setSettings((s) => (s ? { ...s, logoUrl: url } : s));
      return;
    }
    if (target && typeof target === 'object' && target.type === 'footerImage' && settings) {
      const cols = [...(settings.footerColumns ?? [])];
      const col = cols[target.columnIndex];
      if (col?.widgets?.[target.widgetIndex]?.type === 'image') {
        const widgets = [...col.widgets];
        widgets[target.widgetIndex] = { ...widgets[target.widgetIndex], imageUrl: url } as FooterImageWidget;
        cols[target.columnIndex] = { ...col, widgets };
        setSettings({ ...settings, footerColumns: cols });
      }
    }
  };

  const handleAddNavLink = () => {
    if (!settings) return;
    const id = crypto.randomUUID();
    const newItem: NavMenuItem = { type: 'link', id, label: 'Nuevo enlace', href: '#' };
    setSettings({ ...settings, navMenu: [...settings.navMenu, newItem] });
  };

  const handleAddNavCategory = () => {
    if (!settings || categories.length === 0) return;
    const cat = categories[0];
    const id = crypto.randomUUID();
    const newItem: NavMenuItem = {
      type: 'category',
      id,
      label: cat.name,
      categoryId: cat.id!,
      categorySlug: cat.slug,
    };
    setSettings({ ...settings, navMenu: [...settings.navMenu, newItem] });
  };

  /** Actualiza un ítem por path (array de índices: [0], [1,0], etc.) */
  const handleUpdateNavItemAtPath = (path: number[], updater: (item: NavMenuItem) => NavMenuItem) => {
    if (!settings) return;
    const setAt = (menu: NavMenuItem[], [i, ...rest]: number[]): NavMenuItem[] => {
      const next = [...menu];
      if (rest.length === 0) {
        next[i] = updater(menu[i]);
        return next;
      }
      next[i] = { ...menu[i], children: setAt(menu[i].children ?? [], rest) };
      return next;
    };
    setSettings({ ...settings, navMenu: setAt(settings.navMenu, path) });
  };

  /** Elimina ítem (y sus hijos) en path */
  const handleRemoveNavItemAtPath = (path: number[]) => {
    if (!settings) return;
    const removeAt = (menu: NavMenuItem[], [i, ...rest]: number[]): NavMenuItem[] => {
      if (rest.length === 0) return menu.filter((_, idx) => idx !== i);
      const next = [...menu];
      next[i] = { ...menu[i], children: removeAt(menu[i].children ?? [], rest) };
      return next;
    };
    setSettings({ ...settings, navMenu: removeAt(settings.navMenu, path) });
  };

  /** Añade subítem como último hijo del ítem en path */
  const handleAddSubItemAtPath = (path: number[], asLink: boolean) => {
    if (!settings) return;
    const id = crypto.randomUUID();
    const newItem: NavMenuItem = asLink
      ? { type: 'link', id, label: 'Nuevo enlace', href: '#' }
      : (() => {
          const cat = categories[0];
          return { type: 'category' as const, id, label: cat?.name ?? 'Categoría', categoryId: cat?.id ?? '', categorySlug: cat?.slug ?? '' };
        })();
    const addAt = (menu: NavMenuItem[], [i, ...rest]: number[]): NavMenuItem[] => {
      const next = [...menu];
      if (rest.length === 0) {
        next[i] = { ...menu[i], children: [...(menu[i].children ?? []), newItem] };
        return next;
      }
      next[i] = { ...menu[i], children: addAt(menu[i].children ?? [], rest) };
      return next;
    };
    setSettings({ ...settings, navMenu: addAt(settings.navMenu, path) });
  };

  /** Mueve ítem desde sourcePath a antes de targetPath o como hijo de target (asChild) */
  const handleMoveNavItem = (sourcePath: number[], targetPath: number[], asChild: boolean) => {
    if (!settings || pathEquals(sourcePath, targetPath)) return;
    const flat = flattenNavMenu(settings.navMenu);
    const sourceIdx = flat.findIndex((e) => pathEquals(e.path, sourcePath));
    if (sourceIdx < 0) return;
    const removed = flat[sourceIdx];
    const withoutSource = flat.filter((_, i) => i !== sourceIdx);
    const targetIdx = withoutSource.findIndex((e) => pathEquals(e.path, targetPath));
    if (targetIdx < 0) return;
    const targetDepth = withoutSource[targetIdx].depth;
    const insertDepth = asChild ? targetDepth + 1 : targetDepth;
    const insertIdx = asChild ? targetIdx + 1 : targetIdx;
    const newEntries = withoutSource.map((e) => ({ item: e.item, depth: e.depth }));
    newEntries.splice(insertIdx, 0, { item: removed.item, depth: insertDepth });
    const newMenu = unflattenNavMenu(newEntries);
    setSettings({ ...settings, navMenu: newMenu });
  };

  const handleUpdateNavItem = (index: number, item: NavMenuItem) => {
    handleUpdateNavItemAtPath([index], () => item);
  };

  const handleRemoveNavItem = (index: number) => {
    handleRemoveNavItemAtPath([index]);
  };

  const handleAddCta = () => {
    if (!settings) return;
    const id = crypto.randomUUID();
    setSettings({
      ...settings,
      ctaButtons: [...settings.ctaButtons, { id, label: 'Nuevo CTA', href: '#', highlight: false }],
    });
  };

  const handleUpdateCta = (index: number, updates: Partial<BottomHeaderCta>) => {
    if (!settings) return;
    const next = [...settings.ctaButtons];
    next[index] = { ...next[index], ...updates };
    setSettings({ ...settings, ctaButtons: next });
  };

  const handleAddMainCta = () => {
    if (!settings) return;
    const id = crypto.randomUUID();
    setSettings({
      ...settings,
      mainHeaderCtas: [...(settings.mainHeaderCtas ?? []), { id, label: 'Nuevo CTA', href: '#', style: 'button' }],
    });
  };

  const handleUpdateMainCta = (index: number, updates: Partial<MainHeaderCta>) => {
    if (!settings) return;
    const next = [...(settings.mainHeaderCtas ?? [])];
    next[index] = { ...next[index], ...updates };
    setSettings({ ...settings, mainHeaderCtas: next });
  };

  const handleRemoveMainCta = (index: number) => {
    if (!settings) return;
    const next = (settings.mainHeaderCtas ?? []).filter((_, i) => i !== index);
    setSettings({ ...settings, mainHeaderCtas: next });
  };

  const handleRemoveCta = (index: number) => {
    if (!settings) return;
    const next = settings.ctaButtons.filter((_, i) => i !== index);
    setSettings({ ...settings, ctaButtons: next });
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Apariencia</h1>
          <p className="text-sm text-slate-400 mt-1">
            Logo, menú de navegación, marquesina, carrusel y botones CTA de la tienda pública.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            message.type === 'ok'
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
              : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Logo + Tagline */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">Logo del header</h2>
        <div className="flex items-center gap-4">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo actual"
              className="h-16 object-contain rounded border border-slate-700"
            />
          ) : (
            <div className="h-16 w-32 rounded border border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-xs">
              Sin logo
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMediaTarget('logo')}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              {settings.logoUrl ? 'Cambiar' : 'Subir'} logo
            </button>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Tagline (bajo el logo)
          </label>
          <input
            value={settings.logoTagline ?? ''}
            onChange={(e) => setSettings((s) => (s ? { ...s, logoTagline: e.target.value } : s))}
            placeholder="Ej: EL REY DE LOS NEUMÁTICOS"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">Top Header (marquesina)</h2>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Mensaje (puedes usar HTML: &lt;strong&gt;, &lt;span&gt;, &lt;br&gt;, etc.)
          </label>
          <textarea
            value={settings.marqueeMessage}
            onChange={(e) => setSettings((s) => (s ? { ...s, marqueeMessage: e.target.value } : s))}
            placeholder="Ej: <strong>BBVA</strong> ¡Hasta 12 cuotas sin interés!"
            rows={3}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600 font-mono"
          />
        </div>
      </section>

      {/* Main Header: placeholder búsqueda + CTAs */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">Main Header (logo ya configurado arriba)</h2>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Placeholder del buscador central
          </label>
          <input
            value={settings.searchPlaceholder ?? ''}
            onChange={(e) => setSettings((s) => (s ? { ...s, searchPlaceholder: e.target.value } : s))}
            placeholder="Ej: Buscá por marca, medida o modelo de auto..."
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
              CTAs del Main Header (botón destacado, chat, etc.)
            </span>
            <button
              type="button"
              onClick={handleAddMainCta}
              className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
            >
              + Añadir
            </button>
          </div>
          <ul className="space-y-2">
            {(settings.mainHeaderCtas ?? []).map((cta, i) => (
              <li key={cta.id} className="flex flex-wrap gap-2 items-center rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                <input
                  value={cta.label}
                  onChange={(e) => handleUpdateMainCta(i, { label: e.target.value })}
                  placeholder="Texto"
                  className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                />
                <input
                  value={cta.href}
                  onChange={(e) => handleUpdateMainCta(i, { href: e.target.value })}
                  placeholder="URL"
                  className="flex-1 min-w-0 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                />
                <select
                  value={cta.style}
                  onChange={(e) => handleUpdateMainCta(i, { style: e.target.value as 'button' | 'link' })}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                >
                  <option value="button">Botón destacado</option>
                  <option value="link">Enlace texto</option>
                </select>
                <button type="button" onClick={() => handleRemoveMainCta(i)} className="text-[11px] text-rose-400 hover:text-rose-300">
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Fondos del header y ancho del menú */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">Fondos del header y ancho del menú</h2>
        <p className="text-xs text-slate-500">
          Color de fondo para cada zona del header. Ancho máximo del contenedor (logo, búsqueda, menú).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(
            [
              ['topHeader', 'Top header (marquesina)', settings.headerBackgrounds?.topHeader ?? settings.colorPalette.cardBackground],
              ['mainHeader', 'Main header (logo y búsqueda)', settings.headerBackgrounds?.mainHeader ?? settings.colorPalette.cardBackground],
              ['bottomHeader', 'Bottom header (menú)', settings.headerBackgrounds?.bottomHeader ?? settings.colorPalette.cardBackground],
            ] as const
          ).map(([key, label, value]) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={value}
                onChange={(e) => {
                  const v = e.target.value;
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          headerBackgrounds: {
                            ...(s.headerBackgrounds ?? {
                              topHeader: s.colorPalette.cardBackground,
                              mainHeader: s.colorPalette.cardBackground,
                              bottomHeader: s.colorPalette.cardBackground,
                            }),
                            [key]: v,
                          },
                        }
                      : s,
                  );
                }}
                className="h-9 w-14 rounded border border-slate-700 cursor-pointer shrink-0"
              />
              <div className="min-w-0">
                <label className="text-[11px] text-slate-400 block">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            headerBackgrounds: {
                              ...(s.headerBackgrounds ?? {
                                topHeader: s.colorPalette.cardBackground,
                                mainHeader: s.colorPalette.cardBackground,
                                bottomHeader: s.colorPalette.cardBackground,
                              }),
                              [key]: v,
                            },
                          }
                        : s,
                    );
                  }}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                />
              </div>
            </div>
          ))}
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Ancho máximo del menú / header
          </label>
          <select
            value={settings.menuMaxWidth ?? '1280px'}
            onChange={(e) => setSettings((s) => (s ? { ...s, menuMaxWidth: e.target.value } : s))}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-600"
          >
            <option value="1024px">Estrecho (1024px)</option>
            <option value="1280px">Normal (1280px)</option>
            <option value="1536px">Ancho (1536px)</option>
            <option value="100%">Completo (100%)</option>
          </select>
        </div>
      </section>

      {/* Menú de navegación */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Menú de navegación</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Arrastra para reordenar o para meter un ítem dentro de otro (submenú). Los ítems con subítems pueden ser desplegable simple o mega menú.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddNavLink}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              + Enlace
            </button>
            <button
              type="button"
              onClick={handleAddNavCategory}
              disabled={categories.length === 0}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              + Categoría
            </button>
          </div>
        </div>
        <NavMenuEditor
          categories={categories}
          flatEntries={flattenNavMenu(settings.navMenu)}
          onUpdateAtPath={handleUpdateNavItemAtPath}
          onRemoveAtPath={handleRemoveNavItemAtPath}
          onAddSubItemAtPath={handleAddSubItemAtPath}
          onMove={handleMoveNavItem}
        />
        {settings.navMenu.length === 0 && (
          <p className="text-xs text-slate-500">Añade enlaces o categorías al menú.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
        <p className="text-xs text-slate-500">
          El carrusel de la portada y el contenido HTML debajo se configuran en{' '}
          <strong>Sitio Web → Páginas</strong>, editando la página <strong>Inicio</strong>.
        </p>
      </section>

      {/* Botones CTA (Bottom Header) */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Botones CTA (Bottom Header)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enlaces del menú inferior. Marca &quot;Destacado&quot; para mostrarlos como pill (ej. OFERTAS BOMBA).
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddCta}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            + Añadir CTA
          </button>
        </div>
        <ul className="space-y-2">
          {settings.ctaButtons.map((btn, index) => (
            <li
              key={btn.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-3"
            >
              <input
                value={btn.label}
                onChange={(e) => handleUpdateCta(index, { label: e.target.value })}
                placeholder="Texto del botón"
                className="w-36 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              />
              <input
                value={btn.href}
                onChange={(e) => handleUpdateCta(index, { href: e.target.value })}
                placeholder="URL"
                className="flex-1 min-w-0 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              />
              <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  checked={!!btn.highlight}
                  onChange={(e) => handleUpdateCta(index, { highlight: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-brand-500"
                />
                Destacado (pill)
              </label>
              <button
                type="button"
                onClick={() => handleRemoveCta(index)}
                className="text-[11px] text-rose-400 hover:text-rose-300"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Filtros de la página Tienda */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">Filtros de la página Tienda</h2>
        <p className="text-xs text-slate-500">
          Configura la barra lateral de filtros en <strong>/tienda</strong>. Solo se muestran categorías y términos de atributos que tienen productos asignados.
        </p>
        {(() => {
          const shopFilters = settings.shopFilters ?? defaultShopFilters;
          return (
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shopFilters.showPriceFilter}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            shopFilters: {
                              ...(s.shopFilters ?? defaultShopFilters),
                              showPriceFilter: e.target.checked,
                            },
                          }
                        : s,
                    )
                  }
                  className="rounded border-slate-600 bg-slate-900 text-brand-500"
                />
                <span className="text-sm text-slate-200">Mostrar filtro por precio (mín/máx)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shopFilters.showCategoryFilter}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            shopFilters: {
                              ...(s.shopFilters ?? defaultShopFilters),
                              showCategoryFilter: e.target.checked,
                            },
                          }
                        : s,
                    )
                  }
                  className="rounded border-slate-600 bg-slate-900 text-brand-500"
                />
                <span className="text-sm text-slate-200">Mostrar filtro por categorías</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shopFilters.showBrandFilter}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            shopFilters: {
                              ...(s.shopFilters ?? defaultShopFilters),
                              showBrandFilter: e.target.checked,
                            },
                          }
                        : s,
                    )
                  }
                  className="rounded border-slate-600 bg-slate-900 text-brand-500"
                />
                <span className="text-sm text-slate-200">Mostrar filtro por marcas</span>
              </label>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-2">
                  Atributos como filtros (marca los que quieras mostrar)
                </span>
                <div className="flex flex-wrap gap-3">
                  {attributes.map((attr) => {
                    const slug = attr.slug || attr.name?.toLowerCase?.().replace(/\s+/g, '-') || '';
                    const isSelected = (shopFilters.attributeSlugs ?? []).includes(slug);
                    return (
                      <label key={attr.id ?? slug} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSettings((s) => {
                              if (!s) return s;
                              const current = s.shopFilters ?? defaultShopFilters;
                              const slugs = current.attributeSlugs ?? [];
                              const next = isSelected
                                ? slugs.filter((x) => x !== slug)
                                : [...slugs, slug];
                              return {
                                ...s,
                                shopFilters: { ...current, attributeSlugs: next },
                              };
                            });
                          }}
                          className="rounded border-slate-600 bg-slate-900 text-brand-500"
                        />
                        <span className="text-sm text-slate-300">{attr.name}</span>
                        {slug && <span className="text-[10px] text-slate-500">({slug})</span>}
                      </label>
                    );
                  })}
                </div>
                {attributes.length === 0 && (
                  <p className="text-xs text-slate-500">Crea atributos en Atributos para poder usarlos como filtros.</p>
                )}
              </div>
            </div>
          );
        })()}
      </section>

      {/* Footer */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-6">
        <h2 className="text-sm font-semibold text-slate-100">Footer</h2>
        <p className="text-xs text-slate-500">
          Columnas con widgets (HTML, menú, imagen, contacto). Copywriting abajo.
        </p>
        <div>
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Copyright / Copywriting (puede incluir HTML)
          </label>
          <input
            value={settings.footerCopyright ?? ''}
            onChange={(e) => setSettings((s) => (s ? { ...s, footerCopyright: e.target.value } : s))}
            placeholder="© 2025 Mi Tienda. Todos los derechos reservados."
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Columnas</span>
            <button
              type="button"
              onClick={() => {
                const cols = settings.footerColumns ?? [];
                setSettings((s) => (s ? { ...s, footerColumns: [...cols, { id: crypto.randomUUID(), title: '', widgets: [] }] } : s));
              }}
              className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
            >
              + Añadir columna
            </button>
          </div>
          <div className="space-y-4">
            {(settings.footerColumns ?? []).map((col, colIndex) => (
              <div key={col.id} className="rounded-lg border border-slate-700 bg-slate-900/80 p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    value={col.title ?? ''}
                    onChange={(e) => {
                      const cols = [...(settings.footerColumns ?? [])];
                      cols[colIndex] = { ...col, title: e.target.value };
                      setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                    }}
                    placeholder="Título de columna (opcional)"
                    className="flex-1 min-w-[160px] rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cols = (settings.footerColumns ?? []).filter((_, i) => i !== colIndex);
                      setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300"
                  >
                    Eliminar columna
                  </button>
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-500 block">Widgets</span>
                  <select
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                    value=""
                    onChange={(e) => {
                      const type = e.target.value as 'html' | 'menu' | 'image' | 'contact';
                      e.target.value = '';
                      if (!type) return;
                      const id = crypto.randomUUID();
                      let widget: FooterWidget;
                      if (type === 'html') widget = { type: 'html', id, content: '' };
                      else if (type === 'menu') widget = { type: 'menu', id, title: '', items: [] };
                      else if (type === 'image') widget = { type: 'image', id, imageUrl: '' };
                      else widget = { type: 'contact', id, title: '' };
                      const cols = [...(settings.footerColumns ?? [])];
                      cols[colIndex] = { ...col, widgets: [...col.widgets, widget] };
                      setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                    }}
                  >
                    <option value="">+ Añadir widget...</option>
                    <option value="html">Contenido HTML</option>
                    <option value="menu">Menú de enlaces</option>
                    <option value="image">Imagen / logo</option>
                    <option value="contact">Datos de contacto</option>
                  </select>
                  {col.widgets.map((widget, wIdx) => (
                    <div key={widget.id} className="rounded border border-slate-700 bg-slate-800/50 p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-400">
                          {widget.type === 'html' && 'HTML'}
                          {widget.type === 'menu' && 'Menú'}
                          {widget.type === 'image' && 'Imagen'}
                          {widget.type === 'contact' && 'Contacto'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const cols = [...(settings.footerColumns ?? [])];
                            cols[colIndex] = { ...col, widgets: col.widgets.filter((_, i) => i !== wIdx) };
                            setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                          }}
                          className="text-[11px] text-rose-400 hover:text-rose-300"
                        >
                          Quitar
                        </button>
                      </div>
                      {widget.type === 'html' && (
                        <textarea
                          value={(widget as FooterHtmlWidget).content}
                          onChange={(e) => {
                            const cols = [...(settings.footerColumns ?? [])];
                            const widgets = [...cols[colIndex].widgets];
                            widgets[wIdx] = { ...widget, content: e.target.value };
                            cols[colIndex] = { ...col, widgets };
                            setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                          }}
                          rows={3}
                          placeholder="<p>HTML aquí</p>"
                          className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 font-mono"
                        />
                      )}
                      {widget.type === 'menu' && (
                        <div className="space-y-2">
                          <input
                            value={(widget as FooterMenuWidget).title ?? ''}
                            onChange={(e) => {
                              const cols = [...(settings.footerColumns ?? [])];
                              const widgets = [...cols[colIndex].widgets];
                              widgets[wIdx] = { ...widget, title: e.target.value };
                              cols[colIndex] = { ...col, widgets };
                              setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                            }}
                            placeholder="Título del menú"
                            className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                          />
                          {(widget as FooterMenuWidget).items.map((item, i) => (
                            <div key={i} className="flex gap-2">
                              <input value={item.label} onChange={(e) => {
                                const cols = [...(settings.footerColumns ?? [])];
                                const w = cols[colIndex].widgets[wIdx] as FooterMenuWidget;
                                const items = [...w.items];
                                items[i] = { ...items[i], label: e.target.value };
                                cols[colIndex].widgets[wIdx] = { ...w, items };
                                setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                              }} placeholder="Texto" className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100" />
                              <input value={item.href} onChange={(e) => {
                                const cols = [...(settings.footerColumns ?? [])];
                                const w = cols[colIndex].widgets[wIdx] as FooterMenuWidget;
                                const items = [...w.items];
                                items[i] = { ...items[i], href: e.target.value };
                                cols[colIndex].widgets[wIdx] = { ...w, items };
                                setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                              }} placeholder="URL" className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100" />
                            </div>
                          ))}
                          <button type="button" onClick={() => {
                            const cols = [...(settings.footerColumns ?? [])];
                            const w = cols[colIndex].widgets[wIdx] as FooterMenuWidget;
                            cols[colIndex].widgets[wIdx] = { ...w, items: [...(w.items ?? []), { label: '', href: '#' }] };
                            setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                          }} className="text-xs text-brand-400 hover:text-brand-300">+ Enlace</button>
                        </div>
                      )}
                      {widget.type === 'image' && (
                        <div className="space-y-2">
                          {(widget as FooterImageWidget).imageUrl ? (
                            <img src={(widget as FooterImageWidget).imageUrl} alt="" className="h-12 object-contain rounded border border-slate-600" />
                          ) : null}
                          <button type="button" onClick={() => setMediaTarget({ type: 'footerImage', columnIndex: colIndex, widgetIndex: wIdx })} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200">
                            {(widget as FooterImageWidget).imageUrl ? 'Cambiar imagen' : 'Elegir imagen'}
                          </button>
                          <input value={(widget as FooterImageWidget).link ?? ''} onChange={(e) => {
                            const cols = [...(settings.footerColumns ?? [])];
                            const widgets = [...cols[colIndex].widgets];
                            widgets[wIdx] = { ...widget, link: e.target.value };
                            cols[colIndex] = { ...col, widgets };
                            setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                          }} placeholder="Enlace (opcional)" className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100" />
                          <input value={(widget as FooterImageWidget).alt ?? ''} onChange={(e) => {
                            const cols = [...(settings.footerColumns ?? [])];
                            const widgets = [...cols[colIndex].widgets];
                            widgets[wIdx] = { ...widget, alt: e.target.value };
                            cols[colIndex] = { ...col, widgets };
                            setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                          }} placeholder="Alt (opcional)" className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100" />
                        </div>
                      )}
                      {widget.type === 'contact' && (
                        <div className="space-y-2">
                          <input value={(widget as FooterContactWidget).title ?? ''} onChange={(e) => {
                            const cols = [...(settings.footerColumns ?? [])];
                            const widgets = [...cols[colIndex].widgets];
                            widgets[wIdx] = { ...widget, title: e.target.value };
                            cols[colIndex] = { ...col, widgets };
                            setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                          }} placeholder="Título (opcional)" className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100" />
                          <input value={(widget as FooterContactWidget).address ?? ''} onChange={(e) => {
                            const cols = [...(settings.footerColumns ?? [])];
                            const widgets = [...cols[colIndex].widgets];
                            widgets[wIdx] = { ...widget, address: e.target.value };
                            cols[colIndex] = { ...col, widgets };
                            setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                          }} placeholder="Dirección" className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100" />
                          <input value={(widget as FooterContactWidget).phone ?? ''} onChange={(e) => {
                            const cols = [...(settings.footerColumns ?? [])];
                            const widgets = [...cols[colIndex].widgets];
                            widgets[wIdx] = { ...widget, phone: e.target.value };
                            cols[colIndex] = { ...col, widgets };
                            setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                          }} placeholder="Teléfono" className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100" />
                          <input value={(widget as FooterContactWidget).email ?? ''} onChange={(e) => {
                            const cols = [...(settings.footerColumns ?? [])];
                            const widgets = [...cols[colIndex].widgets];
                            widgets[wIdx] = { ...widget, email: e.target.value };
                            cols[colIndex] = { ...col, widgets };
                            setSettings((s) => (s ? { ...s, footerColumns: cols } : s));
                          }} placeholder="Email" className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Paleta de colores */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">Paleta de colores (tienda)</h2>
        <p className="text-xs text-slate-500">
          Colores globales de la tienda. Usa códigos hex (ej: #0f172a).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(
            [
              ['pageBackground', 'Fondo de página', settings.colorPalette.pageBackground],
              ['cardBackground', 'Fondo tarjetas', settings.colorPalette.cardBackground],
              ['primaryAction', 'Botones / CTA', settings.colorPalette.primaryAction],
              ['primaryActionText', 'Texto sobre CTA', settings.colorPalette.primaryActionText],
              ['accent', 'Acento', settings.colorPalette.accent],
            ] as const
          ).map(([key, label, value]) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={value}
                onChange={(e) => {
                  const v = e.target.value;
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          colorPalette: {
                            ...s.colorPalette,
                            [key]: v,
                          },
                        }
                      : s,
                  );
                }}
                className="h-9 w-14 rounded border border-slate-700 cursor-pointer"
              />
              <div className="flex-1">
                <label className="text-[11px] text-slate-400 block">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            colorPalette: {
                              ...s.colorPalette,
                              [key]: v,
                            },
                          }
                        : s,
                    );
                  }}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <MediaLibraryModal
        isOpen={mediaTarget === 'logo' || (mediaTarget != null && typeof mediaTarget === 'object' && mediaTarget.type === 'footerImage')}
        onClose={() => setMediaTarget(null)}
        onSelect={handleLogoSelect}
      />
    </div>
  );
};
