'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'

// ─── Zod schema ────────────────────────────────────────────────────────────────

const orderItemSchema = z.union([
  z.object({
    product_type: z.literal('mangosteen'),
    variant: z.enum(['ready_to_eat', 'ripen_3_4_days']),
    unit: z.literal('kg'),
    quantity: z.number().positive('จำนวนต้องมากกว่า 0'),
    unit_price_thb: z.number().nonnegative(),
  }),
  z.object({
    product_type: z.literal('durian'),
    variant: z.enum(['size_s', 'size_m', 'size_l']),
    unit: z.literal('pieces'),
    quantity: z.number().int().positive('จำนวนต้องมากกว่า 0'),
    unit_price_thb: z.number().nonnegative(),
  }),
])

const preOrderSchema = z
  .object({
    full_name: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล').max(200),
    shipping_address: z.string().min(5, 'กรุณากรอกที่อยู่จัดส่ง').max(1000),
    email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').or(z.literal('')).optional(),
    phone: z
      .string()
      .regex(/^[0-9+\-\s()]{7,20}$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง')
      .or(z.literal(''))
      .optional(),
    line_id: z.string().max(100).or(z.literal('')).optional(),
    pdpa_consent: z.literal(true, {
      errorMap: () => ({ message: 'กรุณายินยอมการเก็บข้อมูลส่วนบุคคล' }),
    }),
    items: z.array(orderItemSchema).min(1, 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ'),
    shipping_fee_thb: z.number().nonnegative(),
    packaging_fee_thb: z.number().nonnegative(),
  })
  .refine((d) => d.email || d.phone || d.line_id, {
    message: 'กรุณากรอกช่องทางติดต่ออย่างน้อย 1 ช่องทาง (อีเมล, เบอร์โทร, หรือ Line ID)',
    path: ['_contact'],
  })

// ─── Action state ──────────────────────────────────────────────────────────────

export type PreOrderActionState =
  | { status: 'idle' }
  | { status: 'success'; orderId: string }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string[]> }

// ─── Server action ─────────────────────────────────────────────────────────────

export async function submitPreOrder(
  _prev: PreOrderActionState,
  formData: FormData,
): Promise<PreOrderActionState> {
  // Parse items JSON from hidden input
  let rawItems: unknown
  try {
    rawItems = JSON.parse((formData.get('items') as string) ?? '[]')
  } catch {
    return { status: 'error', message: 'ข้อมูลสินค้าไม่ถูกต้อง กรุณาลองอีกครั้ง' }
  }

  const parsed = {
    full_name: formData.get('full_name') as string,
    shipping_address: formData.get('shipping_address') as string,
    email: (formData.get('email') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
    line_id: (formData.get('line_id') as string) || undefined,
    // pdpa_consent comes from a hidden input with value "true" | "false"
    pdpa_consent:
      formData.get('pdpa_consent') === 'true'
        ? (true as const)
        : (false as unknown as true),
    items: rawItems,
    shipping_fee_thb: Number(formData.get('shipping_fee_thb') ?? 0),
    packaging_fee_thb: Number(formData.get('packaging_fee_thb') ?? 0),
  }

  const result = preOrderSchema.safeParse(parsed)
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_root'
      ;(fieldErrors[key] ??= []).push(issue.message)
    }
    return { status: 'error', message: 'กรุณาตรวจสอบข้อมูลอีกครั้ง', fieldErrors }
  }

  const data = result.data
  const supabase = createAdminClient()

  // Insert pre_order header
  const { data: order, error: orderError } = await supabase
    .from('pre_orders')
    .insert({
      full_name: data.full_name,
      shipping_address: data.shipping_address,
      email: data.email || null,
      phone: data.phone || null,
      line_id: data.line_id || null,
      pdpa_consent: true,
      shipping_fee_thb: data.shipping_fee_thb,
      packaging_fee_thb: data.packaging_fee_thb,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return { status: 'error', message: 'ไม่สามารถบันทึกคำสั่งจองได้ กรุณาลองอีกครั้ง' }
  }

  // Insert order items
  const { error: itemsError } = await supabase.from('order_items').insert(
    data.items.map((item) => ({
      order_id: order.id,
      product_type: item.product_type,
      variant: item.variant,
      unit: item.unit,
      quantity: item.quantity,
      unit_price_thb: item.unit_price_thb,
    })),
  )

  if (itemsError) {
    // Best-effort rollback — cascade delete removes items too
    await supabase.from('pre_orders').delete().eq('id', order.id)
    return { status: 'error', message: 'ไม่สามารถบันทึกรายการสินค้าได้ กรุณาลองอีกครั้ง' }
  }

  return { status: 'success', orderId: order.id }
}
