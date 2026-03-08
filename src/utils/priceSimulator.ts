import type { PriceList } from '@/features/priceLists/types';
import type { Role } from '@/features/auth/types';

export function calculateSimulatedPrice(
  regularPrice: number,
  costPrice: number,
  priceList: PriceList,
): number {
  if (priceList.operation === 'increase') {
    const base = costPrice;
    if (base <= 0) return 0;
    if (priceList.valueType === 'fixed') return base + priceList.value;
    return base + (base * priceList.value) / 100;
  }
  const base = regularPrice;
  if (base <= 0) return 0;
  if (priceList.valueType === 'fixed') return Math.max(0, base - priceList.value);
  return Math.max(0, base - (base * priceList.value) / 100);
}

/**
 * Obtiene el precio final para un rol según las listas de precios activas.
 * Prioridad: lista con rol igual al usuario; si no hay, lista general (sin rol); si no, precio regular.
 */
export function getPriceForRole(
  regularPrice: number,
  costPrice: number,
  role: Role | undefined,
  activePriceLists: PriceList[],
): number {
  if (activePriceLists.length === 0) return regularPrice;
  const listForRole =
    role && activePriceLists.find((pl) => pl.isActive && pl.role === role);
  const generalList = activePriceLists.find(
    (pl) => pl.isActive && (!pl.role || pl.role === ''),
  );
  const list = listForRole ?? generalList;
  if (!list) return regularPrice;
  return calculateSimulatedPrice(regularPrice, costPrice, list);
}
