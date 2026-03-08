import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { getProducts } from './products';
import type { Category } from '@/features/categories/types';

const COLLECTION = 'categories';

const stripUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const cleaned: Record<string, unknown> = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key as keyof T];
    if (value !== undefined) cleaned[key] = value;
  });
  return cleaned as T;
};

const colRef = collection(db, COLLECTION);

export const getCategories = async (): Promise<Category[]> => {
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  const ref = doc(colRef, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Category;
};

export const createCategory = async (
  payload: Omit<Category, 'id'>,
): Promise<string> => {
  const data = stripUndefined(payload as Record<string, unknown>);
  const ref = await addDoc(colRef, data);
  return ref.id;
};

export const updateCategory = async (
  id: string,
  payload: Partial<Omit<Category, 'id'>>,
): Promise<void> => {
  const ref = doc(colRef, id);
  const data = stripUndefined(payload as Record<string, unknown>);
  await updateDoc(ref, data);
};

export const deleteCategory = async (id: string): Promise<void> => {
  const ref = doc(colRef, id);
  await deleteDoc(ref);
};

/**
 * Cuenta productos cuyo array `categories` contiene el slug dado
 * y que no están en papelera (status !== 'papelera').
 */
export const getProductCountByCategory = async (
  categorySlug: string,
): Promise<number> => {
  const products = await getProducts();
  return products.filter(
    (p) =>
      p.status !== 'papelera' &&
      Array.isArray(p.categories) &&
      p.categories.includes(categorySlug),
  ).length;
};

/**
 * Devuelve un mapa slug -> conteo de productos activos (sin papelera).
 */
export const getProductCountsByCategorySlug = async (): Promise<
  Record<string, number>
> => {
  const products = await getProducts();
  const active = products.filter((p) => p.status !== 'papelera');
  const counts: Record<string, number> = {};
  active.forEach((p) => {
    if (!Array.isArray(p.categories)) return;
    p.categories.forEach((slug: string) => {
      counts[slug] = (counts[slug] ?? 0) + 1;
    });
  });
  return counts;
};
