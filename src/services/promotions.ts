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

const COLLECTION = 'promotions';

export type PromotionType = 'discount' | 'surcharge' | 'installments';
export type PromotionTarget = 'all' | 'category' | 'product';

export interface Promotion {
  id?: string;
  name: string;
  type: PromotionType;
  value: number;
  installmentsCount?: number;
  /** Solo para type 'installments': true = aplica value % de interés; false = cuotas sin interés. */
  installmentsWithInterest?: boolean;
  paymentMethodId?: string;
  target: PromotionTarget;
  categorySlug?: string;
  productId?: string;
  isActive: boolean;
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

export const getPromotions = async (): Promise<Promotion[]> => {
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Promotion));
};

export const getActivePromotions = async (): Promise<Promotion[]> => {
  const snapshot = await getDocs(colRef);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Promotion))
    .filter((p) => p.isActive);
};

export const getPromotionById = async (
  id: string,
): Promise<Promotion | null> => {
  const ref = doc(colRef, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Promotion;
};

export const createPromotion = async (
  payload: Omit<Promotion, 'id'>,
): Promise<string> => {
  const data = stripUndefined(payload as Record<string, unknown>);
  const ref = await addDoc(colRef, data);
  return ref.id;
};

export const updatePromotion = async (
  id: string,
  payload: Partial<Omit<Promotion, 'id'>>,
): Promise<void> => {
  const ref = doc(colRef, id);
  const data = stripUndefined(payload as Record<string, unknown>);
  if (Object.keys(data).length) await updateDoc(ref, data);
};

export const deletePromotion = async (id: string): Promise<void> => {
  const ref = doc(colRef, id);
  await deleteDoc(ref);
};
