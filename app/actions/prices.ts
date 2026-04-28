'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { ProductType, ProductVariant } from '@/lib/types'

// ─── Upsert a single product price ────────────────────────────────────────────

const upsertPriceSchema = z.object({
  product_type: z.enum(['mangosteen', 'durian']),
  variant: z.enum(['ready_to_eat', 'ripen_3_4_days', 'size_s', 'size_m', 'size_l']),
  price_thb: z.coerce
    .number({ invalid_type_error: 'กรุณากรอกราคา' })
    .positive('ราคาต้องมากกว่า 0'),
})

export type PriceActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

export async function upsertProductPrice(
  _prev: PriceActionState,
  formData: FormData,
): Promise<PriceActionState> {
  const parsed = upsertPriceSchema.safeParse({
    product_type: formData.get('product_type'),
    variant: formData.get('variant'),
    price_thb: formData.get('price_thb'),
  })

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  const { product_type, variant, price_thb } = parsed.data
  const supabase = createAdminClient()

  const { error } = await supabase.from('product_prices').upsert(
    { product_type, variant, price_thb, set_by: 'admin' },
    { onConflict: 'product_type,variant' },
  )

  if (error) {
    return { status: 'error', message: 'ไม่สามารถบันทึกราคาได้ กรุณาลองอีกครั้ง' }
  }

  revalidatePath('/admin/prices')
  revalidatePath('/')

  const labelMap: Record<string, string> = {
    ready_to_eat: 'มังคุด (แก่จัด)',
    ripen_3_4_days: 'มังคุด (รอสุกอีกนิด เก็บไว้แบ่งทาน)',
    size_s: 'ทุเรียน Size S',
    size_m: 'ทุเรียน Size M',
    size_l: 'ทุเรียน Size L',
  }

  return {
    status: 'success',
    message: `บันทึกราคา ${labelMap[variant] ?? variant} = ${price_thb.toLocaleString('th-TH')} ฿ สำเร็จ`,
  }
}

// ─── Clear a price (fall back to DOAE) ────────────────────────────────────────

export async function clearProductPrice(
  productType: ProductType,
  variant: ProductVariant,
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('product_prices')
    .delete()
    .eq('product_type', productType)
    .eq('variant', variant)

  if (error) return { error: 'ไม่สามารถลบราคาได้' }

  revalidatePath('/admin/prices')
  revalidatePath('/')
  return {}
}
