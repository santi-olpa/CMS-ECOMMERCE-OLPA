import type { PaymentMethod } from '@/services/paymentMethods';
import type { Promotion, PromotionType } from '@/services/promotions';

export interface PaymentOption {
  paymentMethodId: string;
  paymentMethodName: string;
  promotionId?: string;
  promotionName?: string;
  promotionType?: PromotionType;
  finalPrice: number;
  installmentAmount?: number;
  installmentsCount?: number;
  label: string;
}

/**
 * Dado el precio base, medios de pago activos y promociones activas (ya filtradas por producto/categoría),
 * devuelve las opciones de pago calculadas: precio final con descuento/recargo o cuotas.
 */
export function calculatePaymentOptions(
  basePrice: number,
  methods: PaymentMethod[],
  promos: Promotion[],
): PaymentOption[] {
  const options: PaymentOption[] = [];

  for (const method of methods) {
    const methodPromos = promos.filter(
      (p) => !p.paymentMethodId || p.paymentMethodId === method.id,
    );

    const baseOption: PaymentOption = {
      paymentMethodId: method.id!,
      paymentMethodName: method.name,
      finalPrice: basePrice,
      label: `${method.name}: $${basePrice.toFixed(2)}`,
    };
    options.push(baseOption);

    for (const promo of methodPromos) {
      if (promo.type === 'discount') {
        const finalPrice = basePrice * (1 - promo.value / 100);
        options.push({
          paymentMethodId: method.id!,
          paymentMethodName: method.name,
          promotionId: promo.id,
          promotionName: promo.name,
          promotionType: 'discount',
          finalPrice,
          label: `${method.name} - ${promo.name}: $${finalPrice.toFixed(2)}`,
        });
      } else if (promo.type === 'surcharge') {
        const finalPrice = basePrice * (1 + promo.value / 100);
        options.push({
          paymentMethodId: method.id!,
          paymentMethodName: method.name,
          promotionId: promo.id,
          promotionName: promo.name,
          promotionType: 'surcharge',
          finalPrice,
          label: `${method.name} - ${promo.name}: $${finalPrice.toFixed(2)}`,
        });
      } else if (promo.type === 'installments' && (promo.installmentsCount ?? 0) >= 1) {
        const count = promo.installmentsCount ?? 1;
        const withInterest = promo.installmentsWithInterest !== false;
        const total = withInterest
          ? basePrice * (1 + (promo.value || 0) / 100)
          : basePrice;
        const installmentAmount = total / count;
        const labelText = withInterest
          ? `${count} cuotas de $${installmentAmount.toFixed(2)}`
          : `${count} cuotas sin interés de $${installmentAmount.toFixed(2)}`;
        options.push({
          paymentMethodId: method.id!,
          paymentMethodName: method.name,
          promotionId: promo.id,
          promotionName: promo.name,
          promotionType: 'installments',
          finalPrice: total,
          installmentAmount,
          installmentsCount: count,
          label: `${method.name} - ${promo.name}: ${labelText}`,
        });
      }
    }
  }

  return options;
}
