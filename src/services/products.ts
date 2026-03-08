import { collection, doc, getDoc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { ProductPayload, VariableProduct, ProductVariation, ProductStatus } from '@/features/products/types';

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

export const createProduct = async (payload: ProductPayload): Promise<string> => {
  try {
    const batch = writeBatch(db);

    const productsColRef = collection(db, 'productos');
    const productDocRef = doc(productsColRef);

    const { type, ...productData } = payload;

    const productDataToSave = stripUndefined({
      ...productData,
      type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    batch.set(productDocRef, productDataToSave);

    if (type === 'variable') {
      const variablePayload = payload as VariableProduct;

      variablePayload.variations.forEach((variation) => {
        const variationsColRef = collection(productDocRef, 'variaciones');
        const variationDocRef = doc(variationsColRef);

        const variationDataToSave = stripUndefined({
          ...variation,
          productId: productDocRef.id,
        });

        batch.set(variationDocRef, variationDataToSave);
      });
    }

    await batch.commit();

    return productDocRef.id;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al crear el producto.';

    throw new Error(`No se pudo crear el producto en Firestore: ${message}`);
  }
};

export type ProductWithId = ProductPayload & { id: string };

export const getProducts = async (): Promise<ProductWithId[]> => {
  try {
    const productsColRef = collection(db, 'productos');
    const snapshot = await getDocs(productsColRef);

    const products: ProductWithId[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as ProductPayload;

      return {
        id: docSnap.id,
        ...data,
      };
    });

    return products;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al obtener los productos.';

    throw new Error(`No se pudieron obtener los productos desde Firestore: ${message}`);
  }
};

/** Productos con status 'publicado' para el storefront público */
export const getPublishedProducts = async (): Promise<ProductWithId[]> => {
  const all = await getProducts();
  return all.filter((p) => p.status === 'publicado');
};

/** Productos para cross-selling por lista de SKUs (publicados, con datos completos). */
export const getProductsBySkus = async (
  skus: string[],
  excludeProductId?: string,
): Promise<ProductWithId[]> => {
  if (!skus.length) return [];
  const all = await getProducts();
  const matching = all.filter(
    (p) =>
      p.status === 'publicado' &&
      skus.includes(p.sku) &&
      (excludeProductId == null || p.id !== excludeProductId),
  );
  const full = await Promise.all(matching.map((p) => getProductById(p.id)));
  return full;
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    const productDocRef = doc(collection(db, 'productos'), productId);
    const productSnap = await getDoc(productDocRef);

    if (!productSnap.exists()) {
      throw new Error('El producto que intentas eliminar no existe.');
    }

    const data = productSnap.data() as ProductPayload;
    const batch = writeBatch(db);

    if (data.type === 'variable') {
      const variationsColRef = collection(productDocRef, 'variaciones');
      const variationsSnap = await getDocs(variationsColRef);

      variationsSnap.forEach((variationDoc) => {
        batch.delete(variationDoc.ref);
      });
    }

    batch.delete(productDocRef);

    await batch.commit();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al eliminar el producto.';

    throw new Error(`No se pudo eliminar el producto en Firestore: ${message}`);
  }
};

export const getProductById = async (productId: string): Promise<ProductWithId> => {
  try {
    const productDocRef = doc(collection(db, 'productos'), productId);
    const productSnap = await getDoc(productDocRef);

    if (!productSnap.exists()) {
      throw new Error('El producto solicitado no existe.');
    }

    const data = productSnap.data() as ProductPayload;

    if (data.type === 'variable') {
      const variationsColRef = collection(productDocRef, 'variaciones');
      const variationsSnap = await getDocs(variationsColRef);

      const variations: ProductVariation[] = variationsSnap.docs.map((variationDoc) => {
        const raw = variationDoc.data() as Partial<ProductVariation>;

        return {
          ...(raw as ProductVariation),
          id: variationDoc.id,
          costPrice: typeof raw.costPrice === 'number' ? raw.costPrice : 0,
        };
      });

      const variableData: VariableProduct = {
        ...(data as VariableProduct),
        variations,
      };

      return {
        id: productId,
        ...variableData,
      };
    }

    return {
      id: productId,
      ...data,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al obtener el producto.';

    throw new Error(`No se pudo obtener el producto desde Firestore: ${message}`);
  }
};

export const updateProduct = async (productId: string, payload: ProductPayload): Promise<void> => {
  try {
    const productDocRef = doc(collection(db, 'productos'), productId);
    const batch = writeBatch(db);

    const { type, ...productData } = payload;

    const productDataToSave = stripUndefined({
      ...productData,
      type,
      updatedAt: new Date().toISOString(),
    });

    batch.set(productDocRef, productDataToSave, { merge: true });

    const variationsColRef = collection(productDocRef, 'variaciones');
    const existingVariationsSnap = await getDocs(variationsColRef);

    existingVariationsSnap.forEach((variationDoc) => {
      batch.delete(variationDoc.ref);
    });

    if (type === 'variable') {
      const variablePayload = payload as VariableProduct;

      variablePayload.variations.forEach((variation) => {
        const variationDocRef = doc(variationsColRef);

        const variationDataToSave = stripUndefined({
          ...variation,
          productId: productDocRef.id,
        });

        batch.set(variationDocRef, variationDataToSave);
      });
    }

    await batch.commit();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al actualizar el producto.';

    throw new Error(`No se pudo actualizar el producto en Firestore: ${message}`);
  }
};

export const updateProductStatus = async (
  productId: string,
  status: ProductStatus,
): Promise<void> => {
  const productDocRef = doc(collection(db, 'productos'), productId);
  await updateDoc(productDocRef, {
    status,
    updatedAt: new Date().toISOString(),
  });
};

/** Descuenta stock al crear una orden. variationId null = producto simple. */
export const decrementStock = async (
  productId: string,
  variationId: string | null,
  quantity: number,
): Promise<void> => {
  const productDocRef = doc(collection(db, 'productos'), productId);
  if (variationId) {
    const variationRef = doc(collection(productDocRef, 'variaciones'), variationId);
    const snap = await getDoc(variationRef);
    if (!snap.exists()) throw new Error(`Variación ${variationId} no encontrada`);
    const current = (snap.data() as { stock?: number }).stock ?? 0;
    await updateDoc(variationRef, { stock: Math.max(0, current - quantity) });
  } else {
    const snap = await getDoc(productDocRef);
    if (!snap.exists()) throw new Error(`Producto ${productId} no encontrado`);
    const current = (snap.data() as { stock?: number }).stock ?? 0;
    await updateDoc(productDocRef, {
      stock: Math.max(0, current - quantity),
      updatedAt: new Date().toISOString(),
    });
  }
};

/** Restaura stock al cancelar una orden. */
export const restoreStock = async (
  productId: string,
  variationId: string | null,
  quantity: number,
): Promise<void> => {
  const productDocRef = doc(collection(db, 'productos'), productId);
  if (variationId) {
    const variationRef = doc(collection(productDocRef, 'variaciones'), variationId);
    const snap = await getDoc(variationRef);
    if (!snap.exists()) return;
    const current = (snap.data() as { stock?: number }).stock ?? 0;
    await updateDoc(variationRef, { stock: current + quantity });
  } else {
    const snap = await getDoc(productDocRef);
    if (!snap.exists()) return;
    const current = (snap.data() as { stock?: number }).stock ?? 0;
    await updateDoc(productDocRef, {
      stock: current + quantity,
      updatedAt: new Date().toISOString(),
    });
  }
};


