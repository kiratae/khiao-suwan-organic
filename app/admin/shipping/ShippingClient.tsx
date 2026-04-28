'use client'

import { useActionState, useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, Trash2, Plus, Truck } from 'lucide-react'
import {
  upsertShippingRate,
  deleteShippingRateById,
  type ShippingActionState,
} from '@/app/actions/shipping'
import type { ShippingRate } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CARRIER_LABEL: Record<string, string> = {
  flash_express: 'Flash Express',
  kex: 'KEX Express',
}

function fmtWeight(min: number, max: number | null) {
  if (max === null) return `${min}+ กก.`
  return `${min} – ${max} กก.`
}

function fmtThb(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Status banner ────────────────────────────────────────────────────────────

function StatusBanner({ state }: { state: ShippingActionState }) {
  if (state.status === 'idle') return null
  const isOk = state.status === 'success'
  return (
    <div
      className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
        isOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {isOk ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
      {state.message}
    </div>
  )
}

// ─── Shared field row ─────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-36 shrink-0 text-xs text-earth/70">{label}</label>
      {children}
    </div>
  )
}

function NumInput({
  name,
  defaultValue,
  placeholder,
  required,
  min,
}: {
  name: string
  defaultValue?: number | null
  placeholder?: string
  required?: boolean
  min?: number
}) {
  return (
    <input
      name={name}
      type="number"
      inputMode="decimal"
      step="0.01"
      min={min ?? 0}
      required={required}
      defaultValue={defaultValue ?? undefined}
      placeholder={placeholder ?? '–'}
      className="w-full rounded-lg border border-earth/30 bg-cream px-3 py-2 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
    />
  )
}

// ─── Existing rate row (inline edit + delete) ─────────────────────────────────

function ShippingRateRow({ rate }: { rate: ShippingRate }) {
  const [saveState, saveAction, savePending] = useActionState(upsertShippingRate, {
    status: 'idle',
  } as ShippingActionState)
  const [delState, delAction, delPending] = useActionState(deleteShippingRateById, {
    status: 'idle',
  } as ShippingActionState)

  return (
    <div className="rounded-xl border border-earth/15 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <p className="font-semibold text-forest text-sm">
          {fmtWeight(rate.min_weight_kg, rate.max_weight_kg)}
        </p>
        <div className="flex items-center gap-1 text-xs text-earth/60">
          <span>{fmtThb(rate.rate_thb_per_kg)} ฿/กก.</span>
          <span>·</span>
          <span>บรรจุ {fmtThb(rate.packaging_fee_thb)} ฿</span>
          {/* Delete form */}
          <form action={delAction} className="ml-1">
            <input type="hidden" name="id" value={rate.id} />
            <button
              type="submit"
              disabled={delPending}
              title="ลบช่วงน้ำหนักนี้"
              className="rounded-lg p-1.5 text-earth/40 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Edit form */}
      <form action={saveAction} className="space-y-2.5">
        <input type="hidden" name="id" value={rate.id} />
        <input type="hidden" name="carrier" value={rate.carrier} />

        <FieldRow label="น้ำหนักขั้นต่ำ (กก.)">
          <NumInput name="min_weight_kg" defaultValue={rate.min_weight_kg} required min={0} />
        </FieldRow>
        <FieldRow label="น้ำหนักสูงสุด (กก.)">
          <NumInput
            name="max_weight_kg"
            defaultValue={rate.max_weight_kg}
            placeholder="ไม่จำกัด"
          />
        </FieldRow>
        <FieldRow label="อัตรา (฿/กก.)">
          <NumInput name="rate_thb_per_kg" defaultValue={rate.rate_thb_per_kg} required min={0.01} />
        </FieldRow>
        <FieldRow label="ค่าบรรจุภัณฑ์ (฿)">
          <NumInput name="packaging_fee_thb" defaultValue={rate.packaging_fee_thb} required />
        </FieldRow>

        <button
          type="submit"
          disabled={savePending}
          className="mt-1 w-full rounded-lg bg-forest py-2 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {savePending ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </form>

      <StatusBanner state={saveState} />
      <StatusBanner state={delState} />
    </div>
  )
}

// ─── Add new rate form ────────────────────────────────────────────────────────

function AddRateForm({ carrier }: { carrier: 'flash_express' | 'kex' }) {
  const [open, setOpen] = useState(false)
  const [state, action, isPending] = useActionState(upsertShippingRate, {
    status: 'idle',
  } as ShippingActionState)

  useEffect(() => {
    if (state.status === 'success') setOpen(false)
  }, [state])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-earth/30 py-3 text-sm text-earth/60 hover:border-forest/50 hover:text-forest transition-colors"
      >
        <Plus className="h-4 w-4" />
        เพิ่มช่วงน้ำหนัก
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-xl border border-earth/15 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-forest">เพิ่มช่วงน้ำหนักใหม่</p>
      <form action={action} className="space-y-2.5">
        <input type="hidden" name="carrier" value={carrier} />

        <FieldRow label="น้ำหนักขั้นต่ำ (กก.)">
          <NumInput name="min_weight_kg" placeholder="เช่น 20" required min={0} />
        </FieldRow>
        <FieldRow label="น้ำหนักสูงสุด (กก.)">
          <NumInput name="max_weight_kg" placeholder="เว้นว่าง = ไม่จำกัด" />
        </FieldRow>
        <FieldRow label="อัตรา (฿/กก.)">
          <NumInput name="rate_thb_per_kg" placeholder="เช่น 20.00" required min={0.01} />
        </FieldRow>
        <FieldRow label="ค่าบรรจุภัณฑ์ (฿)">
          <NumInput name="packaging_fee_thb" placeholder="เช่น 50.00" required />
        </FieldRow>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-lg bg-forest py-2 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'กำลังเพิ่ม…' : 'เพิ่มช่วงน้ำหนัก'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-earth/30 px-4 py-2 text-sm text-earth hover:bg-cream transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </form>

      <StatusBanner state={state} />
    </div>
  )
}

// ─── Carrier section ──────────────────────────────────────────────────────────

function CarrierSection({
  carrier,
  rates,
}: {
  carrier: 'flash_express' | 'kex'
  rates: ShippingRate[]
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Truck className="h-4 w-4 text-earth" />
        <h2 className="font-semibold text-forest">{CARRIER_LABEL[carrier]}</h2>
        <span className="rounded-full bg-earth/10 px-2 py-0.5 text-xs text-earth">
          {rates.length} ช่วง
        </span>
      </div>

      {rates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-earth/20 py-6 text-center text-sm text-earth/50">
          ยังไม่มีช่วงน้ำหนัก
        </p>
      ) : (
        <div className="space-y-3">
          {rates.map((r) => (
            <ShippingRateRow key={r.id} rate={r} />
          ))}
        </div>
      )}

      <AddRateForm carrier={carrier} />
    </div>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

interface ShippingClientProps {
  rates: ShippingRate[]
}

export default function ShippingClient({ rates }: ShippingClientProps) {
  const flash = rates.filter((r) => r.carrier === 'flash_express')
  const kex = rates.filter((r) => r.carrier === 'kex')

  return (
    <div className="space-y-6">
      {/* Formula info */}
      <div className="rounded-xl border border-earth/15 bg-earth/5 p-4">
        <p className="text-xs text-earth/80 leading-relaxed">
          <span className="font-semibold">สูตรคำนวณ:</span>{' '}
          อัตราเฉลี่ย = (Flash + KEX) ÷ 2 &nbsp;·&nbsp;
          ค่าขนส่ง = น้ำหนัก × อัตราเฉลี่ย + ค่าบรรจุภัณฑ์เฉลี่ย
        </p>
      </div>

      {/* Two-column layout on md+ */}
      <div className="grid gap-6 md:grid-cols-2">
        <CarrierSection carrier="flash_express" rates={flash} />
        <CarrierSection carrier="kex" rates={kex} />
      </div>
    </div>
  )
}
