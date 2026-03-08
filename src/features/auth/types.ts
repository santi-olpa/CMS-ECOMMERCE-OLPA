export type Role = 'admin' | 'distributor' | 'consumer';

export interface ShippingAddress {
  direccion: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: Role;
  phone?: string;
  shippingAddress?: ShippingAddress;
  createdAt: string;
  updatedAt: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  distributor: 'Distribuidor',
  consumer: 'Consumidor final',
};
