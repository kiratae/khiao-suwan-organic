'use client'

import { useActionState, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Package,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { updateOrderStatus, type OrderStatusActionState } from '@/app/actions/orders'
import type { OrderRow, OrderItemRow } from './page'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pending', label: 'รอยืนยัน' },
  { key: 'confirmed', label: 'ยืนยันแล้ว' },
  { key: 'shipped', label: 'จัดส่งแล้ว' },
  { key: 'cancelled', label: 'ยกเลิก' },
] as const

const STATUS_OPTIONS = [
  { value: 'pending', label: 'รอการยืนยัน' },
  { value: 'confirmed', label: 'ยืนยันแล้ว' },
  { value: 'shipped', label: 'จัดส่งแล้ว' },
  { value: 'cancelled', label: 'ยกเลิก' },
] as const

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอการยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  shipped: 'จัดส่งแล้ว',
  cancelled: 'ยกเลิก',
}

const VARIANT_LABEL: Record<string, string> = {
  ready_to_eat: 'มังคุด แก่จัด',
  ripen_3_4_days: 'มังคุด รอสุกอีกนิด เก็บไว้แบ่งทาน',
  size_s: 'ทุเรียน Size S',
  size_m: 'ทุเรียน Size M',
  size_l: 'ทุเรียน Size L',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function orderTotal(order: OrderRow) {
  const itemsTotal = order.order_items.reduce((sum, i) => sum + Number(i.subtotal_thb), 0)
  return itemsTotal + Number(order.shipping_fee_thb) + Number(order.packaging_fee_thb)
}

// ─── Status Update Form ───────────────────────────────────────────────────────

function StatusForm({ order }: { order: OrderRow }) {
  const [state, action, isPending] = useActionState(
    updateOrderStatus,
    { status: 'idle' } as OrderStatusActionState,
  )

  return (
    <div>
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="order_id" value={order.id} />
        <select
          name="status"
          defaultValue={order.status}
          className="rounded-lg border border-earth/30 bg-cream px-3 py-1.5 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-forest px-3 py-1.5 text-sm font-medium text-cream transition-colors hover:bg-forest/80 disabled:opacity-50"
        >
          {isPending ? '...' : 'บันทึก'}
        </button>
      </form>
      {state.status === 'success' && (
        <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
          <CheckCircle className="h-3 w-3" />
          {state.message}
        </p>
      )}
      {state.status === 'error' && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3" />
          {state.message}
        </p>
      )}
    </div>
  )
}

// ─── Items breakdown ──────────────────────────────────────────────────────────

function ItemsBreakdown({ items }: { items: OrderItemRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-earth/10 text-left">
          <th className="pb-2 font-medium text-earth">สินค้า</th>
          <th className="pb-2 text-right font-medium text-earth">จำนวน</th>
          <th className="pb-2 text-right font-medium text-earth">ราคา/หน่วย</th>
          <th className="pb-2 text-right font-medium text-earth">รวม</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-earth/5">
            <td className="py-1.5 text-forest">
              {VARIANT_LABEL[item.variant] ?? item.variant}
            </td>
            <td className="py-1.5 text-right text-earth">
              {item.quantity} {item.unit === 'kg' ? 'kg' : 'ลูก'}
            </td>
            <td className="py-1.5 text-right text-earth">{fmt(item.unit_price_thb)} ฿</td>
            <td className="py-1.5 text-right font-medium text-forest">
              {fmt(item.subtotal_thb)} ฿
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Order Row ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: OrderRow }) {
  const [expanded, setExpanded] = useState(false)
  const total = orderTotal(order)

  return (
    <div className="rounded-xl border border-earth/15 bg-white shadow-sm">
      {/* Header row */}
      <div className="flex items-start gap-4 p-4">
        {/* Left: ID + date */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-earth/60">
              #{shortId(order.id)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status]}`}
            >
              {STATUS_LABEL[order.status]}
            </span>
            <span className="text-xs text-earth/50">{formatDate(order.created_at)}</span>
          </div>

          <p className="mt-1 font-semibold text-forest">{order.full_name}</p>

          {/* Contact */}
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-earth/70">
            {order.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {order.email}
              </span>
            )}
            {order.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {order.phone}
              </span>
            )}
            {order.line_id && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {order.line_id}
              </span>
            )}
          </div>

          {/* Address */}
          <p className="mt-1 flex items-start gap-1 text-xs text-earth/60">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{order.shipping_address}</span>
          </p>
        </div>

        {/* Right: total + status action */}
        <div className="flex flex-col items-end gap-2">
          <p className="text-lg font-bold text-forest">{fmt(total)} ฿</p>
          <div className="flex items-center gap-2 text-xs text-earth/60">
            <Package className="h-3 w-3" />
            {order.order_items.length} รายการ
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <div className="border-t border-earth/10 px-4 py-2">
        <div className="flex items-center justify-between">
          <StatusForm order={order} />
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-earth/60 hover:text-earth"
          >
            {expanded ? (
              <>
                ซ่อน <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                รายละเอียด <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-earth/10 bg-cream/40 px-4 py-4">
          <ItemsBreakdown items={order.order_items} />

          {/* Fee summary */}
          <div className="mt-3 space-y-1 border-t border-earth/10 pt-3 text-sm">
            <div className="flex justify-between text-earth/70">
              <span>ค่าจัดส่ง</span>
              <span>{fmt(order.shipping_fee_thb)} ฿</span>
            </div>
            <div className="flex justify-between text-earth/70">
              <span>ค่าบรรจุภัณฑ์</span>
              <span>{fmt(order.packaging_fee_thb)} ฿</span>
            </div>
            <div className="flex justify-between font-bold text-forest">
              <span>รวมทั้งหมด</span>
              <span>{fmt(total)} ฿</span>
            </div>
          </div>

          {/* Address full */}
          <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-earth/70">
            <span className="font-medium text-earth">ที่อยู่จัดส่ง:</span> {order.shipping_address}
          </div>

          {order.notes && (
            <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="font-medium">หมายเหตุ:</span> {order.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function OrdersClient({ orders }: { orders: OrderRow[] }) {
  const [activeTab, setActiveTab] = useState<string>('all')

  const filtered =
    activeTab === 'all' ? orders : orders.filter((o) => o.status === activeTab)

  const countByStatus = (key: string) =>
    key === 'all' ? orders.length : orders.filter((o) => o.status === key).length

  return (
    <div>
      {/* Status filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count = countByStatus(tab.key)
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-forest text-cream shadow-sm'
                  : 'bg-white text-earth hover:bg-cream border border-earth/20'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  isActive ? 'bg-white/20 text-cream' : 'bg-earth/10 text-earth/60'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Order cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-earth/15 bg-white px-6 py-12 text-center text-earth/50">
          ไม่มีคำสั่งจองในสถานะนี้
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
