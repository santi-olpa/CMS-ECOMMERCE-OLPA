import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { db, storage } from './firebase';

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
}

const MEDIA_COLLECTION = 'media';

export const uploadMedia = async (
  file: File,
  onProgress?: (progress: number) => void,
): Promise<MediaItem> => {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('El archivo supera el límite de 2MB.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const filePath = `products/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, filePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise<MediaItem>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          const createdAt = new Date().toISOString();
          const docRef = await addDoc(collection(db, MEDIA_COLLECTION), {
            name: file.name,
            url,
            size: file.size,
            type: file.type,
            createdAt,
          });

          resolve({
            id: docRef.id,
            name: file.name,
            url,
            size: file.size,
            type: file.type,
            createdAt,
          });
        } catch (err) {
          reject(err);
        }
      },
    );
  });
};

export const getMediaLibrary = async (): Promise<MediaItem[]> => {
  const q = query(
    collection(db, MEDIA_COLLECTION),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data() as Omit<MediaItem, 'id'>;
    return {
      id: d.id,
      ...data,
    };
  });
};

