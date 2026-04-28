'use client'

import { useActionState, useState } from 'react'
import { CheckCircle, AlertTriangle, Tag, Trash2 } from 'lucide-react'
import { upsertProductPrice, clearProductPrice, type PriceActionState } from '@/app/actions/prices'
import type { ProductPrice } from '@/lib/types'

interface Variant {
  product_type: 'mangosteen' | 'durian'
  variant: string
  label: string
  unit: string
}

interface PricesClientProps {
  variants: Variant[]
  currentPrices: ProductPrice[]
}

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function PriceRowForm({ v, currentPrice }: { v: Variant; currentPrice?: number }) {
  const [state, action, isPending] = useActionState(
    upsertProductPrice,
    { status: 'idle' } as PriceActionState,
  )
  const [clearing, setClearing] = useState(false)

  async function handleClear() {
    setClearing(true)
    await clearProductPrice(
      v.product_type as 'mangosteen' | 'durian',
      v.variant as Parameters<typeof clearProductPrice>[1],
    )
    setClearing(false)
  }

  return (
    <div className="rounded-xl border border-earth/15 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-forest text-sm">{v.label}</p>
          {currentPrice !== undefined ? (
            <p className="mt-0.5 text-xs text-earth">
              ราคาปัจจุบัน:{' '}
              <span className="font-semibold text-forest">{fmt(currentPrice)} ฿/{v.unit}</span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-earth/60">ใช้ราคา DOAE (ไม่ได้ตั้งค่า)</p>
          )}
        </div>
        {currentPrice !== undefined && (
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing}
            title="ลบราคา (ใช้ DOAE)"
            className="shrink-0 rounded-lg p-1.5 text-earth/50 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <form action={action} className="flex gap-2">
        <input type="hidden" name="product_type" value={v.product_type} />
        <input type="hidden" name="variant" value={v.variant} />
        <div className="relative flex-1">
          <input
            name="price_thb"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            defaultValue={currentPrice}
            required
            placeholder="กรอกราคา"
            className="w-full rounded-lg border border-earth/30 bg-cream px-3 py-2 pr-12 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-earth">
            ฿/{v.unit}
          </span>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-forest-light disabled:opacity-50"
        >
          {isPending ? '...' : 'บันทึก'}
        </button>
      </form>

      {state.status === 'success' && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700">
          <CheckCircle className="h-3.5 w-3.5" />
          {state.message}
        </div>
      )}
      {state.status === 'error' && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          {state.message}
        </div>
      )}
    </div>
  )
}

export default function PricesClient({ variants, currentPrices }: PricesClientProps) {
  function getPrice(productType: string, variant: string): number | undefined {
    return currentPrices.find(
      (p) => p.product_type === productType && p.variant === variant,
    )?.price_thb
  }

  const mangosteen = variants.filter((v) => v.product_type === 'mangosteen')
  const durian = variants.filter((v) => v.product_type === 'durian')

  return (
    <div className="flex flex-col gap-8">
      {/* Mangosteen */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4 text-forest" />
          <h2 className="font-heading font-semibold text-forest">มังคุด</h2>
        </div>
        <div className="flex flex-col gap-3">
          {mangosteen.map((v) => (
            <PriceRowForm key={v.variant} v={v} currentPrice={getPrice(v.product_type, v.variant)} />
          ))}
        </div>
      </section>

      {/* Durian */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4 text-earth" />
          <h2 className="font-heading font-semibold text-forest">ทุเรียนหมอนทอง</h2>
        </div>
        <div className="flex flex-col gap-3">
          {durian.map((v) => (
            <PriceRowForm key={v.variant} v={v} currentPrice={getPrice(v.product_type, v.variant)} />
          ))}
        </div>
      </section>

      <p className="text-xs text-earth/60">
        * การลบราคาจะทำให้ระบบดึงราคาจาก DOAE โดยอัตโนมัติ
      </p>
    </div>
  )
}
