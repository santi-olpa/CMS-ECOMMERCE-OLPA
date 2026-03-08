import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PriceList } from '@/features/priceLists/types';

const stripUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const cleaned: Record<string, unknown> = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key as keyof T];
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });

  return cleaned as T;
};

const collectionRef = collection(db, 'priceLists');

export const getPriceLists = async (): Promise<PriceList[]> => {
  const snapshot = await getDocs(collectionRef);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<PriceList, 'id'>),
  }));
};

export const createPriceList = async (payload: Omit<PriceList, 'id'>): Promise<string> => {
  const dataToSave = stripUndefined(payload as Record<string, unknown>);
  const docRef = await addDoc(collectionRef, dataToSave);
  return docRef.id;
};

export const updatePriceList = async (id: string, payload: Partial<Omit<PriceList, 'id'>>): Promise<void> => {
  const docRef = doc(collectionRef, id);
  const dataToSave = stripUndefined(payload as Record<string, unknown>);
  await updateDoc(docRef, dataToSave);
};

export const deletePriceList = async (id: string): Promise<void> => {
  const docRef = doc(collectionRef, id);
  await deleteDoc(docRef);
};

