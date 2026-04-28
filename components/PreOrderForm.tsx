'use client'

import { useActionState, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Leaf,
  Package,
  Truck,
} from 'lucide-react'
import { submitPreOrder, type PreOrderActionState } from '@/app/actions/pre-order'
import { calculateShipping, DURIAN_WEIGHT_KG } from '@/lib/shipping'
import type { OrderItem, ProductPrice, ShippingRate, YieldQuota } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPrice(prices: ProductPrice[], productType: string, variant: string): number {
  return (
    prices.find((p) => p.product_type === productType && p.variant === variant)?.price_thb ?? 0
  )
}

function fmt(amount: number): string {
  return amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function itemLabel(item: OrderItem): string {
  const labels: Record<string, string> = {
    'mangosteen:ready_to_eat': 'มังคุด แก่จัด พร้อมรับประทาน',
    'mangosteen:ripen_3_4_days': 'มังคุด แก่อีก 3-4 วัน',
    'durian:size_s': 'ทุเรียนหมอนทอง Size S',
    'durian:size_m': 'ทุเรียนหมอนทอง Size M',
    'durian:size_l': 'ทุเรียนหมอนทอง Size L',
  }
  const key = `${item.product_type}:${item.variant}`
  const unit = item.unit === 'kg' ? 'kg' : 'ลูก'
  return `${labels[key] ?? key} × ${item.quantity} ${unit}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({
  errors,
  field,
}: {
  errors?: Record<string, string[]>
  field: string
}) {
  const msgs = errors?.[field]
  if (!msgs?.length) return null
  return <p className="mt-1 text-sm text-red-600">{msgs[0]}</p>
}

function QuotaBadge({
  remaining,
  total,
}: {
  remaining: number
  total: number
}) {
  if (total <= 0) return null
  const pct = (remaining / total) * 100
  const color = pct > 50 ? 'text-forest' : pct > 20 ? 'text-earth' : 'text-red-600'
  return (
    <span className={`text-xs font-medium ${color}`}>
      เหลือโควตา {fmt(remaining)} kg
    </span>
  )
}

interface QuantityRowProps {
  label: string
  sublabel?: string
  unit: string
  price: number
  value: string
  onChange: (v: string) => void
  inputMode: 'decimal' | 'numeric'
  step: string
}

function QuantityRow({
  label,
  sublabel,
  unit,
  price,
  value,
  onChange,
  inputMode,
  step,
}: QuantityRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-earth/15 bg-cream px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-forest leading-tight">{label}</p>
        {sublabel && <p className="text-xs text-earth/70 mt-0.5">{sublabel}</p>}
        <p className="text-xs text-earth mt-0.5">
          {price > 0 ? `${fmt(price)} บาท/${unit}` : 'กำลังโหลดราคา...'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          inputMode={inputMode}
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded-lg border border-earth/30 bg-white px-3 py-1.5 text-center text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          placeholder="0"
        />
        <span className="w-6 text-xs text-earth">{unit}</span>
      </div>
    </div>
  )
}

function SuccessCard({ orderId }: { orderId: string }) {
  return (
    <div className="rounded-2xl border border-forest/20 bg-forest/5 p-10 text-center">
      <CheckCircle className="mx-auto mb-4 h-16 w-16 text-forest" />
      <h2 className="font-heading text-2xl font-bold text-forest">สั่งจองสำเร็จ!</h2>
      <p className="mt-2 text-earth">ขอบคุณที่สั่งจองกับบ้านเต้: เขียวสุวรรณ</p>
      <p className="mt-5 rounded-lg bg-white px-4 py-3 text-xs text-earth/70">
        หมายเลขคำสั่งจอง:{' '}
        <span className="font-mono text-forest break-all">{orderId}</span>
      </p>
      <p className="mt-4 text-sm text-earth">
        ทีมงานจะติดต่อกลับภายใน 1–2 วันทำการ
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PreOrderFormProps {
  shippingRates: ShippingRate[]
  prices: ProductPrice[]
  quotas: YieldQuota[]
}

export default function PreOrderForm({
  shippingRates,
  prices,
  quotas,
}: PreOrderFormProps) {
  // ── Form field state ──
  const [fullName, setFullName] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [lineId, setLineId] = useState('')
  const [pdpaChecked, setPdpaChecked] = useState(false)

  // ── Quantities ──
  const [mangoReadyKg, setMangoReadyKg] = useState('')
  const [mangoRipenKg, setMangoRipenKg] = useState('')
  const [durianS, setDurianS] = useState('')
  const [durianM, setDurianM] = useState('')
  const [durianL, setDurianL] = useState('')

  // ── Server action ──
  const [actionState, formAction, isPending] = useActionState(
    submitPreOrder,
    { status: 'idle' } as PreOrderActionState,
  )

  // ── Prices ──
  const priceMangoReady = getPrice(prices, 'mangosteen', 'ready_to_eat')
  const priceMangoRipen = getPrice(prices, 'mangosteen', 'ripen_3_4_days')
  const priceDurianS = getPrice(prices, 'durian', 'size_s')
  const priceDurianM = getPrice(prices, 'durian', 'size_m')
  const priceDurianL = getPrice(prices, 'durian', 'size_l')

  // ── Computed: items array ──
  const items = useMemo<OrderItem[]>(() => {
    const list: OrderItem[] = []
    const qMR = parseFloat(mangoReadyKg)
    const qMRp = parseFloat(mangoRipenKg)
    const qDS = parseInt(durianS)
    const qDM = parseInt(durianM)
    const qDL = parseInt(durianL)

    if (qMR > 0)
      list.push({ product_type: 'mangosteen', variant: 'ready_to_eat', unit: 'kg', quantity: qMR, unit_price_thb: priceMangoReady })
    if (qMRp > 0)
      list.push({ product_type: 'mangosteen', variant: 'ripen_3_4_days', unit: 'kg', quantity: qMRp, unit_price_thb: priceMangoRipen })
    if (qDS > 0)
      list.push({ product_type: 'durian', variant: 'size_s', unit: 'pieces', quantity: qDS, unit_price_thb: priceDurianS })
    if (qDM > 0)
      list.push({ product_type: 'durian', variant: 'size_m', unit: 'pieces', quantity: qDM, unit_price_thb: priceDurianM })
    if (qDL > 0)
      list.push({ product_type: 'durian', variant: 'size_l', unit: 'pieces', quantity: qDL, unit_price_thb: priceDurianL })

    return list
  }, [mangoReadyKg, mangoRipenKg, durianS, durianM, durianL, priceMangoReady, priceMangoRipen, priceDurianS, priceDurianM, priceDurianL])

  // ── Computed: total weight ──
  const totalWeightKg = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (item.product_type === 'mangosteen') return sum + item.quantity
        return sum + item.quantity * DURIAN_WEIGHT_KG[item.variant as keyof typeof DURIAN_WEIGHT_KG]
      }, 0),
    [items],
  )

  // ── Computed: shipping ──
  const shipping = useMemo(
    () => calculateShipping(shippingRates, totalWeightKg),
    [shippingRates, totalWeightKg],
  )

  // ── Computed: product subtotal ──
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.unit_price_thb, 0),
    [items],
  )

  // ── Quotas ──
  const mangoQuota = quotas.find((q) => q.product_type === 'mangosteen')
  const durianQuota = quotas.find((q) => q.product_type === 'durian')

  // ── Field errors ──
  const fieldErrors = actionState.status === 'error' ? actionState.fieldErrors : undefined

  // ── Success state ──
  if (actionState.status === 'success') {
    return <SuccessCard orderId={actionState.orderId} />
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Error banner */}
      {actionState.status === 'error' && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{actionState.message}</p>
        </div>
      )}

      {/* ── Section 1: Customer Info ─────────────────────────────── */}
      <section className="rounded-2xl border border-earth/20 bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-heading text-lg font-semibold text-forest">
          ข้อมูลผู้สั่งจอง
        </h2>

        <div className="flex flex-col gap-4">
          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-forest">
              ชื่อ-นามสกุล <span className="text-red-500">*</span>
            </label>
            <input
              name="full_name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="mt-1.5 w-full rounded-lg border border-earth/30 bg-cream px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              placeholder="เช่น สมชาย ใจดี"
            />
            <FieldError errors={fieldErrors} field="full_name" />
          </div>

          {/* Shipping address */}
          <div>
            <label className="block text-sm font-medium text-forest">
              ที่อยู่จัดส่ง <span className="text-red-500">*</span>
            </label>
            <textarea
              name="shipping_address"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              required
              rows={3}
              className="mt-1.5 w-full resize-none rounded-lg border border-earth/30 bg-cream px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              placeholder="บ้านเลขที่ / หมู่ / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์"
            />
            <FieldError errors={fieldErrors} field="shipping_address" />
          </div>

          {/* Contact channels */}
          <div>
            <p className="text-sm font-medium text-forest">
              ช่องทางติดต่อ{' '}
              <span className="text-earth font-normal">(กรุณากรอกอย่างน้อย 1 ช่องทาง)</span>
            </p>
            {fieldErrors?.['_contact'] && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors['_contact'][0]}</p>
            )}
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-earth">อีเมล</label>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border border-earth/30 bg-cream px-4 py-2.5 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                  placeholder="example@email.com"
                />
                <FieldError errors={fieldErrors} field="email" />
              </div>
              <div>
                <label className="block text-xs font-medium text-earth">เบอร์โทรศัพท์</label>
                <input
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  className="mt-1 w-full rounded-lg border border-earth/30 bg-cream px-4 py-2.5 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                  placeholder="08X-XXX-XXXX"
                />
                <FieldError errors={fieldErrors} field="phone" />
              </div>
              <div>
                <label className="block text-xs font-medium text-earth">Line ID</label>
                <input
                  name="line_id"
                  type="text"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-earth/30 bg-cream px-4 py-2.5 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                  placeholder="@lineid"
                />
                <FieldError errors={fieldErrors} field="line_id" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Products ──────────────────────────────────── */}
      <section className="rounded-2xl border border-earth/20 bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-heading text-lg font-semibold text-forest">
          เลือกสินค้า
        </h2>

        {/* Mangosteen */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-forest" />
              <h3 className="font-medium text-forest">มังคุด (Mangosteen)</h3>
            </div>
            {mangoQuota && (
              <QuotaBadge
                remaining={mangoQuota.remaining_kg}
                total={mangoQuota.available_quota_kg}
              />
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            <QuantityRow
              label="แก่จัด พร้อมรับประทาน"
              unit="kg"
              price={priceMangoReady}
              value={mangoReadyKg}
              onChange={setMangoReadyKg}
              inputMode="decimal"
              step="0.5"
            />
            <QuantityRow
              label="แก่อีก 3-4 วัน"
              unit="kg"
              price={priceMangoRipen}
              value={mangoRipenKg}
              onChange={setMangoRipenKg}
              inputMode="decimal"
              step="0.5"
            />
          </div>
        </div>

        <hr className="border-earth/10" />

        {/* Durian */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-earth" />
              <h3 className="font-medium text-forest">ทุเรียนหมอนทอง</h3>
            </div>
            {durianQuota && (
              <QuotaBadge
                remaining={durianQuota.remaining_kg}
                total={durianQuota.available_quota_kg}
              />
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            <QuantityRow
              label="Size S"
              sublabel="น้ำหนัก 3–4 kg/ลูก"
              unit="ลูก"
              price={priceDurianS}
              value={durianS}
              onChange={setDurianS}
              inputMode="numeric"
              step="1"
            />
            <QuantityRow
              label="Size M"
              sublabel="น้ำหนัก 4–5 kg/ลูก"
              unit="ลูก"
              price={priceDurianM}
              value={durianM}
              onChange={setDurianM}
              inputMode="numeric"
              step="1"
            />
            <QuantityRow
              label="Size L"
              sublabel="น้ำหนัก 5+ kg/ลูก"
              unit="ลูก"
              price={priceDurianL}
              value={durianL}
              onChange={setDurianL}
              inputMode="numeric"
              step="1"
            />
          </div>
        </div>

        <FieldError errors={fieldErrors} field="items" />
      </section>

      {/* ── Section 3: Order Summary (live) ─────────────────────── */}
      {items.length > 0 && (
        <section className="rounded-2xl border border-forest/15 bg-forest/5 p-6">
          <h2 className="mb-4 font-heading text-base font-semibold text-forest">
            สรุปคำสั่งจอง
          </h2>

          {/* Line items */}
          <div className="mb-3 flex flex-col gap-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-earth truncate pr-4">{itemLabel(item)}</span>
                <span className="font-medium text-forest shrink-0">
                  {fmt(item.quantity * item.unit_price_thb)} ฿
                </span>
              </div>
            ))}
          </div>

          <hr className="border-forest/10" />

          {/* Shipping */}
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-earth">
                <Truck className="h-3.5 w-3.5" />
                น้ำหนักรวม
              </span>
              <span className="text-forest">{totalWeightKg.toFixed(2)} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-earth">ค่าขนส่ง (เฉลี่ย Flash / KEX)</span>
              <span className="text-forest">{fmt(shipping.shippingFee)} ฿</span>
            </div>
            <div className="flex justify-between">
              <span className="text-earth">ค่าบรรจุภัณฑ์</span>
              <span className="text-forest">{fmt(shipping.packagingFee)} ฿</span>
            </div>
          </div>

          <hr className="mt-3 border-forest/10" />

          <div className="mt-3 flex justify-between">
            <span className="font-heading font-semibold text-forest">ยอดรวมทั้งหมด</span>
            <span className="font-heading font-bold text-earth text-lg">
              {fmt(subtotal + shipping.total)} ฿
            </span>
          </div>

          <p className="mt-2 text-xs text-earth/60">
            * ค่าขนส่งเป็นราคาประมาณการ อาจปรับตามน้ำหนักจริงหลังจัดส่ง
          </p>
        </section>
      )}

      {/* ── Section 4: PDPA ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-earth/20 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-heading text-base font-semibold text-forest">
          ยินยอมการเก็บข้อมูลส่วนบุคคล (PDPA)
        </h2>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={pdpaChecked}
            onChange={(e) => setPdpaChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#2D5016]"
          />
          <span className="text-sm leading-relaxed text-earth">
            ข้าพเจ้ายินยอมให้ <strong className="text-forest">บ้านเต้: เขียวสุวรรณ</strong>{' '}
            เก็บรวบรวมและใช้ข้อมูลส่วนบุคคล ได้แก่ ชื่อ ที่อยู่ และข้อมูลติดต่อ
            เพื่อวัตถุประสงค์ในการจัดส่งสินค้าและการติดต่อเกี่ยวกับคำสั่งจองเท่านั้น
            ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA) พ.ศ. 2562{' '}
            <span className="text-red-500">*</span>
          </span>
        </label>
        <FieldError errors={fieldErrors} field="pdpa_consent" />
      </section>

      {/* ── Hidden inputs for computed values ───────────────────── */}
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="shipping_fee_thb" value={shipping.shippingFee} />
      <input type="hidden" name="packaging_fee_thb" value={shipping.packagingFee} />
      <input type="hidden" name="pdpa_consent" value={String(pdpaChecked)} />

      {/* ── Submit ──────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isPending || !pdpaChecked}
        className="w-full rounded-2xl bg-forest px-6 py-4 font-heading text-lg font-semibold text-cream shadow-md transition-all hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
      >
        {isPending ? 'กำลังบันทึก...' : 'สั่งจองเลย →'}
      </button>

      <p className="pb-2 text-center text-xs text-earth/60">
        หลังจากสั่งจองแล้ว ทีมงานจะติดต่อกลับภายใน 1–2 วันทำการ
      </p>
    </form>
  )
}
