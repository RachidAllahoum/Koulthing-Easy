/** Platform fee: 2.5% of (subtotal + delivery_price), in DZD. */
export const KOULTHING_FEE_RATE = 0.025

export function computeKoulthingFee(subtotal: number, deliveryPrice: number): number {
  const base = subtotal + deliveryPrice
  return Math.round(base * KOULTHING_FEE_RATE)
}

export const KOULTHING_FEE_LABEL = "Koulthing fee (2.5%)"
