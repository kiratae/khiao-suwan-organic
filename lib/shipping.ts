import type { ShippingRate } from './types'

/** Representative weight (kg/piece) for each durian size — used for shipping estimation */
export const DURIAN_WEIGHT_KG = {
  size_s: 3.5,
  size_m: 4.5,
  size_l: 5.5,
} as const

function findRate(
  rates: ShippingRate[],
  carrier: 'flash_express' | 'kex',
  weightKg: number,
): ShippingRate | undefined {
  return rates.find(
    (r) =>
      r.carrier === carrier &&
      r.min_weight_kg <= weightKg &&
      (r.max_weight_kg === null || weightKg < r.max_weight_kg),
  )
}

export interface ShippingBreakdown {
  totalWeightKg: number
  avgRatePerKg: number
  shippingFee: number
  packagingFee: number
  total: number
}

/**
 * Calculates shipping fee as the average of Flash Express and KEX rates.
 *
 * Formula:
 *   avg_rate     = (flash_rate_per_kg + kex_rate_per_kg) / 2
 *   shipping_fee = total_weight_kg * avg_rate + avg_packaging_fee
 */
export function calculateShipping(
  rates: ShippingRate[],
  totalWeightKg: number,
): ShippingBreakdown {
  const zero: ShippingBreakdown = {
    totalWeightKg,
    avgRatePerKg: 0,
    shippingFee: 0,
    packagingFee: 0,
    total: 0,
  }

  if (totalWeightKg <= 0 || rates.length === 0) return zero

  const flash = findRate(rates, 'flash_express', totalWeightKg)
  const kex = findRate(rates, 'kex', totalWeightKg)

  if (!flash || !kex) return zero

  const avgRatePerKg = (flash.rate_thb_per_kg + kex.rate_thb_per_kg) / 2
  const packagingFee = (flash.packaging_fee_thb + kex.packaging_fee_thb) / 2
  const shippingFee = totalWeightKg * avgRatePerKg

  return {
    totalWeightKg,
    avgRatePerKg: r2(avgRatePerKg),
    shippingFee: r2(shippingFee),
    packagingFee: r2(packagingFee),
    total: r2(shippingFee + packagingFee),
  }
}

function r2(n: number) {
  return Math.round(n * 100) / 100
}
