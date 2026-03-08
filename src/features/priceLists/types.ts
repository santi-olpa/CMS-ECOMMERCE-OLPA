import type { Role } from '@/features/auth/types';

export type PriceListOperation = 'increase' | 'decrease';

export type PriceListValueType = 'percentage' | 'fixed';

export interface PriceList {
  id?: string;
  name: string;
  operation: PriceListOperation;
  valueType: PriceListValueType;
  value: number;
  isActive: boolean;
  /** Rol al que aplica esta lista (opcional). Si no se define, es lista general. */
  role?: Role | '';
}

