import { createAdminClient } from '@/lib/supabase/server'
import ShippingClient from './ShippingClient'

export const dynamic = 'force-dynamic'

export default async function AdminShippingPage() {
  const supabase = createAdminClient()

  const { data: rates } = await supabase
    .from('shipping_rates')
    .select('*')
    .order('carrier')
    .order('min_weight_kg')

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-forest">ตั้งค่าค่าขนส่ง</h1>
        <p className="mt-1 text-sm text-earth/70">
          จัดการอัตราค่าขนส่งตามน้ำหนักสำหรับ Flash Express และ KEX —
          ระบบจะนำอัตราเฉลี่ยของทั้งสองสายมาคำนวณค่าขนส่ง
        </p>
      </div>

      <ShippingClient rates={rates ?? []} />
    </div>
  )
}
