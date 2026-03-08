import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { decrementStock, restoreStock } from './products';

const COLLECTION = 'orders';

export type OrderStatus = 'pending' | 'cancelled' | 'shipped' | 'completed';

export interface OrderCustomerInfo {
  nombre: string;
  email: string;
  telefono: string;
  dni: string;
}

export interface OrderShippingInfo {
  direccion: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
}

export interface OrderItem {
  productId: string;
  variationId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface OrderPaymentMethod {
  id: string;
  name: string;
}

export interface OrderAppliedPromotion {
  id: string;
  name: string;
}

export interface OrderData {
  customerInfo: OrderCustomerInfo;
  shippingInfo: OrderShippingInfo;
  items: OrderItem[];
  paymentMethod: OrderPaymentMethod;
  subtotal: number;
  discount: number;
  total: number;
  /** Promoción aplicada (ej. "10% OFF Transferencia") si hubo descuento por medio de pago */
  appliedPromotion?: OrderAppliedPromotion;
  /** ID del usuario si está logueado */
  userId?: string;
}

export interface Order extends OrderData {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}

const colRef = collection(db, COLLECTION);

export const createOrder = async (orderData: OrderData): Promise<string> => {
  const orderPayload = {
    ...orderData,
    status: 'pending' as OrderStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const ref = await addDoc(colRef, orderPayload);

  for (const item of orderData.items) {
    await decrementStock(
      item.productId,
      item.variationId ?? null,
      item.quantity,
    );
  }

  return ref.id;
};

export const getOrders = async (): Promise<Order[]> => {
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: (d.data() as Order).createdAt,
    updatedAt: (d.data() as Order).updatedAt,
  })) as Order[];
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  const ref = doc(colRef, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Order;
};

export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
): Promise<void> => {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('Orden no encontrada');

  if (order.status === 'cancelled' && status !== 'cancelled') {
    throw new Error('No se puede cambiar el estado de una orden cancelada.');
  }

  if (order.status !== 'cancelled' && status === 'cancelled') {
    for (const item of order.items) {
      await restoreStock(
        item.productId,
        item.variationId ?? null,
        item.quantity,
      );
    }
  }

  const ref = doc(colRef, orderId);
  await updateDoc(ref, {
    status,
    updatedAt: new Date().toISOString(),
  });
};

export const getOrdersByUserId = async (userId: string): Promise<Order[]> => {
  const all = await getOrders();
  return all.filter((o) => (o as Order & { userId?: string }).userId === userId);
};

export const getOrdersByCustomerEmail = async (email: string): Promise<Order[]> => {
  const all = await getOrders();
  return all.filter((o) => o.customerInfo?.email?.toLowerCase() === email?.toLowerCase());
};
