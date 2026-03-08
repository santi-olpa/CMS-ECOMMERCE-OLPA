import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyClmOa7JDkSeFjyBC3-iV9rqzV3LGygGX4',
  authDomain: 'ecommerceolpa.firebaseapp.com',
  projectId: 'ecommerceolpa',
  storageBucket: 'ecommerceolpa.firebasestorage.app',
  messagingSenderId: '363323146669',
  appId: '1:363323146669:web:156a9c67c11e411d532124',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
