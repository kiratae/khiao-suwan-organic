'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

// ─── Shared state type ────────────────────────────────────────────────────────

export type ShippingActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

// ─── Upsert (create or update) a shipping rate tier ──────────────────────────

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  carrier: z.enum(['flash_express', 'kex']),
  min_weight_kg: z.coerce
    .number({ invalid_type_error: 'กรุณากรอกน้ำหนักขั้นต่ำ' })
    .min(0, 'น้ำหนักขั้นต่ำต้องไม่ติดลบ'),
  max_weight_kg: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().positive('น้ำหนักสูงสุดต้องมากกว่า 0').nullable(),
  ),
  rate_thb_per_kg: z.coerce
    .number({ invalid_type_error: 'กรุณากรอกอัตรา' })
    .positive('อัตรา/กก. ต้องมากกว่า 0'),
  packaging_fee_thb: z.coerce
    .number({ invalid_type_error: 'กรุณากรอกค่าบรรจุภัณฑ์' })
    .min(0, 'ค่าบรรจุภัณฑ์ต้องไม่ติดลบ'),
})

export async function upsertShippingRate(
  _prev: ShippingActionState,
  formData: FormData,
): Promise<ShippingActionState> {
  const raw = {
    id: formData.get('id') || undefined,
    carrier: formData.get('carrier'),
    min_weight_kg: formData.get('min_weight_kg'),
    max_weight_kg: formData.get('max_weight_kg'),
    rate_thb_per_kg: formData.get('rate_thb_per_kg'),
    packaging_fee_thb: formData.get('packaging_fee_thb'),
  }

  const parsed = upsertSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  const { id, ...data } = parsed.data
  const supabase = createAdminClient()

  if (id) {
    const { error } = await supabase.from('shipping_rates').update(data).eq('id', id)
    if (error) return { status: 'error', message: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง' }
  } else {
    const { error } = await supabase.from('shipping_rates').insert(data)
    if (error) return { status: 'error', message: 'ไม่สามารถเพิ่มข้อมูลได้ กรุณาลองอีกครั้ง' }
  }

  revalidatePath('/admin/shipping')
  revalidatePath('/')
  return { status: 'success', message: id ? 'บันทึกเรียบร้อย' : 'เพิ่มช่วงน้ำหนักเรียบร้อย' }
}

// ─── Delete a shipping rate tier ─────────────────────────────────────────────

export async function deleteShippingRateById(
  _prev: ShippingActionState,
  formData: FormData,
): Promise<ShippingActionState> {
  const id = formData.get('id')
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { status: 'error', message: 'ID ไม่ถูกต้อง' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('shipping_rates').delete().eq('id', parsed.data)
  if (error) return { status: 'error', message: 'ไม่สามารถลบข้อมูลได้ กรุณาลองอีกครั้ง' }

  revalidatePath('/admin/shipping')
  revalidatePath('/')
  return { status: 'success', message: 'ลบเรียบร้อย' }
}
