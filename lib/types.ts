export type ProductType = 'mangosteen' | 'durian'

export type ProductVariant =
  | 'ready_to_eat'
  | 'ripen_3_4_days'
  | 'size_s'
  | 'size_m'
  | 'size_l'

export type OrderUnit = 'kg' | 'pieces'

export interface ShippingRate {
  carrier: 'flash_express' | 'kex'
  min_weight_kg: number
  max_weight_kg: number | null
  rate_thb_per_kg: number
  packaging_fee_thb: number
}

export interface ProductPrice {
  product_type: ProductType
  variant: ProductVariant
  price_thb: number
}

export interface YieldQuota {
  product_type: ProductType
  available_quota_kg: number
  ordered_kg: number
  remaining_kg: number
}

export interface OrderItem {
  product_type: ProductType
  variant: ProductVariant
  unit: OrderUnit
  quantity: number
  unit_price_thb: number
}
