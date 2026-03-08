import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'settings';
const STOREFRONT_DOC_ID = 'storefront';

/** Item del menú de navegación: enlace fijo o categoría dinámica; puede tener subitems */
export type NavMenuItem =
  | {
      type: 'link';
      id: string;
      label: string;
      href: string;
      children?: NavMenuItem[];
      /** Solo aplica si tiene children */
      dropdownType?: 'simple' | 'mega';
      /** Ancho máximo del mega menú en desktop (ej: 600px, 80rem). Solo si dropdownType === 'mega' */
      megaMenuMaxWidth?: string;
    }
  | {
      type: 'category';
      id: string;
      label: string;
      categoryId: string;
      categorySlug: string;
      children?: NavMenuItem[];
      dropdownType?: 'simple' | 'mega';
      megaMenuMaxWidth?: string;
    };

/** Paleta de colores global de la tienda (CSS o clases Tailwind / valores hex) */
export interface StorefrontColorPalette {
  /** Fondo general de páginas */
  pageBackground: string;
  /** Fondo de tarjetas de producto y bloques */
  cardBackground: string;
  /** Color principal de botones y CTAs */
  primaryAction: string;
  /** Texto sobre primaryAction */
  primaryActionText: string;
  /** Color de acento secundario (enlaces, hovers) */
  accent: string;
}

/** Fondos personalizados para cada zona del header */
export interface HeaderBackgrounds {
  topHeader: string;
  mainHeader: string;
  bottomHeader: string;
}

/** CTA del Main Header (botón verde tipo "¿Qué lleva mi auto?", chat, etc.) */
export interface MainHeaderCta {
  id: string;
  label: string;
  href: string;
  /** 'button' = botón destacado, 'link' = enlace texto */
  style: 'button' | 'link';
}

/** CTA del Bottom Header: puede ser pill destacado o enlace normal */
export interface BottomHeaderCta {
  id: string;
  label: string;
  href: string;
  /** true = pill/button destacado (ej. OFERTAS BOMBA) */
  highlight?: boolean;
}

/** Enlace simple para menús del footer */
export interface FooterLink {
  label: string;
  href: string;
}

/** Widget de tipo HTML inyectado */
export interface FooterHtmlWidget {
  type: 'html';
  id: string;
  content: string;
}

/** Widget de menú de enlaces */
export interface FooterMenuWidget {
  type: 'menu';
  id: string;
  title?: string;
  items: FooterLink[];
}

/** Widget de imagen (logo, etc.) */
export interface FooterImageWidget {
  type: 'image';
  id: string;
  imageUrl: string;
  link?: string;
  alt?: string;
}

/** Widget de datos de contacto */
export interface FooterContactWidget {
  type: 'contact';
  id: string;
  title?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export type FooterWidget =
  | FooterHtmlWidget
  | FooterMenuWidget
  | FooterImageWidget
  | FooterContactWidget;

/** Columna del footer (agrupa widgets) */
export interface FooterColumn {
  id: string;
  title?: string;
  widgets: FooterWidget[];
}

/** Configuración de la barra de filtros de la página Tienda */
export interface ShopFiltersConfig {
  /** Mostrar filtro por precio (min/max) */
  showPriceFilter: boolean;
  /** Mostrar filtro por categorías (solo categorías con productos) */
  showCategoryFilter: boolean;
  /** Mostrar filtro por marcas (solo marcas con productos) */
  showBrandFilter: boolean;
  /** Slugs de atributos globales a mostrar como filtros (orden de aparición) */
  attributeSlugs: string[];
}

export interface StorefrontSettings {
  /** URL del logo del header */
  logoUrl: string;
  /** Tagline bajo el logo (ej. "EL REY DE LOS NEUMÁTICOS") */
  logoTagline: string;
  /** Mensaje de la marquesina (top header). Puede contener HTML para dar formato. */
  marqueeMessage: string;
  /** Placeholder del buscador central */
  searchPlaceholder: string;
  /** CTAs del Main Header (botón principal, chat, etc.) */
  mainHeaderCtas: MainHeaderCta[];
  /** Items del menú de navegación (Bottom Header) */
  navMenu: NavMenuItem[];
  /** URLs de imágenes del carrusel de la portada */
  carouselImages: string[];
  /** Paleta de colores */
  colorPalette: StorefrontColorPalette;
  /** Botones CTA del Bottom Header (enlaces + opcional pill destacado) */
  ctaButtons: BottomHeaderCta[];
  /** Fondos de color para Top, Main y Bottom header. Si no se definen, se usa cardBackground. */
  headerBackgrounds?: HeaderBackgrounds;
  /** Ancho máximo del contenedor del menú/header (ej: "1280px", "80rem", "100%") */
  menuMaxWidth?: string;
  /** Configuración de la barra lateral de filtros de la página Tienda */
  shopFilters?: ShopFiltersConfig;
  /** Columnas del footer (cada una con widgets: HTML, menú, imagen, contacto) */
  footerColumns?: FooterColumn[];
  /** Texto de copyright / copywriting (ej. © 2025 Mi Tienda) */
  footerCopyright?: string;
  updatedAt?: string;
}

const defaultColorPalette: StorefrontColorPalette = {
  pageBackground: '#0f172a',
  cardBackground: '#1e293b',
  primaryAction: '#0d9488',
  primaryActionText: '#ffffff',
  accent: '#2dd4bf',
};

const defaultShopFilters: ShopFiltersConfig = {
  showPriceFilter: true,
  showCategoryFilter: true,
  showBrandFilter: true,
  attributeSlugs: [],
};

const defaultSettings: StorefrontSettings = {
  logoUrl: '',
  logoTagline: '',
  marqueeMessage: '',
  searchPlaceholder: 'Buscar productos...',
  mainHeaderCtas: [],
  navMenu: [],
  carouselImages: [],
  colorPalette: defaultColorPalette,
  ctaButtons: [],
  headerBackgrounds: undefined,
  menuMaxWidth: '1280px',
  shopFilters: defaultShopFilters,
  footerColumns: [],
  footerCopyright: '',
};

function normalizeNavItem(raw: unknown): NavMenuItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  const label = typeof o.label === 'string' ? o.label : '';
  const type = o.type === 'category' ? 'category' : 'link';
  const childrenRaw = Array.isArray(o.children) ? o.children : [];
  const children = childrenRaw.map(normalizeNavItem).filter((n): n is NavMenuItem => n != null);
  const base = {
    id,
    label,
    children: children.length ? children : undefined,
    dropdownType: o.dropdownType === 'mega' ? 'mega' : 'simple',
    megaMenuMaxWidth: typeof o.megaMenuMaxWidth === 'string' ? o.megaMenuMaxWidth : undefined,
  };
  if (type === 'category') {
    const categoryId = typeof o.categoryId === 'string' ? o.categoryId : '';
    const categorySlug = typeof o.categorySlug === 'string' ? o.categorySlug : '';
    return { type: 'category', ...base, categoryId, categorySlug };
  }
  const href = typeof o.href === 'string' ? o.href : '#';
  return { type: 'link', ...base, href };
}

function normalizeNavMenu(raw: unknown): NavMenuItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeNavItem).filter((n): n is NavMenuItem => n != null);
}

/** Elimina recursivamente las claves con valor undefined para que Firestore no rechace el documento */
function stripUndefined<T>(value: T): T {
  if (value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Lee el documento único de configuración del storefront desde Firestore.
 * Si no existe, devuelve valores por defecto.
 */
export const getStorefrontSettings = async (): Promise<StorefrontSettings> => {
  const ref = doc(db, COLLECTION, STOREFRONT_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { ...defaultSettings };
  }
  const data = snap.data() as Partial<StorefrontSettings>;
  const ctaButtons = (data.ctaButtons ?? []).map((b: Partial<BottomHeaderCta> & { label?: string; href?: string }) => ({
    id: b.id ?? '',
    label: b.label ?? '',
    href: b.href ?? '#',
    highlight: b.highlight ?? false,
  }));
  const shopFilters: ShopFiltersConfig = data.shopFilters
    ? {
        showPriceFilter: data.shopFilters.showPriceFilter ?? defaultShopFilters.showPriceFilter,
        showCategoryFilter: data.shopFilters.showCategoryFilter ?? defaultShopFilters.showCategoryFilter,
        showBrandFilter: data.shopFilters.showBrandFilter ?? defaultShopFilters.showBrandFilter,
        attributeSlugs: Array.isArray(data.shopFilters.attributeSlugs) ? data.shopFilters.attributeSlugs : defaultShopFilters.attributeSlugs,
      }
    : defaultShopFilters;

  const navMenu = normalizeNavMenu(data.navMenu);

  const footerColumns = Array.isArray(data.footerColumns)
    ? (data.footerColumns as FooterColumn[]).map((col) => ({
        id: col.id ?? '',
        title: col.title ?? '',
        widgets: Array.isArray(col.widgets) ? col.widgets : [],
      }))
    : [];

  return {
    ...defaultSettings,
    ...data,
    logoTagline: data.logoTagline ?? '',
    searchPlaceholder: data.searchPlaceholder ?? defaultSettings.searchPlaceholder,
    mainHeaderCtas: data.mainHeaderCtas ?? [],
    navMenu,
    colorPalette: { ...defaultColorPalette, ...data.colorPalette },
    ctaButtons,
    headerBackgrounds: data.headerBackgrounds,
    menuMaxWidth: data.menuMaxWidth ?? defaultSettings.menuMaxWidth,
    shopFilters,
    footerColumns,
    footerCopyright: data.footerCopyright ?? '',
  };
};

/**
 * Actualiza el documento de configuración del storefront en Firestore.
 */
export const updateStorefrontSettings = async (
  payload: Partial<StorefrontSettings>,
): Promise<void> => {
  const ref = doc(db, COLLECTION, STOREFRONT_DOC_ID);
  const current = await getStorefrontSettings();
  const next: StorefrontSettings = {
    ...current,
    ...payload,
    colorPalette: { ...current.colorPalette, ...payload.colorPalette },
    updatedAt: new Date().toISOString(),
  };
  const cleaned = stripUndefined(next) as Record<string, unknown>;
  await setDoc(ref, cleaned);
};
