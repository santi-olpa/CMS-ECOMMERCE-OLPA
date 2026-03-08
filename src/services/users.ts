import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Role, UserProfile, ShippingAddress } from '@/features/auth/types';

const COLLECTION = 'users';

const defaultRole: Role = 'consumer';

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

export const getProfile = async (uid: string): Promise<UserProfile | null> => {
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
};

export const ensureProfile = async (
  uid: string,
  email: string,
  displayName?: string,
): Promise<UserProfile> => {
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  const now = new Date().toISOString();

  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    const updatePayload = stripUndefined({
      email,
      // Nunca enviar undefined: si no viene ni existe, queda sin campo; si existe, se mantiene; si viene nuevo, se usa.
      displayName: displayName ?? data.displayName ?? '',
      updatedAt: now,
    });
    await updateDoc(ref, updatePayload);
    return { ...data, ...updatePayload } as UserProfile;
  }

  const profile: UserProfile = {
    uid,
    email,
    // Para nuevos perfiles, forzamos string vacío si no viene displayName
    displayName: displayName ?? '',
    role: defaultRole,
    createdAt: now,
    updatedAt: now,
  };
  const dataToSave = stripUndefined(profile as Record<string, unknown>);
  await setDoc(ref, dataToSave);
  return profile;
};

export const setUserRole = async (uid: string, role: Role): Promise<void> => {
  const ref = doc(db, COLLECTION, uid);
  await updateDoc(ref, {
    role,
    updatedAt: new Date().toISOString(),
  });
};

export type UpdateUserProfilePayload = {
  displayName?: string;
  phone?: string;
  shippingAddress?: ShippingAddress | null;
};

export const updateUserProfile = async (
  uid: string,
  payload: UpdateUserProfilePayload,
): Promise<void> => {
  const ref = doc(db, COLLECTION, uid);
  const updatePayload = stripUndefined({
    ...payload,
    updatedAt: new Date().toISOString(),
  });
  if (Object.keys(updatePayload).length <= 1) return; // solo updatedAt
  await updateDoc(ref, updatePayload);
};

export const listUsers = async (): Promise<UserProfile[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => d.data() as UserProfile);
};
