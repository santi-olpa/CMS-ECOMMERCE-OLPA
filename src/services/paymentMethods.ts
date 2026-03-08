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

const COLLECTION = 'payment_methods';

export type PaymentMethodType = 'offline' | 'simulated';

export interface PaymentMethod {
  id?: string;
  name: string;
  type: PaymentMethodType;
  instructions?: string;
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

export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentMethod));
};

export const getActivePaymentMethods = async (): Promise<PaymentMethod[]> => {
  const snapshot = await getDocs(colRef);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as PaymentMethod))
    .filter((m) => m.isActive);
};

export const getPaymentMethodById = async (
  id: string,
): Promise<PaymentMethod | null> => {
  const ref = doc(colRef, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PaymentMethod;
};

export const createPaymentMethod = async (
  payload: Omit<PaymentMethod, 'id'>,
): Promise<string> => {
  const data = stripUndefined(payload as Record<string, unknown>);
  const ref = await addDoc(colRef, data);
  return ref.id;
};

export const updatePaymentMethod = async (
  id: string,
  payload: Partial<Omit<PaymentMethod, 'id'>>,
): Promise<void> => {
  const ref = doc(colRef, id);
  const data = stripUndefined(payload as Record<string, unknown>);
  if (Object.keys(data).length) await updateDoc(ref, data);
};

export const deletePaymentMethod = async (id: string): Promise<void> => {
  const ref = doc(colRef, id);
  await deleteDoc(ref);
};
