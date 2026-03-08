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

const COLLECTION = 'brands';

export interface Brand {
  id?: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

const stripUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const cleaned: Record<string, unknown> = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key as keyof T];
    if (value !== undefined) cleaned[key] = value;
  });
  return cleaned as T;
};

const colRef = collection(db, COLLECTION);

export const getBrands = async (): Promise<Brand[]> => {
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Brand));
};

export const getBrandById = async (id: string): Promise<Brand | null> => {
  const ref = doc(colRef, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Brand;
};

export const getBrandBySlug = async (slug: string): Promise<Brand | null> => {
  const snapshot = await getDocs(colRef);
  const found = snapshot.docs.find((d) => (d.data() as Brand).slug === slug);
  return found ? ({ id: found.id, ...found.data() } as Brand) : null;
};

export const createBrand = async (
  payload: Omit<Brand, 'id'>,
): Promise<string> => {
  const data = stripUndefined(payload as Record<string, unknown>);
  const ref = await addDoc(colRef, data);
  return ref.id;
};

export const updateBrand = async (
  id: string,
  payload: Partial<Omit<Brand, 'id'>>,
): Promise<void> => {
  const ref = doc(colRef, id);
  const data = stripUndefined(payload as Record<string, unknown>);
  await updateDoc(ref, data);
};

export const deleteBrand = async (id: string): Promise<void> => {
  const ref = doc(colRef, id);
  await deleteDoc(ref);
};
