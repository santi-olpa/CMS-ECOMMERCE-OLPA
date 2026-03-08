import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

export const login = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const register = async (
  email: string,
  password: string,
  displayName?: string,
): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  if (displayName?.trim()) {
    await updateProfile(user, { displayName: displayName.trim() });
  }
  return user;
};

export const logout = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const subscribeToAuth = (callback: (user: User | null) => void): (() => void) => {
  const unsubscribe = onAuthStateChanged(auth, callback);
  return unsubscribe;
};
