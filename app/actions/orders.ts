'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

const updateStatusSchema = z.object({
  order_id: z.string().uuid('รหัสคำสั่งจองไม่ถูกต้อง'),
  status: z.enum(['pending', 'confirmed', 'shipped', 'cancelled']),
})

export type OrderStatusActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

export async function updateOrderStatus(
  _prev: OrderStatusActionState,
  formData: FormData,
): Promise<OrderStatusActionState> {
  const parsed = updateStatusSchema.safeParse({
    order_id: formData.get('order_id'),
    status: formData.get('status'),
  })

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }

  const { order_id, status } = parsed.data
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('pre_orders')
    .update({ status })
    .eq('id', order_id)

  if (error) {
    return { status: 'error', message: 'ไม่สามารถอัปเดตสถานะได้ กรุณาลองอีกครั้ง' }
  }

  revalidatePath('/admin/orders')

  const labelMap: Record<string, string> = {
    pending: 'รอการยืนยัน',
    confirmed: 'ยืนยันแล้ว',
    shipped: 'จัดส่งแล้ว',
    cancelled: 'ยกเลิก',
  }

  return { status: 'success', message: `อัปเดตสถานะเป็น "${labelMap[status]}" สำเร็จ` }
}
