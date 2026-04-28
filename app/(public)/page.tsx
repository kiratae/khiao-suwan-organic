import { createClient } from '@/lib/supabase/server'
import { getMarketPrices } from '@/lib/market-price'
import { DURIAN_WEIGHT_KG } from '@/lib/shipping'
import PreOrderForm from '@/components/PreOrderForm'
import type { ProductPrice, ShippingRate, YieldQuota } from '@/lib/types'

// Fallback shipping rates used when Supabase is not yet configured
const DEFAULT_SHIPPING_RATES: ShippingRate[] = [
  { id: '', carrier: 'flash_express', min_weight_kg: 0, max_weight_kg: 5, rate_thb_per_kg: 25, packaging_fee_thb: 50 },
  { id: '', carrier: 'flash_express', min_weight_kg: 5, max_weight_kg: 10, rate_thb_per_kg: 22, packaging_fee_thb: 50 },
  { id: '', carrier: 'flash_express', min_weight_kg: 10, max_weight_kg: 20, rate_thb_per_kg: 20, packaging_fee_thb: 50 },
  { id: '', carrier: 'flash_express', min_weight_kg: 20, max_weight_kg: null, rate_thb_per_kg: 18, packaging_fee_thb: 50 },
  { id: '', carrier: 'kex', min_weight_kg: 0, max_weight_kg: 5, rate_thb_per_kg: 28, packaging_fee_thb: 60 },
  { id: '', carrier: 'kex', min_weight_kg: 5, max_weight_kg: 10, rate_thb_per_kg: 24, packaging_fee_thb: 60 },
  { id: '', carrier: 'kex', min_weight_kg: 10, max_weight_kg: 20, rate_thb_per_kg: 21, packaging_fee_thb: 60 },
  { id: '', carrier: 'kex', min_weight_kg: 20, max_weight_kg: null, rate_thb_per_kg: 19, packaging_fee_thb: 60 },
]

async function fetchPageData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || supabaseUrl.includes('<project-ref>')) {
    // Supabase not yet configured — render form with fallback data
    const fallbackPrices = getMarketPrices([])
    return {
      shippingRates: DEFAULT_SHIPPING_RATES,
      prices: fallbackPrices,
      quotas: [] as YieldQuota[],
    }
  }

  try {
    const supabase = await createClient()
    const currentYear = new Date().getFullYear()

    const [
      { data: ratesRaw },
      { data: adminPricesRaw },
      { data: yieldRaw },
      { data: activeOrdersRaw },
    ] = await Promise.all([
      supabase
        .from('shipping_rates')
        .select('id, carrier, min_weight_kg, max_weight_kg, rate_thb_per_kg, packaging_fee_thb')
        .order('carrier')
        .order('min_weight_kg'),
      supabase.from('product_prices').select('product_type, variant, price_thb'),
      supabase
        .from('yield_settings')
        .select('product_type, available_quota_kg')
        .eq('harvest_year', currentYear),
      supabase.from('pre_orders').select('id').neq('status', 'cancelled'),
    ])

    const shippingRates: ShippingRate[] =
      ratesRaw && ratesRaw.length > 0
        ? ratesRaw.map((r) => ({
            id: r.id as string,
            carrier: r.carrier as 'flash_express' | 'kex',
            min_weight_kg: Number(r.min_weight_kg),
            max_weight_kg: r.max_weight_kg !== null ? Number(r.max_weight_kg) : null,
            rate_thb_per_kg: Number(r.rate_thb_per_kg),
            packaging_fee_thb: Number(r.packaging_fee_thb),
          }))
        : DEFAULT_SHIPPING_RATES

    const adminPrices: ProductPrice[] = (adminPricesRaw ?? []) as ProductPrice[]
    const prices = getMarketPrices(adminPrices)

    // Compute ordered kg per product (for quota display)
    let orderedMangoKg = 0
    let orderedDurianKg = 0

    if (activeOrdersRaw && activeOrdersRaw.length > 0) {
      const activeIds = activeOrdersRaw.map((o) => o.id)
      const { data: itemsRaw } = await supabase
        .from('order_items')
        .select('product_type, variant, quantity')
        .in('order_id', activeIds)

      for (const item of itemsRaw ?? []) {
        if (item.product_type === 'mangosteen') {
          orderedMangoKg += Number(item.quantity)
        } else if (item.product_type === 'durian') {
          const wt =
            DURIAN_WEIGHT_KG[item.variant as keyof typeof DURIAN_WEIGHT_KG] ?? 4.5
          orderedDurianKg += Number(item.quantity) * wt
        }
      }
    }

    const mangoAvailable = Number(
      yieldRaw?.find((y) => y.product_type === 'mangosteen')?.available_quota_kg ?? 0,
    )
    const durianAvailable = Number(
      yieldRaw?.find((y) => y.product_type === 'durian')?.available_quota_kg ?? 0,
    )

    const quotas: YieldQuota[] = [
      {
        product_type: 'mangosteen',
        available_quota_kg: mangoAvailable,
        ordered_kg: orderedMangoKg,
        remaining_kg: Math.max(0, mangoAvailable - orderedMangoKg),
      },
      {
        product_type: 'durian',
        available_quota_kg: durianAvailable,
        ordered_kg: orderedDurianKg,
        remaining_kg: Math.max(0, durianAvailable - orderedDurianKg),
      },
    ]

    return { shippingRates, prices, quotas }
  } catch {
    const fallbackPrices = getMarketPrices([])
    return {
      shippingRates: DEFAULT_SHIPPING_RATES,
      prices: fallbackPrices,
      quotas: [] as YieldQuota[],
    }
  }
}

export default async function HomePage() {
  const { shippingRates, prices, quotas } = await fetchPageData()

  return (
    <main className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="bg-forest px-6 py-12 text-center">
        <p className="mb-2 text-xs font-medium tracking-[0.2em] text-cream/60 uppercase">
          ปุ๋ยอินทรีย์ · ระยอง · คุณภาพพรีเมียม
        </p>
        <h1 className="font-heading text-3xl font-bold text-cream sm:text-4xl">
          เขียวสุวรรณออร์แกนิค
        </h1>
        <p className="mt-3 text-cream/75 text-sm sm:text-base">
          สั่งจองผลไม้ออร์แกนิคล่วงหน้า — มังคุด &amp; ทุเรียนหมอนทอง
        </p>
      </div>

      <div className="mx-auto max-w-xl px-4 py-10">
        <PreOrderForm
          shippingRates={shippingRates}
          prices={prices}
          quotas={quotas}
        />
      </div>
    </main>
  )
}
