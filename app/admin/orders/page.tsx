import { createAdminClient } from '@/lib/supabase/server'
import OrdersClient from './OrdersClient'

export const dynamic = 'force-dynamic'

export interface OrderItemRow {
  id: string
  product_type: 'mangosteen' | 'durian'
  variant: string
  unit: 'kg' | 'pieces'
  quantity: number
  unit_price_thb: number
  subtotal_thb: number
}

export interface OrderRow {
  id: string
  full_name: string
  shipping_address: string
  email: string | null
  phone: string | null
  line_id: string | null
  status: 'pending' | 'confirmed' | 'shipped' | 'cancelled'
  notes: string | null
  shipping_fee_thb: number
  packaging_fee_thb: number
  created_at: string
  order_items: OrderItemRow[]
}

export default async function AdminOrdersPage() {
  let orders: OrderRow[] = []
  let fetchError = false

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('pre_orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })

    if (error) throw error
    orders = (data ?? []) as OrderRow[]
  } catch {
    fetchError = true
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-forest">คำสั่งจองทั้งหมด</h1>
          {!fetchError && (
            <p className="mt-1 text-sm text-earth/70">{orders.length} รายการ</p>
          )}
        </div>
      </div>

      {fetchError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center text-red-700">
          ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Supabase
        </div>
      ) : (
        <OrdersClient orders={orders} />
      )}
    </div>
  )
}
