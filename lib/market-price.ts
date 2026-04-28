import type { ProductPrice } from './types'

/** Hardcoded fallback prices (THB) when DOAE API is unreachable or not configured */
const FALLBACK_PRICES: ProductPrice[] = [
  { product_type: 'mangosteen', variant: 'ready_to_eat', price_thb: 80 },
  { product_type: 'mangosteen', variant: 'ripen_3_4_days', price_thb: 65 },
  { product_type: 'durian', variant: 'size_s', price_thb: 350 },
  { product_type: 'durian', variant: 'size_m', price_thb: 450 },
  { product_type: 'durian', variant: 'size_l', price_thb: 600 },
]

/**
 * Returns the full price list:
 *  1. Admin-set prices take priority.
 *  2. For any variant without an admin price, attempt DOAE API.
 *  3. If DOAE is unreachable or not configured, use hardcoded fallback.
 *
 * This function runs server-side only.
 */
export async function getMarketPrices(adminPrices: ProductPrice[]): Promise<ProductPrice[]> {
  const adminVariants = new Set(
    adminPrices.map((p) => `${p.product_type}:${p.variant}`),
  )

  const missing = FALLBACK_PRICES.filter(
    (p) => !adminVariants.has(`${p.product_type}:${p.variant}`),
  )

  if (missing.length === 0) return adminPrices

  // Try DOAE API for missing variants
  const doaeUrl = process.env.DOAE_API_URL
  if (doaeUrl) {
    try {
      const res = await fetch(doaeUrl, { next: { revalidate: 3600 } })
      if (res.ok) {
        // TODO: Map DOAE response fields to ProductPrice[] once API contract is confirmed.
        // For now, fall through to hardcoded fallback below.
      }
    } catch {
      // Network error — use hardcoded fallback
    }
  }

  return [...adminPrices, ...missing]
}
