import type { ProductPrice } from './types'

/** Default prices (THB) used when no admin price is set */
export const FALLBACK_PRICES: ProductPrice[] = [
  { product_type: 'mangosteen', variant: 'ready_to_eat', price_thb: 80 },
  { product_type: 'mangosteen', variant: 'ripen_3_4_days', price_thb: 65 },
  { product_type: 'durian', variant: 'size_s', price_thb: 350 },
  { product_type: 'durian', variant: 'size_m', price_thb: 450 },
  { product_type: 'durian', variant: 'size_l', price_thb: 600 },
]

/**
 * Returns the full price list:
 *  1. Admin-set prices take priority.
 *  2. For any variant without an admin price, use hardcoded default prices.
 *
 * This function runs server-side only.
 */
export function getMarketPrices(adminPrices: ProductPrice[]): ProductPrice[] {
  const adminVariants = new Set(
    adminPrices.map((p) => `${p.product_type}:${p.variant}`),
  )

  const missing = FALLBACK_PRICES.filter(
    (p) => !adminVariants.has(`${p.product_type}:${p.variant}`),
  )

  return [...adminPrices, ...missing]
}
