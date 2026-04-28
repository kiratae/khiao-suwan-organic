import { createAdminClient } from '@/lib/supabase/server'
import YieldClient from './YieldClient'

export interface YieldRow {
  id: string
  product_type: 'mangosteen' | 'durian'
  harvest_year: number
  historical_yield_kg: number
  bias_factor: number
  available_quota_kg: number
  notes: string | null
  updated_at: string
}

export const dynamic = 'force-dynamic'

export default async function AdminYieldPage() {
  const currentYear = new Date().getFullYear()
  let rows: YieldRow[] = []

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('yield_settings')
      .select('id, product_type, harvest_year, historical_yield_kg, bias_factor, available_quota_kg, notes, updated_at')
      .order('harvest_year', { ascending: false })
      .order('product_type')
    rows = (data ?? []) as YieldRow[]
  } catch {
    // Supabase not configured yet
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-forest">จัดการโควตาผลผลิต</h1>
        <p className="mt-1 text-sm text-earth">
          ตั้งค่าผลผลิตและ Bias Factor เพื่อคำนวณโควตาสั่งจองที่เปิดรับ
        </p>
      </div>
      <YieldClient rows={rows} currentYear={currentYear} />
    </div>
  )
}
