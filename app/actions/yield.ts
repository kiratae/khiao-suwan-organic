'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

// ─── Upsert yield settings for a product+year ─────────────────────────────────

const upsertYieldSchema = z.object({
  product_type: z.enum(['mangosteen', 'durian']),
  harvest_year: z.coerce
    .number({ invalid_type_error: 'กรุณากรอกปีที่ถูกต้อง' })
    .int()
    .min(2000)
    .max(2100),
  historical_yield_kg: z.coerce
    .number({ invalid_type_error: 'กรุณากรอกปริมาณผลผลิต' })
    .positive('ผลผลิตต้องมากกว่า 0'),
  bias_factor: z.coerce
    .number({ invalid_type_error: 'กรุณากรอก Bias Factor' })
    .min(0.01, 'Bias Factor ต้องมากกว่า 0')
    .max(1, 'Bias Factor ต้องไม่เกิน 1.0'),
  notes: z.string().max(500).optional(),
})

export type YieldActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

export async function upsertYieldSettings(
  _prev: YieldActionState,
  formData: FormData,
): Promise<YieldActionState> {
  const parsed = upsertYieldSchema.safeParse({
    product_type: formData.get('product_type'),
    harvest_year: formData.get('harvest_year'),
    historical_yield_kg: formData.get('historical_yield_kg'),
    bias_factor: formData.get('bias_factor'),
    notes: formData.get('notes') || undefined,
  })

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  const { product_type, harvest_year, historical_yield_kg, bias_factor, notes } = parsed.data
  const supabase = createAdminClient()

  const { error } = await supabase.from('yield_settings').upsert(
    { product_type, harvest_year, historical_yield_kg, bias_factor, notes },
    { onConflict: 'product_type,harvest_year' },
  )

  if (error) {
    return { status: 'error', message: 'ไม่สามารถบันทึกข้อมูลผลผลิตได้ กรุณาลองอีกครั้ง' }
  }

  revalidatePath('/admin/yield')
  revalidatePath('/')

  const productLabel = product_type === 'mangosteen' ? 'มังคุด' : 'ทุเรียนหมอนทอง'
  const quota = (historical_yield_kg * bias_factor).toLocaleString('th-TH', { maximumFractionDigits: 0 })

  return {
    status: 'success',
    message: `บันทึก ${productLabel} ปี ${harvest_year} — โควตา ${quota} kg สำเร็จ`,
  }
}
