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

const COLLECTION = 'attributes';

export interface GlobalAttribute {
  id?: string;
  name: string;
  slug: string;
  /** Términos/valores del atributo (ej: Rojo, Azul, Verde) */
  terms: string[];
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

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export const getAttributes = async (): Promise<GlobalAttribute[]> => {
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    terms: Array.isArray(d.data().terms) ? d.data().terms : [],
  })) as GlobalAttribute[];
};

export const getAttributeById = async (
  id: string,
): Promise<GlobalAttribute | null> => {
  const ref = doc(colRef, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    terms: Array.isArray(data?.terms) ? data.terms : [],
  } as GlobalAttribute;
};

export const createAttribute = async (
  payload: Omit<GlobalAttribute, 'id'>,
): Promise<string> => {
  const slug = payload.slug || slugify(payload.name);
  const data = stripUndefined({
    name: payload.name,
    slug,
    terms: payload.terms ?? [],
  } as Record<string, unknown>);
  const ref = await addDoc(colRef, data);
  return ref.id;
};

export const updateAttribute = async (
  id: string,
  payload: Partial<Omit<GlobalAttribute, 'id'>>,
): Promise<void> => {
  const ref = doc(colRef, id);
  const data: Record<string, unknown> = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.slug !== undefined) data.slug = payload.slug;
  if (payload.terms !== undefined) data.terms = payload.terms;
  if (Object.keys(data).length) await updateDoc(ref, data);
};

export const deleteAttribute = async (id: string): Promise<void> => {
  const ref = doc(colRef, id);
  await deleteDoc(ref);
};
