import { createAdminClient } from '@/lib/supabase/server'
import PricesClient from './PricesClient'
import type { ProductPrice } from '@/lib/types'

const ALL_VARIANTS: { product_type: 'mangosteen' | 'durian'; variant: string; label: string; unit: string }[] = [
  { product_type: 'mangosteen', variant: 'ready_to_eat', label: 'มังคุด — สุกพอดี พร้อมทาน', unit: 'kg' },
  { product_type: 'mangosteen', variant: 'ripen_3_4_days', label: 'มังคุด — รอสุกอีกนิด เก็บไว้แบ่งทาน', unit: 'kg' },
  { product_type: 'durian', variant: 'size_s', label: 'ทุเรียนหมอนทอง Size S (3–4 kg)', unit: 'ลูก' },
  { product_type: 'durian', variant: 'size_m', label: 'ทุเรียนหมอนทอง Size M (4–5 kg)', unit: 'ลูก' },
  { product_type: 'durian', variant: 'size_l', label: 'ทุเรียนหมอนทอง Size L (5+ kg)', unit: 'ลูก' },
]

export const dynamic = 'force-dynamic'

export default async function AdminPricesPage() {
  let currentPrices: ProductPrice[] = []

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('product_prices')
      .select('product_type, variant, price_thb')
    currentPrices = (data ?? []) as ProductPrice[]
  } catch {
    // Supabase not configured — render with empty prices
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-forest">จัดการราคาสินค้า</h1>
        <p className="mt-1 text-sm text-earth">
          ตั้งราคาสินค้าด้วยตนเอง — หากไม่ได้ตั้ง ระบบจะใช้ราคาเริ่มต้นโดยอัตโนมัติ
        </p>
      </div>
      <PricesClient variants={ALL_VARIANTS} currentPrices={currentPrices} />
    </div>
  )
}
