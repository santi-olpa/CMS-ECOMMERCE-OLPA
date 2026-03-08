import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'pages';

export type PageStatus = 'publicado' | 'borrador' | 'papelera';
export type PageType = 'system' | 'custom';

export interface Page {
  id?: string;
  title: string;
  slug: string;
  type: PageType;
  content: string;
  headInject: string;
  bodyInject: string;
  status: PageStatus;
  createdAt: string;
  /** Solo para página de inicio (slug 'inicio'): imágenes del carrusel */
  carouselImages?: string[];
}

export interface PagePayload {
  title: string;
  slug: string;
  type: PageType;
  content: string;
  headInject: string;
  bodyInject: string;
  status: PageStatus;
  carouselImages?: string[];
}

const stripUndefined = <T extends Record<string, unknown>>(obj: T): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key as keyof T];
    if (value !== undefined) cleaned[key] = value;
  });
  return cleaned;
};

const colRef = collection(db, COLLECTION);

const SYSTEM_SLUGS = ['inicio', 'tienda', 'carrito', 'checkout'] as const;
const SYSTEM_TITLES: Record<string, string> = {
  inicio: 'Inicio',
  tienda: 'Tienda',
  carrito: 'Carrito',
  checkout: 'Checkout',
};

export async function getPages(): Promise<(Page & { id: string })[]> {
  const snapshot = await getDocs(colRef);
  const list = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      carouselImages: Array.isArray(data?.carouselImages) ? data.carouselImages : undefined,
    } as Page & { id: string };
  });
  list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return list;
}

export async function getPageById(id: string): Promise<(Page & { id: string }) | null> {
  const ref = doc(colRef, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    carouselImages: Array.isArray(data?.carouselImages) ? data.carouselImages : undefined,
  } as Page & { id: string };
}

export async function getPageBySlug(slug: string): Promise<(Page & { id: string }) | null> {
  const q = query(colRef, where('slug', '==', slug));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  const data = d.data();
  return {
    id: d.id,
    ...data,
    carouselImages: Array.isArray(data?.carouselImages) ? data.carouselImages : undefined,
  } as Page & { id: string };
}

export async function getPublishedPageBySlug(
  slug: string,
): Promise<(Page & { id: string }) | null> {
  const q = query(
    colRef,
    where('slug', '==', slug),
    where('status', '==', 'publicado'),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  const data = d.data();
  return {
    id: d.id,
    ...data,
    carouselImages: Array.isArray(data?.carouselImages) ? data.carouselImages : undefined,
  } as Page & { id: string };
}

export async function createPage(payload: PagePayload): Promise<string> {
  const data = stripUndefined({
    ...payload,
    createdAt: new Date().toISOString(),
  } as Record<string, unknown>);
  const ref = await addDoc(colRef, data);
  return ref.id;
}

export async function updatePage(id: string, payload: Partial<PagePayload>): Promise<void> {
  const ref = doc(colRef, id);
  const data = stripUndefined(payload as Record<string, unknown>);
  await updateDoc(ref, data);
}

export async function deletePage(id: string): Promise<void> {
  const ref = doc(colRef, id);
  await deleteDoc(ref);
}

/** Asegura que existan las páginas de sistema; se llama al montar el listado. */
export async function ensureSystemPages(): Promise<void> {
  for (const slug of SYSTEM_SLUGS) {
    const existing = await getPageBySlug(slug);
    if (existing) continue;
    await addDoc(colRef, {
      title: SYSTEM_TITLES[slug] ?? slug,
      slug,
      type: 'system',
      content: '',
      headInject: '',
      bodyInject: '',
      status: 'publicado',
      createdAt: new Date().toISOString(),
    });
  }
}

export function isSystemSlug(slug: string): boolean {
  return SYSTEM_SLUGS.includes(slug as (typeof SYSTEM_SLUGS)[number]);
}
