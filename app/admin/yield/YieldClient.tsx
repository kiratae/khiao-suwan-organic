'use client'

import { useActionState, useMemo, useState } from 'react'
import { CheckCircle, AlertTriangle, Leaf, Package, Calculator } from 'lucide-react'
import { upsertYieldSettings, type YieldActionState } from '@/app/actions/yield'
import type { YieldRow } from './page'

interface YieldClientProps {
  rows: YieldRow[]
  currentYear: number
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function YieldForm({
  productType,
  productLabel,
  existingRow,
  currentYear,
}: {
  productType: 'mangosteen' | 'durian'
  productLabel: string
  existingRow?: YieldRow
  currentYear: number
}) {
  const [state, action, isPending] = useActionState(
    upsertYieldSettings,
    { status: 'idle' } as YieldActionState,
  )

  const [yieldKg, setYieldKg] = useState(
    existingRow ? String(existingRow.historical_yield_kg) : '',
  )
  const [bias, setBias] = useState(
    existingRow ? String(existingRow.bias_factor) : '0.9',
  )

  const previewQuota = useMemo(() => {
    const y = parseFloat(yieldKg)
    const b = parseFloat(bias)
    if (y > 0 && b > 0 && b <= 1) return y * b
    return null
  }, [yieldKg, bias])

  return (
    <div className="rounded-xl border border-earth/15 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        {productType === 'mangosteen' ? (
          <Leaf className="h-5 w-5 text-forest" />
        ) : (
          <Package className="h-5 w-5 text-earth" />
        )}
        <h2 className="font-heading font-semibold text-forest">{productLabel}</h2>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="product_type" value={productType} />

        {/* Year */}
        <div>
          <label className="block text-sm font-medium text-forest">
            ปีเก็บเกี่ยว <span className="text-red-500">*</span>
          </label>
          <input
            name="harvest_year"
            type="number"
            defaultValue={existingRow?.harvest_year ?? currentYear}
            required
            min={2000}
            max={2100}
            className="mt-1.5 w-full rounded-lg border border-earth/30 bg-cream px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        {/* Historical yield */}
        <div>
          <label className="block text-sm font-medium text-forest">
            ผลผลิตประวัติศาสตร์ (kg) <span className="text-red-500">*</span>
          </label>
          <input
            name="historical_yield_kg"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={yieldKg}
            onChange={(e) => setYieldKg(e.target.value)}
            required
            placeholder="เช่น 5000"
            className="mt-1.5 w-full rounded-lg border border-earth/30 bg-cream px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        {/* Bias factor */}
        <div>
          <label className="block text-sm font-medium text-forest">
            Bias Factor{' '}
            <span className="font-normal text-earth">(0.01 – 1.00, ค่าเริ่มต้น 0.90)</span>
          </label>
          <input
            name="bias_factor"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            max="1"
            value={bias}
            onChange={(e) => setBias(e.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border border-earth/30 bg-cream px-4 py-2.5 text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
          <p className="mt-1 text-xs text-earth/60">
            0.9 = คาดการณ์แบบอนุรักษ์ (90% ของผลผลิตที่คาดไว้)
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-forest">หมายเหตุ</label>
          <input
            name="notes"
            type="text"
            defaultValue={existingRow?.notes ?? ''}
            maxLength={500}
            placeholder="เช่น นำเข้าจาก CSV ปี 2568"
            className="mt-1.5 w-full rounded-lg border border-earth/30 bg-cream px-4 py-2.5 text-sm text-forest outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        {/* Live quota preview */}
        {previewQuota !== null && (
          <div className="flex items-center gap-2 rounded-lg bg-forest/8 px-4 py-3">
            <Calculator className="h-4 w-4 text-forest shrink-0" />
            <p className="text-sm text-forest">
              โควตาที่จะเปิดรับ:{' '}
              <span className="font-bold">{fmt(previewQuota, 2)} kg</span>
              <span className="text-earth ml-1 text-xs">
                ({parseFloat(yieldKg).toLocaleString('th-TH')} × {parseFloat(bias)})
              </span>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-forest px-4 py-2.5 font-medium text-cream transition-colors hover:bg-forest-light disabled:opacity-50"
        >
          {isPending ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>
      </form>

      {state.status === 'success' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}
      {state.status === 'error' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}
    </div>
  )
}

function YieldHistoryTable({ rows }: { rows: YieldRow[] }) {
  if (rows.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-heading font-semibold text-forest">ประวัติข้อมูลผลผลิต</h2>
      <div className="overflow-x-auto rounded-xl border border-earth/15">
        <table className="w-full text-sm">
          <thead className="bg-cream-dark text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-forest">สินค้า</th>
              <th className="px-4 py-3 font-medium text-forest">ปี</th>
              <th className="px-4 py-3 font-medium text-forest text-right">ผลผลิต (kg)</th>
              <th className="px-4 py-3 font-medium text-forest text-right">Bias</th>
              <th className="px-4 py-3 font-medium text-forest text-right">โควตา (kg)</th>
              <th className="px-4 py-3 font-medium text-forest">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-earth/10 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-cream/50">
                <td className="px-4 py-3 text-earth">
                  {row.product_type === 'mangosteen' ? 'มังคุด' : 'ทุเรียนหมอนทอง'}
                </td>
                <td className="px-4 py-3 text-earth">{row.harvest_year}</td>
                <td className="px-4 py-3 text-right font-medium text-forest">
                  {fmt(row.historical_yield_kg, 2)}
                </td>
                <td className="px-4 py-3 text-right text-earth">{row.bias_factor}</td>
                <td className="px-4 py-3 text-right font-bold text-forest">
                  {fmt(row.available_quota_kg, 2)}
                </td>
                <td className="px-4 py-3 text-xs text-earth/60">{row.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function YieldClient({ rows, currentYear }: YieldClientProps) {
  const mangoRow = rows.find(
    (r) => r.product_type === 'mangosteen' && r.harvest_year === currentYear,
  )
  const durianRow = rows.find(
    (r) => r.product_type === 'durian' && r.harvest_year === currentYear,
  )

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2">
        <YieldForm
          productType="mangosteen"
          productLabel="มังคุด"
          existingRow={mangoRow}
          currentYear={currentYear}
        />
        <YieldForm
          productType="durian"
          productLabel="ทุเรียนหมอนทอง"
          existingRow={durianRow}
          currentYear={currentYear}
        />
      </div>
      <YieldHistoryTable rows={rows} />
    </div>
  )
}
